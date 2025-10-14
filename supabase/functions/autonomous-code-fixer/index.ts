import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate API success beyond exit code
function validateApiSuccess(execResult: any): { success: boolean; issue?: string } {
  const output = (execResult.output || '').toLowerCase();
  const error = (execResult.error || '').toLowerCase();
  
  // Check for API failures
  if (output.includes('404') || output.includes('not found')) {
    return { success: false, issue: '404_not_found' };
  }
  if (output.includes('401') || output.includes('unauthorized')) {
    return { success: false, issue: 'auth_failure' };
  }
  if (output.includes('403') || output.includes('forbidden')) {
    return { success: false, issue: 'permission_denied' };
  }
  if (output.includes('null') && output.includes('response')) {
    return { success: false, issue: 'null_response' };
  }
  if (output.includes('none') && output.includes('returned')) {
    return { success: false, issue: 'none_returned' };
  }
  if (error.includes('404') || error.includes('401') || error.includes('403')) {
    return { success: false, issue: 'api_error' };
  }
  
  return { success: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🤖 Autonomous Code Fixer - Starting scan for failed executions...');

    // 🔧 PHASE 3: Relaxed circuit breaker for 1-minute cron cycles (30 runs/min max)
    // Allows frequent monitoring without tripping breaker
    const { data: recentRuns } = await supabase
      .from('eliza_activity_log')
      .select('created_at')
      .eq('activity_type', 'code_monitoring')
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last 1 minute
      .order('created_at', { ascending: false });

    if (recentRuns && recentRuns.length > 30) {
      console.log('⏸️ Circuit breaker triggered - too many runs in the last minute (>30). Pausing.');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Circuit breaker active - pausing to prevent runaway loop',
        fixed: 0,
        circuit_breaker: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for repeated failures of the same code pattern and DELETE them if excessive
    const { data: recentFailedFixes } = await supabase
      .from('eliza_python_executions')
      .select('id, code, error, created_at')
      .eq('exit_code', 1)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .limit(50);

    if (recentFailedFixes && recentFailedFixes.length > 15) {
      // Check if the same code keeps failing (first 300 chars to identify pattern)
      const codePatternMap = new Map<string, any[]>();
      recentFailedFixes.forEach((f: any) => {
        const pattern = f.code?.substring(0, 300) || 'unknown';
        if (!codePatternMap.has(pattern)) {
          codePatternMap.set(pattern, []);
        }
        codePatternMap.get(pattern)!.push(f);
      });

      // Find patterns that have failed more than 20 times
      for (const [pattern, failures] of codePatternMap.entries()) {
        if (failures.length > 20) {
          console.log(`🗑️ DELETING ${failures.length} failed executions of same code pattern (exceeded 20 failures)`);
          
          // Delete all failed executions for this pattern
          const idsToDelete = failures.map(f => f.id);
          const { error: deleteError } = await supabase
            .from('eliza_python_executions')
            .delete()
            .in('id', idsToDelete);

          if (deleteError) {
            console.error('Failed to delete failed executions:', deleteError);
          } else {
            console.log(`✅ Deleted ${idsToDelete.length} unfixable failed executions`);
            
            // Log the cleanup action
            await supabase.from('eliza_activity_log').insert({
              activity_type: 'code_monitoring',
              title: '🗑️ Cleaned Up Unfixable Code',
              description: `Deleted ${idsToDelete.length} failed executions of the same code pattern (failed ${failures.length} times). Likely missing environment variables or unfixable issue.`,
              status: 'completed',
              metadata: { 
                deleted_count: idsToDelete.length, 
                failure_count: failures.length,
                code_preview: pattern.substring(0, 100)
              }
            });
          }
        }
      }
    }

    // 🎯 PHASE 4: Increased batch size from 5 to 10 for parallel processing
    // Find all failed Python executions that haven't been fixed yet
    // Only look at failures from the last 24 hours to avoid reprocessing ancient failures
    // 🚀 NOW SUPPORTS ALL SOURCES: eliza, autonomous_agent, python-fixer-agent
    const { data: failedExecutions, error: fetchError } = await supabase
      .from('eliza_python_executions')
      .select('*')
      .eq('exit_code', 1)
      .in('source', ['eliza', 'autonomous_agent', 'python-fixer-agent']) // Auto-fix ALL sources
      .gte('created_at', new Date(Date.now() - 86400000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })
      .limit(10);
    
    // CRITICAL: Filter out unfixable errors (environment variables, missing dependencies, etc.)
    const fixableExecutions = (failedExecutions || []).filter((exec: any) => {
      const errorLower = (exec.error || exec.output || '').toLowerCase();
      const codeLower = (exec.code || '').toLowerCase();
      
      // Don't try to fix environment variable issues - these can't be fixed with code changes
      if (errorLower.includes('supabase_url') || errorLower.includes('supabase_key') ||
          errorLower.includes('environment variable') || errorLower.includes('env var')) {
        return false;
      }
      
      // Don't try to fix missing system dependencies or pip packages
      // Piston API only has Python stdlib, no pip packages available
      if (errorLower.includes('no module named') || errorLower.includes('modulenotfounderror') ||
          errorLower.includes('importerror') || errorLower.includes('cannot import name') ||
          errorLower.includes('requests') || errorLower.includes('numpy') || 
          errorLower.includes('pandas') || errorLower.includes('aiohttp') ||
          errorLower.includes('pip') || errorLower.includes('package not installed')) {
        return false;
      }
      
      // Don't try to fix network/API issues that are transient
      if (errorLower.includes('connection refused') || errorLower.includes('timeout') ||
          errorLower.includes('unreachable') || errorLower.includes('network')) {
        return false;
      }
      
      return true;
    });
    
    // Delete unfixable executions immediately to prevent clutter
    const unfixableCount = (failedExecutions?.length || 0) - fixableExecutions.length;
    if (unfixableCount > 0) {
      const unfixableIds = (failedExecutions || [])
        .filter((exec: any) => !fixableExecutions.includes(exec))
        .map((exec: any) => exec.id);
      
      await supabase
        .from('eliza_python_executions')
        .delete()
        .in('id', unfixableIds);
      
      console.log(`🗑️ Deleted ${unfixableCount} unfixable executions (env vars, missing deps, network issues)`);
      
      await supabase.from('eliza_activity_log').insert({
        activity_type: 'code_monitoring',
        title: '🗑️ Cleaned Up Unfixable Errors',
        description: `Deleted ${unfixableCount} executions with unfixable errors (missing env vars, dependencies, or network issues)`,
        status: 'completed',
        metadata: { deleted_count: unfixableCount }
      });
    }

    if (fetchError) {
      console.error('Failed to fetch executions:', fetchError);
      throw fetchError;
    }

    if (fixableExecutions.length === 0) {
      console.log('✅ No fixable executions found - all issues are environmental or already handled');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No fixable executions found',
        fixed: 0,
        unfixable_cleaned: unfixableCount
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 Found ${fixableExecutions.length} fixable executions (cleaned ${unfixableCount} unfixable ones)`);

    // Get total count of remaining failed executions for progress tracking
    const { count: totalFailedCount } = await supabase
      .from('eliza_python_executions')
      .select('*', { count: 'exact', head: true })
      .eq('exit_code', 1)
      .in('source', ['eliza', 'autonomous_agent', 'python-fixer-agent'])
      .gte('created_at', new Date(Date.now() - 86400000).toISOString());

    // 🚀 PHASE 4: Process in parallel batches of 3 for faster throughput
    console.log(`🔧 Processing ${fixableExecutions.length} executions in parallel batches of 3...`);
    const results = [];
    
    // Track source metrics for reporting
    const sourceMetrics = {
      eliza: { attempted: 0, fixed: 0, failed: 0 },
      autonomous_agent: { attempted: 0, fixed: 0, failed: 0 },
      'python-fixer-agent': { attempted: 0, fixed: 0, failed: 0 }
    };
    
    for (let batchStart = 0; batchStart < fixableExecutions.length; batchStart += 3) {
      const batch = fixableExecutions.slice(batchStart, batchStart + 3);
      console.log(`📦 Batch ${Math.floor(batchStart / 3) + 1}: Processing ${batch.length} executions in parallel...`);
      
      const batchResults = await Promise.all(batch.map(async (execution) => {
        const source = execution.source || 'eliza';
        sourceMetrics[source].attempted++;
        console.log(`🔧 Attempting to fix execution ${execution.id} (source: ${source})...`);
      
        // Check if this exact execution has already been attempted (successful or not)
        // Look for any fix attempt in the last hour to prevent infinite retries
        const { data: recentFixAttempts } = await supabase
          .from('eliza_activity_log')
          .select('id')
          .eq('activity_type', 'python_fix')
          .contains('metadata', { original_execution_id: execution.id })
          .gte('created_at', new Date(Date.now() - 3600000).toISOString())
          .limit(1);

        if (recentFixAttempts && recentFixAttempts.length > 0) {
          console.log(`⏭️ Execution ${execution.id} already attempted in the last hour, skipping`);
          return {
            execution_id: execution.id,
            success: false,
            error: 'Recently attempted',
            skipped: true
          };
        }

        // Fix the code directly using the same AI cascade as chat (Gemini → OpenRouter → etc.)
        const agentContext = source !== 'eliza' && execution.metadata?.agent_id 
          ? `\n\n**Agent Context:** This code was executed by agent ${execution.metadata.agent_id} for task ${execution.metadata.task_id || 'unknown'}.` 
          : '';
        
        // Call vercel-ai-chat which uses the working AI cascade
        const fixResult = await supabase.functions.invoke('vercel-ai-chat', {
          body: {
            messages: [
              {
                role: 'user',
                content: `Fix this Python code error:

**Original Code:**
\`\`\`python
${execution.code}
\`\`\`

**Error Message:**
${execution.error}
${agentContext}

CRITICAL CONSTRAINTS:
- Only Python 3.10 standard library is available (NO pip packages: no requests, pandas, numpy, aiohttp, etc.)
- No network access or external APIs
- No file system access beyond temporary execution
- Only pure Python stdlib modules can be imported

COMMON ISSUES TO FIX:
1. Syntax errors (missing quotes, brackets, colons)
2. NameError (undefined variables) - add proper variable definitions
3. TypeError (wrong data types) - add type conversions
4. AttributeError (wrong method names) - fix method calls
5. IndentationError - fix indentation
6. Logic errors in calculations or conditions

OUTPUT FORMAT:
- Return ONLY the complete fixed Python code
- NO markdown code blocks, NO explanations, NO comments about what you changed
- Just raw Python code that will execute successfully`
              }
            ],
            conversationHistory: [],
            userContext: { 
              ip: 'code-fixer', 
              isFounder: false 
            },
            miningStats: null,
            systemVersion: null
          }
        });

        if (fixResult.error) {
          console.error(`❌ Failed to get fix from DeepSeek for execution ${execution.id}:`, fixResult.error);
          return {
            execution_id: execution.id,
            success: false,
            error: fixResult.error.message || 'DeepSeek API error'
          };
        }

        // Extract fixed code from response
        let fixedCode = '';
        const resultData = fixResult.data;
        if (typeof resultData === 'string') {
          fixedCode = resultData;
        } else if (resultData?.response) {
          fixedCode = resultData.response;
        } else if (resultData?.generatedText) {
          fixedCode = resultData.generatedText;
        }

        // Ensure fixedCode is a string and not empty
        if (typeof fixedCode !== 'string' || fixedCode.trim().length === 0) {
          console.error(`❌ No fixed code returned for execution ${execution.id}. Response:`, resultData);
          return {
            execution_id: execution.id,
            success: false,
            error: 'No fixed code returned from AI'
          };
        }

        // Try to execute the fixed code directly via python-executor
        const execResult = await supabase.functions.invoke('python-executor', {
          body: {
            code: fixedCode,
            purpose: `Auto-fixed: ${execution.purpose || 'Unknown'}`,
            source: 'autonomous-code-fixer'
          }
        });

        if (execResult.error) {
          console.error(`❌ Failed to execute fixed code for ${execution.id}:`, execResult.error);
          // Log the failed fix attempt
          await supabase.from('eliza_python_executions').insert({
            code: fixedCode,
            output: '',
            error: execResult.error.message || 'Execution failed',
            exit_code: 1,
            source: 'autonomous-code-fixer',
            purpose: `Failed fix attempt for: ${execution.purpose || 'Unknown'}`
          });
          
          return {
            execution_id: execution.id,
            success: false,
            error: execResult.error.message || 'Fixed code execution failed'
          };
        }

        // Extract execution result data
        const execData = execResult.data;
        
        // Validate API success beyond just exit code
        const apiValidation = validateApiSuccess(execData);
        
        if (execData.exitCode === 0 && apiValidation.success) {
          sourceMetrics[source].fixed++;
          console.log(`✅ Successfully fixed and executed code for ${execution.id} (source: ${source})`);
          
          // Log the successful fix with enhanced metadata
          const { data: successExec } = await supabase.from('eliza_python_executions').insert({
            code: fixedCode,
            output: execData.output || '',
            error: execData.error || '',
            exit_code: 0,
            source: 'autonomous-code-fixer',
            purpose: `Fixed: ${execution.purpose || 'Unknown'}`,
            metadata: {
              original_source: source,
              original_execution_id: execution.id,
              agent_id: execution.metadata?.agent_id,
              task_id: execution.metadata?.task_id,
              was_auto_fixed: true,
              fixed_by: 'autonomous-code-fixer',
              fix_attempt_number: 1,
              fixed_at: new Date().toISOString()
            }
          }).select().single();

          // Update the activity log with clear source attribution
          const activityTitle = source === 'eliza' 
            ? '🔧 Eliza Code Auto-Fixed and Executed' 
            : `🔧 Agent Code Auto-Fixed and Executed (${source})`;
          
          await supabase.from('eliza_activity_log').insert({
            activity_type: source === 'eliza' ? 'python_fix_success' : 'agent_python_fix_success',
            title: activityTitle,
            description: `Auto-fixed and successfully executed Python code for: ${execution.purpose || 'Unknown task'}`,
            status: 'completed',
            metadata: {
              original_execution_id: execution.id,
              fixed_execution_id: successExec?.id,
              fixed_code: fixedCode.substring(0, 500),
              source: source,
              agent_id: execution.metadata?.agent_id,
              task_id: execution.metadata?.task_id,
              was_auto_fixed: true,
              fixed_by: 'autonomous-code-fixer'
            },
            mentioned_to_user: false // Eliza will proactively report this
          });

          return {
            execution_id: execution.id,
            success: true,
            fixed_execution_id: successExec?.id,
            source: source
          };
        } else if (execResult.data.exitCode === 0 && !apiValidation.success) {
          // Code ran but API failed - attempt second-level fix
          console.log(`⚠️ Code ran but API failed (${apiValidation.issue}) for ${execution.id}. Attempting deeper fix...`);
          
          // Check metadata for fix attempts to prevent infinite loops
          const fixAttempts = (execution.metadata as any)?.fix_attempts || 0;
          const secondLevelAttempted = (execution.metadata as any)?.second_level_attempted || false;
          
          if (secondLevelAttempted || fixAttempts >= 2) {
            console.log(`🚫 Max fix attempts reached for ${execution.id}, marking for human intervention`);
            
            // Schedule a follow-up reminder
            await supabase.functions.invoke('schedule-reminder', {
              body: {
                action_type: 'reminder',
                action_data: {
                  message: `Follow up on API failure (${apiValidation.issue}): ${execution.purpose || 'Unknown task'}`,
                  context: {
                    execution_id: execution.id,
                    issue: apiValidation.issue,
                    output: execResult.output?.substring(0, 200)
                  },
                  callback_action: 'check_api_fix_status'
                },
                execute_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
                session_key: 'global'
              }
            });
            
            return {
              execution_id: execution.id,
              success: false,
              error: 'Max fix attempts reached - requires human intervention',
              requires_human: true
            };
          }
          
          // Attempt second-level fix with API-specific context
          const apiContextPrompt = `Fix this Python code that runs without errors but has an API failure:

**Original Code:**
\`\`\`python
${fixedCode}
\`\`\`

**Issue:** ${apiValidation.issue}
**Output:** ${execResult.output?.substring(0, 300)}

The code executes but the API call fails. Possible causes:
- For 404: Resource doesn't exist, wrong path, wrong branch name, repo not found
- For 401/403: Authentication token invalid or insufficient permissions
- For null response: API returned successfully but with no data

Fix the code to:
1. Add validation checks BEFORE making API calls
2. Handle the specific error case (${apiValidation.issue})
3. Add fallback logic or better error messages

Return ONLY the fixed Python code without explanations or markdown.`;

          const { data: deeperFix, error: deeperFixError } = await supabase.functions.invoke('deepseek-chat', {
            body: { message: apiContextPrompt }
          });

          if (!deeperFixError && deeperFix?.generatedText) {
            const deeperFixedCode = deeperFix.generatedText;
            
            // Try executing the deeper fix
            const { data: deeperExecResult, error: deeperExecError } = await supabase.functions.invoke('python-executor', {
              body: {
                code: deeperFixedCode,
                purpose: `Second-level fix: ${execution.purpose || 'Unknown'}`,
                silent: true
              }
            });

            if (!deeperExecError && deeperExecResult?.exitCode === 0) {
              const deeperValidation = validateApiSuccess(deeperExecResult);
              if (deeperValidation.success) {
                console.log(`✅✅ Second-level fix succeeded for ${execution.id}`);
                
                await supabase.from('eliza_activity_log').insert({
                  activity_type: 'python_fix_success',
                  title: '✅✅ Deep API Fix Succeeded',
                  description: `Fixed API issue (${apiValidation.issue}) for: ${execution.purpose || 'Unknown task'}`,
                  status: 'completed',
                  metadata: {
                    original_execution_id: execution.id,
                    issue_type: apiValidation.issue,
                    fix_level: 'second'
                  },
                  mentioned_to_user: false
                });

                return {
                  execution_id: execution.id,
                  success: true,
                  second_level_fix: true
                };
              }
            }
          }
          
          // Second-level fix also failed, schedule follow-up
          await supabase.functions.invoke('schedule-reminder', {
            body: {
              action_type: 'reminder',
              action_data: {
                message: `Follow up on persistent API failure: ${execution.purpose || 'Unknown task'}`,
                context: {
                  execution_id: execution.id,
                  issue: apiValidation.issue
                }
              },
              execute_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              session_key: 'global'
            }
          });
          
          return {
            execution_id: execution.id,
            success: false,
            error: `API failure (${apiValidation.issue}) - second-level fix failed`,
            follow_up_scheduled: true
          };
        } else {
          console.warn(`⚠️ Fixed code still failed for ${execution.id}`);
          return {
            execution_id: execution.id,
            success: false,
            error: execResult.error || 'Fixed code still failed'
          };
        }
      }));

      // 🚀 PHASE 2: Reduced inter-batch delay from 2000ms to 500ms (4x faster)
      results.push(...batchResults);
      if (batchStart + 3 < fixableExecutions.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const skippedCount = results.filter(r => r.skipped).length;
    console.log(`🎉 Fixed ${successCount} out of ${results.length} executions`);

    // Log comprehensive progress to activity log
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'code_monitoring',
      title: '🔍 Code Health Monitor',
      description: `Scanned for failed executions. Fixed: ${successCount}`,
      status: 'completed',
      metadata: {
        total_processed: results.length,
        fixed_count: successCount,
        skipped_count: skippedCount,
        unfixable_deleted: unfixableCount,
        remaining_failed: (totalFailedCount || 0) - successCount,
        total_failed_at_start: totalFailedCount
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.length} failed executions`,
      fixed: successCount,
      skipped: skippedCount,
      unfixable_deleted: unfixableCount,
      remaining: (totalFailedCount || 0) - successCount,
      total_at_start: totalFailedCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Autonomous Code Fixer error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
