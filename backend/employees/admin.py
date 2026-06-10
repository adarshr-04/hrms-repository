from django.contrib import admin
from .models import (
    Department, Employee, Document,
    Role, UserRole, Notification, PasswordResetCode, Announcement,
    Shift, Attendance, AttendanceRequest,
    Leave,
    Payroll,
    Project, ProjectAssignment, TaskLog,
    Training, Enrollment,
    JobPosting, Candidate, Application, Interview, OfferLetter,
)


# ── Employee ──────────────────────────────────────────────────────────────────

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('department_name', 'description')
    search_fields = ('department_name',)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        'employee_id', 'first_name', 'last_name', 'email',
        'job_title', 'department', 'employment_type', 'status'
    )
    list_filter = ('department', 'status', 'employment_type', 'gender')
    search_fields = ('first_name', 'last_name', 'employee_id', 'email')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Primary Information', {
            'fields': ('user', 'employee_id', 'first_name', 'last_name', 'avatar')
        }),
        ('Contact Details', {
            'fields': ('email', 'phone_number', 'alternative_email', 'alternative_phone_number')
        }),
        ('Professional Details', {
            'fields': ('department', 'job_title', 'employment_type', 'status', 'hire_date', 'end_date', 'manager')
        }),
        ('Personal Details', {
            'fields': ('gender', 'date_of_birth', 'current_address', 'permanent_address')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('employee', 'document_type', 'created_at')
    list_filter = ('document_type',)
    search_fields = ('employee__first_name', 'employee__last_name')


# ── Accounts ──────────────────────────────────────────────────────────────────

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('role_name',)
    search_fields = ('role_name',)


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('employee', 'role', 'assigned_date')
    list_filter = ('role',)
    search_fields = ('employee__first_name', 'employee__last_name')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'message', 'is_read', 'created_at')
    list_filter = ('is_read',)


@admin.register(PasswordResetCode)
class PasswordResetCodeAdmin(admin.ModelAdmin):
    list_display = ('user', 'code', 'created_at')


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'posted_by', 'priority', 'is_active', 'created_at')
    list_filter = ('priority', 'is_active')
    search_fields = ('title',)


# ── Attendance ────────────────────────────────────────────────────────────────

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_time', 'end_time')
    search_fields = ('name',)


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('employee', 'attendance_date', 'status', 'check_in', 'check_out')
    list_filter = ('status', 'attendance_date')
    search_fields = ('employee__first_name', 'employee__last_name')


@admin.register(AttendanceRequest)
class AttendanceRequestAdmin(admin.ModelAdmin):
    list_display = ('employee', 'attendance_date', 'request_type', 'status', 'created_at')
    list_filter = ('status', 'request_type')


# ── Leave ─────────────────────────────────────────────────────────────────────

@admin.register(Leave)
class LeaveAdmin(admin.ModelAdmin):
    list_display = ('employee', 'leave_type', 'start_date', 'end_date', 'status')
    list_filter = ('leave_type', 'status')
    search_fields = ('employee__first_name', 'employee__last_name')


# ── Payroll ───────────────────────────────────────────────────────────────────

@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ('employee', 'pay_period_start', 'pay_period_end', 'net_pay', 'status')
    list_filter = ('status', 'pay_date')
    search_fields = ('employee__first_name', 'employee__last_name')


# ── Projects ──────────────────────────────────────────────────────────────────

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('project_name', 'start_date', 'end_date', 'status')
    list_filter = ('status',)
    search_fields = ('project_name',)


@admin.register(ProjectAssignment)
class ProjectAssignmentAdmin(admin.ModelAdmin):
    list_display = ('project', 'employee', 'role')
    search_fields = ('project__project_name', 'employee__first_name')


@admin.register(TaskLog)
class TaskLogAdmin(admin.ModelAdmin):
    list_display = ('owner', 'date', 'status', 'task_description')
    list_filter = ('date', 'status')


# ── Training ──────────────────────────────────────────────────────────────────

@admin.register(Training)
class TrainingAdmin(admin.ModelAdmin):
    list_display = ('training_name', 'trainer_name', 'training_date', 'duration')
    search_fields = ('training_name',)


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('training', 'employee', 'enrollment_date', 'status')
    list_filter = ('status',)
    search_fields = ('training__training_name', 'employee__first_name')


# ── Recruitment ───────────────────────────────────────────────────────────────

@admin.register(JobPosting)
class JobPostingAdmin(admin.ModelAdmin):
    list_display = ('title', 'employment_type', 'status', 'created_at')
    list_filter = ('status', 'employment_type')
    search_fields = ('title',)


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'phone_number')
    search_fields = ('first_name', 'last_name', 'email')


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'job', 'status', 'applied_at')
    list_filter = ('status',)
    search_fields = ('candidate__first_name', 'candidate__last_name')


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ('application', 'interview_date', 'status', 'rating')
    list_filter = ('status',)
    search_fields = ('application__candidate__first_name',)


@admin.register(OfferLetter)
class OfferLetterAdmin(admin.ModelAdmin):
    list_display = ('application', 'salary_offered', 'status', 'joining_date')
    list_filter = ('status',)
