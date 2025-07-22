import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a28b3a9635374d03b26ef50e932585c8',
  appName: 'blindvision',
  webDir: 'dist',
  server: {
    url: "https://a28b3a96-3537-4d03-b26e-f50e932585c8.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  plugins: {
    App: {
      launchMode: 'standard'
    },
    Device: {
      allowLocationAccess: true
    }
  },
  android: {
    allowMixedContent: true,
    permissions: [
      'CAMERA',
      'RECORD_AUDIO',
      'INTERNET',
      'ACCESS_NETWORK_STATE',
      'SYSTEM_ALERT_WINDOW',
      'FOREGROUND_SERVICE',
      'WAKE_LOCK',
      'VIBRATE'
    ]
  },
  ios: {
    permissions: [
      'NSCameraUsageDescription',
      'NSMicrophoneUsageDescription'
    ]
  }
};

export default config;