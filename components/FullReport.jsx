import { useState, useRef } from "react";
import TradingChart from "./TradingChart";

const SIGNAL_COLORS = {
  bullish: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", text: "#10b981", dot: "#10b981" },
  bearish: { bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)",  text: "#ef4444", dot: "#ef4444" },
  neutral: { bg: "rgba(244,185,66,0.1)", border: "rgba(244,185,66,0.2)",  text: "#f4b942", dot: "#f4b942" },
};

function ReportLine({ line, index, visible }) {
  const sig = SIGNAL_COLORS[line.signal] || SIGNAL_COLORS.neutral;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 16px",
      background: sig.bg,
      border: `1px solid ${sig.border}`,
      borderRight: `3px solid ${sig.dot}`,
      borderRadius: 10,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(10px)",
      transition: `opacity 0.3s ease ${index * 0.08}s, transform 0.3s ease ${index * 0.08}s`,
    }}>
      {/* Number */}
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        background: sig.dot, color: "#080c14",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 900, fontFamily: "monospace",
        flexShrink: 0,
      }}>{line.num}</div>

      {/* Icon + Category */}
      <div style={{ width: 100, flexShrink: 0 }}>
        <div style={{ fontSize: 15 }}>{line.icon}</div>
        <div style={{ fontSize: 10, color: sig.text, fontFamily: "monospace", marginTop: 2, fontWeight: 700 }}>{line.category}</div>
      </div>

      {/* Text */}
      <div style={{ flex: 1, fontSize: 13, color: "#e2e8f0", lineHeight: 1.6 }}>{line.text}</div>

      {/* Signal badge */}
      <div style={{
        fontSize: 10, fontFamily: "monospace", color: sig.text,
        background: sig.bg, border: `1px solid ${sig.border}`,
        padding: "2px 8px", borderRadius: 6, flexShrink: 0,
      }}>
        {line.signal === "bullish" ? "▲ שורי" : line.signal === "bearish" ? "▼ דובי" : "◆ נייטרל"}
      </div>
    </div>
  );
}

