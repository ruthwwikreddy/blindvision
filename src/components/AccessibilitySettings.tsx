import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Volume2, Eye, Mic, Vibrate, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AccessibilitySettingsProps {
  onClose: () => void;
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English', voice: 'alloy' },
  { code: 'hi', name: 'Hindi (हिंदी)', voice: 'nova' },
  { code: 'te', name: 'Telugu (తెలుగు)', voice: 'shimmer' },
  { code: 'es', name: 'Spanish (Español)', voice: 'nova' },
  { code: 'fr', name: 'French (Français)', voice: 'shimmer' },
  { code: 'de', name: 'German (Deutsch)', voice: 'echo' },
  { code: 'it', name: 'Italian (Italiano)', voice: 'fable' },
  { code: 'pt', name: 'Portuguese (Português)', voice: 'nova' },
  { code: 'ru', name: 'Russian (Русский)', voice: 'echo' },
  { code: 'ja', name: 'Japanese (日本語)', voice: 'shimmer' },
  { code: 'ko', name: 'Korean (한국어)', voice: 'nova' },
  { code: 'zh', name: 'Chinese (中文)', voice: 'alloy' }
];

export const AccessibilitySettings = ({ onClose, currentLanguage, onLanguageChange }: AccessibilitySettingsProps) => {
  const [speechRate, setSpeechRate] = useState(85);
  const [speechVolume, setSpeechVolume] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const { toast } = useToast();

  const handleLanguageChange = (languageCode: string) => {
    onLanguageChange(languageCode);
    const language = LANGUAGES.find(l => l.code === languageCode);
    toast({
      title: "Language Changed",
      description: `Now using ${language?.name}. Voice will consistently use this language.`,
    });
  };

  const testSpeech = () => {
    const language = LANGUAGES.find(l => l.code === currentLanguage);
    const testText = {
      'en': 'This is a test of the speech synthesis system.',
      'hi': 'यह वाक संश्लेषण प्रणाली का परीक्षण है।',
      'te': 'ఇది వాక్ సంశ్లేషణ వ్యవస్థ యొక్క పరీక్ష.',
      'es': 'Esta es una prueba del sistema de síntesis de voz.',
      'fr': 'Ceci est un test du système de synthèse vocale.',
      'de': 'Dies ist ein Test des Sprachsynthese-Systems.',
      'it': 'Questo è un test del sistema di sintesi vocale.',
      'pt': 'Este é um teste do sistema de síntese de fala.',
      'ru': 'Это тест системы синтеза речи.',
      'ja': 'これは音声合成システムのテストです。',
      'ko': '이것은 음성 합성 시스템의 테스트입니다.',
      'zh': '这是语音合成系统的测试。'
    };
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(testText[currentLanguage as keyof typeof testText] || testText.en);
      utterance.rate = speechRate / 100;
      utterance.volume = speechVolume / 100;
      utterance.lang = currentLanguage === 'hi' ? 'hi-IN' : currentLanguage === 'te' ? 'te-IN' : `${currentLanguage}-US`;
      window.speechSynthesis.speak(utterance);
    }
  };

  const resetSettings = () => {
    setSpeechRate(85);
    setSpeechVolume(100);
    setHighContrast(false);
    setLargeText(false);
    setHapticFeedback(true);
    setAutoSpeak(true);
    toast({
      title: "Settings Reset",
      description: "All accessibility settings have been reset to defaults.",
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto glass border-2 border-primary/30 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-foreground flex items-center justify-center gap-2">
          <Eye className="w-6 h-6 text-primary" />
          Accessibility Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Language Selection */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold text-foreground">Language / भाषा / భాష</Label>
          <Select value={currentLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="glass border-2 border-primary/20 backdrop-blur-sm text-lg h-14">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent className="glass backdrop-blur-md border-2">
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="text-lg p-4">
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Speech Settings */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-primary" />
            Speech Settings
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Speech Rate: {speechRate}%</Label>
              <Slider
                value={[speechRate]}
                onValueChange={(value) => setSpeechRate(value[0])}
                max={150}
                min={50}
                step={5}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label className="text-base font-medium">Volume: {speechVolume}%</Label>
              <Slider
                value={[speechVolume]}
                onValueChange={(value) => setSpeechVolume(value[0])}
                max={100}
                min={10}
                step={5}
                className="mt-2"
              />
            </div>

            <Button 
              onClick={testSpeech}
              variant="outline" 
              size="lg"
              className="w-full glass border-2 border-accent/30 text-accent hover:bg-accent/10 font-semibold"
            >
              <Mic className="w-5 h-5 mr-2" />
              Test Speech
            </Button>
          </div>
        </div>

        {/* Visual Settings */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Visual Settings
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass border border-border/20 rounded-lg">
              <Label htmlFor="high-contrast" className="text-base font-medium">High Contrast Mode</Label>
              <Switch
                id="high-contrast"
                checked={highContrast}
                onCheckedChange={setHighContrast}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 glass border border-border/20 rounded-lg">
              <Label htmlFor="large-text" className="text-base font-medium">Large Text</Label>
              <Switch
                id="large-text"
                checked={largeText}
                onCheckedChange={setLargeText}
              />
            </div>
          </div>
        </div>

        {/* Interaction Settings */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Vibrate className="w-5 h-5 text-primary" />
            Interaction Settings
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass border border-border/20 rounded-lg">
              <Label htmlFor="haptic" className="text-base font-medium">Haptic Feedback</Label>
              <Switch
                id="haptic"
                checked={hapticFeedback}
                onCheckedChange={setHapticFeedback}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 glass border border-border/20 rounded-lg">
              <Label htmlFor="auto-speak" className="text-base font-medium">Auto-speak Descriptions</Label>
              <Switch
                id="auto-speak"
                checked={autoSpeak}
                onCheckedChange={setAutoSpeak}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6">
          <Button
            onClick={resetSettings}
            variant="outline"
            size="lg"
            className="flex-1 glass border-2 border-warning/30 text-warning hover:bg-warning/10 font-semibold"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Reset
          </Button>
          
          <Button
            onClick={onClose}
            size="lg"
            className="flex-1 font-semibold"
          >
            Save & Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};