import React, { useRef, useState, useEffect } from 'react';
import { 
  FileText, 
  X, 
  Download, 
  Save, 
  RefreshCw, 
  User, 
  Briefcase, 
  Building2,
  Calendar,
  Printer,
  Edit3,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfferLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Person data (works for both employee and candidate)
  personName: string;
  personId?: string; // e.g. employee_id like EMP001
  jobTitle: string;
  department: string;
  hireDate?: string; // ISO date string
  employmentType?: string;
  managerName?: string;
  // Actions
  onDownloadPDF: (offerText: string) => void;
  onSaveToVault?: (offerText: string) => void; // Only for Employee side
  onSaveDraft?: (offerText: string, salary: string) => void; // Only for Recruitment side
  // Optional initial values (for editing existing offers)
  initialOfferText?: string;
  initialSalary?: string;
  // Flags
  isGeneratingPdf?: boolean;
  isSaving?: boolean;
  mode: 'employee' | 'recruitment'; // Determines which action buttons to show
}

const STATIC_TEMPLATE = `Date: [Date]

To,
[Candidate/Employee Name]
[Address]

Subject: Offer of Employment — [Designation/Role]

Dear [Candidate/Employee Name],

We are pleased to offer you employment for the position of "[Designation/Role]" in the [Department] department at Enterprise Corp. We believe your skills and background will be a valuable asset to our team.

Terms of Employment:
1. Commencement Date: Your employment will commence on [Commencement Date].
2. Nature of Position: This is a [Employment Type, e.g. Full-Time] position.
3. Reporting Manager: You will report to [Manager Name/Title].
4. Location: Your primary work location will be Enterprise Corp, Head Office.

Compensation and Benefits:
Your annual compensation package (CTC) is [Salary/Compensation Details], payable in monthly installments, subject to applicable tax deductions and withholding. You will also be eligible for standard company benefits, subject to company policies.

Terms & Conditions:
- This offer is subject to satisfactory reference and background checks.
- You will be on probation for a period of [Probation Period, e.g. 3 months] from your date of joining.
- You agree to adhere to all policies, guidelines, and confidentiality agreements of the company.

This letter supersedes all previous verbal or written agreements regarding your terms of employment.

Please sign and return a copy of this letter to confirm your acceptance.

Warm Regards,

Human Resources Department
Enterprise Corp.`;

