from rest_framework import viewsets
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, NotAuthenticated
from employees.models import Leave
from employees.serializers import LeaveSerializer
from employees.utils import get_user_role


class LeaveViewSet(viewsets.ModelViewSet):
    queryset = Leave.objects.all()
    serializer_class = LeaveSerializer
    pagination_class = None
    filterset_fields = ['employee', 'leave_type', 'status']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return Leave.objects.none()

        role = get_user_role(user)

        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            return Leave.objects.all()
        elif role == 'DEPT_MANAGER':
            try:
                emp_profile = user.employee_profile
                return Leave.objects.filter(
                    Q(employee=emp_profile) | Q(employee__manager=emp_profile)
                )
            except Exception:
                return Leave.objects.none()
        else:
            try:
                emp_profile = user.employee_profile
                return Leave.objects.filter(employee=emp_profile)
            except Exception:
                return Leave.objects.none()

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
            if employee != emp_profile:
                raise PermissionDenied("You can only request leaves for yourself.")
        except Exception:
            raise PermissionDenied("Invalid profile lookup.")

        serializer.save(status='PENDING')

    def perform_update(self, serializer):
        user = self.request.user
        if not user or user.is_anonymous:
            raise NotAuthenticated()

        role = get_user_role(user)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            serializer.save()
            return

        leave_instance = serializer.instance
        employee = leave_instance.employee
        try:
            emp_profile = user.employee_profile
            new_status = serializer.validated_data.get('status', leave_instance.status)
            if new_status != leave_instance.status:
                if role == 'DEPT_MANAGER':
                    if employee.manager != emp_profile or employee == emp_profile:
                        raise PermissionDenied("You can only approve/reject leave requests for your direct reports.")
                else:
                    raise PermissionDenied("You do not have permission to approve or reject leave requests.")
            else:
                if employee != emp_profile:
                    raise PermissionDenied("You can only edit your own leave requests.")
                if leave_instance.status != 'PENDING':
                    raise PermissionDenied("You cannot edit a leave request that has already been processed.")
        except Exception as e:
            if isinstance(e, PermissionDenied):
                raise e
            raise PermissionDenied("Invalid profile lookup.")

        serializer.save()

    def destroy(self, request, *args, **kwargs):
        user = request.user
        role = get_user_role(user)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            return super().destroy(request, *args, **kwargs)

        instance = self.get_object()
        employee = instance.employee
        try:
            emp_profile = user.employee_profile
            if employee != emp_profile:
                raise PermissionDenied("You can only delete your own leave requests.")
            if instance.status != 'PENDING':
                raise PermissionDenied("You cannot delete a leave request that has already been processed.")
        except Exception:
            raise PermissionDenied("Invalid profile lookup.")

        return super().destroy(request, *args, **kwargs)
