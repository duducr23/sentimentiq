# 📡 SentimentIQ — מדריך התקנה מלא

## מה זה?
כלי AI לניתוח סנטימנט שוקי המניות, הקריפטו והסחורות בזמן אמת.
מבוסס על Next.js + Anthropic Claude API.

---

## שלב 1 — דרישות מקדימות (חינם)

1. **Node.js** — הורד מ-https://nodejs.org (גרסה 18+)
2. **Git** — הורד מ-https://git-scm.com
3. **חשבון GitHub** — https://github.com (חינם)
4. **חשבון Vercel** — https://vercel.com (חינם)
5. **Anthropic API Key** — https://console.anthropic.com

---

## שלב 2 — קבל API Key מ-Anthropic

1. היכנס ל-https://console.anthropic.com
2. לחץ על **"API Keys"** בתפריט השמאלי
3. לחץ **"Create Key"**
4. תן שם למפתח (לדוגמה: "SentimentIQ")
5. **שמור את המפתח** — הוא מתחיל ב-`sk-ant-...`
   ⚠️ לא תוכל לראות אותו שוב!
6. הוסף קצת קרדיט בחשבון (5$ מספיקים להתחלה)

---

## שלב 3 — הכן את הפרויקט

פתח Terminal (Command Prompt) בתיקיית הפרויקט:

```bash
# התקן dependencies
npm install

# הפעל locally לבדיקה
npm run dev
```

פתח http://localhost:3000 — הכלי צריך לעבוד!

---

## שלב 4 — העלה ל-GitHub

```bash
# אתחל Git repository
git init
git add .
git commit -m "Initial SentimentIQ"

# צור repository חדש ב-GitHub ואז:
git remote add origin https://github.com/YOUR_USERNAME/sentimentiq.git
git push -u origin main
```

---

## שלב 5 — פרוס ל-Vercel

1. היכנס ל-https://vercel.com
2. לחץ **"Add New Project"**
3. בחר את ה-repository שיצרת ב-GitHub
4. לחץ **"Import"**

### הגדר משתני סביבה (Environment Variables):
לחץ על **"Environment Variables"** והוסף:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` (המפתח שלך) |
| `ADMIN_PASSWORD` | סיסמה חזקה לדשבורד |

5. לחץ **"Deploy"**
6. חכה ~2 דקות — הכלי עלה!

---

## שלב 6 — שתף עם הקהילה

Vercel ייתן לך URL כמו: `https://sentimentiq-xxx.vercel.app`

שתף את הקישור! הקהילה שלך יכולה לגשת ישירות.

---

## דשבורד Admin

- כנס ל-`https://YOUR_URL.vercel.app/admin`
- הזן את ה-`ADMIN_PASSWORD` שהגדרת
- הוסף הערות, נקודות מפתח, ו-CSV לגרפים

---

## עלויות משוערות

| שירות | עלות |
|-------|------|
| Vercel Hosting | **חינם** |
| Claude API (ניתוח בודד) | ~$0.01-0.03 |
| 100 ניתוחים בחודש | ~$1-3 |

---

## בעיות נפוצות

**"API Key not working"**
→ ודא שיש קרדיט בחשבון Anthropic

**"Build failed on Vercel"**
→ ודא שהוספת את ה-Environment Variables לפני ה-Deploy

**"Admin password wrong"**
→ ודא שה-ADMIN_PASSWORD ב-Vercel תואם למה שאתה מזין

---

## שדרוג עתידי — DB אמיתי
הנתונים ב-Admin נשמרים בזיכרון (מתאפסים כשהשרת מתאתחל).
לנתונים קבועים: הוסף **Vercel KV** או **Supabase** (שניהם חינם לשימוש קטן).
