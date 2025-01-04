import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletState } from "@/hooks/useWallet";
import WalletSetup from "./WalletSetup";
import { CheckCircle, Wallet2, PlusCircle, ArrowRight } from "lucide-react";

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
    <div className="space-y-6">
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

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-purple-400" />
            How to Mint Your First Asset
          </CardTitle>
          <CardDescription className="text-gray-400">
            Follow these steps to create your digital asset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-purple-400/10 rounded-full p-2">
                <span className="text-purple-400 font-bold">1</span>
              </div>
              <div>
                <h3 className="text-white font-medium">Prepare Your Asset</h3>
                <p className="text-gray-400">Upload your digital content (image, video, or audio file)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-400/10 rounded-full p-2">
                <span className="text-purple-400 font-bold">2</span>
              </div>
              <div>
                <h3 className="text-white font-medium">Set Asset Details</h3>
                <p className="text-gray-400">Add title, description, and other metadata for your asset</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-400/10 rounded-full p-2">
                <span className="text-purple-400 font-bold">3</span>
              </div>
              <div>
                <h3 className="text-white font-medium">Confirm Transaction</h3>
                <p className="text-gray-400">Review gas fees and confirm the minting transaction in your wallet</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-400/10 rounded-full p-2">
                <span className="text-purple-400 font-bold">4</span>
              </div>
              <div>
                <h3 className="text-white font-medium">Wait for Confirmation</h3>
                <p className="text-gray-400">Your asset will appear in your collection once the transaction is confirmed</p>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <button className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all">
                Start Minting
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;