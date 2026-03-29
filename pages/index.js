import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { MARKET_ASSETS } from "../lib/constants";
import TradingChart from "../components/TradingChart";
import FullReport from "../components/FullReport";
import ChartUpload from "../components/ChartUpload";
import Sparkline from "../components/Sparkline";
import Gauge from "../components/Gauge";
import SearchDropdown from "../components/SearchDropdown";

const S = {
  page:   { background: "#080c14", minHeight: "100vh", paddingBottom: 60 },
  inner:  { maxWidth: 980, margin: "0 auto", padding: "0 18px" },
  card:   { background: "#0d1420", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 22, marginBottom: 16 },
  cTitle: { fontSize: 11, fontFamily: "monospace", color: "#64748b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 },
  aiBox:  { background: "#080c14", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px", fontSize: 14, lineHeight: 1.8, color: "#94a3b8" },
  inp:    { width: "100%", background: "#080c14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "10px 13px", color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "Heebo, sans-serif" },
  dc:     d => d === "bullish" ? "#10b981" : d === "bearish" ? "#ef4444" : "#f4b942",
  ic:     t => t === "positive" ? "#10b981" : t === "negative" ? "#ef4444" : "#f4b942",
};

function AssetCard({ asset, priceData, color, selected, onClick }) {
  const pd = priceData || {};
  return (
    <div onClick={onClick} style={{
      background: selected ? `${color}15` : "#0a0f1a",
      border: `1px solid ${selected ? color : "rgba(255,255,255,0.07)"}`,
      borderRadius: 12, padding: "12px 14px", cursor: "pointer",
      transition: "all 0.18s", flex: 1, minWidth: 120,
      boxShadow: selected ? `0 0 12px ${color}30` : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: selected ? color : "#64748b", fontFamily: "monospace" }}>{asset.symbol}</span>
        {pd.change && (
          <span style={{ fontSize: 10, fontFamily: "monospace", color: pd.up ? "#10b981" : "#ef4444", background: pd.up ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", padding: "2px 6px", borderRadius: 5 }}>
            {pd.change}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 5 }}>{asset.label}</div>
      {pd.price
        ? <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "monospace", color: "#e2e8f0" }}>{pd.price}</div>
        : <div style={{ fontSize: 11, color: "#475569" }}>טוען...</div>
      }
      {pd.sparkline?.length > 1 && (
        <div style={{ marginTop: 8 }}>
          <Sparkline data={pd.sparkline} color={color} width={90} height={28} />
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [market, setMarket]           = useState("stocks");
  const [prices, setPrices]           = useState({});
  const [priceLoad, setPriceLoad]     = useState(false);
  const [selectedFixed, setSelectedFixed] = useState({ stocks: null, crypto: null, commodities: null });
  const [dropdownVal, setDropdownVal]     = useState({ stocks: "", crypto: "", commodities: "" });
  const [customVal, setCustomVal]         = useState({ stocks: "", crypto: "", commodities: "" });
  const [customActive, setCustomActive]   = useState({ stocks: false, crypto: false, commodities: false });
  const [customPrices, setCustomPrices]   = useState({ stocks: null, crypto: null, commodities: null });
  const [adminData, setAdminData]         = useState({ stocks: { notes: "", keyPoints: [] }, crypto: { notes: "", keyPoints: [] }, commodities: { notes: "", keyPoints: [] } });
  const [query, setQuery]   = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState("");
  const [result, setResult] = useState(null);
  const [sources, setSources] = useState([]);
  const [showSrc, setShowSrc] = useState(false);
  const [error, setError]   = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [chartAnalysis, setChartAnalysis] = useState(null);
  const [showChartUpload, setShowChartUpload] = useState(false);
  const [activeView, setActiveView] = useState("analysis"); // analysis | report | cache
  const [cacheEntries, setCacheEntries] = useState([]);
  const [cacheLoading, setCacheLoading] = useState(false);

  const loadCacheEntries = async () => {
    setCacheLoading(true);
    try {
      const r = await fetch("/api/cache");
      const d = await r.json();
      setCacheEntries(d.entries || []);
    } catch(_) {}
    setCacheLoading(false);
  };

  const [currentUser, setCurrentUser] = useState(null);
  const [dailyCount, setDailyCount]   = useState(0);

  useEffect(() => {
    // Auth check
    const stored = sessionStorage.getItem("siq_user");
    if (!stored) { router.push("/login"); return; }
    const user = JSON.parse(stored);
    setCurrentUser(user);
    // Refresh daily count
    fetch("/api/auth", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"login", username: user.username }) })
      .then(r => r.json()).then(d => { if (d.ok) setDailyCount(d.user.dailyCount || 0); });

    fetchPrices();
    fetch("/api/admin").then(r => r.json()).then(d => setAdminData(d)).catch(() => {});
  }, []);

  const fetchPrices = async () => {
    setPriceLoad(true);
    try {
      const r = await fetch("/api/prices", { method: "POST" });
      const d = await r.json();
      if (!d.error) setPrices(d);
    } catch (_) {}
    setPriceLoad(false);
  };

  const fetchCustomPrice = async (mkt, name) => {
    if (!name.trim()) return;
    setCustomPrices(p => ({ ...p, [mkt]: null }));
    try {
      const r = await fetch("/api/custom-price", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const d = await r.json();
      if (!d.error) setCustomPrices(p => ({ ...p, [mkt]: d }));
    } catch (_) {}
  };

  const getSelectedLabel = (mkt) => {
    if (customActive[mkt] && customVal[mkt]) return customVal[mkt];
    if (dropdownVal[mkt]) return dropdownVal[mkt];
    if (selectedFixed[mkt]) {
      const a = MARKET_ASSETS[mkt].fixed.find(x => x.id === selectedFixed[mkt]);
      return a ? `${a.label} (${a.symbol})` : null;
    }
    return null;
  };

  const analyze = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(""); setResult(null); setSources([]); setShowSrc(false);
    const ad = adminData[market];
    const meta = MARKET_ASSETS[market];
    const mktPrices = prices[market] || {};
    const selectedLabel = getSelectedLabel(market);

    const priceLines = meta.fixed.map(a => {
      const pd = mktPrices[a.id];
      return pd ? `${a.label} (${a.symbol}): ${pd.price} ${pd.change}` : `${a.label}: N/A`;
    }).join(", ");

    const customLine = (dropdownVal[market] || (customActive[market] && customVal[market])) && customPrices[market]
      ? `Selected asset: ${selectedLabel} — ${customPrices[market].price} ${customPrices[market].change}`
      : selectedLabel ? `Focus asset: ${selectedLabel}` : "";

    const context = [
      `Market: ${meta.label}`,
      `Prices: ${priceLines}`,
      customLine,
      ad?.keyPoints?.filter(Boolean).length ? `Key points: ${ad.keyPoints.filter(Boolean).join(" | ")}` : "",
      ad?.notes ? `Analyst notes: ${ad.notes}` : "",
    ].filter(Boolean).join("\n");

    try {
      setLoadStep("🧠 מנתח...");
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, query, market, username: currentUser?.username }),
      });
      const d = await r.json();
      if (d.limitReached) { setError(d.error); setLoading(false); setLoadStep(""); return; }
      if (d.error) throw new Error(d.error);
      setSources(d.sources || []);
      setResult(d);
      setFromCache(d._cached || false);
      if (!d._cached) setDailyCount(c => c + 1);
    } catch (e) { setError("שגיאה: " + e.message); }
    setLoading(false); setLoadStep("");
  };

  const meta      = MARKET_ASSETS[market];
  const mktPrices = prices[market] || {};
  const ad        = adminData[market] || {};
  const selectedLabel = getSelectedLabel(market);

  return (
    <div style={S.page}>
      <div style={S.inner}>
        {/* Header */}
        <div style={{ padding: "24px 0 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, background: "linear-gradient(135deg,#f4b942,#e09500)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📡</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>SentimentIQ</div>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b", letterSpacing: 2 }}>LIVE MARKET INTELLIGENCE</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", padding: "5px 12px", borderRadius: 20, fontSize: 11, color: "#10b981", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, background: "#10b981", borderRadius: "50%" }} />
              מחיר חי · AI
            </div>
            {currentUser && (
              <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"6px 14px" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#10b981" }}/>
                <span style={{ fontSize:12, color:"#94a3b8" }}>{currentUser.displayName || currentUser.username}</span>
                <span style={{ fontSize:11, fontFamily:"monospace", color: dailyCount >= 3 ? "#ef4444" : "#f4b942" }}>{dailyCount}/3</span>
              </div>
            )}
            <a href="/admin" style={{ padding: "6px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#475569", fontSize: 12, textDecoration: "none", fontFamily: "monospace" }}>⚙️ Admin</a>
            <button onClick={() => { sessionStorage.removeItem("siq_user"); router.push("/login"); }} style={{ padding:"6px 13px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:8, color:"#64748b", fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>יציאה</button>
          </div>
        </div>

        {/* Market Tabs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {Object.entries(MARKET_ASSETS).map(([id, m]) => (
            <div key={id} onClick={() => { setMarket(id); setResult(null); setError(""); }}
              style={{ flex: 1, padding: "13px 8px", borderRadius: 14, cursor: "pointer", textAlign: "center", background: market === id ? "rgba(255,255,255,0.04)" : "#0d1420", border: `1px solid ${market === id ? m.color : "rgba(255,255,255,0.07)"}`, boxShadow: market === id ? `0 0 16px ${m.color}22` : "none", transition: "all 0.2s" }}>
              <div style={{ fontSize: 22, marginBottom: 3 }}>{m.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Asset Selector */}
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={S.cTitle}>// בחר נכס לניתוח</div>
            <button onClick={fetchPrices} disabled={priceLoad}
              style={{ padding: "5px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>
              {priceLoad ? "⏳ טוען..." : "🔄 רענן"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {meta.fixed.map(asset => (
              <AssetCard key={asset.id} asset={asset} priceData={mktPrices[asset.id]} color={meta.color}
                selected={selectedFixed[market] === asset.id && !dropdownVal[market] && !customActive[market]}
                onClick={() => {
                  setSelectedFixed(p => ({ ...p, [market]: asset.id }));
                  setDropdownVal(p => ({ ...p, [market]: "" }));
                  setCustomActive(p => ({ ...p, [market]: false }));
                }} />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>נכס נוסף</div>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SearchDropdown items={meta.dropdown} value={dropdownVal[market]} color={meta.color} placeholder="בחר מרשימה..."
              onChange={val => {
                setDropdownVal(p => ({ ...p, [market]: val }));
                setCustomActive(p => ({ ...p, [market]: false }));
                setSelectedFixed(p => ({ ...p, [market]: null }));
                fetchCustomPrice(market, val.split(" ")[0]);
              }} />
            <div style={{ flex: 1, minWidth: 200, display: "flex", gap: 8 }}>
              <input value={customVal[market]} onChange={e => setCustomVal(p => ({ ...p, [market]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === "Enter" && customVal[market].trim()) {
                    setCustomActive(p => ({ ...p, [market]: true }));
                    setDropdownVal(p => ({ ...p, [market]: "" }));
                    setSelectedFixed(p => ({ ...p, [market]: null }));
                    fetchCustomPrice(market, customVal[market]);
                  }
                }}
                placeholder={meta.placeholder}
                style={{ ...S.inp, flex: 1, border: `1px solid ${customActive[market] ? meta.color : "rgba(255,255,255,0.1)"}` }} />
              <button onClick={() => {
                if (!customVal[market].trim()) return;
                setCustomActive(p => ({ ...p, [market]: true }));
                setDropdownVal(p => ({ ...p, [market]: "" }));
                setSelectedFixed(p => ({ ...p, [market]: null }));
                fetchCustomPrice(market, customVal[market]);
              }} style={{ padding: "10px 14px", background: `${meta.color}20`, border: `1px solid ${meta.color}40`, borderRadius: 9, color: meta.color, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                🔍 בדוק
              </button>
            </div>
          </div>

          {(dropdownVal[market] || customActive[market]) && (
            <div style={{ marginTop: 12, background: "#080c14", border: `1px solid ${meta.color}30`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", marginBottom: 4 }}>{dropdownVal[market] || customVal[market]}</div>
                {customPrices[market]
                  ? <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>{customPrices[market].price}</span>
                      <span style={{ fontSize: 13, color: customPrices[market].up ? "#10b981" : "#ef4444" }}>{customPrices[market].change}</span>
                    </div>
                  : <div style={{ fontSize: 12, color: "#64748b" }}>טוען מחיר...</div>
                }
              </div>
              {customPrices[market]?.sparkline?.length > 1 && <Sparkline data={customPrices[market].sparkline} color={meta.color} width={100} height={36} />}
            </div>
          )}
        </div>

        {/* Mode Switcher - always visible */}
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <div onClick={() => setActiveView("analysis")}
            style={{ flex:1, padding:"10px 8px", borderRadius:12, cursor:"pointer", textAlign:"center", background: activeView==="analysis" ? "rgba(255,255,255,0.04)" : "#0d1420", border:`1px solid ${activeView==="analysis" ? meta.color : "rgba(255,255,255,0.07)"}`, transition:"all 0.2s" }}>
            <div style={{ fontSize:16, marginBottom:3 }}>🔍</div>
            <div style={{ fontSize:12, fontWeight:700, color: activeView==="analysis" ? meta.color : "#94a3b8" }}>ניתוח שוק</div>
          </div>
          <div onClick={() => setActiveView("report")}
            style={{ flex:1, padding:"10px 8px", borderRadius:12, cursor:"pointer", textAlign:"center", background: activeView==="report" ? "rgba(255,255,255,0.04)" : "#0d1420", border:`1px solid ${activeView==="report" ? meta.color : "rgba(255,255,255,0.07)"}`, transition:"all 0.2s", position:"relative" }}>
            <div style={{ position:"absolute", top:-6, right:-6, background:"#f4b942", color:"#080c14", fontSize:8, fontWeight:900, padding:"1px 5px", borderRadius:6 }}>חדש</div>
            <div style={{ fontSize:16, marginBottom:3 }}>📋</div>
            <div style={{ fontSize:12, fontWeight:700, color: activeView==="report" ? meta.color : "#94a3b8" }}>דוח מלא</div>
          </div>
          <div onClick={() => { setActiveView("cache"); loadCacheEntries(); }}
            style={{ flex:1, padding:"10px 8px", borderRadius:12, cursor:"pointer", textAlign:"center", background: activeView==="cache" ? "rgba(255,255,255,0.04)" : "#0d1420", border:`1px solid ${activeView==="cache" ? "#10b981" : "rgba(255,255,255,0.07)"}`, transition:"all 0.2s" }}>
            <div style={{ fontSize:16, marginBottom:3 }}>⚡</div>
            <div style={{ fontSize:12, fontWeight:700, color: activeView==="cache" ? "#10b981" : "#94a3b8" }}>מאגר שאלות</div>
          </div>
        </div>

        {/* Full Report Mode */}
        {activeView === "report" && (
          <div style={S.card}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ fontSize:11, fontFamily:"monospace", color:"#64748b", letterSpacing:2, flex:1 }}>// דוח ניתוח מקצועי — 10 שורות</div>
              <div style={{ fontSize:11, color:"#475569" }}>משלב: גרף שלך + שיטת האנליסט + נתוני שוק</div>
            </div>
            <FullReport
              market={market}
              analystNotes={ad?.notes || ""}
              keyPoints={ad?.keyPoints || []}
              prices={prices[market] || {}}
              color={meta.color}
              username={currentUser?.username}
            />
          </div>
        )}

        {/* Cache View */}
        {activeView === "cache" && (
          <div>
            <div style={{ marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:13, color:"#64748b" }}>שאלות שנשאלו — פתוח לכולם, ללא ניצול קרדיטים</div>
              <button onClick={loadCacheEntries} style={{ padding:"6px 12px", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:8, color:"#10b981", fontSize:11, cursor:"pointer" }}>🔄 רענן</button>
            </div>
            {cacheLoading && <div style={{ textAlign:"center", padding:30, color:"#64748b" }}>טוען...</div>}
            {!cacheLoading && cacheEntries.length === 0 && (
              <div style={{ textAlign:"center", padding:40, color:"#475569", background:"#0d1420", borderRadius:12, border:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>⚡</div>
                <div>אין שאלות במאגר עדיין</div>
                <div style={{ fontSize:12, marginTop:6, color:"#334155" }}>שאלות שנשאלות מופיעות כאן ל-24 שעות</div>
              </div>
            )}
            {!cacheLoading && cacheEntries.map((e, i) => (
              <div key={i} style={{ background:"#0d1420", border:"1px solid rgba(255,255,255,0.06)", borderRight:`3px solid ${e.sentimentScore > 65 ? "#10b981" : e.sentimentScore < 35 ? "#ef4444" : "#f4b942"}`, borderRadius:10, padding:"14px 16px", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, flexWrap:"wrap", gap:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:11, background: e.market==="stocks" ? "rgba(59,130,246,0.15)" : e.market==="crypto" ? "rgba(244,185,66,0.15)" : "rgba(16,185,129,0.15)", color: e.market==="stocks" ? "#3b82f6" : e.market==="crypto" ? "#f4b942" : "#10b981", padding:"2px 8px", borderRadius:6, fontFamily:"monospace" }}>
                      {e.market==="stocks" ? "📈 מניות" : e.market==="crypto" ? "₿ קריפטו" : "🛢️ סחורות"}
                    </span>
                    <span style={{ fontSize:11, color:"#475569", fontFamily:"monospace" }}>פג בעוד {e.expiresIn}</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color: e.sentimentScore > 65 ? "#10b981" : e.sentimentScore < 35 ? "#ef4444" : "#f4b942", fontFamily:"monospace" }}>
                    {e.sentimentScore} — {e.sentimentLabel}
                  </span>
                </div>
                <div style={{ fontSize:14, color:"#e2e8f0", marginBottom:4 }}>{e.query}</div>
                <div style={{ fontSize:11, color:"#475569", fontFamily:"monospace" }}>נשאלה ב: {e.cachedAt}</div>
              </div>
            ))}
          </div>
        )}

        {activeView === "analysis" && <>
        {/* Admin notes strip */}
        {ad?.keyPoints?.some(Boolean) && (
          <div style={{ ...S.card, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", marginBottom: 8 }}>נקודות מפתח מהאנליסט</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ad.keyPoints.filter(Boolean).map((kp, i) => (
                <div key={i} style={{ background: `${meta.color}10`, border: `1px solid ${meta.color}25`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "#94a3b8" }}>
                  <span style={{ color: meta.color, marginLeft: 6 }}>▸</span>{kp}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Query */}
        <div style={S.card}>
          <div style={S.cTitle}>// שאל את ה-AI{selectedLabel ? ` — ${selectedLabel}` : ""}</div>
          <textarea rows={2} value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), analyze())}
            placeholder={selectedLabel ? `מה הניתוח ל-${selectedLabel}?` : "בחר נכס ואז שאל..."}
            style={{ ...S.inp, resize: "none", fontSize: 15, lineHeight: 1.6 }} />
          <button onClick={analyze} disabled={loading}
            style={{ width: "100%", marginTop: 12, padding: 13, background: "linear-gradient(135deg,#f4b942,#e09500)", border: "none", borderRadius: 12, color: "#080c14", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? loadStep || "🔄 טוען..." : "⚡ נתח עכשיו"}
          </button>
        </div>

        {error && <div style={{ ...S.card, borderColor: "rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 14 }}>{error}</div>}
        {loading && <div style={{ ...S.card, textAlign: "center", padding: 44 }}><div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div><div style={{ fontSize: 14, color: "#f4b942", fontWeight: 600 }}>{loadStep}</div></div>}

        {result && (
          <>
            {/* Cache badge */}
            {fromCache && result._cachedAtHuman && (
              <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "10px 16px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, color: "#10b981", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>⚡</span>
                  <span>תשובה מהמאגר — נשאלה ב-{result._cachedAtHuman}</span>
                </div>
                <div style={{ fontSize: 11, color: "#10b981", fontFamily: "monospace", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: 6 }}>CACHED</div>
              </div>
            )}

            {sources.length > 0 && (
              <>
                <div onClick={() => setShowSrc(!showSrc)} style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 12, padding: "10px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
                  <div style={{ fontSize: 13, color: "#3b82f6" }}>🌐 {sources.length} מקורות · {sources.map(s => s.domain).join(" · ")}</div>
                  <div style={{ fontSize: 11, color: "#3b82f6", fontFamily: "monospace" }}>{showSrc ? "▲" : "▼"}</div>
                </div>
                {showSrc && sources.map((s, i) => (
                  <div key={i} style={{ background: "#0d1420", border: "1px solid rgba(59,130,246,0.12)", borderRight: "3px solid #3b82f6", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 3 }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: "#3b82f6" }}>{s.domain}</div>
                    {s.snippet && <div style={{ fontSize: 12, color: "#64748b", marginTop: 5, lineHeight: 1.5 }}>{s.snippet}</div>}
                  </div>
                ))}
              </>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={S.card}>
                <div style={S.cTitle}>// מדד סנטימנט</div>
                <Gauge score={result.sentimentScore} />
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 13, padding: "4px 14px", borderRadius: 12, background: result.sentimentScore > 65 ? "rgba(16,185,129,0.15)" : result.sentimentScore < 35 ? "rgba(239,68,68,0.15)" : "rgba(244,185,66,0.15)", color: result.sentimentScore > 65 ? "#10b981" : result.sentimentScore < 35 ? "#ef4444" : "#f4b942", border: `1px solid ${result.sentimentScore > 65 ? "rgba(16,185,129,0.3)" : result.sentimentScore < 35 ? "rgba(239,68,68,0.3)" : "rgba(244,185,66,0.3)"}` }}>{result.sentimentLabel}</span>
                </div>
              </div>
              <div style={S.card}>
                <div style={S.cTitle}>// סיגנלים</div>
                {result.signals?.map((sig, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, background: "#080c14", padding: "9px 11px", borderRadius: 9, marginBottom: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: S.dc(sig.direction), flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, color: "#94a3b8" }}>{sig.text}</div>
                    <div style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b" }}>{sig.strength}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={S.card}><div style={S.cTitle}>// למה השוק זז?</div><div style={S.aiBox}>{result.whyMoving}</div></div>

            {/* Elliott Wave + Wyckoff + ICT */}
            {(result.elliottWave || result.wyckoff || result.ict || result.divergence) && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                {result.elliottWave && (
                  <div style={S.card}>
                    <div style={S.cTitle}>// 🌊 Elliott Wave</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {[
                        { label:"גל נוכחי", value:result.elliottWave.currentWave },
                        { label:"פאזה", value:result.elliottWave.phase },
                        { label:"צפוי הבא", value:result.elliottWave.nextExpected },
                        { label:"ביטחון", value:result.elliottWave.confidence },
                      ].filter(i=>i.value).map(item=>(
                        <div key={item.label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 10px", background:"#080c14", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)" }}>
                          <span style={{ fontSize:12, color:"#64748b" }}>{item.label}</span>
                          <span style={{ fontSize:12, color:"#e2e8f0", fontWeight:600 }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.wyckoff && (
                  <div style={S.card}>
                    <div style={S.cTitle}>// 📦 Wyckoff</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {[
                        { label:"פאזה", value:result.wyckoff.phase },
                        { label:"תבנית", value:result.wyckoff.pattern },
                      ].filter(i=>i.value).map(item=>(
                        <div key={item.label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 10px", background:"#080c14", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)" }}>
                          <span style={{ fontSize:12, color:"#64748b" }}>{item.label}</span>
                          <span style={{ fontSize:12, color:"#e2e8f0", fontWeight:600 }}>{item.value}</span>
                        </div>
                      ))}
                      {result.wyckoff.interpretation && <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.6, padding:"6px 10px", background:"#080c14", borderRadius:8 }}>{result.wyckoff.interpretation}</div>}
                    </div>
                  </div>
                )}
                {result.ict && (
                  <div style={S.card}>
                    <div style={S.cTitle}>// 🎯 ICT</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {[
                        { label:"Order Block", value:result.ict.orderBlock },
                        { label:"FVG", value:result.ict.fvg },
                        { label:"Liquidity", value:result.ict.liquidity },
                      ].filter(i=>i.value).map(item=>(
                        <div key={item.label} style={{ padding:"6px 10px", background:"#080c14", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)" }}>
                          <div style={{ fontSize:10, color:"#64748b", fontFamily:"monospace", marginBottom:3 }}>{item.label}</div>
                          <div style={{ fontSize:12, color:"#94a3b8" }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.divergence && (
                  <div style={{ ...S.card, border:`1px solid ${result.divergence.detected ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.2)"}` }}>
                    <div style={S.cTitle}>// 📐 סטייה (Divergence)</div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:result.divergence.detected?"#10b981":"#64748b", flexShrink:0 }}/>
                      <span style={{ fontSize:14, fontWeight:700, color:result.divergence.detected?"#10b981":"#94a3b8" }}>
                        {result.divergence.type} — {result.divergence.detected?"זוהתה":"לא זוהתה"}
                      </span>
                    </div>
                    {result.divergence.description && <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.6 }}>{result.divergence.description}</div>}
                  </div>
                )}
              </div>
            )}

            {/* Trade Setup */}
            {result.tradeSetup && (
              <div style={{ ...S.card, border:`1px solid ${result.tradeSetup.bias==="לונג"?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"}` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={S.cTitle}>// 🎯 הגדרת עסקה</div>
                  <span style={{ fontSize:12, padding:"3px 12px", borderRadius:10, background:result.tradeSetup.bias==="לונג"?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)", color:result.tradeSetup.bias==="לונג"?"#10b981":"#ef4444", fontWeight:700 }}>
                    {result.tradeSetup.bias} | R:R {result.tradeSetup.riskReward}
                  </span>
                </div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  {[
                    { label:"אזור כניסה", value:result.tradeSetup.entry, color:"#3b82f6" },
                    { label:"Stop Loss", value:result.tradeSetup.stopLoss, color:"#ef4444" },
                    { label:"Take Profit 1", value:result.tradeSetup.takeProfit1, color:"#10b981" },
                    { label:"Take Profit 2", value:result.tradeSetup.takeProfit2, color:"#10b981" },
                    { label:"ביטחון", value:result.tradeSetup.confidence, color:"#f4b942" },
                  ].filter(i=>i.value).map(item=>(
                    <div key={item.label} style={{ flex:1, minWidth:100, background:`${item.color}10`, border:`1px solid ${item.color}30`, borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
                      <div style={{ fontSize:10, color:"#64748b", fontFamily:"monospace", marginBottom:4 }}>{item.label}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:item.color, fontFamily:"monospace" }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trading Chart */}
            {result.chartData && result.chartData.prices && (
              <div style={S.card}>
                <div style={S.cTitle}>// 📈 גרף תומך החלטה</div>
                <TradingChart chartData={result.chartData} color={meta.color} />
              </div>
            )}

            <div style={S.card}>
              <div style={S.cTitle}>// גורמים מרכזיים</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {result.drivers?.map((d, i) => (
                  <div key={i} style={{ background: "#080c14", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{d.icon}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{d.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: S.ic(d.type) }}>{d.impact}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={S.card}>
                <div style={S.cTitle}>// Fear & Greed</div>
                <div style={{ height: 10, borderRadius: 5, background: "linear-gradient(to right,#ef4444,#f4b942,#10b981)", position: "relative", margin: "14px 0 8px" }}>
                  <div style={{ position: "absolute", top: -7, left: `${result.sentimentScore}%`, transform: "translateX(-50%)", width: 24, height: 24, borderRadius: "50%", background: "#fff", border: "3px solid #080c14" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", fontFamily: "monospace", marginBottom: 12 }}><span>פחד קיצוני</span><span>חמדנות קיצונית</span></div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>סיכון: <span style={{ color: result.riskLevel === "גבוה" ? "#ef4444" : result.riskLevel === "נמוך" ? "#10b981" : "#f4b942", fontWeight: 700 }}>{result.riskLevel}</span></div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, lineHeight: 1.5 }}>⚠️ {result.keyRisk}</div>
              </div>
              <div style={S.card}><div style={S.cTitle}>// מאקרו</div><div style={{ ...S.aiBox, fontSize: 13 }}>{result.macroContext}</div></div>
            </div>

            <div style={S.card}>
              <div style={S.cTitle}>// תחזית AI</div>
              <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 0 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 14 }}>
                {result.forecast?.map((f, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${S.dc(f.direction)}`, background: `${S.dc(f.direction)}30`, margin: "0 auto 8px" }} />
                    <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>{f.period}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: S.dc(f.direction), marginTop: 3 }}>{f.prediction}</div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b" }}>{f.pct}</div>
                  </div>
                ))}
              </div>
              <div style={S.aiBox}>{result.mainAnalysis}</div>
            </div>

            <div style={{ textAlign: "center", fontSize: 11, color: "#475569", paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              ⚠️ המידע מיועד למחקר בלבד · Powered by Claude AI + Web Search
            </div>
          </>
        )}
        </>}
      </div>
    </div>
  );
}
