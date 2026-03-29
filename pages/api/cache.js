import { getAllCached, clearCache, getCacheSize } from "../../lib/cache";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const [entries, size] = await Promise.all([getAllCached(), getCacheSize()]);
    return res.status(200).json({ size, entries });
  }

  if (req.method === "DELETE") {
    const { password } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await clearCache();
    return res.status(200).json({ ok: true, message: "Cache cleared" });
  }

  res.status(405).end();
}
