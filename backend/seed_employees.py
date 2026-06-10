import os
import sys
import urllib.request
import django
from django.core.files import File
from tempfile import NamedTemporaryFile

# Avoid console encoding issues on Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# Setup django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from employees.models import Employee, Department, Role, UserRole

# Define professional departments
DEPARTMENTS = [
    {"name": "Engineering", "desc": "Software design, architecture, and technology systems."},
    {"name": "Human Resources", "desc": "Talent acquisition, employee welfare, and operations."},
    {"name": "Product Management", "desc": "Product vision, design, strategy, and roadmap planning."},
    {"name": "Marketing", "desc": "Brand strategy, growth hacking, and external communications."},
    {"name": "Sales", "desc": "Enterprise sales, client relations, and revenue generation."}
]

# Define roles and descriptions
ROLES = [
    {"name": "ADMIN", "desc": "Full organizational admin permissions."},
    {"name": "HR", "desc": "Human Resources manager permissions for onboarding, directories, payroll, and recruitment."},
    {"name": "DEPT_MANAGER", "desc": "Department manager permissions to view and manage direct subordinate teams."},
    {"name": "EMPLOYEE", "desc": "Regular employee permissions to track personal leaves, attendance, and details."}
]

# Define 10 high-quality, professional employee profiles with real Unsplash headshot links
EMPLOYEES_DATA = [
    {
        "first_name": "Sarah",
        "last_name": "Jenkins",
        "email": "sarah.j@enterprise.com",
        "gender": "F",
        "phone_number": "+1 (555) 019-2834",
        "job_title": "Tech Lead",
        "employment_type": "FULL_TIME",
        "status": "ACTIVE",
        "department_name": "Engineering",
        "role_name": "DEPT_MANAGER",
        "manager_email": None,
        "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&q=80"
    },
    {
        "first_name": "David",
        "last_name": "Chen",
        "email": "david.c@enterprise.com",
        "gender": "M",
        "phone_number": "+1 (555) 014-9921",
        "job_title": "Senior Frontend Engineer",
        "employment_type": "FULL_TIME",
        "status": "ACTIVE",
        "department_name": "Engineering",
        "role_name": "EMPLOYEE",
        "manager_email": "sarah.j@enterprise.com",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80"
    },
    {
        "first_name": "Elena",
        "last_name": "Rostova",
        "email": "elena.r@enterprise.com",
        "gender": "F",
        "phone_number": "+1 (555) 012-4458",
        "job_title": "Director of Product",
        "employment_type": "FULL_TIME",
        "status": "ACTIVE",
        "department_name": "Product Management",
        "role_name": "DEPT_MANAGER",
        "manager_email": None,
        "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&q=80"
    },
    {
        "first_name": "Marcus",
        "last_name": "Vance",
        "email": "marcus.v@enterprise.com",
        "gender": "M",
        "phone_number": "+1 (555) 018-7741",
        "job_title": "Enterprise Account Executive",
        "employment_type": "FULL_TIME",
        "status": "ACTIVE",
        "department_name": "Sales",
        "role_name": "DEPT_MANAGER",
        "manager_email": None,
        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80"
    },
    {
        "first_name": "Aisha",
        "last_name": "Rahman",
        "email": "aisha.r@enterprise.com",
        "gender": "F",
        "phone_number": "+1 (555) 017-3329",
        "job_title": "HR Manager",
        "employment_type": "FULL_TIME",
        "status": "ACTIVE",
        "department_name": "Human Resources",
        "role_name": "HR",
        "manager_email": None,
        "avatar_url": "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&h=400&fit=crop&q=80"
    },
    {
        "first_name": "James",
        "last_name": "Wilson",
        "email": "james.w@enterprise.com",
        "gender": "M",
        "phone_number": "+1 (555) 015-8832",
        "job_title": "DevOps Specialist",
        "employment_type": "FULL_TIME",
        "status": "ACTIVE",
        "department_name": "Engineering",
        "role_name": "EMPLOYEE",
        "manager_email": "sarah.j@enterprise.com",
        "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80"
    },
    {
        "first_name": "Priya",
        "last_name": "Sharma",
        "email": "priya.s@enterprise.com",
        "gender": "F",
        "phone_number": "+1 (555) 013-1192",
        "job_title": "Creative Director",
        "employment_type": "FULL_TIME",
        "status": "ACTIVE",
        "department_name": "Marketing",
        "role_name": "DEPT_MANAGER",
        "manager_email": None,
        "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&q=80"
    },
    {
        "first_name": "Thomas",
        "last_name": "Mueller",
        "email": "thomas.m@enterprise.com",
        "gender": "M",
        "phone_number": "+1 (555) 016-5541",
        "job_title": "UI/UX Designer",
        "employment_type": "FULL_TIME",
        "status": "ACTIVE",
        "department_name": "Product Management",
        "role_name": "EMPLOYEE",
        "manager_email": "elena.r@enterprise.com",
        "avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&q=80"
    },
    {
        "first_name": "Jessica",
        "last_name": "Taylor",
        "email": "jessica.t@enterprise.com",
        "gender": "F",
        "phone_number": "+1 (555) 019-1122",
        "job_title": "Customer Success Specialist",
        "employment_type": "CONTRACT",
        "status": "ACTIVE",
        "department_name": "Sales",
        "role_name": "EMPLOYEE",
        "manager_email": "marcus.v@enterprise.com",
        "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&q=80"
    },
    {
        "first_name": "Daniel",
        "last_name": "Kim",
        "email": "daniel.k@enterprise.com",
        "gender": "M",
        "phone_number": "+1 (555) 011-2233",
        "job_title": "Growth Marketer",
        "employment_type": "INTERN",
        "status": "ACTIVE",
        "department_name": "Marketing",
        "role_name": "EMPLOYEE",
        "manager_email": "priya.s@enterprise.com",
        "avatar_url": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&q=80"
    }
]

