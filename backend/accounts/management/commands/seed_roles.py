from django.core.management.base import BaseCommand

from accounts.models import Role


class Command(BaseCommand):
    help = "Seed default roles"

    def handle(self, *args, **options):
        for value, label in Role.Name.choices:
            _, created = Role.objects.get_or_create(name=value, defaults={"description": label})
            state = "created" if created else "exists"
            self.stdout.write(self.style.SUCCESS(f"{value}: {state}"))
