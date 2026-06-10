
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { isRouteAllowed } from "@/auth/routeAccess";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated && location.pathname !== '/login' && location.pathname !== '/activate') {
      navigate('/login');
    }
  }, [isAuthenticated, loading, location.pathname, navigate]);

  useEffect(() => {
    if (loading || !isAuthenticated || location.pathname === "/login" || location.pathname === "/activate") return;
    const role = user?.role ?? "EMPLOYEE";
    if (!isRouteAllowed(location.pathname, role)) {
      navigate("/");
    }
  }, [isAuthenticated, loading, location.pathname, navigate, user?.role]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  // If we are on the login or activation page, just show the page without the layout
  if (location.pathname === '/login' || location.pathname === '/activate') {
    return (
      <>
        {children}
        <Toaster position="top-right" expand={false} richColors />
      </>
    );
  }

  // If we are authenticated, show the children wrapped in MainLayout
  if (isAuthenticated) {
    return (
      <>
        <MainLayout>{children}</MainLayout>
        <Toaster position="top-right" expand={false} richColors />
      </>
    );
  }

  // Default return for redirect state
  return null;
}
