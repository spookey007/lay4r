declare global {
  interface Window {
    solana?: {
      connect(): Promise<{ publicKey: { toString(): string } }>;
      disconnect(): Promise<void>;
      signMessage(message: Uint8Array, encoding?: string): Promise<{ signature: Uint8Array }>;
      signAndSendTransaction(transaction: any): Promise<{ signature: string }>;
      on(event: string, callback: () => void): void;
      removeListener(event: string, callback: () => void): void;
      isPhantom?: boolean;
      isConnected?: boolean;
      publicKey?: { toString(): string };
    };
  }
}

export {};
