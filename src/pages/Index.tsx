import { useState, useEffect } from 'react';
import { SetupFlow } from '@/components/SetupFlow';
import { EnhancedMainInterface } from '@/components/EnhancedMainInterface';
import { SettingsMenu } from '@/components/SettingsMenu';
import { LocalAccessGate } from '@/components/LocalAccessGate';
import { isLocalEnvironment } from '@/lib/environment';
import { hasUserApiKey } from '@/lib/apiKeys';

const Index = () => {
  const [showSetup, setShowSetup] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState('en');
  const [detailLevel, setDetailLevel] = useState('medium');
  const [isQuickMode, setIsQuickMode] = useState(() => localStorage.getItem('blindvision-quick-mode') === 'true');
  const [hasAccess, setHasAccess] = useState(() => isLocalEnvironment() || hasUserApiKey());

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('blindvision-language');
    const savedDetailLevel = localStorage.getItem('blindvision-detail-level');
    const setupCompleted = localStorage.getItem('blindvision-setup-complete');

    const savedQuickMode = localStorage.getItem('blindvision-quick-mode');
    if (savedQuickMode === 'true') setIsQuickMode(true);

    if (setupCompleted && savedLanguage && savedDetailLevel) {
      setLanguage(savedLanguage);
      setDetailLevel(savedDetailLevel);
      setShowSetup(false);
    }
  }, []);

  if (!hasAccess) {
    return <LocalAccessGate onAccessGranted={() => setHasAccess(true)} />;
  }

  const handleSetupComplete = (selectedLanguage: string, selectedDetailLevel: string) => {
    setLanguage(selectedLanguage);
    setDetailLevel(selectedDetailLevel);
    setShowSetup(false);
    
    // Save settings to localStorage
    localStorage.setItem('blindvision-language', selectedLanguage);
    localStorage.setItem('blindvision-detail-level', selectedDetailLevel);
    localStorage.setItem('blindvision-setup-complete', 'true');
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleQuickModeChange = (enabled: boolean) => {
    setIsQuickMode(enabled);
    localStorage.setItem('blindvision-quick-mode', String(enabled));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {showSetup ? (
        <SetupFlow onComplete={handleSetupComplete} speakText={speakText} />
      ) : showSettings ? (
        <SettingsMenu 
          language={language}
          detailLevel={detailLevel}
          isQuickMode={isQuickMode}
          onBackClick={() => setShowSettings(false)}
          onLanguageDetailUpdate={(lang, detail) => {
            setLanguage(lang);
            setDetailLevel(detail);
            localStorage.setItem('blindvision-language', lang);
            localStorage.setItem('blindvision-detail-level', detail);
          }}
          onQuickModeChange={handleQuickModeChange}
          speakText={speakText}
        />
      ) : (
        <div id="main-content">
        <EnhancedMainInterface 
          language={language}
          detailLevel={detailLevel}
          isQuickMode={isQuickMode}
          onSettingsClick={() => setShowSettings(true)}
          onQuickModeToggle={() => handleQuickModeChange(!isQuickMode)}
        />
        </div>
      )}
    </div>
  );
};

export default Index;
