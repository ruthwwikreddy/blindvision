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
    'bn': 'bn-IN', // Bengali
    'te': 'te-IN', // Telugu
    'mr': 'mr-IN', // Marathi
    'ta': 'ta-IN', // Tamil
    'gu': 'gu-IN', // Gujarati
    'kn': 'kn-IN', // Kannada
    'ml': 'ml-IN', // Malayalam
    'pa': 'pa-IN', // Punjabi
    'or': 'or-IN', // Odia
    'ur': 'ur-IN', // Urdu
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
