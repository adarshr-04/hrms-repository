
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  Briefcase,
  GraduationCap,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ArrowRight,
  Loader2,
  Fingerprint,
  CheckCircle2,
  Wifi,
  MapPin,
  Megaphone,
  Trash2,
  X,
  ChevronDown,
  FileEdit,
  CalendarCheck,
  Radio,
  Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { employeeService } from '@/services/employeeService';
import { attendanceService } from '@/services/attendanceService';
import { payrollService } from '@/services/payrollService';
import { leaveService } from '@/services/leaveService';
import { projectService } from '@/services/projectService';
import { trainingService } from '@/services/trainingService';
import { announcementService, Announcement } from '@/services/announcementService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';


const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function DashboardPage() {
  const { user, isAdmin, isManager, isHR } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  
  // Dynamic client-side filter states
  const [rawEmployees, setRawEmployees] = useState<any[]>([]);
  const [rawAttendance, setRawAttendance] = useState<any[]>([]);
  const [rawLeaves, setRawLeaves] = useState<any[]>([]);
  const [rawProjects, setRawProjects] = useState<any[]>([]);
  const [rawEnrollments, setRawEnrollments] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Announcement States
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Form states for posting announcements
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnPriority, setNewAnnPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);

  // Interactive Daily Tap Terminal States
  const [tapStatus, setTapStatus] = useState<'OFFLINE' | 'TAPPED_IN' | 'TAPPED_OUT'>('OFFLINE');
  const [tapRecord, setTapRecord] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTapping, setIsTapping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // GPS Geofencing States (aligned with Attendance page)
  const [gpsLocked, setGpsLocked] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [insideZone, setInsideZone] = useState<boolean | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const isBefore6PM = currentTime.getHours() < 18;

  // Office zone config (must match Attendance page)
  const OFFICE_LAT = 12.906245151822224;
  const OFFICE_LNG = 77.57907788025564;
  const OFFICE_RADIUS = 300;

  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const navigate = useNavigate();

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const data = await announcementService.getAll();
      setAnnouncements(data);
    } catch (error) {
      console.error("Failed to fetch announcements", error);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmittingAnnouncement(true);
    try {
      await announcementService.create({
        title: newAnnTitle,
        content: newAnnContent,
        priority: newAnnPriority,
      });
      toast.success("Announcement posted successfully!");
      setIsCreateModalOpen(false);
      setNewAnnTitle('');
      setNewAnnContent('');
      setNewAnnPriority('NORMAL');
      fetchAnnouncements();
    } catch (error) {
      console.error("Failed to create announcement", error);
      toast.error("Failed to post announcement");
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await announcementService.delete(id);
      toast.success("Announcement deleted successfully");
      fetchAnnouncements();
    } catch (error) {
      console.error("Failed to delete announcement", error);
      toast.error("Failed to delete announcement");
    }
  };

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // GPS Geofencing watcher (aligned with Attendance page)
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

  // Running stopwatch duration calculator (HH:MM:SS)
  const getRunningDuration = () => {
    if (!tapRecord || !tapRecord.check_in) return "00:00:00";
    try {
      const [inH, inM, inS] = tapRecord.check_in.split(':').map(Number);
      const checkInDate = new Date(currentTime);
      checkInDate.setHours(inH, inM, inS || 0);

      let diffMs = currentTime.getTime() - checkInDate.getTime();
      if (diffMs < 0) diffMs = 0;

      // Add previously logged work hours (for resumed shifts)
      const previousMs = Number(tapRecord.work_hours || 0) * 3600000;
      const totalMs = diffMs + previousMs;

      const hrs = Math.floor(totalMs / 3600000);
      const mins = Math.floor((totalMs % 3600000) / 60000);
      const secs = Math.floor((totalMs % 60000) / 1000);

      const pad = (num: number) => String(num).padStart(2, '0');
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    } catch (err) {
      return "00:00:00";
    }
  };

  // Fetch today's tap status from the database
  const checkTodayTapStatus = async () => {
    const empId = user?.employee_profile_id;
    if (!empId) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const logs = await attendanceService.getAll({ employee: empId, attendance_date: todayStr });
      const todayRecord = Array.isArray(logs) ? logs[0] : (logs.results ? logs.results[0] : null);
      if (todayRecord) {
        setTapRecord(todayRecord);
        if (todayRecord.check_in && !todayRecord.check_out) {
          setTapStatus('TAPPED_IN');
        } else if (todayRecord.check_in && todayRecord.check_out) {
          setTapStatus('TAPPED_OUT');
        }
      } else {
        setTapStatus('OFFLINE');
      }
    } catch (err) {
      console.error("Failed to fetch today's tap status", err);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (isAdmin || isManager) {
        const [employees, attendance, leaves, projects] = await Promise.all([
          employeeService.getAll(),
          attendanceService.getAll(),
          leaveService.getAll(),
          projectService.getProjects()
        ]);

        setRawEmployees(Array.isArray(employees) ? employees : (employees.results || []));
        setRawAttendance(Array.isArray(attendance) ? attendance : (attendance.results || []));
        setRawLeaves(Array.isArray(leaves) ? leaves : (leaves.results || []));
        setRawProjects(Array.isArray(projects) ? projects : (projects.results || []));
      } else {
        const empId = user?.employee_profile_id;
        if (empId) {
          const [attendance, leaves, projects, enrollments] = await Promise.all([
            attendanceService.getAll({ employee: empId }),
            leaveService.getAll({ employee: empId }),
            projectService.getProjects(),
            trainingService.getEnrollments({ employee: empId })
          ]);

          setRawAttendance(Array.isArray(attendance) ? attendance : (attendance.results || []));
          setRawLeaves(Array.isArray(leaves) ? leaves : (leaves.results || []));
          setRawProjects(Array.isArray(projects) ? projects : (projects.results || []));
          setRawEnrollments(Array.isArray(enrollments) ? enrollments : (enrollments.results || []));
        }
      }
    } catch (error) {
      console.error("Dashboard fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  // Reactive visual analytics calculator
  useEffect(() => {
    if (loading) return;

    if (isAdmin || isManager) {
      const employeeDeptMap = new Map();
      rawEmployees.forEach((emp: any) => {
        employeeDeptMap.set(emp.id, emp.department_name || 'Unassigned');
      });

      // Filter employees by department
      let filteredEmpList = rawEmployees;
      if (selectedDept !== 'ALL') {
        filteredEmpList = rawEmployees.filter((e: any) => (e.department_name || 'Unassigned') === selectedDept);
      }

      // Filter attendance by department and month
      let filteredAttendanceList = rawAttendance;
      if (selectedDept !== 'ALL') {
        filteredAttendanceList = filteredAttendanceList.filter((a: any) => {
          const dept = employeeDeptMap.get(a.employee) || 'Unassigned';
          return dept === selectedDept;
        });
      }
      if (selectedMonth !== 'ALL') {
        filteredAttendanceList = filteredAttendanceList.filter((a: any) => {
          if (!a.attendance_date) return false;
          const month = a.attendance_date.split('-')[1]; // YYYY-MM-DD
          return Number(month) === Number(selectedMonth);
        });
      }

      // Filter leaves by department
      let filteredLeavesList = rawLeaves;
      if (selectedDept !== 'ALL') {
        filteredLeavesList = rawLeaves.filter((l: any) => {
          const dept = employeeDeptMap.get(l.employee) || 'Unassigned';
          return dept === selectedDept;
        });
      }

      // Dynamic stats calculation
      const totalEmployees = filteredEmpList.length;
      const todayStr = new Date().toISOString().split('T')[0];
      const todayAttendance = filteredAttendanceList.filter((a: any) => a.attendance_date === todayStr && a.status !== 'ABSENT');
      const presentCount = todayAttendance.length;

      const pendingLeavesCount = filteredLeavesList.filter((l: any) => l.status === 'PENDING').length;
      const activeProjectsCount = rawProjects.filter((p: any) => p.status === 'IN_PROGRESS' || p.status === 'PLANNING').length;

      setStats([
        { name: 'Total Employees', value: totalEmployees, change: `+${filteredEmpList.filter((e: any) => e.status === 'ACTIVE').length} Active`, trend: 'up', icon: Users, color: 'bg-blue-500' },
        { name: 'Present Today', value: presentCount, change: `${totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0}% Rate`, trend: 'up', icon: Calendar, color: 'bg-emerald-500' },
        { name: 'Pending Leaves', value: pendingLeavesCount, change: `${filteredLeavesList.filter((l: any) => l.status === 'APPROVED').length} Approved`, trend: pendingLeavesCount > 0 ? 'up' : 'down', icon: Clock, color: 'bg-amber-500' },
        { name: 'Active Projects', value: activeProjectsCount, change: `${rawProjects.filter((p: any) => p.status === 'COMPLETED').length} Done`, trend: 'up', icon: Briefcase, color: 'bg-indigo-500' },
      ]);

      // Department breakdowns
      const depts = filteredEmpList.reduce((acc: any, curr: any) => {
        const name = curr.department_name || 'Unassigned';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});
      setDeptData(Object.keys(depts).map(name => ({ name, value: depts[name] })));

      // Real historical attendance trends (dynamic last 5 days)
      const uniqueDates = Array.from(new Set(filteredAttendanceList.map((a: any) => a.attendance_date)))
        .sort()
        .slice(-5);

      const trendData = uniqueDates.map(dateStr => {
        const dateObj = new Date(dateStr as string);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const dayLogs = filteredAttendanceList.filter((a: any) => a.attendance_date === dateStr);
        const presentLogs = dayLogs.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY');
        const percentage = dayLogs.length > 0 ? Math.round((presentLogs.length / dayLogs.length) * 100) : 0;
        return { name: dayName, present: percentage };
      });

      const finalTrend = trendData.length >= 2 ? trendData : [
        { name: 'Mon', present: 92 },
        { name: 'Tue', present: 95 },
        { name: 'Wed', present: 98 },
        { name: 'Thu', present: 94 },
        { name: 'Fri', present: 96 },
      ];
      setAttendanceTrend(finalTrend);
    } else {
      // Personal Employee dashboard
      let filteredAttendance = rawAttendance;
      if (selectedMonth !== 'ALL') {
        filteredAttendance = rawAttendance.filter((a: any) => {
          if (!a.attendance_date) return false;
          const month = a.attendance_date.split('-')[1];
          return Number(month) === Number(selectedMonth);
        });
      }

      const presentLogs = filteredAttendance.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY').length;
      const totalLogs = filteredAttendance.length;
      const attendanceRate = totalLogs > 0 ? Math.round((presentLogs / totalLogs) * 100) : 100;

      let baseLeaveDays = 24;
      try {
        const savedCompany = localStorage.getItem('companySettings');
        if (savedCompany) {
          const company = JSON.parse(savedCompany);
          const match = company.leavePolicy?.match(/(\d+)/);
          if (match) baseLeaveDays = parseInt(match[1], 10);
        }
      } catch {
        baseLeaveDays = 24;
      }

      const approvedDays = rawLeaves
        .filter((l: any) => l.status === 'APPROVED')
        .reduce((sum: number, l: any) => sum + (parseInt(l.total_days) || 0), 0);
      const leaveBalance = Math.max(0, baseLeaveDays - approvedDays);

      const activeProjectsCount = rawProjects.filter((p: any) => p.status === 'IN_PROGRESS' || p.status === 'PLANNING').length;

      const completedEnrollments = rawEnrollments.filter((e: any) => e.status === 'COMPLETED').length;
      const totalEnrollments = rawEnrollments.length;
      const trainingRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

      setStats([
        { name: 'My Attendance', value: `${attendanceRate}%`, change: 'Live presence rate', trend: 'up', icon: Calendar, color: 'bg-emerald-500' },
        { name: 'Leave Balance', value: `${leaveBalance} Days`, change: `${rawLeaves.filter((l: any) => l.status === 'PENDING').length} Pending request(s)`, trend: 'up', icon: Clock, color: 'bg-amber-500' },
        { name: 'My Projects', value: `${activeProjectsCount} Active`, change: 'Assigned initiatives', trend: 'up', icon: Briefcase, color: 'bg-indigo-500' },
        { name: 'Training Progress', value: `${trainingRate}%`, change: `${completedEnrollments}/${totalEnrollments} Completed`, trend: 'up', icon: GraduationCap, color: 'bg-blue-500' },
      ]);

      const trendData = filteredAttendance
        .slice(-5)
        .map((log: any) => {
          const dayName = new Date(log.attendance_date).toLocaleDateString('en-US', { weekday: 'short' });
          return { name: dayName, present: log.status === 'PRESENT' || log.status === 'LATE' || log.status === 'HALF_DAY' ? 100 : 0 };
        });

      const finalTrend = trendData.length >= 2 ? trendData : [
        { name: 'Mon', present: 100 },
        { name: 'Tue', present: 100 },
        { name: 'Wed', present: 100 },
        { name: 'Thu', present: 100 },
        { name: 'Fri', present: 100 },
      ];
      setAttendanceTrend(finalTrend);
    }
  }, [rawEmployees, rawAttendance, rawLeaves, rawProjects, rawEnrollments, selectedMonth, selectedDept, loading, isAdmin, isManager]);

  useEffect(() => {
    fetchDashboardData();
    checkTodayTapStatus();
    fetchAnnouncements();
  }, [isAdmin, isManager, user?.employee_profile_id]);

  const handleTap = async () => {
    const empId = user?.employee_profile_id;
    if (!empId) {
      toast.error("Employee profile not found. Attendance cannot be logged.");
      return;
    }

    setIsTapping(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = currentTime.toLocaleTimeString('en-US', { hour12: false });

    try {
      if (tapStatus === 'OFFLINE') {
        // Tap In — check geofencing (warn if outside, but allow)
        if (insideZone === false) {
          toast.warning('⚠️ You are outside the office zone. Tap-In recorded anyway.', { duration: 5000 });
        }
        const isLate = currentTime.getHours() > 9 || (currentTime.getHours() === 9 && currentTime.getMinutes() > 30);
        const record = await attendanceService.logAttendance({
          employee: empId,
          attendance_date: todayStr,
          check_in: timeStr,
          status: isLate ? 'LATE' : 'PRESENT',
          notes: `Tapped In via Dashboard at ${currentTime.toLocaleTimeString()}${insideZone === false ? ' [Outside Office Zone]' : ''}`
        });
        setTapRecord(record);
        setTapStatus('TAPPED_IN');
        if (insideZone !== false) toast.success('Tapped In! Shift started.');

      } else if (tapStatus === 'TAPPED_OUT') {
        // Resume Shift — only before 6 PM
        if (!isBefore6PM) {
          toast.error('Resuming shifts is only allowed before 6:00 PM.');
          setIsTapping(false);
          return;
        }
        if (insideZone === false) {
          toast.warning('⚠️ You are outside the office zone. Resuming shift anyway.', { duration: 5000 });
        }
        const record = await attendanceService.updateAttendance(tapRecord!.id, {
          check_in: timeStr, check_out: null,
          notes: `${tapRecord?.notes || ''}\nResumed shift via Dashboard at ${currentTime.toLocaleTimeString()}${insideZone === false ? ' [Outside Office Zone]' : ''}`
        });
        setTapRecord(record);
        setTapStatus('TAPPED_IN');
        if (insideZone !== false) toast.success('Shift resumed!');

      } else if (tapStatus === 'TAPPED_IN') {
        // Tap Out — warn if outside zone but always allow
        if (!tapRecord || !tapRecord.id) {
          toast.error("Tap record is missing. Reloading status...");
          await checkTodayTapStatus();
          setIsTapping(false);
          return;
        }
        if (insideZone === false) {
          toast.warning('⚠️ You are outside the office zone. Tap-Out recorded anyway.', { duration: 5000 });
        }
        const checkInTime = tapRecord.check_in || "09:00:00";
        const [inH, inM, inS] = checkInTime.split(':').map(Number);
        const diffSec = (currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds()) -
                        (inH * 3600 + inM * 60 + (inS || 0));
        const sessionHours = Math.max(0.0001, Number((diffSec / 3600).toFixed(4)));
        const total = Number((Number(tapRecord.work_hours || 0) + sessionHours).toFixed(2));

        const record = await attendanceService.updateAttendance(tapRecord.id, {
          check_out: timeStr,
          work_hours: total,
          notes: `${tapRecord.notes || ''}\nTapped Out via Dashboard at ${currentTime.toLocaleTimeString()}. Session: ${sessionHours.toFixed(2)}h | Total: ${total.toFixed(2)}h${insideZone === false ? ' [Outside Office Zone]' : ''}`
        });
        setTapRecord(record);
        setTapStatus('TAPPED_OUT');
        toast.success(`Tapped Out! Total: ${total.toFixed(2)}h`);
      }
      // Instantly update stats on dashboard
      await fetchDashboardData();
    } catch (error) {
      console.error("Failed to complete tap transaction", error);
      toast.error("Tap transaction failed. Please try again.");
    } finally {
      setIsTapping(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-slate-500 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="font-bold">Syncing your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isAdmin ? 'Organizational Overview' : isManager ? 'Department Insights' : `Welcome Back, ${user?.first_name}`}
          </h1>
          <p className="text-slate-500">
            {isAdmin ? 'Real-time organizational analytics and workforce tracking.' : 'Here is what is happening with your schedule today.'}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Actions</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showQuickActions ? 'rotate-180' : ''}`} />
          </button>
          {showQuickActions && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2">
              <button onClick={() => { navigate('/leaves'); setShowQuickActions(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                <FileEdit className="w-4 h-4 text-indigo-500" />
                Request Leave
              </button>
              <button onClick={() => { navigate('/attendance'); setShowQuickActions(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors">
                <CalendarCheck className="w-4 h-4 text-amber-500" />
                Attendance Correction
              </button>
              {(isAdmin || isHR) && (
                <button onClick={() => { setIsCreateModalOpen(true); setShowQuickActions(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                  <Megaphone className="w-4 h-4 text-emerald-500" />
                  Post Announcement
                </button>
              )}
              {(isAdmin || isHR) && (
                <button onClick={() => { navigate('/employees'); setShowQuickActions(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                  <Users className="w-4 h-4 text-purple-500" />
                  Onboard New Staff
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Stats & Shift Tap Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Stats Grid & Announcement Bulletin Board (takes 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                    {stat.change}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                </div>
              </motion.div>
            ))}
          </div>


        </div>

        {/* Right Side: Shift Tap Terminal (takes 1 column) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group h-fit self-start">
          {/* Card abstract hover gradient */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl opacity-50 group-hover:scale-150 transition-transform duration-700" />
          
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-indigo-600" />
                Shift Attendance
              </h3>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-slate-50 text-slate-500 border-slate-100">
                <Wifi className="w-3 h-3 text-emerald-500 animate-pulse" />
                Online
              </div>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10">
              {tapStatus === 'OFFLINE' && (
                <button
                  disabled={isTapping}
                  onClick={handleTap}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 group active:scale-[0.98]"
                >
                  {isTapping ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Fingerprint className="w-5 h-5 group-hover:scale-125 transition-transform" />
                      <span>Tap In</span>
                    </>
                  )}
                </button>
              )}
              
              {tapStatus === 'TAPPED_IN' && (
                <button
                  disabled={isTapping}
                  onClick={handleTap}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-200 group active:scale-[0.98]"
                >
                  {isTapping ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      <span>Tap Out</span>
                    </>
                  )}
                </button>
              )}

              {tapStatus === 'TAPPED_OUT' && !isBefore6PM && (
                <div className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Shift Closed (After 6:00 PM)</span>
                </div>
              )}

              {tapStatus === 'TAPPED_OUT' && isBefore6PM && (
                <button
                  disabled={isTapping}
                  onClick={handleTap}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-slate-200 group active:scale-[0.98]"
                >
                  {isTapping ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Fingerprint className="w-5 h-5 group-hover:scale-125 transition-transform" />
                      <span>Resume Shift ▶</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Status Messages */}
            <div className="text-center space-y-1">
              {tapStatus === 'OFFLINE' && (
                <>
                  <p className="text-xs font-black text-rose-500 uppercase tracking-widest">OFFLINE</p>
                  <p className="text-[11px] font-medium text-slate-500 px-4">Tap In to log your check-in time and start today's shift.</p>
                </>
              )}
              {tapStatus === 'TAPPED_IN' && (
                <div className="space-y-3">
                  <p className="text-xs font-black text-emerald-500 uppercase tracking-widest animate-pulse">ACTIVE & TAPPED IN</p>
                  <p className="text-[11px] font-medium text-slate-500 px-4">
                    Shift started at <span className="font-bold text-slate-800">{tapRecord?.check_in || '--:--'}</span>.
                  </p>
                  
                  {/* Live Shift Stopwatch */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 text-center mt-3 animate-pulse">
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Active Shift Stopwatch</p>
                    <h4 className="text-xl font-black text-indigo-900 font-mono tracking-wider mt-1">
                      {getRunningDuration()}
                    </h4>
                  </div>
                </div>
              )}
              {tapStatus === 'TAPPED_OUT' && (
                <>
                  <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{isBefore6PM ? 'SHIFT PAUSED' : 'SHIFT COMPLETED'}</p>
                  <p className="text-[11px] font-medium text-slate-500 px-4">
                    Logged <span className="font-bold text-slate-800">{tapRecord?.work_hours ? Number(tapRecord.work_hours).toFixed(2) : 0}h</span> of work today.{isBefore6PM ? ' Resume anytime before 6 PM.' : ' See you tomorrow!'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Announcements Bulletin Board (Moved to full width) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-650" />
            Company Announcements
          </h3>
          {isHR && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Post Bulletin</span>
            </button>
          )}
        </div>

        {loadingAnnouncements ? (
          <div className="py-8 flex justify-center items-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span>Loading bulletins...</span>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8 text-slate-550 border border-dashed border-slate-200 rounded-xl">
            <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No announcements posted yet</p>
            <p className="text-xs text-slate-450 mt-1">Keep an eye out for updates from HR.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                onClick={() => setSelectedAnnouncement(ann)}
                className="p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md group relative overflow-hidden"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      ann.priority === 'LOW' ? 'bg-slate-55 border-slate-200 text-slate-600' :
                      ann.priority === 'NORMAL' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                      ann.priority === 'HIGH' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      'bg-rose-50 border-rose-300 text-rose-600 animate-pulse border-2'
                    }`}>
                      {ann.priority}
                    </span>
                    {isHR && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAnnouncement(ann.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {ann.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {ann.content}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3 text-[10px] font-medium text-slate-400">
                  <span>By {ann.posted_by_name}</span>
                  <span>{new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Filters Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm">Analytics & Metrics Control</h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Filter data dynamically in real-time across charts and counters.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Month</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Months</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          {/* Department Selector */}
          {(isAdmin || isManager) && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dept</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {Array.from(new Set(rawEmployees.map((e: any) => e.department_name).filter(Boolean))).map((dept: any) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance Trend */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-650" />
            Weekly Attendance Flow
          </h3>
          <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="present"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ fill: '#4f46e5', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Department Distribution
          </h3>
          <div className="h-[300px] w-full min-h-[300px] flex items-center justify-center">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptData}
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-sm italic">No department data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Announcement Details Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Announcement Details</h3>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                  selectedAnnouncement.priority === 'LOW' ? 'bg-slate-50 border-slate-200 text-slate-600' :
                  selectedAnnouncement.priority === 'NORMAL' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                  selectedAnnouncement.priority === 'HIGH' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                  'bg-rose-50 border-rose-300 text-rose-600 animate-pulse border-2'
                }`}>
                  {selectedAnnouncement.priority} Priority
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {new Date(selectedAnnouncement.created_at).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{selectedAnnouncement.title}</h2>
              <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
                {selectedAnnouncement.content}
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Posted by: <strong className="text-slate-700">{selectedAnnouncement.posted_by_name}</strong></span>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Announcement Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleCreateAnnouncement} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Post New Announcement</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Enter bulletin title"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                <select
                  value={newAnnPriority}
                  onChange={(e) => setNewAnnPriority(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write the announcement message here..."
                  value={newAnnContent}
                  onChange={(e) => setNewAnnContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingAnnouncement}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
              >
                {isSubmittingAnnouncement ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <span>Post Announcement</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
