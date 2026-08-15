import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
import { VerifyEmail, ForgotPassword, ResetPassword } from "./pages/PasswordFlows";
import Dashboard from "./pages/Dashboard";
import SecurityDashboard from "./pages/SecurityDashboard";
import Sessions from "./pages/Sessions";
import { Devices, Activity } from "./pages/DevicesAndActivity";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import { AppShell } from "./components/AppShell";
import { RequireAuth, RequireAdmin, RedirectIfAuthed } from "./components/RouteGuards";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
      <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/security" element={<SecurityDashboard />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route element={<RequireAdmin />}>
        <Route element={<AppShell />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400">Page not found.</p>
    </div>
  );
}
