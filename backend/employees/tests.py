from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from employees.models import Role, UserRole
from .models import Document, Employee, EmployeeInviteToken
from .serializers import EmployeeSerializer


class EmployeeSerializerTests(APITestCase):
    def test_created_employee_user_has_no_default_password(self):
        serializer = EmployeeSerializer(data={
            'first_name': 'Asha',
            'last_name': 'Mehta',
            'email': 'asha@example.com',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        employee = serializer.save()

        # Under the invite flow, the user profile is NOT created until activation
        self.assertIsNone(employee.user)
        
        # Verify an invite token was generated
        invite = EmployeeInviteToken.objects.filter(employee=employee).first()
        self.assertIsNotNone(invite)
        self.assertFalse(invite.is_used)


class DocumentAccessTests(APITestCase):
    def setUp(self):
        self.employee_user = User.objects.create_user(
            username='employee',
            email='employee@example.com',
            password='password123',
        )
        self.other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='password123',
        )
        self.hr_user = User.objects.create_user(
            username='hr',
            email='hr@example.com',
            password='password123',
        )

        self.employee = Employee.objects.create(
            user=self.employee_user,
            first_name='Employee',
            email='employee@example.com',
        )
        self.other_employee = Employee.objects.create(
            user=self.other_user,
            first_name='Other',
            email='other@example.com',
        )
        self.hr_employee = Employee.objects.create(
            user=self.hr_user,
            first_name='HR',
            email='hr@example.com',
        )

        hr_role = Role.objects.create(role_name='HR')
        UserRole.objects.create(employee=self.hr_employee, role=hr_role)

        self.own_document = Document.objects.create(
            employee=self.employee,
            document_type='ID',
            file=SimpleUploadedFile('id.txt', b'id'),
        )
        self.other_document = Document.objects.create(
            employee=self.other_employee,
            document_type='Contract',
            file=SimpleUploadedFile('contract.txt', b'contract'),
        )

    def test_employee_only_lists_own_documents(self):
        self.client.force_authenticate(self.employee_user)

        response = self.client.get('/api/employees/documents/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.own_document.id)

    def test_employee_cannot_retrieve_another_employee_document(self):
        self.client.force_authenticate(self.employee_user)

        response = self.client.get(f'/api/employees/documents/{self.other_document.id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_hr_can_list_all_documents(self):
        self.client.force_authenticate(self.hr_user)

        response = self.client.get('/api/employees/documents/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual({item['id'] for item in response.data}, {
            self.own_document.id,
            self.other_document.id,
        })
