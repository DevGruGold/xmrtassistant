import { useState, useEffect } from 'react';
import Web3 from 'web3';
import { toast } from 'sonner';
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi';
import { mainnet } from 'viem/chains';
import { initializeMasterContract } from '../utils/contractUtils';

// Initialize Web3Modal with configuration
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('VITE_WALLETCONNECT_PROJECT_ID environment variable is not set');
}

const metadata = {
  name: 'XMRT Master DAO',
  description: 'Decentralized Asset Management & Governance',
  url: window.location.host,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const chains = [mainnet];

// Create wagmi config
const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata
});

// Create Web3Modal instance with support for multiple wallets
const web3Modal = createWeb3Modal({
  wagmiConfig,
  projectId,
  chains,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#7C3AED',
    '--w3m-background': '#1F2937',
    '--w3m-font-family': 'Roboto, sans-serif',
  },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Coinbase
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
    '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f', // Trust Wallet
  ],
  includeWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Coinbase
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
    '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f', // Trust Wallet
  ],
});

export interface WalletState {
  address: string | null;
  balance: string | null;
  chainId: number | null;
  isConnected: boolean;
  isSetupComplete: boolean;
  availableAccounts: string[];
  contract: any | null;
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    balance: null,
    chainId: null,
    isConnected: false,
    isSetupComplete: false,
    availableAccounts: [],
    contract: null,
  });

  const connectWallet = async () => {
    try {
      await web3Modal.open();
      
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3 = new Web3(window.ethereum);
        const balance = await web3.eth.getBalance(accounts[0]);
        const chainIdBigInt = await web3.eth.getChainId();
        const chainId = Number(chainIdBigInt);

        // Initialize master contract after successful connection
        const contract = await initializeMasterContract(web3);

        setWallet({
          address: accounts[0],
          balance: web3.utils.fromWei(balance, 'ether'),
          chainId,
          isConnected: true,
          isSetupComplete: false,
          availableAccounts: accounts,
          contract,
        });

        toast.success('Wallet connected successfully!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const completeSetup = (selectedAccount: string) => {
    setWallet(prev => ({
      ...prev,
      address: selectedAccount,
      isSetupComplete: true,
    }));
    toast.success('Wallet setup completed!');
  };

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          setWallet({
            address: null,
            balance: null,
            chainId: null,
            isConnected: false,
            isSetupComplete: false,
            availableAccounts: [],
            contract: null,
          });
          toast.info('Wallet disconnected');
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return { wallet, connectWallet, completeSetup };
};
