import { useEffect, useState } from "react";
import { adminApi } from "../api/endpoints";
import { humanizeEventType } from "./SecurityDashboard";

export default function Admin() {
  const [overview, setOverview] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    adminApi.overview().then((r) => setOverview(r.data)).catch(() => {});
    adminApi.users().then((r) => setUsers(r.data)).catch(() => {});
    adminApi.events().then((r) => setEvents(r.data.slice(0, 10))).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-cyan animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Enterprise Security Command Console</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Platform-wide identity metrics, RBAC directory &amp; audit stream. Secrets (passwords, TOTP keys, recovery hashes) are strictly isolated and unreadable.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="badge badge-info text-xs font-mono py-1 px-3">SYSTEM SLA: 99.999%</div>
          <div className="badge badge-success text-xs font-mono py-1 px-3">POLICY: STRICT</div>
        </div>
      </div>

      {/* Aggregate Metric Widgets */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricWidget label="Total Registered Users" value={overview.totalUsers} icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" accent="cyan" />
          <MetricWidget label="Active Sessions" value={overview.activeSessions} icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" accent="emerald" />
          <MetricWidget label="Failed Logins (24h)" value={overview.failedLogins24h} icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" accent="amber" />
          <MetricWidget label="2FA Adoption Rate" value={`${overview.twoFactorAdoption}%`} icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" accent="emerald" />
          <MetricWidget label="Suspicious Events (24h)" value={overview.suspiciousEvents24h} icon="M13 10V3L4 14h7v7l9-11h-7z" accent="rose" />
        </div>
      )}

      {/* User Directory Table */}
      <div className="glass-panel overflow-hidden glow-border">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-cyber-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">User Directory &amp; RBAC Metadata</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">{users.length} Enrolled Users</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="bg-ink-950/80 text-slate-400 text-left border-b border-slate-800/80 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-semibold">User Email</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Account Status</th>
                <th className="px-5 py-3 font-semibold">2FA Protection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-ink-900/50 transition-colors">
                  <td className="px-5 py-3 text-slate-200 font-semibold">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${u.role === "ADMIN" ? "bg-cyber-violet/20 text-cyber-violet border border-cyber-violet/40" : "bg-slate-800 text-slate-300"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge ${u.status === "ACTIVE" ? "badge-success" : "badge-warning"} text-[10px]`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge ${u.securitySettings?.twoFactorEnabled ? "badge-success" : "badge-danger"} text-[10px]`}>
                      {u.securitySettings?.twoFactorEnabled ? "2FA ENABLED" : "2FA INACTIVE"}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-slate-500 font-mono">
                    No registered users in directory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Audit Feed */}
      <div className="glass-panel p-6 glow-border">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-cyber-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Platform Global Audit Stream</h2>
          </div>
          <span className="text-xs font-mono text-slate-500">Live Feed</span>
        </div>

        <div className="space-y-2.5">
          {events.map((e) => (
            <div key={e.id} className="p-3.5 rounded-xl bg-ink-900/90 border border-slate-800/70 flex items-center justify-between hover:border-slate-700 transition-colors text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-cyber-cyan animate-ping" />
                <div>
                  <span className="font-bold text-slate-100">{humanizeEventType(e.type)}</span>
                  <span className="text-slate-500 ml-2">User ID: {e.userId?.slice(0, 8)}...</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{new Date(e.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricWidget({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: string;
  accent: "cyan" | "emerald" | "amber" | "rose";
}) {
  const colors = {
    cyan: "text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/5",
    emerald: "text-cyber-emerald border-cyber-emerald/30 bg-cyber-emerald/5",
    amber: "text-cyber-amber border-cyber-amber/30 bg-cyber-amber/5",
    rose: "text-cyber-rose border-cyber-rose/30 bg-cyber-rose/5",
  };

  return (
    <div className={`glass-card p-4 border ${colors[accent]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">{label}</span>
        <svg className="w-4 h-4 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <div className="text-2xl font-bold font-mono text-white tracking-tight">{value}</div>
    </div>
  );
}
