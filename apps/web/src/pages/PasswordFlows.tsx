import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { checkPasswordPolicy } from "@authflow/shared";
import { authApi } from "../api/endpoints";
import { extractApiError } from "../api/client";
import { AuthCard } from "./Register";

export function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(extractApiError(err).message);
      });
  }, [params]);

  return (
    <AuthCard title="Email verification">
      {status === "loading" && <p className="text-slate-400 text-sm">Verifying…</p>}
      {status === "success" && (
        <>
          <p className="text-sm text-emerald-400">Your email has been verified.</p>
          <Link to="/login" className="btn-primary mt-6 inline-block">Log in</Link>
        </>
      )}
      {status === "error" && <p className="error-text">{message}</p>}
    </AuthCard>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
    } finally {
      setSubmitting(false);
      setSent(true); // always show the same state, win or lose — no enumeration
    }
  }

  if (sent) {
    return (
      <AuthCard title="Check your email">
        <p className="text-slate-400 text-sm">If that email is registered, we've sent a password reset link. It expires in 30 minutes.</p>
        <Link to="/login" className="btn-primary mt-6 inline-block">Back to login</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="We'll email you a link to reset it.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthCard>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const policy = checkPasswordPolicy(newPassword);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) return setError("Passwords do not match.");
    if (!policy.valid) return setError("Please meet all password requirements.");
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, newPassword, confirmPassword });
      setDone(true);
    } catch (err) {
      setError(extractApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthCard title="Password reset">
        <p className="text-sm text-emerald-400">Your password has been reset. Please log in with your new password.</p>
        <button onClick={() => navigate("/login")} className="btn-primary mt-6">Go to login</button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="newPassword" className="label">New password</label>
          <input id="newPassword" type="password" className="input" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
            {policy.failures.map((f) => <li key={f} className="text-red-400/90">• {f}</li>)}
          </ul>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="label">Confirm new password</label>
          <input id="confirmPassword" type="password" className="input" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </AuthCard>
  );
}
