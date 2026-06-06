import { Capacitor } from '@capacitor/core';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

function isPrivateIp(hostname: string): boolean {
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return false;
}

export function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  if (Capacitor.isNativePlatform()) return true;

  const hostname = window.location.hostname.toLowerCase();
  if (LOCAL_HOSTNAMES.has(hostname)) return true;
  if (isPrivateIp(hostname)) return true;

  return false;
}

export function getEnvironmentLabel(): string {
  if (Capacitor.isNativePlatform()) return 'native app';
  if (isLocalEnvironment()) return 'local development';
  return 'published site';
}
