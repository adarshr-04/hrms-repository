from django.db.models import Q
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated, BasePermission

from employees.models import Project, ProjectAssignment, TaskLog, Employee
from employees.serializers import ProjectSerializer, ProjectAssignmentSerializer, TaskLogSerializer
from employees.utils import get_user_role


class IsHROrAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or request.user.is_anonymous:
            return False
        return get_user_role(request.user) in ['SUPER_ADMIN', 'ADMIN', 'HR']


class IsHROrAdminOrManager(BasePermission):
    def has_permission(self, request, view):
        if not request.user or request.user.is_anonymous:
            return False
        return get_user_role(request.user) in ['SUPER_ADMIN', 'ADMIN', 'HR', 'DEPT_MANAGER']


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    pagination_class = None
    filterset_fields = ['status']
    search_fields = ['project_name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHROrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return Project.objects.none()

        role = get_user_role(user)

        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            return Project.objects.all()

        try:
            emp = user.employee_profile
            if role == 'DEPT_MANAGER':
                subordinate_ids = list(Employee.objects.filter(manager=emp).values_list('id', flat=True))
                subordinate_ids.append(emp.id)
                return Project.objects.filter(Q(manager=emp) | Q(assignments__employee_id__in=subordinate_ids)).distinct()
            else:
                return Project.objects.filter(assignments__employee=emp).distinct()
        except Exception:
            return Project.objects.none()


class ProjectAssignmentViewSet(viewsets.ModelViewSet):
    queryset = ProjectAssignment.objects.all()
    serializer_class = ProjectAssignmentSerializer
    filterset_fields = ['employee', 'project', 'role']
    search_fields = ['employee__first_name', 'employee__last_name', 'role']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHROrAdminOrManager()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return ProjectAssignment.objects.none()

        role = get_user_role(user)

        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            return ProjectAssignment.objects.all()

        try:
            emp = user.employee_profile
            if role == 'DEPT_MANAGER':
                subordinate_ids = list(Employee.objects.filter(manager=emp).values_list('id', flat=True))
                subordinate_ids.append(emp.id)
                return ProjectAssignment.objects.filter(employee_id__in=subordinate_ids)
            else:
                return ProjectAssignment.objects.filter(employee=emp)
        except Exception:
            return ProjectAssignment.objects.none()

    def _ensure_manager_owns_project_or_is_admin(self, project):
        role = get_user_role(self.request.user)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            return

        try:
            manager = self.request.user.employee_profile
        except Employee.DoesNotExist:
            raise PermissionDenied('Only managers with an employee profile can assign projects.')

        if project.manager_id != manager.id:
            raise PermissionDenied('You can only assign employees to projects you manage.')

    def _ensure_manager_can_assign_employee(self, employee):
        role = get_user_role(self.request.user)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            return

        try:
            manager = self.request.user.employee_profile
        except Employee.DoesNotExist:
            raise PermissionDenied('Only managers with an employee profile can assign projects.')

        if employee.id != manager.id and employee.manager_id != manager.id:
            raise PermissionDenied('Managers can only assign projects to themselves or their direct reports.')

    def perform_create(self, serializer):
        self._ensure_manager_owns_project_or_is_admin(serializer.validated_data['project'])
        self._ensure_manager_can_assign_employee(serializer.validated_data['employee'])
        serializer.save()

    def perform_update(self, serializer):
        project = serializer.validated_data.get('project', serializer.instance.project)
        self._ensure_manager_owns_project_or_is_admin(project)
        employee = serializer.validated_data.get('employee', serializer.instance.employee)
        self._ensure_manager_can_assign_employee(employee)
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_manager_owns_project_or_is_admin(instance.project)
        self._ensure_manager_can_assign_employee(instance.employee)
        instance.delete()


class TaskLogViewSet(viewsets.ModelViewSet):
    queryset = TaskLog.objects.all()
    serializer_class = TaskLogSerializer
    filterset_fields = ['date', 'owner', 'status']
    search_fields = ['task_description', 'owner', 'remarks']
