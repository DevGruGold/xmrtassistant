import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface FunctionUsageLog {
  function_name: string;
  executive_name?: string;
  invoked_by?: string;
  success: boolean;
  execution_time_ms: number;
  user_context?: string;
  parameters?: any;
  error_message?: string;
  result_summary?: string;
  metadata?: any;
  // NEW: Version tracking fields
  deployment_version?: string;
  function_hash?: string;
  deployment_id?: string;
  git_commit_hash?: string;
}

/**
 * Calculate a simple hash of function code for change detection
 */
async function calculateFunctionHash(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

/**
 * Automatically detect version information from environment
 */
function getVersionInfo(): {
  deployment_version?: string;
  deployment_id?: string;
  git_commit_hash?: string;
} {
  return {
    deployment_version: Deno.env.get('DEPLOYMENT_VERSION') || 
                       Deno.env.get('VERCEL_GIT_COMMIT_REF') ||
                       new Date().toISOString().split('T')[0],
    deployment_id: Deno.env.get('DEPLOYMENT_ID') || 
                   Deno.env.get('VERCEL_DEPLOYMENT_ID'),
    git_commit_hash: Deno.env.get('GIT_COMMIT_SHA') || 
                    Deno.env.get('VERCEL_GIT_COMMIT_SHA')
  };
}

/**
 * Log edge function usage for analytics and learning
 * All executives and edge functions should use this to track their activity
 */
export async function logFunctionUsage(
  supabase: SupabaseClient,
  log: FunctionUsageLog
): Promise<void> {
  try {
    const versionInfo = getVersionInfo();
    
    const { error } = await supabase
      .from('eliza_function_usage')
      .insert({
        function_name: log.function_name,
        executive_name: log.executive_name,
        invoked_by: log.invoked_by || 'system',
        success: log.success,
        execution_time_ms: log.execution_time_ms,
        user_context: log.user_context,
        parameters: log.parameters || {},
        error_message: log.error_message,
        result_summary: log.result_summary,
        metadata: log.metadata || {},
        // NEW: Automatic version tracking
        deployment_version: log.deployment_version || versionInfo.deployment_version,
        function_hash: log.function_hash,
        deployment_id: log.deployment_id || versionInfo.deployment_id,
        git_commit_hash: log.git_commit_hash || versionInfo.git_commit_hash
      });

    if (error) {
      console.error('Failed to log function usage:', error);
    }
  } catch (err) {
    console.error('Exception logging function usage:', err);
  }
}

/**
 * Wrapper to automatically log function execution
 */
export async function withUsageLogging<T>(
  supabase: SupabaseClient,
  functionName: string,
  executiveName: string | undefined,
  userContext: string | undefined,
  parameters: any,
  fn: () => Promise<T>,
  functionCode?: string // Optional: pass function code for hash calculation
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let errorMessage: string | undefined;
  let result: T;
  let functionHash: string | undefined;

  // Calculate function hash if code provided
  if (functionCode) {
    try {
      functionHash = await calculateFunctionHash(functionCode);
    } catch (e) {
      console.warn('Failed to calculate function hash:', e);
    }
  }

  try {
    result = await fn();
    success = true;
    return result;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    const executionTime = Date.now() - startTime;
    
    await logFunctionUsage(supabase, {
      function_name: functionName,
      executive_name: executiveName,
      success,
      execution_time_ms: executionTime,
      user_context: userContext,
      parameters,
      error_message: errorMessage,
      function_hash: functionHash
    });
  }
}
