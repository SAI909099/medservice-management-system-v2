from datetime import date

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from billing.services import create_daily_treatment_room_charges


class Command(BaseCommand):
    help = "Generate daily treatment-room charges at configured schedule."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Run immediately, ignoring configured time and enabled flag.",
        )
        parser.add_argument(
            "--date",
            type=str,
            help="Target date in YYYY-MM-DD format. Default: today (localtime).",
        )

    def handle(self, *args, **options):
        force = options["force"]
        configured_hour = int(getattr(settings, "TREATMENT_DAILY_CHARGE_HOUR", 12))
        configured_minute = int(getattr(settings, "TREATMENT_DAILY_CHARGE_MINUTE", 0))
        enabled = bool(getattr(settings, "TREATMENT_DAILY_CHARGE_ENABLED", True))
        now = timezone.localtime()

        if not force and not enabled:
            self.stdout.write(self.style.WARNING("Skipped: TREATMENT_DAILY_CHARGE_ENABLED=False"))
            return

        if not force and (now.hour != configured_hour or now.minute != configured_minute):
            self.stdout.write(
                self.style.WARNING(
                    f"Skipped: now is {now.strftime('%H:%M')}, configured time is {configured_hour:02d}:{configured_minute:02d}"
                )
            )
            return

        target_date = timezone.localdate()
        if options.get("date"):
            try:
                target_date = date.fromisoformat(options["date"])
            except ValueError as exc:
                raise CommandError("Invalid --date format. Use YYYY-MM-DD.") from exc

        stats = create_daily_treatment_room_charges(for_date=target_date)
        self.stdout.write(
            self.style.SUCCESS(
                f"Daily treatment charges generated for {stats['date']}: created={stats['created']}, existing={stats['existing']}"
            )
        )
