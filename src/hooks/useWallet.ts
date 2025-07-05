import { useState, useEffect } from "react";
import Web3 from "web3";
import { initializeMasterContract, getXMRTBalance, getXMRTStakeInfo } from "@/utils/contractUtils";
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi';
import { mainnet, sepolia } from 'viem/chains';

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

const defaultWalletState: WalletState = {
  isConnected: false,
  address: "",
  balance: "0",
  chainId: 1,
  availableAccounts: [],
  isSetupComplete: false,
  xmrtBalance: "0",
  xmrtStakeInfo: {
    amount: "0",
    timestamp: 0,
    canUnstakeWithoutPenalty: true
  }
};

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>(defaultWalletState);

  useEffect(() => {
    // Updated project ID for WalletConnect
    const projectId = "2aca272d18deb10ff748260da5f78bfd";

    const metadata = {
      name: 'XMRT Master DAO',
      description: 'XMRT Master DAO Web3 Application',
      url: 'https://xmrt.dao',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    };

    const chains = [mainnet, sepolia];

    const wagmiConfig = defaultWagmiConfig({
      chains,
      projectId,
      metadata
    });

    createWeb3Modal({
      wagmiConfig,
      projectId,
      chains,
      themeMode: "dark",
      themeVariables: {
        '--w3m-accent': '#646cff'
      }
    });
  }, []);

  const connectWallet = async () => {
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      const balance = await web3.eth.getBalance(accounts[0]);
      const chainId = await web3.eth.getChainId();
      const contract = await initializeMasterContract(web3);

      // Get XMRT balance and staking info
      const xmrtBalance = await getXMRTBalance(web3, accounts[0], Number(chainId));
      const xmrtStakeInfo = await getXMRTStakeInfo(web3, accounts[0], Number(chainId));

      setWallet({
        isConnected: true,
        address: accounts[0],
        balance: web3.utils.fromWei(balance, "ether"),
        chainId: Number(chainId),
        availableAccounts: accounts,
        isSetupComplete: true,
        xmrtBalance,
        xmrtStakeInfo,
      });
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const refreshXMRTData = async () => {
    if (!wallet.isConnected || !window.ethereum) return;
    
    try {
      const web3 = new Web3(window.ethereum);
      const xmrtBalance = await getXMRTBalance(web3, wallet.address, wallet.chainId);
      const xmrtStakeInfo = await getXMRTStakeInfo(web3, wallet.address, wallet.chainId);
      
      setWallet(prev => ({
        ...prev,
        xmrtBalance,
        xmrtStakeInfo
      }));
    } catch (error) {
      console.error("Error refreshing XMRT data:", error);
    }
  };

  const completeSetup = (selectedAccount: string) => {
    setWallet((prev) => ({
      ...prev,
      address: selectedAccount,
      isSetupComplete: true,
    }));
  };

  return {
    wallet,
    connectWallet,
    completeSetup,
    refreshXMRTData,
  };
};