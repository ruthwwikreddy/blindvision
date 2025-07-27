import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Camera, Loader2, Volume2, Settings, Copy, Zap, Info, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { overlayService } from '@/services/overlayService';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useImageClassification } from '@/hooks/useImageClassification';

interface MainInterfaceProps {
  language: string;
  detailLevel: string;
  isQuickMode: boolean;
  onSettingsClick: () => void;
  onQuickModeToggle: () => void;
}

export const MainInterface = ({ language, detailLevel, isQuickMode, onSettingsClick, onQuickModeToggle }: MainInterfaceProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastDescription, setLastDescription] = useState<string>('');
  const [contextualInfo, setContextualInfo] = useState<string>('');
  const [isGettingContext, setIsGettingContext] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<{ timestamp: string; language: string; detailLevel: string; source?: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { classifyImage, generateQuickDescription, isLoading: isClassifying, isModelLoaded } = useImageClassification();

  const speakText = useCallback(async (text: string, priority: boolean = false) => {
    console.log('Speaking text:', text);
    
    // Stop any ongoing speech if this is high priority
    if (priority && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Use browser's built-in Speech Synthesis API (free)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      const speakWithVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const languageMap: { [key: string]: string } = {
          'en': 'en-US',
          'hi': 'hi-IN', 
          'te': 'te-IN'
        };
        
        const preferredLang = languageMap[language] || 'en-US';
        const voice = voices.find(v => v.lang.startsWith(preferredLang.split('-')[0])) || voices[0];
        
        if (voice) {
          utterance.voice = voice;
        }
        
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => {
          setIsSpeaking(false);
          toast({
            title: "Speech Error",
            description: "Could not read the description aloud.",
            variant: "destructive"
          });
        };
        
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = speakWithVoice;
      } else {
        speakWithVoice();
      }
    } else {
      toast({
        title: "Speech Not Available",
        description: "Speech synthesis not supported in this browser.",
        variant: "destructive"
      });
    }
  }, [language, toast]);

  const analyzeImage = useCallback(async (imageDataUrl: string) => {
    try {
      setIsProcessing(true);
      
      // If quick mode and offline model is loaded, use Hugging Face classification
      if (isQuickMode && isModelLoaded) {
        try {
          const results = await classifyImage(imageDataUrl);
          const description = generateQuickDescription(results, language);
          
          setLastDescription(description);
          setLastAnalysis({
            timestamp: new Date().toISOString(),
            language,
            detailLevel: 'quick',
            source: 'huggingface'
          });

          speakText(description);
          
          toast({
            title: "Quick Analysis Complete",
            description: "Objects identified using offline AI",
          });
          return;
        } catch (hfError) {
          console.log('Hugging Face classification failed, falling back to OpenAI:', hfError);
        }
      }
      
      // Try OpenAI first
      let analysisData = null;
      let analysisError = null;
      
      try {
        const { data, error } = await supabase.functions.invoke('analyze-image', {
          body: {
            imageDataUrl,
            language,
            detailLevel,
            isQuickMode
          }
        });
        
        if (error) throw error;
        analysisData = data;
      } catch (error) {
        console.log('OpenAI analysis failed, trying Claude:', error);
        analysisError = error;
        
        // Try Claude as backup
        try {
          const { data, error } = await supabase.functions.invoke('claude-analyze', {
            body: {
              imageDataUrl,
              language,
              detailLevel,
              isQuickMode
            }
          });
          
          if (error) throw error;
          analysisData = data;
          
          toast({
            title: "Using Claude AI",
            description: "OpenAI unavailable, using Claude for analysis",
          });
        } catch (claudeError) {
          console.error('Both OpenAI and Claude failed:', claudeError);
          throw analysisError || claudeError;
        }
      }

      if (!analysisData || !analysisData.description) {
        throw new Error('No description received from analysis');
      }

      const { description, timestamp, source } = analysisData;
      
      // Store the description and metadata
      setLastDescription(description);
      setLastAnalysis({
        timestamp,
        language,
        detailLevel: isQuickMode ? 'quick' : detailLevel,
        source: source || 'openai'
      });

      // Speak the description
      speakText(description);
      
      toast({
        title: isQuickMode ? "Quick Analysis Complete" : "Scene Analysis Complete",
        description: isQuickMode ? "Objects identified and being read aloud" : "Description is ready and being read aloud",
      });

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze the image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [detailLevel, language, isQuickMode, speakText, toast, classifyImage, generateQuickDescription, isModelLoaded]);

  const copyToClipboard = useCallback(async () => {
    if (!lastDescription) return;
    
    try {
      await navigator.clipboard.writeText(lastDescription);
      toast({
        title: "Copied!",
        description: "Description copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  }, [lastDescription, toast]);

  const replayDescription = useCallback(() => {
    if (!lastDescription) return;
    speakText(lastDescription);
  }, [lastDescription, speakText]);

  const getContextualInfo = useCallback(async () => {
    if (!lastDescription) return;
    
    try {
      setIsGettingContext(true);
      
      // Extract key objects/items from the description for context query
      const query = lastDescription.split('.')[0] || lastDescription;
      
      const { data, error } = await supabase.functions.invoke('contextual-info', {
        body: {
          query,
          language
        }
      });

      if (error) {
        console.error('Contextual info error:', error);
        throw new Error(error.message || 'Failed to get contextual information');
      }

      if (!data || !data.contextualInfo) {
        throw new Error('No contextual information received');
      }

      const { contextualInfo } = data;
      setContextualInfo(contextualInfo);
      
      // Speak the contextual information
      speakText(`Here's additional context: ${contextualInfo}`);
      
      toast({
        title: "Context Added",
        description: "Additional information is being read aloud",
      });

    } catch (error) {
      console.error('Context error:', error);
      toast({
        title: "Context Failed",
        description: error.message || "Could not get additional context.",
        variant: "destructive"
      });
    } finally {
      setIsGettingContext(false);
    }
  }, [lastDescription, language, speakText, toast]);

  const captureImage = useCallback(async () => {
    try {
      setIsCapturing(true);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Try back camera first
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) return;
      
      video.srcObject = stream;
      await video.play();
      
      // Brief delay to let camera stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Capture frame
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      // Stop camera
      stream.getTracks().forEach(track => track.stop());
      
      // Convert to base64
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Analyze the image
      await analyzeImage(imageDataUrl);
      
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive"
      });
    } finally {
      setIsCapturing(false);
    }
  }, [analyzeImage, toast]);

  // Initialize audio and welcome message
  useEffect(() => {
    // Initialize speech synthesis and give welcome message
    const initializeAudio = () => {
      console.log('Initializing audio system');
      
      // Force voice loading by creating a dummy utterance
      if ('speechSynthesis' in window) {
        const testUtterance = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(testUtterance);
        window.speechSynthesis.cancel();
        
        // Wait a moment, then give welcome message
        setTimeout(() => {
          const welcomeMessage = language === 'en' 
            ? "Welcome to Blind Vision. Your AI-powered sight assistant is ready. Tap the center button to analyze your surroundings."
            : language === 'hi'
            ? "ब्लाइंड विजन में आपका स्वागत है। आपका एआई-संचालित दृष्टि सहायक तैयार है। अपने आसपास का विश्लेषण करने के लिए केंद्र बटन दबाएं।"
            : "బ్లైండ్ విజన్‌కు స్వాగతం. మీ AI-శక్తితో కూడిన దృష్టి సహాయకుడు సిద్ధంగా ఉన్నాడు. మీ చుట్టూ ఉన్న వాటిని విశ్లేషించడానికి మధ్య బటన్‌ను నొక్కండి.";
          
          speakText(welcomeMessage, true);
        }, 1000);
      }
    };

    // Initialize audio with user interaction if needed
    const handleFirstClick = () => {
      initializeAudio();
      document.removeEventListener('click', handleFirstClick);
      document.removeEventListener('touchstart', handleFirstClick);
    };

    // Try to initialize immediately, but also set up for user interaction
    initializeAudio();
    document.addEventListener('click', handleFirstClick);
    document.addEventListener('touchstart', handleFirstClick);

    return () => {
      document.removeEventListener('click', handleFirstClick);
      document.removeEventListener('touchstart', handleFirstClick);
    };
  }, [language, speakText]);

  // Initialize overlay service and handle background functionality
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Initialize the floating overlay for native apps
      const initializeOverlay = async () => {
        try {
          await overlayService.showFloatingButton();
          
          // Announce overlay is active
          setTimeout(() => {
            speakText("Floating button is now active across all apps. You can drag it anywhere on your screen.", true);
          }, 3000);
        } catch (error) {
          console.error('Failed to initialize overlay:', error);
          toast({
            title: "Overlay Setup Failed",
            description: "Could not create floating button. App will work normally.",
            variant: "destructive"
          });
        }
      };

      initializeOverlay();

      // Listen for capture requests from the floating button
      const handleCaptureRequest = () => {
        captureImage();
      };

      window.addEventListener('blindvision-capture-request', handleCaptureRequest);

      // Handle app state changes
      const handleAppStateChange = ({ isActive }: { isActive: boolean }) => {
        if (isActive) {
          // App became active - ensure overlay is shown
          overlayService.showFloatingButton();
        }
      };

      App.addListener('appStateChange', handleAppStateChange);

      // Cleanup
      return () => {
        window.removeEventListener('blindvision-capture-request', handleCaptureRequest);
        App.removeAllListeners();
        overlayService.hideFloatingButton();
      };
    }
  }, [captureImage, speakText, toast]);

  const isLoading = isCapturing || isProcessing;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      {/* Hidden elements for camera capture */}
      <video ref={videoRef} className="hidden" playsInline />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Control Buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          onClick={onQuickModeToggle}
          variant={isQuickMode ? "default" : "outline"}
          size="icon"
          className={`border-border ${isQuickMode ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
          title={isQuickMode ? "Quick Mode Active" : "Enable Quick Mode"}
        >
          <Zap className="w-4 h-4" />
        </Button>
        <Button
          onClick={onSettingsClick}
          variant="outline"
          size="icon"
          className="border-border hover:bg-muted"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Status Display */}
      {(isLoading || isSpeaking) && (
        <Card className="absolute top-4 left-4 right-4 border-border shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {isCapturing && (
                <>
                  <Camera className="w-5 h-5 text-primary animate-pulse" />
                  <span className="text-sm font-medium">Capturing image...</span>
                </>
              )}
              {isProcessing && (
                <>
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm font-medium">Analyzing scene...</span>
                </>
              )}
              {isSpeaking && (
                <>
                  <Volume2 className="w-5 h-5 text-accent animate-pulse" />
                  <span className="text-sm font-medium">Speaking description...</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description Card */}
      {lastDescription && (
        <Card className="absolute bottom-4 left-4 right-4 max-h-64 border-border shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {isQuickMode && <Zap className="w-4 h-4 text-accent" />}
                {isQuickMode ? "Quick Recognition" : "Scene Description"}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={getContextualInfo}
                  variant="outline"
                  size="sm"
                  disabled={isGettingContext || isSpeaking}
                  className="h-8 w-8 p-0"
                  title="Get contextual information"
                >
                  {isGettingContext ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={replayDescription}
                  variant="outline"
                  size="sm"
                  disabled={isSpeaking}
                  className="h-8 w-8 p-0"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-32 overflow-y-auto text-sm text-muted-foreground mb-3">
              {lastDescription}
            </div>
            {lastAnalysis && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                 <span className="font-medium">
                   {new Date(lastAnalysis.timestamp).toLocaleTimeString()} • 
                   {lastAnalysis.language === 'en' ? ' English' : 
                    lastAnalysis.language === 'hi' ? ' Hindi' : ' Telugu'} • 
                   {lastAnalysis.detailLevel === 'quick' ? ' Quick Mode' :
                    lastAnalysis.detailLevel === 'low' ? ' Brief' : 
                    lastAnalysis.detailLevel === 'medium' ? ' Medium' : ' Detailed'}
                   {lastAnalysis.source && ` • ${lastAnalysis.source === 'claude' ? 'Claude' : 
                     lastAnalysis.source === 'huggingface' ? 'Offline' : 'OpenAI'}`}
                 </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Blind Vision</h1>
          <p className="text-lg text-muted-foreground max-w-md">
            {isQuickMode 
              ? "Quick Mode: Tap to instantly identify key objects"
              : "Tap the logo below to capture and analyze your surroundings"
            }
          </p>
        </div>

        {/* Floating Logo Button */}
        <Button
          onClick={captureImage}
          disabled={isLoading}
          className={`
            w-32 h-32 rounded-full bg-gradient-primary hover:shadow-glow 
            transition-all duration-300 shadow-strong
            ${!isLoading ? 'animate-pulse-glow' : ''}
            ${isLoading ? 'opacity-75 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
          `}
          size="lg"
        >
          {isLoading ? (
            <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
          ) : (
            <Eye className="w-12 h-12 text-primary-foreground" />
          )}
        </Button>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Language: <span className="text-primary font-medium">
            {language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : 'Telugu'}
          </span></p>
          <p>Mode: <span className={`font-medium ${isQuickMode ? 'text-accent' : 'text-primary'}`}>
            {isQuickMode ? 'Quick Recognition' : 
             detailLevel === 'low' ? 'Brief Description' : 
             detailLevel === 'medium' ? 'Medium Description' : 'Detailed Description'}
          </span></p>
          {isQuickMode && (
            <p>AI Status: <span className={`font-medium ${isModelLoaded ? 'text-green-500' : 'text-yellow-500'}`}>
              {isModelLoaded ? 'Offline Model Ready' : 'Loading Offline Model...'}
            </span></p>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-muted-foreground max-w-sm">
        <p>
          {isQuickMode 
            ? "Quick mode instantly identifies key objects like chairs, people, doors, and signs for faster navigation assistance."
            : "This app will describe your surroundings using your camera and read the description aloud."
          }
        </p>
      </div>
    </div>
  );
};