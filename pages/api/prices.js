function spark(price, changePct) {
  const pct = changePct / 100;
  const start = price / (1 + pct);
  return Array.from({length: 7}, (_, i) => {
    const v = start + (price - start) * (i / 6);
    return parseFloat(v.toFixed(2));
  });
}

function fmt(price, changePct) {
  const up = changePct >= 0;
  return {
    price: price > 1000 ? Math.round(price).toLocaleString("en-US") : price.toFixed(2),
    change: (up ? "+" : "") + changePct.toFixed(2) + "%",
    up,
    sparkline: spark(price, changePct),
  };
}

async function getYahoo(symbol) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } });
  const d = await r.json();
  const meta = d?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) return null;
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose || meta.previousClose || price;
  const changePct = ((price - prev) / prev) * 100;
  return fmt(price, changePct);
}

async function getCrypto() {
  const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true");
  const d = await r.json();
  const c = (id) => {
    const x = d[id];
    if (!x) return null;
    return fmt(x.usd, x.usd_24h_change || 0);
  };
  return { btc: c("bitcoin"), eth: c("ethereum"), sol: c("solana") };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const [crypto, sp500, nasdaq, tsla, gold, silver, oil] = await Promise.allSettled([
      getCrypto(),
      getYahoo("^GSPC"), getYahoo("^IXIC"), getYahoo("TSLA"),
      getYahoo("GC=F"), getYahoo("SI=F"), getYahoo("CL=F"),
    ]);
    const g = r => r.status === "fulfilled" ? r.value : null;
    const c = g(crypto) || {};
    res.status(200).json({
      stocks:      { sp500: g(sp500), nasdaq: g(nasdaq), tsla: g(tsla) },
      crypto:      { btc: c.btc, eth: c.eth, sol: c.sol },
      commodities: { gold: g(gold), silver: g(silver), oil: g(oil) },
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
