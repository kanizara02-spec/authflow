import { useEffect, useState } from "react";
import { securityApi } from "../api/endpoints";
import { humanizeEventType } from "./SecurityDashboard";

export function Devices() {
  const [devices, setDevices] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    securityApi.listDevices().then((res) => setDevices(res.data));
  }
  useEffect(load, []);

  async function revoke(id: string) {
    setBusyId(id);
    try {
      await securityApi.revokeDevice(id);
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Trusted Devices</h1>
        <p className="text-sm text-slate-600 mt-1 font-medium">Devices you've marked as trusted. Trust is never a permanent bypass — entries expire automatically.</p>
      </div>
      <div className="space-y-3">
        {devices.map((d) => (
          <div key={d.id} className="glass-panel p-5 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 text-base">{d.deviceName ?? "Unnamed device"}</div>
              <div className="text-xs text-slate-600 font-mono mt-1 font-semibold">
                Last seen: {new Date(d.lastSeenAt).toLocaleString()} &bull; Expires: {new Date(d.expiresAt).toLocaleDateString()}
              </div>
            </div>
            <button onClick={() => revoke(d.id)} disabled={busyId === d.id} className="btn-danger text-xs py-2 px-4 font-bold disabled:opacity-50">
              {busyId === d.id ? "Revoking..." : "Revoke Access"}
            </button>
          </div>
        ))}
        {devices.length === 0 && <p className="text-sm text-slate-600 font-medium glass-panel p-5 text-center">No trusted devices registered yet.</p>}
      </div>
    </div>
  );
}

export function Activity() {
  const [tab, setTab] = useState<"events" | "notifications">("events");
  const [events, setEvents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    securityApi.listEvents().then((res) => setEvents(res.data));
    securityApi.listNotifications().then((res) => setNotifications(res.data));
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security Audit Logs &amp; Activity</h1>
        <p className="text-sm text-slate-600 mt-1 font-medium">Immutable audit trail and real-time security alerts for your account.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab("events")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
            tab === "events" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Audit Log Events
        </button>
        <button
          onClick={() => setTab("notifications")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
            tab === "notifications" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Security Alerts
          {notifications.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-mono font-bold px-2 py-0.5">
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      {tab === "events" && (
        <div className="glass-panel divide-y divide-slate-200 overflow-hidden">
          {events.map((e) => (
            <div key={e.id} className="px-5 py-3.5 flex items-center justify-between text-sm hover:bg-slate-50/50 transition-colors">
              <span className="text-slate-900 font-bold text-sm">{humanizeEventType(e.type)}</span>
              <div className="text-right">
                <div className="text-slate-700 font-mono text-xs font-bold">{new Date(e.createdAt).toLocaleString()}</div>
                {e.ipAddress && <div className="text-slate-600 font-mono text-xs font-medium">IP: {e.ipAddress}</div>}
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="text-sm text-slate-600 font-medium px-5 py-6 text-center">No security audit events recorded yet.</p>}
        </div>
      )}

      {tab === "notifications" && (
        <div className="glass-panel divide-y divide-slate-200 overflow-hidden">
          {notifications.map((n) => (
            <div key={n.id} className="px-5 py-4 text-sm hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-slate-900 font-bold">{n.title ?? humanizeEventType(n.type)}</span>
                <span className="text-slate-700 text-xs font-mono font-bold">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              {n.body && <p className="text-slate-700 text-xs mt-1.5 font-medium">{n.body}</p>}
            </div>
          ))}
          {notifications.length === 0 && <p className="text-sm text-slate-600 font-medium px-5 py-6 text-center">No security notifications.</p>}
        </div>
      )}
    </div>
  );
}
