import { useState, useEffect } from 'react';
import { SetupFlow } from '@/components/SetupFlow';
import { MainInterface } from '@/components/MainInterface';

const Index = () => {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [language, setLanguage] = useState('en');
  const [detailLevel, setDetailLevel] = useState('medium');

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('blindvision-language');
    const savedDetailLevel = localStorage.getItem('blindvision-detail-level');
    const setupCompleted = localStorage.getItem('blindvision-setup-complete');

    if (setupCompleted && savedLanguage && savedDetailLevel) {
      setLanguage(savedLanguage);
      setDetailLevel(savedDetailLevel);
      setIsSetupComplete(true);
    }
  }, []);

  const handleSetupComplete = (selectedLanguage: string, selectedDetailLevel: string) => {
    setLanguage(selectedLanguage);
    setDetailLevel(selectedDetailLevel);
    setIsSetupComplete(true);
    
    // Save settings to localStorage
    localStorage.setItem('blindvision-language', selectedLanguage);
    localStorage.setItem('blindvision-detail-level', selectedDetailLevel);
    localStorage.setItem('blindvision-setup-complete', 'true');
  };

  const handleSettingsClick = () => {
    // Reset setup to allow reconfiguration
    setIsSetupComplete(false);
    localStorage.removeItem('blindvision-setup-complete');
  };

  if (!isSetupComplete) {
    return <SetupFlow onComplete={handleSetupComplete} />;
  }

  return (
    <MainInterface 
      language={language}
      detailLevel={detailLevel}
      onSettingsClick={handleSettingsClick}
    />
  );
};

export default Index;