export default function FullReport({ market, analystNotes, keyPoints, prices, color }) {
  const [loading, setLoading]   = useState(false);
  const [loadStep, setLoadStep] = useState("");
  const [preview, setPreview]   = useState(null);
  const [report, setReport]     = useState(null);
  const [error, setError]       = useState("");
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible]   = useState(false);
  const fileRef = useRef();

  const processFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("אנא העלה קובץ תמונה (PNG, JPG)");
      return;
    }
    setError(""); setReport(null); setVisible(false);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    const b64Reader = new FileReader();
    b64Reader.onload = async (e) => {
      const base64 = e.target.result.split(",")[1];
      setLoading(true);
      setLoadStep("🔍 קורא את הגרף...");

      setTimeout(() => setLoadStep("🌊 מזהה גלי אליוט..."), 1500);
      setTimeout(() => setLoadStep("📦 מנתח Wyckoff..."), 3000);
      setTimeout(() => setLoadStep("🎯 בודק ICT Order Blocks..."), 4500);
      setTimeout(() => setLoadStep("📐 מחפש סטיות..."), 6000);
      setTimeout(() => setLoadStep("✍️ מכין דוח..."), 8000);

      try {
        const r = await fetch("/api/full-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            mediaType: file.type,
            market, analystNotes, keyPoints, prices,
          }),
        });
        const d = await r.json();
        if (d.error === "timeframe") {
          setError(d.message);
          setPreview(null);
          setLoading(false); setLoadStep("");
          return;
        }
        if (d.error) throw new Error(d.error);
        setReport(d);
        setTimeout(() => setVisible(true), 100);
      } catch (e) {
        setError("שגיאה: " + e.message);
      }
      setLoading(false); setLoadStep("");
    };
    b64Reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const overallSig = report ? SIGNAL_COLORS[report.overallSignal] || SIGNAL_COLORS.neutral : null;

  return (
    <div>
      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && fileRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? color : "rgba(255,255,255,0.12)"}`,
          borderRadius: 12, cursor: loading ? "wait" : "pointer",
          background: dragging ? `${color}08` : "#080c14",
          transition: "all 0.2s", overflow: "hidden",
          padding: preview ? 0 : "28px 20px",
          textAlign: preview ? "unset" : "center",
        }}
      >
        {preview ? (
          <div style={{ position: "relative" }}>
            <img src={preview} alt="chart"
              style={{ width: "100%", maxHeight: 220, objectFit: "contain", display: "block", borderRadius: 10 }} />
            {!loading && (
              <div style={{
                position: "absolute", top: 8, left: 8,
                background: "rgba(8,12,20,0.85)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#64748b", cursor: "pointer",
              }}
                onClick={(e) => { e.stopPropagation(); fileRef.current.click(); }}>
                🔄 החלף גרף
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
            <div style={{ fontSize: 15, color: "#e2e8f0", fontWeight: 700, marginBottom: 6 }}>העלה גרף לדוח מלא</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>גרור צילום מסך מ-TradingView / Binance / MT4</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>הכלי ישלב: הגרף שלך + שיטת האנליסט + נתוני שוק חיים</div>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => processFile(e.target.files[0])} />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ marginTop: 14, padding: "20px 16px", background: "#0d1420", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ fontSize: 14, color: color, fontWeight: 600 }}>{loadStep}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, height: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", background: `linear-gradient(90deg, ${color}, transparent)`, width: "60%", animation: "slide 2s ease-in-out infinite" }} />
          </div>
          <style>{`
            @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
            @keyframes slide { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }
          `}</style>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, padding: "16px 18px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: error.includes("1D") ? 10 : 0 }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <div style={{ fontSize: 14, color: "#ef4444", fontWeight: 600 }}>{error}</div>
          </div>
          {error.includes("1D") && (
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, paddingRight: 30 }}>
              <div style={{ marginBottom: 4 }}>כדי להחליף ל-Daily ב-TradingView:</div>
              <div>1. פתח את הגרף ב-TradingView</div>
              <div>2. לחץ על הטיים פריים למעלה (1m, 5m, 15m וכו)</div>
              <div>3. בחר <strong style={{ color:"#f4b942" }}>1D</strong></div>
              <div>4. צלם מסך ובצע העלאה מחדש</div>
            </div>
          )}
        </div>
      )}

      {/* Report */}
      {report && (
        <div style={{ marginTop: 16 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0" }}>דוח ניתוח מקצועי</div>
              <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", marginTop: 2 }}>
                Elliott Wave · Wyckoff · ICT · {new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}
              </div>
            </div>
            {overallSig && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "center", background: overallSig.bg, border: `1px solid ${overallSig.border}`, borderRadius: 12, padding: "8px 20px" }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>ציון כללי</div>
                  <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: overallSig.text }}>{report.overallScore}</div>
                </div>
                <div style={{ textAlign: "center", background: overallSig.bg, border: `1px solid ${overallSig.border}`, borderRadius: 12, padding: "8px 20px" }}>
                  <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>כיוון</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: overallSig.text, marginTop: 4 }}>
                    {report.overallSignal === "bullish" ? "▲ שורי" : report.overallSignal === "bearish" ? "▼ דובי" : "◆ נייטרל"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 10 Report Lines */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {report.reportLines?.map((line, i) => (
              <ReportLine key={i} line={line} index={i} visible={visible} />
            ))}
          </div>

          {/* Trade Setup */}
          {report.tradeSetup && (
            <div style={{ background: "#0d1420", border: `1px solid ${report.tradeSetup.bias === "לונג" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontFamily: "monospace", color: "#64748b", letterSpacing: 2 }}>// הגדרת עסקה</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, padding: "3px 14px", borderRadius: 10, background: report.tradeSetup.bias === "לונג" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: report.tradeSetup.bias === "לונג" ? "#10b981" : "#ef4444" }}>
                    {report.tradeSetup.bias}
                  </span>
                  <span style={{ fontSize: 13, padding: "3px 14px", borderRadius: 10, background: "rgba(244,185,66,0.1)", color: "#f4b942", fontFamily: "monospace" }}>
                    R:R {report.tradeSetup.riskReward}
                  </span>
                  <span style={{ fontSize: 11, padding: "3px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", color: "#64748b" }}>
                    ביטחון: {report.tradeSetup.confidence}
                  </span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                  { label: "כניסה", value: report.tradeSetup.entry, color: "#3b82f6" },
                  { label: "Stop Loss", value: report.tradeSetup.stopLoss, color: "#ef4444" },
                  { label: "Take Profit 1", value: report.tradeSetup.takeProfit1, color: "#10b981" },
                  { label: "Take Profit 2", value: report.tradeSetup.takeProfit2, color: "#10b981" },
                ].filter(i => i.value).map(item => (
                  <div key={item.label} style={{ background: `${item.color}10`, border: `1px solid ${item.color}30`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace", marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: item.color, fontFamily: "monospace" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trading Chart */}
          {report.chartData?.prices && (
            <div style={{ background: "#0d1420", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, fontFamily: "monospace", color: "#64748b", letterSpacing: 2, marginBottom: 14 }}>// גרף תומך החלטה</div>
              <TradingChart chartData={report.chartData} color={color} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
