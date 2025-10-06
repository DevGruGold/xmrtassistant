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
    const { code, language = 'python', version = '3.10.0', stdin = '', args = [], purpose = '' } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'No code provided' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Executing Python code via ${PISTON_API_URL}:`, code.substring(0, 100) + '...');
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
    
    console.log('Execution result:', {
      stdout: result.run?.stdout?.substring(0, 100),
      stderr: result.run?.stderr?.substring(0, 100),
      code: result.run?.code
    });

    // Log execution to database for visualization
    const logResult = await supabase
      .from('eliza_python_executions')
      .insert({
        code,
        output: result.run?.stdout || null,
        error: result.run?.stderr || null,
        exit_code: result.run?.code || 0,
        execution_time_ms: executionTime,
        source: 'eliza',
        purpose: purpose || null
      });

    if (logResult.error) {
      console.error('Failed to log execution:', logResult.error);
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
          exit_code: result.run?.code || 0
        },
        status: result.run?.code === 0 ? 'completed' : 'failed'
      });

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
