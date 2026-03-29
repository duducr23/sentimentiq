export function extractAllText(data) {
  let out = "";
  if (!data || !data.content) return out;
  for (const block of data.content) {
    if (block.type === "text") out += block.text + "\n";
  }
  return out;
}

function extractField(json, key) {
  const re = new RegExp('"' + key + '"\\s*:\\s*"');
  const match = re.exec(json);
  if (!match) return null;
  let i = match.index + match[0].length, out = "";
  while (i < json.length) {
    const ch = json[i];
    if (ch === '"' && json[i - 1] !== "\\") break;
    out += ch; i++;
  }
  return out.trim();
}

function extractArrayField(json, key) {
  const re = new RegExp('"' + key + '"\\s*:\\s*\\[');
  const match = re.exec(json);
  if (!match) return [];
  let depth = 1, i = match.index + match[0].length, out = "[";
  while (i < json.length && depth > 0) {
    const ch = json[i];
    if (ch === "[") depth++;
    if (ch === "]") depth--;
    out += ch; i++;
  }
  try { return JSON.parse(out); } catch (_) { return []; }
}

export function safeExtractJSON(text) {
  if (!text || !text.trim()) throw new Error("Empty response from API");
  const f = text.indexOf("{"), l = text.lastIndexOf("}");
  if (f === -1 || l === -1) throw new Error("No JSON found in response");
  const candidate = text.slice(f, l + 1);

  try { return JSON.parse(candidate); } catch (_) {}
  try { return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1")); } catch (_) {}

  // Fallback: extract field by field
  return {
    sentimentScore: parseInt((candidate.match(/"sentimentScore"\s*:\s*(\d+)/) || [])[1]) || 50,
    sentimentLabel: extractField(candidate, "sentimentLabel") || "לא זמין",
    whyMoving:      extractField(candidate, "whyMoving")      || "לא זמין",
    mainAnalysis:   extractField(candidate, "mainAnalysis")   || "לא זמין",
    riskLevel:      extractField(candidate, "riskLevel")      || "בינוני",
    keyRisk:        extractField(candidate, "keyRisk")        || "לא זמין",
    macroContext:   extractField(candidate, "macroContext")   || "לא זמין",
    drivers:        extractArrayField(candidate, "drivers"),
    signals:        extractArrayField(candidate, "signals"),
    forecast:       extractArrayField(candidate, "forecast"),
    sources:        extractArrayField(candidate, "sources"),
  };
}
