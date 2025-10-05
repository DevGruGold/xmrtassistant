import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AutomatedCodeHealing = () => {
  const [isActive, setIsActive] = useState(true);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [fixCount, setFixCount] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const runMonitoring = async () => {
      try {
        console.log('🤖 Running automated code healing scan...');
        
        const { data, error } = await supabase.functions.invoke('code-monitor-daemon', {
          body: { action: 'monitor' }
        });

        if (error) {
          console.error('Code monitoring failed:', error);
          return;
        }

        setLastRun(new Date());
        
        if (data?.fixer_result?.fixed > 0) {
          setFixCount(prev => prev + data.fixer_result.fixed);
          toast.success(`🔧 Auto-fixed ${data.fixer_result.fixed} failed execution(s)`, {
            description: 'Background agents are healing your code',
            duration: 5000,
          });
        }

        console.log('✅ Code monitoring complete:', data);
      } catch (err) {
        console.error('Error running code monitor:', err);
      }
    };

    // Run immediately on mount
    runMonitoring();

    // Then run every 30 seconds
    const interval = setInterval(runMonitoring, 30000);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-3 shadow-lg text-xs z-50">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="font-medium">Code Healing Agent</span>
      </div>
      <div className="text-muted-foreground space-y-1">
        <div>Status: {isActive ? 'Active' : 'Inactive'}</div>
        {lastRun && (
          <div>Last scan: {lastRun.toLocaleTimeString()}</div>
        )}
        {fixCount > 0 && (
          <div className="text-green-500">✅ Fixed: {fixCount} total</div>
        )}
      </div>
      <button
        onClick={() => setIsActive(!isActive)}
        className="mt-2 text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded transition-colors"
      >
        {isActive ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
};
