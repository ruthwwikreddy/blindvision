const OPENAI_KEY_STORAGE = 'blindvision-openai-api-key';

export function getOpenAiApiKey(): string | null {
  return localStorage.getItem(OPENAI_KEY_STORAGE);
}

export function setOpenAiApiKey(key: string): void {
  localStorage.setItem(OPENAI_KEY_STORAGE, key.trim());
}

export function removeOpenAiApiKey(): void {
  localStorage.removeItem(OPENAI_KEY_STORAGE);
}

export function hasUserApiKey(): boolean {
  const key = getOpenAiApiKey();
  return !!key && key.startsWith('sk-') && key.length > 20;
}

export function maskApiKey(key: string): string {
  if (key.length <= 11) return '••••••••';
  return `${key.slice(0, 7)}••••••••${key.slice(-4)}`;
}
