// Direct Mining Service - Bypasses Supabase, calls SupportXMR API directly
import axios from 'axios';

export interface DirectMiningStats {
  hashrate: number;
  status: 'online' | 'offline' | 'error';
  validShares: number;
  invalidShares: number;
  amountDue: number;
  amountPaid: number;
  txnCount: number;
  lastHash: string | null;
  totalHashes: number;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface DirectPoolStats {
  poolHashrate: number;
  poolMiners: number;
  totalBlocksFound: number;
  networkDifficulty: number;
  networkHashrate: number;
  lastBlockFound: Date;
  effort: number;
}

class DirectMiningService {
  private readonly WALLET_ADDRESS = '46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzDQtNLf2bsp2DX2qCCgC5mg';
  private readonly SUPPORTXMR_API = 'https://supportxmr.com/api';
  private readonly TIMEOUT = 10000; // 10 seconds

  constructor() {
    console.log('🚀 Direct Mining Service initialized');
    console.log(`📧 Monitoring wallet: ${this.WALLET_ADDRESS.substring(0, 8)}...`);
  }

  // Convert atomic units to XMR
  private atomicToXMR(atomic: number): number {
    return atomic / 1e12;
  }

  // Get miner statistics directly from SupportXMR
  async getMiningStats(): Promise<DirectMiningStats> {
    try {
      console.log('🔄 Fetching direct mining stats...');

      const url = `${this.SUPPORTXMR_API}/miner/${this.WALLET_ADDRESS}/stats`;
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        headers: {
          'User-Agent': 'XMRT-DAO/1.0',
          'Accept': 'application/json'
        }
      });

      const data = response.data;
      console.log('✅ Direct mining stats received:', data);

      return {
        hashrate: data.hash || 0,
        status: (data.hash && data.hash > 0) ? 'online' : 'offline',
        validShares: data.validShares || 0,
        invalidShares: data.invalidShares || 0,
        amountDue: this.atomicToXMR(data.amtDue || 0),
        amountPaid: this.atomicToXMR(data.amtPaid || 0),
        txnCount: data.txnCount || 0,
        lastHash: data.lastHash || null,
        totalHashes: data.totalHashes || 0,
        isOnline: (data.hash && data.hash > 0) || false,
        lastSeen: data.lastHash ? new Date() : undefined
      };

    } catch (error) {
      console.error('❌ Direct mining stats error:', error);

      return {
        hashrate: 0,
        status: 'error',
        validShares: 0,
        invalidShares: 0,
        amountDue: 0,
        amountPaid: 0,
        txnCount: 0,
        lastHash: null,
        totalHashes: 0,
        isOnline: false
      };
    }
  }

  // Get pool statistics directly from SupportXMR
  async getPoolStats(): Promise<DirectPoolStats> {
    try {
      console.log('🔄 Fetching direct pool stats...');

      const url = `${this.SUPPORTXMR_API}/pool/stats`;
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        headers: {
          'User-Agent': 'XMRT-DAO/1.0',
          'Accept': 'application/json'
        }
      });

      const data = response.data;
      console.log('✅ Direct pool stats received:', data);

      return {
        poolHashrate: data.pool_statistics?.hashRate || 0,
        poolMiners: data.pool_statistics?.miners || 0,
        totalBlocksFound: data.pool_statistics?.totalBlocksFound || 0,
        networkDifficulty: data.network?.difficulty || 0,
        networkHashrate: data.network?.hashrate || 0,
        lastBlockFound: data.pool_statistics?.lastBlockFound 
          ? new Date(data.pool_statistics.lastBlockFound * 1000) 
          : new Date(),
        effort: data.pool_statistics?.roundEffort || 0
      };

    } catch (error) {
      console.error('❌ Direct pool stats error:', error);

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

  // Format hash rate with appropriate units
  formatHashrate(hashrate: number): string {
    if (hashrate >= 1e12) return `${(hashrate / 1e12).toFixed(2)} TH/s`;
    if (hashrate >= 1e9) return `${(hashrate / 1e9).toFixed(2)} GH/s`;
    if (hashrate >= 1e6) return `${(hashrate / 1e6).toFixed(2)} MH/s`;
    if (hashrate >= 1e3) return `${(hashrate / 1e3).toFixed(2)} KH/s`;
    return `${hashrate.toFixed(0)} H/s`;
  }

  // Format XMR amounts
  formatXMR(amount: number, decimals: number = 6): string {
    return `${amount.toFixed(decimals)} XMR`;
  }
}

export const directMiningService = new DirectMiningService();
