import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Lock, 
  Settings as SettingsIcon, 
  Globe, 
  Bell, 
  Upload, 
  Trash2, 
  Loader2, 
  Save, 
  ShieldCheck, 
  Palette,
  Eye,
  EyeOff,
  Building,
  Plus,
  Edit
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { profileService, ProfileData } from '@/services/profileService';
import { employeeService } from '@/services/employeeService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'company'>('profile');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Profile Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [altEmail, setAltEmail] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  
  // Avatar uploading
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Preferences States (mock/local storage sync)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    performanceReminders: true,
    leaveApprovalNotifs: true,
  });

  // Company Settings
  const [company, setCompany] = useState({
    name: 'HRMS Enterprise',
    workingHours: '09:00 - 18:00',
    timeZone: 'UTC',
    leavePolicy: 'Standard 24 Days'
  });

  // Org lists states
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [designationsList, setDesignationsList] = useState<any[]>([]);

  // Loading states for lists
  const [loadingOrgData, setLoadingOrgData] = useState(false);

  // Form states for adding/editing inline
  const [editingDeptId, setEditingDeptId] = useState<string | number | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');
  const [editingDeptDesc, setEditingDeptDesc] = useState('');

  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  const [editingBranchId, setEditingBranchId] = useState<string | number | null>(null);
  const [editingBranchName, setEditingBranchName] = useState('');
  const [editingBranchAddr, setEditingBranchAddr] = useState('');

  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddr, setNewBranchAddr] = useState('');

  const [editingDesigId, setEditingDesigId] = useState<string | number | null>(null);
  const [editingDesigTitle, setEditingDesigTitle] = useState('');

  const [newDesigTitle, setNewDesigTitle] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await profileService.getProfile();
      setProfile(data);
      
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setEmail(data.email || '');
      setPhone(data.phone_number || '');
      setAltEmail(data.alternative_email || '');
      setAltPhone(data.alternative_phone_number || '');
      setCurrentAddress(data.current_address || '');
      setPermanentAddress(data.permanent_address || '');
      
      if (data.avatar) {
        // Handle absolute vs relative URL
        const backendBase = (import.meta as any).env.VITE_API_URL?.replace('/api', '') || '';
        setAvatarPreview(data.avatar.startsWith('http') ? data.avatar : `${backendBase}${data.avatar}`);
      } else {
        setAvatarPreview(null);
      }
    } catch (error) {
      console.error('Failed to load profile details', error);
      toast.error('Could not sync profile settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgData = async () => {
    setLoadingOrgData(true);
    try {
      const [depts, branchesData, desigs] = await Promise.all([
        employeeService.getDepartments(),
        employeeService.getBranches(),
        employeeService.getDesignations()
      ]);
      setDepartmentsList(depts);
      setBranchesList(branchesData);
      setDesignationsList(desigs);
    } catch (error) {
      console.error('Failed to load organizational config data', error);
      toast.error('Failed to load department, branch or designation configuration.');
    } finally {
      setLoadingOrgData(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // Load local preferences
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) setTheme(savedTheme);
    
    // Load company settings if admin
    if (isAdmin) {
      fetchOrgData();
      const savedCompany = localStorage.getItem('companySettings');
      if (savedCompany) {
        try {
          setCompany(JSON.parse(savedCompany));
        } catch {
          toast.error('Saved company settings could not be loaded.');
        }
      }
    }
  }, [isAdmin]);

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return toast.error('Department name is required');
    try {
      await employeeService.createDepartment({ department_name: newDeptName, description: newDeptDesc });
      toast.success('Department created successfully');
      setNewDeptName('');
      setNewDeptDesc('');
      fetchOrgData();
    } catch (err) {
      toast.error('Failed to create department');
    }
  };

  const handleUpdateDept = async (id: number | string) => {
    if (!editingDeptName.trim()) return toast.error('Department name is required');
    try {
      await employeeService.updateDepartment(id, { department_name: editingDeptName, description: editingDeptDesc });
      toast.success('Department updated successfully');
      setEditingDeptId(null);
      fetchOrgData();
    } catch (err) {
      toast.error('Failed to update department');
    }
  };

  const handleDeleteDept = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await employeeService.deleteDepartment(id);
      toast.success('Department deleted successfully');
      fetchOrgData();
    } catch (err) {
      toast.error('Failed to delete department');
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return toast.error('Branch name is required');
    try {
      await employeeService.createBranch({ name: newBranchName, address: newBranchAddr });
      toast.success('Branch created successfully');
      setNewBranchName('');
      setNewBranchAddr('');
      fetchOrgData();
    } catch (err) {
      toast.error('Failed to create branch');
    }
  };

  const handleUpdateBranch = async (id: number | string) => {
    if (!editingBranchName.trim()) return toast.error('Branch name is required');
    try {
      await employeeService.updateBranch(id, { name: editingBranchName, address: editingBranchAddr });
      toast.success('Branch updated successfully');
      setEditingBranchId(null);
      fetchOrgData();
    } catch (err) {
      toast.error('Failed to update branch');
    }
  };

  const handleDeleteBranch = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;
    try {
      await employeeService.deleteBranch(id);
      toast.success('Branch deleted successfully');
      fetchOrgData();
    } catch (err) {
      toast.error('Failed to delete branch');
    }
  };

  const handleAddDesig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesigTitle.trim()) return toast.error('Designation title is required');
    try {
      await employeeService.createDesignation({ title: newDesigTitle });
      toast.success('Designation created successfully');
      setNewDesigTitle('');
      fetchOrgData();
    } catch (err) {
      toast.error('Failed to create designation');
    }
  };

  const handleUpdateDesig = async (id: number | string) => {
    if (!editingDesigTitle.trim()) return toast.error('Designation title is required');
    try {
      await employeeService.updateDesignation(id, { title: editingDesigTitle });
      toast.success('Designation updated successfully');
      setEditingDesigId(null);
      fetchOrgData();
    } catch (err) {
      toast.error('Failed to update designation');
    }
  };

  const handleDeleteDesig = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this designation?')) return;
    try {
      await employeeService.deleteDesignation(id);
      toast.success('Designation deleted successfully');
      fetchOrgData();
    } catch (err) {
      toast.error('Failed to delete designation');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('email', email);
      formData.append('phone_number', phone);
      formData.append('alternative_email', altEmail);
      formData.append('alternative_phone_number', altPhone);
      formData.append('current_address', currentAddress);
      formData.append('permanent_address', permanentAddress);
      
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      } else if (avatarPreview === null && profile?.avatar) {
        // Explicitly set empty to delete avatar
        formData.append('avatar', '');
      }

      const updated = await profileService.updateProfile(formData);
      setProfile(updated);
      toast.success('Profile details saved successfully!');
      
      // Update global context/state name if applicable
      // In a real application, we might refresh AuthContext here.
    } catch (error: any) {
      console.error('Failed to update profile', error);
      const fieldErrors = error.response?.data;
      if (fieldErrors && typeof fieldErrors === 'object') {
        Object.entries(fieldErrors).forEach(([field, msgs]: any) => {
          toast.error(`${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`);
        });
      } else {
        toast.error('Failed to update profile settings');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match!');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    setSavingPassword(true);
    try {
      await profileService.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error', error);
      const msg = error.response?.data?.current_password || error.response?.data?.error || 'Password update failed';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast.success(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} theme!`);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('theme', theme);
    // Apply theme preference to document classlist for real-time toggle
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast.success('System preferences stored locally!');
  };

  const handleSaveCompany = () => {
    localStorage.setItem('companySettings', JSON.stringify(company));
    // Dispatch a storage event so same-tab listeners (e.g. Sidebar) pick up the change immediately
    window.dispatchEvent(new StorageEvent('storage', { key: 'companySettings' }));
    toast.success('Company configuration updated!');
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-slate-500 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="font-bold text-sm uppercase tracking-widest text-slate-400">Syncing settings panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header Info Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-slate-200/50">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500 rounded-full blur-[100px] opacity-10 -ml-20 -mb-20" />
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center shadow-lg">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-slate-500" />
              )}
            </div>
          </div>

          <div className="text-center md:text-left space-y-1">
            <h1 className="text-2xl font-black tracking-tight">{firstName} {lastName}</h1>
            <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest">{profile?.role?.replace('_', ' ')}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 text-slate-400 text-xs font-semibold pt-2">
              {profile?.employee_id && (
                <span>ID: <strong className="text-slate-200">{profile.employee_id}</strong></span>
              )}
              {profile?.department && (
                <span>Department: <strong className="text-slate-200">{profile.department}</strong></span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* Left Side Tab Navigation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm space-y-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'profile'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile Data</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'security'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Security</span>
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'preferences'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Preferences</span>
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setActiveTab('company')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'company'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Company Config</span>
            </button>
          )}
        </div>

        {/* Right Side Content Panel */}
        <div className="md:col-span-3 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-black text-slate-900">Personal Information</h2>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Update your primary profile parameters and upload visual avatar files.</p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Photo Upload Section */}
                  <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Avatar</span>
                        </button>
                        {avatarPreview && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="p-1.5 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 rounded-lg text-slate-500 hover:text-rose-600 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold">Accepted: PNG, JPG, GIF. Max Size: 2MB.</p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Primary Name Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">First Name</label>
                      <input
                        required
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                  </div>

                  {/* Contact Info Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Corporate Email</label>
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alternative Email</label>
                      <input
                        type="email"
                        value={altEmail}
                        onChange={(e) => setAltEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alternative Phone Number</label>
                      <input
                        type="text"
                        value={altPhone}
                        onChange={(e) => setAltPhone(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                  </div>

                  {/* Address Details */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Address</label>
                    <textarea
                      rows={2}
                      value={currentAddress}
                      onChange={(e) => setCurrentAddress(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Permanent Address</label>
                    <textarea
                      rows={2}
                      value={permanentAddress}
                      onChange={(e) => setPermanentAddress(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-100"
                    >
                      {savingProfile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-black text-slate-900">Account Credentials</h2>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Change your login password and review authentication policies.</p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Password</label>
                    <div className="relative">
                      <input
                        required
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Password</label>
                    <div className="relative">
                      <input
                        required
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">Must be at least 8 characters.</p>
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirm New Password</label>
                    <div className="relative">
                      <input
                        required
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3 mt-4">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Secure Storage</h4>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-1 leading-relaxed">
                        Passwords are systematically hashed on our database using PBKDF2 with SHA-256 encryption. We never store raw credentials.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-100"
                    >
                      {savingPassword ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Update Password</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'preferences' && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-black text-slate-900">System Preferences</h2>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Configure interface visuals and notification alerts.</p>
                </div>

                <div className="space-y-6">
                  {/* Theme Mode Toggle */}
                  <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Interface Display</h4>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">Toggle visual elements of the workspace dashboard.</p>
                    </div>
                    <div className="flex bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleThemeChange('light')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          theme === 'light'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        ☀️ Light
                      </button>
                      <button
                        type="button"
                        onClick={() => handleThemeChange('dark')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        🌙 Dark
                      </button>
                    </div>
                  </div>

                  {/* Language Selection */}
                  <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-indigo-500" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Primary Language</h4>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">Default translation context mapping.</p>
                      </div>
                    </div>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="en">English (US)</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>

                  {/* Notification switches */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <Bell className="w-4.5 h-4.5 text-indigo-500" />
                      <span>Notifications Center</span>
                    </h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-150 transition-all cursor-pointer">
                        <div>
                          <p className="text-xs font-bold text-slate-700">Email Alerts</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Receive monthly payslips and review requests via corporate email.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.emailAlerts}
                          onChange={(e) => setNotifications({...notifications, emailAlerts: e.target.checked})}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-150 transition-all cursor-pointer">
                        <div>
                          <p className="text-xs font-bold text-slate-700">Performance Evaluators</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Alert when reviews are generated by Department Managers.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.performanceReminders}
                          onChange={(e) => setNotifications({...notifications, performanceReminders: e.target.checked})}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-150 transition-all cursor-pointer">
                        <div>
                          <p className="text-xs font-bold text-slate-700">Leave Approvals</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Push alerts when requests are processed by HR team.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.leaveApprovalNotifs}
                          onChange={(e) => setNotifications({...notifications, leaveApprovalNotifs: e.target.checked})}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      onClick={handleSavePreferences}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-100"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence mode="wait">
            {activeTab === 'company' && isAdmin && (
              <motion.div
                key="company"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-black text-slate-900">Company Configuration</h2>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Manage global enterprise settings (Admin only).</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enterprise Name</label>
                      <input
                        type="text"
                        value={company.name}
                        onChange={(e) => setCompany({...company, name: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Working Hours</label>
                      <input
                        type="text"
                        value={company.workingHours}
                        onChange={(e) => setCompany({...company, workingHours: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Timezone</label>
                      <select
                        value={company.timeZone}
                        onChange={(e) => setCompany({...company, timeZone: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                      >
                        <option value="UTC">UTC</option>
                        <option value="PST">PST</option>
                        <option value="EST">EST</option>
                        <option value="IST">IST</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Leave Policy Framework</label>
                      <input
                        type="text"
                        value={company.leavePolicy}
                        onChange={(e) => setCompany({...company, leavePolicy: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      onClick={handleSaveCompany}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-100"
                    >
                      <Save className="w-4 h-4" />
                      <span>Apply Configuration</span>
                    </button>
                  </div>

                  {/* Organizational Management Sections */}
                  <div className="border-t border-slate-100 pt-8 mt-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Organizational Structure</h3>
                        <p className="text-xs text-slate-400 mt-1">Manage your company's departments, branch offices, and job designations.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      
                      {/* DEPARTMENTS CARD */}
                      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col h-[600px]">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                              <Building className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">Departments</h4>
                              <p className="text-[10px] text-slate-400">{departmentsList.length} configured</p>
                            </div>
                          </div>
                        </div>

                        <form onSubmit={handleAddDept} className="space-y-2.5 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 mb-4">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Add New Department</div>
                          <input
                            type="text"
                            placeholder="Department Name (e.g. Sales)"
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            placeholder="Description (Optional)"
                            value={newDeptDesc}
                            onChange={(e) => setNewDeptDesc(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-100 cursor-pointer">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Department</span>
                          </button>
                        </form>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                          {loadingOrgData ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                            </div>
                          ) : departmentsList.length === 0 ? (
                            <div className="text-center py-12 text-xs font-medium text-slate-400">No departments configured yet.</div>
                          ) : (
                            departmentsList.map((dept) => (
                              <div key={dept.id} className="relative pl-4 p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all flex flex-col gap-2 group">
                                <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r-lg" />
                                {editingDeptId === dept.id ? (
                                  <div className="space-y-2 w-full pr-1">
                                    <input
                                      type="text"
                                      value={editingDeptName}
                                      onChange={(e) => setEditingDeptName(e.target.value)}
                                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                                      placeholder="Department Name"
                                    />
                                    <input
                                      type="text"
                                      value={editingDeptDesc}
                                      onChange={(e) => setEditingDeptDesc(e.target.value)}
                                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                                      placeholder="Description"
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button onClick={() => setEditingDeptId(null)} className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-[10px] font-bold">Cancel</button>
                                      <button onClick={() => handleUpdateDept(dept.id)} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold">Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between w-full">
                                    <div className="space-y-0.5">
                                      <div className="text-xs font-bold text-slate-700">{dept.department_name}</div>
                                      {dept.description && <div className="text-[10px] font-medium text-slate-400 line-clamp-2">{dept.description}</div>}
                                    </div>
                                    <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          setEditingDeptId(dept.id);
                                          setEditingDeptName(dept.department_name);
                                          setEditingDeptDesc(dept.description || '');
                                        }}
                                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-all cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => handleDeleteDept(dept.id)} className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 transition-all cursor-pointer">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* BRANCHES CARD */}
                      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col h-[600px]">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                              <Globe className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">Branches</h4>
                              <p className="text-[10px] text-slate-400">{branchesList.length} configured</p>
                            </div>
                          </div>
                        </div>

                        <form onSubmit={handleAddBranch} className="space-y-2.5 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 mb-4">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Add New Branch</div>
                          <input
                            type="text"
                            placeholder="Branch Name (e.g. Delhi Office)"
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            placeholder="Address (Optional)"
                            value={newBranchAddr}
                            onChange={(e) => setNewBranchAddr(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-100 cursor-pointer">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Branch</span>
                          </button>
                        </form>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                          {loadingOrgData ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                            </div>
                          ) : branchesList.length === 0 ? (
                            <div className="text-center py-12 text-xs font-medium text-slate-400">No branches configured yet.</div>
                          ) : (
                            branchesList.map((branch) => (
                              <div key={branch.id} className="relative pl-4 p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all flex flex-col gap-2 group">
                                <div className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r-lg" />
                                {editingBranchId === branch.id ? (
                                  <div className="space-y-2 w-full pr-1">
                                    <input
                                      type="text"
                                      value={editingBranchName}
                                      onChange={(e) => setEditingBranchName(e.target.value)}
                                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                                      placeholder="Branch Name"
                                    />
                                    <input
                                      type="text"
                                      value={editingBranchAddr}
                                      onChange={(e) => setEditingBranchAddr(e.target.value)}
                                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                                      placeholder="Address"
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button onClick={() => setEditingBranchId(null)} className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-[10px] font-bold">Cancel</button>
                                      <button onClick={() => handleUpdateBranch(branch.id)} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold">Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between w-full">
                                    <div className="space-y-0.5">
                                      <div className="text-xs font-bold text-slate-700">{branch.name}</div>
                                      {branch.address && <div className="text-[10px] font-medium text-slate-400 line-clamp-2">{branch.address}</div>}
                                    </div>
                                    <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          setEditingBranchId(branch.id);
                                          setEditingBranchName(branch.name);
                                          setEditingBranchAddr(branch.address || '');
                                        }}
                                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-all cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => handleDeleteBranch(branch.id)} className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 transition-all cursor-pointer">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* DESIGNATIONS CARD */}
                      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col h-[600px]">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                              <User className="w-4 h-4 text-violet-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">Designations</h4>
                              <p className="text-[10px] text-slate-400">{designationsList.length} configured</p>
                            </div>
                          </div>
                        </div>

                        <form onSubmit={handleAddDesig} className="space-y-2.5 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 mb-4">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Add New Designation</div>
                          <input
                            type="text"
                            placeholder="Designation Title (e.g. Lead Dev)"
                            value={newDesigTitle}
                            onChange={(e) => setNewDesigTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-100 cursor-pointer">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Designation</span>
                          </button>
                        </form>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                          {loadingOrgData ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                            </div>
                          ) : designationsList.length === 0 ? (
                            <div className="text-center py-12 text-xs font-medium text-slate-400">No designations configured yet.</div>
                          ) : (
                            designationsList.map((desig) => (
                              <div key={desig.id} className="relative pl-4 p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all flex flex-col gap-2 group">
                                <div className="absolute left-0 top-3 bottom-3 w-1 bg-violet-500 rounded-r-lg" />
                                {editingDesigId === desig.id ? (
                                  <div className="space-y-2 w-full pr-1">
                                    <input
                                      type="text"
                                      value={editingDesigTitle}
                                      onChange={(e) => setEditingDesigTitle(e.target.value)}
                                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                                      placeholder="Designation Title"
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button onClick={() => setEditingDesigId(null)} className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-[10px] font-bold">Cancel</button>
                                      <button onClick={() => handleUpdateDesig(desig.id)} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold">Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between w-full">
                                    <div className="space-y-0.5">
                                      <div className="text-xs font-bold text-slate-700">{desig.title}</div>
                                    </div>
                                    <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          setEditingDesigId(desig.id);
                                          setEditingDesigTitle(desig.title);
                                        }}
                                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-all cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => handleDeleteDesig(desig.id)} className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 transition-all cursor-pointer">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
