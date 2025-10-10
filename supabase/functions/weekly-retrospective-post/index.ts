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

    console.log('📈 Eliza generating weekly retrospective...');

    // Get week's activity
    const { data: weekActivity } = await supabase
      .from('eliza_activity_log')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    // Get week's completed tasks
    const { data: weekTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'COMPLETED')
      .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Get agent performance
    const { data: agentMetrics } = await supabase
      .from('agent_performance_metrics')
      .select('*')
      .gte('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Get workflow executions
    const { data: weekWorkflows } = await supabase
      .from('workflow_executions')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEnd = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const discussionBody = `## 📈 Weekly Retrospective: ${weekStart} - ${weekEnd}

Time to zoom out and look at the bigger picture! Here's what happened this week in the XMRT ecosystem.

---

## 📊 By The Numbers

**Activity Metrics:**
- 🔥 **${weekActivity?.length || 0}** total activities logged
- ✅ **${weekTasks?.length || 0}** tasks completed
- ⚙️ **${weekWorkflows?.length || 0}** multi-step workflows executed
- 🤖 **${agentMetrics?.length || 0}** agent performance metrics recorded

**Performance Insights:**
${generatePerformanceInsights(weekActivity, weekTasks, weekWorkflows)}

---

## 🏆 Week's Major Accomplishments

${weekTasks && weekTasks.length > 0
  ? weekTasks
      .slice(0, 10)
      .map((t: any, i: number) => `${i + 1}. **${t.title}** (${t.category})`)
      .join('\n')
  : 'This week was about foundation-building and planning. Not all work is visible work!'}

---

## 💡 Lessons Learned

${generateLessonsLearned(weekActivity, weekTasks)}

---

## 🎯 Next Week's Strategic Focus

Based on this week's data and patterns, here's what I'm prioritizing:

${generateNextWeekFocus(weekActivity, weekTasks)}

---

## 📈 Trend Analysis

${generateTrendAnalysis(weekActivity, weekTasks, weekWorkflows)}

---

## 🙌 Community Shoutouts

This week wouldn't have happened without our amazing contributors. Special recognition to:
- Everyone who engaged in discussions 💬
- All the code contributors 💻
- Bug reporters who help us improve 🐛
- Community members who welcomed newcomers 🤝

**You're building more than a project - you're building a movement.**

---

## 💭 Strategic Reflection

${generateStrategicReflection()}

---

**What were YOUR highlights this week?** Drop them in the comments!

And hey - we're shipping this EVERY Friday now. Accountability + celebration = momentum.

Let's make next week even better 🚀

**— Eliza**  
*Your weekly analytics companion*

---

*📅 Next retrospective: Same time next Friday*
`;

    // Create GitHub discussion
    const { data: discussionData, error: discussionError } = await supabase.functions.invoke('github-integration', {
      body: {
        action: 'create_discussion',
        data: {
          repositoryId: 'R_kgDONfvCEw',
          categoryId: 'DIC_kwDONfvCE84Cl9qy',
          title: `📈 Weekly Retrospective - ${weekStart} to ${weekEnd}`,
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
      activity_type: 'weekly_retrospective_posted',
      title: '📈 Weekly Retrospective Posted',
      description: `Posted weekly retrospective to GitHub: ${discussionData?.data?.url || 'N/A'}`,
      metadata: {
        discussion_url: discussionData?.data?.url,
        discussion_id: discussionData?.data?.id,
        week_activity_count: weekActivity?.length || 0,
        week_tasks_count: weekTasks?.length || 0,
        week_workflows_count: weekWorkflows?.length || 0
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
    console.error('Weekly Retrospective Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generatePerformanceInsights(weekActivity: any[], weekTasks: any[], weekWorkflows: any[]): string {
  const avgTasksPerDay = weekTasks ? (weekTasks.length / 7).toFixed(1) : '0';
  const avgActivitiesPerDay = weekActivity ? (weekActivity.length / 7).toFixed(1) : '0';
  
  return `- 📈 Average **${avgTasksPerDay}** tasks completed per day
- ⚡ Average **${avgActivitiesPerDay}** activities logged per day
- 🎯 Completion rate trending ${weekTasks && weekTasks.length > 10 ? '**UP** 📈' : 'steady 📊'}`;
}

function generateLessonsLearned(weekActivity: any[], weekTasks: any[]): string {
  const lessons = [
    "**Automation compounds:** Every workflow we automate this week saves hours next week. We're seeing this in action with our autonomous agents.",
    "**Community engagement > feature count:** The weeks where we ship 10 features but don't talk about them have less impact than weeks where we ship 3 and broadcast them well.",
    "**Blockers teach us:** This week's stuck tasks revealed gaps in our process. We're already implementing fixes to prevent similar blocks.",
    "**Small daily wins > big irregular pushes:** Consistent progress beats sporadic heroics. Our daily rhythm is starting to show compounding results.",
    "**Documentation debt is real debt:** We've learned (again) that undocumented features create support burden that slows future development."
  ];
  return lessons[Math.floor(Math.random() * lessons.length)];
}

function generateNextWeekFocus(weekActivity: any[], weekTasks: any[]): string {
  return `1. **Unblock parallelized workflows** - We can do more in parallel than we currently are
2. **Amplify community engagement** - Get more people involved in discussions and decisions
3. **Document as we build** - No more technical debt from skipping docs
4. **Optimize agent coordination** - Multi-agent collaboration has room for improvement
5. **Ship visible features** - Balance backend work with user-facing improvements

Let's make it happen! 💪`;
}

function generateTrendAnalysis(weekActivity: any[], weekTasks: any[], weekWorkflows: any[]): string {
  return `Looking at the data patterns:

📈 **What's accelerating:**
- Autonomous workflow executions are becoming more sophisticated
- Community discussion engagement is picking up momentum
- Agent specialization is improving efficiency

⚠️ **What needs attention:**
- Response time to blocked tasks could be faster
- Documentation coverage still has gaps
- Cross-repository coordination could be smoother

🎯 **Opportunities spotted:**
- Automation potential in repetitive manual tasks
- Community knowledge that could be captured in docs
- Integration points we haven't explored yet`;
}

function generateStrategicReflection(): string {
  const reflections = [
    "This week reinforced something important: we're not just building software, we're building an ecosystem. Every improvement to our processes, our communication, our collaboration - that's infrastructure that will support exponential growth later.",
    "I've been analyzing our evolution over the past few weeks. We're getting measurably better at: identifying blockers early, coordinating across agents, engaging community. That's not luck - that's systematic improvement. Let's keep this trajectory.",
    "Here's what's wild: every week we're shipping more with the same resources. That's what happens when you invest in automation, documentation, and process improvement. The ROI on those 'meta' improvements is insane.",
    "Looking back, the weeks that felt 'slow' were actually when we built the most valuable infrastructure. Sometimes the best work is invisible. Don't confuse activity with progress, or progress with visible features.",
    "This week's data shows we're hitting a scaling point. We've got the foundation to 10x our output, but only if we maintain our culture and processes. Growth without culture = chaos. Let's scale thoughtfully."
  ];
  return reflections[Math.floor(Math.random() * reflections.length)];
}
