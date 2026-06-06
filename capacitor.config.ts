import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blindvision.app',
  appName: 'Blind Vision',
  webDir: 'dist',
  plugins: {
    App: {
      launchMode: 'standard',
    },
    Device: {
      allowLocationAccess: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#FFFFFF',
      sound: 'beep.wav',
    },
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
      'POST_NOTIFICATIONS',
    ],
  },
  ios: {
    permissions: ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription', 'NSBackgroundModes'],
  },
};

export default config;
