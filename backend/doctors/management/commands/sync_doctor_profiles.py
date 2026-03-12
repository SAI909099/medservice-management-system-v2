from django.core.management.base import BaseCommand

from accounts.models import Role, User
from doctors.models import Doctor


class Command(BaseCommand):
    help = "Create missing Doctor profiles for users with doctor role"

    def handle(self, *args, **options):
        users = User.objects.filter(role__name=Role.Name.DOCTOR, is_active=True)
        created_count = 0
        for user in users:
            _, created = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    "clinic": user.clinic,
                    "branch": user.branch,
                    "specialty": "Umumiy shifokor",
                    "is_active": True,
                },
            )
            if created:
                created_count += 1
        self.stdout.write(self.style.SUCCESS(f"Created doctor profiles: {created_count}"))
