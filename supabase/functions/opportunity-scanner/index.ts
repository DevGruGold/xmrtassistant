import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action } = await req.json().catch(() => ({ action: 'scan' }));

    if (action === 'generate_report') {
      return await generateDailyReport(supabase);
    }

    console.log('🔍 Starting opportunity scan...');
    const opportunities: any[] = [];

    // 1. Detect underutilized tables (no activity in 48 hours)
    const { data: tables } = await supabase
      .from('system_architecture_knowledge')
      .select('*')
      .eq('component_type', 'table');

    if (tables) {
      for (const table of tables.slice(0, 10)) { // Sample check
        const tableName = table.component_name;
        
        // Check for recent activity
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (count === 0) {
          opportunities.push({
            opportunity_type: 'data_pattern',
            title: `Low activity detected on ${tableName}`,
            description: `No new records in ${tableName} for 48+ hours. Consider investigating or archiving.`,
            priority: 4,
            actionable: false,
            action_taken: 'pending'
          });
        }
      }
    }

    // 2. Detect slow-running tasks
    const { data: slowTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'in_progress')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (slowTasks && slowTasks.length > 0) {
      opportunities.push({
        opportunity_type: 'performance',
        title: `${slowTasks.length} tasks running over 24 hours`,
        description: `Tasks may be stuck or need optimization: ${slowTasks.map((t: any) => t.title).slice(0, 3).join(', ')}`,
        priority: 7,
        actionable: true,
        action_taken: 'pending'
      });
    }

    // 3. Detect error patterns in logs
    const { data: recentErrors } = await supabase
      .from('eliza_activity_log')
      .select('*')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(10);

    if (recentErrors && recentErrors.length >= 3) {
      opportunities.push({
        opportunity_type: 'bug_fix',
        title: `${recentErrors.length} errors in past hour`,
        description: `Error spike detected. Recent failures: ${recentErrors.map((e: any) => e.activity_type).slice(0, 3).join(', ')}`,
        priority: 9,
        actionable: true,
        action_taken: 'pending'
      });
    }

    // 4. Detect integration gaps - look for unused edge functions
    const { data: functions } = await supabase
      .from('system_architecture_knowledge')
      .select('*')
      .eq('component_type', 'function');

    // Check activity log for function usage
    if (functions) {
      for (const func of functions.slice(0, 5)) {
        const { data: usageLogs } = await supabase
          .from('eliza_activity_log')
          .select('id')
          .ilike('description', `%${func.component_name}%`)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!usageLogs || usageLogs.length === 0) {
          opportunities.push({
            opportunity_type: 'optimization',
            title: `Unused function: ${func.component_name}`,
            description: `Edge function ${func.component_name} has not been called in 7 days. Consider deprecation or promotion.`,
            priority: 3,
            actionable: false,
            action_taken: 'pending'
          });
        }
      }
    }

    // 5. Detect high-potential improvements from work patterns
    const { data: successPatterns } = await supabase
      .from('eliza_work_patterns')
      .select('*')
      .eq('outcome', 'success')
      .gte('confidence_score', 0.8)
      .order('times_applied', { ascending: false })
      .limit(3);

    if (successPatterns && successPatterns.length > 0) {
      for (const pattern of successPatterns) {
        opportunities.push({
          opportunity_type: 'optimization',
          title: `Replicate successful pattern: ${pattern.pattern_type}`,
          description: `Pattern applied ${pattern.times_applied} times successfully. Consider automating: ${pattern.lesson_learned?.substring(0, 100)}`,
          priority: 6,
          actionable: true,
          action_taken: 'pending'
        });
      }
    }

    // Insert opportunities into log
    if (opportunities.length > 0) {
      const { error: insertError } = await supabase
        .from('opportunity_log')
        .insert(opportunities);

      if (insertError) {
        console.error('Error inserting opportunities:', insertError);
      } else {
        console.log(`✅ Logged ${opportunities.length} opportunities`);
      }
    }

    // Update performance metrics
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('eliza_performance_metrics').upsert({
      metric_date: today,
      opportunities_discovered: opportunities.length
    }, { onConflict: 'metric_date' });

    return new Response(JSON.stringify({
      success: true,
      opportunities_found: opportunities.length,
      high_priority: opportunities.filter(o => o.priority >= 7).length,
      actionable: opportunities.filter(o => o.actionable).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Opportunity scanner error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateDailyReport(supabase: any) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const { data: opportunities } = await supabase
    .from('opportunity_log')
    .select('*')
    .gte('created_at', yesterday.toISOString())
    .order('priority', { ascending: false });

  const report = {
    date: new Date().toISOString().split('T')[0],
    total_opportunities: opportunities?.length || 0,
    by_type: {},
    high_priority: opportunities?.filter((o: any) => o.priority >= 7).length || 0,
    actioned: opportunities?.filter((o: any) => o.action_taken !== 'pending').length || 0
  };

  // Log report to activity log
  await supabase.from('eliza_activity_log').insert({
    activity_type: 'daily_opportunity_report',
    title: `Daily Opportunity Report - ${report.date}`,
    description: `Found ${report.total_opportunities} opportunities, ${report.high_priority} high priority, ${report.actioned} actioned`,
    metadata: report,
    status: 'completed'
  });

  return new Response(JSON.stringify(report), {
    headers: { 'Content-Type': 'application/json' }
  });
}
