import { useState } from 'react';
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

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else {
      onComplete(language, detailLevel);
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
              <RadioGroup value={language} onValueChange={setLanguage} className="space-y-3">
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
              <RadioGroup value={detailLevel} onValueChange={setDetailLevel} className="space-y-3">
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