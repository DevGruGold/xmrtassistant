import React, { useEffect, useState } from 'react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Vote, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ProposalCount {
  voting: number;
  approved: number;
  rejected: number;
}

export const GovernanceStatusBadge: React.FC = () => {
  const [counts, setCounts] = useState<ProposalCount>({ voting: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('edge_function_proposals')
          .select('status');
        
        if (error) throw error;
        
        const newCounts = { voting: 0, approved: 0, rejected: 0 };
        data?.forEach(proposal => {
          if (proposal.status === 'voting') newCounts.voting++;
          else if (proposal.status === 'approved') newCounts.approved++;
          else if (proposal.status === 'rejected') newCounts.rejected++;
        });
        
        setCounts(newCounts);
      } catch (error) {
        console.error('Failed to fetch governance counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('governance-status')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'edge_function_proposals' },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return null;
  
  // Only show if there are active proposals
  if (counts.voting === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="text-xs flex items-center gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30 cursor-help"
          >
            <Vote className="h-3 w-3" />
            <span>{counts.voting}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-sm">Council Governance Status</p>
            <div className="text-xs space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-amber-500" />
                <span>{counts.voting} proposals awaiting votes</span>
              </div>
              {counts.approved > 0 && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>{counts.approved} approved</span>
                </div>
              )}
              {counts.rejected > 0 && (
                <div className="flex items-center gap-1.5">
                  <XCircle className="h-3 w-3 text-red-500" />
                  <span>{counts.rejected} rejected</span>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
