
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  ArrowRight, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { leaveService } from '@/services/leaveService';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function LeavesPage() {
  const { user, isAdmin, isHR, isManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('PENDING');

  // Request Leave Modal States
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: 'CASUAL',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    if (diff < 0) return 0;
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params: any = { status: activeTab === 'ALL' ? undefined : activeTab };
      
      // If not admin/HR/manager, only fetch current user's leaves
      if (!isAdmin && !isHR && !isManager && user?.employee_profile_id) {
        params.employee = user.employee_profile_id;
      }
      
      const data = await leaveService.getAll(params);
      setLeaves(data.results || data);
    } catch (error) {
      console.error("Failed to fetch leaves", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employee_profile_id) {
      toast.error("Employee profile not found.");
      return;
    }
    const days = calculateDays(formData.start_date, formData.end_date);
    if (days <= 0) {
      toast.error("End date must be on or after start date.");
      return;
    }

    setSubmitting(true);
    try {
      await leaveService.create({
        employee: user.employee_profile_id,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        total_days: days,
        reason: formData.reason,
        status: 'PENDING'
      });
      toast.success("Leave request submitted successfully!");
      setShowModal(false);
      setFormData({
        leave_type: 'CASUAL',
        start_date: '',
        end_date: '',
        reason: ''
      });
      void fetchLeaves();
    } catch (error: any) {
      console.error("Failed to request leave", error);
      const errMsg = error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || "Failed to submit request.";
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };


  useEffect(() => {
    fetchLeaves();
  }, [activeTab, isAdmin, isHR, isManager]);

  const handleStatusUpdate = async (id: any, status: any) => {
    try {
      await leaveService.updateStatus(id, status);
      fetchLeaves(); // Refresh list
    } catch (error) {
      console.error("Failed to update leave status", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isAdmin || isHR || isManager ? 'Leave Management' : 'My Leave Requests'}
          </h1>
          <p className="text-slate-500">
            {isAdmin || isHR || isManager ? 'Approve or manage employee time-off requests.' : 'Track and manage your time-off applications.'}
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-sm"
        >
          <FileText className="w-4 h-4" />
          <span>Request Leave</span>
        </button>

      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === tab 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            )}
          >
            {tab === 'ALL' ? 'History' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Requests Grid/List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-slate-500 font-medium">Syncing requests...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">No {activeTab.toLowerCase()} requests</p>
              <p className="text-sm text-slate-500">Everything is up to date! There are no records to show here.</p>
            </div>
          </div>
        ) : (
          leaves.map((leave) => (
            <div 
              key={leave.id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-6"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold uppercase">
                  {leave.employee_name?.split(' ').map((n: any) => n[0]).join('') || '??'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{leave.employee_name}</h4>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{leave.leave_type} LEAVE</p>
                </div>
              </div>

              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{format(new Date(leave.start_date), 'MMM d')}</span>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <span className="font-medium">{format(new Date(leave.end_date), 'MMM d, yyyy')}</span>
                </div>
                <p className="text-xs text-slate-400 font-medium">{leave.total_days} day(s) requested</p>
              </div>

              <div className="flex-1 max-w-md">
                <p className="text-sm text-slate-600 line-clamp-2 italic">
                  &ldquo;{leave.reason}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {leave.status === 'PENDING' && (isAdmin || isHR || isManager) && leave.employee !== user?.employee_profile_id ? (
                  <>
                    <button 
                      onClick={() => handleStatusUpdate(leave.id, 'REJECTED')}
                      className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(leave.id, 'APPROVED')}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm shadow-emerald-200"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </button>
                  </>
                ) : (
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                    leave.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                    leave.status === 'REJECTED' ? "bg-red-50 text-red-700 border-red-100" :
                    "bg-amber-50 text-amber-700 border-amber-100"
                  )}>
                    {leave.status}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Leave Request Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Request Leave</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Leave Type</label>
                <select 
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 bg-white"
                  required
                >
                  <option value="SICK">Sick Leave</option>
                  <option value="CASUAL">Casual Leave</option>
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="MATERNITY">Maternity Leave</option>
                  <option value="PATERNITY">Paternity Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                  <input 
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Date</label>
                  <input 
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600"
                    required
                  />
                </div>
              </div>

              {formData.start_date && formData.end_date && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700 font-medium">
                  Total duration: {calculateDays(formData.start_date, formData.end_date)} day(s)
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reason</label>
                <textarea 
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Explain the reason for your time-off request..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 h-24 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-bold text-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-bold transition-all shadow-sm shadow-indigo-100"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Request</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
