from rest_framework import serializers
from employees.models import Attendance, Shift, AttendanceRequest


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = '__all__'


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.get_full_name')

    class Meta:
        model = Attendance
        fields = '__all__'


class AttendanceRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.get_full_name')
    reviewed_by_name = serializers.ReadOnlyField(source='reviewed_by.get_full_name')

    class Meta:
        model = AttendanceRequest
        fields = '__all__'
