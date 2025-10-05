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

    // Use Gemini to analyze and fix the code
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const fixPrompt = `You are a Python debugging expert. The following Python code failed with an error.

Original Code:
\`\`\`python
${execution.code}
\`\`\`

Error:
${execution.error}

Purpose: ${execution.purpose || 'Unknown'}

Please analyze the error and provide ONLY the fixed Python code. Do not include explanations, markdown code blocks, or any other text. Just return the corrected Python code that will execute successfully.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: fixPrompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    const geminiData = await geminiResponse.json();
    let fixedCode = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

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

    // Also create a conversation message for Eliza to process the fix
    const { data: sessions } = await supabase
      .from('conversation_sessions')
      .select('id')
      .eq('session_key', 'eliza-system')
      .order('created_at', { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      await supabase.from('conversation_messages').insert({
        session_id: sessions[0].id,
        role: 'system',
        content: JSON.stringify({
          type: 'code_fix_learning',
          original_error: execution.error,
          original_code: execution.code,
          fixed_code: fixedCode,
          output: execResult.output,
          purpose: execution.purpose
        }),
        metadata: {
          source: 'python-fixer-agent',
          fix_execution_id: successExec?.id
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
