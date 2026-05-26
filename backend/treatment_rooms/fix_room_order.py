import os
import sys
import django

sys.path.insert(0, '/var/www/medservice-management-system-v2/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from treatment_rooms.models import TreatmentRoom

for room in TreatmentRoom.objects.all():
    try:
        num = int(room.name.split('-')[0])
        room.room_number = num
        room.save()
    except:
        pass

print("Nevrologiya:")
for r in TreatmentRoom.objects.filter(area__name='Nevrologiya').order_by('room_number'):
    print(f"  {r.name}")

print("\nTerapiya:")
for r in TreatmentRoom.objects.filter(area__name='Terapiya').order_by('room_number'):
    print(f"  {r.name}")

print("\nLux:")
for r in TreatmentRoom.objects.filter(area__name='Lux').order_by('room_number'):
    print(f"  {r.name}")