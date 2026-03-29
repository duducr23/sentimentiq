# הגדרת Supabase — מדריך מלא

## שלב 1 — צור חשבון Supabase

1. עבור ל: https://supabase.com
2. לחץ "Start your project" → הירשם עם GitHub
3. לחץ "New Project"
4. מלא:
   - Name: `sentimentiq`
   - Database Password: בחר סיסמה חזקה (שמור אותה!)
   - Region: בחר `EU West` (הכי קרוב לישראל)
5. לחץ "Create new project" — חכה ~2 דקות

---

## שלב 2 — צור את הטבלאות

לאחר שהפרויקט נוצר:
1. לחץ על "SQL Editor" בתפריט השמאלי
2. לחץ "New query"
3. העתק והדבק את ה-SQL הבא ולחץ "Run":

```sql
-- טבלת משתמשים
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_analyses INTEGER DEFAULT 0
);

-- טבלת שימוש יומי
CREATE TABLE daily_usage (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 0,
  UNIQUE(username, date)
);

-- אינדקסים לביצועים מהירים
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_daily_usage_username_date ON daily_usage(username, date);
CREATE INDEX idx_users_created_at ON users(created_at);
```

---

## שלב 3 — קבל את פרטי החיבור

1. לחץ על "Settings" (גלגל שיניים) → "API"
2. תראה:
   - **Project URL** — נראה כך: `https://xxxx.supabase.co`
   - **anon public key** — מפתח ארוך

---

## שלב 4 — הוסף ל-.env.local

פתח את `.env.local` והוסף שתי שורות:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...המפתח-הארוך-שלך
```

---

## שלב 5 — הוסף גם ל-Vercel

ב-Vercel → Settings → Environment Variables → הוסף:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

---

זהו! הכל אוטומטי מכאן.
