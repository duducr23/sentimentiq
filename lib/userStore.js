import { getSupabase, isSupabaseConfigured } from "./supabase";

// In-memory stores (fallback)
const mem = new Map();         // email -> user
const daily = new Map();       // email::date -> count
const codes = new Map();       // email -> { code, expires, attempts }

const todayStr = () => new Date().toISOString().slice(0,10);

// ─── SEND VERIFICATION CODE ─────────────────────────────────────────
export async function sendVerificationCode(email) {
  const emailLower = email.toLowerCase().trim();
  if (!emailLower.includes("@")) return { error: "כתובת מייל לא תקינה" };

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Store code in Supabase if available, otherwise memory
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    try {
      // Upsert verification code
      await sb.from("verification_codes").upsert({
        email: emailLower,
        code,
        expires_at: expires,
        attempts: 0,
      }, { onConflict: "email" });
    } catch(e) {
      console.error("Failed to store code in Supabase:", e.message);
      // Fallback to memory
      codes.set(emailLower, { code, expires: Date.now() + 10 * 60 * 1000, attempts: 0 });
    }
  } else {
    codes.set(emailLower, { code, expires: Date.now() + 10 * 60 * 1000, attempts: 0 });
  }

  // Send email via Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev mode - log code
    console.log(`[DEV] Verification code for ${emailLower}: ${code}`);
    return { ok: true, dev: true, code }; // Return code in dev
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "SentimentIQ <onboarding@resend.dev>",
        to: [emailLower],
        subject: "קוד אימות - SentimentIQ",
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#080c14;color:#e2e8f0;padding:32px;border-radius:16px">
            <div style="text-align:center;margin-bottom:24px">
              <div style="font-size:40px">📡</div>
              <h1 style="color:#f4b942;margin:8px 0;font-size:24px">SentimentIQ</h1>
              <p style="color:#64748b;font-size:12px;letter-spacing:2px">LIVE MARKET INTELLIGENCE</p>
            </div>
            <p style="margin-bottom:16px;color:#94a3b8">שלום,</p>
            <p style="margin-bottom:24px;color:#94a3b8">קוד האימות שלך ל-SentimentIQ:</p>
            <div style="background:#0d1420;border:2px solid #f4b942;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
              <div style="font-size:40px;font-weight:900;letter-spacing:8px;color:#f4b942;font-family:monospace">${code}</div>
            </div>
            <p style="color:#64748b;font-size:12px;text-align:center">הקוד תקף ל-10 דקות בלבד</p>
            <hr style="border:1px solid rgba(255,255,255,0.07);margin:24px 0"/>
            <p style="color:#475569;font-size:11px;text-align:center">אם לא ביקשת קוד זה, אנא התעלם ממייל זה.</p>
          </div>
        `,
      }),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.message || "שגיאה בשליחת מייל");
    }
    return { ok: true };
  } catch (e) {
    console.error("Email send error:", e.message);
    return { error: "שגיאה בשליחת מייל: " + e.message };
  }
}

// ─── VERIFY CODE ─────────────────────────────────────────────────────
export async function verifyCode(email, code, username) {
  const emailLower = email.toLowerCase().trim();

  let entry = null;

  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    try {
      const { data } = await sb.from("verification_codes")
        .select("code,expires_at,attempts")
        .eq("email", emailLower)
        .single();
      if (data) {
        entry = {
          code: data.code,
          expires: new Date(data.expires_at).getTime(),
          attempts: data.attempts || 0,
        };
      }
    } catch(e) {
      console.error("Supabase verify error:", e.message);
    }
  } else {
    entry = codes.get(emailLower);
  }

  if (!entry) return { error: "לא נשלח קוד לכתובת זו — שלח מחדש" };
  if (Date.now() > entry.expires) {
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      await sb.from("verification_codes").delete().eq("email", emailLower).catch(()=>{});
    } else {
      codes.delete(emailLower);
    }
    return { error: "הקוד פג תוקף — שלח קוד חדש" };
  }

  entry.attempts++;
  if (entry.attempts > 5) {
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      await sb.from("verification_codes").delete().eq("email", emailLower).catch(()=>{});
    } else {
      codes.delete(emailLower);
    }
    return { error: "יותר מדי ניסיונות — שלח קוד חדש" };
  }

  if (entry.code !== code.trim()) {
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      await sb.from("verification_codes")
        .update({ attempts: entry.attempts })
        .eq("email", emailLower).catch(()=>{});
    }
    return { error: `קוד שגוי (${5 - entry.attempts} ניסיונות נותרו)` };
  }

  // Code correct — delete it
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    await sb.from("verification_codes").delete().eq("email", emailLower).catch(()=>{});
  } else {
    codes.delete(emailLower);
  }

  // Check if user exists
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data: existing } = await sb.from("users").select("username,display_name").eq("username", emailLower).single();
      if (existing) {
        // Existing user — login
        const dailyCount = await getDailyCount(emailLower);
        return { ok: true, isNew: false, user: { username: emailLower, displayName: existing.display_name || emailLower.split("@")[0], dailyCount } };
      }
      // New user — register
      const displayName = username?.trim() || emailLower.split("@")[0];
      await sb.from("users").insert({ username: emailLower, display_name: displayName });
      return { ok: true, isNew: true, user: { username: emailLower, displayName, dailyCount: 0 } };
    } catch (e) {
      console.error("DB error:", e.message);
    }
  }

  // Memory fallback
  if (mem.has(emailLower)) {
    const u = mem.get(emailLower);
    const dailyCount = await getDailyCount(emailLower);
    return { ok: true, isNew: false, user: { username: emailLower, displayName: u.displayName, dailyCount } };
  }
  const displayName = username?.trim() || emailLower.split("@")[0];
  mem.set(emailLower, { username: emailLower, displayName, createdAt: new Date().toISOString(), total: 0 });
  return { ok: true, isNew: true, user: { username: emailLower, displayName, dailyCount: 0 } };
}

// ─── DAILY COUNT ─────────────────────────────────────────────────────
async function getDailyCount(username) {
  const today = todayStr();
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data } = await sb.from("daily_usage").select("count").eq("username", username).eq("date", today).single();
      return data?.count || 0;
    } catch (_) { return 0; }
  }
  return daily.get(username + "::" + today) || 0;
}

export async function canAnalyze(username) {
  const count = await getDailyCount(username);
  // Check custom limit
  const limit = global.customLimits?.[username] ?? 3;
  if (count >= limit) {
    if (limit === 0) return { allowed: false, error: "המשתמש שלך מושהה. צור קשר עם האנליסט." };
    return { allowed: false, error: `הגעת למגבלת ${limit} ניתוחים ביום. נסה שוב מחר.` };
  }
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
    } catch (_) {}
    return;
  }
  const k = username + "::" + today;
  daily.set(k, (daily.get(k) || 0) + 1);
  const u = mem.get(username);
  if (u) u.total = (u.total || 0) + 1;
}

// ─── STATS ───────────────────────────────────────────────────────────
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
