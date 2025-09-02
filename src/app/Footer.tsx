export default function Footer() {
  return (
    <footer className="border-t-2 border-[#808080] pt-6 text-center text-sm bg-[#f0f0f0] px-4 sm:px-6 pb-6 mt-auto w-full" style={{ fontFamily: "'LisaStyle', monospace" }}>
      {/* <div className="flex flex-wrap justify-center gap-6 mb-4 bg-[#fff] border-2 border-[#808080] rounded py-3 px-2">
        <Link href="/about" className="hover:underline hover:text-[#0000ff] transition-colors px-2 py-1 hover:bg-[#e0e0e0] rounded">About</Link>
        <Link href="/terms" className="hover:underline hover:text-[#0000ff] transition-colors px-2 py-1 hover:bg-[#e0e0e0] rounded">Terms</Link>
        <Link href="/privacy" className="hover:underline hover:text-[#0000ff] transition-colors px-2 py-1 hover:bg-[#e0e0e0] rounded">Privacy</Link>
        <Link href="/contact" className="hover:underline hover:text-[#0000ff] transition-colors px-2 py-1 hover:bg-[#e0e0e0] rounded">Contact</Link>
      </div> */}
      <div className="mb-3 py-2 px-3 bg-[#fff] border-2 border-[#808080] rounded">© 2025 Layer4. All rights reserved. Built with love for the future.</div>
      {/* <div className="flex justify-center gap-4 text-lg">
        <span className="hover:text-[#0000ff] cursor-pointer transition-colors border-2 border-[#808080] rounded-full w-8 h-8 flex items-center justify-center bg-[#fff] hover:bg-[#e0e0e0]">🔗</span>
        <span className="hover:text-[#0000ff] cursor-pointer transition-colors border-2 border-[#808080] rounded-full w-8 h-8 flex items-center justify-center bg-[#fff] hover:bg-[#e0e0e0]">📧</span>
        <span className="hover:text-[#0000ff] cursor-pointer transition-colors border-2 border-[#808080] rounded-full w-8 h-8 flex items-center justify-center bg-[#fff] hover:bg-[#e0e0e0]">📱</span>
      </div> */}
    </footer>
  );
}