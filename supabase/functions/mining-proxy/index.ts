import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const minerAddress = '46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg';
    const apiUrl = `https://www.supportxmr.com/api/miner/${minerAddress}/stats`;
    
    console.log('Fetching mining stats from:', apiUrl);
    
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

    return new Response(
      JSON.stringify(data),
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