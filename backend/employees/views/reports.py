from rest_framework import views, response, permissions
from rest_framework.exceptions import PermissionDenied
from django.db.models import Count, Avg, Sum, Q
from django.db.models.functions import TruncMonth

from employees.models import Employee, Department, Attendance, Leave, Payroll
from employees.utils import get_user_role


def require_admin_hr(user):
    role = get_user_role(user)
    if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
        raise PermissionDenied("Only Admin/HR users can access reports.")


class WorkforceReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        require_admin_hr(request.user)

        employees = Employee.objects.filter(end_date__isnull=True)

        total = employees.count()

        by_dept = list(
            Department.objects.annotate(
                count=Count('employees', filter=Q(employees__end_date__isnull=True))
            ).values('department_name', 'count').order_by('-count')
        )

        by_designation = list(
            employees.values('designation__title')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        return response.Response({
            'total': total,
            'by_department': by_dept,
            'by_designation': by_designation,
        })


class AttendanceReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        require_admin_hr(request.user)

        year = request.query_params.get('year')
        qs = Attendance.objects.all()
        if year:
            qs = qs.filter(attendance_date__year=year)

        monthly = list(
            qs.annotate(month=TruncMonth('attendance_date'))
            .values('month', 'status')
            .annotate(count=Count('id'))
            .order_by('month', 'status')
        )

        for row in monthly:
            if row['month']:
                row['month'] = row['month'].strftime('%Y-%m')

        status_totals = {
            s: qs.filter(status=s).count()
            for s in ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE']
        }

        avg_hours = qs.filter(work_hours__isnull=False).aggregate(
            avg=Avg('work_hours')
        )['avg'] or 0

        return response.Response({
            'monthly_trend': monthly,
            'status_totals': status_totals,
            'avg_work_hours': round(float(avg_hours), 2),
        })


class LeavesReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        require_admin_hr(request.user)

        year = request.query_params.get('year')
        qs = Leave.objects.all()
        if year:
            qs = qs.filter(start_date__year=year)

        by_type = list(
            qs.values('leave_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        by_status = list(
            qs.values('status')
            .annotate(count=Count('id'))
        )

        total = qs.count()
        approved = qs.filter(status='APPROVED').count()
        approval_rate = round((approved / total * 100), 1) if total else 0

        monthly = list(
            qs.annotate(month=TruncMonth('start_date'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        for row in monthly:
            if row['month']:
                row['month'] = row['month'].strftime('%Y-%m')

        return response.Response({
            'total': total,
            'approval_rate': approval_rate,
            'by_type': by_type,
            'by_status': by_status,
            'monthly_trend': monthly,
        })


class PayrollReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        require_admin_hr(request.user)

        year = request.query_params.get('year')
        qs = Payroll.objects.all()
        if year:
            qs = qs.filter(pay_period_start__year=year)

        monthly = list(
            qs.annotate(month=TruncMonth('pay_period_start'))
            .values('month')
            .annotate(total=Sum('net_pay'), count=Count('id'))
            .order_by('month')
        )
        for row in monthly:
            if row['month']:
                row['month'] = row['month'].strftime('%Y-%m')
            row['total'] = float(row['total'] or 0)

        by_dept = []
        for dept in Department.objects.all():
            emp_ids = dept.employees.values_list('id', flat=True)
            dept_qs = qs.filter(employee_id__in=emp_ids)
            avg = dept_qs.aggregate(avg=Avg('net_pay'))['avg'] or 0
            total = dept_qs.aggregate(total=Sum('net_pay'))['total'] or 0
            by_dept.append({
                'department': dept.department_name,
                'avg_net_pay': round(float(avg), 2),
                'total_net_pay': round(float(total), 2),
                'count': dept_qs.count(),
            })

        paid = qs.filter(status='PAID').aggregate(total=Sum('net_pay'))['total'] or 0
        pending = qs.filter(status='PENDING').aggregate(total=Sum('net_pay'))['total'] or 0
        overall_total = qs.aggregate(total=Sum('net_pay'))['total'] or 0

        return response.Response({
            'monthly_trend': monthly,
            'by_department': sorted(by_dept, key=lambda x: x['total_net_pay'], reverse=True),
            'status_split': {
                'paid': round(float(paid), 2),
                'pending': round(float(pending), 2),
                'total': round(float(overall_total), 2),
            },
        })
