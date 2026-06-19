from django.db import migrations

def populate_designations(apps, schema_editor):
    Designation = apps.get_model('employees', 'Designation')
    titles = [
        "Junior Software Engineer",
        "Software Engineer",
        "Senior Software Engineer",
        "Technical Lead",
        "Full Stack Developer",
        "System Administrator",
        "IT Support Specialist",
        "Cybersecurity Analyst",
        "Security Architect",
        "Presales Engineer",
        "Solution Architect",
        "Project Manager",
        "Quality Assurance Engineer"
    ]
    for title in titles:
        Designation.objects.get_or_create(title=title)

def reverse_populate(apps, schema_editor):
    Designation = apps.get_model('employees', 'Designation')
    Designation.objects.all().delete()

class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0006_designation'),
    ]

    operations = [
        migrations.RunPython(populate_designations, reverse_populate),
    ]
