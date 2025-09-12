import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "Layer4 - Revolutionary Layer 4 Tek Protocol",
  description: "Layer4 represents a revolutionary approach to blockchain technology, transcending traditional layers through the innovative Layer 4 Tek protocol. Built for unbreakable stability with a 100% community airdrop and no selling allowed.",
  keywords: "Layer4, blockchain, cryptocurrency, Layer 4 Tek, DeFi, Solana, token, crypto, finance, stability, airdrop",
  authors: [{ name: "Layer4 Team" }],
  creator: "Layer4 Team",
  publisher: "Layer4",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "Layer4 - Revolutionary Layer 4 Tek Protocol",
    description: "Layer4 represents a revolutionary approach to blockchain technology, transcending traditional layers through the innovative Layer 4 Tek protocol. Built for unbreakable stability with a 100% community airdrop and no selling allowed.",
    url: "http://lay4r.io",
    siteName: "Layer4",
    images: [
      {
        url: "/logo.jpg",
        width: 800,
        height: 600,
        alt: "Layer4 Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Layer4 - Revolutionary Layer 4 Tek Protocol",
    description: "Layer4 represents a revolutionary approach to blockchain technology, transcending traditional layers through the innovative Layer 4 Tek protocol.",
    images: ["/logo.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL('http://lay4r.io'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="apple-mobile-web-app-title" content="Layer4" />
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        {/* <Script id="font-loader" strategy="afterInteractive">
          {`
            (function() {
              try {
                var font = new FontFace('LisaStyle', 'url(data:font/woff2;base64,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)');
                font.load().then(function(loadedFont){
                  document.fonts.add(loadedFont);
                  document.body.classList.add('font-loaded');
                }).catch(function(err){
                  console.warn('Font loading failed:', err);
                });
              } catch (e) {}
            })();
          `}
        </Script> */}
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
