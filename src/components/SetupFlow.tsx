import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Eye, Volume2, Settings, Check } from 'lucide-react';

interface SetupFlowProps {
  onComplete: (language: string, detailLevel: string) => void;
}

const LANGUAGES = [
  { value: 'en', label: 'English', native: 'English' },
  { value: 'hi', label: 'Hindi', native: 'हिंदी' },
  { value: 'te', label: 'Telugu', native: 'తెలుగు' }
];

const DETAIL_LEVELS = [
  {
    value: 'small',
    label: 'Small Detail',
    description: 'Quick, concise descriptions',
    icon: '📝'
  },
  {
    value: 'medium',
    label: 'Medium Detail',
    description: 'Balanced context and clarity',
    icon: '📖'
  },
  {
    value: 'full',
    label: 'Full Detail',
    description: 'Rich, descriptive narration',
    icon: '📚'
  }
];

export const SetupFlow = ({ onComplete }: SetupFlowProps) => {
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState('en');
  const [detailLevel, setDetailLevel] = useState('medium');

  const speakText = useCallback((text: string) => {
    console.log('Setup speaking:', text);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Announce step changes
  useEffect(() => {
    const announceStep = () => {
      if (step === 1) {
        speakText("Welcome to Blind Vision setup. Step 1 of 2: Please choose your preferred language for voice responses.");
      } else {
        speakText("Step 2 of 2: Please select how detailed you want the scene descriptions to be.");
      }
    };

    // Delay to ensure page is ready
    const timer = setTimeout(announceStep, 500);
    return () => clearTimeout(timer);
  }, [step, speakText]);

  // Announce welcome on first load
  useEffect(() => {
    const welcomeTimer = setTimeout(() => {
      speakText("Welcome to Blind Vision, your AI-powered sight assistant. Let's set up your preferences with voice guidance.");
    }, 1000);

    return () => clearTimeout(welcomeTimer);
  }, [speakText]);

  const handleNext = () => {
    if (step === 1) {
      speakText(`${language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : 'Telugu'} selected. Moving to step 2.`);
      setStep(2);
    } else {
      const levelText = detailLevel === 'small' ? 'Brief' : detailLevel === 'medium' ? 'Medium' : 'Full';
      speakText(`${levelText} detail level selected. Setup complete! Starting Blind Vision.`);
      onComplete(language, detailLevel);
    }
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    const lang = LANGUAGES.find(l => l.value === value);
    if (lang) {
      speakText(`${lang.label} selected`);
    }
  };

  const handleDetailChange = (value: string) => {
    setDetailLevel(value);
    const level = DETAIL_LEVELS.find(l => l.value === value);
    if (level) {
      speakText(`${level.label} selected. ${level.description}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* App Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-full mb-4 shadow-glow">
            <Eye className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Blind Vision</h1>
          <p className="text-muted-foreground">Your intelligent visual assistant</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex space-x-2">
            <div className={`w-3 h-3 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-3 h-3 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </div>

        <Card className="border-border shadow-soft">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              {step === 1 ? (
                <>
                  <Volume2 className="w-5 h-5 text-primary" />
                  Choose Your Language
                </>
              ) : (
                <>
                  <Settings className="w-5 h-5 text-primary" />
                  Select Detail Level
                </>
              )}
            </CardTitle>
            <CardDescription>
              {step === 1 
                ? 'Select your preferred language for voice responses'
                : 'Choose how detailed you want the descriptions to be'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {step === 1 ? (
              <RadioGroup value={language} onValueChange={handleLanguageChange} className="space-y-3">
                {LANGUAGES.map((lang) => (
                  <div key={lang.value} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem 
                      value={lang.value} 
                      id={lang.value}
                      className="text-primary border-primary"
                    />
                    <Label 
                      htmlFor={lang.value} 
                      className="flex-1 text-base font-medium cursor-pointer"
                    >
                      <div>{lang.label}</div>
                      <div className="text-sm text-muted-foreground">{lang.native}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <RadioGroup value={detailLevel} onValueChange={handleDetailChange} className="space-y-3">
                {DETAIL_LEVELS.map((level) => (
                  <div key={level.value} className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem 
                      value={level.value} 
                      id={level.value}
                      className="text-primary border-primary"
                    />
                    <Label 
                      htmlFor={level.value} 
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-base font-medium">
                        <span className="text-lg">{level.icon}</span>
                        {level.label}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {level.description}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            <Button 
              onClick={handleNext}
              className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 text-lg py-6"
              size="lg"
            >
              {step === 1 ? (
                'Continue'
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Complete Setup
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          Step {step} of 2 - Setting up your experience
        </div>
      </div>
    </div>
  );
};