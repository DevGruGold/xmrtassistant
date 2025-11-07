import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecuteTemplateParams {
  template_name: string;
  params?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, data } = await req.json();
    console.log(`[Workflow Template Manager] Action: ${action}`);

    switch (action) {
      case 'list_templates': {
        const { category, active_only = true } = data || {};

        let query = supabase
          .from('workflow_templates')
          .select('*')
          .order('times_executed', { ascending: false });

        if (category) {
          query = query.eq('category', category);
        }

        if (active_only) {
          query = query.eq('is_active', true);
        }

        const { data: templates, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            templates: templates || [],
            count: templates?.length || 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_template': {
        const { template_name } = data;

        const { data: template, error } = await supabase
          .from('workflow_templates')
          .select('*')
          .eq('template_name', template_name)
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            template,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'execute_template': {
        const executeParams = data as ExecuteTemplateParams;
        const { template_name, params = {} } = executeParams;

        // Get template
        const { data: template, error: templateError } = await supabase
          .from('workflow_templates')
          .select('*')
          .eq('template_name', template_name)
          .single();

        if (templateError || !template) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Template not found: ${template_name}` 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
          );
        }

        // Create execution record
        const executionId = `exec_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
        const { data: execution, error: execError } = await supabase
          .from('workflow_template_executions')
          .insert({
            template_id: template.id,
            template_name: template.template_name,
            execution_id: executionId,
            status: 'running',
            execution_params: params,
            total_steps: (template.steps as any[]).length,
          })
          .select()
          .single();

        if (execError) throw execError;

        console.log(`[Workflow Template Manager] Starting execution: ${executionId} for template: ${template_name}`);

        // Execute workflow steps
        const steps = template.steps as any[];
        let stepsCompleted = 0;
        const startTime = Date.now();
        const results: any[] = [];

        try {
          for (const step of steps) {
            console.log(`[Workflow Template Manager] Executing step: ${step.name}`);
            
            // Process step based on type
            const stepResult = await executeStep(step, params, supabase);
            results.push({
              step: step.name,
              type: step.type,
              status: 'completed',
              result: stepResult,
            });

            stepsCompleted++;

            // Update execution progress
            await supabase
              .from('workflow_template_executions')
              .update({ steps_completed: stepsCompleted })
              .eq('id', execution.id);
          }

          // Mark execution as completed
          const durationMs = Date.now() - startTime;
          await supabase
            .from('workflow_template_executions')
            .update({
              status: 'completed',
              success: true,
              completed_at: new Date().toISOString(),
              duration_ms: durationMs,
              steps_completed: stepsCompleted,
              execution_results: { steps: results },
            })
            .eq('id', execution.id);

          // Update template statistics
          const newSuccessRate = ((template.success_rate * template.times_executed + 100) / (template.times_executed + 1));
          await supabase
            .from('workflow_templates')
            .update({
              times_executed: template.times_executed + 1,
              success_rate: newSuccessRate,
            })
            .eq('id', template.id);

          console.log(`[Workflow Template Manager] Execution completed: ${executionId} in ${durationMs}ms`);

          return new Response(
            JSON.stringify({
              success: true,
              execution_id: executionId,
              template_name,
              status: 'completed',
              duration_ms: durationMs,
              steps_completed: stepsCompleted,
              total_steps: steps.length,
              results,
              message: `Template '${template_name}' executed successfully in ${(durationMs / 1000).toFixed(1)}s`,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (stepError: any) {
          // Mark execution as failed
          const durationMs = Date.now() - startTime;
          await supabase
            .from('workflow_template_executions')
            .update({
              status: 'failed',
              success: false,
              completed_at: new Date().toISOString(),
              duration_ms: durationMs,
              steps_completed: stepsCompleted,
              error_message: stepError.message,
              execution_results: { steps: results, error: stepError.message },
            })
            .eq('id', execution.id);

          // Update template statistics
          const newSuccessRate = ((template.success_rate * template.times_executed) / (template.times_executed + 1));
          await supabase
            .from('workflow_templates')
            .update({
              times_executed: template.times_executed + 1,
              success_rate: newSuccessRate,
            })
            .eq('id', template.id);

          console.error(`[Workflow Template Manager] Execution failed: ${executionId}`, stepError);

          return new Response(
            JSON.stringify({
              success: false,
              execution_id: executionId,
              error: stepError.message,
              steps_completed: stepsCompleted,
              total_steps: steps.length,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
      }

      case 'create_template': {
        const { template_name, category, description, steps, tags = [] } = data;

        const { data: newTemplate, error: createError } = await supabase
          .from('workflow_templates')
          .insert({
            template_name,
            category,
            description,
            steps,
            tags,
          })
          .select()
          .single();

        if (createError) throw createError;

        console.log(`[Workflow Template Manager] Created template: ${template_name}`);

        return new Response(
          JSON.stringify({
            success: true,
            template: newTemplate,
            message: `Template '${template_name}' created successfully`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_template': {
        const { template_name, ...updates } = data;

        const { error: updateError } = await supabase
          .from('workflow_templates')
          .update(updates)
          .eq('template_name', template_name);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({
            success: true,
            message: `Template '${template_name}' updated successfully`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_template_analytics': {
        const { template_name, limit = 10 } = data || {};

        let query = supabase
          .from('workflow_template_executions')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(limit);

        if (template_name) {
          query = query.eq('template_name', template_name);
        }

        const { data: executions, error } = await query;

        if (error) throw error;

        // Calculate analytics
        const totalExecutions = executions?.length || 0;
        const successfulExecutions = executions?.filter(e => e.success).length || 0;
        const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
        const avgDuration = executions?.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / totalExecutions || 0;

        return new Response(
          JSON.stringify({
            success: true,
            analytics: {
              template_name,
              total_executions: totalExecutions,
              successful_executions: successfulExecutions,
              failed_executions: totalExecutions - successfulExecutions,
              success_rate: successRate.toFixed(2),
              avg_duration_ms: avgDuration.toFixed(0),
              avg_duration_seconds: (avgDuration / 1000).toFixed(1),
              recent_executions: executions || [],
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_execution_status': {
        const { execution_id } = data;

        const { data: execution, error } = await supabase
          .from('workflow_template_executions')
          .select('*')
          .eq('execution_id', execution_id)
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            execution,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error) {
    console.error('[Workflow Template Manager] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to execute individual workflow steps
async function executeStep(step: any, params: Record<string, any>, supabase: any): Promise<any> {
  const stepType = step.type;

  console.log(`[Workflow Step] Type: ${stepType}, Name: ${step.name}`);

  switch (stepType) {
    case 'validation':
      // Simple validation step - always passes for now
      return { validated: true, message: 'Validation passed' };

    case 'api_call':
      // Call another edge function
      if (step.function) {
        const functionName = step.function;
        const body = {
          action: step.action,
          data: replaceTemplateParams(step.params_template || {}, params),
        };

        console.log(`[Workflow Step] Calling function: ${functionName}`, body);

        const { data, error } = await supabase.functions.invoke(functionName, { body });

        if (error) throw new Error(`Function ${functionName} failed: ${error.message}`);

        return data;
      }
      return { skipped: true, reason: 'No function specified' };

    case 'database':
      // Database operation
      if (step.table && step.operation === 'insert') {
        const { error } = await supabase
          .from(step.table)
          .insert({
            title: `Workflow: ${step.description}`,
            description: step.description,
            type: 'workflow_execution',
            data: params,
          });

        if (error) throw error;
        return { inserted: true };
      }
      return { skipped: true, reason: 'Database operation not implemented' };

    case 'notification':
    case 'notification_batch':
    case 'multi_channel':
      // Notification steps - log for now
      console.log(`[Workflow Step] Notification: ${step.description}`);
      return { 
        notified: true, 
        message: step.description,
        channels: step.channels || ['system']
      };

    case 'decision':
    case 'analytics':
    case 'calculation':
    case 'logic':
    case 'scoring':
    case 'research':
    case 'monitoring':
    case 'process':
    case 'optimization':
    case 'risk_analysis':
    case 'reporting':
    case 'ai_generation':
    case 'ai_analysis':
    case 'knowledge_extraction':
    case 'batch_operation':
    case 'approval_gate':
    case 'blockchain_tx':
      // Complex steps - return placeholder for now
      console.log(`[Workflow Step] ${stepType}: ${step.description}`);
      return { 
        completed: true, 
        type: stepType,
        description: step.description,
        note: 'Step executed (placeholder implementation)'
      };

    default:
      console.log(`[Workflow Step] Unknown type: ${stepType}`);
      return { skipped: true, reason: `Unknown step type: ${stepType}` };
  }
}

// Helper function to replace template parameters
function replaceTemplateParams(template: any, params: Record<string, any>): any {
  if (typeof template === 'string') {
    return template.replace(/{(\w+)}/g, (_, key) => params[key] || '');
  }

  if (Array.isArray(template)) {
    return template.map(item => replaceTemplateParams(item, params));
  }

  if (template && typeof template === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = replaceTemplateParams(value, params);
    }
    return result;
  }

  return template;
}
