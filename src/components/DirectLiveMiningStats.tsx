import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Hash, Coins, Clock, Zap, TrendingUp, AlertCircle, RefreshCw, Users, Target, Gauge, Wifi, WifiOff } from "lucide-react";
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
  const [corsProxyStatus, setCorsProxyStatus] = useState<string>("checking");

  const fetchMiningData = async (showLoading: boolean = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      console.log("🔄 Fetching live mining data with CORS proxy...");
      setError(null);
      setCorsProxyStatus("connecting");

      // Fetch both mining stats and pool stats in parallel
      const [miningData, poolData] = await Promise.allSettled([
        directMiningService.getMiningStats(),
        directMiningService.getPoolStats()
      ]);

      console.log("🟢 Live mining data result:", miningData);
      console.log("🟢 Live pool data result:", poolData);

      let finalMiningData: DirectMiningStats;
      let finalPoolData: DirectPoolStats | null = null;

      // Handle mining stats result
      if (miningData.status === 'fulfilled') {
        finalMiningData = miningData.value;
        console.log("✅ Live mining stats successful:", finalMiningData);
        setCorsProxyStatus("connected");
      } else {
        console.log("❌ Mining stats failed, using fallback:", miningData.reason);
        setCorsProxyStatus("failed");
        // Provide fallback data for miners not actively mining
        finalMiningData = {
          hashrate: 0,
          status: 'offline',
          validShares: 0,
          invalidShares: 0,
          amountDue: 0,
          amountPaid: 0,
          balance: 0,
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
        console.log("❌ Pool stats failed:", poolData.reason);
        finalPoolData = null;
      }

      setStats(finalMiningData);
      setPoolStats(finalPoolData);
      setLastUpdate(new Date());
      setRetryCount(0);
    } catch (err) {
      console.error("❌ Error fetching mining data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch mining data");
      setCorsProxyStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const testCorsProxies = async () => {
    try {
      setLoading(true);
      setCorsProxyStatus("testing");
      console.log("🔍 Testing CORS proxy connectivity...");
      
      const results = await directMiningService.testCorsProxies();
      console.log("🔍 CORS proxy test results:", results);
      
      const workingProxies = results.filter(r => r.working);
      if (workingProxies.length > 0) {
        setCorsProxyStatus("available");
        console.log(`✅ ${workingProxies.length} CORS proxies working`);
      } else {
        setCorsProxyStatus("unavailable");
        console.log("❌ No CORS proxies working");
      }
    } catch (error) {
      console.error("❌ Error testing CORS proxies:", error);
      setCorsProxyStatus("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMiningData(true);
    const interval = setInterval(() => fetchMiningData(false), 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatHashrate = (hashrate: number) => {
    if (hashrate === 0) return "0 H/s";
    if (hashrate < 1000) return `${hashrate.toFixed(2)} H/s`;
    if (hashrate < 1000000) return `${(hashrate / 1000).toFixed(2)} kH/s`;
    if (hashrate < 1000000000) return `${(hashrate / 1000000).toFixed(2)} MH/s`;
    return `${(hashrate / 1000000000).toFixed(2)} GH/s`;
  };

  const formatXMR = (amount: number) => {
    return `${(amount / 1000000000000).toFixed(6)} XMR`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'mining': return 'bg-blue-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return t('mining.status.online') || 'Online';
      case 'mining': return t('mining.status.mining') || 'Mining';
      case 'offline': return t('mining.status.offline') || 'Offline';
      default: return t('mining.status.unknown') || 'Unknown';
    }
  };

  const getCorsStatusIcon = () => {
    switch (corsProxyStatus) {
      case 'connected': return <Wifi className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'error':
      case 'unavailable': return <WifiOff className="h-4 w-4 text-red-500" />;
      default: return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
    }
  };

  if (loading && !stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            {t('mining.loading') || 'Loading Mining Stats...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Connecting to SupportXMR pool via CORS proxy...
            </p>
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
            <AlertCircle className="h-5 w-5" />
            {t('mining.error') || 'Mining Stats Error'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-2">
            <Button onClick={() => fetchMiningData(true)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('mining.retry') || 'Retry'}
            </Button>
            <Button onClick={testCorsProxies} variant="outline">
              <Wifi className="h-4 w-4 mr-2" />
              Test CORS Proxies
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('mining.title') || 'Live Mining Statistics'}</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>
              {t('mining.lastUpdate') || 'Last Update'}: {lastUpdate.toLocaleTimeString()}
            </span>
            {getCorsStatusIcon()}
            <span className="text-xs">
              CORS: {corsProxyStatus}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchMiningData(true)} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('mining.refresh') || 'Refresh'}
          </Button>
          <Button 
            onClick={testCorsProxies} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <Wifi className="h-4 w-4 mr-2" />
            Test Proxies
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('mining.status.title') || 'Mining Status'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(stats?.status || 'offline')}`}></div>
            <span className="font-medium">{getStatusText(stats?.status || 'offline')}</span>
            {stats?.isOnline && (
              <Badge variant="secondary" className="ml-2">
                {t('mining.status.connected') || 'Connected'}
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Hash className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-sm text-muted-foreground">{t('mining.hashrate') || 'Hashrate'}</p>
              <p className="font-bold text-lg">{formatHashrate(stats?.hashrate || 0)}</p>
            </div>
            
            <div className="text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm text-muted-foreground">{t('mining.validShares') || 'Valid Shares'}</p>
              <p className="font-bold text-lg">{stats?.validShares || 0}</p>
            </div>
            
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <p className="text-sm text-muted-foreground">{t('mining.invalidShares') || 'Invalid Shares'}</p>
              <p className="font-bold text-lg">{stats?.invalidShares || 0}</p>
            </div>
            
            <div className="text-center">
              <Gauge className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-sm text-muted-foreground">{t('mining.totalHashes') || 'Total Hashes'}</p>
              <p className="font-bold text-lg">{stats?.totalHashes || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            {t('mining.earnings.title') || 'Earnings'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t('mining.earnings.balance') || 'Balance'}</p>
              <p className="font-bold text-xl text-green-600">{formatXMR(stats?.balance || 0)}</p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t('mining.earnings.due') || 'Amount Due'}</p>
              <p className="font-bold text-xl text-blue-600">{formatXMR(stats?.amountDue || 0)}</p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t('mining.earnings.paid') || 'Amount Paid'}</p>
              <p className="font-bold text-xl text-gray-600">{formatXMR(stats?.amountPaid || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pool Stats Card */}
      {poolStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('mining.pool.title') || 'Pool Statistics'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('mining.pool.hashrate') || 'Pool Hashrate'}</p>
                <p className="font-bold text-xl">{formatHashrate(poolStats.hashrate || 0)}</p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('mining.pool.miners') || 'Active Miners'}</p>
                <p className="font-bold text-xl">{poolStats.miners || 0}</p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('mining.pool.blocks') || 'Blocks Found'}</p>
                <p className="font-bold text-xl">{poolStats.totalBlocksFound?.toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Hash Info */}
      {stats?.lastHash && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('mining.lastHash.title') || 'Last Hash'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm break-all bg-gray-100 p-2 rounded">
              {stats.lastHash}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      <Card className={`border-2 ${corsProxyStatus === 'connected' ? 'border-green-200 bg-green-50' : corsProxyStatus === 'failed' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            {getCorsStatusIcon()}
            <span className="text-sm font-medium">
              SupportXMR Pool Connection: {corsProxyStatus}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Using CORS proxy to fetch data from pool.supportxmr.com:3333
          </p>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DirectLiveMiningStats;