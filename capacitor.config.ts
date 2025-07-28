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
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#667eea",
      sound: "beep.wav"
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
      'FOREGROUND_SERVICE_CAMERA',
      'WAKE_LOCK',
      'VIBRATE',
      'DISABLE_KEYGUARD',
      'RECEIVE_BOOT_COMPLETED',
      'POST_NOTIFICATIONS'
    ]
  },
  ios: {
    permissions: [
      'NSCameraUsageDescription',
      'NSMicrophoneUsageDescription',
      'NSBackgroundModes'
    ]
  }
};

export default config;