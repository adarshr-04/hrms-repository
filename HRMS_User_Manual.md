# HRMS Enterprise User Manual

Welcome to the **Human Resource Management System (HRMS) Enterprise** User Manual. This guide provides comprehensive, step-by-step instructions for both technical administrators and non-technical staff members to set up, operate, and utilize the HRMS platform.

---

## Table of Contents
1. [System Overview & Architecture](#1-system-overview--architecture)
2. [Prerequisites & System Setup](#2-prerequisites--system-setup)
   - [Prerequisites](#prerequisites)
   - [First-Time Installation Setup](#first-time-installation-setup)
   - [Daily Startup Process](#daily-startup-process)
3. [Login, Security & Onboarding Flows](#3-login-security--onboarding-flows)
   - [User Authentication](#user-authentication)
   - [Forgot Password Flow](#forgot-password-flow)
   - [Account Activation for New Hires](#account-activation-for-new-hires)
4. [Role Hierarchy & Access Control](#4-role-hierarchy--access-control)
5. [Core Feature Modules Walkthrough](#5-core-feature-modules-walkthrough)
   - [Dashboard & Shift terminal](#dashboard--shift-terminal)
   - [Employee Directory & CRUD](#employee-directory--crud)
   - [Attendance & Geolocation tracking](#attendance--geolocation-tracking)
   - [Leave Management](#leave-management)
   - [Payroll & Payslip Generation](#payroll--payslip-generation)
   - [Project & Team Assignment](#project--team-assignment)
   - [Recruitment Pipeline & Offer Letters](#recruitment-pipeline--offer-letters)
   - [Training & Upskilling](#training--upskilling)
   - [Company Configuration & CRUD Settings](#company-configuration--crud-settings)
   - [Reports & Analytics Exports](#reports--analytics-exports)
   - [Notifications & Announcements](#notifications--announcements)
6. [Troubleshooting & FAQs](#6-troubleshooting--faqs)

---

## 1. System Overview & Architecture

The HRMS application is an enterprise-grade solution designed to streamline workforce management, attendance tracking, leave processing, project assignments, recruitment pipelines, payroll generation, and training tracking.

```
+-------------------------------------------------------------+
|                          BROWSER                            |
|             Vite + React (TypeScript) Web App               |
|                    (http://localhost:3000)                  |
+------------------------------+------------------------------+
                               |
                               | REST APIs / JWT Auth
                               v
+-------------------------------------------------------------+
|                     DJANGO BACKEND SERVER                   |
|                   (http://localhost:8000)                   |
+------------------------------+------------------------------+
                               |
                               | ORM Queries
                               v
+-------------------------------------------------------------+
|                       SQLITE DATABASE                       |
|                          (db.sqlite3)                       |
+-------------------------------------------------------------+
```

### Key Technical Specs:
* **Frontend:** React 19, TypeScript, Vite 8, TailwindCSS 4, Framer Motion, Lucide Icons, Sonner.
* **Backend:** Django 6.0, Django REST Framework (DRF) 3.17, SimpleJWT (JWT Authentication).
* **Database:** SQLite 3.

---

## 2. Prerequisites & System Setup

### Prerequisites
Before setting up the system, make sure the following applications are installed on your Windows machine:
1. **Python 3.10 or higher**: Download from [python.org](https://www.python.org/downloads/). Ensure **"Add Python to PATH"** is checked during installation.
2. **Node.js 18.0 or higher (with npm)**: Download from [nodejs.org](https://nodejs.org/).

---

### First-Time Installation Setup

The codebase includes an automated first-time configuration script. Double-click the file named `FIRST_TIME_SETUP.bat` in the root folder.

Alternatively, execute the setup manually in your terminal:

1. **Open your Terminal (CMD or PowerShell) in the backend folder:**
   ```powershell
   cd c:\Users\Adarsh\Desktop\HRMS\backend
   ```
2. **Install Python Packages:**
   ```powershell
   pip install -r ..\requirements.txt
   ```
3. **Execute DB Migrations:**
   ```powershell
   python manage.py migrate --no-input
   ```
4. **Create a Superuser Account:**
   ```powershell
   python manage.py createsuperuser
   ```
   *Enter a Username, Email Address, and Password when prompted.*
5. **Generate Linked Employee Profiles for Admin Accounts:**
   ```powershell
   python manage.py create_admin_profiles
   ```

> [!IMPORTANT]
> The command `python manage.py create_admin_profiles` is required because Django Superusers do not have an employee profile by default. Running this command links the superuser account to an Employee record, preventing "Profile not found" errors in the system.

---

### Daily Startup Process

To run the application daily, execute these two batch files from the project root:

1. **Double-click `START_BACKEND.bat`**: Installs/verifies python requirements, applies pending migrations, and launches the Django development server at `http://localhost:8000`.
2. **Double-click `START_FRONTEND.bat`**: Installs/verifies Node modules and launches the Vite React dev server at `http://localhost:3000`.

Open your browser and navigate to: **`http://localhost:3000`**

---

## 3. Login, Security & Onboarding Flows

### User Authentication
Users can log into the system using either their **Username** or their registered **Email Address** along with their password. The backend checks both fields to ensure flexible authentication.

```
       Username or Email
               |
               v
  [Custom Authentication Backend]
               |
       +-------+-------+
       |               |
Matches Username?   Matches Email?
       |               |
       +-------+-------+
               |
               v
     Generate JWT Access
       & Refresh Tokens
```

### Forgot Password Flow
If a user forgets their password, they must use the following secure recovery procedure:

```
+------------------+     Email      +------------------+     6-Digit Code     +------------------+
|  Forgot Password |--------------> | Read Email Code  |--------------------> |  Enter Code &    |
|   Request Page   |                |  (Console Logs)  |                      |   New Password   |
+------------------+                +------------------+                      +------------------+
```

1. Click **Forgot Password** on the login page.
2. Enter the registered email address.
3. The system generates a secure 6-digit verification code and "emails" it to the user.
4. **Development Testing Note**: Because this is a local environment, look at your running `START_BACKEND.bat` terminal console. The system will output the email containing the code as shown below:
   ```text
   ------------------------------------------------------------
   Content-Type: text/plain; charset="utf-8"
   MIME-Version: 1.0
   From: webmaster@localhost
   To: employee@example.com
   Date: Wed, 17 Jun 2026 15:52:10 -0000
   Subject: HRMS Password Reset Code

   Your password reset code is: 840291
   ------------------------------------------------------------
   ```
5. Enter the 6-digit code on the reset page along with a new secure password. Click **Reset Password** to complete.

> [!WARNING]
> For security compliance, the 6-digit verification code has been completely removed from all backend API responses. It can *only* be read from the email dispatch console.

---

### Account Activation for New Hires

When a new employee is added to the database by HR or an Administrator:

1. The system automatically creates a secure, random temporary password.
2. The system triggers a welcome email (printed to the backend terminal window).
3. The email contains the user's username, temporary password, and account activation link.
4. When the new employee clicks the link (or goes to `/activate`), they will be prompted to enter:
   - Their temporary credentials
   - A new, personalized password
5. Once completed, the account status transitions to **Active**, and the temporary token is invalidated.

---

## 4. Role Hierarchy & Access Control

The HRMS platform enforces a strict 5-level role hierarchy. Permissions flow downward; higher-level roles inherit and expand upon the permissions of lower roles.

| Role | Priority Value | Primary Target Audience | Core Capabilities |
| :--- | :---: | :--- | :--- |
| **SUPER_ADMIN** | 5 | IT Administrators, System Owners | Full system control, direct database resets, backup options. |
| **ADMIN** | 4 | Executive Management, Operations | Add/edit employees, company configurations, attendance logs, reports. |
| **HR** | 3 | Human Resources Staff | Manage recruitment, payroll generation, training programs, leaves. |
| **DEPT_MANAGER** | 2 | Team Leads, Project Managers | Approve team leaves, assign project tasks to direct reports. |
| **EMPLOYEE** | 1 | Regular Staff Members | Tap In/Out, apply for leaves, view personal payslips, submit task logs. |

---

## 5. Core Feature Modules Walkthrough

### Dashboard & Shift Terminal

The dashboard serves as the central hub. For employees, the primary feature is the **Shift Attendance Card**.

[Screenshot: Dashboard Shift Card showing side-by-side Tap In and Tap Out buttons]

1. **Side-by-Side Tapping Controls**: Unlike traditional terminals, both **Tap In** and **Tap Out** buttons are displayed side-by-side to allow continuous, multiple check-ins and check-outs on the same day.
2. **Shift Statuses**:
   - **Tapped Out (Offline)**: Tap In button enabled. Tap Out disabled.
   - **Tapped In (Active)**: Tap In button disabled. Tap Out enabled.
3. **Continuous Re-Tapping**: If you tap in, tap out, and then tap in *again* on the same day, the database clears the previous check-out time and updates your check-in, resuming your active work stopwatch. Your accumulated daily work hours are saved.

---

### Employee Directory & CRUD

HR staff and Admins have access to the full employee directory under the **Employees** menu.

#### Creating a New Employee:
1. Click **Add Employee** on the Employees page.
2. Fill out personal details (Name, Email, Phone, Birth Date) and employment details (Select Department, Select Branch, Select Designation).
3. Select their system Role.
4. Click **Create Employee**.
   - An Employee ID is automatically generated (e.g., `PITS-0001`, incrementing cleanly).
   - An invite email is generated in the console with the activation credentials.

#### Bulk Importing Employees:
1. Prepare an Excel (`.xlsx`) or CSV file with the following column headers:
   `first_name`, `last_name`, `email`, `username`, `phone`, `date_of_birth`, `department`, `branch`, `designation`, `role`
2. Click **Bulk Import** on the Employees list page.
3. Choose the file and click **Upload**.
4. The system validates headers, populates default fields, generates unique IDs, and imports the records.

---

### Attendance & Geolocation Tracking

The attendance tracker keeps logs of employee working patterns and locations.

#### Geolocation Rules:
When an employee taps in or out, the system requests access to the browser's location APIs.
* **High-Accuracy Phase**: The browser first attempts a high-accuracy GPS query with a **4-second timeout**.
* **Low-Accuracy Fallback**: If the GPS signal takes too long or fails (e.g., on office PCs without GPS chips), the system falls back to low-accuracy Wi-Fi/IP-based geolocation.
* **Fallback Toast**: If location permissions are entirely denied, a toast notification is shown: *"Location access is disabled or unavailable. Attendance logged without GPS coordinates."* Check-in/out succeeds with location fields stored as null.

#### Active Shift Resets:
When an employee re-taps in to resume a shift on the same day, the system patches the daily log, setting the check-out location coordinates and address to `null` to ensure only active, accurate coordinates are rendered.

---

### Leave Management

Employees can request paid time off (PTO) under the **Leaves** tab.

```
                  +-----------------------+
                  | Employee submits Leave|
                  +-----------+-----------+
                              |
                              v
                  +-----------------------+
                  |  Manager/HR views it  |
                  +-----------+-----------+
                              |
                     Is own leave request?
                     /                   \
                   YES                   NO
                   /                       \
        +-------------------+     +-------------------------+
        |   Action buttons  |     |  Approve/Reject buttons |
        |   are DISABLED    |     |   are ENABLED           |
        +-------------------+     +-------------------------+
```

1. **Applying for Leave**: Click **Request Leave**, select the leave type (Sick, Casual, Annual, Maternity, Paternity), choose start/end dates, write a reason, and submit.
2. **Approval Controls**: Department Managers, HR, and Admins can view pending requests.
3. **Self-Approval Guard**: To maintain auditing integrity, the system disables and hides the **Approve** and **Reject** buttons on leave requests created by the current user. A manager cannot approve their own leave request.

---

### Payroll & Payslip Generation

The Payroll module handles monthly salary disbursements.

1. **Bulk Generation (HR/Admin only)**:
   - Select the target **Month** and **Year**.
   - Click **Generate Bulk Payroll**.
   - The system queries all active employees, reads their basic salary, deducts professional tax, applies leave deductions, and generates individual payroll structures.
2. **Downloading Payslips**:
   - Employees can view their salary records under the Payroll tab.
   - Click **Download Payslip** on a payroll card. The system generates a formatted PDF document containing the company letterhead, employee details, salary breakdown, and net pay.

---

### Project & Team Assignment

The Projects module manages active business projects.

```
[Admin / HR]
  |
  +--> Creates Project
  |
  +--> Assigns Project Manager (Lead)
        |
        v
[Project Manager (Lead)]
  |
  +--> Launches "Assign Team" Modal on Project Card
  |
  +--> Dropdown displays only themselves + Direct Reports
  |
  +--> Allocates Team Members to Project
```

1. **Creating a Project (Admin/HR only)**:
   - Click **Create Project**.
   - Define project name, description, timeline, and assign a **Project Manager (Lead)** from the active staff.
2. **Assigning Teams**:
   - Only the assigned Project Lead (or HR/Admin) has authorization to edit team allocations on a project card.
   - For other users, the project displays as **"View Only"**.
   - When the Lead clicks **Assign Team**, the selection dropdown displays *only* their direct reports, preventing unauthorized managers from allocating employees from other departments.

---

### Recruitment Pipeline & Offer Letters

The Recruitment page handles job listings, candidate details, applications, and interview logs.

1. **Adding Candidates**: Input candidates into the system database.
2. **Candidate Statuses**: Track candidates as they move from:
   `Applied` $\rightarrow$ `Interviewing` $\rightarrow$ `Offer Extended` $\rightarrow$ `Hired` $\rightarrow$ `Rejected`.
3. **Offer Letter Generation**:
   - When a candidate reaches the **Offer Extended** phase, HR can click **Generate Offer Letter**.
   - Input the joining date, department, branch, designation, and salary.
   - Click **Generate PDF**. The system produces an official, formatted offer letter document containing standard terms, salary figures, and signature placeholders.

---

### Training & Upskilling

Manage continuing education courses.

1. **Create Courses (HR/Admin only)**: Click **Create Training Program**, specify the title, description, department, and duration.
2. **Employee Enrollment**: Employees can view available courses and click **Enroll**.
3. **Progress Updates**: Admins or training instructors can mark status as:
   `Enrolled` $\rightarrow$ `In Progress` $\rightarrow$ `Completed` $\rightarrow$ `Failed`.

---

### Company Configuration & CRUD Settings

Administrators can configure organization data under **Settings → Company Config**.

The tab features three configuration boards:
1. **Departments**: Displays list with counts. Add inline with name and description, edit inline, or delete.
2. **Branches**: Add inline with branch name and address, edit inline, or delete.
3. **Designations**: Add inline with job title, edit inline, or delete.

> [!TIP]
> When you add, edit, or delete a Designation under settings, the selections automatically update inside the Add/Edit Employee pages, as they fetch from this database API.

---

### Reports & Analytics Exports

Admins and HR can download workforce statistics in Excel (`.xlsx`) format under the **Reports** section.

1. **Workforce Report**: Exports complete staff roster including departments, locations, and roles.
2. **Attendance Report**: Exports check-in patterns, GPS coordinates, and worked hours.
3. **Leave Report**: Exports all leave request history and balances.
4. **Payroll Report**: Exports month-wise breakdown of salary structures, taxes, and net pay.

---

### Notifications & Announcements

* **Announcements**: Broadcasted by Admin/HR. They appear at the top of every user's dashboard.
* **Notifications**: Triggered automatically when leaves are approved/rejected, payroll is generated, or training enrollments are updated. Click the bell icon in the top header to view them.

---

## 6. Troubleshooting & FAQs

### Q: I created an Administrator, but when they log in they get a "Profile not found" error. How do I fix this?
**A**: Django superusers created via `createsuperuser` do not have an linked Employee Profile record. Run this command in the backend folder:
`python manage.py create_admin_profiles`
This generates the profile record for all superusers automatically.

### Q: Where are the registration and verification emails? The screen says "Check your email inbox".
**A**: During local development, the system prints emails to the console. Look at the terminal window running your backend server (`START_BACKEND.bat`). Scroll to the bottom to view the printed email headers and body.

### Q: The map is not rendering, or the address says "Null" or "Unknown location".
**A**: Make sure the browser is allowed location access. If the location popup is blocked:
1. Click the site settings icon (padlock) in the URL bar.
2. Toggle **Location** to "Allow".
3. Reload the page and attempt the tap session again.

### Q: Can a manager approve their own leave request?
**A**: No. The system has a self-leave approval guard. The Approve and Reject buttons will be hidden and disabled for their own requests. A higher-level manager, HR, or Admin must approve it.

### Q: I get a "Database is locked" error on the backend.
**A**: SQLite locks the database during write transactions. If this happens:
1. Stop the backend server using `Ctrl+C`.
2. Ensure you do not have the `db.sqlite3` file open in an external DB viewer (like DB Browser for SQLite) in write mode.
3. Run `START_BACKEND.bat` again.
