// Enhanced Mining Service with Real-time SupportXMR Integration
import axios from 'axios';

export interface MiningStats {
  hashrate: number;
  status: 'online' | 'offline' | 'error';
  validShares: number;
  invalidShares: number;
  amtDue: number;
  amtPaid: number;
  txnCount: number;
  roundShares: number;
  isOnline: boolean;
  efficiency?: number;
  lastSeen?: Date;
  workers?: WorkerStats[];
}

export interface WorkerStats {
  identifier: string;
  hashrate: number;
  lastSeen: Date;
  validShares: number;
  invalidShares: number;
  efficiency: number;
}

export interface PoolStats {
  poolHashrate: number;
  poolMiners: number;
  totalBlocksFound: number;
  networkDifficulty: number;
  networkHashrate: number;
  lastBlockFound: Date;
  effort: number;
}

export interface EarningsEstimate {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

class MiningService {
  private readonly WALLET_ADDRESS = import.meta.env.VITE_XMRT_POOL_WALLET || 
    '46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg';

  private readonly API_BASE = import.meta.env.VITE_SUPPORTXMR_API || 'https://supportxmr.com/api';
  private readonly UPDATE_INTERVAL = parseInt(import.meta.env.VITE_MINING_UPDATE_INTERVAL || '30000');
  private readonly TIMEOUT = parseInt(import.meta.env.VITE_MINING_TIMEOUT || '15000');
  private readonly RETRY_ATTEMPTS = parseInt(import.meta.env.VITE_MINING_RETRY_ATTEMPTS || '3');

  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor() {
    console.log('🔧 Mining Service initialized');
    console.log(`📧 Wallet: ${this.WALLET_ADDRESS.substring(0, 8)}...${this.WALLET_ADDRESS.substring(-8)}`);
    console.log(`🌐 API Base: ${this.API_BASE}`);
  }

  // Validate Monero wallet address
  isValidMoneroAddress(address: string): boolean {
    const moneroRegex = /^[48][0-9AB][0-9A-Za-z]{93}$/;
    return moneroRegex.test(address);
  }

  // Format hashrate with appropriate units
  formatHashrate(hashrate: number): string {
    if (hashrate >= 1000000) {
      return `${(hashrate / 1000000).toFixed(2)} MH/s`;
    } else if (hashrate >= 1000) {
      return `${(hashrate / 1000).toFixed(2)} KH/s`;
    } else {
      return `${hashrate.toFixed(0)} H/s`;
    }
  }

  // Format XMR amounts with proper decimals
  formatXMR(amount: number, decimals: number = 6): string {
    return `${amount.toFixed(decimals)} XMR`;
  }

