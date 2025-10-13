import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...payload } = await req.json();

    console.log(`📊 Device Metrics Aggregator - Action: ${action}`);

    let result;

    switch (action) {
      case 'aggregate':
        result = await aggregateMetrics(supabase, payload);
        break;
      case 'metrics':
        result = await getMetrics(supabase, payload);
        break;
      case 'hourly':
        result = await getHourlyMetrics(supabase, payload);
        break;
      case 'daily':
        result = await getDailyMetrics(supabase, payload);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Metrics Aggregation Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function aggregateMetrics(supabase: any, payload: any) {
  const { date, hour } = payload;
  
  const summary_date = date || new Date().toISOString().split('T')[0];
  const summary_hour = hour !== undefined ? hour : null;

  console.log(`📊 Aggregating metrics for ${summary_date}${summary_hour !== null ? ` hour ${summary_hour}` : ''}`);

  // Build time filters
  let start_time, end_time;
  if (summary_hour !== null) {
    // Hourly aggregation
    start_time = `${summary_date}T${String(summary_hour).padStart(2, '0')}:00:00Z`;
    end_time = `${summary_date}T${String(summary_hour).padStart(2, '0')}:59:59Z`;
  } else {
    // Daily aggregation
    start_time = `${summary_date}T00:00:00Z`;
    end_time = `${summary_date}T23:59:59Z`;
  }

  // Active devices count
  const { count: active_devices_count } = await supabase
    .from('device_connection_sessions')
    .select('device_id', { count: 'exact', head: true })
    .eq('is_active', true)
    .gte('connected_at', start_time)
    .lte('connected_at', end_time);

  // Total connections
  const { count: total_connections } = await supabase
    .from('device_connection_sessions')
    .select('*', { count: 'exact', head: true })
    .gte('connected_at', start_time)
    .lte('connected_at', end_time);

  // Session stats
  const { data: sessionStats } = await supabase
    .from('device_connection_sessions')
    .select('total_duration_seconds')
    .gte('connected_at', start_time)
    .lte('connected_at', end_time);

  const avg_session_duration = sessionStats && sessionStats.length > 0
    ? Math.floor(sessionStats.reduce((sum: number, s: any) => sum + (s.total_duration_seconds || 0), 0) / sessionStats.length)
    : 0;

  // PoP points earned
  const { data: popStats } = await supabase
    .from('pop_events_ledger')
    .select('pop_points')
    .gte('event_timestamp', start_time)
    .lte('event_timestamp', end_time);

  const total_pop_points_earned = popStats?.reduce((sum: number, p: any) => sum + (p.pop_points || 0), 0) || 0;

  // Anomalies detected
  const { count: total_anomalies_detected } = await supabase
    .from('device_activity_log')
    .select('*', { count: 'exact', head: true })
    .eq('is_anomaly', true)
    .gte('activity_timestamp', start_time)
    .lte('activity_timestamp', end_time);

  // Commands stats
  const { count: total_commands_issued } = await supabase
    .from('engagement_commands')
    .select('*', { count: 'exact', head: true })
    .gte('issued_at', start_time)
    .lte('issued_at', end_time);

  const { count: total_commands_executed } = await supabase
    .from('engagement_commands')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('issued_at', start_time)
    .lte('issued_at', end_time);

  // Top devices by activity
  const { data: topDevices } = await supabase
    .from('device_activity_log')
    .select('device_id')
    .gte('activity_timestamp', start_time)
    .lte('activity_timestamp', end_time)
    .limit(1000);

  const deviceCounts: Record<string, number> = {};
  topDevices?.forEach((d: any) => {
    deviceCounts[d.device_id] = (deviceCounts[d.device_id] || 0) + 1;
  });
  const top_device_ids = Object.entries(deviceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id]) => id);

  // Top event types
  const { data: events } = await supabase
    .from('device_activity_log')
    .select('activity_type')
    .gte('activity_timestamp', start_time)
    .lte('activity_timestamp', end_time)
    .limit(1000);

  const eventCounts: Record<string, number> = {};
  events?.forEach((e: any) => {
    eventCounts[e.activity_type] = (eventCounts[e.activity_type] || 0) + 1;
  });
  const top_event_types = Object.entries(eventCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([type]) => type);

  // Upsert summary
  const { data: summary, error } = await supabase
    .from('device_metrics_summary')
    .upsert({
      summary_date,
      summary_hour,
      active_devices_count: active_devices_count || 0,
      total_connections: total_connections || 0,
      avg_session_duration_seconds: avg_session_duration,
      total_pop_points_earned,
      total_anomalies_detected: total_anomalies_detected || 0,
      total_commands_issued: total_commands_issued || 0,
      total_commands_executed: total_commands_executed || 0,
      top_device_ids,
      top_event_types,
      aggregated_at: new Date().toISOString()
    }, {
      onConflict: summary_hour !== null ? 'summary_date,summary_hour' : 'summary_date'
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`✅ Metrics aggregated successfully`);

  return {
    success: true,
    summary_date,
    summary_hour,
    metrics: summary
  };
}

async function getMetrics(supabase: any, payload: any) {
  const { timeframe = 'daily', start_date, end_date } = payload;

  let query = supabase
    .from('device_metrics_summary')
    .select('*')
    .order('summary_date', { ascending: false });

  if (timeframe === 'hourly') {
    query = query.not('summary_hour', 'is', null);
  } else {
    query = query.is('summary_hour', null);
  }

  if (start_date) {
    query = query.gte('summary_date', start_date);
  }

  if (end_date) {
    query = query.lte('summary_date', end_date);
  }

  query = query.limit(100);

  const { data: metrics, error } = await query;

  if (error) throw error;

  return {
    success: true,
    timeframe,
    metrics: metrics || [],
    count: metrics?.length || 0
  };
}

async function getHourlyMetrics(supabase: any, payload: any) {
  const { date } = payload;

  const { data: metrics, error } = await supabase
    .from('device_metrics_summary')
    .select('*')
    .eq('summary_date', date)
    .not('summary_hour', 'is', null)
    .order('summary_hour', { ascending: true });

  if (error) throw error;

  return {
    success: true,
    date,
    hourly_metrics: metrics || [],
    count: metrics?.length || 0
  };
}

async function getDailyMetrics(supabase: any, payload: any) {
  const { start_date, end_date } = payload;

  let query = supabase
    .from('device_metrics_summary')
    .select('*')
    .is('summary_hour', null)
    .order('summary_date', { ascending: false });

  if (start_date) {
    query = query.gte('summary_date', start_date);
  }

  if (end_date) {
    query = query.lte('summary_date', end_date);
  }

  const { data: metrics, error } = await query;

  if (error) throw error;

  return {
    success: true,
    start_date,
    end_date,
    daily_metrics: metrics || [],
    count: metrics?.length || 0
  };
}
