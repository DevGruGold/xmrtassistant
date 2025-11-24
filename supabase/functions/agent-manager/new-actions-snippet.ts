// ✅ NEW ACTIONS TO ADD TO AGENT-MANAGER (Insert before the 'default' case at line 846)

case 'get_agent_by_name':
  if (!data || !data.name) {
    throw new Error('Missing required field: name');
  }
  const { data: agentByName, error: getByNameError } = await supabase
    .from('agents')
    .select('*')
    .ilike('name', data.name)
    .maybeSingle();
  
  if (getByNameError) throw getByNameError;
  result = agentByName || { success: false, message: `No agent found with name: ${data.name}` };
  break;

case 'get_agent_stats':
  if (!data || !data.agent_id) {
    throw new Error('Missing required field: agent_id');
  }
  const { data: statsData, error: statsError } = await supabase.rpc('calculate_agent_performance', {
    p_agent_id: data.agent_id,
    p_time_window_days: data.time_window_days || 7
  });
  
  if (statsError) throw statsError;
  result = { success: true, stats: statsData };
  break;

case 'batch_spawn_agents':
  if (!data || !data.agents || !Array.isArray(data.agents)) {
    throw new Error('Missing or invalid agents array');
  }
  const spawnedAgents = [];
  const spawnErrors = [];
  
  for (const agentConfig of data.agents) {
    try {
      const { data: batchAgent, error: batchError } = await supabase
        .from('agents')
        .insert({
          id: agentConfig.id || `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: agentConfig.name,
          role: agentConfig.role,
          status: 'IDLE',
          skills: agentConfig.skills || [],
          metadata: {
            spawned_by: data.spawned_by || 'batch_operation',
            spawn_reason: agentConfig.spawn_reason || 'Batch spawn',
            created_at: new Date().toISOString()
          }
        })
        .select()
        .single();
      
      if (batchError) {
        spawnErrors.push({ name: agentConfig.name, error: batchError.message });
      } else {
        spawnedAgents.push(batchAgent);
      }
    } catch (err) {
      spawnErrors.push({ name: agentConfig.name, error: err.message });
    }
  }
  
  result = {
    success: true,
    spawned: spawnedAgents.length,
    failed: spawnErrors.length,
    agents: spawnedAgents,
    errors: spawnErrors
  };
  break;

case 'archive_agent':
  if (!data || !data.agent_id) {
    throw new Error('Missing required field: agent_id');
  }
  const { data: archivedAgent, error: archiveError } = await supabase
    .from('agents')
    .update({
      status: 'ARCHIVED',
      archived_at: new Date().toISOString(),
      archived_reason: data.reason || 'No reason provided'
    })
    .eq('id', data.agent_id)
    .select()
    .single();
  
  if (archiveError) throw archiveError;
  result = { success: true, agent: archivedAgent };
  break;
