import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Hash, Coins, Clock, Zap, TrendingUp, AlertCircle, RefreshCw, Users, Target, Gauge } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { directMiningService, DirectMiningStats, DirectPoolStats } from "@/services/directMiningService";

const DirectLiveMiningStats = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DirectMiningStats | null>(null);
  const [poolStats, setPoolStats] = useState<DirectPoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [retryCount, setRetryCount] = useState(0);

  const fetchMiningData = async (showLoading: boolean = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      console.log("🔄 Fetching live mining data...");
      setError(null);

      // Fetch both mining stats and pool stats in parallel
      const [miningData, poolData] = await Promise.allSettled([
        directMiningService.getMiningStats(),
        directMiningService.getPoolStats()
      ]);

      console.log("📊 Live mining data result:", miningData);
      console.log("🏊 Live pool data result:", poolData);

      let finalMiningData: DirectMiningStats;
      let finalPoolData: DirectPoolStats | null = null;

      // Handle mining stats result
      if (miningData.status === 'fulfilled') {
        finalMiningData = miningData.value;
        console.log("✅ Live mining stats successful:", finalMiningData);
      } else {
        console.warn("⚠️ Mining stats failed, using fallback:", miningData.reason);
        // Provide fallback data for miner (this is normal for wallets not actively mining)
        finalMiningData = {
          hashrate: 0,
          status: 'offline',
          validShares: 0,
          invalidShares: 0,
          amountDue: 0,
          amountPaid: 0,
          txnCount: 0,
          lastHash: null,
          totalHashes: 0,
          isOnline: false
        };
      }

      // Handle pool stats result
      if (poolData.status === 'fulfilled') {
        finalPoolData = poolData.value;
        console.log("✅ Live pool stats successful:", finalPoolData);
      } else {
        console.warn("⚠️ Pool stats failed:", poolData.reason);
      }

      setStats(finalMiningData);
      setPoolStats(finalPoolData);
      setLastUpdate(new Date());
      setRetryCount(0);
      console.log("🎯 Live mining data updated successfully");

    } catch (error) {
      console.error("❌ Live mining data fetch error:", error);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchMiningData(true);

    const interval = setInterval(() => {
      fetchMiningData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatHashrate = (hashrate: number) => {
    if (hashrate === 0) return "0 H/s";
    if (hashrate >= 1e12) return `${(hashrate / 1e12).toFixed(2)} TH/s`;
    if (hashrate >= 1e9) return `${(hashrate / 1e9).toFixed(2)} GH/s`;
    if (hashrate >= 1e6) return `${(hashrate / 1e6).toFixed(2)} MH/s`;
    if (hashrate >= 1e3) return `${(hashrate / 1e3).toFixed(2)} KH/s`;
    return `${hashrate.toFixed(0)} H/s`;
  };

  const formatXMR = (amount: number) => {
    return amount.toFixed(6);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Online</Badge>;
      case 'offline':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Offline</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Error</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Unknown</Badge>;
    }
  };

  if (loading && !stats) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading Live Mining Data...</p>
          <p className="text-sm text-muted-foreground">Connecting to SupportXMR API</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Live Mining Intelligence</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Badge>
          <Button
            onClick={() => fetchMiningData(true)}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground">
        Real-time mining data integrated into your AI assistant • Performance insights at your fingertips
      </p>

      {error && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span>Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mining Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Hashrate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHashrate(stats?.hashrate || 0)}</div>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(stats?.status || 'offline')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valid Shares</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.validShares || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(stats?.invalidShares || 0).toLocaleString()} invalid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Due</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatXMR(stats?.amountDue || 0)} XMR</div>
            <p className="text-xs text-muted-foreground mt-1">
              Paid: {formatXMR(stats?.amountPaid || 0)} XMR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hashes</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.totalHashes || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(stats?.txnCount || 0)} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pool Information */}
      {poolStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pool Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Pool Hashrate</p>
                <p className="text-xl font-bold text-primary">{formatHashrate(poolStats.poolHashrate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Connected Miners</p>
                <p className="text-xl font-bold text-primary">{poolStats.poolMiners.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Blocks Found</p>
                <p className="text-xl font-bold text-primary">{poolStats.totalBlocksFound.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className={`w-2 h-2 rounded-full ${stats?.isOnline ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
        <span>Miner {stats?.isOnline ? 'Online' : 'Offline'}</span>
        <span className="mx-2">•</span>
        <Clock className="h-4 w-4" />
        <span>Live updates every 30s</span>
      </div>
    </div>
  );
};

export default DirectLiveMiningStats;
