import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const minerAddress = Deno.env.get('MINER_WALLET_ADDRESS') || '46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg';
    const apiUrl = `https://supportxmr.com/api/miner/${minerAddress}/stats`;
    
    console.log('Fetching mining stats from SupportXMR:', apiUrl);
    console.log('Using miner address:', minerAddress);
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'XMRT-DAO/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Mining API error:', response.status, response.statusText);
      throw new Error(`Mining API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Mining stats fetched successfully');
    console.log('Full API Response:', JSON.stringify(data, null, 2));

    // The SupportXMR API returns data in format: { "amtDue": ..., "amtPaid": ..., "hash": ..., etc. }
    // Not in a nested structure. Let's adapt to whatever structure comes back.
    
    // Register/update individual workers from perWorkerStats if it exists
    const workers = [];
    if (data.perWorkerStats && Array.isArray(data.perWorkerStats)) {
      for (const worker of data.perWorkerStats) {
        const workerId = worker.identifier || worker.identifer || worker.id || 'unknown';
        
        // Register or update worker in database
        const { error: upsertError } = await supabase
          .from('worker_registrations')
          .upsert({
            worker_id: workerId,
            ip_address: '0.0.0.0', // Pool doesn't provide this
            last_seen: new Date().toISOString(),
            is_active: true,
            metadata: {
              hash_rate: worker.hash || 0,
              valid_shares: worker.validShares || 0,
              invalid_shares: worker.invalidShares || 0,
              last_hash_time: worker.lastHash || worker.lts || 0,
            }
          }, {
            onConflict: 'worker_id'
          });

        if (upsertError) {
          console.error('Failed to register worker:', workerId, upsertError);
        } else {
          console.log('Worker registered/updated:', workerId);
        }

        workers.push({
          identifier: workerId,
          hash: worker.hash || 0,
          validShares: worker.validShares || 0,
          invalidShares: worker.invalidShares || 0,
          lastHash: worker.lastHash || worker.lts || 0,
        });
      }
    }

    // Return both workers array AND original data for frontend compatibility
    const responseData = {
      ...data,
      workers: workers.length > 0 ? workers : undefined
    };

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Mining proxy error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch mining stats',
        message: error?.message || 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})
