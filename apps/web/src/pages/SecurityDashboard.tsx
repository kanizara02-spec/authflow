import { useEffect, useState } from "react";
import { securityApi } from "../api/endpoints";

interface ScoreData {
  total: number;
  components: Array<{ label: string; points: number }>;
}

export default function SecurityDashboard() {
  const [score, setScore] = useState<ScoreData | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    securityApi.getScore().then((res) => setScore(res.data)).catch(() => {});
    securityApi.listEvents().then((res) => setEvents(res.data.slice(0, 8))).catch(() => {});
  }, []);

  const totalScore = score?.total ?? 0;
  const scoreColor =
    totalScore >= 80 ? "text-cyber-emerald border-cyber-emerald" : totalScore >= 50 ? "text-cyber-amber border-cyber-amber" : "text-cyber-rose border-cyber-rose";
  const scoreStatusText =
    totalScore >= 80 ? "EXCELLENT PROTECTION" : totalScore >= 50 ? "MODERATE PROTECTION" : "SECURITY RISKS DETECTED";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security Score &amp; Protection</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1 font-medium">Real-time risk engine analysis &amp; security policy score.</p>
        </div>

        <div className={`badge ${totalScore >= 80 ? "badge-success" : totalScore >= 50 ? "badge-warning" : "badge-danger"} font-mono text-xs px-3 py-1.5 font-bold`}>
          {scoreStatusText}
        </div>
      </div>

      {/* Security Health Score Card & Breakdown */}
      {score && (
        <div className="grid md:grid-cols-12 gap-6">
          {/* Gauge Ring */}
          <div className="md:col-span-5 glass-panel p-6 flex flex-col items-center justify-center relative">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" className="text-slate-200" fill="transparent" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="8"
                  className={`${totalScore >= 80 ? "text-emerald-600" : totalScore >= 50 ? "text-amber-500" : "text-rose-600"} transition-all duration-1000`}
                  fill="transparent"
                  strokeDasharray="263.89"
                  strokeDashoffset={263.89 - (263.89 * totalScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-extrabold font-mono text-slate-900 tracking-tighter">{score.total}</span>
                <span className="text-[10px] font-mono uppercase text-slate-600 font-bold">OUT OF 100</span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <span className="text-xs font-bold text-slate-700">Account Security Index</span>
            </div>
          </div>

          {/* Component Point Meters */}
          <div className="md:col-span-7 glass-panel p-6 space-y-3">
            <h2 className="text-xs uppercase text-slate-700 tracking-wider font-bold mb-4">
              Security Component Evaluation
            </h2>
            <div className="space-y-3">
              {score.components.map((c) => (
                <div key={c.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between shadow-xs">
                  <span className="text-xs font-bold text-slate-900">{c.label}</span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${c.points >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                    {c.points >= 0 ? `+${c.points} pts` : `${c.points} pts`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Audit Event Stream */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Live Security Audit Feed</h2>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600">{events.length} Events Logged</span>
        </div>

        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-slate-100/80 transition-colors shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <div>
                  <div className="text-xs font-bold text-slate-900">{humanizeEventType(e.type)}</div>
                  <div className="text-[11px] font-mono text-slate-600 font-medium">IP: {e.ipAddress || "Internal"} &bull; {e.userAgent || "System Client"}</div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-700 font-bold">{new Date(e.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {events.length === 0 && <p className="text-xs text-slate-600 font-medium py-4 text-center">No security events recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}

export function humanizeEventType(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}
