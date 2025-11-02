import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, GitCommit, DollarSign, TrendingUp } from 'lucide-react';
import { GitHubPATInput } from './GitHubContributorRegistration';

interface Contributor {
  github_username: string;
  wallet_address: string;
  total_contributions: number;
  total_xmrt_earned: number;
  avg_validation_score: number;
  target_repo_owner: string;
  target_repo_name: string;
}

interface Contribution {
  id: string;
  contribution_type: string;
  github_url: string;
  validation_score: number | null;
  xmrt_earned: number;
  is_validated: boolean;
  is_harmful: boolean;
  created_at: string;
}

export const ContributorDashboard = () => {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [myContributions, setMyContributions] = useState<Contribution[]>([]);
  const [showPATInput, setShowPATInput] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Real-time subscription
    const channel = supabase
      .channel('contributor-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'github_contributors'
      }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch top contributors
    const { data: contributorsData } = await supabase
      .from('github_contributors')
      .select('*')
      .eq('is_active', true)
      .order('total_xmrt_earned', { ascending: false })
      .limit(10);

    if (contributorsData) {
      setContributors(contributorsData);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse">Loading contributor data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Decentralized Development Incentive Program
          </h1>
          <p className="text-muted-foreground mt-2">
            Earn XMRT tokens by contributing to the ecosystem. Drop your GitHub PAT, make improvements, get rewarded.
          </p>
        </div>
      </div>

      {/* Setup Card */}
      {!showPATInput ? (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="w-5 h-5" />
              Get Started
            </CardTitle>
            <CardDescription>
              Configure your GitHub PAT and wallet address to start earning XMRT
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => setShowPATInput(true)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Configure GitHub & Wallet
            </button>
          </CardContent>
        </Card>
      ) : (
        <GitHubPATInput onKeyValidated={() => setShowPATInput(false)} />
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Top Contributors
          </CardTitle>
          <CardDescription>
            Community leaders earning XMRT through validated contributions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contributors.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No contributors yet. Be the first to earn XMRT!
              </p>
            ) : (
              contributors.map((contributor, index) => (
                <div
                  key={contributor.github_username}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold ${
                      index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-orange-600' :
                      'text-muted-foreground'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">@{contributor.github_username}</div>
                      <div className="text-sm text-muted-foreground">
                        {contributor.target_repo_owner}/{contributor.target_repo_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6 text-right">
                    <div>
                      <div className="text-sm text-muted-foreground">Contributions</div>
                      <div className="font-semibold">{contributor.total_contributions}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Avg Score</div>
                      <div className="font-semibold">
                        {contributor.avg_validation_score?.toFixed(0) || 'N/A'}/100
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        XMRT Earned
                      </div>
                      <div className="font-bold text-primary">
                        {Number(contributor.total_xmrt_earned).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">1</div>
              <h3 className="font-semibold">Configure Your Setup</h3>
              <p className="text-sm text-muted-foreground">
                Add your GitHub PAT, select a target repository, and connect your wallet address
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">2</div>
              <h3 className="font-semibold">Make Contributions</h3>
              <p className="text-sm text-muted-foreground">
                Use Eliza to create commits, issues, PRs, and discussions. She validates all contributions for quality and safety
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">3</div>
              <h3 className="font-semibold">Earn XMRT Rewards</h3>
              <p className="text-sm text-muted-foreground">
                Get paid automatically based on validation scores. Exceptional work (90+) earns 1.5x bonus!
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Reward Structure</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Pull Requests: 500 XMRT base (up to 750 XMRT for exceptional)</li>
              <li>• Commits: 100 XMRT base (up to 150 XMRT for exceptional)</li>
              <li>• Issues: 50 XMRT base (up to 75 XMRT for exceptional)</li>
              <li>• Discussions: 25 XMRT base (up to 37.5 XMRT for exceptional)</li>
              <li>• Comments: 10 XMRT base (up to 15 XMRT for exceptional)</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              * All contributions are validated by Eliza AI. Harmful contributions result in zero rewards and may lead to bans after 3 strikes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};