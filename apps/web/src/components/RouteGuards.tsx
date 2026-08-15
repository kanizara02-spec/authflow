import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" aria-label="Loading" role="status" />
    </div>
  );
}
