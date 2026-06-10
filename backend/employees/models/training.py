from django.db import models
from .employee import BaseModel, Employee


class Training(BaseModel):
    training_name = models.CharField(max_length=200)
    description = models.TextField()
    training_date = models.DateField()
    trainer_name = models.CharField(max_length=100)
    duration = models.CharField(max_length=50, help_text="e.g., 2 weeks, 10 hours")

    class Meta:
        db_table = 'training_training'

    def __str__(self):
        return self.training_name


class Enrollment(BaseModel):
    STATUS_CHOICES = [
        ('ENROLLED', 'Enrolled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='training_enrollments')
    training = models.ForeignKey(Training, on_delete=models.CASCADE, related_name='enrollments')
    enrollment_date = models.DateField(auto_now_add=True)
    completion_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ENROLLED')
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        unique_together = ('employee', 'training')
        db_table = 'training_enrollment'

    def __str__(self):
        return f"{self.employee.employee_id} enrolled in {self.training.training_name}"
