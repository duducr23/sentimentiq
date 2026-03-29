// In-memory cache — persists as long as the server is running
// For production: replace with Redis or Vercel KV

const cache = new Map();
const TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

// Normalize query to improve cache hit rate
// "מה הסנטימנט של BTC?" and "מה קורה עם btc" → same key
function normalizeKey(market, query) {
  return `${market}::${query.trim().toLowerCase().replace(/[?!.,]/g, "").replace(/\s+/g, " ")}`;
}

export function getCached(market, query) {
  const key = normalizeKey(market, query);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL) {
    cache.delete(key);
    return null;
  }
  return entry;
}

export function setCached(market, query, data) {
  const key = normalizeKey(market, query);
  const now = new Date();
  cache.set(key, {
    ...data,
    _cached: true,
    _cachedAt: now.toISOString(),
    _cachedAtHuman: now.toLocaleString("he-IL", {
      timeZone: "Asia/Jerusalem",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }),
    timestamp: Date.now(),
  });
}

export function getAllCached() {
  const results = [];
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > TTL) {
      cache.delete(key);
      continue;
    }
    const [market, ...queryParts] = key.split("::");
    const ageMs = now - entry.timestamp;
    const ageHours = Math.floor(ageMs / 3600000);
    const ageMinutes = Math.floor((ageMs % 3600000) / 60000);
    results.push({
      market,
      query: queryParts.join("::"),
      cachedAt: entry._cachedAtHuman,
      expiresIn: `${23 - ageHours}ש ${59 - ageMinutes}ד`,
      sentimentScore: entry.sentimentScore,
      sentimentLabel: entry.sentimentLabel,
    });
  }
  return results.sort((a, b) => b.cachedAt - a.cachedAt);
}

export function clearCache() {
  cache.clear();
}

export function getCacheSize() {
  return cache.size;
}
