// Disabled hook - Web3 dependencies not available
import { useState } from 'react';

export interface WalletState {
  isConnected: boolean;
  address: string;
  balance: string;
  chainId: number;
  availableAccounts: string[];
  isSetupComplete: boolean;
  xmrtBalance: string;
  xmrtStakeInfo: {
    amount: string;
    timestamp: number;
    canUnstakeWithoutPenalty: boolean;
  };
}

export function useWallet() {
  const [wallet] = useState<WalletState>({
    isConnected: false,
    address: '',
    balance: '0',
    chainId: 1,
    availableAccounts: [],
    isSetupComplete: false,
    xmrtBalance: '0',
    xmrtStakeInfo: {
      amount: '0',
      timestamp: 0,
      canUnstakeWithoutPenalty: false
    }
  });

  const connectWallet = async (): Promise<boolean> => {
    console.log('Wallet connection disabled - Web3 dependencies not available');
    return false;
  };

  const disconnectWallet = () => {
    console.log('Wallet disconnection disabled - Web3 dependencies not available');
  };

  const refreshWalletData = async () => {
    console.log('Wallet refresh disabled - Web3 dependencies not available');
  };

  const switchNetwork = async (chainId: number): Promise<boolean> => {
    console.log('Network switching disabled - Web3 dependencies not available');
    return false;
  };

  const completeSetup = () => {
    console.log('Setup completion disabled - Web3 dependencies not available');
  };

  const refreshXMRTData = async () => {
    console.log('XMRT data refresh disabled - Web3 dependencies not available');
  };

  return {
    wallet,
    connectWallet,
    disconnectWallet,
    refreshWalletData,
    switchNetwork,
    completeSetup,
    refreshXMRTData
  };
}