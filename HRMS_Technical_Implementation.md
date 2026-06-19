# HRMS Enterprise - Technical Implementation & Code Walkthrough

This document serves as a comprehensive handover report and codebase manual for the **Human Resource Management System (HRMS) Enterprise** platform. It documents the overall architecture, tech stack, database schema, role-based access controls, environment setup, and detailed code walkthroughs for all features implemented during the internship.

---

## 1. Project Overview & Folder Structure

The HRMS platform uses a standard decoupled client-server architecture. The frontend is a single-page application (SPA) built using React and TypeScript, transpiled and served via Vite, and styled with TailwindCSS. The backend is a Python Web API built using the Django REST Framework (DRF) and utilizes SQLite as the relational datastore.

### Folder Structure
```text
HRMS/
├── FIRST_TIME_SETUP.bat      # Automated system initial configuration script
├── START_BACKEND.bat         # Automated backend execution script
├── START_FRONTEND.bat        # Automated frontend execution script
├── requirements.txt          # Python package dependency list
├── backend/                  # Django backend workspace
│   ├── manage.py             # Django execution CLI
│   ├── core/                 # Backend project configuration folder
│   │   ├── __init__.py
│   │   ├── settings.py       # Global database, auth, CORS and app configs
│   │   ├── urls.py           # Global URL routing routing
│   │   └── wsgi.py
│   └── employees/            # Main core application package
│       ├── admin.py          # Django admin configuration module
│       ├── backends.py       # Custom Auth backends
│       ├── models/           # DB schema definitions grouped by module
│       │   ├── accounts.py
│       │   ├── attendance.py
│       │   ├── employee.py
│       │   ├── leave.py
│       │   └── project.py
│       ├── serializers/      # DRF ModelSerializers
│       ├── views/            # API ViewSets and Custom API endpoints
│       └── urls.py           # Sub-routing register
└── frontend/                 # React frontend workspace
    ├── package.json          # Node packages and running scripts
    ├── vite.config.ts        # Vite execution configurations
    ├── src/
    │   ├── App.tsx           # Router mappings & central component
    │   ├── context/          # State providers (Auth context)
    │   ├── pages/            # Core views (dashboard, attendance, etc.)
    │   ├── services/         # Axios API clients for backend communications
    │   └── types/            # Global TypeScript interfaces
```

---

## 2. System Architecture

The HRMS application is designed to be lightweight, modular, and easy to deploy:

```
[Client Web Browser] <==== (REST APIs / JWT Bearer) ====> [Django Web Server] <==== (ORM Queries) ====> [SQLite DB]
```

* **Frontend Framework**: React 19 SPA running on Node.js. Router state is managed via `react-router-dom` on client-side paths.
* **Backend Framework**: Django 6.0 + Django REST Framework 3.17.
* **Database**: SQLite 3, storing relations in a single server-local file (`db.sqlite3`).
* **Authentication**: Stateless JSON Web Tokens (JWT). The frontend stores the access token in memory/state and the refresh token in local storage, appending them as an `Authorization: Bearer <token>` header to all secure requests.

---

## 3. Tech Stack & Dependencies

### Python Backend Dependencies (`requirements.txt`)
* `Django==6.0.4`: Core MVC framework.
* `djangorestframework==3.17.1`: REST API toolkit.
* `djangorestframework_simplejwt==5.5.1`: JSON Web Token authentication.
* `django-cors-headers==4.9.0`: Cross-Origin Resource Sharing handler.
* `django-filter==25.2`: Flexible QuerySet filtering.
* `pandas==3.0.3` & `numpy==2.4.4`: Data processing for bulk CSV/Excel reports.
* `openpyxl==3.1.5`: Support for writing Excel formats.
* `pillow==12.2.0`: Image processing engine for user avatars.

