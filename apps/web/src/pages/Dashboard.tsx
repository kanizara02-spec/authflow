import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { securityApi } from "../api/endpoints";

export default function Dashboard() {
  const { user } = useAuth();
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    securityApi.getScore().then((res) => setScore(res.data.total)).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      {/* Clean Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back, {user?.fullName}</h1>
          </div>
          <p className="text-xs text-slate-600 mt-1 font-mono">Authenticated via AuthFlow Identity Engine.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">STATUS:</span>
          <span className="badge badge-success text-xs font-mono">SESSION ACTIVE</span>
        </div>
      </div>

      {/* Top 3 Stat Cards */}
      <div className="grid sm:grid-cols-3 gap-5">
        <StatCard
          label="Security Health Score"
          value={score !== null ? `${score}/100` : "..."}
          accent={score !== null && score >= 70 ? "emerald" : "amber"}
          subtext="Computed from 2FA, password policy & device trust"
        />
        <StatCard
          label="Two-Factor Protection"
          value={user?.twoFactorEnabled ? "Active (RFC 6238)" : "Disabled (At Risk)"}
          accent={user?.twoFactorEnabled ? "emerald" : "rose"}
          subtext={user?.twoFactorEnabled ? "HMAC-SHA1 TOTP enforced" : "Single-password bottleneck"}
        />
        <StatCard
          label="Account Status"
          value={user?.emailVerified ? "Verified User" : "Pending Verification"}
          accent={user?.emailVerified ? "cyan" : "amber"}
          subtext={user?.email}
        />
      </div>

      {/* Warning Banner if 2FA Disabled */}
      {!user?.twoFactorEnabled && (
        <div className="glass-panel p-6 border-amber-300 bg-amber-50/60 relative">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-slate-900">Your Account Lacks Multi-Factor Protection</h2>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                Without TOTP 2FA enabled, your account relies solely on password security. Enable 2FA now to pair Google/Microsoft Authenticator and generate 10 single-use recovery codes.
              </p>
              <Link to="/settings" className="btn-primary mt-4 inline-flex text-xs py-2 px-5">
                Enable 2FA Protection &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick Security Actions Grid */}
      <div>
        <h2 className="text-xs font-mono uppercase tracking-wider text-slate-600 font-semibold mb-4">
          Quick Security Actions
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <QuickLink
            to="/security"
            title="Security Score &amp; Risk Gauge"
            desc="Detailed score component breakdown, active risk signals, and live audit event stream."
            icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
          <QuickLink
            to="/sessions"
            title="Active Sessions Management"
            desc="Inspect all browser/device sessions currently logged into your account and revoke remote sessions."
            icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
          <QuickLink
            to="/devices"
            title="Trusted Device Registry"
            desc="Manage devices marked as trusted to skip repeated 2FA challenges on secure hardware."
            icon="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
          <QuickLink
            to="/activity"
            title="Full Audit Log Feed"
            desc="Complete chronological history of password changes, TOTP attempts, logins, and session events."
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  subtext,
}: {
  label: string;
  value: string;
  accent: "emerald" | "amber" | "rose" | "cyan";
  subtext?: string;
}) {
  const accentStyles = {
    emerald: "text-emerald-700 border-emerald-200 bg-emerald-50/50",
    amber: "text-amber-800 border-amber-200 bg-amber-50/50",
    rose: "text-red-700 border-red-200 bg-red-50/50",
    cyan: "text-blue-700 border-blue-200 bg-blue-50/50",
  };

  return (
    <div className={`glass-card ${accentStyles[accent]} border`}>
      <div className="text-xs font-mono uppercase tracking-wider text-slate-600 font-semibold">{label}</div>
      <div className="text-2xl font-bold font-mono tracking-tight mt-1.5">{value}</div>
      {subtext && <div className="text-[11px] text-slate-500 mt-2 truncate">{subtext}</div>}
    </div>
  );
}

function QuickLink({ to, title, desc, icon }: { to: string; title: string; desc: string; icon: string }) {
  return (
    <Link to={to} className="glass-card glass-card-hover group block">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-blue-600 group-hover:border-blue-300 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <div className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{title}</div>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
    </Link>
  );
}
