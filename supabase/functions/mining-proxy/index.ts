import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const minerAddress = '46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzDQtNLf2bsp2DX2qCCgC5mg';
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
    
    // Get client IP for worker detection
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                    req.headers.get('x-real-ip') || 
                    req.headers.get('cf-connecting-ip') ||
                    'unknown';
    
    console.log('Client IP detected:', clientIP);
    
    // Check for worker registration if we have Supabase access
    let workerContext = {
      canIdentifyWorker: false,
      detectedWorker: null,
      registrationRequired: true,
      clientIP
    };
    
    try {
      // Initialize Supabase client if environment variables are available
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
      
      if (supabaseUrl && supabaseKey && clientIP !== 'unknown') {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Check if this IP is registered to a specific worker
        const { data: registration, error } = await supabase
          .from('worker_registrations')
          .select('worker_id, last_seen, metadata')
          .eq('ip_address', clientIP)
          .eq('is_active', true)
          .maybeSingle();

        if (!error && registration) {
          workerContext = {
            canIdentifyWorker: true,
            detectedWorker: registration.worker_id,
            registrationRequired: false,
            clientIP
          };
          
          // Update last seen timestamp
          await supabase
            .from('worker_registrations')
            .update({ last_seen: new Date().toISOString() })
            .eq('ip_address', clientIP)
            .eq('is_active', true);
          
          console.log(`Worker identified: ${registration.worker_id} for IP ${clientIP}`);
        } else {
          console.log('No worker registration found for IP:', clientIP);
        }
      }
    } catch (dbError) {
      console.log('Database check failed, continuing with basic response:', dbError.message);
    }
    
    // Enhanced response with IP context and worker detection capability
    const enhancedData = {
      ...data,
      workerContext
    };

    return new Response(
      JSON.stringify(enhancedData),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Mining proxy error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch mining stats',
        message: error.message 
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