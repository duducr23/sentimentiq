import { getAllCached, clearCache, getCacheSize } from "../../lib/cache";

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      size: getCacheSize(),
      entries: getAllCached(),
    });
  }

  if (req.method === "DELETE") {
    const { password } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    clearCache();
    return res.status(200).json({ ok: true, message: "Cache cleared" });
  }

  res.status(405).end();
}
