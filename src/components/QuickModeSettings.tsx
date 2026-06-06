import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Zap, Eye, ArrowLeft } from 'lucide-react';

interface QuickModeSettingsProps {
  isQuickMode: boolean;
  onQuickModeChange: (enabled: boolean) => void;
  onBackClick: () => void;
  speakText: (text: string) => void;
}

export const QuickModeSettings = ({
  isQuickMode,
  onQuickModeChange,
  onBackClick,
  speakText,
}: QuickModeSettingsProps) => {
  const [justChanged, setJustChanged] = useState(false);

  const handleQuickModeToggle = (enabled: boolean) => {
    onQuickModeChange(enabled);
    setJustChanged(true);
    speakText(
      enabled
        ? 'Quick mode enabled. Faster object identification.'
        : 'Quick mode disabled. Full scene descriptions restored.'
    );
    setTimeout(() => setJustChanged(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-4 safe-area-top safe-area-bottom">
      <div className="max-w-md mx-auto space-y-5">
        <div className="flex items-center gap-4 pt-2">
          <Button
            onClick={onBackClick}
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 min-h-0 min-w-0 border-foreground/30"
            aria-label="Back to settings"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Quick Mode</h1>
        </div>

        <Card className="bv-surface shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {isQuickMode ? <Zap className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              Quick Object Recognition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <Label htmlFor="quick-mode" className="text-base font-medium">
                Enable Quick Mode
              </Label>
              <Switch id="quick-mode" checked={isQuickMode} onCheckedChange={handleQuickModeToggle} />
            </div>

            <Separator className="bg-foreground/10" />

            <div className="space-y-2">
              <h3 className="font-semibold">{isQuickMode ? 'Quick Mode Active' : 'Full Mode Active'}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isQuickMode
                  ? 'Instantly identify key objects without full scene descriptions. Faster, less detail.'
                  : 'Complete descriptions of your surroundings including context, text, and safety info.'}
              </p>
            </div>

            {justChanged && (
              <p className="text-sm text-foreground font-medium rounded-xl border border-foreground/20 p-3" role="status" aria-live="polite">
                Saved — applies to your next capture.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bv-surface shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-1">Quick</p>
              <p className="text-muted-foreground italic p-3 rounded-xl border border-foreground/10">
                &ldquo;Person sitting, wooden chair, coffee mug, phone on table&rdquo;
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Full</p>
              <p className="text-muted-foreground italic p-3 rounded-xl border border-foreground/10">
                &ldquo;A person sits in a brown wooden chair at a round table with a steaming mug and a phone face-down…&rdquo;
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
