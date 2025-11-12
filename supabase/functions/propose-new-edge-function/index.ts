import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const { 
      function_name,
      description,
      proposed_by, // CSO, CTO, CIO, CAO, or 'eliza'
      category,
      rationale,
      use_cases,
      implementation_outline
    } = await req.json();

    // Validate required fields
    if (!function_name || !description || !proposed_by || !category || !rationale || !use_cases) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if function name already exists
    const { data: existing } = await supabase
      .from('edge_function_proposals')
      .select('id')
      .eq('function_name', function_name)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Function name already proposed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Create proposal
    const { data: proposal, error: insertError } = await supabase
      .from('edge_function_proposals')
      .insert({
        function_name,
        description,
        proposed_by,
        category,
        rationale,
        use_cases: Array.isArray(use_cases) ? use_cases : [use_cases],
        implementation_code: implementation_outline || null,
        status: 'voting'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Notify all executives via activity feed
    const executives = ['CSO', 'CTO', 'CIO', 'CAO'];
    const notifications = executives.map(exec => ({
      type: 'function_proposal',
      title: `New Edge Function Proposed: ${function_name}`,
      description: `${proposed_by} proposes: ${description}`,
      data: {
        proposal_id: proposal.id,
        function_name,
        proposed_by,
        category
      }
    }));

    await supabase
      .from('activity_feed')
      .insert(notifications);

    console.log(`Proposal created: ${proposal.id} by ${proposed_by}`);

    return new Response(
      JSON.stringify({
        success: true,
        proposal_id: proposal.id,
        proposal,
        message: `Proposal submitted. Awaiting votes from 4 executives (need 3/4 approval).`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201 
      }
    );

  } catch (error) {
    console.error('Proposal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
