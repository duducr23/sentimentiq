import { getSupabase, isSupabaseConfigured } from "../../lib/supabase";

// Default analyst notes with Elliott Wave + Wyckoff + ICT embedded
const DEFAULT_NOTES = {
  stocks: `שיטת ניתוח: גלי אליוט + Wyckoff + ICT | Swing Trading ימים-שבועות

חוקי יסוד (חובה):
גל 2 לא עובר תחילת גל 1. גל 3 לא הקצר מבין 1 3 5. גל 4 לא חופף גל 1.

מבנה אימפולס: גל 1 עלייה ראשונה עם ספקנות. גל 2 תיקון 50-61.8% של גל 1. גל 3 הגל החזק פריצות ונפח גבוה. גל 4 תיקון צידי 38.2% חילופין עם גל 2. גל 5 עלייה אחרונה נפח יורד.

גלי תיקון: Zigzag ABC בנוי 5-3-5. Flat ABC בנוי 3-3-5. Triangle 5 גלים abc-de. גל 4 ו-B לרוב Triangle. גל 2 לרוב Zigzag.

שינוי מגמה: שוק דובי - סטייה חיובית בלבד: מחיר שפל נמוך RSI שפל גבוה. שוק שורי - סטייה שלילית בלבד: מחיר שיא גבוה RSI שיא נמוך. ללא סטייה אין שינוי מגמה.

יחסי פיבונאצ'י: תיקון 2: 50-61.8% גל 1. תיקון 4: 38.2% גל 3. יעד גל 3: 1.618x גל 1. SL: מתחת שפל גל 4.

Wyckoff: צבירה Spring כניסה. הפצה Upthrust שורט. ICT: Order Block FVG ו-CHoCH לאישור.`,

  crypto: `שיטת ניתוח: גלי אליוט + Wyckoff + ICT | Swing Trading ימים-שבועות

קריפטו ספציפי: תיקונים עמוקים 61.8-78.6%. גל 3 לרוב 2.618-4.236x גל 1. גל 5 לרוב Truncated אחרי גל 3 חזק.

חוקי יסוד: גל 2 לא עובר תחילת גל 1. גל 3 לא הקצר. גל 4 לא חופף גל 1.

Bitcoin: לאחר Halving לרוב גל 3 חזק. גל 4 לרוב 61.8% תיקון. גל 5 לרוב 1.618x גל 1.

שינוי מגמה: שוק דובי - סטייה חיובית ב-RSI Daily ואישור ב-MACD. שוק שורי - סטייה שלילית ב-Daily.

יחסי פיבונאצ'י: תיקון 2: 61.8-78.6%. תיקון 4: 38.2-61.8%. גל 3: 1.618-4.236x גל 1. SL: מתחת 78.6%.

ICT בקריפטו: Order Block Daily חשוב. FVG פתוח מגנט למחיר. Liquidity מעל שיאים יעד לגל 3 ו-5.`,

  commodities: `שיטת ניתוח: גלי אליוט + Wyckoff + ICT | Swing Trading ימים-שבועות

סחורות ספציפי: גל 5 לרוב המורחב. Triangle ב-Wave 4 מקדים blowoff בגל 5. זהב נע הפוך לשוק המניות.

זהב: Bull Market עם Dollar חלש. Triangle ב-Wave 4 פריצה חזקה ב-Wave 5. יעד Wave 5: Wave 3 x 1.618 + Low של Wave 4.

נפט: גל 3 לרוב 1.618-2.618x גל 1. תיקון גל 4 לרוב 38.2%.

חוקי יסוד: גל 2 לא עובר תחילת גל 1. גל 3 לא הקצר. גל 4 לא חופף גל 1.

שינוי מגמה: שוק דובי - סטייה חיובית RSI + נפח יורד + Dollar חלש. שוק שורי - סטייה שלילית + Dollar מתחזק.

Wyckoff: Distribution נפח גבוה סוף גל 5. Accumulation ארוך Spring גדול יותר.`
};

const DEFAULT_DATA = {
  stocks:      { notes: DEFAULT_NOTES.stocks,      keyPoints: ["", "", ""] },
  crypto:      { notes: DEFAULT_NOTES.crypto,       keyPoints: ["", "", ""] },
  commodities: { notes: DEFAULT_NOTES.commodities,  keyPoints: ["", "", ""] },
};

// In-memory fallback
let memStore = null;

async function loadFromSupabase() {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabase();
    const { data } = await sb.from("admin_settings").select("value").eq("key", "analyst_data").single();
    return data?.value || null;
  } catch(_) { return null; }
}

async function saveToSupabase(data) {
  if (!isSupabaseConfigured()) return false;
  try {
    const sb = getSupabase();
    await sb.from("admin_settings").upsert({ key: "analyst_data", value: data }, { onConflict: "key" });
    return true;
  } catch(e) {
    console.error("Supabase save error:", e.message);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Try Supabase first
    const sbData = await loadFromSupabase();
    if (sbData) {
      // Merge with defaults to ensure notes are never empty
      const merged = { ...DEFAULT_DATA };
      for (const market of ["stocks", "crypto", "commodities"]) {
        if (sbData[market]) {
          merged[market] = {
            ...sbData[market],
            notes: sbData[market].notes || DEFAULT_NOTES[market],
            keyPoints: sbData[market].keyPoints || ["", "", ""],
          };
        }
      }
      return res.status(200).json(merged);
    }
    // Fallback to memory or defaults
    return res.status(200).json(memStore || DEFAULT_DATA);
  }

  if (req.method === "POST") {
    const { password, data } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // Save to Supabase
    const saved = await saveToSupabase(data);
    if (!saved) {
      // Fallback to memory
      memStore = data;
    }
    return res.status(200).json({ ok: true, persisted: saved });
  }

  res.status(405).end();
}
