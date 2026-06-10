from rest_framework import serializers
from employees.models import Project, ProjectAssignment, TaskLog


class ProjectSerializer(serializers.ModelSerializer):
    assignment_count = serializers.IntegerField(source='assignments.count', read_only=True)
    manager_name = serializers.ReadOnlyField(source='manager.get_full_name')

    class Meta:
        model = Project
        fields = [
            'id', 'project_name', 'start_date', 'end_date', 'status', 
            'assignment_count', 'manager', 'manager_name', 'created_at', 'updated_at'
        ]


class ProjectAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.get_full_name')
    project_name = serializers.ReadOnlyField(source='project.project_name')

    class Meta:
        model = ProjectAssignment
        fields = '__all__'


class TaskLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskLog
        fields = '__all__'
