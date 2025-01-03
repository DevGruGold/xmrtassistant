import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletState } from "@/hooks/useWallet";

interface DashboardProps {
  wallet: WalletState;
}

const Dashboard = ({ wallet }: DashboardProps) => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Wallet Info</CardTitle>
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