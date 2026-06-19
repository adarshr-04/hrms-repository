from rest_framework import serializers
from employees.models import Attendance, Shift


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = '__all__'


class AttendanceSerializer(serializers.ModelSerializer):
    employee_id = serializers.ReadOnlyField(source='employee.employee_id')
    employee_name = serializers.ReadOnlyField(source='employee.get_full_name')
    branch_name = serializers.ReadOnlyField(source='employee.branch.name')
    department_name = serializers.ReadOnlyField(source='employee.department.department_name')

    class Meta:
        model = Attendance
        fields = [
            'id', 'employee', 'employee_id', 'employee_name',
            'attendance_date', 'check_in', 'check_out',
            'work_hours', 'status', 'notes',
            'branch_name', 'department_name',
            'created_at', 'updated_at'
        ]

