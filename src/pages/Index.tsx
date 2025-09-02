import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet2, Shield, Users, Layers, ArrowRight, Sparkles } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import Dashboard from "@/components/Dashboard";
import MobileMoneroCalculator from "@/components/MobileMoneroCalculator";
import LiveMiningStats from "@/components/LiveMiningStats";
import UnifiedChat from "@/components/UnifiedChat";
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
      
      {/* Hero Section - Corporate Design */}
      <section className="relative bg-gradient-to-b from-background to-secondary/30 border-b border-border">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28 relative">
          
          {/* Corporate Header */}
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-8 mb-16">
              
              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/5 border border-primary/20 text-primary text-sm font-medium animate-fade-in">
                <div className="w-2 h-2 bg-mining-active rounded-full animate-pulse" />
                Live Mining Network Active
              </div>
              
              {/* Main Corporate Title */}
              <div className="space-y-4">
                <h1 className="font-inter font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-foreground leading-tight tracking-tight animate-slide-in">
                  <span className="block mb-2">XMRT</span>
                  <span className="block bg-gradient-to-r from-primary via-mining-info to-primary bg-clip-text text-transparent">
                    Economy
                  </span>
                </h1>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-lg sm:text-xl font-source font-medium text-muted-foreground animate-fade-in">
                  <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-mining-info rounded-full" />
                    Mobile Mining DAO
                  </span>
                  <span className="hidden sm:block text-border">|</span>
                  <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    AI Assistant Eliza
                  </span>
                </div>
              </div>
              
              {/* Corporate Description */}
              <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
                <p className="text-lg sm:text-xl font-source text-muted-foreground leading-relaxed">
                  Professional decentralized asset management platform leveraging blockchain technology, 
                  mobile mining infrastructure, and AI-powered governance solutions.
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-muted-foreground/80">
                  <span className="px-3 py-1 bg-muted/50 rounded-full">Enterprise-Grade Security</span>
                  <span className="px-3 py-1 bg-muted/50 rounded-full">Real-Time Analytics</span>
                  <span className="px-3 py-1 bg-muted/50 rounded-full">Decentralized Governance</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Corporate Stats Dashboard */}
          <div className="max-w-6xl mx-auto mb-12 animate-fade-in">
            <LiveMiningStats />
          </div>
          
          {/* Corporate CTA Section */}
          <div className="max-w-5xl mx-auto text-center mb-12">
            <div className="bg-card/50 border border-border rounded-2xl p-8 sm:p-12 shadow-lg animate-slide-in">
              <div className="space-y-6">
                <h3 className="font-inter font-semibold text-2xl sm:text-3xl text-foreground">
                  Join the Mining Network
                </h3>
                <p className="font-source text-muted-foreground max-w-2xl mx-auto">
                  Start mining with professional-grade infrastructure and real-time monitoring capabilities.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button 
                    size="lg"
                    className="font-source font-semibold bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 group"
                    asChild
                  >
                    <a href="https://mobilemonero.com" target="_blank" rel="noopener noreferrer">
                      <Sparkles className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                      Launch Mining Dashboard
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* AI Assistant Section */}
          <div className="max-w-6xl mx-auto mb-12 animate-fade-in">
            <div className="text-center mb-8">
              <h3 className="font-inter font-semibold text-2xl sm:text-3xl text-foreground mb-4">
                AI Assistant Eliza
              </h3>
              <p className="font-source text-muted-foreground max-w-2xl mx-auto">
                Intelligent support for mining operations, governance decisions, and platform navigation.
              </p>
            </div>
            <UnifiedChat />
          </div>
          
          {/* Mining Calculator */}
          <div className="mb-12 animate-fade-in">
            <div className="text-center mb-8">
              <h3 className="font-inter font-semibold text-2xl sm:text-3xl text-foreground mb-4">
                Mining Calculator
              </h3>
              <p className="font-source text-muted-foreground max-w-2xl mx-auto">
                Calculate potential returns and optimize your mining strategy with real-time data.
              </p>
            </div>
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