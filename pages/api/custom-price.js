function spark(price, changePct) {
  const pct = changePct / 100;
  const start = price / (1 + pct);
  return Array.from({length: 7}, (_, i) => parseFloat((start + (price - start) * (i/6)).toFixed(2)));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Missing name" });
  const input = name.trim().toUpperCase().split(" ")[0];

  // Try crypto first
  try {
    const sr = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(name)}`);
    const sd = await sr.json();
    const coinId = sd?.coins?.[0]?.id;
    if (coinId) {
      const pr = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`);
      const pd = await pr.json();
      const x = pd[coinId];
      if (x?.usd) {
        const price = x.usd;
        const change = x.usd_24h_change || 0;
        const up = change >= 0;
        return res.status(200).json({
          price: price > 1000 ? Math.round(price).toLocaleString("en-US") : price.toFixed(4),
          change: (up?"+":"") + change.toFixed(2) + "%", up,
          sparkline: spark(price, change),
        });
      }
    }
  } catch(_) {}

  // Try stocks
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(input)}?interval=1d&range=1d`;
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } });
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if (meta?.regularMarketPrice) {
      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose || price;
      const changePct = ((price - prev) / prev) * 100;
      const up = changePct >= 0;
      return res.status(200).json({
        price: price > 1000 ? Math.round(price).toLocaleString("en-US") : price.toFixed(2),
        change: (up?"+":"") + changePct.toFixed(2) + "%", up,
        sparkline: spark(price, changePct),
      });
    }
  } catch(_) {}

  res.status(404).json({ error: `לא נמצא: ${name}` });
}
