import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 py-4" style={{ fontFamily: "'LisaStyle', monospace" }}>
      {/* Hero Section */}
      <section className="modern-vintage-card">
        <div className="window-header">
          <div className="window-title">Welcome</div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 font-[Courier_New,monospace]">Welcome to Layer4</h1>
            <h2 className="text-lg md:text-xl mb-4 font-semibold text-[#0000ff]">Revolutionary Layer 4 Tek Protocol</h2>
            <p className="mb-5 max-w-xl text-base leading-relaxed">Built on &quot;Layer 4 Tek&quot; &#8211; a revolutionary protocol that transcends traditional blockchain layers. L4 is designed for one purpose: unbreakable stability. No selling allowed. No DEXs to tempt the weak. This is the future of financial stability, crafted by retards for retards.</p>
            <div className="text-center">
              <Link href="https://phantom.com/tokens/solana/EtpQtF2hZZaEMZTKCp15MmMtwjsXJGz4Z6ADCUQopump" target="_blank" rel="noopener noreferrer" className="button-lisa button-lisa-primary inline-block">
                Get Started
              </Link>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center min-w-0">
<div className=" p-2 flex justify-center items-center">
  <Image src="/motherboard.jpg" alt="Layer4 Motherboard" width={400} height={280} className="rounded border border-[#808080] max-w-full h-auto object-cover" />
</div>
            <div className="mt-3 text-center">
              <p className="text-sm font-mono text-[#808080] italic">&quot;In a world of chaos, Layer4 offers the ultimate commitment to holding.&quot;</p>
            </div>
          </div>
        </div>
      </section>

      {/* Token Stats Section */}
      <section className="modern-vintage-card">
        <div className="window-header">
          <div className="window-title">L4 Token Stats</div>
        </div>
        <div className="grid-container">
          <div className="border-2 border-[#808080] rounded-lg p-4 bg-[#f8f8f8] flex flex-col items-center hover:shadow-lg transition-shadow">
            <span className="text-2xl mb-2">💰</span>
            <h4 className="font-semibold mb-1 text-sm">Current Price</h4>
            <p className="text-base font-bold text-[#0000ff]">$0.00006489</p>
          </div>
          <div className="border-2 border-[#808080] rounded-lg p-4 bg-[#f8f8f8] flex flex-col items-center hover:shadow-lg transition-shadow">
            <span className="text-2xl mb-2">📊</span>
            <h4 className="font-semibold mb-1 text-sm">Market Cap</h4>
            <p className="text-base font-bold text-[#0000ff]">$64K</p>
          </div>
          <div className="border-2 border-[#808080] rounded-lg p-4 bg-[#f8f8f8] flex flex-col items-center hover:shadow-lg transition-shadow">
            <span className="text-2xl mb-2">🔢</span>
            <h4 className="font-semibold mb-1 text-sm">Total Supply</h4>
            <p className="text-base font-bold text-[#0000ff]">985.14M L4</p>
          </div>
          <div className="border-2 border-[#808080] rounded-lg p-4 bg-[#f8f8f8] flex flex-col items-center hover:shadow-lg transition-shadow">
            <span className="text-2xl mb-2">👥</span>
            <h4 className="font-semibold mb-1 text-sm">Holders</h4>
            <p className="text-base font-bold text-[#0000ff]">290</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="modern-vintage-card">
        <div className="window-header">
          <div className="window-title">Why Layer4?</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-2 border-[#808080] rounded p-4 bg-[#f8f8f8]">
            <h3 className="font-bold text-lg mb-2">Unbreakable Stability</h3>
            <p>Built on Layer 4 Tek, our revolutionary protocol transcends traditional blockchain limitations for ultimate stability.</p>
          </div>
          <div className="border-2 border-[#808080] rounded p-4 bg-[#f8f8f8]">
            <h3 className="font-bold text-lg mb-2">No Selling Allowed</h3>
            <p>Our unique protocol design ensures that once you buy, you can only hold, creating unbreakable commitment to the future.</p>
          </div>
          <div className="border-2 border-[#808080] rounded p-4 bg-[#f8f8f8]">
            <h3 className="font-bold text-lg mb-2">Community Driven</h3>
            <p>Layer4 is crafted by retards for retards - a community of like-minded individuals committed to financial stability.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
