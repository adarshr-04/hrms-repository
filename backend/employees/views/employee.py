from datetime import date
import pandas as pd
from django.db.models import Q
from rest_framework import viewsets, parsers, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.response import Response

from employees.models import Department, Branch, Employee, Document, Designation
from employees.serializers import DepartmentSerializer, BranchSerializer, EmployeeSerializer, DocumentSerializer, DesignationSerializer
from employees.utils import get_user_role


class IsHROrAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user or request.user.is_anonymous:
            return False
        if request.method in SAFE_METHODS:
            return True
        return get_user_role(request.user) in ['SUPER_ADMIN', 'ADMIN', 'HR']


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsHROrAdminOrReadOnly]
    pagination_class = None


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsHROrAdminOrReadOnly]
    pagination_class = None
    search_fields = ['name', 'city']
    filterset_fields = ['city']


class DesignationViewSet(viewsets.ModelViewSet):
    queryset = Designation.objects.all()
    serializer_class = DesignationSerializer
    permission_classes = [IsHROrAdminOrReadOnly]
    pagination_class = None


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsHROrAdminOrReadOnly]
    pagination_class = None
    parser_classes = (parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser)
    filterset_fields = ['department', 'branch', 'designation']
    search_fields = ['first_name', 'last_name', 'employee_id', 'email']

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return Employee.objects.none()
        return Employee.objects.all()

    def destroy(self, request, *args, **kwargs):
        """
        Override DELETE to soft-delete the employee record.
        Records the end_date as today.
        The record is preserved for audit trail and payroll history.
        """
        employee = self.get_object()
        employee.end_date = date.today()
        employee.save(update_fields=['end_date', 'updated_at'])
        return Response(
            {
                'message': (
                    f'Employee {employee.employee_id} — '
                    f'{employee.first_name} {employee.last_name or ""}'.strip()
                    + ' has been terminated. Record preserved for audit.'
                )
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'No file provided. Please upload a CSV or Excel file.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if file.name.endswith('.csv'):
                df = pd.read_csv(file)
            elif file.name.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file)
            else:
                return Response(
                    {'error': 'Unsupported file type. Upload a .csv, .xlsx, or .xls file.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as exc:
            return Response(
                {'error': f'Could not parse file: {str(exc)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Replace NaN/NaT with None so we can safely call .get() on rows
        df = df.where(pd.notnull(df), None)

        created_count = 0
        skipped_count = 0
        errors = []

        for index, row in df.iterrows():
            row_number = index + 2  # 1-based + header row

            # --- Resolve department by name (create if new) ---
            dept_name = row.get('department')
            dept_id = None
            if dept_name:
                dept_obj, _ = Department.objects.get_or_create(
                    department_name=str(dept_name).strip()
                )
                dept_id = dept_obj.id

            branch_name = row.get('branch')
            branch_id = None
            if branch_name:
                branch_obj, _ = Branch.objects.get_or_create(
                    name=str(branch_name).strip()
                )
                branch_id = branch_obj.id

            designation_name = row.get('designation')
            designation_id = None
            if designation_name:
                designation_obj, _ = Designation.objects.get_or_create(
                    title=str(designation_name).strip()
                )
                designation_id = designation_obj.id

            # --- Build the payload dict for the serializer ---
            payload = {
                'first_name': row.get('first_name'),
                'last_name': row.get('last_name'),
                'email': row.get('email'),
                'phone_number': row.get('phone_number'),
                'department': dept_id,
                'branch': branch_id,
                'designation': designation_id,
            }

            if row.get('hire_date') is not None:
                payload['hire_date'] = row.get('hire_date')
            if row.get('date_of_birth') is not None:
                payload['date_of_birth'] = row.get('date_of_birth')

            emp_id = row.get('employee_id')
            if emp_id:
                payload['employee_id'] = str(emp_id).strip()

            payload = {k: v for k, v in payload.items() if v is not None}

            serializer = EmployeeSerializer(data=payload)
            if serializer.is_valid():
                serializer.save()
                created_count += 1
            else:
                skipped_count += 1
                reason_parts = []
                for field, messages in serializer.errors.items():
                    msg = messages[0] if isinstance(messages, list) else str(messages)
                    reason_parts.append(f'{field}: {msg}')
                errors.append({
                    'row': row_number,
                    'reason': ' | '.join(reason_parts),
                })

        return Response(
            {
                'created': created_count,
                'skipped': skipped_count,
                'errors': errors,
            },
            status=status.HTTP_200_OK,
        )


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.select_related('employee', 'employee__user')
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filterset_fields = ['employee', 'document_type']
    search_fields = ['document_type']

    def get_queryset(self):
        queryset = super().get_queryset()
        role = get_user_role(self.request.user)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            return queryset

        try:
            employee = self.request.user.employee_profile
        except Employee.DoesNotExist:
            return queryset.none()

        return queryset.filter(employee=employee)

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        employee = serializer.validated_data.get('employee')
        
        if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            try:
                own_employee = user.employee_profile
            except Employee.DoesNotExist:
                own_employee = None

            if not own_employee or employee != own_employee:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only upload documents to your own vault.")
                
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        user = request.user
        role = get_user_role(user)
        instance = self.get_object()
        
        if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            try:
                own_employee = user.employee_profile
            except Employee.DoesNotExist:
                own_employee = None

            if not own_employee or instance.employee != own_employee:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only delete your own documents.")
                
        return super().destroy(request, *args, **kwargs)
