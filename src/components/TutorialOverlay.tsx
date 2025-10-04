import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  gesture: string;
  audioText: string;
}

interface TutorialOverlayProps {
  onComplete: () => void;
  speakText: (text: string) => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Blind Vision',
    description: 'This app helps you understand your surroundings using AI-powered image analysis.',
    gesture: 'Tap anywhere to continue',
    audioText: 'Welcome to Blind Vision. This app helps you understand your surroundings using AI-powered image analysis. Tap anywhere to continue.'
  },
  {
    title: 'Main Button - Capture & Analyze',
    description: 'The large center button captures images and describes what it sees.',
    gesture: 'Single tap: Capture and analyze\nLong press (1s): Start voice assistant',
    audioText: 'The main button is in the center. Single tap to capture and analyze. Long press for one second to start the voice assistant.'
  },
  {
    title: 'Mode Switching',
    description: 'Switch between Surroundings, Reading, and Navigation modes.',
    gesture: 'Swipe left or right on main button to cycle modes',
    audioText: 'Swipe left or right on the main button to switch between Surroundings mode, Reading mode, and Navigation mode.'
  },
  {
    title: 'Voice Questions',
    description: 'Ask specific questions about what you\'re looking at.',
    gesture: 'Long press main button, then ask your question',
    audioText: 'Long press the main button to start voice mode. After capturing, ask any question about what you see.'
  },
  {
    title: 'Settings & Themes',
    description: 'Access settings to change language, theme, and detail level.',
    gesture: 'Two-finger tap anywhere for settings',
    audioText: 'Tap with two fingers anywhere on the screen to open settings. You can change language, theme, and detail level.'
  },
  {
    title: 'History & Replay',
    description: 'Your recent analyses are saved and can be replayed.',
    gesture: 'Swipe down to view history',
    audioText: 'Swipe down to view your analysis history. You can replay previous descriptions anytime.'
  },
  {
    title: 'Emergency SOS',
    description: 'Quick access to emergency contacts.',
    gesture: 'Triple tap anywhere for emergency panel',
    audioText: 'Triple tap anywhere on the screen to access the emergency S O S panel and contact help quickly.'
  }
];

export const TutorialOverlay = ({ onComplete, speakText }: TutorialOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Speak the tutorial step when it changes
    if (isVisible) {
      speakText(TUTORIAL_STEPS[currentStep].audioText);
    }
  }, [currentStep, isVisible, speakText]);

  const handleNext = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem('tutorial-completed', 'true');
    speakText('Tutorial complete. You\'re ready to start using Blind Vision!');
    setTimeout(onComplete, 500);
  }, [onComplete, speakText]);

  const handleSkip = useCallback(() => {
    speakText('Tutorial skipped.');
    handleComplete();
  }, [handleComplete, speakText]);

  if (!isVisible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-2xl glass border-2 border-primary/30 shadow-neon">
        <CardHeader className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-primary animate-pulse-glow" />
              <CardTitle className="text-2xl font-bold">Tutorial</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="hover:bg-destructive/20"
              aria-label="Skip tutorial"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          
          <p className="text-sm text-muted-foreground mt-2">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-3xl font-bold text-primary animate-fade-in">
              {step.title}
            </h3>
            
            <p className="text-xl text-foreground leading-relaxed animate-fade-in">
              {step.description}
            </p>
            
            <Card className="bg-accent/10 border-accent/30 animate-scale-in">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground uppercase font-semibold mb-2">
                  Gesture
                </p>
                <p className="text-lg font-mono text-accent-foreground whitespace-pre-line">
                  {step.gesture}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1 gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Previous
            </Button>
            
            <Button
              size="lg"
              onClick={handleNext}
              className="flex-1 gap-2 bg-gradient-primary hover:shadow-glow"
            >
              {currentStep === TUTORIAL_STEPS.length - 1 ? 'Get Started' : 'Next'}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Skip Tutorial
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
