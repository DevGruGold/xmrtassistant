import axios from 'axios';

export interface MiningStats {
  hashrate: number;
  totalHashes: number;
  totalPayments: number;
  lastShare: string;
  balance: number;
  workers: Worker[];
  validShares: number;
  invalidShares: number;
  lastHash: number;
  amtDue: number;
  amtPaid: number;
  txnCount: number;
  isOnline: boolean;
  status: 'live' | 'historical' | 'inactive' | 'error';
  efficiency?: number;
  uptimePercentage?: number;
}

export interface Worker {
  identifier: string;
  hashrate: number;
  lastShare: string;
  totalHashes: number;
}

export interface PoolStats {
  poolHashrate: number;
  poolMiners: number;
  networkDifficulty?: number;
  networkHashrate?: number;
  lastBlock: string;
  totalBlocksFound: number;
  totalPayments: number;
  roundHashes?: number;
  lastBlockFoundTime?: number;
}

export interface NetworkStats {
  difficulty: number;
  hashrate: number;
  height: number;
  reward: number;
}

const POOL_WALLET = import.meta.env.VITE_XMRT_POOL_WALLET || '46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg';
const API_BASE = import.meta.env.VITE_SUPPORTXMR_API || 'https://supportxmr.com/api';

class MiningService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds cache

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchWithRetry(url: string, retries = 3): Promise<any> {
    // Check cache first
    const cacheKey = url;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for: ${url}`);
      return cached;
    }

    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔄 Fetching: ${url} (attempt ${i + 1}/${retries})`);
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'XMRT-Assistant/2.0.0',
            'Cache-Control': 'no-cache'
          }
        });

        console.log(`✅ Response received:`, response.status);

        // Cache successful responses
        this.setCache(cacheKey, response.data);

        return response.data;
      } catch (error: any) {
        console.error(`❌ Attempt ${i + 1} failed:`, error.message || error);

        if (i === retries - 1) {
          // On final failure, try to return cached data if available (even if stale)
          const staleCache = this.cache.get(cacheKey);
          if (staleCache) {
            console.log(`⚠️ Returning stale cache for: ${url}`);
            return staleCache.data;
          }
          throw new Error(`Failed to fetch ${url}: ${error.message || 'Network error'}`);
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }

  async getMiningStats(): Promise<MiningStats> {
    try {
      console.log('🔄 Fetching mining stats for wallet:', POOL_WALLET.substring(0, 10) + '...');

      const data = await this.fetchWithRetry(`${API_BASE}/miner/${POOL_WALLET}/stats`);

      if (!data) {
        throw new Error('No data received from mining API');
      }

      // Calculate if miner is online (last hash within 5 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      const lastHashTime = data.lastHash || 0;
      const timeSinceLastHash = currentTime - lastHashTime;
      const isOnline = lastHashTime > 0 && timeSinceLastHash < 300; // 5 minutes

      // Calculate efficiency (valid shares / (valid + invalid))
      const totalShares = (data.validShares || 0) + (data.invalidShares || 0);
      const efficiency = totalShares > 0 ? ((data.validShares || 0) / totalShares) * 100 : 100;

      // Calculate uptime percentage (simplified - based on recent activity)
      const uptimePercentage = isOnline ? 100 : (timeSinceLastHash < 3600 ? 75 : 0); // Rough estimate

      const stats: MiningStats = {
        hashrate: data.hash || 0,
        totalHashes: data.totalHashes || 0,
        totalPayments: data.txnCount || 0,
        lastShare: lastHashTime > 0 
          ? new Date(lastHashTime * 1000).toISOString() 
          : 'Never',
        balance: (data.amtDue || 0) / 1000000000000, // Convert from atomic units to XMR
        workers: [], // SupportXMR API doesn't provide worker breakdown in this endpoint
        validShares: data.validShares || 0,
        invalidShares: data.invalidShares || 0,
        lastHash: lastHashTime,
        amtDue: (data.amtDue || 0) / 1000000000000, // Convert to XMR
        amtPaid: (data.amtPaid || 0) / 1000000000000, // Convert to XMR
        txnCount: data.txnCount || 0,
        isOnline,
        status: isOnline ? 'live' : (data.totalHashes > 0 ? 'historical' : 'inactive'),
        efficiency,
        uptimePercentage
      };

      console.log('✅ Mining stats processed successfully:', {
        hashrate: stats.hashrate,
        isOnline,
        timeSinceLastHash,
        efficiency: efficiency.toFixed(2) + '%'
      });

      return stats;

    } catch (error: any) {
      console.error('❌ Failed to fetch mining stats:', error);

      // Return a default error state
      return {
        hashrate: 0,
        totalHashes: 0,
        totalPayments: 0,
        lastShare: 'Error',
        balance: 0,
        workers: [],
        validShares: 0,
        invalidShares: 0,
        lastHash: 0,
        amtDue: 0,
        amtPaid: 0,
        txnCount: 0,
        isOnline: false,
        status: 'error',
        efficiency: 0,
        uptimePercentage: 0
      };
    }
  }

  async getPoolStats(): Promise<PoolStats> {
    try {
      console.log('🔄 Fetching pool statistics...');

      const data = await this.fetchWithRetry(`${API_BASE}/pool/stats`);

      if (!data || !data.pool_statistics) {
        throw new Error('Invalid pool stats data received');
      }

      const poolStats = data.pool_statistics;

      const stats: PoolStats = {
        poolHashrate: poolStats.hashRate || 0,
        poolMiners: poolStats.miners || 0,
        lastBlock: poolStats.lastBlockFound?.toString() || '0',
        totalBlocksFound: poolStats.totalBlocksFound || 0,
        totalPayments: poolStats.totalPayments || 0,
        roundHashes: poolStats.roundHashes || 0,
        lastBlockFoundTime: poolStats.lastBlockFoundTime || 0
      };

      console.log('✅ Pool stats processed successfully:', {
        hashrate: (stats.poolHashrate / 1000000).toFixed(2) + ' MH/s',
        miners: stats.poolMiners
      });

      return stats;

    } catch (error: any) {
      console.error('❌ Failed to fetch pool stats:', error);

      // Return default error state
      return {
        poolHashrate: 0,
        poolMiners: 0,
        lastBlock: 'Error',
        totalBlocksFound: 0,
        totalPayments: 0
      };
    }
  }

  // New method to get network statistics
  async getNetworkStats(): Promise<NetworkStats | null> {
    try {
      console.log('🔄 Fetching network statistics...');

      // Try to get network stats from a reliable source
      // Note: This endpoint might not exist on SupportXMR, so we handle gracefully
      const data = await this.fetchWithRetry(`${API_BASE}/network/stats`);

      return {
        difficulty: data.difficulty || 0,
        hashrate: data.hashrate || 0,
        height: data.height || 0,
        reward: data.reward || 0
      };

    } catch (error) {
      console.warn('⚠️ Network stats not available:', error);
      return null;
    }
  }

  // Method to validate wallet address format
  isValidMoneroAddress(address: string): boolean {
    // Basic Monero address validation
    const regex = /^[48][0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/;
    return regex.test(address);
  }

  // Method to format hashrate with appropriate units
  formatHashrate(hashrate: number): string {
    if (hashrate >= 1000000000) {
      return `${(hashrate / 1000000000).toFixed(2)} GH/s`;
    } else if (hashrate >= 1000000) {
      return `${(hashrate / 1000000).toFixed(2)} MH/s`;
    } else if (hashrate >= 1000) {
      return `${(hashrate / 1000).toFixed(2)} KH/s`;
    } else {
      return `${hashrate.toFixed(2)} H/s`;
    }
  }

  // Method to format XMR amounts
  formatXMR(amount: number): string {
    return `${amount.toFixed(6)} XMR`;
  }

  // Method to calculate estimated earnings
  calculateEstimatedEarnings(hashrate: number, poolHashrate: number, blockReward: number = 0.6): {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  } {
    if (hashrate === 0 || poolHashrate === 0) {
      return { hourly: 0, daily: 0, weekly: 0, monthly: 0 };
    }

    const share = hashrate / poolHashrate;
    const blocksPerHour = 2; // Monero block time is ~2 minutes, so ~30 blocks per hour
    const hourlyEarnings = share * blocksPerHour * blockReward;

    return {
      hourly: hourlyEarnings,
      daily: hourlyEarnings * 24,
      weekly: hourlyEarnings * 24 * 7,
      monthly: hourlyEarnings * 24 * 30
    };
  }
}

export const miningService = new MiningService();
