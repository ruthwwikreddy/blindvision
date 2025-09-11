import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Compass, BookOpen, Eye, Mic, Navigation } from 'lucide-react';

export type AppMode = 'surroundings' | 'reading' | 'navigation';

interface ModeSelectorProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  speakText: (text: string) => void;
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
  speakText
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
    <div className="w-full max-w-lg">
      {/* Enhanced Current Mode Display */}
      <Card className="glass border-2 border-primary/30 backdrop-blur-md shadow-elevated mb-6 overflow-hidden group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl animate-float group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
                {currentModeData?.emoji}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-1 text-balance">
                  {currentModeData?.title} Mode
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                  {currentModeData?.description}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="outline"
              size="sm"
              className="glass border-2 border-primary/20 backdrop-blur-sm hover:border-primary hover:bg-primary/10 hover:scale-105 transition-all duration-300 px-4 py-2"
              aria-label={isExpanded ? "Collapse mode selector" : "Expand mode selector"}
            >
              <span className="font-medium">{isExpanded ? "Close" : "Switch"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Mode Selection Grid */}
      {isExpanded && (
        <div className="grid gap-4 animate-scale-in">
          {MODES.map((mode, index) => (
            <Button
              key={mode.id}
              onClick={() => handleModeSelect(mode.id)}
              variant="outline"
              className={`
                group relative flex items-center gap-4 p-6 h-auto text-left justify-start overflow-hidden
                glass border-2 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-elevated
                ${currentMode === mode.id 
                  ? 'border-primary bg-primary/10 shadow-neon' 
                  : 'border-border/30 hover:border-primary/50 hover:bg-primary/5'
                }
              `}
              style={{ animationDelay: `${index * 0.1}s` }}
              aria-label={`Switch to ${mode.title} mode. ${mode.description}. Press ${mode.shortcut} as shortcut.`}
            >
              {/* Background shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              <div className="text-3xl transition-transform duration-300 group-hover:scale-110" aria-hidden="true">
                {mode.emoji}
              </div>
              
              <div className="flex-1 relative z-10">
                <div className={`font-bold text-lg mb-1 ${currentMode === mode.id ? 'text-primary' : 'text-foreground'}`}>
                  {mode.title}
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {mode.description}
                </div>
              </div>
              
              <div className={`
                relative z-10 text-xs font-mono font-bold px-3 py-2 rounded-lg
                ${currentMode === mode.id 
                  ? 'bg-primary/20 text-primary border border-primary/30' 
                  : 'bg-muted/20 text-muted-foreground border border-border/30'
                }
              `}>
                {mode.shortcut}
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};