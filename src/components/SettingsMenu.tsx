import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Globe, HardDrive, Info, KeyRound, Palette, Smartphone, Trash2, Zap } from 'lucide-react';
import { QuickModeSettings } from './QuickModeSettings';
import { FloatingIconSettings } from './FloatingIconSettings';
import { ApiKeySettings } from './ApiKeySettings';
import { ThemeSettings } from './ThemeSettings';
import { SettingsRow } from './SettingsRow';
import { SetupFlow } from './SetupFlow';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { hasUserApiKey } from '@/lib/apiKeys';
import { formatDetailLevel } from '@/lib/detailLevel';
import { isLocalEnvironment } from '@/lib/environment';

interface SettingsMenuProps {
  language: string;
  detailLevel: string;
  isQuickMode: boolean;
  onBackClick: () => void;
  onLanguageDetailUpdate: (lang: string, detail: string) => void;
  onQuickModeChange: (enabled: boolean) => void;
  speakText: (text: string) => void;
}

type SettingsView = 'main' | 'language' | 'quick-mode' | 'icon-settings' | 'api-key' | 'theme';

const languageLabel = (code: string) =>
  code === 'en' ? 'English' : code === 'hi' ? 'Hindi' : code === 'te' ? 'Telugu' : code;

export const SettingsMenu = ({
  language,
  detailLevel,
  isQuickMode,
  onBackClick,
  onLanguageDetailUpdate,
  onQuickModeChange,
  speakText,
}: SettingsMenuProps) => {
  const [currentView, setCurrentView] = useState<SettingsView>('main');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { cache, clearCache, getCacheSize } = useOfflineCache();

  const handleViewChange = (view: SettingsView) => {
    setCurrentView(view);
    const viewMessages: Record<SettingsView, string> = {
      main: 'Settings menu',
      language: 'Language and detail settings',
      'quick-mode': 'Quick mode settings',
      'icon-settings': 'Floating icon settings',
      'api-key': 'API key settings',
      theme: 'Theme settings',
    };
    speakText(viewMessages[view]);
  };

  const handleBackToMain = () => {
    if (currentView === 'main') onBackClick();
    else setCurrentView('main');
  };

  const handleClearCache = () => {
    clearCache();
    setShowClearConfirm(false);
    speakText('Offline cache cleared');
  };

  if (currentView === 'language') {
    return (
      <SetupFlow
        onComplete={onLanguageDetailUpdate}
        onBack={handleBackToMain}
        isSettings
        currentLanguage={language}
        currentDetailLevel={detailLevel}
        speakText={speakText}
      />
    );
  }

  if (currentView === 'quick-mode') {
    return (
      <QuickModeSettings
        isQuickMode={isQuickMode}
        onQuickModeChange={onQuickModeChange}
        onBackClick={handleBackToMain}
        speakText={speakText}
      />
    );
  }

  if (currentView === 'theme') {
    return <ThemeSettings onBackClick={handleBackToMain} speakText={speakText} />;
  }

  if (currentView === 'icon-settings') {
    return <FloatingIconSettings onBackClick={handleBackToMain} speakText={speakText} />;
  }

  if (currentView === 'api-key') {
    return <ApiKeySettings onBackClick={handleBackToMain} speakText={speakText} />;
  }

  return (
    <div className="min-h-screen bg-background p-4 safe-area-top safe-area-bottom">
      <div className="max-w-md mx-auto space-y-5">
        <div className="flex items-center gap-4 pt-2">
          <Button
            onClick={handleBackToMain}
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 min-h-0 min-w-0 border-foreground/30"
            aria-label="Back to app"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        </div>

        <nav className="space-y-2" aria-label="Settings sections">
          <SettingsRow
            icon={Globe}
            title="Language & Detail"
            meta={`${languageLabel(language)} · ${formatDetailLevel(detailLevel)}`}
            onClick={() => handleViewChange('language')}
          />
          <SettingsRow
            icon={Zap}
            title="Quick Recognition"
            meta={isQuickMode ? 'Enabled — fast object IDs' : 'Disabled — full descriptions'}
            onClick={() => handleViewChange('quick-mode')}
          />
          <SettingsRow
            icon={Palette}
            title="Theme"
            description="Black & white, high contrast, yellow on black"
            onClick={() => handleViewChange('theme')}
          />
          <SettingsRow
            icon={KeyRound}
            title="OpenAI API Key"
            meta={
              hasUserApiKey()
                ? 'Custom key configured'
                : isLocalEnvironment()
                  ? 'Using server keys'
                  : 'Required on published sites'
            }
            onClick={() => handleViewChange('api-key')}
          />
          <SettingsRow
            icon={Smartphone}
            title="Floating Icon"
            description="Android overlay customization (native app)"
            onClick={() => handleViewChange('icon-settings')}
          />
        </nav>

        <Card className="bv-surface-strong shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="w-4 h-4" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Language</p>
              <p className="font-medium">{languageLabel(language)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Detail</p>
              <p className="font-medium">{formatDetailLevel(detailLevel)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mode</p>
              <p className="font-medium">{isQuickMode ? 'Quick' : 'Full'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Environment</p>
              <p className="font-medium">{isLocalEnvironment() ? 'Local' : 'Remote'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bv-surface shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="w-4 h-4" />
              Offline Cache
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cached analyses</span>
              <span className="font-mono">{cache.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Storage</span>
              <span className="font-mono">{getCacheSize()} KB</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              disabled={cache.length === 0}
              className="w-full gap-2 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
              Clear Cache
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className="bv-surface-strong border-foreground/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear offline cache?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {cache.length} saved {cache.length === 1 ? 'analysis' : 'analyses'}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCache} className="bv-btn-white rounded-xl">
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
