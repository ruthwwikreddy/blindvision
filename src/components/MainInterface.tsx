import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Camera, Loader2, Volume2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MainInterfaceProps {
  language: string;
  detailLevel: string;
  onSettingsClick: () => void;
}

export const MainInterface = ({ language, detailLevel, onSettingsClick }: MainInterfaceProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
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

  const generatePrompt = useCallback((detailLevel: string, language: string) => {
    const detailInstructions = {
      small: "Provide a brief, 1-2 sentence description focusing on the most important elements",
      medium: "Provide a moderate description in 3-4 sentences, including key objects, people, and context",
      full: "Provide a detailed, comprehensive description that paints a complete picture of the scene, including spatial relationships, emotions, atmosphere, and all relevant details"
    };

    const languageInstructions = {
      en: "Respond in clear, natural English",
      hi: "Respond in clear, natural Hindi (हिंदी में जवाब दें)",
      te: "Respond in clear, natural Telugu (తెలుగులో సమాధానం ఇవ్వండి)"
    };

    return `You are an intelligent visual assistant for visually impaired users. Analyze this image and describe what you see. 

${detailInstructions[detailLevel as keyof typeof detailInstructions]}. 

Focus on:
- People and their actions/expressions
- Objects and their relationships
- Spatial layout and environment
- Any text or signs visible
- Colors, lighting, and atmosphere
- Potential safety considerations

${languageInstructions[language as keyof typeof languageInstructions]}. Format your response as natural speech that would be helpful for someone who cannot see the image. Be warm, informative, and considerate.`;
  }, []);

  const analyzeImage = useCallback(async (imageDataUrl: string) => {
    try {
      setIsProcessing(true);
      
      const prompt = generatePrompt(detailLevel, language);
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer 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',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageDataUrl
                  }
                }
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const description = data.choices[0]?.message?.content;
      
      if (description) {
        speakText(description);
        toast({
          title: "Scene Analysis Complete",
          description: "Description is being read aloud",
        });
      } else {
        throw new Error('No description received');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [detailLevel, language, generatePrompt, speakText, toast]);

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
            {detailLevel === 'small' ? 'Small Detail' : 
             detailLevel === 'medium' ? 'Medium Detail' : 'Full Detail'}
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