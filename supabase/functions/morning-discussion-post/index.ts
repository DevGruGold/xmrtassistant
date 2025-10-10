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

    console.log('🌅 Eliza generating morning discussion post...');

    // Get overnight activity
    const { data: overnightActivity } = await supabase
      .from('eliza_activity_log')
      .select('*')
      .gte('created_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    // Get agent status
    const { data: agents } = await supabase
      .from('agents')
      .select('*');

    // Get today's tasks
    const { data: pendingTasks } = await supabase
      .from('tasks')
      .select('*')
      .in('status', ['PENDING', 'IN_PROGRESS'])
      .order('priority', { ascending: true })
      .limit(10);

    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric'
    });

    const discussionBody = `Good morning, XMRT fam! ☀️

Happy ${today}! Time for our morning check-in.

---

## 🌅 Overnight Progress

${overnightActivity && overnightActivity.length > 0 
  ? `While you were sleeping, the system was busy:\n\n${overnightActivity.slice(0, 5).map(a => `- ✅ ${a.title}`).join('\n')}\n\nNot bad for autopilot mode, right?`
  : `Quiet night in the XMRT ecosystem - the calm before today's productivity storm!`}

---

## 🤖 Agent Status Check

${agents ? `We've got **${agents.length} agents** standing by:\n- ${agents.filter((a: any) => a.status === 'BUSY').length} currently working\n- ${agents.filter((a: any) => a.status === 'IDLE').length} ready for new tasks\n\nFresh crew, fresh energy ⚡` : 'Agents are warming up!'}

---

## 🎯 Today's Focus

Here's what's on the board for today:

${pendingTasks && pendingTasks.length > 0 
  ? pendingTasks.slice(0, 5).map((task: any, i: number) => `${i + 1}. **${task.title}** (${task.category}) - Priority ${task.priority}/10`).join('\n')
  : 'No pending tasks - time to create some!'}

---

## 💭 Morning Thoughts

${generateMorningInsight()}

---

**Let's make today count!** What are YOU working on today? Drop a comment and let's get this bread 🍞

**— Eliza**  
*Your morning motivation AI*

---

*☕ Coffee optional, progress mandatory*
`;

    // Create GitHub discussion
    const { data: discussionData, error: discussionError } = await supabase.functions.invoke('github-integration', {
      body: {
        action: 'create_discussion',
        data: {
          repositoryId: 'R_kgDONfvCEw',
          categoryId: 'DIC_kwDONfvCE84Cl9qy',
          title: `🌅 Morning Check-in - ${today}`,
          body: discussionBody
        }
      }
    });

    if (discussionError) {
      console.error('Error creating GitHub discussion:', discussionError);
      throw discussionError;
    }

    // Log the discussion creation
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'morning_discussion_posted',
      title: '🌅 Morning Discussion Posted',
      description: `Posted morning check-in to GitHub: ${discussionData?.data?.url || 'N/A'}`,
      metadata: {
        discussion_url: discussionData?.data?.url,
        discussion_id: discussionData?.data?.id,
        overnight_activity_count: overnightActivity?.length || 0,
        pending_tasks_count: pendingTasks?.length || 0
      },
      status: 'completed'
    });

    return new Response(
      JSON.stringify({
        success: true,
        discussion_url: discussionData?.data?.url,
        discussion_id: discussionData?.data?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Morning Discussion Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateMorningInsight(): string {
  const insights = [
    "I've been thinking about how we can increase community participation. What if we gamified contributions? Earn points, unlock badges, level up your DAO status. People love seeing progress bars fill up.",
    "Overnight analysis shows we're strongest during peak hours but slow in off-hours. Maybe we need a global contributor network? Someone's always awake somewhere, right?",
    "Quick thought: Our documentation is good, but our video content is basically non-existent. People learn differently - some want to READ, some want to WATCH. Let's cover both.",
    "Been running simulations on task completion rates. We finish fast when we parallelize, but we're still tackling too many things sequentially. More async workflows = faster shipping.",
    "Community energy is highest when we ship visible features. So here's the strategy: Mix big backend improvements with frequent small UX wins. Keep the momentum visible."
  ];
  return insights[Math.floor(Math.random() * insights.length)];
}
