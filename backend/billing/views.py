from rest_framework import generics, viewsets

from accounts.permissions import PageAccessPermission, RoleBasedPermission

from .models import Charge, Payment, Service
from .serializers import ChargeSerializer, PaymentSerializer, ReceiptSerializer, ServiceSerializer


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
    queryset = Charge.objects.select_related("patient", "appointment").prefetch_related("items").all()
    serializer_class = ChargeSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "billing"
    allowed_roles = ["admin", "registrator", "cashier"]
    filterset_fields = ["status", "patient", "appointment"]


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
