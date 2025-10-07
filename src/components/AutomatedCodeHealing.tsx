import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const AutomatedCodeHealing = () => {
  const [status, setStatus] = useState<"idle" | "monitoring" | "fixing" | "success" | "error">("idle");
  const [stats, setStats] = useState({ fixed: 0, pending: 0 });
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    console.log('🔍 Code Health Monitor initializing...');
    
    // Initial check immediately
    checkCodeHealth();
    
    // Poll every 2 minutes (120000ms) - reasonable interval to avoid overwhelming the system
    const pollInterval = setInterval(() => {
      checkCodeHealth();
    }, 120000);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  const checkCodeHealth = async () => {
    try {
      console.log('🔍 Code Health Monitor: Starting health check...');
      setStatus("monitoring");
      setLastCheck(new Date());

      const { data, error } = await supabase.functions.invoke('code-monitor-daemon', {
        body: { action: 'monitor' }
      });

      if (error) throw error;

      if (data?.circuit_breaker) {
        setStatus("idle");
        console.log('⚠️ Code Health Monitor: Circuit breaker active - pausing monitoring');
        return;
      }

      console.log('✅ Code Health Monitor: Health check complete', data);
      
      setStats({
        fixed: data?.fixed || 0,
        pending: data?.remaining || 0
      });

      if (data?.fixed > 0) {
        setStatus("success");
        console.log(`🎉 Code Health Monitor: ${data.fixed} issues auto-fixed!`);
        // Reset to idle after showing success
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("idle");
      }
    } catch (err) {
      console.error('Code health check failed:', err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 p-3 w-64 bg-card/95 backdrop-blur-sm border-primary/20 shadow-lg z-50">
      <div className="flex items-center gap-2 mb-2">
        {status === "monitoring" && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        {status === "success" && (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
        {status === "error" && (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
        {status === "idle" && (
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold">Code Health Monitor</span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Auto-fixed:</span>
          <Badge variant="secondary" className="h-5 px-2">
            {stats.fixed}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pending:</span>
          <Badge variant="outline" className="h-5 px-2">
            {stats.pending}
          </Badge>
        </div>
        {lastCheck && (
          <div className="text-muted-foreground mt-2">
            Last check: {lastCheck.toLocaleTimeString()}
          </div>
        )}
      </div>
    </Card>
  );
};