### Node Frontend Dependencies (`package.json`)
* `react` & `react-dom` (19.2.4): Core UI rendering engine.
* `vite` (8.0.13): Next-generation frontend tooling and bundler.
* `tailwindcss` (4.3.0) & `@tailwindcss/vite` (4.3.0): Utility-first styling framework.
* `axios` (1.16.0): HTTP client.
* `react-router-dom` (7.15.1): Declared client-side router.
* `framer-motion` (12.38.0): Animation wrapper library.
* `lucide-react` (1.14.0): UI SVG icon toolkit.
* `recharts` (3.8.1): Charting libraries.
* `sonner` (2.0.7): Overlay message toast notification component.
* `jspdf` (4.2.1) & `html2canvas` (1.4.1): Programmatic PDF payslip and offer letter compiler.

---

## 4. Database Schema

The SQLite schema represents the relational entities below:

### 1. Employee & Organization Schema
* **Department** (`employees_department`): Configured business units.
  * Fields: `id` (INT, PK), `department_name` (VARCHAR, Unique), `description` (TEXT), `created_at` (DATETIME), `updated_at` (DATETIME)
* **Branch** (`employees_branch`): Configured physical office locations.
  * Fields: `id` (INT, PK), `name` (VARCHAR, Unique), `address` (TEXT), `city` (VARCHAR), `created_at` (DATETIME), `updated_at` (DATETIME)
* **Designation** (`employees_designation`): Configured job titles.
  * Fields: `id` (INT, PK), `title` (VARCHAR, Unique), `created_at` (DATETIME), `updated_at` (DATETIME)
* **Employee** (`employees_employee`): Main employee records.
  * Fields: `id` (INT, PK), `employee_id` (VARCHAR, Unique), `first_name` (VARCHAR), `last_name` (VARCHAR), `email` (VARCHAR, Unique), `phone_number` (VARCHAR), `date_of_birth` (DATE), `hire_date` (DATE), `employment_type` (VARCHAR), `status` (VARCHAR), `avatar` (VARCHAR/File), `department_id` (FK $\rightarrow$ Department), `branch_id` (FK $\rightarrow$ Branch), `manager_id` (FK $\rightarrow$ Employee self), `shift_id` (FK $\rightarrow$ Shift), `alternative_email` (VARCHAR), `alternative_phone_number` (VARCHAR), `current_address` (TEXT), `permanent_address` (TEXT), `end_date` (DATE)
* **Document** (`employees_document`): Vault for uploaded employee files.
  * Fields: `id` (INT, PK), `employee_id` (FK $\rightarrow$ Employee), `document_type` (VARCHAR), `file` (VARCHAR/File), `created_at` (DATETIME), `updated_at` (DATETIME)

### 2. Authentication & Roles Schema
* **Role** (`accounts_role`): System roles.
  * Fields: `id` (INT, PK), `role_name` (VARCHAR, Unique), `description` (TEXT)
* **UserRole** (`accounts_userrole`): Join table mapping employees to roles.
  * Fields: `id` (INT, PK), `employee_id` (FK $\rightarrow$ Employee), `role_id` (FK $\rightarrow$ Role), `assigned_date` (DATE)
* **EmployeeInviteToken** (`accounts_employeeinvitetoken`): 72-hour onboarding tokens.
  * Fields: `id` (INT, PK), `employee_id` (FK $\rightarrow$ Employee, Unique), `token` (UUID, Unique), `is_used` (BOOLEAN), `created_at` (DATETIME)
* **PasswordResetCode** (`accounts_passwordresetcode`): Recovery pins.
  * Fields: `id` (INT, PK), `user_id` (FK $\rightarrow$ auth.User), `code` (VARCHAR), `is_used` (BOOLEAN), `created_at` (DATETIME)

### 3. Attendance, Leaves & Payroll Schema
* **Shift** (`attendance_shift`): Work schedules.
  * Fields: `id` (INT, PK), `name` (VARCHAR), `start_time` (TIME), `end_time` (TIME), `grace_period` (INT)
