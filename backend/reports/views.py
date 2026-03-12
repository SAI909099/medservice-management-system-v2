from django.db.models import Sum
from django.db.models.functions import TruncDay, TruncMonth
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import PageAccessPermission
from billing.models import Charge, Payment


class ReportsView(APIView):
    permission_classes = [PageAccessPermission]
    required_page = "reports"

    def get(self, request):
        daily = (
            Payment.objects.annotate(day=TruncDay("created_at"))
            .values("day")
            .annotate(total=Sum("amount"))
            .order_by("-day")[:30]
        )
        monthly = (
            Payment.objects.annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(total=Sum("amount"))
            .order_by("-month")[:12]
        )
        debtors = Charge.objects.filter(status__in=[Charge.Status.UNPAID, Charge.Status.PARTIAL]).values(
            "id", "patient__first_name", "patient__last_name", "total_amount", "paid_amount", "status"
        )
        return Response(
            {
                "daily_revenue": list(daily),
                "monthly_revenue": list(monthly),
                "debtors": list(debtors),
            }
        )
