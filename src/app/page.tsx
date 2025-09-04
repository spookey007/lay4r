"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [tokenData, setTokenData] = useState({
    price: '$0.00006489',
    marketCap: '$64K',
    totalSupply: '985.14M L4',
    holders: '290'
  });
  const [loading, setLoading] = useState(false);

  // Fetch token data from Jupiter Lite token details only
  const fetchTokenData = async () => {
    setLoading(true);
    try {
      // Jupiter Lite token details (supply, holders, usdPrice, mcap)
      const liteResp = await fetch('https://lite-api.jup.ag/tokens/v2/search?query=EtpQtF2hZZaEMZTKCp15MmMtwjsXJGz4Z6ADCUQopump');
      const liteJson = await liteResp.json();
      if (Array.isArray(liteJson) && liteJson.length > 0) {
        const t = liteJson[0];
        const usdPrice = typeof t.usdPrice === 'number' ? t.usdPrice : undefined;
        const mcap = typeof t.mcap === 'number' ? t.mcap : undefined;
        const holders = typeof t.holderCount === 'number' ? t.holderCount : undefined;
        const supply = typeof t.totalSupply === 'number' ? t.totalSupply : undefined;

        setTokenData(prev => ({
          ...prev,
          price: usdPrice ? `$${usdPrice.toFixed(8)}` : prev.price,
          marketCap: mcap ? `$${Math.round(mcap).toLocaleString()}` : prev.marketCap,
          totalSupply: supply ? `${(supply/1_000_000).toFixed(2)}M L4` : prev.totalSupply,
          holders: holders ? `${holders}` : prev.holders,
        }));
      }
    } catch (error) {
      console.log('Error fetching token data:', error);
      // Keep default values if API fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenData();
    // Refresh details every 1 hour
    const hourly = setInterval(fetchTokenData, 60 * 60 * 1000);
    return () => { clearInterval(hourly); };
  }, []);

  return (
    <div className="flex flex-col flex-1 py-4" style={{ fontFamily: "'LisaStyle', monospace" }}>
      {/* Hero Section */}
      <section className="lisa-window">
        <div className="lisa-titlebar">
          <div className="lisa-title">Layer4 — Welcome</div>

        </div>
        <div className="lisa-content">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 font-[Courier_New,monospace]">Welcome to Layer4</h1>
            <h2 className="text-lg md:text-xl mb-4 font-semibold text-[#0000ff]">Revolutionary Layer 4 Tek Protocol</h2>
            <p className="mb-5 max-w-xl text-base leading-relaxed">Built on &quot;Layer 4 Tek&quot; &#8211; a revolutionary protocol that transcends traditional blockchain layers. L4 is designed for one purpose: unbreakable stability. No selling allowed. No DEXs to tempt the weak. This is the future of financial stability, crafted by retards for retards.</p>
            <div className="text-center">
              <Link href="https://phantom.com/tokens/solana/EtpQtF2hZZaEMZTKCp15MmMtwjsXJGz4Z6ADCUQopump" target="_blank" rel="noopener noreferrer" className="lisa-button lisa-button-primary inline-block">
                Get Started
              </Link>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center min-w-0">
<div className="p-2 flex justify-center items-center">
  <video
    autoPlay
    muted
    loop
    playsInline
    className="rounded border border-[#808080] max-w-full h-auto object-cover"
    style={{ width: '400px', height: '280px' }}
  >
    <source src="/motherboard.mp4" type="video/mp4" />
    Your browser does not support the video tag.
  </video>
</div>
            <div className="mt-3 text-center">
              <p className="text-sm font-mono text-[#808080] italic">&quot;In a world of chaos, Layer4 offers the ultimate commitment to holding.&quot;</p>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Token Stats Section */}
      <section className="lisa-window">
        <div className="lisa-titlebar">
          <div className="lisa-title">Layer4 — Token Stats</div>

        </div>
        <div className="lisa-content">
        <div className="lisa-tabs">

        </div>
        <div className="lisa-grid">
          <div className="lisa-card flex flex-col items-center">
            <span className="text-2xl mb-2">💰</span>
            <h4 className="font-semibold mb-1 text-sm">Current Price</h4>
            <p className="text-base font-bold text-[#0000ff] flex items-center gap-2">
            {loading ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              <a
                href="https://t.co/nBJb6rNmlw"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {tokenData.price}
              </a>
            )}

            {!loading && (
              <button
                onClick={fetchTokenData}
                className="text-xs text-gray-500 hover:text-[#0000ff] transition-colors"
                title="Refresh price"
              >
                🔄
              </button>
            )}
          </p>

          </div>
          <div className="lisa-card flex flex-col items-center">
            <span className="text-2xl mb-2">📊</span>
            <h4 className="font-semibold mb-1 text-sm">Market Cap</h4>
            <p className="text-base font-bold text-[#0000ff]">
              {loading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                tokenData.marketCap
              )}
            </p>
          </div>
          <div className="lisa-card flex flex-col items-center">
            <span className="text-2xl mb-2">🔢</span>
            <h4 className="font-semibold mb-1 text-sm">Total Supply</h4>
            <p className="text-base font-bold text-[#0000ff]">{tokenData.totalSupply}</p>
          </div>
          <div className="lisa-card flex flex-col items-center">
            <span className="text-2xl mb-2">👥</span>
            <h4 className="font-semibold mb-1 text-sm">Holders</h4>
            <p className="text-base font-bold text-[#0000ff]">{tokenData.holders}</p>
          </div>
        </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="lisa-window">
        <div className="lisa-titlebar">
          <div className="lisa-title">Layer4 — Why Layer4?</div>

        </div>
        <div className="lisa-content">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="lisa-card">
            <h3 className="font-bold text-lg mb-2">Unbreakable Stability</h3>
            <p>Built on Layer 4 Tek, our revolutionary protocol transcends traditional blockchain limitations for ultimate stability.</p>
          </div>
          <div className="lisa-card">
            <h3 className="font-bold text-lg mb-2">No Selling Allowed</h3>
            <p>Our unique protocol design ensures that once you buy, you can only hold, creating unbreakable commitment to the future.</p>
          </div>
          <div className="lisa-card">
            <h3 className="font-bold text-lg mb-2">Community Driven</h3>
            <p>Layer4 is crafted by retards for retards - a community of like-minded individuals committed to financial stability.</p>
            <div className="mt-3">
              <Link href="https://x.com/i/communities/1960769432114094224" target="_blank" rel="noopener noreferrer" className="text-[#0000ff] hover:text-[#0000cc] underline font-mono text-sm">
                Join Our Community →
              </Link>
            </div>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}
