# Medservice (Django + DRF + PostgreSQL + Vanilla JS)

## 1. Setup
```bash
cd backend
python3 -m venv ../.venv
../.venv/bin/pip install -r requirements.txt
cp .env.example .env
```

## 2. Database
Ensure PostgreSQL is running and `.env` credentials are valid.

## 3. Run migrations and seed roles
```bash
cd backend
../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py seed_roles
```

## 4. Create superuser and run
```bash
../.venv/bin/python manage.py createsuperuser
../.venv/bin/python manage.py runserver
```

## 5. API Docs
- Swagger: `http://127.0.0.1:8000/api/docs/`
- Schema: `http://127.0.0.1:8000/api/schema/`

## 6. Vanilla frontend
Static pages are under `backend/frontend-vanilla/`.
Set API base URL dynamically:
```js
localStorage.setItem('api_base_url', 'http://127.0.0.1:8000/api')
```
Open `frontend-vanilla/index.html` via static server.

## Apps
- accounts, clinics, patients, doctors, appointments, laboratory, treatment_rooms, billing, reports
