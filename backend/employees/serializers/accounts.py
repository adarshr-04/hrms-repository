from rest_framework import serializers
from django.contrib.auth.models import User
from employees.models import Notification, Announcement
from employees.utils import get_user_role


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()
    employee_profile_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'role', 'department', 'employee_id', 'employee_profile_id'
        ]

    def get_role(self, obj):
        return get_user_role(obj)

    def get_department(self, obj):
        try:
            return obj.employee_profile.department.department_name if obj.employee_profile.department else None
        except:
            return None

    def get_employee_id(self, obj):
        try:
            # Return the public employee identifier (EMP-0001...), not the DB pk.
            return obj.employee_profile.employee_id
        except Exception:
            return None

    def get_employee_profile_id(self, obj):
        try:
            return obj.employee_profile.id
        except Exception:
            return None


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'link', 'is_read', 'created_at']


class AnnouncementSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'priority', 'posted_by', 'posted_by_name', 'is_active', 'created_at']
        read_only_fields = ['posted_by', 'posted_by_name']

    def get_posted_by_name(self, obj):
        if obj.posted_by:
            return f"{obj.posted_by.first_name} {obj.posted_by.last_name}".strip() or obj.posted_by.username
        return 'System'
