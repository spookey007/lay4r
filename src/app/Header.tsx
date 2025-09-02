import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="flex flex-col sm:flex-row items-center justify-between border-b-2 border-[#808080] pb-4 mb-6 gap-4 px-4 sm:px-6 pt-6 bg-[#fff] w-full" style={{ fontFamily: "'LisaStyle', monospace" }}>
      <div className="flex items-center gap-3">
        <div className="border-2 border-[#808080] bg-[#f0f0f0] rounded-lg p-1">
          <Image src="/logo.jpg" alt="Layer4 Logo" width={40} height={40} className="rounded" />
        </div>
        <span className="text-2xl font-bold font-[Courier_New,monospace] tracking-tight">Layer4</span>
      </div>
      <nav className="flex gap-1 text-base bg-[#f0f0f0] border-2 border-[#808080] rounded">
        <Link 
          href="/" 
          className="flex items-center gap-2 font-semibold px-4 py-2 hover:bg-[#0000ff] hover:text-white transition-colors border-r border-[#808080] last:border-r-0"
        >
          🏠 Home
        </Link>
        <Link 
          href="/whitepaper" 
          className="flex items-center gap-2 px-4 py-2 hover:bg-[#0000ff] hover:text-white transition-colors border-r border-[#808080] last:border-r-0"
        >
          📄 Whitepaper
        </Link>
      </nav>
    </header>
  );
}