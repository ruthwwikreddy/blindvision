import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Compass, BookOpen, Eye, Mic, Navigation } from 'lucide-react';

export type AppMode = 'surroundings' | 'reading' | 'navigation';

interface ModeSelectorProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  speakText: (text: string) => void;
  voiceCommands: boolean;
  isListening: boolean;
}

const MODES = [
  {
    id: 'surroundings' as AppMode,
    title: 'Surroundings',
    description: 'Describe what\'s around you',
    icon: Eye,
    emoji: '👁️',
    shortcut: '1'
  },
  {
    id: 'reading' as AppMode,
    title: 'Reading',
    description: 'Read text from documents and signs',
    icon: BookOpen,
    emoji: '📖',
    shortcut: '2'
  },
  {
    id: 'navigation' as AppMode,
    title: 'Navigation',
    description: 'Get directions and navigate spaces',
    icon: Navigation,
    emoji: '🧭',
    shortcut: '3'
  }
];

export const ModeSelector = ({ 
  currentMode, 
  onModeChange, 
  speakText, 
  voiceCommands, 
  isListening 
}: ModeSelectorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleModeSelect = useCallback((mode: AppMode) => {
    const selectedMode = MODES.find(m => m.id === mode);
    if (selectedMode) {
      speakText(`${selectedMode.title} mode selected. ${selectedMode.description}`);
      onModeChange(mode);
      setIsExpanded(false);
    }
  }, [onModeChange, speakText]);

  const currentModeData = MODES.find(m => m.id === currentMode);

  return (
    <div className="w-full max-w-md">
      {/* Current Mode Display */}
      <Card className="border-border shadow-soft mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{currentModeData?.emoji}</span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {currentModeData?.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {currentModeData?.description}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="outline"
              size="sm"
              className="border-border hover:bg-muted"
              aria-label={isExpanded ? "Collapse mode selector" : "Expand mode selector"}
            >
              {isExpanded ? "Less" : "Switch"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Voice Commands Status */}
      {voiceCommands && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-accent/20 rounded-full text-sm">
            <Mic className={`w-4 h-4 ${isListening ? 'text-accent animate-pulse' : 'text-muted-foreground'}`} />
            <span className="text-foreground">
              Voice commands {isListening ? 'listening' : 'enabled'}
            </span>
          </div>
        </div>
      )}

      {/* Mode Selection Grid */}
      {isExpanded && (
        <div className="grid gap-3 animate-fade-in">
          {MODES.map((mode) => (
            <Button
              key={mode.id}
              onClick={() => handleModeSelect(mode.id)}
              variant={currentMode === mode.id ? "default" : "outline"}
              className={`
                flex items-center gap-3 p-4 h-auto text-left justify-start
                border-border hover:bg-muted transition-all
                ${currentMode === mode.id ? 'bg-primary text-primary-foreground shadow-soft' : ''}
              `}
              aria-label={`Switch to ${mode.title} mode. ${mode.description}. Press ${mode.shortcut} as shortcut.`}
            >
              <span className="text-xl" aria-hidden="true">{mode.emoji}</span>
              <div className="flex-1">
                <div className="font-medium">{mode.title}</div>
                <div className="text-sm opacity-80">{mode.description}</div>
              </div>
              <div className="text-xs opacity-60 bg-white/10 px-2 py-1 rounded">
                {mode.shortcut}
              </div>
            </Button>
          ))}
        </div>
      )}

      <div className="mt-4 text-center text-xs text-muted-foreground">
        <p><strong>Quick switch:</strong> Press 1, 2, or 3 to change modes</p>
        <p><strong>Voice:</strong> Say "navigation mode", "reading mode", or "surroundings mode"</p>
      </div>
    </div>
  );
};