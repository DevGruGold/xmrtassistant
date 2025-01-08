import { useState, useEffect } from "react";
import Web3 from "web3";
import { initializeMasterContract } from "@/utils/contractUtils";
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi';
import { mainnet } from 'viem/chains';

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
    const projectId = "c9924a38c86312780b4c55a0c8c70b89";  // Using a public test project ID

    const metadata = {
      name: 'XMRT Master DAO',
      description: 'XMRT Master DAO Web3 Application',
      url: 'https://xmrt.dao',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    };

    const chains = [mainnet];

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
        '--w3m-accent': '#646cff',
        '--w3m-background-color': '#242424'
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

      setWallet({
        isConnected: true,
        address: accounts[0],
        balance: web3.utils.fromWei(balance, "ether"),
        chainId: Number(chainId),
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