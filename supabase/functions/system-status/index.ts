import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 System Status Check - Starting comprehensive diagnostics...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const VERCEL_SERVICES = {
      io: 'https://xmrt-io.vercel.app',
      ecosystem: 'https://xmrt-ecosystem.vercel.app',
      dao: 'https://xmrt-dao-ecosystem.vercel.app'
    };
    
    const statusReport: any = {
      timestamp: new Date().toISOString(),
      overall_status: 'healthy',
      components: {}
    };
    
    // 1. Check Database Health
    console.log('📊 Checking database health...');
    try {
      const { data: dbTest, error: dbError } = await supabase
        .from('agents')
        .select('id')
        .limit(1);
      
      statusReport.components.database = {
        status: dbError ? 'unhealthy' : 'healthy',
        error: dbError?.message,
        response_time_ms: 0 // Could add timing if needed
      };
    } catch (error) {
      statusReport.components.database = {
        status: 'error',
        error: error.message
      };
      statusReport.overall_status = 'degraded';
    }
    
    // 2. Check Agents Status
    console.log('🤖 Checking agents status...');
    try {
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (agentsError) throw agentsError;
      
      const agentStats = {
        total: agents?.length || 0,
        idle: agents?.filter((a: any) => a.status === 'IDLE').length || 0,
        busy: agents?.filter((a: any) => a.status === 'BUSY').length || 0,
        working: agents?.filter((a: any) => a.status === 'WORKING').length || 0,
        completed: agents?.filter((a: any) => a.status === 'COMPLETED').length || 0,
        error: agents?.filter((a: any) => a.status === 'ERROR').length || 0
      };
      
      statusReport.components.agents = {
        status: 'healthy',
        stats: agentStats,
        recent_agents: agents?.slice(0, 5).map((a: any) => ({
          id: a.id,
          name: a.name,
          role: a.role,
          status: a.status
        }))
      };
      
      // Flag if too many errors
      if (agentStats.error > 3) {
        statusReport.components.agents.status = 'degraded';
        statusReport.overall_status = 'degraded';
      }
    } catch (error) {
      statusReport.components.agents = {
        status: 'error',
        error: error.message
      };
      statusReport.overall_status = 'degraded';
    }
    
    // 3. Check Tasks Status
    console.log('📋 Checking tasks status...');
    try {
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (tasksError) throw tasksError;
      
      const taskStats = {
        total: tasks?.length || 0,
        pending: tasks?.filter((t: any) => t.status === 'PENDING').length || 0,
        in_progress: tasks?.filter((t: any) => t.status === 'IN_PROGRESS').length || 0,
        blocked: tasks?.filter((t: any) => t.status === 'BLOCKED').length || 0,
        completed: tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0,
        failed: tasks?.filter((t: any) => t.status === 'FAILED').length || 0
      };
      
      statusReport.components.tasks = {
        status: 'healthy',
        stats: taskStats,
        recent_tasks: tasks?.slice(0, 5).map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          stage: t.stage,
          priority: t.priority
        }))
      };
      
      // Flag if too many blocked or failed
      if (taskStats.blocked > 5 || taskStats.failed > 5) {
        statusReport.components.tasks.status = 'degraded';
        statusReport.overall_status = 'degraded';
      }
    } catch (error) {
      statusReport.components.tasks = {
        status: 'error',
        error: error.message
      };
      statusReport.overall_status = 'degraded';
    }
    
    // 4. Check Mining Proxy
    console.log('⛏️ Checking mining stats...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const { data: miningData, error: miningError } = await supabase.functions.invoke('mining-proxy', {
        body: {}
      });
      
      clearTimeout(timeoutId);
      
      if (miningError) throw miningError;
      
      statusReport.components.mining = {
        status: 'healthy',
        hash_rate: miningData.hash || 0,
        total_hashes: miningData.totalHashes || 0,
        valid_shares: miningData.validShares || 0,
        amount_due: miningData.amtDue || 0
      };
    } catch (error) {
      statusReport.components.mining = {
        status: 'error',
        error: error.message
      };
    }
    
    // 5. Check Vercel Services Status
    console.log('🚀 Checking Vercel services health...');
    try {
      const vercelHealthChecks = await Promise.all(
        Object.entries(VERCEL_SERVICES).map(async ([name, url]) => {
          const startTime = Date.now();
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(`${url}/health`, {
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            
            return {
              service: name,
              status: response.ok ? 'healthy' : 'degraded',
              url,
              response_time_ms: responseTime,
              status_code: response.status
            };
          } catch (error) {
            return {
              service: name,
              status: 'offline',
              url,
              error: error.message
            };
          }
        })
      );
      
      const allHealthy = vercelHealthChecks.every(s => s.status === 'healthy');
      
      statusReport.components.vercel_services = {
        status: allHealthy ? 'healthy' : 'degraded',
        services: vercelHealthChecks
      };
      
      if (!allHealthy) {
        statusReport.overall_status = 'degraded';
      }
    } catch (error) {
        statusReport.components.vercel_services = {
          status: 'error',
          error: error.message
        };
    }
    
    // 6. Check Edge Functions Health
    console.log('⚡ Checking edge functions health...');
    try {
      const { data: functionUsage, error: usageError } = await supabase
        .from('eliza_function_usage')
        .select('*')
        .gte('invoked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('invoked_at', { ascending: false });
      
      if (usageError) throw usageError;
      
      // Get function stats
      const functionStats: Record<string, any> = {};
      functionUsage?.forEach((usage: any) => {
        const funcName = usage.function_name;
        if (!functionStats[funcName]) {
          functionStats[funcName] = {
            total_calls: 0,
            successful: 0,
            failed: 0,
            avg_duration_ms: 0,
            last_called: null,
            error_rate: 0
          };
        }
        
        functionStats[funcName].total_calls++;
        if (usage.status === 'success') {
          functionStats[funcName].successful++;
        } else if (usage.status === 'error' || usage.status === 'failed') {
          functionStats[funcName].failed++;
        }
        
        if (usage.duration_ms) {
          functionStats[funcName].avg_duration_ms = 
            (functionStats[funcName].avg_duration_ms * (functionStats[funcName].total_calls - 1) + usage.duration_ms) 
            / functionStats[funcName].total_calls;
        }
        
        if (!functionStats[funcName].last_called || new Date(usage.invoked_at) > new Date(functionStats[funcName].last_called)) {
          functionStats[funcName].last_called = usage.invoked_at;
        }
      });
      
      // Calculate error rates
      Object.keys(functionStats).forEach(funcName => {
        const stats = functionStats[funcName];
        stats.error_rate = stats.total_calls > 0 ? (stats.failed / stats.total_calls) * 100 : 0;
        stats.avg_duration_ms = Math.round(stats.avg_duration_ms);
      });
      
      // Get top failing functions
      const topFailingFunctions = Object.entries(functionStats)
        .filter(([_, stats]: [string, any]) => stats.error_rate > 10)
        .sort((a: any, b: any) => b[1].error_rate - a[1].error_rate)
        .slice(0, 5)
        .map(([name, stats]) => ({ name, ...stats }));
      
      const totalFunctions = Object.keys(functionStats).length;
      const healthyFunctions = Object.values(functionStats).filter((s: any) => s.error_rate < 5).length;
      const degradedFunctions = Object.values(functionStats).filter((s: any) => s.error_rate >= 5 && s.error_rate < 20).length;
      const unhealthyFunctions = Object.values(functionStats).filter((s: any) => s.error_rate >= 20).length;
      
      statusReport.components.edge_functions = {
        status: unhealthyFunctions > 3 ? 'degraded' : (degradedFunctions > 5 ? 'degraded' : 'healthy'),
        total_functions: totalFunctions,
        healthy: healthyFunctions,
        degraded: degradedFunctions,
        unhealthy: unhealthyFunctions,
        top_failing: topFailingFunctions,
        total_calls_24h: functionUsage?.length || 0,
        overall_error_rate: functionUsage?.length > 0 
          ? Math.round((functionUsage.filter((u: any) => u.status === 'error' || u.status === 'failed').length / functionUsage.length) * 100) 
          : 0
      };
      
      if (unhealthyFunctions > 3 || statusReport.components.edge_functions.overall_error_rate > 15) {
        statusReport.overall_status = 'degraded';
      }
    } catch (error) {
      statusReport.components.edge_functions = {
        status: 'error',
        error: error.message
      };
    }
    
    // 7. Check Cron Jobs Health
    console.log('⏰ Checking cron jobs health...');
    try {
      // Query pg_cron jobs
      const { data: cronJobs, error: cronError } = await supabase.rpc('get_cron_jobs_status');
      
      if (cronError) {
        // Fallback: check activity log for scheduled tasks
        const { data: scheduledActivity, error: schedError } = await supabase
          .from('eliza_activity_log')
          .select('*')
          .in('activity_type', ['cron_execution', 'scheduled_task', 'daemon_scan'])
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (schedError) throw schedError;
        
        const cronStats: Record<string, any> = {};
        scheduledActivity?.forEach((activity: any) => {
          const jobName = activity.title || activity.activity_type;
          if (!cronStats[jobName]) {
            cronStats[jobName] = {
              executions: 0,
              successful: 0,
              failed: 0,
              last_run: null,
              success_rate: 0
            };
          }
          
          cronStats[jobName].executions++;
          if (activity.status === 'completed') {
            cronStats[jobName].successful++;
          } else if (activity.status === 'failed') {
            cronStats[jobName].failed++;
          }
          
          if (!cronStats[jobName].last_run || new Date(activity.created_at) > new Date(cronStats[jobName].last_run)) {
            cronStats[jobName].last_run = activity.created_at;
          }
        });
        
        // Calculate success rates
        Object.keys(cronStats).forEach(jobName => {
          const stats = cronStats[jobName];
          stats.success_rate = stats.executions > 0 ? Math.round((stats.successful / stats.executions) * 100) : 0;
        });
        
        const totalJobs = Object.keys(cronStats).length;
        const healthyJobs = Object.values(cronStats).filter((s: any) => s.success_rate > 80).length;
        const failingJobs = Object.values(cronStats).filter((s: any) => s.success_rate < 50).length;
        
        statusReport.components.cron_jobs = {
          status: failingJobs > 2 ? 'degraded' : (healthyJobs < totalJobs / 2 ? 'degraded' : 'healthy'),
          total_jobs: totalJobs,
          healthy_jobs: healthyJobs,
          failing_jobs: failingJobs,
          jobs_summary: Object.entries(cronStats).map(([name, stats]) => ({
            name,
            ...stats
          })).sort((a: any, b: any) => a.success_rate - b.success_rate),
          executions_24h: scheduledActivity?.length || 0
        };
        
        if (failingJobs > 2) {
          statusReport.overall_status = 'degraded';
        }
      } else {
        statusReport.components.cron_jobs = {
          status: 'healthy',
          jobs: cronJobs
        };
      }
    } catch (error) {
      statusReport.components.cron_jobs = {
        status: 'error',
        error: error.message
      };
    }
    
    // 8. Check Activity Log for Recent Errors
    console.log('📜 Checking recent activity logs...');
    try {
      const { data: recentActivity, error: activityError } = await supabase
        .from('eliza_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (activityError) throw activityError;
      
      const pendingCount = recentActivity?.filter((a: any) => a.status === 'pending').length || 0;
      const failedCount = recentActivity?.filter((a: any) => a.status === 'failed').length || 0;
      
      statusReport.components.activity_log = {
        status: failedCount > 10 ? 'degraded' : 'healthy',
        recent_activities: recentActivity?.slice(0, 5).map((a: any) => ({
          type: a.activity_type,
          title: a.title,
          status: a.status,
          created_at: a.created_at
        })),
        stats: {
          pending: pendingCount,
          failed: failedCount
        }
      };
      
      if (failedCount > 10) {
        statusReport.overall_status = 'degraded';
      }
    } catch (error) {
      statusReport.components.activity_log = {
        status: 'error',
        error: error.message
      };
    }
    
    // 9. Generate Health Summary
    const healthyComponents = Object.values(statusReport.components).filter(
      (c: any) => c.status === 'healthy'
    ).length;
    const totalComponents = Object.keys(statusReport.components).length;
    
    statusReport.health_score = Math.round((healthyComponents / totalComponents) * 100);
    
    if (statusReport.health_score < 50) {
      statusReport.overall_status = 'unhealthy';
    } else if (statusReport.health_score < 80) {
      statusReport.overall_status = 'degraded';
    }
    
    console.log(`✅ System Status Check Complete - Overall: ${statusReport.overall_status} (${statusReport.health_score}% healthy)`);
    
    return new Response(
      JSON.stringify({
        success: true,
        status: statusReport
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("System status check error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        status: {
          overall_status: 'error',
          timestamp: new Date().toISOString()
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
