import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  Users, 
  UserCheck, 
  Plus, 
  ExternalLink, 
  MapPin, 
  Mail, 
  Phone, 
  Loader2,
  Calendar,
  Star,
  Upload,
  Trash,
  Download,
  User,
  Paperclip,
  X,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { recruitmentService, JobPosting, Candidate, Application, Interview } from '@/services/recruitmentService';
import { employeeService } from '@/services/employeeService';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Employee } from '@/types';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import OfferLetterModal from '@/components/OfferLetterModal';


const STAGES = [
  { id: 'APPLIED', name: 'Applied', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { id: 'SCREENING', name: 'Screening', color: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'INTERVIEW', name: 'Interview', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  { id: 'OFFER', name: 'Offer', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { id: 'HIRED', name: 'Hired', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { id: 'REJECTED', name: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-100' },
];

export default function RecruitmentPage() {
  const { user } = useAuth();
  const userRole = user?.role || 'EMPLOYEE';
  const isHRorAdmin = ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(userRole);

  const [activeTab, setActiveTab] = useState<'pipeline' | 'jobs'>('pipeline');
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Interviewer (Employee role) specific state
  const [assignedInterviews, setAssignedInterviews] = useState<Interview[]>([]);

  // URL param for deep-linking to a specific interview from notifications
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedInterview, setHighlightedInterview] = useState<Interview | null>(null);

  // Modals / details state
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    salary_range: '',
    employment_type: 'FULL_TIME' as any,
    status: 'OPEN' as any
  });

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [selectedCand, setSelectedCand] = useState<Candidate | null>(null);
  const [appInterviews, setAppInterviews] = useState<Interview[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);

  // Form states for Interview and Feedback
  const [newInterview, setNewInterview] = useState({
    interviewer: '',
    interview_date: '',
    location: '',
  });

  const [feedbackForm, setFeedbackForm] = useState({
    feedback: '',
    rating: 5,
    status: 'COMPLETED' as any
  });

  const [updatingAppId, setUpdatingAppId] = useState<number | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Offer Letter specific state
  const [offerText, setOfferText] = useState('');
  const [salaryOffered, setSalaryOffered] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [savingOffer, setSavingOffer] = useState(false);
  const [offerStatus, setOfferStatus] = useState<'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'>('DRAFT');
  const [offerId, setOfferId] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (selectedApp) {
      if (selectedApp.offer_letter) {
        setOfferId(selectedApp.offer_letter.id);
        setOfferText(selectedApp.offer_letter.offer_text);
        setSalaryOffered(selectedApp.offer_letter.salary_offered || '');
        setJoiningDate(selectedApp.offer_letter.joining_date || '');
        setOfferStatus(selectedApp.offer_letter.status);
      } else {
        setOfferId(null);
        setOfferText('');
        setSalaryOffered('');
        setJoiningDate('');
        setOfferStatus('DRAFT');
      }
    } else {
      setOfferId(null);
      setOfferText('');
      setSalaryOffered('');
      setJoiningDate('');
      setOfferStatus('DRAFT');
    }
  }, [selectedApp]);

  const handleSaveOffer = async (
    statusOverride?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED',
    customText?: string,
    customSalary?: string
  ) => {
    if (!selectedApp) return;
    setSavingOffer(true);
    
    const textToSave = customText !== undefined ? customText : offerText;
    const salaryToSave = customSalary !== undefined ? customSalary : salaryOffered;
    const targetStatus = statusOverride || offerStatus;

    const payload = {
      application: selectedApp.id,
      offer_text: textToSave,
      salary_offered: salaryToSave,
      joining_date: joiningDate || null,
      status: targetStatus
    };

    try {
      let savedOffer;
      if (offerId) {
        savedOffer = await recruitmentService.updateOffer(offerId, payload);
        toast.success("Offer letter updated successfully!");
      } else {
        savedOffer = await recruitmentService.createOffer(payload);
        setOfferId(savedOffer.id);
        toast.success("Offer letter created successfully!");
      }
      setOfferStatus(savedOffer.status);
      
      const updatedApp = { ...selectedApp, offer_letter: savedOffer };
      setSelectedApp(updatedApp);
      setApplications(prev => prev.map(a => a.id === selectedApp.id ? updatedApp : a));

      setOfferText(textToSave);
      setSalaryOffered(salaryToSave);
      setShowOfferModal(false);
    } catch (error) {
      console.error("Failed to save offer letter", error);
      toast.error("Failed to save offer letter");
    } finally {
      setSavingOffer(false);
    }
  };

  const handleDownloadPDF = async (text: string) => {
    if (!selectedCand) return;
    setOfferText(text);

    setTimeout(async () => {
      const element = printRef.current;
      if (!element) {
        toast.error("Could not find the print container");
        return;
      }

      setGeneratingPdf(true);
      const loadingToast = toast.loading("Generating offer letter PDF...");
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        const fileName = `Offer_Letter_${selectedCand.first_name}_${selectedCand.last_name}.pdf`;
        pdf.save(fileName);

        toast.dismiss(loadingToast);
        toast.success("Offer letter downloaded successfully!");
      } catch (error) {
        console.error("PDF generation failed", error);
        toast.dismiss(loadingToast);
        toast.error("Could not generate PDF.");
      } finally {
        setGeneratingPdf(false);
      }
    }, 150);
  };

  const renderOfferTextHtml = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.trim() === '') {
        return <div key={i} className="h-4" />;
      }
      return <p key={i} className="text-slate-800 leading-relaxed mb-2 text-sm">{line}</p>;
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (isHRorAdmin) {
        // HR/Admins fetch full pipeline & config datasets
        const fetchedJobs = await recruitmentService.getJobs();
        const fetchedCandidates = await recruitmentService.getCandidates();
        const fetchedApps = await recruitmentService.getApplications();
        setJobs(fetchedJobs);
        setCandidates(fetchedCandidates);
        setApplications(fetchedApps);
        
        // Load employees list for interviewer selection dropdown
        const employeeData = await employeeService.getAll();
        const employeeList = Array.isArray(employeeData) ? employeeData : (employeeData.results || []);
        setEmployees(employeeList);
      } else {
        // Employees/Interviewers only fetch their assigned interviews
        const interviews = await recruitmentService.getInterviews();
        setAssignedInterviews(interviews);
      }
    } catch (error) {
      console.error("Failed to load recruitment data", error);
      toast.error("Failed to sync recruitment dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userRole]);

  // Auto-open interview detail modal when ?interview=ID is in the URL
  useEffect(() => {
    const interviewIdParam = searchParams.get('interview');
    if (!interviewIdParam || loading) return;

    const interviewId = parseInt(interviewIdParam);
    if (isNaN(interviewId)) return;

    const autoOpen = async () => {
      try {
        if (isHRorAdmin) {
          // HR/Admins can query the interview list
          const interviews = await recruitmentService.getInterviews();
          const found = interviews.find(i => i.id === interviewId);
          if (found) {
            setHighlightedInterview(found);
            // Clean the URL param after opening
            setSearchParams({}, { replace: true });
          }
        } else {
          // For employees/interviewers, find from their assigned interviews
          const found = assignedInterviews.find(i => i.id === interviewId);
          if (found) {
            setHighlightedInterview(found);
            // Clean the URL param after opening
            setSearchParams({}, { replace: true });
          }
        }
      } catch (error) {
        console.error("Failed to load interview for URL param:", error);
      }
    };

    autoOpen();
  }, [searchParams, assignedInterviews, loading, isHRorAdmin]);

  const loadInterviews = async (appId: number) => {
    try {
      const allInterviews = await recruitmentService.getInterviews({ application: appId });
      setAppInterviews(allInterviews);
    } catch (error) {
      console.error("Failed to load interviews", error);
    }
  };

  const handleCardClick = async (app: Application, cand: Candidate | undefined) => {
    setSelectedApp(app);
    setSelectedCand(cand || null);
    if (app.id) {
      loadInterviews(app.id);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedApp(null);
    setSelectedCand(null);
    setAppInterviews([]);
  };

  const handleStageChange = async (appId: number, newStatus: string) => {
    setUpdatingAppId(appId);
    try {
      await recruitmentService.updateApplicationStatus(appId, newStatus, "Status updated via HR Command Board");
      toast.success(`Applicant moved to ${newStatus}`);
      await loadData();
      
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Failed to update candidate pipeline stage");
    } finally {
      setUpdatingAppId(null);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.location) {
      toast.error("Please fill in all mandatory job details");
      return;
    }
    try {
      await recruitmentService.createJob(newJob);
      toast.success("New vacancy published successfully");
      setShowAddJobModal(false);
      setNewJob({
        title: '',
        description: '',
        requirements: '',
        location: '',
        salary_range: '',
        employment_type: 'FULL_TIME',
        status: 'OPEN'
      });
      loadData();
    } catch (error) {
      console.error("Failed to create job", error);
      toast.error("Failed to save job opening");
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    if (!newInterview.interview_date || !newInterview.location) {
      toast.error("Please fill in the date and location");
      return;
    }

    try {
      const payload: Partial<Interview> = {
        application: selectedApp.id,
        interview_date: newInterview.interview_date,
        location: newInterview.location,
        status: 'SCHEDULED'
      };
      if (newInterview.interviewer) {
        payload.interviewer = parseInt(newInterview.interviewer);
      }
      await recruitmentService.createInterview(payload);
      toast.success("Interview scheduled successfully!");
      setShowScheduleModal(false);
      setNewInterview({ interviewer: '', interview_date: '', location: '' });
      loadInterviews(selectedApp.id);
    } catch (error) {
      console.error("Failed to schedule interview", error);
      toast.error("Failed to schedule interview");
    }
  };

  const handleRecordFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterview) return;
    try {
      await recruitmentService.updateInterview(selectedInterview.id, {
        feedback: feedbackForm.feedback,
        rating: feedbackForm.rating,
        status: feedbackForm.status
      });
      toast.success("Feedback recorded successfully!");
      setShowFeedbackModal(false);
      setSelectedInterview(null);
      setFeedbackForm({ feedback: '', rating: 5, status: 'COMPLETED' });
      
      // Reload both possible datasets
      loadData();
      if (selectedApp) {
        loadInterviews(selectedApp.id);
      }
    } catch (error) {
      console.error("Failed to update interview", error);
      toast.error("Failed to save interview feedback");
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCand || !selectedApp) return;

    setUploadingResume(true);
    const formData = new FormData();
    formData.append('resume', file);
    try {
      const updatedCand = await recruitmentService.updateCandidate(selectedCand.id, formData);
      setSelectedCand(updatedCand);
      toast.success("Resume uploaded successfully!");
      loadData();
    } catch (error) {
      console.error("Failed to upload resume", error);
      toast.error("Resume file upload failed");
    } finally {
      setUploadingResume(false);
    }
  };

  const getCandidateForApp = (candidateId: number) => {
    return candidates.find(c => c.id === candidateId);
  };

  // --- RENDERING EMPLOYEE/INTERVIEWER PANEL ---
  if (!isHRorAdmin) {
    const scheduledInterviews = assignedInterviews.filter(i => i.status === 'SCHEDULED');
    const completedInterviews = assignedInterviews.filter(i => i.status === 'COMPLETED');
    const cancelledInterviews = assignedInterviews.filter(i => i.status === 'CANCELLED');

    return (
      <div className="space-y-8 pb-10 min-h-screen">

        {/* Interview Detail Modal (opened from notification click) */}
        {highlightedInterview && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 w-full max-w-lg shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white relative">
                <button
                  onClick={() => setHighlightedInterview(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-block mb-3",
                  highlightedInterview.status === 'SCHEDULED' ? "bg-white/20 text-white border-white/30" :
                  highlightedInterview.status === 'COMPLETED' ? "bg-emerald-400/20 text-emerald-100 border-emerald-300/30" :
                  "bg-rose-400/20 text-rose-100 border-rose-300/30"
                )}>
                  {highlightedInterview.status}
                </span>
                <h2 className="text-xl font-black tracking-tight">
                  {highlightedInterview.candidate_name || 'Candidate Interview'}
                </h2>
                <p className="text-sm font-semibold text-white/80 mt-1">
                  {highlightedInterview.job_title || 'Job Application'}
                </p>
              </div>

              {/* Modal Body */}
              <div className="px-8 py-6 space-y-5">
                {/* Schedule Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Schedule</span>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      <span>{new Date(highlightedInterview.interview_date).toLocaleDateString()}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 ml-5.5">
                      {new Date(highlightedInterview.interview_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Location</span>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      <span className="truncate">{highlightedInterview.location}</span>
                    </div>
                  </div>
                </div>

                {/* Candidate Contact */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Candidate Contact</span>
                  {highlightedInterview.candidate_email && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${highlightedInterview.candidate_email}`} className="hover:text-indigo-600 transition-colors">
                        {highlightedInterview.candidate_email}
                      </a>
                    </div>
                  )}
                  {highlightedInterview.candidate_phone && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{highlightedInterview.candidate_phone}</span>
                    </div>
                  )}
                </div>

                {/* Resume Link */}
                {highlightedInterview.candidate_resume && (
                  <a
                    href={highlightedInterview.candidate_resume}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-all group"
                  >
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-indigo-100">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-black text-indigo-700 block">View Candidate Resume</span>
                      <span className="text-[10px] font-semibold text-indigo-500">Download or preview document</span>
                    </div>
                    <Download className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                  </a>
                )}

                {/* Completed Feedback */}
                {highlightedInterview.status === 'COMPLETED' && highlightedInterview.feedback && (
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Your Assessment</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("w-3.5 h-3.5", i < (highlightedInterview.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 font-medium italic leading-relaxed">
                      "{highlightedInterview.feedback}"
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setHighlightedInterview(null)}
                  className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold transition-all text-slate-600 text-sm"
                >
                  Close
                </button>
                {highlightedInterview.status === 'SCHEDULED' && (
                  <button
                    onClick={() => {
                      setSelectedInterview(highlightedInterview);
                      setFeedbackForm({ feedback: '', rating: 5, status: 'COMPLETED' });
                      setHighlightedInterview(null);
                      setShowFeedbackModal(true);
                    }}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-200 text-sm"
                  >
                    Record Feedback & Outcome
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Top Header Panel */}
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Your Assigned Interviews</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Review candidate details, view uploaded resumes, and submit interview feedback forms.</p>
        </div>

        {/* Numerical Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            icon={<Clock className="w-6 h-6 text-indigo-600" />} 
            label="Pending Reviews" 
            value={scheduledInterviews.length} 
            subtext="Awaiting assessment" 
            color="indigo" 
          />
          <StatCard 
            icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />} 
            label="Completed Rounds" 
            value={completedInterviews.length} 
            subtext="Assessments submitted" 
            color="emerald" 
          />
          <StatCard 
            icon={<AlertCircle className="w-6 h-6 text-slate-500" />} 
            label="Cancelled Rounds" 
            value={cancelledInterviews.length} 
            subtext="No action needed" 
            color="amber" 
          />
        </div>

        {/* Interviews List */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <span>Conduct Interview Schedule</span>
          </h2>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="font-bold text-xs uppercase tracking-widest text-slate-400">Syncing Schedule...</p>
            </div>
          ) : assignedInterviews.length === 0 ? (
            <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Calendar className="w-12 h-12 text-slate-350 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">No interviews are currently assigned to you.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assignedInterviews.map((interview) => (
                <div key={interview.id} className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                          interview.status === 'SCHEDULED' ? "bg-purple-50 text-purple-700 border-purple-100" :
                          interview.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          "bg-rose-50 text-rose-700 border-rose-100"
                        )}>
                          {interview.status}
                        </span>
                        <h3 className="text-base font-black text-slate-900 tracking-tight mt-3">
                          {interview.candidate_name || "Applicant Profile"}
                        </h3>
                        <p className="text-xs font-semibold text-indigo-600">{interview.job_title || "Job Application"}</p>
                      </div>

                      {interview.candidate_resume && (
                        <a 
                          href={interview.candidate_resume} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-1.5 rounded-lg font-black transition-all border border-slate-200"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Resume</span>
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-150">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest">Schedule Time</span>
                        <span className="text-slate-800">{new Date(interview.interview_date).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest">Location / Room</span>
                        <span className="text-slate-800 truncate block">{interview.location}</span>
                      </div>
                      {interview.candidate_email && (
                        <div className="col-span-full">
                          <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest">Email</span>
                          <a href={`mailto:${interview.candidate_email}`} className="text-indigo-600 hover:underline">{interview.candidate_email}</a>
                        </div>
                      )}
                      {interview.candidate_phone && (
                        <div>
                          <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest">Phone</span>
                          <span className="text-slate-800">{interview.candidate_phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Interview Feedback & Rating */}
                    {interview.status === 'COMPLETED' && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2 mt-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span>Your Assessment Score</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={cn("w-3 h-3", i < (interview.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-350")} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 font-semibold italic">
                          "{interview.feedback || "No written comments recorded."}"
                        </p>
                      </div>
                    )}
                  </div>

                  {interview.status === 'SCHEDULED' && (
                    <div className="flex justify-end gap-2 pt-6 mt-4 border-t border-slate-100">
                      <button 
                        onClick={() => {
                          setSelectedInterview(interview);
                          setFeedbackForm({
                            feedback: '',
                            rating: 5,
                            status: 'COMPLETED'
                          });
                          setShowFeedbackModal(true);
                        }}
                        className="w-full text-xs font-black py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md shadow-indigo-150 text-center"
                      >
                        Record Feedback & Outcome
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Record Feedback / Result Modal Dialog */}
        {showFeedbackModal && selectedInterview && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 w-full max-w-md shadow-2xl p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Record Interview Outcome</h2>
                <button 
                  onClick={() => setShowFeedbackModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRecordFeedback} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Round Status</label>
                  <select 
                    value={feedbackForm.status}
                    onChange={(e) => setFeedbackForm({...feedbackForm, status: e.target.value as any})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold cursor-pointer text-slate-700"
                  >
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Feedback Rating (1-5 Stars)</label>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFeedbackForm({...feedbackForm, rating: i + 1})}
                        className="p-1 hover:scale-125 transition-transform"
                      >
                        <Star className={cn("w-6 h-6", i < feedbackForm.rating ? "fill-amber-400 text-amber-400" : "text-slate-350")} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Written Feedback & Comments</label>
                  <textarea 
                    rows={4}
                    required
                    placeholder="Record summary of candidate performance, technical strengths, and weaknesses..."
                    value={feedbackForm.feedback}
                    onChange={(e) => setFeedbackForm({...feedbackForm, feedback: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                  />
                </div>

                <div className="flex gap-4 pt-4 justify-end border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="px-6 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold transition-all text-slate-600 text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-150 text-sm"
                  >
                    Submit outcome
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDERING FULL HR/ADMIN RECRUITMENT COMMAND CENTER ---
  return (
    <div className="space-y-8 pb-10 min-h-screen relative">
      {/* Interview Detail Modal (opened from notification click) */}
      {highlightedInterview && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white relative">
              <button
                onClick={() => setHighlightedInterview(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <span className={cn(
                "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-block mb-3",
                highlightedInterview.status === 'SCHEDULED' ? "bg-white/20 text-white border-white/30" :
                highlightedInterview.status === 'COMPLETED' ? "bg-emerald-400/20 text-emerald-100 border-emerald-300/30" :
                "bg-rose-400/20 text-rose-100 border-rose-300/30"
              )}>
                {highlightedInterview.status}
              </span>
              <h2 className="text-xl font-black tracking-tight">
                {highlightedInterview.candidate_name || 'Candidate Interview'}
              </h2>
              <p className="text-sm font-semibold text-white/80 mt-1">
                {highlightedInterview.job_title || 'Job Application'}
              </p>
            </div>

            {/* Modal Body */}
            <div className="px-8 py-6 space-y-5">
              {/* Schedule Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Schedule</span>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>{new Date(highlightedInterview.interview_date).toLocaleDateString()}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 ml-5.5">
                    {new Date(highlightedInterview.interview_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Location</span>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    <span className="truncate">{highlightedInterview.location}</span>
                  </div>
                </div>
              </div>

              {/* Candidate Contact */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Candidate Contact</span>
                {highlightedInterview.candidate_email && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${highlightedInterview.candidate_email}`} className="hover:text-indigo-600 transition-colors">
                      {highlightedInterview.candidate_email}
                    </a>
                  </div>
                )}
                {highlightedInterview.candidate_phone && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{highlightedInterview.candidate_phone}</span>
                  </div>
                )}
              </div>

              {/* Resume Link */}
              {highlightedInterview.candidate_resume && (
                <a
                  href={highlightedInterview.candidate_resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-all group"
                >
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-indigo-100">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-black text-indigo-700 block">View Candidate Resume</span>
                    <span className="text-[10px] font-semibold text-indigo-500">Download or preview document</span>
                  </div>
                  <Download className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                </a>
              )}

              {/* Completed Feedback */}
              {highlightedInterview.status === 'COMPLETED' && highlightedInterview.feedback && (
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Your Assessment</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("w-3.5 h-3.5", i < (highlightedInterview.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 font-medium italic leading-relaxed">
                    "{highlightedInterview.feedback}"
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setHighlightedInterview(null)}
                className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold transition-all text-slate-600 text-sm"
              >
                Close
              </button>
              {highlightedInterview.status === 'SCHEDULED' && (
                <button
                  onClick={() => {
                    setSelectedInterview(highlightedInterview);
                    setFeedbackForm({ feedback: '', rating: 5, status: 'COMPLETED' });
                    setHighlightedInterview(null);
                    setShowFeedbackModal(true);
                  }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-200 text-sm"
                >
                  Record Feedback & Outcome
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Top Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Recruitment Control Center</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage corporate vacancies, review incoming applications, and audit talent acquisition pipelines.</p>
        </div>
        <button 
          onClick={() => setShowAddJobModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 group"
        >
          <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
          <span>Post New Vacancy</span>
        </button>
      </div>

      {/* Numerical Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<Briefcase className="w-6 h-6 text-indigo-600" />} 
          label="Active Vacancies" 
          value={jobs.filter(j => j.status === 'OPEN').length} 
          subtext="Accepting candidates" 
          color="indigo" 
        />
        <StatCard 
          icon={<Users className="w-6 h-6 text-amber-600" />} 
          label="Active Applicants" 
          value={applications.filter(a => a.status !== 'HIRED' && a.status !== 'REJECTED').length} 
          subtext="Under evaluation" 
          color="amber" 
        />
        <StatCard 
          icon={<UserCheck className="w-6 h-6 text-emerald-600" />} 
          label="Positions Filled" 
          value={applications.filter(a => a.status === 'HIRED').length} 
          subtext="Hired this quarter" 
          color="emerald" 
        />
      </div>

      {/* Tabs Menu Selection */}
      <div className="border-b border-slate-200 flex gap-6">
        <button 
          onClick={() => setActiveTab('pipeline')}
          className={cn(
            "pb-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all",
            activeTab === 'pipeline' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Candidate Pipeline ({applications.length})
        </button>
        <button 
          onClick={() => setActiveTab('jobs')}
          className={cn(
            "pb-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all",
            activeTab === 'jobs' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Job Openings ({jobs.length})
        </button>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="font-bold text-sm uppercase tracking-widest text-slate-400">Loading Pipeline Data...</p>
        </div>
      ) : activeTab === 'pipeline' ? (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
          {STAGES.map(stage => {
            const stageApps = applications.filter(a => a.status === stage.id);
            return (
              <div key={stage.id} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200/60 min-h-[500px] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <span className={cn("px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border", stage.color)}>
                    {stage.name}
                  </span>
                  <span className="text-xs font-black text-slate-400">{stageApps.length}</span>
                </div>

                <div className="space-y-3 flex-1">
                  {stageApps.length === 0 ? (
                    <div className="h-28 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      Empty Stage
                    </div>
                  ) : (
                    stageApps.map(app => {
                      const cand = getCandidateForApp(app.candidate);
                      return (
                        <div 
                          key={app.id} 
                          onClick={() => handleCardClick(app, cand)}
                          className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all group relative cursor-pointer hover:border-indigo-200"
                        >
                          <h4 className="font-bold text-xs text-slate-900 truncate pr-4">
                            {app.candidate_name || (cand ? `${cand.first_name} ${cand.last_name}` : 'Unknown Candidate')}
                          </h4>
                          <p className="text-[10px] font-medium text-slate-500 truncate mt-1">{app.job_title}</p>
                          
                          {/* Candidate Detail Cards */}
                          {cand && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                              {cand.linkedin_profile && (
                                <a 
                                  href={cand.linkedin_profile} 
                                  onClick={(e) => e.stopPropagation()} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-all"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <a 
                                href={`mailto:${cand.email}`} 
                                onClick={(e) => e.stopPropagation()} 
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-all"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                              <a 
                                href={`tel:${cand.phone_number}`} 
                                onClick={(e) => e.stopPropagation()} 
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-all"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              {cand.resume && (
                                <a 
                                  href={cand.resume}
                                  onClick={(e) => e.stopPropagation()} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="p-1 hover:bg-slate-100 rounded text-indigo-500 hover:text-indigo-700 transition-all ml-auto"
                                  title="View Resume"
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Quick stage toggle dropdown */}
                          <div className="mt-3 flex gap-2">
                            <select 
                              onClick={(e) => e.stopPropagation()}
                              disabled={updatingAppId === app.id}
                              value={app.status}
                              onChange={(e) => handleStageChange(app.id, e.target.value)}
                              className="w-full text-[9px] font-bold bg-slate-50 text-slate-600 border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                            >
                              {STAGES.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            {updatingAppId === app.id && (
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-600 self-center" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Job Openings Tab View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {jobs.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-900">No Jobs Listed</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Add a new position using the button above to begin hiring.</p>
            </div>
          ) : (
            jobs.map(job => (
              <div 
                key={job.id} 
                className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                    job.status === 'OPEN' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                  )}>
                    {job.status}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{job.employment_type?.replace('_', ' ')}</span>
                </div>

                <h3 className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors mb-2">
                  {job.title}
                </h3>
                
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-4">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{job.location}</span>
                </div>

                <p className="text-xs text-slate-500 font-medium line-clamp-3 mb-6 flex-1 leading-relaxed">
                  {job.description}
                </p>

                <div className="space-y-3 pt-4 border-t border-slate-50 mt-auto">
                  {job.salary_range && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-tighter">Compensation</span>
                      <span className="font-black text-slate-700">{job.salary_range}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-tighter">Applications</span>
                    <span className="font-black text-indigo-600">{job.application_count || 0} applicants</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Candidate Details Drawer */}
      {selectedApp && selectedCand && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-end z-40 transition-opacity">
          <div className="bg-white w-full max-w-2xl h-screen shadow-2xl p-8 flex flex-col animate-slide-left overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Candidate File</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {selectedCand.first_name} {selectedCand.last_name}
                </h2>
                <p className="text-xs font-medium text-slate-500">{selectedApp.job_title}</p>
              </div>
              <button 
                onClick={handleCloseDrawer}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details Split */}
            <div className="space-y-8 flex-1">
              {/* Profile Details Card */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-150 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-500" />
                  <span>Contact Information</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${selectedCand.email}`} className="hover:text-indigo-600 transition-colors">{selectedCand.email}</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{selectedCand.phone_number}</span>
                  </div>
                  {selectedCand.linkedin_profile && (
                    <div className="flex items-center gap-2 col-span-full">
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                      <a href={selectedCand.linkedin_profile} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors text-xs truncate">
                        {selectedCand.linkedin_profile}
                      </a>
                    </div>
                  )}
                </div>

                {/* Resume section */}
                <div className="pt-4 border-t border-slate-200/60">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Resume / Curriculum Vitae</span>
                  {selectedCand.resume ? (
                    <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-700">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        <span className="text-xs font-bold truncate max-w-xs">View Uploaded Resume</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={selectedCand.resume} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2 text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                          title="Download Resume"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center transition-all cursor-pointer bg-white group" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2 group-hover:text-indigo-500 transition-colors" />
                      <span className="text-xs font-bold text-slate-500 block">Click to upload Candidate Resume</span>
                      <span className="text-[9px] text-slate-400 mt-1 block">PDF, DOCX formats accepted</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleResumeUpload} 
                    className="hidden" 
                    accept=".pdf,.doc,.docx"
                  />
                  {uploadingResume && (
                    <div className="flex items-center gap-2 mt-2 text-xs font-bold text-indigo-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving document to candidate profile...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status and Pipeline Management */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Application Evaluation</h3>
                  <select 
                    value={selectedApp.status}
                    onChange={(e) => handleStageChange(selectedApp.id, e.target.value)}
                    className="text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.name} Stage</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedApp.status === 'OFFER' && (
                <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 space-y-4">
                  <div className="flex justify-between items-center border-b border-indigo-100 pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Offer Letter Management</span>
                    </h3>
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                      offerStatus === 'DRAFT' ? "bg-amber-50 text-amber-700 border-amber-100" :
                      offerStatus === 'SENT' ? "bg-blue-50 text-blue-700 border-blue-100" :
                      offerStatus === 'ACCEPTED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      "bg-rose-50 text-rose-700 border-rose-100"
                    )}>
                      Offer: {offerStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Annual Salary Offered</label>
                      <input 
                        type="text"
                        placeholder="e.g. USD 95,000"
                        value={salaryOffered}
                        onChange={(e) => setSalaryOffered(e.target.value)}
                        className="w-full text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-all shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Expected Joining Date</label>
                      <input 
                        type="date"
                        value={joiningDate}
                        onChange={(e) => setJoiningDate(e.target.value)}
                        className="w-full text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowOfferModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    Open Offer Workspace
                  </button>

                  <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-indigo-100">
                    <div className="flex gap-2">
                      {offerStatus === 'DRAFT' && (
                        <button 
                          type="button"
                          disabled={savingOffer || !offerId}
                          onClick={() => handleSaveOffer('SENT')}
                          className="text-[10px] px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                          title={!offerId ? "Please save draft first" : "Mark as sent to candidate"}
                        >
                          Mark as Sent
                        </button>
                      )}

                      {offerStatus === 'SENT' && (
                        <div className="flex gap-1.5">
                          <button 
                            type="button"
                            onClick={() => handleSaveOffer('ACCEPTED')}
                            className="text-[10px] px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                          >
                            Candidate Accepted
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleSaveOffer('REJECTED')}
                            className="text-[10px] px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                          >
                            Rejected
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Scheduled Interviews timeline */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>Scheduled Interview Rounds</span>
                  </h3>
                  <button 
                    onClick={() => setShowScheduleModal(true)}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
                  >
                    + Schedule Round
                  </button>
                </div>

                <div className="space-y-3">
                  {appInterviews.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-semibold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      No interviews scheduled for this candidate yet.
                    </div>
                  ) : (
                    appInterviews.map((interview) => (
                      <div key={interview.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                              interview.status === 'SCHEDULED' ? "bg-purple-50 text-purple-700 border-purple-100" :
                              interview.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                              "bg-rose-50 text-rose-700 border-rose-100"
                            )}>
                              {interview.status}
                            </span>
                            <div className="text-xs font-bold text-slate-800 mt-2 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{new Date(interview.interview_date).toLocaleString()}</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 mt-1">Location: <span className="font-semibold text-slate-700">{interview.location}</span></p>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Interviewer</span>
                            <span className="text-xs font-bold text-slate-700">{interview.interviewer_name || "Unassigned"}</span>
                          </div>
                        </div>

                        {/* Interview Feedback & Rating */}
                        {interview.status === 'COMPLETED' && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2 mt-2">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                              <span>Feedback Score</span>
                              <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={cn("w-3 h-3", i < (interview.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-350")} />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 font-medium italic">
                              "{interview.feedback || "No written comments recorded."}"
                            </p>
                          </div>
                        )}

                        {interview.status === 'SCHEDULED' && (
                          <div className="flex justify-end gap-2 pt-2">
                            <button 
                              onClick={() => {
                                setSelectedInterview(interview);
                                setFeedbackForm({
                                  feedback: '',
                                  rating: 5,
                                  status: 'COMPLETED'
                                });
                                setShowFeedbackModal(true);
                              }}
                              className="text-[10px] px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-sm"
                            >
                              Record Result
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm("Cancel this interview round?")) {
                                  try {
                                    await recruitmentService.updateInterview(interview.id, { status: 'CANCELLED' });
                                    toast.success("Interview marked as cancelled");
                                    loadInterviews(selectedApp.id);
                                  } catch (error) {
                                    toast.error("Failed to cancel interview");
                                  }
                                }
                              }}
                              className="text-[10px] px-3 py-1.5 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 text-slate-500 font-bold rounded-lg transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal Dialog */}
      {showScheduleModal && selectedApp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 w-full max-w-md shadow-2xl p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Schedule Interview</h2>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleInterview} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Interviewer *</label>
                <select 
                  required
                  value={newInterview.interviewer}
                  onChange={(e) => setNewInterview({...newInterview, interviewer: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold cursor-pointer text-slate-700"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name || ''} ({emp.designation_name || 'Employee'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time *</label>
                <input 
                  required
                  type="datetime-local" 
                  value={newInterview.interview_date}
                  onChange={(e) => setNewInterview({...newInterview, interview_date: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold cursor-pointer text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location / Meeting URL *</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Google Meet Link, Room 102"
                  value={newInterview.location}
                  onChange={(e) => setNewInterview({...newInterview, location: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="flex gap-4 pt-4 justify-end border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-6 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold transition-all text-slate-600 text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-150 text-sm"
                >
                  Schedule Round
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Feedback / Result Modal Dialog */}
      {showFeedbackModal && selectedInterview && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 w-full max-w-md shadow-2xl p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Record Interview Outcome</h2>
              <button 
                onClick={() => setShowFeedbackModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordFeedback} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Round Status</label>
                <select 
                  value={feedbackForm.status}
                  onChange={(e) => setFeedbackForm({...feedbackForm, status: e.target.value as any})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold cursor-pointer text-slate-700"
                >
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Feedback Rating (1-5 Stars)</label>
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFeedbackForm({...feedbackForm, rating: i + 1})}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star className={cn("w-6 h-6", i < feedbackForm.rating ? "fill-amber-400 text-amber-400" : "text-slate-350")} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Written Feedback & Comments</label>
                <textarea 
                  rows={4}
                  required
                  placeholder="Record summary of candidate performance, technical strengths, and weaknesses..."
                  value={feedbackForm.feedback}
                  onChange={(e) => setFeedbackForm({...feedbackForm, feedback: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="flex gap-4 pt-4 justify-end border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-6 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold transition-all text-slate-600 text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-150 text-sm"
                >
                  Submit outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Job Modal Dialog */}
      {showAddJobModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 w-full max-w-xl shadow-2xl p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Publish Job Opportunity</h2>
              <button 
                onClick={() => setShowAddJobModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Position Title *</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Lead Developer"
                    value={newJob.title}
                    onChange={(e) => setNewJob({...newJob, title: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location *</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Bangalore / Remote"
                    value={newJob.location}
                    onChange={(e) => setNewJob({...newJob, location: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employment Type</label>
                  <select 
                    value={newJob.employment_type}
                    onChange={(e) => setNewJob({...newJob, employment_type: e.target.value as any})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold cursor-pointer text-slate-700"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compensation Details</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ₹12L - ₹18L per annum"
                    value={newJob.salary_range}
                    onChange={(e) => setNewJob({...newJob, salary_range: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Role Description</label>
                <textarea 
                  rows={3}
                  placeholder="Summarize key details and work expectations..."
                  value={newJob.description}
                  onChange={(e) => setNewJob({...newJob, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Candidate Requirements</label>
                <textarea 
                  rows={2}
                  placeholder="e.g. 3 years node experience, AWS stack skills..."
                  value={newJob.requirements}
                  onChange={(e) => setNewJob({...newJob, requirements: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="flex gap-4 pt-4 justify-end border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowAddJobModal(false)}
                  className="px-6 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold transition-all text-slate-600 text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-150 text-sm"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCand && selectedApp && (
        <OfferLetterModal
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          personName={`${selectedCand.first_name} ${selectedCand.last_name}`}
          jobTitle={selectedApp.job_title || 'Software Engineer'}
          department="Engineering" // Default or read from application
          hireDate={joiningDate}
          employmentType="Full-Time"
          onDownloadPDF={handleDownloadPDF}
          onSaveDraft={(text, salary) => handleSaveOffer('DRAFT', text, salary)}
          initialOfferText={offerText}
          initialSalary={salaryOffered}
          isGeneratingPdf={generatingPdf}
          isSaving={savingOffer}
          mode="recruitment"
        />
      )}

      {/* Hidden Print Container for PDF Generation */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <div 
          ref={printRef}
          style={{ width: '210mm', minHeight: '297mm', padding: '25mm' }}
          className="bg-white text-slate-900 font-sans flex flex-col justify-between border"
        >
          <div>
            {/* Letterhead Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-8">
              <div>
                <h1 className="text-2xl font-black text-indigo-700 tracking-tight">ENTERPRISE CORP</h1>
                <p className="text-xs font-semibold text-slate-500 mt-1">Innovation & Talent Solutions</p>
              </div>
              <div className="text-right text-[10px] font-bold text-slate-400 leading-relaxed">
                <p>100 Innovation Way, Suite 400</p>
                <p>Tech District, CA 94016</p>
                <p>careers@enterprise.com | +1 (555) 019-0000</p>
              </div>
            </div>

            {/* Document Content */}
            <div className="space-y-4 whitespace-pre-line text-slate-800 leading-relaxed text-sm">
              {offerText ? (
                offerText
              ) : (
                <p className="text-sm text-slate-400 italic">No offer text generated yet.</p>
              )}
            </div>
          </div>

          {/* Signature Footer */}
          <div className="border-t border-slate-200 pt-8 mt-12 grid grid-cols-2 gap-8 text-xs font-bold text-slate-700">
            <div>
              <p className="text-slate-400 mb-8 uppercase tracking-widest text-[9px]">For Enterprise Corp</p>
              <div className="border-b border-slate-300 w-48 mb-2 h-6" />
              <p>Authorized Signature</p>
              <p className="text-slate-400 font-medium mt-0.5">Human Resources Director</p>
            </div>
            <div>
              <p className="text-slate-400 mb-8 uppercase tracking-widest text-[9px]">Candidate Acceptance</p>
              <div className="border-b border-slate-300 w-48 mb-2 h-6" />
              <p>Signature of Candidate</p>
              <p className="text-slate-400 font-medium mt-0.5">Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, color }: any) {
  const colors: any = {
    indigo: "bg-indigo-50/50 border-indigo-100 hover:border-indigo-300",
    amber: "bg-amber-50/50 border-amber-100 hover:border-amber-300",
    emerald: "bg-emerald-50/50 border-emerald-100 hover:border-emerald-300"
  };
  return (
    <div className={cn("bg-white p-6 rounded-3xl border shadow-sm transition-all group flex items-center justify-between", colors[color])}>
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <h3 className="text-3xl font-black text-slate-900 tracking-tight mt-1">{value}</h3>
        <span className="text-xs font-semibold text-slate-400 block mt-1">{subtext}</span>
      </div>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">{icon}</div>
    </div>
  );
}
