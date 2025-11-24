-- =====================================================
-- Agent Manager & GitHub Integration Enhancements
-- Database Schema for Advanced Features
-- =====================================================

-- 1. Drop existing index if exists, then create Agent Performance Metrics Table
DROP INDEX IF EXISTS idx_agent_perf_date;

CREATE TABLE IF NOT EXISTS agent_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  avg_task_duration_ms INTEGER,
  success_rate NUMERIC(5,2),
  skill_utilization JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_perf_agent_id ON agent_performance_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_perf_recorded ON agent_performance_metrics(recorded_at);

-- 2. GitHub API Usage Tracking Table
CREATE TABLE IF NOT EXISTS github_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  repo TEXT,
  credential_type TEXT, -- 'oauth', 'pat', 'backend'
  rate_limit_remaining INTEGER,
  rate_limit_reset TIMESTAMPTZ,
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  success BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_usage_action ON github_api_usage(action);
CREATE INDEX IF NOT EXISTS idx_github_usage_created ON github_api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_github_usage_success ON github_api_usage(success);

-- 3. Agent Capacity and Metadata Enhancements
ALTER TABLE agents 
  ADD COLUMN IF NOT EXISTS max_concurrent_tasks INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS current_workload INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spawned_by TEXT DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS spawn_reason TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_reason TEXT,
  ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0';

-- 4. Enhanced Task Tracking
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS required_skills JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS estimated_duration_hours NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS actual_duration_hours NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- 5. Calculate Agent Performance Function
CREATE OR REPLACE FUNCTION calculate_agent_performance(
  p_agent_id TEXT,
  p_time_window_days INTEGER DEFAULT 7
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'success_rate', ROUND(COALESCE(AVG(CASE WHEN status = 'COMPLETED' THEN 100.0 ELSE 0.0 END), 0), 2),
    'total_tasks', COUNT(*),
    'completed_tasks', COUNT(*) FILTER (WHERE status = 'COMPLETED'),
    'failed_tasks', COUNT(*) FILTER (WHERE status = 'FAILED'),
    'blocked_tasks', COUNT(*) FILTER (WHERE status = 'BLOCKED'),
    'avg_duration_hours', ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600), 0), 2),
    'current_workload', (
      SELECT COUNT(*) 
      FROM tasks 
      WHERE assignee_agent_id = p_agent_id 
        AND status IN ('PENDING', 'IN_PROGRESS')
    )
  ) INTO v_result
  FROM tasks
  WHERE assignee_agent_id = p_agent_id
    AND created_at >= NOW() - (p_time_window_days || ' days')::INTERVAL;
    
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 6. Get Agent by Name Function
CREATE OR REPLACE FUNCTION get_agent_by_name(p_name TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  role agent_role,
  status agent_status,
  skills JSONB,
  metadata JSONB,
  max_concurrent_tasks INTEGER,
  current_workload INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.role,
    a.status,
    a.skills,
    a.metadata,
    a.max_concurrent_tasks,
    a.current_workload,
    a.created_at
  FROM agents a
  WHERE LOWER(a.name) = LOWER(p_name)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 7. Agent Skill Matching Function
CREATE OR REPLACE FUNCTION find_agents_with_skills(p_required_skills JSONB)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  role agent_role,
  matching_skills JSONB,
  skill_match_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.role,
    a.skills,
    (
      SELECT COUNT(*)::NUMERIC / GREATEST(jsonb_array_length(p_required_skills), 1)
      FROM jsonb_array_elements_text(p_required_skills) AS required_skill
      WHERE a.skills @> jsonb_build_array(required_skill)
    ) AS skill_match_score
  FROM agents a
  WHERE a.status != 'ARCHIVED'
    AND a.skills ?| ARRAY(SELECT jsonb_array_elements_text(p_required_skills))
  ORDER BY skill_match_score DESC;
END;
$$ LANGUAGE plpgsql;

-- 8. Batch Spawn Agents Function  
CREATE OR REPLACE FUNCTION batch_spawn_agents(p_agents JSONB)
RETURNS JSON AS $$
DECLARE
  v_agent JSONB;
  v_result JSON;
  v_spawned INTEGER := 0;
  v_failed INTEGER := 0;
  v_agent_ids TEXT[] := '{}';
BEGIN
  FOR v_agent IN SELECT jsonb_array_elements(p_agents)
  LOOP
    BEGIN
      INSERT INTO agents (
        id, name, role, status, skills, metadata, spawned_by, spawn_reason
      ) VALUES (
        COALESCE(v_agent->>'id', 'agent-' || gen_random_uuid()),
        v_agent->>'name',
        (v_agent->>'role')::agent_role,
        'IDLE',
        COALESCE(v_agent->'skills', '[]'::JSONB),
        COALESCE(v_agent->'metadata', '{}'::JSONB),
        COALESCE(v_agent->>'spawned_by', 'system'),
        v_agent->>'spawn_reason'
      );
      
      v_spawned := v_spawned + 1;
      v_agent_ids := array_append(v_agent_ids, v_agent->>'id');
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
    END;
  END LOOP;
  
  SELECT json_build_object(
    'spawned', v_spawned,
    'failed', v_failed,
    'agent_ids', v_agent_ids
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 9. GitHub Rate Limit Tracking Function
CREATE OR REPLACE FUNCTION log_github_api_call(
  p_action TEXT,
  p_repo TEXT,
  p_credential_type TEXT,
  p_response_time_ms INTEGER,
  p_status_code INTEGER,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_rate_limit_remaining INTEGER DEFAULT NULL,
  p_rate_limit_reset TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO github_api_usage (
    action, repo, credential_type, response_time_ms, status_code,
    success, error_message, rate_limit_remaining, rate_limit_reset
  ) VALUES (
    p_action, p_repo, p_credential_type, p_response_time_ms, p_status_code,
    p_success, p_error_message, p_rate_limit_remaining, p_rate_limit_reset
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;