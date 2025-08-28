import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Activity, Hash, Coins, Clock, Zap, TrendingUp } from "lucide-react";

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
}

const LiveMiningStats = () => {
  const [stats, setStats] = useState<MiningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchMiningStats = async () => {
    try {
      const response = await fetch(
        "https://www.supportxmr.com/api/miner/46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg/stats"
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setStats({
        hash: data.hash || 0,
        validShares: data.validShares || 0,
        invalidShares: data.invalidShares || 0,
        lastHash: data.lastHash || 0,
        totalHashes: data.totalHashes || 0,
        amtDue: data.amtDue || 0,
        amtPaid: data.amtPaid || 0,
        txnCount: data.txnCount || 0,
        isOnline: data.lastHash > (Date.now() / 1000) - 300 // 5 minutes
      });
      
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch mining stats");
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
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card to-secondary border-border animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Mining Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-6 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-card to-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Activity className="h-5 w-5" />
            Mining Stats Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <button 
            onClick={fetchMiningStats}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-secondary border-border relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-mining-info/5" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Live Mining Stats
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={stats?.isOnline ? "default" : "destructive"}
              className={stats?.isOnline ? "bg-mining-active animate-pulse-glow" : ""}
            >
              {stats?.isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      </CardHeader>
      <CardContent className="relative">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Hash className="h-4 w-4" />
              Current Hashrate
            </div>
            <div className="text-lg font-bold text-foreground">
              {stats ? formatHashrate(stats.hash) : "0 H/s"}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Valid Shares
            </div>
            <div className="text-lg font-bold text-foreground">
              {stats?.validShares.toLocaleString() || "0"}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              Last Hash
            </div>
            <div className="text-lg font-bold text-foreground">
              {stats ? formatTimeAgo(stats.lastHash) : "Never"}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Coins className="h-4 w-4" />
              Amount Due
            </div>
            <div className="text-lg font-bold text-foreground">
              {stats ? `${(stats.amtDue / 1000000000000).toFixed(6)} XMR` : "0 XMR"}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Zap className="h-4 w-4" />
              Total Hashes
            </div>
            <div className="text-lg font-bold text-foreground">
              {stats?.totalHashes.toLocaleString() || "0"}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Activity className="h-4 w-4" />
              Status
            </div>
            <div className={`text-lg font-bold ${stats?.isOnline ? 'text-mining-active' : 'text-mining-inactive'}`}>
              {stats?.isOnline ? "Mining" : "Idle"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveMiningStats;