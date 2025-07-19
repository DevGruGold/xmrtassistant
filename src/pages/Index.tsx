import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet2 } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import Dashboard from "@/components/Dashboard";
import MobileMoneroCalculator from "@/components/MobileMoneroCalculator";
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
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12 lg:py-20 relative">
          <div className="text-center space-y-4 sm:space-y-6 mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent leading-tight">
              XMRT Master DAO
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto px-4">
              Revolutionizing decentralized asset management and governance through innovative blockchain solutions.
            </p>
            {!wallet.isConnected && (
              <Button 
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-base sm:text-lg py-4 sm:py-6 px-6 sm:px-8 w-full sm:w-auto"
                onClick={connectWallet}
              >
                <Wallet2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Connect Wallet
              </Button>
            )}
          </div>
          
          {/* MobileMonero Calculator */}
          <div className="mb-8 sm:mb-12">
            <MobileMoneroCalculator />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12">
        {wallet.isConnected ? (
          <>
            <div className="mb-4 sm:mb-6">
              <DaoTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
            {activeTab === "xmrt" ? (
              <XMRTDashboard wallet={wallet} onRefreshXMRT={refreshXMRTData} />
            ) : (
              <Dashboard wallet={wallet} onSetupComplete={completeSetup} />
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12">
            <Card className="bg-gray-900/80 backdrop-blur-sm border-gray-600 shadow-xl">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-white text-lg sm:text-xl font-bold">Multi-Chain Support</CardTitle>
                <CardDescription className="text-gray-300 text-sm sm:text-base">
                  Manage assets across different blockchains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  <div className="px-2 sm:px-4 py-1 sm:py-2 bg-gray-700/80 rounded-full text-xs sm:text-sm text-white font-medium">Ethereum</div>
                  <div className="px-2 sm:px-4 py-1 sm:py-2 bg-gray-700/80 rounded-full text-xs sm:text-sm text-white font-medium">Polygon</div>
                  <div className="px-2 sm:px-4 py-1 sm:py-2 bg-gray-700/80 rounded-full text-xs sm:text-sm text-white font-medium">BSC</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 backdrop-blur-sm border-gray-600 shadow-xl">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-white text-lg sm:text-xl font-bold">DAO Governance</CardTitle>
                <CardDescription className="text-gray-300 text-sm sm:text-base">
                  Participate in XMRT governance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-200 font-medium text-sm sm:text-base">Proposals</span>
                    <span className="text-purple-400 font-bold text-sm sm:text-base">Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-200 font-medium text-sm sm:text-base">Members</span>
                    <span className="text-blue-400 font-bold text-sm sm:text-base">Growing</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 backdrop-blur-sm border-gray-600 shadow-xl md:col-span-2 xl:col-span-1">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-white text-lg sm:text-xl font-bold">Asset Management</CardTitle>
                <CardDescription className="text-gray-300 text-sm sm:text-base">
                  Secure and efficient asset handling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-200 font-medium text-sm sm:text-base">Security</span>
                    <span className="text-green-400 font-bold text-sm sm:text-base">Enhanced</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-200 font-medium text-sm sm:text-base">Efficiency</span>
                    <span className="text-yellow-400 font-bold text-sm sm:text-base">Optimized</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Chat Section */}
      <div className="w-full h-64 sm:h-80 lg:h-96 bg-gray-900 border-t border-gray-700">
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