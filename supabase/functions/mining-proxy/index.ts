import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Demo data for when real mining data is unavailable
const getDemoMiningData = () => {
  const now = Math.floor(Date.now() / 1000);
  const baseHashrate = 2500 + Math.random() * 1500; // 2.5-4 KH/s

  return {
    hash: Math.floor(baseHashrate),
    identifier: "demo",
    lastHash: now - Math.floor(Math.random() * 60), // Within last minute
    totalHashes: Math.floor(Math.random() * 1000000) + 500000,
    validShares: Math.floor(Math.random() * 1000) + 100,
    invalidShares: Math.floor(Math.random() * 10),
    amtDue: (Math.random() * 0.01).toFixed(6),
    amtPaid: (Math.random() * 0.1).toFixed(6),
    txnCount: Math.floor(Math.random() * 20) + 5,
    isDemo: true,
    demoNote: "Demo data - Connect your miner to see live stats"
  };
};

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
    let useDemo = false;

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

        // Check if we got meaningful data (not all zeros)
        const hasActivity = data.hash > 0 || data.totalHashes > 0 || data.validShares > 0;

        if (hasActivity) {
          minerData = data;
          console.log('Real mining data retrieved successfully');
        } else {
          console.log('Miner appears inactive - using demo data');
          useDemo = true;
        }
      } else {
        console.log('Mining API error:', response.status);
        useDemo = true;
      }
    } catch (error) {
      console.log('Mining API failed:', error);
      useDemo = true;
    }

    // Use demo data if real data unavailable or inactive
    if (useDemo || !minerData) {
      minerData = getDemoMiningData();
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
      status: useDemo ? 'demo' : 'live'
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Proxy error:', error);

    // Return demo data even on complete failure
    const fallbackData = {
      ...getDemoMiningData(),
      error: 'Service temporarily unavailable',
      status: 'fallback'
    };

    return new Response(JSON.stringify(fallbackData), {
      status: 200, // Return 200 with demo data rather than error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});