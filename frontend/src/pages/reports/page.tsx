import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Users, CalendarCheck, FileText, CreditCard, BarChart2,
  TrendingUp, Loader2, Download, Star
} from 'lucide-react';
import { reportsService, WorkforceReport, AttendanceReport, LeavesReport, PayrollReport, PerformanceReport } from '@/services/reportsService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Tab = 'workforce' | 'attendance' | 'leaves' | 'payroll' | 'performance';

const TABS = [
  { key: 'workforce' as Tab, label: 'Workforce', icon: Users },
  { key: 'attendance' as Tab, label: 'Attendance', icon: CalendarCheck },
  { key: 'leaves' as Tab, label: 'Leaves', icon: FileText },
  { key: 'payroll' as Tab, label: 'Payroll', icon: CreditCard },
  { key: 'performance' as Tab, label: 'Performance', icon: BarChart2 },
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

const CURRENT_YEAR = String(new Date().getFullYear());
const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

function KpiCard({ label, value, sub, color = 'indigo' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-3xl font-black mt-1 text-${color}-600`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 font-semibold mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-sm font-black text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// CSV Export
function exportCsv(data: object[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(',')).join('\n');
  const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Tab Panels ───────────────────────────────────────────────────────────────

function WorkforcePanel({ year }: { year: string }) {
  const [data, setData] = useState<WorkforceReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsService.getWorkforce(year)
      .then(setData)
      .catch(() => toast.error('Failed to load workforce report'))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Total Employees" value={data.total} />
        <KpiCard label="Departments" value={data.by_department.filter((row) => row.count > 0).length} color="emerald" />
        <KpiCard label="Designations" value={data.by_designation.filter((row) => row.count > 0).length} color="amber" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Employees by Department">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.by_department} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="department_name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Employees by Designation">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.by_designation.map((row) => ({ ...row, designation: row.designation__title || 'Unassigned' }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="designation" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="flex justify-end">
        <button onClick={() => exportCsv(data.by_department, 'workforce_by_department.csv')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>
    </div>
  );
}

function AttendancePanel({ year }: { year: string }) {
  const [data, setData] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsService.getAttendance(year)
      .then(setData)
      .catch(() => toast.error('Failed to load attendance report'))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (!data) return null;

  const totals = data.status_totals;
  const presentRate = totals['PRESENT'] && (totals['PRESENT'] + totals['ABSENT'])
    ? Math.round(totals['PRESENT'] / (totals['PRESENT'] + totals['ABSENT']) * 100)
    : 0;

  // Pivot monthly_trend for the line chart
  const monthMap: Record<string, any> = {};
  data.monthly_trend.forEach(({ month, status, count }) => {
    if (!monthMap[month]) monthMap[month] = { month };
    monthMap[month][status] = count;
  });
  const chartData = Object.values(monthMap).sort((a, b) => String(a.month).localeCompare(String(b.month)));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Present Rate" value={`${presentRate}%`} color="emerald" />
        <KpiCard label="Present Days" value={totals['PRESENT'] || 0} />
        <KpiCard label="Absent Days" value={totals['ABSENT'] || 0} color="rose" />
        <KpiCard label="Avg Work Hours" value={`${data.avg_work_hours}h`} color="indigo" />
      </div>

      <ChartCard title="Monthly Attendance Trend">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
            <Legend />
            <Line type="monotone" dataKey="PRESENT" stroke="#10b981" strokeWidth={2} dot={false} name="Present" />
            <Line type="monotone" dataKey="ABSENT" stroke="#ef4444" strokeWidth={2} dot={false} name="Absent" />
            <Line type="monotone" dataKey="LATE" stroke="#f59e0b" strokeWidth={2} dot={false} name="Late" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Status Breakdown">
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(totals).map(([status, count], i) => (
            <div key={status} className="text-center p-4 rounded-xl" style={{ backgroundColor: COLORS[i] + '15' }}>
              <p className="text-2xl font-black" style={{ color: COLORS[i] }}>{count}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">{status.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}

function LeavesPanel({ year }: { year: string }) {
  const [data, setData] = useState<LeavesReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsService.getLeaves(year)
      .then(setData)
      .catch(() => toast.error('Failed to load leaves report'))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Total Requests" value={data.total} />
        <KpiCard label="Approval Rate" value={`${data.approval_rate}%`} color="emerald" />
        <KpiCard label="Leave Types" value={data.by_type.length} color="indigo" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Leave Requests by Type">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.by_type}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="leave_type" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.by_status.map(s => ({ name: s.status, value: s.count }))}
                dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={80} innerRadius={40} paddingAngle={2}>
                {data.by_status.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value: any, name: any) => [`${value} requests`, name]}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Monthly Leave Request Trend">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.monthly_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Requests" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function PayrollPanel({ year }: { year: string }) {
  const [data, setData] = useState<PayrollReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsService.getPayroll(year)
      .then(setData)
      .catch(() => toast.error('Failed to load payroll report'))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (!data) return null;

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Total Payroll" value={fmt(data.status_split.total)} />
        <KpiCard label="Paid" value={fmt(data.status_split.paid)} color="emerald" />
        <KpiCard label="Pending" value={fmt(data.status_split.pending)} color="amber" />
      </div>

      <ChartCard title="Monthly Payroll Spend">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.monthly_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} formatter={(v: any) => fmt(Number(v || 0))} />
            <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Net Pay" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Payroll by Department">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Department</th>
                <th className="text-right py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Employees</th>
                <th className="text-right py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Avg Net Pay</th>
                <th className="text-right py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.by_department.map(d => (
                <tr key={d.department} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-700">{d.department}</td>
                  <td className="py-2.5 px-3 text-right text-slate-500">{d.count}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-indigo-600">{fmt(d.avg_net_pay)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-700">{fmt(d.total_net_pay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function PerformancePanel({ year }: { year: string }) {
  const [data, setData] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsService.getPerformance(year)
      .then(setData)
      .catch(() => toast.error('Failed to load performance report'))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <KpiCard label="Overall Avg Rating" value={`${data.overall_avg_rating} / 5`} color="amber" sub="Across all reviews" />
        <KpiCard label="Top Performers" value={data.top_performers.length} color="indigo" sub="Rating ≥ 4 stars" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Rating Distribution (1–5 Stars)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.rating_distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="rating" tick={{ fontSize: 11 }} tickFormatter={v => `★ ${v}`} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Reviews">
                {data.rating_distribution.map((_, i) => (
                  <Cell key={i} fill={['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avg Rating by Department">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.by_department} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="department" tick={{ fontSize: 10 }} width={100} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
              <Bar dataKey="avg_rating" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Avg Rating" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Top Performers">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Employee</th>
                <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">ID</th>
                <th className="text-center py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Rating</th>
                <th className="text-right py-2 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Review Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.top_performers.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-700">{p.employee__first_name} {p.employee__last_name}</td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-xs">{p.employee__employee_id}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                      <Star className="w-3.5 h-3.5" /> {p.rating}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400 text-xs">{p.review_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('workforce');
  const [year, setYear] = useState(CURRENT_YEAR);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-indigo-500" />
            Reports & Analytics
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">Aggregated insights across workforce, attendance, leaves, payroll, and performance.</p>
        </div>

        {/* Year Filter */}
        <select
          value={year}
          onChange={e => setYear(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'workforce' && <WorkforcePanel year={year} />}
      {activeTab === 'attendance' && <AttendancePanel year={year} />}
      {activeTab === 'leaves' && <LeavesPanel year={year} />}
      {activeTab === 'payroll' && <PayrollPanel year={year} />}
      {activeTab === 'performance' && <PerformancePanel year={year} />}
    </div>
  );
}
