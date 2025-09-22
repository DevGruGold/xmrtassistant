import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Activity, Hash, Coins, Clock, Zap, TrendingUp, AlertCircle, RefreshCw, Users } from "lucide-react";
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

      console.log("✅ Mining data updated successfully:", combinedStats);

    } catch (err) {
      console.error("❌ Failed to fetch mining data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch mining stats");
      setLoading(false);
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
      case 'live': return 'Online';
      case 'historical': return 'Recently Active';
      case 'inactive': return 'Inactive';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading && !stats) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t ? t('Live Mining Statistics') : 'Live Mining Statistics'}</h2>
          <div className="flex items-center text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {t ? t('Live Mining Statistics') : 'Live Mining Statistics'}
          </h2>
          <p className="text-muted-foreground">
            Real-time mining performance and pool statistics
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-2" />
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      {stats && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${getStatusColor(stats.status)}`}></div>
                <span className="font-semibold">
                  Miner Status: {getStatusText(stats.status)}
                </span>
                {stats.lastHash > 0 && (
                  <span className="text-muted-foreground text-sm">
                    Last activity: {formatTimeAgo(stats.lastHash)}
                  </span>
                )}
              </div>

              {error && (
                <div className="flex items-center text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mining Statistics Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Hashrate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Hashrate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {miningService.formatHashrate(stats.hashrate)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.isOnline ? (
                  <span className="text-green-500">● Active mining</span>
                ) : (
                  <span className="text-red-500">● Offline</span>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Balance Due */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {miningService.formatXMR(stats.amtDue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum payout: 0.1 XMR
              </p>
            </CardContent>
          </Card>

          {/* Valid Shares */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valid Shares</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.validShares.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.invalidShares > 0 ? (
                  <span className="text-red-500">
                    {stats.invalidShares} invalid
                  </span>
                ) : (
                  <span className="text-green-500">No invalid shares</span>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Total Hashes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hashes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.totalHashes / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-muted-foreground">
                All time hashes submitted
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pool Statistics */}
      {poolStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pool Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Pool Hashrate</div>
                <div className="text-2xl font-bold">
                  {miningService.formatHashrate(poolStats.poolHashrate)}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">Connected Miners</div>
                <div className="text-2xl font-bold">
                  {poolStats.poolMiners.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">Blocks Found</div>
                <div className="text-2xl font-bold">
                  {poolStats.totalBlocksFound.toLocaleString()}
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
