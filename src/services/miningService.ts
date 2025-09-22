import axios from 'axios';

export interface MiningStats {
  hashrate: number;
  totalHashes: number;
  totalPayments: number;
  lastShare: string;
  balance: number;
  workers: Worker[];
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
}

const POOL_WALLET = import.meta.env.VITE_XMRT_POOL_WALLET || "46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg";
const API_BASE = import.meta.env.VITE_SUPPORTXMR_API || 'https://supportxmr.com/api';

class MiningService {
  private async fetchWithRetry(url: string, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'XMRT-Assistant/2.0.0'
          }
        });
        return response.data;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  async getMiningStats(): Promise<MiningStats> {
    try {
      const data = await this.fetchWithRetry(`${API_BASE}/miner/${POOL_WALLET}/stats`);

      return {
        hashrate: data.hash || 0,
        totalHashes: data.totalHashes || 0,
        totalPayments: data.totalPayments || 0,
        lastShare: data.lastShare || new Date().toISOString(),
        balance: data.balance || 0,
        workers: this.parseWorkers(data.workers || [])
      };
    } catch (error) {
      console.error('Failed to fetch mining stats:', error);
      return this.getDefaultStats();
    }
  }

  async getPoolStats(): Promise<PoolStats> {
    try {
      const data = await this.fetchWithRetry(`${API_BASE}/pool/stats`);

      return {
        poolHashrate: data.pool_statistics?.hashRate || 0,
        poolMiners: data.pool_statistics?.miners || 0,
        networkDifficulty: data.network?.difficulty || 0,
        networkHashrate: data.network?.hash || 0,
        lastBlock: data.pool?.lastBlockFound || new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to fetch pool stats:', error);
      return this.getDefaultPoolStats();
    }
  }

  async getPaymentHistory(limit = 10): Promise<any[]> {
    try {
      const data = await this.fetchWithRetry(`${API_BASE}/miner/${POOL_WALLET}/payments`);
      return data.slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      return [];
    }
  }

  private parseWorkers(workers: any[]): Worker[] {
    return workers.map(worker => ({
      identifier: worker.identifier || 'Unknown',
      hashrate: worker.hashrate || 0,
      lastShare: worker.lastShare || new Date().toISOString(),
      totalHashes: worker.totalHashes || 0
    }));
  }

  private getDefaultStats(): MiningStats {
    return {
      hashrate: 0,
      totalHashes: 0,
      totalPayments: 0,
      lastShare: new Date().toISOString(),
      balance: 0,
      workers: []
    };
  }

  private getDefaultPoolStats(): PoolStats {
    return {
      poolHashrate: 0,
      poolMiners: 0,
      networkDifficulty: 0,
      networkHashrate: 0,
      lastBlock: new Date().toISOString()
    };
  }

  calculateProfitability(hashrate: number, powerConsumption: number, electricityCost: number): number {
    // Simplified profitability calculation
    // This should be enhanced with real-time XMR price and network data
    const dailyXMR = (hashrate * 86400) / (2 ** 32); // Simplified calculation
    const xmrPrice = 150; // This should come from a price API
    const dailyRevenue = dailyXMR * xmrPrice;
    const dailyElectricityCost = (powerConsumption * 24 * electricityCost) / 1000;

    return dailyRevenue - dailyElectricityCost;
  }

  formatHashRate(hashrate: number): string {
    if (hashrate >= 1000000) return `${(hashrate / 1000000).toFixed(2)} MH/s`;
    if (hashrate >= 1000) return `${(hashrate / 1000).toFixed(2)} KH/s`;
    return `${hashrate.toFixed(2)} H/s`;
  }

  formatXMR(amount: number): string {
    return `${(amount / 1e12).toFixed(6)} XMR`;
  }
}

export const miningService = new MiningService();