* **Attendance** (`attendance_attendance`): Daily login and workout logs.
  * Fields: `id` (INT, PK), `employee_id` (FK $\rightarrow$ Employee), `attendance_date` (DATE), `check_in` (TIME), `check_out` (TIME), `work_hours` (DECIMAL), `status` (VARCHAR), `notes` (TEXT)
* **Leave** (`leaves_leave`): Time off request history.
  * Fields: `id` (INT, PK), `employee_id` (FK $\rightarrow$ Employee), `leave_type` (VARCHAR), `applied_date` (DATE), `start_date` (DATE), `end_date` (DATE), `total_days` (INT), `reason` (TEXT), `status` (VARCHAR), `approver_id` (FK $\rightarrow$ Employee), `approved_date` (DATE)
* **Payroll** (`payroll_payroll`): Monthly salary disbursement logs.
  * Fields: `id` (INT, PK), `employee_id` (FK $\rightarrow$ Employee), `pay_period_start` (DATE), `pay_period_end` (DATE), `basic_salary` (DECIMAL), `allowances` (DECIMAL), `deductions` (DECIMAL), `tax` (DECIMAL), `bonus` (DECIMAL), `net_pay` (DECIMAL), `pay_date` (DATE), `payment_mode` (VARCHAR), `status` (VARCHAR)

### 4. Projects, Recruitment & Training Schema
* **Project** (`projects_project`): System projects.
  * Fields: `id` (INT, PK), `project_name` (VARCHAR), `start_date` (DATE), `end_date` (DATE), `status` (VARCHAR), `manager_id` (FK $\rightarrow$ Employee)
* **ProjectAssignment** (`projects_projectassignment`): Team members assigned to projects.
  * Fields: `id` (INT, PK), `employee_id` (FK $\rightarrow$ Employee), `project_id` (FK $\rightarrow$ Project), `role` (VARCHAR), `hours_worked` (DECIMAL), `assigned_date` (DATE), `end_date` (DATE)
* **TaskLog** (`projects_tasklog`): Task logs associated with projects.
  * Fields: `id` (INT, PK), `date` (DATE), `task_description` (TEXT), `status` (VARCHAR), `owner` (VARCHAR), `remarks` (TEXT)
* **Training** (`training_training`): Training programs.
  * Fields: `id` (INT, PK), `training_name` (VARCHAR), `description` (TEXT), `training_date` (DATE), `trainer_name` (VARCHAR), `duration` (VARCHAR)
* **Enrollment** (`training_enrollment`): Employee training completion logs.
  * Fields: `id` (INT, PK), `employee_id` (FK $\rightarrow$ Employee), `training_id` (FK $\rightarrow$ Training), `enrollment_date` (DATE), `completion_date` (DATE), `status` (VARCHAR), `score` (DECIMAL)
* **JobPosting** (`recruitment_jobposting`): Job openings.
  * Fields: `id` (INT, PK), `title` (VARCHAR), `description` (TEXT), `requirements` (TEXT), `location` (VARCHAR), `salary_range` (VARCHAR), `employment_type` (VARCHAR), `status` (VARCHAR)
* **Candidate** (`recruitment_candidate`): Applicants.
  * Fields: `id` (INT, PK), `first_name` (VARCHAR), `last_name` (VARCHAR), `email` (VARCHAR, Unique), `phone_number` (VARCHAR), `resume` (VARCHAR/File), `linkedin_profile` (VARCHAR)
* **Application** (`recruitment_application`): Candidate submissions mapping to job postings.
  * Fields: `id` (INT, PK), `job_id` (FK $\rightarrow$ JobPosting), `candidate_id` (FK $\rightarrow$ Candidate), `status` (VARCHAR), `notes` (TEXT), `applied_at` (DATETIME)
* **Interview** (`recruitment_interview`): Interview logs.
  * Fields: `id` (INT, PK), `application_id` (FK $\rightarrow$ Application), `interviewer_id` (FK $\rightarrow$ Employee), `interview_date` (DATETIME), `location` (VARCHAR), `status` (VARCHAR), `feedback` (TEXT), `rating` (INT)
