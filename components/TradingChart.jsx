import { useEffect, useRef } from "react";

export default function TradingChart({ chartData, color = "#3b82f6" }) {
  const canvasRef = useRef();

  useEffect(() => {
    if (!chartData || !chartData.prices || chartData.prices.length < 2) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const W = canvas.width, H = canvas.height;
    const PAD = { top: 30, right: 80, bottom: 40, left: 60 };
    const CW = W - PAD.left - PAD.right;
    const CH = H - PAD.top - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#080c14";
    ctx.fillRect(0, 0, W, H);

    const prices = chartData.prices;
    const allValues = [
      ...prices,
      chartData.support,
      chartData.resistance,
      chartData.stopLoss,
      chartData.takeProfit,
      chartData.entryZone,
    ].filter(v => v != null && !isNaN(v));

    const minVal = Math.min(...allValues) * 0.995;
    const maxVal = Math.max(...allValues) * 1.005;
    const range = maxVal - minVal;

    const xScale = (i) => PAD.left + (i / (prices.length - 1)) * CW;
    const yScale = (v) => PAD.top + CH - ((v - minVal) / range) * CH;

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (CH / 4) * i;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
      const val = maxVal - (range / 4) * i;
      ctx.fillStyle = "#475569";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(val.toFixed(1), PAD.left - 5, y + 4);
    }

    // Horizontal level lines
    const drawLevel = (value, color, label, dashed = true) => {
      if (value == null || isNaN(value)) return;
      const y = yScale(value);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      if (dashed) ctx.setLineDash([6, 4]);
      else ctx.setLineDash([]);
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label on right
      ctx.fillStyle = color;
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${label}: ${value.toFixed(1)}`, W - PAD.right + 4, y + 4);
    };

    // Entry zone band
    if (chartData.entryZone) {
      const y = yScale(chartData.entryZone);
      ctx.fillStyle = "rgba(59,130,246,0.08)";
      ctx.fillRect(PAD.left, y - 8, CW, 16);
    }

    drawLevel(chartData.resistance, "#ef4444", "R", true);
    drawLevel(chartData.takeProfit, "#10b981", "TP", true);
    drawLevel(chartData.entryZone, "#3b82f6", "Entry", false);
    drawLevel(chartData.support, "#f4b942", "S", true);
    drawLevel(chartData.stopLoss, "#ef444480", "SL", true);

    // Price line gradient fill
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + CH);
    const up = prices[prices.length - 1] >= prices[0];
    grad.addColorStop(0, up ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)");
    grad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(prices[0]));
    prices.forEach((p, i) => ctx.lineTo(xScale(i), yScale(p)));
    ctx.lineTo(xScale(prices.length - 1), PAD.top + CH);
    ctx.lineTo(xScale(0), PAD.top + CH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Price line
    ctx.beginPath();
    ctx.strokeStyle = up ? "#10b981" : "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.moveTo(xScale(0), yScale(prices[0]));
    prices.forEach((p, i) => ctx.lineTo(xScale(i), yScale(p)));
    ctx.stroke();

    // Last price dot
    const lastX = xScale(prices.length - 1);
    const lastY = yScale(prices[prices.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fillStyle = up ? "#10b981" : "#ef4444";
    ctx.fill();

    // X labels
    if (chartData.labels) {
      ctx.fillStyle = "#475569";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      const step = Math.ceil(chartData.labels.length / 5);
      chartData.labels.forEach((label, i) => {
        if (i % step === 0) {
          ctx.fillText(label, xScale(i), H - 10);
        }
      });
    }

    // Title
    ctx.fillStyle = "#64748b";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("PRICE ACTION CHART", PAD.left, 18);

  }, [chartData]);

  if (!chartData || !chartData.prices) return null;

  return (
    <div style={{ background: "#080c14", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
      <canvas ref={canvasRef} width={620} height={260}
        style={{ width: "100%", height: "auto", display: "block" }} />
      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        {[
          { label: "התנגדות", value: chartData.resistance, color: "#ef4444" },
          { label: "Take Profit", value: chartData.takeProfit, color: "#10b981" },
          { label: "כניסה", value: chartData.entryZone, color: "#3b82f6" },
          { label: "תמיכה", value: chartData.support, color: "#f4b942" },
          { label: "Stop Loss", value: chartData.stopLoss, color: "#ef444480" },
        ].filter(l => l.value).map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 2, background: l.color, borderRadius: 1 }} />
            <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{l.label}: </span>
            <span style={{ fontSize: 11, color: l.color, fontFamily: "monospace", fontWeight: 700 }}>{l.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