  // Cache management
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCached(key: string, data: any, ttl: number = 30000): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  // Make HTTP request with retry logic
  private async makeRequest(url: string, retries: number = this.RETRY_ATTEMPTS): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Request attempt ${attempt}/${retries}: ${url}`);

        const response = await axios.get(url, {
          timeout: this.TIMEOUT,
          headers: {
            'User-Agent': 'XMRT-Assistant/1.0',
            'Accept': 'application/json'
          }
        });

        if (response.status === 200) {
          console.log(`✅ Request successful: ${url}`);
          return response.data;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      } catch (error: any) {
        console.warn(`⚠️  Request attempt ${attempt} failed:`, error.message);

        if (attempt === retries) {
          throw new Error(`Failed after ${retries} attempts: ${error.message}`);
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Get mining statistics for the wallet
  async getMiningStats(): Promise<MiningStats> {
    const cacheKey = `stats_${this.WALLET_ADDRESS}`;
    const cached = this.getCached<MiningStats>(cacheKey);

    if (cached) {
      console.log('📊 Using cached mining stats');
      return cached;
    }

    try {
      console.log('🔍 Fetching mining statistics...');

      if (!this.isValidMoneroAddress(this.WALLET_ADDRESS)) {
        throw new Error('Invalid Monero wallet address');
      }

      const url = `${this.API_BASE}/miner/${this.WALLET_ADDRESS}/stats`;
      const data = await this.makeRequest(url);

      // Transform API response to our interface
      const stats: MiningStats = {
        hashrate: data.hash || data.hashrate || 0,
        status: this.determineStatus(data),
        validShares: data.validShares || 0,
        invalidShares: data.invalidShares || 0,
        amtDue: (data.amtDue || 0) / 1e12, // Convert from atomic units
        amtPaid: (data.amtPaid || 0) / 1e12,
        txnCount: data.txnCount || 0,
        roundShares: data.roundShares || 0,
        isOnline: (data.hash || data.hashrate || 0) > 0,
        efficiency: this.calculateEfficiency(data.validShares || 0, data.invalidShares || 0),
        lastSeen: data.lastHash ? new Date(data.lastHash * 1000) : new Date(),
        workers: this.parseWorkers(data.workers || [])
      };

      this.setCached(cacheKey, stats);
      console.log('✅ Mining stats retrieved successfully');

      return stats;

    } catch (error: any) {
      console.error('❌ Failed to fetch mining stats:', error.message);

      // Return default stats on error
      return {
        hashrate: 0,
        status: 'error',
        validShares: 0,
        invalidShares: 0,
        amtDue: 0,
        amtPaid: 0,
        txnCount: 0,
        roundShares: 0,
        isOnline: false,
        lastSeen: new Date()
      };
    }
  }

  // Get pool statistics
  async getPoolStats(): Promise<PoolStats> {
    const cacheKey = 'pool_stats';
    const cached = this.getCached<PoolStats>(cacheKey);

    if (cached) {
      console.log('📊 Using cached pool stats');
      return cached;
    }

    try {
      console.log('🔍 Fetching pool statistics...');

      const url = `${this.API_BASE}/pool/stats`;
      const data = await this.makeRequest(url);

      const stats: PoolStats = {
        poolHashrate: data.pool_statistics?.hashrate || 0,
        poolMiners: data.pool_statistics?.miners || 0,
        totalBlocksFound: data.pool_statistics?.totalBlocks || 0,
        networkDifficulty: data.network?.difficulty || 0,
        networkHashrate: data.network?.hashrate || 0,
        lastBlockFound: data.pool_statistics?.lastBlockFound ? 
          new Date(data.pool_statistics.lastBlockFound * 1000) : new Date(),
        effort: data.pool_statistics?.effort || 0
      };

      this.setCached(cacheKey, stats, 60000); // Cache pool stats for 1 minute
      console.log('✅ Pool stats retrieved successfully');

      return stats;

    } catch (error: any) {
      console.error('❌ Failed to fetch pool stats:', error.message);

      // Return default stats on error
      return {
        poolHashrate: 0,
        poolMiners: 0,
        totalBlocksFound: 0,
        networkDifficulty: 0,
        networkHashrate: 0,
        lastBlockFound: new Date(),
        effort: 0
      };
    }
  }

  // Calculate estimated earnings
  calculateEstimatedEarnings(minerHashrate: number, poolHashrate: number): EarningsEstimate {
    if (minerHashrate <= 0 || poolHashrate <= 0) {
      return { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
    }

    // Approximate XMR per day based on hashrate ratio
    // This is a rough estimate and actual earnings may vary
    const networkRewardPerDay = 2160; // Approximate XMR rewards per day network-wide
    const poolShare = 0.1; // Assume pool has ~10% of network hashrate
    const minerShare = minerHashrate / poolHashrate;

    const dailyEarnings = networkRewardPerDay * poolShare * minerShare;

    return {
      daily: dailyEarnings,
      weekly: dailyEarnings * 7,
      monthly: dailyEarnings * 30,
      yearly: dailyEarnings * 365
    };
  }

  // Helper methods
  private determineStatus(data: any): 'online' | 'offline' | 'error' {
    const hashrate = data.hash || data.hashrate || 0;
    const lastSeen = data.lastHash || 0;
    const timeSinceLastSeen = Date.now() / 1000 - lastSeen;

    if (hashrate > 0 && timeSinceLastSeen < 300) { // Online if hashrate > 0 and seen within 5 minutes
      return 'online';
    } else if (timeSinceLastSeen < 3600) { // Offline if seen within 1 hour
      return 'offline';
    } else {
      return 'error';
    }
  }

  private calculateEfficiency(validShares: number, invalidShares: number): number {
    const totalShares = validShares + invalidShares;
    return totalShares > 0 ? (validShares / totalShares) * 100 : 0;
  }

  private parseWorkers(workersData: any[]): WorkerStats[] {
    return workersData.map(worker => ({
      identifier: worker.id || worker.identifier || 'Unknown',
      hashrate: worker.hash || worker.hashrate || 0,
      lastSeen: worker.lastHash ? new Date(worker.lastHash * 1000) : new Date(),
      validShares: worker.validShares || 0,
      invalidShares: worker.invalidShares || 0,
      efficiency: this.calculateEfficiency(worker.validShares || 0, worker.invalidShares || 0)
    }));
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️  Mining service cache cleared');
  }

  // Get service health
  async getServiceHealth(): Promise<{ status: string; latency: number; lastUpdate: Date }> {
    const start = Date.now();

    try {
      await this.makeRequest(`${this.API_BASE}/pool/stats`);
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency,
        lastUpdate: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        lastUpdate: new Date()
      };
    }
  }
}

// Export singleton instance
export const miningService = new MiningService();
export default miningService;
