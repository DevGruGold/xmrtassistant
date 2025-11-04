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
      proposal_id,
      executive_name, // CSO, CTO, CIO, or CAO
      vote, // approve, reject, or abstain
      reasoning
    } = await req.json();

    // Validate
    if (!proposal_id || !executive_name || !vote || !reasoning) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const validExecutives = ['CSO', 'CTO', 'CIO', 'CAO'];
    if (!validExecutives.includes(executive_name)) {
      return new Response(
        JSON.stringify({ error: 'Invalid executive name' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('edge_function_proposals')
      .select('*')
      .eq('id', proposal_id)
      .single();

    if (proposalError || !proposal) {
      return new Response(
        JSON.stringify({ error: 'Proposal not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (proposal.status !== 'voting') {
      return new Response(
        JSON.stringify({ error: `Proposal is ${proposal.status}, voting closed` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Record vote (upsert in case of revote)
    const { error: voteError } = await supabase
      .from('executive_votes')
      .upsert({
        proposal_id,
        executive_name,
        vote,
        reasoning
      });

    if (voteError) throw voteError;

    // Count votes
    const { data: votes, error: votesError } = await supabase
      .from('executive_votes')
      .select('*')
      .eq('proposal_id', proposal_id);

    if (votesError) throw votesError;

    const approvals = votes?.filter(v => v.vote === 'approve').length || 0;
    const rejections = votes?.filter(v => v.vote === 'reject').length || 0;
    const totalVotes = votes?.length || 0;

    console.log(`Vote recorded: ${executive_name} voted ${vote} (${approvals} approvals, ${rejections} rejections)`);

    // Check for consensus (3/4 approval required)
    let consensusReached = false;
    let newStatus = 'voting';

    if (approvals >= 3) {
      // Consensus reached - approve
      consensusReached = true;
      newStatus = 'approved';
      
      await supabase
        .from('edge_function_proposals')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', proposal_id);

      // Notify about approval
      await supabase
        .from('activity_feed')
        .insert({
          type: 'function_approved',
          title: `Edge Function Approved: ${proposal.function_name}`,
          description: `Consensus reached (${approvals}/4 approvals). Ready for deployment.`,
          data: {
            proposal_id,
            function_name: proposal.function_name,
            approvals,
            votes_summary: votes
          }
        });

    } else if (rejections >= 2 || totalVotes === 4) {
      // If 2+ rejections or all votes are in and < 3 approvals
      if (approvals < 3 && totalVotes === 4) {
        consensusReached = true;
        newStatus = 'rejected';
        
        await supabase
          .from('edge_function_proposals')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('id', proposal_id);

        await supabase
          .from('activity_feed')
          .insert({
            type: 'function_rejected',
            title: `Edge Function Rejected: ${proposal.function_name}`,
            description: `Failed to reach consensus (${approvals}/4 approvals needed).`,
            data: {
              proposal_id,
              function_name: proposal.function_name,
              approvals,
              rejections
            }
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        vote_recorded: true,
        consensus_reached: consensusReached,
        status: newStatus,
        vote_summary: {
          approvals,
          rejections,
          total_votes: totalVotes,
          votes_needed: Math.max(0, 3 - approvals)
        },
        proposal
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Vote error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
