declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect(): Promise<{ publicKey: { toString(): string } }>;
      disconnect(): Promise<void>;
      signAndSendTransaction(transaction: any): Promise<{ signature: string }>;
      on(event: string, callback: () => void): void;
      removeListener(event: string, callback: () => void): void;
      publicKey?: { toString(): string };
    };
    solanaWeb3?: {
      Connection: any;
      PublicKey: any;
      SystemProgram: any;
      Transaction: any;
      LAMPORTS_PER_SOL: number;
    };
  }
}

export {};
