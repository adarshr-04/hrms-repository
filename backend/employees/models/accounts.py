import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from .employee import BaseModel, Employee


class Role(BaseModel):
    role_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'accounts_role'

    def __str__(self):
        return self.role_name


class UserRole(BaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='roles')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='employees')
    assigned_date = models.DateField(auto_now_add=True)

    class Meta:
        unique_together = ('employee', 'role')
        db_table = 'accounts_userrole'

    def __str__(self):
        return f"{self.employee.employee_id} - {self.role.role_name}"


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_notification'

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class PasswordResetCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_codes')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = 'accounts_passwordresetcode'

    def __str__(self):
        return f"{self.user.email} - {self.code}"


class EmployeeInviteToken(models.Model):
    """
    Professional onboarding token.
    Generated when HR adds a new employee.
    Employee uses this to set their OWN password — HR never knows it.
    Token expires in 72 hours.
    """
    employee = models.OneToOneField(
        Employee, on_delete=models.CASCADE, related_name='invite_token'
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = 'accounts_employeeinvitetoken'

    def is_expired(self):
        """Token is valid for 72 hours."""
        return timezone.now() > self.created_at + timedelta(hours=72)

    def __str__(self):
        return f"{self.employee.email} - {'used' if self.is_used else 'pending'}"


class Announcement(models.Model):
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('NORMAL', 'Normal'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    ]
    title = models.CharField(max_length=255)
    content = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='NORMAL')
    posted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='announcements')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'accounts_announcement'

    def __str__(self):
        return self.title
