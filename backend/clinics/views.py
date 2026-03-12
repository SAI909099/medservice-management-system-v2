from rest_framework import viewsets

from accounts.permissions import RoleBasedPermission

from .models import Branch, Clinic
from .serializers import BranchSerializer, ClinicSerializer


class ClinicViewSet(viewsets.ModelViewSet):
    queryset = Clinic.objects.all()
    serializer_class = ClinicSerializer
    permission_classes = [RoleBasedPermission]
    allowed_roles = ["admin"]
    search_fields = ["name", "address"]


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.select_related("clinic").all()
    serializer_class = BranchSerializer
    permission_classes = [RoleBasedPermission]
    allowed_roles = ["admin"]
    filterset_fields = ["clinic", "is_active"]
    search_fields = ["name", "address"]
