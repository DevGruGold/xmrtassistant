import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Step {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
}

interface WorkflowExecution {
  id: string;
  name: string;
  description: string;
  steps: Step[];
  status: 'running' | 'completed' | 'failed';
  currentStepIndex: number;
  startTime: string;
  endTime?: string;
  finalResult?: any;
  failedStep?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { workflow, userInput, context = {} } = await req.json();
    
    console.log('🎬 Multi-Step Orchestrator: Starting workflow:', workflow);
    
    // Initialize workflow execution
    const execution: WorkflowExecution = {
      id: `workflow-${Date.now()}`,
      name: workflow.name || 'Multi-Step Task',
      description: workflow.description || 'Executing background workflow',
      steps: workflow.steps.map((step: any, index: number) => ({
        id: `step-${index}`,
        name: step.name,
        description: step.description,
        status: 'pending' as const
      })),
      status: 'running',
      currentStepIndex: 0,
      startTime: new Date().toISOString()
    };
    
    // Log workflow start
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'multi_step_workflow',
      title: `🎬 Started: ${execution.name}`,
      description: `Executing ${execution.steps.length} steps in the background`,
      metadata: {
        workflow_id: execution.id,
        total_steps: execution.steps.length,
        steps: execution.steps.map(s => s.name)
      },
      status: 'running'
    });
    
    // Execute steps sequentially with background processing
    const executeWorkflow = async () => {
      for (let i = 0; i < execution.steps.length; i++) {
        const step = execution.steps[i];
        execution.currentStepIndex = i;
        step.status = 'running';
        step.startTime = new Date().toISOString();
        
        console.log(`🔄 Executing step ${i + 1}/${execution.steps.length}: ${step.name}`);
        
        try {
          // Execute the step based on its type
          const stepDefinition = workflow.steps[i];
          let result;
          
          switch (stepDefinition.type) {
            case 'ai_analysis':
              result = await executeAIAnalysis(stepDefinition, lovableApiKey, userInput, context);
              break;
            
            case 'data_fetch':
              result = await executeDataFetch(stepDefinition, supabase);
              break;
            
            case 'api_call':
              result = await executeAPICall(stepDefinition, supabaseUrl, supabaseServiceKey);
              break;
            
            case 'decision':
              result = await executeDecision(stepDefinition, lovableApiKey, context);
              break;
            
            case 'code_execution':
              result = await executeCode(stepDefinition, supabaseUrl, supabaseServiceKey);
              break;
            
            default:
              result = { status: 'skipped', reason: 'Unknown step type' };
          }
          
          step.status = 'completed';
          step.result = result;
          step.endTime = new Date().toISOString();
          step.duration = new Date(step.endTime).getTime() - new Date(step.startTime).getTime();
          
          console.log(`✅ Step ${i + 1} completed in ${step.duration}ms`);
          
          // Log step completion
          await supabase.from('eliza_activity_log').insert({
            activity_type: 'workflow_step_completed',
            title: `✅ Step ${i + 1}/${execution.steps.length}: ${step.name}`,
            description: `Completed successfully in ${step.duration}ms`,
            metadata: {
              workflow_id: execution.id,
              step_id: step.id,
              step_index: i,
              duration_ms: step.duration,
              result_preview: JSON.stringify(result).substring(0, 200)
            },
            status: 'completed'
          });
          
        } catch (stepError) {
          console.error(`❌ Step ${i + 1} failed:`, stepError);
          
          step.status = 'failed';
          step.error = stepError.message;
          step.endTime = new Date().toISOString();
          step.duration = new Date(step.endTime).getTime() - new Date(step.startTime!).getTime();
          
          execution.status = 'failed';
          execution.failedStep = step.name;
          execution.endTime = new Date().toISOString();
          
          // Log step failure
          await supabase.from('eliza_activity_log').insert({
            activity_type: 'workflow_step_failed',
            title: `❌ Failed at Step ${i + 1}/${execution.steps.length}: ${step.name}`,
            description: `Error: ${stepError.message}`,
            metadata: {
              workflow_id: execution.id,
              step_id: step.id,
              step_index: i,
              error: stepError.message,
              duration_ms: step.duration
            },
            status: 'failed'
          });
          
          break; // Stop workflow on failure
        }
      }
      
      // Workflow completed successfully if we got through all steps
      if (execution.status === 'running') {
        execution.status = 'completed';
        execution.endTime = new Date().toISOString();
        
        // Compile final result
        execution.finalResult = {
          success: true,
          steps_completed: execution.steps.filter(s => s.status === 'completed').length,
          total_duration: new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime(),
          results: execution.steps.map(s => ({
            step: s.name,
            result: s.result
          }))
        };
        
        console.log('🎉 Workflow completed successfully!');
        
        // Log workflow completion
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'multi_step_workflow',
          title: `🎉 Completed: ${execution.name}`,
          description: `All ${execution.steps.length} steps completed successfully`,
          metadata: {
            workflow_id: execution.id,
            total_steps: execution.steps.length,
            total_duration_ms: execution.finalResult.total_duration,
            final_result: execution.finalResult
          },
          status: 'completed'
        });
      }
      
      // Store execution record
      await supabase.from('webhook_logs').insert({
        webhook_name: 'multi_step_workflow',
        trigger_table: 'eliza_activity_log',
        trigger_operation: 'EXECUTE',
        payload: {
          execution_id: execution.id,
          workflow_name: execution.name,
          status: execution.status
        },
        response: execution.finalResult || {
          failed_at_step: execution.failedStep,
          error: execution.steps.find(s => s.status === 'failed')?.error
        },
        status: execution.status === 'completed' ? 'completed' : 'failed'
      });
    };
    
    // Run workflow in background using waitUntil
    EdgeRuntime.waitUntil(executeWorkflow());
    
    // Return immediately with workflow ID and tracking info
    return new Response(JSON.stringify({
      success: true,
      message: `Started background workflow: ${execution.name}`,
      workflow_id: execution.id,
      total_steps: execution.steps.length,
      estimated_duration: `${workflow.steps.length * 2}-${workflow.steps.length * 5} seconds`,
      tracking: {
        monitor_via: 'Task Pipeline Visualizer',
        activity_log_table: 'eliza_activity_log',
        workflow_id: execution.id
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Multi-Step Orchestrator error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Step execution functions
async function executeAIAnalysis(step: any, apiKey: string, userInput: string, context: any) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: step.system_prompt || 'You are a helpful AI assistant analyzing data.'
        },
        {
          role: 'user',
          content: step.prompt || userInput
        }
      ],
      temperature: step.temperature || 0.7,
      max_tokens: step.max_tokens || 1000
    })
  });
  
  if (!response.ok) {
    throw new Error(`AI analysis failed: ${response.status}`);
  }
  
  const data = await response.json();
  return {
    analysis: data.choices[0].message.content,
    model: 'gemini-2.5-flash'
  };
}

