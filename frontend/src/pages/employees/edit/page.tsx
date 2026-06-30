
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Loader2,
  Image as ImageIcon,
  ShieldCheck,
  X,
  FileText,
  MapPinHouse,
  Contact
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { employeeService } from '@/services/employeeService';
import { toast } from 'sonner';

import { Employee, Department } from '@/types';

export default function EditEmployee() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);

  const { register, handleSubmit, setValue, watch, formState: { errors }, setError } = useForm();

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [depts, desigs, currentEmp, branchesData] = await Promise.all([
        employeeService.getDepartments(),
        employeeService.getDesignations(),
        employeeService.getById(id as string),
        employeeService.getBranches?.() || Promise.resolve([])
      ]);

      setDepartments(depts);
      if (branchesData && Array.isArray(branchesData)) {
        setBranches(branchesData);
      }
      if (desigs && Array.isArray(desigs)) {
        setDesignations(desigs);
      }

      // Pre-fill the form with COMPLETE employee data
      const data = currentEmp;
      Object.keys(data).forEach(key => {
        if (key === 'avatar' && (data as any)[key]) {
          const baseUrl = (import.meta as any).env.VITE_API_URL?.replace('/api', '') || '';
          setAvatarPreview(`${baseUrl}${(data as any)[key]}`);
        } else {
          setValue(key as any, (data as any)[key]);
        }
      });

    } catch (error) {
      console.error("Failed to load edit data", error);
      toast.error("Failed to load personnel data");
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
      setValue('avatar', file);
    }
  };

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (key === 'avatar') {
          if (data[key] instanceof File) {
            formData.append('avatar', data[key]);
          }
        } else if (data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      });

      await employeeService.update(id as string, formData);
      toast.success("Personnel record updated successfully");
      navigate(`/employees/details?id=${id}`);
    } catch (error: any) {
      console.error("Update failed", error);
      if (error.response?.data) {
        const backendErrors = error.response.data;
        Object.keys(backendErrors).forEach((key) => {
          setError(key, { type: 'manual', message: backendErrors[key] });
        });
        toast.error("Validation failed. Please check the form.");
      } else {
        toast.error("Failed to update record.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
        <p className="text-[10px] font-bold tracking-[0.4em] text-slate-400 uppercase">Syncing Dossier...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 bg-[#FAFAFA] min-h-screen -m-6 p-10">
      <div className="flex items-center justify-between">
        <Link to={`/employees/details?id=${id}`} className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Exit Edit Mode</span>
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Modify Personnel Dossier</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="space-y-8">
          <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 text-center space-y-6 shadow-sm">
            <div className="relative inline-block mx-auto">
              <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden bg-slate-50 border-4 border-white shadow-xl group relative">
                {avatarPreview ? (
                  <img src={avatarPreview} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200 text-6xl font-extralight italic">
                    {watch('first_name')?.[0] || 'U'}
                  </div>
                )}
                <label className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <ImageIcon className="w-6 h-6 text-white mb-2" />
                  <span className="text-[8px] font-bold text-white uppercase tracking-widest">Change Profile Image</span>
                  <input type="file" className="hidden" accept="image/*" onChange={onAvatarChange} />
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold text-slate-900 tracking-tight">{watch('first_name')} {watch('last_name')}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{watch('employee_id')}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-12">
          {/* Identity */}
          <FormSection title="Legal Identity" icon={<User className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormInput label="First Name" name="first_name" register={register} error={errors.first_name} required />
              <FormInput label="Last Name" name="last_name" register={register} error={errors.last_name} required />
              <FormInput label="Date of Birth" name="date_of_birth" type="date" register={register} error={errors.date_of_birth} />
              <FormInput label="Unique Employee ID" name="employee_id" register={register} error={errors.employee_id} required readOnly />
            </div>
          </FormSection>

          {/* Contact */}
          <FormSection title="Communications" icon={<Contact className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormInput label="Corporate Email" name="email" type="email" register={register} error={errors.email} required />
              <FormInput label="Primary Mobile" name="phone_number" register={register} error={errors.phone_number} />
              <FormInput label="Alternative Email" name="alternative_email" type="email" register={register} error={errors.alternative_email} />
              <FormInput label="Emergency Contact" name="alternative_phone_number" register={register} error={errors.alternative_phone_number} />
            </div>
          </FormSection>

          {/* Org */}
          <FormSection title="Organizational Flow" icon={<Briefcase className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Designation</label>
                <select {...register('designation')} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none">
                  <option value="">Select Designation</option>
                  {designations.map((d: any) => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Unit</label>
                <select {...register('department')} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none">
                  <option value="">Select Department</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Assigned Branch</label>
                <select {...register('branch')} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none">
                  <option value="">Select Branch</option>
                  {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <FormInput label="Commission Date (Hire Date)" name="hire_date" type="date" register={register} error={errors.hire_date} />
              <FormInput label="End Date" name="end_date" type="date" register={register} error={errors.end_date} />
            </div>
          </FormSection>

          {/* Residence */}
          <FormSection title="Residential Logistics" icon={<MapPinHouse className="w-3.5 h-3.5" />}>
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Physical Address</label>
                <textarea {...register('current_address')} rows={3} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Permanent Registry Address</label>
                <textarea {...register('permanent_address')} rows={3} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none" />
              </div>
            </div>
          </FormSection>

          <div className="flex items-center justify-end gap-4 pt-10 border-t border-slate-200/60">
            <Link to={`/employees/details?id=${id}`} className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Discard Modifications</Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-3 px-12 py-3 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              <span>Synchronize Records</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function FormSection({ title, icon, children }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 ml-1">
        <span className="text-slate-300">{icon}</span>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{title}</h3>
      </div>
      <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-10 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function FormInput({ label, name, register, error, type = "text", required = false, readOnly = false }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        type={type}
        {...register(name, { required })}
        readOnly={readOnly}
        className={cn(
          "w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/5 transition-all",
          error && "border-rose-200 bg-rose-50/30 text-rose-900",
          readOnly && "opacity-60 cursor-not-allowed"
        )}
      />
      {error && <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mt-1 ml-1">{error.message || 'Required'}</p>}
    </div>
  );
}
