import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Loader2,
  Fingerprint,
  MapPin,
  Shield,
  Radio,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { attendanceService } from '@/services/attendanceService';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AttendanceRecord {
  id: number;
  employee: number;
  employee_name?: string;
  attendance_date: string;
  check_in?: string;
  check_out?: string | null;
  work_hours?: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
  notes?: string;
}

// ── Status helpers ────────────────────────────────────────────────────────────
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

// ── Office zone config (change to your actual office coordinates) ──────────────
const OFFICE_LAT    = 12.906245151822224;
const OFFICE_LNG    = 77.57907788025564;
const OFFICE_RADIUS = 300; // metres

const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ═════════════════════════════════════════════════════════════════════════════
export default function AttendancePage() {
  const { user, isAdmin, isManager } = useAuth();
  const isHRAdmin = isAdmin;

  // ── state ──
  const [loading,       setLoading]       = useState(true);
  const [records,       setRecords]       = useState<AttendanceRecord[]>([]);
  const [selectedDate,  setSelectedDate]  = useState(new Date());

  // tap terminal
  const [tapStatus,  setTapStatus]  = useState<'OFFLINE' | 'TAPPED_IN' | 'TAPPED_OUT'>('OFFLINE');
  const [tapRecord,  setTapRecord]  = useState<AttendanceRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTapping,  setIsTapping]  = useState(false);
  const [gpsLocked,  setGpsLocked]  = useState(false);
  const [userLat,    setUserLat]    = useState<number | null>(null);
  const [userLng,    setUserLng]    = useState<number | null>(null);
  const [insideZone, setInsideZone] = useState<boolean | null>(null); // null = unknown
  const [gpsError,   setGpsError]   = useState<string | null>(null);

  // search / filter (table)
  const [searchQ,      setSearchQ]      = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── live clock ──
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Real GPS geofencing using browser Geolocation API ──
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported');
      setGpsLocked(false);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude);
        setUserLng(longitude);
        setGpsLocked(true);
        setGpsError(null);
        const dist = haversineDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG);
        setInsideZone(dist <= OFFICE_RADIUS);
      },
      (err) => {
        setGpsError(err.message);
        setGpsLocked(false);
        setInsideZone(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── running stopwatch ──
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

  // ── data loaders ──
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

  // ── tap handler ──
  const handleTap = async () => {
    const empId = user?.employee_profile_id;
    if (!empId) {
      // Admin without a personal employee profile — silently ignore
      return;
    }
    setIsTapping(true);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const timeStr  = currentTime.toLocaleTimeString('en-US', { hour12: false });

    try {
      if (tapStatus === 'OFFLINE') {
        if (insideZone === false) {
          toast.warning('⚠️ You are outside the office zone. Tap-In recorded anyway.', { duration: 5000 });
        }
        const isLate = currentTime.getHours() > 9 || (currentTime.getHours() === 9 && currentTime.getMinutes() > 30);
        const rec = await attendanceService.logAttendance({
          employee: empId, attendance_date: todayStr, check_in: timeStr,
          status: isLate ? 'LATE' : 'PRESENT',
          notes: `Tapped In at ${currentTime.toLocaleTimeString()}${insideZone === false ? ' [Outside Office Zone]' : ''}`
        });
        setTapRecord(rec); setTapStatus('TAPPED_IN');
        if (insideZone !== false) toast.success('Tapped In! Shift started.');
      } else {
        if (insideZone === false) {
          toast.warning('⚠️ You are outside the office zone. Tap-Out recorded anyway.', { duration: 5000 });
        }
        const [h, m, s] = (tapRecord!.check_in || '09:30:00').split(':').map(Number);
        const diffMs = (currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds()) -
                       (h * 3600 + m * 60 + (s || 0));
        const sessionHours = Math.max(0.0001, Number((diffMs / 3600).toFixed(4)));
        const total = Number((Number(tapRecord!.work_hours || 0) + sessionHours).toFixed(2));
        const rec = await attendanceService.updateAttendance(tapRecord!.id, {
          check_out: timeStr, work_hours: total,
          notes: `${tapRecord?.notes || ''}\nTapped Out at ${currentTime.toLocaleTimeString()}. Session: ${sessionHours.toFixed(2)}h | Total: ${total.toFixed(2)}h${insideZone === false ? ' [Outside Office Zone]' : ''}`
        });
        setTapRecord(rec); setTapStatus('TAPPED_OUT');
        if (insideZone !== false) toast.success(`Tapped Out! Total: ${total.toFixed(2)}h`);
        else toast.success(`Tapped Out! Total: ${total.toFixed(2)}h (outside office zone)`);
      }
      await Promise.all([fetchAttendance(), checkTodayTapStatus()]);
    } catch (err) { toast.error('Tap failed. Please try again.'); }
    finally { setIsTapping(false); }
  };

  const filtered = records.filter(r => {
    const matchSearch = !searchQ || (r.employee_name || '').toLowerCase().includes(searchQ.toLowerCase());
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Attendance Tracking</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Monitor shifts and log time in real-time.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Top row: tap terminal + geofencing ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Shift Tap Terminal — only shown when user has a linked employee profile */}
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
                  <div className="absolute inset-0 rounded-2xl border-4 border-white/10 animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-0 rounded-2xl border-2 border-white/5 animate-ping" style={{ animationDuration: '2s' }} />
                </>
              )}
              <div className="relative">
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
                  <div className="text-indigo-200 text-xs font-semibold mt-1">Not checked in today</div>
                )}
              </div>
              {tapStatus === 'TAPPED_OUT' ? (
                <div className="mt-4 w-full py-2.5 rounded-xl font-black text-xs text-center bg-white/10 text-white/50 border border-white/10 select-none">
                  Shift Completed
                </div>
              ) : (
                <button
                  onClick={handleTap}
                  disabled={isTapping}
                  className={cn(
                    'mt-4 w-full py-2.5 rounded-xl font-black text-sm transition-all active:scale-95',
                    tapStatus === 'TAPPED_IN'
                      ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-900/30'
                      : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                  )}
                >
                  {isTapping
                    ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    : tapStatus === 'TAPPED_IN' ? 'Tap Out ⏹' : 'Tap In ▶'}
                </button>
              )}
            </div>
          ) : (
            /* Admin / manager without linked employee profile */
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

          {/* GPS Geofencing Card */}
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 p-6 flex flex-col justify-between min-h-[160px]">
            {/* Radar rings */}
            <div className="absolute right-4 bottom-4 w-28 h-28 opacity-20">
              {[28, 20, 12].map((s, i) => (
                <div key={i} className={cn(
                  'absolute rounded-full border',
                  gpsError ? 'border-rose-400 opacity-20' :
                  insideZone === false ? 'border-amber-400' :
                  insideZone === true  ? 'border-emerald-400' : 'border-slate-400',
                  gpsLocked ? 'animate-ping' : 'opacity-30'
                )} style={{
                  width: s * 4, height: s * 4,
                  top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  animationDuration: `${2 + i * 0.7}s`,
                  animationDelay: `${i * 0.3}s`
                }} />
              ))}
              <div className={cn(
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full',
                gpsError ? 'bg-rose-500' :
                insideZone === false ? 'bg-amber-400' :
                insideZone === true  ? 'bg-emerald-400' : 'bg-slate-500'
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Radio className={cn('w-4 h-4',
                  gpsError ? 'text-rose-400' :
                  insideZone === false ? 'text-amber-400' :
                  insideZone === true  ? 'text-emerald-400' : 'text-slate-500'
                )} />
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Geofencing</span>
              </div>
              <div className={cn(
                'text-sm font-black',
                gpsError ? 'text-rose-400' :
                insideZone === false ? 'text-amber-400' :
                insideZone === true  ? 'text-emerald-400' : 'text-slate-500'
              )}>
                {gpsError
                  ? '✕ GPS Unavailable'
                  : !gpsLocked
                  ? 'Acquiring GPS...'
                  : insideZone === true
                  ? '✓ Inside Office Zone'
                  : insideZone === false
                  ? '⚠ Outside Office Zone'
                  : 'Checking zone...'}
              </div>
              <div className="text-slate-500 text-[10px] font-semibold mt-1 font-mono">
                {userLat !== null && userLng !== null
                  ? `${userLat.toFixed(4)}° N, ${userLng.toFixed(4)}° E`
                  : '--- ° N, --- ° E'}
              </div>
              {insideZone === false && (
                <div className="mt-1.5 text-[9px] font-black text-amber-400 uppercase tracking-wider">
                  ⚠ You are outside the office zone
                </div>
              )}
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPin className={cn('w-3.5 h-3.5',
                  gpsLocked ? (insideZone === false ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-600'
                )} />
                <span className="text-[10px] font-bold text-slate-400">Office Radius</span>
                <span className="text-[9px] font-black text-slate-500 ml-auto">{OFFICE_RADIUS}m</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className={cn('w-3.5 h-3.5',
                  gpsError ? 'text-rose-400' : gpsLocked ? 'text-emerald-400' : 'text-slate-600'
                )} />
                <span className="text-[10px] font-bold text-slate-400">GPS Status</span>
                {gpsLocked && !gpsError && (
                  <span className={cn(
                    'text-[9px] font-black ml-auto',
                    insideZone === false ? 'text-amber-500' : 'text-emerald-500'
                  )}>
                    {insideZone === false ? 'OUT OF ZONE' : 'VERIFIED'}
                  </span>
                )}
                {gpsError && <span className="text-[9px] font-black text-rose-500 ml-auto">ERROR</span>}
              </div>
            </div>
          </div>

        </div>

        {/* ── Attendance Table ── */}
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
                <span className="font-semibold">Loading records…</span>
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
                    {['Employee', 'Status', 'Check In', 'Check Out', 'Work Hours', 'Notes'].map(h => (
                      <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xs font-black text-indigo-700 uppercase">
                            {(rec.employee_name || '??').split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-sm font-bold text-slate-900">{rec.employee_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
                          STATUS_BG[rec.status] || 'bg-slate-50 text-slate-700 border-slate-100'
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_COLOR[rec.status] || 'bg-slate-400')} />
                          {rec.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-700">{rec.check_in || '—'}</td>
                      <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-700">{rec.check_out || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-slate-900">{rec.work_hours ? `${Number(rec.work_hours).toFixed(2)}h` : '—'}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 italic max-w-xs truncate">{rec.notes || '—'}</td>
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