async function executeDataFetch(step: any, supabase: any) {
  const { data, error } = await supabase
    .from(step.table)
    .select(step.select || '*')
    .limit(step.limit || 100);
  
  if (error) throw error;
  
  return {
    data,
    count: data?.length || 0,
    table: step.table
  };
}

async function executeAPICall(step: any, supabaseUrl: string, serviceKey: string) {
  const response = await fetch(step.url || `${supabaseUrl}/functions/v1/${step.function}`, {
    method: step.method || 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...step.headers
    },
    body: step.body ? JSON.stringify(step.body) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }
  
  return await response.json();
}

async function executeDecision(step: any, apiKey: string, context: any) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are a decision engine. Analyze the context and make a strategic decision. Respond with JSON: {"decision": "...", "reasoning": "...", "confidence": 0-1}'
        },
        {
          role: 'user',
          content: `Context: ${JSON.stringify(context)}\n\nDecision needed: ${step.decision_prompt}`
        }
      ],
      temperature: 0.3
    })
  });
  
  if (!response.ok) {
    throw new Error(`Decision making failed: ${response.status}`);
  }
  
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function executeCode(step: any, supabaseUrl: string, serviceKey: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/python-executor`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: step.code,
      language: step.language || 'python',
      purpose: step.purpose || 'workflow execution'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Code execution failed: ${response.status}`);
  }
  
  return await response.json();
}
