"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StakingModal from './StakingModal';
import { StakingConfig, defaultStakingConfig } from '@/schemas/staking';

// === CONFIG ===
const L4_TOKEN_ADDRESS = 'EtpQtF2hZZaEMZTKCp15MmMtwjsXJGz4Z6ADCUQopump';
const STAKING_WALLET_ADDRESS = 'YOUR_SOLANA_STAKING_WALLET_ADDRESS'; // Replace with actual staking wallet
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// === INTERFACES ===
interface StakingInfo {
  stakedAmount: string;
  totalRewards: string;
  pendingRewards: string;
  dailyApr: string;
  apr: number;
  stakingStartDate: string | null;
  stakingEndDate: string | null;
}

interface SolanaStakingProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

const SolanaStaking = ({ onClose, showCloseButton = false }: SolanaStakingProps = {}) => {
  const [config] = useState<StakingConfig>(defaultStakingConfig);
  
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [solAmount, setSolAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [stakingInfo, setStakingInfo] = useState<StakingInfo>({
    stakedAmount: "0",
    totalRewards: "0",
    pendingRewards: "0",
    dailyApr: "0",
    apr: 0,
    stakingStartDate: null,
    stakingEndDate: null
  });
  const [l4Amount, setL4Amount] = useState('0');
  const [l4Price, setL4Price] = useState(0);
  const [isLoadingStakingInfo, setIsLoadingStakingInfo] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'stake' | 'unstake' | 'info'>('stake');
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: null as (() => void) | null
  });
  const [isConfirming, setIsConfirming] = useState(false);

  // Animation variants
  const statItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut" as const
      }
    }
  };

  const loadingVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut" as const
      }
    }
  };

  const walletConnectVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut" as const
      }
    }
  };

  const stakeSectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut" as const
      }
    }
  };

  const statsContainerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut" as const
      }
    }
  };

  useEffect(() => {
    const initializeComponent = async () => {
      setIsInitialLoading(true);
      try {
        await Promise.all([
          checkWalletConnection(),
          fetchL4Price()
        ]);
      } catch (error) {
        console.error('Error initializing component:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    initializeComponent();
    
    if (window.solana) {
      window.solana.on('connect', handleWalletConnect);
      window.solana.on('disconnect', handleWalletDisconnect);
    }

    return () => {
      if (window.solana) {
        window.solana.removeListener('connect', handleWalletConnect);
        window.solana.removeListener('disconnect', handleWalletDisconnect);
      }
    };
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchStakingInfo();
      // Refresh staking info every minute
      const interval = setInterval(fetchStakingInfo, 60000);
      return () => clearInterval(interval);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (solAmount && l4Price > 0) {
      const sol = parseFloat(solAmount);
      const l4 = sol / l4Price;
      setL4Amount(l4.toFixed(2));
    } else {
      setL4Amount('0');
    }
  }, [solAmount, l4Price]);

  // Fetch L4 token price
  const fetchL4Price = async () => {
    try {
      const response = await fetch('https://lite-api.jup.ag/tokens/v2/search?query=EtpQtF2hZZaEMZTKCp15MmMtwjsXJGz4Z6ADCUQopump');
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const token = data[0];
        if (token.price) {
          setL4Price(token.price);
        }
      }
    } catch (error) {
      console.error('Error fetching L4 price:', error);
    }
  };

  // Helper function to format SOL amounts
  const formatSolAmount = (amount: string) => {
    if (!amount) return "0";
    const num = Number(amount);
    if (num < 0.000001) {
      return num.toFixed(9).replace(/\.?0+$/, '');
    }
    return num.toFixed(6).replace(/\.?0+$/, '');
  };

  // Helper function to calculate rewards
  const calculateRewards = (stakedAmount: string, apr: number, days: number) => {
    if (!stakedAmount || !apr || !days) return "0";
    const amount = Number(stakedAmount);
    const dailyRate = apr / 365;
    const rewards = amount * dailyRate * days;
    if (rewards < 0.000001) {
      return rewards.toFixed(9).replace(/\.?0+$/, '');
    }
    return rewards.toFixed(6).replace(/\.?0+$/, '');
  };

  // Helper function to calculate daily rewards
  const calculateDailyRewards = (stakedAmount: string, apr: number) => {
    if (!stakedAmount || !apr) return "0";
    const amount = Number(stakedAmount);
    const dailyRate = apr / 365;
    const rewards = amount * dailyRate;
    if (rewards < 0.000001) {
      return rewards.toFixed(9).replace(/\.?0+$/, '');
    }
    return rewards.toFixed(6).replace(/\.?0+$/, '');
  };

  const fetchStakingInfo = async () => {
    if (!walletAddress) {
      // Set default values when no wallet is connected
      setStakingInfo({
        stakedAmount: "0",
        totalRewards: "0",
        pendingRewards: "0",
        dailyApr: "0",
        apr: 0,
        stakingStartDate: null,
        stakingEndDate: null
      });
      return;
    }

    try {
      setIsLoadingStakingInfo(true);
      const response = await fetch(`${API_URL}/api/staking/info/${walletAddress}`);
      if (!response.ok) {
        // If API fails, set default values instead of showing error
        console.warn('Staking API not available, using default values');
        setStakingInfo({
          stakedAmount: "0",
          totalRewards: "0",
          pendingRewards: "0",
          dailyApr: "0",
          apr: 0,
          stakingStartDate: null,
          stakingEndDate: null
        });
        return;
      }
      const data = await response.json();
      
      setStakingInfo({
        ...data,
        stakedAmount: formatSolAmount(data.stakedAmount),
        totalRewards: formatSolAmount(data.totalRewards),
        pendingRewards: formatSolAmount(data.pendingRewards),
        dailyApr: formatSolAmount(data.dailyApr),
        apr: data.apr || 0
      });
    } catch (error) {
      console.warn('Error fetching staking info, using default values:', error);
      // Set default values instead of showing error
      setStakingInfo({
        stakedAmount: "0",
        totalRewards: "0",
        pendingRewards: "0",
        dailyApr: "0",
        apr: 0,
        stakingStartDate: null,
        stakingEndDate: null
      });
    } finally {
      setIsLoadingStakingInfo(false);
    }
  };

  const checkWalletConnection = async () => {
    if (window.solana && window.solana.isPhantom) {
      try {
        const response = await window.solana.connect();
        if (response.publicKey) {
          setWalletAddress(response.publicKey.toString());
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    }
  };

  const handleWalletConnect = () => {
    if (window.solana) {
      setWalletAddress(window.solana.publicKey?.toString() || '');
      setIsConnected(true);
    }
  };

  const handleWalletDisconnect = () => {
    setWalletAddress('');
    setIsConnected(false);
    setSolAmount("");
    setStakingInfo({
      stakedAmount: "0",
      totalRewards: "0",
      pendingRewards: "0",
      dailyApr: "0",
      apr: 0,
      stakingStartDate: null,
      stakingEndDate: null
    });
  };

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      if (window.solana && window.solana.isPhantom) {
        const response = await window.solana.connect();
        if (response.publicKey) {
          setWalletAddress(response.publicKey.toString());
          setIsConnected(true);
        }
      } else {
        setError('Phantom wallet not found. Please install Phantom wallet.');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const stakeSOL = async () => {
    if (!window.solana || !walletAddress) return;

    try {
      setIsLoading(true);
      setIsConfirming(true);
      setError('');
      setStatus("Processing transaction...");

      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTxHash("mock-transaction-hash-" + Date.now());
      setStatus("Staking successful!");
      setSolAmount("");
      await fetchStakingInfo();
      
      // Wait a moment before closing the modal to show success message
      setTimeout(() => {
        setIsModalOpen(false);
      }, 2000);
    } catch (error: any) {
      console.error("Error staking SOL:", error);
      if (error.message.includes("insufficient funds")) {
        setError("Insufficient SOL balance");
      } else if (error.message.includes("user rejected")) {
        setError("Transaction was rejected by user");
      } else {
        setError("Failed to stake SOL. Please try again.");
      }
      setStatus(null);
      setIsModalOpen(false);
    } finally {
      setIsLoading(false);
      setIsConfirming(false);
    }
  };

  const claimRewards = async () => {
    if (!walletAddress) return;
    
    try {
      setIsLoading(true);
      setError('');
      const daysStaked = stakingInfo.stakingStartDate
        ? Math.floor((new Date().getTime() - new Date(stakingInfo.stakingStartDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      const payload = {
        walletAddress,
        totalRewards: Number(stakingInfo.dailyApr) * daysStaked,
        totalStaked: stakingInfo.stakedAmount
      };

      const response = await fetch(`${API_URL}/api/staking/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStatus(`Successfully claimed ${data.amount} SOL in rewards. Please wait up to 24 hours for the transaction to be confirmed.`);
      await fetchStakingInfo();
    } catch (error) {
      console.error('Error claiming rewards:', error);
      setError('Failed to claim rewards');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="w-full text-center p-0 m-0 bg-transparent">
        <div className="flex items-center justify-between mb-4">
          {/* {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="lisa-button lisa-button-close"
              style={{ minWidth: "auto", padding: "8px" }}
            >
              ✕
            </button>
          )} */}
        </div>

        <AnimatePresence mode="wait">
          {isInitialLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="flex justify-center items-center p-5"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mr-4"
              />
              <span className="text-blue-500 text-sm font-['LisaStyle',monospace] whitespace-nowrap">Loading staking interface...</span>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >

        <AnimatePresence mode="wait">
          {!walletAddress ? (
            <motion.div
              key="wallet-connect"
              className="flex justify-center items-center p-5"
              variants={walletConnectVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <button 
                onClick={handleConnectWallet} 
                className="bg-transparent text-blue-500 border-2 border-blue-500 hover:bg-blue-500 hover:text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-['LisaStyle',monospace] uppercase tracking-wider m-1"
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect Phantom Wallet"}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="stake-section"
              variants={stakeSectionVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.div className="mb-5 text-sm text-blue-500 font-['LisaStyle',monospace]" variants={statItemVariants}>
                Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </motion.div>

              {isWrongNetwork ? (
                <motion.div className="bg-blue-500/20 p-5 rounded-lg mb-5 text-lg text-blue-500 font-medium border-2 border-blue-500 font-['LisaStyle',monospace] text-center" variants={statItemVariants}>
                  <p>Please switch to Solana Mainnet to continue</p>
                </motion.div>
              ) : (
                <>
                  <motion.div 
                    className="mb-4 p-3 bg-black/10 rounded-lg flex flex-col gap-2 min-h-fit"
                    variants={statsContainerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {isLoadingStakingInfo ? (
                      <motion.div 
                        className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-blue-500/20 min-w-[200px] w-fit mx-auto"
                        variants={loadingVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <motion.div
                          className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full flex-shrink-0"
                          animate={{
                            rotate: 360,
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        />
                        <span className="text-blue-500 text-sm font-['LisaStyle',monospace] whitespace-nowrap">Loading...</span>
                      </motion.div>
                    ) : (
                      <>
                        <motion.div className="mb-2 text-blue-500 font-['LisaStyle',monospace] text-xs" variants={statItemVariants}>
                          Total Staked: {stakingInfo.stakedAmount} SOL
                        </motion.div>
                        <motion.div className="mb-2 text-blue-500 font-['LisaStyle',monospace] text-xs" variants={statItemVariants}>
                          L4 Tokens: {l4Amount} L4
                        </motion.div>
                        <motion.div className="mb-2 text-blue-500 font-['LisaStyle',monospace] text-xs" variants={statItemVariants}>
                          Pending Rewards: {stakingInfo.pendingRewards} SOL
                        </motion.div>
                        <motion.div className="mb-2 text-blue-500 font-['LisaStyle',monospace] text-xs" variants={statItemVariants}>
                          Daily APR: {stakingInfo.dailyApr}%
                        </motion.div>
                      </>
                    )}
                  </motion.div>

                  <motion.div className="mb-4 p-4 bg-black/10 rounded-xl text-white text-sm text-center font-['LisaStyle',monospace] leading-relaxed tracking-wider min-h-fit" variants={statItemVariants}>
                    <p>Stake SOL to earn L4 tokens with 12% APR. Lock period: 30 days.</p>
                  </motion.div>

                  <motion.div className="mb-4" variants={statItemVariants}>
                    <input
                      type="number"
                      value={solAmount}
                      onChange={(e) => setSolAmount(e.target.value)}
                      placeholder="Enter SOL amount"
                      className="w-full p-3 text-sm rounded-lg border border-blue-500 mb-3 bg-black/10 text-blue-500 font-['LisaStyle',monospace]"
                    />
                    <div className="text-blue-500 text-sm font-['LisaStyle',monospace] mb-3">
                      L4 Price: ${l4Price.toFixed(6)} | You will receive: {l4Amount} L4
                    </div>
                  </motion.div>

                  <motion.div className="flex flex-col gap-2" variants={statItemVariants}>
                    <button
                      onClick={() => {
                        setModalType('stake');
                        setModalConfig({
                          title: "Stake SOL for L4",
                          message: `Are you sure you want to stake ${solAmount} SOL for ${l4Amount} L4 tokens?`,
                          confirmText: "Yes, Stake",
                          cancelText: "Cancel",
                          onConfirm: stakeSOL
                        });
                        setIsModalOpen(true);
                      }}
                      disabled={(isLoading && !isConfirming) || !solAmount || isLoadingStakingInfo}
                      className="bg-transparent text-blue-500 border-2 border-blue-500 hover:bg-blue-500 hover:text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-['LisaStyle',monospace] uppercase tracking-wider m-1"
                    >
                      {isConfirming ? "Confirming..." : (isLoading ? (status || "Processing...") : "Stake SOL")}
                    </button>
                    <br />
                    <button
                      onClick={claimRewards}
                      disabled={isLoading || isConfirming || isLoadingStakingInfo || stakingInfo.stakedAmount === "0"}
                      className="bg-transparent text-blue-500 border-2 border-blue-500 hover:bg-blue-500 hover:text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-['LisaStyle',monospace] uppercase tracking-wider m-1"
                    >
                      {isLoading || isConfirming ? "Processing..." : "Claim Rewards"}
                    </button>
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {status && <p className="mt-3 italic text-blue-500 font-['LisaStyle',monospace]">{status}</p>}

      {txHash && (
        <div className="mt-3 text-sm break-words text-blue-500 font-['LisaStyle',monospace]">
          <p>
            Transaction:{" "}
            <a
              href={`https://solscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 no-underline"
            >
              {txHash}
            </a>
          </p>
        </div>
      )}

      <StakingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        onConfirm={() => {
          if (modalConfig.onConfirm) {
            modalConfig.onConfirm();
          }
          setIsModalOpen(false);
        }}
        isLoading={isLoading || isConfirming}
        type={modalType}
      />
    </>
  );
};

export default SolanaStaking;
