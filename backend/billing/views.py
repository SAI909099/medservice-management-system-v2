from decimal import Decimal

from rest_framework import decorators, generics, response, status, viewsets

from accounts.permissions import PageAccessPermission, RoleBasedPermission

from .models import Charge, Payment, Service
from .selectors import (
    get_patient_ledger_print_data,
    get_patient_ledger_rows,
    get_treatment_room_patient_rows,
)
from .serializers import ChargeSerializer, PaymentSerializer, ReceiptSerializer, ServiceSerializer
from .services import apply_patient_payment, apply_treatment_patient_payment, create_daily_treatment_room_charges


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    filterset_fields = ["category", "is_active"]
    search_fields = ["code", "name"]

    def get_allowed_roles(self, request):
        if self.action in {"list", "retrieve"}:
            return ["admin", "registrator", "cashier", "doctor", "super_admin"]
        return ["admin", "cashier", "super_admin"]

    def get_required_page(self, request):
        if self.action in {"list", "retrieve"}:
            return "appointments"
        return "pricing"


class ChargeViewSet(viewsets.ModelViewSet):
    queryset = Charge.objects.select_related("patient", "appointment", "treatment_referral__room").prefetch_related("items").all()
    serializer_class = ChargeSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "billing"
    allowed_roles = ["admin", "registrator", "cashier"]
    filterset_fields = ["status", "patient", "appointment", "treatment_referral"]

    def get_allowed_roles(self, request):
        if self.action in {"treatment_room", "generate_treatment_daily", "treatment_pay", "treatment_pay_by_patient"}:
            return ["admin", "registrator", "cashier", "treatment_staff", "doctor"]
        if self.action in {"pay_by_patient"}:
            return ["admin", "registrator", "cashier"]
        return ["admin", "registrator", "cashier"]

    def get_required_page(self, request):
        if self.action in {"treatment_room", "generate_treatment_daily", "treatment_pay", "treatment_pay_by_patient"}:
            return "treatment"
        return "billing"

    @decorators.action(detail=False, methods=["get"], url_path="treatment-room")
    def treatment_room(self, request):
        status_value = request.query_params.get("status")
        today = request.query_params.get("today")
        data = get_treatment_room_patient_rows(user=request.user, status_value=status_value, today_only=(today == "1"))
        page = self.paginate_queryset(data)
        items = page if page is not None else data
        if page is not None:
            return self.get_paginated_response(items)
        return response.Response({"results": items})

    @decorators.action(detail=False, methods=["post"], url_path="generate-treatment-daily")
    def generate_treatment_daily(self, request):
        stats = create_daily_treatment_room_charges()
        return response.Response(stats)

    @decorators.action(detail=False, methods=["get"], url_path="patient-ledger")
    def patient_ledger(self, request):
        rows = get_patient_ledger_rows(request.user)
        return response.Response({"results": rows})

    @decorators.action(detail=False, methods=["post"], url_path="pay-by-patient")
    def pay_by_patient(self, request):
        patient_id = request.data.get("patient_id")
        if not patient_id:
            return response.Response({"patient_id": "Bemor tanlanishi kerak."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            amount = Decimal(str(request.data.get("amount", "0")))
        except Exception:
            return response.Response({"amount": "Noto'g'ri summa."}, status=status.HTTP_400_BAD_REQUEST)

        payment_method = request.data.get("payment_method") or Payment.Method.CASH
        note = request.data.get("note", "")
        try:
            result = apply_patient_payment(
                user=request.user,
                patient_id=int(patient_id),
                amount=amount,
                payment_method=payment_method,
                note=note,
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return response.Response(result)

    @decorators.action(detail=False, methods=["get"], url_path=r"patient-ledger/(?P<patient_id>[^/.]+)/print")
    def patient_ledger_print(self, request, patient_id=None):
        data = get_patient_ledger_print_data(request.user, int(patient_id))
        if data is None:
            return response.Response({"detail": "Bemor uchun charge topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(data)

    @decorators.action(detail=True, methods=["post"], url_path="treatment-pay")
    def treatment_pay(self, request, pk=None):
        charge = self.get_object()
        if charge.treatment_referral_id is None:
            return response.Response(
                {"detail": "Bu charge yotoq to'loviga tegishli emas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            amount = Decimal(str(request.data.get("amount", "0")))
        except Exception:
            return response.Response({"amount": "Noto'g'ri summa."}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return response.Response({"amount": "Summa 0 dan katta bo'lishi kerak."}, status=status.HTTP_400_BAD_REQUEST)

        remaining = charge.total_amount - charge.paid_amount
        if amount > remaining:
            return response.Response({"amount": "Summa qarzdorlikdan katta bo'lmasligi kerak."}, status=status.HTTP_400_BAD_REQUEST)

        payload = {
            "charge": charge.id,
            "amount": amount,
            "payment_method": request.data.get("payment_method") or Payment.Method.CASH,
            "note": request.data.get("note", ""),
        }
        serializer = PaymentSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        charge.refresh_from_db(fields=["status", "paid_amount", "total_amount"])
        return response.Response(
            {
                "payment_id": payment.id,
                "charge_id": charge.id,
                "status": charge.status,
                "paid_amount": charge.paid_amount,
                "total_amount": charge.total_amount,
            }
        )

    @decorators.action(detail=False, methods=["post"], url_path="treatment-pay-by-patient")
    def treatment_pay_by_patient(self, request):
        patient_id = request.data.get("patient_id")
        if not patient_id:
            return response.Response({"patient_id": "Bemor tanlanishi kerak."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            amount = Decimal(str(request.data.get("amount", "0")))
        except Exception:
            return response.Response({"amount": "Noto'g'ri summa."}, status=status.HTTP_400_BAD_REQUEST)

        payment_method = request.data.get("payment_method") or Payment.Method.CASH
        note = request.data.get("note", "")
        try:
            result = apply_treatment_patient_payment(
                user=request.user,
                patient_id=int(patient_id),
                amount=amount,
                payment_method=payment_method,
                note=note,
            )
        except ValueError as exc:
            return response.Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return response.Response(result)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related("charge", "receipt").all()
    serializer_class = PaymentSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "billing"
    allowed_roles = ["admin", "registrator", "cashier"]
    filterset_fields = ["payment_method", "charge"]


class ReceiptView(generics.RetrieveAPIView):
    serializer_class = ReceiptSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "billing"
    allowed_roles = ["admin", "registrator", "cashier", "super_admin"]

    def get_object(self):
        return Payment.objects.select_related("receipt").get(id=self.kwargs["payment_id"]).receipt
