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

## 6. Treatment daily auto-charge
Bu funksiya davolash xonasida (`in_progress`) turgan bemorlar uchun har kuni yotoq bo'yicha kunlik charge yaratadi.

`backend/.env` konfiguratsiya:
```env
TREATMENT_DAILY_CHARGE_ENABLED=True
TREATMENT_DAILY_CHARGE_HOUR=12
TREATMENT_DAILY_CHARGE_MINUTE=0
```

Izoh:
- `TREATMENT_DAILY_CHARGE_ENABLED` -> yoqish/o'chirish
- `TREATMENT_DAILY_CHARGE_HOUR` -> soat (`0-23`)
- `TREATMENT_DAILY_CHARGE_MINUTE` -> daqiqa (`0-59`)

Manual run (hozir darhol):
```bash
make treatment-charge
```

Management command:
```bash
cd backend
../.venv/bin/python manage.py run_treatment_daily_charge
```

Force run (vaqtga qaramaydi):
```bash
cd backend
../.venv/bin/python manage.py run_treatment_daily_charge --force
```

Aniq sana uchun (YYYY-MM-DD):
```bash
cd backend
../.venv/bin/python manage.py run_treatment_daily_charge --date 2026-03-12 --force
```

Cron bilan auto-ishlatish (har daqiqada tekshiradi, lekin faqat sozlangan HH:MM da ishlaydi):
```bash
* * * * * cd /home/sai/vs_project/Bolshevik-Medservice/backend && /home/sai/vs_project/Bolshevik-Medservice/.venv/bin/python manage.py run_treatment_daily_charge >> /tmp/treatment_daily_charge.log 2>&1
```

## 7. Vanilla frontend
Static pages are under `backend/frontend-vanilla/`.
Set API base URL dynamically:
```js
localStorage.setItem('api_base_url', 'http://127.0.0.1:8000/api')
```
Open `frontend-vanilla/index.html` via static server.

## Apps
- accounts, clinics, patients, doctors, appointments, laboratory, treatment_rooms, billing, reports
