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

    // Create an activity log entry for Eliza
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'python_fix',
      title: '🔧 Python Code Auto-Fixed',
      description: `Successfully fixed and executed Python code. Original error: ${execution.error?.substring(0, 100)}...`,
      status: 'completed',
      metadata: {
        original_execution_id: execution_id,
        fixed_execution_id: successExec?.id,
        original_error: execution.error,
        output: execResult.output,
        purpose: execution.purpose
      }
    });

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
