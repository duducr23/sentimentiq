import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { MARKET_ASSETS } from "../lib/constants";
import Sparkline from "../components/Sparkline";

function parseCSV(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return null;
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = isNaN(vals[i]) ? vals[i] : Number(vals[i]); });
    return obj;
  });
  return { headers, rows };
}

const S = {
  page:   { background: "#080c14", minHeight: "100vh", paddingBottom: 60 },
  inner:  { maxWidth: 900, margin: "0 auto", padding: "0 18px" },
  card:   { background: "#0d1420", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 22, marginBottom: 16 },
  cTitle: { fontSize: 11, fontFamily: "monospace", color: "#64748b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 },
  inp:    { width: "100%", background: "#080c14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "10px 13px", color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "Heebo, sans-serif" },
};

const DEFAULT_DATA = {
  stocks:      { notes: "", keyPoints: ["", "", ""], csvData: null, csvLabel: "" },
  crypto:      { notes: "", keyPoints: ["", "", ""], csvData: null, csvLabel: "" },
  commodities: { notes: "", keyPoints: ["", "", ""], csvData: null, csvLabel: "" },
};

export default function Admin() {
  const router = useRouter();
  const [authed, setAuthed]   = useState(false);
  const [password, setPassword] = useState("");
  const [pwErr, setPwErr]     = useState(false);
  const [market, setMarket]   = useState("stocks");
  const [data, setData]       = useState(DEFAULT_DATA);
  const [saved, setSaved]     = useState(false);
  const [cacheEntries, setCacheEntries] = useState([]);
  const [cacheSize, setCacheSize] = useState(0);
  const [activeTab, setActiveTab] = useState("content"); // "content" | "cache" | "users"
  const [stats, setStats] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editCredits, setEditCredits] = useState(3);
  const fileRef = useRef();

  const login = async () => {
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, data }),
    });
    if (r.ok) { setAuthed(true); setPwErr(false); loadData(); loadCache(); loadStats(); }
    else setPwErr(true);
  };

  const updateCredits = async (username, credits) => {
    await fetch("/api/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, username, credits }),
    });
    setEditingUser(null);
    loadStats();
  };

  const loadStats = async () => {
    const r = await fetch(`/api/stats?password=${password}`);
    const d = await r.json();
    if (!d.error) setStats(d);
  };

  const loadCache = async () => {
    const r = await fetch("/api/cache");
    const d = await r.json();
    setCacheEntries(d.entries || []);
    setCacheSize(d.size || 0);
  };

  const clearCache = async () => {
    if (!confirm("למחוק את כל המאגר?")) return;
    await fetch("/api/cache", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    loadCache();
  };

  const loadData = async () => {
    const r = await fetch("/api/admin");
    const d = await r.json();
    if (!d.error) setData(d);
  };

  const save = async () => {
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, data }),
    });
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  const updField = (mkt, field, val) => setData(p => ({ ...p, [mkt]: { ...p[mkt], [field]: val } }));
  const updKP    = (mkt, i, val) => {
    const kp = [...data[mkt].keyPoints]; kp[i] = val;
    updField(mkt, "keyPoints", kp);
  };
  const handleCSV = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      const p = parseCSV(ev.target.result);
      if (p) { updField(market, "csvData", p); updField(market, "csvLabel", file.name); }
    };
    r.readAsText(file);
  };

  if (!authed) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#0d1420", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 40, width: 300, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0", marginBottom: 20 }}>Admin Panel</div>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          placeholder="סיסמה..." dir="ltr"
          style={{ ...S.inp, textAlign: "center", fontFamily: "monospace", border: `1px solid ${pwErr ? "#ef4444" : "rgba(255,255,255,0.1)"}`, marginBottom: 10 }} />
        {pwErr && <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 10 }}>סיסמה שגויה</div>}
        <button onClick={login} style={{ width: "100%", padding: 12, background: "linear-gradient(135deg,#f4b942,#e09500)", border: "none", borderRadius: 10, color: "#080c14", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>כניסה</button>
        <div onClick={() => router.push("/")} style={{ marginTop: 14, fontSize: 12, color: "#3b82f6", cursor: "pointer" }}>← חזרה לכלי</div>
      </div>
    </div>
  );

  const meta = MARKET_ASSETS[market];
  const ad   = data[market];

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={{ padding: "22px 0 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "#ef4444", fontFamily: "monospace" }}>⚙️ ADMIN</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>דשבורד ניהול תוכן</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={save} style={{ padding: "9px 20px", background: saved ? "rgba(16,185,129,0.2)" : "linear-gradient(135deg,#f4b942,#e09500)", border: saved ? "1px solid #10b981" : "none", borderRadius: 10, color: saved ? "#10b981" : "#080c14", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{saved ? "✓ נשמר" : "💾 שמור"}</button>
            <button onClick={() => router.push("/")} style={{ padding: "9px 20px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 10, color: "#3b82f6", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>👁️ תצוגת משתמש</button>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
          <div onClick={() => setActiveTab("content")} style={{ padding: "10px 20px", borderRadius: 10, cursor: "pointer", background: activeTab === "content" ? "rgba(244,185,66,0.15)" : "#0d1420", border: `1px solid ${activeTab === "content" ? "#f4b942" : "rgba(255,255,255,0.07)"}`, color: activeTab === "content" ? "#f4b942" : "#64748b", fontWeight: 700, fontSize: 13 }}>
            ✏️ ניהול תוכן
          </div>
          <div onClick={() => { setActiveTab("cache"); loadCache(); }} style={{ padding: "10px 20px", borderRadius: 10, cursor: "pointer", background: activeTab === "cache" ? "rgba(16,185,129,0.15)" : "#0d1420", border: `1px solid ${activeTab === "cache" ? "#10b981" : "rgba(255,255,255,0.07)"}`, color: activeTab === "cache" ? "#10b981" : "#64748b", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            ⚡ מאגר שאלות {cacheSize > 0 && <span style={{ background: "#10b981", color: "#080c14", borderRadius: 10, padding: "1px 8px", fontSize: 11 }}>{cacheSize}</span>}
          </div>
          <div onClick={() => { setActiveTab("users"); loadStats(); }} style={{ padding: "10px 20px", borderRadius: 10, cursor: "pointer", background: activeTab === "users" ? "rgba(139,92,246,0.15)" : "#0d1420", border: `1px solid ${activeTab === "users" ? "#8b5cf6" : "rgba(255,255,255,0.07)"}`, color: activeTab === "users" ? "#8b5cf6" : "#64748b", fontWeight: 700, fontSize: 13 }}>
            👥 משתמשים
          </div>
        </div>

        {activeTab === "users" && (
          <div>
            {/* Stats Cards */}
            {stats && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "סהכ משתמשים", value: stats.totalUsers, color: "#8b5cf6", icon: "👥" },
                    { label: "נרשמו ב-5 ימים", value: stats.newLast5Days, color: "#f4b942", icon: "🆕" },
                    { label: "פעילים היום", value: stats.activeToday, color: "#10b981", icon: "⚡" },
                    { label: "ניתוחים היום", value: stats.totalAnalysesToday, color: "#3b82f6", icon: "📊" },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: `${stat.color}10`, border: `1px solid ${stat.color}30`, borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{stat.icon}</div>
                      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Users Table */}
                <div style={{ background: "#0d1420", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 12, fontFamily: "monospace", color: "#64748b", letterSpacing: 2 }}>// משתמשים אחרונים</div>
                    <button onClick={loadStats} style={{ padding: "5px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#64748b", fontSize: 11, cursor: "pointer" }}>🔄 רענן</button>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          {["שם משתמש", "נרשם", "ניתוחים היום", "סהכ ניתוחים"].map(h => (
                            <th key={h} style={{ padding: "10px 16px", textAlign: "right", fontSize: 11, color: "#64748b", fontFamily: "monospace", fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentUsers.map((u, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td style={{ padding: "10px 16px", fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>
                              <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
                                <span style={{ width:8, height:8, borderRadius:"50%", background:"#10b981", display:"inline-block" }}/>
                                {u.username}
                              </span>
                            </td>
                            <td style={{ padding: "10px 16px", fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>{u.createdAt}</td>
                            <td style={{ padding: "10px 16px", fontSize: 13, fontFamily: "monospace", color: u.dailyCount >= (u.dailyLimit ?? 3) ? "#ef4444" : "#f4b942" }}>{u.dailyCount}/{u.dailyLimit ?? 3}</td>
                            <td style={{ padding: "10px 16px", fontSize: 13, color: "#94a3b8", fontFamily: "monospace" }}>{u.totalAnalyses}</td>
                            <td style={{ padding: "10px 16px" }}>
                              <button onClick={() => { setEditingUser(u.username); setEditCredits(u.dailyCount); }}
                                style={{ padding:"4px 10px", background:"rgba(244,185,66,0.1)", border:"1px solid rgba(244,185,66,0.2)", borderRadius:6, color:"#f4b942", fontSize:11, cursor:"pointer" }}>
                                ✏️ קרדיטים
                              </button>
                            </td>
                          </tr>
                        ))}
                        {stats.recentUsers.length === 0 && (
                          <tr><td colSpan={4} style={{ padding: 30, textAlign: "center", color: "#475569", fontSize: 13 }}>אין משתמשים עדיין</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
            {!stats && <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>טוען נתונים...</div>}
          </div>
        )}

        {activeTab === "cache" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: "#94a3b8" }}>{cacheSize} שאלות שמורות במאגר (24 שעות)</div>
              <button onClick={clearCache} style={{ padding: "8px 16px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#ef4444", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>🗑️ נקה מאגר</button>
            </div>
            {cacheEntries.length === 0
              ? <div style={{ ...S.card, textAlign: "center", padding: 40, color: "#475569" }}>אין שאלות במאגר עדיין</div>
              : cacheEntries.map((e, i) => (
                <div key={i} style={{ ...S.card, padding: "14px 18px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, background: e.market === "stocks" ? "rgba(59,130,246,0.15)" : e.market === "crypto" ? "rgba(244,185,66,0.15)" : "rgba(16,185,129,0.15)", color: e.market === "stocks" ? "#3b82f6" : e.market === "crypto" ? "#f4b942" : "#10b981", padding: "2px 8px", borderRadius: 6, fontFamily: "monospace" }}>
                          {e.market === "stocks" ? "📈 מניות" : e.market === "crypto" ? "₿ קריפטו" : "🛢️ סחורות"}
                        </span>
                        <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>פג תוקף בעוד {e.expiresIn}</span>
                      </div>
                      <div style={{ fontSize: 14, color: "#e2e8f0", marginBottom: 4 }}>{e.query}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>סנטימנט: <span style={{ color: e.sentimentScore > 65 ? "#10b981" : e.sentimentScore < 35 ? "#ef4444" : "#f4b942", fontWeight: 700 }}>{e.sentimentScore} — {e.sentimentLabel}</span></div>
                    </div>
                    <div style={{ textAlign: "left", flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>נשאלה ב:</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace", marginTop: 2 }}>{e.cachedAt}</div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {activeTab === "content" && <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
          {Object.entries(MARKET_ASSETS).map(([id, m]) => (
            <div key={id} onClick={() => setMarket(id)} style={{ flex: 1, padding: "12px 8px", borderRadius: 12, cursor: "pointer", textAlign: "center", background: market === id ? "rgba(255,255,255,0.04)" : "#0d1420", border: `1px solid ${market === id ? m.color : "rgba(255,255,255,0.07)"}`, transition: "all 0.2s" }}>
              <div style={{ fontSize: 20, color: "#e2e8f0" }}>{m.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: "#e2e8f0" }}>{m.label}</div>
            </div>
          ))}
        </div>}

        {activeTab === "content" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={S.card}>
            <div style={S.cTitle}>// הערות אנליסט</div>
            <textarea value={ad.notes} onChange={e => updField(market, "notes", e.target.value)} rows={7}
              style={{ ...S.inp, resize: "vertical", lineHeight: 1.7, fontSize: 13 }}
              placeholder="הכנס ניתוח, תובנות, גורמים חשובים שה-AI ישתמש בהם..." />
          </div>

          <div style={S.card}>
            <div style={S.cTitle}>// נקודות מפתח</div>
            {ad.keyPoints.map((kp, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${meta.color}20`, border: `1px solid ${meta.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: meta.color, fontFamily: "monospace", flexShrink: 0 }}>{i + 1}</div>
                <input value={kp} onChange={e => updKP(market, i, e.target.value)} style={S.inp} placeholder={`נקודה ${i + 1}...`} />
              </div>
            ))}
          </div>

          <div style={{ ...S.card, gridColumn: "1 / -1" }}>
            <div style={S.cTitle}>// העלאת CSV לגרף</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ background: "#080c14", border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 12, padding: 20, textAlign: "center", cursor: "pointer" }} onClick={() => fileRef.current.click()}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>📁</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>גרור CSV או לחץ לבחירה</div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>עמודה 1 = תאריך, עמודה 2 = ערך</div>
                  <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCSV} />
                </div>
                {ad.csvLabel && <div style={{ marginTop: 8, fontSize: 12, color: "#10b981" }}>✅ {ad.csvLabel} — {ad.csvData?.rows.length} שורות</div>}
                <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 9 }}>
                  <div style={{ fontSize: 11, color: "#3b82f6", fontFamily: "monospace", marginBottom: 4 }}>דוגמה לפורמט:</div>
                  <pre style={{ fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.6 }}>{"date,price\n2024-01,5100\n2024-02,5250\n2024-03,5180"}</pre>
                </div>
              </div>
              <div>
                {ad.csvData?.headers.length >= 2
                  ? <div style={{ background: "#080c14", borderRadius: 12, padding: 14, border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>{ad.csvData.headers[0]} → {ad.csvData.headers[1]}</div>
                      <Sparkline data={ad.csvData.rows.map(r => r[ad.csvData.headers[1]])} color={meta.color} width={240} height={70} />
                    </div>
                  : <div style={{ background: "#080c14", borderRadius: 12, padding: 30, border: "1px solid rgba(255,255,255,0.07)", textAlign: "center", color: "#475569", fontSize: 13 }}>העלה CSV לצפייה</div>
                }
              </div>
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}
