import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Vote, Filter, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProposalCard } from '@/components/ProposalCard';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

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
  session_key?: string;
}

export default function Governance() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votes, setVotes] = useState<Record<string, ExecutiveVote[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // New proposal form state
  const [newProposal, setNewProposal] = useState({
    function_name: '',
    description: '',
    rationale: '',
    use_cases: '',
    proposed_by: ''
  });

  const fetchProposals = async () => {
    try {
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('edge_function_proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (proposalsError) throw proposalsError;

      setProposals(proposalsData || []);

      // Fetch all votes including session_key
      const { data: votesData, error: votesError } = await supabase
        .from('executive_votes')
        .select('*');

      if (votesError) throw votesError;

      // Group votes by proposal_id
      const votesMap: Record<string, ExecutiveVote[]> = {};
      votesData?.forEach(vote => {
        if (!votesMap[vote.proposal_id]) {
          votesMap[vote.proposal_id] = [];
        }
        votesMap[vote.proposal_id].push(vote);
      });
      setVotes(votesMap);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();

    // Subscribe to real-time changes
    const proposalsChannel = supabase
      .channel('governance-proposals')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'edge_function_proposals' },
        () => fetchProposals()
      )
      .subscribe();

    const votesChannel = supabase
      .channel('governance-votes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'executive_votes' },
        () => fetchProposals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(proposalsChannel);
      supabase.removeChannel(votesChannel);
    };
  }, []);

  const filterProposals = (status: string) => {
    if (status === 'all') return proposals;
    return proposals.filter(p => p.status === status);
  };

  const getCounts = () => {
    return {
      all: proposals.length,
      voting: proposals.filter(p => p.status === 'voting').length,
      approved: proposals.filter(p => p.status === 'approved').length,
      rejected: proposals.filter(p => p.status === 'rejected').length,
      deployed: proposals.filter(p => p.status === 'deployed').length,
    };
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProposal.function_name || !newProposal.description || !newProposal.rationale || !newProposal.proposed_by) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      // Parse use cases (split by newlines)
      const useCases = newProposal.use_cases
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const { data, error } = await supabase.functions.invoke('propose-new-edge-function', {
        body: {
          function_name: newProposal.function_name,
          description: newProposal.description,
          rationale: newProposal.rationale,
          use_cases: useCases,
          proposed_by: newProposal.proposed_by,
          category: 'community'
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: '✅ Proposal Submitted',
        description: 'Your proposal has been submitted for executive council review.'
      });

      // Reset form and close dialog
      setNewProposal({
        function_name: '',
        description: '',
        rationale: '',
        use_cases: '',
        proposed_by: ''
      });
      setProposalDialogOpen(false);
      fetchProposals();
    } catch (error: any) {
      console.error('Failed to submit proposal:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit proposal',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const counts = getCounts();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Vote className="h-6 w-6 text-amber-500" />
                <h1 className="text-xl font-bold">Governance Portal</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
                {counts.voting} awaiting votes
              </Badge>
              
              {/* New Proposal Button */}
              <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Proposal
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Propose New Edge Function</DialogTitle>
                    <DialogDescription>
                      Submit a proposal for a new edge function. The executive council will review and vote on it.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitProposal} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="function_name">Function Name *</Label>
                      <Input
                        id="function_name"
                        placeholder="e.g., my-awesome-function"
                        value={newProposal.function_name}
                        onChange={e => setNewProposal(prev => ({ ...prev, function_name: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="proposed_by">Your Name / Handle *</Label>
                      <Input
                        id="proposed_by"
                        placeholder="e.g., CommunityMember123"
                        value={newProposal.proposed_by}
                        onChange={e => setNewProposal(prev => ({ ...prev, proposed_by: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="What does this function do?"
                        value={newProposal.description}
                        onChange={e => setNewProposal(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="rationale">Rationale *</Label>
                      <Textarea
                        id="rationale"
                        placeholder="Why is this function needed? What problem does it solve?"
                        value={newProposal.rationale}
                        onChange={e => setNewProposal(prev => ({ ...prev, rationale: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="use_cases">Use Cases (one per line)</Label>
                      <Textarea
                        id="use_cases"
                        placeholder="Automated monitoring&#10;User notifications&#10;Data processing"
                        value={newProposal.use_cases}
                        onChange={e => setNewProposal(prev => ({ ...prev, use_cases: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Proposal'
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Info Banner */}
        <div className="mb-8 p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Democratic Voting:</strong> Cast your vote alongside AI executives on edge function proposals. 
            Proposals need 3/4 executive approvals to pass. Community votes show support but don't count toward consensus.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 flex flex-wrap gap-2 h-auto bg-transparent p-0">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger 
              value="voting"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
            >
              <Vote className="h-3 w-3 mr-1" />
              Voting ({counts.voting})
            </TabsTrigger>
            <TabsTrigger 
              value="approved"
              className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
            >
              Approved ({counts.approved})
            </TabsTrigger>
            <TabsTrigger 
              value="rejected"
              className="data-[state=active]:bg-red-500 data-[state=active]:text-white"
            >
              Rejected ({counts.rejected})
            </TabsTrigger>
            {counts.deployed > 0 && (
              <TabsTrigger 
                value="deployed"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                Deployed ({counts.deployed})
              </TabsTrigger>
            )}
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <TabsContent value="all" className="space-y-4 mt-0">
                {filterProposals('all').length === 0 ? (
                  <EmptyState message="No proposals yet. Be the first to submit one!" />
                ) : (
                  filterProposals('all').map(proposal => (
                    <ProposalCard 
                      key={proposal.id} 
                      proposal={proposal} 
                      votes={votes[proposal.id] || []}
                      onVoteSuccess={fetchProposals}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="voting" className="space-y-4 mt-0">
                {filterProposals('voting').length === 0 ? (
                  <EmptyState message="No proposals currently in voting" />
                ) : (
                  filterProposals('voting').map(proposal => (
                    <ProposalCard 
                      key={proposal.id} 
                      proposal={proposal} 
                      votes={votes[proposal.id] || []}
                      onVoteSuccess={fetchProposals}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="approved" className="space-y-4 mt-0">
                {filterProposals('approved').length === 0 ? (
                  <EmptyState message="No approved proposals" />
                ) : (
                  filterProposals('approved').map(proposal => (
                    <ProposalCard 
                      key={proposal.id} 
                      proposal={proposal} 
                      votes={votes[proposal.id] || []}
                      onVoteSuccess={fetchProposals}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4 mt-0">
                {filterProposals('rejected').length === 0 ? (
                  <EmptyState message="No rejected proposals" />
                ) : (
                  filterProposals('rejected').map(proposal => (
                    <ProposalCard 
                      key={proposal.id} 
                      proposal={proposal} 
                      votes={votes[proposal.id] || []}
                      onVoteSuccess={fetchProposals}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="deployed" className="space-y-4 mt-0">
                {filterProposals('deployed').length === 0 ? (
                  <EmptyState message="No deployed functions" />
                ) : (
                  filterProposals('deployed').map(proposal => (
                    <ProposalCard 
                      key={proposal.id} 
                      proposal={proposal} 
                      votes={votes[proposal.id] || []}
                      onVoteSuccess={fetchProposals}
                    />
                  ))
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );
}
