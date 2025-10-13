import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whitelist of tables Python can access
const ALLOWED_TABLES = [
  'devices',
  'device_activity_log',
  'device_connection_sessions',
  'dao_members',
  'eliza_activity_log',
  'eliza_python_executions',
  'chat_messages',
  'conversation_sessions',
  'conversation_messages',
  'knowledge_entities',
  'entity_relationships',
  'memory_contexts',
  'github_contributions',
  'github_contributors',
  'battery_sessions',
  'battery_readings',
  'charging_sessions',
  'activity_feed',
  'frontend_events',
  'agent_performance_metrics',
  'autonomous_actions_log',
  'api_call_logs',
  'webhook_logs'
];

const ALLOWED_OPERATIONS = ['select', 'insert', 'update', 'count', 'upsert'];

interface DBOperation {
  table: string;
  operation: string;
  filters?: Record<string, any>;
  data?: any;
  limit?: number;
  order?: { column: string; ascending?: boolean };
  columns?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { table, operation, filters, data, limit, order, columns }: DBOperation = await req.json();

    console.log(`🗄️ Python DB Bridge: ${operation} on ${table}`);

    // Validate table
    if (!ALLOWED_TABLES.includes(table)) {
      throw new Error(`Table '${table}' not allowed. Allowed tables: ${ALLOWED_TABLES.join(', ')}`);
    }

    // Validate operation
    if (!ALLOWED_OPERATIONS.includes(operation)) {
      throw new Error(`Operation '${operation}' not allowed. Allowed: ${ALLOWED_OPERATIONS.join(', ')}`);
    }

    // Build query
    let query: any = supabase.from(table);

    switch(operation) {
      case 'select': {
        query = query.select(columns || '*');
        
        // Apply filters
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              // Handle operators like {gt: 10}, {gte: 5}, etc.
              Object.entries(value).forEach(([op, opValue]) => {
                if (op === 'gt') query = query.gt(key, opValue);
                else if (op === 'gte') query = query.gte(key, opValue);
                else if (op === 'lt') query = query.lt(key, opValue);
                else if (op === 'lte') query = query.lte(key, opValue);
                else if (op === 'neq') query = query.neq(key, opValue);
                else if (op === 'in') query = query.in(key, opValue);
                else if (op === 'like') query = query.like(key, opValue);
                else if (op === 'ilike') query = query.ilike(key, opValue);
              });
            } else {
              query = query.eq(key, value);
            }
          });
        }
        
        if (limit) query = query.limit(limit);
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? true });
        }
        break;
      }
      
      case 'insert': {
        if (!data || !data.rows) {
          throw new Error('Insert operation requires data.rows');
        }
        query = query.insert(data.rows).select();
        break;
      }
      
      case 'update': {
        if (!data || !data.values) {
          throw new Error('Update operation requires data.values');
        }
        if (!filters || Object.keys(filters).length === 0) {
          throw new Error('Update operation requires filters to prevent accidental mass updates');
        }
        
        query = query.update(data.values);
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        query = query.select();
        break;
      }

      case 'upsert': {
        if (!data || !data.rows) {
          throw new Error('Upsert operation requires data.rows');
        }
        query = query.upsert(data.rows).select();
        break;
      }
      
      case 'count': {
        query = query.select('*', { count: 'exact', head: true });
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        break;
      }
    }

    // Execute query
    const result = await query;

    if (result.error) {
      console.error('❌ Database error:', result.error);
      throw result.error;
    }

    console.log(`✅ DB operation successful: ${operation} ${table}`);

    return new Response(JSON.stringify({
      success: true,
      data: result.data,
      count: result.count,
      operation,
      table
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ DB Bridge error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      hint: error.hint || null,
      details: error.details || null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
