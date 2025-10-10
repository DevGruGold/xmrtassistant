import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Eye, EyeOff, ExternalLink, AlertCircle } from 'lucide-react';
import { useCredentialSession } from '@/contexts/CredentialSessionContext';

interface DiscreetCredentialPromptProps {
  service: string;
  credentialType: string;
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
  helpUrl?: string;
  requiredScopes?: string[];
  attempted?: string[];
}

export const DiscreetCredentialPrompt: React.FC<DiscreetCredentialPromptProps> = ({
  service,
  credentialType,
  message,
  onDismiss,
  onRetry,
  helpUrl,
  requiredScopes,
  attempted
}) => {
  const [credential, setCredential] = useState('');
  const [showCredential, setShowCredential] = useState(false);
  const [sessionOnly, setSessionOnly] = useState(true);
  const { setCredential: saveToSession } = useCredentialSession();

  const serviceIcons: Record<string, string> = {
    github: '🔧',
    openai: '🤖',
    deepseek: '🧠',
    lovable_ai: '💝',
    elevenlabs: '🔊'
  };

  const handleProvide = () => {
    if (!credential.trim()) return;

    if (sessionOnly) {
      // Store in session only
      saveToSession(service, credential);
      console.log(`✅ ${service} credential saved to session`);
    } else {
      // TODO: Persist to backend (future enhancement)
      saveToSession(service, credential);
      console.log(`✅ ${service} credential would be saved permanently (not implemented yet)`);
    }

    onRetry?.();
    setCredential('');
    onDismiss();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <Card className="w-[400px] p-4 shadow-lg border-warning/20 bg-card">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{serviceIcons[service] || '🔐'}</span>
            <div>
              <h3 className="font-semibold text-sm">
                {service.charAt(0).toUpperCase() + service.slice(1).replace('_', ' ')} Access Needed
              </h3>
              {attempted && attempted.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Tried {attempted.length} approach{attempted.length > 1 ? 'es' : ''}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          {message}
        </p>

        {requiredScopes && requiredScopes.length > 0 && (
          <div className="mb-3 p-2 bg-muted rounded-md">
            <p className="text-xs font-medium mb-1">Required scopes:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {requiredScopes.map(scope => (
                <li key={scope}>• {scope}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Input
              type={showCredential ? 'text' : 'password'}
              placeholder={`Enter your ${credentialType}`}
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleProvide()}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setShowCredential(!showCredential)}
            >
              {showCredential ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="session-only"
              checked={sessionOnly}
              onChange={(e) => setSessionOnly(e.target.checked)}
              className="rounded border-input"
            />
            <label htmlFor="session-only" className="text-xs text-muted-foreground cursor-pointer">
              Use for this session only (recommended)
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleProvide}
              disabled={!credential.trim()}
              className="flex-1"
              size="sm"
            >
              Provide & Retry
            </Button>
            {helpUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(helpUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <p>
              Your credential won't be logged or permanently stored unless you uncheck "session only"
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
