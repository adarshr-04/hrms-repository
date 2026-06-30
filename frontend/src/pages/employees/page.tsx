
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  Building2,
  Users,
  Loader2,
  MapPin,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { employeeService } from '@/services/employeeService';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Employee, Department } from '@/types';

export default function EmployeesPage() {
  const { isAdmin, isHR } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, departments: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filters, setFilters] = useState({
    department: '',
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await employeeService.getAll();
      const results: Employee[] = Array.isArray(data) ? data : (data?.results ?? []);
      setEmployees(results);

      setStats({
        total: results.length,
        departments: new Set(results.map(e => e.department)).size
      });
    } catch (error) {
      console.error("Failed to fetch employees", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await employeeService.getDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch departments", error);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const getAvatarUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = (import.meta as any).env.VITE_API_URL?.replace('/api', '') || '';
    return `${baseUrl}${path}`;
  };

  const filteredEmployees = employees.filter(emp => {
    const searchStr = searchTerm.toLowerCase();
    const matchesSearch = (
      emp.first_name?.toLowerCase().includes(searchStr) ||
      emp.last_name?.toLowerCase().includes(searchStr) ||
      emp.employee_id?.toLowerCase().includes(searchStr) ||
      emp.designation_name?.toLowerCase().includes(searchStr)
    );

    const matchesDept = !filters.department || String(emp.department) === filters.department;

    return matchesSearch && matchesDept;
  });

  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="space-y-8 pb-10 bg-slate-50/50 min-h-screen -m-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Workforce Directory</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Discover and connect with your organization&apos;s talent.</p>
        </div>
        {(isAdmin || isHR) && (
          <Link to="/employees/add"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 group"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            <span>Onboard New Staff</span>
          </Link>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard icon={<Users />} label="Headcount" value={stats.total} color="indigo" />
        <StatCard icon={<Building2 />} label="Structure" value={`${stats.departments} Units`} color="amber" />
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employees by name, ID, or designation..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 border rounded-2xl text-sm font-bold transition-all shadow-sm flex-1 md:flex-none",
              activeFiltersCount > 0 ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            <Filter className="w-4 h-4" />
            <span>Refine {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
          </button>

          {showFilters && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-50 space-y-6 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Filters</h4>
                <button onClick={() => setShowFilters(false)}><X className="w-4 h-4 text-slate-300" /></button>
              </div>
              <div className="space-y-4">
                <FilterSelect label="Department" value={filters.department} options={departments.map(d => ({ value: d.id, label: d.department_name }))} onChange={(val: string) => setFilters({ ...filters, department: val })} />
              </div>
              <button onClick={() => setFilters({ department: '' })} className="w-full py-2 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-colors">Clear All</button>
            </div>
          )}
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="font-bold text-xs uppercase tracking-widest text-slate-400">Syncing Workforce...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center"><Users className="w-8 h-8 text-slate-300" /></div>
          <div>
            <p className="text-xl font-black text-slate-900">No results found</p>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or search term.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredEmployees.map((emp) => (
            <EmployeeCard key={emp.id} emp={emp} getAvatarUrl={getAvatarUrl} isAdmin={isAdmin || isHR} />
          ))}
        </div>
      )}

      {/* Footer Stats */}
      {!loading && (
        <div className="flex justify-center pt-8">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
            End of Directory • <span className="text-slate-900">{filteredEmployees.length}</span> Results
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = {
    indigo: "bg-indigo-50 text-indigo-600 hover:border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-600 hover:border-emerald-200",
    amber: "bg-amber-50 text-amber-600 hover:border-amber-200"
  };
  return (
    <div className={cn("bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all group", colors[color])}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm group-hover:scale-110 transition-transform">{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
      </div>
      <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
    </div>
  );
}

function EmployeeCard({ emp, getAvatarUrl, isAdmin }: any) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden flex flex-col h-full">
      {/* Top: Name */}
      <div className="flex justify-between items-start mb-6">
        <div className="text-left flex-1 min-w-0 pr-2">
          {isAdmin ? (
            <Link to={`/employees/details?id=${emp.id}`} className="block">
              <h3 className="font-black text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                {emp.first_name} {emp.last_name}
              </h3>
            </Link>
          ) : (
            <h3 className="font-black text-slate-900 text-sm truncate">
              {emp.first_name} {emp.last_name}
            </h3>
          )}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate mt-0.5">{emp.designation_name || 'New Member'}</p>
        </div>
      </div>

      {/* Middle: Avatar */}
      {isAdmin ? (
        <Link to={`/employees/details?id=${emp.id}`} className="mb-6 flex justify-center relative">
          <div className="w-24 h-24 rounded-full p-1 bg-white border border-slate-100 shadow-sm group-hover:border-indigo-100 transition-colors">
            <div className="w-full h-full rounded-full overflow-hidden bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-2xl uppercase">
              {emp.avatar ? (
                <img src={getAvatarUrl(emp.avatar)} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              ) : (
                <span>{emp.first_name[0]}{emp.last_name ? emp.last_name[0] : ''}</span>
              )}
            </div>
          </div>
        </Link>
      ) : (
        <div className="mb-6 flex justify-center relative">
          <div className="w-24 h-24 rounded-full p-1 bg-white border border-slate-100 shadow-sm">
            <div className="w-full h-full rounded-full overflow-hidden bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-2xl uppercase">
              {emp.avatar ? (
                <img src={getAvatarUrl(emp.avatar)} className="w-full h-full object-cover" />
              ) : (
                <span>{emp.first_name[0]}{emp.last_name ? emp.last_name[0] : ''}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email */}
      <p className="text-[11px] font-medium text-slate-400 mb-6 text-center truncate px-2">{emp.email}</p>

      {/* Details Grid */}
      <div className="space-y-4 mt-auto">
        <DetailRow icon={<MapPin className="w-3 h-3" />} label="Location" value={`${emp.city || 'N/A'}, ${emp.country || 'USA'}`} />
        <DetailRow icon={<Phone className="w-3 h-3" />} label="Contact" value={emp.phone_number || 'N/A'} />
        <div className="flex justify-between items-center gap-2 pt-2 mt-2 border-t border-slate-50">
           {isAdmin && (
             <Link to={`/employees/edit?id=${emp.id}`} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Edit</Link>
           )}
           <span className="text-[10px] font-bold text-slate-300 tracking-widest ml-auto">{emp.employee_id}</span>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: any) {
  return (
    <div className="flex justify-between items-center gap-4">
      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
        <span className="text-slate-300">{icon}</span>
        {label}
      </div>
      <span className="text-[10px] font-bold text-slate-700 truncate max-w-[100px]">{value}</span>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/10"
      >
        <option value="">All {label}s</option>
        {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}
