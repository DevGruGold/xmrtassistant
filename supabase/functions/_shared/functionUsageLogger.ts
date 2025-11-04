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
        metadata: log.metadata || {}
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
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let errorMessage: string | undefined;
  let result: T;

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
      error_message: errorMessage
    });
  }
}