export default function OfferLetterModal({
  isOpen,
  onClose,
  personName,
  personId,
  jobTitle,
  department,
  hireDate,
  employmentType,
  managerName,
  onDownloadPDF,
  onSaveToVault,
  onSaveDraft,
  initialOfferText,
  initialSalary,
  isGeneratingPdf = false,
  isSaving = false,
  mode
}: OfferLetterModalProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsEditing(false); // Default to preview mode
      
      if (editorRef.current) {
        if (initialOfferText) {
          editorRef.current.innerText = initialOfferText;
        } else {
          editorRef.current.innerText = STATIC_TEMPLATE;
        }
      }
    }
  }, [isOpen, initialOfferText]);

  const handleResetToDefault = () => {
    if (editorRef.current) {
      editorRef.current.innerText = STATIC_TEMPLATE;
    }
  };

  const handleDownload = () => {
    if (editorRef.current) {
      onDownloadPDF(editorRef.current.innerText);
    }
  };

  const handlePrint = () => {
    if (!editorRef.current) return;
    const printContent = editorRef.current.innerText;
    
    // Open a new printable popup window with official A4 template styling
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Offer Letter - ${personName}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #1e293b;
                padding: 20mm;
                line-height: 1.6;
                margin: 0;
              }
              .letterhead {
                display: flex;
                justify-content: space-between;
                border-bottom: 2px solid #6366f1;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .letterhead-title {
                font-size: 24px;
                font-weight: 900;
                letter-spacing: 0.15em;
                color: #1e1b4b;
                margin: 0;
                text-transform: uppercase;
              }
              .letterhead-subtitle {
                font-size: 11px;
                font-weight: 600;
                color: #64748b;
                margin-top: 2px;
              }
              .right-align {
                text-align: right;
                font-size: 10px;
                color: #64748b;
                line-height: 1.4;
              }
              .content {
                white-space: pre-wrap;
                font-size: 14px;
                color: #334155;
              }
              .signatures {
                margin-top: 60px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 50px;
                font-size: 12px;
              }
              .sig-line {
                border-bottom: 1px dashed #cbd5e1;
                width: 200px;
                height: 30px;
                margin-top: 10px;
              }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <div class="letterhead">
              <div>
                <h1 class="letterhead-title">ENTERPRISE CORP</h1>
                <div class="letterhead-subtitle">Innovation & Talent Solutions</div>
              </div>
              <div class="right-align">
                <div>100 Innovation Way, Suite 400</div>
                <div>Tech District, CA 94016</div>
                <div>careers@enterprisecorp.com | www.enterprisecorp.com</div>
              </div>
            </div>
            
            <div class="content">${printContent}</div>
            
            <div class="signatures">
              <div>
                <strong>Authorized Signatory</strong>
                <div style="color: #64748b; margin-top: 2px;">Human Resources</div>
                <div class="sig-line"></div>
              </div>
              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                <div><strong>Candidate Signature</strong></div>
                <div style="color: #64748b; margin-top: 2px;">Acceptance</div>
                <div class="sig-line"></div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      // Wait for content to render and trigger print dialogue
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleSave = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText;

    if (mode === 'employee' && onSaveToVault) {
      onSaveToVault(text);
    } else if (mode === 'recruitment' && onSaveDraft) {
      onSaveDraft(text, initialSalary || '');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Offer Letter Editor Workspace</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Static Template Editing System</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-5 gap-8">
          
          {/* Left Column: A4 Preview (60% / 3 cols) */}
          <div className="md:col-span-3 flex flex-col gap-2">
            <div className="flex items-center justify-between ml-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Offer Document Template Preview</span>
              {isEditing ? (
                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-indigo-100">
                  <Edit3 className="w-3 h-3" /> Edit Mode Active
                </span>
              ) : (
                <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-slate-100">
                  <Eye className="w-3 h-3" /> Preview Only (Locked)
                </span>
              )}
            </div>

            {/* Notification Banner */}
            <div className={cn(
              "px-4 py-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-2 transition-all",
              isEditing 
                ? "bg-indigo-50/50 border-indigo-100 text-indigo-700 animate-pulse" 
                : "bg-amber-50/40 border-amber-100/60 text-amber-700/80"
            )}>
              {isEditing 
                ? "✍️ Edit Mode enabled. Click anywhere inside the letter below to customize name, role, CTC, dates, and terms manually."
                : "👁️ Locked Preview. Click the 'Edit Offer Letter' switch in the control panel to modify contents manually."
              }
            </div>
            
            {/* Simulated A4 Page */}
            <div className={cn(
              "border rounded-2xl shadow-sm bg-slate-50/30 p-[30px] flex flex-col min-h-[520px] overflow-hidden transition-all group",
              isEditing ? "border-indigo-200 ring-2 ring-indigo-50" : "border-slate-200/80 hover:border-slate-300"
            )}>
              {/* Letterhead Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-sm font-black text-slate-800 tracking-[0.2em] uppercase">Enterprise Corp</h1>
                  <p className="text-[10px] text-slate-400 font-medium">Head Office, Silicon Valley, CA</p>
                  <p className="text-[9px] text-slate-300">www.enterprisecorp.com</p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-50/50 px-2.5 py-1 rounded-full border border-indigo-100/50">
                    Official Document
                  </span>
                </div>
              </div>
              
              {/* Divider */}
              <div className="h-[2px] bg-indigo-500/20 mb-6" />

              {/* Editable Body */}
              <div 
                ref={editorRef}
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
                className={cn(
                  "flex-1 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap outline-none p-3 rounded-xl border border-transparent transition-all font-sans",
                  isEditing ? "bg-white border-slate-200/60 hover:border-slate-300 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50" : "cursor-not-allowed select-none"
                )}
                style={{ minHeight: '340px' }}
              />

              {/* Signature Blocks */}
              <div className="mt-12 pt-6 border-t border-slate-100 grid grid-cols-2 gap-8 text-xs">
                <div>
                  <p className="font-bold text-slate-800">Authorized Signatory</p>
                  <p className="text-slate-400 mt-1">Human Resources</p>
                  <div className="h-6 w-20 border-b border-dashed border-slate-200 mt-2" />
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="font-bold text-slate-800">Candidate Signature</p>
                  <p className="text-slate-400 mt-1">Acceptance</p>
                  <div className="h-6 w-20 border-b border-dashed border-slate-200 mt-2" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Control Panel (40% / 2 cols) */}
          <div className="md:col-span-2 flex flex-col gap-6 bg-slate-50/60 p-6 rounded-2xl border border-slate-100 self-start w-full">
            
            {/* Person Info Card */}
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2.5">Recipients Records Reference</span>
              <div className="bg-white rounded-xl border border-slate-200/60 p-4 space-y-3.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{personName}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{personId || 'Candidate'}</p>
                  </div>
                </div>
                
                <div className="h-[1px] bg-slate-100" />
                
                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1"><Briefcase className="w-3 h-3 text-slate-400" /> Role</span>
                    <p className="font-medium text-slate-700 leading-tight">{jobTitle}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-400" /> Dept</span>
                    <p className="font-medium text-slate-700 leading-tight">{department}</p>
                  </div>
                  {hireDate && (
                    <div className="space-y-0.5 col-span-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" /> Commence Date</span>
                      <p className="font-medium text-slate-700">
                        {new Date(hireDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Toggle switch for Edit Mode */}
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between shadow-sm">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-indigo-950 block">Edit Offer Letter</span>
                <span className="text-[10px] font-medium text-indigo-500 block leading-tight">Enable inline document typing</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative flex items-center px-1 border outline-none",
                  isEditing ? "bg-indigo-600 border-indigo-700" : "bg-slate-200 border-slate-300"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                  isEditing ? "translate-x-5.5" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* Reset to Default Template */}
            <button
              type="button"
              onClick={handleResetToDefault}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 py-2.5 rounded-xl text-xs font-bold transition-all outline-none"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset to Base Template
            </button>

            {/* Divider */}
            <div className="h-[1px] bg-slate-200/80 my-2" />

            {/* Action Buttons */}
            <div className="space-y-2.5 mt-auto">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-50 outline-none"
                >
                  <Download className="w-4 h-4" />
                  PDF File
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all outline-none"
                >
                  <Printer className="w-4 h-4" />
                  Print Out
                </button>
              </div>

              {mode === 'employee' ? (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-3 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 outline-none"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving to Vault...' : 'Save to Digital Vault'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-3 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 outline-none"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving Draft...' : 'Save Offer Draft'}
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
