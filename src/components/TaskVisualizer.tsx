import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Workflow, User, Clock, CheckCircle2, AlertCircle, Circle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  stage: string;
  assignee_agent_id: string;
  created_at: string;
  updated_at: string;
}

interface Agent {
  id: string;
  name: string;
  status: string;
}

interface ElizaActivity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: any;
  status: string;
  created_at: string;
}

const STAGE_COLORS = {
  planning: 'bg-blue-500',
  research: 'bg-purple-500',
  implementation: 'bg-yellow-500',
  testing: 'bg-orange-500',
  review: 'bg-indigo-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500'
};

const STATUS_CONFIG = {
  PENDING: { color: 'bg-yellow-500', icon: Circle, label: 'Pending' },
  IN_PROGRESS: { color: 'bg-blue-500', icon: Clock, label: 'In Progress' },
  COMPLETED: { color: 'bg-green-500', icon: CheckCircle2, label: 'Completed' },
  FAILED: { color: 'bg-red-500', icon: AlertCircle, label: 'Failed' }
};

export const TaskVisualizer = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<ElizaActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch activity log
      const { data: activityData, error: activityError } = await supabase
        .from('eliza_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!activityError && activityData) {
        // Deduplicate activities by ID
        const uniqueActivities = activityData.reduce((acc, activity) => {
          if (!acc.find(a => a.id === activity.id)) {
            acc.push(activity);
          }
          return acc;
        }, [] as ElizaActivity[]);
        setActivities(uniqueActivities);
      }

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (!tasksError && tasksData) {
        // Deduplicate tasks by ID
        const uniqueTasks = tasksData.reduce((acc, task) => {
          if (!acc.find(t => t.id === task.id)) {
            acc.push(task);
          }
          return acc;
        }, [] as Task[]);
        setTasks(uniqueTasks);
      }

      // Fetch agents - deduplicate by ID
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false});

      if (!agentsError && agentsData) {
        // Remove duplicates by keeping only the latest entry for each agent ID
        const uniqueAgents = agentsData.reduce((acc, agent) => {
          if (!acc.find(a => a.id === agent.id)) {
            acc.push(agent);
          }
          return acc;
        }, [] as Agent[]);
        setAgents(uniqueAgents);
      }
    } catch (error) {
      console.error('Error fetching task data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up real-time subscriptions
    const activityChannel = supabase
      .channel('eliza-activity-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'eliza_activity_log'
        },
        (payload) => {
          console.log('📋 New activity from Eliza:', payload);
          const newActivity = payload.new as ElizaActivity;
          setActivities(prev => {
            // Check if this activity already exists
            if (prev.find(a => a.id === newActivity.id)) {
              return prev; // Already exists, don't add duplicate
            }
            // Add new activity and keep only the latest 50
            return [newActivity, ...prev].slice(0, 50);
          });
        }
      )
      .subscribe();

    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('📋 New task detected:', payload);
          const newTask = payload.new as Task;
          setTasks(prev => {
            if (prev.find(t => t.id === newTask.id)) {
              return prev;
            }
            return [newTask, ...prev].slice(0, 20);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('📋 Task updated:', payload);
          const updatedTask = payload.new as Task;
          setTasks(prev => 
            prev.map(t => t.id === updatedTask.id ? updatedTask : t)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('📋 Task deleted:', payload);
          setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      )
      .subscribe();

    const agentsChannel = supabase
      .channel('agents-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agents'
        },
        (payload) => {
          console.log('🤖 New agent detected:', payload);
          const newAgent = payload.new as Agent;
          setAgents(prev => {
            if (prev.find(a => a.id === newAgent.id)) {
              return prev;
            }
            return [newAgent, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents'
        },
        (payload) => {
          console.log('🤖 Agent updated:', payload);
          const updatedAgent = payload.new as Agent;
          setAgents(prev => 
            prev.map(a => a.id === updatedAgent.id ? updatedAgent : a)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'agents'
        },
        (payload) => {
          console.log('🤖 Agent deleted:', payload);
          setAgents(prev => prev.filter(a => a.id !== payload.old.id));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(agentsChannel);
    };
  }, []);

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || agentId || 'Eliza';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'python_execution': return '🐍';
      case 'task_created': return '📋';
      case 'task_updated': return '✏️';
      case 'agent_spawned': return '🤖';
      case 'github_action': return '📦';
      default: return '✨';
    }
  };

  const getStageColor = (stage: string) => {
    return STAGE_COLORS[stage.toLowerCase() as keyof typeof STAGE_COLORS] || 'bg-gray-500';
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Workflow className="h-5 w-5 text-primary" />
          Task Pipeline Visualizer
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Eliza's Activity Stream */}
        <div className="mb-4 p-3 rounded-lg bg-secondary/30">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Eliza's Recent Activity ({activities.length})
          </h3>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Waiting for Eliza's autonomous activity...</p>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-2 rounded-md bg-card/50 border border-border flex items-start gap-2 text-sm"
                  >
                    <span className="text-lg">{getActivityIcon(activity.activity_type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{activity.title}</div>
                      {activity.description && (
                        <div className="text-xs text-muted-foreground truncate">{activity.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge
                      variant={activity.status === 'completed' ? 'default' : activity.status === 'failed' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {activity.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Active Agents */}
        <div className="mb-4 p-3 rounded-lg bg-secondary/30">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <User className="h-4 w-4" />
            Active Agents ({agents.filter(a => a.status !== 'OFFLINE').length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {agents.map((agent) => (
              <Badge
                key={agent.id}
                variant={agent.status === 'IDLE' ? 'outline' : 'default'}
                className={
                  agent.status === 'BUSY'
                    ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300'
                    : agent.status === 'IDLE'
                    ? 'border-primary/50'
                    : 'opacity-50'
                }
              >
                {agent.name}
                <span className="ml-1 text-xs">({agent.status.toLowerCase()})</span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Task Pipeline */}
        <ScrollArea className="h-[400px] rounded-md border bg-secondary/30 p-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading task pipeline...
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No active tasks. Eliza is standing by...
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
                const StatusIcon = statusConfig.icon;
                const statusColor = statusConfig.color;
                const stageColor = getStageColor(task.stage);

                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${statusColor.replace('bg-', 'text-')}`} />
                        <h4 className="font-medium">{task.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${stageColor} text-white border-0`}>
                          {task.stage}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {task.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {getAgentName(task.assignee_agent_id)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(task.updated_at).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusColor} transition-all duration-500`}
                        style={{
                          width: task.status === 'COMPLETED' ? '100%' : 
                                 task.status === 'IN_PROGRESS' ? '60%' :
                                 task.status === 'FAILED' ? '100%' : '20%'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
