// Unified Data Service - Single source of truth for all XMRT data
export interface MiningStats {
  hashRate: number;
  validShares: number;
  totalHashes: number;
  amountDue: number;
  amountPaid: number;
  isOnline: boolean;
  lastUpdate: Date;
}

export interface UserContext {
  ip: string;
  isFounder: boolean;
  timestamp: number;
}

class UnifiedDataService {
  private miningStatsCache: { data: MiningStats | null; timestamp: number } = { data: null, timestamp: 0 };
  private userContextCache: { data: UserContext | null; timestamp: number } = { data: null, timestamp: 0 };
  private readonly CACHE_DURATION = 30000; // 30 seconds

  // Get user context (IP and founder status)
  async getUserContext(): Promise<UserContext> {
    const now = Date.now();
    
    // Return cached data if fresh
    if (this.userContextCache.data && (now - this.userContextCache.timestamp) < this.CACHE_DURATION) {
      return this.userContextCache.data;
    }

    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      const ip = data.ip || 'Unknown';
      
      // Check founder status
      const founderIP = localStorage.getItem('founderIP');
      if (!founderIP) {
        localStorage.setItem('founderIP', ip);
      }
      
      const isFounder = founderIP === ip || localStorage.getItem('isProjectFounder') === 'true';
      
      const userContext: UserContext = {
        ip,
        isFounder,
        timestamp: now
      };

      // Cache the result
      this.userContextCache = { data: userContext, timestamp: now };
      return userContext;
      
    } catch (error) {
      console.error('Failed to fetch user context:', error);
      
      // Return fallback data
      const fallback: UserContext = {
        ip: 'Unknown',
        isFounder: localStorage.getItem('isProjectFounder') === 'true',
        timestamp: now
      };
      
      this.userContextCache = { data: fallback, timestamp: now };
      return fallback;
    }
  }

  // Get mining statistics
  static async getMiningStats(): Promise<MiningStats | null> {
    try {
      console.log('📊 UnifiedData: Fetching mining statistics...');
      
      // Use Supabase proxy endpoint which handles CORS
      const response = await fetch('https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/mining-proxy');
      
      if (!response.ok) {
        console.warn('⚠️ Mining API request failed:', response.status);
        return null; // No mock data - return null if real data unavailable
      }
      
      const data = await response.json();
      console.log('✅ UnifiedData: Mining stats retrieved');
      
      return {
        hashRate: data.hash || 0,
        validShares: data.validShares || 0,
        totalHashes: data.totalHashes || 0,
        amountDue: (data.amtDue || 0) / 1000000000000, // Convert from atomic units
        amountPaid: (data.amtPaid || 0) / 1000000000000,
        isOnline: data.lastHash ? ((Date.now() / 1000) - data.lastHash) < 300 : false, // Online if last hash within 5 minutes
        lastUpdate: new Date()
      };
      
    } catch (error) {
      console.error('❌ UnifiedData: Mining stats error:', error);
      return null; // No fallback mock data - return null on error
    }
  }

  // Format mining stats for display - updated for new interface
  formatMiningStats(stats: MiningStats | null): string {
    if (!stats) return 'Mining statistics are currently unavailable.';

    const formatHashrate = (hashrate: number): string => {
      if (hashrate >= 1000000) {
        return `${(hashrate / 1000000).toFixed(2)} MH/s`;
      } else if (hashrate >= 1000) {
        return `${(hashrate / 1000).toFixed(2)} KH/s`;
      }
      return `${hashrate.toFixed(2)} H/s`;
    };

    return `📊 **Live Mining Statistics (SupportXMR Pool):**
• **Hash Rate**: ${formatHashrate(stats.hashRate)}
• **Status**: ${stats.isOnline ? '🟢 Mining (Online)' : '🔴 Idle (Offline)'}
• **Valid Shares**: ${stats.validShares.toLocaleString()}
• **Total Hashes**: ${stats.totalHashes.toLocaleString()}
• **Amount Due**: ${stats.amountDue.toFixed(6)} XMR
• **Amount Paid**: ${stats.amountPaid.toFixed(6)} XMR
• **Last Update**: ${stats.lastUpdate.toLocaleTimeString()}`;
  }

  // Clear all caches
  clearCache(): void {
    this.miningStatsCache = { data: null, timestamp: 0 };
    this.userContextCache = { data: null, timestamp: 0 };
  }

  // Get cache status for debugging
  getCacheStatus() {
    const now = Date.now();
    return {
      miningStats: {
        cached: !!this.miningStatsCache.data,
        age: now - this.miningStatsCache.timestamp,
        fresh: (now - this.miningStatsCache.timestamp) < this.CACHE_DURATION
      },
      userContext: {
        cached: !!this.userContextCache.data,
        age: now - this.userContextCache.timestamp,
        fresh: (now - this.userContextCache.timestamp) < this.CACHE_DURATION
      }
    };
  }
}

// Export singleton instance
export const unifiedDataService = new UnifiedDataService();