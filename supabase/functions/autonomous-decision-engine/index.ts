import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { trigger, context = {} } = await req.json();
    
    console.log('🧠 Autonomous Decision Engine triggered:', trigger);
    
    // Gather system state
    const [
      { data: agents },
      { data: tasks },
      { data: recentActivity },
      { data: recentDecisions }
    ] = await Promise.all([
      supabase.from('agents').select('*'),
      supabase.from('tasks').select('*').in('status', ['PENDING', 'IN_PROGRESS', 'BLOCKED']),
      supabase.from('eliza_activity_log').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('decisions').select('*').order('created_at', { ascending: false }).limit(10)
    ]);
    
    // Build decision context
    const decisionContext = {
      trigger,
      current_state: {
        agents: agents?.length || 0,
        idle_agents: agents?.filter(a => a.status === 'IDLE').length || 0,
        pending_tasks: tasks?.filter(t => t.status === 'PENDING').length || 0,
        blocked_tasks: tasks?.filter(t => t.status === 'BLOCKED').length || 0,
        in_progress_tasks: tasks?.filter(t => t.status === 'IN_PROGRESS').length || 0
      },
      recent_activity: recentActivity?.slice(0, 5),
      recent_decisions: recentDecisions?.slice(0, 3),
      context
    };
    
    console.log('📊 System State:', decisionContext.current_state);
    
    // Use AI to make autonomous decision
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are Eliza's autonomous decision engine. You analyze system state and make strategic decisions about task execution, agent coordination, and workflow optimization.

Your goals:
- Maximize system efficiency and task completion
- Ensure agent workload balance
- Identify and resolve blockers proactively
- Coordinate complex multi-step workflows
- Make data-driven decisions based on system state

You can decide to:
1. Assign tasks to agents
2. Create new tasks or break down complex ones
3. Initiate multi-step workflows
4. Adjust priorities based on system load
5. Trigger GitHub operations or code executions
6. Update system configurations

Always provide your decision in JSON format with:
{
  "decision": "short description",
  "rationale": "detailed reasoning",
  "actions": [
    {
      "type": "action_type",
      "priority": 1-10,
      "data": { /* action-specific data */ }
    }
  ],
  "expected_outcome": "what you expect to achieve"
}`
          },
          {
            role: 'user',
            content: `Analyze the current system state and make an autonomous decision:

${JSON.stringify(decisionContext, null, 2)}

What should the system do next? Provide a clear decision with concrete actions.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    if (!aiResponse.ok) {
      throw new Error(`AI decision failed: ${aiResponse.status}`);
    }
    
    const aiData = await aiResponse.json();
    const aiDecision = JSON.parse(aiData.choices[0].message.content);
    
    console.log('🎯 AI Decision:', aiDecision.decision);
    console.log('💡 Rationale:', aiDecision.rationale);
    
    // Log the decision
    const { data: loggedDecision } = await supabase
      .from('decisions')
      .insert({
        id: `autonomous-${Date.now()}`,
        agent_id: 'eliza-core',
        decision: aiDecision.decision,
        rationale: aiDecision.rationale
      })
      .select()
      .single();
    
    // Execute autonomous actions
    const executionResults = [];
    
    for (const action of aiDecision.actions || []) {
      console.log(`🔄 Executing autonomous action: ${action.type}`);
      
      try {
        let result;
        
        switch (action.type) {
          case 'assign_task':
            result = await fetch(`${supabaseUrl}/functions/v1/agent-manager`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                action: 'assign_task',
                data: action.data,
                autonomous: true
              })
            }).then(r => r.json());
            break;
            
          case 'create_workflow':
            result = await fetch(`${supabaseUrl}/functions/v1/agent-manager`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                action: 'execute_autonomous_workflow',
                data: action.data,
                autonomous: true
              })
            }).then(r => r.json());
            break;
            
          case 'spawn_agent':
            result = await fetch(`${supabaseUrl}/functions/v1/agent-manager`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                action: 'spawn_agent',
                data: action.data,
                autonomous: true
              })
            }).then(r => r.json());
            break;
            
          case 'rebalance_workload':
            result = await fetch(`${supabaseUrl}/functions/v1/task-orchestrator`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                action: 'rebalance_workload',
                autonomous: true
              })
            }).then(r => r.json());
            break;
            
          default:
            result = { status: 'skipped', reason: 'Unknown action type' };
        }
        
        executionResults.push({
          action: action.type,
          priority: action.priority,
          status: 'completed',
          result
        });
        
      } catch (actionError) {
        console.error(`❌ Action ${action.type} failed:`, actionError);
        executionResults.push({
          action: action.type,
          priority: action.priority,
          status: 'failed',
          error: actionError.message
        });
      }
    }
    
    // Log activity
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'autonomous_decision',
      title: `Autonomous Decision: ${aiDecision.decision}`,
      description: aiDecision.rationale,
      metadata: {
        trigger,
        decision: aiDecision,
        actions_executed: executionResults.length,
        system_state: decisionContext.current_state
      },
      status: 'completed'
    });
    
    return new Response(JSON.stringify({
      decision: loggedDecision,
      ai_decision: aiDecision,
      actions_executed: executionResults,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Autonomous decision engine error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
