/**
 * userStore.js
 * Unified user management — uses Supabase if configured, falls back to in-memory.
 * Drop-in replacement for the inline code that was in pages/api/auth.js
 */

import { getSupabase, isSupabaseConfigured } from "./supabase";

// ── In-memory fallback (used when Supabase is not configured) ──────
const memUsers     = new Map(); // username → user object
const memDailyUsage = new Map(); // "username::date" → count

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────────────
export async function registerUser(username) {
  const key = username.toLowerCase().trim();
  if (key.length < 2 || key.length > 20) return { error: "שם משתמש חייב להיות 2-20 תווים" };
  if (!/^[a-zA-Z0-9א-ת_]+$/.test(key)) return { error: "שם משתמש יכול להכיל רק אותיות ומספרים" };

  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    // Check existing
    const { data: existing } = await sb.from("users").select("username").eq("username", key).single();
    if (existing) return { error: "שם משתמש כבר תפוס" };
    // Insert
    const { error } = await sb.from("users").insert({ username: key, display_name: username.trim() });
    if (error) return { error: "שגיאה ברישום: " + error.message };
    return { ok: true, user: { username: key, displayName: username.trim() } };
  }

  // Memory fallback
  if (memUsers.has(key)) return { error: "שם משתמש כבר תפוס" };
  memUsers.set(key, { username: key, displayName: username.trim(), createdAt: new Date().toISOString(), totalAnalyses: 0 });
  return { ok: true, user: { username: key, displayName: username.trim() } };
}

// ─────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────
export async function loginUser(username) {
  const key = username.toLowerCase().trim();

  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    const { data: user } = await sb.from("users").select("username,display_name").eq("username", key).single();
    if (!user) return { error: "משתמש לא נמצא — אנא הירשם" };
    const dailyCount = await getDailyCount(key);
    return { ok: true, user: { username: key, displayName: user.display_name, dailyCount } };
  }

  // Memory fallback
  const user = memUsers.get(key);
  if (!user) return { error: "משתמש לא נמצא — אנא הירשם" };
  const dailyCount = await getDailyCount(key);
  return { ok: true, user: { username: key, displayName: user.displayName, dailyCount } };
}

// ─────────────────────────────────────────────────────────────────────
// DAILY COUNT HELPERS
// ─────────────────────────────────────────────────────────────────────
async function getDailyCount(username) {
  const today = todayStr();
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    const { data } = await sb.from("daily_usage")
      .select("count").eq("username", username).eq("date", today).single();
    return data?.count || 0;
  }
  return memDailyUsage.get(`${username}::${today}`) || 0;
}

export async function canAnalyze(username) {
  const count = await getDailyCount(username);
  if (count >= 3) {
    return { allowed: false, error: "הגעת למגבלת 3 ניתוחים ביום. נסה שוב מחר או בדוק את המאגר." };
  }
  return { allowed: true, remaining: 3 - count };
}

export async function recordAnalysis(username) {
  const today = todayStr();
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    // Upsert daily usage
    const { data: existing } = await sb.from("daily_usage")
      .select("id,count").eq("username", username).eq("date", today).single();
    if (existing) {
      await sb.from("daily_usage").update({ count: existing.count + 1 }).eq("id", existing.id);
    } else {
      await sb.from("daily_usage").insert({ username, date: today, count: 1 });
    }
    // Increment total analyses
    try {
      const { data: userData } = await sb.from("users").select("total_analyses").eq("username", username).single();
      if (userData) {
        await sb.from("users").update({ total_analyses: (userData.total_analyses || 0) + 1 }).eq("username", username);
      }
    } catch(_) {}
    return;
  }

  // Memory fallback
  const key = `${username}::${today}`;
  memDailyUsage.set(key, (memDailyUsage.get(key) || 0) + 1);
  const user = memUsers.get(username);
  if (user) user.totalAnalyses = (user.totalAnalyses || 0) + 1;
}

// ─────────────────────────────────────────────────────────────────────
// STATS (admin)
// ─────────────────────────────────────────────────────────────────────
export async function getStats() {
  const today = todayStr();
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  if (isSupabaseConfigured()) {
    const sb = getSupabase();

    const [
      { count: totalUsers },
      { count: newLast5Days },
      { data: activeData },
      { data: recentUsers },
    ] = await Promise.all([
      sb.from("users").select("*", { count: "exact", head: true }),
      sb.from("users").select("*", { count: "exact", head: true }).gte("created_at", fiveDaysAgo + "T00:00:00Z"),
      sb.from("daily_usage").select("username,count").eq("date", today),
      sb.from("users").select("username,display_name,created_at,total_analyses").order("created_at", { ascending: false }).limit(20),
    ]);

    const activeToday = activeData?.length || 0;
    const totalAnalysesToday = activeData?.reduce((s, r) => s + r.count, 0) || 0;

    // Get today's count per user for the table
    const todayCountMap = {};
    (activeData || []).forEach(r => { todayCountMap[r.username] = r.count; });

    return {
      totalUsers: totalUsers || 0,
      newLast5Days: newLast5Days || 0,
      activeToday,
      totalAnalysesToday,
      recentUsers: (recentUsers || []).map(u => ({
        username: u.display_name || u.username,
        createdAt: new Date(u.created_at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }),
        dailyCount: todayCountMap[u.username] || 0,
        totalAnalyses: u.total_analyses || 0,
      })),
    };
  }

  // Memory fallback
  const allUsers = Array.from(memUsers.values());
  const activeToday = Array.from(memDailyUsage.entries())
    .filter(([k]) => k.endsWith("::" + today)).length;
  const totalAnalysesToday = Array.from(memDailyUsage.entries())
    .filter(([k]) => k.endsWith("::" + today))
    .reduce((s, [, v]) => s + v, 0);

  return {
    totalUsers: allUsers.length,
    newLast5Days: allUsers.filter(u => u.createdAt >= fiveDaysAgo).length,
    activeToday,
    totalAnalysesToday,
    recentUsers: allUsers.slice(-20).reverse().map(u => ({
      username: u.displayName,
      createdAt: new Date(u.createdAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }),
      dailyCount: memDailyUsage.get(`${u.username}::${today}`) || 0,
      totalAnalyses: u.totalAnalyses || 0,
    })),
  };
}
 
