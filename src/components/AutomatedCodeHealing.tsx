import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AutomatedCodeHealing = () => {
  const [status, setStatus] = useState<"idle" | "monitoring" | "fixing" | "success" | "error" | "disconnected">("idle");
  const [stats, setStats] = useState({ fixed: 0, pending: 0 });
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    console.log('🚀 [Code Health Monitor] Component mounted - initializing...');
    
    // Test connection first
    testConnection();
    
    // Initial check immediately after connection test
    const initialTimeout = setTimeout(() => {
      checkCodeHealth();
    }, 2000);
    
    // Poll every 2 minutes (120000ms) - reasonable interval to avoid overwhelming the system
    const pollInterval = setInterval(() => {
      console.log('⏰ [Code Health Monitor] Running scheduled health check...');
      checkCodeHealth();
    }, 120000);

    return () => {
      console.log('🛑 [Code Health Monitor] Component unmounting - cleaning up...');
      clearInterval(pollInterval);
      clearTimeout(initialTimeout);
    };
  }, []);

  const testConnection = async () => {
    try {
      console.log('🔌 [Code Health Monitor] Testing edge function connectivity...');
      const { data, error } = await supabase.functions.invoke('code-monitor-daemon', {
        body: { action: 'status' }
      });

      if (error) {
        console.error('❌ [Code Health Monitor] Connection test failed:', error);
        setStatus("disconnected");
        setIsConnected(false);
        setErrorMessage(error.message);
        toast.error("Code monitor connection failed");
        return;
      }

      console.log('✅ [Code Health Monitor] Connection test successful:', data);
      setIsConnected(true);
      setErrorMessage(null);
    } catch (err) {
      console.error('❌ [Code Health Monitor] Connection test error:', err);
      setStatus("disconnected");
      setIsConnected(false);
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const checkCodeHealth = async () => {
    if (!isConnected) {
      console.warn('⚠️ [Code Health Monitor] Skipping check - not connected');
      return;
    }

    try {
      console.log('🔍 [Code Health Monitor] Starting health check...');
      setStatus("monitoring");
      setLastCheck(new Date());
      setErrorMessage(null);

      const { data, error } = await supabase.functions.invoke('code-monitor-daemon', {
        body: { action: 'monitor' }
      });

      if (error) {
        console.error('❌ [Code Health Monitor] Health check error:', error);
        throw error;
      }

      if (data?.circuit_breaker) {
        setStatus("idle");
        console.log('⚠️ [Code Health Monitor] Circuit breaker active - pausing monitoring');
        toast.info("Code monitor paused (circuit breaker)");
        return;
      }

      console.log('✅ [Code Health Monitor] Health check complete:', data);
      
      const newStats = {
        fixed: data?.fixed || 0,
        pending: data?.remaining || 0
      };
      
      setStats(newStats);
      setIsConnected(true);

      if (newStats.fixed > 0) {
        setStatus("success");
        console.log(`🎉 [Code Health Monitor] ${newStats.fixed} issues auto-fixed!`);
        toast.success(`Auto-fixed ${newStats.fixed} code issue${newStats.fixed > 1 ? 's' : ''}!`);
        // Reset to idle after showing success
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("idle");
        console.log('ℹ️ [Code Health Monitor] No issues detected');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [Code Health Monitor] Health check failed:', errorMsg);
      setStatus("error");
      setErrorMessage(errorMsg);
      setIsConnected(false);
      toast.error("Code monitor check failed");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  const handleManualRefresh = () => {
    console.log('🔄 [Code Health Monitor] Manual refresh triggered');
    testConnection();
    setTimeout(() => checkCodeHealth(), 1000);
  };

  return (
    <Card className="fixed bottom-4 right-4 p-3 w-72 bg-card/95 backdrop-blur-sm border-primary/20 shadow-lg z-50">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {status === "monitoring" && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {status === "success" && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {status === "error" && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          {status === "disconnected" && (
            <XCircle className="h-4 w-4 text-orange-500" />
          )}
          {status === "idle" && (
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold">Code Health Monitor</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualRefresh}
          className="h-6 w-6 p-0"
          disabled={status === "monitoring"}
        >
          <RefreshCw className={`h-3 w-3 ${status === "monitoring" ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Connection:</span>
          <Badge 
            variant={isConnected ? "default" : "destructive"} 
            className="h-5 px-2"
          >
            {isConnected ? "Online" : "Offline"}
          </Badge>
        </div>
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
        {errorMessage && (
          <div className="text-red-500 text-xs mt-2 truncate" title={errorMessage}>
            Error: {errorMessage}
          </div>
        )}
      </div>
    </Card>
  );
};