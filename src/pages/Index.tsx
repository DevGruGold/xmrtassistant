import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet2, Shield, Users, Layers, ArrowRight, Sparkles } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import Dashboard from "@/components/Dashboard";
import MobileMoneroCalculator from "@/components/MobileMoneroCalculator";
import LiveMiningStats from "@/components/LiveMiningStats";
import { ContextualChat } from "@/components/ContextualChat";
import { Footer } from "@/components/Footer";
import DaoTabs from "@/components/DaoTabs";
import XMRTDashboard from "@/components/XMRTDashboard";
import { useState } from "react";
import { MobileNav } from "@/components/MobileNav";

const Index = () => {
  const { wallet, connectWallet, completeSetup, refreshXMRTData } = useWallet();
  const [activeTab, setActiveTab] = useState("members");

  return (
    <div className="min-h-screen bg-background">
      <MobileNav />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(271_81%_56%_/_0.1),transparent_50%),radial-gradient(circle_at_70%_80%,hsl(199_89%_48%_/_0.1),transparent_50%)]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              Live Mining Dashboard
            </div>
            
            <div className="space-y-4">
              <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black bg-gradient-to-r from-primary via-mining-info to-primary bg-clip-text text-transparent leading-[0.9] animate-slide-in drop-shadow-2xl">
                XMRT Economy
              </h1>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-medium text-muted-foreground/80 tracking-wide animate-fade-in">
                Mobile Mining DAO • AI Assistant Eliza
              </h2>
            </div>
            
            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in">
              Revolutionizing decentralized asset management and governance through innovative blockchain solutions with real-time mining integration.
            </p>
          </div>
          
          {/* Live Mining Stats - Moved Higher */}
          <div className="max-w-6xl mx-auto mb-8 sm:mb-12 animate-fade-in">
            <LiveMiningStats />
          </div>
          
          {/* Start Mining CTA */}
          <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-12">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-in">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-primary to-mining-info hover:from-primary/90 hover:to-mining-info/90 text-lg py-6 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                asChild
              >
                <a href="https://mobilemonero.com" target="_blank" rel="noopener noreferrer">
                  <Sparkles className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  Start Mining
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
            </div>
          </div>
          
          {/* Eliza Chat */}
          <div className="max-w-6xl mx-auto mb-8 sm:mb-12 animate-fade-in">
            <div className="relative z-10">
              <ContextualChat />
            </div>
          </div>
          
          {/* MobileMonero Calculator */}
          <div className="mb-8 sm:mb-12 animate-fade-in relative z-0 mt-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 mt-8 sm:mt-12">
            <Card className="group bg-gradient-to-br from-card to-secondary border-border hover:border-primary/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-in">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Layers className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-foreground text-xl font-bold">Multi-Chain Support</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">
                  Manage assets across different blockchains seamlessly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">Ethereum</div>
                  <div className="px-3 py-1 bg-mining-info/10 text-mining-info rounded-full text-sm font-medium">Polygon</div>
                  <div className="px-3 py-1 bg-mining-warning/10 text-mining-warning rounded-full text-sm font-medium">BSC</div>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-gradient-to-br from-card to-secondary border-border hover:border-primary/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-in">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-mining-active/10 group-hover:bg-mining-active/20 transition-colors">
                    <Users className="h-6 w-6 text-mining-active" />
                  </div>
                  <CardTitle className="text-foreground text-xl font-bold">DAO Governance</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">
                  Participate in XMRT governance and mining decisions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">Proposals</span>
                    <span className="text-primary font-bold bg-primary/10 px-2 py-1 rounded-full text-sm">Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">Members</span>
                    <span className="text-mining-active font-bold bg-mining-active/10 px-2 py-1 rounded-full text-sm">Growing</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-gradient-to-br from-card to-secondary border-border hover:border-primary/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-in md:col-span-2 xl:col-span-1">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-mining-info/10 group-hover:bg-mining-info/20 transition-colors">
                    <Shield className="h-6 w-6 text-mining-info" />
                  </div>
                  <CardTitle className="text-foreground text-xl font-bold">Asset Management</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">
                  Secure and efficient asset handling with mining rewards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">Security</span>
                    <span className="text-mining-active font-bold bg-mining-active/10 px-2 py-1 rounded-full text-sm">Enhanced</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">Mining</span>
                    <span className="text-mining-warning font-bold bg-mining-warning/10 px-2 py-1 rounded-full text-sm">Optimized</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Chat Section */}
      <div className="w-full h-64 sm:h-80 lg:h-96 bg-secondary/50 border-t border-border backdrop-blur-sm">
        <iframe
          src="https://mobilemonero.chatango.com/"
          className="w-full h-full rounded-t-lg"
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