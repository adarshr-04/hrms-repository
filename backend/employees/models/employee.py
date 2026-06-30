from django.db import models, transaction
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError


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
    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='employee_profile', null=True, blank=True
    )   
    employee_id = models.CharField(max_length=20, unique=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(unique=True)              
    alternative_email = models.EmailField(blank=True,null=True)                                                   
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    hire_date = models.DateField(blank=True, null=True)
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
        ("TERMINATED", "Terminated"),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ACTIVE",
    )

    avatar = models.ImageField(
        upload_to='avatars/', null=True, blank=True
    )
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='employees'
    )
    branch = models.ForeignKey(
        'Branch', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='employees'
    )
    designation = models.ForeignKey(
    'Designation', on_delete=models.SET_NULL,
    null=True, blank=True, related_name='employees'
    )
    manager = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='subordinates'
    )




    
    @property
    def full_name(self):
        # return f"{self.first_name} {self.last_name}"
        return f"{self.first_name} {self.last_name or ''}".strip()

    # alternative_email = models.EmailField(blank=True, null=True)
    alternative_phone_number = models.CharField(max_length=20, blank=True, null=True)
    current_address = models.TextField(blank=True, null=True)
    permanent_address = models.TextField(blank=True, null=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'employees_employee'
        ordering = ['employee_id']


    def clean(self):
        super().clean()
        if self.manager == self:
            raise ValidationError(
                "Employee cannot be their own manager."
            )   
        if (
        self.hire_date
        and self.end_date
        and self.end_date < self.hire_date
        ):
            raise ValidationError(
                {"end_date": "End date cannot be earlier than hire date."}
            )
        
        if (
            self.email
            and self.alternative_email
            and self.email.lower() == self.alternative_email.lower()
        ):
            raise ValidationError(
                {"alternative_email": "Alternative email must be different from company email."}
            )
    


    def __str__(self):
        branch_str = f" ({self.branch.name})" if self.branch else ""
        return f"{self.first_name} {self.last_name or ''}".strip() + branch_str

    def save(self, *args, **kwargs):
        if not self.employee_id:
            with transaction.atomic():
                sequence, created = EmployeeSequence.objects.select_for_update().get_or_create(
                    pk=1,
                    defaults={"last_number": 0},
                )

                while True:
                    sequence.last_number += 1
                    candidate = f"PITS-{sequence.last_number:04d}"

                    if not Employee.objects.filter(employee_id=candidate).exists():
                        self.employee_id = candidate
                        sequence.save(update_fields=["last_number"])
                        break

        self.full_clean()
        if self.user:
            self.user.is_active = self.status == "ACTIVE"
            self.user.save(update_fields=["is_active"])
        super().save(*args, **kwargs)


class EmployeeSequence(models.Model):
    last_number = models.PositiveIntegerField(default=0)


class Document(BaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='documents')
    
    DOCUMENT_TYPES = [
    ("AADHAR", "Aadhaar"),
    ("PAN", "PAN Card"),
    ("PASSPORT", "Passport"),
    ("RESUME", "Resume"),
    ("OFFER", "Offer Letter"),
    ("OTHER", "Other"),
    ]

    document_type = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPES,
    )


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
