from rest_framework import serializers
from .models import Department, Employee, Document


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class EmployeeSerializer(serializers.ModelSerializer):
    manager_name = serializers.ReadOnlyField(source='manager.get_full_name')
    department_name = serializers.ReadOnlyField(source='department.department_name')

    class Meta:
        model = Employee
        fields = [
            'id', 'employee_id', 'first_name', 'last_name', 'gender',
            'email', 'phone_number', 'date_of_birth', 'hire_date',
            'job_title', 'employment_type', 'status',
            'department', 'department_name',
            'manager', 'manager_name', 'avatar',
            'alternative_email', 'alternative_phone_number',
            'current_address', 'permanent_address', 'end_date',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'email': {
                'error_messages': {
                    'unique': (
                        "This email address is already registered to another "
                        "staff member. Please use a different email."
                    )
                }
            },
            'employee_id': {
                'required': False,
                'allow_blank': True,
                'error_messages': {
                    'unique': (
                        "This Employee ID is already in use. Please provide "
                        "a unique ID or leave it blank to auto-generate."
                    )
                }
            },
            'last_name': {'required': False, 'allow_blank': True, 'allow_null': True},
            'gender': {'required': False, 'allow_null': True, 'allow_blank': True},
            'department': {'required': False, 'allow_null': True},
            'employment_type': {'required': False},
            'status': {'required': False},
            'manager': {'required': False, 'allow_null': True},
            'date_of_birth': {'required': False, 'allow_null': True},
            'hire_date': {'required': False, 'allow_null': True},
        }

    # -------------------------------------------------------------------------
    # Choice field validators — surface clear, human-readable errors
    # -------------------------------------------------------------------------

    def validate_employment_type(self, value):
        valid_choices = [choice[0] for choice in Employee.EMPLOYMENT_TYPES]
        if value and value not in valid_choices:
            readable = ', '.join(
                f'"{c[0]}" ({c[1]})' for c in Employee.EMPLOYMENT_TYPES
            )
            raise serializers.ValidationError(
                f'"{value}" is not a valid employment type. '
                f'Accepted values are: {readable}.'
            )
        return value

    def validate_status(self, value):
        valid_choices = [choice[0] for choice in Employee.STATUS_CHOICES]
        if value and value not in valid_choices:
            readable = ', '.join(
                f'"{c[0]}" ({c[1]})' for c in Employee.STATUS_CHOICES
            )
            raise serializers.ValidationError(
                f'"{value}" is not a valid status. '
                f'Accepted values are: {readable}.'
            )
        return value

    def validate_gender(self, value):
        if not value:
            return value
        valid_choices = [choice[0] for choice in Employee.GENDER_CHOICES]
        if value not in valid_choices:
            readable = ', '.join(
                f'"{c[0]}" ({c[1]})' for c in Employee.GENDER_CHOICES
            )
            raise serializers.ValidationError(
                f'"{value}" is not a valid gender. '
                f'Accepted values are: {readable}.'
            )
        return value

    # -------------------------------------------------------------------------
    # Auto-create / sync the Django User account when an employee is saved
    # -------------------------------------------------------------------------

    def create(self, validated_data):
        from django.contrib.auth.models import User

        email = validated_data.get('email', '')
        first_name = validated_data.get('first_name', '')
        last_name = validated_data.get('last_name', '') or ''

        # Derive a clean username from the email (part before @)
        base_username = email.split('@')[0].lower().replace(' ', '.') if email else first_name.lower()
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        # Generate a secure temporary password (make_random_password was removed in Django 5.0)
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits + string.punctuation
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=temp_password
        )

        # Send welcome email with credentials
        from django.core.mail import send_mail
        from django.conf import settings
        
        subject = "Welcome to HRMS Enterprise - Your Login Credentials"
        message = f"""Hello {first_name},

Welcome to HRMS Enterprise! Your account has been successfully created.
Please use the following credentials to log in to your dashboard:

Username: {username}
Temporary Password: {temp_password}

Login URL: http://localhost:3000/login

For security reasons, we strongly recommend changing your password from the Settings page after your first login.

Best regards,
HR Team"""
        
        try:
            send_mail(
                subject,
                message,
                getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hrms.com'),
                [email],
                fail_silently=True,
            )
        except Exception:
            pass

        # Link the user to the employee record
        validated_data['user'] = user
        employee = super().create(validated_data)
        return employee

    def update(self, instance, validated_data):
        from django.contrib.auth.models import User

        # Keep the linked user's email and name in sync
        user = instance.user
        if user:
            if 'email' in validated_data:
                user.email = validated_data['email']
            if 'first_name' in validated_data:
                user.first_name = validated_data['first_name']
            if 'last_name' in validated_data:
                user.last_name = validated_data['last_name'] or ''
            user.save()

        return super().update(instance, validated_data)


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'

