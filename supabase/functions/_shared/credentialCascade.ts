/**
 * Intelligent Credential Cascade System
 * Tries multiple sources for credentials before asking the user
 */

export interface CredentialResult {
  token: string | null;
  method: string;
  needsUserInput: boolean;
  error?: string;
}

/**
 * Try to get GitHub credential from multiple sources in priority order
 */
export async function getGitHubCredential(
  data: any,
  sessionCredentials: any
): Promise<string | null> {
  // 1. Try session-provided credential (highest priority for user experience)
  const sessionPAT = sessionCredentials?.github_pat;
  if (sessionPAT && await validateGitHubToken(sessionPAT)) {
    console.log('✅ Using session GitHub PAT');
    return sessionPAT;
  }

  // 2. Try data access_token (from OAuth flow)
  if (data?.access_token && await validateGitHubToken(data.access_token)) {
    console.log('✅ Using OAuth access token from data');
    return data.access_token;
  }

  // 3. OAuth app credentials removed - doesn't work with GraphQL API
  // GraphQL requires actual user tokens (PAT or OAuth user token)
  // OAuth app client credentials only work for REST API endpoints

  // 4. Try primary backend secret (GITHUB_TOKEN) - may hit rate limits
  const primaryToken = Deno.env.get('GITHUB_TOKEN');
  if (primaryToken && await validateGitHubToken(primaryToken)) {
    console.log('✅ Using backend GITHUB_TOKEN (may be rate limited)');
    return primaryToken;
  }

  // 5. Try alternative backend secret (GITHUB_TOKEN_PROOF_OF_LIFE)
  const altToken = Deno.env.get('GITHUB_TOKEN_PROOF_OF_LIFE');
  if (altToken && await validateGitHubToken(altToken)) {
    console.log('✅ Using backend GITHUB_TOKEN_PROOF_OF_LIFE (may be rate limited)');
    return altToken;
  }

  // 6. All attempts failed - return null to trigger user prompt
  console.warn('⚠️ All GitHub credential sources exhausted');
  return null;
}

/**
 * Validate GitHub token by making a lightweight API call
 */
async function validateGitHubToken(token: string): Promise<boolean> {
  try {
    // Try both Bearer (OAuth) and token (PAT) authentication formats
    const authHeaders = [
      `Bearer ${token}`,
      `token ${token}`
    ];
    
    for (const authHeader of authHeaders) {
      const response = await fetch('https://api.github.com/user', {
        headers: { 
          'Authorization': authHeader,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        console.log(`✅ Token validated with auth: ${authHeader.split(' ')[0]}`);
        return true;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Token validation failed with ${authHeader.split(' ')[0]}:`, response.status, errorText);
      }
    }
    
    return false;
  } catch (error) {
    console.warn('Token validation error:', error);
    return false;
  }
}

/**
 * Try to get AI service credential (OpenAI, DeepSeek, Lovable AI, Vercel AI, xAI, OpenRouter, Gemini)
 */
export function getAICredential(
  service: 'openai' | 'deepseek' | 'lovable_ai' | 'vercel_ai' | 'xai' | 'openrouter' | 'gemini',
  sessionCredentials: any
): string | null {
  // 1. Try session credential
  const sessionKey = sessionCredentials?.[`${service}_api_key`];
  if (sessionKey) {
    console.log(`✅ Using session ${service} API key`);
    return sessionKey;
  }

  // 2. Try backend secret
  const envKeys: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    lovable_ai: 'LOVABLE_API_KEY',
    vercel_ai: 'VERCEL_AI_GATEWAY_KEY',
    xai: 'AI_GATEWAY_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    gemini: 'GEMINI_API_KEY'
  };

  const backendKey = Deno.env.get(envKeys[service]);
  if (backendKey) {
    console.log(`✅ Using backend ${service} API key`);
    return backendKey;
  }

  // 3. All sources exhausted
  console.warn(`⚠️ No ${service} credential available`);
  return null;
}

/**
 * Create standardized credential_required error response
 */
export function createCredentialRequiredResponse(
  service: string,
  credentialType: string,
  message: string,
  helpUrl?: string,
  requiredScopes?: string[]
) {
  return {
    error_type: 'credential_required',
    service,
    credential_type: credentialType,
    reason: 'missing',
    user_prompt: message,
    optional: false,
    help_url: helpUrl,
    required_scopes: requiredScopes
  };
}
