"""
Management command: create_admin_profiles

Creates Employee profiles linked to Django superuser / staff accounts
that currently have no linked employee_profile.

Usage:
    python manage.py create_admin_profiles
    python manage.py create_admin_profiles --username rounak
    python manage.py create_admin_profiles --all-superusers
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction

from employees.models import Employee, Role, UserRole


class Command(BaseCommand):
    help = 'Create Employee profiles for superuser / admin accounts that have no linked profile.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Only create a profile for this specific username.',
        )
        parser.add_argument(
            '--all-superusers',
            action='store_true',
            default=True,
            help='Create profiles for ALL superusers without a profile (default).',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        username = options.get('username')

        if username:
            qs = User.objects.filter(username=username)
            if not qs.exists():
                self.stderr.write(self.style.ERROR(f"User '{username}' not found."))
                return
        else:
            # All superusers or staff without an employee profile
            qs = User.objects.filter(is_superuser=True)

        created_count = 0
        skipped_count = 0

        for user in qs:
            if hasattr(user, 'employee_profile') and user.employee_profile is not None:
                self.stdout.write(
                    self.style.WARNING(
                        f"  [SKIP] '{user.username}' already has an employee profile (ID={user.employee_profile.id})."
                    )
                )
                skipped_count += 1
                continue

            # Use existing email or generate a placeholder
            email = user.email or f"{user.username}@admin.local"

            # Check if an Employee with this email already exists (but not linked)
            existing = Employee.objects.filter(email=email).first()
            if existing and existing.user is None:
                existing.user = user
                existing.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [LINKED] Linked existing Employee (ID={existing.id}) to '{user.username}'."
                    )
                )
            else:
                first_name = user.first_name or user.username.capitalize()
                last_name = user.last_name or 'Admin'
                emp = Employee.objects.create(
                    user=user,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    status='ACTIVE',
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [CREATED] Employee profile '{emp.employee_id}' created for '{user.username}'."
                    )
                )

            # Assign ADMIN role if not already assigned
            try:
                emp_profile = user.employee_profile
                admin_role, _ = Role.objects.get_or_create(role_name='ADMIN')
                user_role, role_created = UserRole.objects.get_or_create(
                    employee=emp_profile, role=admin_role
                )
                if role_created:
                    self.stdout.write(f"    -> ADMIN role assigned.")
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f"    -> Could not assign role: {e}")
                )

            created_count += 1

        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created/linked: {created_count}  |  Skipped (already had profile): {skipped_count}"
            )
        )
