
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Briefcase,
  FileText,
  History,
  Settings,
  MoreVertical,
  Loader2,
  Clock,
  User,
  ExternalLink,
  Edit,
  Trash2,
  Plus,
  UserCheck,
  Upload,
  Download,
  File,
  X,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { employeeService } from '@/services/employeeService';
import { attendanceService } from '@/services/attendanceService';
import { leaveService } from '@/services/leaveService';
import { payrollService } from '@/services/payrollService';
import { performanceService } from '@/services/performanceService';
import { trainingService } from '@/services/trainingService';
import { documentService, Document as DocType } from '@/services/documentService';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import OfferLetterModal from '@/components/OfferLetterModal';
import { useAuth } from '@/context/AuthContext';


export default function EmployeeProfilePage() {
  const { isHR, loading: authLoading, user } = useAuth();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('Offer Letter');
  const docInputRef = useRef<HTMLInputElement>(null);

  // Offer Letter Generator state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerText, setOfferText] = useState('');
  const [offerSalary, setOfferSalary] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const offerPrintRef = useRef<HTMLDivElement>(null);

  const handleOfferDownloadPDF = async (text: string) => {
    setOfferText(text);
    setTimeout(async () => {
      if (!employee) return;
      const element = offerPrintRef.current;
      if (!element) {
        toast.error('Could not find the print container');
        return;
      }

      setGeneratingPdf(true);
      const loadingToast = toast.loading('Generating offer letter PDF...');
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
        const fileName = `Offer_Letter_${employee.first_name}_${employee.last_name || 'Employee'}.pdf`;
        pdf.save(fileName);

        toast.dismiss(loadingToast);
        toast.success('Offer letter PDF downloaded!');
      } catch (error) {
        console.error('PDF generation failed', error);
        toast.dismiss(loadingToast);
        toast.error('Could not generate PDF.');
      } finally {
        setGeneratingPdf(false);
      }
    }, 150);
  };

  const handleOfferSaveToVault = async (text: string) => {
    setOfferText(text);
    setTimeout(async () => {
      if (!employee) return;
      const element = offerPrintRef.current;
      if (!element) {
        toast.error('Could not find the print container');
        return;
      }

      setGeneratingPdf(true);
      const loadingToast = toast.loading('Saving offer letter to Digital Vault...');
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png');
        });

        const fileName = `Offer_Letter_${employee.first_name}_${employee.last_name || 'Employee'}.png`;
        const file = new window.File([blob], fileName, { type: 'image/png' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('employee', String(employee.id));
        formData.append('document_type', 'Offer Letter');

        const newDoc = await documentService.upload(formData);
        setDocuments(prev => [newDoc, ...prev]);

        toast.dismiss(loadingToast);
        toast.success('Offer letter saved to Digital Vault!');
        setShowOfferModal(false);
      } catch (error) {
        console.error('Failed to save offer letter to vault', error);
        toast.dismiss(loadingToast);
        toast.error('Failed to save offer letter.');
      } finally {
        setGeneratingPdf(false);
      }
    }, 150);
  };

  const fetchEmployee = async () => {
    setLoading(true);
    try {
      if (!id) return;

      // Fetch the core employee record — this must succeed
      const empData = await employeeService.getById(id as string);
      setEmployee(empData);

      // Fetch supplementary data — failures are non-fatal, default to []
      const [attResult, leaveResult, payResult, perfResult, trainResult, docsResult] =
        await Promise.allSettled([
          attendanceService.getAll({ employee: id }),
          leaveService.getAll({ employee: id }),
          payrollService.getAll({ employee: id }),
          performanceService.getAll({ employee: id }),
          trainingService.getEnrollments({ employee: id }),
          documentService.getByEmployee(Number(id)),
        ]);

      const safe = (result: PromiseSettledResult<any>, key?: string): any[] => {
        if (result.status === 'fulfilled') {
          const val = key ? result.value?.[key] ?? result.value : result.value;
          return Array.isArray(val) ? val : (val?.results ?? []);
        }
        return [];
      };

      setAttendance(safe(attResult));
      setLeaves(safe(leaveResult));
      setPayroll(safe(payResult));
      setPerformance(safe(perfResult));
      setTrainings(safe(trainResult));
      setDocuments(docsResult.status === 'fulfilled' && Array.isArray(docsResult.value) ? docsResult.value : []);
    } catch (error) {
      console.error("Failed to fetch employee details", error);
      toast.error("Failed to load employee details. Please try again.");
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fire after auth has fully resolved AND user is set to prevent race condition on mount
    if (!authLoading && !!user && !isHR) {
      toast.error("Access denied. Only HR and Admins can view employee profiles.");
      navigate('/employees');
    }
  }, [isHR, authLoading, user, navigate]);

  useEffect(() => {
    if (id && isHR) {
      fetchEmployee();
    } else if (!id && isHR) {
      // No id param — redirect cleanly without error toast
      navigate('/employees');
    }
  }, [id, isHR]);

  const getAvatarUrl = (path: string) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    const baseUrl = (import.meta as any).env.VITE_API_URL?.replace('/api', '') || '';
    return `${baseUrl}${path}`;
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to remove this personnel record from the active registry? This action is logged for audit purposes.")) {
      try {
        await employeeService.delete(id as string);
        toast.success("Personnel record archived successfully");
        navigate('/employees');
      } catch (error) {
        console.error("Deletion failed", error);
        toast.error("Failed to archive record. Permission denied or server error.");
      }
    }
  };

  const DOCUMENT_TYPES = [
    'Offer Letter', 'Employment Contract', 'NDA', 'ID Proof',
    'Tax Form', 'Resume / CV', 'Certification', 'Other'
  ];

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employee', String(employee.id));
      formData.append('document_type', selectedDocType);
      const newDoc = await documentService.upload(formData);
      setDocuments(prev => [newDoc, ...prev]);
      toast.success(`"${selectedDocType}" uploaded successfully`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleDocDelete = async (docId: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this document?')) return;
    try {
      await documentService.delete(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      toast.success('Document deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete document');
    }
  };

  const getFileUrl = (path: string) => {
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    const baseUrl = (import.meta as any).env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';
    return `${baseUrl}${path}`;
  };

  const getFileName = (path: string) => {
    if (!path) return 'file';
    return path.split('/').pop() || 'file';
  };

  if (authLoading || (loading && isHR)) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
        <p className="text-[10px] font-bold tracking-[0.4em] text-slate-400 uppercase">Opening Dossier...</p>
      </div>
    );
  }

  if (!isHR || !employee) return null;

  return (
    <div className="space-y-10 pb-20 bg-[#FAFAFA] min-h-screen -m-6 p-10">
      {/* Back & Actions */}
      <div className="flex items-center justify-between">
        <Link to="/employees" className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Return to Registry</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to={`/employees/edit?id=${id}`}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Update Credentials</span>
          </Link>
          <button 
            onClick={handleDelete}
            className="p-2.5 text-rose-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl transition-all shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          {/* Avatar Section */}
          <div className="relative">
            <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden bg-slate-50 border-4 border-white shadow-xl">
              {employee.avatar ? (
                <img src={getAvatarUrl(employee.avatar)} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-200 text-6xl font-extralight">
                  {employee.first_name[0]}
                </div>
              )}
            </div>
          </div>

          {/* Identity Section */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-semibold text-slate-900 tracking-tight">
                {employee.first_name} <span className="font-light">{employee.last_name}</span>
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">{employee.designation_name || 'MEMBER'}</p>
                <div className="w-1 h-1 rounded-full bg-slate-200 hidden md:block" />
                <div className="flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black tracking-widest uppercase">{employee.employee_id}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-2">
              <InfoBadge icon={<Mail className="w-3 h-3" />} text={employee.email} />
              <InfoBadge icon={<Phone className="w-3 h-3" />} text={employee.phone_number || 'N/A'} />
              <InfoBadge icon={<Building2 className="w-3 h-3" />} text={employee.department_name || 'General Org'} />
              {employee.branch_name && <InfoBadge icon={<MapPin className="w-3 h-3" />} text={employee.branch_name} />}
            </div>
          </div>
        </div>

        {/* Header Texture Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 -z-10" />
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-10 border-b border-slate-200/60 pb-1 overflow-x-auto hide-scrollbar">
        <TabButton id="overview" label="Dossier Overview" active={activeTab === 'overview'} onClick={setActiveTab} />
        <TabButton id="activity" label="Attendance & Leaves" active={activeTab === 'activity'} onClick={setActiveTab} />
        <TabButton id="performance" label="Performance & Payroll" active={activeTab === 'performance'} onClick={setActiveTab} />
        <TabButton id="training" label="Training" active={activeTab === 'training'} onClick={setActiveTab} />
        <TabButton id="documents" label="Digital Vault" active={activeTab === 'documents'} onClick={setActiveTab} />
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-10">
          {activeTab === 'overview' && (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                <Section title="Personal Identification">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <DataField label="Full Legal Name" value={`${employee.first_name} ${employee.last_name}`} />
                      <DataField label="Date of Birth" value={employee.date_of_birth || 'Not Recorded'} />
                      <DataField label="Primary Communication" value={employee.email} />
                      <DataField label="Alternate Email" value={employee.alternative_email || 'None'} />
                   </div>
                </Section>
                <Section title="Organizational Alignment">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <DataField label="Reporting Unit" value={employee.department_name || 'Global'} />
                      <DataField label="Assigned Branch" value={employee.branch_name || 'Unassigned'} />
                      <DataField label="Commission Date" value={employee.hire_date || 'N/A'} />
                      <DataField label="End Date" value={employee.end_date || 'Not recorded'} />
                   </div>
                </Section>
                <Section title="Residential Details">
                   <div className="space-y-6">
                      <DataField label="Current Registry Address" value={employee.current_address || 'Unspecified'} />
                      <DataField label="Permanent Registry Address" value={employee.permanent_address || 'Same as current'} />
                   </div>
                </Section>
             </div>
          )}

          {activeTab === 'activity' && (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                <Section title="Recent Attendance">
                   <div className="space-y-4">
                      {attendance.length === 0 ? <p className="text-sm text-slate-400">No attendance logs found.</p> : attendance.slice(0, 5).map((log: any) => (
                        <div key={log.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{log.attendance_date}</p>
                            <p className="text-[10px] text-slate-500">{log.check_in || '--:--'} to {log.check_out || '--:--'}</p>
                          </div>
                          <span className={cn("px-2 py-1 text-[10px] font-bold uppercase rounded-md", log.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{log.status}</span>
                        </div>
                      ))}
                   </div>
                </Section>
                <Section title="Leave Requests">
                   <div className="space-y-4">
                      {leaves.length === 0 ? <p className="text-sm text-slate-400">No leaves found.</p> : leaves.map((leave: any) => (
                        <div key={leave.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{leave.leave_type}</p>
                            <p className="text-[10px] text-slate-500">{leave.start_date} to {leave.end_date}</p>
                          </div>
                          <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-slate-200 text-slate-700">{leave.status}</span>
                        </div>
                      ))}
                   </div>
                </Section>
             </div>
          )}

          {activeTab === 'performance' && (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                <Section title="Performance Reviews">
                   <div className="space-y-4">
                      {performance.length === 0 ? <p className="text-sm text-slate-400">No reviews found.</p> : performance.map((perf: any) => (
                        <div key={perf.id} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-slate-900">{perf.review_date} - By {perf.reviewer_name}</p>
                            <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-indigo-100 text-indigo-700">{perf.rating}/5 Stars</span>
                          </div>
                          <p className="text-[11px] text-slate-600 italic">"{perf.comments}"</p>
                        </div>
                      ))}
                   </div>
                </Section>
                <Section title="Payroll History">
                   <div className="space-y-4">
                      {payroll.length === 0 ? <p className="text-sm text-slate-400">No payroll records found.</p> : payroll.map((pay: any) => (
                        <div key={pay.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{pay.period_start} to {pay.period_end}</p>
                            <p className="text-[10px] text-slate-500">Net Pay: {pay.net_pay}</p>
                          </div>
                          <span className={cn("px-2 py-1 text-[10px] font-bold uppercase rounded-md", pay.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{pay.status}</span>
                        </div>
                      ))}
                   </div>
                </Section>
             </div>
          )}

          {activeTab === 'training' && (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                <Section title="Training Enrollments">
                   <div className="space-y-4">
                      {trainings.length === 0 ? <p className="text-sm text-slate-400">No enrollments found.</p> : trainings.map((enroll: any) => (
                        <div key={enroll.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{enroll.training_name || `Training #${enroll.training}`}</p>
                            <p className="text-[10px] text-slate-500">Enrolled: {enroll.enrollment_date}</p>
                          </div>
                          <span className={cn("px-2 py-1 text-[10px] font-bold uppercase rounded-md", enroll.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700')}>{enroll.status}</span>
                        </div>
                      ))}
                   </div>
                </Section>
             </div>
          )}

          {activeTab === 'documents' && (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                <Section title="Upload New Document">
                  <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                    <div className="space-y-1 flex-1">
                      <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Document Category</label>
                      <select
                        value={selectedDocType}
                        onChange={(e) => setSelectedDocType(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                      >
                        {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="file" ref={docInputRef} onChange={handleDocUpload} className="hidden" />
                      <button
                        onClick={() => docInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span>{uploading ? 'Uploading...' : 'Select & Upload'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setOfferText('');
                          setOfferSalary('');
                          setShowOfferModal(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-100"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Create Offer Letter</span>
                      </button>
                    </div>
                  </div>
                </Section>

                <Section title={`Stored Documents (${documents.length})`}>
                  {documents.length === 0 ? (
                    <div className="text-center py-10 space-y-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                        <FileText className="w-8 h-8" />
                      </div>
                      <p className="text-lg font-semibold text-slate-900 tracking-tight">The Digital Vault is Empty</p>
                      <p className="text-sm text-slate-400 max-w-xs mx-auto">No secure documents have been uploaded to this personnel dossier yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/60 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                              <File className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{doc.document_type}</p>
                              <p className="text-[10px] text-slate-400">{getFileName(doc.file)} &middot; Uploaded {new Date(doc.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={getFileUrl(doc.file)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleDocDelete(doc.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
             </div>
          )}
        </div>

        {/* Right Column: Timeline/Quick Info */}
        <div className="space-y-10">
           <Section title="Service Timeline">
              <div className="space-y-8">
                 <TimelineItem date={employee.hire_date} title="Onboarding Completed" desc="Member officially entered the registry." icon={<Plus className="w-3 h-3" />} />
                 <TimelineItem date={employee.end_date || 'Current'} title="Service Record" desc="Personnel record is retained in the registry." icon={<UserCheck className="w-3 h-3" />} isLast />
              </div>
           </Section>
        </div>
      </div>

      {/* Offer Letter Workspace Modal */}
      {employee && (
        <OfferLetterModal
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          personName={`${employee.first_name} ${employee.last_name || ''}`}
          personId={employee.employee_id}
          jobTitle={employee.designation_name || 'Team Member'}
          department={employee.department_name || 'General'}
          hireDate={employee.hire_date}
          onDownloadPDF={handleOfferDownloadPDF}
          onSaveToVault={handleOfferSaveToVault}
          isGeneratingPdf={generatingPdf}
          isSaving={generatingPdf}
          mode="employee"
        />
      )}

      {/* Hidden A4 Print Container for Offer Letter PDF */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <div
          ref={offerPrintRef}
          style={{ width: '210mm', minHeight: '297mm', padding: '25mm' }}
          className="bg-white text-slate-900 font-sans flex flex-col justify-between"
        >
          <div>
            {/* Letterhead Header */}
            <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-6 mb-8">
              <div>
                <h1 className="text-3xl font-black text-indigo-700 tracking-tight">ENTERPRISE CORP</h1>
                <p className="text-xs font-semibold text-slate-500 mt-1">Innovation & Talent Solutions</p>
              </div>
              <div className="text-right text-[10px] font-bold text-slate-400 leading-relaxed">
                <p>100 Innovation Way, Suite 400</p>
                <p>Tech District, CA 94016</p>
                <p>careers@enterprise.com | +1 (555) 019-0000</p>
              </div>
            </div>

            {/* Letter Content */}
            <div className="whitespace-pre-line text-slate-800 leading-relaxed text-sm">
              {offerText || 'No offer text generated yet.'}
            </div>
          </div>

          {/* Signature Footer */}
          <div className="border-t border-slate-200 pt-8 mt-16 grid grid-cols-2 gap-8 text-xs font-bold text-slate-700">
            <div>
              <p className="text-slate-400 mb-10 uppercase tracking-widest text-[9px]">For Enterprise Corp</p>
              <div className="border-b border-slate-300 w-48 mb-2 h-6" />
              <p>Authorized Signature</p>
              <p className="text-slate-400 font-medium mt-0.5">Human Resources Director</p>
            </div>
            <div>
              <p className="text-slate-400 mb-10 uppercase tracking-widest text-[9px]">Employee Acknowledgment</p>
              <div className="border-b border-slate-300 w-48 mb-2 h-6" />
              <p>Signature of Employee</p>
              <p className="text-slate-400 font-medium mt-0.5">Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBadge({ icon, text }: any) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[10px] font-bold text-slate-600 tracking-tight uppercase">{text}</span>
    </div>
  );
}

function TabButton({ id, label, active, onClick }: any) {
  return (
    <button 
      onClick={() => onClick(id)}
      className={cn(
        "pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative",
        active ? "text-slate-900" : "text-slate-300 hover:text-slate-500"
      )}
    >
      {label}
      {active && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-900" />}
    </button>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-1">{title}</h3>
      <div className="bg-white border border-slate-200/60 rounded-[2rem] p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function DataField({ label, value }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-medium text-slate-900 tracking-tight">{value}</p>
    </div>
  );
}

function TimelineItem({ date, title, desc, icon, isLast }: any) {
  return (
    <div className="flex gap-6">
       <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
             {icon}
          </div>
          {!isLast && <div className="w-[1px] h-12 bg-slate-100 my-2" />}
       </div>
       <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-300 tracking-widest uppercase">{date || 'N/A'}</p>
          <p className="text-xs font-bold text-slate-900">{title}</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
       </div>
    </div>
  );
}
