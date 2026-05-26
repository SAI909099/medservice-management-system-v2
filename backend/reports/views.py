from rest_framework import decorators, response, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Sum
from datetime import timedelta

from accounts.permissions import PageAccessPermission, RoleBasedPermission

from .models import Expense
from .selectors import (
    get_base_reports_payload,
    get_finance_overview,
    get_income_analytics,
    scoped_cashier_outputs_queryset,
    scoped_expenses_queryset,
)
from .serializers import ExpenseSerializer
from billing.models import ChargeItem, Service


class ReportsView(APIView):
    permission_classes = [PageAccessPermission]
    required_page = "reports"

    @staticmethod
    def _int_param(request, key: str, default: int):
        try:
            return int(request.query_params.get(key, default))
        except Exception:
            return default

    def get(self, request):
        payload = get_base_reports_payload(request.user)
        days = self._int_param(request, "days", 30)
        payload["finance"] = get_finance_overview(
            request.user,
            days=max(1, min(days, 366)),
            period=request.query_params.get("period", "window"),
            date_from=request.query_params.get("date_from"),
            date_to=request.query_params.get("date_to"),
        )
        return Response(payload)


class IncomeAnalyticsView(APIView):
    permission_classes = [PageAccessPermission]
    required_page = "reports"

    def get(self, request):
        data = get_income_analytics(
            user=request.user,
            period=request.query_params.get("period", "month"),
            date_from=request.query_params.get("date_from"),
            date_to=request.query_params.get("date_to"),
            group_by=request.query_params.get("group_by", "day"),
        )
        return Response(data)


class ServiceIncomeView(APIView):
    permission_classes = [PageAccessPermission]
    required_page = "reports"

    def get(self, request):
        period = request.query_params.get("period", "month")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        today = timezone.now().date()

        if period == "today":
            start_date = today
            end_date = today
        elif period == "month":
            start_date = today.replace(day=1)
            end_date = today
        elif period == "30d":
            start_date = today - timedelta(days=29)
            end_date = today
        elif period == "custom" and date_from and date_to:
            start_date = timezone.datetime.strptime(date_from, "%Y-%m-%d").date()
            end_date = timezone.datetime.strptime(date_to, "%Y-%m-%d").date()
        else:
            start_date = today.replace(day=1)
            end_date = today

        charge_items = ChargeItem.objects.filter(
            service__isnull=False,
            charge__created_at__date__gte=start_date,
            charge__created_at__date__lte=end_date,
        ).values(
            "service__id",
            "service__name",
            "service__code",
            "description",
        ).annotate(
            total=Sum("total_price"),
            count=Sum("quantity")
        ).order_by("-total")

        from billing.models import ServiceOption
        service_options_map = {s.id: s.name for s in ServiceOption.objects.filter(is_active=True)}

        service_map = {}
        total_income = 0
        for item in charge_items:
            svc_id = item["service__id"]
            desc = item["description"] or ""
            total = float(item["total"]) if item["total"] else 0
            count = int(item["count"]) if item["count"] else 0
            
            if svc_id not in service_map:
                service_map[svc_id] = {
                    "id": svc_id,
                    "name": item["service__name"],
                    "code": item["service__code"],
                    "total": 0,
                    "count": 0,
                    "options": [],
                }
            
            service_map[svc_id]["total"] += total
            service_map[svc_id]["count"] += count
            total_income += total
            
            if desc:
                opt_name = desc.replace(f"{item['service__name']} - ", "")
                existing_opt = next((o for o in service_map[svc_id]["options"] if o["name"] == opt_name), None)
                if existing_opt:
                    existing_opt["total"] += total
                    existing_opt["count"] += count
                else:
                    service_map[svc_id]["options"].append({
                        "name": opt_name,
                        "total": total,
                        "count": count,
                    })
        
        services_data = list(service_map.values())

        all_services = Service.objects.filter(is_active=True).values("id", "name", "code")
        existing_ids = {s["id"] for s in services_data}
        for svc in all_services:
            if svc["id"] not in existing_ids:
                services_data.append({
                    "id": svc["id"],
                    "name": svc["name"],
                    "code": svc["code"],
                    "total": 0,
                    "count": 0,
                    "options": [],
                })

        services_data.sort(key=lambda x: x["total"], reverse=True)

        return Response({
            "period": period,
            "date_from": start_date.isoformat(),
            "date_to": end_date.isoformat(),
            "total_income": total_income,
            "services": services_data,
        })


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "reports"
    allowed_roles = ["admin", "cashier", "registrator", "super_admin"]
    filterset_fields = ["clinic", "branch", "spent_at", "category"]
    search_fields = ["description", "category"]

    def get_queryset(self):
        return scoped_expenses_queryset(self.request.user)

    @staticmethod
    def _int_param(request, key: str, default: int):
        try:
            return int(request.query_params.get(key, default))
        except Exception:
            return default

    @decorators.action(detail=False, methods=["get"], url_path="finance-overview")
    def finance_overview(self, request):
        days = self._int_param(request, "days", 30)
        income_page = self._int_param(request, "income_page", 1)
        income_page_size = self._int_param(request, "income_page_size", 20)
        output_page = self._int_param(request, "output_page", 1)
        output_page_size = self._int_param(request, "output_page_size", 20)
        data = get_finance_overview(
            request.user,
            days=max(1, min(days, 366)),
            period=request.query_params.get("period", "window"),
            date_from=request.query_params.get("date_from"),
            date_to=request.query_params.get("date_to"),
            income_page=income_page,
            income_page_size=income_page_size,
            output_page=output_page,
            output_page_size=output_page_size,
        )
        return response.Response(data)

    @decorators.action(detail=False, methods=["get"], url_path="my-outputs")
    def my_outputs(self, request):
        rows = (
            scoped_cashier_outputs_queryset(request.user)
            .filter(source=Expense.Source.CASH_REGISTER, spent_at=timezone.localdate())
            .order_by("-spent_at", "-id")
            .values(
            "id",
            "description",
            "category",
            "note",
            "amount",
            "spent_at",
        )
        )
        return response.Response({"results": list(rows)})