* **OfferLetter** (`recruitment_offerletter`): Generated offer letters.
  * Fields: `id` (INT, PK), `application_id` (FK $\rightarrow$ Application, Unique), `offer_text` (TEXT), `status` (VARCHAR), `salary_offered` (VARCHAR), `joining_date` (DATE)

---

## 5. API Endpoint Reference

The global URL mappings registered under `c:\Users\Adarsh\Desktop\HRMS\backend\employees\urls.py` route to these endpoints:

| Endpoint Path | HTTP Verb | View/ViewSet Class | Role Permission | Description |
| :--- | :---: | :--- | :--- | :--- |
| `/api/employees/employees/` | GET / POST | `EmployeeViewSet` | HR / Admin (Write) | List all staff members or add a new record. |
| `/api/employees/employees/<id>/` | GET/PATCH/DELETE | `EmployeeViewSet` | HR / Admin (Write) | Retrieve details, edit metadata, or soft-delete staff member. |
| `/api/employees/employees/bulk-import/` | POST | `EmployeeViewSet` | HR / Admin | Bulk import employees from CSV or Excel file. |
| `/api/employees/departments/` | GET / POST | `DepartmentViewSet` | HR / Admin (Write) | List all departments or create a new department. |
| `/api/employees/departments/<id>/` | PUT / DELETE | `DepartmentViewSet` | HR / Admin | Update inline or delete department. |
| `/api/employees/branches/` | GET / POST | `BranchViewSet` | HR / Admin (Write) | List all branches or configure a new branch. |
| `/api/employees/branches/<id>/` | PUT / DELETE | `BranchViewSet` | HR / Admin | Edit inline or remove branch location. |
| `/api/employees/designations/` | GET / POST | `DesignationViewSet` | HR / Admin (Write) | List all designations or configure a new designation. |
| `/api/employees/designations/<id>/` | PUT / DELETE | `DesignationViewSet` | HR / Admin | Edit inline or delete designation. |
| `/api/employees/documents/` | GET / POST | `DocumentViewSet` | Authenticated | Retrieve user vault files or upload document files. |
| `/api/accounts/profile/` | GET / PATCH | `ProfileView` | Authenticated | Retrieve profile details or edit personal bio/avatar. |
| `/api/accounts/change-password/` | POST | `ChangePasswordView` | Authenticated | Change account password. |
| `/api/accounts/forgot-password/` | POST | `ForgotPasswordView` | Allow Any | Request a password reset verification code by email. |
| `/api/accounts/reset-password/` | POST | `ResetPasswordView` | Allow Any | Reset password using email code. |
| `/api/accounts/verify-invite/` | GET | `VerifyInviteTokenView`| Allow Any | Validate invitation token when activating account. |
| `/api/accounts/activate-account/` | POST | `ActivateAccountView` | Allow Any | Activate employee account and set password. |
| `/api/accounts/notifications/` | GET | `NotificationViewSet`| Authenticated | List notifications for user. |
| `/api/accounts/announcements/` | GET / POST | `AnnouncementViewSet`| Authenticated | List announcements (Write: Admin/HR only). |
| `/api/attendance/attendance/` | GET / POST | `AttendanceViewSet` | Authenticated | View or create attendance check-in records. |
| `/api/attendance/attendance/<id>/` | PATCH | `AttendanceViewSet` | Authenticated | Update check-out times and daily work hours. |
| `/api/attendance/shifts/` | GET / POST | `ShiftViewSet` | HR / Admin (Write) | List shifts or create a new shift. |
| `/api/leaves/leaves/` | GET / POST | `LeaveViewSet` | Authenticated | Request time off (Write: HR/Admin/Manager only). |
| `/api/payroll/payroll/` | GET / POST | `PayrollViewSet` | HR / Admin (Write) | List payroll history or generate bulk monthly payroll. |
| `/api/projects/projects/` | GET / POST | `ProjectViewSet` | Authenticated | View projects (Write: Admin/HR only). |
| `/api/projects/assignments/` | GET / POST | `ProjectAssignmentViewSet`| Authenticated | View assignments (Write: Admin/HR/Manager). |
| `/api/projects/task-logs/` | GET / POST | `TaskLogViewSet` | Authenticated | View or submit task logs. |
| `/api/training/trainings/` | GET / POST | `TrainingViewSet` | Authenticated | View trainings (Write: Admin/HR only). |
| `/api/training/enrollments/` | GET / POST | `EnrollmentViewSet` | Authenticated | View or update training enrollments. |
| `/api/recruitment/jobs/` | GET / POST | `JobPostingViewSet` | Authenticated | View postings (Write: HR/Admin only). |
| `/api/recruitment/offers/` | GET / POST | `OfferLetterViewSet` | Authenticated | View offer letters (Write: HR/Admin only). |
| `/api/reports/workforce/` | GET | `WorkforceReportView` | HR / Admin | Export employee list report (.xlsx). |
| `/api/reports/attendance/` | GET | `AttendanceReportView` | HR / Admin | Export check-in report (.xlsx). |
| `/api/reports/leaves/` | GET | `LeavesReportView` | HR / Admin | Export leaves report (.xlsx). |
| `/api/reports/payroll/` | GET | `PayrollReportView` | HR / Admin | Export payroll report (.xlsx). |

