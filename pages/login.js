import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [tab, setTab]           = useState("login"); // login | register
  const [username, setUsername] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const submit = async () => {
    if (!username.trim()) return;
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: tab, username: username.trim() }),
      });
      const d = await r.json();
      if (d.error) { setError(d.error); setLoading(false); return; }
      // Save to sessionStorage
      sessionStorage.setItem("siq_user", JSON.stringify(d.user));
      router.push("/");
    } catch (e) {
      setError("שגיאת חיבור"); setLoading(false);
    }
  };

  const S = {
    page: { background: "#080c14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Heebo',sans-serif", direction: "rtl" },
    card: { background: "#0d1420", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "40px 36px", width: 360, maxWidth: "90vw" },
    inp: { width: "100%", background: "#080c14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "13px 15px", color: "#e2e8f0", fontSize: 15, fontFamily: "'Heebo',sans-serif", outline: "none", direction: "rtl" },
    btn: { width: "100%", padding: 14, background: "linear-gradient(135deg,#f4b942,#e09500)", border: "none", borderRadius: 12, color: "#080c14", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "'Heebo',sans-serif", marginTop: 4 },
  };

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <div style={S.card}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,#f4b942,#e09500)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 12px", boxShadow: "0 0 24px rgba(244,185,66,0.3)" }}>📡</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#e2e8f0" }}>SentimentIQ</div>
          <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", letterSpacing: 2, marginTop: 2 }}>LIVE MARKET INTELLIGENCE</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#080c14", borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {[["login","כניסה"],["register","הרשמה"]].map(([key,label]) => (
            <div key={key} onClick={() => { setTab(key); setError(""); }}
              style={{ flex: 1, textAlign: "center", padding: "9px", borderRadius: 8, cursor: "pointer", background: tab === key ? "#0d1420" : "transparent", color: tab === key ? "#f4b942" : "#64748b", fontWeight: tab === key ? 700 : 400, fontSize: 14, transition: "all 0.2s", border: tab === key ? "1px solid rgba(244,185,66,0.2)" : "1px solid transparent" }}>
              {label}
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: "#64748b", display: "block", marginBottom: 8 }}>
            {tab === "login" ? "שם משתמש" : "בחר שם משתמש"}
          </label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder={tab === "login" ? "הכנס שם משתמש..." : "בחר שם משתמש (2-20 תווים)"}
            style={S.inp}
            autoFocus
          />
        </div>

        {error && (
          <div style={{ fontSize: 13, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button onClick={submit} disabled={loading || !username.trim()} style={{ ...S.btn, opacity: loading || !username.trim() ? 0.6 : 1 }}>
          {loading ? "טוען..." : tab === "login" ? "כניסה לכלי ⚡" : "הרשמה והתחלה ⚡"}
        </button>

        {tab === "register" && (
          <div style={{ marginTop: 14, fontSize: 12, color: "#475569", textAlign: "center", lineHeight: 1.7 }}>
            לאחר ההרשמה תקבל <strong style={{ color: "#f4b942" }}>3 ניתוחים ביום</strong><br/>
            גישה חופשית למאגר השאלות
          </div>
        )}
      </div>
    </div>
  );
}
