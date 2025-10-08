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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { scenario_type, scenario_name, parameters } = await req.json();

    console.log(`Running scenario: ${scenario_type} - ${scenario_name}`);

    // Read Python code
    const pythonCode = await Deno.readTextFile('./scenario_modeling_core.py');

    // Execute Python simulation
    const { data: pythonResult, error: pythonError } = await supabase.functions.invoke('python-executor', {
      body: {
        code: pythonCode,
        language: 'python',
        stdin: JSON.stringify({
          scenario_type,
          scenario_name,
          parameters
        }),
        args: ['run'],
        purpose: 'scenario_modeling'
      }
    });

    if (pythonError) {
      console.error('Python execution error:', pythonError);
      throw new Error(`Python execution failed: ${pythonError.message}`);
    }

    const result = pythonResult.output ? JSON.parse(pythonResult.output) : {};

    // Store simulation in database
    const { data: simulationRecord, error: insertError } = await supabase
      .from('scenario_simulations')
      .insert({
        scenario_type,
        scenario_name,
        input_parameters: parameters,
        simulation_results: result.simulation_results,
        confidence_level: result.confidence_level || 0.75,
        recommendations: result.recommendations || [],
        risk_assessment: result.risk_assessment || {},
        execution_time_ms: result.execution_time_ms || 0,
        created_by: 'eliza_auto'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing simulation:', insertError);
    }

    // Log activity
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'scenario_modeling',
      title: `Scenario Simulation: ${scenario_name}`,
      description: `Completed ${scenario_type} simulation: ${scenario_name}`,
      status: 'completed',
      metadata: {
        scenario_type,
        scenario_name,
        simulation_id: simulationRecord?.id,
        confidence_level: result.confidence_level,
        execution_time_ms: result.execution_time_ms
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        simulation_id: simulationRecord?.id,
        scenario_type: result.scenario_type,
        scenario_name: result.scenario_name,
        simulation_results: result.simulation_results,
        confidence_level: result.confidence_level,
        recommendations: result.recommendations,
        risk_assessment: result.risk_assessment,
        execution_time_ms: result.execution_time_ms
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Scenario modeling error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
