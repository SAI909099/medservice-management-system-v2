from rest_framework import viewsets

from accounts.permissions import PageAccessPermission, RoleBasedPermission

from .models import LabReferral, LabService
from .serializers import LabReferralSerializer, LabServiceSerializer


class LabServiceViewSet(viewsets.ModelViewSet):
    queryset = LabService.objects.all()
    serializer_class = LabServiceSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "lab"
    allowed_roles = ["admin", "lab_staff", "doctor"]
    search_fields = ["name", "code"]


class LabReferralViewSet(viewsets.ModelViewSet):
    queryset = LabReferral.objects.select_related("patient", "doctor__user", "service").all()
    serializer_class = LabReferralSerializer
    permission_classes = [RoleBasedPermission, PageAccessPermission]
    required_page = "lab"
    allowed_roles = ["admin", "doctor", "lab_staff", "registrator"]
    filterset_fields = ["status", "service", "doctor", "patient"]
