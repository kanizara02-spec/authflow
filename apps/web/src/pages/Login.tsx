import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/endpoints";
import { extractApiError } from "../api/client";
import { AuthCard } from "./Register";
import { useAuth } from "../context/AuthContext";

type Step = "credentials" | "totp" | "recovery";

export default function Login() {
  const navigate = useNavigate();
  const { user, logout, refresh } = useAuth();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmitCredentials(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.data.status === "TOTP_REQUIRED") {
        setChallengeToken(res.data.challengeToken);
        setStep("totp");
      } else {
        await refresh();
        navigate("/dashboard");
      }
    } catch (err) {
      setError(extractApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitTotp(e: FormEvent) {
    e.preventDefault();
    if (!challengeToken) return;
    setError(null);
    setSubmitting(true);
    try {
      await authApi.verify2fa({ challengeToken, code });
      await refresh();
      navigate("/dashboard");
    } catch (err) {
      setError(extractApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitRecovery(e: FormEvent) {
    e.preventDefault();
    if (!challengeToken) return;
    setError(null);
    setSubmitting(true);
    try {
      await authApi.verifyRecovery({ challengeToken, recoveryCode });
      await refresh();
      navigate("/dashboard");
    } catch (err) {
      setError(extractApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "totp") {
    return (
      <AuthCard
        title="Two-Factor Challenge"
        subtitle="Open your authenticator app (Google Authenticator, Microsoft Authenticator, Authy) and enter the 6-digit time-based code."
      >
        <form onSubmit={onSubmitTotp} className="space-y-5" noValidate>
          <div>
            <label htmlFor="code" className="label text-center">Enter 6-Digit TOTP Code</label>
            <div className="relative">
              <input
                id="code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                className="input text-center text-3xl font-mono tracking-[0.5em] py-3 text-blue-600 border-blue-400 shadow-sm focus:ring-blue-500/20"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-mono text-center" role="alert">
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting || code.length !== 6} className="btn-primary w-full py-2.5">
            {submitting ? "Verifying TOTP..." : "Complete Verification \u2192"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
          <button
            type="button"
            onClick={() => { setError(null); setStep("recovery"); }}
            className="text-xs text-blue-600 hover:underline font-mono inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Use a single-use recovery code instead
          </button>
        </div>
      </AuthCard>
    );
  }

  if (step === "recovery") {
    return (
      <AuthCard
        title="Recovery Code Challenge"
        subtitle="Enter one of your 10 stored single-use recovery codes (e.g. XXXX-XXXX-XXXX)."
      >
        <form onSubmit={onSubmitRecovery} className="space-y-4" noValidate>
          <div>
            <label htmlFor="recoveryCode" className="label">Recovery Code</label>
            <input
              id="recoveryCode"
              className="input font-mono text-center tracking-wider text-base uppercase"
              required
              autoFocus
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-mono text-center" role="alert">
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting || !recoveryCode.trim()} className="btn-primary w-full py-2.5">
            {submitting ? "Consuming Code..." : "Verify Recovery Code \u2192"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
          <button
            type="button"
            onClick={() => { setError(null); setStep("totp"); }}
            className="text-xs text-slate-600 hover:text-slate-900 hover:underline font-mono"
          >
            &larr; Back to authenticator app code
          </button>
        </div>
      </AuthCard>
    );
  }

  function handleGoogleAuth() {
    window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/auth/google`;
  }

  return (
    <AuthCard title="Sign In to AuthFlow" subtitle="Enter your registered email address and master password.">
      {user && (
        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center justify-between">
          <span>Currently signed in as <strong>{user.email}</strong>.</span>
          <button onClick={() => logout()} className="text-blue-600 hover:underline font-semibold ml-2">
            Sign Out &rarr;
          </button>
        </div>
      )}

      {/* Google OAuth Alternative Login Button */}
      <button
        type="button"
        onClick={handleGoogleAuth}
        className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-xs mb-4"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        Continue with Google
      </button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-600 font-mono">Or sign in with email</span>
        </div>
      </div>

      <form onSubmit={onSubmitCredentials} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label">Email Address</label>
          <input
            id="email"
            type="email"
            className="input"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="user@domain.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="label mb-0">Master Password</label>
            <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline font-mono">
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            className="input"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••••••"
          />
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
              Authenticating...
            </span>
          ) : (
            "Authenticate \u2192"
          )}
        </button>
      </form>

      <p className="text-xs text-slate-600 mt-6 text-center">
        Don't have an account? <Link to="/register" className="text-blue-600 hover:underline font-semibold">Sign Up</Link>
      </p>
    </AuthCard>
  );
}
