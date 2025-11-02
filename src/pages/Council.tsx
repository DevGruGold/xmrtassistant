import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExecutiveDirectory } from '@/components/ExecutiveDirectory';
import { ExecutiveStatusIndicator } from '@/components/ExecutiveStatusIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Brain, Activity } from 'lucide-react';
import { ExecutiveName } from '@/components/ExecutiveBio';
import { MobileNav } from '@/components/MobileNav';

const Council = () => {
  const navigate = useNavigate();

  const handleExecutiveSelect = (executive: ExecutiveName) => {
    // Navigate to home with executive preselected
    navigate('/', { state: { selectedExecutive: executive } });
  };

  const handleCouncilConvene = () => {
    // Navigate to home with council mode enabled
    navigate('/', { state: { councilMode: true } });
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileNav />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          
          <ExecutiveStatusIndicator />
        </div>

        {/* Page Title */}
        <div className="text-center space-y-4 mb-12">
          <div className="flex items-center justify-center gap-3">
            <Users className="w-12 h-12 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              XMRT Council
            </h1>
            <Brain className="w-12 h-12 text-primary" />
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Meet the AI Executive Board: 4 specialized leaders managing autonomous operations through 120+ edge functions
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="outline" className="border-primary/20">
              <Activity className="w-3 h-3 mr-1" />
              Individual Consultation
            </Badge>
            <Badge variant="outline" className="border-primary/20">
              <Users className="w-3 h-3 mr-1" />
              Group Deliberation
            </Badge>
            <Badge variant="outline" className="border-primary/20">
              <Brain className="w-3 h-3 mr-1" />
              120+ Edge Functions
            </Badge>
          </div>
        </div>

        {/* Executive Directory */}
        <ExecutiveDirectory 
          onExecutiveSelect={handleExecutiveSelect}
          onCouncilConvene={handleCouncilConvene}
        />

        {/* Info Section */}
        <Card className="mt-12 border-border bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              How the Council Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-primary">Individual Mode</h4>
                <p className="text-muted-foreground">
                  Select a specific executive (CSO, CTO, CIO, or CAO) for specialized expertise. 
                  Each executive has unique strengths and is powered by different AI models optimized for their domain.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-primary">Council Mode</h4>
                <p className="text-muted-foreground">
                  Convene the full council for complex decisions requiring multiple perspectives. 
                  All 4 executives deliberate in parallel, then synthesize their insights into a unified recommendation.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-primary">Intelligent Routing</h4>
                <p className="text-muted-foreground">
                  Let the system automatically route your request to the best executive based on the task type. 
                  Code questions go to the CTO, images to the CIO, strategy to the CSO, and complex analysis to the CAO.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-primary">Edge Function Network</h4>
                <p className="text-muted-foreground">
                  The council coordinates 120+ autonomous edge functions handling everything from GitHub integration 
                  to mining operations, knowledge management, and system diagnostics.
                </p>
              </div>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-lg border border-border mt-6">
              <p className="text-xs text-muted-foreground">
                <strong>Council Philosophy:</strong> AI replaces executives, not workers. The XMRT Council demonstrates 
                how AI can handle strategic decision-making and coordination at the C-suite level while preserving and 
                enhancing human workforce value through specialized autonomous functions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Council;
