/**
 * SuperDuper Agent System - Comprehensive Test Suite
 * 
 * Tests:
 * 1. Database schema validation
 * 2. Agent registry integrity
 * 3. Router functionality
 * 4. Agent execution
 * 5. Logging and statistics
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://vawouugtzwmejxqkeqqj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yIaroctFhoYStx0f9XajBg_zhpuVulw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface TestResult {
  test_name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration_ms?: number;
  details?: any;
}

const results: TestResult[] = [];

function logTest(result: TestResult) {
  const emoji = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} ${result.test_name}: ${result.message}`);
  results.push(result);
}

async function test1_DatabaseSchema() {
  const startTime = Date.now();
  
  try {
    // Check if superduper_agents table exists
    const { data, error } = await supabase
      .from('superduper_agents')
      .select('count')
      .limit(1);
    
    if (error) {
      logTest({
        test_name: 'Database Schema',
        status: 'FAIL',
        message: `Table superduper_agents not found: ${error.message}`,
        duration_ms: Date.now() - startTime
      });
      return false;
    }
    
    logTest({
      test_name: 'Database Schema',
      status: 'PASS',
      message: 'superduper_agents table exists',
      duration_ms: Date.now() - startTime
    });
    return true;
    
  } catch (error: any) {
    logTest({
      test_name: 'Database Schema',
      status: 'FAIL',
      message: error.message,
      duration_ms: Date.now() - startTime
    });
    return false;
  }
}

async function test2_AgentRegistry() {
  const startTime = Date.now();
  
  try {
    const { data: agents, error } = await supabase
      .from('superduper_agents')
      .select('*');
    
    if (error) {
      logTest({
        test_name: 'Agent Registry',
        status: 'FAIL',
        message: `Failed to fetch agents: ${error.message}`,
        duration_ms: Date.now() - startTime
      });
      return false;
    }
    
    const expectedCount = 10;
    if (!agents || agents.length !== expectedCount) {
      logTest({
        test_name: 'Agent Registry',
        status: 'FAIL',
        message: `Expected ${expectedCount} agents, found ${agents?.length || 0}`,
        duration_ms: Date.now() - startTime,
        details: agents
      });
      return false;
    }
    
    // Validate each agent has required fields
    const requiredFields = ['agent_name', 'display_name', 'description', 'edge_function_name', 'status'];
    for (const agent of agents) {
      for (const field of requiredFields) {
        if (!agent[field]) {
          logTest({
            test_name: 'Agent Registry',
            status: 'FAIL',
            message: `Agent ${agent.agent_name} missing required field: ${field}`,
            duration_ms: Date.now() - startTime
          });
          return false;
        }
      }
    }
    
    logTest({
      test_name: 'Agent Registry',
      status: 'PASS',
      message: `All ${expectedCount} agents properly registered with required fields`,
      duration_ms: Date.now() - startTime,
      details: agents.map(a => ({
        name: a.agent_name,
        status: a.status,
        priority: a.priority
      }))
    });
    return true;
    
  } catch (error: any) {
    logTest({
      test_name: 'Agent Registry',
      status: 'FAIL',
      message: error.message,
      duration_ms: Date.now() - startTime
    });
    return false;
  }
}

async function test3_RouterListAgents() {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('superduper-router', {
      body: {
        agent_name: 'any',
        action: 'list_agents',
        params: {}
      }
    });
    
    if (error) {
      logTest({
        test_name: 'Router - List Agents',
        status: 'FAIL',
        message: `Router invocation failed: ${error.message}`,
        duration_ms: Date.now() - startTime
      });
      return false;
    }
    
    if (!data.success) {
      logTest({
        test_name: 'Router - List Agents',
        status: 'FAIL',
        message: `Router returned error: ${data.error}`,
        duration_ms: Date.now() - startTime
      });
      return false;
    }
    
    logTest({
      test_name: 'Router - List Agents',
      status: 'PASS',
      message: `Router successfully returned ${data.total_count} agents (${data.active_count} active)`,
      duration_ms: Date.now() - startTime,
      details: {
        total: data.total_count,
        active: data.active_count,
        agents: data.agents.map((a: any) => a.agent_name)
      }
    });
    return true;
    
  } catch (error: any) {
    logTest({
      test_name: 'Router - List Agents',
      status: 'FAIL',
      message: error.message,
      duration_ms: Date.now() - startTime
    });
    return false;
  }
}

async function test4_RouterGetCapabilities() {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('superduper-router', {
      body: {
        agent_name: 'superduper-finance-investment',
        action: 'get_capabilities',
        params: {}
      }
    });
    
    if (error) {
      logTest({
        test_name: 'Router - Get Capabilities',
        status: 'FAIL',
        message: `Failed to get capabilities: ${error.message}`,
        duration_ms: Date.now() - startTime
      });
      return false;
    }
    
    if (!data.success) {
      logTest({
        test_name: 'Router - Get Capabilities',
        status: 'FAIL',
        message: `Router returned error: ${data.error}`,
        duration_ms: Date.now() - startTime
      });
      return false;
    }
    
    const agent = data.agent;
    logTest({
      test_name: 'Router - Get Capabilities',
      status: 'PASS',
      message: `Successfully retrieved capabilities for ${agent.name}`,
      duration_ms: Date.now() - startTime,
      details: {
        functions: agent.functions,
        capabilities: agent.capabilities,
        status: agent.status
      }
    });
    return true;
    
  } catch (error: any) {
    logTest({
      test_name: 'Router - Get Capabilities',
      status: 'FAIL',
      message: error.message,
      duration_ms: Date.now() - startTime
    });
    return false;
  }
}

async function test5_FinancialAgentExecution() {
  const startTime = Date.now();
  
  try {
    // Test calculateCompoundReturns function
    const { data, error } = await supabase.functions.invoke('superduper-router', {
      body: {
        agent_name: 'superduper-finance-investment',
        action: 'calculateCompoundReturns',
        params: {
          principal: 10000,
          rate_percent: 12,
          period_years: 5,
          compound_frequency: 'monthly',
          additional_contributions: 500,
          contribution_frequency: 'monthly'
        },
        triggered_by: 'test_suite'
      }
    });
    
    if (error) {
      logTest({
        test_name: 'Financial Agent Execution',
        status: 'FAIL',
        message: `Agent execution failed: ${error.message}`,
        duration_ms: Date.now() - startTime
      });
      return false;
    }
    
    if (!data.success) {
      logTest({
        test_name: 'Financial Agent Execution',
        status: 'FAIL',
        message: `Agent returned error: ${data.error}`,
        duration_ms: Date.now() - startTime
      });
      return false;
    }
    
    const result = data.result;
    logTest({
      test_name: 'Financial Agent Execution',
      status: 'PASS',
      message: `Compound returns calculated: $${result.final_value.toFixed(2)} final value with ${result.effective_apy}% APY`,
      duration_ms: Date.now() - startTime,
      details: {
        principal: result.principal,
        final_value: result.final_value,
        total_gains: result.total_gains,
        effective_apy: result.effective_apy,
        execution_time_ms: data.execution_time_ms
      }
    });
    return true;
    
  } catch (error: any) {
    logTest({
      test_name: 'Financial Agent Execution',
      status: 'FAIL',
      message: error.message,
      duration_ms: Date.now() - startTime
    });
    return false;
  }
}

async function test6_ExecutionLogging() {
  const startTime = Date.now();
  
  try {
    // Check if execution log was created
    const { data: logs, error } = await supabase
      .from('superduper_execution_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      logTest({
        test_name: 'Execution Logging',
        status: 'FAIL',
        message: `Failed to fetch execution logs: ${error.message}`,
        duration_ms: Date.now() - startTime
      });
      return false;
    }
    
    if (!logs || logs.length === 0) {
      logTest({
        test_name: 'Execution Logging',
        status: 'FAIL',
        message: 'No execution logs found',
        duration_ms: Date.now() - startTime
      });
      return false;
    }
    
    const latestLog = logs[0];
    logTest({
      test_name: 'Execution Logging',
      status: 'PASS',
      message: `Execution properly logged: ${latestLog.agent_name} - ${latestLog.action} (${latestLog.status})`,
      duration_ms: Date.now() - startTime,
      details: {
        agent: latestLog.agent_name,
        action: latestLog.action,
        status: latestLog.status,
        execution_time_ms: latestLog.execution_time_ms,
        triggered_by: latestLog.triggered_by
      }
    });
    return true;
    
  } catch (error: any) {
    logTest({
      test_name: 'Execution Logging',
      status: 'FAIL',
      message: error.message,
      duration_ms: Date.now() - startTime
    });
    return false;
  }
}

async function test7_AgentStatistics() {
  const startTime = Date.now();
  
  try {
    // Check if agent stats were updated
    const { data: stats, error } = await supabase
      .from('superduper_agent_stats')
      .select('*')
      .eq('agent_name', 'superduper-finance-investment')
      .single();
    
    if (error) {
      logTest({
        test_name: 'Agent Statistics',
        status: 'FAIL',
        message: `Failed to fetch agent stats: ${error.message}`,
        duration_ms: Date.now() - startTime
      });
      return false;
    }
    
    if (!stats) {
      logTest({
        test_name: 'Agent Statistics',
        status: 'FAIL',
        message: 'No stats found for financial agent',
        duration_ms: Date.now() - startTime
      });
      return false;
    }
    
    logTest({
      test_name: 'Agent Statistics',
      status: 'PASS',
      message: `Agent stats tracking: ${stats.execution_count} executions, ${stats.success_rate_percent}% success rate`,
      duration_ms: Date.now() - startTime,
      details: {
        agent: stats.display_name,
        executions: stats.execution_count,
        successes: stats.success_count,
        failures: stats.failure_count,
        success_rate: stats.success_rate_percent,
        avg_time_ms: stats.avg_execution_time_ms
      }
    });
    return true;
    
  } catch (error: any) {
    logTest({
      test_name: 'Agent Statistics',
      status: 'FAIL',
      message: error.message,
      duration_ms: Date.now() - startTime
    });
    return false;
  }
}

// ============================================
// RUN ALL TESTS
// ============================================

async function runAllTests() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   SuperDuper Agent System - Comprehensive Test Suite    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  console.log('🧪 Running tests...\n');
  
  await test1_DatabaseSchema();
  await test2_AgentRegistry();
  await test3_RouterListAgents();
  await test4_RouterGetCapabilities();
  await test5_FinancialAgentExecution();
  await test6_ExecutionLogging();
  await test7_AgentStatistics();
  
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                     TEST SUMMARY                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);
  
  if (failed > 0) {
    console.log('\n⚠️  FAILED TESTS:\n');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.test_name}: ${r.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  return failed === 0;
}

// Run tests
const success = await runAllTests();
Deno.exit(success ? 0 : 1);
