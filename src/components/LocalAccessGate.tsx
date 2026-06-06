import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, KeyRound, Monitor, Shield, Sparkles } from 'lucide-react';
import { setOpenAiApiKey } from '@/lib/apiKeys';
import { validateOpenAiApiKey } from '@/services/aiService';
import { useToast } from '@/hooks/use-toast';

interface LocalAccessGateProps {
  onAccessGranted: () => void;
}

export const LocalAccessGate = ({ onAccessGranted }: LocalAccessGateProps) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const handleSaveKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed.startsWith('sk-')) {
      toast({
        title: 'Invalid API Key',
        description: 'OpenAI keys start with sk-. Check your key and try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsValidating(true);
    const isValid = await validateOpenAiApiKey(trimmed);
    setIsValidating(false);

    if (!isValid) {
      toast({
        title: 'Key Verification Failed',
        description: 'Could not verify this key with OpenAI. Check the key and your connection.',
        variant: 'destructive',
      });
      return;
    }

    setOpenAiApiKey(trimmed);
    toast({
      title: 'API Key Saved',
      description: 'You can now use Blind Vision on this site.',
    });
    onAccessGranted();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6 animate-fade-in-up">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary mb-2">
            <Eye className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Blind Vision</h1>
          <p className="text-muted-foreground text-lg">AI-powered visual assistance</p>
        </div>

        <Card className="bv-surface-strong shadow-none">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Monitor className="w-5 h-5" />
              Local Version Only
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              The hosted version of Blind Vision is not available on published sites. The full
              experience runs on localhost or your local network IP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
              <p className="font-medium text-foreground">Run locally</p>
              <p className="text-muted-foreground">
                Clone the repo and run <code className="text-foreground bg-secondary px-1.5 py-0.5 rounded">npm run dev</code>, then open{' '}
                <code className="text-foreground bg-secondary px-1.5 py-0.5 rounded">http://localhost:5173</code>
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">or use your own key</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-foreground" />
                <Label htmlFor="gate-api-key" className="font-medium">
                  OpenAI API Key
                </Label>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="gate-api-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="bg-input border-border text-foreground pr-10"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full hover:bg-transparent"
                    onClick={() => setShowKey(!showKey)}
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Stored only in your browser. Never sent to our servers — calls go directly to OpenAI.
              </p>
            </div>

            <Button
              onClick={handleSaveKey}
              disabled={!apiKey.trim() || isValidating}
              className="w-full bv-btn-white rounded-xl text-base py-6 h-auto"
            >
              {isValidating ? (
                'Verifying...'
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Save Key & Continue
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Need a key?{' '}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2 hover:text-primary"
          >
            Create one at OpenAI
          </a>
        </p>
      </div>
    </div>
  );
};
