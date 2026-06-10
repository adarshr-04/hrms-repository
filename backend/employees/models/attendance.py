from django.db import models
from .employee import BaseModel, Employee


class Shift(BaseModel):
    name = models.CharField(max_length=50) # e.g. "General Shift", "Night Shift"
    start_time = models.TimeField()
    end_time = models.TimeField()
    grace_period = models.IntegerField(default=15) # minutes allowed late before marked 'LATE'

    class Meta:
        db_table = 'attendance_shift'

    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')})"


class Attendance(BaseModel):
    STATUS_CHOICES = [
        ('PRESENT', 'Present'),
        ('ABSENT', 'Absent'),
        ('LATE', 'Late'),
        ('HALF_DAY', 'Half Day'),
        ('ON_LEAVE', 'On Leave'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_records')
    attendance_date = models.DateField()
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    work_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PRESENT')
    notes = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Attendance"
        unique_together = ('employee', 'attendance_date')
        db_table = 'attendance_attendance'

    def __str__(self):
        return f"{self.employee.employee_id} - {self.attendance_date}"


class AttendanceRequest(BaseModel):
    REQUEST_TYPE_CHOICES = [
        ('CORRECTION', 'Correction'),
        ('MISSING_OUT', 'Missing Check-Out'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_requests')
    attendance_date = models.DateField()
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPE_CHOICES, default='CORRECTION')
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    reviewed_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_attendance_requests')
    review_notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'attendance_attendancerequest'

    def __str__(self):
        return f"{self.request_type} - {self.employee} - {self.status}"
