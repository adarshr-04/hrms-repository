# Changelog

All notable changes to the HRMS Enterprise project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.8.0] - 2026-06-17

### Added
- **Settings → Company Config CRUD panels**: Full inline Add / Edit / Delete management for Departments, Branches, and Designations directly from the settings page.
- **Designation model & API**: New `Designation` database model with migration (`0006_designation.py`), data seed migration (`0007_populate_designations.py`), `DesignationSerializer`, `DesignationViewSet`, and router registration at `/api/employees/designations/`.
- **Dynamic designation dropdown**: Add Employee and Edit Employee pages now load designations dynamically from the API instead of a hardcoded list.

### Removed
- **Reporting Manager field**: Removed the Reporting Manager dropdown from Add Employee (`employees/add/page.tsx`) and Edit Employee (`employees/edit/page.tsx`) forms.
- **Executive Manager display**: Removed the manager field from the Employee Details view (`employees/details/page.tsx`).

### Changed
- `frontend/src/services/employeeService.ts`: Added `createDepartment`, `updateDepartment`, `deleteDepartment`, `getBranches`, `createBranch`, `updateBranch`, `deleteBranch`, `getDesignations`, `createDesignation`, `updateDesignation`, `deleteDesignation` service methods.

---

## [1.7.0] - 2026-06-15

### Added
- **GPS geolocation fallback**: Tap In/Out now attempts high-accuracy GPS (4s timeout) and automatically falls back to low-accuracy Wi-Fi/IP location if GPS is unavailable.
- **Location access blocked toast**: If the browser denies location access, a descriptive toast message is displayed and attendance is logged without coordinates.

### Changed
- `frontend/src/pages/attendance/page.tsx`: Implemented two-phase geolocation (`enableHighAccuracy: true` → fallback `enableHighAccuracy: false`).
- `frontend/src/pages/page.tsx` (Dashboard): Same two-phase geolocation logic applied to the dashboard Shift Terminal widget.
- Attendance table: Check-out address is only displayed when `check_out` time is present.

### Removed
- GPS coordinate and address columns removed from the `attendance_attendance` database table via migration `0005_remove_attendance_check_in_address_and_more.py`.

---

## [1.6.0] - 2026-06-11

### Added
- **Branch model**: New `Branch` database model added via migration `0004_branch_attendance_check_in_address_and_more.py`.
- **Branch field on Employee**: Employee records now support an optional `branch` FK to a `Branch` record.
- **Self-leave approval guard**: Approve and Reject buttons on the Leaves page are now disabled for leave requests belonging to the currently logged-in user.

---

## [1.5.0] - 2026-06-10

### Added
- **Continuous Tap In/Out**: Both the Attendance page and Dashboard Shift Terminal now support looping check-in and check-out on the same day.
- **Side-by-side Tap Terminal**: Tap In and Tap Out buttons are displayed side-by-side instead of a single toggle.

### Changed
- `frontend/src/pages/attendance/page.tsx`: On re-tap after `TAPPED_OUT`, sends `PATCH` with `check_in: newTime`, `check_out: null` to resume the shift.
- `frontend/src/pages/page.tsx` (Dashboard): Applied same continuous tap logic to the dashboard Shift Attendance widget.
- Work hours accumulation: Each tap-out session calculates elapsed hours and appends to the daily `work_hours` total.

---

## [1.4.0] - 2026-06-05

### Removed
- **Attendance analytics from Dashboard**: Removed "Weekly Attendance Flow" line chart, "Department Distribution" pie chart, and associated `recharts` imports and state.
- **Attendance module tabs**: Removed Calendar and Correction Requests tabs from the Attendance page.
- **AttendanceRequest model**: Deleted the `AttendanceRequest` model and applied migration `0003_delete_attendancerequest.py` to drop the database table.

### Fixed
- Admin profile "Employee not found" toast: Admin accounts without a linked employee profile now see an informational card instead of an error toast.

---

## [1.3.0] - 2026-06-03

### Added
- **Comprehensive API documentation** (`HRMS_Technical_Implementation.md`): Full endpoint reference, role permissions, and developer onboarding notes.

### Removed
- **Performance module**: Deleted deprecated `PerformanceReportView` from `backend/reports/views.py` and removed the `/api/reports/performance/` route from `backend/reports/urls.py` to fix application runtime crashes.

---

## [1.2.0] - 2026-06-02

### Added
- **Hierarchical Project Management flow**: `manager` ForeignKey added to the `Project` model.
- **Create Project modal** (Admin/HR only): New project creation with Lead/Manager assignment.
- **Assign Team modal** (Project Lead only): Team allocation restricted to direct reports of the project manager.

### Changed
- `backend/employees/views/project.py`: Added `_ensure_manager_owns_project_or_is_admin` and `_ensure_manager_can_assign_employee` validation guards.

---

## [1.1.0] - 2026-05-30

### Added
- **Automated welcome emails**: On new employee creation, a `post_save` signal generates an `EmployeeInviteToken` and sends an invite email to the new hire's address.
- **Secure Forgot Password flow**: The 6-digit reset code is now sent via email instead of being returned in the API response.
- **Console email backend**: Configured `django.core.mail.backends.console.EmailBackend` in `settings.py` for development.
- **Custom authentication backend** (`employees/backends.py`): Users can log in with either username or email address.

### Changed
- `backend/employees/views/accounts.py` (`ForgotPasswordView`): Removed verification code from response payload; code is now email-only.
- `frontend/src/pages/login/page.tsx`: Updated forgot password UI to display "check your email" instructions instead of showing the code in the browser.

---

## [1.0.0] - 2026-05-26

### Added
- Initial project scaffolding with Django backend and React + Vite frontend.
- Core models: Employee, Department, Role, UserRole, Shift, Attendance, Leave, Payroll, Project, ProjectAssignment, TaskLog, Training, Enrollment, JobPosting, Candidate, Application, Interview, OfferLetter.
- JWT authentication with SimpleJWT.
- Django Admin panel registration for all models.
- Role-based permission enforcement using a 5-tier priority system: `SUPER_ADMIN > ADMIN > HR > DEPT_MANAGER > EMPLOYEE`.
- All primary CRUD API ViewSets (Employee, Attendance, Leave, Payroll, Project, Recruitment, Training).
- Frontend pages: Dashboard, Employees, Attendance, Leaves, Payroll, Projects, Recruitment, Training, Settings, Reports, Notifications.
- Report generation endpoints exporting `.xlsx` files for Workforce, Attendance, Leaves, and Payroll.
- Bulk employee import via CSV/Excel upload.
- Offer Letter PDF generation from the frontend using `jspdf`.
