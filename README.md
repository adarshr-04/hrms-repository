# HRMS Enterprise

> A full-stack Human Resource Management System built with **Django REST Framework** (backend) and **React + Vite + TypeScript** (frontend).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Running the Application](#running-the-application)
- [Environment Configuration](#environment-configuration)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Role-Based Access Control](#role-based-access-control)
- [Email System](#email-system)
- [Database Migrations](#database-migrations)
- [Running Tests](#running-tests)
- [Documentation](#documentation)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, TailwindCSS 4 |
| Backend | Django 6.0, Django REST Framework 3.17 |
| Auth | SimpleJWT (JSON Web Tokens) |
| Database | SQLite (development) |
| Data Processing | pandas, openpyxl |
| File Uploads | Pillow (image processing) |

---

## Prerequisites

Make sure the following are installed on your system before cloning:

| Tool | Version | Download |
|---|---|---|
| Python | 3.10+ | https://www.python.org/downloads/ |
| Node.js + npm | 18+ | https://nodejs.org/ |
| Git | Any | https://git-scm.com/ |

> **Windows users:** When installing Python, check **"Add Python to PATH"** during setup.

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd HRMS
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# (Recommended) Create a virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r ../requirements.txt

# Apply database migrations
python manage.py migrate

# Create a superuser (admin) account
python manage.py createsuperuser

# Create an employee profile for the admin account
python manage.py create_admin_profiles
```

### 3. Frontend Setup

```bash
# Open a new terminal, navigate to frontend
cd frontend

# Install Node.js dependencies
npm install
```

---

## Running the Application

You need **two terminal windows** running simultaneously.

**Terminal 1 — Backend API Server:**
```bash
cd backend
venv\Scripts\activate   # Windows
python manage.py runserver
```
> Backend available at: `http://localhost:8000`

**Terminal 2 — Frontend Dev Server:**
```bash
cd frontend
npm run dev
```
> Frontend available at: `http://localhost:3000`

Open your browser and go to **`http://localhost:3000`**.

Login with the superuser credentials you created during setup.

---

## Environment Configuration

A `.env.example` file is included in `backend/` as a template. Key settings are configured in `backend/core/settings.py`:

| Setting | Value | Description |
|---|---|---|
| `DEBUG` | `True` | Set to `False` in production |
| `EMAIL_BACKEND` | `console` | Emails are printed to terminal in dev mode |
| `SIMPLE_JWT.ACCESS_TOKEN_LIFETIME` | `1 day` | JWT access token expiry |
| `TIME_ZONE` | `Asia/Kolkata` | Server timezone |

---

## Project Structure

```
HRMS/
├── requirements.txt                    # Python dependencies
├── HRMS_User_Manual.md                 # Non-technical usage guide
├── HRMS_Technical_Implementation.md    # Full technical handover document
│
├── backend/
│   ├── manage.py
│   ├── .env.example                    # Environment config template
│   ├── core/
│   │   ├── settings.py                 # Django global configuration
│   │   └── urls.py                     # Root URL router
│   └── employees/                      # Core application module
│       ├── admin.py                    # Django admin registrations
│       ├── backends.py                 # Custom auth (email or username login)
│       ├── utils.py                    # Role resolution helper
│       ├── models/                     # Database schema definitions
│       │   ├── employee.py             # Employee, Department, Designation
│       │   ├── accounts.py             # Role, UserRole, Notification, Token
│       │   ├── attendance.py           # Shift, Attendance
│       │   ├── leave.py                # Leave
│       │   ├── payroll.py              # Payroll
│       │   ├── project.py              # Project, ProjectAssignment, TaskLog
│       │   ├── recruitment.py          # JobPosting, Candidate, Application
│       │   └── training.py             # Training, Enrollment
│       ├── serializers/                # DRF serializers
│       ├── views/                      # API ViewSets & endpoints
│       ├── signals/                    # Django post-save signals (emails, notifications)
│       ├── migrations/                 # Database migration history
│       └── urls.py                     # API route registrations
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx                     # Route definitions
        ├── context/AuthContext.tsx     # Authentication state provider
        ├── pages/                      # Page-level components
        │   ├── page.tsx                # Dashboard
        │   ├── employees/              # Employee list, add, edit, details
        │   ├── attendance/             # Attendance & Tap Terminal
        │   ├── leaves/                 # Leave requests & approvals
        │   ├── payroll/                # Payroll & payslip generation
        │   ├── projects/               # Project management
        │   ├── recruitment/            # Recruitment pipeline
        │   ├── training/               # Training programs
        │   ├── settings/               # Company config CRUD
        │   └── reports/                # Excel report exports
        ├── services/                   # Axios API client functions
        └── types/                      # TypeScript interfaces
```

---

## API Reference

Base URL: `http://localhost:8000/api/`

| Endpoint | Methods | Description |
|---|---|---|
| `/token/` | POST | Obtain JWT access + refresh tokens |
| `/token/refresh/` | POST | Refresh an expired access token |
| `/employees/employees/` | GET, POST | List or create employees |
| `/employees/employees/<id>/` | GET, PATCH, DELETE | Retrieve, edit, or soft-delete employee |
| `/employees/employees/bulk-import/` | POST | Bulk import from CSV/Excel |
| `/employees/departments/` | GET, POST, PUT, DELETE | Department CRUD |
| `/employees/branches/` | GET, POST, PUT, DELETE | Branch CRUD |
| `/employees/designations/` | GET, POST, PUT, DELETE | Designation CRUD |
| `/accounts/profile/` | GET, PATCH | View or update own profile |
| `/accounts/forgot-password/` | POST | Request password reset code (via email) |
| `/accounts/reset-password/` | POST | Submit code and new password |
| `/accounts/verify-invite/` | GET | Validate new employee onboarding token |
| `/accounts/activate-account/` | POST | Activate account and set password |
| `/attendance/attendance/` | GET, POST, PATCH | Tap In / Tap Out / View logs |
| `/attendance/shifts/` | GET, POST | Shift management |
| `/leaves/leaves/` | GET, POST, PATCH | Leave requests and approvals |
| `/payroll/payroll/` | GET, POST | View and generate payroll records |
| `/projects/projects/` | GET, POST | Project list and creation |
| `/projects/assignments/` | GET, POST, DELETE | Team assignments |
| `/training/trainings/` | GET, POST | Training programs |
| `/training/enrollments/` | GET, POST, PATCH | Enroll and track progress |
| `/recruitment/jobs/` | GET, POST | Job postings |
| `/recruitment/candidates/` | GET, POST | Candidate records |
| `/recruitment/applications/` | GET, POST, PATCH | Application status tracking |
| `/recruitment/interviews/` | GET, POST | Interview scheduling |
| `/recruitment/offers/` | GET, POST | Offer letter management |
| `/reports/workforce/` | GET | Export workforce report (.xlsx) |
| `/reports/attendance/` | GET | Export attendance report (.xlsx) |
| `/reports/leaves/` | GET | Export leave report (.xlsx) |
| `/reports/payroll/` | GET | Export payroll report (.xlsx) |

Full reference: See `HRMS_Technical_Implementation.md`

---

## Role-Based Access Control

The system enforces a strict 5-tier permission hierarchy:

```
SUPER_ADMIN  >  ADMIN  >  HR  >  DEPT_MANAGER  >  EMPLOYEE
```

| Role | Key Permissions |
|---|---|
| `SUPER_ADMIN` | Full system control |
| `ADMIN` | Employee management, company config, reports |
| `HR` | Recruitment, payroll generation, training, leaves |
| `DEPT_MANAGER` | Approve team leaves, assign project members (direct reports only) |
| `EMPLOYEE` | Tap In/Out, apply for leave, view own payslips |

---

## Email System

In development, all emails (password reset codes, new hire invitations) are printed directly to the **backend terminal console** — no SMTP server required.

To see emails, check the terminal window running `python manage.py runserver`.

To configure real email delivery for production, update `backend/core/settings.py`:
```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.yourdomain.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'noreply@yourdomain.com'
EMAIL_HOST_PASSWORD = 'your-smtp-password'
```

---

## Database Migrations

To apply all pending database schema changes after a `git pull`:

```bash
cd backend
python manage.py migrate
```

To create new migrations after modifying a model:
```bash
python manage.py makemigrations employees
python manage.py migrate
```

---

## Running Tests

```bash
cd backend
python manage.py test
```

---

## Documentation

Two comprehensive handover documents are included in the project root:

| Document | Purpose |
|---|---|
| [`HRMS_User_Manual.md`](./HRMS_User_Manual.md) | End-user guide covering setup, login, and all feature modules |
| [`HRMS_Technical_Implementation.md`](./HRMS_Technical_Implementation.md) | Technical reference: DB schema, API table, RBAC, implementation phases, and contribution guide |

---

## Django Admin Panel

Access the built-in Django admin for direct database management:

- URL: `http://localhost:8000/admin/`
- Login with your superuser credentials
