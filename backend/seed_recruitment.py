import os
import sys
from datetime import datetime

# Avoid console encoding issues on Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# Setup django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from django.db import transaction
from employees.models import JobPosting, Candidate, Application

JOBS_DATA = [
    {
        "title": "Senior Python & Django Developer",
        "description": "We are seeking a senior back-end developer to construct highly scalable REST APIs, secure user databases, and coordinate real-time data flows inside our HRMS Core systems.",
        "requirements": "5+ years backend Django experience, REST framework familiarity, relational database designs.",
        "location": "Bangalore / Remote",
        "salary_range": "₹15,00,000 - ₹22,00,000",
        "employment_type": "FULL_TIME",
        "status": "OPEN"
    },
    {
        "title": "React Frontend Architect",
        "description": "Lead the UI designs of our enterprise dashboards. Set up reusable components, custom hooks, and Tailwind CSS layouts for optimal responsive rendering.",
        "requirements": "Solid React/TypeScript skills, styled components or Tailwind, state management stores (Redux, Zustand).",
        "location": "Hyderabad",
        "salary_range": "₹18,00,000 - ₹25,00,000",
        "employment_type": "FULL_TIME",
        "status": "OPEN"
    },
    {
        "title": "Talent Acquisition Specialist",
        "description": "Manage recruitment workflows, organize applicant interviews, coordinate screen calls, and oversee staff onboarding.",
        "requirements": "Excellent human relations, resume filtering, ATS tool management.",
        "location": "Mumbai",
        "salary_range": "₹8,00,000 - ₹12,00,000",
        "employment_type": "FULL_TIME",
        "status": "OPEN"
    },
    {
        "title": "DevOps Infrastructure Engineer Intern",
        "description": "Support our cloud pipelines, write Terraform scripts, configure Dockerized server deployments, and monitor logs.",
        "requirements": "Basic Linux command skills, AWS or Azure knowledge, git version controls.",
        "location": "Remote",
        "salary_range": "₹25,000/month",
        "employment_type": "INTERN",
        "status": "OPEN"
    }
]

CANDIDATES_DATA = [
    {
        "first_name": "Arjun",
        "last_name": "Mehta",
        "email": "arjun.m@example.com",
        "phone_number": "+91 98765 43210",
        "linkedin_profile": "https://linkedin.com/in/arjun-mehta-dev",
        "job_title_applied": "Senior Python & Django Developer",
        "status": "INTERVIEW",
        "notes": "Excellent performance in first-round technical quiz. Second-round system design scheduled for Friday."
    },
    {
        "first_name": "Siddharth",
        "last_name": "Roy",
        "email": "siddharth.r@example.com",
        "phone_number": "+91 88765 12345",
        "linkedin_profile": "https://linkedin.com/in/sid-roy-react",
        "job_title_applied": "React Frontend Architect",
        "status": "OFFER",
        "notes": "Offer letter dispatched. Waiting for signature. Candidate is highly interested."
    },
    {
        "first_name": "Nisha",
        "last_name": "Kamat",
        "email": "nisha.k@example.com",
        "phone_number": "+91 77654 32109",
        "linkedin_profile": "https://linkedin.com/in/nisha-k-hr",
        "job_title_applied": "Talent Acquisition Specialist",
        "status": "SCREENING",
        "notes": "Brief screening call done. Communications skills are stellar. Resume matches requirements."
    },
    {
        "first_name": "Rohan",
        "last_name": "Gupta",
        "email": "rohan.g@example.com",
        "phone_number": "+91 99887 76655",
        "linkedin_profile": "https://linkedin.com/in/rohan-g-devops",
        "job_title_applied": "DevOps Infrastructure Engineer Intern",
        "status": "APPLIED",
        "notes": "Intern applicant from IIIT Bangalore. Strong github profile with kubernetes pet projects."
    },
    {
        "first_name": "Meera",
        "last_name": "Nair",
        "email": "meera.n@example.com",
        "phone_number": "+91 91234 56789",
        "linkedin_profile": "https://linkedin.com/in/meera-nair-py",
        "job_title_applied": "Senior Python & Django Developer",
        "status": "REJECTED",
        "notes": "Lacked production SQL experience. Communication was average."
    },
    {
        "first_name": "Ananya",
        "last_name": "Sen",
        "email": "ananya.s@example.com",
        "phone_number": "+91 82345 67890",
        "linkedin_profile": "https://linkedin.com/in/ananya-sen-ui",
        "job_title_applied": "React Frontend Architect",
        "status": "HIRED",
        "notes": "Completed onboarding checklist. Setting up employee profile next week."
    }
]

def seed_recruitment():
    print("--------------------------------------------------")
    print("STARTING HRMS RECRUITMENT SEEDING PROCESS...")
    print("--------------------------------------------------")

    with transaction.atomic():
        Application.objects.all().delete()
        Candidate.objects.all().delete()
        JobPosting.objects.all().delete()
        print("Cleared existing recruitment data (Applications, Candidates, Jobs).")

        # 1. Create Job Postings
        job_map = {}
        for jd in JOBS_DATA:
            job = JobPosting.objects.create(
                title=jd["title"],
                description=jd["description"],
                requirements=jd["requirements"],
                location=jd["location"],
                salary_range=jd["salary_range"],
                employment_type=jd["employment_type"],
                status=jd["status"]
            )
            job_map[jd["title"]] = job
            print(f"[Job] Seeded vacancy: {job.title} ({job.location})")

        # 2. Create Candidates and Applications
        for cd in CANDIDATES_DATA:
            candidate = Candidate.objects.create(
                first_name=cd["first_name"],
                last_name=cd["last_name"],
                email=cd["email"],
                phone_number=cd["phone_number"],
                linkedin_profile=cd["linkedin_profile"]
            )
            print(f"[Candidate] Seeded candidate profile: {candidate}")

            # Assign Application
            job_title = cd["job_title_applied"]
            job_obj = job_map[job_title]

            application = Application.objects.create(
                job=job_obj,
                candidate=candidate,
                status=cd["status"],
                notes=cd["notes"]
            )
            print(f"[Application] Created link: {candidate} -> {job_obj.title} [{application.status}]")

    print("--------------------------------------------------")
    print("RECRUITMENT SEEDING COMPLETED SUCCESSFULLY!")
    print("--------------------------------------------------")

if __name__ == "__main__":
    seed_recruitment()
