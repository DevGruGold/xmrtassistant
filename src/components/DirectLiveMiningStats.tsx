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
      console.log("🔄 Fetching direct mining data...");
      setError(null);

      // Fetch both mining stats and pool stats in parallel
      const [miningData, poolData] = await Promise.allSettled([
        directMiningService.getMiningStats(),
        directMiningService.getPoolStats()
      ]);

      console.log("📊 Direct mining data fetch result:", miningData);
      console.log("🏊 Direct pool data fetch result:", poolData);

      let finalMiningData: DirectMiningStats;
      let finalPoolData: DirectPoolStats | null = null;

      // Handle mining stats result
      if (miningData.status === 'fulfilled') {
        finalMiningData = miningData.value;
        console.log("✅ Direct mining stats successful:", finalMiningData);
      } else {
        console.warn("⚠️ Direct mining stats failed:", miningData.reason);
        // Provide fallback data
        finalMiningData = {
          hashrate: 0,
          status: 'error',
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
        console.log("✅ Direct pool stats successful:", finalPoolData);
      } else {
        console.warn("⚠️ Direct pool stats failed:", poolData.reason);
        finalPoolData = null;
      }

      setStats(finalMiningData);
      setPoolStats(finalPoolData);
      setLastUpdate(new Date());
      setRetryCount(0);

    } catch (error) {
      console.error("❌ Fatal error in direct mining data fetch:", error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchMiningData(true);

    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      fetchMiningData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Auto-retry on errors with exponential backoff
  useEffect(() => {
    if (error && retryCount < 5) {
      const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      console.log(`🔄 Retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/5)`);

      const retryTimer = setTimeout(() => {
        fetchMiningData(false);
      }, backoffDelay);

      return () => clearTimeout(retryTimer);
    }
  }, [error, retryCount]);

  const formatHashRate = (hashRate: number): string => {
    return directMiningService.formatHashrate(hashRate);
  };

  const formatXMR = (amount: number): string => {
    return directMiningService.formatXMR(amount);
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatTimeAgo = (date?: Date): string => {
    if (!date) return "Never";

    const now = Date.now();
    const diff = now - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getStatusColor = (status: DirectMiningStats['status']) => {
    switch (status) {
      case 'online': return 'bg-mining-active text-mining-active-foreground';
      case 'offline': return 'bg-mining-inactive text-mining-inactive-foreground';
      case 'error': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusText = (status: DirectMiningStats['status']) => {
    switch (status) {
      case 'online': return 'Miner Online';
      case 'offline': return 'Miner Offline';
      case 'error': return 'Connection Error';
      default: return 'Unknown Status';
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto animate-pulse">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-muted rounded w-48"></div>
            <div className="h-5 bg-muted rounded w-24"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto border-mining-info/20 bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-mining-info" />
            Live Mining Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(stats?.status || 'error')}>
              {getStatusText(stats?.status || 'error')}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMiningData(true)}
              disabled={loading}
              className="h-8"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              {error} {retryCount > 0 && `(Retry ${retryCount}/5)`}
            </span>
          </div>
        )}

        {/* Mining Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-mining-info/5 border border-mining-info/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="h-4 w-4 text-mining-info" />
              <span className="text-sm font-medium text-foreground">Current Hashrate</span>
            </div>
            <div className="text-2xl font-bold text-mining-info">
              {stats ? formatHashRate(stats.hashrate) : '0.00 H/s'}
            </div>
          </div>

          <div className="p-4 bg-mining-active/5 border border-mining-active/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-mining-active" />
              <span className="text-sm font-medium text-foreground">Valid Shares</span>
            </div>
            <div className="text-2xl font-bold text-mining-active">
              {stats ? formatNumber(stats.validShares) : '0'}
            </div>
          </div>

          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Amount Due</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {stats ? formatXMR(stats.amountDue) : '0.000000 XMR'}
            </div>
          </div>

          <div className="p-4 bg-secondary/10 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-secondary-foreground" />
              <span className="text-sm font-medium text-foreground">Last Hash</span>
            </div>
            <div className="text-sm font-mono text-secondary-foreground truncate">
              {stats?.lastHash || 'Never'}
            </div>
          </div>

          <div className="p-4 bg-secondary/10 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-secondary-foreground" />
              <span className="text-sm font-medium text-foreground">Total Hashes</span>
            </div>
            <div className="text-lg font-bold text-secondary-foreground">
              {stats ? formatNumber(stats.totalHashes) : '0'}
            </div>
          </div>

          <div className="p-4 bg-secondary/10 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-secondary-foreground" />
              <span className="text-sm font-medium text-foreground">Paid Out</span>
            </div>
            <div className="text-lg font-bold text-secondary-foreground">
              {stats ? formatXMR(stats.amountPaid) : '0.000000 XMR'}
            </div>
          </div>
        </div>

        {/* Pool Information */}
        {poolStats && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-mining-info" />
              Pool Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 border border-border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Pool Hashrate:</div>
                <div className="text-xl font-bold text-foreground">
                  {formatHashRate(poolStats.poolHashrate)}
                </div>
              </div>
              <div className="p-4 bg-muted/30 border border-border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Connected Miners:</div>
                <div className="text-xl font-bold text-foreground">
                  {formatNumber(poolStats.poolMiners)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Indicator */}
        <div className="mt-4 p-3 bg-muted/20 border border-border rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium text-foreground">
              {stats?.isOnline ? '🟢 Online' : '🔴 Offline'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DirectLiveMiningStats;
