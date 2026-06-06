import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Eye, EyeOff, KeyRound, Shield, Trash2 } from 'lucide-react';
import { getOpenAiApiKey, maskApiKey, removeOpenAiApiKey, setOpenAiApiKey } from '@/lib/apiKeys';
import { isLocalEnvironment } from '@/lib/environment';
import { validateOpenAiApiKey } from '@/services/aiService';
import { useToast } from '@/hooks/use-toast';

interface ApiKeySettingsProps {
  onBackClick: () => void;
  speakText: (text: string) => void;
}

export const ApiKeySettings = ({ onBackClick, speakText }: ApiKeySettingsProps) => {
  const existingKey = getOpenAiApiKey();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();
  const isLocal = isLocalEnvironment();

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed.startsWith('sk-')) {
      toast({ title: 'Invalid key', description: 'OpenAI keys start with sk-.', variant: 'destructive' });
      return;
    }

    setIsValidating(true);
    const isValid = await validateOpenAiApiKey(trimmed);
    setIsValidating(false);

    if (!isValid) {
      toast({ title: 'Verification failed', description: 'Could not verify this key.', variant: 'destructive' });
      return;
    }

    setOpenAiApiKey(trimmed);
    setApiKey('');
    speakText('API key saved successfully');
    toast({ title: 'Saved', description: 'Your OpenAI API key has been updated.' });
  };

  const handleRemove = () => {
    removeOpenAiApiKey();
    speakText('API key removed');
    toast({ title: 'Removed', description: 'Your API key has been cleared from this device.' });
    if (!isLocal) onBackClick();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button onClick={onBackClick} variant="outline" size="icon" className="rounded-full h-10 w-10 min-h-0 min-w-0 border-foreground/30" aria-label="Back to settings">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">API Key</h1>
        </div>

        <Card className="bv-surface shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              OpenAI API Key
            </CardTitle>
            <CardDescription>
              {isLocal
                ? 'Optional on localhost — the app uses built-in server keys. Add your own to override.'
                : 'Required on published sites. Your key is stored locally and used for direct OpenAI calls.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingKey && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Current key</p>
                  <p className="text-sm font-mono text-muted-foreground">{maskApiKey(existingKey)}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleRemove} className="gap-1 rounded-xl border-foreground/30">
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="settings-api-key">{existingKey ? 'Replace key' : 'Enter key'}</Label>
              <div className="relative">
                <Input
                  id="settings-api-key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="pr-10 bg-input border-border"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full hover:bg-transparent"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Stored only in your browser. Calls go directly to OpenAI when a key is set.
            </p>

            <Button
              onClick={handleSave}
              disabled={!apiKey.trim() || isValidating}
              className="w-full bv-btn-white rounded-xl"
            >
              {isValidating ? 'Verifying...' : existingKey ? 'Update Key' : 'Save Key'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
