"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { setVisible } = useWalletModal();
  const { publicKey, signMessage, connected } = useWallet();
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (connected && publicKey) {
      login();
    } else {
      import("@/lib/api")
        .then(({ apiFetch }) =>
          apiFetch("/auth/me")
            .then((r) => r.json())
            .then((d) => setUser(d.user ?? null))
            .catch(() => {})
        );
    }
  }, [connected, publicKey]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    }

    if (showProfileDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showProfileDropdown]);

  async function login() {
    if (!publicKey || !signMessage) {
      setVisible(true);
      return;
    }

    const walletAddress = publicKey.toBase58();
    const { apiFetch } = await import("@/lib/api");

    try {
      const meRes = await apiFetch("/auth/me");
      const meData = await meRes.json();
      if (meData.user && meData.user.walletAddress === walletAddress) {
        setUser(meData.user);
        return;
      }
    } catch (error) {
      // Proceed with login
    }

    const nonceRes = await apiFetch("/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ walletAddress }),
    });
    const { nonce } = await nonceRes.json();

    const message = `Layer4 login\n${nonce}`;
    const encoded = new TextEncoder().encode(message);
    const signature = await signMessage(encoded, "utf8");
    const signatureBase58 = (await import("bs58")).default.encode(signature);

    const loginRes = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ walletAddress, signature: signatureBase58, nonce }),
    });

    const data = await loginRes.json();
    setUser(data.user ?? null);
  }

  async function logout() {
    const { apiFetch } = await import("@/lib/api");
    await apiFetch("/auth/logout", { method: "POST" });
    setUser(null);
    setShowProfileDropdown(false);
  }

  // ✅ ✅ ✅ FIXED: Add data URL prefix for base64 blobs
  const getAvatarSource = () => {
    if (user?.avatarBlob) {
      // Assume PNG — works for JPEG too in most browsers
      return `${user.avatarBlob}`;
    } else if (user?.avatarUrl) {
      return user.avatarUrl;
    } else {
      return null;
    }
  };

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
          className={`flex items-center gap-2 font-semibold px-4 py-2 hover:bg-[#0000ff] hover:text-white transition-colors border-r border-[#808080] ${pathname === "/" ? "bg-[#0000ff] text-white" : ""}`}
        >
          🏠 Home
        </Link>
        <Link
          href="/whitepaper"
          className={`flex items-center gap-2 px-4 py-2 hover:bg-[#0000ff] hover:text-white transition-colors border-r border-[#808080] ${pathname === "/whitepaper" ? "bg-[#0000ff] text-white" : ""}`}
        >
          📄 Whitepaper
        </Link>
        <Link
          href="/motherboard"
          className={`flex items-center gap-2 px-4 py-2 hover:bg-[#0000ff] hover:text-white transition-colors ${pathname === "/motherboard" ? "bg-[#0000ff] text-white" : ""}`}
        >
          🖥️ Motherboard
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        {connected && publicKey ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 bg-[#f0f0f0] border-2 border-[#808080] rounded px-3 py-2 hover:bg-[#e0e0e0] transition-colors"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {user?.avatarBlob || user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={getAvatarSource()} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="bg-[#0000ff] w-full h-full flex items-center justify-center">
                    {user?.username ? user.username.charAt(0).toUpperCase() : publicKey.toBase58().charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold">
                {user?.username ?? publicKey.toBase58().slice(0, 4) + "…" + publicKey.toBase58().slice(-4)}
              </span>
              <span className="text-xs">▼</span>
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border-2 border-[#808080] rounded shadow-lg z-50">
                <div className="p-2 border-b border-[#808080]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                      {user?.avatarBlob || user?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={getAvatarSource()} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="bg-[#0000ff] w-full h-full flex items-center justify-center">
                          {user?.username ? user.username.charAt(0).toUpperCase() : publicKey.toBase58().charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-semibold">
                      {user?.username ?? "User"}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
                  </div>
                  {user?.role && (
                    <div className="text-xs text-[#0000ff] font-semibold">
                      {user.role}
                    </div>
                  )}
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      router.push("/settings");
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#f0f0f0] rounded"
                  >
                    ⚙️ Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button onClick={login} className="lisa-button lisa-button-primary">Connect Wallet</button>
        )}
      </div>
    </header>
  );
}