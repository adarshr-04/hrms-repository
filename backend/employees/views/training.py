from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.exceptions import PermissionDenied

from employees.models import Training, Enrollment, Employee
from employees.serializers import TrainingSerializer, EnrollmentSerializer
from employees.utils import get_user_role


class IsHROrAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or request.user.is_anonymous:
            return False
        return get_user_role(request.user) in ['SUPER_ADMIN', 'ADMIN', 'HR']


class TrainingViewSet(viewsets.ModelViewSet):
    queryset = Training.objects.all()
    serializer_class = TrainingSerializer
    search_fields = ['training_name', 'trainer_name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHROrAdmin()]
        return [IsAuthenticated()]


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    filterset_fields = ['employee', 'training', 'status']
    search_fields = ['employee__first_name', 'employee__last_name', 'training__training_name']

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return Enrollment.objects.none()

        role = get_user_role(user)

        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            return Enrollment.objects.all()

        try:
            emp = user.employee_profile
            if role == 'DEPT_MANAGER':
                subordinate_ids = list(Employee.objects.filter(manager=emp).values_list('id', flat=True))
                subordinate_ids.append(emp.id)
                return Enrollment.objects.filter(employee_id__in=subordinate_ids)
            else:
                return Enrollment.objects.filter(employee=emp)
        except Exception:
            return Enrollment.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            serializer.save()
            return

        employee = serializer.validated_data.get('employee')
        try:
            emp_profile = user.employee_profile
            if role == 'DEPT_MANAGER':
                if employee != emp_profile and employee.manager != emp_profile:
                    raise PermissionDenied("You can only enroll yourself or your subordinates.")
            else:
                if employee != emp_profile:
                    raise PermissionDenied("You can only enroll yourself.")
        except Exception:
            raise PermissionDenied("Invalid profile lookup.")

        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            serializer.save()
            return

        employee = serializer.instance.employee
        try:
            emp_profile = user.employee_profile
            if role == 'DEPT_MANAGER':
                if employee != emp_profile and employee.manager != emp_profile:
                    raise PermissionDenied("You can only update enrollments for yourself or your subordinates.")
            else:
                if employee != emp_profile:
                    raise PermissionDenied("You can only update your own enrollments.")
        except Exception:
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
            if role == 'DEPT_MANAGER':
                if employee != emp_profile and employee.manager != emp_profile:
                    raise PermissionDenied("You can only cancel enrollments for yourself or your subordinates.")
            else:
                if employee != emp_profile:
                    raise PermissionDenied("You can only cancel your own enrollments.")
        except Exception:
            raise PermissionDenied("Invalid profile lookup.")

        return super().destroy(request, *args, **kwargs)
