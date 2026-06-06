import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Loader2, Volume2, Settings, Copy, Info, Brain, Mic, MicOff, Palette, AlertTriangle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as aiService from '@/services/aiService';
import type { AppMode } from './ModeSelector';
import { AnalysisHistory, type AnalysisEntry } from './AnalysisHistory';
import { EmergencyPanel } from './EmergencyPanel';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useEnhancedGestures } from '@/hooks/useEnhancedGestures';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { preprocessImage, compressImage } from '@/utils/imagePreprocessing';
import { TutorialOverlay } from './TutorialOverlay';
import { EmergencySOS } from './EmergencySOS';
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
  const currentMode: AppMode = 'surroundings'; // Unified mode
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisEntry[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; address?: string }>();
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [capturedImageForVoice, setCapturedImageForVoice] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showEmergencySOS, setShowEmergencySOS] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  
  // New hooks
  const { triggerHaptic } = useHapticFeedback();
  const { themeMode, cycleTheme, themeName } = useThemeMode();
  const { addToCache, cache } = useOfflineCache();
  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceRecorder();
  const isLoading = isCapturing || isProcessing || isTranscribing;
  
  // Audio management refs
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
      const data = await aiService.openAiTts(text, language);

      if (data?.audioContent) {
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
    const MAX_RETRIES = 2;
    
    try {
      setIsProcessing(true);
      triggerHaptic('capture');
      
      speakText(question ? "Processing your question..." : "Analyzing image...");
      
      // Preprocess image for better results
      const processedImage = await preprocessImage(imageDataUrl, {
        enhanceContrast: true,
        adjustBrightness: true,
      });

      // Compress for faster upload
      const compressedImage = await compressImage(processedImage, 0.85);
      
      // Use OpenAI for comprehensive unified analysis
      const analysisData = await aiService.analyzeImage({
        imageDataUrl: compressedImage,
        language,
        detailLevel,
        isQuickMode,
        question,
      });

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

      // Add to cache for offline access
      const cacheId = addToCache({
        mode: currentMode,
        description,
        imageData: compressedImage,
      });

      // Add to analysis history
      const newEntry: AnalysisEntry = {
        id: cacheId,
        type: currentMode,
        description,
        timestamp,
        language,
        metadata: {
          confidence: 0.9 // Default confidence for OpenAI
        }
      };
      
      setAnalysisHistory(prev => [newEntry, ...prev.slice(0, 9)]); // Keep last 10

      // Speak the description
      speakText(question ? `Answer: ${description}` : description);
      triggerHaptic('success');
      setRetryCount(0); // Reset retry count on success
      
      toast({
        title: question ? "Voice Question Answered" : "Comprehensive Analysis Complete",
        description: question ? "Your question has been answered and is being read aloud" : "Complete scene analysis is being read aloud",
      });

    } catch (error) {
      console.error('Analysis error:', error);
      triggerHaptic('error');
      
      // Retry logic with exponential backoff
      if (retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        setRetryCount(prev => prev + 1);
        
        toast({
          title: `Retrying (${retryCount + 1}/${MAX_RETRIES})`,
          description: `Analysis failed. Retrying in ${delay / 1000} seconds...`,
        });
        
        setTimeout(() => {
          analyzeImage(imageDataUrl, question);
        }, delay);
      } else {
        setRetryCount(0);
        toast({
          title: "Analysis Failed",
          description: error.message || "Could not analyze the image after multiple attempts. Please try again.",
          variant: "destructive"
        });
        speakText("Analysis failed after multiple attempts. Please try again.");
      }
    } finally {
      if (retryCount >= MAX_RETRIES || retryCount === 0) {
        setIsProcessing(false);
      }
    }
  }, [detailLevel, language, isQuickMode, speakText, toast, currentMode, triggerHaptic, retryCount]);

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


  // Long-press on capture button (voice mode)
  const longPressFiredRef = useRef(false);

  const handleCaptureAction = useCallback(() => {
    if (isLoading) return;
    if (isVoiceMode && isRecording) stopVoiceAssistant();
    else if (isVoiceMode) { setIsVoiceMode(false); setCapturedImageForVoice(null); }
    else captureImage();
  }, [isLoading, isVoiceMode, isRecording, stopVoiceAssistant, captureImage]);

  const mainButtonLongPress = useEnhancedGestures({
    onLongPress: () => {
      if (!isLoading && !isVoiceMode) {
        longPressFiredRef.current = true;
        triggerHaptic('longPress');
        startVoiceAssistant();
      }
    },
  });

  // Global gesture system
  const globalGestures = useEnhancedGestures({
    onTwoFingerTap: () => {
      triggerHaptic('selection');
      onSettingsClick();
    },
    onSwipeDown: () => {
      // Scroll to history if exists
      const historyElement = document.querySelector('[data-history]');
      historyElement?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Emergency tap detection removed from root — use dedicated SOS button in header

  const copyToClipboard = useCallback(async () => {
    if (!lastDescription) return;
    
    try {
      await navigator.clipboard.writeText(lastDescription);
      triggerHaptic('success');
      toast({
        title: "Copied!",
        description: "Description copied to clipboard",
      });
    } catch (error) {
      triggerHaptic('error');
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  }, [lastDescription, toast, triggerHaptic]);

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
      
      const data = await aiService.getContextualInfo(query, language);

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

  // Initialize audio, check tutorial, and welcome message
  useEffect(() => {
    // Check if tutorial has been completed
    const tutorialCompleted = localStorage.getItem('tutorial-completed');
    if (!tutorialCompleted) {
      setShowTutorial(true);
      return;
    }

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
            ? "Welcome to Blind Vision. Tap the white capture button to analyze your surroundings. Press H for keyboard shortcuts."
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
        case 'v':
          event.preventDefault();
          if (!isLoading && !isVoiceMode) startVoiceAssistant();
          break;
        case 'h':
          event.preventDefault();
          speakText("Keyboard shortcuts: Spacebar or Enter to take picture, V for voice assistant, R to replay description, C to copy, I for more info, S for settings, Q for quick mode, T for theme, H for help.");
          break;
        case 't':
          event.preventDefault();
          const newTheme = cycleTheme();
          triggerHaptic('selection');
          speakText(`Theme changed to ${newTheme}`);
          break;
        case 'escape':
          event.preventDefault();
          stopAllAudio();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isLoading, lastDescription, captureImage, replayDescription, copyToClipboard, getContextualInfo, onSettingsClick, onQuickModeToggle, speakText, stopAllAudio, isVoiceMode, isRecording, startVoiceAssistant, stopVoiceAssistant]);

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

  // Removed overlay service - using in-app controls only

  return (
    <div 
      className="min-h-screen bg-background text-foreground relative overflow-x-hidden safe-area-top safe-area-bottom"
      {...globalGestures}
    >
      {showTutorial && (
        <TutorialOverlay 
          onComplete={() => setShowTutorial(false)}
          speakText={speakText}
        />
      )}

      {showEmergencySOS && (
        <EmergencySOS
          onClose={() => {
            setShowEmergencySOS(false);
            speakText('Emergency panel closed');
          }}
          speakText={speakText}
          currentLocation={currentLocation}
        />
      )}

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-5 pb-2 max-w-md mx-auto w-full">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Blind Vision</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              AI visual assistant
              {isQuickMode && (
                <span className="inline-flex items-center gap-1 bv-pill py-0.5 px-2 text-[10px]">
                  <Zap className="w-3 h-3" aria-hidden="true" />
                  Quick
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                triggerHaptic('warning');
                setShowEmergencySOS(true);
                speakText('Emergency panel opened');
              }}
              variant="outline"
              size="sm"
              className="rounded-full h-10 min-h-0 px-3 border-foreground/40 font-semibold text-xs tracking-wide"
              aria-label="Open emergency SOS panel"
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              SOS
            </Button>
            <Button
              onClick={() => {
                cycleTheme();
                triggerHaptic('selection');
                toast({ title: 'Theme Changed', description: `Now using ${themeName}` });
              }}
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 min-h-0 min-w-0 border-foreground/30"
              aria-label={`Change theme. Current: ${themeName}`}
            >
              <Palette className="w-4 h-4" />
            </Button>
            <Button
              onClick={onSettingsClick}
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 min-h-0 min-w-0 border-foreground/30"
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 flex flex-col items-center px-4 pb-8 pt-4 space-y-5 max-w-md mx-auto w-full animate-fade-in-up">
          
          {/* Capture zone */}
          <section className="flex flex-col items-center w-full">
            <button
              {...mainButtonLongPress}
              onClick={() => {
                if (longPressFiredRef.current) {
                  longPressFiredRef.current = false;
                  return;
                }
                handleCaptureAction();
              }}
              disabled={isLoading && !isRecording}
              className={`
                bv-capture-btn critical-button flex items-center justify-center
                disabled:opacity-60 disabled:cursor-not-allowed
                ${isVoiceMode ? 'bv-capture-btn--voice' : ''}
                ${isRecording ? 'bv-capture-btn--recording' : ''}
                ${isLoading ? 'animate-pulse' : ''}
              `}
              title={isVoiceMode && isRecording ? "Stop recording" : isVoiceMode ? "Cancel voice mode" : "Tap to capture and analyze"}
              aria-label={isVoiceMode && isRecording ? 'Stop recording' : isVoiceMode ? 'Cancel voice mode' : isLoading ? 'Processing' : 'Capture and analyze scene'}
            >
              {isLoading ? (
                <Loader2 className="w-14 h-14 animate-spin" />
              ) : isVoiceMode && isRecording ? (
                <MicOff className="w-14 h-14" />
              ) : isVoiceMode ? (
                <Mic className="w-14 h-14" />
              ) : (
                <Eye className="w-14 h-14" strokeWidth={1.5} />
              )}
            </button>

            <div className="bv-pill mt-5" role="status" aria-live="polite" aria-atomic="true">
              {isVoiceMode
                ? isRecording ? 'Recording…' : isTranscribing ? 'Processing…' : 'Voice Ready'
                : isProcessing ? 'Analyzing…' : isCapturing ? 'Capturing…' : 'Tap to Analyze'}
            </div>

            <p className="text-center text-sm text-muted-foreground max-w-xs mt-3 leading-relaxed">
              {isVoiceMode 
                ? (isRecording 
                    ? "Speak your question, then tap again when done."
                    : isTranscribing
                      ? "Processing your voice question…"
                      : "Image captured. Recording your question…")
                : "Point your camera and tap to get a full scene description — text, objects, navigation, and safety."
              }
            </p>
          </section>

          {/* Quick actions row */}
          {!isVoiceMode && (
            <section className="flex flex-wrap gap-2 justify-center w-full">
              <Button
                onClick={startVoiceAssistant}
                disabled={isLoading}
                className="bv-btn-white rounded-full px-5 min-h-[44px] h-11"
              >
                <Mic className="w-4 h-4" />
                Voice Assistant
              </Button>

              {lastDescription && (
                <>
                  <Button
                    onClick={replayDescription}
                    disabled={isSpeaking}
                    variant="outline"
                    size="sm"
                    className="rounded-full min-h-[44px] h-11 px-4"
                  >
                    <Volume2 className="w-4 h-4" />
                    Replay
                  </Button>
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="sm"
                    className="rounded-full min-h-[44px] h-11 px-4"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                  <Button
                    onClick={getContextualInfo}
                    disabled={isGettingContext}
                    variant="outline"
                    size="sm"
                    className="rounded-full min-h-[44px] h-11 px-4"
                  >
                    {isGettingContext ? <Loader2 className="w-4 h-4 animate-spin" /> : <Info className="w-4 h-4" />}
                    More Info
                  </Button>
                </>
              )}
            </section>
          )}

          {/* Latest result */}
          {lastDescription && (
            <Card className="bv-surface-strong w-full shadow-none animate-fade-in">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Latest Analysis
                  {isSpeaking && (
                    <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground ml-auto">
                      <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                      Speaking
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <p className="text-sm text-foreground/90 leading-relaxed selectable analysis-text">{lastDescription}</p>
                {contextualInfo && (
                  <div className="mt-3 pt-3 border-t border-foreground/10">
                    <p className="text-xs font-medium text-foreground mb-1">Additional context</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{contextualInfo}</p>
                  </div>
                )}
                {lastAnalysis && (
                  <p className="text-[11px] text-muted-foreground mt-3">
                    {new Date(lastAnalysis.timestamp).toLocaleTimeString()} · {lastAnalysis.language.toUpperCase()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <AnalysisHistory
            history={analysisHistory}
            onReplay={(description) => speakText(description, true)}
            onClear={() => setAnalysisHistory([])}
            speakText={speakText}
          />

          <EmergencyPanel
            speakText={speakText}
            currentLocation={currentLocation}
          />
        </main>
      </div>

      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};