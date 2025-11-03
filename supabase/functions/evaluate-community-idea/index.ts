import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvaluationScores {
  financial_sovereignty: number;
  democracy: number;
  privacy: number;
  technical_feasibility: number;
  community_benefit: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ideaId } = await req.json();

    if (action === 'evaluate_pending') {
      // Get all ideas in 'submitted' status
      const { data: pendingIdeas } = await supabase
        .from('community_ideas')
        .select('*')
        .eq('status', 'submitted')
        .limit(5);

      if (!pendingIdeas || pendingIdeas.length === 0) {
        return new Response(JSON.stringify({ message: 'No pending ideas to evaluate' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      for (const idea of pendingIdeas) {
        await evaluateIdea(supabase, idea.id);
      }

      return new Response(JSON.stringify({
        success: true,
        evaluated: pendingIdeas.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Single idea evaluation
    if (ideaId) {
      const result = await evaluateIdea(supabase, ideaId);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Missing action or ideaId');

  } catch (error) {
    console.error('❌ Idea evaluation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function evaluateIdea(supabase: any, ideaId: string) {
  console.log(`🔍 Evaluating idea: ${ideaId}`);

  // Get idea details
  const { data: idea, error: ideaError } = await supabase
    .from('community_ideas')
    .select('*')
    .eq('id', ideaId)
    .single();

  if (ideaError || !idea) {
    throw new Error('Idea not found');
  }

  // Update status to under_review
  await supabase
    .from('community_ideas')
    .update({ status: 'under_review' })
    .eq('id', ideaId);

  // Log initial review
  await supabase.from('idea_evaluation_history').insert({
    idea_id: ideaId,
    evaluation_stage: 'initial_review',
    evaluator: 'eliza',
    notes: 'Starting evaluation process'
  });

  // STEP 1: Initial Triage - Score the idea
  const scores = await scoreIdea(idea);

  // STEP 2: Executive Council Deliberation
  const councilPerspectives = await conveneCouncil(supabase, idea, scores);

  // STEP 3: System Architecture Analysis
  const architectureAnalysis = await analyzeArchitecture(supabase, idea);

  // STEP 4: Calculate average score and make recommendation
  const avgScore = Math.round(
    (scores.financial_sovereignty + scores.democracy + scores.privacy + 
     scores.technical_feasibility + scores.community_benefit) / 5
  );

  const approved = avgScore >= 65;
  const consensus = avgScore >= 70;

  // Update idea with evaluation results
  await supabase
    .from('community_ideas')
    .update({
      status: approved ? 'approved' : 'rejected',
      financial_sovereignty_score: scores.financial_sovereignty,
      democracy_score: scores.democracy,
      privacy_score: scores.privacy,
      technical_feasibility_score: scores.technical_feasibility,
      community_benefit_score: scores.community_benefit,
      cso_perspective: councilPerspectives.cso,
      cto_perspective: councilPerspectives.cto,
      cio_perspective: councilPerspectives.cio,
      cao_perspective: councilPerspectives.cao,
      council_consensus: consensus,
      council_recommendation: approved 
        ? `APPROVED (Score: ${avgScore}/100) - ${councilPerspectives.recommendation}`
        : `REJECTED (Score: ${avgScore}/100) - Does not meet minimum threshold`,
      implementation_plan: approved ? architectureAnalysis.plan : null,
      required_components: approved ? architectureAnalysis.components : null,
      estimated_complexity: architectureAnalysis.complexity,
      estimated_timeline: architectureAnalysis.timeline
    })
    .eq('id', ideaId);

  // Log council deliberation
  await supabase.from('idea_evaluation_history').insert({
    idea_id: ideaId,
    evaluation_stage: 'council_deliberation',
    evaluator: 'executive_council',
    notes: `Average score: ${avgScore}/100. ${approved ? 'APPROVED' : 'REJECTED'}`,
    scores: { ...scores, average: avgScore }
  });

  // If approved, create implementation task
  if (approved) {
    await supabase.from('tasks').insert({
      title: `Implement: ${idea.title}`,
      description: `Community idea implementation:\n\n${idea.description}\n\nImplementation Plan:\n${JSON.stringify(architectureAnalysis.plan, null, 2)}`,
      status: 'pending',
      priority: avgScore >= 80 ? 'high' : avgScore >= 70 ? 'medium' : 'low',
      category: 'community_idea',
      metadata: { idea_id: ideaId, scores, council_perspectives: councilPerspectives }
    });

    console.log(`✅ Idea ${ideaId} APPROVED (${avgScore}/100) - Task created`);
  } else {
    console.log(`❌ Idea ${ideaId} REJECTED (${avgScore}/100)`);
  }

  return {
    success: true,
    ideaId,
    approved,
    avgScore,
    scores,
    councilPerspectives,
    architectureAnalysis
  };
}

function scoreIdea(idea: any): EvaluationScores {
  const { title, description, category } = idea;
  const text = `${title} ${description}`.toLowerCase();

  // Financial Sovereignty Keywords
  const sovereigntyKeywords = ['mining', 'wallet', 'crypto', 'xmr', 'monero', 'payment', 'transaction', 'economic', 'revenue', 'income'];
  const sovereigntyScore = Math.min(100, 
    40 + (sovereigntyKeywords.filter(k => text.includes(k)).length * 10)
  );

  // Democracy Keywords
  const democracyKeywords = ['governance', 'vote', 'dao', 'community', 'proposal', 'decision', 'transparent', 'participation'];
  const democracyScore = Math.min(100,
    30 + (democracyKeywords.filter(k => text.includes(k)).length * 12)
  );

  // Privacy Keywords
  const privacyKeywords = ['privacy', 'anonymous', 'encryption', 'secure', 'private', 'confidential', 'stealth'];
  const privacyScore = Math.min(100,
    40 + (privacyKeywords.filter(k => text.includes(k)).length * 10)
  );

  // Technical Feasibility
  const technicalKeywords = ['integrate', 'api', 'function', 'database', 'optimization', 'performance'];
  const technicalScore = Math.min(100,
    50 + (technicalKeywords.filter(k => text.includes(k)).length * 8)
  );

  // Community Benefit (based on category and description length)
  let communityScore = 50;
  if (category === 'community') communityScore += 20;
  if (description.length > 200) communityScore += 15; // detailed ideas score higher
  if (text.includes('user') || text.includes('member')) communityScore += 15;

  return {
    financial_sovereignty: Math.min(100, sovereigntyScore),
    democracy: Math.min(100, democracyScore),
    privacy: Math.min(100, privacyScore),
    technical_feasibility: Math.min(100, technicalScore),
    community_benefit: Math.min(100, communityScore)
  };
}

async function conveneCouncil(supabase: any, idea: any, scores: EvaluationScores) {
  // CSO: Strategic alignment, community impact
  const csoPerspective = `Strategic Value: ${scores.community_benefit}/100. ` +
    (scores.community_benefit >= 70 ? 'Strong community alignment. ' : 'Moderate community impact. ') +
    `Supports ${idea.category} pillar of XMRT DAO.`;

  // CTO: Technical feasibility, architecture fit
  const ctoPerspective = `Technical Feasibility: ${scores.technical_feasibility}/100. ` +
    (scores.technical_feasibility >= 70 
      ? 'Implementation is straightforward with existing infrastructure. '
      : 'Will require new components and careful integration. ') +
    'Reviewing system architecture compatibility...';

  // CIO: Data/information implications
  const cioPerspective = `Information Security: ${scores.privacy}/100. ` +
    (scores.privacy >= 70 
      ? 'Strong privacy considerations. Aligns with XMRT values. '
      : 'Privacy implications need careful review. ') +
    'Data handling procedures adequate.';

  // CAO: Cost-benefit analysis
  const caoPerspective = `Financial Impact: ${scores.financial_sovereignty}/100. ` +
    (scores.financial_sovereignty >= 70
      ? 'Positive ROI expected. Strengthens financial sovereignty. '
      : 'Financial benefits unclear. Further analysis needed. ') +
    'Resource allocation recommended.';

  const avgScore = Math.round(
    (scores.financial_sovereignty + scores.democracy + scores.privacy + 
     scores.technical_feasibility + scores.community_benefit) / 5
  );

  const recommendation = avgScore >= 80 
    ? 'STRONG APPROVAL - High strategic value'
    : avgScore >= 65
    ? 'CONDITIONAL APPROVAL - Proceed with monitoring'
    : 'REJECTION - Does not meet quality threshold';

  return {
    cso: csoPerspective,
    cto: ctoPerspective,
    cio: cioPerspective,
    cao: caoPerspective,
    recommendation
  };
}

async function analyzeArchitecture(supabase: any, idea: any) {
  const { title, description } = idea;
  const text = `${title} ${description}`.toLowerCase();

  // Determine what components would be needed
  const components: any = {
    existing_to_leverage: [],
    new_needed: []
  };

  // Check for mining-related
  if (text.includes('mining') || text.includes('miner')) {
    components.existing_to_leverage.push('mining-proxy', 'device_connection_sessions', 'mining_sessions');
    components.new_needed.push('Extended mining analytics');
  }

  // Check for wallet/transaction
  if (text.includes('wallet') || text.includes('transaction') || text.includes('xmr')) {
    components.existing_to_leverage.push('xmrt_transactions', 'xmrt_balances');
  }

  // Check for community features
  if (text.includes('community') || text.includes('social')) {
    components.existing_to_leverage.push('user_profiles', 'github-integration');
  }

  // Estimate complexity
  const newComponentCount = components.new_needed.length;
  const complexity = newComponentCount === 0 ? 'low' 
    : newComponentCount <= 2 ? 'medium'
    : newComponentCount <= 4 ? 'high'
    : 'very_high';

  const timeline = complexity === 'low' ? '1-2 days'
    : complexity === 'medium' ? '3-7 days'
    : complexity === 'high' ? '1-2 weeks'
    : '2-4 weeks';

  const plan = {
    phase1: 'Database schema updates',
    phase2: 'Edge function development',
    phase3: 'Frontend integration',
    phase4: 'Testing and deployment'
  };

  return {
    components,
    complexity,
    timeline,
    plan
  };
}
