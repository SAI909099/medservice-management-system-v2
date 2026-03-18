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
TREATMENT_DAILY_CHARGE_HOUR=11
TREATMENT_DAILY_CHARGE_MINUTE=59
TREATMENT_CHARGE_MODE=daily
TREATMENT_INTERVAL_MINUTES=1
```

Izoh:
- `TREATMENT_DAILY_CHARGE_ENABLED` -> yoqish/o'chirish
- `TREATMENT_DAILY_CHARGE_HOUR` -> soat (`0-23`)
- `TREATMENT_DAILY_CHARGE_MINUTE` -> daqiqa (`0-59`)
- `TREATMENT_CHARGE_MODE` -> `daily` yoki `interval`
- `TREATMENT_INTERVAL_MINUTES` -> interval rejimida necha daqiqada bir marta charge yaratiladi

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

Interval test run (har 1 daqiqada):
```bash
cd backend
../.venv/bin/python manage.py run_treatment_daily_charge --mode interval --interval-minutes 1 --force
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

## 8. Production deploy (Docker Compose + Nginx, no domain)
Bu variant bitta serverda `nginx + backend + postgres` stackni ishlatadi.

### 8.1 Serverga kodni olish
```bash
sudo mkdir -p /opt/medservice
sudo chown -R $USER:$USER /opt/medservice
git clone git@github.com:SAI909099/medservice-management-system-v2.git /opt/medservice
cd /opt/medservice
```

### 8.2 Production env tayyorlash
```bash
cp backend/.env.prod.example backend/.env.prod
```
`backend/.env.prod` ichida quyilarni o'zgartiring:
- `DJANGO_SECRET_KEY`
- `POSTGRES_PASSWORD`
- `ALLOWED_HOSTS=SERVER_IP`
- `CSRF_TRUSTED_ORIGINS=http://SERVER_IP`

Muhim: compose ichida DB host `POSTGRES_HOST=db` bo'lishi kerak.

### 8.3 Konteynerlarni build va ishga tushirish
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 8.4 Bir martalik init amallar
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
docker compose -f docker-compose.prod.yml exec backend python manage.py seed_roles
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### 8.5 Tekshirish
- Frontend: `http://SERVER_IP/`
- API docs: `http://SERVER_IP/api/docs/`
- Admin: `http://SERVER_IP/admin/`

### 8.6 Loglar
```bash
docker compose -f docker-compose.prod.yml logs -f nginx
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f db
```

### 8.7 Postgres backup cron
Script:
```bash
/opt/medservice/deploy/scripts/backup_postgres.sh
```

Cron misol (har kuni 02:00):
```bash
0 2 * * * PROJECT_DIR=/opt/medservice BACKUP_DIR=/opt/medservice-data/backups KEEP_DAYS=14 /opt/medservice/deploy/scripts/backup_postgres.sh >> /var/log/medservice_backup.log 2>&1
```

## 9. CI/CD (GitHub Actions)
Repo ichida 2 ta workflow qo'shildi:
- `CI` (`.github/workflows/ci.yml`): frontend build + backend migrate/check
- `CD` (`.github/workflows/cd.yml`): `main` branch CI muvaffaqiyatli bo'lsa serverga deploy

GitHub repository `Settings -> Secrets and variables -> Actions` da quyidagi secretlarni qo'ying:
- `PROD_HOST` (server IP)
- `PROD_USER` (odatda `root` yoki deploy user)
- `PROD_SSH_KEY` (private key, multiline)
- `PROD_PORT` (ixtiyoriy, default `22`)
- `PROD_PROJECT_DIR` (ixtiyoriy, default `/opt/medservice`)

Deploy pipeline serverda quyidagilarni bajaradi:
```bash
git pull --ff-only origin main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T backend python manage.py migrate --noinput
docker compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput
docker compose -f docker-compose.prod.yml exec -T backend python manage.py seed_roles || true
```
