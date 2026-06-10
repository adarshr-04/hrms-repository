from datetime import datetime, time
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, NotAuthenticated
from rest_framework.response import Response

from employees.models import Attendance, Shift, AttendanceRequest
from employees.serializers import AttendanceSerializer, ShiftSerializer, AttendanceRequestSerializer
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

        status = serializer.validated_data.get('status', 'PRESENT')
        check_in = serializer.validated_data.get('check_in')

        if check_in and status == 'PRESENT':
            shift = employee.shift
            if shift:
                start_t = shift.start_time
                grace = shift.grace_period
            else:
                start_t = time(9, 30, 0)
                grace = 0

            limit_m = start_t.minute + grace
            limit_h = start_t.hour + (limit_m // 60)
            limit_m = limit_m % 60

            check_in_time = check_in
            if isinstance(check_in_time, str):
                check_in_time = datetime.strptime(check_in_time, "%H:%M:%S").time()

            if check_in_time.hour > limit_h or (check_in_time.hour == limit_h and check_in_time.minute > limit_m):
                serializer.validated_data['status'] = 'LATE'

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


class AttendanceRequestViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRequest.objects.all()
    serializer_class = AttendanceRequestSerializer

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return AttendanceRequest.objects.none()

        role = get_user_role(user)

        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            return AttendanceRequest.objects.all()
        elif role == 'DEPT_MANAGER':
            try:
                emp_profile = user.employee_profile
                return AttendanceRequest.objects.filter(
                    Q(employee=emp_profile) | Q(employee__manager=emp_profile)
                )
            except Exception:
                return AttendanceRequest.objects.none()
        else:
            try:
                emp_profile = user.employee_profile
                return AttendanceRequest.objects.filter(employee=emp_profile)
            except Exception:
                return AttendanceRequest.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user or user.is_anonymous:
            raise NotAuthenticated()

        role = get_user_role(user)
        employee = serializer.validated_data.get('employee')
        try:
            emp_profile = user.employee_profile
            if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
                if role == 'DEPT_MANAGER':
                    if employee != emp_profile and employee.manager != emp_profile:
                        raise PermissionDenied("You can only request corrections for yourself or subordinates.")
                else:
                    if employee != emp_profile:
                        raise PermissionDenied("You can only request corrections for yourself.")
        except Exception:
            raise PermissionDenied("Invalid profile lookup.")

        serializer.save(status='PENDING')

    def perform_update(self, serializer):
        user = self.request.user
        if not user or user.is_anonymous:
            raise NotAuthenticated()

        role = get_user_role(user)
        instance = self.get_object()

        if role not in ['SUPER_ADMIN', 'ADMIN', 'HR', 'DEPT_MANAGER']:
            try:
                emp_profile = user.employee_profile
                if instance.employee != emp_profile:
                    raise PermissionDenied("You can only edit your own correction requests.")
                if instance.status != 'PENDING':
                    raise PermissionDenied("You cannot edit a request that has already been reviewed.")
                serializer.save()
                return
            except Exception:
                raise PermissionDenied("Profile lookup error.")

        reviewing_emp = None
        try:
            reviewing_emp = user.employee_profile
        except Exception:
            pass

        request_obj = serializer.save(reviewed_by=reviewing_emp)

        if request_obj.status == 'APPROVED':
            attendance_record, created = Attendance.objects.get_or_create(
                employee=request_obj.employee,
                attendance_date=request_obj.attendance_date,
                defaults={'status': 'PRESENT'}
            )
            if request_obj.check_in:
                attendance_record.check_in = request_obj.check_in
            if request_obj.check_out:
                attendance_record.check_out = request_obj.check_out

            if attendance_record.check_in and attendance_record.check_out:
                from datetime import datetime, combine
                t_in = datetime.combine(request_obj.attendance_date, attendance_record.check_in)
                t_out = datetime.combine(request_obj.attendance_date, attendance_record.check_out)
                diff = t_out - t_in
                hours = diff.total_seconds() / 3600.0
                attendance_record.work_hours = max(0.0001, round(hours, 2))

            shift = request_obj.employee.shift
            if shift:
                start_t = shift.start_time
                grace = shift.grace_period
            else:
                start_t = time(9, 30, 0)
                grace = 15

            if attendance_record.check_in:
                limit_m = start_t.minute + grace
                limit_h = start_t.hour + (limit_m // 60)
                limit_m = limit_m % 60

                check_in_time = attendance_record.check_in
                if check_in_time.hour > limit_h or (check_in_time.hour == limit_h and check_in_time.minute > limit_m):
                    attendance_record.status = 'LATE'
                else:
                    attendance_record.status = 'PRESENT'

            attendance_record.save()
