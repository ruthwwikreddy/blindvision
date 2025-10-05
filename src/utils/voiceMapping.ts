// Language-specific TTS voice mapping
export const getVoiceForLanguage = (language: string): string => {
  const voiceMap: Record<string, string> = {
    'en': 'en-US', // English
    'es': 'es-ES', // Spanish
    'fr': 'fr-FR', // French
    'de': 'de-DE', // German
    'it': 'it-IT', // Italian
    'pt': 'pt-PT', // Portuguese
    'zh': 'zh-CN', // Chinese (Simplified)
    'ja': 'ja-JP', // Japanese
    'ko': 'ko-KR', // Korean
    'ar': 'ar-SA', // Arabic
    'hi': 'hi-IN', // Hindi
  };

  return voiceMap[language] || 'en-US';
};

// Get available voices for current language
export const getAvailableVoices = async (language: string): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    let voices = synth.getVoices();
    
    if (voices.length > 0) {
      const targetLang = getVoiceForLanguage(language);
      const filteredVoices = voices.filter(voice => voice.lang.startsWith(targetLang.split('-')[0]));
      resolve(filteredVoices.length > 0 ? filteredVoices : voices);
    } else {
      synth.onvoiceschanged = () => {
        voices = synth.getVoices();
        const targetLang = getVoiceForLanguage(language);
        const filteredVoices = voices.filter(voice => voice.lang.startsWith(targetLang.split('-')[0]));
        resolve(filteredVoices.length > 0 ? filteredVoices : voices);
      };
    }
  });
};