---

## 6. Role-Based Access Control (RBAC)

The HRMS platform enforces a 5-tier hierarchical permission model:

$$SUPER\_ADMIN \succ ADMIN \succ HR \succ DEPT\_MANAGER \succ EMPLOYEE$$

### Highest Role Resolution
The role-based permission system resolves user roles dynamically through `c:\Users\Adarsh\Desktop\HRMS\backend\employees\utils.py`:

```python
def get_user_role(user):
    if not user or user.is_anonymous:
        return 'EMPLOYEE'
    if user.is_superuser:
        return 'SUPER_ADMIN'
    role_priority = ['ADMIN', 'HR', 'DEPT_MANAGER', 'EMPLOYEE']
    try:
        employee_profile = getattr(user, 'employee_profile', None)
        if not employee_profile:
            return 'EMPLOYEE'
        role_names = (
            employee_profile.roles
            .select_related('role')
            .values_list('role__role_name', flat=True)
        )
        normalized = {str(name).strip().upper() for name in role_names if name}
        for role in role_priority:
            if role in normalized:
                return role
        return 'EMPLOYEE'
    except Exception:
        return 'EMPLOYEE'
```

### DRF View Permissions
Permissions are verified inside viewsets to restrict data access. For example, `EmployeeViewSet` enforces write restrictions using `IsHROrAdminOrReadOnly` defined in `c:\Users\Adarsh\Desktop\HRMS\backend\employees\views\employee.py`:

```python
class IsHROrAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user or request.user.is_anonymous:
            return False
        if request.method in SAFE_METHODS:
            return True
        return get_user_role(request.user) in ['SUPER_ADMIN', 'ADMIN', 'HR']
```

---

## 7. Chronological Implementation Log

### PHASE 1: Automated Welcome Emails & Secure Forgot Password
* **Objective**: Remove insecure practices (e.g., exposing temporary passwords in response payloads) and automate welcome notifications for new hires.
* **Implementation Details**:
  * Added `django.core.mail.backends.console.EmailBackend` configuration to core settings to route emails to the console in development mode.
  * Implemented a Django `post_save` signal receiver in `signals/handlers.py` that generates a secure `EmployeeInviteToken` and sends an invite email containing the activation link.
  * Updated `ForgotPasswordView` in `views/accounts.py` to remove the 6-digit verification pin from the response body and instead send it via email.
  * Refactored the frontend password recovery UI to hide testing codes and instruct users to check their email console output.

