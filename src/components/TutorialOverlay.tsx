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
    description: 'This app describes your surroundings using AI-powered camera analysis and voice feedback.',
    gesture: 'Tap Next to continue',
    audioText: 'Welcome to Blind Vision. This app describes your surroundings using AI camera analysis and voice feedback.',
  },
  {
    title: 'Capture & Analyze',
    description: 'The large white button captures what your camera sees and reads the description aloud.',
    gesture: 'Single tap: Capture and analyze\nLong press: Voice assistant',
    audioText: 'Tap the large white button to capture and analyze. Long press for one second to start the voice assistant.',
  },
  {
    title: 'Voice Questions',
    description: 'Ask specific questions about what you are looking at after capturing an image.',
    gesture: 'Long press capture, then speak your question',
    audioText: 'Long press the capture button to enter voice mode. After the image is captured, ask any question about what you see.',
  },
  {
    title: 'Settings & Themes',
    description: 'Change language, detail level, theme, and API key from the settings menu.',
    gesture: 'Tap the gear icon in the top right',
    audioText: 'Open settings using the gear icon in the top right corner. You can change language, detail level, theme, and your API key.',
  },
  {
    title: 'History & Emergency',
    description: 'Replay past analyses from history. Use the SOS button or Emergency panel for help nearby.',
    gesture: 'Scroll down for history · Tap SOS for emergency',
    audioText: 'Scroll down to view analysis history and replay descriptions. Use the S O S button in the header or the emergency panel to find help nearby.',
  },
];

export const TutorialOverlay = ({ onComplete, speakText }: TutorialOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (isVisible) speakText(TUTORIAL_STEPS[currentStep].audioText);
  }, [currentStep, isVisible, speakText]);

  const handleComplete = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem('tutorial-completed', 'true');
    speakText("Tutorial complete. You're ready to use Blind Vision.");
    setTimeout(onComplete, 500);
  }, [onComplete, speakText]);

  const handleNext = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) setCurrentStep((prev) => prev + 1);
    else handleComplete();
  }, [currentStep, handleComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    speakText('Tutorial skipped.');
    handleComplete();
  }, [handleComplete, speakText]);

  if (!isVisible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const stepNumber = currentStep + 1;
  const totalSteps = TUTORIAL_STEPS.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <Card className="w-full max-w-md bv-surface-strong shadow-none border-foreground/25">
        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-6 h-6" />
              <CardTitle id="tutorial-title" className="text-lg font-bold">Quick Tour</CardTitle>
            </div>
            <Button variant="outline" size="icon" onClick={handleSkip} className="rounded-full h-9 w-9 min-h-0 min-w-0" aria-label="Skip tutorial">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div
            className="w-full h-1.5 bg-foreground/10 rounded-full overflow-hidden"
            role="progressbar"
            aria-label="Tutorial progress"
            aria-valuenow={stepNumber}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
          >
            <div className="h-full bg-foreground transition-all duration-500" style={{ width: `${(stepNumber / totalSteps) * 100}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Step {stepNumber} of {totalSteps}</p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">{step.title}</h2>
            <p className="text-base text-muted-foreground leading-relaxed">{step.description}</p>
            <div className="rounded-xl border border-foreground/15 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">How to</p>
              <p className="text-sm font-medium whitespace-pre-line">{step.gesture}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" size="lg" onClick={handlePrevious} disabled={currentStep === 0} className="flex-1 rounded-xl gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button size="lg" onClick={handleNext} className="flex-1 bv-btn-white rounded-xl gap-2">
              {currentStep === totalSteps - 1 ? 'Start' : 'Next'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
