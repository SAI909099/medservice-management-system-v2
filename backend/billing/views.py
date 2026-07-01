from decimal import Decimal

from rest_framework import decorators, generics, response, status, viewsets

from accounts.permissions import PageAccessPermission, RoleBasedPermission

from .models import Charge, Payment, Service, ServiceOption
from .selectors import (
    get_patient_ledger_print_data,
    get_patient_ledger_rows,
    get_treatment_room_patient_rows,
)
from .serializers import ChargeSerializer, PaymentSerializer, ReceiptSerializer, ServiceOptionSerializer, ServiceSerializer
from .services import apply_patient_payment, apply_treatment_patient_payment, create_daily_treatment_room_charges, recalculate_charge


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.prefetch_related("options").all()
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

    @decorators.action(detail=True, methods=["post"], url_path="options")
    def create_option(self, request, pk=None):
        service = self.get_object()
        serializer = ServiceOptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        option = serializer.save(service=service)
        return response.Response(ServiceOptionSerializer(option).data, status=status.HTTP_201_CREATED)

    @decorators.action(detail=True, methods=["put", "patch"], url_path="edit-option/(?P<option_id>[^/.]+)")
    def update_option(self, request, pk=None, option_id=None):
        service = self.get_object()
        try:
            option = service.options.get(id=option_id)
        except ServiceOption.DoesNotExist:
            return response.Response({"detail": "Option topilmada"}, status=status.HTTP_404_NOT_FOUND)
        serializer = ServiceOptionSerializer(option, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data)

    @decorators.action(detail=True, methods=["delete"], url_path="delete-option/(?P<option_id>[^/.]+)")
    def delete_option(self, request, pk=None, option_id=None):
        service = self.get_object()
        try:
            option = service.options.get(id=option_id)
        except ServiceOption.DoesNotExist:
            return response.Response({"detail": "Option topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        option.delete()
        return response.Response(status=status.HTTP_204_NO_CONTENT)


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
        if self.action in {"pay_by_patient", "cancel_item", "cancelled_items", "patients_with_charges"}:
            return ["admin", "registrator", "cashier"]
        return ["admin", "registrator", "cashier"]

    def get_required_page(self, request):
        if self.action in {"treatment_room", "generate_treatment_daily", "treatment_pay", "treatment_pay_by_patient"}:
            return "treatment"
        if self.action in {"cancel_item", "cancelled_items", "patients_with_charges"}:
            return "cancels"
        return "billing"

    @decorators.action(detail=False, methods=["get"], url_path="treatment-room")
    def treatment_room(self, request):
        status_value = request.query_params.get("status")
        today = request.query_params.get("today")
        treatment_state = request.query_params.get("treatment_state", "all")
        data = get_treatment_room_patient_rows(
            user=request.user,
            status_value=status_value,
            today_only=(today == "1"),
            treatment_state=treatment_state,
        )
        return response.Response({"results": data})

    @decorators.action(detail=False, methods=["post"], url_path="generate-treatment-daily")
    def generate_treatment_daily(self, request):
        stats = create_daily_treatment_room_charges()
        return response.Response(stats)

    @decorators.action(detail=False, methods=["get"], url_path="patient-ledger")
    def patient_ledger(self, request):
        include_treatment = request.query_params.get("include_treatment", "0") == "1"
        rows = get_patient_ledger_rows(request.user, include_treatment=include_treatment)
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
                "receipt_no": payment.receipt.receipt_no,
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

    @decorators.action(detail=True, methods=["post"], url_path="cancel-item")
    def cancel_item(self, request, pk=None):
        from django.utils import timezone
        from reports.models import Expense

        try:
            charge = self.get_queryset().get(pk=pk)
        except Charge.DoesNotExist:
            return response.Response({"detail": "Charge topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        charge_item_id = request.data.get("charge_item_id")
        cancel_note = request.data.get("note", "")

        if not charge_item_id:
            return response.Response({"detail": "charge_item_id kiritilishi shart."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            charge_item = charge.items.get(pk=charge_item_id)
        except charge.items.model.DoesNotExist:
            return response.Response({"detail": "ChargeItem topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        if charge_item.is_cancelled:
            return response.Response({"detail": "Bu xizmat allaqachon bekor qilingan."}, status=status.HTTP_400_BAD_REQUEST)

        charge_item.is_cancelled = True
        charge_item.cancel_note = cancel_note
        charge_item.cancelled_at = timezone.now()
        charge_item.save(update_fields=["is_cancelled", "cancel_note", "cancelled_at"])

        refund_amount = charge_item.total_price
        paid_for_item = min(charge.paid_amount, charge_item.total_price) if charge.paid_amount > 0 else Decimal("0.00")

        if paid_for_item > 0:
            clinic = charge.patient.clinic
            branch = charge.patient.branch
            if clinic is None:
                from clinics.models import Clinic
                clinic = Clinic.objects.first()

            Expense.objects.create(
                clinic=clinic,
                branch=branch,
                category="Qaytarish (Refund)",
                description=f"Qaytarish: {charge.patient.first_name} {charge.patient.last_name} - {charge_item.description}",
                note=cancel_note or f"Charge #{charge.id}, ChargeItem #{charge_item.id}",
                amount=paid_for_item,
                payment_method=Expense.PaymentMethod.CASH,
                source=Expense.Source.CASH_REGISTER,
                created_by=request.user,
                spent_at=timezone.localdate(),
            )

            charge.paid_amount = max(charge.paid_amount - paid_for_item, Decimal("0.00"))

        recalculate_charge(charge)

        return response.Response({
            "detail": "Xizmat bekor qilindi.",
            "charge_item_id": charge_item.id,
            "description": charge_item.description,
            "refund_amount": float(paid_for_item),
            "charge_id": charge.id,
            "charge_status": charge.status,
        })

    @decorators.action(detail=False, methods=["get"], url_path="patients-with-charges")
    def patients_with_charges(self, request):
        from django.db.models import Q
        from patients.models import Patient

        search = request.query_params.get("search", "").strip()

        charges = Charge.objects.filter(
            items__is_cancelled=False
        ).select_related("patient").prefetch_related("items").distinct()

        if search:
            charges = charges.filter(
                Q(patient__first_name__icontains=search) |
                Q(patient__last_name__icontains=search)
            )

        patient_map = {}
        for charge in charges:
            pid = charge.patient_id
            if pid not in patient_map:
                p = charge.patient
                patient_map[pid] = {
                    "patient": {
                        "id": p.id,
                        "first_name": p.first_name,
                        "last_name": p.last_name,
                        "full_name": f"{p.first_name} {p.last_name}".strip(),
                    },
                    "charges": [],
                }
            patient_data = ChargeSerializer(charge).data
            active_items = [i for i in patient_data["items"] if not i.get("is_cancelled")]
            if active_items:
                patient_data["items"] = active_items
                patient_map[pid]["charges"].append(patient_data)

        results = [v for v in patient_map.values() if v["charges"]]
        results.sort(key=lambda x: x["patient"]["first_name"])

        return response.Response({"results": results})

    @decorators.action(detail=False, methods=["get"], url_path="cancelled-items")
    def cancelled_items(self, request):
        from datetime import date
        from django.utils import timezone
        from django.db.models import Sum, F, Value
        from django.db.models.functions import Coalesce, Concat

        year = int(request.query_params.get("year", timezone.now().year))
        month = int(request.query_params.get("month", timezone.now().month))

        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)

        cancelled_items = (
            ChargeItem.objects.filter(
                is_cancelled=True,
                cancelled_at__gte=start_date,
                cancelled_at__lt=end_date,
            )
            .select_related("charge", "charge__patient", "service")
            .order_by("-cancelled_at")
        )

        from reports.models import Expense
        refunds = Expense.objects.filter(
            category="Qaytarish (Refund)",
            spent_at__gte=start_date,
            spent_at__lt=end_date,
        )
        total_refunded = refunds.aggregate(total=Coalesce(Sum("amount"), Decimal("0")))["total"]

        items = []
        for item in cancelled_items:
            patient = item.charge.patient
            items.append({
                "id": item.id,
                "charge_id": item.charge_id,
                "patient_id": patient.id,
                "patient_name": f"{patient.first_name} {patient.last_name}".strip(),
                "service_name": item.service.name if item.service else item.description,
                "description": item.description,
                "total_price": float(item.total_price),
                "cancel_note": item.cancel_note,
                "cancelled_at": item.cancelled_at.isoformat() if item.cancelled_at else None,
            })

        return response.Response({
            "year": year,
            "month": month,
            "total_refunded": float(total_refunded),
            "count": len(items),
            "items": items,
        })


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
