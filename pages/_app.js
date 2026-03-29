import "../styles/globals.css";
import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>SentimentIQ — ניתוח שוק חכם</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="כלי AI לניתוח סנטימנט שוקי המניות, הקריפטו והסחורות בזמן אמת" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
