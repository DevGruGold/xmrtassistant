import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Battery, Zap, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChargerStats {
  deviceFingerprint: string;
  deviceType: string;
  totalPopPoints: number;
  totalChargingSessions: number;
  avgEfficiency: number;
  batteryHealth: number;
  lastActive: string;
}

const XMRTChargerLeaderboard = () => {
  const [chargers, setChargers] = useState<ChargerStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc('get_xmrt_charger_leaderboard', {
        limit_count: 20
      });
      
      if (error) {
        console.error('Failed to fetch charger leaderboard:', error);
        return;
      }

      if (data && Array.isArray(data)) {
        setChargers(data.map(row => ({
          deviceFingerprint: row.device_fingerprint || 'Unknown',
          deviceType: row.device_type || 'Device',
          totalPopPoints: row.total_pop_points || 0,
          totalChargingSessions: row.total_charging_sessions || 0,
          avgEfficiency: row.avg_efficiency || 0,
          batteryHealth: row.battery_health || 0,
          lastActive: row.last_active || new Date().toISOString()
        })));
      }
    } catch (err) {
      console.error('Error fetching charger leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000); // Refresh every 30 seconds
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('xmrtcharger-updates')
      .on('broadcast', { event: 'charger_update' }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const anonymizeFingerprint = (fingerprint: string) => {
    if (fingerprint.length < 16) return fingerprint;
    return `${fingerprint.substring(0, 8)}...${fingerprint.substring(fingerprint.length - 4)}`;
  };

  return (
    <Card className="bg-card/50 border-border shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Battery className="h-6 w-6 text-green-500" />
              XMRT Charger Leaderboard
            </CardTitle>
            <CardDescription>
              Top battery chargers earning PoP points
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-green-500" />
            <span>{chargers.length} Active</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : chargers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active chargers found - start charging to appear here!
          </div>
        ) : (
          <div className="space-y-3">
            {chargers.map((charger, index) => (
              <div
                key={charger.deviceFingerprint}
                className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-background to-green-500/10 border border-border hover:border-green-500/50 transition-all duration-300"
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 text-green-500 font-bold text-lg">
                  {index === 0 ? (
                    <Award className="h-6 w-6 text-yellow-500" />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Device Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-semibold text-foreground truncate">
                      {anonymizeFingerprint(charger.deviceFingerprint)}
                    </span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-secondary rounded-full">
                      {charger.deviceType}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-green-500" />
                      <span className="text-muted-foreground">
                        {charger.totalPopPoints.toFixed(2)} PoP
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Battery className="h-3 w-3 text-blue-500" />
                      <span className="text-muted-foreground">
                        {charger.totalChargingSessions} sessions
                      </span>
                    </div>
                    {charger.avgEfficiency > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-green-500">⚡</span>
                        <span className="text-muted-foreground">
                          {charger.avgEfficiency.toFixed(0)}% eff
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Battery Health & Status */}
                <div className="hidden sm:flex flex-col items-end gap-1">
                  {charger.batteryHealth > 0 && (
                    <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-semibold">
                      {charger.batteryHealth}% Health
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {formatTime(charger.lastActive)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground text-center">
          🔴 LIVE • Updates every 30 seconds • Earn PoP points by charging
        </div>
      </CardContent>
    </Card>
  );
};

export default XMRTChargerLeaderboard;
