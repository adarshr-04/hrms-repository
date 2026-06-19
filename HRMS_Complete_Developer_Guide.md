# HRMS Enterprise — Complete Developer Implementation Guide

**Document Type:** Developer Handover — Full Implementation Reference  
**Project:** Human Resource Management System (HRMS Enterprise)  
**Period:** May 2026 – June 2026  
**Author:** Adarsh  
**Prepared For:** Rounak (Continuation Developer)  

---

## Table of Contents

1. [Project Overview & Architecture](#1-project-overview--architecture)
2. [Technology Stack & Dependencies](#2-technology-stack--dependencies)
3. [Project Folder Structure (Complete)](#3-project-folder-structure-complete)
4. [Database Design — All Models Explained](#4-database-design--all-models-explained)
5. [Authentication System — Complete Flow](#5-authentication-system--complete-flow)
6. [Role-Based Access Control (RBAC) — Core Logic](#6-role-based-access-control-rbac--core-logic)
7. [Backend ViewSets — Logic & Permission Enforcement](#7-backend-viewsets--logic--permission-enforcement)
8. [Django Signals — Automated Notifications & Emails](#8-django-signals--automated-notifications--emails)
9. [Frontend Architecture & Routing](#9-frontend-architecture--routing)
10. [API Endpoint Reference](#10-api-endpoint-reference)
11. [Migration History — Database Changes](#11-migration-history--database-changes)
12. [Feature Implementation Log — Phase by Phase](#12-feature-implementation-log--phase-by-phase)
13. [Known Issues & Future Improvements](#13-known-issues--future-improvements)

---

## 1. Project Overview & Architecture

HRMS Enterprise is a **decoupled full-stack web application**:

```
Browser (React + Vite)
        │
        │  HTTP/REST (JSON over HTTPS)
        │  Authorization: Bearer <JWT_TOKEN>
        ▼
Django REST Framework (Python)
        │
        │  Django ORM (SQL queries)
        ▼
SQLite Database (db.sqlite3)
```

### Key Design Decisions Made

| Decision | Reason |
|---|---|
| Decoupled frontend + backend | Allows independent deployment and scaling of each layer |
| JWT (stateless auth) | No server-side session storage needed; easy to scale horizontally |
| SQLite for development | Zero setup for new developers; easy migration to PostgreSQL for production |
| Single Django App (`employees`) | All models in one app simplifies ORM queries and import paths |
| Soft delete for employees | Preserves payroll history and audit trail; GDPR compliance |
| Console email backend | No SMTP server required during development |

---

## 2. Technology Stack & Dependencies

### Backend (`requirements.txt`)

```
Django==6.0
djangorestframework==3.17
djangorestframework-simplejwt==5.5      ← JWT tokens
django-cors-headers==4.7                ← CORS for React frontend
django-filter==25.1                     ← ?filter_by=value query support
Pillow==11.2                            ← Image handling (avatar uploads)
pandas==2.2                             ← Excel/CSV parsing for bulk import
openpyxl==3.1                           ← .xlsx file read/write
```

### Frontend (`package.json`)

```
react@19                                ← UI framework
typescript                              ← Type safety
vite@8                                  ← Dev server + build tool
axios                                   ← HTTP client (API calls)
react-router-dom                        ← Client-side page routing
tailwindcss@4                           ← Utility CSS framework
jspdf + html2canvas                     ← Offer Letter PDF generation
lucide-react                            ← Icon library
react-hot-toast                         ← Toast notifications
```

---

## 3. Project Folder Structure (Complete)

```
HRMS/
├── README.md                           ← Setup & run guide
├── CHANGELOG.md                        ← Version history
├── CONTRIBUTING.md                     ← How to add features
├── HRMS_User_Manual.md                 ← Non-technical user guide
├── HRMS_Technical_Implementation.md    ← Technical handover doc
├── HRMS_Complete_Developer_Guide.md    ← THIS DOCUMENT
├── requirements.txt                    ← Python dependencies
│
├── backend/
│   ├── manage.py                       ← Django CLI entry point
│   ├── db.sqlite3                      ← SQLite database file (gitignored)
│   ├── .env.example                    ← Config template
│   ├── media/                          ← Uploaded files (avatars, docs)
│   │
│   ├── core/
│   │   ├── settings.py                 ← Django config (CORS, JWT, email, DB)
│   │   ├── urls.py                     ← Root URL router
│   │   └── wsgi.py / asgi.py           ← Web server interfaces
│   │
│   └── employees/                      ← Core Django application
│       ├── admin.py                    ← Django admin panel registrations
│       ├── apps.py                     ← App config + signal registration
│       ├── backends.py                 ← Custom email-or-username login
│       ├── utils.py                    ← get_user_role() RBAC resolver
│       ├── urls.py                     ← All API route registrations
│       │
│       ├── models/
│       │   ├── __init__.py             ← Re-exports all models
│       │   ├── employee.py             ← Employee, Department, Document, Designation
│       │   ├── branch.py               ← Branch
│       │   ├── accounts.py             ← Role, UserRole, Notification, PasswordResetCode,
│       │   │                               EmployeeInviteToken, Announcement
│       │   ├── attendance.py           ← Shift, Attendance
│       │   ├── leave.py                ← Leave
│       │   ├── payroll.py              ← Payroll
│       │   ├── project.py              ← Project, ProjectAssignment, TaskLog
│       │   ├── recruitment.py          ← JobPosting, Candidate, Application, Interview,
│       │   │                               OfferLetter
│       │   └── training.py             ← Training, Enrollment
│       │
│       ├── serializers/
│       │   ├── __init__.py             ← Re-exports all serializers
│       │   ├── employee.py             ← Employee, Department, Branch, Designation
│       │   ├── accounts.py             ← User, Notification, Announcement
│       │   ├── attendance.py           ← Shift, Attendance
│       │   ├── leave.py                ← Leave
│       │   ├── payroll.py              ← Payroll
│       │   ├── project.py              ← Project, Assignment, TaskLog
│       │   ├── recruitment.py          ← Job, Candidate, Application, Interview, Offer
│       │   └── training.py             ← Training, Enrollment
│       │
│       ├── views/
│       │   ├── __init__.py             ← Re-exports all ViewSets
│       │   ├── employee.py             ← Employee, Department, Branch, Designation, Document
│       │   ├── accounts.py             ← Profile, ForgotPassword, Notifications, Invite
│       │   ├── attendance.py           ← Shift, Attendance
│       │   ├── leave.py                ← Leave
│       │   ├── payroll.py              ← Payroll
│       │   ├── project.py              ← Project, Assignment, TaskLog
│       │   ├── recruitment.py          ← Job, Candidate, Application, Interview, Offer
│       │   ├── training.py             ← Training, Enrollment
│       │   └── reports.py              ← Excel export views
│       │
│       ├── signals/
│       │   └── handlers.py             ← All post_save signal handlers
│       │
│       └── migrations/
│           ├── 0001_initial.py         ← All initial models
│           ├── 0002_*.py               ← Payroll, project additions
│           ├── 0003_delete_attendancerequest.py
│           ├── 0004_branch_attendance_check_in_address_and_more.py
│           ├── 0005_remove_attendance_check_in_address_and_more.py
│           ├── 0006_designation.py
│           └── 0007_populate_designations.py
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── App.tsx                     ← Route declarations
        ├── main.tsx                    ← React DOM entry point
        ├── index.css                   ← Global styles + Tailwind
        │
        ├── context/
        │   └── AuthContext.tsx         ← Global user session state
        │
        ├── lib/
        │   └── api.ts                  ← Axios instance with JWT header
        │
        ├── components/
        │   └── layout/
        │       ├── Sidebar.tsx         ← Navigation sidebar
        │       └── Header.tsx          ← Top header bar
        │
        ├── pages/
        │   ├── page.tsx                ← Dashboard (home)
        │   ├── login/page.tsx          ← Login + Forgot password
        │   ├── activate/page.tsx       ← New employee account activation
        │   ├── employees/
        │   │   ├── page.tsx            ← Employee list + search
        │   │   ├── add/page.tsx        ← Add new employee form
        │   │   ├── edit/page.tsx       ← Edit employee form
        │   │   └── details/page.tsx    ← Employee detail view
        │   ├── attendance/page.tsx     ← Attendance table + Tap In/Out
        │   ├── leaves/page.tsx         ← Leave requests + approvals
        │   ├── payroll/page.tsx        ← Payroll list + generate payslip
        │   ├── projects/page.tsx       ← Project management
        │   ├── recruitment/page.tsx    ← Full recruitment pipeline
        │   ├── training/page.tsx       ← Training programs
        │   ├── settings/page.tsx       ← Company config CRUD
        │   ├── reports/page.tsx        ← Excel report export
        │   └── profile/page.tsx        ← User profile settings
        │
        ├── services/
        │   ├── employeeService.ts      ← Employee, Dept, Branch, Designation APIs
        │   ├── attendanceService.ts    ← Attendance + Shift APIs
        │   ├── leaveService.ts         ← Leave APIs
        │   ├── payrollService.ts       ← Payroll APIs
        │   ├── projectService.ts       ← Project APIs
        │   ├── recruitmentService.ts   ← Recruitment pipeline APIs
        │   └── trainingService.ts      ← Training APIs
        │
        └── types/
            └── index.ts                ← TypeScript interfaces for all models
```

---

## 4. Database Design — All Models Explained

### Base Model (Abstract)

All models inherit from `BaseModel` which adds two automatic timestamp fields:

```python
# backend/employees/models/employee.py
class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)  # Set once on creation
    updated_at = models.DateTimeField(auto_now=True)       # Updated on every save
    class Meta:
        abstract = True   # Not a real table — just inherited
```

---

### Employee Model (Core Entity)

**File:** `backend/employees/models/employee.py`

```python
class Employee(BaseModel):
    user        = OneToOneField(User, related_name='employee_profile')  # linked Django user
    employee_id = CharField(unique=True)          # Auto-generated: PITS-0001
    first_name  = CharField(max_length=100)
    last_name   = CharField(blank=True, null=True)
    email       = EmailField(unique=True)
    gender      = CharField(choices=['M','F','O'])
    phone_number = CharField(blank=True, null=True)
    date_of_birth = DateField(blank=True, null=True)
    hire_date   = DateField(blank=True, null=True)
    job_title   = CharField(blank=True, null=True)
    employment_type = CharField(choices=['FULL_TIME','PART_TIME','CONTRACT','INTERN'])
    status      = CharField(choices=['ACTIVE','INACTIVE','TERMINATED','ON_LEAVE'])
    avatar      = ImageField(upload_to='avatars/')
    department  = ForeignKey(Department, SET_NULL)
    branch      = ForeignKey(Branch, SET_NULL)
    manager     = ForeignKey('self', SET_NULL)    # Self-referential for hierarchy
    shift       = ForeignKey('Shift', SET_NULL)
    end_date    = DateField(null=True, blank=True)  # Populated on termination
```

**Auto ID Generation Logic (`save()` method):**

```python
def save(self, *args, **kwargs):
    if not self.employee_id:          # Only if no ID has been set
        with transaction.atomic():    # Lock DB to prevent race conditions
            last_employee = Employee.objects.select_for_update().order_by('id').last()
            next_id = (last_employee.id + 1) if last_employee else 1
            candidate = f'PITS-{next_id:04d}'   # Format: PITS-0001
            while Employee.objects.filter(employee_id=candidate).exists():
                next_id += 1
                candidate = f'PITS-{next_id:04d}'
            self.employee_id = candidate
    super().save(*args, **kwargs)
```

**Why `select_for_update()`?** When multiple employees are created simultaneously (e.g., bulk import), without this lock, two processes could read the same "last ID" and generate duplicate IDs.

---

### Role & UserRole Models

**File:** `backend/employees/models/accounts.py`

```python
class Role(BaseModel):
    role_name = CharField(unique=True)    # 'ADMIN', 'HR', 'DEPT_MANAGER', 'EMPLOYEE'

class UserRole(BaseModel):
    employee  = ForeignKey(Employee, related_name='roles')
    role      = ForeignKey(Role)
    # One employee can hold multiple roles (e.g., HR + DEPT_MANAGER)
```

**Why separate Role and UserRole?** One employee can have multiple roles. For example, a senior HR officer could be both `HR` and `DEPT_MANAGER`. The `get_user_role()` function always resolves the **highest priority role**.

---

### PasswordResetCode Model

```python
class PasswordResetCode(BaseModel):
    user    = ForeignKey(User)
    code    = CharField(max_length=6)    # 6-digit code e.g. "482931"
    is_used = BooleanField(default=False)
```

When a password reset is requested, old unused codes are marked as `is_used=True` first (invalidated), then a new one is created.

---

### EmployeeInviteToken Model

```python
class EmployeeInviteToken(BaseModel):
    employee   = OneToOneField(Employee)
    token      = UUIDField(default=uuid.uuid4, unique=True)  # Random UUID
    is_used    = BooleanField(default=False)
    expires_at = DateTimeField()    # Set to created_at + 72 hours

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at
```

---

### Attendance Model

```python
class Attendance(BaseModel):
    STATUS_CHOICES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'TAPPED_IN', 'TAPPED_OUT']
    employee        = ForeignKey(Employee)
    attendance_date = DateField()
    check_in        = TimeField(null=True)
    check_out       = TimeField(null=True)
    work_hours      = DecimalField(max_digits=5, decimal_places=2, null=True)
    status          = CharField(choices=STATUS_CHOICES)
    shift           = ForeignKey(Shift, null=True)
    notes           = TextField(blank=True)
```

**Continuous Tap Logic (implemented in frontend):**  
When an employee taps out and then taps again, the frontend sends a `PATCH` request with `check_in: newTime, check_out: null` to reset the record for another tap-in session. Work hours are accumulated per session.

---

### Leave Model

```python
class Leave(BaseModel):
    STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']
    TYPES  = ['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER']
    employee    = ForeignKey(Employee)
    leave_type  = CharField(choices=TYPES)
    start_date  = DateField()
    end_date    = DateField()
    total_days  = IntegerField()
    reason      = TextField()
    status      = CharField(choices=STATUS, default='PENDING')
    approved_by = ForeignKey(User, null=True)
    approved_at = DateTimeField(null=True)
```

---

### Payroll Model

```python
class Payroll(BaseModel):
    STATUS = ['DRAFT', 'PENDING', 'PAID', 'CANCELLED']
    employee        = ForeignKey(Employee)
    pay_period_start = DateField()
    pay_period_end   = DateField()
    basic_salary     = DecimalField()
    hra              = DecimalField()    # House Rent Allowance
    conveyance       = DecimalField()
    medical          = DecimalField()
    other_allowances = DecimalField()
    pf_deduction     = DecimalField()   # Provident Fund
    tax_deduction    = DecimalField()
    other_deductions = DecimalField()
    gross_salary     = DecimalField()
    net_salary       = DecimalField()
    status           = CharField(choices=STATUS, default='DRAFT')
    paid_on          = DateField(null=True)
    payment_method   = CharField(null=True)
    notes            = TextField(blank=True)
```

---

### Project Models

```python
class Project(BaseModel):
    STATUS = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']
    name        = CharField()
    description = TextField()
    status      = CharField(choices=STATUS)
    start_date  = DateField()
    end_date    = DateField(null=True)
    manager     = ForeignKey(Employee, null=True)  # Project Lead

class ProjectAssignment(BaseModel):
    project  = ForeignKey(Project)
    employee = ForeignKey(Employee)
    role     = CharField()      # e.g., "Developer", "Tester"
    joined_at = DateField()

class TaskLog(BaseModel):
    project     = ForeignKey(Project)
    employee    = ForeignKey(Employee)
    task_date   = DateField()
    description = TextField()
    hours_spent = DecimalField()
```

---

### Recruitment Models

```python
class JobPosting(BaseModel):
    title           = CharField()
    department      = ForeignKey(Department)
    description     = TextField()
    requirements    = TextField()
    vacancies       = IntegerField()
    status          = CharField(['OPEN','CLOSED','ON_HOLD'])
    posted_by       = ForeignKey(User)
    application_deadline = DateField(null=True)

class Candidate(BaseModel):
    first_name = CharField()
    last_name  = CharField()
    email      = EmailField(unique=True)
    phone      = CharField()
    resume     = FileField(null=True)

class Application(BaseModel):
    STATUS = ['APPLIED','SCREENING','INTERVIEW','OFFER','HIRED','REJECTED']
    job       = ForeignKey(JobPosting)
    candidate = ForeignKey(Candidate)
    status    = CharField(choices=STATUS, default='APPLIED')
    applied_at = DateTimeField(auto_now_add=True)

class Interview(BaseModel):
    application    = ForeignKey(Application)
    interviewer    = ForeignKey(Employee, null=True)
    interview_date = DateTimeField()
    location       = CharField()
    status         = CharField(['SCHEDULED','COMPLETED','CANCELLED','NO_SHOW'])
    feedback       = TextField(blank=True)
    rating         = IntegerField(null=True)   # 1–5

class OfferLetter(BaseModel):
    application   = ForeignKey(Application)
    salary_offered = DecimalField()
    joining_date   = DateField()
    validity_date  = DateField()
    status        = CharField(['SENT','ACCEPTED','REJECTED','WITHDRAWN'])
    offered_by    = ForeignKey(User)
```

---

### Training Models

```python
class Training(BaseModel):
    training_name = CharField()
    description   = TextField()
    trainer       = CharField()     # External trainer name (string)
    start_date    = DateField()
    end_date      = DateField()
    status        = CharField(['UPCOMING','ONGOING','COMPLETED','CANCELLED'])
    department    = ForeignKey(Department, null=True)

class Enrollment(BaseModel):
    employee = ForeignKey(Employee)
    training = ForeignKey(Training)
    enrolled_at = DateTimeField(auto_now_add=True)
    status   = CharField(['ENROLLED','IN_PROGRESS','COMPLETED','DROPPED'])
    score    = DecimalField(null=True)   # Completion score %
    feedback = TextField(blank=True)
```

---

## 5. Authentication System — Complete Flow

### Flow 1: Existing User Login

```
User enters email/password on Login page
        │
        ▼
POST /api/token/  { "username": "john@company.com", "password": "xxx" }
        │
        ▼  Django's TokenObtainPairView calls AUTHENTICATION_BACKENDS
        │
        ▼
EmailOrUsernameModelBackend.authenticate()
   → UserModel.objects.get(Q(username=username) | Q(email=username))
   → user.check_password(password)
        │
        ▼
Returns { "access": "<JWT>", "refresh": "<JWT>" }
        │
        ▼
Frontend stores tokens in localStorage
AuthContext sets user state → redirect to Dashboard
```

**Custom Backend Code (`backends.py`):**

```python
class EmailOrUsernameModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        try:
            # Accepts EITHER email OR username in the "username" field
            user = UserModel.objects.get(Q(username=username) | Q(email=username))
        except UserModel.DoesNotExist:
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
```

**Settings registration (`settings.py`):**
```python
AUTHENTICATION_BACKENDS = [
    'employees.backends.EmailOrUsernameModelBackend',
    'django.contrib.auth.backends.ModelBackend',
]
```

---

### Flow 2: New Employee Onboarding (Invite Token)

```
Admin creates new Employee record
        │
        ▼
Django post_save signal fires (signals/handlers.py → employee_created)
        │
        ▼
EmployeeInviteToken.objects.create(employee=instance)
        │  UUID generated automatically
        ▼
send_mail() sends activation email to employee's email address:
  "Click here: http://localhost:3000/activate?token=<UUID>"
  (In dev mode, this appears in the backend terminal log)
        │
        ▼
Employee clicks link → Frontend Activate page
        │
        ▼
GET /api/accounts/verify-invite/?token=<UUID>
  → Validates token not expired (72 hours) + not already used
  → Returns { email, first_name, last_name }
        │
        ▼
Employee sets password → POST /api/accounts/activate-account/
  { token: "<UUID>", password: "newpassword" }
        │
        ▼
ActivateAccountView (accounts.py):
  1. User.objects.create_user(username, email, password)
  2. employee.user = user → employee.save()
  3. Role.get_or_create('EMPLOYEE') → UserRole.get_or_create(employee, role)
  4. token_obj.is_used = True → token_obj.save()
        │
        ▼
Employee can now log in normally
```

---

### Flow 3: Forgot Password

```
User enters email on Forgot Password form
        │
        ▼
POST /api/accounts/forgot-password/  { "email": "john@company.com" }
        │
        ▼
ForgotPasswordView:
  1. Validate email exists
  2. Invalidate old codes:
     PasswordResetCode.objects.filter(user=user, is_used=False).update(is_used=True)
  3. Generate new 6-digit code:
     code = f"{random.randint(100000, 999999)}"
  4. PasswordResetCode.objects.create(user=user, code=code)
  5. send_mail() → email appears in backend terminal (dev mode)
        │
        ▼
User enters the 6-digit code + new password on the frontend
        │
        ▼
POST /api/accounts/reset-password/  { email, code, new_password }
        │
        ▼
ResetPasswordView:
  1. Find user by email
  2. PasswordResetCode.objects.get(user=user, code=code, is_used=False)
     → If not found: raise ValidationError("Invalid or expired code")
  3. user.set_password(new_password) → user.save()
  4. reset_record.is_used = True → reset_record.save()
```

---

### JWT Token Lifecycle

Every API request from the frontend includes:
```
Authorization: Bearer <access_token>
```

The Axios instance in `frontend/src/lib/api.ts` injects this automatically:
```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

Token refresh is handled via `POST /api/token/refresh/` when the access token expires (configured to 1 day in `settings.py`).

---

## 6. Role-Based Access Control (RBAC) — Core Logic

### The `get_user_role()` Function

**File:** `backend/employees/utils.py`

This is the single source of truth for all permission decisions in the system:

```python
def get_user_role(user):
    # Anonymous users → default to EMPLOYEE (least privileged)
    if not user or user.is_anonymous:
        return 'EMPLOYEE'

    # Django superuser → always SUPER_ADMIN (bypasses all checks)
    if user.is_superuser:
        return 'SUPER_ADMIN'

    # Priority order: higher index = lower priority
    role_priority = ['ADMIN', 'HR', 'DEPT_MANAGER', 'EMPLOYEE']

    try:
        employee_profile = getattr(user, 'employee_profile', None)
        if not employee_profile:
            return 'EMPLOYEE'

        # Fetch all role names assigned to this employee
        role_names = (
            employee_profile.roles          # UserRole queryset
            .select_related('role')
            .values_list('role__role_name', flat=True)
        )
        normalized = {str(name).strip().upper() for name in role_names if name}

        # Return the first match from priority list (highest role wins)
        for role in role_priority:
            if role in normalized:
                return role

        return 'EMPLOYEE'
    except Exception:
        return 'EMPLOYEE'   # Always fail safe
```

### Role Hierarchy Table

| Role | Can See | Can Create/Edit | Can Delete | Special |
|---|---|---|---|---|
| `SUPER_ADMIN` | Everything | Everything | Everything | `is_superuser=True` |
| `ADMIN` | Everything | Everything | Everything | |
| `HR` | Everything | Everything | Everything | Cannot manage roles |
| `DEPT_MANAGER` | Own + Direct Reports | Limited | None | Approve team leaves |
| `EMPLOYEE` | Own records only | Own records only | Own pending records | |

---

## 7. Backend ViewSets — Logic & Permission Enforcement

### Custom Permission Class

**File:** `backend/employees/views/employee.py`

```python
class IsHROrAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user or request.user.is_anonymous:
            return False
        # GET/HEAD/OPTIONS are safe — allow all authenticated users
        if request.method in SAFE_METHODS:
            return True
        # Write operations restricted to privileged roles
        return get_user_role(request.user) in ['SUPER_ADMIN', 'ADMIN', 'HR']
```

This is applied to: `DepartmentViewSet`, `BranchViewSet`, `DesignationViewSet`, `EmployeeViewSet`.

---

### EmployeeViewSet — Key Methods

**Soft Delete (override of `destroy`):**

```python
def destroy(self, request, *args, **kwargs):
    employee = self.get_object()
    employee.status = 'TERMINATED'          # Mark as terminated
    employee.end_date = date.today()        # Record termination date
    employee.save(update_fields=['status', 'end_date', 'updated_at'])
    return Response({'message': f'Employee {employee.employee_id} ... terminated.'})
    # NOTE: No super().destroy() call — record is NEVER actually deleted from DB
```

**Bulk Import (`@action`):**

```python
@action(detail=False, methods=['post'], url_path='bulk-import')
def bulk_import(self, request):
    file = request.FILES.get('file')
    # 1. Parse CSV or Excel using pandas
    df = pd.read_csv(file)  # or pd.read_excel(file)
    df = df.where(pd.notnull(df), None)   # Replace NaN with None

    for index, row in df.iterrows():
        # 2. Resolve department name → Department object (create if new)
        dept_obj, _ = Department.objects.get_or_create(department_name=dept_name)

        # 3. Build payload dict, skip None values
        payload = { 'first_name': ..., 'email': ..., 'department': dept_id }
        payload = {k: v for k, v in payload.items() if v is not None}

        # 4. Run through EmployeeSerializer for validation
        serializer = EmployeeSerializer(data=payload)
        if serializer.is_valid():
            serializer.save()   # Employee.save() auto-generates employee_id
            created_count += 1
        else:
            skipped_count += 1  # Collect errors per row

    return Response({'created': N, 'skipped': M, 'errors': [...]})
```

---

### LeaveViewSet — Queryset Scoping

**File:** `backend/employees/views/leave.py`

The queryset is filtered based on the requester's role:

```python
def get_queryset(self):
    role = get_user_role(user)
    if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
        return Leave.objects.all()                     # See all leaves
    elif role == 'DEPT_MANAGER':
        emp_profile = user.employee_profile
        return Leave.objects.filter(
            Q(employee=emp_profile)                    # Own leaves
            | Q(employee__manager=emp_profile)         # Direct reports' leaves
        )
    else:
        return Leave.objects.filter(employee=emp_profile)  # Own leaves only
```

**Self-leave approval guard (in `perform_update`):**

```python
if new_status != leave_instance.status:     # Status is being changed (approve/reject)
    if role == 'DEPT_MANAGER':
        if employee.manager != emp_profile or employee == emp_profile:
            # Block: manager cannot approve their own leave
            raise PermissionDenied("You can only approve/reject leave requests for your direct reports.")
```

---

### AttendanceViewSet — Same Scoping Pattern

**File:** `backend/employees/views/attendance.py`

Same `get_queryset()` scoping as Leave:
- `SUPER_ADMIN/ADMIN/HR` → all records
- `DEPT_MANAGER` → own + subordinates (`employee__manager=emp_profile`)
- `EMPLOYEE` → own records only

**Key constraint in `perform_create`:**
```python
if role == 'DEPT_MANAGER':
    if employee != emp_profile and employee.manager != emp_profile:
        raise PermissionDenied("You can only log attendance for yourself or your subordinates.")
else:
    if employee != emp_profile:
        raise PermissionDenied("You can only log attendance for yourself.")
```

---

### ProfileView — Superuser Auto-Profile Creation

**File:** `backend/employees/views/accounts.py`

If a superuser logs in but has no linked Employee profile (e.g., freshly created via `createsuperuser`), this logic auto-creates one:

```python
def get(self, request):
    user = request.user
    if (user.is_superuser or user.is_staff) and (not hasattr(user, 'employee_profile')):
        # 1. Check if Employee with same email exists but unlinked
        emp = Employee.objects.filter(email=email).first()
        if emp and emp.user is None:
            emp.user = user
            emp.save()
        elif not emp:
            # 2. Create fresh Employee record
            emp = Employee.objects.create(user=user, first_name=..., email=email)
        # 3. Assign ADMIN role
        admin_role, _ = Role.objects.get_or_create(role_name='ADMIN')
        UserRole.objects.get_or_create(employee=emp, role=admin_role)
```

This is why admin accounts work without needing a separate "create admin profile" step each time.

---

## 8. Django Signals — Automated Notifications & Emails

**File:** `backend/employees/signals/handlers.py`

Signals are Django's pub/sub event system. When a model is saved, the `post_save` signal fires automatically.

**Registration in `apps.py`:**
```python
class EmployeesConfig(AppConfig):
    def ready(self):
        import employees.signals.handlers   # Register all handlers on startup
```

### Signal 1: Employee Created → Send Welcome Email

```python
@receiver(post_save, sender='employees.Employee')
def employee_created(sender, instance, created, **kwargs):
    if created and not instance.user:     # New employee, no user account yet
        token_obj = EmployeeInviteToken.objects.create(employee=instance)
        activation_link = f"http://localhost:3000/activate?token={token_obj.token}"
        send_mail(
            subject="Welcome to HRMS Enterprise - Set Up Your Account",
            message=f"Hello {instance.first_name},\n\nClick: {activation_link}\n\nExpires in 72 hours.",
            from_email='noreply@hrms.com',
            recipient_list=[instance.email],
            fail_silently=True    # Don't crash the app if email fails
        )
```

### Signal 2: Leave Request → Notify Manager + HR

```python
@receiver(post_save, sender='employees.Leave')
def leave_request_changed(sender, instance, created, **kwargs):
    if created:
        # Notify direct manager
        if employee.manager and employee.manager.user:
            Notification.objects.create(
                user=employee.manager.user,
                title="New Leave Request",
                message=f"{employee.get_full_name} has requested {instance.total_days} days ({instance.leave_type}).",
                link="/leaves"
            )
        # Notify all HR/Admin users
        for hr in get_hr_and_admin_users():
            Notification.objects.create(user=hr, ...)
    else:
        # Leave status changed → Notify the employee
        if employee.user:
            Notification.objects.create(
                user=employee.user,
                title=f"Leave Request {instance.get_status_display()}",
                message=f"Your leave request ... has been {instance.status.lower()}.",
            )
```

### Signal 3: Payroll Marked PAID → Notify Employee

```python
@receiver(post_save, sender='employees.Payroll')
def payroll_disbursed(sender, instance, created, **kwargs):
    if instance.status == 'PAID' and employee.user:
        Notification.objects.create(
            user=employee.user,
            title="Payslip Disbursed",
            message=f"Your salary for {instance.pay_period_start} to {instance.pay_period_end} has been disbursed.",
            link="/payroll"
        )
```

### Signal 4: Training Enrolled/Completed → Notify Employee

```python
@receiver(post_save, sender='employees.Enrollment')
def training_enrollment_changed(sender, instance, created, **kwargs):
    if created:
        # Enrolled notification
        Notification.objects.create(user=employee.user, title="New Training Enrollment", ...)
    elif instance.status == 'COMPLETED':
        # Completed notification with score
        score_str = f" with score {instance.score}%" if instance.score else ""
        Notification.objects.create(user=employee.user, title="Training Program Completed", ...)
```

### Signal 5: Recruitment Application → Notify HR

```python
@receiver(post_save, sender='employees.Application')
def recruitment_application_changed(sender, instance, created, **kwargs):
    hr_users = get_hr_and_admin_users()
    for hr in hr_users:
        if created:
            Notification.objects.create(user=hr, title="New Job Application", ...)
        else:
            Notification.objects.create(user=hr, title="Pipeline Candidate Updated", ...)
```

### Signal 6: Interview Assigned/Cancelled → Notify Interviewer

```python
@receiver(post_save, sender='employees.Interview')
def recruitment_interview_changed(sender, instance, created, **kwargs):
    if interviewer and interviewer.user:
        if created:
            Notification.objects.create(
                user=interviewer.user,
                title="New Interview Assigned",
                message=f"Interview for {candidate.first_name} on {instance.interview_date.strftime('%Y-%m-%d %H:%M')}.",
            )
        elif instance.status == 'CANCELLED':
            Notification.objects.create(user=interviewer.user, title="Interview Cancelled", ...)
```

---

## 9. Frontend Architecture & Routing

### Auth Context (`src/context/AuthContext.tsx`)

Global state that tracks the logged-in user:

```typescript
const AuthContext = createContext({
  user: null,          // User + Employee profile data
  isLoading: true,     // True while checking stored token
  login: (tokens) => {},    // Save tokens + fetch profile
  logout: () => {},         // Clear tokens + redirect to login
});
```

On app load, `AuthContext` checks `localStorage` for a stored access token and auto-fetches the user profile. All pages consume this context to know who is logged in and what their role is.

### Axios API Instance (`src/lib/api.ts`)

```typescript
const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
});

// Inject JWT on every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Page Routing (`src/App.tsx`)

```typescript
<Routes>
  <Route path="/login"     element={<LoginPage />} />
  <Route path="/activate"  element={<ActivatePage />} />
  {/* Protected routes (require login) */}
  <Route path="/"          element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
  <Route path="/employees" element={<PrivateRoute><EmployeesPage /></PrivateRoute>} />
  <Route path="/employees/add"       element={<PrivateRoute><AddEmployeePage /></PrivateRoute>} />
  <Route path="/employees/edit/:id"  element={<PrivateRoute><EditEmployeePage /></PrivateRoute>} />
  <Route path="/employees/:id"       element={<PrivateRoute><EmployeeDetailsPage /></PrivateRoute>} />
  <Route path="/attendance" element={<PrivateRoute><AttendancePage /></PrivateRoute>} />
  <Route path="/leaves"    element={<PrivateRoute><LeavesPage /></PrivateRoute>} />
  <Route path="/payroll"   element={<PrivateRoute><PayrollPage /></PrivateRoute>} />
  <Route path="/projects"  element={<PrivateRoute><ProjectsPage /></PrivateRoute>} />
  <Route path="/recruitment" element={<PrivateRoute><RecruitmentPage /></PrivateRoute>} />
  <Route path="/training"  element={<PrivateRoute><TrainingPage /></PrivateRoute>} />
  <Route path="/settings"  element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
  <Route path="/reports"   element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
  <Route path="/profile"   element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
</Routes>
```

### GPS Geolocation (Attendance Tap In/Out)

**Two-phase geolocation approach** implemented in both `attendance/page.tsx` and `page.tsx` (Dashboard):

```typescript
// Phase 1: Try high-accuracy GPS (ideal for mobile)
navigator.geolocation.getCurrentPosition(
  (pos) => saveAttendance(pos),    // Success → use GPS coords
  () => {
    // Phase 2: Fallback to low-accuracy (Wi-Fi/IP location)
    navigator.geolocation.getCurrentPosition(
      (pos) => saveAttendance(pos),
      () => saveAttendance(null),  // Denied → save without location
      { enableHighAccuracy: false, timeout: 10000 }
    );
  },
  { enableHighAccuracy: true, timeout: 4000 }
);
```

---

## 10. API Endpoint Reference

Base URL: `http://localhost:8000/api/`

| Endpoint | Methods | Access | Description |
|---|---|---|---|
| `token/` | POST | Public | Get JWT tokens |
| `token/refresh/` | POST | Public | Refresh access token |
| `accounts/profile/` | GET, PATCH | Auth | View/edit own profile |
| `accounts/change-password/` | POST | Auth | Change own password |
| `accounts/forgot-password/` | POST | Public | Request reset code |
| `accounts/reset-password/` | POST | Public | Submit code + new password |
| `accounts/verify-invite/` | GET | Public | Validate onboarding token |
| `accounts/activate-account/` | POST | Public | Activate + set password |
| `accounts/notifications/` | GET | Auth | Get own notifications |
| `accounts/notifications/<id>/mark_as_read/` | POST | Auth | Mark notification read |
| `accounts/notifications/mark_all_read/` | POST | Auth | Mark all read |
| `accounts/announcements/` | GET, POST | Auth | View/post announcements |
| `employees/employees/` | GET, POST | Auth | List/create employees |
| `employees/employees/<id>/` | GET, PATCH, DELETE | Auth | View/edit/soft-delete |
| `employees/employees/bulk-import/` | POST | HR/Admin | Bulk import CSV/Excel |
| `employees/departments/` | GET, POST, PUT, DELETE | Auth | Department CRUD |
| `employees/branches/` | GET, POST, PUT, DELETE | Auth | Branch CRUD |
| `employees/designations/` | GET, POST, PUT, DELETE | Auth | Designation CRUD |
| `employees/documents/` | GET, POST, DELETE | Auth | Document vault |
| `attendance/attendance/` | GET, POST, PATCH | Auth | Tap In/Out/View logs |
| `attendance/shifts/` | GET, POST | Auth | Shift management |
| `leaves/leaves/` | GET, POST, PATCH, DELETE | Auth | Leave requests |
| `payroll/payroll/` | GET, POST, PATCH | HR/Admin | Payroll records |
| `projects/projects/` | GET, POST | Auth | Project list/creation |
| `projects/assignments/` | GET, POST, DELETE | Auth | Team assignments |
| `projects/tasklogs/` | GET, POST | Auth | Task log entries |
| `training/trainings/` | GET, POST | Auth | Training programs |
| `training/enrollments/` | GET, POST, PATCH | Auth | Enroll/track progress |
| `recruitment/jobs/` | GET, POST | Auth | Job postings |
| `recruitment/candidates/` | GET, POST | Auth | Candidate records |
| `recruitment/applications/` | GET, POST, PATCH | Auth | Application pipeline |
| `recruitment/interviews/` | GET, POST, PATCH | Auth | Interview scheduling |
| `recruitment/offers/` | GET, POST, PATCH | Auth | Offer letters |
| `reports/workforce/` | GET | HR/Admin | Workforce .xlsx export |
| `reports/attendance/` | GET | HR/Admin | Attendance .xlsx export |
| `reports/leaves/` | GET | HR/Admin | Leaves .xlsx export |
| `reports/payroll/` | GET | HR/Admin | Payroll .xlsx export |

---

## 11. Migration History — Database Changes

| Migration File | What Changed |
|---|---|
| `0001_initial.py` | All initial models: Employee, Department, Role, UserRole, Shift, Attendance, Leave, Payroll, Project, ProjectAssignment, TaskLog, Training, Enrollment, JobPosting, Candidate, Application, Interview, OfferLetter, Notification, PasswordResetCode, EmployeeInviteToken, Announcement |
| `0002_*.py` | Payroll field additions, project manager FK, TaskLog |
| `0003_delete_attendancerequest.py` | Removed the `AttendanceRequest` model (correction requests feature removed) |
| `0004_branch_attendance_check_in_address_and_more.py` | Added `Branch` model. Added `check_in_address`, `check_out_address` text fields to `Attendance`. Added `branch` FK to `Employee`. |
| `0005_remove_attendance_check_in_address_and_more.py` | Removed `check_in_address` and `check_out_address` columns from `Attendance` (GPS address removed from DB; only coords used in frontend display) |
| `0006_designation.py` | Added `Designation` model with `title` field |
| `0007_populate_designations.py` | Data migration — seeded 20 standard designation titles into the `Designation` table |

**To apply all migrations on a fresh clone:**
```bash
python manage.py migrate
```

---

## 12. Feature Implementation Log — Phase by Phase

### Phase 1 — Project Scaffolding (May 26, 2026)

**What was built:**
- Django project initialized with DRF
- React + Vite + TypeScript frontend initialized
- All core models created in one migration
- JWT auth configured with SimpleJWT
- All primary ViewSets and URL routes registered
- Frontend pages scaffolded: Dashboard, Employees, Attendance, Leaves, Payroll, Projects, Recruitment, Training

**Key files created:**
- `backend/core/settings.py` — Full Django config
- `backend/employees/models/*.py` — All 20+ models
- `backend/employees/urls.py` — All route registrations
- `frontend/src/App.tsx` — Route declarations
- `frontend/src/lib/api.ts` — Axios instance

---

### Phase 2 — Authentication & Onboarding (May 30, 2026)

**What was built:**
- Custom `EmailOrUsernameModelBackend` (users can log in with email or username)
- `EmployeeInviteToken` model
- `post_save` signal on Employee → auto-generate invite token → send email
- `VerifyInviteTokenView` and `ActivateAccountView` API endpoints
- `ForgotPasswordView` updated: reset code sent via email, NOT returned in API response
- `PasswordResetCode` model with `is_used` flag to invalidate old codes

**Files modified:**
- `backend/employees/backends.py` — NEW file, custom auth backend
- `backend/employees/models/accounts.py` — Added `EmployeeInviteToken`
- `backend/employees/signals/handlers.py` — NEW file, signal handlers
- `backend/employees/views/accounts.py` — Invite + forgot-password flows
- `backend/core/settings.py` — Registered custom backend, console email backend

---

### Phase 3 — Project Management Hierarchy (June 2, 2026)

**What was built:**
- `manager` FK added to `Project` model (Project Lead)
- "Create Project" modal restricted to `ADMIN` and `HR` roles only
- "Assign Team" modal: only project's assigned manager can assign members
- Backend guards in `ProjectViewSet`: `_ensure_manager_owns_project_or_is_admin()`

**Files modified:**
- `backend/employees/models/project.py` — Added `manager` FK
- `backend/employees/views/project.py` — Added permission guards
- `frontend/src/pages/projects/page.tsx` — Role-conditional UI

---

### Phase 4 — Attendance System & Dashboard Cleanup (June 5–10, 2026)

**What was built:**
- Continuous Tap In/Out: employee can tap multiple sessions in one day
- Work hours accumulation per session
- Dashboard Shift Terminal widget with same tap logic
- GPS geolocation: Phase 1 high-accuracy → Phase 2 low-accuracy fallback
- **Removed:** Attendance Analytics charts (recharts) from Dashboard
- **Removed:** Calendar tab and Correction Requests tab from Attendance page
- **Removed:** `AttendanceRequest` model + migration `0003`
- Fixed: Admin accounts without employee profile no longer show error toast

**Files modified:**
- `frontend/src/pages/attendance/page.tsx` — Complete rewrite for continuous tap + GPS
- `frontend/src/pages/page.tsx` — Dashboard tap widget + GPS fallback
- `backend/employees/views/accounts.py` — Superuser auto-profile in `ProfileView.get()`

---

### Phase 5 — Branch Model & Self-Leave Guard (June 11, 2026)

**What was built:**
- `Branch` model: `name`, `address`, `city` fields
- `branch` FK added to `Employee`
- Migration `0004` applied
- Leave page: Approve/Reject buttons disabled when the leave belongs to the logged-in user

**Files modified:**
- `backend/employees/models/branch.py` — NEW file
- `backend/employees/models/employee.py` — Added `branch` FK
- `backend/employees/migrations/0004_*.py` — Migration applied
- `frontend/src/pages/leaves/page.tsx` — Self-leave approval guard in UI

---

### Phase 6 — GPS Address Cleanup (June 15, 2026)

**What was built:**
- Removed `check_in_address` and `check_out_address` text columns from `Attendance` DB (migration `0005`)
- GPS now captured as coordinates only in frontend state; address text displayed dynamically via browser's Geolocation API

---

### Phase 7 — Designations & Settings CRUD (June 17, 2026)

**What was built:**
- `Designation` model with `title` field (migration `0006`)
- Data migration `0007` seeded 20 standard designations
- `DesignationViewSet` with `IsHROrAdminOrReadOnly` permission
- Settings page: Full CRUD panels for Departments, Branches, and Designations
- Add/Edit Employee forms: `designation` dropdown now loads dynamically from API (not hardcoded)
- Removed: `Reporting Manager` field from Add/Edit Employee forms
- Removed: Manager display from Employee Details view

**Files modified:**
- `backend/employees/models/employee.py` — Added `Designation` model
- `backend/employees/serializers/employee.py` — Added `DesignationSerializer`
- `backend/employees/views/employee.py` — Added `DesignationViewSet`
- `backend/employees/urls.py` — Registered `designations/` route
- `backend/employees/migrations/0006_designation.py` — Schema migration
- `backend/employees/migrations/0007_populate_designations.py` — Data seed
- `frontend/src/services/employeeService.ts` — Added designation + branch service methods
- `frontend/src/pages/settings/page.tsx` — Full CRUD UI for all 3 entities
- `frontend/src/pages/employees/add/page.tsx` — Dynamic designation dropdown
- `frontend/src/pages/employees/edit/page.tsx` — Dynamic designation dropdown
- `frontend/src/pages/employees/details/page.tsx` — Removed manager field

---

### Phase 8 — Documentation & Professional Handover (June 17–19, 2026)

**What was created:**
- `HRMS_User_Manual.md` — End-user guide (non-technical + technical)
- `HRMS_Technical_Implementation.md` — Full technical reference
- `HRMS_Complete_Developer_Guide.md` — This document (code logic + execution flow)
- `README.md` — Rewritten with professional setup guide, API table, RBAC chart
- `CHANGELOG.md` — Version history from v1.0.0 to v1.8.0
- `CONTRIBUTING.md` — Branch strategy, commit conventions, feature guide
- `backend/.env.example` — Environment config template
- All changes committed and pushed to `https://github.com/adarshr-04/hrms-repository`

---

## 13. Known Issues & Future Improvements

### Known Issues

| Issue | Description | Workaround |
|---|---|---|
| SQLite write locking | SQLite allows only one write at a time; bulk import + simultaneous attendance tap may slow down | Upgrade to PostgreSQL for production |
| Hardcoded localhost URL | Invite token email contains `http://localhost:3000/activate` | Move to environment variable `FRONTEND_URL` |
| No token refresh interceptor | When access token expires mid-session, user is not silently refreshed | Add Axios response interceptor to call `/token/refresh/` on 401 |
| No pagination on lists | Most list endpoints return all records; large datasets may be slow | Add DRF `PageNumberPagination` to ViewSets |
| No email verification on signup | New employees can click the invite link with any valid UUID | Restrict `VerifyInviteTokenView` by IP rate limiting |

### Recommended Future Improvements

1. **Switch to PostgreSQL** — Replace `db.sqlite3` with PostgreSQL for production deployment
2. **Add token auto-refresh** — Implement Axios interceptor to silently refresh expired JWT tokens
3. **Environment variables** — Move `SECRET_KEY`, `DEBUG`, `FRONTEND_URL` to a real `.env` file
4. **Docker setup** — Add `docker-compose.yml` for consistent dev environment
5. **Real-time notifications** — Replace polling with Django Channels + WebSockets for instant notifications
6. **Performance Reviews module** — Build the PerformanceReview model (was removed due to an incomplete implementation)
7. **Leave Balance tracking** — Add a `LeaveBalance` model to enforce annual leave quotas
8. **2FA (Two-Factor Auth)** — Add TOTP second factor for Admin and HR accounts
9. **Email templates** — Replace plain text emails with HTML email templates using Django's template engine
10. **Audit logging** — Track all create/update/delete operations with user + timestamp in a dedicated `AuditLog` model

---

*This document covers the complete implementation as of June 19, 2026.*  
*For questions, contact Adarsh or refer to the commit history on GitHub.*
