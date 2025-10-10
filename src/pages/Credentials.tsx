import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAPIKeyHealth } from '@/services/credentialManager';
import { GeminiAPIKeyInput } from '@/components/GeminiAPIKeyInput';
import { OpenAIAPIKeyInput } from '@/components/OpenAIAPIKeyInput';

export default function Credentials() {
  const { health, loading, refresh } = useAPIKeyHealth();

  const getHealthIcon = (isHealthy: boolean, expiryWarning: boolean) => {
    if (expiryWarning) return <Clock className="h-5 w-5 text-warning" />;
    if (isHealthy) return <CheckCircle className="h-5 w-5 text-success" />;
    return <AlertCircle className="h-5 w-5 text-destructive" />;
  };

  const getHealthBadge = (isHealthy: boolean, expiryWarning: boolean, daysLeft?: number | null) => {
    if (expiryWarning && daysLeft !== null) {
      return <Badge variant="outline" className="border-warning text-warning">Expires in {daysLeft}d</Badge>;
    }
    if (isHealthy) {
      return <Badge variant="outline" className="border-success text-success">Healthy</Badge>;
    }
    return <Badge variant="outline" className="border-destructive text-destructive">Unavailable</Badge>;
  };

  const serviceInfo: Record<string, { name: string; helpUrl: string; description: string }> = {
    github: {
      name: 'GitHub',
      helpUrl: 'https://github.com/settings/tokens/new?scopes=repo,read:org',
      description: 'Repository management, discussions, and issues'
    },
    openai: {
      name: 'OpenAI',
      helpUrl: 'https://platform.openai.com/api-keys',
      description: 'GPT models for advanced AI capabilities'
    },
    deepseek: {
      name: 'DeepSeek',
      helpUrl: 'https://platform.deepseek.com/',
      description: 'Alternative AI model with strong reasoning'
    },
    lovable_ai: {
      name: 'Lovable AI',
      helpUrl: 'https://docs.lovable.dev/features/ai',
      description: 'Gemini & GPT models via AI Gateway'
    },
    elevenlabs: {
      name: 'ElevenLabs',
      helpUrl: 'https://elevenlabs.io/app/settings/api-keys',
      description: 'High-quality text-to-speech'
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">API Credentials</h1>
            <p className="text-muted-foreground mt-1">
              Manage your API keys and monitor service health
            </p>
          </div>
          <Button onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>

        {/* Service Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {health.map((service) => {
            const info = serviceInfo[service.service_name];
            if (!info) return null;

            return (
              <Card key={service.service_name} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getHealthIcon(service.is_healthy, service.expiry_warning)}
                    <h3 className="font-semibold">{info.name}</h3>
                  </div>
                  {getHealthBadge(service.is_healthy, service.expiry_warning, service.days_until_expiry)}
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {info.description}
                </p>

                {service.error_message && (
                  <div className="text-xs text-destructive mb-2">
                    {service.error_message}
                  </div>
                )}

                {service.last_checked && (
                  <div className="text-xs text-muted-foreground mb-3">
                    Last checked: {new Date(service.last_checked).toLocaleString()}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(info.helpUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Get {service.key_type || 'Key'}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Quick Setup - Existing Components */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Quick Setup</h2>
          
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">OpenAI API Key</h3>
            <OpenAIAPIKeyInput />
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Gemini API Key</h3>
            <GeminiAPIKeyInput />
          </Card>
        </div>

        {/* Information */}
        <Card className="p-6 bg-muted/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Session-only credentials:</strong> Provide credentials in-app as needed. They won't be stored permanently.
              </p>
              <p>
                <strong>Backend secrets:</strong> Configured in Supabase edge function settings for persistent use.
              </p>
              <p>
                <strong>Automatic fallback:</strong> The system will try multiple services before asking for credentials.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
