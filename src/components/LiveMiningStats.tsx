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

  const fetchMiningData = async () => {
    try {
      console.log("🔄 Fetching mining data...");
      setError(null);

      // Fetch both mining stats and pool stats in parallel
      const [miningData, poolData] = await Promise.all([
        miningService.getMiningStats(),
        miningService.getPoolStats()
      ]);

      console.log("📊 Raw mining data received:", miningData);
      console.log("🏊 Raw pool data received:", poolData);

      // Combine the data
      const combinedStats: ExtendedMiningStats = {
        ...miningData,
        poolContext: poolData
      };

      setStats(combinedStats);
      setPoolStats(poolData);
      setLastUpdate(new Date());
      setLoading(false);
      setRetryCount(0);

      console.log("✅ Mining data updated successfully:", combinedStats);
      console.log("📈 Hashrate:", combinedStats.hashrate, "H/s");
      console.log("💰 Amount Due:", combinedStats.amtDue, "XMR");
      console.log("🎯 Valid Shares:", combinedStats.validShares);
      console.log("🟢 Status:", combinedStats.status);

    } catch (err) {
      console.error("❌ Failed to fetch mining data:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch mining stats";
      setError(errorMessage);
      setLoading(false);
      setRetryCount(prev => prev + 1);

      // Auto-retry with exponential backoff
      if (retryCount < 3) {
        const retryDelay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
        console.log(`⏳ Retrying in ${retryDelay}ms... (attempt ${retryCount + 1})`);
        setTimeout(fetchMiningData, retryDelay);
      }
    }
  };

  // Initial load and auto-refresh setup
  useEffect(() => {
    fetchMiningData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchMiningData, 30000);

    return () => clearInterval(interval);
  }, []);

  // Retry on error
  useEffect(() => {
    if (error && retryCount === 0) {
      const retryTimeout = setTimeout(() => {
        fetchMiningData();
      }, 5000);

      return () => clearTimeout(retryTimeout);
    }
  }, [error, retryCount]);

  const handleManualRefresh = () => {
    setLoading(true);
    setRetryCount(0);
    fetchMiningData();
  };

  const getStatusColor = (status: string, isOnline: boolean) => {
    if (error) return "destructive";
    if (isOnline && status === "live") return "default";
    if (status === "historical") return "secondary";
    return "destructive";
  };

  const getStatusText = (status: string, isOnline: boolean) => {
    if (error) return "Error";
    if (isOnline && status === "live") return "LIVE";
    if (status === "historical") return "Historical";
    return "Offline";
  };

  if (loading && !stats) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Live Mining Statistics</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading mining data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card with Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Live Mining Statistics</CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={getStatusColor(stats?.status || "error", stats?.isOnline || false)}
              className="font-mono text-xs"
            >
              {getStatusText(stats?.status || "error", stats?.isOnline || false)}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleManualRefresh}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
            {error && (
              <div className="flex items-center gap-1 text-destructive mt-1">
                <AlertCircle className="h-3 w-3" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mining Performance Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Hashrate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Hashrate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats?.hashrate ? formatHashRate(stats.hashrate) : "0.00 H/s"}
            </div>
            {stats?.efficiency && (
              <p className="text-xs text-muted-foreground">
                {stats.efficiency}% efficiency
              </p>
            )}
          </CardContent>
        </Card>

        {/* Valid Shares */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valid Shares</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.validShares ? formatNumber(stats.validShares) : "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.invalidShares || 0} invalid
            </p>
          </CardContent>
        </Card>

        {/* Amount Due */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Due</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.amtDue ? formatXMR(stats.amtDue) : "0.000000 XMR"}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending payout
            </p>
          </CardContent>
        </Card>

        {/* Last Hash */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Hash</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.lastHash ? formatTimeAgo(stats.lastHash) : "Never"}
            </div>
            <p className="text-xs text-muted-foreground">
              Last submission
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mining Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mining Details</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Hashes</span>
              <span className="text-sm font-mono">
                {stats?.totalHashes ? formatNumber(stats.totalHashes) : "0"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Paid Out</span>
              <span className="text-sm font-mono">
                {stats?.amtPaid ? formatXMR(stats.amtPaid) : "0.000000 XMR"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Transactions</span>
              <span className="text-sm font-mono">
                {stats?.txnCount || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pool Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pool Information</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pool Hashrate</span>
              <span className="text-sm font-mono">
                {poolStats?.poolHashrate ? formatHashRate(poolStats.poolHashrate) : "0.00 H/s"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Connected Miners</span>
              <span className="text-sm font-mono">
                {poolStats?.poolMiners ? formatNumber(poolStats.poolMiners) : "0"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Blocks Found</span>
              <span className="text-sm font-mono">
                {poolStats?.totalBlocksFound ? formatNumber(poolStats.totalBlocksFound) : "0"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Status Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className={`h-4 w-4 ${stats?.isOnline ? "text-green-500" : "text-red-500"}`} />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Miner Status</span>
              <Badge 
                variant={stats?.isOnline ? "default" : "destructive"}
                className="text-xs"
              >
                {stats?.isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <span className="text-sm font-mono">
                {stats?.uptimePercentage || 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Workers</span>
              <span className="text-sm font-mono">
                {stats?.workers?.length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicator */}
      {stats && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {stats.isOnline ? "✅ Mining Active" : "⚠️ Miner Offline"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.isOnline 
                    ? `Generating ${formatHashRate(stats.hashrate)} with ${stats.efficiency}% efficiency`
                    : `Last seen ${formatTimeAgo(stats.lastHash)}`
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatXMR(stats.amtDue)}</p>
                <p className="text-xs text-muted-foreground">Pending Reward</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveMiningStats;
