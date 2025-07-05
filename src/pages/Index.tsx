import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet2 } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import Dashboard from "@/components/Dashboard";
import { AiChat } from "@/components/AiChat";
import { Footer } from "@/components/Footer";
import DaoTabs from "@/components/DaoTabs";
import XMRTDashboard from "@/components/XMRTDashboard";
import { useState } from "react";
import { MobileNav } from "@/components/MobileNav";

const Index = () => {
  const { wallet, connectWallet, completeSetup, refreshXMRTData } = useWallet();
  const [activeTab, setActiveTab] = useState("members");

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <MobileNav />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 to-blue-800/20 backdrop-blur-sm" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                XMRT Master DAO
              </h1>
              <p className="text-xl text-gray-300">
                Revolutionizing decentralized asset management and governance through innovative blockchain solutions.
              </p>
              {!wallet.isConnected && (
                <Button 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-lg py-6"
                  onClick={connectWallet}
                >
                  <Wallet2 className="mr-2 h-5 w-5" />
                  Connect Wallet
                </Button>
              )}
            </div>
            <div className="lg:block">
              <AiChat />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {wallet.isConnected ? (
          <>
            <div className="mb-6">
              <DaoTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
            {activeTab === "xmrt" ? (
              <XMRTDashboard wallet={wallet} onRefreshXMRT={refreshXMRTData} />
            ) : (
              <Dashboard wallet={wallet} onSetupComplete={completeSetup} />
            )}
          </>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
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

            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
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
                    <span className="text-purple-400">Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Members</span>
                    <span className="text-blue-400">Growing</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Asset Management</CardTitle>
                <CardDescription className="text-gray-400">
                  Secure and efficient asset handling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Security</span>
                    <span className="text-green-400">Enhanced</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Efficiency</span>
                    <span className="text-yellow-400">Optimized</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Chat Section */}
      <div className="w-full h-96 bg-gray-900 border-t border-gray-700">
        <iframe
          src="https://mobilemonero.chatango.com/"
          className="w-full h-full"
          style={{ border: "none" }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          title="XMRT Chat"
        />
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;