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

        console.log(`✅ Response received:`, response.status, response.data ? 'with data' : 'no data');

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
          throw new Error(`Failed to fetch ${url} after ${retries} attempts: ${error.message}`);
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  async getMiningStats(): Promise<MiningStats> {
    try {
      console.log('🎯 Fetching mining stats for wallet:', POOL_WALLET);

      const url = `${API_BASE}/miner/${POOL_WALLET}/stats`;
      const data = await this.fetchWithRetry(url);

      console.log('📊 Raw API Response:', data);

      // Transform the API response to match our interface
      const currentTime = Date.now() / 1000;
      const lastHashTime = data.lastHash || 0;
      const timeSinceLastHash = currentTime - lastHashTime;

      // Determine if miner is online (last hash within 10 minutes)
      const isOnline = timeSinceLastHash < 600;

      // Calculate efficiency (valid shares / total shares)
      const totalShares = (data.validShares || 0) + (data.invalidShares || 0);
      const efficiency = totalShares > 0 ? ((data.validShares || 0) / totalShares) * 100 : 0;

      const stats: MiningStats = {
        hashrate: data.hash || 0,
        totalHashes: data.totalHashes || 0,
        totalPayments: data.txnCount || 0,
        lastShare: lastHashTime > 0 ? new Date(lastHashTime * 1000).toISOString() : 'Never',
        balance: (data.amtDue || 0) / 1e12, // Convert from atomic units to XMR
        workers: [{
          identifier: data.identifier || 'global',
          hashrate: data.hash || 0,
          lastShare: lastHashTime > 0 ? new Date(lastHashTime * 1000).toISOString() : 'Never',
          totalHashes: data.totalHashes || 0
        }],
        validShares: data.validShares || 0,
        invalidShares: data.invalidShares || 0,
        lastHash: lastHashTime,
        amtDue: (data.amtDue || 0) / 1e12, // Convert to XMR
        amtPaid: (data.amtPaid || 0) / 1e12, // Convert to XMR
        txnCount: data.txnCount || 0,
        isOnline,
        status: isOnline ? 'live' : (data.totalHashes > 0 ? 'historical' : 'inactive'),
        efficiency: Math.round(efficiency * 100) / 100,
        uptimePercentage: 85 // TODO: Calculate actual uptime
      };

      console.log('✅ Processed mining stats:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Failed to fetch mining stats:', error);

      // Return default/offline stats instead of throwing
      return {
        hashrate: 0,
        totalHashes: 0,
        totalPayments: 0,
        lastShare: 'Never',
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
      console.log('🏊 Fetching pool stats...');

      const url = `${API_BASE}/pool/stats`;
      const data = await this.fetchWithRetry(url);

      console.log('🏊 Raw Pool Response:', data);

      const poolData = data.pool_statistics || {};

      const stats: PoolStats = {
        poolHashrate: poolData.hashRate || 0,
        poolMiners: poolData.miners || 0,
        lastBlock: (poolData.lastBlockFound || 0).toString(),
        totalBlocksFound: poolData.totalBlocksFound || 0,
        totalPayments: poolData.totalPayments || 0,
        roundHashes: poolData.roundHashes || 0,
        lastBlockFoundTime: poolData.lastBlockFoundTime || 0
      };

      console.log('✅ Processed pool stats:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Failed to fetch pool stats:', error);

      // Return default stats
      return {
        poolHashrate: 0,
        poolMiners: 0,
        lastBlock: '0',
        totalBlocksFound: 0,
        totalPayments: 0,
        roundHashes: 0,
        lastBlockFoundTime: 0
      };
    }
  }

  async getNetworkStats(): Promise<NetworkStats> {
    try {
      console.log('🌐 Fetching network stats...');

      const url = `${API_BASE}/network/stats`;
      const data = await this.fetchWithRetry(url);

      console.log('🌐 Raw Network Response:', data);

      const stats: NetworkStats = {
        difficulty: data.difficulty || 0,
        hashrate: 0, // Not directly available, would need calculation
        height: data.height || 0,
        reward: (data.value || 0) / 1e12 // Convert to XMR
      };

      console.log('✅ Processed network stats:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Failed to fetch network stats:', error);

      return {
        difficulty: 0,
        hashrate: 0,
        height: 0,
        reward: 0
      };
    }
  }

  // Add method to get all stats at once
  async getAllStats(): Promise<{
    mining: MiningStats;
    pool: PoolStats;
    network: NetworkStats;
  }> {
    try {
      const [mining, pool, network] = await Promise.all([
        this.getMiningStats(),
        this.getPoolStats(),
        this.getNetworkStats()
      ]);

      return { mining, pool, network };
    } catch (error) {
      console.error('❌ Failed to fetch all stats:', error);
      throw error;
    }
  }

  // Clear cache method
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }
}

export const miningService = new MiningService();
export default miningService;
