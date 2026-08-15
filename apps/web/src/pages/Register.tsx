import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { checkPasswordPolicy } from "@authflow/shared";
import { authApi } from "../api/endpoints";
import { extractApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const policy = checkPasswordPolicy(password);
  const strengthLabels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!policy.valid) return setError("Please meet all password requirements.");

    setSubmitting(true);
    try {
      await authApi.register({ fullName, email, password, confirmPassword });
      setDone(true);
    } catch (err) {
      setError(extractApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthCard title="Check your email">
        <p className="text-slate-600 text-sm">
          If <span className="text-slate-900 font-semibold">{email}</span> isn't already registered, we've sent a verification
          link. Click it to activate your account, then log in.
        </p>
        <Link to="/login" className="btn-primary mt-6 inline-block">Back to login</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create Account" subtitle="Zero password-only trust — multi-factor identity layer.">
      {user && (
        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center justify-between">
          <span>Currently signed in as <strong>{user.email}</strong>.</span>
          <button onClick={() => logout()} className="text-blue-600 hover:underline font-semibold ml-2">
            Sign Out &rarr;
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="fullName" className="label">Full Name</label>
          <input id="fullName" className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" placeholder="Kani Student" />
        </div>
        <div>
          <label htmlFor="email" className="label">Email Address</label>
          <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="user@domain.com" />
        </div>
        <div>
          <label htmlFor="password" className="label">Master Password</label>
          <input id="password" type="password" className="input" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" aria-describedby="password-requirements" placeholder="••••••••••••" />
          {password.length > 0 && (
            <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-500">Strength Meter:</span>
                <span className="font-bold text-slate-900">{strengthLabels[policy.score]}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-full flex-1 rounded-full transition-all duration-300 ${i <= policy.score ? strengthColors[policy.score] : "bg-transparent"}`} />
                ))}
              </div>
            </div>
          )}
          {policy.failures.length > 0 && password.length > 0 && (
            <ul id="password-requirements" className="mt-2 space-y-1 text-xs text-red-600 font-mono">
              {policy.failures.map((f: string) => (
                <li key={f} className="flex items-center gap-1.5">
                  <span>&bull;</span> {f}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label htmlFor="confirmPassword" className="label">Confirm Password</label>
          <input id="confirmPassword" type="password" className="input" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="••••••••••••" />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-mono" role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 mt-2">
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m8-8h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
              </svg>
              Creating Account...
            </span>
          ) : (
            "Create Account \u2192"
          )}
        </button>
      </form>
      <p className="text-xs text-slate-600 mt-6 text-center">
        Already registered? <Link to="/login" className="text-blue-600 hover:underline font-semibold">Sign In</Link>
      </p>
    </AuthCard>
  );
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              AF
            </div>
            <div className="text-left">
              <span className="text-lg font-bold tracking-tight text-slate-900 block">AuthFlow</span>
              <span className="text-[9px] font-mono text-blue-600 tracking-wider font-semibold uppercase block">Identity Platform</span>
            </div>
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-1 font-light">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
