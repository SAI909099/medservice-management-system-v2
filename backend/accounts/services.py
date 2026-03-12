from django.db import transaction

from accounts.page_permissions import ALL_PAGE_CODES, ROLE_DEFAULT_PAGES, sanitize_page_codes

from .models import User, UserPagePermission


def get_default_pages_for_role(role_name: str | None) -> set[str]:
    if not role_name:
        return set()
    defaults = ROLE_DEFAULT_PAGES.get(role_name, set())
    return set(defaults)


def get_effective_pages_for_user(user: User) -> list[str]:
    if user.is_superuser:
        return sorted(ALL_PAGE_CODES)

    role_name = getattr(getattr(user, "role", None), "name", None)
    allowed = get_default_pages_for_role(role_name)
    overrides = user.page_permissions.all()
    for item in overrides:
        if item.enabled:
            allowed.add(item.page_code)
        else:
            allowed.discard(item.page_code)
    return sorted(allowed)


@transaction.atomic
def apply_user_page_permissions(user: User, requested_pages: list[str]) -> list[str]:
    requested = sanitize_page_codes(requested_pages)
    defaults = get_default_pages_for_role(getattr(getattr(user, "role", None), "name", None))

    # Store only overrides relative to role defaults
    for page_code in sanitize_page_codes(defaults | requested):
        should_be_enabled = page_code in requested
        is_default_enabled = page_code in defaults

        if should_be_enabled == is_default_enabled:
            UserPagePermission.objects.filter(user=user, page_code=page_code).delete()
            continue

        UserPagePermission.objects.update_or_create(
            user=user,
            page_code=page_code,
            defaults={"enabled": should_be_enabled},
        )

    return get_effective_pages_for_user(user)
