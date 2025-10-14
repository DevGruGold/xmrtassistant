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

    // Accept optional session credentials from request body
    const body = await req.json().catch(() => ({}));
    const sessionCredentials = body.session_credentials || {};

    console.log('🔍 API Key Health Monitor - Starting health checks...', 
      sessionCredentials.github_pat ? '(with session PAT)' : '');

    const healthResults = [];

    // Check GitHub PAT (backend tokens)
    const githubHealth = await checkGitHubHealth();
    healthResults.push(githubHealth);
    await supabase.from('api_key_health').upsert(githubHealth, { onConflict: 'service_name' });

    // Check session-provided GitHub PAT if provided
    if (sessionCredentials.github_pat) {
      const sessionGithubHealth = await checkSessionGitHubPAT(sessionCredentials.github_pat);
      healthResults.push(sessionGithubHealth);
      await supabase.from('api_key_health').upsert(sessionGithubHealth, { onConflict: 'service_name' });
    }

    // Check OpenAI
    const openaiHealth = await checkOpenAIHealth();
    healthResults.push(openaiHealth);
    await supabase.from('api_key_health').upsert(openaiHealth, { onConflict: 'service_name' });

    // Check DeepSeek
    const deepseekHealth = await checkDeepSeekHealth();
    healthResults.push(deepseekHealth);
    await supabase.from('api_key_health').upsert(deepseekHealth, { onConflict: 'service_name' });

    // Check xAI (Lead AI)
    const xaiHealth = await checkXAIHealth();
    healthResults.push(xaiHealth);
    await supabase.from('api_key_health').upsert(xaiHealth, { onConflict: 'service_name' });

    // Check Vercel AI
    const vercelHealth = await checkVercelAIHealth();
    healthResults.push(vercelHealth);
    await supabase.from('api_key_health').upsert(vercelHealth, { onConflict: 'service_name' });

    // Check Lovable AI
    const lovableHealth = await checkLovableAIHealth();
    healthResults.push(lovableHealth);
    await supabase.from('api_key_health').upsert(lovableHealth, { onConflict: 'service_name' });

    // Check Gemini
    const geminiHealth = await checkGeminiHealth();
    healthResults.push(geminiHealth);
    await supabase.from('api_key_health').upsert(geminiHealth, { onConflict: 'service_name' });

    // Check ElevenLabs
    const elevenlabsHealth = await checkElevenLabsHealth();
    healthResults.push(elevenlabsHealth);
    await supabase.from('api_key_health').upsert(elevenlabsHealth, { onConflict: 'service_name' });

    const healthyServices = healthResults.filter(h => h.is_healthy).length;
    console.log(`✅ Health check complete: ${healthyServices}/${healthResults.length} services healthy`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: healthResults,
        summary: `${healthyServices}/${healthResults.length} services healthy`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Health monitor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkGitHubHealth() {
  const tokens = [
    { name: 'GITHUB_TOKEN', value: Deno.env.get('GITHUB_TOKEN') },
    { name: 'GITHUB_TOKEN_PROOF_OF_LIFE', value: Deno.env.get('GITHUB_TOKEN_PROOF_OF_LIFE') }
  ];

  for (const token of tokens) {
    if (!token.value) continue;

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: { 
          'Authorization': `Bearer ${token.value}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const expiryHeader = response.headers.get('X-GitHub-Token-Expiry');
        let daysUntilExpiry = null;
        let expiryWarning = false;

        if (expiryHeader) {
          const expiryDate = new Date(expiryHeader);
          const daysLeft = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          daysUntilExpiry = daysLeft;
          expiryWarning = daysLeft < 7;
        }

        return {
          service_name: 'github',
          key_type: 'pat',
          is_healthy: true,
          error_message: null,
          expiry_warning: expiryWarning,
          days_until_expiry: daysUntilExpiry,
          metadata: { token_name: token.name }
        };
      }
    } catch (error) {
      console.warn(`GitHub token ${token.name} check failed:`, error);
    }
  }

  return {
    service_name: 'github',
    key_type: 'pat',
    is_healthy: false,
    error_message: 'No working GitHub token found',
    expiry_warning: false,
    days_until_expiry: null,
    metadata: {}
  };
}

async function checkOpenRouterHealth() {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    return {
      service_name: 'openrouter',
      key_type: 'api_key',
      is_healthy: false,
      error_message: 'API key not configured',
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://xmrt-dao.lovable.app',
        'X-Title': 'XMRT DAO'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      })
    });

    return {
      service_name: 'openrouter',
      key_type: 'api_key',
      is_healthy: response.ok || response.status === 402,
      error_message: response.ok ? null : `HTTP ${response.status}`,
      expiry_warning: response.status === 402,
      days_until_expiry: null,
      metadata: { 
        note: response.status === 402 ? 'Credits depleted' : '',
        model: 'google/gemini-2.0-flash-exp:free'
      }
    };
  } catch (error) {
    return {
      service_name: 'openrouter',
      key_type: 'api_key',
      is_healthy: false,
      error_message: error.message,
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }
}

async function checkOpenAIHealth() {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return {
      service_name: 'openai',
      key_type: 'api_key',
      is_healthy: false,
      error_message: 'API key not configured',
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    return {
      service_name: 'openai',
      key_type: 'api_key',
      is_healthy: response.ok,
      error_message: response.ok ? null : `HTTP ${response.status}`,
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  } catch (error) {
    return {
      service_name: 'openai',
      key_type: 'api_key',
      is_healthy: false,
      error_message: error.message,
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }
}

async function checkDeepSeekHealth() {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) {
    return {
      service_name: 'deepseek',
      key_type: 'api_key',
      is_healthy: false,
      error_message: 'API key not configured',
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      })
    });

    return {
      service_name: 'deepseek',
      key_type: 'api_key',
      is_healthy: response.ok || response.status === 402,
      error_message: response.ok ? null : `HTTP ${response.status}`,
      expiry_warning: response.status === 402,
      days_until_expiry: null,
      metadata: { note: response.status === 402 ? 'Credits depleted' : '' }
    };
  } catch (error) {
    return {
      service_name: 'deepseek',
      key_type: 'api_key',
      is_healthy: false,
      error_message: error.message,
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }
}

async function checkLovableAIHealth() {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    return {
      service_name: 'lovable_ai',
      key_type: 'api_key',
      is_healthy: false,
      error_message: 'API key not configured',
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      })
    });

    return {
      service_name: 'lovable_ai',
      key_type: 'api_key',
      is_healthy: response.ok || response.status === 402,
      error_message: response.ok ? null : `HTTP ${response.status}`,
      expiry_warning: response.status === 402,
      days_until_expiry: null,
      metadata: { note: response.status === 402 ? 'Credits depleted' : '' }
    };
  } catch (error) {
    return {
      service_name: 'lovable_ai',
      key_type: 'api_key',
      is_healthy: false,
      error_message: error.message,
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }
}

async function checkElevenLabsHealth() {
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!apiKey) {
    return {
      service_name: 'elevenlabs',
      key_type: 'api_key',
      is_healthy: false,
      error_message: 'API key not configured',
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': apiKey }
    });

    return {
      service_name: 'elevenlabs',
      key_type: 'api_key',
      is_healthy: response.ok,
      error_message: response.ok ? null : `HTTP ${response.status}`,
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  } catch (error) {
    return {
      service_name: 'elevenlabs',
      key_type: 'api_key',
      is_healthy: false,
      error_message: error.message,
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }
}

async function checkXAIHealth() {
  const apiKey = Deno.env.get('AI_GATEWAY_API_KEY');
  if (!apiKey) {
    return {
      service_name: 'xai',
      key_type: 'api_key',
      is_healthy: false,
      error_message: 'API key not configured',
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }

  try {
    // Test via Cloudflare AI Gateway since AI_GATEWAY_API_KEY is for gateway, not direct xAI
    const response = await fetch('https://gateway.ai.cloudflare.com/v1/2ab66a3e3b0f6c8d1f849bf835e90d7b/xmrt-dao/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'xai/grok-beta',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      })
    });

    return {
      service_name: 'xai',
      key_type: 'api_key',
      is_healthy: response.ok || response.status === 402,
      error_message: response.ok ? null : `HTTP ${response.status}`,
      expiry_warning: response.status === 402,
      days_until_expiry: null,
      metadata: { 
        note: response.status === 402 ? 'Credits depleted' : '',
        gateway: 'cloudflare_ai_gateway'
      }
    };
  } catch (error) {
    return {
      service_name: 'xai',
      key_type: 'api_key',
      is_healthy: false,
      error_message: error.message,
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }
}

async function checkVercelAIHealth() {
  // Note: We're actually using AI_GATEWAY_API_KEY for Cloudflare AI Gateway, not Vercel
  // This check is for backward compatibility only
  const apiKey = Deno.env.get('VERCEL_AI_GATEWAY_KEY');
  if (!apiKey) {
    return {
      service_name: 'vercel_ai',
      key_type: 'api_key',
      is_healthy: false,
      error_message: 'Not configured (using Cloudflare AI Gateway instead)',
      expiry_warning: false,
      days_until_expiry: null,
      metadata: { note: 'Legacy - using Cloudflare AI Gateway via AI_GATEWAY_API_KEY' }
    };
  }

  // If somehow configured, just mark as present but not validated
  return {
    service_name: 'vercel_ai',
    key_type: 'api_key',
    is_healthy: true,
    error_message: null,
    expiry_warning: false,
    days_until_expiry: null,
    metadata: { note: 'Legacy key - not actively used' }
  };
}

async function checkGeminiHealth() {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return {
      service_name: 'gemini',
      key_type: 'api_key',
      is_healthy: false,
      error_message: 'API key not configured',
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);

    return {
      service_name: 'gemini',
      key_type: 'api_key',
      is_healthy: response.ok,
      error_message: response.ok ? null : `HTTP ${response.status}`,
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  } catch (error) {
    return {
      service_name: 'gemini',
      key_type: 'api_key',
      is_healthy: false,
      error_message: error.message,
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }
}

async function checkSessionGitHubPAT(token: string) {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
    const rateLimitReset = response.headers.get('X-RateLimit-Reset');

    if (response.ok) {
      const userData = await response.json();
      const expiryHeader = response.headers.get('X-GitHub-Token-Expiry');
      let daysUntilExpiry = null;
      let expiryWarning = false;

      if (expiryHeader) {
        const expiryDate = new Date(expiryHeader);
        const daysLeft = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        daysUntilExpiry = daysLeft;
        expiryWarning = daysLeft < 7;
      }

      return {
        service_name: 'github_session',
        key_type: 'user_pat',
        is_healthy: true,
        error_message: null,
        expiry_warning: expiryWarning,
        days_until_expiry: daysUntilExpiry,
        metadata: { 
          token_source: 'user_session',
          user: userData.login,
          rate_limit: {
            limit: parseInt(rateLimitLimit || '5000'),
            remaining: parseInt(rateLimitRemaining || '0'),
            reset: parseInt(rateLimitReset || '0')
          }
        }
      };
    }

    return {
      service_name: 'github_session',
      key_type: 'user_pat',
      is_healthy: false,
      error_message: `Invalid PAT: HTTP ${response.status}`,
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  } catch (error) {
    return {
      service_name: 'github_session',
      key_type: 'user_pat',
      is_healthy: false,
      error_message: error.message,
      expiry_warning: false,
      days_until_expiry: null,
      metadata: {}
    };
  }
}
