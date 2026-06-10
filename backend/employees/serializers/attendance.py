from rest_framework import serializers
from employees.models import Attendance, Shift


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = '__all__'


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.get_full_name')

    class Meta:
        model = Attendance
        fields = '__all__'
