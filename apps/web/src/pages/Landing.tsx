import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-ink-950 text-slate-100 relative overflow-hidden">
      {/* Background Accent Lights */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-cyber-cyan/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-cyber-violet/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10 border-b border-slate-800/60 backdrop-blur-md sticky top-0 bg-ink-950/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 via-brand-600 to-cyber-cyan p-0.5 shadow-lg shadow-brand-500/25">
            <div className="w-full h-full bg-ink-950 rounded-[10px] flex items-center justify-center text-cyber-cyan font-black text-sm">
              AF
            </div>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white block">AuthFlow</span>
            <span className="text-[10px] font-mono text-cyber-cyan tracking-widest uppercase block font-semibold">IDENTITY &amp; 2FA PLATFORM</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-secondary text-sm px-4 py-2">
            Sign In
          </Link>
          <Link to="/register" className="btn-primary text-sm px-5 py-2">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center z-10">
        <div className="max-w-7xl mx-auto w-full px-6 py-16 grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono tracking-wide shadow-lg shadow-cyber-cyan/5">
              <span className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
              RFC 6238 COMPLIANT &bull; ZERO PASSWORD-ONLY TRUST
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
              Secure Authentication. <br />
              <span className="bg-gradient-to-r from-brand-300 via-cyber-cyan to-cyber-emerald bg-clip-text text-transparent">
                Human-Friendly Recovery.
              </span>
            </h1>

            <p className="text-slate-300 text-lg sm:text-xl leading-relaxed max-w-2xl font-light">
              AuthFlow is an enterprise-grade identity layer featuring Argon2id password hashing, RFC 6238 TOTP algorithm verification, AES-256-GCM encrypted secrets at rest, rotating refresh tokens with reuse detection, and a real-time risk engine.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link to="/register" className="btn-primary text-base px-7 py-3 shadow-xl shadow-brand-500/30">
                Create Account &rarr;
              </Link>
              <Link to="/login" className="btn-secondary text-base px-6 py-3">
                Sign In To Platform
              </Link>
            </div>

            {/* Feature Pills */}
            <div className="pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-4 text-center sm:text-left">
              <div>
                <div className="text-2xl font-bold font-mono text-white">AES-256</div>
                <div className="text-xs text-slate-400">GCM Secret Encryption</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-cyber-cyan">RFC 6238</div>
                <div className="text-xs text-slate-400">HMAC-SHA1 TOTP Engine</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-cyber-emerald">Argon2id</div>
                <div className="text-xs text-slate-400">Memory-Hard Hashing</div>
              </div>
            </div>
          </div>

          {/* Hero Right Column — Cyber Visual Card */}
          <div className="lg:col-span-5">
            <div className="glass-panel p-6 sm:p-8 relative glow-border shadow-2xl">
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-cyber-emerald animate-pulse" />
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-300 font-semibold">
                    Security Defense Layers
                  </span>
                </div>
                <span className="text-xs font-mono text-cyber-cyan bg-cyber-cyan/10 px-2.5 py-1 rounded-md border border-cyber-cyan/20">
                  ACTIVE CORE
                </span>
              </div>

              <div className="space-y-4 font-mono text-xs">
                {[
                  { label: "PASSWORD STORAGE", val: "Argon2id Memory-Hard Hash", status: "VERIFIED" },
                  { label: "SECOND FACTOR", val: "RFC 6238 TOTP (30s Step)", status: "ENFORCED" },
                  { label: "SECRET PROTECTION", val: "AES-256-GCM (Key v1)", status: "ENCRYPTED" },
                  { label: "RECOVERY SYSTEM", val: "10 Single-Use Argon2 Hashes", status: "READY" },
                  { label: "TOKEN ROTATION", val: "Reuse Detection & Family Kill", status: "ENABLED" },
                  { label: "RATE LIMITING", val: "Per-Endpoint Sliding Window", status: "PROTECTED" },
                  { label: "AUDIT ENGINE", val: "Full Event Stream + Risk Score", status: "STREAMING" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-ink-900/90 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</div>
                      <div className="text-slate-200 font-semibold mt-0.5">{item.val}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyber-emerald/15 text-cyber-emerald border border-cyber-emerald/30">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed font-sans text-center">
                AuthFlow is built using production-grade security principles and defensive controls to prevent credential stuffing, token theft, and replay attacks.
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800/60 text-center text-xs text-slate-500 z-10 font-mono">
        AuthFlow Security Platform &bull; Zero Password-Only Trust &bull; Built with TypeScript, Express, Prisma, and React
      </footer>
    </div>
  );
}
