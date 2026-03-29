import { getStats } from "../../lib/userStore";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (req.query.password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.status(200).json(await getStats());
}
