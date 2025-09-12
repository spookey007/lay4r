// Staking Schema for Layer4 SOL to L4 Token Staking

export interface StakingTransaction {
  id: string;
  walletAddress: string;
  solAmount: number;
  l4Amount: number;
  l4Price: number;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Date;
  confirmedAt?: Date;
  blockNumber?: number;
}

export interface StakingInfo {
  walletAddress: string;
  stakedAmount: string;
  totalRewards: string;
  pendingRewards: string;
  dailyApr: string;
  apr: number;
  stakingStartDate: string | null;
  stakingEndDate: string | null;
  totalStakedTransactions: number;
  lastStakeDate: string | null;
  isActive: boolean;
}

export interface StakingReward {
  id: string;
  walletAddress: string;
  rewardAmount: string;
  claimTxHash?: string;
  claimedAt?: Date;
  createdAt: Date;
  daysStaked: number;
  apr: number;
}

export interface StakingConfig {
  minStakeAmount: number; // Minimum SOL amount to stake
  maxStakeAmount: number; // Maximum SOL amount per transaction
  lockPeriodDays: number; // Lock period in days (180)
  dailyApr: number; // Daily APR percentage
  annualApr: number; // Annual APR percentage
  stakingWalletAddress: string; // SOL wallet address for staking
  l4TokenAddress: string; // L4 token mint address
  apiEndpoint: string; // Backend API endpoint
}

export interface StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  isLoading?: boolean;
  type: 'stake' | 'unstake' | 'info';
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface StakingTheme {
  colors: ThemeColors;
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Default Layer4 theme configuration
export const defaultStakingTheme: StakingTheme = {
  colors: {
    primary: '#0000ff',
    secondary: '#0066ff',
    accent: '#808080',
    background: 'linear-gradient(135deg, #0c141f 0%, #1a1a2e 100%)',
    surface: 'rgba(0, 0, 0, 0.3)',
    text: '#ffffff',
    textSecondary: '#cccccc',
    border: '#0000ff',
    success: '#00ff00',
    warning: '#ffff00',
    error: '#ff4444',
    info: '#0000ff',
  },
  fonts: {
    primary: "'Courier New', monospace",
    secondary: "'LisaStyle', monospace",
    mono: "'Courier New', monospace",
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  shadows: {
    sm: '0 0 10px rgba(0, 0, 255, 0.3)',
    md: '0 0 20px rgba(0, 0, 255, 0.4)',
    lg: '0 0 30px rgba(0, 0, 255, 0.5)',
    xl: '0 0 40px rgba(0, 0, 255, 0.6)',
  },
};

// Default staking configuration
export const defaultStakingConfig: StakingConfig = {
  minStakeAmount: 0.001, // 0.001 SOL minimum
  maxStakeAmount: 1000, // 1000 SOL maximum
  lockPeriodDays: 180, // 180 days lock period
  dailyApr: 0.1, // 0.1% daily APR
  annualApr: 36.5, // 36.5% annual APR
  stakingWalletAddress: 'YOUR_SOLANA_STAKING_WALLET_ADDRESS',
  l4TokenAddress: 'EtpQtF2hZZaEMZTKCp15MmMtwjsXJGz4Z6ADCUQopump',
  apiEndpoint: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
};
