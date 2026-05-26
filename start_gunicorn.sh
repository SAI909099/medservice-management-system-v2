#!/bin/bash
cd /var/www/medservice-management-system-v2/backend
source .env
echo "Loaded DB_NAME="
exec /var/www/medservice-management-system-v2/venv/bin/gunicorn --access-logfile - --workers 3 --bind 127.0.0.1:8000 config.wsgi:application
