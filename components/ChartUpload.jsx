import { useState, useRef } from "react";

export default function ChartUpload({ onAnalysis, market, analystNotes, color }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const processFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("אנא העלה קובץ תמונה (PNG, JPG)");
      return;
    }

    setError(""); setResult(null);

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Convert to base64
    const base64Reader = new FileReader();
    base64Reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const base64 = dataUrl.split(",")[1];
      const mediaType = file.type;

      setLoading(true);
      try {
        const r = await fetch("/api/chart-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mediaType, market, analystNotes }),
        });
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        setResult(d);
        if (onAnalysis) onAnalysis(d);
      } catch (e) {
        setError("שגיאה בניתוח: " + e.message);
      }
      setLoading(false);
    };
    base64Reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div>
      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? color : "rgba(255,255,255,0.12)"}`,
          borderRadius: 12, padding: preview ? 8 : "24px 16px",
          textAlign: "center", cursor: "pointer",
          background: dragging ? `${color}08` : "#080c14",
          transition: "all 0.2s",
        }}
      >
        {preview ? (
          <img src={preview} alt="chart preview"
            style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8 }} />
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>גרור צילום מסך של גרף לכאן</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>TradingView, Binance, MT4 — כל פלטפורמה</div>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => processFile(e.target.files[0])} />
      </div>

      {preview && !loading && (
        <button onClick={() => fileRef.current.click()}
          style={{ width: "100%", marginTop: 8, padding: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#64748b", fontSize: 12, cursor: "pointer" }}>
          🔄 החלף גרף
        </button>
      )}

      {loading && (
        <div style={{ marginTop: 12, padding: 16, background: "#0d1420", borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#f4b942", fontWeight: 600 }}>🔍 מנתח גרף לפי Elliott Wave + Wyckoff + ICT...</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>מזהה גלים, פאזות ובלוקי הזמנות</div>
        </div>
      )}

      {error && <div style={{ marginTop: 8, fontSize: 12, color: "#ef4444" }}>{error}</div>}

      {/* Chart Analysis Result */}
      {result && (
        <div style={{ marginTop: 12 }}>
          {/* Summary */}
          {result.summary && (
            <div style={{ background: "#0d1420", border: `1px solid ${color}30`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b", marginBottom: 6, letterSpacing: 1 }}>// ניתוח הגרף</div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>{result.summary}</div>
            </div>
          )}

          {/* Observations grid */}
          {result.chartObservations && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {[
                { key: "elliottCount", label: "Elliott Wave", icon: "🌊" },
                { key: "wyckoffPhase", label: "Wyckoff", icon: "📦" },
                { key: "ictElements", label: "ICT", icon: "🎯" },
                { key: "divergence", label: "סטייה", icon: "📐" },
                { key: "keyLevels", label: "רמות מפתח", icon: "🔑" },
                { key: "patterns", label: "תבניות", icon: "🔷" },
              ].map(item => result.chartObservations[item.key] && (
                <div key={item.key} style={{ background: "#080c14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", marginBottom: 4 }}>{item.icon} {item.label}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{result.chartObservations[item.key]}</div>
                </div>
              ))}
            </div>
          )}

          {/* Trade Setup */}
          {result.tradeSetup && (
            <div style={{ background: "#080c14", border: `1px solid ${result.tradeSetup.bias === "לונג" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b", marginBottom: 10, letterSpacing: 1 }}>// הגדרת עסקה</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "כיוון", value: result.tradeSetup.bias, color: result.tradeSetup.bias === "לונג" ? "#10b981" : "#ef4444" },
                  { label: "כניסה", value: result.tradeSetup.entry, color: "#3b82f6" },
                  { label: "Stop Loss", value: result.tradeSetup.stopLoss, color: "#ef4444" },
                  { label: "TP1", value: result.tradeSetup.takeProfit1, color: "#10b981" },
                  { label: "TP2", value: result.tradeSetup.takeProfit2, color: "#10b981" },
                  { label: "R:R", value: result.tradeSetup.riskReward, color: "#f4b942" },
                ].filter(i => i.value).map(item => (
                  <div key={item.label} style={{ background: `${item.color}12`, border: `1px solid ${item.color}30`, borderRadius: 8, padding: "6px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: item.color, fontFamily: "monospace" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
