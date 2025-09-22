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
      console.log("🟢 Online Status:", combinedStats.isOnline);

    } catch (err) {
      console.error("❌ Failed to fetch mining data:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch mining stats";
      setError(errorMessage);
      setLoading(false);
      setRetryCount(prev => prev + 1);

      // Auto-retry on network errors (up to 3 times)
      if (retryCount < 3 && errorMessage.includes('Network')) {
        console.log(`🔄 Auto-retrying in ${(retryCount + 1) * 5} seconds...`);
        setTimeout(fetchMiningData, (retryCount + 1) * 5000);
      }
    }
  };

  useEffect(() => {
    // Initial fetch immediately
    console.log("🚀 LiveMiningStats component mounted, fetching data...");
    fetchMiningData();

    // Set up polling every 30 seconds for real-time updates
    const interval = setInterval(() => {
      console.log("⏰ Auto-refresh mining data...");
      fetchMiningData();
    }, 30000);

    return () => {
      console.log("🛑 LiveMiningStats component unmounting...");
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = () => {
    console.log("🔄 Manual refresh triggered");
    setLoading(true);
    setRetryCount(0);
    fetchMiningData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-500';
      case 'historical': return 'bg-yellow-500';
      case 'inactive': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string, isOnline: boolean) => {
    if (isOnline && status === 'live') return 'Miner Live';
    if (isOnline) return 'Miner Online';
    switch (status) {
      case 'live': return 'Miner Live (Historical)';
      case 'historical': return 'Miner Offline';
      case 'inactive': return 'Miner Inactive';
      case 'error': return 'Connection Error';
      default: return 'Unknown Status';
    }
  };

  // Format numbers with proper units and ensure no zero fallback
  const formatHashrate = (hashrate: number): string => {
    console.log("🔧 Formatting hashrate:", hashrate);
    if (!hashrate || hashrate === 0) return '0 H/s';
    if (hashrate >= 1e12) return `${(hashrate / 1e12).toFixed(2)} TH/s`;
    if (hashrate >= 1e9) return `${(hashrate / 1e9).toFixed(2)} GH/s`;
    if (hashrate >= 1e6) return `${(hashrate / 1e6).toFixed(2)} MH/s`;
    if (hashrate >= 1e3) return `${(hashrate / 1e3).toFixed(2)} KH/s`;
    return `${Math.round(hashrate)} H/s`;
  };

  const formatXMR = (amount: number): string => {
    console.log("💰 Formatting XMR:", amount);
    if (!amount) return '0.000000';
    return amount.toFixed(6);
  };

  const formatLargeNumber = (num: number): string => {
    console.log("📊 Formatting large number:", num);
    if (!num || num === 0) return '0';
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatTime = (timestamp: number): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  // Show loading state
  if (loading && !stats) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Live Mining Statistics</CardTitle>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading real-time data...</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="mx-auto h-8 w-8 animate-pulse text-blue-500 mb-4" />
            <p className="text-muted-foreground">Connecting to SupportXMR API...</p>
            <p className="text-sm text-muted-foreground mt-2">Fetching live mining statistics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error && !stats) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center space-x-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <span>Mining Statistics Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} className="bg-red-500 hover:bg-red-600">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show main component with data
  if (!stats) {
    console.log("⚠️ No stats available, showing placeholder");
    return (
      <Card className="w-full">
        <CardContent>
          <p>No mining data available</p>
        </CardContent>
      </Card>
    );
  }

  console.log("🎨 Rendering component with stats:", {
    hashrate: stats.hashrate,
    amtDue: stats.amtDue,
    validShares: stats.validShares,
    isOnline: stats.isOnline,
    status: stats.status
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-2xl font-bold">Live Mining Statistics</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge 
            className={`${getStatusColor(stats.status)} text-white px-3 py-1`}
          >
            {getStatusText(stats.status, stats.isOnline)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Updating...' : 'LIVE'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Current Hashrate - FORCE DISPLAY OF REAL VALUE */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Current Hashrate</span>
            </div>
            <p className="text-2xl font-bold text-blue-800">
              {formatHashrate(stats.hashrate)}
            </p>
            {stats.efficiency && stats.efficiency > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                {stats.efficiency.toFixed(1)}% efficiency
              </p>
            )}
            <p className="text-xs text-blue-500 mt-1">
              Raw value: {stats.hashrate} H/s
            </p>
          </div>

          {/* Valid Shares */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Valid Shares</span>
            </div>
            <p className="text-2xl font-bold text-green-800">
              {formatLargeNumber(stats.validShares)}
            </p>
            {stats.invalidShares > 0 && (
              <p className="text-xs text-red-500 mt-1">
                {stats.invalidShares} invalid
              </p>
            )}
            <p className="text-xs text-green-500 mt-1">
              Raw: {stats.validShares.toLocaleString()}
            </p>
          </div>

          {/* Amount Due */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border">
            <div className="flex items-center space-x-2 mb-2">
              <Coins className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Amount Due</span>
            </div>
            <p className="text-2xl font-bold text-purple-800">
              {formatXMR(stats.amtDue)} XMR
            </p>
            <p className="text-xs text-purple-600 mt-1">
              ≈ ${(stats.amtDue * 300).toFixed(2)} USD
            </p>
          </div>
        </div>

        {/* Additional Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Hash className="h-5 w-5 mx-auto text-gray-600 mb-2" />
            <p className="text-sm text-gray-600">Last Hash</p>
            <p className="font-semibold">{formatTime(stats.lastHash)}</p>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Activity className="h-5 w-5 mx-auto text-gray-600 mb-2" />
            <p className="text-sm text-gray-600">Total Hashes</p>
            <p className="font-semibold">{formatLargeNumber(stats.totalHashes)}</p>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Coins className="h-5 w-5 mx-auto text-gray-600 mb-2" />
            <p className="text-sm text-gray-600">Paid Out</p>
            <p className="font-semibold">{formatXMR(stats.amtPaid)} XMR</p>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <TrendingUp className="h-5 w-5 mx-auto text-gray-600 mb-2" />
            <p className="text-sm text-gray-600">Transactions</p>
            <p className="font-semibold">{stats.txnCount}</p>
          </div>
        </div>

        {/* Pool Information */}
        {poolStats && (
          <div className="border-t pt-4">
            <h4 className="text-lg font-semibold mb-3 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Pool Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Pool Hashrate:</span>
                <span className="font-semibold ml-2">
                  {formatHashrate(poolStats.poolHashrate)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Connected Miners:</span>
                <span className="font-semibold ml-2">
                  {poolStats.poolMiners.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Block:</span>
                <span className="font-semibold ml-2">#{poolStats.lastBlock}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Blocks:</span>
                <span className="font-semibold ml-2">
                  {poolStats.totalBlocksFound.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Debug Information */}
        {process.env.NODE_ENV === 'development' && stats && (
          <div className="border-t pt-4 mt-4">
            <details>
              <summary className="text-sm text-muted-foreground cursor-pointer">
                Debug Information
              </summary>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                {JSON.stringify({ 
                  stats: {
                    hashrate: stats.hashrate,
                    amtDue: stats.amtDue,
                    validShares: stats.validShares,
                    isOnline: stats.isOnline,
                    status: stats.status
                  },
                  poolStats: poolStats 
                }, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-sm text-yellow-700">
              ⚠️ Warning: {error}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveMiningStats;