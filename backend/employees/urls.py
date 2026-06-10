from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    # Employee
    DepartmentViewSet,
    EmployeeViewSet,
    DocumentViewSet,
    # Accounts
    ProfileView,
    ChangePasswordView,
    NotificationViewSet,
    ForgotPasswordView,
    ResetPasswordView,
    AnnouncementViewSet,
    VerifyInviteTokenView,
    ActivateAccountView,
    # Attendance
    ShiftViewSet,
    AttendanceViewSet,
    AttendanceRequestViewSet,
    # Leave
    LeaveViewSet,
    # Payroll
    PayrollViewSet,
    # Projects
    ProjectViewSet,
    ProjectAssignmentViewSet,
    TaskLogViewSet,
    # Training
    TrainingViewSet,
    EnrollmentViewSet,
    # Recruitment
    JobPostingViewSet,
    CandidateViewSet,
    ApplicationViewSet,
    InterviewViewSet,
    OfferLetterViewSet,
    # Reports
    WorkforceReportView,
    AttendanceReportView,
    LeavesReportView,
    PayrollReportView,
)

router = DefaultRouter()

# ── /api/employees/* ──────────────────────────────────────
router.register(r'employees/employees',   EmployeeViewSet)
router.register(r'employees/departments', DepartmentViewSet)
router.register(r'employees/documents',   DocumentViewSet)

# ── /api/accounts/* ───────────────────────────────────────
router.register(r'accounts/notifications', NotificationViewSet,  basename='notifications')
router.register(r'accounts/announcements', AnnouncementViewSet,  basename='announcements')

# ── /api/attendance/* ─────────────────────────────────────
router.register(r'attendance/attendance', AttendanceViewSet)
router.register(r'attendance/shifts',     ShiftViewSet)
router.register(r'attendance/requests',   AttendanceRequestViewSet)

# ── /api/leaves/* ─────────────────────────────────────────
router.register(r'leaves/leaves', LeaveViewSet)

# ── /api/payroll/* ────────────────────────────────────────
router.register(r'payroll/payroll', PayrollViewSet)

# ── /api/projects/* ───────────────────────────────────────
router.register(r'projects/projects',     ProjectViewSet)
router.register(r'projects/assignments',  ProjectAssignmentViewSet)
router.register(r'projects/task-logs',    TaskLogViewSet)

# ── /api/training/* ───────────────────────────────────────
router.register(r'training/trainings',   TrainingViewSet)
router.register(r'training/enrollments', EnrollmentViewSet)

# ── /api/recruitment/* ────────────────────────────────────
router.register(r'recruitment/jobs',          JobPostingViewSet)
router.register(r'recruitment/candidates',    CandidateViewSet)
router.register(r'recruitment/applications',  ApplicationViewSet)
router.register(r'recruitment/interviews',    InterviewViewSet)
router.register(r'recruitment/offers',        OfferLetterViewSet)

urlpatterns = [
    # All ViewSet routes
    path('', include(router.urls)),

    # ── /api/accounts/* (function-based) ─────────────────
    path('accounts/profile/',          ProfileView.as_view(),         name='user-profile'),
    path('accounts/change-password/',  ChangePasswordView.as_view(),  name='change-password'),
    path('accounts/forgot-password/',  ForgotPasswordView.as_view(),  name='forgot-password'),
    path('accounts/reset-password/',   ResetPasswordView.as_view(),   name='reset-password'),
    path('accounts/verify-invite/',    VerifyInviteTokenView.as_view(), name='verify-invite'),
    path('accounts/activate-account/', ActivateAccountView.as_view(),   name='activate-account'),

    # ── /api/reports/* ───────────────────────────────────
    path('reports/workforce/',  WorkforceReportView.as_view(),  name='report-workforce'),
    path('reports/attendance/', AttendanceReportView.as_view(), name='report-attendance'),
    path('reports/leaves/',     LeavesReportView.as_view(),     name='report-leaves'),
    path('reports/payroll/',    PayrollReportView.as_view(),    name='report-payroll'),
]
