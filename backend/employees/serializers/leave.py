from rest_framework import serializers
from employees.models import Leave


class LeaveSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.get_full_name')
    approver_name = serializers.ReadOnlyField(source='approver.get_full_name')

    class Meta:
        model = Leave
        fields = '__all__'
