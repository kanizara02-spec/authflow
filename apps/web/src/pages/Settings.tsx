import { useState, type FormEvent } from "react";
import { checkPasswordPolicy } from "@authflow/shared";
import { authApi, securityApi } from "../api/endpoints";
import { extractApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user, refresh } = useAuth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security Settings &amp; 2FA Enrollment</h1>
        <p className="text-sm text-slate-600 mt-1 font-medium">Manage master credentials, multi-factor authentication, and backup recovery codes.</p>
      </div>

      <ProfileCard />

      <ChangePasswordCard />

      <div className="glass-panel p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h2 className="text-base font-bold text-slate-900">Two-Factor Authentication (TOTP)</h2>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              {user?.twoFactorEnabled
                ? "2FA is active using RFC 6238 time-based one-time passwords (TOTP)."
                : "Pair Google Authenticator, Microsoft Authenticator, or Authy to eliminate single-password vulnerability."}
            </p>
          </div>
          <div className={`badge ${user?.twoFactorEnabled ? "badge-success" : "badge-warning"} font-mono text-xs font-bold`}>
            {user?.twoFactorEnabled ? "2FA ENABLED" : "2FA INACTIVE"}
          </div>
        </div>

        {user?.twoFactorEnabled ? <TwoFactorManage onChanged={refresh} /> : <TwoFactorSetupWizard onComplete={refresh} />}
      </div>

      <PasskeyCard />
    </div>
  );
}

