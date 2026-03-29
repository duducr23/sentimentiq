export default function Sparkline({ data, color, width = 100, height = 36 }) {
  const vals = (data || []).map(Number).filter(v => !isNaN(v));
  if (vals.length < 2) return null;
  const W = width, H = height, p = 3;
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
  const coords = vals.map((v, i) => [
    p + (i / (vals.length - 1)) * (W - p * 2),
    H - p - ((v - mn) / rng) * (H - p * 2),
  ]);
  const pts = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const [lx, ly] = coords[coords.length - 1];
  const [fx] = coords[0];
  const up = vals[vals.length - 1] >= vals[0];
  const lc = up ? "#10b981" : "#ef4444";
  const area = `M${fx},${H} L${pts.split(" ").join(" L")} L${lx},${H}Z`;
  const uid = `sp${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H, flexShrink: 0 }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lc} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lc} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid})`} />
      <polyline points={pts} fill="none" stroke={lc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3" fill={lc} />
    </svg>
  );
}
