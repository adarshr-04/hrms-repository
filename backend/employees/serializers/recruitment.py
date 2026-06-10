from rest_framework import serializers
from employees.models import JobPosting, Candidate, Application, Interview, OfferLetter


class JobPostingSerializer(serializers.ModelSerializer):
    application_count = serializers.IntegerField(source='applications.count', read_only=True)

    class Meta:
        model = JobPosting
        fields = '__all__'


class CandidateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidate
        fields = '__all__'


class InterviewSerializer(serializers.ModelSerializer):
    interviewer_name = serializers.ReadOnlyField(source='interviewer.__str__')
    candidate_name = serializers.ReadOnlyField(source='application.candidate.__str__')
    candidate_email = serializers.ReadOnlyField(source='application.candidate.email')
    candidate_phone = serializers.ReadOnlyField(source='application.candidate.phone_number')
    candidate_resume = serializers.SerializerMethodField()
    job_title = serializers.ReadOnlyField(source='application.job.title')

    class Meta:
        model = Interview
        fields = '__all__'

    def get_candidate_resume(self, obj):
        request = self.context.get('request')
        resume = obj.application.candidate.resume if obj.application.candidate else None
        if resume:
            return request.build_absolute_uri(resume.url) if request else resume.url
        return None


class OfferLetterSerializer(serializers.ModelSerializer):
    candidate_name = serializers.ReadOnlyField(source='application.candidate.__str__')
    job_title = serializers.ReadOnlyField(source='application.job.title')

    class Meta:
        model = OfferLetter
        fields = '__all__'


class ApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.ReadOnlyField(source='job.title')
    candidate_name = serializers.ReadOnlyField(source='candidate.__str__')
    interviews = InterviewSerializer(many=True, read_only=True)
    offer_letter = OfferLetterSerializer(read_only=True)

    class Meta:
        model = Application
        fields = '__all__'
