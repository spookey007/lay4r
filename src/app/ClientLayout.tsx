"use client";

import Loader from "./Loader";
import Header from "./Header";
import Footer from "./Footer";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Loader>
      <div className="flex flex-col min-h-screen max-w-6xl mx-auto">
        <Header />
        <main className="flex-1 flex flex-col w-full px-4 sm:px-6">
          {children}
        </main>
        <Footer />
      </div>
    </Loader>
  );
}