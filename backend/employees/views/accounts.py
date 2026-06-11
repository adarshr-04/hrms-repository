import random
from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import views, response, permissions, viewsets, decorators, status
from rest_framework.exceptions import ValidationError

from employees.models import Notification, PasswordResetCode, Announcement, EmployeeInviteToken, Employee, Role, UserRole
from employees.serializers import UserSerializer, NotificationSerializer, AnnouncementSerializer
from employees.utils import get_user_role


class ProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Dynamically auto-create/link Employee profile and ADMIN role for superuser/staff on profile fetch
        if (user.is_superuser or user.is_staff) and (not hasattr(user, 'employee_profile') or user.employee_profile is None):
            try:
                email = user.email or f"{user.username}@admin.local"
                
                # Check if an Employee with this email already exists but is not linked
                emp = Employee.objects.filter(email=email).first()
                if emp and emp.user is None:
                    emp.user = user
                    emp.save()
                elif not emp:
                    first_name = user.first_name or user.username.capitalize()
                    last_name = user.last_name or 'Admin'
                    emp = Employee.objects.create(
                        user=user,
                        first_name=first_name,
                        last_name=last_name,
                        email=email,
                        status='ACTIVE',
                    )
                else:
                    first_name = user.first_name or user.username.capitalize()
                    last_name = user.last_name or 'Admin'
                    unique_email = f"{user.username}_admin@admin.local"
                    emp = Employee.objects.create(
                        user=user,
                        first_name=first_name,
                        last_name=last_name,
                        email=unique_email,
                        status='ACTIVE',
                    )
                
                # Assign ADMIN role
                try:
                    admin_role, _ = Role.objects.get_or_create(role_name='ADMIN')
                    UserRole.objects.get_or_create(
                        employee=emp, role=admin_role
                    )
                except Exception:
                    pass
            except Exception as e:
                print(f"Error dynamically creating superuser profile: {e}")

        serializer = UserSerializer(request.user)
        data = serializer.data
        try:
            emp = request.user.employee_profile
            data['phone_number'] = emp.phone_number
            data['alternative_email'] = emp.alternative_email
            data['alternative_phone_number'] = emp.alternative_phone_number
            data['current_address'] = emp.current_address
            data['permanent_address'] = emp.permanent_address
            data['avatar'] = emp.avatar.url if emp.avatar else None
        except Exception:
            pass
        return response.Response(data)

    @transaction.atomic
    def patch(self, request):
        user = request.user
        data = request.data

        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            new_email = data['email']
            if new_email != user.email:
                if User.objects.filter(email=new_email).exclude(id=user.id).exists():
                    raise ValidationError({'email': 'This email address is already in use.'})
                user.email = new_email
        user.save()

        try:
            emp = user.employee_profile
            if 'first_name' in data:
                emp.first_name = data['first_name']
            if 'last_name' in data:
                emp.last_name = data['last_name']
            if 'email' in data:
                emp.email = data['email']
            if 'phone_number' in data:
                emp.phone_number = data['phone_number']
            if 'alternative_email' in data:
                emp.alternative_email = data['alternative_email']
            if 'alternative_phone_number' in data:
                emp.alternative_phone_number = data['alternative_phone_number']
            if 'current_address' in data:
                emp.current_address = data['current_address']
            if 'permanent_address' in data:
                emp.permanent_address = data['permanent_address']
            if 'avatar' in request.FILES:
                emp.avatar = request.FILES['avatar']
            elif 'avatar' in data and data['avatar'] is None:
                emp.avatar = None
            emp.save()
        except Exception:
            pass

        return self.get(request)


class ChangePasswordView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            raise ValidationError({'error': 'Both current_password and new_password are required.'})

        if not user.check_password(current_password):
            raise ValidationError({'current_password': 'Old password is incorrect.'})

        user.set_password(new_password)
        user.save()
        return response.Response({'message': 'Password changed successfully.'})


class NotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        raise ValidationError({'error': 'Notifications are read-only for creation.'})

    @decorators.action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return response.Response({'status': 'marked as read'})

    @decorators.action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return response.Response({'status': 'all marked as read'})


