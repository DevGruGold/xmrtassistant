import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Terminal, Trash2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { pythonExecutor } from '@/services/pythonExecutorService';
import { supabase } from '@/integrations/supabase/client';

interface PythonExecution {
  id: string;
  code: string;
  output: string | null;
  error: string | null;
  exit_code: number;
  execution_time_ms: number | null;
  source: string;
  purpose: string | null;
  created_at: string;
}

export const PythonShell = () => {
  const [code, setCode] = useState('# Eliza\'s Python Shell\nprint("Hello from autonomous shell")');
  const [elizaExecutions, setElizaExecutions] = useState<PythonExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  // Load and monitor Eliza's Python executions from database
  useEffect(() => {
    const fetchExecutions = async () => {
      const { data, error } = await supabase
        .from('eliza_python_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setElizaExecutions(data);
      }
    };

    fetchExecutions();

    // Set up real-time subscription
    const channel = supabase
      .channel('eliza-python-executions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'eliza_python_executions'
        },
        (payload) => {
          console.log('🐍 New Python execution from Eliza:', payload);
          setElizaExecutions(prev => [payload.new as PythonExecution, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const executeCode = async () => {
    if (!code.trim()) return;
    
    setIsExecuting(true);

    const result = await pythonExecutor.executeCode({
      code,
      silent: false
    });

    setIsExecuting(false);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            Eliza's Autonomous Python Shell
          </div>
          {elizaExecutions.length > 0 && (
            <Badge variant="default" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {elizaExecutions.length} executions
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Eliza's Activity Stream - Read Only */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Autonomous Activity Stream
          </span>
          <ScrollArea className="h-[400px] rounded-md border bg-secondary/30 p-4">
            <div className="font-mono text-sm space-y-4">
              {elizaExecutions.length === 0 ? (
                <p className="text-muted-foreground italic">Waiting for Eliza's autonomous work...</p>
              ) : (
                elizaExecutions.map((execution) => (
                  <div
                    key={execution.id}
                    className="p-3 rounded-lg border border-border bg-card/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs bg-mining-active/20 text-mining-active border-mining-active">
                        🤖 Eliza
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(execution.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {execution.purpose && (
                      <p className="text-xs text-primary">Purpose: {execution.purpose}</p>
                    )}
                    
                    <div className="bg-secondary/50 p-2 rounded text-xs">
                      <pre className="whitespace-pre-wrap">{execution.code}</pre>
                    </div>
                    
                    {execution.output && (
                      <div className="text-xs text-foreground">
                        <span className="text-muted-foreground">Output:</span>
                        <pre className="whitespace-pre-wrap mt-1">{execution.output}</pre>
                      </div>
                    )}
                    
                    {execution.error && (
                      <div className="text-xs text-destructive">
                        <span className="text-muted-foreground">Error:</span>
                        <pre className="whitespace-pre-wrap mt-1">{execution.error}</pre>
                      </div>
                    )}
                    
                    {execution.execution_time_ms && (
                      <span className="text-xs text-muted-foreground">
                        Executed in {execution.execution_time_ms}ms
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
