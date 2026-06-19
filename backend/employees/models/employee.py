from django.db import models, transaction
from django.contrib.auth.models import User


class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class Department(BaseModel):
    department_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'employees_department'

    def __str__(self):
        return self.department_name


class Employee(BaseModel):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]

    EMPLOYMENT_TYPES = [
        ('FULL_TIME', 'Full-time'),
        ('PART_TIME', 'Part-time'),
        ('CONTRACT', 'Contract'),
        ('INTERN', 'Intern'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('TERMINATED', 'Terminated'),
        ('ON_LEAVE', 'On Leave'),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='employee_profile', null=True, blank=True
    )
    employee_id = models.CharField(max_length=20, unique=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    gender = models.CharField(
        max_length=1, choices=GENDER_CHOICES, blank=True, null=True
    )
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    hire_date = models.DateField(blank=True, null=True)
    job_title = models.CharField(max_length=100, blank=True, null=True)
    employment_type = models.CharField(
        max_length=20, choices=EMPLOYMENT_TYPES, default='FULL_TIME'
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='ACTIVE'
    )
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='employees'
    )
    branch = models.ForeignKey(
        'Branch', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='employees'
    )
    manager = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='subordinates'
    )
    # Using string reference 'Shift' to avoid import cycle
    shift = models.ForeignKey(
        'Shift', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='employees'
    )
    
    @property
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    alternative_email = models.EmailField(blank=True, null=True)
    alternative_phone_number = models.CharField(max_length=20, blank=True, null=True)
    current_address = models.TextField(blank=True, null=True)
    permanent_address = models.TextField(blank=True, null=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'employees_employee'

    def __str__(self):
        branch_str = f" ({self.branch.name})" if self.branch else ""
        return f"{self.first_name} {self.last_name or ''}".strip() + branch_str

    def save(self, *args, **kwargs):
        """
        Auto-generate a unique employee_id if one is not provided.
        Uses select_for_update() inside an atomic transaction to prevent
        race conditions when multiple employees are saved concurrently.
        """
        if not self.employee_id:
            with transaction.atomic():
                # Lock the last employee row to serialize concurrent saves
                last_employee = (
                    Employee.objects.select_for_update()
                    .order_by('id')
                    .last()
                )
                next_id = (last_employee.id + 1) if last_employee else 1
                candidate = f'PITS-{next_id:04d}'

                # Ensure uniqueness — increment until a free slot is found
                while Employee.objects.filter(employee_id=candidate).exists():
                    next_id += 1
                    candidate = f'PITS-{next_id:04d}'

                self.employee_id = candidate

        super().save(*args, **kwargs)


class Document(BaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=100)
    file = models.FileField(upload_to='documents/')
    
    class Meta:
        db_table = 'employees_document'

    def __str__(self):
        return f"{self.employee.employee_id} - {self.document_type}"


class Designation(BaseModel):
    title = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'employees_designation'
        ordering = ['title']

    def __str__(self):
        return self.title