### PHASE 2: Professional Project Management Flow
* **Objective**: Establish hierarchical controls for project creation and team assignment.
* **Implementation Details**:
  * Modified the `Project` model schema to add a `manager` ForeignKey linking to the employee in charge.
  * Implemented backend permission validations in `ProjectAssignmentViewSet` to enforce assignment logic:
    ```python
    def _ensure_manager_owns_project_or_is_admin(self, project):
        role = get_user_role(self.request.user)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']: return
        manager = self.request.user.employee_profile
        if project.manager_id != manager.id:
            raise PermissionDenied('You can only assign employees to projects you manage.')

    def _ensure_manager_can_assign_employee(self, employee):
        role = get_user_role(self.request.user)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']: return
        manager = self.request.user.employee_profile
        if employee.id != manager.id and employee.manager_id != manager.id:
            raise PermissionDenied('Managers can only assign projects to themselves or their direct reports.')
    ```
  * Added modal-based assignment cards in the frontend, pre-selecting and locking the project field. The candidate selection dropdown is dynamically filtered to show only direct reports.

### PHASE 3: Backend API Documentation & Performance Module Cleanup
* **Objective**: Remove the incomplete Performance module and document system APIs.
* **Implementation Details**:
  * Cleaned up backend imports and database dependencies related to the deprecated performance appraisal system.
  * Deleted `PerformanceReportView` and its model relations from `backend/reports/views.py`.
  * Removed the `/performance/` URL endpoint from `backend/reports/urls.py` to prevent application runtime failures.
  * Created detailed API reference documentation mapping HTTP verbs, roles, and resource endpoints.

### PHASE 4: Attendance & Analytics Simplification
* **Objective**: Simplify the attendance system by removing the complex Resume Shift feature.
* **Implementation Details**:
  * Removed the Calendar, Requests, and paused shift tabs from the attendance dashboard interface.
  * Deleted the `AttendanceRequest` model class in `backend/employees/models/attendance.py` and created database migrations (`0003_delete_attendancerequest`) to drop the table.
  * Removed the complex charts (Weekly Attendance Flow, Department Distribution) and cleaned up `recharts` package imports on the dashboard.
  * Added checks to hide employee profiles and attendance warnings for admin accounts that do not have a linked personal employee profile.

### PHASE 5: Continuous Tap In & Tap Out Toggle
* **Objective**: Support multiple check-in/out sessions in a single day.
* **Implementation Details**:
  * Replaced the single-action button with side-by-side **Tap In** and **Tap Out** controls.
  * Configured the Tap In button to trigger from either `OFFLINE` or `TAPPED_OUT` states.
  * When a user taps in from a `TAPPED_OUT` state on the same day, the frontend sends a PATCH request that resets the daily record by setting `check_out` to `null` and updating `check_in`. This resumes the shift stopwatch while saving previously accumulated work hours.
  ```typescript
  if (serverStatus === 'TAPPED_OUT' && activeRecord?.id) {
    const rec = await attendanceService.updateAttendance(activeRecord.id, {
      check_in: timeStr,
      check_out: null,
      notes: `${activeRecord.notes || ''}\nTapped In at ${currentTime.toLocaleTimeString()}`,
    });
  }
  ```

### PHASE 6: GPS Tracking Robustness & Location Cleanup
* **Objective**: Improve geolocation stability and clean up location displays.
* **Implementation Details**:
  * Implemented an automated fallback in both pages:
    - Attempts high-accuracy lookup with a 4-second timeout.
    - If the GPS signal fails or times out, it falls back to low-accuracy lookup (Wi-Fi/IP-based geolocation).
    - Displays a toast if browser location access is entirely blocked.
  * Created migration `0005_remove_attendance_check_in_address_and_more.py` to clean up old latitude, longitude, and reverse-geocoded address columns from the `attendance_attendance` database model.
  * Updated the frontend table to only display the check-out address when a check-out time is recorded.

### PHASE 7: Leave Management & Onboarding Improvements
* **Objective**: Prevent self-leave approval and improve onboarding configuration.
* **Implementation Details**:
  * Disabled the **Approve** and **Reject** controls on the Leaves management page (`frontend/src/pages/leaves/page.tsx`) when viewing leave requests created by the current user.
  * Added a **Reporting Manager** dropdown select element under the Employment Details section in the **Add New Employee** form (`frontend/src/pages/employees/add/page.tsx`).

