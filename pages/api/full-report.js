import { extractAllText, safeExtractJSON } from "../../lib/parseJson";
import { canAnalyze, recordAnalysis } from "../../lib/userStore";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

const REPORT_SYSTEM = `You are a professional market analyst using Elliott Wave, Wyckoff, and ICT methodology for swing trading.

TIMEFRAME RULE: First identify the chart timeframe. If NOT 1D Daily, return ONLY:
{"error":"timeframe","message":"הגרף שהעלית הוא לא Daily 1D. אנא העלה גרף יומי בלבד."}

For 1D charts, return ONLY valid JSON - no text before or after:
{"reportLines":[{"num":1,"category":"מגמה","icon":"📈","text":"תיאור","signal":"bullish"},{"num":2,"category":"Elliott Wave","icon":"🌊","text":"תיאור","signal":"bullish"},{"num":3,"category":"Wyckoff","icon":"📦","text":"תיאור","signal":"neutral"},{"num":4,"category":"ICT","icon":"🎯","text":"תיאור","signal":"neutral"},{"num":5,"category":"סטייה","icon":"📐","text":"תיאור","signal":"bullish"},{"num":6,"category":"תמיכה/התנגדות","icon":"🔑","text":"תיאור","signal":"neutral"},{"num":7,"category":"סנטימנט","icon":"🌡️","text":"תיאור","signal":"neutral"},{"num":8,"category":"כניסה","icon":"🚀","text":"תיאור","signal":"bullish"},{"num":9,"category":"ניהול סיכונים","icon":"🛡️","text":"SL: X TP1: Y TP2: Z יחס 1:3","signal":"neutral"},{"num":10,"category":"מסקנה","icon":"✅","text":"תיאור","signal":"bullish"}],"overallSignal":"bullish","overallScore":72,"tradeSetup":{"bias":"לונג","entry":"X","stopLoss":"X","takeProfit1":"X","takeProfit2":"X","riskReward":"1:3","confidence":"בינוני"},"chartData":{"labels":["יום 1","יום 2","יום 3","יום 4","יום 5","יום 6","יום 7","יום 8","יום 9","יום 10"],"prices":[100,102,101,105,103,107,106,110,108,112],"support":103,"resistance":110,"entryZone":105,"stopLoss":101,"takeProfit":112}}
Signal values: bullish, bearish, or neutral only. All Hebrew text must not contain double quotes.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { imageBase64, mediaType, market, analystNotes, keyPoints, prices, username } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "Missing image" });

  if (username) {
    try {
      const check = await canAnalyze(username);
      if (!check.allowed) return res.status(429).json({ error: check.error, limitReached: true });
    } catch(_) {}
  }

  const contextText = [
    `Market: ${market || "unknown"}`,
    prices ? `Prices: ${JSON.stringify(prices)}` : "",
    keyPoints?.filter(Boolean).length ? `Key points: ${keyPoints.filter(Boolean).join(" | ")}` : "",
    analystNotes ? `Analyst notes: ${analystNotes}` : "",
  ].filter(Boolean).join("\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        system: REPORT_SYSTEM,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType || "image/png", data: imageBase64 } },
            { type: "text", text: `Analyze this chart.\n${contextText}` }
          ]
        }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    const txt = extractAllText(data);
    const parsed = safeExtractJSON(txt);
    try { if (username) await recordAnalysis(username); } catch(_) {}
    res.status(200).json(parsed);
  } catch (e) {
    console.error("Report error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
