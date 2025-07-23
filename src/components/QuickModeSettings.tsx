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
  speakText 
}: QuickModeSettingsProps) => {
  const [justChanged, setJustChanged] = useState(false);

  const handleQuickModeToggle = (enabled: boolean) => {
    onQuickModeChange(enabled);
    setJustChanged(true);
    
    const message = enabled 
      ? "Quick Object Recognition Mode enabled. Faster object identification without full scene descriptions."
      : "Quick Mode disabled. Full scene descriptions will be provided.";
    
    speakText(message);
    
    setTimeout(() => setJustChanged(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={onBackClick}
            variant="outline"
            size="icon"
            className="border-border hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Quick Mode</h1>
        </div>

        {/* Quick Mode Card */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {isQuickMode ? (
                <Zap className="w-5 h-5 text-accent" />
              ) : (
                <Eye className="w-5 h-5 text-primary" />
              )}
              Quick Object Recognition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="quick-mode" className="text-base font-medium">
                Enable Quick Mode
              </Label>
              <Switch
                id="quick-mode"
                checked={isQuickMode}
                onCheckedChange={handleQuickModeToggle}
                className="data-[state=checked]:bg-accent"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  {isQuickMode ? 'Quick Mode Active' : 'Full Mode Active'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isQuickMode 
                    ? "Instantly identify key objects like chair, person, door, or sign without generating full scene descriptions. Faster results, less detail."
                    : "Generate complete, detailed descriptions of your entire surroundings including context, relationships, and environment details."
                  }
                </p>
              </div>

              {isQuickMode && (
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                  <h4 className="font-medium text-accent mb-2">Quick Mode Benefits:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Faster response times</li>
                    <li>• Immediate object identification</li>
                    <li>• Perfect for navigation assistance</li>
                    <li>• Lower data usage</li>
                  </ul>
                </div>
              )}
            </div>

            {justChanged && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-primary font-medium">
                  Settings saved! Changes will apply to your next capture.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Example Outputs */}
        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Example Outputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-accent mb-2">Quick Mode:</h4>
              <p className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded">
                "Person sitting, wooden chair, coffee mug, smartphone on table"
              </p>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium text-primary mb-2">Full Mode:</h4>
              <p className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded">
                "A person is sitting comfortably in a brown wooden chair at a small round table. On the table, there's a white coffee mug with steam rising from it and a black smartphone lying face down. The setting appears to be a cozy café with warm lighting..."
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};