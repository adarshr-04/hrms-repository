
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm, FieldError, UseFormRegisterReturn } from "react-hook-form";
import { 
  Save, User, Lightbulb, Loader2, Camera, ChevronDown, ArrowRight, MapPin, Mail, Phone, Briefcase, FileSpreadsheet, Download, Upload, Building2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { employeeService } from "@/services/employeeService";

/** 
 * TYPES & CONSTANTS
 */
interface EmployeeFormData {
  full_name: string;
  email: string;
  alternative_email?: string;
  phone_number: string;
  alternative_phone_number?: string;
  date_of_birth: string;
  employee_id: string;
  job_title: string;
  department: string;
  branch: string;
  current_address: string;
  permanent_address: string;
  hire_date: string;
  end_date?: string;
  status: string;
}

const VALIDATION_RULES = {
  email: {
    required: "Primary email is required",
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: "Invalid email address format"
    }
  },
  phone: {
    required: "Phone number is required",
    pattern: {
      value: /^[0-9+() -]{10,15}$/,
      message: "Please enter a valid phone number (10-15 digits)"
    }
  },
  dob: {
    validate: (value: string) => {
      if (!value) return true; // Optional field
      const date = new Date(value);
      const now = new Date();
      return date < now || "Date of birth cannot be in the future";
    }
  },
  optionalEmail: {
    validate: (value?: string) => {
      if (!value) return true; // Optional field
      return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value) || "Invalid email address format";
    }
  },
  optionalPhone: {
    validate: (value?: string) => {
      if (!value) return true; // Optional field
      return /^[0-9+() -]{10,15}$/.test(value) || "Please enter a valid phone number (10-15 digits)";
    }
  }
};

/** 
 * MAIN COMPONENT 
 */
