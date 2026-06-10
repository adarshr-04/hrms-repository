from rest_framework import serializers
from employees.models import Training, Enrollment


class TrainingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Training
        fields = '__all__'


class EnrollmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.get_full_name')
    training_name = serializers.ReadOnlyField(source='training.training_name')

    class Meta:
        model = Enrollment
        fields = '__all__'
