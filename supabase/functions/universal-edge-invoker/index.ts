import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Universal Edge Function Invoker
 * 
 * Allows Eliza to invoke ANY Supabase edge function dynamically.
 * This is the core of MCP integration, giving Eliza full access to all 80+ functions.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { 
      function_name,  // Required: Name of the edge function to invoke
      payload,        // Optional: Payload to send to the function
      headers,        // Optional: Custom headers
      method = 'POST' // Optional: HTTP method (default POST)
    } = await req.json();
    
    if (!function_name) {
      return new Response(
        JSON.stringify({ 
          error: 'function_name is required',
          example: {
            function_name: 'python-executor',
            payload: { code: 'print("Hello")' }
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`🔧 [UNIVERSAL INVOKER] Invoking function: ${function_name}`);
    console.log(`📦 [PAYLOAD] ${JSON.stringify(payload).substring(0, 200)}`);
    
    const startTime = Date.now();
    
    // Invoke the target edge function
    const response = await supabase.functions.invoke(function_name, {
      body: payload,
      headers: headers
    });
    
    const executionTime = Date.now() - startTime;
    
    console.log(`✅ [SUCCESS] Function ${function_name} completed in ${executionTime}ms`);
    
    // Log the invocation to activity log
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'edge_function_invocation',
      title: `🔧 Invoked: ${function_name}`,
      description: `Universal invoker executed ${function_name}`,
      metadata: {
        function_name,
        execution_time_ms: executionTime,
        payload_size: JSON.stringify(payload || {}).length,
        has_error: !!response.error,
        timestamp: new Date().toISOString()
      },
      status: response.error ? 'failed' : 'completed'
    });
    
    if (response.error) {
      console.error(`❌ [ERROR] Function ${function_name} failed:`, response.error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: response.error,
          function_name,
          execution_time_ms: executionTime
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: response.data,
        function_name,
        execution_time_ms: executionTime
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('❌ [UNIVERSAL INVOKER ERROR]:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
