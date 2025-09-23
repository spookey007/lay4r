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
import { Toaster } from "react-hot-toast";
import { WebSocketProvider } from "@/contexts/WebSocketContext";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const endpoint = "https://api.mainnet-beta.solana.com";
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  return (
    <Loader>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <WebSocketProvider>
              <div className="flex flex-col min-h-screen max-w-6xl mx-auto">
                <Header />
                <main className="flex-1 flex flex-col w-full px-4 sm:px-6">
                  {children}
                </main>
                <Footer />
              </div>
              {/* <ChatWidget /> */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#333',
                    color: '#fff',
                  },
                }}
              />
            </WebSocketProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </Loader>
  );
}
