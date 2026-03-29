import { getSupabase, isSupabaseConfigured } from "./supabase";

const mem = new Map();
const daily = new Map();
const codes = new Map();
const todayStr = () => new Date().toISOString().slice(0,10);

// Simple hash (not bcrypt to avoid native deps on Vercel)
function hashPassword(password) {
  let hash = 0;
  const str = password + "siq_salt_2024";
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

// ─── CHECK USER EXISTS ────────────────────────────────────────────────
export async function checkUserExists(email) {
  const key = email.toLowerCase().trim();
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data } = await sb.from("users").select("username").eq("username", key).single();
      return !!data;
    } catch(_) { return false; }
  }
  return mem.has(key);
}

// ─── REGISTER ────────────────────────────────────────────────────────
export async function registerUser(email, displayName, password) {
  const key = email.toLowerCase().trim();
  if (!key.includes("@")) return { error: "מייל לא תקין" };
  if (!password || password.length < 6) return { error: "סיסמה חייבת להיות לפחות 6 תווים" };

  const hash = hashPassword(password);

  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data: ex } = await sb.from("users").select("username").eq("username", key).single();
      if (ex) return { error: "מייל כבר קיים — נסה להתחבר" };
      await sb.from("users").insert({ username: key, display_name: displayName || key.split("@")[0], password_hash: hash });
      return { ok: true, user: { username: key, displayName: displayName || key.split("@")[0], dailyCount: 0 } };
    } catch(e) { return { error: "שגיאת רישום" }; }
  }
  if (mem.has(key)) return { error: "מייל כבר קיים — נסה להתחבר" };
  mem.set(key, { username: key, displayName: displayName || key.split("@")[0], password: hash, createdAt: new Date().toISOString(), total: 0 });
  return { ok: true, user: { username: key, displayName: displayName || key.split("@")[0], dailyCount: 0 } };
}

// ─── LOGIN ────────────────────────────────────────────────────────────
export async function loginUser(email, password) {
  const key = email.toLowerCase().trim();
  const hash = hashPassword(password);

  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data: user } = await sb.from("users").select("username,display_name,password_hash").eq("username", key).single();
      if (!user) return { error: "מייל לא נמצא — אנא הירשם" };
      if (!user.password_hash) return { error: "חשבון ישן — אפס סיסמה דרך מייל" };
      if (user.password_hash !== hash) return { error: "סיסמה שגויה" };
      const limit = global.customLimits?.[key] ?? 3;
      if (limit === 0) return { error: "החשבון שלך מושהה. צור קשר עם האנליסט." };
      const dailyCount = await getDailyCount(key);
      return { ok: true, user: { username: key, displayName: user.display_name, dailyCount } };
    } catch(e) { return { error: "שגיאת חיבור" }; }
  }
  const u = mem.get(key);
  if (!u) return { error: "מייל לא נמצא — אנא הירשם" };
  if (u.password !== hash) return { error: "סיסמה שגויה" };
  const dailyCount = await getDailyCount(key);
  return { ok: true, user: { username: key, displayName: u.displayName, dailyCount } };
}

// ─── FORGOT PASSWORD — send reset code ───────────────────────────────
export async function sendResetCode(email) {
  const key = email.toLowerCase().trim();
  const exists = await checkUserExists(key);
  if (!exists) return { error: "מייל לא נמצא במערכת" };

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      await sb.from("users").update({ reset_token: code, reset_expires: expires }).eq("username", key);
    } catch(e) { return { error: "שגיאת שרת" }; }
  } else {
    const u = mem.get(key);
    if (u) { u.resetCode = code; u.resetExpires = Date.now() + 15 * 60 * 1000; }
  }

  // Send email
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[DEV] Reset code for ${key}: ${code}`);
    return { ok: true, dev: true, code };
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "DR STOCKS 26 <onboarding@resend.dev>",
        to: [key],
        subject: "איפוס סיסמה - DR STOCKS 26",
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#080c14;color:#e2e8f0;padding:32px;border-radius:16px">
            <div style="text-align:center;margin-bottom:24px">
              <div style="font-size:40px">📡</div>
              <h1 style="color:#f4b942;margin:8px 0">DR STOCKS 26</h1>
            </div>
            <p style="color:#94a3b8;margin-bottom:16px">קוד לאיפוס סיסמה:</p>
            <div style="background:#0d1420;border:2px solid #f4b942;border-radius:12px;padding:24px;text-align:center;margin-bottom:16px">
              <div style="font-size:40px;font-weight:900;letter-spacing:8px;color:#f4b942;font-family:monospace">${code}</div>
            </div>
            <p style="color:#64748b;font-size:12px;text-align:center">הקוד תקף ל-15 דקות</p>
          </div>
        `,
      }),
    });
    return { ok: true };
  } catch(e) { return { error: "שגיאה בשליחת מייל" }; }
}

// ─── RESET PASSWORD ───────────────────────────────────────────────────
export async function resetPassword(email, code, newPassword) {
  const key = email.toLowerCase().trim();
  if (!newPassword || newPassword.length < 6) return { error: "סיסמה חייבת להיות לפחות 6 תווים" };

  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data: user } = await sb.from("users").select("reset_token,reset_expires").eq("username", key).single();
      if (!user?.reset_token) return { error: "לא נשלח קוד לכתובת זו" };
      if (new Date(user.reset_expires) < new Date()) return { error: "הקוד פג תוקף — שלח שוב" };
      if (user.reset_token !== code.trim()) return { error: "קוד שגוי" };
      const hash = hashPassword(newPassword);
      await sb.from("users").update({ password_hash: hash, reset_token: null, reset_expires: null }).eq("username", key);
      return { ok: true };
    } catch(e) { return { error: "שגיאת שרת" }; }
  }
  const u = mem.get(key);
  if (!u?.resetCode) return { error: "לא נשלח קוד" };
  if (Date.now() > u.resetExpires) return { error: "הקוד פג תוקף" };
  if (u.resetCode !== code.trim()) return { error: "קוד שגוי" };
  u.password = hashPassword(newPassword);
  u.resetCode = null;
  return { ok: true };
}

// ─── DAILY COUNT ──────────────────────────────────────────────────────
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
  const limit = global.customLimits?.[username] ?? 3;
  if (limit === 0) return { allowed: false, error: "החשבון שלך מושהה. צור קשר עם האנליסט." };
  if (count >= limit) return { allowed: false, error: `הגעת למגבלת ${limit} ניתוחים ביום. נסה שוב מחר.` };
  return { allowed: true, remaining: limit - count };
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

// ─── STATS ────────────────────────────────────────────────────────────
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
        totalUsers: total || 0, newLast5Days: newUsers || 0,
        activeToday: (act||[]).length,
        totalAnalysesToday: (act||[]).reduce((s,r) => s+r.count, 0),
        recentUsers: (recent||[]).map(u => ({
          username: u.display_name || u.username,
          email: u.username,
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
      username: u.displayName, email: u.username,
      createdAt: new Date(u.createdAt).toLocaleString("he-IL"),
      dailyCount: daily.get(u.username + "::" + today) || 0,
      totalAnalyses: u.total || 0,
    })),
  };
}
