import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Activity, Hash, Coins, Clock, Zap, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface MiningStats {
  hash: number;
  validShares: number;
  invalidShares: number;
  lastHash: number;
  totalHashes: number;
  amtDue: number;
  amtPaid: number;
  txnCount: number;
  isOnline: boolean;
  isDemo?: boolean;
  demoNote?: string;
  status?: 'live' | 'demo' | 'fallback';
  error?: string;
  poolContext?: {
    poolHashrate: number;
    connectedMiners: number;
    networkDifficulty: number;
    blockHeight: number;
  };
}

const LiveMiningStats = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<MiningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchMiningStats = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke('mining-proxy');

      if (error) {
        throw new Error(`Supabase function error: ${error.message}`);
      }

      // Enhanced data processing
      const processedStats: MiningStats = {
        hash: data.hash || 0,
        validShares: data.validShares || 0,
        invalidShares: data.invalidShares || 0,
        lastHash: data.lastHash || 0,
        totalHashes: data.totalHashes || 0,
        amtDue: parseFloat(data.amtDue || 0),
        amtPaid: parseFloat(data.amtPaid || 0),
        txnCount: data.txnCount || 0,
        isOnline: data.lastHash > (Date.now() / 1000) - 300, // 5 minutes
        isDemo: data.isDemo || false,
        demoNote: data.demoNote,
        status: data.status || 'live',
        error: data.error,
        poolContext: data.poolContext
      };

      setStats(processedStats);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Mining stats fetch error:', err);
      setError(err instanceof Error ? err.message : "Failed to fetch mining stats");

      // Set fallback demo data on error
      setStats({
        hash: 3200,
        validShares: 45,
        invalidShares: 2,
        lastHash: Math.floor(Date.now() / 1000) - 30,
        totalHashes: 892000,
        amtDue: 0.003421,
        amtPaid: 0.089123,
        txnCount: 12,
        isOnline: true,
        isDemo: true,
        status: 'fallback',
        demoNote: "Demo data - Mining stats temporarily unavailable"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMiningStats();
    const interval = setInterval(fetchMiningStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatHashrate = (hashrate: number): string => {
    if (hashrate >= 1000000) {
      return `${(hashrate / 1000000).toFixed(2)} MH/s`;
    } else if (hashrate >= 1000) {
      return `${(hashrate / 1000).toFixed(2)} KH/s`;
    }
    return `${hashrate.toFixed(2)} H/s`;
  };

  const formatTimeAgo = (timestamp: number): string => {
    if (!timestamp) return "Never";
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
    if (seconds < 60) return `${seconds}s ${t('stats.ago') || 'ago'}`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${t('stats.ago') || 'ago'}`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${t('stats.ago') || 'ago'}`;
    return `${Math.floor(seconds / 86400)}d ${t('stats.ago') || 'ago'}`;
  };

  const formatXMR = (amount: number): string => {
    return `${amount.toFixed(6)} XMR`;
  };

  const getStatusColor = (status?: string, isOnline?: boolean) => {
    if (status === 'demo' || status === 'fallback') return 'text-yellow-500';
    return isOnline ? 'text-green-500' : 'text-red-500';
  };

  const getStatusText = (stats: MiningStats) => {
    if (stats.isDemo) {
      return stats.status === 'fallback' ? 'Demo Mode (Service Issue)' : 'Demo Mode';
    }
    return stats.isOnline ? 'Online' : 'Offline';
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card to-secondary border-border">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 animate-pulse" />
            {t('stats.title') || 'Loading Mining Stats...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-secondary border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <Activity className={`h-4 w-4 ${stats?.isOnline ? 'animate-pulse text-green-500' : 'text-red-500'}`} />
            {t('stats.title') || 'Live Mining Stats'}
            {stats?.isDemo && (
              <Badge variant="outline" className="text-xs">
                {stats.status === 'fallback' ? 'DEMO' : 'PREVIEW'}
              </Badge>
            )}
          </div>
          <button 
            onClick={fetchMiningStats}
            className="p-1 hover:bg-muted rounded-sm transition-colors"
            title="Refresh stats"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status and Demo Notice */}
        {stats?.demoNote && (
          <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-xs text-yellow-700 dark:text-yellow-400">
              {stats.demoNote}
            </span>
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Current Hashrate */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Hash className="h-4 w-4" />
              Current Hashrate
            </div>
            <div className={`text-lg font-bold ${getStatusColor(stats?.status, stats?.isOnline)}`}>
              {stats ? formatHashrate(stats.hash) : "0 H/s"}
            </div>
          </div>

          {/* Valid Shares */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Valid Shares
            </div>
            <div className="text-lg font-bold text-green-500">
              {stats?.validShares || 0}
            </div>
          </div>

          {/* Amount Due */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Coins className="h-4 w-4" />
              Amount Due
            </div>
            <div className="text-lg font-bold text-blue-500">
              {stats ? formatXMR(stats.amtDue) : "0.000000 XMR"}
            </div>
          </div>

          {/* Last Hash */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              Last Hash
            </div>
            <div className="text-lg font-bold">
              {stats ? formatTimeAgo(stats.lastHash) : "Never"}
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="pt-2 border-t border-border/50">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-muted-foreground">Total Hashes</div>
              <div className="font-medium">
                {stats?.totalHashes?.toLocaleString() || "0"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Paid Out</div>
              <div className="font-medium">
                {stats ? formatXMR(stats.amtPaid) : "0.000000 XMR"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Transactions</div>
              <div className="font-medium">
                {stats?.txnCount || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Pool Context */}
        {stats?.poolContext && (
          <div className="pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground mb-2">Pool Information</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Pool Hashrate: </span>
                <span className="font-medium">{formatHashrate(stats.poolContext.poolHashrate)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Connected Miners: </span>
                <span className="font-medium">{stats.poolContext.connectedMiners.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Activity className="h-4 w-4" />
              Status
            </div>
            <div className={`text-lg font-bold ${getStatusColor(stats?.status, stats?.isOnline)}`}>
              {stats ? getStatusText(stats) : 'Connecting...'}
            </div>
          </div>
          {stats?.status && (
            <Badge variant={stats.status === 'live' ? 'default' : 'secondary'} className="text-xs">
              {stats.status.toUpperCase()}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveMiningStats;