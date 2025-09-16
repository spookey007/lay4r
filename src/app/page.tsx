"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import SolanaStaking from "./components/SolanaStaking";
import ChatWidget from "./components/ChatWidget";


export default function Home() {
  const [showStakingModal, setShowStakingModal] = useState(false);
  
  const [tokenData, setTokenData] = useState({
    price: '$0.00006489',
    marketCap: '$64K',
    totalSupply: '985.14M L4',
    holders: '290'
  });
  const [loading, setLoading] = useState(false);

  // Fetch token data from Jupiter Lite token details only
  // const fetchTokenData = async () => {
  //   setLoading(true);
  //   try {
  //     const resp = await fetch('http://localhost:4000/api/dex-pair');
  //     const json = await resp.json();
  
  //     if (json?.code === 'OK' && Array.isArray(json.data) && json.data.length > 0) {
  //       const dex = json.data[0];
  
  //       setTokenData({
  //         price: `$${dex.price.toFixed(8)}`,
  //         marketCap: `$${Math.round(dex.token?.metrics?.mcap).toLocaleString()}`,
  //         totalSupply: `${(dex.token?.metrics?.totalSupply / 1_000_000).toFixed(2)}M L4`,
  //         holders: `${dex.token?.metrics?.holders}`,
  //         liquidity: `$${Math.round(dex.metrics?.liquidity).toLocaleString()}`,
  //         volume24h: `$${Math.round(dex.periodStats?.['24h']?.volume?.total).toLocaleString()} 24h`
  //       });
  //     }
  
  //   } catch (err) {
  //     console.error('Frontend fetch failed:', err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
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
              <button 
                onClick={() => setShowStakingModal(true)}
                className="lisa-button lisa-button-primary inline-block"
              >
                Stake
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="p-2 flex justify-center items-center">
              {/* <video
                autoPlay
                muted
                loop
                playsInline
                className="rounded border border-[#808080] max-w-full h-auto object-cover"
                style={{ width: '400px', height: '280px' }}
              >
                <source src="/motherboard.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video> */}
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

      {/* Staking Section */}
      {/* <section className="lisa-window">
        <div className="lisa-titlebar">
          <div className="lisa-title">Layer4 — Stake SOL for L4</div>
        </div>
        <div className="lisa-content">
          <div className="flex justify-center">
            <SolanaStaking />
          </div>
        </div>
      </section> */}

      {/* Spaceship Game Section */}
      {/* <section className="lisa-window bg-gradient-to-b from-[#f0f0f0] to-[#e0e0e0] rounded-lg shadow-lg">
        <div className="lisa-titlebar">
          <div className="lisa-title">🚀 Layer4 — Spaceship Adventure</div>
        </div>
        <div className="lisa-content">
          <div className="flex flex-col items-center gap-6">
            <div className="text-center max-w-2xl">
              <h2 className="text-2xl font-bold mb-4 text-[#0000ff]">Enter the Cosmos of Layer4</h2>
              <p className="mb-6 text-sm leading-relaxed">
                Embark on an interstellar journey through the universe of Layer4! Dodge asteroids, 
                collect cosmic energy, and test your reflexes in this thrilling 2048-style spaceship game.
                Experience the future of financial stability among the stars!
              </p>
              
              <div className="lisa-card mb-6 border-[#0000ff]">
                <div className="text-sm font-bold mb-3 flex items-center justify-center gap-2">
                  <span>🎮</span> Game Features
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>Auto-shooting spaceship with laser sound effects</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>Real-time obstacle avoidance mechanics</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>Power-up collection for score multipliers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>Responsive controls (WASD or Arrow Keys)</span>
                  </div>
                </div>
              </div>
              
              <div className="animate-bounce-slow">
                <Link 
                  href="/spaceship-game" 
                  className="lisa-button lisa-button-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-bold"
                >
                  <span className="animate-pulse">🎮</span>
                  Launch Spaceship Game
                  <span className="animate-pulse ml-1">🚀</span>
                </Link>
              </div>
            </div>
            
            <div className="w-full max-w-3xl mt-8">
              <div className="lisa-card p-0 bg-black">
                <div className="aspect-video relative overflow-hidden rounded-md">
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  >
                    <source src="/spaceship-game-demo.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-center pb-4">
                    <p className="text-white text-xs text-center max-w-xs">
                      Watch the spaceship in action! Collect power-ups, dodge obstacles, and explore the Layer4 universe.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

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

      {/* Staking Modal */}
      {showStakingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="lisa-window">
              <div className="lisa-titlebar">
                <div className="lisa-title">Layer4 — Stake SOL for L4</div>
                <button 
                  onClick={() => setShowStakingModal(false)}
                  className="lisa-button lisa-button-close"
                >
                  ✕
                </button>
              </div>
              <div className="lisa-content">
                <div className="flex justify-center">
                  <SolanaStaking 
                    onClose={() => setShowStakingModal(false)}
                    showCloseButton={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
}

