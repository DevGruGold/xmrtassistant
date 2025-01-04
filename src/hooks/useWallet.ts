import { useEffect, useState } from 'react';
import Web3 from 'web3';
import { toast } from 'sonner';
import { configureChains, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { createWeb3Modal } from '@web3modal/wagmi';
import { WagmiConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';

// Initialize WalletConnect
const projectId = '9efb5d5040e71c51224a123c9f2b1e07';

const metadata = {
  name: 'AssetVerse Nexus',
  description: 'Your Gateway to Digital Asset Management',
  url: window.location.host,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const { chains, publicClient } = configureChains(
  [mainnet],
  [publicProvider()]
);

const config = createConfig({
  autoConnect: true,
  publicClient,
});

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  chains,
  themeMode: 'dark',
});

export interface WalletState {
  address: string | null;
  balance: string | null;
  chainId: number | null;
  isConnected: boolean;
  isSetupComplete: boolean;
  availableAccounts: string[];
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    balance: null,
    chainId: null,
    isConnected: false,
    isSetupComplete: false,
    availableAccounts: [],
  });

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      // Check if on mobile
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Deep link to MetaMask NFT portfolio using WalletConnect v2
        const wcUri = `https://metamask.app.link/dapp/${window.location.host}/nft?wc-project-id=${projectId}&wc-version=2`;
        window.location.href = wcUri;
        toast.info('Opening MetaMask mobile app...');
        return;
      } else {
        toast.error('Please install MetaMask!');
        return;
      }
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3 = new Web3(window.ethereum);
      const balance = await web3.eth.getBalance(accounts[0]);
      const chainIdBigInt = await web3.eth.getChainId();
      const chainId = Number(chainIdBigInt);

      setWallet({
        address: accounts[0],
        balance: web3.utils.fromWei(balance, 'ether'),
        chainId,
        isConnected: true,
        isSetupComplete: false,
        availableAccounts: accounts,
      });

      toast.success('Wallet connected successfully!');
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