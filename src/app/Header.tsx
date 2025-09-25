"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useLisaSounds } from "@/lib/lisaSounds";
import { animations, createHoverAnimation, createTapAnimation } from "@/lib/animations";
import SoundSettings from "@/components/SoundSettings";
import { useAudio } from "@/contexts/AudioContext";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { setVisible } = useWalletModal();
  const { publicKey, signMessage, connected } = useWallet();
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { playMenuClick, playButtonClick, playLinkClick, playHoverSound, setEnabled } = useLisaSounds();
  const { audioEnabled, toggleAudio } = useAudio();

  useEffect(() => {
    console.log("Header useEffect - connected:", connected, "publicKey:", publicKey?.toString());
    if (connected && publicKey) {
      login();
    } else {
      // Use auth service instead of direct API call
      import("@/lib/authService")
        .then(({ authService }) =>
          authService.fetchUser()
            .then((user) => {
              console.log("Header user data from authService:", user);
              setUser(user);
            })
            .catch(() => {})
        );
    }
  }, [connected, publicKey]);

  // Sync sound system with shared audio state
  useEffect(() => {
    setEnabled(audioEnabled);
  }, [audioEnabled, setEnabled]);

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
      const { authService } = await import("@/lib/authService");
      const user = await authService.fetchUser();
      // console.log("Login user data:", user);
      if (user && user.walletAddress === walletAddress) {
        setUser(user);
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
    const signature = await signMessage(encoded);
    const signatureBase58 = (await import("bs58")).default.encode(signature);

    const loginRes = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ walletAddress, signature: signatureBase58, nonce }),
    });

    const data = await loginRes.json();
    console.log("Login response data:", data);
    console.log("User data received:", {
      username: data.user?.username,
      displayName: data.user?.displayName,
      walletAddress: data.user?.walletAddress
    });
    
    // Store token in localStorage for WebSocket access
    try {
      if (data.token) {
        console.log("🔑 Token received from server:", data.token.substring(0, 20) + "...");
        console.log("🔍 Token type:", typeof data.token);
        console.log("🔍 Token length:", data.token.length);
        
        // Test localStorage availability first
        const testKey = 'l4_test_' + Date.now();
        try {
          localStorage.setItem(testKey, 'test');
          localStorage.removeItem(testKey);
          console.log("✅ localStorage is available and working");
        } catch (testError) {
          console.error("❌ localStorage is not available:", testError);
          throw new Error("localStorage not available");
        }
        
        localStorage.setItem('l4_session', data.token);
        
        // Verify the token was stored correctly
        const storedToken = localStorage.getItem('l4_session');
        if (storedToken === data.token) {
          console.log("✅ Token successfully stored and verified in localStorage");
          console.log("🔍 Stored token length:", storedToken?.length);
        } else {
          console.error("❌ Token storage verification failed");
          console.log("Expected:", data.token.substring(0, 20) + "...");
          console.log("Stored:", storedToken?.substring(0, 20) + "...");
          console.log("Expected length:", data.token.length);
          console.log("Stored length:", storedToken?.length);
        }
      } else {
        console.warn("⚠️ No token received from server in login response");
        console.log("Available keys in response:", Object.keys(data));
        console.log("Full response data:", data);
      }
    } catch (error) {
      console.error("❌ Failed to store token in localStorage:", error);
      // Try to store in sessionStorage as fallback
      try {
        if (data.token) {
          sessionStorage.setItem('l4_session', data.token);
          console.log("✅ Token stored in sessionStorage as fallback");
          
          // Verify sessionStorage
          const sessionToken = sessionStorage.getItem('l4_session');
          if (sessionToken === data.token) {
            console.log("✅ Token verified in sessionStorage");
          } else {
            console.error("❌ SessionStorage verification failed");
          }
        }
      } catch (sessionError) {
        console.error("❌ Failed to store token in sessionStorage:", sessionError);
      }
    }
    
    setUser(data.user ?? null);
    
    // Force refresh authService with new user data
    if (data.user) {
      const { authService } = await import("@/lib/authService");
      authService.setUser(data.user);
    }
  }

  async function logout() {
    const { apiFetch } = await import("@/lib/api");
    await apiFetch("/auth/logout", { method: "POST" });
    
    // Clear token from all storage locations
    try {
      localStorage.removeItem('l4_session');
      console.log("✅ Token cleared from localStorage");
    } catch (error) {
      console.warn("⚠️ Failed to clear localStorage:", error);
    }
    
    try {
      sessionStorage.removeItem('l4_session');
      console.log("✅ Token cleared from sessionStorage");
    } catch (error) {
      console.warn("⚠️ Failed to clear sessionStorage:", error);
    }
    
    // Clear auth service cache
    const { authService } = await import("@/lib/authService");
    authService.clearUser();
    
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

  const handleAudioToggle = () => {
    toggleAudio();
    // Play a sound to indicate the toggle (only if not muting)
    if (audioEnabled) {
      playButtonClick();
    }
  };

  return (
    <motion.header 
      className="flex flex-col sm:flex-row items-center justify-between border-b-2 border-[#808080] pb-4 mb-6 gap-4 px-4 sm:px-6 pt-6 bg-[#fff] w-full" 
      style={{ fontFamily: "'LisaStyle', monospace" }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
    >
      <div className="flex items-center gap-3">
        <div className="border-2 border-[#808080] bg-[#f0f0f0] rounded-lg p-1">
          <Image src="/logo.jpg" alt="Layer4 Logo" width={40} height={40} className="rounded" />
        </div>
        <span className="text-2xl font-bold font-[Courier_New,monospace] tracking-tight">Layer4</span>
      </div>
      <nav className="flex gap-1 text-base bg-[#f0f0f0] border-2 border-[#808080] rounded">
        <motion.div
           whileHover={{ 
            scale: 1.08, 
            y: -4,
            transition: { 
              type: "tween",
              ease: "easeOut",   // Fast in
              duration: 0.12
            }
          }}
          whileTap={{ 
            scale: 0.95, 
            y: 2,
            transition: { 
              type: "tween", 
              ease: "easeOut", 
              duration: 0.08 
            }
          }}
          // 👇 CRITICAL: Add exit transition for instant snap-back
          transition={{ 
            type: "tween",
            ease: "easeIn",    // Fast out — snaps back instantly
            duration: 0.15
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          // Keep your initial entrance spring if you like — it’s separate
          exit={{ opacity: 0, y: 20 }}
        >
          <Link
            href="/"
            onClick={() => playLinkClick()}
            onMouseEnter={() => playHoverSound()}
            className={`flex items-center gap-2 font-semibold px-4 py-2 hover:bg-[#0000ff] hover:text-white transition-colors border-r border-[#808080] ${pathname === "/" ? "bg-[#0000ff] text-white" : ""}`}
          >
            🏠 Home
          </Link>
        </motion.div>
        <motion.div
           whileHover={{ 
            scale: 1.08, 
            y: -4,
            transition: { 
              type: "tween",
              ease: "easeOut",   // Fast in
              duration: 0.12
            }
          }}
          whileTap={{ 
            scale: 0.95, 
            y: 2,
            transition: { 
              type: "tween", 
              ease: "easeOut", 
              duration: 0.08 
            }
          }}
          // 👇 CRITICAL: Add exit transition for instant snap-back
          transition={{ 
            type: "tween",
            ease: "easeIn",    // Fast out — snaps back instantly
            duration: 0.15
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          // Keep your initial entrance spring if you like — it’s separate
          exit={{ opacity: 0, y: 20 }}
        >
          <Link
            href="/whitepaper"
            onClick={() => playLinkClick()}
            onMouseEnter={() => playHoverSound()}
            className={`flex items-center gap-2 px-4 py-2 hover:bg-[#0000ff] hover:text-white transition-colors border-r border-[#808080] ${pathname === "/whitepaper" ? "bg-[#0000ff] text-white" : ""}`}
          >
            📄 Whitepaper
          </Link>
        </motion.div>
        <motion.div
           whileHover={{ 
            scale: 1.08, 
            y: -4,
            transition: { 
              type: "tween",
              ease: "easeOut",   // Fast in
              duration: 0.12
            }
          }}
          whileTap={{ 
            scale: 0.95, 
            y: 2,
            transition: { 
              type: "tween", 
              ease: "easeOut", 
              duration: 0.08 
            }
          }}
          // 👇 CRITICAL: Add exit transition for instant snap-back
          transition={{ 
            type: "tween",
            ease: "easeIn",    // Fast out — snaps back instantly
            duration: 0.15
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          // Keep your initial entrance spring if you like — it’s separate
          exit={{ opacity: 0, y: 20 }}
        >
          <Link
            href="/motherboard"
            onClick={() => playLinkClick()}
            onMouseEnter={() => playHoverSound()}
            className={`flex items-center gap-2 px-4 py-2 hover:bg-[#0000ff] hover:text-white transition-colors border-r border-[#808080] ${pathname === "/motherboard" ? "bg-[#0000ff] text-white" : ""}`}
          >
            🖥️ Motherboard
          </Link>
        </motion.div>
        {(user?.isAdmin || user?.role === 0) && (
          <motion.div
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href="/dashboard"
              onClick={() => playLinkClick()}
              onMouseEnter={() => playHoverSound()}
              className={`flex items-center gap-2 px-4 py-2 hover:bg-[#0000ff] hover:text-white transition-colors ${pathname === "/dashboard" ? "bg-[#0000ff] text-white" : ""}`}
            >
              📊 Dashboard
            </Link>
          </motion.div>
        )}
      </nav>
      <div className="flex items-center gap-2">
        {/* Simple Mute Icon */}
        <motion.button
          onClick={handleAudioToggle}
          onMouseEnter={() => audioEnabled && playHoverSound()}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-[#808080] bg-[#f0f0f0] hover:bg-[#e0e0e0] transition-colors"
          title={audioEnabled ? "Mute sounds" : "Unmute sounds"}
        >
          <motion.span
            className="text-2xl"
            animate={{ 
              scale: !audioEnabled ? [1, 1.2, 1] : [1, 1.1, 1],
              rotate: !audioEnabled ? [0, 5, -5, 0] : [0, 2, -2, 0]
            }}
            transition={{ 
              duration: !audioEnabled ? 2 : 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {audioEnabled ? '🔊' : '🔇'}
          </motion.span>
        </motion.button>
        
        {connected && publicKey ? (
          <div className="relative" ref={dropdownRef}>
            <motion.button
              onClick={() => {
                playMenuClick();
                setShowProfileDropdown(!showProfileDropdown);
              }}
              onMouseEnter={() => playHoverSound()}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
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
                {user?.displayName ?? user?.username ?? publicKey.toBase58().slice(0, 4) + "…" + publicKey.toBase58().slice(-4)}
              </span>
              <span className="text-xs">▼</span>
            </motion.button>

            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div 
                  className="absolute right-0 top-full mt-1 w-48 bg-white border-2 border-[#808080] rounded shadow-lg z-50"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 500, damping: 50 }}
                >
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
                      {user?.displayName ?? user?.username ?? "User"}
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
                  {(user?.isAdmin || user?.role === 0) && (
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        router.push("/dashboard");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#f0f0f0] rounded"
                    >
                      📊 Dashboard
                    </button>
                  )}
                  <button
                    onClick={() => {
                      playMenuClick();
                      setShowProfileDropdown(false);
                      router.push("/settings");
                    }}
                    onMouseEnter={() => playHoverSound()}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#f0f0f0] rounded"
                  >
                    ⚙️ Settings
                  </button>
                  {/* <button
                    onClick={() => {
                      playMenuClick();
                      setShowSoundSettings(!showSoundSettings);
                    }}
                    onMouseEnter={() => playHoverSound()}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#f0f0f0] rounded"
                  >
                    🔊 Sound Settings
                  </button> */}
                </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <motion.button
            onClick={() => {
              playButtonClick();
              login();
            }}
            onMouseEnter={() => playHoverSound()}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="lisa-button lisa-button-primary"
          >
            Connect Wallet
          </motion.button>
        )}
      </div>

      {/* Sound Settings Modal */}
      {showSoundSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-md shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b-2 border-black bg-blue-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-black font-mono">SOUND SETTINGS</h3>
                <button 
                  onClick={() => {
                    playMenuClick();
                    setShowSoundSettings(false);
                  }}
                  className="text-black hover:text-red-600 p-1 border border-black bg-white hover:bg-red-200 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <SoundSettings />
            </div>
          </div>
        </div>
      )}
    </motion.header>
  );
}