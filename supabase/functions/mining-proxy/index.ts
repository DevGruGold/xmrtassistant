import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Store last known good data to show when mining is inactive
let lastKnownData = null;
let lastActiveTimestamp = null;

// Get pool stats for context
const getPoolStats = async () => {
  try {
    const response = await fetch('https://www.supportxmr.com/api/pool/stats', {
      headers: { 'User-Agent': 'XMRT-DAO/1.0' },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        poolHashrate: data.pool_statistics?.hashRate || 0,
        connectedMiners: data.pool_statistics?.miners || 0,
        networkDifficulty: data.network?.difficulty || 0,
        blockHeight: data.network?.height || 0,
      };
    }
  } catch (error) {
    console.log('Pool stats unavailable:', error);
  }
  return null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const minerAddress = '46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzDQtNLf2bsp2DX2qCCgC5mg';
    const apiUrl = `https://www.supportxmr.com/api/miner/${minerAddress}/stats`;

    console.log('Fetching mining stats from:', apiUrl);

    // Try to get real miner data
    let minerData = null;
    let isActive = false;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'XMRT-DAO/1.0',
          'Accept': 'application/json',
        },
        timeout: 5000,
      });

      if (response.ok) {
        const data = await response.json();

        if (data && typeof data === 'object') {
          minerData = data;
          console.log('Real mining data retrieved successfully');
          
          // Check if miner is currently active
          isActive = data.hash > 0 || data.totalHashes > 0 || data.validShares > 0;
          
          if (isActive) {
            // Store as last known good data
            lastKnownData = { ...data };
            lastActiveTimestamp = Date.now();
            console.log('Active mining detected - storing data');
          } else if (lastKnownData) {
            // Use last known good data when miner is inactive
            minerData = {
              ...lastKnownData,
              isHistorical: true,
              lastActiveTime: lastActiveTimestamp
            };
            console.log('Using last known good data - miner appears inactive');
          }
        } else {
          console.log('Invalid API response format');
          if (lastKnownData) {
            minerData = {
              ...lastKnownData,
              isHistorical: true,
              lastActiveTime: lastActiveTimestamp
            };
          }
        }
      } else {
        console.log('Mining API error:', response.status);
        if (lastKnownData) {
          minerData = {
            ...lastKnownData,
            isHistorical: true,
            lastActiveTime: lastActiveTimestamp
          };
        }
      }
    } catch (error) {
      console.log('Mining API failed:', error);
      if (lastKnownData) {
        minerData = {
          ...lastKnownData,
          isHistorical: true,
          lastActiveTime: lastActiveTimestamp
        };
      }
    }

    // If no data available at all, return basic structure
    if (!minerData) {
      minerData = {
        hash: 0,
        identifier: "global",
        lastHash: 0,
        totalHashes: 0,
        validShares: 0,
        invalidShares: 0,
        amtDue: 0,
        amtPaid: 0,
        txnCount: 0,
        noDataAvailable: true
      };
    }

    // Get pool stats for additional context
    const poolStats = await getPoolStats();

    // Get client IP for worker detection
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                    req.headers.get('x-real-ip') || 
                    req.headers.get('cf-connecting-ip') ||
                    'unknown';

    // Worker context handling
    let workerContext = {
      canIdentifyWorker: false,
      detectedWorker: null,
      registrationRequired: true,
      clientIP
    };

    // Enhanced response with pool context
    const responseData = {
      ...minerData,
      poolContext: poolStats,
      workerContext,
      lastUpdate: new Date().toISOString(),
      status: minerData.isHistorical ? 'historical' : (minerData.noDataAvailable ? 'inactive' : 'live'),
      isActive: isActive,
      lastActiveTimestamp: lastActiveTimestamp
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Proxy error:', error);

    // Return last known data or basic structure on complete failure
    const fallbackData = lastKnownData ? {
      ...lastKnownData,
      error: 'Service temporarily unavailable',
      status: 'historical',
      isHistorical: true,
      lastActiveTime: lastActiveTimestamp
    } : {
      hash: 0,
      identifier: "global",
      lastHash: 0,
      totalHashes: 0,
      validShares: 0,
      invalidShares: 0,
      amtDue: 0,
      amtPaid: 0,
      txnCount: 0,
      error: 'Service temporarily unavailable',
      status: 'error',
      noDataAvailable: true
    };

    return new Response(JSON.stringify(fallbackData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});