### PHASE 8: Remove Reporting Manager & Add CRUD Settings
* **Objective**: Remove the reporting manager field and create settings panels for departments, branches, and designations.
* **Implementation Details**:
  * **Reporting Manager Field Removal**:
    - Removed manager dropdowns and state variables from `employees/add/page.tsx` and `employees/edit/page.tsx`.
    - Removed manager info displays from `employees/details/page.tsx` and the offer letter templates.
  * **Designation Database Model**:
    - Created the `Designation` model class in `backend/employees/models/employee.py`.
    - Generated migration file `0006_designation.py` and data migration file `0007_populate_designations.py` to pre-populate default designations.
    - Registered the ViewSet and endpoints under the `/employees/designations/` router.
  * **Settings panels (Company Config)**:
    - Added Settings CRUD methods to `employeeService.ts` for departments, branches, and designations.
    - Created three configuration cards under the **Company Config** tab in `settings/page.tsx` for inline Add, Edit, and Delete actions.
    - Configured the Add/Edit Employee pages to retrieve designations dynamically from the new API endpoints.

---

## 8. Frontend Routing Map

The client-side router is configured in `frontend/src/App.tsx` and maps URLs to lazy-loaded page components:

* `/` $\rightarrow$ `pages/page.tsx`: System dashboard containing statistics, announcements, and the Shift Attendance card.
* `/login` $\rightarrow$ `pages/login/page.tsx`: Authentication page supporting credentials, activation, and password resets.
* `/activate` $\rightarrow$ `pages/activate/page.tsx`: Welcome activation form for setting initial passwords.
* `/employees` $\rightarrow$ `pages/employees/page.tsx`: Employee directory showing lists and profiles.
* `/employees/add` $\rightarrow$ `pages/employees/add/page.tsx`: Form to add new hires.
* `/employees/details` $\rightarrow$ `pages/employees/details/page.tsx`: Complete profile view.
* `/employees/edit` $\rightarrow$ `pages/employees/edit/page.tsx`: Form to edit employee profiles.
* `/attendance` $\rightarrow$ `pages/attendance/page.tsx`: Tap terminal logs showing shift patterns.
* `/leaves` $\rightarrow$ `pages/leaves/page.tsx`: Leave request and approval dashboard.
* `/projects` $\rightarrow$ `pages/projects/page.tsx`: Project planner showing task logs and assignments.
* `/payroll` $\rightarrow$ `pages/payroll/page.tsx`: Payroll management and payslip generator.
* `/recruitment` $\rightarrow$ `pages/recruitment/page.tsx`: Candidate tracker and offer letter generator.
* `/training` $\rightarrow$ `pages/training/page.tsx`: Training course manager.
* `/settings` $\rightarrow$ `pages/settings/page.tsx`: Settings page containing profile updates and Company Config cards.
* `/notifications` $\rightarrow$ `pages/notifications/page.tsx`: Notifications log showing alerts and notices.
* `/reports` $\rightarrow$ `pages/reports/page.tsx`: Excel export dashboard for HR reporting.

---

## 9. Service Layer

The frontend uses Axios-based API services in `frontend/src/services/` to fetch and submit backend data:

1. **announcementService**: Fetch, create, and delete company announcements.
2. **attendanceService**: Fetch attendance logs, retrieve daily tap status, log check-ins, and patch check-outs.
3. **documentService**: Manage personal vaults and upload or delete employee files.
4. **employeeService**: Manage Employee, Department, Branch, and Designation records, and handle bulk employee imports.
5. **leaveService**: Submit leave requests, retrieve leave history, and approve or reject team leaves.
6. **notificationService**: Retrieve notifications and mark them as read.
7. **payrollService**: Fetch salary records and generate monthly bulk payrolls.
8. **performanceService**: Legacy views (now deprecated).
9. **profileService**: Fetch and update the authenticated user's profile and password.
10. **projectService**: Fetch projects, create projects, assign teams, and log task details.
11. **recruitmentService**: Track job openings, manage candidates, application forms, interview schedules, and offer letters.
12. **reportsService**: Generate download links for workforce, attendance, leave, and payroll reports.
13. **trainingService**: Manage training programs, enrollments, and track progress.

