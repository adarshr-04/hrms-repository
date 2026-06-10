import os
import sys
import random
from datetime import datetime, timedelta

# Set encoding to prevent Windows cp1252 print errors
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.db import transaction
from employees.models import Employee, Attendance, Leave, Project, ProjectAssignment

def seed_dashboard():
    print("STARTING HRMS DASHBOARD SEEDING PROCESS...")
    print("-" * 50)

    employees = list(Employee.objects.all())
    if not employees:
        print("[Error] No employees found in the database. Please run the seed_employees.py script first!")
        return

    print(f"Found {len(employees)} employees in database. Seeding historical attendance and logs...")

    # --- 1. SEED HISTORICAL ATTENDANCE ---
    # We will seed the past 5 workdays of attendance (excluding weekends if we can, or just the past 5 calendar days for simple visual)
    today = datetime.now().date()
    dates_to_seed = []
    
    # Generate the last 5 days
    for i in range(5):
        day = today - timedelta(days=i)
        dates_to_seed.append(day)
    
    dates_to_seed.sort() # Chronological order

    attendance_status_options = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'LATE', 'HALF_DAY', 'ABSENT']

    attendance_created = 0
    attendance_skipped = 0

    with transaction.atomic():
        # Clear existing attendance to avoid conflict
        Attendance.objects.all().delete()
        print("Cleared existing attendance records.")

        for seed_date in dates_to_seed:
            for emp in employees:
                # Randomize status
                status = random.choice(attendance_status_options)
                
                # Check-in/out times
                if status in ['PRESENT', 'LATE', 'HALF_DAY']:
                    if status == 'PRESENT':
                        check_in = "09:00:00"
                        check_out = "18:00:00"
                        work_hours = 9.0
                    elif status == 'LATE':
                        check_in = "09:45:00"
                        check_out = "18:00:00"
                        work_hours = 8.25
                    else:
                        check_in = "13:00:00"
                        check_out = "17:00:00"
                        work_hours = 4.0
                    
                    Attendance.objects.create(
                        employee=emp,
                        attendance_date=seed_date,
                        check_in=check_in,
                        check_out=check_out,
                        work_hours=work_hours,
                        status=status,
                        notes=f"Auto-logged check-in on {seed_date}"
                    )
                else:
                    # Absent
                    Attendance.objects.create(
                        employee=emp,
                        attendance_date=seed_date,
                        status='ABSENT',
                        notes="Unexcused absence logged by scheduler."
                    )
                attendance_created += 1

    print(f"[Attendance] Successfully seeded {attendance_created} historical logs across 5 days!")

    # --- 2. SEED LEAVES ---
    print("\nSeeding Leave Requests...")
    with transaction.atomic():
        Leave.objects.all().delete()
        print("Cleared existing leave requests.")

        # Seed 3 Pending Leaves
        pending_leaves = [
            ("SICK", 2, "High fever and medical rest required"),
            ("CASUAL", 1, "Family function out of town"),
            ("ANNUAL", 5, "Personal travel planned with family")
        ]
        
        for i, (l_type, days, reason) in enumerate(pending_leaves):
            emp = employees[i % len(employees)]
            start = today + timedelta(days=random.randint(1, 5))
            end = start + timedelta(days=days - 1)
            Leave.objects.create(
                employee=emp,
                leave_type=l_type,
                start_date=start,
                end_date=end,
                total_days=days,
                reason=reason,
                status='PENDING'
            )
            print(f"[Leave] Created PENDING leave for {emp.first_name} ({l_type})")

        # Seed 2 Approved Leaves
        approved_leaves = [
            ("SICK", 1, "Dental checkup and extraction procedure"),
            ("CASUAL", 2, "Moving to a new apartment")
        ]
        for i, (l_type, days, reason) in enumerate(approved_leaves):
            emp = employees[(i + 3) % len(employees)]
            start = today - timedelta(days=random.randint(2, 6))
            end = start + timedelta(days=days - 1)
            # Find an admin to be approver
            approver = employees[0]
            Leave.objects.create(
                employee=emp,
                leave_type=l_type,
                start_date=start,
                end_date=end,
                total_days=days,
                reason=reason,
                status='APPROVED',
                approver=approver,
                approved_date=today - timedelta(days=7)
            )
            print(f"[Leave] Created APPROVED leave for {emp.first_name} ({l_type})")

        # Seed 1 Rejected Leave
        emp = employees[random.randint(0, len(employees) - 1)]
        Leave.objects.create(
            employee=emp,
            leave_type='UNPAID',
            start_date=today + timedelta(days=10),
            end_date=today + timedelta(days=20),
            total_days=10,
            reason=f"Extended international summer holiday",
            status='REJECTED',
            approver=employees[0],
            approved_date=today
        )
        print(f"[Leave] Created REJECTED leave for {emp.first_name} (UNPAID)")

    # --- 3. SEED PROJECTS ---
    print("\nSeeding Active and Completed Projects...")
    with transaction.atomic():
        Project.objects.all().delete()
        print("Cleared existing projects.")

        projects_data = [
            ("HRMS Enterprise Portal", "IN_PROGRESS", today - timedelta(days=30)),
            ("AWS Cloud Infrastructure Migration", "IN_PROGRESS", today - timedelta(days=15)),
            ("Presales Generative AI Demo System", "PLANNING", today + timedelta(days=5)),
            ("Legacy API Offloading", "COMPLETED", today - timedelta(days=60), today - timedelta(days=5))
        ]

        for p_data in projects_data:
            name, status, start_date = p_data[0], p_data[1], p_data[2]
            end_date = p_data[3] if len(p_data) > 3 else None
            
            proj = Project.objects.create(
                project_name=name,
                status=status,
                start_date=start_date,
                end_date=end_date
            )
            print(f"[Project] Created: {name} ({status})")

            # Assign 2-3 random employees to each project
            assigned_emps = random.sample(employees, k=min(3, len(employees)))
            for emp in assigned_emps:
                ProjectAssignment.objects.create(
                    employee=emp,
                    project=proj,
                    role=random.choice(["Lead Engineer", "Frontend Developer", "Backend Engineer", "QA Specialist", "Product Owner"]),
                    assigned_date=start_date
                )

    print("-" * 50)
    print("DASHBOARD DATA SEEDING COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    seed_dashboard()
