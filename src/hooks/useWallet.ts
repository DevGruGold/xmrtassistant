import { useEffect, useState } from 'react';
import Web3 from 'web3';
import { toast } from 'sonner';

export interface WalletState {
  address: string | null;
  balance: string | null;
  chainId: number | null;
  isConnected: boolean;
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    balance: null,
    chainId: null,
    isConnected: false,
  });

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('Please install MetaMask!');
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const balance = await web3.eth.getBalance(accounts[0]);
      const chainId = await web3.eth.getChainId();

      setWallet({
        address: accounts[0],
        balance: web3.utils.fromWei(balance, 'ether'),
        chainId,
        isConnected: true,
      });

      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
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
          });
          toast.info('Wallet disconnected');
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return { wallet, connectWallet };
};