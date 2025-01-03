import { useEffect, useState } from 'react';
import Web3 from 'web3';
import { toast } from 'sonner';

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
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      // Check if on mobile
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Deep link to MetaMask
        const dappUrl = window.location.href;
        const metamaskAppDeepLink = `https://metamask.app.link/dapp/${window.location.host}`;
        
        // Attempt to open MetaMask mobile app
        window.location.href = metamaskAppDeepLink;
        
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