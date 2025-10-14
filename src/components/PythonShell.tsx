import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Sparkles, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatTime } from '@/utils/dateFormatter';
import { realtimeManager } from '@/services/realtimeSubscriptionManager';

interface ActivityLog {
  id: string;
  activity_type: string;
  title: string;
  description: string;
  metadata: any;
  status: string;
  created_at: string;
}

const PythonShell = () => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load and monitor ALL of Eliza's background work
  useEffect(() => {
    const fetchActivity = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('eliza_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setActivityLogs(data);
      }
      setIsLoading(false);
    };

    fetchActivity();

    // Phase 1.1: Use centralized subscription manager
    const unsubscribe = realtimeManager.subscribe(
      'eliza_activity_log',
      (payload) => {
        console.log('🤖 New activity from Eliza:', payload);
        setActivityLogs(prev => [payload.new as ActivityLog, ...prev].slice(0, 50));
      },
      {
        event: 'INSERT',
        schema: 'public'
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'python_execution':
        return '🐍';
      case 'python_fix_execution':
        return '🔧';
      case 'agent_management':
        return '🤖';
      case 'github_integration':
        return '💻';
      case 'task_assignment':
        return '📋';
      case 'batch_vectorization':
        return '🧠';
      default:
        return '⚡';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-mining-active/20 text-mining-active border-mining-active';
      case 'failed':
        return 'bg-destructive/20 text-destructive border-destructive';
      case 'in_progress':
        return 'bg-mining-info/20 text-mining-info border-mining-info';
      default:
        return 'bg-secondary/20 text-secondary-foreground border-border';
    }
  };

  const getExecutionBadge = (activity: ActivityLog) => {
    if (activity.activity_type === 'python_fix_execution') {
      return (
        <Badge variant="outline" className="bg-primary/20 text-primary border-primary text-xs">
          AUTO-FIXED
        </Badge>
      );
    }
    if (activity.metadata?.was_auto_fixed === true) {
      return (
        <Badge variant="outline" className="bg-primary/20 text-primary border-primary text-xs">
          AUTO-FIXED
        </Badge>
      );
    }
    if (activity.metadata?.source === 'autonomous_agent') {
      return (
        <Badge variant="outline" className="bg-mining-warning/20 text-mining-warning border-mining-warning text-xs">
          AUTONOMOUS
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            Eliza's Background Work
          </div>
          {activityLogs.length > 0 && (
            <Badge variant="default" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {activityLogs.length} activities
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] rounded-md border bg-secondary/30 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activityLogs.length === 0 ? (
            <p className="text-muted-foreground italic text-center py-8">
              Waiting for Eliza's autonomous work...
            </p>
          ) : (
            <div className="font-mono text-sm space-y-3">
              {activityLogs.map((activity) => (
                <div
                  key={activity.id}
                  className="p-3 rounded-lg border border-border bg-card/50 space-y-2 animate-fade-in"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{getActivityIcon(activity.activity_type)}</span>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(activity.status)}`}>
                        {activity.status}
                      </Badge>
                      {getExecutionBadge(activity)}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(activity.created_at)}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-primary">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                  </div>
                  
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="bg-secondary/50 p-2 rounded text-xs">
                      <pre className="whitespace-pre-wrap text-foreground/80">
                        {JSON.stringify(activity.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PythonShell;
