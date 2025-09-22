import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Zap, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  DollarSign,
  Users,
  Blocks,
  Gauge
} from 'lucide-react';
import { miningService, MiningStats, PoolStats, EarningsEstimate } from '@/services/miningService';

interface LiveMiningStatsProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const LiveMiningStats: React.FC<LiveMiningStatsProps> = ({ 
  className = '',
  autoRefresh = true,
  refreshInterval = 30000 
}) => {
  const [miningStats, setMiningStats] = useState<MiningStats | null>(null);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [earnings, setEarnings] = useState<EarningsEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch mining data
  const fetchMiningData = async (showLoading = false) => {
    try {
      if (showLoading) setIsRefreshing(true);
      setError(null);

      console.log('🔄 Fetching mining data...');

      // Fetch mining and pool stats in parallel
      const [miningData, poolData] = await Promise.all([
        miningService.getMiningStats(),
        miningService.getPoolStats()
      ]);

      setMiningStats(miningData);
      setPoolStats(poolData);

      // Calculate earnings if we have both datasets
      if (miningData.hashrate > 0 && poolData.poolHashrate > 0) {
        const estimatedEarnings = miningService.calculateEstimatedEarnings(
          miningData.hashrate,
          poolData.poolHashrate
        );
        setEarnings(estimatedEarnings);
      } else {
        setEarnings({ daily: 0, weekly: 0, monthly: 0, yearly: 0 });
      }

      setLastUpdate(new Date());
      setLoading(false);

      console.log('✅ Mining data updated successfully');

    } catch (err: any) {
      console.error('❌ Failed to fetch mining data:', err);
      setError(err.message || 'Failed to fetch mining data');
      setLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchMiningData();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchMiningData();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Manual refresh handler
  const handleRefresh = () => {
    fetchMiningData(true);
  };

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Status text helper
  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  // Efficiency color helper
  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return 'text-green-600';
    if (efficiency >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Mining Statistics
          </CardTitle>
          <CardDescription>Real-time mining performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading mining data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Mining Data Error
          </CardTitle>
          <CardDescription>Failed to load mining statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Main Mining Stats Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Mining Statistics
              </CardTitle>
              <CardDescription>
                Real-time performance • Last update: {lastUpdate?.toLocaleTimeString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                {miningStats?.isOnline ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span className={`h-2 w-2 rounded-full ${getStatusColor(miningStats.status)}`} />
                    {getStatusText(miningStats.status)}
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    Offline
                  </>
                )}
              </Badge>
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Primary Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                Hashrate
              </div>
              <div className="text-2xl font-bold">
                {miningStats ? miningService.formatHashrate(miningStats.hashrate) : '0 H/s'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Amount Due
              </div>
              <div className="text-2xl font-bold">
                {miningStats ? miningService.formatXMR(miningStats.amtDue, 4) : '0.0000 XMR'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Valid Shares
              </div>
              <div className="text-2xl font-bold">
                {miningStats?.validShares?.toLocaleString() || '0'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Gauge className="h-4 w-4" />
                Efficiency
              </div>
              <div className={`text-2xl font-bold ${getEfficiencyColor(miningStats?.efficiency || 0)}`}>
                {miningStats?.efficiency?.toFixed(1) || '0.0'}%
              </div>
            </div>
          </div>

          <Separator />

          {/* Pool Statistics */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pool Statistics
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Pool Hashrate</div>
                <div className="text-lg font-semibold">
                  {poolStats ? miningService.formatHashrate(poolStats.poolHashrate) : '0 H/s'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Active Miners</div>
                <div className="text-lg font-semibold">
                  {poolStats?.poolMiners?.toLocaleString() || '0'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Blocks Found</div>
                <div className="text-lg font-semibold">
                  {poolStats?.totalBlocksFound?.toLocaleString() || '0'}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Earnings Estimate */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Estimated Earnings
            </h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Daily</div>
                <div className="text-sm font-semibold">
                  {earnings ? miningService.formatXMR(earnings.daily, 6) : '0.000000 XMR'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Weekly</div>
                <div className="text-sm font-semibold">
                  {earnings ? miningService.formatXMR(earnings.weekly, 6) : '0.000000 XMR'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Monthly</div>
                <div className="text-sm font-semibold">
                  {earnings ? miningService.formatXMR(earnings.monthly, 6) : '0.000000 XMR'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Yearly</div>
                <div className="text-sm font-semibold">
                  {earnings ? miningService.formatXMR(earnings.yearly, 4) : '0.0000 XMR'}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Indicators */}
          {miningStats?.efficiency !== undefined && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Mining Performance</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Share Efficiency</span>
                    <span className={getEfficiencyColor(miningStats.efficiency)}>
                      {miningStats.efficiency.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={miningStats.efficiency} 
                    className="h-2"
                  />
                </div>
              </div>
            </>
          )}

          {/* Additional Mining Details */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Total Paid</div>
              <div className="text-sm">
                {miningStats ? miningService.formatXMR(miningStats.amtPaid, 4) : '0.0000 XMR'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Payments Count</div>
              <div className="text-sm">
                {miningStats?.txnCount?.toLocaleString() || '0'}
              </div>
            </div>
          </div>

          {/* Last Seen Information */}
          {miningStats?.lastSeen && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Clock className="h-3 w-3" />
              Last seen: {miningStats.lastSeen.toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workers Details (if available) */}
      {miningStats?.workers && miningStats.workers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mining Workers</CardTitle>
            <CardDescription>Individual worker performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {miningStats.workers.map((worker, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{worker.identifier}</div>
                    <div className="text-sm text-muted-foreground">
                      {miningService.formatHashrate(worker.hashrate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getEfficiencyColor(worker.efficiency)}`}>
                      {worker.efficiency.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {worker.validShares} shares
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveMiningStats;
