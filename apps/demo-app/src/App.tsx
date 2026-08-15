import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const AUTHFLOW_URL = import.meta.env.VITE_AUTHFLOW_URL ?? "http://localhost:5173";

const api = axios.create({ baseURL: API_URL, withCredentials: true });

interface Me {
  id: string;
  email: string;
  fullName: string;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
}

/**
 * This app represents a third-party application that consumes AuthFlow as
 * its identity provider — proving AuthFlow is an authentication *platform*,
 * not just a login page bolted onto one app. It never touches passwords,
 * TOTP codes, or tokens directly: it calls /api/auth/me with the same
 * HttpOnly session cookie AuthFlow issued and trusts the result.
 */
export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/auth/me")
      .then((res) => setMe(res.data.data))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  const styles = {
    page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
    card: { background: "#141a2b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32, maxWidth: 420, width: "100%" },
    badge: { display: "inline-block", fontSize: 12, padding: "2px 10px", borderRadius: 999, background: "rgba(59,108,255,0.15)", color: "#94b3ff", marginBottom: 16 },
    row: { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 14 },
    btn: { background: "#3b6cff", color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 500, cursor: "pointer", textDecoration: "none", display: "inline-block" },
  };

  if (loading) {
    return <div style={styles.page}><p>Loading…</p></div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <span style={styles.badge}>AuthFlow Demo Application</span>
        {me ? (
          <>
            <h1 style={{ margin: "8px 0 4px", fontSize: 22 }}>Welcome, {me.fullName}</h1>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>Your account is authenticated through AuthFlow.</p>
            <div style={styles.row}><span>Email</span><span>{me.email}</span></div>
            <div style={styles.row}><span>Authentication status</span><span style={{ color: "#34d399" }}>Authenticated</span></div>
            <div style={styles.row}><span>Two-factor authentication</span><span style={{ color: me.twoFactorEnabled ? "#34d399" : "#f87171" }}>{me.twoFactorEnabled ? "Enabled" : "Disabled"}</span></div>
            <div style={{ ...styles.row, borderBottom: "none" }}><span>Email verified</span><span>{me.emailVerified ? "Yes" : "No"}</span></div>
            <a href={AUTHFLOW_URL + "/settings"} style={{ ...styles.btn, marginTop: 20 }} target="_blank" rel="noreferrer">
              Manage account in AuthFlow
            </a>
          </>
        ) : (
          <>
            <h1 style={{ margin: "8px 0 4px", fontSize: 22 }}>Not authenticated</h1>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
              This demo app has no login form of its own — it relies entirely on AuthFlow.
            </p>
            <a href={`${AUTHFLOW_URL}/login`} style={styles.btn}>Login with AuthFlow</a>
          </>
        )}
      </div>
    </div>
  );
}
