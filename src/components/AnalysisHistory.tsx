import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Volume2, Copy, Trash2, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface AnalysisEntry {
  id: string;
  type: 'surroundings' | 'reading' | 'navigation';
  description: string;
  timestamp: string;
  language: string;
  metadata?: {
    location?: string;
    textExtracted?: string;
    confidence?: number;
  };
}

interface AnalysisHistoryProps {
  history: AnalysisEntry[];
  onReplay: (description: string) => void;
  onClear: () => void;
  speakText: (text: string) => void;
}

const TYPE_EMOJIS = {
  surroundings: '👁️',
  reading: '📖',
  navigation: '🧭'
};

const TYPE_LABELS = {
  surroundings: 'Surroundings',
  reading: 'Reading',
  navigation: 'Navigation'
};

export const AnalysisHistory = ({ 
  history, 
  onReplay, 
  onClear, 
  speakText 
}: AnalysisHistoryProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const handleReplay = useCallback((entry: AnalysisEntry) => {
    speakText(`Replaying ${TYPE_LABELS[entry.type]} analysis from ${new Date(entry.timestamp).toLocaleTimeString()}: ${entry.description}`);
    onReplay(entry.description);
  }, [onReplay, speakText]);

  const handleCopy = useCallback(async (description: string) => {
    try {
      await navigator.clipboard.writeText(description);
      toast({
        title: "Copied!",
        description: "Analysis copied to clipboard",
      });
      speakText("Analysis copied to clipboard");
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  }, [toast, speakText]);

  const handleClearAll = useCallback(() => {
    onClear();
    speakText("Analysis history cleared");
    toast({
      title: "History Cleared",
      description: "All analysis history has been removed",
    });
  }, [onClear, speakText, toast]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="border-border shadow-soft w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <span>Recent Analysis</span>
            <span className="text-sm font-normal text-muted-foreground">
              ({history.length})
            </span>
          </div>
          <div className="flex gap-2">
            {history.length > 0 && (
              <Button
                onClick={handleClearAll}
                variant="outline"
                size="sm"
                className="text-xs border-border hover:bg-destructive/10 hover:text-destructive"
                aria-label="Clear all analysis history"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="outline"
              size="sm"
              className="text-xs border-border hover:bg-muted"
              aria-label={isExpanded ? "Collapse history" : "Expand history"}
            >
              {isExpanded ? "Less" : "Show"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {history.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No analysis history yet.</p>
            <p className="text-xs mt-1">Capture and analyze your first scene!</p>
          </div>
        ) : (
          <>
            {/* Most recent entry (always visible) */}
            <div className="mb-3">
              <div className="text-xs text-muted-foreground mb-2">Most Recent:</div>
              {history.length > 0 && (
                <HistoryEntry
                  entry={history[0]}
                  onReplay={handleReplay}
                  onCopy={handleCopy}
                  formatTime={formatTime}
                  isRecent={true}
                />
              )}
            </div>

            {/* Expanded history */}
            {isExpanded && history.length > 1 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Earlier:</div>
                <ScrollArea className="h-48 w-full">
                  <div className="space-y-2 pr-4">
                    {history.slice(1).map((entry) => (
                      <HistoryEntry
                        key={entry.id}
                        entry={entry}
                        onReplay={handleReplay}
                        onCopy={handleCopy}
                        formatTime={formatTime}
                        isRecent={false}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

interface HistoryEntryProps {
  entry: AnalysisEntry;
  onReplay: (entry: AnalysisEntry) => void;
  onCopy: (description: string) => void;
  formatTime: (timestamp: string) => string;
  isRecent: boolean;
}

const HistoryEntry = ({ entry, onReplay, onCopy, formatTime, isRecent }: HistoryEntryProps) => (
  <div className={`p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors ${isRecent ? 'bg-accent/10' : ''}`}>
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">{TYPE_EMOJIS[entry.type]}</span>
        <div>
          <div className="text-sm font-medium text-foreground">
            {TYPE_LABELS[entry.type]}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatTime(entry.timestamp)}
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          onClick={() => onReplay(entry)}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-accent/20"
          aria-label={`Replay ${TYPE_LABELS[entry.type]} analysis`}
        >
          <Volume2 className="w-3 h-3" />
        </Button>
        <Button
          onClick={() => onCopy(entry.description)}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-accent/20"
          aria-label="Copy analysis to clipboard"
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
    </div>
    <p className="text-xs text-muted-foreground line-clamp-2">
      {entry.description}
    </p>
    {entry.metadata?.textExtracted && (
      <div className="mt-2 text-xs text-accent">
        Text found: "{entry.metadata.textExtracted.substring(0, 50)}..."
      </div>
    )}
  </div>
);