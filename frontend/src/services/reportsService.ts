import api from '@/lib/api';

export interface WorkforceReport {
  total: number;
  by_department: { department_name: string; count: number }[];
  by_designation: { designation__title: string | null; count: number }[];
}

export interface AttendanceReport {
  monthly_trend: { month: string; status: string; count: number }[];
  status_totals: Record<string, number>;
  avg_work_hours: number;
}

export interface LeavesReport {
  total: number;
  approval_rate: number;
  by_type: { leave_type: string; count: number }[];
  by_status: { status: string; count: number }[];
  monthly_trend: { month: string; count: number }[];
}

export interface PayrollReport {
  monthly_trend: { month: string; total: number; count: number }[];
  by_department: { department: string; avg_net_pay: number; total_net_pay: number; count: number }[];
  status_split: { paid: number; pending: number; total: number };
}

export interface PerformanceReport {
  overall_avg_rating: number;
  rating_distribution: { rating: number; count: number }[];
  by_department: { department: string; avg_rating: number; count: number }[];
  top_performers: { employee__first_name: string; employee__last_name: string; employee__employee_id: string; rating: number; review_date: string }[];
}

const buildParams = (year?: string, month?: string) => {
  const params: Record<string, string> = {};
  if (year) params.year = year;
  if (month) params.month = month;
  return { params };
};

export const reportsService = {
  getWorkforce: async (year?: string): Promise<WorkforceReport> => {
    const r = await api.get('/reports/workforce/', buildParams(year));
    return r.data;
  },
  getAttendance: async (year?: string): Promise<AttendanceReport> => {
    const r = await api.get('/reports/attendance/', buildParams(year));
    return r.data;
  },
  getLeaves: async (year?: string): Promise<LeavesReport> => {
    const r = await api.get('/reports/leaves/', buildParams(year));
    return r.data;
  },
  getPayroll: async (year?: string): Promise<PayrollReport> => {
    const r = await api.get('/reports/payroll/', buildParams(year));
    return r.data;
  },
  getPerformance: async (year?: string): Promise<PerformanceReport> => {
    const r = await api.get('/reports/performance/', buildParams(year));
    return r.data;
  },
};
