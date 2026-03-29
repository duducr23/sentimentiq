import { getSupabase, isSupabaseConfigured } from "./supabase";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const memCache = new Map(); // fallback

function normalizeKey(market, query) {
  return `${market}::${query.trim().toLowerCase().replace(/[?!.,]/g, "").replace(/\s+/g, " ")}`;
}

function humanTime(isoStr) {
  return new Date(isoStr).toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── GET ──────────────────────────────────────────────────────────────
export async function getCached(market, query) {
  const key = normalizeKey(market, query);

  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data } = await sb
        .from("analysis_cache")
        .select("data, expires_at")
        .eq("cache_key", key)
        .single();
      if (!data) return null;
      if (new Date(data.expires_at) < new Date()) {
        await sb.from("analysis_cache").delete().eq("cache_key", key);
        return null;
      }
      return { ...data.data, _cached: true };
    } catch (_) {}
  }

  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL_MS) { memCache.delete(key); return null; }
  return entry;
}

// ─── SET ──────────────────────────────────────────────────────────────
export async function setCached(market, query, data) {
  const key = normalizeKey(market, query);
  const now = new Date();
  const exp = new Date(Date.now() + TTL_MS).toISOString();
  const enriched = {
    ...data,
    _cached: true,
    _cachedAt: now.toISOString(),
    _cachedAtHuman: humanTime(now.toISOString()),
    timestamp: now.getTime(),
  };

  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      await sb.from("analysis_cache").upsert(
        { cache_key: key, market, query, data: enriched, cached_at: now.toISOString(), expires_at: exp },
        { onConflict: "cache_key" }
      );
      return;
    } catch (_) {}
  }

  memCache.set(key, enriched);
}

// ─── GET ALL ──────────────────────────────────────────────────────────
export async function getAllCached() {
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const now = new Date().toISOString();
      await sb.from("analysis_cache").delete().lt("expires_at", now);
      const { data } = await sb
        .from("analysis_cache")
        .select("market, query, cached_at, expires_at, data")
        .order("cached_at", { ascending: false })
        .limit(100);
      return (data || []).map(row => {
        const ms = new Date(row.expires_at) - new Date();
        return {
          market: row.market,
          query: row.query,
          cachedAt: humanTime(row.cached_at),
          expiresIn: `${Math.floor(ms / 3600000)}ש ${Math.floor((ms % 3600000) / 60000)}ד`,
          sentimentScore: row.data?.sentimentScore,
          sentimentLabel: row.data?.sentimentLabel,
        };
      });
    } catch (_) {}
  }

  const results = [];
  const now = Date.now();
  for (const [key, entry] of memCache.entries()) {
    if (now - entry.timestamp > TTL_MS) { memCache.delete(key); continue; }
    const [market, ...qp] = key.split("::");
    const age = now - entry.timestamp;
    results.push({
      market, query: qp.join("::"),
      cachedAt: entry._cachedAtHuman,
      expiresIn: `${Math.floor((TTL_MS - age) / 3600000)}ש ${Math.floor(((TTL_MS - age) % 3600000) / 60000)}ד`,
      sentimentScore: entry.sentimentScore,
      sentimentLabel: entry.sentimentLabel,
    });
  }
  return results;
}

// ─── CLEAR ────────────────────────────────────────────────────────────
export async function clearCache() {
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      await sb.from("analysis_cache").delete().neq("id", 0);
    } catch (_) {}
  }
  memCache.clear();
}

// ─── SIZE ─────────────────────────────────────────────────────────────
export async function getCacheSize() {
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { count } = await sb
        .from("analysis_cache")
        .select("*", { count: "exact", head: true })
        .gt("expires_at", new Date().toISOString());
      return count || 0;
    } catch (_) {}
  }
  return memCache.size;
}
