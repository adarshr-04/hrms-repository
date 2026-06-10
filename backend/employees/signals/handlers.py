from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User

from django.conf import settings
from employees.utils import get_user_role
from django.core.mail import send_mail


# Helper to get all HR/Admin/SuperAdmin users
def get_hr_and_admin_users():
    users = User.objects.filter(is_active=True)
    recipients = []
    for u in users:
        role = get_user_role(u)
        if role in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            recipients.append(u)
    return recipients


@receiver(post_save, sender='employees.Notification')
def notification_created(sender, instance, created, **kwargs):
    # Stub for future extensions (websockets, etc.)
    pass


# 0. Onboarding signals
@receiver(post_save, sender='employees.Employee')
def employee_created(sender, instance, created, **kwargs):
    if created and not instance.user:
        try:
            from employees.models import EmployeeInviteToken
            # Auto-generate invite token
            token_obj = EmployeeInviteToken.objects.create(employee=instance)
            
            # Send activation email
            subject = "Welcome to HRMS Enterprise - Set Up Your Account"
            activation_link = f"http://localhost:3000/activate?token={token_obj.token}"
            message = (
                f"Hello {instance.first_name},\n\n"
                f"Welcome to HRMS Enterprise! Your employee profile has been created.\n\n"
                f"Please click the link below to set your password and activate your account:\n"
                f"{activation_link}\n\n"
                f"This link will expire in 72 hours.\n\n"
                f"Best regards,\nHR Team"
            )
            send_mail(
                subject,
                message,
                getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hrms.com'),
                [instance.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Error generating invite token for employee: {e}")


# 1. Leaves signals
@receiver(post_save, sender='employees.Leave')
def leave_request_changed(sender, instance, created, **kwargs):
    try:
        from employees.models import Notification
        employee = instance.employee
        
        if created:
            if employee.manager and employee.manager.user:
                Notification.objects.create(
                    user=employee.manager.user,
                    title="New Leave Request",
                    message=f"{employee.get_full_name} has requested {instance.total_days} days of leave ({instance.leave_type}).",
                    link="/leaves"
                )
            hr_users = get_hr_and_admin_users()
            for hr in hr_users:
                if employee.manager and hr == employee.manager.user:
                    continue
                Notification.objects.create(
                    user=hr,
                    title="New Leave Request",
                    message=f"{employee.get_full_name} has requested {instance.total_days} days of leave ({instance.leave_type}).",
                    link="/leaves"
                )
        else:
            if employee.user:
                Notification.objects.create(
                    user=employee.user,
                    title=f"Leave Request {instance.get_status_display()}",
                    message=f"Your leave request for {instance.total_days} days of {instance.leave_type} has been {instance.status.lower()} by the HR/Manager.",
                    link="/leaves"
                )
    except Exception as e:
        print(f"Error in leave signal: {e}")


# 2. Payroll signals
@receiver(post_save, sender='employees.Payroll')
def payroll_disbursed(sender, instance, created, **kwargs):
    try:
        from employees.models import Notification
        employee = instance.employee
        if instance.status == 'PAID' and employee.user:
            Notification.objects.create(
                user=employee.user,
                title="Payslip Disbursed",
                message=f"Your salary statement for period {instance.pay_period_start} to {instance.pay_period_end} has been disbursed.",
                link="/payroll"
            )
    except Exception as e:
        print(f"Error in payroll signal: {e}")


# 3. Training signals
@receiver(post_save, sender='employees.Enrollment')
def training_enrollment_changed(sender, instance, created, **kwargs):
    try:
        from employees.models import Notification
        employee = instance.employee
        training = instance.training
        if employee.user:
            if created:
                Notification.objects.create(
                    user=employee.user,
                    title="New Training Enrollment",
                    message=f"You have been enrolled in the training program: {training.training_name}.",
                    link="/training"
                )
            elif instance.status == 'COMPLETED':
                score_str = f" with score {instance.score}%" if instance.score else ""
                Notification.objects.create(
                    user=employee.user,
                    title="Training Program Completed",
                    message=f"Congratulations! You completed the training '{training.training_name}'{score_str}.",
                    link="/training"
                )
    except Exception as e:
        print(f"Error in training signal: {e}")


# 4. Recruitment signals
@receiver(post_save, sender='employees.Application')
def recruitment_application_changed(sender, instance, created, **kwargs):
    try:
        from employees.models import Notification
        job = instance.job
        candidate = instance.candidate
        
        if created:
            hr_users = get_hr_and_admin_users()
            for hr in hr_users:
                Notification.objects.create(
                    user=hr,
                    title="New Job Application",
                    message=f"A new candidate, {candidate.first_name} {candidate.last_name}, has applied for '{job.title}'.",
                    link="/recruitment"
                )
        else:
            hr_users = get_hr_and_admin_users()
            for hr in hr_users:
                Notification.objects.create(
                    user=hr,
                    title="Pipeline Candidate Updated",
                    message=f"Candidate {candidate.first_name} {candidate.last_name} ({job.title}) moved to state: {instance.get_status_display()}.",
                    link="/recruitment"
                )
    except Exception as e:
        print(f"Error in recruitment signal: {e}")


# 5. Recruitment Interview signals
@receiver(post_save, sender='employees.Interview')
def recruitment_interview_changed(sender, instance, created, **kwargs):
    try:
        from employees.models import Notification
        interviewer = instance.interviewer
        application = instance.application
        candidate = application.candidate
        job = application.job

        if interviewer and interviewer.user:
            if created:
                Notification.objects.create(
                    user=interviewer.user,
                    title="New Interview Assigned",
                    message=f"You have been assigned to conduct an interview for candidate {candidate.first_name} {candidate.last_name} ({job.title}) on {instance.interview_date.strftime('%Y-%m-%d %H:%M')}.",
                    link=f"/recruitment?interview={instance.id}"
                )
            elif instance.status == 'CANCELLED':
                Notification.objects.create(
                    user=interviewer.user,
                    title="Interview Cancelled",
                    message=f"The scheduled interview for candidate {candidate.first_name} {candidate.last_name} ({job.title}) has been cancelled.",
                    link=f"/recruitment?interview={instance.id}"
                )
    except Exception as e:
        print(f"Error in recruitment interview signal: {e}")
