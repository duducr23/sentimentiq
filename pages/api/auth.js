import { registerUser, loginUser, sendResetCode, resetPassword, canAnalyze, checkUserExists, verifyEmailCode, sendVerificationCode } from "../../lib/userStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { action, email, password, newPassword, code, username } = req.body || {};

  if (action === "register") {
    if (!email || !password) return res.status(400).json({ error: "חסרים פרטים" });
    return res.status(200).json(await registerUser(email, username, password));
  }

  if (action === "verify") {
    if (!email || !code) return res.status(400).json({ error: "חסרים פרטים" });
    return res.status(200).json(await verifyEmailCode(email, code));
  }

  if (action === "resend") {
    if (!email) return res.status(400).json({ error: "חסר מייל" });
    return res.status(200).json(await sendVerificationCode(email));
  }

  if (action === "login") {
    if (!email || !password) return res.status(400).json({ error: "חסרים פרטים" });
    return res.status(200).json(await loginUser(email, password));
  }

  if (action === "forgot") {
    if (!email) return res.status(400).json({ error: "חסר מייל" });
    return res.status(200).json(await sendResetCode(email));
  }

  if (action === "reset") {
    if (!email || !code || !newPassword) return res.status(400).json({ error: "חסרים פרטים" });
    return res.status(200).json(await resetPassword(email, code, newPassword));
  }

  if (action === "check") {
    if (!email) return res.status(400).json({ error: "חסר מייל" });
    return res.status(200).json(await canAnalyze(email));
  }

  res.status(400).json({ error: "פעולה לא מוכרת" });
}
