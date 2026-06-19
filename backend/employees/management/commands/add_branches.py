from django.core.management.base import BaseCommand
from employees.models import Branch


class Command(BaseCommand):
    help = 'Add branches to the database'

    def handle(self, *args, **kwargs):
        branches_data = [
            {'name': 'Delhi', 'city': 'Delhi', 'address': 'Connaught Place, New Delhi'},
            {'name': 'Mumbai', 'city': 'Mumbai', 'address': 'Andheri East, Mumbai'},
            {'name': 'Bangalore', 'city': 'Bangalore', 'address': 'Koramangala, Bangalore'},
            {'name': 'Hyderabad', 'city': 'Hyderabad', 'address': 'HITEC City, Hyderabad'},
            {'name': 'Pune', 'city': 'Pune', 'address': 'Hinjewadi, Pune'},
        ]

        for branch_info in branches_data:
            branch, created = Branch.objects.get_or_create(
                name=branch_info['name'],
                defaults={
                    'city': branch_info['city'],
                    'address': branch_info['address']
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created: {branch.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Already exists: {branch.name}'))

        self.stdout.write(self.style.SUCCESS('All branches processed!'))
