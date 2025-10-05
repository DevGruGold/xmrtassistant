import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const ManusTokenDisplay = () => {
  const [tokensRemaining, setTokensRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTokenStatus();
    
    // Refresh every minute
    const interval = setInterval(fetchTokenStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchTokenStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('manus_token_usage')
        .select('tokens_available')
        .eq('date', today)
        .single();

      if (!error && data) {
        setTokensRemaining(data.tokens_available);
      }
    } catch (err) {
      console.error('Failed to fetch Manus token status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || tokensRemaining === null) return null;

  const getVariant = () => {
    if (tokensRemaining > 100) return 'default';
    if (tokensRemaining > 50) return 'secondary';
    return 'destructive';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={getVariant()} className="gap-1 cursor-help">
            <Brain className="h-3 w-3" />
            <span>{tokensRemaining}/300</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            Manus AI tokens remaining today
            <br />
            <span className="text-xs text-muted-foreground">Resets at midnight UTC</span>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
