import { useState, useEffect } from 'react';

export interface PrivacySettings {
  localProcessing: boolean;
  privacyMode: boolean;
  autoDelete: boolean;
  anonymousStats: boolean;
  dataRetention: 'immediate' | 'hour' | 'day' | 'week' | 'month';
}

const DEFAULT_PRIVACY: PrivacySettings = {
  localProcessing: false,
  privacyMode: true,
  autoDelete: true,
  anonymousStats: false,
  dataRetention: 'immediate'
};

export const usePrivacySettings = () => {
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_PRIVACY);

  useEffect(() => {
    const saved = localStorage.getItem('blindvision-privacy-settings');
    if (saved) {
      try {
        setSettings({ ...DEFAULT_PRIVACY, ...JSON.parse(saved) });
      } catch (error) {
        console.error('Failed to load privacy settings:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('blindvision-privacy-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<PrivacySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_PRIVACY);
  };

  return { settings, updateSettings, resetSettings };
};