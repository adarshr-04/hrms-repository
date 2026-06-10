import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from employees.models import Employee, Department, Role, UserRole

def create_admin_users():
    # Ensure SUPER_ADMIN role exists
    super_admin_role, _ = Role.objects.get_or_create(
        role_name="SUPER_ADMIN",
        defaults={"description": "Super admin permissions."}
    )
    admin_role, _ = Role.objects.get_or_create(
        role_name="ADMIN",
        defaults={"description": "Admin permissions."}
    )

    dept, _ = Department.objects.get_or_create(
        department_name="Executive",
        defaults={"description": "Executive Leadership"}
    )

    # Super Admin
    user_sa, _ = User.objects.get_or_create(username='superadmin', defaults={
        'email': 'superadmin@enterprise.com', 'first_name': 'Super', 'last_name': 'Admin'
    })
    user_sa.set_password('password123')
    user_sa.is_superuser = True
    user_sa.is_staff = True
    user_sa.save()
    
    emp_sa, _ = Employee.objects.get_or_create(email='superadmin@enterprise.com', defaults={
        'user': user_sa, 'first_name': 'Super', 'last_name': 'Admin',
        'gender': 'M', 'phone_number': '1112223333', 'job_title': 'Super Admin',
        'employment_type': 'FULL_TIME', 'status': 'ACTIVE', 'department': dept
    })
    UserRole.objects.get_or_create(employee=emp_sa, role=super_admin_role)

    # Admin
    user_a, _ = User.objects.get_or_create(username='admin', defaults={
        'email': 'admin@enterprise.com', 'first_name': 'Normal', 'last_name': 'Admin'
    })
    user_a.set_password('password123')
    user_a.is_staff = True
    user_a.save()
    
    emp_a, _ = Employee.objects.get_or_create(email='admin@enterprise.com', defaults={
        'user': user_a, 'first_name': 'Normal', 'last_name': 'Admin',
        'gender': 'F', 'phone_number': '4445556666', 'job_title': 'Admin',
        'employment_type': 'FULL_TIME', 'status': 'ACTIVE', 'department': dept
    })
    UserRole.objects.get_or_create(employee=emp_a, role=admin_role)

    print("Successfully created SUPER_ADMIN (superadmin@enterprise.com / password123) and ADMIN (admin@enterprise.com / password123)")

if __name__ == "__main__":
    create_admin_users()
