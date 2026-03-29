import { getSupabase, isSupabaseConfigured } from "./supabase";

const mem = new Map();
const daily = new Map();
const todayStr = () => new Date().toISOString().slice(0,10);

export async function registerUser(username) {
  const key = username.toLowerCase().trim();
  if (key.length < 2 || key.length > 20) return { error: "שם משתמש חייב להיות 2-20 תווים" };
  if (!/^[a-zA-Z0-9\u05D0-\u05EA_]+$/.test(key)) return { error: "שם משתמש יכול להכיל רק אותיות ומספרים" };

  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data: ex } = await sb.from("users").select("username").eq("username", key).single();
      if (ex) return { error: "שם משתמש כבר תפוס" };
      const { error } = await sb.from("users").insert({ username: key, display_name: username.trim() });
      if (error) return { error: "שגיאה ברישום" };
    } catch(e) { return { error: "שגיאת חיבור" }; }
  } else {
    if (mem.has(key)) return { error: "שם משתמש כבר תפוס" };
    mem.set(key, { username: key, displayName: username.trim(), createdAt: new Date().toISOString(), total: 0 });
  }
  return { ok: true, user: { username: key, displayName: username.trim() } };
}

export async function loginUser(username) {
  const key = username.toLowerCase().trim();
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data: user } = await sb.from("users").select("username,display_name").eq("username", key).single();
      if (!user) return { error: "משתמש לא נמצא — אנא הירשם" };
      const dailyCount = await getDailyCount(key);
      return { ok: true, user: { username: key, displayName: user.display_name, dailyCount } };
    } catch(_) { return { error: "שגיאת חיבור" }; }
  }
  const u = mem.get(key);
  if (!u) return { error: "משתמש לא נמצא — אנא הירשם" };
  const dailyCount = await getDailyCount(key);
  return { ok: true, user: { username: key, displayName: u.displayName, dailyCount } };
}

async function getDailyCount(username) {
  const today = todayStr();
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data } = await sb.from("daily_usage").select("count").eq("username", username).eq("date", today).single();
      return data?.count || 0;
    } catch(_) { return 0; }
  }
  return daily.get(username + "::" + today) || 0;
}

export async function canAnalyze(username) {
  const count = await getDailyCount(username);
  if (count >= 3) return { allowed: false, error: "הגעת למגבלת 3 ניתוחים ביום. נסה שוב מחר." };
  return { allowed: true, remaining: 3 - count };
}

export async function recordAnalysis(username) {
  const today = todayStr();
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data: ex } = await sb.from("daily_usage").select("id,count").eq("username", username).eq("date", today).single();
      if (ex) {
        await sb.from("daily_usage").update({ count: ex.count + 1 }).eq("id", ex.id);
      } else {
        await sb.from("daily_usage").insert({ username, date: today, count: 1 });
      }
      const { data: u } = await sb.from("users").select("total_analyses").eq("username", username).single();
      if (u) await sb.from("users").update({ total_analyses: (u.total_analyses || 0) + 1 }).eq("username", username);
    } catch(_) {}
    return;
  }
  const k = username + "::" + today;
  daily.set(k, (daily.get(k) || 0) + 1);
  const u = mem.get(username);
  if (u) u.total = (u.total || 0) + 1;
}

export async function getStats() {
  const today = todayStr();
  const five = new Date(Date.now() - 5*24*60*60*1000).toISOString();
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const [{ count: total }, { count: newUsers }, { data: act }, { data: recent }] = await Promise.all([
        sb.from("users").select("*", { count: "exact", head: true }),
        sb.from("users").select("*", { count: "exact", head: true }).gte("created_at", five),
        sb.from("daily_usage").select("username,count").eq("date", today),
        sb.from("users").select("username,display_name,created_at,total_analyses").order("created_at", { ascending: false }).limit(20),
      ]);
      const cm = {};
      (act||[]).forEach(r => { cm[r.username] = r.count; });
      return {
        totalUsers: total || 0,
        newLast5Days: newUsers || 0,
        activeToday: (act||[]).length,
        totalAnalysesToday: (act||[]).reduce((s,r) => s+r.count, 0),
        recentUsers: (recent||[]).map(u => ({
          username: u.display_name || u.username,
          createdAt: new Date(u.created_at).toLocaleString("he-IL", { timeZone:"Asia/Jerusalem", day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }),
          dailyCount: cm[u.username] || 0,
          totalAnalyses: u.total_analyses || 0,
        })),
      };
    } catch(_) {}
  }
  const all = Array.from(mem.values());
  return {
    totalUsers: all.length, newLast5Days: 0, activeToday: 0, totalAnalysesToday: 0,
    recentUsers: all.slice(-20).reverse().map(u => ({
      username: u.displayName,
      createdAt: new Date(u.createdAt).toLocaleString("he-IL"),
      dailyCount: daily.get(u.username + "::" + today) || 0,
      totalAnalyses: u.total || 0,
    })),
  };
}
