import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Terminal, Trash2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { pythonExecutor } from '@/services/pythonExecutorService';
import { AutonomousWorkMonitor } from '@/services/autonomousWorkMonitor';

export const PythonShell = () => {
  const [code, setCode] = useState('# Eliza\'s Python Shell\nprint("Hello from autonomous shell")');
  const [output, setOutput] = useState<Array<{ type: 'output' | 'error' | 'info' | 'eliza'; text: string; source?: string }>>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [elizaActivityCount, setElizaActivityCount] = useState(0);

  // Monitor Eliza's autonomous Python executions
  useEffect(() => {
    const unsubscribe = AutonomousWorkMonitor.onPythonExecution((execution) => {
      setElizaActivityCount(prev => prev + 1);
      
      setOutput(prev => [
        ...prev,
        { 
          type: 'eliza', 
          text: `🤖 Eliza executing: ${execution.code.substring(0, 80)}${execution.code.length > 80 ? '...' : ''}`,
          source: execution.source
        },
        { type: execution.error ? 'error' : 'output', text: execution.output || execution.error || '(No output)' }
      ]);
    });

    return () => unsubscribe();
  }, []);

  const executeCode = async () => {
    if (!code.trim()) return;
    
    setIsExecuting(true);
    setOutput(prev => [...prev, { type: 'info', text: `>>> Executing code...` }]);

    const result = await pythonExecutor.executeCode({
      code,
      silent: false
    });

    // Broadcast execution to monitor
    AutonomousWorkMonitor.broadcastPythonExecution({
      id: Date.now().toString(),
      code,
      output: result.output,
      error: result.error,
      source: 'user'
    });

    if (result.success) {
      setOutput(prev => [
        ...prev,
        { type: 'output', text: result.output || '(No output)' },
        { type: 'info', text: `✓ Completed in ${result.estimatedTime}` }
      ]);
    } else {
      setOutput(prev => [
        ...prev,
        { type: 'error', text: result.error },
        { type: 'info', text: `✗ Failed after ${result.estimatedTime}` }
      ]);
    }

    setIsExecuting(false);
  };

  const clearOutput = () => setOutput([]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            Eliza's Python Shell
          </div>
          {elizaActivityCount > 0 && (
            <Badge variant="default" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {elizaActivityCount} autonomous executions
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Code Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Code Editor</span>
              <Button
                size="sm"
                onClick={executeCode}
                disabled={isExecuting}
                className="gap-2"
              >
                <Play className="h-3 w-3" />
                {isExecuting ? 'Running...' : 'Execute'}
              </Button>
            </div>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-sm min-h-[300px] bg-secondary/30"
              placeholder="# Write Python code here..."
            />
          </div>

          {/* Output Terminal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Output</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearOutput}
                disabled={output.length === 0}
                className="gap-2"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </Button>
            </div>
            <ScrollArea className="h-[300px] rounded-md border bg-secondary/30 p-4">
              <div className="font-mono text-sm space-y-2">
                {output.length === 0 ? (
                  <p className="text-muted-foreground italic">No output yet. Waiting for Eliza's autonomous work...</p>
                ) : (
                  output.map((line, idx) => (
                    <div
                      key={idx}
                      className={
                        line.type === 'error'
                          ? 'text-destructive'
                          : line.type === 'info'
                          ? 'text-primary'
                          : line.type === 'eliza'
                          ? 'text-mining-active font-semibold'
                          : 'text-foreground'
                      }
                    >
                      {line.text}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
