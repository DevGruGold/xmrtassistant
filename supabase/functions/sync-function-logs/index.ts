import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FunctionEdgeLog {
  id: string;
  timestamp: string;
  event_message: string;
  metadata: {
    function_id?: string;
    execution_time_ms?: number;
    deployment_id?: string;
    version?: string;
    response?: {
      status_code?: number;
    };
    request?: {
      method?: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔄 Starting function logs sync...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Parse request body for options
    let options = { 
      hours_back: 24,  // Default to last 24 hours
      backfill: false  // Set to true for initial backfill
    };
    
    try {
      const body = await req.json();
      options = { ...options, ...body };
    } catch {
      // Use defaults if no body
    }

    console.log(`📊 Syncing logs from last ${options.hours_back} hours, backfill: ${options.backfill}`);

    // Query Supabase analytics for function_edge_logs
    const timeWindowStart = new Date(Date.now() - options.hours_back * 60 * 60 * 1000).toISOString();
    
    // Query the analytics endpoint for function edge logs
    const { data: edgeLogs, error: logsError } = await supabase
      .from('edge_function_logs')
      .select('*')
      .gte('timestamp', timeWindowStart)
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (logsError) {
      console.log('⚠️ edge_function_logs table query failed, trying alternative approach...');
      
      // Alternative: Use the Supabase Management API or analytics query
      // For now, let's try to get data from api_call_logs as a fallback
      const { data: apiLogs, error: apiError } = await supabase
        .from('api_call_logs')
        .select('*')
        .gte('called_at', timeWindowStart)
        .order('called_at', { ascending: false })
        .limit(1000);

      if (apiError) {
        console.error('❌ Failed to fetch logs:', apiError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to fetch logs from any source',
          details: { edgeLogs: logsError.message, apiLogs: apiError.message }
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Process api_call_logs and sync to eliza_function_usage
      const usageRecords = (apiLogs || []).map(log => ({
        function_name: log.function_name,
        success: log.status === 'success',
        execution_time_ms: log.execution_time_ms || null,
        error_message: log.error_message || null,
        context: JSON.stringify(log.caller_context || {}),
        invoked_at: log.called_at,
        deployment_version: 'api_call_log_sync',
        deployment_id: log.id
      }));

      if (usageRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('eliza_function_usage')
          .upsert(usageRecords, { 
            onConflict: 'deployment_id',
            ignoreDuplicates: true 
          });

        if (insertError) {
          console.error('❌ Failed to insert usage records:', insertError);
        } else {
          console.log(`✅ Synced ${usageRecords.length} records from api_call_logs`);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        source: 'api_call_logs',
        records_processed: usageRecords.length,
        time_window_hours: options.hours_back
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Process edge_function_logs
    const usageRecords = (edgeLogs || []).map(log => {
      // Extract function name from the log
      const functionName = log.function_name || 
        (log.event_message?.match(/functions\/v1\/([^\/\s]+)/)?.[1]) || 
        'unknown';
      
      const statusCode = log.status_code || log.metadata?.response?.status_code;
      const success = statusCode ? statusCode >= 200 && statusCode < 400 : true;

      return {
        function_name: functionName,
        success,
        execution_time_ms: log.execution_time_ms || log.metadata?.execution_time_ms || null,
        error_message: success ? null : (log.event_message || null),
        context: log.metadata ? JSON.stringify(log.metadata) : null,
        invoked_at: log.timestamp,
        deployment_version: log.metadata?.version || null,
        deployment_id: log.metadata?.deployment_id || log.id
      };
    }).filter(r => r.function_name !== 'unknown');

    console.log(`📝 Prepared ${usageRecords.length} records for sync`);

    // Batch insert to eliza_function_usage
    if (usageRecords.length > 0) {
      // Insert in batches of 100
      const batchSize = 100;
      let totalInserted = 0;
      let totalErrors = 0;

      for (let i = 0; i < usageRecords.length; i += batchSize) {
        const batch = usageRecords.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('eliza_function_usage')
          .insert(batch);

        if (insertError) {
          console.error(`⚠️ Batch ${i / batchSize + 1} insert error:`, insertError.message);
          totalErrors += batch.length;
        } else {
          totalInserted += batch.length;
        }
      }

      console.log(`✅ Sync complete: ${totalInserted} inserted, ${totalErrors} errors`);

      // Refresh the materialized view for analytics
      try {
        await supabase.rpc('refresh_function_version_performance');
        console.log('✅ Refreshed function_version_performance materialized view');
      } catch (refreshError) {
        console.log('⚠️ Could not refresh materialized view:', refreshError);
      }

      return new Response(JSON.stringify({
        success: true,
        source: 'edge_function_logs',
        records_processed: usageRecords.length,
        records_inserted: totalInserted,
        records_failed: totalErrors,
        time_window_hours: options.hours_back,
        materialized_view_refreshed: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      source: 'edge_function_logs',
      records_processed: 0,
      message: 'No new logs to sync',
      time_window_hours: options.hours_back
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
