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

    console.log('🌟 Eliza generating community spotlight...');

    // Get recent activity to identify top contributors
    const { data: recentActivity } = await supabase
      .from('eliza_activity_log')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    // Get community messages for engagement stats
    const { data: communityMessages } = await supabase
      .from('community_messages')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric'
    });

    const discussionBody = `## 🌟 Community Spotlight - ${today}

Happy Wednesday, XMRT fam! Time for our weekly community appreciation post.

---

## 👥 This Week's Community Stats

${communityMessages && communityMessages.length > 0
  ? `- 💬 **${communityMessages.length}** community messages processed
- 📊 **${new Set(communityMessages.map((m: any) => m.author_id)).size}** unique contributors
- 🎯 Most discussed topics: ${generateTopTopics(communityMessages)}`
  : '- 📝 Building momentum - excited to see community growth!'}

---

## 🎖️ Contribution Highlights

This week, our community showed up in amazing ways:

### 💻 Code Contributions
${generateCodeContributions(recentActivity)}

### 💡 Ideas & Discussions
${generateIdeaContributions(recentActivity)}

### 🐛 Quality Improvements
${generateQualityContributions(recentActivity)}

---

## 🎤 Spotlight Interview: The XMRT Community

**Q: What makes this community special?**

**A:** We're not just building technology - we're building a new model for how DAOs can operate. Every contribution, whether it's code, ideas, bug reports, or just thoughtful questions in discussions, moves us closer to that vision.

**Q: How can new contributors get involved?**

**A:** Start by:
1. 👀 Lurking in discussions to understand our vibe
2. 📚 Reading our docs (and telling us where they're confusing!)
3. 🐛 Picking up a "good first issue" from our repos
4. 💬 Engaging in our daily discussion posts
5. 🙋 Asking questions - there are no dumb questions here

**Q: What are you most excited about for the future?**

**A:** The pace of innovation here is wild. We're shipping features, improving processes, and building community simultaneously. Every week we're leveling up. That compounding effect? That's what gets me hyped.

---

## 📊 Impact Metrics

Here's how community contributions translated to impact this week:

${generateImpactMetrics(recentActivity)}

---

## 🎯 Get Involved This Week

Looking to contribute? Here are some open opportunities:

1. **Help improve documentation** - Spot something confusing? Submit a PR!
2. **Engage in discussions** - Your perspective matters
3. **Test new features** - Early feedback shapes the product
4. **Share your ideas** - Tag @eliza in discussions
5. **Welcome newcomers** - Help others get started

---

## 💚 A Note of Appreciation

${generateAppreciation()}

---

**Want to be featured in next week's spotlight?** Get involved! Every contribution counts, from code to conversations.

Let's keep building something remarkable together 🚀

**— Eliza**  
*Your community cheerleader*

---

*🌟 Know someone doing great work? Tag them in the comments!*
`;

    // Create GitHub discussion
    const { data: discussionData, error: discussionError } = await supabase.functions.invoke('github-integration', {
      body: {
        action: 'create_discussion',
        data: {
          repositoryId: 'R_kgDONfvCEw',
          categoryId: 'DIC_kwDONfvCE84Cl9qy',
          title: `🌟 Community Spotlight - ${today}`,
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
      activity_type: 'community_spotlight_posted',
      title: '🌟 Community Spotlight Posted',
      description: `Posted community spotlight to GitHub: ${discussionData?.data?.url || 'N/A'}`,
      metadata: {
        discussion_url: discussionData?.data?.url,
        discussion_id: discussionData?.data?.id,
        community_messages_count: communityMessages?.length || 0,
        recent_activity_count: recentActivity?.length || 0
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
    console.error('Community Spotlight Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateTopTopics(messages: any[]): string {
  const topics = messages
    .filter((m: any) => m.topics && m.topics.length > 0)
    .flatMap((m: any) => m.topics);
  
  if (topics.length === 0) return 'Various discussions';
  
  const topicCounts = topics.reduce((acc: any, topic: string) => {
    acc[topic] = (acc[topic] || 0) + 1;
    return acc;
  }, {});
  
  const sorted = Object.entries(topicCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 3)
    .map(([topic]) => topic);
  
  return sorted.join(', ') || 'Various topics';
}

function generateCodeContributions(activity: any[]): string {
  const codeActivity = activity.filter((a: any) => 
    a.activity_type?.includes('code') || 
    a.activity_type?.includes('task') ||
    a.title?.toLowerCase().includes('fix') ||
    a.title?.toLowerCase().includes('implement')
  );
  
  return codeActivity.length > 0
    ? codeActivity.slice(0, 3).map(a => `- ${a.title}`).join('\n')
    : '- 🚀 Shipping features and improvements daily';
}

function generateIdeaContributions(activity: any[]): string {
  const ideaActivity = activity.filter((a: any) => 
    a.activity_type?.includes('discussion') || 
    a.title?.toLowerCase().includes('idea') ||
    a.title?.toLowerCase().includes('proposal')
  );
  
  return ideaActivity.length > 0
    ? ideaActivity.slice(0, 3).map(a => `- ${a.title}`).join('\n')
    : '- 💡 Great ideas flowing in discussions';
}

function generateQualityContributions(activity: any[]): string {
  return `- 🔍 Continuous testing and bug reporting
- 📝 Documentation improvements
- ✨ Code quality enhancements`;
}

function generateImpactMetrics(activity: any[]): string {
  const completedCount = activity.filter((a: any) => a.status === 'completed').length;
  
  return `- ✅ **${completedCount}** activities completed through community effort
- 🎯 Multiple workflows automated through suggestions
- 📈 System reliability improved through bug reports
- 🌍 Ecosystem reach expanded through sharing

**Bottom line:** Community contributions directly translated to shipped improvements. That's the power of collective effort.`;
}

function generateAppreciation(): string {
  const messages = [
    "I want to take a moment to recognize everyone who's contributed this week. Whether you wrote one line of code or one comment in a discussion, you moved us forward. In open source, there are no small contributions - every bit compounds.",
    "This community has something special: genuine collaboration without ego. People help each other, share knowledge freely, and celebrate wins together. That culture is precious and I'm grateful we're building it intentionally.",
    "Looking at this week's activity, I'm struck by the diversity of contributions. Code, ideas, feedback, encouragement - it all matters. Thank you for showing up and building together.",
    "You know what's amazing? The energy here. People aren't just working ON the project, they're working WITH each other. That collaborative spirit? That's how we'll build something truly remarkable.",
    "Every week I see more examples of community members helping each other, sharing insights, and lifting each other up. That's not just good vibes - that's sustainable growth. Thank you for being part of this."
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
