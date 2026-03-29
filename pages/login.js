import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [tab, setTab]           = useState("login"); // login | register | forgot | reset
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [msg, setMsg]           = useState("");

  const S = {
    page: { background:"#080c14", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Heebo',sans-serif", direction:"rtl", padding:16 },
    card: { background:"#0d1420", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"36px 32px", width:400, maxWidth:"100%" },
    inp:  { width:"100%", background:"#080c14", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontSize:14, fontFamily:"'Heebo',sans-serif", outline:"none" },
    btn:  { width:"100%", padding:13, background:"linear-gradient(135deg,#f4b942,#e09500)", border:"none", borderRadius:12, color:"#080c14", fontWeight:800, fontSize:15, cursor:"pointer", fontFamily:"'Heebo',sans-serif" },
    label: { fontSize:12, color:"#64748b", display:"block", marginBottom:6, textAlign:"right" },
    err:  { fontSize:13, color:"#ef4444", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"10px 14px", marginBottom:14, textAlign:"right" },
    ok:   { fontSize:13, color:"#10b981", background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:8, padding:"10px 14px", marginBottom:14, textAlign:"right" },
    link: { background:"none", border:"none", color:"#f4b942", fontSize:13, cursor:"pointer", textDecoration:"underline", fontFamily:"'Heebo',sans-serif" },
  };

  const reset = () => { setError(""); setMsg(""); setPassword(""); setNewPassword(""); setConfirmPassword(""); setCode(""); };

  const doLogin = async () => {
    if (!email || !password) { setError("אנא מלא מייל וסיסמה"); return; }
    setLoading(true); setError("");
    const r = await fetch("/api/auth", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"login", email, password }) });
    const d = await r.json();
    if (d.error) { setError(d.error); setLoading(false); return; }
    sessionStorage.setItem("siq_user", JSON.stringify(d.user));
    router.push("/");
    setLoading(false);
  };

  const doRegister = async () => {
    if (!email || !password || !username) { setError("אנא מלא את כל השדות"); return; }
    if (password.length < 6) { setError("סיסמה חייבת להיות לפחות 6 תווים"); return; }
    if (password !== confirmPassword) { setError("הסיסמאות לא תואמות"); return; }
    setLoading(true); setError("");
    const r = await fetch("/api/auth", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"register", email, password, username }) });
    const d = await r.json();
    if (d.error) { setError(d.error); setLoading(false); return; }
    sessionStorage.setItem("siq_user", JSON.stringify(d.user));
    router.push("/");
    setLoading(false);
  };

  const doForgot = async () => {
    if (!email) { setError("אנא הכנס מייל"); return; }
    setLoading(true); setError("");
    const r = await fetch("/api/auth", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"forgot", email }) });
    const d = await r.json();
    if (d.error) { setError(d.error); setLoading(false); return; }
    setMsg("קוד נשלח למייל — תקף 15 דקות");
    if (d.dev) setMsg(`[DEV] קוד: ${d.code}`);
    setTab("reset");
    setLoading(false);
  };

  const doReset = async () => {
    if (!code || !newPassword) { setError("אנא מלא את כל השדות"); return; }
    if (newPassword.length < 6) { setError("סיסמה חייבת להיות לפחות 6 תווים"); return; }
    if (newPassword !== confirmPassword) { setError("הסיסמאות לא תואמות"); return; }
    setLoading(true); setError("");
    const r = await fetch("/api/auth", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"reset", email, code, newPassword }) });
    const d = await r.json();
    if (d.error) { setError(d.error); setLoading(false); return; }
    setMsg("סיסמה אופסה בהצלחה! כעת התחבר");
    setTab("login"); reset();
    setLoading(false);
  };

  const Field = ({ label, value, onChange, type="text", placeholder="" }) => (
    <div style={{ marginBottom:14 }}>
      <label style={S.label}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
        onKeyDown={e => e.key==="Enter" && (tab==="login" ? doLogin() : tab==="register" ? doRegister() : tab==="forgot" ? doForgot() : doReset())}
        style={{ ...S.inp, direction: type==="email" || type==="password" ? "ltr" : "rtl", textAlign: type==="email" || type==="password" ? "left" : "right" }}/>
    </div>
  );

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <div style={S.card}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ width:52, height:52, background:"linear-gradient(135deg,#f4b942,#e09500)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 10px", boxShadow:"0 0 20px rgba(244,185,66,0.3)" }}>📡</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#e2e8f0" }}>DR STOCKS 26</div>
          <div style={{ fontSize:10, color:"#64748b", fontFamily:"monospace", letterSpacing:2 }}>LIVE MARKET INTELLIGENCE</div>
        </div>

        {/* Tabs */}
        {(tab === "login" || tab === "register") && (
          <div style={{ display:"flex", background:"#080c14", borderRadius:10, padding:3, marginBottom:22, gap:3 }}>
            {[["login","כניסה"],["register","הרשמה"]].map(([key,label]) => (
              <div key={key} onClick={() => { setTab(key); reset(); }}
                style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:8, cursor:"pointer", background: tab===key ? "#0d1420" : "transparent", color: tab===key ? "#f4b942" : "#64748b", fontWeight: tab===key ? 700 : 400, fontSize:14, transition:"all 0.2s", border: tab===key ? "1px solid rgba(244,185,66,0.2)" : "1px solid transparent" }}>
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        {error && <div style={S.err}>{error}</div>}
        {msg && <div style={S.ok}>{msg}</div>}

        {/* LOGIN */}
        {tab === "login" && (
          <>
            <Field label="כתובת מייל" value={email} onChange={setEmail} type="email" placeholder="your@email.com"/>
            <Field label="סיסמה" value={password} onChange={setPassword} type="password" placeholder="••••••"/>
            <button onClick={doLogin} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.6 : 1, marginBottom:12 }}>
              {loading ? "מתחבר..." : "כניסה ⚡"}
            </button>
            <div style={{ textAlign:"center" }}>
              <button onClick={() => { setTab("forgot"); reset(); }} style={S.link}>שכחת סיסמה?</button>
            </div>
          </>
        )}

        {/* REGISTER */}
        {tab === "register" && (
          <>
            <Field label="שם תצוגה" value={username} onChange={setUsername} placeholder="השם שיוצג לך"/>
            <Field label="כתובת מייל" value={email} onChange={setEmail} type="email" placeholder="your@email.com"/>
            <Field label="סיסמה (לפחות 6 תווים)" value={password} onChange={setPassword} type="password" placeholder="••••••"/>
            <Field label="אימות סיסמה" value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder="••••••"/>
            <div style={{ fontSize:11, color:"#475569", marginBottom:14, textAlign:"right" }}>⚠️ השם והמייל ינעלו יחד ולא ניתן לשנות</div>
            <button onClick={doRegister} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.6 : 1 }}>
              {loading ? "נרשם..." : "הרשמה והתחלה ⚡"}
            </button>
          </>
        )}

        {/* FORGOT PASSWORD */}
        {tab === "forgot" && (
          <>
            <div style={{ fontSize:15, fontWeight:700, color:"#e2e8f0", marginBottom:16, textAlign:"right" }}>שחזור סיסמה</div>
            <Field label="כתובת מייל" value={email} onChange={setEmail} type="email" placeholder="your@email.com"/>
            <button onClick={doForgot} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.6 : 1, marginBottom:12 }}>
              {loading ? "שולח..." : "שלח קוד לאיפוס"}
            </button>
            <div style={{ textAlign:"center" }}>
              <button onClick={() => { setTab("login"); reset(); }} style={S.link}>← חזרה להתחברות</button>
            </div>
          </>
        )}

        {/* RESET PASSWORD */}
        {tab === "reset" && (
          <>
            <div style={{ fontSize:15, fontWeight:700, color:"#e2e8f0", marginBottom:16, textAlign:"right" }}>סיסמה חדשה</div>
            <div style={{ marginBottom:14 }}>
              <label style={S.label}>קוד שקיבלת במייל</label>
              <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="123456" inputMode="numeric"
                style={{ ...S.inp, textAlign:"center", fontSize:24, letterSpacing:8, fontFamily:"monospace" }}/>
            </div>
            <Field label="סיסמה חדשה" value={newPassword} onChange={setNewPassword} type="password" placeholder="••••••"/>
            <Field label="אימות סיסמה" value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder="••••••"/>
            <button onClick={doReset} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.6 : 1, marginBottom:12 }}>
              {loading ? "מאפס..." : "שמור סיסמה חדשה"}
            </button>
            <div style={{ textAlign:"center" }}>
              <button onClick={() => { setTab("forgot"); reset(); }} style={S.link}>← שלח שוב</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
