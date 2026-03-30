import "../styles/globals.css";
import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>DR STOCKS 26 — ניתוח שוק חכם</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="כלי מטורף שעוזר להבין את השוק בקלות!" />
        <meta property="og:title" content="DR STOCKS 26 — ניתוח שוק חכם" />
        <meta property="og:description" content="כלי מטורף שעוזר להבין את השוק בקלות!" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="DR STOCKS 26 — ניתוח שוק חכם" />
        <meta name="twitter:description" content="כלי מטורף שעוזר להבין את השוק בקלות!" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