---

## 10. Environment Setup & Configuration

Important environment variables and setting overrides are configured in `backend/core/settings.py`:

* **CORS Settings**:
  ```python
  CORS_ALLOWED_ORIGINS = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
  ]
  CORS_ALLOW_ALL_ORIGINS = DEBUG
  ```
* **REST Framework Permissions**:
  ```python
  REST_FRAMEWORK = {
      'DEFAULT_AUTHENTICATION_CLASSES': (
          'rest_framework_simplejwt.authentication.JWTAuthentication',
      ),
      'DEFAULT_PERMISSION_CLASSES': [
          'rest_framework.permissions.IsAuthenticated',
      ],
  }
  ```
* **Stateless SimpleJWT Lifetime**:
  ```python
  SIMPLE_JWT = {
      'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
      'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
      'AUTH_HEADER_TYPES': ('Bearer',),
  }
  ```
* **Custom User Authentication**:
  ```python
  AUTHENTICATION_BACKENDS = [
      'employees.backends.EmailOrUsernameModelBackend',
      'django.contrib.auth.backends.ModelBackend',
  ]
  ```
* **Email Console Backend**:
  ```python
  EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
  ```

---

## 11. How to Continue Development

Follow these steps to expand and maintain the platform:

### 1. Adding a New Database Model
1. Define the model class in the appropriate file under `backend/employees/models/`.
2. Add the model class to the list of exports in `backend/employees/models/__init__.py`.
3. Generate migration files:
   ```bash
   python manage.py makemigrations employees
   ```
4. Apply migrations:
   ```bash
   python manage.py migrate
   ```

### 2. Creating a New API Endpoint
1. Create a serializer class in `backend/employees/serializers/`.
2. Create a ViewSet class in `backend/employees/views/` inheriting from `viewsets.ModelViewSet`.
3. Register the ViewSet under the router in `backend/employees/urls.py`:
   ```python
   router.register(r'module/endpoint-prefix', YourNewViewSet)
   ```

### 3. Adding a New Frontend Page
1. Create a page component in `frontend/src/pages/yourpage/page.tsx`.
2. Add a service client file in `frontend/src/services/` to handle API communication.
3. Import the component and register the client path in `frontend/src/App.tsx`:
   ```typescript
   const YourPage = lazy(() => import('./pages/yourpage/page'));
   // Add under <Routes>
   <Route path="/yourpath" element={<YourPage />} />
   ```

### 4. Running Backend Tests
Ensure your changes do not break existing functionality by running the test suite:
```bash
python manage.py test
```

---

## 12. Known Issues & Future Improvements

### 1. Relational Database Scaling
* **Current State**: The system uses SQLite.
* **Problem**: SQLite locks the database file during write operations. Concurrent API calls can cause "Database is locked" exceptions.
* **Recommendation**: For production environments, configure PostgreSQL by updating the `DATABASES` settings dictionary in `settings.py`.

### 2. Server-Local File Uploads
* **Current State**: Avatars and document attachments are stored in the local directory `./backend/media/`.
* **Problem**: File uploads are lost when application instances are re-built, scaled, or containerized (e.g., on Docker/Heroku).
* **Recommendation**: Configure Amazon S3 or Google Cloud Storage as a cloud-based file storage backend using Django's file storage configurations.

### 3. Real-Time Notifications
* **Current State**: Notifications are stored in the database and retrieved via HTTP polling.
* **Problem**: High server overhead from frequent polling requests.
* **Recommendation**: Implement Django Channels and configure WebSockets to deliver instant, real-time notifications to users.
