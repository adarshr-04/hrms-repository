from rest_framework import serializers
from employees.models import Department, Branch, Employee, Document, Designation


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'


class EmployeeSerializer(serializers.ModelSerializer):
    manager_name = serializers.ReadOnlyField(source='manager.full_name')
    department_name = serializers.ReadOnlyField(source='department.department_name')
    branch_name = serializers.ReadOnlyField(source='branch.name')
    designation_name = serializers.ReadOnlyField(source='designation.title')

    class Meta:
        model = Employee
        fields = [
            'id', 'employee_id', 'first_name', 'last_name',
            'email', 'phone_number', 'date_of_birth', 'hire_date',
            'designation', 'designation_name',
            'department', 'department_name',
            'branch', 'branch_name',
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
            'department': {'required': False, 'allow_null': True},
            'branch': {'required': False, 'allow_null': True},
            'manager': {'required': False, 'allow_null': True},
            'date_of_birth': {'required': False, 'allow_null': True},
            'hire_date': {'required': False, 'allow_null': True},
        }


    # -------------------------------------------------------------------------
    # Auto-sync the Django User account when an employee is updated
    # -------------------------------------------------------------------------

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


class DesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Designation
        fields = '__all__'
