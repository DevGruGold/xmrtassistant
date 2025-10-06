import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
const GITHUB_OWNER = Deno.env.get('GITHUB_OWNER') || 'DevGruGold';
const GITHUB_REPO = Deno.env.get('GITHUB_REPO') || 'XMRT-Ecosystem';

// Validate required environment variables
function validateGitHubConfig(): void {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN must be configured');
  }
  console.log(`✅ GitHub configured - Owner: ${GITHUB_OWNER}, Repo: ${GITHUB_REPO}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate GitHub configuration
    validateGitHubConfig();

    const requestBody = await req.json();
    const { action, data } = requestBody;
    
    console.log(`🔧 GitHub Integration - Action: ${action}`, data);

    // Validate action exists
    if (!action) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required field: action' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use GitHub Personal Access Token for authentication
    const headers = {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
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
        // Step 1: Get repository ID and available discussion categories
        const repoInfoQuery = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `
              query {
                repository(owner: "${GITHUB_OWNER}", name: "${data.repo || GITHUB_REPO}") {
                  id
                  discussionCategories(first: 20) {
                    nodes {
                      id
                      name
                    }
                  }
                }
              }
            `,
          }),
        });
        
        const repoInfo = await repoInfoQuery.json();
        console.log('📦 Repository info for discussion:', repoInfo);
        
        if (repoInfo.errors) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to fetch repository info',
              details: repoInfo.errors
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        const repository = repoInfo.data?.repository;
        if (!repository) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Repository ${GITHUB_OWNER}/${data.repo || GITHUB_REPO} not found or discussions not enabled`
            }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        const repositoryId = repository.id;
        const categories = repository.discussionCategories.nodes;
        
        // Step 2: Find matching category (case-insensitive match)
        const categoryName = (data.category || 'General').toLowerCase();
        const matchedCategory = categories.find(
          (cat: any) => cat.name.toLowerCase() === categoryName
        ) || categories.find(
          (cat: any) => cat.name.toLowerCase().includes('general')
        ) || categories[0]; // Fallback to first category
        
        if (!matchedCategory) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'No discussion categories available. Please enable discussions on the repository.',
              availableCategories: categories.map((c: any) => c.name)
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        console.log(`📝 Creating discussion in category: ${matchedCategory.name} (${matchedCategory.id})`);
        
        // Step 3: Create the discussion with escaped strings
        const discussionTitle = (data.title || 'Untitled Discussion').replace(/"/g, '\\"');
        const discussionBody = (data.body || 'No description provided.').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        
        result = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `
              mutation {
                createDiscussion(input: {
                  repositoryId: "${repositoryId}",
                  categoryId: "${matchedCategory.id}",
                  title: "${discussionTitle}",
                  body: "${discussionBody}"
                }) {
                  discussion {
                    id
                    title
                    url
                    category {
                      name
                    }
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
