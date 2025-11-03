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
    
    // 6. Check Activity Log for Recent Errors
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
    
    // 7. Generate Health Summary
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
