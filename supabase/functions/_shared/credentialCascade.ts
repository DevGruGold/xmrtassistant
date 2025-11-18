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
 * OAuth tokens are prioritized over PATs for better rate limits and UX
 */
export async function getGitHubCredential(
  data: any,
  sessionCredentials: any
): Promise<string | null> {
  const attemptedSources: string[] = [];
  
  // 1. Try OAuth access token FIRST (primary method - 5000 req/hr)
  if (data?.access_token) {
    attemptedSources.push('data.access_token');
    if (await validateGitHubToken(data.access_token)) {
      console.log('✅ Using OAuth access token from data');
      return data.access_token;
    }
    console.warn('❌ data.access_token validation failed');
  }

  // 2. Try session OAuth token (if user went through OAuth flow before)
  const sessionOAuth = sessionCredentials?.github_oauth_token;
  if (sessionOAuth) {
    attemptedSources.push('session.github_oauth_token');
    if (await validateGitHubToken(sessionOAuth)) {
      console.log('✅ Using session GitHub OAuth token');
      return sessionOAuth;
    }
    console.warn('❌ session.github_oauth_token validation failed');
  }

  // 3. Try session-provided PAT (fallback for users who prefer PAT)
  const sessionPAT = sessionCredentials?.github_pat;
  if (sessionPAT) {
    attemptedSources.push('session.github_pat');
    if (await validateGitHubToken(sessionPAT)) {
      console.log('✅ Using session GitHub PAT');
      return sessionPAT;
    }
    console.warn('❌ session.github_pat validation failed');
  }

  // 4. Try primary backend secret (GITHUB_TOKEN) - may hit rate limits
  const primaryToken = Deno.env.get('GITHUB_TOKEN');
  if (primaryToken) {
    attemptedSources.push('backend.GITHUB_TOKEN');
    if (await validateGitHubToken(primaryToken)) {
      console.log('✅ Using backend GITHUB_TOKEN');
      return primaryToken;
    }
    console.warn('❌ backend.GITHUB_TOKEN validation failed');
  }

  // 5. Try alternative backend secret (GITHUB_TOKEN_PROOF_OF_LIFE)
  const altToken = Deno.env.get('GITHUB_TOKEN_PROOF_OF_LIFE');
  if (altToken) {
    attemptedSources.push('backend.GITHUB_TOKEN_PROOF_OF_LIFE');
    if (await validateGitHubToken(altToken)) {
      console.log('✅ Using backend GITHUB_TOKEN_PROOF_OF_LIFE');
      return altToken;
    }
    console.warn('❌ backend.GITHUB_TOKEN_PROOF_OF_LIFE validation failed');
  }

  // 6. All attempts failed - log what we tried and return null
  console.error('⚠️ All GitHub credential sources exhausted. Attempted:', attemptedSources.join(', '));
  console.error('💡 Available credential types:', {
    has_data_token: !!data?.access_token,
    has_session_oauth: !!sessionOAuth,
    has_session_pat: !!sessionPAT,
    has_backend_primary: !!primaryToken,
    has_backend_alt: !!altToken
  });
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
 * Get GitHub user info from a token (works for both OAuth and PAT)
 * Returns username, email, name, etc. for proper attribution
 */
export async function getGitHubUserInfo(token: string): Promise<{
  username: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
} | null> {
  try {
    const authHeaders = [`Bearer ${token}`, `token ${token}`];
    
    for (const authHeader of authHeaders) {
      const response = await fetch('https://api.github.com/user', {
        headers: { 
          'Authorization': authHeader,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log(`✅ Retrieved GitHub user info: ${userData.login}`);
        return {
          username: userData.login,
          name: userData.name || null,
          email: userData.email || null,
          avatar_url: userData.avatar_url || null
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to get GitHub user info:', error);
    return null;
  }
}

/**
 * Try to get AI service credential (OpenAI, DeepSeek, Gemini AI, Vercel AI, OpenRouter, Gemini)
 */
export function getAICredential(
  service: 'openai' | 'deepseek' | 'gemini' | 'vercel_ai' | 'openrouter' | 'wan' | 'lovable_ai',
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
    gemini: 'GEMINI_API_KEY',
    vercel_ai: 'VERCEL_AI_GATEWAY_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    wan: 'WAN_AI_API_KEY',
    lovable_ai: 'LOVABLE_API_KEY'
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
