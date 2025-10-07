import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

const WEBHOOK_SECRET = Deno.env.get('GITHUB_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * GitHub Webhook Handler
 * 
 * Receives GitHub webhook events for:
 * - New discussion comments
 * - New issue comments
 * - Discussion/issue updates
 * 
 * Processes events and triggers appropriate actions:
 * - Store comment data in Supabase
 * - Trigger AI analysis via edge functions
 * - Auto-assign tasks to agents based on comment content
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 GitHub Webhook received');

    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      const signature = req.headers.get('X-Hub-Signature-256');
      if (!signature) {
        console.error('❌ Missing webhook signature');
        return new Response(
          JSON.stringify({ error: 'Missing signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.text();
      const hmac = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature_bytes = await crypto.subtle.sign(
        'HMAC',
        hmac,
        new TextEncoder().encode(body)
      );

      const expected_signature = 'sha256=' + Array.from(new Uint8Array(signature_bytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (signature !== expected_signature) {
        console.error('❌ Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      var payload = JSON.parse(body);
    } else {
      var payload = await req.json();
    }

    const event = req.headers.get('X-GitHub-Event');
    console.log(`📬 Event type: ${event}`);

    let processedAction = null;

    switch (event) {
      case 'discussion_comment':
        processedAction = await handleDiscussionComment(payload);
        break;

      case 'issue_comment':
        processedAction = await handleIssueComment(payload);
        break;

      case 'discussion':
        processedAction = await handleDiscussion(payload);
        break;

      case 'issues':
        processedAction = await handleIssue(payload);
        break;

      case 'ping':
        console.log('🏓 Ping received from GitHub');
        return new Response(
          JSON.stringify({ message: 'Pong! Webhook is configured correctly.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        console.log(`ℹ️ Unhandled event type: ${event}`);
        return new Response(
          JSON.stringify({ message: 'Event received but not processed', event }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Log the webhook event
    await supabase.from('webhook_logs').insert({
      webhook_name: 'github_webhook',
      trigger_table: 'external',
      trigger_operation: event || 'unknown',
      payload: payload,
      status: processedAction ? 'completed' : 'ignored',
      response: processedAction
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        event,
        action: payload.action,
        processed: processedAction
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleDiscussionComment(payload: any) {
  const { action, comment, discussion, repository } = payload;
  
  console.log(`💬 Discussion comment ${action}:`, {
    discussion: discussion.title,
    comment_id: comment.id,
    author: comment.user.login
  });

  if (action !== 'created') {
    return null; // Only process new comments
  }

  // Log activity
  await supabase.from('eliza_activity_log').insert({
    activity_type: 'github_event',
    title: `New discussion comment on: ${discussion.title}`,
    description: `Comment by ${comment.user.login}: ${comment.body.substring(0, 200)}...`,
    status: 'pending',
    metadata: {
      discussion_number: discussion.number,
      comment_id: comment.id,
      author: comment.user.login,
      body: comment.body,
      url: comment.html_url
    }
  });

  // Analyze comment for task creation or AI response
  const shouldRespond = await analyzeCommentForResponse(comment.body, discussion.title);

  if (shouldRespond.needsTask) {
    // Create a task for an agent
    await createTaskFromComment({
      title: shouldRespond.taskTitle,
      description: comment.body,
      category: shouldRespond.category,
      source: 'github_discussion',
      metadata: {
        discussion_number: discussion.number,
        comment_id: comment.id,
        url: comment.html_url
      }
    });
  }

  if (shouldRespond.needsReply) {
    // Queue AI-generated response
    await supabase.from('scheduled_actions').insert({
      session_key: 'eliza-system',
      action_type: 'generate_github_reply',
      action_name: 'AI Discussion Reply',
      action_data: {
        discussion_id: discussion.node_id,
        discussion_number: discussion.number,
        comment_id: comment.node_id,
        comment_body: comment.body,
        discussion_title: discussion.title,
        author: comment.user.login
      },
      schedule_expression: 'immediate',
      next_execution: new Date().toISOString(),
      is_active: true
    });
  }

  return {
    logged: true,
    task_created: shouldRespond.needsTask,
    reply_queued: shouldRespond.needsReply
  };
}

async function handleIssueComment(payload: any) {
  const { action, comment, issue, repository } = payload;
  
  console.log(`💬 Issue comment ${action}:`, {
    issue: issue.title,
    comment_id: comment.id,
    author: comment.user.login
  });

  if (action !== 'created') {
    return null;
  }

  // Log activity
  await supabase.from('eliza_activity_log').insert({
    activity_type: 'github_event',
    title: `New issue comment on: ${issue.title}`,
    description: `Comment by ${comment.user.login}: ${comment.body.substring(0, 200)}...`,
    status: 'pending',
    metadata: {
      issue_number: issue.number,
      comment_id: comment.id,
      author: comment.user.login,
      body: comment.body,
      url: comment.html_url
    }
  });

  // Analyze comment
  const shouldRespond = await analyzeCommentForResponse(comment.body, issue.title);

  if (shouldRespond.needsTask) {
    await createTaskFromComment({
      title: shouldRespond.taskTitle,
      description: comment.body,
      category: shouldRespond.category,
      source: 'github_issue',
      metadata: {
        issue_number: issue.number,
        comment_id: comment.id,
        url: comment.html_url
      }
    });
  }

  if (shouldRespond.needsReply) {
    await supabase.from('scheduled_actions').insert({
      session_key: 'eliza-system',
      action_type: 'generate_github_reply',
      action_name: 'AI Issue Reply',
      action_data: {
        issue_number: issue.number,
        comment_id: comment.id,
        comment_body: comment.body,
        issue_title: issue.title,
        author: comment.user.login
      },
      schedule_expression: 'immediate',
      next_execution: new Date().toISOString(),
      is_active: true
    });
  }

  return {
    logged: true,
    task_created: shouldRespond.needsTask,
    reply_queued: shouldRespond.needsReply
  };
}

async function handleDiscussion(payload: any) {
  const { action, discussion, repository } = payload;
  
  console.log(`📋 Discussion ${action}:`, discussion.title);

  // Log new discussions
  if (action === 'created') {
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'github_event',
      title: `New discussion: ${discussion.title}`,
      description: discussion.body?.substring(0, 200) || '',
      status: 'completed',
      metadata: {
        discussion_number: discussion.number,
        author: discussion.user.login,
        url: discussion.html_url
      }
    });
  }

  return { logged: true };
}

async function handleIssue(payload: any) {
  const { action, issue, repository } = payload;
  
  console.log(`🐛 Issue ${action}:`, issue.title);

  // Log new issues
  if (action === 'opened') {
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'github_event',
      title: `New issue: ${issue.title}`,
      description: issue.body?.substring(0, 200) || '',
      status: 'completed',
      metadata: {
        issue_number: issue.number,
        author: issue.user.login,
        labels: issue.labels.map((l: any) => l.name),
        url: issue.html_url
      }
    });
  }

  return { logged: true };
}

/**
 * Analyze comment to determine if it needs a response or task creation
 */
async function analyzeCommentForResponse(commentBody: string, contextTitle: string) {
  const lowerBody = commentBody.toLowerCase();
  const lowerTitle = contextTitle.toLowerCase();

  // Keywords that suggest a question needing response
  const questionKeywords = ['?', 'how', 'what', 'why', 'when', 'where', 'can you', 'could you', 'would you', 'eliza'];
  const needsReply = questionKeywords.some(kw => lowerBody.includes(kw));

  // Keywords that suggest technical work needing task assignment
  const taskKeywords = ['bug', 'error', 'fix', 'implement', 'feature', 'add', 'create', 'smart contract', 'blockchain', 'deploy'];
  const needsTask = taskKeywords.some(kw => lowerBody.includes(kw) || lowerTitle.includes(kw));

  // Determine category based on content
  let category = 'general';
  if (lowerBody.includes('smart contract') || lowerBody.includes('blockchain') || lowerBody.includes('solidity')) {
    category = 'blockchain';
  } else if (lowerBody.includes('ui') || lowerBody.includes('frontend') || lowerBody.includes('design')) {
    category = 'frontend';
  } else if (lowerBody.includes('api') || lowerBody.includes('backend') || lowerBody.includes('database')) {
    category = 'backend';
  } else if (lowerBody.includes('test') || lowerBody.includes('qa')) {
    category = 'testing';
  }

  return {
    needsReply,
    needsTask,
    category,
    taskTitle: `GitHub: ${contextTitle.substring(0, 50)}...`
  };
}

/**
 * Create a task from a GitHub comment
 */
async function createTaskFromComment(params: {
  title: string;
  description: string;
  category: string;
  source: string;
  metadata: any;
}) {
  const taskId = crypto.randomUUID();

  await supabase.from('tasks').insert({
    id: taskId,
    title: params.title,
    description: params.description,
    repo: 'XMRT-Ecosystem',
    category: params.category,
    stage: 'BACKLOG',
    status: 'PENDING',
    priority: 5,
    assignee_agent_id: null, // Will be assigned by task orchestrator
  });

  console.log(`✅ Created task ${taskId} from ${params.source}`);

  return taskId;
}
