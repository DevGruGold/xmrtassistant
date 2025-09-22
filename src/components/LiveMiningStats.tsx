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
    // Initial fetch
    fetchMiningData();

    // Set up polling every 30 seconds for real-time updates
    const interval = setInterval(fetchMiningData, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
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
    if (isOnline) return 'Miner Online';
    switch (status) {
      case 'live': return 'Miner Live';
      case 'historical': return 'Miner Offline';
      case 'inactive': return 'Miner Inactive';
      case 'error': return 'Connection Error';
      default: return 'Unknown Status';
    }
  };

  // Format numbers with proper units
  const formatHashrate = (hashrate: number): string => {
    if (hashrate === 0) return '0.00 H/s';
    if (hashrate >= 1e12) return `${(hashrate / 1e12).toFixed(2)} TH/s`;
    if (hashrate >= 1e9) return `${(hashrate / 1e9).toFixed(2)} GH/s`;
    if (hashrate >= 1e6) return `${(hashrate / 1e6).toFixed(2)} MH/s`;
    if (hashrate >= 1e3) return `${(hashrate / 1e3).toFixed(2)} KH/s`;
    return `${hashrate.toFixed(0)} H/s`;
  };

  const formatXMR = (amount: number): string => {
    return amount.toFixed(6);
  };

  const formatLargeNumber = (num: number): string => {
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

  if (loading && !stats) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Live Mining Statistics</CardTitle>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="mx-auto h-8 w-8 animate-pulse text-blue-500 mb-4" />
            <p className="text-muted-foreground">Connecting to mining pool...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-2xl font-bold">Live Mining Statistics</CardTitle>
          {stats && (
            <Badge 
              variant="outline" 
              className={`${getStatusColor(stats.status)} text-white border-none`}
            >
              {getStatusText(stats.status, stats.isOnline)}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-4 border border-red-200 bg-red-50 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-700 font-medium">Connection Issue</p>
              <p className="text-xs text-red-600">{error}</p>
              {retryCount < 3 && (
                <p className="text-xs text-red-500 mt-1">Retrying automatically...</p>
              )}
            </div>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Current Hashrate */}
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

            {/* Last Hash */}
            <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Last Hash</span>
              </div>
              <p className="text-2xl font-bold text-orange-800">
                {formatTime(stats.lastHash)}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                {stats.lastHash > 0 ? new Date(stats.lastHash * 1000).toLocaleString() : 'Never'}
              </p>
            </div>

            {/* Total Hashes */}
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg border">
              <div className="flex items-center space-x-2 mb-2">
                <Hash className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">Total Hashes</span>
              </div>
              <p className="text-2xl font-bold text-indigo-800">
                {formatLargeNumber(stats.totalHashes)}
              </p>
            </div>

            {/* Paid Out */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg border">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-900">Paid Out</span>
              </div>
              <p className="text-2xl font-bold text-emerald-800">
                {formatXMR(stats.amtPaid)} XMR
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                {stats.txnCount} transactions
              </p>
            </div>

            {/* Pool Information */}
            {poolStats && (
              <>
                <div className="p-4 bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-lg border">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="h-4 w-4 text-cyan-600" />
                    <span className="text-sm font-medium text-cyan-900">Pool Hashrate</span>
                  </div>
                  <p className="text-2xl font-bold text-cyan-800">
                    {formatHashrate(poolStats.poolHashrate)}
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg border">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium text-teal-900">Connected Miners</span>
                  </div>
                  <p className="text-2xl font-bold text-teal-800">
                    {formatLargeNumber(poolStats.poolMiners)}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {stats && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Gauge className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Status</span>
                <Badge 
                  variant="outline"
                  className={`${getStatusColor(stats.status)} text-white border-none`}
                >
                  LIVE
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                Pool: SupportXMR • Auto-refresh: 30s
              </div>
            </div>
            {stats.isOnline && (
              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-600">
                <span>⚡ Mining Active</span>
                <span>🔗 Pool Connected</span>
                <span>📊 Data Live</span>
                {stats.efficiency && stats.efficiency > 95 && (
                  <span>🎯 High Efficiency</span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveMiningStats;
