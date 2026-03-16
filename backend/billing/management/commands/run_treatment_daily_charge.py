from datetime import date

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from billing.services import create_daily_treatment_room_charges, create_interval_treatment_room_charges


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
        parser.add_argument(
            "--mode",
            type=str,
            choices=["daily", "interval"],
            help="Charge mode override. daily=scheduled daily charge, interval=periodic test charge.",
        )
        parser.add_argument(
            "--interval-minutes",
            type=int,
            default=None,
            help="Interval minutes for interval mode. Default from settings.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        mode = (options.get("mode") or getattr(settings, "TREATMENT_CHARGE_MODE", "daily")).lower()
        interval_minutes = int(
            options.get("interval_minutes")
            or getattr(settings, "TREATMENT_INTERVAL_MINUTES", 1)
        )
        configured_hour = int(getattr(settings, "TREATMENT_DAILY_CHARGE_HOUR", 11))
        configured_minute = int(getattr(settings, "TREATMENT_DAILY_CHARGE_MINUTE", 59))
        enabled = bool(getattr(settings, "TREATMENT_DAILY_CHARGE_ENABLED", True))
        now = timezone.localtime()

        if mode == "interval":
            if not force and not enabled:
                self.stdout.write(self.style.WARNING("Skipped: TREATMENT_DAILY_CHARGE_ENABLED=False"))
                return
            stats = create_interval_treatment_room_charges(interval_minutes=max(interval_minutes, 1))
            self.stdout.write(
                self.style.SUCCESS(
                    f"Interval treatment charges generated ({stats['interval_minutes']} min) at {stats['datetime']}: "
                    f"created={stats['created']}, existing={stats['existing']}"
                )
            )
            return

        if not force and not enabled:
            self.stdout.write(self.style.WARNING("Skipped: TREATMENT_DAILY_CHARGE_ENABLED=False"))
            return

        if not force and (
            now.hour < configured_hour
            or (now.hour == configured_hour and now.minute < configured_minute)
        ):
            self.stdout.write(
                self.style.WARNING(
                    f"Skipped: now is {now.strftime('%H:%M')}, configured time is {configured_hour:02d}:{configured_minute:02d} or later"
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
