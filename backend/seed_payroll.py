import os
import sys
from datetime import datetime, date

# Avoid console encoding issues on Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# Setup django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from django.db import transaction
from employees.models import Employee, Payroll

SALARY_MAP = {
    "sarah.j@enterprise.com": 150000.00,
    "david.c@enterprise.com": 110000.00,
    "elena.r@enterprise.com": 180000.00,
    "marcus.v@enterprise.com": 90000.00,
    "aisha.r@enterprise.com": 85000.00,
    "james.w@enterprise.com": 95000.00,
    "priya.s@enterprise.com": 130000.00,
    "thomas.m@enterprise.com": 80000.00,
    "jessica.t@enterprise.com": 50000.00,
    "daniel.k@enterprise.com": 30000.00,
}

def seed_payroll():
    print("--------------------------------------------------")
    print("STARTING HRMS PAYROLL SEEDING PROCESS...")
    print("--------------------------------------------------")

    employees = list(Employee.objects.all())
    if not employees:
        print("[Error] No employees found in database. Run seed_employees.py first.")
        return

    start_date = date(2026, 5, 1)
    end_date = date(2026, 5, 31)
    pay_date = date(2026, 5, 28)

    created_count = 0

    with transaction.atomic():
        Payroll.objects.all().delete()
        print("Cleared existing payroll records.")

        for emp in employees:
            basic = SALARY_MAP.get(emp.email, 60000.00)
            
            # Formulate calculations
            allowances = round(basic * 0.10, 2)    # 10% allowance (HRA, Travel etc.)
            deductions = round(basic * 0.05, 2)    # 5% PF deduction
            tax = round(basic * 0.12, 2)           # 12% income tax deduction
            bonus = 15000.00 if emp.job_title in ["Tech Lead", "Creative Director", "Director of Product"] else 5000.00
            
            # Net pay = basic + allowances + bonus - deductions - tax
            net_pay = basic + allowances + bonus - deductions - tax

            # Determine payment status
            status = 'PAID' if emp.email != "daniel.k@enterprise.com" else 'PENDING'

            payroll = Payroll.objects.create(
                employee=emp,
                pay_period_start=start_date,
                pay_period_end=end_date,
                basic_salary=basic,
                allowances=allowances,
                deductions=deductions,
                tax=tax,
                bonus=bonus,
                net_pay=net_pay,
                pay_date=pay_date,
                payment_mode='BANK_TRANSFER',
                status=status
            )
            created_count += 1
            print(f"[Payroll] Seeded ledger for {emp.get_full_name} ({emp.employee_id}) - Net Pay: {net_pay} ({status})")

    print("--------------------------------------------------")
    print(f"PAYROLL SEEDING COMPLETED SUCCESSFULLY! Seeded {created_count} records.")
    print("--------------------------------------------------")

if __name__ == "__main__":
    seed_payroll()
