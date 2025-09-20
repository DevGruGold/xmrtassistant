import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Play,
  Pause,
  RotateCcw,
  Activity,
  GitBranch,
  Database,
  Globe,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { systemStatusService } from '@/services/systemStatusService';
import { autonomousTaskService } from '@/services/autonomousTaskService';

interface Task {
  id: string;
  title: string;
  description: string;
  task_type: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  metadata?: any;
  execution_data?: any;
}

interface TaskDashboardProps {
  sessionKey?: string;
  className?: string;
}

export function TaskDashboard({ sessionKey = 'default', className = '' }: TaskDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchSystemStatus();
    
    // Set up real-time subscriptions
    const taskSubscription = supabase
      .channel('task_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          console.log('Task update received:', payload);
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskSubscription);
    };
  }, [sessionKey]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('session_key', sessionKey)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const status = await systemStatusService.getSystemCapabilities();
      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchTasks(),
      systemStatusService.refreshStatus().then(() => fetchSystemStatus())
    ]);
    setRefreshing(false);
  };

  const getTaskIcon = (status: string, taskType: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'executing':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'github_operation':
        return <GitBranch className="w-4 h-4" />;
      case 'repository_analysis':
        return <Database className="w-4 h-4" />;
      case 'ecosystem_management':
        return <Globe className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'executing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'limited':
        return 'text-yellow-500';
      case 'offline':
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const calculateProgress = (task: Task): number => {
    switch (task.status) {
      case 'completed':
        return 100;
      case 'executing':
        return 65;
      case 'approved':
        return 30;
      case 'pending':
        return 10;
      default:
        return 0;
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const pendingTasks = tasks.filter(t => ['pending', 'approved'].includes(t.status));
  const activeTasks = tasks.filter(t => t.status === 'executing');
  const completedTasks = tasks.filter(t => ['completed', 'failed', 'cancelled'].includes(t.status));

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 animate-pulse" />
            Task Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Task Dashboard
            </CardTitle>
            <CardDescription>
              Monitor autonomous tasks and system capabilities
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshAll}
            disabled={refreshing}
          >
            <RotateCcw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="system">System Status</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {pendingTasks.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {activeTasks.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {completedTasks.filter(t => t.status === 'completed').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <ScrollArea className="h-[400px] w-full">
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tasks found. Tasks will appear here when I start working on them.
                  </div>
                ) : (
                  tasks.map((task) => (
                    <Card key={task.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex items-center gap-2">
                            {getTaskIcon(task.status, task.task_type)}
                            {getTypeIcon(task.task_type)}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">{task.title}</h4>
                              <Badge variant={getStatusBadgeVariant(task.status)}>
                                {task.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {task.description}
                            </p>
                            <Progress value={calculateProgress(task)} className="h-1" />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{task.task_type}</span>
                              <span>{formatTimeAgo(task.created_at)}</span>
                            </div>
                            {task.execution_data && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground">
                                  Execution Details
                                </summary>
                                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                  {JSON.stringify(task.execution_data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            {systemStatus && (
              <div className="space-y-3">
                {Object.entries(systemStatus).map(([key, service]: [string, any]) => (
                  <Card key={key} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          service.status === 'online' ? 'bg-green-500' :
                          service.status === 'limited' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                        <div>
                          <h4 className="font-medium text-sm">{service.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {service.details}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={service.status === 'online' ? 'default' : 'secondary'}
                        className={getServiceStatusColor(service.status)}
                      >
                        {service.status}
                      </Badge>
                    </div>
                    {service.capabilities && service.capabilities.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Capabilities:</p>
                        <div className="flex flex-wrap gap-1">
                          {service.capabilities.map((capability: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {capability}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}