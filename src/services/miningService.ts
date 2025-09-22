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
    if (hashrate >= 1000000000) {
      return `${(hashrate / 1000000000).toFixed(2)} GH/s`;
    } else if (hashrate >= 1000000) {
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

  // Convert atomic units to XMR (1 XMR = 1e12 atomic units)
  private atomicToXMR(atomic: number): number {
    return atomic / 1e12;
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

  // Make HTTP request with retries and proper error handling
  private async makeRequest(url: string, retries: number = this.RETRY_ATTEMPTS): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

    try {
      console.log(`🌐 Making request to: ${url}`);
      const response = await axios.get(url, {
        signal: controller.signal,
        timeout: this.TIMEOUT,
        headers: {
          'User-Agent': 'XMRT-Assistant/1.0',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ Request successful: ${url}`);
      return response.data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (retries > 0 && !controller.signal.aborted) {
        console.warn(`⚠️  Request failed, retrying (${retries} attempts left): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.makeRequest(url, retries - 1);
      }

      console.error(`❌ Request failed after all retries: ${url}`, error.message);
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  // Get mining statistics for the wallet
  async getMiningStats(): Promise<MiningStats> {
    const cacheKey = `mining-stats-${this.WALLET_ADDRESS}`;
    const cached = this.getCached<MiningStats>(cacheKey);

    if (cached) {
      console.log('📋 Returning cached mining stats');
      return cached;
    }

    try {
      console.log('🔄 Fetching fresh mining stats...');
      const url = `${this.API_BASE}/miner/${this.WALLET_ADDRESS}/stats`;
      const data = await this.makeRequest(url);

      console.log('📊 Raw API response:', data);

      // Transform API response to match our interface
      const stats: MiningStats = {
        hashrate: data.hash || 0, // API uses 'hash' field for hashrate
        status: this.determineStatus(data),
        validShares: data.validShares || 0,
        invalidShares: data.invalidShares || 0,
        amtDue: this.atomicToXMR(data.amtDue || 0), // Convert atomic units to XMR
        amtPaid: this.atomicToXMR(data.amtPaid || 0), // Convert atomic units to XMR
        txnCount: data.txnCount || 0,
        roundShares: data.validShares || 0, // Use validShares as roundShares
        isOnline: this.isHashrateActive(data.hash || 0, data.lastHash),
        efficiency: this.calculateEfficiency(data.validShares || 0, data.invalidShares || 0),
        lastSeen: data.lastHash ? new Date(data.lastHash * 1000) : undefined
      };

      console.log('✅ Processed mining stats:', stats);

      this.setCached(cacheKey, stats, this.UPDATE_INTERVAL);
      return stats;

    } catch (error) {
      console.error('❌ Failed to fetch mining stats:', error);

      // Return offline stats instead of throwing
      return {
        hashrate: 0,
        status: 'offline',
        validShares: 0,
        invalidShares: 0,
        amtDue: 0,
        amtPaid: 0,
        txnCount: 0,
        roundShares: 0,
        isOnline: false,
        efficiency: 0
      };
    }
  }

  // Get pool statistics
  async getPoolStats(): Promise<PoolStats> {
    const cacheKey = 'pool-stats';
    const cached = this.getCached<PoolStats>(cacheKey);

    if (cached) {
      console.log('📋 Returning cached pool stats');
      return cached;
    }

    try {
      console.log('🔄 Fetching fresh pool stats...');
      const url = `${this.API_BASE}/pool/stats`;
      const data = await this.makeRequest(url);

      console.log('🏊 Raw pool API response:', data);

      const poolStats = data.pool_statistics || {};

      const stats: PoolStats = {
        poolHashrate: poolStats.hashRate || 0,
        poolMiners: poolStats.miners || 0,
        totalBlocksFound: poolStats.totalBlocksFound || 0,
        networkDifficulty: poolStats.networkDifficulty || 0,
        networkHashrate: poolStats.networkHashrate || 0,
        lastBlockFound: poolStats.lastBlockFoundTime 
          ? new Date(poolStats.lastBlockFoundTime * 1000) 
          : new Date(),
        effort: this.calculateEffort(poolStats.roundHashes, poolStats.networkDifficulty)
      };

      console.log('✅ Processed pool stats:', stats);

      this.setCached(cacheKey, stats, this.UPDATE_INTERVAL);
      return stats;

    } catch (error) {
      console.error('❌ Failed to fetch pool stats:', error);
      throw error;
    }
  }

  // Determine miner status based on API data
  private determineStatus(data: any): 'online' | 'offline' | 'error' {
    if (!data) return 'error';

    const hashrate = data.hash || 0;
    const lastHash = data.lastHash || 0;

    if (hashrate > 0 && this.isHashrateActive(hashrate, lastHash)) {
      return 'online';
    }

    return 'offline';
  }

  // Check if hashrate indicates active mining
  private isHashrateActive(hashrate: number, lastHash: number): boolean {
    if (hashrate <= 0) return false;

    if (!lastHash) return false;

    // Consider active if last hash was within last 10 minutes
    const tenMinutesAgo = (Date.now() / 1000) - 600;
    return lastHash > tenMinutesAgo;
  }

  // Calculate mining efficiency
  private calculateEfficiency(validShares: number, invalidShares: number): number {
    const totalShares = validShares + invalidShares;
    if (totalShares === 0) return 0;
    return (validShares / totalShares) * 100;
  }

  // Calculate pool effort
  private calculateEffort(roundHashes: number, networkDifficulty: number): number {
    if (!networkDifficulty || networkDifficulty === 0) return 0;
    return (roundHashes / networkDifficulty) * 100;
  }

  // Calculate estimated earnings
  calculateEstimatedEarnings(minerHashrate: number, poolHashrate: number): EarningsEstimate {
    if (minerHashrate <= 0 || poolHashrate <= 0) {
      return { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
    }

    // Monero block reward (approximate)
    const blockReward = 0.6; // XMR
    const blocksPerDay = 720; // Approximately every 2 minutes
    const poolShare = minerHashrate / poolHashrate;
    const dailyEarnings = poolShare * blockReward * blocksPerDay;

    return {
      daily: dailyEarnings,
      weekly: dailyEarnings * 7,
      monthly: dailyEarnings * 30,
      yearly: dailyEarnings * 365
    };
  }

  // Get worker statistics
  async getWorkerStats(): Promise<WorkerStats[]> {
    try {
      console.log('🔄 Fetching worker stats...');
      const url = `${this.API_BASE}/miner/${this.WALLET_ADDRESS}/stats`;
      const data = await this.makeRequest(url);

      // Since SupportXMR returns aggregated stats, we create a single worker entry
      if (!data || !data.hash) {
        return [];
      }

      const worker: WorkerStats = {
        identifier: data.identifier || 'main',
        hashrate: data.hash || 0,
        lastSeen: data.lastHash ? new Date(data.lastHash * 1000) : new Date(),
        validShares: data.validShares || 0,
        invalidShares: data.invalidShares || 0,
        efficiency: this.calculateEfficiency(data.validShares || 0, data.invalidShares || 0)
      };

      return [worker];

    } catch (error) {
      console.error('❌ Failed to fetch worker stats:', error);
      return [];
    }
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
