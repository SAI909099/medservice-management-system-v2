from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Role
from .page_permissions import PAGE_PERMISSIONS, ROLE_DEFAULT_PAGES
from .permissions import IsAdminManager, PageAccessPermission
from .serializers import (
    RoleSerializer,
    UserCreateSerializer,
    UserPasswordUpdateSerializer,
    UserPermissionUpdateSerializer,
    UserSerializer,
)
from .services import get_effective_pages_for_user

User = get_user_model()


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class PermissionMetaView(APIView):
    permission_classes = [IsAdminManager, PageAccessPermission]
    required_page = "settings_users"

    def get(self, request):
        roles = RoleSerializer(Role.objects.all(), many=True).data
        return Response(
            {
                "roles": roles,
                "pages": [{"code": code, "label": label} for code, label in PAGE_PERMISSIONS],
                "role_defaults": {name: sorted(values) for name, values in ROLE_DEFAULT_PAGES.items()},
            }
        )


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminManager, PageAccessPermission]
    required_page = "settings_users"
    pagination_class = None
    queryset = User.objects.select_related("role", "clinic", "branch").prefetch_related("page_permissions").all()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserPermissionUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAdminManager, PageAccessPermission]
    required_page = "settings_users"
    serializer_class = UserPermissionUpdateSerializer
    queryset = User.objects.select_related("role").prefetch_related("page_permissions").all()

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "id": user.id,
                "allowed_pages": get_effective_pages_for_user(user),
            }
        )


class UserDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAdminManager, PageAccessPermission]
    required_page = "settings_users"
    queryset = User.objects.all()

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.id == request.user.id:
            return Response({"detail": "O'zingizni o'chira olmaysiz."}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


class UserPasswordUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAdminManager, PageAccessPermission]
    required_page = "settings_users"
    serializer_class = UserPasswordUpdateSerializer
    queryset = User.objects.all()

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Parol yangilandi."})
