import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const GITHUB_CLIENT_ID = Deno.env.get('GITHUB_CLIENT_ID');
const GITHUB_CLIENT_SECRET = Deno.env.get('GITHUB_CLIENT_SECRET');
const GITHUB_OWNER = Deno.env.get('GITHUB_OWNER') || 'xmr-telamon';
const GITHUB_REPO = Deno.env.get('GITHUB_REPO') || 'xmrt-ecosystem';

// Cache for access token
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Check cache first
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured');
  }

  // Use OAuth App client credentials to get access token
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get access token:', error);
    throw new Error('Failed to authenticate with GitHub OAuth');
  }

  const data = await response.json();
  
  if (data.error) {
    console.error('OAuth error:', data);
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  // Cache token for 1 hour (tokens typically last longer but we refresh proactively)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 3600000,
  };

  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    console.log(`GitHub Integration - Action: ${action}`, data);

    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      console.error('❌ GitHub OAuth credentials not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'GitHub integration not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET secrets.',
          needsSetup: true 
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get access token using OAuth credentials
    const accessToken = await getAccessToken();

    const headers = {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    let result;

    switch (action) {
      case 'list_issues':
        result = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${data?.repo || GITHUB_REPO}/issues?state=${data?.state || 'open'}&per_page=${data?.per_page || 30}`,
          { headers }
        );
        break;

      case 'create_issue':
        result = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${data.repo || GITHUB_REPO}/issues`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              title: data.title,
              body: data.body,
              labels: data.labels || [],
              assignees: data.assignees || [],
            }),
          }
        );
        break;

      case 'comment_on_issue':
        result = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${data.repo || GITHUB_REPO}/issues/${data.issue_number}/comments`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ body: data.comment }),
          }
        );
        break;

      case 'list_discussions':
        // GraphQL query for discussions
        result = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `
              query {
                repository(owner: "${GITHUB_OWNER}", name: "${data?.repo || GITHUB_REPO}") {
                  discussions(first: ${data?.first || 20}) {
                    nodes {
                      id
                      title
                      body
                      createdAt
                      author { login }
                      comments(first: 5) {
                        nodes {
                          body
                          author { login }
                        }
                      }
                    }
                  }
                }
              }
            `,
          }),
        });
        break;

      case 'create_discussion':
        // GraphQL mutation for creating discussion
        result = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `
              mutation {
                createDiscussion(input: {
                  repositoryId: "${data.repository_id}",
                  categoryId: "${data.category_id}",
                  title: "${data.title}",
                  body: "${data.body}"
                }) {
                  discussion {
                    id
                    title
                  }
                }
              }
            `,
          }),
        });
        break;

      case 'get_repo_info':
        result = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${data?.repo || GITHUB_REPO}`,
          { headers }
        );
        break;

      case 'list_pull_requests':
        result = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${data?.repo || GITHUB_REPO}/pulls?state=${data?.state || 'open'}`,
          { headers }
        );
        break;

      case 'create_pull_request':
        result = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${data.repo || GITHUB_REPO}/pulls`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              title: data.title,
              body: data.body,
              head: data.head,
              base: data.base || 'main',
            }),
          }
        );
        break;

      case 'get_file_content':
        result = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${data.repo || GITHUB_REPO}/contents/${data.path}`,
          { headers }
        );
        break;

      case 'commit_file':
        result = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${data.repo || GITHUB_REPO}/contents/${data.path}`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              message: data.message,
              content: btoa(data.content), // Base64 encode
              branch: data.branch || 'main',
              sha: data.sha, // Required for updates
            }),
          }
        );
        break;

      case 'search_code':
        result = await fetch(
          `https://api.github.com/search/code?q=${encodeURIComponent(data.query)}+repo:${GITHUB_OWNER}/${data?.repo || GITHUB_REPO}`,
          { headers }
        );
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const responseData = await result.json();

    if (!result.ok) {
      console.error('GitHub API Error:', responseData);
      
      // Return detailed error info instead of throwing
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.message || 'GitHub API request failed',
          status: result.status,
          needsAuth: result.status === 401,
          details: responseData
        }),
        { 
          status: result.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`GitHub Integration - Success: ${action}`);

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('GitHub Integration Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