def seed_data():
    print("--------------------------------------------------")
    print("STARTING HRMS DATABASE SEEDING PROCESS...")
    print("--------------------------------------------------")

    # 1. Create/Retrieve Roles
    role_map = {}
    for r_info in ROLES:
        role, created = Role.objects.get_or_create(
            role_name=r_info["name"],
            defaults={"description": r_info["desc"]}
        )
        role_map[r_info["name"]] = role
        action = "Created" if created else "Found existing"
        print(f"[Role] {action}: {role.role_name}")

    # 2. Create/Retrieve Departments
    dept_map = {}
    for d_info in DEPARTMENTS:
        dept, created = Department.objects.get_or_create(
            department_name=d_info["name"],
            defaults={"description": d_info["desc"]}
        )
        dept_map[d_info["name"]] = dept
        action = "Created" if created else "Found existing"
        print(f"[Department] {action}: {dept.department_name}")

    print("\n--------------------------------------------------")
    print("SEEDING 10 SAMPLE EMPLOYEES & AVATARS...")
    print("--------------------------------------------------")

    for i, emp_data in enumerate(EMPLOYEES_DATA, 1):
        email = emp_data["email"]
        first = emp_data["first_name"]
        last = emp_data["last_name"]
        full_name = f"{first} {last}"
        
        # Check if employee already exists
        employee_exists = Employee.objects.filter(email=email).first()
        if employee_exists:
            print(f"[Skip] Employee '{full_name}' ({email}) already exists. Setting role.")
            # Set the user role even if employee exists
            role_obj = role_map[emp_data["role_name"]]
            UserRole.objects.get_or_create(employee=employee_exists, role=role_obj)
            continue

        # A. Create standard user for login
        username = email.split('@')[0]
        user, u_created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": first,
                "last_name": last,
                "is_active": True
            }
        )
        if u_created:
            user.set_password("password123")
            user.save()

        # B. Instantiate Employee Profile
        employee = Employee(
            user=user,
            first_name=first,
            last_name=last,
            gender=emp_data["gender"],
            email=email,
            phone_number=emp_data["phone_number"],
            job_title=emp_data["job_title"],
            employment_type=emp_data["employment_type"],
            status=emp_data["status"],
            department=dept_map[emp_data["department_name"]]
        )

        # C. Download Professional Avatar Image
        avatar_url = emp_data["avatar_url"]
        try:
            print(f"[Download] Downloading avatar for {full_name}...")
            
            # Use custom User-Agent header to avoid HTTP 403 Forbidden issues from Unsplash
            req = urllib.request.Request(
                avatar_url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                img_temp = NamedTemporaryFile(delete=True)
                img_temp.write(response.read())
                img_temp.flush()
                
                # Assign file to the Django ImageField
                filename = f"avatar_{first.lower()}_{last.lower()}.jpg"
                employee.avatar.save(filename, File(img_temp), save=False)
                
        except Exception as e:
            print(f"[Warning] Could not download avatar for {full_name}: {e}")

        # D. Save Employee row (triggers ID auto-generation)
        employee.save()
        
        # E. Assign Role in UserRole Table
        role_obj = role_map[emp_data["role_name"]]
        UserRole.objects.get_or_create(employee=employee, role=role_obj)
        
        print(f"[Success] Seeded Employee: {employee.employee_id} - {full_name} as '{employee.job_title}' with role '{role_obj.role_name}'")

    print("\n--------------------------------------------------")
    print("ESTABLISHING MANAGER-SUBORDINATE RELATIONSHIPS...")
    print("--------------------------------------------------")
    for emp_data in EMPLOYEES_DATA:
        if emp_data["manager_email"]:
            try:
                emp = Employee.objects.get(email=emp_data["email"])
                mgr = Employee.objects.get(email=emp_data["manager_email"])
                emp.manager = mgr
                emp.save()
                print(f"[Link] Set manager of {emp.get_full_name} to {mgr.get_full_name}")
            except Exception as e:
                print(f"[Error] Failed to link manager for {emp_data['email']}: {e}")

    print("\n--------------------------------------------------")
    print("DATABASE SEEDING COMPLETED SUCCESSFULLY!")
    print("--------------------------------------------------")

if __name__ == "__main__":
    seed_data()
