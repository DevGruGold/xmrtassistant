import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Workflow, User, Clock, CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  stage: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
}

interface Agent {
  id: string;
  name: string;
  status: 'IDLE' | 'BUSY' | 'OFFLINE';
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
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase.functions.invoke('agent-manager', {
        body: { action: 'list_tasks' }
      });

      if (!tasksError && tasksData?.tasks) {
        setTasks(tasksData.tasks);
      }

      // Fetch agents
      const { data: agentsData, error: agentsError } = await supabase.functions.invoke('agent-manager', {
        body: { action: 'list_agents' }
      });

      if (!agentsError && agentsData?.agents) {
        setAgents(agentsData.agents);
      }
    } catch (error) {
      console.error('Error fetching task data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up real-time subscriptions for tasks and agents
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('📋 Task change detected:', payload);
          fetchData(); // Refetch to get complete data
        }
      )
      .subscribe();

    const agentsChannel = supabase
      .channel('agents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents'
        },
        (payload) => {
          console.log('🤖 Agent change detected:', payload);
          fetchData(); // Refetch to get complete data
        }
      )
      .subscribe();
    
    // Also poll every 10 seconds as backup
    const interval = setInterval(fetchData, 10000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(agentsChannel);
    };
  }, []);

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown Agent';
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
                const StatusIcon = STATUS_CONFIG[task.status].icon;
                const statusColor = STATUS_CONFIG[task.status].color;
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
                          {STATUS_CONFIG[task.status].label}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {task.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {getAgentName(task.assigned_to)}
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
