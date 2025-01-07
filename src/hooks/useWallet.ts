import { useState, useEffect } from "react";
import Web3 from "web3";
import { initializeMasterContract } from "@/utils/contractUtils";
import { createWeb3Modal } from '@web3modal/wagmi/react';

export interface WalletState {
  isConnected: boolean;
  address: string;
  balance: string;
  chainId: number;
  availableAccounts: string[];
  isSetupComplete: boolean;
}

const defaultWalletState: WalletState = {
  isConnected: false,
  address: "",
  balance: "0",
  chainId: 1,
  availableAccounts: [],
  isSetupComplete: false,
};

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>(defaultWalletState);

  useEffect(() => {
    createWeb3Modal({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
      themeMode: "dark",
      themeVariables: {
        "--w3m-accent": "#646cff",
        "--w3m-background": "#242424",
      },
    });
  }, []);

  const connectWallet = async () => {
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      const balance = await web3.eth.getBalance(accounts[0]);
      const chainId = await web3.eth.getChainId();
      const contract = await initializeMasterContract(web3);

      setWallet({
        isConnected: true,
        address: accounts[0],
        balance: web3.utils.fromWei(balance, "ether"),
        chainId: Number(chainId), // Convert bigint to number
        availableAccounts: accounts,
        isSetupComplete: true,
      });
    } catch (error) {
      console.error("Error connecting wallet:", error);
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
  };
};