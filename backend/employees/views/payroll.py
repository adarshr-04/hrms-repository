from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db import transaction

from employees.models import Payroll, Employee, Notification
from employees.serializers import PayrollSerializer
from employees.utils import get_user_role


class PayrollViewSet(viewsets.ModelViewSet):
    queryset = Payroll.objects.all()
    serializer_class = PayrollSerializer
    filterset_fields = ['employee', 'payment_mode']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']

    def get_queryset(self):
        user = self.request.user
        if not user or user.is_anonymous:
            return Payroll.objects.none()

        role = get_user_role(user)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            return Payroll.objects.all()
        
        try:
            emp_profile = user.employee_profile
            return Payroll.objects.filter(employee=emp_profile)
        except Exception:
            return Payroll.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            raise PermissionDenied("Only HR and Admins can create payroll records.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            raise PermissionDenied("Only HR and Admins can modify payroll records.")
        
        old_status = serializer.instance.status
        payroll = serializer.save()
        
        if old_status != payroll.status and payroll.status == 'PAID':
            if payroll.employee.user:
                Notification.objects.create(
                    user=payroll.employee.user,
                    title="Payroll Processed",
                    message=f"Your payroll for {payroll.pay_period_start} to {payroll.pay_period_end} has been processed and paid. Net Pay: {payroll.net_pay}",
                    link="/payroll"
                )

    def destroy(self, request, *args, **kwargs):
        user = request.user
        role = get_user_role(user)
        if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            raise PermissionDenied("Only HR and Admins can delete payroll records.")
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='bulk-generate')
    def bulk_generate(self, request):
        user = request.user
        role = get_user_role(user)
        if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            raise PermissionDenied("Only HR and Admins can bulk generate payroll.")

        pay_period_start = request.data.get('pay_period_start')
        pay_period_end = request.data.get('pay_period_end')
        pay_date = request.data.get('pay_date')

        if not pay_period_start or not pay_period_end or not pay_date:
            return Response(
                {"error": "Please provide pay_period_start, pay_period_end, and pay_date."},
                status=status.HTTP_400_BAD_REQUEST
            )

        active_employees = Employee.objects.filter(status='ACTIVE')
        created_count = 0
        skipped_count = 0

        with transaction.atomic():
            for emp in active_employees:
                exists = Payroll.objects.filter(
                    employee=emp,
                    pay_period_start=pay_period_start,
                    pay_period_end=pay_period_end
                ).exists()

                if exists:
                    skipped_count += 1
                    continue

                last_payroll = Payroll.objects.filter(employee=emp).order_by('-pay_period_end').first()
                
                if last_payroll:
                    basic = last_payroll.basic_salary
                    allowances = last_payroll.allowances
                    deductions = last_payroll.deductions
                    tax = last_payroll.tax
                    bonus = 0.00
                else:
                    basic = 30000.00
                    allowances = 0.00
                    deductions = 0.00
                    tax = 0.00
                    bonus = 0.00

                net_pay = basic + allowances + bonus - deductions - tax

                Payroll.objects.create(
                    employee=emp,
                    pay_period_start=pay_period_start,
                    pay_period_end=pay_period_end,
                    basic_salary=basic,
                    allowances=allowances,
                    deductions=deductions,
                    tax=tax,
                    bonus=bonus,
                    net_pay=net_pay,
                    pay_date=pay_date,
                    status='PENDING'
                )
                created_count += 1

        return Response({
            "message": f"Successfully processed payroll. Created: {created_count}, Skipped (already exists): {skipped_count}",
            "created": created_count,
            "skipped": skipped_count
        }, status=status.HTTP_200_OK)
