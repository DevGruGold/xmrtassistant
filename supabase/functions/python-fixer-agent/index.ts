import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { execution_id } = await req.json();

    console.log('🔧 Python Fixer Agent - Starting fix for execution:', execution_id);

    // Get the failed execution
    const { data: execution, error: fetchError } = await supabase
      .from('eliza_python_executions')
      .select('*')
      .eq('id', execution_id)
      .single();

    if (fetchError || !execution) {
      throw new Error(`Failed to fetch execution: ${fetchError?.message}`);
    }

    console.log('📋 Original code:', execution.code);
    console.log('❌ Error:', execution.error);

    // Use Lovable AI Gateway (Gemini 2.5 Flash - free until Oct 6, 2025) to analyze and fix the code
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const fixPrompt = `You are a Python debugging expert. The following Python code failed with an error.

Original Code:
\`\`\`python
${execution.code}
\`\`\`

Error:
${execution.error}

Purpose: ${execution.purpose || 'Unknown'}

CRITICAL CONSTRAINTS:
- The Python sandbox ONLY has the standard library available (no pip packages)
- You CANNOT use: requests, numpy, pandas, or any external libraries
- You MUST use only built-in Python modules like: urllib.request, urllib.parse, json, http.client, etc.
- For HTTP requests, use urllib.request.urlopen() or http.client
- For JSON parsing, use the json module

Please analyze the error and provide ONLY the fixed Python code using standard library alternatives. Do not include explanations, markdown code blocks, or any other text. Just return the corrected Python code that will execute successfully in a standard library-only environment.

Example of converting requests to urllib:
\`\`\`python
# BAD (uses requests):
import requests
response = requests.get('https://api.example.com')
data = response.json()

# GOOD (uses standard library):
import urllib.request
import json
with urllib.request.urlopen('https://api.example.com') as response:
    data = json.loads(response.read().decode())
\`\`\`
`;

    console.log('🤖 Calling Lovable AI Gateway for code fix...');

    const aiResponse = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash', // Free until Oct 6, 2025
          messages: [
            {
              role: 'system',
              content: 'You are a Python debugging expert. Always return only the fixed Python code without any explanations or markdown formatting.'
            },
            {
              role: 'user',
              content: fixPrompt
            }
          ],
        })
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI Gateway error:', errorText);
      
      // Check if it's a rate limit or payment error
      if (aiResponse.status === 429) {
        console.log('⏸️ Lovable AI rate limit exceeded, skipping fix attempt');
        
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'python_fix',
          title: '⏸️ Python Fix Skipped - Rate Limited',
          description: 'Lovable AI rate limit exceeded. Code fix skipped.',
          status: 'pending',
          metadata: {
            execution_id,
            reason: 'rate_limit_exceeded',
            error: execution.error?.substring(0, 100)
          }
        });
        
        return new Response(JSON.stringify({
          success: false,
          skipped: true,
          reason: 'rate_limit_exceeded',
          error: 'Lovable AI rate limit exceeded'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
      
      if (aiResponse.status === 402) {
        console.log('⏸️ Lovable AI payment required, skipping fix attempt');
        
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'python_fix',
          title: '💳 Python Fix Skipped - Payment Required',
          description: 'Lovable AI credits exhausted. Code fix skipped.',
          status: 'pending',
          metadata: {
            execution_id,
            reason: 'payment_required',
            error: execution.error?.substring(0, 100)
          }
        });
        
        return new Response(JSON.stringify({
          success: false,
          skipped: true,
          reason: 'payment_required',
          error: 'Lovable AI payment required'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
      
      throw new Error(`Lovable AI Gateway failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    let fixedCode = aiData.choices?.[0]?.message?.content || '';

    console.log('✅ Received fix from Lovable AI Gateway');

    // Clean up the code (remove markdown if present)
    fixedCode = fixedCode.replace(/```python\n?/g, '').replace(/```\n?/g, '').trim();

    console.log('🔄 Fixed code:', fixedCode);

    // Execute the fixed code
    const { data: execResult, error: execError } = await supabase.functions.invoke('python-executor', {
      body: {
        code: fixedCode,
        stdin: '',
        args: []
      }
    });

    if (execError) {
      console.error('❌ Fixed code execution failed:', execError);
      
      // Log the failed attempt
      await supabase.from('eliza_python_executions').insert({
        code: fixedCode,
        output: '',
        error: execError.message,
        exit_code: 1,
        source: 'python-fixer-agent',
        purpose: `Fix attempt for: ${execution.purpose || 'Unknown'}`
      });

      return new Response(JSON.stringify({
        success: false,
        error: 'Fixed code still failed',
        attempted_fix: fixedCode,
        new_error: execError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log('✅ Fixed code executed successfully!');

    // Log the successful execution
    const { data: successExec } = await supabase.from('eliza_python_executions').insert({
      code: fixedCode,
      output: execResult.output,
      error: execResult.error || '',
      exit_code: execResult.exitCode || 0,
      source: 'python-fixer-agent',
      purpose: `Fixed: ${execution.purpose || 'Unknown'}`
    }).select().single();

    // Create an activity log entry for Eliza with detailed learning data
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'python_fix',
      title: '🔧 Python Code Auto-Fixed',
      description: `Successfully fixed and executed Python code. Original error: ${execution.error?.substring(0, 100)}...`,
      status: 'completed',
      metadata: {
        original_execution_id: execution_id,
        fixed_execution_id: successExec?.id,
        original_code: execution.code,
        fixed_code: fixedCode,
        original_error: execution.error,
        fix_output: execResult.output,
        purpose: execution.purpose,
        learning_insight: `Code fix pattern: ${execution.error?.split('\n')[0]} was resolved by modifying the code structure`,
        timestamp: new Date().toISOString()
      }
    });

    // Also create a human-readable conversation message for Eliza with the actual output
    const { data: sessions } = await supabase
      .from('conversation_sessions')
      .select('id')
      .eq('session_key', 'eliza-system')
      .order('created_at', { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      // Create a system message with the actual output that Eliza was trying to get
      const outputMessage = execResult.output 
        ? `✅ Python execution succeeded. Output:\n${execResult.output}` 
        : '✅ Python code executed successfully (no output)';
      
      await supabase.from('conversation_messages').insert({
        session_id: sessions[0].id,
        message_type: 'system',
        content: `AUTONOMOUS CODE FIX COMPLETE\n\nOriginal Purpose: ${execution.purpose || 'Unknown'}\n\n${outputMessage}\n\n🔧 The code was automatically fixed and executed. Original error was: ${execution.error?.split('\n')[0]}`,
        metadata: {
          source: 'python-fixer-agent',
          fix_execution_id: successExec?.id,
          original_execution_id: execution_id,
          output: execResult.output,
          fixed_code: fixedCode.substring(0, 500) // First 500 chars for reference
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      fixed_code: fixedCode,
      output: execResult.output,
      execution_id: successExec?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Python Fixer Agent error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
