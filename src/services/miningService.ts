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
  networkDifficulty: number;
  networkHashrate: number;
  lastBlock: string;
  totalBlocksFound: number;
  totalPayments: number;
}

const POOL_WALLET = import.meta.env.VITE_XMRT_POOL_WALLET || '46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg';
const API_BASE = import.meta.env.VITE_SUPPORTXMR_API || 'https://supportxmr.com/api';

class MiningService {
  private async fetchWithRetry(url: string, retries = 3): Promise<any> {
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

        console.log(`✅ Response received:`, response.status, response.data);
        return response.data;
      } catch (error) {
        console.error(`❌ Attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  async getMiningStats(): Promise<MiningStats> {
    try {
      const data = await this.fetchWithRetry(`${API_BASE}/miner/${POOL_WALLET}/stats`);

      // Calculate if miner is online (last hash within 5 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      const isOnline = data.lastHash && (currentTime - data.lastHash) < 300;

      const stats: MiningStats = {
        hashrate: data.hash || 0,
        totalHashes: data.totalHashes || 0,
        totalPayments: data.txnCount || 0,
        lastShare: data.lastHash ? new Date(data.lastHash * 1000).toISOString() : new Date().toISOString(),
        balance: (data.amtDue || 0) / 1000000000000, // Convert from atomic units to XMR
        workers: [],
        validShares: data.validShares || 0,
        invalidShares: data.invalidShares || 0,
        lastHash: data.lastHash || 0,
        amtDue: (data.amtDue || 0) / 1000000000000, // Convert to XMR
        amtPaid: (data.amtPaid || 0) / 1000000000000, // Convert to XMR
        txnCount: data.txnCount || 0,
        isOnline,
        status: isOnline ? 'live' : (data.totalHashes > 0 ? 'historical' : 'inactive')
      };

      console.log('🎯 Processed mining stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Failed to fetch mining stats:', error);
      return this.getDefaultStats();
    }
  }

  async getPoolStats(): Promise<PoolStats> {
    try {
      const data = await this.fetchWithRetry(`${API_BASE}/pool/stats`);

      const stats: PoolStats = {
        poolHashrate: data.pool_statistics?.hashRate || 0,
        poolMiners: data.pool_statistics?.miners || 0,
        networkDifficulty: data.network?.difficulty || 0,
        networkHashrate: data.network?.hash || 0,
        lastBlock: data.pool_statistics?.lastBlockFound ? 
          new Date(data.pool_statistics.lastBlockFound * 1000).toISOString() : 
          new Date().toISOString(),
        totalBlocksFound: data.pool_statistics?.totalBlocksFound || 0,
        totalPayments: data.pool_statistics?.totalPayments || 0
      };

      console.log('🎯 Processed pool stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Failed to fetch pool stats:', error);
      return this.getDefaultPoolStats();
    }
  }

  async getPaymentHistory(limit = 10): Promise<any[]> {
    try {
      const data = await this.fetchWithRetry(`${API_BASE}/miner/${POOL_WALLET}/payments`);
      return Array.isArray(data) ? data.slice(0, limit) : [];
    } catch (error) {
      console.error('❌ Failed to fetch payment history:', error);
      return [];
    }
  }

  private getDefaultStats(): MiningStats {
    return {
      hashrate: 0,
      totalHashes: 0,
      totalPayments: 0,
      lastShare: new Date().toISOString(),
      balance: 0,
      workers: [],
      validShares: 0,
      invalidShares: 0,
      lastHash: 0,
      amtDue: 0,
      amtPaid: 0,
      txnCount: 0,
      isOnline: false,
      status: 'error'
    };
  }

  private getDefaultPoolStats(): PoolStats {
    return {
      poolHashrate: 0,
      poolMiners: 0,
      networkDifficulty: 0,
      networkHashrate: 0,
      lastBlock: new Date().toISOString(),
      totalBlocksFound: 0,
      totalPayments: 0
    };
  }

  // Helper method to format hashrate for display
  formatHashrate(hashrate: number): string {
    if (hashrate >= 1000000) {
      return `${(hashrate / 1000000).toFixed(2)} MH/s`;
    } else if (hashrate >= 1000) {
      return `${(hashrate / 1000).toFixed(2)} KH/s`;
    } else {
      return `${hashrate.toFixed(2)} H/s`;
    }
  }

  // Helper method to format XMR amounts
  formatXMR(amount: number): string {
    return `${amount.toFixed(6)} XMR`;
  }
}

export const miningService = new MiningService();
