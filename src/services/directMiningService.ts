// Updated directMiningService with CORS proxy support
export interface DirectMiningStats {
  hashrate: number;
  status: string;
  validShares: number;
  invalidShares: number;
  amountDue: number;
  amountPaid: number;
  balance: number;
  lastHash: string | null;
  totalHashes: number;
  isOnline: boolean;
}

export interface DirectPoolStats {
  hashrate: number;
  miners: number;
  difficulty?: number;
  totalBlocksFound?: number;
  lastBlockFound?: number;
  totalPayments?: number;
}

class DirectMiningService {
  private readonly WALLET_ADDRESS = "46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg";
  private readonly BASE_URL = "https://supportxmr.com/api";
  
  // CORS proxy options - try multiple proxies for reliability
  private readonly CORS_PROXIES = [
    "https://api.allorigins.win/raw?url=",
    "https://corsproxy.io/?",
    "https://cors-anywhere.herokuapp.com/",
    "https://api.codetabs.com/v1/proxy?quest="
  ];

  private async fetchWithCorsProxy(url: string): Promise<any> {
    const errors: string[] = [];
    
    // Try each CORS proxy until one works
    for (const proxy of this.CORS_PROXIES) {
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        console.log(`🔄 Trying CORS proxy: ${proxy}`);
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Successfully fetched data via ${proxy}`);
        return data;
        
      } catch (error) {
        const errorMsg = `${proxy}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.warn(`❌ CORS proxy failed: ${errorMsg}`);
        continue;
      }
    }
    
    // If all proxies fail, try direct fetch as last resort
    try {
      console.log(`🔄 Trying direct fetch as fallback...`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Direct fetch successful`);
      return data;
      
    } catch (error) {
      errors.push(`Direct fetch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // All methods failed
    throw new Error(`All CORS proxies and direct fetch failed:\n${errors.join('\n')}`);
  }

  async getMiningStats(): Promise<DirectMiningStats> {
    try {
      const url = `${this.BASE_URL}/miner/${this.WALLET_ADDRESS}/stats`;
      console.log(`🔍 Fetching miner stats from: ${url}`);
      
      const data = await this.fetchWithCorsProxy(url);
      
      // Parse the response based on actual SupportXMR API format
      return {
        hashrate: data.hash || 0,
        status: this.determineStatus(data),
        validShares: data.validShares || 0,
        invalidShares: data.invalidShares || 0,
        amountDue: data.amtDue || 0,
        amountPaid: data.amtPaid || 0,
        balance: data.amtDue || 0, // Use amtDue as balance
        lastHash: data.lastHash ? data.lastHash.toString() : null,
        totalHashes: data.totalHashes || 0,
        isOnline: this.isOnline(data)
      };
      
    } catch (error) {
      console.error('❌ Error fetching mining stats:', error);
      throw new Error(`Failed to fetch mining statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPoolStats(): Promise<DirectPoolStats> {
    try {
      const url = `${this.BASE_URL}/pool/stats`;
      console.log(`🔍 Fetching pool stats from: ${url}`);
      
      const data = await this.fetchWithCorsProxy(url);
      
      // Parse the response based on actual SupportXMR API format
      const poolStats = data.pool_statistics || {};
      
      return {
        hashrate: poolStats.hashRate || 0,
        miners: poolStats.miners || 0,
        difficulty: poolStats.difficulty,
        totalBlocksFound: poolStats.totalBlocksFound,
        lastBlockFound: poolStats.lastBlockFound,
        totalPayments: poolStats.totalPayments
      };
      
    } catch (error) {
      console.error('❌ Error fetching pool stats:', error);
      throw new Error(`Failed to fetch pool statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private determineStatus(data: any): string {
    // Determine mining status based on available data
    if (data.hash && data.hash > 0) {
      return 'mining';
    } else if (data.validShares && data.validShares > 0) {
      return 'online';
    } else {
      return 'offline';
    }
  }

  private isOnline(data: any): boolean {
    // Consider online if there's recent activity
    const now = Date.now() / 1000; // Current time in seconds
    const lastHashTime = data.lastHash || 0;
    const timeDiff = now - lastHashTime;
    
    // Consider online if last hash was within 5 minutes (300 seconds)
    return timeDiff < 300 && data.hash > 0;
  }

  // Method to test connectivity to all CORS proxies
  async testCorsProxies(): Promise<{ proxy: string; working: boolean; error?: string }[]> {
    const testUrl = `${this.BASE_URL}/pool/stats`;
    const results = [];
    
    for (const proxy of this.CORS_PROXIES) {
      try {
        const proxyUrl = proxy + encodeURIComponent(testUrl);
        const response = await fetch(proxyUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout for testing
        });
        
        results.push({
          proxy,
          working: response.ok,
          error: response.ok ? undefined : `HTTP ${response.status}`
        });
        
      } catch (error) {
        results.push({
          proxy,
          working: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }
}

export const directMiningService = new DirectMiningService();
