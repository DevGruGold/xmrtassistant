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

    const requestData = await req.json();
    const { action, experience, config } = requestData;

    console.log(`Enhanced learning request: ${action}`);

    // Execute Python learning core
    const pythonCode = await Deno.readTextFile('./enhanced_learning_core.py');
    
    const { data: pythonResult, error: pythonError } = await supabase.functions.invoke('python-executor', {
      body: {
        code: pythonCode,
        function_name: 'process_learning_request',
        args: {
          action,
          experience,
          config
        }
      }
    });

    if (pythonError) {
      console.error('Python execution error:', pythonError);
      return new Response(
        JSON.stringify({ error: 'Python execution failed', details: pythonError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store learning result in database
    if (action === 'learn' && pythonResult?.learning_iteration) {
      await supabase.from('learning_patterns').insert({
        pattern_type: 'enhanced_ml',
        pattern_data: pythonResult,
        confidence_score: experience?.confidence || 0.5,
        usage_count: 1
      });
    }

    // Log activity
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'enhanced_learning',
      description: `Enhanced learning: ${action}`,
      status: 'completed',
      metadata: {
        action,
        learning_iteration: pythonResult?.learning_iteration,
        optimizer: pythonResult?.current_optimizer
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        result: pythonResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Enhanced learning error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
