import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params = {}, allow_modifications = false } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`🔍 Schema Manager - Action: ${action}, Allow Modifications: ${allow_modifications}`);

    let result;

    switch (action) {
      case 'view_schema': {
        // Get all tables with their columns
        const { data: tables, error } = await supabase.rpc('get_schema_info' as any, {});
        
        if (error) {
          // Fallback to manual query
          const { data: tablesData, error: tablesError } = await supabase
            .from('information_schema.tables' as any)
            .select('table_name, table_type')
            .eq('table_schema', 'public');

          if (tablesError) throw tablesError;

          result = {
            tables: tablesData || [],
            message: 'Schema overview retrieved (limited info - consider creating get_schema_info RPC)'
          };
        } else {
          result = { tables: tables || [] };
        }
        break;
      }

      case 'view_table_details': {
        const { table_name } = params;
        if (!table_name) throw new Error('table_name required');

        // Get columns
        const columnsQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position;
        `;

        // Get indexes
        const indexesQuery = `
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE schemaname = 'public' AND tablename = $1;
        `;

        // Get constraints
        const constraintsQuery = `
          SELECT constraint_name, constraint_type
          FROM information_schema.table_constraints
          WHERE table_schema = 'public' AND table_name = $1;
        `;

        const [columnsRes, indexesRes, constraintsRes] = await Promise.all([
          supabase.rpc('exec_sql' as any, { query: columnsQuery, params: [table_name] }).catch(() => ({ data: null })),
          supabase.rpc('exec_sql' as any, { query: indexesQuery, params: [table_name] }).catch(() => ({ data: null })),
          supabase.rpc('exec_sql' as any, { query: constraintsQuery, params: [table_name] }).catch(() => ({ data: null }))
        ]);

        result = {
          table: table_name,
          columns: columnsRes.data || 'Use SQL Editor to query information_schema.columns',
          indexes: indexesRes.data || 'Use SQL Editor to query pg_indexes',
          constraints: constraintsRes.data || 'Use SQL Editor to query information_schema.table_constraints',
          message: 'For full details, use SQL Editor at Supabase Dashboard'
        };
        break;
      }

      case 'analyze_performance': {
        const performanceQuery = `
          SELECT 
            schemaname,
            tablename,
            seq_scan,
            seq_tup_read,
            idx_scan,
            idx_tup_fetch,
            n_tup_ins,
            n_tup_upd,
            n_tup_del,
            n_live_tup,
            n_dead_tup,
            last_vacuum,
            last_autovacuum,
            last_analyze,
            last_autoanalyze
          FROM pg_stat_user_tables
          WHERE schemaname = 'public'
          ORDER BY seq_scan DESC, idx_scan DESC
          LIMIT 20;
        `;

        result = {
          message: 'Performance stats available via SQL Editor',
          query: performanceQuery,
          recommendation: 'Run this query in SQL Editor for detailed performance metrics'
        };
        break;
      }

      case 'view_table_sizes': {
        const sizesQuery = `
          SELECT 
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
            pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
        `;

        result = {
          message: 'Table sizes available via SQL Editor',
          query: sizesQuery,
          recommendation: 'Run this query in SQL Editor for storage usage details'
        };
        break;
      }

      case 'suggest_optimizations': {
        // Analyze common issues
        const { table_name } = params;
        
        const suggestions = [];

        // Check for missing indexes on foreign keys
        suggestions.push({
          type: 'index_analysis',
          recommendation: 'Check pg_stat_user_tables for tables with high seq_scan and low idx_scan',
          action: 'Consider adding indexes on frequently queried columns'
        });

        // Check for bloat
        suggestions.push({
          type: 'vacuum_analysis',
          recommendation: 'Run VACUUM ANALYZE on tables with high n_dead_tup',
          action: 'Use view_table_details to check last vacuum times'
        });

        // Check RLS policies
        suggestions.push({
          type: 'security_analysis',
          recommendation: 'Ensure all tables have appropriate RLS policies',
          action: 'Review policies in Supabase Dashboard'
        });

        result = {
          suggestions,
          message: 'Optimization suggestions generated. Use SQL Editor for detailed analysis.'
        };
        break;
      }

      case 'create_index': {
        if (!allow_modifications) {
          throw new Error('Modifications not allowed. Set allow_modifications: true');
        }

        const { table_name, column_name, index_name, index_type = 'btree' } = params;
        if (!table_name || !column_name) {
          throw new Error('table_name and column_name required');
        }

        const indexNameGenerated = index_name || `idx_${table_name}_${column_name}`;
        const createIndexSQL = `CREATE INDEX IF NOT EXISTS ${indexNameGenerated} ON public.${table_name} USING ${index_type} (${column_name});`;

        result = {
          message: 'Index creation requires manual execution',
          sql: createIndexSQL,
          recommendation: 'Run this SQL in the SQL Editor or create a migration'
        };
        break;
      }

      case 'vacuum_analyze': {
        if (!allow_modifications) {
          throw new Error('Modifications not allowed. Set allow_modifications: true');
        }

        const { table_name } = params;
        if (!table_name) throw new Error('table_name required');

        const vacuumSQL = `VACUUM ANALYZE public.${table_name};`;

        result = {
          message: 'VACUUM ANALYZE requires manual execution',
          sql: vacuumSQL,
          recommendation: 'Run this SQL in the SQL Editor with appropriate privileges'
        };
        break;
      }

      case 'audit_migrations': {
        // Check if schema_migrations table exists
        const { data: migrations, error } = await supabase
          .from('schema_migrations' as any)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          result = {
            message: 'Migration history not available in standard table',
            recommendation: 'Check supabase/migrations folder for migration files',
            error: error.message
          };
        } else {
          result = {
            migrations: migrations || [],
            count: migrations?.length || 0
          };
        }
        break;
      }

      case 'list_tables': {
        const { data: tables } = await supabase
          .rpc('get_tables_list' as any, {})
          .catch(() => ({ data: null }));

        if (!tables) {
          // Fallback: list known tables from our schema
          const knownTables = [
            'agents', 'tasks', 'decisions', 'repos',
            'conversation_sessions', 'conversation_messages', 'conversation_summaries',
            'memory_contexts', 'learning_patterns', 'knowledge_entities',
            'interaction_patterns', 'user_preferences', 'scheduled_actions',
            'webhook_logs', 'eliza_activity_log', 'eliza_python_executions',
            'skill_gap_analysis', 'learning_sessions', 'agent_specializations',
            'workload_forecasts', 'predictive_insights', 'scenario_simulations',
            'nlg_generated_content', 'community_messages', 'community_responses',
            'workflow_executions', 'workflow_steps', 'task_executions',
            'api_key_health', 'manus_token_usage', 'faucet_claims', 'faucet_config',
            'worker_registrations', 'user_worker_mappings', 'chat_sessions', 'chat_messages'
          ];

          result = {
            tables: knownTables,
            message: 'Known tables list (may not be complete)',
            recommendation: 'Use view_schema for comprehensive schema info'
          };
        } else {
          result = { tables };
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}. Available: view_schema, view_table_details, analyze_performance, suggest_optimizations, create_index, vacuum_analyze, audit_migrations, view_table_sizes, list_tables`);
    }

    // Log to activity log
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'schema_management',
      title: `Schema Manager: ${action}`,
      description: `Action: ${action}, Params: ${JSON.stringify(params)}`,
      status: 'completed',
      metadata: { action, params, allow_modifications, result_summary: typeof result === 'object' ? Object.keys(result) : 'success' }
    });

    return new Response(
      JSON.stringify({ success: true, action, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Schema Manager error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        recommendation: 'Most schema operations require SQL Editor access. Use this function for read-only analysis and SQL generation.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
