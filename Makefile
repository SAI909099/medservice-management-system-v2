.PHONY: mig treatment-charge flush

mig:
	cd backend && ../.venv/bin/python manage.py makemigrations && ../.venv/bin/python manage.py migrate

treatment-charge:
	cd backend && ../.venv/bin/python manage.py run_treatment_daily_charge --force

flush:
	cd backend && ../.venv/bin/python manage.py flush
