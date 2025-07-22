import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Camera, Loader2, Volume2, Settings, Copy, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { overlayService } from '@/services/overlayService';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

interface MainInterfaceProps {
  language: string;
  detailLevel: string;
  onSettingsClick: () => void;
}

export const MainInterface = ({ language, detailLevel, onSettingsClick }: MainInterfaceProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastDescription, setLastDescription] = useState<string>('');
  const [lastAnalysis, setLastAnalysis] = useState<{ timestamp: string; language: string; detailLevel: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice based on language
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
      
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.9;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => {
        setIsSpeaking(false);
        toast({
          title: "Speech Error",
          description: "Could not read the description aloud",
          variant: "destructive"
        });
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Speech Not Supported",
        description: "Text-to-speech is not available in this browser",
        variant: "destructive"
      });
    }
  }, [language, toast]);

  const analyzeImage = useCallback(async (imageDataUrl: string) => {
    try {
      setIsProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          imageDataUrl,
          language,
          detailLevel
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to analyze image');
      }

      if (!data || !data.description) {
        throw new Error('No description received from analysis');
      }

      const { description, timestamp } = data;
      
      // Store the description and metadata
      setLastDescription(description);
      setLastAnalysis({
        timestamp,
        language,
        detailLevel
      });

      // Speak the description
      speakText(description);
      
      toast({
        title: "Scene Analysis Complete",
        description: "Description is ready and being read aloud",
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
  }, [detailLevel, language, speakText, toast]);

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

  // Initialize overlay service and handle background functionality
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Initialize the floating overlay for native apps
      const initializeOverlay = async () => {
        try {
          await overlayService.showFloatingButton();
          
          // Announce overlay is active
          speakText("Blind Vision overlay is now active. Tap the floating button from any screen to analyze your surroundings.");
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
      
      {/* Settings Button */}
      <Button
        onClick={onSettingsClick}
        variant="outline"
        size="icon"
        className="absolute top-4 right-4 border-border hover:bg-muted"
      >
        <Settings className="w-4 h-4" />
      </Button>

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
              <CardTitle className="text-lg">Scene Description</CardTitle>
              <div className="flex gap-2">
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
                  {lastAnalysis.detailLevel === 'low' ? ' Brief' : 
                   lastAnalysis.detailLevel === 'medium' ? ' Medium' : ' Detailed'}
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
            Tap the logo below to capture and analyze your surroundings
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
          <p>Detail Level: <span className="text-primary font-medium">
            {detailLevel === 'low' ? 'Brief' : 
             detailLevel === 'medium' ? 'Medium' : 'Detailed'}
          </span></p>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-muted-foreground max-w-sm">
        <p>This app will describe your surroundings using your camera and read the description aloud.</p>
      </div>
    </div>
  );
};