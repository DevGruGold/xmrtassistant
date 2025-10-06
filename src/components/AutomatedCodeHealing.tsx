import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AutomatedCodeHealing = () => {
  const [isActive, setIsActive] = useState(true);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [stats, setStats] = useState({
    totalAtStart: 0,
    fixed: 0,
    deleted: 0,
    remaining: 0,
    sessionFixed: 0
  });

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
        
        if (data?.fixer_result) {
          const result = data.fixer_result;
          setStats(prev => ({
            totalAtStart: result.total_at_start || prev.totalAtStart || 0,
            fixed: result.fixed || 0,
            deleted: result.unfixable_deleted || 0,
            remaining: result.remaining || 0,
            sessionFixed: prev.sessionFixed + (result.fixed || 0)
          }));
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

  const progressPercentage = stats.totalAtStart > 0 
    ? Math.round(((stats.totalAtStart - stats.remaining) / stats.totalAtStart) * 100)
    : 0;

  return (
    <div className={`fixed bottom-4 right-4 bg-card border border-border rounded-lg shadow-lg text-xs z-50 transition-all ${isCollapsed ? 'w-48' : 'w-72'}`}>
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="font-medium">Code Healer</span>
        </div>
        {stats.remaining > 0 && (
          <span className="text-orange-500 font-medium">{stats.remaining}</span>
        )}
      </div>
      
      {!isCollapsed && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
          <div className="text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={isActive ? 'text-green-500' : 'text-gray-400'}>
                {isActive ? 'Active' : 'Paused'}
              </span>
            </div>
            {lastRun && (
              <div className="flex justify-between">
                <span>Last scan:</span>
                <span>{lastRun.toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {stats.totalAtStart > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Progress:</span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Fixed:</span>
                  <span className="text-green-500">{stats.sessionFixed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deleted:</span>
                  <span className="text-orange-500">{stats.deleted}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining:</span>
                  <span className="text-yellow-500">{stats.remaining}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>{stats.totalAtStart}</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsActive(!isActive);
            }}
            className="w-full text-xs px-2 py-1.5 bg-primary/10 hover:bg-primary/20 rounded transition-colors"
          >
            {isActive ? 'Pause' : 'Resume'}
          </button>
        </div>
      )}
    </div>
  );
};
