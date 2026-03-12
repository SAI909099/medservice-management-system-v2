from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    MeView,
    PermissionMetaView,
    UserDeleteView,
    UserListCreateView,
    UserPasswordUpdateView,
    UserPermissionUpdateView,
)

urlpatterns = [
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("permissions/meta/", PermissionMetaView.as_view(), name="permission-meta"),
    path("users/", UserListCreateView.as_view(), name="user-list-create"),
    path("users/<int:pk>/permissions/", UserPermissionUpdateView.as_view(), name="user-permission-update"),
    path("users/<int:pk>/password/", UserPasswordUpdateView.as_view(), name="user-password-update"),
    path("users/<int:pk>/", UserDeleteView.as_view(), name="user-delete"),
]
