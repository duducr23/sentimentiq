import { registerUser, loginUser, canAnalyze, sendVerificationCode, verifyCode } from "../../lib/userStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { action, email, username, code } = req.body || {};

  // שלב 1: שלח קוד אימות למייל
  if (action === "send_code") {
    if (!email) return res.status(400).json({ error: "חסר מייל" });
    return res.status(200).json(await sendVerificationCode(email));
  }

  // שלב 2: אמת קוד וכנס/רשום
  if (action === "verify") {
    if (!email || !code) return res.status(400).json({ error: "חסר מייל או קוד" });
    return res.status(200).json(await verifyCode(email, code, username));
  }

  if (action === "check") {
    if (!email) return res.status(400).json({ error: "חסר מייל" });
    return res.status(200).json(await canAnalyze(email));
  }

  res.status(400).json({ error: "פעולה לא מוכרת" });
}
