import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { limit = 10, include_failures_only = false } = await req.json();
    
    console.log(`📚 Fetching code execution lessons (limit: ${limit}, failures only: ${include_failures_only})`);
    
    // Query recent executions with learning metadata
    let query = supabase
      .from('eliza_python_executions')
      .select('id, code, output, error, exit_code, execution_time_ms, source, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (include_failures_only) {
      query = query.neq('exit_code', 0);
    }
    
    const { data: executions, error: queryError } = await query;
    
    if (queryError) {
      throw queryError;
    }
    
    // Analyze patterns and generate lessons
    const lessons = {
      total_executions: executions?.length || 0,
      success_rate: 0,
      common_errors: {},
      successful_patterns: [],
      failed_patterns: [],
      recommendations: []
    };
    
    if (executions && executions.length > 0) {
      const successful = executions.filter(e => e.exit_code === 0);
      lessons.success_rate = Math.round((successful.length / executions.length) * 100);
      
      // Analyze error patterns
      const errorCounts: Record<string, number> = {};
      executions.forEach(exec => {
        if (exec.exit_code !== 0 && exec.metadata?.error_type) {
          const errorType = exec.metadata.error_type;
          errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
        }
      });
      
      lessons.common_errors = errorCounts;
      
      // Extract successful patterns
      successful.forEach(exec => {
        if (exec.code && exec.code.length < 500) { // Only short, reusable patterns
          lessons.successful_patterns.push({
            code_snippet: exec.code.substring(0, 200),
            purpose: exec.metadata?.purpose || 'Unknown',
            execution_time: exec.execution_time_ms
          });
        }
      });
      
      // Extract failed patterns with lessons
      executions.filter(e => e.exit_code !== 0).forEach(exec => {
        lessons.failed_patterns.push({
          error_type: exec.metadata?.error_type || 'Unknown',
          error_message: exec.error?.substring(0, 200) || 'No error message',
          lesson: exec.metadata?.lesson || 'Review code carefully',
          was_fixed: exec.metadata?.was_auto_fixed || false,
          fix_pattern: exec.metadata?.fix_pattern
        });
      });
      
      // Generate recommendations
      const topErrors = Object.entries(errorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);
      
      topErrors.forEach(([errorType, count]) => {
        const recommendations: Record<string, string> = {
          'import_error': `You have ${count} import errors. Remember: Only stdlib available. Use urllib.request instead of requests module.`,
          'name_error': `You have ${count} name errors. Tip: Always define variables in scope before using them.`,
          'syntax_error': `You have ${count} syntax errors. Tip: Check indentation, colons, and brackets carefully.`,
          'network_error': `You have ${count} network errors. Tip: Use call_network_proxy helper for external API calls.`,
          'api_error': `You have ${count} API errors. Tip: Validate endpoints and handle 404/401 responses gracefully.`,
          'type_error': `You have ${count} type errors. Tip: Convert data types explicitly (int(), str(), float()).`,
        };
        
        if (recommendations[errorType]) {
          lessons.recommendations.push(recommendations[errorType]);
        }
      });
      
      // Add success-based recommendations
      if (lessons.success_rate >= 80) {
        lessons.recommendations.push(`✅ Excellent! ${lessons.success_rate}% success rate. Keep using current patterns.`);
      } else if (lessons.success_rate >= 60) {
        lessons.recommendations.push(`⚠️ ${lessons.success_rate}% success rate. Review failed patterns and apply lessons learned.`);
      } else {
        lessons.recommendations.push(`❌ ${lessons.success_rate}% success rate. Study successful patterns and common error fixes carefully.`);
      }
    }
    
    console.log(`✅ Generated ${lessons.recommendations.length} recommendations from ${lessons.total_executions} executions`);
    
    return new Response(
      JSON.stringify(lessons),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('Error fetching code lessons:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
