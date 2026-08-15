import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { securityApi } from "../api/endpoints";

interface SessionRow {
  id: string;
  deviceName: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export default function Sessions() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  function load() {
    securityApi.listSessions().then((res) => setSessions(res.data)).catch(() => {});
  }

  useEffect(load, []);

  async function revoke(id: string, isCurrent: boolean) {
    setBusyId(id);
    try {
      await securityApi.revokeSession(id);
      if (isCurrent) {
        setStatusMessage("Current session revoked. Signing out...");
        await logout();
        navigate("/login");
        return;
      }
      setStatusMessage("Session revoked successfully.");
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function revokeOthers() {
    setBusyId("all");
    try {
      await securityApi.revokeOtherSessions();
      setStatusMessage("All other active sessions revoked successfully.");
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Status Notification Banner */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm font-semibold flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Active Device Sessions</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            All active web &amp; mobile sessions associated with your account. Revoking a session immediately kills its refresh token family.
          </p>
        </div>

        <button onClick={revokeOthers} disabled={busyId === "all" || busyId !== null} className="btn-danger text-xs py-2.5 px-4 font-bold disabled:opacity-50">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {busyId === "all" ? "Revoking..." : "Revoke All Other Sessions"}
        </button>
      </div>

      {/* Session Cards */}
      <div className="space-y-4">
        {sessions.map((s) => (
          <div key={s.id} className="glass-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-blue-600 shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">{s.browser || "Web Client"} on {s.os || "Device"}</span>
                  {s.isCurrent && (
                    <span className="badge badge-success text-[10px] font-mono font-bold">THIS CURRENT DEVICE</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-600 mt-1.5 font-medium">
                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    IP: {s.ipAddress || "Internal/Local"}
                  </span>
                  <span>&bull;</span>
                  <span>Last active: {new Date(s.lastActiveAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button onClick={() => revoke(s.id, s.isCurrent)} disabled={busyId === s.id || busyId === "all"} className="btn-danger text-xs py-2 px-4 shrink-0 font-bold disabled:opacity-50">
              {busyId === s.id ? "Revoking..." : s.isCurrent ? "Revoke Current Session" : "Revoke Session"}
            </button>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="glass-panel p-8 text-center text-xs font-mono text-slate-500 font-medium">
            No active sessions found.
          </div>
        )}
      </div>
    </div>
  );
}
