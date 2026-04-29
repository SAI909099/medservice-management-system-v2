from django.core.management.base import BaseCommand

from accounts.models import Role


ROLE_DATA = [
    ("super_admin", "Super Admin - to'liq kirish"),
    ("admin", "Admin - boshqaruv"),
    ("registrator", "Registrator - ro'yxatga olish"),
    ("cashier", "Cashier - kassa"),
    ("doctor", "Doctor - shifokor"),
    ("lab_staff", "Lab Staff - laborant"),
    ("treatment_staff", "Treatment Staff - davolash xonasi"),
]


class Command(BaseCommand):
    help = "Seed default roles"

    def handle(self, *args, **options):
        for name, description in ROLE_DATA:
            role, created = Role.objects.get_or_create(
                name=name,
                defaults={"description": description},
            )
            state = "created" if created else "exists"
            self.stdout.write(self.style.SUCCESS(f"{name}: {state}"))
