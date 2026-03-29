// Simple in-memory store — for production use a DB like Vercel KV or Supabase
let adminStore = {
  stocks:      { notes: "", keyPoints: ["", "", ""] },
  crypto:      { notes: "", keyPoints: ["", "", ""] },
  commodities: { notes: "", keyPoints: ["", "", ""] },
};

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(adminStore);
  }

  if (req.method === "POST") {
    const { password, data } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    adminStore = data;
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
