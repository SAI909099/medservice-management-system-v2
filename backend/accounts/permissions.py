from rest_framework.permissions import BasePermission

from .services import get_effective_pages_for_user


class RoleBasedPermission(BasePermission):
    """Use `allowed_roles` on views. Super Admin always allowed."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        role_name = getattr(getattr(user, "role", None), "name", None)
        if role_name == "super_admin":
            return True
        if hasattr(view, "get_allowed_roles"):
            allowed_roles = view.get_allowed_roles(request)
        else:
            allowed_roles = getattr(view, "allowed_roles", None)
        if not allowed_roles:
            return True
        return role_name in allowed_roles


class IsAdminManager(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        role_name = getattr(getattr(user, "role", None), "name", None)
        return role_name in {"super_admin", "admin"}


class PageAccessPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if hasattr(view, "get_required_page"):
            required_page = view.get_required_page(request)
        else:
            required_page = getattr(view, "required_page", None)
        if not required_page:
            return True

        return required_page in set(get_effective_pages_for_user(user))
