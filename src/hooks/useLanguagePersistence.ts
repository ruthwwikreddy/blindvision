import { useState, useEffect } from 'react';

export interface LanguageSettings {
  selectedLanguage: string;
  voicePreference: string;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
}

const DEFAULT_SETTINGS: LanguageSettings = {
  selectedLanguage: 'en',
  voicePreference: 'auto',
  speechRate: 0.85,
  speechPitch: 1.0,
  speechVolume: 1.0
};

export const useLanguagePersistence = () => {
  const [settings, setSettings] = useState<LanguageSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('blindvision-language-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Failed to load language settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('blindvision-language-settings', JSON.stringify(settings));
  }, [settings]);

  const updateLanguage = (language: string) => {
    setSettings(prev => ({ ...prev, selectedLanguage: language }));
  };

  const updateVoiceSettings = (updates: Partial<Omit<LanguageSettings, 'selectedLanguage'>>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    updateLanguage,
    updateVoiceSettings,
    resetSettings
  };
};