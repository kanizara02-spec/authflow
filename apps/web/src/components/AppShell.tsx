import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: "/security",
    label: "Security Score",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    to: "/sessions",
    label: "Active Sessions",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: "/devices",
    label: "Trusted Devices",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: "/activity",
    label: "Audit Logs",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Account Settings",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900">
      {/* Top Mobile Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-40">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg text-slate-900">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs">
            AF
          </div>
          AuthFlow
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Mobile Nav Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 bottom-0 left-0 z-40 w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
              AF
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 block">AuthFlow</span>
              <span className="text-[10px] font-mono tracking-wider text-blue-600 font-semibold uppercase block">Identity Platform</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-600 font-semibold">
            Navigation
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200/80 shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {user?.role === "ADMIN" && (
            <NavLink
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-purple-50 text-purple-700 font-semibold border border-purple-200/80"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Admin Security Console
            </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-sm font-bold text-slate-700">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 truncate">{user?.fullName}</div>
              <div className="text-xs text-slate-600 font-mono truncate">{user?.email}</div>
            </div>
          </div>
          <button onClick={() => logout()} className="w-full btn-secondary text-xs py-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
