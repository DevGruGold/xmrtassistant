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
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        // Add CORS support
        withCredentials: false
      });

      clearTimeout(timeoutId);

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ Request successful: ${url}`);
      console.log(`📊 Response data:`, response.data);
      return response.data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle specific error types
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        console.warn(`⏱️  Request timeout: ${url}`);
        throw new Error('Request timeout - please check your internet connection');
      }

      if (error.response) {
        console.error(`❌ HTTP Error ${error.response.status}:`, error.response.data);
        throw new Error(`Server error: ${error.response.status} ${error.response.statusText}`);
      }

      if (error.request) {
        console.error(`❌ Network error:`, error.message);
        throw new Error('Network error - unable to reach mining pool API');
      }

      if (retries > 0) {
        console.warn(`⚠️  Request failed, retrying (${retries} attempts left): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.makeRequest(url, retries - 1);
      }

      console.error(`❌ Request failed after all retries: ${url}`, error.message);
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  // Determine miner status based on API data
  private determineStatus(data: any): 'online' | 'offline' | 'error' {
    if (!data) return 'offline';

    // Check if there's recent activity (within last hour)
    const lastHash = data.lastHash || 0;
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;

    if (lastHash > oneHourAgo) {
      return 'online';
    } else if (lastHash > 0) {
      return 'offline'; // Has mined before but not recently
    } else {
      return 'offline'; // Never mined
    }
  }

  // Calculate mining efficiency
  private calculateEfficiency(validShares: number, invalidShares: number): number {
    const totalShares = validShares + invalidShares;
    if (totalShares === 0) return 0;
    return (validShares / totalShares) * 100;
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

      // Handle empty or null response
      if (!data) {
        throw new Error('Empty response from mining API');
      }

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
        isOnline: this.determineStatus(data) === 'online',
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
        status: 'error',
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

      if (!data || !data.pool_statistics) {
        throw new Error('Invalid pool stats response');
      }

      const poolStats = data.pool_statistics;

      const stats: PoolStats = {
        poolHashrate: poolStats.hashRate || 0,
        poolMiners: poolStats.miners || 0,
        totalBlocksFound: poolStats.totalBlocksFound || 0,
        networkDifficulty: 0, // Not available in SupportXMR API
        networkHashrate: 0, // Not available in SupportXMR API  
        lastBlockFound: poolStats.lastBlockFoundTime ? new Date(poolStats.lastBlockFoundTime * 1000) : new Date(),
        effort: 0 // Would need to calculate based on round hashes vs network difficulty
      };

      console.log('✅ Processed pool stats:', stats);

      this.setCached(cacheKey, stats, this.UPDATE_INTERVAL);
      return stats;

    } catch (error) {
      console.error('❌ Failed to fetch pool stats:', error);
      throw error;
    }
  }

  // Get earnings estimates
  async getEarningsEstimate(hashrate?: number): Promise<EarningsEstimate> {
    try {
      const currentHashrate = hashrate || (await this.getMiningStats()).hashrate;
      const poolStats = await this.getPoolStats();

      if (currentHashrate === 0 || poolStats.poolHashrate === 0) {
        return { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
      }

      // Simple estimation based on current pool performance
      // This is a rough estimate and actual earnings may vary
      const poolShare = currentHashrate / poolStats.poolHashrate;
      const estimatedXMRPerDay = poolShare * 0.1; // Very rough estimate

      return {
        daily: estimatedXMRPerDay,
        weekly: estimatedXMRPerDay * 7,
        monthly: estimatedXMRPerDay * 30,
        yearly: estimatedXMRPerDay * 365
      };

    } catch (error) {
      console.error('❌ Failed to calculate earnings estimate:', error);
      return { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
    }
  }

  // Get worker statistics (if available)
  async getWorkerStats(): Promise<WorkerStats[]> {
    try {
      // SupportXMR API doesn't provide detailed worker stats for individual addresses
      // This would need to be implemented if switching to a different pool
      return [];
    } catch (error) {
      console.error('❌ Failed to fetch worker stats:', error);
      return [];
    }
  }

  // Test connectivity to mining pool API
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.API_BASE}/pool/stats`;
      await this.makeRequest(url);
      console.log('✅ Mining pool API connection successful');
      return true;
    } catch (error) {
      console.error('❌ Mining pool API connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const miningService = new MiningService();
export default miningService;