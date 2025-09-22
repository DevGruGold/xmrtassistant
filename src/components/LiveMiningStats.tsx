import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Activity, Hash, Coins, Clock, Zap, TrendingUp, AlertCircle, RefreshCw, Users, Target, Gauge } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { miningService, MiningStats as ServiceMiningStats, PoolStats } from "@/services/miningService";

// Extended interface that includes pool context
interface ExtendedMiningStats extends ServiceMiningStats {
  poolContext?: PoolStats;
}

// Utility functions for better data formatting
const formatHashRate = (hashRate: number): string => {
  if (hashRate >= 1e12) return `${(hashRate / 1e12).toFixed(2)} TH/s`;
  if (hashRate >= 1e9) return `${(hashRate / 1e9).toFixed(2)} GH/s`;
  if (hashRate >= 1e6) return `${(hashRate / 1e6).toFixed(2)} MH/s`;
  if (hashRate >= 1e3) return `${(hashRate / 1e3).toFixed(2)} KH/s`;
  return `${hashRate.toFixed(0)} H/s`;
};

const formatXMR = (amount: number): string => {
  return `${amount.toFixed(6)} XMR`;
};

const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const formatTimeAgo = (timestamp: number): string => {
  if (!timestamp || timestamp === 0) return "Never";

  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const LiveMiningStats = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<ExtendedMiningStats | null>(null);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [retryCount, setRetryCount] = useState(0);

  const fetchMiningData = async (showLoading: boolean = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      console.log("🔄 Fetching mining data...");
      setError(null);

      // Fetch both mining stats and pool stats in parallel with better error handling
      const [miningData, poolData] = await Promise.allSettled([
        miningService.getMiningStats(),
        miningService.getPoolStats()
      ]);

      console.log("📊 Mining data fetch result:", miningData);
      console.log("🏊 Pool data fetch result:", poolData);

      let finalMiningData: ServiceMiningStats;
      let finalPoolData: PoolStats | null = null;

      // Handle mining stats result
      if (miningData.status === 'fulfilled') {
        finalMiningData = miningData.value;
        console.log("✅ Mining stats successful:", finalMiningData);
      } else {
        console.error("❌ Mining stats failed:", miningData.reason);
        // Provide default offline data instead of failing
        finalMiningData = {
          hashrate: 0,
          status: 'offline',
          validShares: 0,
          invalidShares: 0,
          amtDue: 0,
          amtPaid: 0,
          txnCount: 0,
          roundShares: 0,
          isOnline: false,
          efficiency: 0
        };
      }

      // Handle pool stats result
      if (poolData.status === 'fulfilled') {
        finalPoolData = poolData.value;
        console.log("✅ Pool stats successful:", finalPoolData);
      } else {
        console.error("❌ Pool stats failed:", poolData.reason);
        // Continue without pool data
      }

      // Combine the data
      const combinedStats: ExtendedMiningStats = {
        ...finalMiningData,
        poolContext: finalPoolData || undefined
      };

      setStats(combinedStats);
      setPoolStats(finalPoolData);
      setLastUpdate(new Date());
      setLoading(false);
      setRetryCount(0);

      console.log("✅ Mining data updated successfully:", combinedStats);
      console.log("📈 Hashrate:", combinedStats.hashrate, "H/s");
      console.log("💰 Amount Due:", combinedStats.amtDue, "XMR");

    } catch (error) {
      console.error("❌ Critical error in fetchMiningData:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch mining data");
      setLoading(false);

      // Increment retry count for exponential backoff
      setRetryCount(prev => prev + 1);
    }
  };

  // Auto-refresh with exponential backoff on errors
  useEffect(() => {
    // Initial fetch
    fetchMiningData(true);

    // Set up interval with dynamic timing based on error state
    const baseInterval = 30000; // 30 seconds
    const errorMultiplier = Math.min(Math.pow(2, retryCount), 8); // Max 4 minutes
    const interval = setInterval(() => {
      fetchMiningData(false);
    }, baseInterval * errorMultiplier);

    return () => clearInterval(interval);
  }, [retryCount]);

  const handleRefresh = () => {
    setRetryCount(0);
    fetchMiningData(true);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      case 'error':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  if (loading && !stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-pulse" />
            Loading Mining Statistics...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Activity className={`h-5 w-5 ${stats?.isOnline ? 'text-green-500' : 'text-red-500'}`} />
              Live Mining Statistics
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={stats?.isOnline ? "default" : "secondary"}>
                {getStatusText(stats?.status || 'offline')}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
            {retryCount > 0 && ` (Retry ${retryCount})`}
          </p>
        </CardHeader>

        {error && (
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Mining Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Current Hashrate */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Hashrate</p>
                <p className="text-2xl font-bold">
                  {stats ? formatHashRate(stats.hashrate) : '0.00 H/s'}
                </p>
              </div>
              <Hash className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Valid Shares */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valid Shares</p>
                <p className="text-2xl font-bold">
                  {stats ? formatNumber(stats.validShares) : '0'}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Amount Due */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className="text-2xl font-bold">
                  {stats ? formatXMR(stats.amtDue) : '0.000000 XMR'}
                </p>
              </div>
              <Coins className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Hashes */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hashes</p>
                <p className="text-2xl font-bold">
                  {stats ? formatNumber(stats.roundShares || 0) : '0'}
                </p>
              </div>
              <Gauge className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* Paid Out */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid Out</p>
                <p className="text-2xl font-bold">
                  {stats ? formatXMR(stats.amtPaid) : '0.000000 XMR'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">
                  {stats ? formatNumber(stats.txnCount) : '0'}
                </p>
              </div>
              <Activity className="h-8 w-8 text-indigo-500" />
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Pool Hashrate</p>
                <p className="text-xl font-semibold">
                  {formatHashRate(poolStats.poolHashrate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Connected Miners</p>
                <p className="text-xl font-semibold">
                  {formatNumber(poolStats.poolMiners)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(stats?.status || 'offline')}`} />
                  <span className="text-xl font-semibold">
                    {stats?.status === 'online' ? 'Miner Online' : 'Miner Offline'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveMiningStats;