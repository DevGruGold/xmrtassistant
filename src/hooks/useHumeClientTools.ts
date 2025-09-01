import { useState, useCallback } from 'react';
import { xmrtKnowledge } from '@/data/xmrtKnowledgeBase';

interface MiningStats {
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

// Hook to provide client tools for Hume EVI
export const useHumeClientTools = () => {
  const [userIP, setUserIP] = useState<string>("");
  const [miningStats, setMiningStats] = useState<MiningStats | null>(null);

  // Fetch current mining statistics
  const getMiningStats = useCallback(async () => {
    try {
      const response = await fetch(
        "https://www.supportxmr.com/api/miner/46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzDQtNLf2bsp2DX2qCCgC5mg/stats"
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      const stats = {
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
      
      setMiningStats(stats);
      
      const formatHashrate = (hashrate: number): string => {
        if (hashrate >= 1000000) {
          return `${(hashrate / 1000000).toFixed(2)} MH/s`;
        } else if (hashrate >= 1000) {
          return `${(hashrate / 1000).toFixed(2)} KH/s`;
        }
        return `${hashrate.toFixed(2)} H/s`;
      };

      return `Current XMRT-DAO Mining Status:
- Current Hashrate: ${formatHashrate(stats.hash)}
- Online Status: ${stats.isOnline ? 'Active Mining' : 'Offline'}
- Valid Shares: ${stats.validShares.toLocaleString()}
- Invalid Shares: ${stats.invalidShares.toLocaleString()}
- Amount Due: ${(stats.amtDue / 1000000000000).toFixed(6)} XMR
- Amount Paid: ${(stats.amtPaid / 1000000000000).toFixed(6)} XMR
- Transaction Count: ${stats.txnCount}
- Pool: SupportXMR (pool.supportxmr.com:3333)`;
      
    } catch (err) {
      console.error('Failed to fetch mining stats:', err);
      return 'Mining statistics are currently unavailable. Please try again later.';
    }
  }, []);

  // Get user information including IP and founder status
  const getUserInfo = useCallback(async () => {
    try {
      if (!userIP) {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setUserIP(data.ip);
        
        const storedFounderIP = localStorage.getItem('founderIP');
        if (!storedFounderIP) {
          localStorage.setItem('founderIP', data.ip);
        }
      }

      const founderIP = localStorage.getItem('founderIP');
      const isFounder = founderIP === userIP;
      
      return `User Information:
- IP Address: ${userIP || 'Loading...'}
- Status: ${isFounder ? 'Project Founder' : 'Community Member'}
- Connection: Secure XMRT-DAO Network`;
      
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      return 'User information is currently unavailable.';
    }
  }, [userIP]);

  // Search XMRT knowledge base
  const searchXMRTKnowledge = useCallback(async (parameters: { query: string; category?: string }) => {
    try {
      const { query, category } = parameters;
      const results = xmrtKnowledge.searchKnowledge(query, category);
      
      if (results.length === 0) {
        return `No specific information found for "${query}". However, I can provide general information about XMRT-DAO's mission of mobile mining democracy, privacy sovereignty, and decentralized governance.`;
      }
      
      const topResults = results.slice(0, 3);
      const formattedResults = topResults.map(result => 
        `**${result.topic}**: ${result.content}`
      ).join('\n\n');
      
      return `XMRT Knowledge Base Results for "${query}":\n\n${formattedResults}`;
      
    } catch (error) {
      console.error('Failed to search knowledge base:', error);
      return 'Knowledge base search is currently unavailable.';
    }
  }, []);

  // Client tools configuration for Hume EVI
  const clientTools = {
    getMiningStats,
    getUserInfo,
    searchXMRTKnowledge
  };

  return {
    clientTools,
    miningStats,
    userIP
  };
};