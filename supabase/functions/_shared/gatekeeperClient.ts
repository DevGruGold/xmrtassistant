/**
 * Centralized Gatekeeper Client for inter-service communication
 * All edge functions should use this to call other edge functions
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const INTERNAL_ELIZA_KEY = Deno.env.get('INTERNAL_ELIZA_KEY') || 'eliza-internal-key-2025';

export interface GatekeeperCallOptions {
  target: string;
  action?: string;
  payload?: any;
  operation?: string;
  source?: string;
}

export interface GatekeeperResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

/**
 * Call another edge function through the Eliza Gatekeeper
 * Automatically handles authentication headers and error handling
 */
export async function callThroughGatekeeper<T = any>(
  options: GatekeeperCallOptions
): Promise<GatekeeperResponse<T>> {
  const { target, action, payload, operation, source = 'edge-function' } = options;

  const gatekeeperUrl = `${SUPABASE_URL}/functions/v1/eliza-gatekeeper`;

  try {
    console.log(`🔐 Gatekeeper call: ${source} → ${target}${action ? ` (${action})` : ''}`);

    const response = await fetch(gatekeeperUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-eliza-key': INTERNAL_ELIZA_KEY,
        'x-eliza-source': source,
      },
      body: JSON.stringify({
        target,
        action,
        payload,
        operation,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gatekeeper error (${response.status}):`, errorText);
      
      return {
        success: false,
        error: `Gatekeeper error: ${response.status} - ${errorText}`,
        status: response.status,
      };
    }

    const data = await response.json();
    console.log(`✅ Gatekeeper success: ${target}`);

    return {
      success: true,
      data: data.data || data,
      status: response.status,
    };
  } catch (error) {
    console.error(`❌ Gatekeeper call failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Direct call to Python Executor through gatekeeper
 */
export async function executePython(code: string, purpose: string, source = 'edge-function') {
  return callThroughGatekeeper({
    target: 'python-executor',
    payload: { code, purpose },
    source,
  });
}

/**
 * Direct call to DeepSeek Chat through gatekeeper
 */
export async function callDeepSeek(
  messages: any[], 
  source = 'edge-function',
  additionalContext?: {
    conversationHistory?: any[];
    userContext?: any;
    miningStats?: any;
    systemVersion?: any;
  }
) {
  return callThroughGatekeeper({
    target: 'deepseek-chat',
    payload: { 
      messages,
      conversationHistory: additionalContext?.conversationHistory || [],
      userContext: additionalContext?.userContext || { ip: 'system', isFounder: false },
      miningStats: additionalContext?.miningStats || null,
      systemVersion: additionalContext?.systemVersion || null
    },
    source,
  });
}

/**
 * Direct call to Agent Manager through gatekeeper
 */
export async function callAgentManager(action: string, data: any, source = 'edge-function') {
  return callThroughGatekeeper({
    target: 'agent-manager',
    action,
    payload: data,
    source,
  });
}

/**
 * Direct call to GitHub Integration through gatekeeper
 */
export async function callGitHub(action: string, data: any, source = 'edge-function') {
  return callThroughGatekeeper({
    target: 'github-integration',
    action,
    payload: data,
    source,
  });
}
