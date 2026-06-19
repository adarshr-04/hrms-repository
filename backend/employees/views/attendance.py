from django.db.models import Q
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, NotAuthenticated
from rest_framework.response import Response

from employees.models import Attendance, Shift
from employees.serializers import AttendanceSerializer, ShiftSerializer
from employees.utils import get_user_role


class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return Shift.objects.none()
        return Shift.objects.all()

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            raise PermissionDenied("Only HR and Admins can create shifts.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            raise PermissionDenied("Only HR and Admins can update shifts.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        user = request.user
        role = get_user_role(user)
        if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            raise PermissionDenied("Only HR and Admins can delete shifts.")
        return super().destroy(request, *args, **kwargs)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    pagination_class = None
    filterset_fields = ['employee', 'attendance_date', 'status']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return Attendance.objects.none()

        role = get_user_role(user)

        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            return Attendance.objects.all()
        elif role == 'DEPT_MANAGER':
            try:
                emp_profile = user.employee_profile
                return Attendance.objects.filter(
                    Q(employee=emp_profile) | Q(employee__manager=emp_profile)
                )
            except Exception:
                return Attendance.objects.none()
        else:
            try:
                emp_profile = user.employee_profile
                return Attendance.objects.filter(employee=emp_profile)
            except Exception:
                return Attendance.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user or user.is_anonymous:
            raise NotAuthenticated()

        role = get_user_role(user)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            serializer.save()
            return

        employee = serializer.validated_data.get('employee')
        try:
            emp_profile = user.employee_profile
            if role == 'DEPT_MANAGER':
                if employee != emp_profile and employee.manager != emp_profile:
                    raise PermissionDenied("You can only log attendance for yourself or your subordinates.")
            else:
                if employee != emp_profile:
                    raise PermissionDenied("You can only log attendance for yourself.")
        except Exception:
            raise PermissionDenied("Invalid profile lookup.")

        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if not user or user.is_anonymous:
            raise NotAuthenticated()

        role = get_user_role(user)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            serializer.save()
            return

        employee = serializer.instance.employee
        try:
            emp_profile = user.employee_profile
            if role == 'DEPT_MANAGER':
                if employee != emp_profile and employee.manager != emp_profile:
                    raise PermissionDenied("You can only update attendance for yourself or your subordinates.")
            else:
                if employee != emp_profile:
                    raise PermissionDenied("You can only update your own attendance.")
        except Exception:
            raise PermissionDenied("Invalid profile lookup.")

        serializer.save()

    def destroy(self, request, *args, **kwargs):
        user = request.user
        role = get_user_role(user)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            return super().destroy(request, *args, **kwargs)

        raise PermissionDenied("Only HR and Admin can delete attendance records.")

