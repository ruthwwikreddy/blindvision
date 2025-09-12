import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Camera, Loader2, Volume2, Settings, Copy, Zap, Info, Brain, BookOpen, Navigation, Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { overlayService } from '@/services/overlayService';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { ModeSelector, type AppMode } from './ModeSelector';
import { AnalysisHistory, type AnalysisEntry } from './AnalysisHistory';
import { EmergencyPanel } from './EmergencyPanel';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import '../types/speech.d.ts';

interface MainInterfaceProps {
  language: string;
  detailLevel: string;
  isQuickMode: boolean;
  onSettingsClick: () => void;
  onQuickModeToggle: () => void;
}

export const EnhancedMainInterface = ({ language, detailLevel, isQuickMode, onSettingsClick, onQuickModeToggle }: MainInterfaceProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastDescription, setLastDescription] = useState<string>('');
  const [contextualInfo, setContextualInfo] = useState<string>('');
  const [isGettingContext, setIsGettingContext] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<{ timestamp: string; language: string; detailLevel: string; source?: string } | null>(null);
  const [currentMode, setCurrentMode] = useState<AppMode>('surroundings');
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisEntry[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; address?: string }>();
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [capturedImageForVoice, setCapturedImageForVoice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  
  // Audio management refs
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Voice recording hook
  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceRecorder();

  // Function to stop all audio playback
  const stopAllAudio = useCallback(() => {
    console.log('Stopping all audio...');
    
    // Stop OpenAI TTS audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    // Stop browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current = null;
    }
    
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(async (text: string, priority: boolean = false) => {
    console.log('Speaking text:', text);
    
    // ALWAYS stop any ongoing audio/speech first
    stopAllAudio();
    
    try {
      setIsSpeaking(true);
      
      // Try OpenAI TTS first (more reliable)
      console.log('Attempting OpenAI TTS...');
      const { data, error } = await supabase.functions.invoke('openai-tts', {
        body: {
          text,
          language,
          voice: 'alloy'
        }
      });

      if (error) {
        console.log('OpenAI TTS failed, falling back to browser speech:', error);
        throw new Error('OpenAI TTS unavailable');
      }

      if (data && data.audioContent) {
        console.log('Playing OpenAI TTS audio');
        // Create audio from base64
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Store current audio reference
        currentAudioRef.current = audio;
        
        audio.onended = () => {
          console.log('OpenAI TTS audio ended');
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
        };
        
        audio.onerror = (e) => {
          console.error('Audio playback failed:', e);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          // Fallback to browser speech
          fallbackToSpeechSynthesis();
        };
        
        await audio.play();
        console.log('OpenAI TTS audio playing successfully');
        return;
      }
    } catch (error) {
      console.log('OpenAI TTS not available, using browser speech synthesis:', error);
      setIsSpeaking(false);
    }
    
    // Fallback to browser speech synthesis
    fallbackToSpeechSynthesis();
    
    function fallbackToSpeechSynthesis() {
      console.log('Using browser speech synthesis fallback');
      
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        const speakWithVoice = () => {
          // Stop any previous utterance
          if (currentUtteranceRef.current) {
            window.speechSynthesis.cancel();
            currentUtteranceRef.current = null;
          }
          
          const voices = window.speechSynthesis.getVoices();
          
          // Enhanced language mapping with fallbacks for persistent language support
          const languageVoiceMap: { [key: string]: string[] } = {
            'en': ['en-US', 'en-GB', 'en-AU', 'en'],
            'hi': ['hi-IN', 'hi', 'en-IN'],
            'te': ['te-IN', 'te', 'hi-IN', 'en-IN'],
            'es': ['es-ES', 'es-US', 'es-MX', 'es'],
            'fr': ['fr-FR', 'fr-CA', 'fr'],
            'de': ['de-DE', 'de-AT', 'de'],
            'it': ['it-IT', 'it'],
            'pt': ['pt-BR', 'pt-PT', 'pt'],
            'ru': ['ru-RU', 'ru'],
            'ja': ['ja-JP', 'ja'],
            'ko': ['ko-KR', 'ko'],
            'zh': ['zh-CN', 'zh-TW', 'zh-HK', 'zh']
          };
          
          const preferredLangs = languageVoiceMap[language] || ['en-US'];
          let voice = null;
          
          // Try to find voice in order of preference
          for (const lang of preferredLangs) {
            voice = voices.find(v => v.lang === lang) || 
                   voices.find(v => v.lang.startsWith(lang.split('-')[0]));
            if (voice) break;
          }
          
          // Fallback to first available voice
          if (!voice && voices.length > 0) {
            voice = voices[0];
          }
          
          if (voice) {
            utterance.voice = voice;
          }
          
          // Store current utterance reference
          currentUtteranceRef.current = utterance;
          
          utterance.rate = 0.8;
          utterance.pitch = 1;
          utterance.volume = 1;
          
          utterance.onstart = () => {
            console.log('Browser speech started');
            setIsSpeaking(true);
          };
          
          utterance.onend = () => {
            console.log('Browser speech ended');
            setIsSpeaking(false);
            currentUtteranceRef.current = null;
          };
          
          utterance.onerror = (e) => {
            console.error('Browser speech error:', e);
            setIsSpeaking(false);
            currentUtteranceRef.current = null;
            toast({
              title: "Speech Temporarily Unavailable", 
              description: "Audio feedback is currently experiencing issues. Your description is still available below.",
              variant: "destructive"
            });
          };
          
          try {
            window.speechSynthesis.speak(utterance);
            console.log('Browser speech synthesis initiated');
          } catch (e) {
            console.error('Failed to start browser speech:', e);
            setIsSpeaking(false);
            toast({
              title: "Speech Not Available",
              description: "Text-to-speech is not supported. Please read the description below.",
              variant: "destructive"
            });
          }
        };

        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = speakWithVoice;
        } else {
          speakWithVoice();
        }
      } else {
        setIsSpeaking(false);
        toast({
          title: "Speech Not Available",
          description: "Speech synthesis not supported in this browser. Please read the description below.",
          variant: "destructive"
        });
      }
    }
  }, [language, toast, stopAllAudio]);

  const analyzeImage = useCallback(async (imageDataUrl: string, question?: string) => {
    try {
      setIsProcessing(true);
      
      // Use OpenAI for analysis with mode-specific prompts
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          imageDataUrl,
          language,
          detailLevel: currentMode === 'reading' ? 'text-extraction' : currentMode === 'navigation' ? 'navigation-focused' : detailLevel,
          isQuickMode: currentMode === 'reading' ? false : isQuickMode,
          question
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Analysis failed');
      }
      
      const analysisData = data;

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
        source: 'openai'
      });

      // Add to analysis history
      const newEntry: AnalysisEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: currentMode,
        description,
        timestamp,
        language,
        metadata: {
          confidence: 0.9 // Default confidence for OpenAI
        }
      };
      
      setAnalysisHistory(prev => [newEntry, ...prev.slice(0, 9)]); // Keep last 10

      // Mode-specific speech feedback
      const modePrefix = question 
        ? "Answer: "
        : currentMode === 'reading' 
          ? "Text found: " 
          : currentMode === 'navigation' 
            ? "Navigation guidance: " 
            : "";

      // Speak the description
      speakText(modePrefix + description);
      
      toast({
        title: question ? "Voice Question Answered"
              : currentMode === 'reading' ? "Text Analysis Complete" 
              : currentMode === 'navigation' ? "Navigation Analysis Complete"
              : isQuickMode ? "Quick Analysis Complete" : "Scene Analysis Complete",
        description: question ? "Your question has been answered and is being read aloud"
                   : currentMode === 'reading' ? "Text extracted and being read aloud"
                   : currentMode === 'navigation' ? "Navigation guidance is being read aloud"
                   : isQuickMode ? "Objects identified and being read aloud" : "Description is ready and being read aloud",
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
  }, [detailLevel, language, isQuickMode, speakText, toast, currentMode]);

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

  // Voice assistant function - capture image then record voice
  const startVoiceAssistant = useCallback(async () => {
    try {
      setIsVoiceMode(true);
      
      // First capture the image
      setIsCapturing(true);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
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
      
      // Convert to base64 and store
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImageForVoice(imageDataUrl);
      
      setIsCapturing(false);
      
      // Now start voice recording
      speakText("Image captured. Please ask your question now.");
      
      // Small delay to let the speech finish
      setTimeout(async () => {
        await startRecording();
        toast({
          title: "Voice Assistant Active",
          description: "Speak your question about the image. Tap again to stop recording.",
        });
      }, 2000);
      
    } catch (error) {
      console.error('Voice assistant error:', error);
      setIsVoiceMode(false);
      setIsCapturing(false);
      toast({
        title: "Voice Assistant Error",
        description: "Could not start voice assistant. Please try again.",
        variant: "destructive"
      });
    }
  }, [startRecording, speakText, toast]);

  // Stop voice recording and process
  const stopVoiceAssistant = useCallback(async () => {
    try {
      if (!capturedImageForVoice) {
        throw new Error('No image captured for voice assistant');
      }

      // Stop recording and get transcription
      const transcribedText = await stopRecording();
      
      if (!transcribedText.trim()) {
        throw new Error('No speech detected');
      }
      
      toast({
        title: "Processing Question",
        description: `Question: "${transcribedText}"`,
      });

      // Analyze image with the question
      await analyzeImage(capturedImageForVoice, transcribedText);
      
    } catch (error) {
      console.error('Voice assistant processing error:', error);
      toast({
        title: "Voice Processing Failed",
        description: error.message || "Could not process your voice question.",
        variant: "destructive"
      });
    } finally {
      setIsVoiceMode(false);
      setCapturedImageForVoice(null);
    }
  }, [capturedImageForVoice, stopRecording, analyzeImage, toast]);

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
    console.log('Replaying description...');
    speakText(lastDescription, true); // Use priority to stop current audio
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

  const isLoading = isCapturing || isProcessing || isTranscribing;

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
            ? "Welcome to Blind Vision. Your comprehensive AI accessibility assistant is ready. Choose your mode and start exploring."
            : language === 'hi'
            ? "ब्लाइंड विजन में आपका स्वागत है। आपका व्यापक एआई सुगम्यता सहायक तैयार है। अपना मोड चुनें और अन्वेषण शुरू करें।"
            : "బ్లైండ్ విజన్‌కు స్వాగతం. మీ సమగ్ర AI ప్రాప్యత సహాయకుడు సిద్ధంగా ఉన్నాడు. మీ మోడ్ ఎంచుకోండి మరియు అన్వేషణ ప్రారంభించండి.";
          
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

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle if no input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key.toLowerCase()) {
        case ' ':
        case 'enter':
          event.preventDefault();
          if (!isLoading) {
            if (isVoiceMode && isRecording) {
              stopVoiceAssistant();
            } else if (isVoiceMode) {
              setIsVoiceMode(false);
              setCapturedImageForVoice(null);
            } else {
              captureImage();
            }
          }
          break;
        case 'r':
          event.preventDefault();
          if (lastDescription) {
            replayDescription();
          }
          break;
        case 'c':
          event.preventDefault();
          if (lastDescription) {
            copyToClipboard();
          }
          break;
        case 'i':
          event.preventDefault();
          if (lastDescription) {
            getContextualInfo();
          }
          break;
        case 's':
          event.preventDefault();
          onSettingsClick();
          break;
        case 'q':
          event.preventDefault();
          onQuickModeToggle();
          break;
        case '1':
          event.preventDefault();
          setCurrentMode('surroundings');
          speakText("Surroundings mode selected");
          break;
        case '2':
          event.preventDefault();
          setCurrentMode('reading');
          speakText("Reading mode selected");
          break;
        case '3':
          event.preventDefault();
          setCurrentMode('navigation');
          speakText("Navigation mode selected");
          break;
        case 'v':
          event.preventDefault();
          if (!isLoading && !isVoiceMode) {
            startVoiceAssistant();
          }
          break;
        case 'h':
          event.preventDefault();
          speakText("Keyboard shortcuts: Spacebar or Enter to take picture, V for voice assistant, R to replay description, C to copy, I for more info, S for settings, Q for quick mode, 1 for surroundings, 2 for reading, 3 for navigation, H for help.");
          break;
        case 'escape':
          event.preventDefault();
          stopAllAudio();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isLoading, lastDescription, captureImage, replayDescription, copyToClipboard, getContextualInfo, onSettingsClick, onQuickModeToggle, speakText, stopAllAudio, setCurrentMode, isVoiceMode, isRecording, startVoiceAssistant, stopVoiceAssistant]);

  // Get user location
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          });
        });
        
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      } catch (error) {
        console.log('Location not available:', error);
      }
    };

    getCurrentLocation();
  }, []);

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

      // Handle app state changes - maintain overlay even when app goes to background
      const handleAppStateChange = ({ isActive }: { isActive: boolean }) => {
        console.log('App state changed:', isActive);
        // Always ensure overlay is active, regardless of app state
        setTimeout(() => {
          overlayService.showFloatingButton();
        }, 500);
      };

      App.addListener('appStateChange', handleAppStateChange);

      // Handle device pause/resume
      const handlePause = () => {
        console.log('App paused - maintaining overlay');
        // Overlay should persist even when app is paused
      };

      const handleResume = () => {
        console.log('App resumed - ensuring overlay');
        overlayService.showFloatingButton();
      };

      App.addListener('pause', handlePause);
      App.addListener('resume', handleResume);

      // Cleanup
      return () => {
        window.removeEventListener('blindvision-capture-request', handleCaptureRequest);
        App.removeAllListeners();
        // Don't hide overlay on cleanup - let it persist
      };
    }
  }, [captureImage, speakText, toast]);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden safe-area-top safe-area-bottom">
      {/* Enhanced Background with Mesh Gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-mesh-gradient opacity-30" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/3 rounded-full blur-2xl animate-breathe" />
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-3 md:p-4 space-y-4 md:space-y-6 animate-fade-in-up">
        
        {/* Enhanced Mode Selector */}
        <div className="animate-scale-in">
          <ModeSelector
            currentMode={currentMode}
            onModeChange={setCurrentMode}
            speakText={speakText}
          />
        </div>

        {/* Enhanced Main Action Area */}
        <div className="flex flex-col items-center space-y-6">
          
          {/* Enhanced Control Buttons */}
          <div className="absolute top-6 right-6 flex gap-3">
            <Button
              onClick={onQuickModeToggle}
              variant={isQuickMode ? "default" : "outline"}
              size="icon"
              className={`
                glass border-2 backdrop-blur-md transition-all duration-300 hover:scale-105
                ${isQuickMode 
                  ? 'bg-accent/20 border-accent text-accent shadow-neon' 
                  : 'border-border/50 hover:border-accent/50 hover:bg-accent/5'
                }
              `}
              title={isQuickMode ? "Quick Mode Active" : "Enable Quick Mode"}
              aria-label={isQuickMode ? "Disable quick mode" : "Enable quick mode"}
            >
              <Zap className="w-5 h-5" />
            </Button>
            
            <Button
              onClick={onSettingsClick}
              variant="outline"
              size="icon"
              className="glass border-2 border-border/50 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:bg-primary/5"
              title="Open Settings"
              aria-label="Open settings menu"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          {/* Enhanced Capture Button */}
          <div className="flex flex-col items-center animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative">
              {/* Main Capture Button */}
              <Button
                onClick={isVoiceMode && isRecording ? stopVoiceAssistant : isVoiceMode ? () => { setIsVoiceMode(false); setCapturedImageForVoice(null); } : captureImage}
                disabled={isLoading && !isRecording}
                className={`
                  relative w-36 h-36 md:w-40 md:h-40 rounded-full 
                  glass border-4 ${isVoiceMode ? 'border-accent/50' : 'border-primary/30'} backdrop-blur-md transition-all duration-300 hover:scale-105 
                  bg-gradient-to-br ${isVoiceMode ? 'from-accent/20 via-accent/10' : 'from-primary/20 via-primary/10'} to-transparent
                  shadow-elevated hover:shadow-2xl group overflow-hidden
                  ${isLoading ? 'animate-pulse' : 'hover:shadow-primary/25 active:scale-95'}
                  ${isRecording ? 'animate-pulse border-red-500/50' : ''}
                `}
                title={isVoiceMode && isRecording ? "Stop recording and process question" : isVoiceMode ? "Cancel voice assistant" : currentMode === 'reading' ? "Extract and read text" : currentMode === 'navigation' ? "Get navigation guidance" : "Analyze surroundings"}
                aria-label={isVoiceMode && isRecording ? 'Stop recording' : isVoiceMode ? 'Cancel voice mode' : `${isLoading ? 'Processing...' : 'Take picture and analyze'}`}
              >
                {/* Background shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                {/* Icon */}
                <div className="relative z-10">
                  {isLoading ? (
                    <Loader2 className={`w-16 h-16 md:w-20 md:h-20 ${isVoiceMode ? 'text-accent-foreground' : 'text-primary-foreground'} animate-spin`} />
                  ) : isVoiceMode && isRecording ? (
                    <MicOff className="w-16 h-16 md:w-20 md:h-20 text-red-500 transition-transform group-hover:scale-110 animate-pulse" />
                  ) : isVoiceMode ? (
                    <Mic className="w-16 h-16 md:w-20 md:h-20 text-accent-foreground transition-transform group-hover:scale-110" />
                  ) : currentMode === 'reading' ? (
                    <BookOpen className="w-16 h-16 md:w-20 md:h-20 text-primary-foreground transition-transform group-hover:scale-110" />
                  ) : currentMode === 'navigation' ? (
                    <Navigation className="w-16 h-16 md:w-20 md:h-20 text-primary-foreground transition-transform group-hover:scale-110" />
                  ) : (
                    <Eye className="w-16 h-16 md:w-20 md:h-20 text-primary-foreground transition-transform group-hover:scale-110" />
                  )}
                </div>
              </Button>
            </div>
            
            {/* Mode indicator */}
            <div className={`mt-4 px-4 py-2 glass rounded-full border ${isVoiceMode ? 'border-accent/20' : 'border-primary/20'}`}>
              <p className={`text-sm font-medium capitalize ${isVoiceMode ? 'text-accent' : 'text-primary'}`}>
                {isVoiceMode ? (isRecording ? 'Recording...' : isTranscribing ? 'Processing...' : 'Voice Ready') : `${currentMode} Mode`}
              </p>
            </div>
          </div>

        {/* Voice Assistant Button */}
        {!isVoiceMode && (
          <div className="flex justify-center">
            <Button
              onClick={startVoiceAssistant}
              disabled={isLoading}
              variant="outline"
              size="lg"
              className="border-accent/30 bg-accent/10 hover:bg-accent/20 text-accent hover:text-accent flex items-center gap-2"
              aria-label="Start voice assistant - capture image and ask questions"
            >
              <Mic className="w-5 h-5" />
              Voice Assistant
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        {lastDescription && !isVoiceMode && (
          <div className="flex flex-wrap gap-3 justify-center max-w-sm">
            <Button
              onClick={replayDescription}
              disabled={isSpeaking}
              variant="outline"
              size="sm"
              className="border-border hover:bg-muted flex items-center gap-2"
              aria-label="Replay the last description"
            >
              <Volume2 className="w-4 h-4" />
              Replay
            </Button>
            
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="sm"
              className="border-border hover:bg-muted flex items-center gap-2"
              aria-label="Copy description to clipboard"
            >
              <Copy className="w-4 h-4" />
              Copy
            </Button>
            
            <Button
              onClick={getContextualInfo}
              disabled={isGettingContext}
              variant="outline"
              size="sm"
              className="border-border hover:bg-muted flex items-center gap-2"
              aria-label="Get additional context about the scene"
            >
              {isGettingContext ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Info className="w-4 h-4" />
              )}
              More Info
            </Button>
          </div>
        )}

        {/* Current Mode Description */}
        <div className="text-center text-sm text-muted-foreground max-w-sm">
          <p>
            {isVoiceMode 
              ? (isRecording 
                  ? "Speak your question about the captured image. Tap the button when finished."
                  : isTranscribing
                    ? "Processing your voice question..."
                    : "Image captured. Starting voice recording...")
              : currentMode === 'reading' 
                ? "Point your camera at text to read it aloud."
                : currentMode === 'navigation'
                  ? "Get guidance for safe movement and navigation."
                  : "Describe your surroundings with AI vision."
            }
          </p>
        </div>

        </div>

        {/* Analysis History */}
        <AnalysisHistory
          history={analysisHistory}
          onReplay={(description) => speakText(description, true)}
          onClear={() => setAnalysisHistory([])}
          speakText={speakText}
        />

        {/* Emergency Panel */}
        <EmergencyPanel
          speakText={speakText}
          currentLocation={currentLocation}
        />

      </div>

      {/* Status Display */}
      {lastDescription && (
        <Card className="absolute bottom-4 left-4 right-4 max-w-md mx-auto border-border shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Latest {currentMode === 'reading' ? 'Text' : currentMode === 'navigation' ? 'Navigation' : 'Analysis'}
              {isSpeaking && (
                <div className="flex items-center gap-1 text-accent">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span className="text-xs">Speaking...</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-3">
              {lastDescription}
            </p>
            
            {contextualInfo && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-accent" />
                  <span className="text-xs font-medium text-accent">Additional Context</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {contextualInfo}
                </p>
              </div>
            )}
            
            {lastAnalysis && (
              <div className="text-xs text-muted-foreground/60 mt-2">
                {new Date(lastAnalysis.timestamp).toLocaleTimeString()} • 
                {lastAnalysis.language.toUpperCase()} • 
                {lastAnalysis.source?.toUpperCase()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hidden video and canvas elements for camera */}
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};