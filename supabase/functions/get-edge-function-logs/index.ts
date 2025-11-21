import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogQueryParams {
  function_name: string;
  time_window_hours?: number;
  status_filter?: 'all' | 'success' | 'error';
  limit?: number;
  include_stack_traces?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📋 get-edge-function-logs - Starting log retrieval...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      function_name,
      time_window_hours = 24,
      status_filter = 'all',
      limit = 100,
      include_stack_traces = true
    }: LogQueryParams = await req.json();

    if (!function_name) {
      return new Response(
        JSON.stringify({ 
          error: 'function_name is required',
          example: { function_name: 'github-integration', time_window_hours: 24 }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Querying logs for: ${function_name}, window: ${time_window_hours}h, filter: ${status_filter}`);

    // Calculate time threshold
    const timeThreshold = new Date();
    timeThreshold.setHours(timeThreshold.getHours() - time_window_hours);

    // Query eliza_function_usage for detailed logs
    let usageQuery = supabase
      .from('eliza_function_usage')
      .select('*')
      .eq('function_name', function_name)
      .gte('invoked_at', timeThreshold.toISOString())
      .order('invoked_at', { ascending: false })
      .limit(limit);

    if (status_filter === 'success') {
      usageQuery = usageQuery.eq('success', true);
    } else if (status_filter === 'error') {
      usageQuery = usageQuery.eq('success', false);
    }

    const { data: usageLogs, error: usageError } = await usageQuery;

    if (usageError) {
      throw new Error(`Failed to fetch usage logs: ${usageError.message}`);
    }

    console.log(`✅ Retrieved ${usageLogs?.length || 0} log entries`);

    // Calculate summary statistics
    const totalInvocations = usageLogs?.length || 0;
    const successfulCalls = usageLogs?.filter(log => log.success).length || 0;
    const failedCalls = totalInvocations - successfulCalls;
    const successRate = totalInvocations > 0 ? (successfulCalls / totalInvocations * 100).toFixed(2) : 0;

    // Execution time statistics
    const executionTimes = usageLogs?.map(log => log.execution_time_ms).filter(t => t != null) || [];
    const avgExecutionTime = executionTimes.length > 0
      ? (executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length).toFixed(2)
      : 0;
    const sortedTimes = [...executionTimes].sort((a, b) => a - b);
    const p95ExecutionTime = sortedTimes.length > 0
      ? sortedTimes[Math.floor(sortedTimes.length * 0.95)]
      : 0;
    const p99ExecutionTime = sortedTimes.length > 0
      ? sortedTimes[Math.floor(sortedTimes.length * 0.99)]
      : 0;

    // Error analysis
    const errorLogs = usageLogs?.filter(log => !log.success) || [];
    const errorTypes: Record<string, { count: number; sample_message: string; stack_traces?: string[] }> = {};

    errorLogs.forEach(log => {
      if (log.error_message) {
        const errorKey = log.error_message.split(':')[0]?.substring(0, 50) || 'Unknown Error';
        if (!errorTypes[errorKey]) {
          errorTypes[errorKey] = {
            count: 0,
            sample_message: log.error_message,
            stack_traces: include_stack_traces ? [] : undefined
          };
        }
        errorTypes[errorKey].count++;
        if (include_stack_traces && errorTypes[errorKey].stack_traces) {
          errorTypes[errorKey].stack_traces!.push(log.error_message);
        }
      }
    });

    // Recent errors (last 10)
    const recentErrors = errorLogs.slice(0, 10).map(log => ({
      timestamp: log.invoked_at,
      error_message: log.error_message,
      execution_time_ms: log.execution_time_ms,
      parameters: log.parameters,
      metadata: log.metadata
    }));

    // Status code distribution (if available in metadata)
    const statusCodes: Record<string, number> = {};
    usageLogs?.forEach(log => {
      const statusCode = log.metadata?.status_code || (log.success ? '200' : '500');
      statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;
    });

    // Note: Edge logs from Supabase analytics are not directly queryable
    // We rely on eliza_function_usage table which contains comprehensive execution data
    const edgeLogs = null;

    const result = {
      function_name,
      time_window_hours,
      query_time: new Date().toISOString(),
      summary: {
        total_invocations: totalInvocations,
        successful_calls: successfulCalls,
        failed_calls: failedCalls,
        success_rate: `${successRate}%`,
        status_filter_applied: status_filter
      },
      performance: {
        avg_execution_time_ms: avgExecutionTime,
        p95_execution_time_ms: p95ExecutionTime,
        p99_execution_time_ms: p99ExecutionTime,
        min_execution_time_ms: Math.min(...executionTimes),
        max_execution_time_ms: Math.max(...executionTimes)
      },
      error_analysis: {
        total_errors: failedCalls,
        unique_error_types: Object.keys(errorTypes).length,
        error_breakdown: errorTypes,
        recent_errors: recentErrors
      },
      status_code_distribution: statusCodes,
      sample_logs: usageLogs?.slice(0, 10).map(log => ({
        timestamp: log.invoked_at,
        success: log.success,
        execution_time_ms: log.execution_time_ms,
        executive_name: log.executive_name,
        invoked_by: log.invoked_by,
        deployment_version: log.deployment_version,
        result_summary: log.result_summary
      })),
      edge_function_logs: edgeLogs ? edgeLogs.slice(0, 10) : null,
      recommendations: generateRecommendations(successRate, failedCalls, errorTypes, avgExecutionTime)
    };

    console.log(`✅ Log analysis complete. Success rate: ${successRate}%, Errors: ${failedCalls}`);

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error retrieving logs:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Generate actionable recommendations based on log analysis
 */
function generateRecommendations(
  successRate: string | number,
  failedCalls: number,
  errorTypes: Record<string, any>,
  avgExecutionTime: string | number
): string[] {
  const recommendations: string[] = [];
  const rate = typeof successRate === 'string' ? parseFloat(successRate) : successRate;
  const avgTime = typeof avgExecutionTime === 'string' ? parseFloat(avgExecutionTime) : avgExecutionTime;

  if (rate < 80) {
    recommendations.push(`🚨 CRITICAL: Success rate is ${rate}%. Immediate investigation required.`);
    recommendations.push(`🔍 Top errors: ${Object.keys(errorTypes).slice(0, 3).join(', ')}`);
  } else if (rate < 95) {
    recommendations.push(`⚠️ WARNING: Success rate is ${rate}%. Monitor closely and consider fixes.`);
  } else {
    recommendations.push(`✅ Function is healthy with ${rate}% success rate.`);
  }

  if (failedCalls > 10) {
    recommendations.push(`📊 ${failedCalls} failures detected. Review error patterns.`);
  }

  if (avgTime > 5000) {
    recommendations.push(`⏱️ Average execution time is ${avgTime}ms. Consider optimization.`);
  } else if (avgTime > 2000) {
    recommendations.push(`⏱️ Execution time (${avgTime}ms) is acceptable but could be optimized.`);
  }

  if (Object.keys(errorTypes).length > 5) {
    recommendations.push(`🔧 ${Object.keys(errorTypes).length} different error types detected. Consider error handling improvements.`);
  }

  if (recommendations.length === 1 && recommendations[0].startsWith('✅')) {
    recommendations.push(`📈 Continue monitoring for any performance degradation.`);
  }

  return recommendations;
}
