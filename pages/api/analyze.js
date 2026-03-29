import { ANALYSIS_SYSTEM } from "../../lib/constants";
import { extractAllText, safeExtractJSON } from "../../lib/parseJson";
import { getCached, setCached } from "../../lib/cache";
import { canAnalyze, recordAnalysis } from "../../lib/userStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { context, query, market, username } = req.body;
  if (!query) return res.status(400).json({ error: "Missing query" });

  // Check cache first
  const cached = getCached(market || "general", query);
  if (cached) return res.status(200).json(cached);

  // Check daily limit
  if (username) {
    try {
      const check = await canAnalyze(username);
      if (!check.allowed) return res.status(429).json({ error: check.error, limitReached: true });
    } catch(_) {}
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: ANALYSIS_SYSTEM,
        messages: [{ role: "user", content: `${context}\n\nQuestion: ${query}` }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    const txt = extractAllText(data);
    const parsed = safeExtractJSON(txt);

    setCached(market || "general", query, parsed);
    try { if (username) await recordAnalysis(username); } catch(_) {}
    res.status(200).json(parsed);
  } catch (e) {
    console.error("Analyze error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
