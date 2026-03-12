.PHONY: mig

mig:
	cd backend && ../.venv/bin/python manage.py makemigrations && ../.venv/bin/python manage.py migrate
