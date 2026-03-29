import { CHART_ANALYSIS_SYSTEM } from "../../lib/constants";
import { extractAllText, safeExtractJSON } from "../../lib/parseJson";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { imageBase64, mediaType, analystNotes, market } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "Missing image" });

  const userContent = [
    {
      type: "image",
      source: { type: "base64", media_type: mediaType || "image/png", data: imageBase64 },
    },
    {
      type: "text",
      text: `Analyze this chart using Elliott Wave, Wyckoff, and ICT methodology for swing trading.
Market: ${market || "unknown"}
Analyst context: ${analystNotes || "none"}
Apply divergence rules: trend change confirmed ONLY by positive divergence in bearish market or negative divergence in bullish market.`,
    },
  ];

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", // Sonnet for vision tasks
        max_tokens: 1000,
        system: CHART_ANALYSIS_SYSTEM,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    const txt = extractAllText(data);
    const parsed = safeExtractJSON(txt);
    res.status(200).json(parsed);
  } catch (e) {
    console.error("Chart analysis error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
