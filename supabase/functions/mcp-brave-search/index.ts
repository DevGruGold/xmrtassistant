import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-eliza-key',
};

interface BraveSearchRequest {
  query: string;
  count?: number;
  market?: string;
  executive_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BRAVE_API_KEY = Deno.env.get('BRAVE_API_KEY');
    if (!BRAVE_API_KEY) {
      throw new Error('BRAVE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, count, market, executive_name } = await req.json() as BraveSearchRequest;

    if (!query) {
      throw new Error('query is required');
    }

    console.log(`Brave search for: ${query}`);

    const startTime = Date.now();

    // Build query parameters
    const params = new URLSearchParams({
      q: query,
      count: (count || 10).toString(),
    });

    if (market) {
      params.append('market', market);
    }

    // Call Brave Search API
    const braveResponse = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    });

    const result = await braveResponse.json();
    const executionTime = Date.now() - startTime;

    // Log to eliza_function_usage
    await supabase.from('eliza_function_usage').insert({
      function_name: 'mcp-brave-search',
      executive_name: executive_name || 'system',
      success: braveResponse.ok,
      execution_time_ms: executionTime,
      parameters: { query, count, market },
      result_summary: `Found ${result.web?.results?.length || 0} results`,
      error_message: braveResponse.ok ? null : result.message,
    });

    if (!braveResponse.ok) {
      throw new Error(`Brave Search API error: ${result.message || braveResponse.status}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: result.web?.results || [],
        total: result.web?.results?.length || 0,
        execution_time_ms: executionTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Brave search error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
