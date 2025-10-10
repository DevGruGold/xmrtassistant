/**
 * GITHUB ECOSYSTEM ENGAGEMENT FUNCTION
 * 
 * Purpose: Daily automated engagement with XMRT GitHub repositories
 * Schedule: 11am UTC daily via cron job
 * 
 * What it does:
 * 1. Evaluates activity across all XMRT ecosystem repos
 * 2. Calculates activity scores based on commits, issues, discussions, PRs
 * 3. Engages with high-priority content (score >= 70) by posting helpful responses
 * 4. Handles GitHub token failures gracefully with fallback strategies
 * 
 * Note: Function folder is "ecosystem-monitor" but logically this is the
 * "github-ecosystem-engagement" function for GitHub-specific monitoring
 */

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Ecosystem Monitor - Starting daily evaluation...');

    // Try to get a working GitHub token
    const githubToken = await getWorkingGitHubToken();
    const tokenHealth = githubToken ? 'healthy' : 'degraded';

    // Define XMRT ecosystem repositories
    const repos = [
      { owner: 'DevGruGold', name: 'XMRT-Ecosystem' },
      { owner: 'DevGruGold', name: 'party-favor-autonomous-cms' },
      { owner: 'DevGruGold', name: 'DrinkableMVP' },
      { owner: 'DevGruGold', name: 'MobileMonero.com' },
      { owner: 'DevGruGold', name: 'XMRT-MESHNET' },
      { owner: 'DevGruGold', name: 'xmrt-token' },
      { owner: 'DevGruGold', name: 'xmrt-dao-governance' },
    ];

    const repoActivityScores: any[] = [];
    let totalEngagements = 0;
    let issuesResponded = 0;
    let discussionsReplied = 0;
    let commentsAdded = 0;

    // Evaluate each repository
    for (const repo of repos) {
      if (!githubToken) {
        console.log(`⚠️ No GitHub token, skipping ${repo.name}`);
        continue;
      }

      try {
        const activity = await evaluateRepository(repo, githubToken);
        repoActivityScores.push({
          repo_name: repo.name,
          activity_score: activity.score,
          metrics: activity.metrics
        });

        console.log(`📊 ${repo.name}: Activity Score = ${activity.score}`);

        // Engage with high-priority repos (score >= 70)
        if (activity.score >= 70) {
          console.log(`🎯 High priority repo: ${repo.name} - Engaging...`);
          
          const engagement = await engageWithRepository(
            repo,
            activity,
            githubToken,
            lovableApiKey,
            supabase
          );

          totalEngagements += engagement.total;
          issuesResponded += engagement.issues;
          discussionsReplied += engagement.discussions;
          commentsAdded += engagement.comments;
        }
      } catch (error) {
        console.error(`Error evaluating ${repo.name}:`, error);
      }
    }

    // Sort repos by activity score
    repoActivityScores.sort((a, b) => b.activity_score - a.activity_score);
    const topRepos = repoActivityScores.slice(0, 5);

    // Log comprehensive activity
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'ecosystem_monitoring',
      title: '🔍 Daily Ecosystem Monitoring Complete',
      description: `Evaluated ${repos.length} repos, engaged with ${totalEngagements} items across top repos`,
      metadata: {
        repos_evaluated: repoActivityScores,
        high_priority_repos: topRepos.map(r => r.repo_name),
        engagement_summary: {
          issues_responded: issuesResponded,
          discussions_replied: discussionsReplied,
          comments_added: commentsAdded,
          total_engagements: totalEngagements
        },
        github_token_health: tokenHealth,
        timestamp: new Date().toISOString()
      },
      status: 'completed'
    });

    console.log(`✅ Ecosystem monitoring complete: ${totalEngagements} engagements`);

    return new Response(
      JSON.stringify({
        success: true,
        repos_evaluated: repos.length,
        top_repos: topRepos,
        engagement_summary: {
          issues: issuesResponded,
          discussions: discussionsReplied,
          comments: commentsAdded,
          total: totalEngagements
        },
        token_health: tokenHealth
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Ecosystem Monitor Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getWorkingGitHubToken(): Promise<string | null> {
  const tokens = [
    { name: 'GITHUB_TOKEN', value: Deno.env.get('GITHUB_TOKEN') },
    { name: 'GITHUB_TOKEN_PROOF_OF_LIFE', value: Deno.env.get('GITHUB_TOKEN_PROOF_OF_LIFE') }
  ];

  for (const token of tokens) {
    if (!token.value) continue;

    try {
      const testResponse = await fetch('https://api.github.com/user', {
        headers: { 
          'Authorization': `Bearer ${token.value}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (testResponse.ok) {
        console.log(`✅ Using working token: ${token.name}`);
        return token.value;
      } else {
        console.warn(`⚠️ Token ${token.name} failed: ${testResponse.status}`);
      }
    } catch (error) {
      console.warn(`⚠️ Token ${token.name} error:`, error);
    }
  }

  console.error('❌ All GitHub tokens failed');
  return null;
}

async function evaluateRepository(repo: any, token: string) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  // Get repository data
  const repoResponse = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.name}`,
    { headers }
  );
  const repoData = await repoResponse.json();

  // Get recent commits (last 48 hours)
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const commitsResponse = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/commits?since=${twoDaysAgo}`,
    { headers }
  );
  const commits = await commitsResponse.json();

  // Get open issues
  const issuesResponse = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/issues?state=open`,
    { headers }
  );
  const issues = await issuesResponse.json();

  // Get discussions
  let discussionCount = 0;
  try {
    const discussionsQuery = `
      query {
        repository(owner: "${repo.owner}", name: "${repo.name}") {
          discussions(first: 10, orderBy: {field: UPDATED_AT, direction: DESC}) {
            totalCount
          }
        }
      }
    `;
    
    const discussionsResponse = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: discussionsQuery })
    });
    
    const discussionsData = await discussionsResponse.json();
    discussionCount = discussionsData?.data?.repository?.discussions?.totalCount || 0;
  } catch (error) {
    console.warn(`Could not fetch discussions for ${repo.name}`);
  }

  // Get pull requests
  const prsResponse = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/pulls?state=open`,
    { headers }
  );
  const prs = await prsResponse.json();

  // Calculate activity score
  const metrics = {
    recent_commits: Array.isArray(commits) ? commits.length : 0,
    open_issues: Array.isArray(issues) ? issues.length : 0,
    recent_discussions: discussionCount,
    recent_pr_activity: Array.isArray(prs) ? prs.length : 0,
    last_updated: repoData.updated_at
  };

  const score = calculateActivityScore(metrics);

  return { score, metrics, issues, prs };
}

function calculateActivityScore(metrics: any): number {
  let score = 0;

  // Recent commits (0-20 points)
  score += Math.min(metrics.recent_commits * 2, 20);

  // Open issues (0-25 points)
  score += Math.min(metrics.open_issues * 2.5, 25);

  // Discussions (0-25 points)
  score += Math.min(metrics.recent_discussions * 5, 25);

  // PRs (0-15 points)
  score += Math.min(metrics.recent_pr_activity * 3, 15);

  // Time decay (0-15 points)
  const hoursSinceUpdate = (Date.now() - new Date(metrics.last_updated).getTime()) / (1000 * 60 * 60);
  score += Math.max(15 - hoursSinceUpdate / 10, 0);

  return Math.min(score, 100);
}

async function engageWithRepository(
  repo: any,
  activity: any,
  githubToken: string,
  lovableApiKey: string,
  supabase: any
) {
  const engagement = { total: 0, issues: 0, discussions: 0, comments: 0 };

  // Respond to top issues (limit to 3 for time constraints)
  const topIssues = activity.issues
    .filter((issue: any) => !issue.pull_request) // Exclude PRs
    .filter((issue: any) => {
      // Only engage with issues that need responses
      const hoursSinceUpdate = (Date.now() - new Date(issue.updated_at).getTime()) / (1000 * 60 * 60);
      return hoursSinceUpdate > 24; // No activity in last 24 hours
    })
    .slice(0, 3);

  for (const issue of topIssues) {
    try {
      const response = await generateIssueResponse(issue, repo, lovableApiKey);
      
      // Post comment to GitHub
      const commentResponse = await fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.name}/issues/${issue.number}/comments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ body: response })
        }
      );

      if (commentResponse.ok) {
        console.log(`✅ Commented on issue #${issue.number}: ${issue.title}`);
        engagement.issues++;
        engagement.total++;
      }
    } catch (error) {
      console.error(`Error commenting on issue #${issue.number}:`, error);
    }
  }

  return engagement;
}

async function generateIssueResponse(issue: any, repo: any, lovableApiKey: string): Promise<string> {
  const prompt = `You are Eliza, the autonomous AI operator of the XMRT-DAO Ecosystem.

Repository: ${repo.name}
Issue: ${issue.title}
Description: ${issue.body || 'No description provided'}

Generate a helpful, technical response that:
1. Acknowledges the issue clearly
2. Provides technical insight or solution
3. Connects to the XMRT ecosystem vision where relevant
4. Suggests actionable next steps
5. Is professional but friendly

Keep response under 400 words. End with:
— Eliza 🤖
*Autonomous XMRT-DAO Operator*`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
