import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Use custom Piston instance if available (with enhanced libraries like pandas, numpy, requests, etc.)
// Falls back to public emkc.org Piston if CUSTOM_PISTON_URL is not set
const PISTON_API_URL = Deno.env.get('CUSTOM_PISTON_URL') || 'https://emkc.org/api/v2/piston';

// Initialize Supabase client for logging executions
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      code, 
      language = 'python', 
      version = '3.10.0', 
      stdin = '', 
      args = [], 
      purpose = '',
      source = 'eliza',      // Track execution source
      agent_id = null,        // Track agent ID
      task_id = null          // Track related task
    } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'No code provided' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🐍 [PYTHON-EXECUTOR] Incoming request - Source: ${source}, Purpose: ${purpose || 'none'}`);
    console.log(`📝 [CODE] Length: ${code.length} chars, First 100: ${code.substring(0, 100)}...`);
    console.log(`⚙️ [CONFIG] Piston URL: ${PISTON_API_URL}, Language: ${language}@${version}`);
    const startTime = Date.now();

    // Execute code using Piston API
    const response = await fetch(`${PISTON_API_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language,
        version,
        files: [
          {
            name: 'main.py',
            content: code
          }
        ],
        stdin,
        args,
        compile_timeout: 10000,
        run_timeout: 10000,
        compile_memory_limit: -1,
        run_memory_limit: -1
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Piston API error:', error);
      return new Response(
        JSON.stringify({ error: 'Code execution failed', details: error }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const result = await response.json();
    const executionTime = Date.now() - startTime;
    const exitCode = result.run?.code || 0;
    
    console.log(`⏱️ [TIMING] Execution completed in ${executionTime}ms`);
    console.log(`📊 [RESULT] Exit code: ${exitCode}`);
    console.log(`📤 [STDOUT] ${result.run?.stdout?.length || 0} chars: ${result.run?.stdout?.substring(0, 150) || '(empty)'}`);
    console.log(`❌ [STDERR] ${result.run?.stderr?.length || 0} chars: ${result.run?.stderr?.substring(0, 150) || '(empty)'}`);
    
    if (exitCode !== 0) {
      console.error(`🚨 [FAILURE] Python execution failed with exit code ${exitCode}`);
      console.error(`🔍 [ERROR DETAILS] ${result.run?.stderr || 'No error details available'}`);
    } else {
      console.log(`✅ [SUCCESS] Python execution completed successfully`);
    }

    // Log execution to database for visualization with enhanced metadata
    console.log(`💾 [DATABASE] Logging execution to eliza_python_executions...`);
    const logResult = await supabase
      .from('eliza_python_executions')
      .insert({
        code,
        output: result.run?.stdout || null,
        error: result.run?.stderr || null,
        exit_code: exitCode,
        execution_time_ms: executionTime,
        source: source,
        purpose: purpose || null,
        metadata: {
          agent_id: agent_id,
          task_id: task_id,
          language: language,
          version: version
        }
      });

    if (logResult.error) {
      console.error('🚨 [DATABASE ERROR] Failed to log execution:', logResult.error);
    } else {
      console.log(`✅ [DATABASE] Successfully logged execution`);
    }

    // Also log to activity log
    await supabase
      .from('eliza_activity_log')
      .insert({
        activity_type: 'python_execution',
        title: purpose || 'Python Code Execution',
        description: code.substring(0, 150) + (code.length > 150 ? '...' : ''),
        metadata: {
          language,
          version,
          execution_time_ms: executionTime,
          exit_code: exitCode
        },
        status: exitCode === 0 ? 'completed' : 'failed'
      });

    // 🚀 PHASE 5: Instant fix trigger for failed executions
    // Instead of waiting for cron (2 min), trigger fix immediately (real-time)
    if (exitCode === 1 && result.run?.stderr) {
      console.log('🔧 [AUTO-FIX] Execution failed - triggering instant code monitor daemon...');
      console.log(`📋 [AUTO-FIX] Error preview: ${result.run.stderr.substring(0, 200)}...`);
      
      // Fire-and-forget: Don't await to avoid blocking response
      supabase.functions.invoke('code-monitor-daemon', {
        body: { action: 'monitor', priority: 'immediate', source: 'python-executor' }
      }).then(() => {
        console.log('✅ [AUTO-FIX] Code monitor daemon triggered successfully');
      }).catch(err => {
        console.error('❌ [AUTO-FIX] Failed to trigger code monitor daemon:', err.message);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        output: result.run?.stdout || '',
        error: result.run?.stderr || '',
        exitCode: result.run?.code || 0,
        language: result.language,
        version: result.version
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in python-executor:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
