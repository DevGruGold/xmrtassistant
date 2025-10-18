import { useState, useEffect } from "react";
import UnifiedChat from "@/components/UnifiedChat";
import PythonShell from "@/components/PythonShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Activity, Brain, Zap, Eye, Code } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Brain className="w-12 h-12 text-purple-600" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
              Eliza AI Assistant
            </h1>
            <Zap className="w-12 h-12 text-blue-600" />
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Autonomous AI with circular learning, self-healing code execution, and real-time activity monitoring
          </p>
          
          {/* Status Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Activity className="w-3 h-3 mr-1" />
              Circular Learning Active
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Code className="w-3 h-3 mr-1" />
              Auto-Fixer Running
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              <Eye className="w-3 h-3 mr-1" />
              Full Visibility
            </Badge>
          </div>

          {/* Info Section */}
          <Collapsible open={showInfo} onOpenChange={setShowInfo}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Info className="w-4 h-4" />
                {showInfo ? "Hide" : "Show"} System Information
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-4 border-purple-200 bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="w-5 h-5 text-purple-600" />
                    Circular Learning System
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-left">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-purple-700 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      How It Works
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-gray-700 pl-2">
                      <li>You interact with Eliza through natural language</li>
                      <li>Eliza executes code in <strong>background only</strong> (never shown in chat)</li>
                      <li>Code appears in the <strong>Background Work</strong> window below</li>
                      <li>Every minute, daemon scans for failed executions</li>
                      <li>Auto-fixer analyzes errors and generates corrected code</li>
                      <li>Fixed code is re-executed automatically</li>
                      <li>Learning metadata is extracted from each fix</li>
                      <li>Eliza continuously improves from experience</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-blue-700 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Real-Time Activity Monitoring
                    </h4>
                    <p className="text-gray-700">
                      The <strong>Background Work</strong> window shows ALL system activity in real-time:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 p-2 rounded">
                        <strong>💬 Chat Activity</strong>
                        <ul className="list-disc list-inside pl-2 mt-1">
                          <li>User messages</li>
                          <li>Eliza responses</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <strong>🔧 Tool Executions</strong>
                        <ul className="list-disc list-inside pl-2 mt-1">
                          <li>Start and end logging</li>
                          <li>All tool types tracked</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <strong>🔍 Daemon Scans</strong>
                        <ul className="list-disc list-inside pl-2 mt-1">
                          <li>Every 60 seconds</li>
                          <li>Failure detection</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <strong>🤖 Auto-Fixing</strong>
                        <ul className="list-disc list-inside pl-2 mt-1">
                          <li>Error analysis</li>
                          <li>Code generation</li>
                          <li>Re-execution</li>
                          <li>Learning extraction</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <strong>🐍 Code Execution</strong>
                        <ul className="list-disc list-inside pl-2 mt-1">
                          <li>Background only</li>
                          <li>Full output captured</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <strong>📡 MCP Integration</strong>
                        <ul className="list-disc list-inside pl-2 mt-1">
                          <li>80+ edge functions</li>
                          <li>Dynamic invocation</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-green-700 flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Key Features
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 pl-2">
                      <li><strong>Background Execution:</strong> Code runs silently, results appear in work window</li>
                      <li><strong>Autonomous Fixing:</strong> AI automatically corrects errors without user intervention</li>
                      <li><strong>Continuous Learning:</strong> Each fix generates insights for future improvements</li>
                      <li><strong>Complete Visibility:</strong> See every tool call, scan, fix, and learning event</li>
                      <li><strong>MCP Integration:</strong> Access to 80+ Supabase edge functions dynamically</li>
                      <li><strong>Real-Time Updates:</strong> Activity stream updates live via Supabase Realtime</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg border border-purple-200">
                    <p className="text-xs text-gray-600">
                      <strong>Activity Types Visible:</strong> chat_message, chat_response, tool_execution, 
                      python_execution, daemon_scan, auto_fix_triggered, auto_fix_analysis, auto_fix_execution, 
                      learning_analysis, auto_fix_complete, mcp_invocation, error
                    </p>
                  </div>

                  <div className="text-center pt-2">
                    <a 
                      href="https://github.com/DevGruGold/xmrtassistant" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-purple-600 hover:text-purple-700 underline"
                    >
                      View Documentation on GitHub →
                    </a>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6">
          {/* Chat Interface */}
          <Card className="border-purple-200 shadow-xl bg-white/90 backdrop-blur">
            <CardHeader className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Chat with Eliza
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <UnifiedChat />
            </CardContent>
          </Card>

          {/* Background Work Window */}
          <Card className="border-blue-200 shadow-xl bg-white/90 backdrop-blur">
            <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Background Work
                <Badge variant="secondary" className="ml-auto">
                  Real-Time Activity
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Live view of code execution, daemon scans, auto-fixes, and all system activity
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <PythonShell />
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pb-4">
          <p>
            Powered by Circular Learning • Autonomous Code Fixing • Real-Time Monitoring
          </p>
          <p className="text-xs mt-1">
            All activity visible • Code executes in background only • Learning never stops
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