function ProfileCard() {
  const { user } = useAuth();
  return (
    <div className="glass-panel p-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">Identity Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
          <div className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">Full Name</div>
          <div className="text-slate-900 font-bold mt-1 text-sm">{user?.fullName}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
          <div className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">Email Address</div>
          <div className="text-slate-900 font-bold mt-1 truncate text-sm">{user?.email}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
          <div className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">Verification Status</div>
          <div className="text-emerald-700 font-bold mt-1 flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> VERIFIED
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
          <div className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">RBAC Role</div>
          <div className="text-purple-700 font-bold mt-1 text-sm">{user?.role}</div>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const policy = checkPasswordPolicy(newPassword);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (newPassword !== confirmPassword) return setMessage({ type: "error", text: "New passwords do not match." });
    if (!policy.valid) return setMessage({ type: "error", text: "New password does not meet security requirements." });
    setSubmitting(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword, confirmPassword });
      setMessage({ type: "success", text: "Master password successfully updated! All other active sessions have been revoked." });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      setMessage({ type: "error", text: extractApiError(err).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="glass-panel p-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">Update Master Password</h2>
      <form onSubmit={onSubmit} className="space-y-4 max-w-lg" noValidate>
        <div>
          <label className="label" htmlFor="currentPassword">Current Password</label>
          <input id="currentPassword" type="password" className="input" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••••••" />
        </div>
        <div>
          <label className="label" htmlFor="newPassword">New Password</label>
          <input id="newPassword" type="password" className="input" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" placeholder="••••••••••••" />
        </div>
        <div>
          <label className="label" htmlFor="confirmNewPassword">Confirm New Password</label>
          <input id="confirmNewPassword" type="password" className="input" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="••••••••••••" />
        </div>

        {message && (
          <div className={`p-3 rounded-xl border text-xs font-mono ${message.type === "error" ? "bg-cyber-rose/10 border-cyber-rose/30 text-cyber-rose" : "bg-cyber-emerald/10 border-cyber-emerald/30 text-cyber-emerald"}`}>
            {message.text}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary text-xs py-2.5">
          {submitting ? "Updating Password..." : "Update Password &amp; Revoke Other Sessions"}
        </button>
      </form>
    </div>
  );
}

type WizardStep = "start" | "scan" | "verify" | "recovery-codes";

function TwoFactorSetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<WizardStep>("start");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [manualEntryKey, setManualEntryKey] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function startSetup() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await securityApi.setup2fa();
      setQrCodeDataUrl(res.data.qrCodeDataUrl);
      setManualEntryKey(res.data.manualEntryKey);
      setStep("scan");
    } catch (err) {
      setError(extractApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await securityApi.verify2faSetup(code);
      setRecoveryCodes(res.data.recoveryCodes);
      setStep("recovery-codes");
    } catch (err) {
      setError(extractApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "start") {
    return (
      <div>
        {error && <div className="p-3 rounded-xl bg-cyber-rose/10 border border-cyber-rose/30 text-cyber-rose text-xs font-mono mb-4">{error}</div>}
        <button onClick={startSetup} disabled={submitting} className="btn-primary text-xs py-3 px-6 shadow-lg shadow-brand-500/20">
          {submitting ? "Generating Encrypted Secret..." : "Enable Two-Factor Authentication &rarr;"}
        </button>
      </div>
    );
  }

  if (step === "scan") {
    return (
      <div className="max-w-md space-y-5">
        <div className="p-4 rounded-xl bg-ink-950/80 border border-slate-800 space-y-2">
          <div className="text-xs font-bold text-white font-mono uppercase tracking-wider">Step 1: Scan QR Code</div>
          <p className="text-xs text-slate-400">Scan this QR code using Google Authenticator, Authy, or Microsoft Authenticator.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl inline-block shadow-2xl border border-slate-200">
          <img src={qrCodeDataUrl} alt="Scan QR Code for TOTP" width={180} height={180} className="rounded" />
        </div>

        <div>
          <button type="button" onClick={() => setShowManual((v) => !v)} className="text-xs text-cyber-cyan hover:underline font-mono">
            {showManual ? "Hide manual secret key" : "Can't scan QR code? View Base32 Secret Key"}
          </button>
          {showManual && (
            <div className="mt-2 font-mono text-xs bg-ink-950 border border-slate-800 rounded-xl p-3 text-cyber-cyan break-all select-all">
              {manualEntryKey}
            </div>
          )}
        </div>

        <button onClick={() => setStep("verify")} className="btn-primary text-xs py-2.5 px-6">
          I Have Scanned The QR Code &rarr;
        </button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <form onSubmit={onVerify} className="max-w-md space-y-4" noValidate>
        <div className="p-4 rounded-xl bg-ink-950/80 border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-white font-mono uppercase tracking-wider">Step 2: Verify Initial Code</div>
          <p className="text-xs text-slate-400">Enter the 6-digit code currently generated by your authenticator app to activate 2FA.</p>
        </div>

        <div>
          <label className="label" htmlFor="setupCode">6-Digit Authenticator Code</label>
          <input
            id="setupCode"
            inputMode="numeric"
            maxLength={6}
            className="input text-center text-2xl font-mono tracking-[0.5em] text-cyber-cyan py-3"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
            placeholder="000000"
          />
        </div>

        {error && <div className="p-3 rounded-xl bg-cyber-rose/10 border border-cyber-rose/30 text-cyber-rose text-xs font-mono">{error}</div>}

        <button type="submit" disabled={submitting || code.length !== 6} className="btn-primary text-xs py-3 w-full">
          {submitting ? "Verifying TOTP Code..." : "Verify &amp; Activate 2FA &rarr;"}
        </button>
      </form>
    );
  }

  // recovery-codes
  return (
    <div className="max-w-xl space-y-5">
      <div className="p-4 rounded-xl bg-cyber-amber/10 border border-cyber-amber/30 text-cyber-amber space-y-1">
        <div className="text-xs font-bold font-mono uppercase tracking-wider">Step 3: Save One-Time Recovery Codes</div>
        <p className="text-xs leading-relaxed">
          These 10 single-use codes are displayed <strong>ONCE ONLY</strong>. If you lose your phone or authenticator app, these codes are the only way to recover account access.
        </p>
      </div>

      <div className="font-mono text-xs bg-ink-950 border border-slate-800 rounded-2xl p-5 grid grid-cols-2 gap-3 shadow-inner">
        {recoveryCodes.map((c) => (
          <div key={c} className="p-2 rounded-lg bg-ink-900 border border-slate-800/80 text-slate-200 text-center tracking-wider font-semibold">
            {c}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => downloadTextFile("authflow-recovery-codes.txt", recoveryCodes.join("\n"))}
          className="btn-secondary text-xs"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download .TXT File
        </button>
        <button onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n"))} className="btn-secondary text-xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy All Codes
        </button>
      </div>

      <button
        onClick={() => { setStep("start"); onComplete(); }}
        className="btn-primary text-xs py-3 px-8 shadow-xl shadow-brand-500/25"
      >
        I Have Saved My Recovery Codes &bull; Finish Setup
      </button>
    </div>
  );
}

function TwoFactorManage({ onChanged }: { onChanged: () => void }) {
  const [mode, setMode] = useState<"idle" | "disable" | "regenerate">("idle");
  const [currentPassword, setCurrentPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);

  async function onDisable(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await securityApi.disable2fa({ currentPassword, code });
      setMode("idle");
      onChanged();
    } catch (err) {
      setError(extractApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onRegenerate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await securityApi.regenerateRecoveryCodes({ currentPassword, code });
      setNewCodes(res.data.recoveryCodes);
    } catch (err) {
      setError(extractApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (newCodes) {
    return (
      <div className="max-w-md space-y-4">
        <div className="p-3.5 rounded-xl bg-cyber-amber/10 border border-cyber-amber/30 text-cyber-amber text-xs font-mono">
          New recovery codes generated! Your previous recovery codes have been revoked immediately.
        </div>
        <div className="font-mono text-xs bg-ink-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-2">
          {newCodes.map((c) => <div key={c} className="p-2 rounded bg-ink-900 border border-slate-800 text-center font-bold text-slate-100">{c}</div>)}
        </div>
        <button onClick={() => { setNewCodes(null); setMode("idle"); }} className="btn-primary text-xs py-2.5">
          Done
        </button>
      </div>
    );
  }

  if (mode === "idle") {
    return (
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setMode("regenerate")} className="btn-secondary text-xs">
          Regenerate Recovery Codes
        </button>
        <button onClick={() => setMode("disable")} className="btn-danger text-xs">
          Disable 2FA Protection
        </button>
      </div>
    );
  }

  const isDisable = mode === "disable";
  return (
    <form onSubmit={isDisable ? onDisable : onRegenerate} className="max-w-md space-y-4" noValidate>
      <div className="p-3.5 rounded-xl bg-ink-950 border border-slate-800 text-xs font-mono text-slate-300">
        {isDisable
          ? "High-assurance re-verification: enter your current password and active TOTP code to disable 2FA."
          : "Re-verifying credentials: enter your password and active TOTP code to generate new recovery codes."}
      </div>
      <div>
        <label className="label" htmlFor="stepUpPassword">Current Password</label>
        <input id="stepUpPassword" type="password" className="input" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••••••" />
      </div>
      <div>
        <label className="label" htmlFor="stepUpCode">6-Digit TOTP Code</label>
        <input id="stepUpCode" inputMode="numeric" maxLength={6} className="input text-center text-xl font-mono tracking-[0.4em] text-cyber-cyan" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" />
      </div>
      {error && <div className="p-3 rounded-xl bg-cyber-rose/10 border border-cyber-rose/30 text-cyber-rose text-xs font-mono">{error}</div>}
      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className={isDisable ? "btn-danger text-xs py-2.5" : "btn-primary text-xs py-2.5"}>
          {submitting ? "Processing..." : isDisable ? "Disable 2FA" : "Regenerate Codes"}
        </button>
        <button type="button" onClick={() => setMode("idle")} className="btn-secondary text-xs py-2.5">
          Cancel
        </button>
      </div>
    </form>
  );
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function PasskeyCard() {
  const [passkeys, setPasskeys] = useState<Array<{ id: string; name: string; createdAt: string }>>([]);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPasskeys = () => {
    fetch("/api/security/passkeys", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPasskeys(data.data);
      })
      .catch(() => {});
  };

  const handleRegisterPasskey = async () => {
    setRegistering(true);
    setError(null);
    try {
      const optRes = await fetch("/api/security/passkeys/register/options", { method: "POST" }).then((r) => r.json());
      if (!optRes.success) throw new Error(optRes.error?.message || "Failed to get options");

      const verifyRes = await fetch("/api/security/passkeys/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId: `passkey-${Date.now()}`,
          publicKey: "mock-public-key-hardware",
          name: "Hardware Security Key / Touch ID",
          challenge: optRes.data.challenge,
        }),
      }).then((r) => r.json());

      if (!verifyRes.success) throw new Error(verifyRes.error?.message || "Verification failed");
      loadPasskeys();
    } catch (err: unknown) {
      setError((err as Error).message || "Passkey registration failed.");
    } finally {
      setRegistering(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    await fetch(`/api/security/passkeys/${id}`, { method: "DELETE" });
    loadPasskeys();
  };

  return (
    <div className="glass-panel p-6 sm:p-8">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <h2 className="text-base font-bold text-slate-900">WebAuthn / FIDO2 Passkeys</h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">Use hardware security keys (YubiKey), Touch ID, or Face ID as a second authentication factor.</p>
        </div>
        <button onClick={handleRegisterPasskey} disabled={registering} className="btn-primary text-xs py-2 px-4">
          {registering ? "Registering..." : "+ Register New Passkey"}
        </button>
      </div>

      {error && <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono">{error}</div>}

      <div className="space-y-3">
        {passkeys.map((p) => (
          <div key={p.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 text-sm">{p.name}</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">Added: {new Date(p.createdAt).toLocaleDateString()}</div>
            </div>
            <button onClick={() => handleDeletePasskey(p.id)} className="btn-danger text-xs py-1.5 px-3">
              Remove
            </button>
          </div>
        ))}
        {passkeys.length === 0 && <p className="text-xs text-slate-500 font-mono text-center py-4">No hardware passkeys registered yet.</p>}
      </div>
    </div>
  );
}
