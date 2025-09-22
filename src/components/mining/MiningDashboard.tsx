import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Activity, Cpu, DollarSign, Users, Zap, TrendingUp, RefreshCw } from 'lucide-react';
import { miningService, MiningStats, PoolStats } from '../../services/miningService';
import { ecosystemService } from '../../services/ecosystemService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MiningDashboardProps {
  className?: string;
}

export const MiningDashboard: React.FC<MiningDashboardProps> = ({ className }) => {
  const [miningStats, setMiningStats] = useState<MiningStats | null>(null);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hashRateHistory, setHashRateHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMiningData();
    const interval = setInterval(loadMiningData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMiningData = async () => {
    try {
      if (!refreshing) setLoading(true);
      setRefreshing(true);

      const [mining, pool] = await Promise.all([
        miningService.getMiningStats(),
        miningService.getPoolStats()
      ]);

      setMiningStats(mining);
      setPoolStats(pool);

      // Add to hash rate history for chart
      const now = new Date();
      setHashRateHistory(prev => [
        ...prev.slice(-23), // Keep last 24 points
        {
          time: now.toLocaleTimeString(),
          hashrate: mining.hashrate,
          timestamp: now.toISOString()
        }
      ]);

      setError(null);
    } catch (err) {
      setError('Failed to load mining data');
      console.error('Mining data error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatHashRate = (hashrate: number): string => {
    return miningService.formatHashRate(hashrate);
  };

  const formatXMR = (amount: number): string => {
    return miningService.formatXMR(amount);
  };

  const connectToAgents = async () => {
    try {
      await ecosystemService.connectToEcosystem();
      await ecosystemService.sendMessageToAgent('eliza', 'Show current mining performance analysis for XMRT DAO');
    } catch (error) {
      console.error('Failed to connect to agents:', error);
    }
  };

  if (loading && !miningStats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Mining Dashboard</h2>
          <p className="text-gray-600">Real-time XMRT mining statistics</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadMiningData} 
            variant="outline" 
            size="sm" 
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={connectToAgents} variant="default" size="sm">
            <Zap className="w-4 h-4 mr-2" />
            Connect to AI Agents
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Mining Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Hashrate</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {miningStats ? formatHashRate(miningStats.hashrate) : '0 H/s'}
            </div>
            <p className="text-xs text-muted-foreground">
              {miningStats?.workers.length || 0} active workers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {miningStats ? formatXMR(miningStats.balance) : '0.000000 XMR'}
            </div>
            <p className="text-xs text-muted-foreground">
              {miningStats?.totalPayments || 0} total payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pool Miners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {poolStats?.poolMiners.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Pool: {poolStats ? formatHashRate(poolStats.poolHashrate) : '0 H/s'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Difficulty</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {poolStats?.networkDifficulty ? 
                (poolStats.networkDifficulty / 1e9).toFixed(2) + 'G' : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Network: {poolStats ? formatHashRate(poolStats.networkHashrate) : '0 H/s'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hashrate Chart */}
      {hashRateHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hashrate History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hashRateHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => `Time: ${value}`}
                    formatter={(value: number) => [formatHashRate(value), 'Hashrate']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="hashrate" 
                    stroke="#f97316" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Worker Details */}
      {miningStats?.workers && miningStats.workers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Workers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {miningStats.workers.map((worker, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{worker.identifier}</div>
                    <div className="text-sm text-gray-600">
                      Last share: {new Date(worker.lastShare).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-orange-600">
                      {formatHashRate(worker.hashrate)}
                    </div>
                    <Badge variant="secondary">
                      {worker.totalHashes.toLocaleString()} hashes
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* XMRT DAO Info */}
      <Card>
        <CardHeader>
          <CardTitle>XMRT DAO Mining Initiative</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">Mobile First</div>
              <p className="text-sm text-gray-600">Optimized for ARM processors</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">3-5+ KH/s</div>
              <p className="text-sm text-gray-600">SSB-enabled performance</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">DAO Powered</div>
              <p className="text-sm text-gray-600">Decentralized governance</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
