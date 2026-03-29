// Custom credit limits per user (stored in memory)
if (!global.customLimits) global.customLimits = {};

export function getUserLimit(username) {
  return global.customLimits?.[username] ?? 3;
}

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ limits: global.customLimits || {} });
  }

  if (req.method === "POST") {
    const { password, username, credits } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
    if (!username) return res.status(400).json({ error: "Missing username" });
    
    if (credits === null || credits === undefined) {
      // Reset to default
      delete global.customLimits[username];
    } else {
      global.customLimits[username] = parseInt(credits);
    }
    return res.status(200).json({ ok: true, username, credits: global.customLimits[username] ?? 3 });
  }

  res.status(405).end();
}
