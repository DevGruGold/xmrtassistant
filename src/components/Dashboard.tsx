import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletState } from "@/hooks/useWallet";
import WalletSetup from "./WalletSetup";
import { CheckCircle, Wallet2 } from "lucide-react";

interface DashboardProps {
  wallet: WalletState;
  onSetupComplete: (selectedAccount: string) => void;
}

const Dashboard = ({ wallet, onSetupComplete }: DashboardProps) => {
  if (!wallet.isSetupComplete) {
    return <WalletSetup accounts={wallet.availableAccounts} onComplete={onSetupComplete} />;
  }

  const getWalletBrand = () => {
    if (typeof window.ethereum !== 'undefined') {
      if (window.ethereum.isMetaMask) return 'MetaMask';
      if (window.ethereum.isWalletConnect) return 'WalletConnect';
      return 'Unknown Wallet';
    }
    return 'No Wallet Detected';
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Wallet2 className="h-5 w-5 text-purple-400" />
              {getWalletBrand()}
              <CheckCircle className="h-5 w-5 text-green-400 animate-pulse" />
            </CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Connected wallet details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Address</span>
              <span className="text-purple-400 text-sm truncate max-w-[200px]">
                {wallet.address}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Balance</span>
              <span className="text-blue-400">{wallet.balance} ETH</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Network</span>
              <span className="text-green-400">Chain ID: {wallet.chainId}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>
          <CardDescription className="text-gray-400">
            Your latest blockchain activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400 py-4">
            No recent transactions
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Assets</CardTitle>
          <CardDescription className="text-gray-400">
            Your digital assets overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>NFTs</span>
              <span className="text-purple-400">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Tokens</span>
              <span className="text-blue-400">0</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;