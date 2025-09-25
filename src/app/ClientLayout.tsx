"use client";

import Loader from "./Loader";
import Header from "./Header";
import Footer from "./Footer";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { useMemo } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";
import ChatWidget from "./components/ChatWidget";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { ToastProvider } from "@/components/Toast";
import { AudioProvider } from "@/contexts/AudioContext";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const endpoint = "https://api.mainnet-beta.solana.com";
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  return (
    <AudioProvider>
      <Loader>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <ToastProvider>
                <WebSocketProvider>
                  <div className="flex flex-col min-h-screen w-full max-w-full">
                    <Header />
                    <main className="flex-1 flex flex-col w-full px-4 sm:px-6">
                      {children}
                    </main>
                    <Footer />
                  </div>
                  {/* <ChatWidget /> */}
                </WebSocketProvider>
              </ToastProvider>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </Loader>
    </AudioProvider>
  );
}