export default function AddEmployeePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  const { register, handleSubmit, setError, formState: { errors } } = useForm<EmployeeFormData>({
    defaultValues: {
      full_name: "", email: "", alternative_email: "",
      phone_number: "", alternative_phone_number: "",
      date_of_birth: "", employee_id: "", job_title: "",
      department: "", branch: "", current_address: "", permanent_address: "",
      hire_date: "", end_date: "",
      status: "ACTIVE",
    },
  });

  // Load Dynamic Data from Backend
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [depts, branchesData, desigData] = await Promise.all([
          employeeService.getDepartments(),
          employeeService.getBranches?.() || Promise.resolve([]),
          employeeService.getDesignations()
        ]);
        setDepartments(depts.map((d) => ({ label: d.department_name, value: d.id })));
        if (branchesData && Array.isArray(branchesData)) {
          setBranches(branchesData.map((b: any) => ({ label: b.name, value: b.id })));
        }
        if (desigData && Array.isArray(desigData)) {
          setDesignations(desigData.map((d: any) => ({ label: d.title, value: d.title })));
        }
      } catch (error) {
        console.error("Failed to load organizational data", error);
        toast.error("Could not load departments, branches or designations");
      } finally {
        setFetchingData(false);
      }
    }
    loadInitialData();
  }, []);

  const onSubmit = async (data: EmployeeFormData) => {
    setLoading(true);
    try {
      const nameParts = (data.full_name || "").trim().split(/\s+/);
      const formData = new FormData();
      
      // Ensure we have at least a first name
      const firstName = nameParts[0] || "Employee";
      const lastName = nameParts.slice(1).join(" ") || "";

      formData.append("first_name", firstName);
      if (lastName) formData.append("last_name", lastName);
      
      // Append all other fields except full_name
      Object.keys(data).forEach(key => {
        const val = (data as any)[key];
        if (key !== "full_name" && val !== undefined && val !== null && val !== "") {
          formData.append(key, val);
        }
      });

      // Append Avatar File if exists
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      await employeeService.create(formData);
      toast.success("Employee onboarded successfully");
      navigate("/employees");
    } catch (error: any) {
      console.error("Submission Error Response:", error.response?.data);
      console.error("Error data type:", typeof error.response?.data);
      
      if (error.response?.data) {
        const serverErrors = error.response.data;
        
        // Handle case where backend returns a plain string
        if (typeof serverErrors === 'string') {
          toast.error(serverErrors, { duration: 8000 });
        } else if (typeof serverErrors === 'object') {
          const errorMessages: string[] = [];
          
          // Map backend errors to specific form fields
          Object.entries(serverErrors).forEach(([key, value]) => {
            const message = Array.isArray(value) ? value[0] : value;
            const msgStr = String(message);
            
            // Map backend field names to frontend form keys
            let fieldKey: any = key;
            if (key === 'first_name' || key === 'last_name') fieldKey = 'full_name';
            
            // Collect all error messages for display
            const fieldLabel = key === 'non_field_errors' ? '' : `${key}: `;
            errorMessages.push(`${fieldLabel}${msgStr}`);
            
            // Try to set form field error for highlighting
            try {
              setError(fieldKey, {
                type: 'server',
                message: msgStr
              });
            } catch (e) {
              // Field doesn't exist in form
            }
          });

          // Show actual error messages in toast
          if (errorMessages.length > 0) {
            errorMessages.forEach(msg => toast.error(msg, { duration: 8000 }));
          } else {
            toast.error("An unknown error occurred.");
          }
        } else {
          toast.error("An unexpected error occurred.");
        }
      } else {
        toast.error("Network error or server is down.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const result = await employeeService.bulkImport(file);
      toast.success(result.message || "Bulk import completed");
      if (result.errors?.length > 0) {
        console.warn("Import errors:", result.errors);
        toast.warning(`Some rows were skipped (${result.errors.length} errors)`);
      }
      navigate("/employees");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Bulk import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const csvContent = "first_name,last_name,email,employee_id,job_title,department,branch,phone_number,hire_date,date_of_birth\nJohn,Doe,john@example.com,EMP-1001,Developer,IT & Development,Delhi,9876543210,2024-01-01,1990-05-15";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-[1300px] mx-auto px-4 py-8">
      <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-8 transition-all", loading && "pointer-events-none opacity-70")}>
        
        {/* HEADER */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Employee</h1>
          <p className="text-sm font-medium text-slate-500 font-medium">Configure professional profile and organizational assignment.</p>
        </div>

        {/* MAIN CARD */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
          <div className="p-8 md:p-12">
            <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
              
              {/* LEFT COLUMN: PRIMARY INFO */}
              <div className="space-y-12 lg:col-span-8">
                
                {/* Personal Section */}
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-indigo-600 uppercase tracking-[0.15em] flex items-center gap-2">
                    <User className="w-4 h-4" /> Personal Information
                  </h3>
                  <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
                    <FormInput 
                      label="Full Name" 
                      required 
                      maxLength={50}
                      placeholder="e.g. Rounak Kumar S" 
                      error={errors.full_name} 
                      registration={register("full_name", { required: "Full name is required", maxLength: 50 })} 
                    />
                    <FormInput label="Date of Birth" type="date" error={errors.date_of_birth} registration={register("date_of_birth", VALIDATION_RULES.dob)} />
                    
                    <FormInput label="Primary Email" required type="email" placeholder="rounak@company.com" error={errors.email} registration={register("email", VALIDATION_RULES.email)} />
                    <FormInput label="Alternative Email" type="email" placeholder="rounak.alt@gmail.com" error={errors.alternative_email} registration={register("alternative_email", VALIDATION_RULES.optionalEmail)} />
                    
                    <FormInput label="Primary Mobile" required placeholder="9876543210" error={errors.phone_number} registration={register("phone_number", VALIDATION_RULES.phone)} />
                    <FormInput label="Alternative Mobile" placeholder="9876543211" error={errors.alternative_phone_number} registration={register("alternative_phone_number", VALIDATION_RULES.optionalPhone)} />
                  </div>
                </div>

                {/* Role Section */}
                <div className="space-y-6 pt-4">
                  <h3 className="text-sm font-black text-indigo-600 uppercase tracking-[0.15em] flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Employment Details
                  </h3>
                  <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
                    <FormInput
                      label="Employee ID"
                      placeholder="Leave blank for auto-gen"
                      error={errors.employee_id}
                      registration={register("employee_id")}
                      rightIcon={<div className="px-3 py-1 bg-indigo-50 text-[10px] font-black text-indigo-600 rounded-full uppercase tracking-tighter">Auto-Gen</div>}
                    />
                    <FormSelect
                      label="Department"
                      required
                      options={[{label: "Select Department", value: ""}, ...departments]}
                      registration={register("department", { required: "Required" })}
                      loading={fetchingData}
                      error={errors.department}
                    />
                    <FormSelect
                      label="Branch"
                      options={[{label: "Select Branch", value: ""}, ...branches]}
                      registration={register("branch")}
                      loading={fetchingData}
                      error={errors.branch}
                    />
                    <FormSelect
                      label="Job Designation"
                      options={[{ label: "Select Designation", value: "" }, ...designations]}
                      registration={register("job_title")}
                      loading={fetchingData}
                      error={errors.job_title}
                    />
                    <FormInput label="Hire Date" type="date" registration={register("hire_date")} />
                    <FormInput label="End Date" type="date" registration={register("end_date")} />
                  </div>
                </div>

                {/* Address Section */}
                <div className="space-y-6 pt-4">
                  <h3 className="text-sm font-black text-indigo-600 uppercase tracking-[0.15em] flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Location Information
                  </h3>
                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-2">
                      <label className="ml-1 text-[13px] font-bold uppercase tracking-wider text-slate-600">Current Address</label>
                      <textarea rows={2} {...register("current_address")} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 font-medium text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-500 focus:bg-white" placeholder="Enter residential address..." />
                    </div>
                    <div className="space-y-2">
                      <label className="ml-1 text-[13px] font-bold uppercase tracking-wider text-slate-600">Permanent Address</label>
                      <textarea rows={2} {...register("permanent_address")} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 font-medium text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-500 focus:bg-white" placeholder="Enter permanent address as per ID..." />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: AVATAR & TOOLS */}
              <div className="lg:col-span-4 space-y-12">
                <div className="flex flex-col items-center">
                  <label htmlFor="avatar-upload" className="group relative flex aspect-square w-full max-w-[220px] cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-full border-2 border-dashed border-slate-200 bg-slate-50 shadow-inner transition-all hover:border-indigo-300 hover:bg-indigo-50">
                    <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-300 shadow-lg transition-all group-hover:scale-110 group-hover:text-indigo-400">
                          <Camera className="h-8 w-8" />
                        </div>
                        <div className="px-4 text-center">
                          <p className="text-xs font-bold text-slate-500 group-hover:text-indigo-600">Staff Photo</p>
                          <p className="mt-1 text-[9px] font-medium uppercase tracking-widest text-slate-400 italic">Click to upload</p>
                        </div>
                      </>
                    )}
                  </label>
                </div>

                {/* Bulk Tools Section */}
                <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Excel Operations</span>
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={downloadTemplate}
                    className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>Download Template</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                  >
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-emerald-600" />}
                    <span>{importing ? "Importing..." : "Bulk Import Staff"}</span>
                  </button>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                    onChange={handleBulkImport}
                  />

                  <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed italic px-2">
                    Upload employee data in bulk using our standard spreadsheet template.
                  </p>
                </div>

                {/* Info Card */}
                <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex gap-4">
                  <Lightbulb className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-indigo-900 mb-1">Quick Tip</p>
                    <p className="text-[11px] leading-relaxed text-indigo-700 font-medium">Ensure all email addresses are unique across the organization to avoid onboarding conflicts.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-end gap-6 border-t border-slate-100 bg-slate-50/80 px-12 py-8">
            <button type="button" onClick={() => navigate(-1)} className="text-sm font-bold text-slate-400 transition-colors hover:text-slate-700">Cancel</button>
            <div className="flex items-center gap-4">
              <button type="submit" disabled={loading} className="group flex h-12 items-center gap-3 rounded-xl bg-indigo-600 px-8 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Confirm Onboarding
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/** 
 * SUB-COMPONENTS 
 */
function FormInput({ label, required, type = "text", placeholder, error, registration, rightIcon, maxLength }: any) {
  return (
    <div className="space-y-2">
      <label className="ml-1 text-[13px] font-bold uppercase tracking-wider text-slate-600">{label} {required && <span className="ml-1 text-rose-500">*</span>}</label>
      <div className="relative">
        <input type={type} placeholder={placeholder} maxLength={maxLength} {...registration} className={cn("h-12 w-full rounded-xl border bg-slate-50 px-4 font-medium text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-300 focus:bg-white focus:border-indigo-500", rightIcon && "pr-14", error ? "border-rose-300 focus:border-rose-500" : "border-slate-200")} />
        {rightIcon && <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightIcon}</div>}
      </div>
      {error && <p className="ml-1 text-[11px] font-bold text-rose-500 mt-1">{error.message}</p>}
    </div>
  );
}

function FormSelect({ label, required, error, registration, options, loading }: any) {
  return (
    <div className="space-y-2">
      <label className="ml-1 text-[13px] font-bold uppercase tracking-wider text-slate-600">{label} {required && <span className="ml-1 text-rose-500">*</span>}</label>
      <div className="relative">
        <select {...registration} disabled={loading} className={cn("h-12 w-full appearance-none rounded-xl border bg-slate-50 px-4 font-medium text-slate-700 shadow-sm outline-none transition-all focus:bg-white focus:border-indigo-500 disabled:opacity-50", error ? "border-rose-300 focus:border-rose-500" : "border-slate-200")}>
          {loading ? <option>Loading...</option> : options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {error && <p className="ml-1 text-[11px] font-bold text-rose-500 mt-1">{error.message}</p>}
    </div>
  );
}