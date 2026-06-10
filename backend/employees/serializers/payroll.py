from rest_framework import serializers
from employees.models import Payroll


class PayrollSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.get_full_name')

    class Meta:
        model = Payroll
        fields = '__all__'
