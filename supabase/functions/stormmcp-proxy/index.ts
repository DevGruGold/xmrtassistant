import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-eliza-key',
};

interface StormMCPRequest {
  operation: string;
  params?: any;
  executive_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STORMMCP_API_KEY = Deno.env.get('STORMMCP_API_KEY');
    const STORMMCP_API_ENDPOINT = Deno.env.get('STORMMCP_API_ENDPOINT') || 'https://api.stormmcp.com/v1';
    const STORMMCP_ACCOUNT_ID = 'f215a09c-817e-4411-8755-4f1fe82ea48e';

    if (!STORMMCP_API_KEY) {
      throw new Error('STORMMCP_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { operation, params, executive_name } = await req.json() as StormMCPRequest;

    if (!operation) {
      throw new Error('operation is required');
    }

    console.log(`StormMCP ${operation} for account ${STORMMCP_ACCOUNT_ID}`);

    const startTime = Date.now();

    // Make request to StormMCP API
    const stormResponse = await fetch(`${STORMMCP_API_ENDPOINT}/${operation}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STORMMCP_API_KEY}`,
        'X-Account-ID': STORMMCP_ACCOUNT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params || {}),
    });

    const result = await stormResponse.json();
    const executionTime = Date.now() - startTime;

    // Log to eliza_function_usage
    await supabase.from('eliza_function_usage').insert({
      function_name: 'stormmcp-proxy',
      executive_name: executive_name || 'system',
      success: stormResponse.ok,
      execution_time_ms: executionTime,
      parameters: { operation, params },
      result_summary: JSON.stringify(result).substring(0, 500),
      error_message: stormResponse.ok ? null : result.message,
    });

    if (!stormResponse.ok) {
      throw new Error(`StormMCP API error: ${result.message || stormResponse.status}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        execution_time_ms: executionTime,
        account_id: STORMMCP_ACCOUNT_ID
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('StormMCP proxy error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
