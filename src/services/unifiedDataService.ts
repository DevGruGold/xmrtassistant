// Unified Data Service - Single source of truth for all XMRT data
export interface MiningStats {
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

  // Get mining statistics from primary source
  async getMiningStats(): Promise<MiningStats | null> {
    const now = Date.now();
    
    // Return cached data if fresh
    if (this.miningStatsCache.data && (now - this.miningStatsCache.timestamp) < this.CACHE_DURATION) {
      return this.miningStatsCache.data;
    }

    try {
      // Use the working API endpoint
      const response = await fetch(
        "https://www.supportxmr.com/api/miner/46UxNFuGM2E3UwmZWWJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg/stats"
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      const miningStats: MiningStats = {
        hash: data.hash || 0,
        validShares: data.validShares || 0,
        invalidShares: data.invalidShares || 0,
        lastHash: data.lastHash || 0,
        totalHashes: data.totalHashes || 0,
        amtDue: data.amtDue || 0,
        amtPaid: data.amtPaid || 0,
        txnCount: data.txnCount || 0,
        isOnline: data.lastHash > (Date.now() / 1000) - 300
      };

      // Cache the result
      this.miningStatsCache = { data: miningStats, timestamp: now };
      return miningStats;
      
    } catch (error) {
      console.error('Failed to fetch mining stats:', error);
      
      // Keep old cached data if available
      if (this.miningStatsCache.data) {
        return this.miningStatsCache.data;
      }
      
      return null;
    }
  }

  // Format mining stats for display - matching dashboard format exactly
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

    const formatTimeAgo = (timestamp: number): string => {
      if (!timestamp) return "Never";
      const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
      if (seconds < 60) return `${seconds}s ago`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      return `${Math.floor(seconds / 86400)}d ago`;
    };

    return `📊 **Live Mining Statistics (SupportXMR Pool):**
• **Hash Rate**: ${formatHashrate(stats.hash)}
• **Status**: ${stats.isOnline ? '🟢 Mining (Online)' : '🔴 Idle (Offline)'}
• **Valid Shares**: ${stats.validShares.toLocaleString()}
• **Invalid Shares**: ${stats.invalidShares.toLocaleString()}
• **Total Hashes**: ${stats.totalHashes.toLocaleString()}
• **Amount Due**: ${(stats.amtDue / 1000000000000).toFixed(6)} XMR
• **Amount Paid**: ${(stats.amtPaid / 1000000000000).toFixed(6)} XMR
• **Last Hash**: ${formatTimeAgo(stats.lastHash)}`;
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
