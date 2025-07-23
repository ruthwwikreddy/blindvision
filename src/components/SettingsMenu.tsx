import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Globe, Info, Zap, Palette } from 'lucide-react';
import { QuickModeSettings } from './QuickModeSettings';
import { FloatingIconSettings } from './FloatingIconSettings';
import { SetupFlow } from './SetupFlow';

interface SettingsMenuProps {
  language: string;
  detailLevel: string;
  isQuickMode: boolean;
  onBackClick: () => void;
  onLanguageDetailUpdate: (lang: string, detail: string) => void;
  onQuickModeChange: (enabled: boolean) => void;
  speakText: (text: string) => void;
}

type SettingsView = 'main' | 'language' | 'quick-mode' | 'icon-settings';

export const SettingsMenu = ({ 
  language, 
  detailLevel, 
  isQuickMode,
  onBackClick, 
  onLanguageDetailUpdate,
  onQuickModeChange,
  speakText 
}: SettingsMenuProps) => {
  const [currentView, setCurrentView] = useState<SettingsView>('main');

  const handleViewChange = (view: SettingsView) => {
    setCurrentView(view);
    
    const viewMessages = {
      'main': 'Settings menu',
      'language': 'Language and detail settings',
      'quick-mode': 'Quick mode settings',
      'icon-settings': 'Floating icon settings'
    };
    
    speakText(viewMessages[view]);
  };

  const handleBackToMain = () => {
    if (currentView === 'main') {
      onBackClick();
    } else {
      setCurrentView('main');
    }
  };

  if (currentView === 'language') {
    return (
        <SetupFlow 
          onComplete={onLanguageDetailUpdate}
          isSettings={true}
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

  if (currentView === 'icon-settings') {
    return (
      <FloatingIconSettings
        onBackClick={handleBackToMain}
        speakText={speakText}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={handleBackToMain}
            variant="outline"
            size="icon"
            className="border-border hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>

        {/* Settings Options */}
        <div className="space-y-4">
          <Card 
            className="border-border shadow-soft cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleViewChange('language')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-primary" />
                Language & Detail Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Current Language: <span className="text-primary font-medium">
                  {language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : 'Telugu'}
                </span></p>
                <p>Detail Level: <span className="text-primary font-medium">
                  {detailLevel === 'low' ? 'Brief' : 
                   detailLevel === 'medium' ? 'Medium' : 'Detailed'}
                </span></p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-border shadow-soft cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleViewChange('quick-mode')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Zap className={`w-5 h-5 ${isQuickMode ? 'text-accent' : 'text-muted-foreground'}`} />
                Quick Object Recognition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Status: <span className={`font-medium ${isQuickMode ? 'text-accent' : 'text-muted-foreground'}`}>
                  {isQuickMode ? 'Enabled' : 'Disabled'}
                </span></p>
                <p>
                  {isQuickMode 
                    ? 'Fast object identification without full descriptions'
                    : 'Full scene descriptions with context and details'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-border shadow-soft cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleViewChange('icon-settings')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-primary" />
                Floating Icon Personalization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p>Customize icon style, transparency, and feedback options</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Status Summary */}
        <Card className="border-border shadow-soft bg-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <Info className="w-5 h-5 text-primary" />
              Current Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-foreground">Language</p>
                <p className="text-muted-foreground">
                  {language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : 'Telugu'}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Detail Level</p>
                <p className="text-muted-foreground">
                  {detailLevel === 'low' ? 'Brief' : 
                   detailLevel === 'medium' ? 'Medium' : 'Detailed'}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Recognition Mode</p>
                <p className={isQuickMode ? 'text-accent' : 'text-muted-foreground'}>
                  {isQuickMode ? 'Quick Objects' : 'Full Descriptions'}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Floating Icon</p>
                <p className="text-muted-foreground">Customizable</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};