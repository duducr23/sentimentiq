import { useState, useEffect, useRef } from "react";

export default function SearchDropdown({ items, value, onChange, placeholder, color }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = items.filter(item => item.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 200 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          background: value ? `${color}12` : "#080c14",
          border: `1px solid ${value ? color : "rgba(255,255,255,0.1)"}`,
          borderRadius: 10, padding: "11px 14px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 13, color: value ? color : "#64748b", userSelect: "none",
        }}
      >
        <span>{value || placeholder}</span>
        <span style={{ fontSize: 10, color: "#475569" }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, left: 0,
          background: "#0d1420", border: `1px solid ${color}50`,
          borderRadius: 12, zIndex: 200, boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="חפש..."
              autoFocus
              style={{
                width: "100%", background: "#080c14", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 7, padding: "7px 10px", color: "#e2e8f0", fontSize: 12,
                fontFamily: "Heebo, sans-serif", outline: "none",
              }}
            />
          </div>
          <div style={{ overflowY: "auto", maxHeight: 200 }}>
            {filtered.length === 0
              ? <div style={{ padding: "12px 14px", fontSize: 12, color: "#475569", textAlign: "center" }}>לא נמצא</div>
              : filtered.map(item => (
                <div
                  key={item}
                  onClick={() => { onChange(item); setOpen(false); setSearch(""); }}
                  style={{
                    padding: "10px 14px", fontSize: 13,
                    color: item === value ? color : "#94a3b8",
                    cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: item === value ? `${color}10` : "transparent",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = item === value ? `${color}10` : "transparent"}
                >
                  {item}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
