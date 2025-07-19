import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Smartphone, TrendingUp, Users, Zap } from 'lucide-react';

const MobileMoneroCalculator = () => {
  const [hashrate, setHashrate] = useState([600]); // H/s
  const [users, setUsers] = useState([100]); // Number of users

  // Monero mining constants (approximate current values)
  const moneroPrice = 300; // $300 per XMR
  const networkHashrate = 2.8e9; // ~2.8 GH/s network hashrate
  const blockReward = 0.6; // ~0.6 XMR per block
  const blockTime = 120; // 2 minutes per block

  const calculations = useMemo(() => {
    const totalHashrate = hashrate[0] * users[0];
    const shareOfNetwork = totalHashrate / networkHashrate;
    const xmrPerDay = (shareOfNetwork * blockReward * (24 * 60 * 60)) / blockTime;
    const usdPerDay = xmrPerDay * moneroPrice;
    const xmrPerMonth = xmrPerDay * 30;
    const usdPerMonth = xmrPerMonth * moneroPrice;
    const xmrPerYear = xmrPerDay * 365;
    const usdPerYear = xmrPerYear * moneroPrice;

    return {
      totalHashrate,
      shareOfNetwork: shareOfNetwork * 100,
      xmrPerDay,
      usdPerDay,
      xmrPerMonth,
      usdPerMonth,
      xmrPerYear,
      usdPerYear,
    };
  }, [hashrate, users]);

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(decimals);
  };

  return (
    <div className="space-y-6">
      {/* MobileMonero Information */}
      <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white">
            <Smartphone className="h-6 w-6 text-purple-400" />
            MobileMonero.com Powers XMRT DAO
          </CardTitle>
          <CardDescription className="text-gray-300">
            Revolutionary mobile mining technology fueling decentralized finance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-purple-400">How It Works</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Mobile devices mine Monero using optimized algorithms</li>
                <li>• Mining rewards fund XMRT DAO operations</li>
                <li>• Decentralized network of mobile miners worldwide</li>
                <li>• Sustainable and accessible cryptocurrency mining</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-blue-400">DAO Benefits</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Self-sustaining treasury through mining revenue</li>
                <li>• Democratic governance powered by mining participants</li>
                <li>• Environmental efficiency through mobile devices</li>
                <li>• Global accessibility without specialized hardware</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mining Calculator */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white">
            <TrendingUp className="h-6 w-6 text-green-400" />
            MobileMonero Mining Calculator
          </CardTitle>
          <CardDescription className="text-gray-400">
            Calculate potential earnings from mobile Monero mining
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Average Hashrate per Device</Label>
                <span className="text-purple-400 font-mono">{hashrate[0]} H/s</span>
              </div>
              <Slider
                value={hashrate}
                onValueChange={setHashrate}
                max={1200}
                min={200}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>200 H/s</span>
                <span>1,200 H/s</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Number of Mining Devices</Label>
                <span className="text-blue-400 font-mono">{formatNumber(users[0], 0)}</span>
              </div>
              <Slider
                value={users}
                onValueChange={setUsers}
                max={1000000}
                min={1}
                step={users[0] < 1000 ? 1 : users[0] < 10000 ? 10 : users[0] < 100000 ? 100 : 1000}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1</span>
                <span>1M</span>
              </div>
            </div>
          </div>

          {/* Network Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900/50 p-3 rounded-lg text-center">
              <div className="text-purple-400 font-mono text-lg">
                {formatNumber(calculations.totalHashrate)} H/s
              </div>
              <div className="text-xs text-gray-400">Total Hashrate</div>
            </div>
            <div className="bg-gray-900/50 p-3 rounded-lg text-center">
              <div className="text-blue-400 font-mono text-lg">
                {calculations.shareOfNetwork.toFixed(4)}%
              </div>
              <div className="text-xs text-gray-400">Network Share</div>
            </div>
            <div className="bg-gray-900/50 p-3 rounded-lg text-center">
              <div className="text-green-400 font-mono text-lg">
                ${moneroPrice}
              </div>
              <div className="text-xs text-gray-400">XMR Price</div>
            </div>
            <div className="bg-gray-900/50 p-3 rounded-lg text-center">
              <div className="text-yellow-400 font-mono text-lg">
                {formatNumber(networkHashrate / 1e9, 1)} GH/s
              </div>
              <div className="text-xs text-gray-400">Network Hashrate</div>
            </div>
          </div>

          {/* Earnings Projections */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Projected Earnings
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-700/50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {calculations.xmrPerDay.toFixed(4)} XMR
                  </div>
                  <div className="text-green-300 font-mono">
                    ${calculations.usdPerDay.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-400">Daily</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-700/50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {calculations.xmrPerMonth.toFixed(2)} XMR
                  </div>
                  <div className="text-blue-300 font-mono">
                    ${formatNumber(calculations.usdPerMonth)}
                  </div>
                  <div className="text-sm text-gray-400">Monthly</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-700/50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {formatNumber(calculations.xmrPerYear)} XMR
                  </div>
                  <div className="text-purple-300 font-mono">
                    ${formatNumber(calculations.usdPerYear)}
                  </div>
                  <div className="text-sm text-gray-400">Yearly</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">
              <strong>Disclaimer:</strong> These calculations are estimates based on current network conditions. 
              Actual earnings may vary due to network difficulty changes, XMR price fluctuations, and device performance variations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileMoneroCalculator;