import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  XCircle, 
  MinusCircle,
  User,
  Clock,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { VoteProgress } from './VoteProgress';

interface Proposal {
  id: string;
  function_name: string;
  description: string;
  rationale: string;
  use_cases: any;
  proposed_by: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ExecutiveVote {
  id: string;
  proposal_id: string;
  executive_name: string;
  vote: string;
  reasoning: string;
  created_at: string;
}

interface ProposalCardProps {
  proposal: Proposal;
  votes: ExecutiveVote[];
  onVoteSuccess: () => void;
}

const statusColors: Record<string, string> = {
  voting: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  approved: 'bg-green-500/10 text-green-600 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/30',
  deployed: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  pending: 'bg-muted text-muted-foreground border-border',
};

const executiveColors: Record<string, string> = {
  CSO: 'text-purple-500',
  CTO: 'text-blue-500',
  CIO: 'text-green-500',
  CAO: 'text-orange-500',
  COMMUNITY: 'text-pink-500',
};

export const ProposalCard: React.FC<ProposalCardProps> = ({ 
  proposal, 
  votes,
  onVoteSuccess 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [voting, setVoting] = useState(false);
  const [userVote, setUserVote] = useState<string | null>(null);

  const approvals = votes.filter(v => v.vote === 'approve').length;
  const rejections = votes.filter(v => v.vote === 'reject').length;
  const abstentions = votes.filter(v => v.vote === 'abstain').length;
  const totalVotes = votes.length;
  const progressPercent = (approvals / 3) * 100;

  const handleVote = async (vote: 'approve' | 'reject' | 'abstain') => {
    setVoting(true);
    try {
      // Get or create session key for community voting
      let sessionKey = localStorage.getItem('governance_session_key');
      if (!sessionKey) {
        sessionKey = `community_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('governance_session_key', sessionKey);
      }

      const { data, error } = await supabase.functions.invoke('vote-on-proposal', {
        body: {
          proposal_id: proposal.id,
          executive_name: 'COMMUNITY',
          vote,
          reasoning: `Community vote: ${vote}`,
          session_key: sessionKey
        }
      });

      if (error) throw error;

      setUserVote(vote);
      toast({
        title: 'Vote Recorded',
        description: `Your ${vote} vote has been recorded.`,
      });

      if (data.consensus_reached) {
        toast({
          title: data.status === 'approved' ? '🎉 Proposal Approved!' : '❌ Proposal Rejected',
          description: `Consensus reached with ${data.vote_summary.approvals}/4 approvals.`,
        });
      }

      onVoteSuccess();
    } catch (error: any) {
      toast({
        title: 'Vote Failed',
        description: error.message || 'Failed to record vote',
        variant: 'destructive'
      });
    } finally {
      setVoting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="border border-border hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <CardTitle className="text-lg truncate">{proposal.function_name}</CardTitle>
              <Badge variant="outline" className={statusColors[proposal.status] || statusColors.pending}>
                {proposal.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <User className="h-3 w-3" />
              Proposed by {proposal.proposed_by}
              <span className="text-border">•</span>
              <Clock className="h-3 w-3" />
              {formatDate(proposal.created_at)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm">{proposal.description}</p>

        {/* Vote Progress */}
        <VoteProgress 
          approvals={approvals} 
          rejections={rejections} 
          abstentions={abstentions}
          required={3}
        />

        {/* Voting Buttons (only if voting is open) */}
        {proposal.status === 'voting' && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={userVote === 'approve' ? 'default' : 'outline'}
              className={userVote === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30'}
              onClick={() => handleVote('approve')}
              disabled={voting}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant={userVote === 'reject' ? 'default' : 'outline'}
              className={userVote === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30'}
              onClick={() => handleVote('reject')}
              disabled={voting}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              variant={userVote === 'abstain' ? 'default' : 'outline'}
              className={userVote === 'abstain' ? 'bg-muted' : ''}
              onClick={() => handleVote('abstain')}
              disabled={voting}
            >
              <MinusCircle className="h-4 w-4 mr-1" />
              Abstain
            </Button>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              View Details & Executive Reasoning
            </>
          )}
        </Button>

        {/* Expanded Details */}
        {expanded && (
          <div className="space-y-4 pt-4 border-t border-border">
            {/* Rationale */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Rationale</h4>
              <p className="text-sm text-muted-foreground">{proposal.rationale}</p>
            </div>

            {/* Use Cases */}
            {proposal.use_cases && proposal.use_cases.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Use Cases</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {proposal.use_cases.map((useCase, idx) => (
                    <li key={idx}>{useCase}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Executive Votes */}
            {votes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Executive Reasoning</h4>
                <div className="space-y-3">
                  {votes.map(vote => (
                    <div 
                      key={vote.id} 
                      className="p-3 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${executiveColors[vote.executive_name] || 'text-foreground'}`}>
                          {vote.executive_name}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={
                            vote.vote === 'approve' 
                              ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                              : vote.vote === 'reject'
                              ? 'bg-red-500/10 text-red-600 border-red-500/30'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {vote.vote.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{vote.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
