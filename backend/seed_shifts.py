import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from employees.models import Shift, Employee
from datetime import time

def seed():
    print("Seeding shifts...")
    # Create General Shift
    general_shift, created = Shift.objects.get_or_create(
        name="General Shift",
        defaults={
            'start_time': time(9, 0, 0),
            'end_time': time(17, 0, 0),
            'grace_period': 15
        }
    )
    if created:
        print("Created General Shift")
    else:
        print("General Shift already exists")

    # Create Night Shift
    night_shift, created = Shift.objects.get_or_create(
        name="Night Shift",
        defaults={
            'start_time': time(22, 0, 0),
            'end_time': time(6, 0, 0),
            'grace_period': 30
        }
    )
    if created:
        print("Created Night Shift")

    # Link all active employees to General Shift
    employees = Employee.objects.all()
    count = 0
    for emp in employees:
        if not emp.shift:
            emp.shift = general_shift
            emp.save()
            count += 1
    print(f"Linked {count} employees to General Shift")

if __name__ == '__main__':
    seed()
