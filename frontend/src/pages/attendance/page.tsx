import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Loader2,
  Fingerprint,
  CheckCircle2,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { attendanceService } from '@/services/attendanceService';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface AttendanceRecord {
  id: number;
  employee: number;
  employee_name?: string;
  employee_id?: string;
  branch_name?: string;
  department_name?: string;
  attendance_date: string;
  check_in?: string;
  check_out?: string | null;
  work_hours?: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
  notes?: string;
}

const STATUS_COLOR: Record<string, string> = {
  PRESENT:  'bg-emerald-500',
  LATE:     'bg-amber-500',
  ABSENT:   'bg-rose-500',
  HALF_DAY: 'bg-blue-500',
  ON_LEAVE: 'bg-purple-500',
};

const STATUS_BG: Record<string, string> = {
  PRESENT:  'bg-emerald-50 text-emerald-700 border-emerald-100',
  ABSENT:   'bg-rose-50   text-rose-700   border-rose-100',
  LATE:     'bg-amber-50  text-amber-700  border-amber-100',
  HALF_DAY: 'bg-blue-50   text-blue-700   border-blue-100',
  ON_LEAVE: 'bg-purple-50 text-purple-700 border-purple-100',
};

export default function AttendancePage() {
  const { user, isAdmin, isManager } = useAuth();
  const isHRAdmin = isAdmin;

  const [loading,       setLoading]       = useState(true);
  const [records,       setRecords]       = useState<AttendanceRecord[]>([]);
  const [selectedDate,  setSelectedDate]  = useState(new Date());

  const [tapStatus,  setTapStatus]  = useState<'OFFLINE' | 'TAPPED_IN' | 'TAPPED_OUT'>('OFFLINE');
  const [tapRecord,  setTapRecord]  = useState<AttendanceRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTapping,  setIsTapping]  = useState(false);

  const [searchQ,      setSearchQ]      = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getRunningDuration = () => {
    if (!tapRecord?.check_in) return '00:00:00';
    try {
      const [h, m, s] = tapRecord.check_in.split(':').map(Number);
      const base = new Date(currentTime);
      base.setHours(h, m, s || 0);
      let diff = currentTime.getTime() - base.getTime();
      if (diff < 0) diff = 0;
      const pad = (n: number) => String(n).padStart(2, '0');
      const hrs  = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    } catch { return '00:00:00'; }
  };

  const checkTodayTapStatus = useCallback(async () => {
    const empId = user?.employee_profile_id;
    if (!empId) return;
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const logs = await attendanceService.getAll({ employee: empId, attendance_date: todayStr });
      const rec: AttendanceRecord | undefined = (Array.isArray(logs) ? logs : (logs.results ?? []))[0];
      if (rec) {
        setTapRecord(rec);
        setTapStatus(rec.check_in && !rec.check_out ? 'TAPPED_IN' : rec.check_in ? 'TAPPED_OUT' : 'OFFLINE');
      } else {
        setTapStatus('OFFLINE');
      }
    } catch (err) { console.error(err); }
  }, [user?.employee_profile_id]);

  const getTodayTapRecord = useCallback(async () => {
    const empId = user?.employee_profile_id;
    if (!empId) return null;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const logs = await attendanceService.getAll({ employee: empId, attendance_date: todayStr });
    return (Array.isArray(logs) ? logs : (logs.results ?? []))[0] as AttendanceRecord | undefined || null;
  }, [user?.employee_profile_id]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const params: Record<string, any> = { attendance_date: dateStr };
      if (!isHRAdmin && !isManager && user?.employee_profile_id) {
        params.employee = user.employee_profile_id;
      }
      const data = await attendanceService.getAll(params);
      setRecords(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedDate, isHRAdmin, isManager, user?.employee_profile_id]);

  useEffect(() => { void fetchAttendance(); }, [fetchAttendance]);
  useEffect(() => { void checkTodayTapStatus(); }, [checkTodayTapStatus]);




  const handleTap = async (action: 'IN' | 'OUT') => {
    const empId = user?.employee_profile_id;
    if (!empId) {
      console.log('[handleTap] No employee profile ID found.');
      return;
    }
    setIsTapping(true);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const timeStr  = currentTime.toLocaleTimeString('en-US', { hour12: false });

    try {
      const latestRecord = await getTodayTapRecord();
      const activeRecord = latestRecord || tapRecord;
      const serverStatus: 'OFFLINE' | 'TAPPED_IN' | 'TAPPED_OUT' =
        activeRecord?.check_in && !activeRecord.check_out
          ? 'TAPPED_IN'
          : activeRecord?.check_in
          ? 'TAPPED_OUT'
          : 'OFFLINE';
      const wantsTapOut = action === 'OUT';

      if (wantsTapOut) {
        if (serverStatus === 'TAPPED_OUT') {
          setTapRecord(activeRecord);
          setTapStatus('TAPPED_OUT');
          toast.success('You are already tapped out.');
          await Promise.all([fetchAttendance(), checkTodayTapStatus()]);
          return;
        }

        if (!activeRecord?.id || serverStatus !== 'TAPPED_IN') {
          toast.error('Tap record is missing. Reloading status...');
          await checkTodayTapStatus();
          return;
        }

        const [h, m, s] = (activeRecord.check_in || '09:00:00').split(':').map(Number);
        const diffMs = (currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds()) -
                       (h * 3600 + m * 60 + (s || 0));
        const sessionHours = Math.max(0.0001, Number((diffMs / 3600).toFixed(4)));
        const total = Number((Number(activeRecord.work_hours || 0) + sessionHours).toFixed(2));

        const rec = await attendanceService.updateAttendance(activeRecord.id, {
          check_out: timeStr,
          work_hours: total,
          notes: `${activeRecord.notes || ''}\nTapped Out at ${currentTime.toLocaleTimeString()}. Session: ${sessionHours.toFixed(2)}h | Total: ${total.toFixed(2)}h`,
        });
        setTapRecord(rec);
        setTapStatus('TAPPED_OUT');
        toast.success(`Tapped Out! Total: ${total.toFixed(2)}h`);

      } else {
        if (serverStatus === 'TAPPED_IN') {
          setTapRecord(activeRecord);
          setTapStatus('TAPPED_IN');
          toast.success('You are already tapped in.');
          await Promise.all([fetchAttendance(), checkTodayTapStatus()]);
          return;
        }

        if (serverStatus === 'TAPPED_OUT' && activeRecord?.id) {
          const rec = await attendanceService.updateAttendance(activeRecord.id, {
            check_in: timeStr,
            check_out: null,
            notes: `${activeRecord.notes || ''}\nTapped In at ${currentTime.toLocaleTimeString()}`,
          });
          setTapRecord(rec);
          setTapStatus('TAPPED_IN');
          toast.success('Tapped In! Shift resumed.');
        } else {
          const isLate = currentTime.getHours() > 9 || (currentTime.getHours() === 9 && currentTime.getMinutes() > 30);
          const rec = await attendanceService.logAttendance({
            employee: empId,
            attendance_date: todayStr,
            check_in: timeStr,
            status: isLate ? 'LATE' : 'PRESENT',
            notes: `Tapped In at ${currentTime.toLocaleTimeString()}`,
          });
          setTapRecord(rec);
          setTapStatus('TAPPED_IN');
          toast.success('Tapped In! Shift started.');
        }
      }

      await Promise.all([fetchAttendance(), checkTodayTapStatus()]);
    } catch (err) {
      console.error('[handleTap] Error during tap action:', err);
      toast.error('Tap failed. Please try again.');
    } finally {
      setIsTapping(false);
    }
  };

  const filtered = records.filter(r => {
    const matchSearch = !searchQ || (r.employee_name || '').toLowerCase().includes(searchQ.toLowerCase());
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Attendance Tracking</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Monitor shifts and log time in real-time.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {user?.employee_profile_id ? (
          <div className={cn(
            'relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between min-h-[160px] border transition-all',
            tapStatus === 'TAPPED_IN'
              ? 'bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-500 shadow-xl shadow-emerald-200'
              : tapStatus === 'TAPPED_OUT'
              ? 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 shadow-xl'
              : 'bg-gradient-to-br from-indigo-600 to-purple-700 border-indigo-500 shadow-xl shadow-indigo-200'
          )}>
            {tapStatus === 'TAPPED_IN' && (
              <>
                <div className="pointer-events-none absolute inset-0 rounded-2xl border-4 border-white/10 animate-ping" style={{ animationDuration: '3s' }} />
                <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-white/5 animate-ping" style={{ animationDuration: '2s' }} />
              </>
            )}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-white/80" />
                  <span className="text-white/80 text-xs font-bold uppercase tracking-widest">Shift Terminal</span>
                </div>
                {tapStatus === 'TAPPED_IN' && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-emerald-200 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-ping" />
                    LIVE
                  </span>
                )}
              </div>
              <div className="font-mono text-2xl font-black text-white">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              {tapStatus === 'TAPPED_IN' && (
                <div className="text-emerald-200 font-mono text-sm font-bold mt-1">{getRunningDuration()}</div>
              )}
              {tapStatus === 'TAPPED_OUT' && (
                <div className="text-slate-300 text-xs font-semibold mt-1">Total: {Number(tapRecord?.work_hours || 0).toFixed(2)}h</div>
              )}
              {tapStatus === 'OFFLINE' && (
                <div className="text-indigo-200 text-xs font-semibold mt-1">Not tapped in today</div>
              )}
            </div>
            <div className="relative z-10 mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => handleTap('IN')}
                disabled={isTapping || (tapStatus !== 'OFFLINE' && tapStatus !== 'TAPPED_OUT')}
                className={cn(
                  'flex-1 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95',
                  (tapStatus === 'OFFLINE' || tapStatus === 'TAPPED_OUT')
                    ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                    : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                )}
              >
                {isTapping && (tapStatus === 'OFFLINE' || tapStatus === 'TAPPED_OUT') ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Fingerprint className="w-4 h-4" />
                    <span>Tap In</span>
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleTap('OUT')}
                disabled={isTapping || tapStatus !== 'TAPPED_IN'}
                className={cn(
                  'flex-1 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95',
                  tapStatus === 'TAPPED_IN'
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-900/30'
                    : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                )}
              >
                {isTapping && tapStatus === 'TAPPED_IN' ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tap Out</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-center gap-2 mb-4">
              <Fingerprint className="w-5 h-5 text-indigo-400" />
              <span className="text-slate-300 text-xs font-bold uppercase tracking-widest">Shift Terminal</span>
              <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Admin</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center flex-1 justify-center">
              <Fingerprint className="w-10 h-10 text-slate-600" />
              <p className="text-sm font-bold text-slate-400">No employee profile linked</p>
              <p className="text-[10px] text-slate-500 leading-relaxed max-w-[180px]">
                Tap In/Out is for employees. Your admin account has no personal attendance record.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3 flex-1 w-full">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={e => setSelectedDate(new Date(e.target.value))}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none"
            >
              <option value="">All Statuses</option>
              {['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'].map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto min-h-[240px] flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center gap-3 text-slate-400 p-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="font-semibold">Loading records...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12 text-center">
                <CalendarIcon className="w-12 h-12 text-slate-200" />
                <div>
                  <p className="text-lg font-black text-slate-900">No records found</p>
                  <p className="text-sm text-slate-400 max-w-xs mt-1">No attendance records for {format(selectedDate, 'MMMM d, yyyy')}.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Employee', 'Branch', 'Status', 'Tap In', 'Tap Out', 'Work Hours'].map(h => (
                      <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{rec.employee_name || '-'}</span>
                          <span className="text-xs text-slate-500">{rec.employee_id || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{rec.branch_name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
                          STATUS_BG[rec.status] || 'bg-slate-50 text-slate-700 border-slate-100'
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_COLOR[rec.status] || 'bg-slate-400')} />
                          {rec.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-700">{rec.check_in || '-'}</td>
                      <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-700">{rec.check_out || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-slate-900">{rec.work_hours ? `${Number(rec.work_hours).toFixed(2)}h` : '-'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

