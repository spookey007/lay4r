import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Solana RPC endpoint
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Staking wallet address (replace with actual staking wallet)
const STAKING_WALLET_ADDRESS = 'BreJb5H1xUw2QPx3AKBm8NBexHrVsLqpCJ8g5md4F5PF';

export interface StakingTransaction {
  signature: string;
  amount: number;
  success: boolean;
  error?: string;
}

export async function createStakingTransaction(
  fromWallet: PublicKey,
  solAmount: number
): Promise<Transaction> {
  try {
    const toWallet = new PublicKey(STAKING_WALLET_ADDRESS);
    const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromWallet,
        toPubkey: toWallet,
        lamports: lamports,
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromWallet;

    return transaction;
  } catch (error) {
    console.error('Error creating staking transaction:', error);
    throw new Error('Failed to create staking transaction');
  }
}

export async function sendStakingTransaction(
  transaction: Transaction,
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>
): Promise<StakingTransaction> {
  try {
    // Sign and send the transaction using Phantom wallet
    const result = await signAndSendTransaction(transaction);
    
    if (!result.signature) {
      throw new Error('No signature returned from wallet');
    }

    // Confirm the transaction
    const confirmation = await connection.confirmTransaction(result.signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error('Transaction failed');
    }

    return {
      signature: result.signature,
      amount: transaction.instructions[0].data.length,
      success: true
    };
  } catch (error) {
    console.error('Error sending staking transaction:', error);
    return {
      signature: '',
      amount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getWalletBalance(walletAddress: string): Promise<number> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return 0;
  }
}

export async function validateWalletAddress(address: string): Promise<boolean> {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
