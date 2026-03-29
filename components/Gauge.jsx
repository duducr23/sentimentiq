export default function Gauge({ score }) {
  const color = score > 65 ? "#10b981" : score < 35 ? "#ef4444" : "#f4b942";
  const arc = 251, filled = arc - (arc * score / 100), angle = (score / 100) * 180 - 90;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg viewBox="0 0 200 110" style={{ width: 180, height: 100 }}>
        <defs>
          <linearGradient id="gg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f4b942" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path d="M 20 100 A 80 80 0 0 1 180 100" stroke="rgba(255,255,255,0.07)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" stroke="url(#gg)" strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray={arc} strokeDashoffset={filled} />
        <g transform={`translate(100,100) rotate(${angle})`}>
          <line x1="0" y1="0" x2="0" y2="-58" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <circle cx="0" cy="0" r="5" fill={color} />
        </g>
        <text x="14" y="110" fill="#ef4444" fontSize="8" fontFamily="monospace">פחד</text>
        <text x="160" y="110" fill="#10b981" fontSize="8" fontFamily="monospace">חמדנות</text>
      </svg>
      <div style={{ fontSize: 34, fontWeight: 900, fontFamily: "monospace", color, marginTop: 2 }}>{score}</div>
    </div>
  );
}
