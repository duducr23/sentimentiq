import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [step, setStep]         = useState("email");
  const [email, setEmail]       = useState("");
  const [code, setCode]         = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [msg, setMsg]           = useState("");

  const S = {
    page: { background:"#080c14", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Heebo',sans-serif", direction:"rtl", padding:16 },
    card: { background:"#0d1420", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"40px 36px", width:380, maxWidth:"100%" },
    inp:  { width:"100%", background:"#080c14", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"13px 15px", color:"#e2e8f0", fontSize:15, fontFamily:"'Heebo',sans-serif", outline:"none", direction:"ltr", textAlign:"left" },
    btn:  { width:"100%", padding:14, background:"linear-gradient(135deg,#f4b942,#e09500)", border:"none", borderRadius:12, color:"#080c14", fontWeight:800, fontSize:16, cursor:"pointer", fontFamily:"'Heebo',sans-serif", marginTop:4 },
    label:{ fontSize:13, color:"#64748b", display:"block", marginBottom:8, textAlign:"right" },
    err:  { fontSize:13, color:"#ef4444", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"10px 14px", marginBottom:14, textAlign:"right" },
    ok:   { fontSize:13, color:"#10b981", background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:8, padding:"10px 14px", marginBottom:16, textAlign:"right" },
  };

  const sendCode = async () => {
    if (!email.trim() || !email.includes("@")) { setError("אנא הכנס כתובת מייל תקינה"); return; }
    setLoading(true); setError(""); setMsg("");
    try {
      const r = await fetch("/api/auth", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"send_code", email:email.trim() }) });
      const d = await r.json();
      if (d.error) { setError(d.error); setLoading(false); return; }
      setMsg("קוד אימות נשלח — בדוק את תיבת המייל שלך");
      if (d.dev && d.code) { setCode(d.code); setMsg("[DEV] קוד: " + d.code); }
      setStep("code");
    } catch(e) { setError("שגיאת חיבור"); }
    setLoading(false);
  };

  const verify = async () => {
    if (code.length < 6) { setError("אנא הכנס קוד בן 6 ספרות"); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"verify", email:email.trim(), code:code.trim(), username:username.trim() }) });
      const d = await r.json();
      if (d.error) { setError(d.error); setLoading(false); return; }
      sessionStorage.setItem("siq_user", JSON.stringify(d.user));
      router.push("/");
    } catch(e) { setError("שגיאת חיבור"); }
    setLoading(false);
  };

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <div style={S.card}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:56, height:56, background:"linear-gradient(135deg,#f4b942,#e09500)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 12px", boxShadow:"0 0 24px rgba(244,185,66,0.3)" }}>📡</div>
          <div style={{ fontSize:24, fontWeight:900, color:"#e2e8f0" }}>DR STOCKS 26</div>
          <div style={{ fontSize:11, color:"#64748b", fontFamily:"monospace", letterSpacing:2, marginTop:2 }}>LIVE MARKET INTELLIGENCE</div>
        </div>

        {step === "email" && (
          <>
            <div style={{ marginBottom:20 }}>
              <label style={S.label}>כתובת מייל</label>
              <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && sendCode()} placeholder="your@email.com" type="email" style={S.inp} autoFocus/>
            </div>
            {error && <div style={S.err}>{error}</div>}
            <button onClick={sendCode} disabled={loading || !email.trim()} style={{ ...S.btn, opacity: loading||!email.trim() ? 0.6 : 1 }}>
              {loading ? "שולח..." : "שלח קוד אימות ⚡"}
            </button>
            <div style={{ marginTop:16, fontSize:12, color:"#475569", textAlign:"center", lineHeight:1.7 }}>
              כניסה עם מייל בלבד — ללא סיסמה<br/>
              <strong style={{ color:"#f4b942" }}>3 ניתוחים ביום</strong> · גישה חופשית למאגר
            </div>
          </>
        )}

        {step === "code" && (
          <>
            {msg && <div style={S.ok}>{msg}</div>}
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>שם תצוגה (אופציונלי)</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="השם שיוצג לך" style={{ ...S.inp, direction:"rtl", textAlign:"right" }}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={S.label}>קוד אימות (6 ספרות)</label>
              <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g,"").slice(0,6))} onKeyDown={e => e.key==="Enter" && verify()} placeholder="123456" type="text" inputMode="numeric" maxLength={6} style={{ ...S.inp, textAlign:"center", fontSize:28, letterSpacing:10, fontFamily:"monospace" }} autoFocus/>
            </div>
            {error && <div style={S.err}>{error}</div>}
            <button onClick={verify} disabled={loading || code.length < 6} style={{ ...S.btn, opacity: loading||code.length<6 ? 0.6 : 1 }}>
              {loading ? "מאמת..." : "כניסה לכלי ⚡"}
            </button>
            <button onClick={() => { setStep("email"); setCode(""); setError(""); setMsg(""); }} style={{ width:"100%", marginTop:10, padding:10, background:"transparent", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, color:"#64748b", fontSize:13, cursor:"pointer" }}>
              ← חזרה
            </button>
            <div style={{ marginTop:12, textAlign:"center" }}>
              <span style={{ fontSize:12, color:"#475569" }}>לא קיבלת? </span>
              <button onClick={sendCode} style={{ background:"none", border:"none", color:"#f4b942", fontSize:12, cursor:"pointer", textDecoration:"underline" }}>שלח שוב</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
