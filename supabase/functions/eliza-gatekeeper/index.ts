import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// TESTING MODE - Set to true to bypass all gatekeeping (auth, rate limits, schema protection)
const TESTING_MODE = Deno.env.get('GATEKEEPER_TESTING_MODE') === 'true';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-eliza-key, x-eliza-source',
};

// Whitelist of trusted Eliza sources
const TRUSTED_SOURCES = [
  'lovable-chat',
  'autonomous-code-fixer',
  'code-monitor-daemon',
  'agent-manager',
  'schema-manager',
  'gemini-chat',
  'deepseek-chat',
  'openai-chat',
  'task-orchestrator',
  'python-executor',
  'github-integration',
  'render-api',
  'vercel-manager',
  'ecosystem-monitor',
  'system-diagnostics'
];

// Dangerous schema operations that should be blocked (only in production)
const DANGEROUS_PATTERNS = [
  /DROP\s+TABLE/i,
  /DROP\s+DATABASE/i,
  /TRUNCATE/i,
  /DELETE\s+FROM\s+\w+\s*;/i,  // DELETE without WHERE
  /ALTER\s+DATABASE/i,
  /DROP\s+SCHEMA/i
];

// Rate limit configuration (requests per minute)
const RATE_LIMITS = {
  user: 100,
  eliza: 500,
  autonomous: 1000
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { target, action, payload, operation } = await req.json();
    
    // Extract headers
    const elizaKey = req.headers.get('x-eliza-key');
    const elizaSource = req.headers.get('x-eliza-source');
    const authHeader = req.headers.get('authorization');
    
    if (TESTING_MODE) {
      console.log(`🧪 TESTING MODE: Bypassing all gatekeeping for ${elizaSource} → ${target}`);
    } else {
      console.log(`🛡️ Gatekeeper request: source=${elizaSource}, target=${target}, action=${action}`);
    }

    // ===== AUTHENTICATION =====
    if (!TESTING_MODE) {
      const INTERNAL_KEY = Deno.env.get('INTERNAL_ELIZA_KEY');
      const isServiceRole = authHeader?.includes(supabaseKey);
      const isValidEliza = elizaKey === INTERNAL_KEY && elizaSource && TRUSTED_SOURCES.includes(elizaSource);
      
      if (!isServiceRole && !isValidEliza) {
        console.error('❌ Unauthorized gatekeeper access attempt');
        return new Response(JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Invalid Eliza credentials or untrusted source' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ===== RATE LIMITING =====
    if (!TESTING_MODE) {
      const sourceIdentifier = elizaSource || 'unknown';
      const endpoint = `${target}:${action}`;
      
      // Determine rate limit tier
      let rateLimit = RATE_LIMITS.user;
      if (elizaSource && TRUSTED_SOURCES.includes(elizaSource)) {
        rateLimit = elizaSource.includes('autonomous') || elizaSource.includes('monitor') 
          ? RATE_LIMITS.autonomous 
          : RATE_LIMITS.eliza;
      }

      // Check rate limit
      const { data: rateLimitData } = await supabase.rpc('increment_rate_limit', {
        p_identifier: sourceIdentifier,
        p_endpoint: endpoint
      });

      // Query current count
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { data: limitCheck } = await supabase
        .from('rate_limits')
        .select('request_count')
        .eq('identifier', sourceIdentifier)
        .eq('endpoint', endpoint)
        .gte('window_start', oneMinuteAgo)
        .single();

      if (limitCheck && limitCheck.request_count > rateLimit) {
        console.warn(`⚠️ Rate limit exceeded for ${sourceIdentifier} on ${endpoint}`);
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: `Maximum ${rateLimit} requests per minute exceeded` 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ===== SCHEMA PROTECTION =====
    if (!TESTING_MODE && (operation || action === 'validate_schema' || target === 'schema-manager')) {
      const sqlToCheck = operation || payload?.sql || payload?.query || '';
      
      // Check for dangerous patterns
      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(sqlToCheck)) {
          console.error(`🚫 Dangerous operation blocked: ${pattern}`);
          
          // Log to activity log
          await supabase.from('eliza_activity_log').insert({
            activity_type: 'schema_protection',
            title: '🚫 Dangerous Operation Blocked',
            description: `Blocked ${pattern} from ${elizaSource}`,
            status: 'blocked',
            metadata: { source: elizaSource, pattern: pattern.toString(), sql: sqlToCheck }
          });

          return new Response(JSON.stringify({ 
            error: 'Dangerous operation blocked',
            message: `Schema protection: ${pattern} operations are not allowed`,
            blocked_pattern: pattern.toString()
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // For schema operations, validate with schema-manager first
      if (target !== 'schema-manager' && sqlToCheck) {
        const { data: validation } = await supabase.functions.invoke('schema-manager', {
          body: { action: 'validate', sql: sqlToCheck }
        });

        if (validation && !validation.valid) {
          console.warn(`⚠️ Schema validation failed: ${validation.reason}`);
          
          // Attempt auto-fix via autonomous-code-fixer
          await supabase.functions.invoke('autonomous-code-fixer', {
            body: { 
              type: 'schema_error',
              error: validation.reason,
              context: { sql: sqlToCheck, source: elizaSource }
            }
          });

          return new Response(JSON.stringify({ 
            error: 'Schema validation failed',
            message: validation.reason,
            auto_fix_triggered: true
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // ===== ROUTING =====
    let response;
    
    switch (target) {
      case 'lovable-chat':
        response = await supabase.functions.invoke('lovable-chat', { body: payload });
        break;
      
      case 'gemini-chat':
        response = await supabase.functions.invoke('gemini-chat', { body: payload });
        break;
      
      case 'deepseek-chat':
        response = await supabase.functions.invoke('deepseek-chat', { body: payload });
        break;
      
      case 'openai-chat':
        response = await supabase.functions.invoke('openai-chat', { body: payload });
        break;
      
      case 'autonomous-code-fixer':
        response = await supabase.functions.invoke('autonomous-code-fixer', { body: payload });
        break;
      
      case 'code-monitor-daemon':
        response = await supabase.functions.invoke('code-monitor-daemon', { body: payload });
        break;
      
      case 'agent-manager':
        // Pass action and data directly to agent-manager
        response = await supabase.functions.invoke('agent-manager', { 
          body: {
            action: payload.action || action,
            data: payload.data || payload,
            autonomous: payload.autonomous || true
          }
        });
        break;
      
      case 'schema-manager':
        response = await supabase.functions.invoke('schema-manager', { body: payload });
        break;
      
      case 'task-orchestrator':
        response = await supabase.functions.invoke('task-orchestrator', { body: payload });
        break;
      
      case 'python-executor':
        response = await supabase.functions.invoke('python-executor', { body: payload });
        break;
      
      case 'github-integration':
        response = await supabase.functions.invoke('github-integration', { body: payload });
        break;
      
      case 'render-api':
        response = await supabase.functions.invoke('render-api', { body: payload });
        break;
      
      case 'vercel-manager':
        response = await supabase.functions.invoke('vercel-manager', { body: payload });
        break;
      
      case 'ecosystem-monitor':
        response = await supabase.functions.invoke('ecosystem-monitor', { body: payload });
        break;
      
      case 'system-diagnostics':
        response = await supabase.functions.invoke('system-diagnostics', { body: payload });
        break;
      
      default:
        console.error(`❌ Unknown target: ${target}`);
        return new Response(JSON.stringify({ 
          error: 'Unknown target',
          message: `Target '${target}' is not recognized by the gatekeeper` 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const executionTime = Date.now() - startTime;

    // Log successful call
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'gatekeeper_call',
      title: `🛡️ ${elizaSource} → ${target}`,
      description: `Action: ${action}`,
      status: response.error ? 'error' : 'completed',
      metadata: {
        source: elizaSource,
        target,
        action,
        execution_time_ms: executionTime,
        success: !response.error
      }
    });

    // Log to API call logs
    await supabase.from('api_call_logs').insert({
      function_name: 'eliza-gatekeeper',
      status: response.error ? 'error' : 'success',
      request_payload: { target, action, source: elizaSource },
      response_data: response.data || null,
      error_message: response.error?.message || null,
      execution_time_ms: executionTime,
      caller_context: { source: elizaSource, authenticated: true }
    });

    console.log(`✅ Gatekeeper routed ${elizaSource} → ${target} in ${executionTime}ms`);

    return new Response(JSON.stringify(response.data || response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Gatekeeper error:', error);
    
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'gatekeeper_error',
      title: '❌ Gatekeeper Error',
      description: error.message,
      status: 'error',
      metadata: { error: error.message, stack: error.stack }
    });

    return new Response(JSON.stringify({ 
      error: error.message,
      message: 'Gatekeeper encountered an error processing your request'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