class ForgotPasswordView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            raise ValidationError({'email': 'Email field is required.'})

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise ValidationError({'email': 'No registered employee found with this company email.'})

        code = f"{random.randint(100000, 999999)}"
        PasswordResetCode.objects.filter(user=user, is_used=False).update(is_used=True)
        PasswordResetCode.objects.create(user=user, code=code)

        from django.core.mail import send_mail
        
        subject = "HRMS Enterprise - Password Reset Code"
        message = f"You requested a password reset. Your 6-digit verification code is: {code}\n\nIf you did not request this, please ignore this email."
        
        try:
            send_mail(
                subject,
                message,
                getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hrms.com'),
                [email],
                fail_silently=True,
            )
        except Exception:
            pass

        payload = {
            'message': 'Verification code sent successfully.',
            'email': email
        }

        return response.Response(payload)


class ResetPasswordView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        new_password = request.data.get('new_password')

        if not email or not code or not new_password:
            raise ValidationError({'error': 'Email, code, and new_password are required fields.'})

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise ValidationError({'error': 'No registered employee found with this company email.'})

        try:
            reset_record = PasswordResetCode.objects.get(user=user, code=code, is_used=False)
        except PasswordResetCode.DoesNotExist:
            raise ValidationError({'code': 'Invalid or expired verification code.'})

        user.set_password(new_password)
        user.save()

        reset_record.is_used = True
        reset_record.save()

        return response.Response({
            'message': 'Password has been reset successfully. You can now log in.'
        })


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.filter(is_active=True)
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def perform_create(self, serializer):
        role = get_user_role(self.request.user)
        if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            raise ValidationError({'error': 'Only Admin and HR can post announcements.'})
        serializer.save(posted_by=self.request.user)

    def perform_update(self, serializer):
        role = get_user_role(self.request.user)
        if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            raise ValidationError({'error': 'Only Admin and HR can edit announcements.'})
        serializer.save()

    def perform_destroy(self, instance):
        role = get_user_role(self.request.user)
        if role not in ['SUPER_ADMIN', 'ADMIN', 'HR']:
            raise ValidationError({'error': 'Only Admin and HR can delete announcements.'})
        instance.is_active = False
        instance.save()


class VerifyInviteTokenView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token_str = request.query_params.get('token')
        if not token_str:
            raise ValidationError({'error': 'Token is required.'})

        try:
            token_obj = EmployeeInviteToken.objects.get(token=token_str)
        except EmployeeInviteToken.DoesNotExist:
            raise ValidationError({'error': 'Invalid or non-existent token.'})

        if token_obj.is_used:
            raise ValidationError({'error': 'This activation link has already been used.'})

        if token_obj.is_expired():
            raise ValidationError({'error': 'This activation link has expired (valid for 72 hours). Please contact HR.'})

        # Token is valid, return employee info so frontend can display "Welcome, John!"
        return response.Response({
            'email': token_obj.employee.email,
            'first_name': token_obj.employee.first_name,
            'last_name': token_obj.employee.last_name,
            'message': 'Token is valid.'
        })


class ActivateAccountView(views.APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        token_str = request.data.get('token')
        password = request.data.get('password')

        if not token_str or not password:
            raise ValidationError({'error': 'Both token and password are required.'})

        try:
            token_obj = EmployeeInviteToken.objects.get(token=token_str)
        except EmployeeInviteToken.DoesNotExist:
            raise ValidationError({'error': 'Invalid or non-existent token.'})

        if token_obj.is_used:
            raise ValidationError({'error': 'This activation link has already been used.'})

        if token_obj.is_expired():
            raise ValidationError({'error': 'This activation link has expired (valid for 72 hours). Please contact HR.'})

        employee = token_obj.employee

        # 1. Create Django User
        user = User.objects.create_user(
            username=employee.email.split('@')[0],
            email=employee.email,
            password=password
        )

        # 2. Link User to Employee
        employee.user = user
        employee.save()

        # 3. Assign Default Role (EMPLOYEE)
        role, _ = Role.objects.get_or_create(role_name='EMPLOYEE')
        UserRole.objects.get_or_create(employee=employee, role=role)

        # 4. Mark token as used
        token_obj.is_used = True
        token_obj.save()

        return response.Response({
            'message': 'Account activated successfully. You can now log in.'
        }, status=status.HTTP_201_CREATED)

