import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet2 } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import Dashboard from "@/components/Dashboard";
import { AiChat } from "@/components/AiChat";
import { Footer } from "@/components/Footer";

const Index = () => {
  const { wallet, connectWallet, completeSetup } = useWallet();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <AiChat />
        </div>
        
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
            XMRT Master DAO
          </h1>
          <p className="text-gray-400">Decentralized Asset Management & Governance</p>
        </header>

        {!wallet.isConnected ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Connect Wallet</CardTitle>
                <CardDescription className="text-gray-400">
                  Join XMRT Master DAO
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  onClick={connectWallet}
                >
                  <Wallet2 className="mr-2 h-4 w-4" />
                  Connect MetaMask
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Multi-Chain Support</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage assets across different blockchains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <div className="px-3 py-1 bg-gray-700 rounded-full text-sm">Ethereum</div>
                  <div className="px-3 py-1 bg-gray-700 rounded-full text-sm">Polygon</div>
                  <div className="px-3 py-1 bg-gray-700 rounded-full text-sm">BSC</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">DAO Governance</CardTitle>
                <CardDescription className="text-gray-400">
                  Participate in XMRT governance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Proposals</span>
                    <span className="text-purple-400">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Members</span>
                    <span className="text-blue-400">0</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Dashboard wallet={wallet} onSetupComplete={completeSetup} />
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Index;