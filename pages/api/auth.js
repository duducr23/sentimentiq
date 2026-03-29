import { registerUser, loginUser, canAnalyze } from "../../lib/userStore";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { action, username } = req.body || {};
  if (!username) return res.status(400).json({ error: "Missing username" });

  if (action === "register") return res.status(200).json(await registerUser(username));
  if (action === "login")    return res.status(200).json(await loginUser(username));
  if (action === "check")    return res.status(200).json(await canAnalyze(username));

  res.status(400).json({ error: "Unknown action" });
}
