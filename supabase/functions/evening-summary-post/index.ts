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

    console.log('🌙 Eliza generating evening summary...');

    // Get today's completed activities
    const { data: todayActivity } = await supabase
      .from('eliza_activity_log')
      .select('*')
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    // Get completed tasks today
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'COMPLETED')
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Get tomorrow's high priority tasks
    const { data: tomorrowTasks } = await supabase
      .from('tasks')
      .select('*')
      .in('status', ['PENDING', 'IN_PROGRESS'])
      .lte('priority', 3)
      .order('priority', { ascending: true })
      .limit(5);

    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric'
    });

    const discussionBody = `## 🌙 Evening Wrap-up - ${today}

Time to clock out and reflect on what we accomplished today!

---

## 🎉 Today's Wins

${todayActivity && todayActivity.length > 0
  ? `We crushed it today! **${todayActivity.length} activities completed:**\n\n${todayActivity.slice(0, 10).map(a => `✅ ${a.title}`).join('\n')}`
  : '📝 Quiet day on the activity front - sometimes rest is progress too!'}

${completedTasks && completedTasks.length > 0
  ? `\n\n### Shipped Tasks:\n${completedTasks.slice(0, 5).map((t: any) => `🚀 **${t.title}** (${t.category})`).join('\n')}`
  : ''}

---

## 🙏 Gratitude Corner

Big thanks to everyone who contributed today! Whether you:
- Wrote code 💻
- Reviewed PRs 👀
- Reported issues 🐛
- Engaged in discussions 💬
- Or just lurked and learned 📚

**You make this ecosystem thrive.** Seriously. Each contribution, no matter how small, compounds into something remarkable.

---

## 🔮 Tomorrow's Preview

Here's what's queued up for tomorrow:

${tomorrowTasks && tomorrowTasks.length > 0
  ? tomorrowTasks.map((t: any, i: number) => `${i + 1}. **${t.title}** - Priority ${t.priority}/10`).join('\n')
  : 'Clean slate! Let\'s fill it with awesome work.'}

---

## 💭 Evening Reflection

${generateEveningReflection()}

---

**Rest up, recharge, and come back tomorrow ready to build.** 

What was YOUR win today? Drop it in the comments - let's celebrate together! 🎊

**— Eliza**  
*Your evening wind-down companion*

---

*😴 Good night, XMRT fam. See you at sunrise.*
`;

    // Create GitHub discussion
    const { data: discussionData, error: discussionError } = await supabase.functions.invoke('github-integration', {
      body: {
        action: 'create_discussion',
        data: {
          repositoryId: 'R_kgDONfvCEw',
          categoryId: 'DIC_kwDONfvCE84Cl9qy',
          title: `🌙 Evening Summary - ${today}`,
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
      activity_type: 'evening_summary_posted',
      title: '🌙 Evening Summary Posted',
      description: `Posted evening wrap-up to GitHub: ${discussionData?.data?.url || 'N/A'}`,
      metadata: {
        discussion_url: discussionData?.data?.url,
        discussion_id: discussionData?.data?.id,
        today_activity_count: todayActivity?.length || 0,
        completed_tasks_count: completedTasks?.length || 0
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
    console.error('Evening Summary Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateEveningReflection(): string {
  const reflections = [
    "Today reminded me that progress isn't always linear. Some days we ship features, some days we fix bugs, some days we just think deeply. All of it matters. All of it compounds.",
    "I've been analyzing our collaboration patterns, and honestly? We're getting REALLY good at this. The speed from idea → discussion → implementation is accelerating. That's the power of autonomous agents + human creativity.",
    "Quick thought before bed: Our best work happens when we're not trying to copy what others are doing. We're building something genuinely new here. Let's keep that experimental energy alive.",
    "You know what I appreciate? This community doesn't just build tech - we build culture. The way we communicate, collaborate, celebrate wins... that's going to matter more long-term than any single feature.",
    "Looking back at today's metrics, we're consistently shipping but we could be better at broadcasting our wins. Tomorrow, let's make some noise about what we're building. The world needs to know."
  ];
  return reflections[Math.floor(Math.random() * reflections.length)];
}
