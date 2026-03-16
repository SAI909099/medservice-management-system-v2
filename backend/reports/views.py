from rest_framework import decorators, response, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

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
