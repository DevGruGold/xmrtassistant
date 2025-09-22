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
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live': return 'Mining Live';
      case 'historical': return 'Recently Active';
      case 'inactive': return 'Miner Offline';
      case 'error': return 'Connection Error';
      default: return 'Unknown Status';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return 'Never';

    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatHashrate = (hashrate: number) => {
    if (hashrate >= 1000000000) {
      return `${(hashrate / 1000000000).toFixed(2)} GH/s`;
    } else if (hashrate >= 1000000) {
      return `${(hashrate / 1000000).toFixed(2)} MH/s`;
    } else if (hashrate >= 1000) {
      return `${(hashrate / 1000).toFixed(2)} KH/s`;
    } else {
      return `${hashrate.toFixed(2)} H/s`;
    }
  };

  const formatXMR = (amount: number) => {
    return `${amount.toFixed(6)} XMR`;
  };

  const calculateEstimatedDailyEarnings = () => {
    if (!stats || !poolStats || stats.hashrate === 0 || poolStats.poolHashrate === 0) {
      return 0;
    }

    const share = stats.hashrate / poolStats.poolHashrate;
    const blocksPerDay = 720; // ~2 minute blocks
    const blockReward = 0.6; // Current Monero block reward (approximate)

    return share * blocksPerDay * blockReward;
  };

  if (loading && !stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 animate-pulse text-blue-500" />
            {t?.mining?.title || 'Live Mining Intelligence'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-muted-foreground">Loading mining statistics...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !stats) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            {t?.mining?.title || 'Live Mining Intelligence'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold mb-2 text-red-600">Connection Error</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {retryCount > 0 && `Retry attempts: ${retryCount}/3`}
            </p>
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const estimatedDaily = calculateEstimatedDailyEarnings();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            {t?.mining?.title || 'Live Mining Statistics'}
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              className={`${getStatusColor(stats?.status || 'inactive')} text-white px-3 py-1`}
            >
              <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
              {getStatusText(stats?.status || 'inactive')}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
              className="h-8"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Last updated: {lastUpdate.toLocaleTimeString()}
          {error && (
            <span className="text-red-500 ml-2">
              • {error.substring(0, 50)}...
            </span>
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Hashrate */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">HASHRATE</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {formatHashrate(stats?.hashrate || 0)}
            </p>
            <p className="text-xs text-blue-600">
              Current Mining Speed
            </p>
          </div>

          {/* Valid Shares */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="text-xs font-medium text-green-600">SHARES</span>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {(stats?.validShares || 0).toLocaleString()}
            </p>
            <p className="text-xs text-green-600">
              Valid Submissions
              {stats?.efficiency && (
                <span className="ml-1">({stats.efficiency.toFixed(1)}%)</span>
              )}
            </p>
          </div>

          {/* Amount Due */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <Coins className="w-5 h-5 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-600">PENDING</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900">
              {formatXMR(stats?.amtDue || 0)}
            </p>
            <p className="text-xs text-yellow-600">
              Awaiting Payout
            </p>
          </div>

          {/* Last Activity */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-medium text-purple-600">ACTIVITY</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {formatTimeAgo(stats?.lastHash || 0)}
            </p>
            <p className="text-xs text-purple-600">
              Last Hash Submitted
            </p>
          </div>
        </div>

        {/* Secondary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Total Hashes</span>
            </div>
            <p className="text-xl font-semibold">
              {(stats?.totalHashes || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Paid Out</span>
            </div>
            <p className="text-xl font-semibold">
              {formatXMR(stats?.amtPaid || 0)}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Transactions</span>
            </div>
            <p className="text-xl font-semibold">
              {stats?.txnCount || 0}
            </p>
          </div>
        </div>

        {/* Pool Information */}
        {poolStats && (
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Pool Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Pool Hashrate:</span>
                <p className="font-medium">{formatHashrate(poolStats.poolHashrate)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Connected Miners:</span>
                <p className="font-medium">{poolStats.poolMiners.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Blocks:</span>
                <p className="font-medium">{poolStats.totalBlocksFound.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Earnings Estimation */}
        {stats?.hashrate && poolStats?.poolHashrate && estimatedDaily > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Estimated Earnings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded">
                <span className="text-muted-foreground">Daily:</span>
                <p className="font-medium text-blue-700">
                  {formatXMR(estimatedDaily)}
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <span className="text-muted-foreground">Weekly:</span>
                <p className="font-medium text-blue-700">
                  {formatXMR(estimatedDaily * 7)}
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <span className="text-muted-foreground">Monthly:</span>
                <p className="font-medium text-blue-700">
                  {formatXMR(estimatedDaily * 30)}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * Estimates based on current pool conditions and may vary significantly
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveMiningStats;
