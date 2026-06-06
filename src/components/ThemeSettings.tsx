import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Palette } from 'lucide-react';
import { useThemeMode, type ThemeMode } from '@/hooks/useThemeMode';

interface ThemeSettingsProps {
  onBackClick: () => void;
  speakText: (text: string) => void;
}

const THEMES: { id: ThemeMode; label: string; description: string }[] = [
  { id: 'default', label: 'Black & White', description: 'Default high-contrast monochrome' },
  { id: 'high-contrast-light', label: 'Light Mode', description: 'White background, black text' },
  { id: 'high-contrast-dark', label: 'Dark Mode', description: 'Black background, white text' },
  { id: 'yellow-black', label: 'Yellow on Black', description: 'Optimized for low vision' },
];

export const ThemeSettings = ({ onBackClick, speakText }: ThemeSettingsProps) => {
  const { themeMode, setThemeMode, themeName } = useThemeMode();

  const selectTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    const label = THEMES.find((t) => t.id === mode)?.label ?? themeName;
    speakText(`${label} theme selected`);
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
          <h1 className="text-xl font-bold tracking-tight">Theme</h1>
        </div>

        <Card className="bv-surface shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="w-5 h-5" />
              Accessibility Themes
            </CardTitle>
            <CardDescription>Current: {themeName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => selectTheme(theme.id)}
                aria-pressed={themeMode === theme.id}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  themeMode === theme.id
                    ? 'border-foreground bg-foreground/10'
                    : 'border-foreground/15 hover:border-foreground/30'
                }`}
              >
                <p className="font-medium text-foreground">{theme.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{theme.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
