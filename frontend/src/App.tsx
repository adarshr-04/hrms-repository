import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/auth/AuthGuard';

const HomePage = lazy(() => import('./pages/page'));
const LoginPage = lazy(() => import('./pages/login/page'));
const ActivatePage = lazy(() => import('./pages/activate/page'));
const EmployeesPage = lazy(() => import('./pages/employees/page'));
const EmployeeAddPage = lazy(() => import('./pages/employees/add/page'));
const EmployeeDetailsPage = lazy(() => import('./pages/employees/details/page'));
const EmployeeEditPage = lazy(() => import('./pages/employees/edit/page'));
const AttendancePage = lazy(() => import('./pages/attendance/page'));
const LeavesPage = lazy(() => import('./pages/leaves/page'));
const PerformancePage = lazy(() => import('./pages/performance/page'));
const ProjectsPage = lazy(() => import('./pages/projects/page'));
const TrackerPage = lazy(() => import('./pages/tracker/page'));
const TrainingPage = lazy(() => import('./pages/training/page'));
const PayrollPage = lazy(() => import('./pages/payroll/page'));
const RecruitmentPage = lazy(() => import('./pages/recruitment/page'));
const SettingsPage = lazy(() => import('./pages/settings/page'));
const NotificationsPage = lazy(() => import('./pages/notifications/page'));
const ReportsPage = lazy(() => import('./pages/reports/page'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGuard>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/activate" element={<ActivatePage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/employees/add" element={<EmployeeAddPage />} />
              <Route path="/employees/details" element={<EmployeeDetailsPage />} />
              <Route path="/employees/edit" element={<EmployeeEditPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/leaves" element={<LeavesPage />} />
              <Route path="/performance" element={<PerformancePage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/tracker" element={<TrackerPage />} />
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/payroll" element={<PayrollPage />} />
              <Route path="/recruitment" element={<RecruitmentPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Routes>
          </Suspense>
        </AuthGuard>
      </AuthProvider>
    </BrowserRouter>
  );
}
