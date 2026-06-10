from django.db import models
from .employee import BaseModel, Employee


class Project(BaseModel):
    STATUS_CHOICES = [
        ('PLANNING', 'Planning'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('ON_HOLD', 'On Hold'),
        ('CANCELLED', 'Cancelled'),
    ]

    project_name = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNING')
    manager = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='managed_projects')

    class Meta:
        db_table = 'projects_project'

    def __str__(self):
        return self.project_name


class ProjectAssignment(BaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='project_assignments')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='assignments')
    role = models.CharField(max_length=100)
    hours_worked = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    assigned_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ('employee', 'project')
        db_table = 'projects_projectassignment'

    def __str__(self):
        return f"{self.employee.employee_id} assigned to {self.project.project_name}"


class TaskLog(BaseModel):
    date = models.DateField()
    task_description = models.TextField()
    status = models.CharField(max_length=50, default='Not Started')
    owner = models.CharField(max_length=100)
    remarks = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'projects_tasklog'

    def __str__(self):
        return f"{self.date} - {self.owner} - {self.task_description[:30]}"
