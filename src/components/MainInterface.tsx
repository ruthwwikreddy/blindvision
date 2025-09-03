import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Camera, Loader2, Volume2, Settings, Copy, Zap, Info, Brain, Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { overlayService } from '@/services/overlayService';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import '../types/speech.d.ts';


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
  const [isListening, setIsListening] = useState(false);
  const [voiceCommands, setVoiceCommands] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  
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

  const analyzeImage = useCallback(async (imageDataUrl: string) => {
    try {
      setIsProcessing(true);
      
      // Use OpenAI for analysis
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          imageDataUrl,
          language,
          detailLevel,
          isQuickMode
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
  }, [detailLevel, language, isQuickMode, speakText, toast]);

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

  // Voice command system  
  const initializeVoiceRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      console.log('Voice recognition started');
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('Voice recognition ended');
      // Restart if voice commands are enabled
      if (voiceCommands) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.log('Failed to restart recognition:', e);
          }
        }, 1000);
      }
    };

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const command = result[0].transcript.toLowerCase().trim();
        console.log('Voice command received:', command);
        handleVoiceCommand(command);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setVoiceCommands(false);
        speakText("Voice commands disabled. Microphone access denied.");
      }
    };

    recognitionRef.current = recognition;
    
    if (voiceCommands) {
      try {
        recognition.start();
      } catch (e) {
        console.log('Failed to start recognition:', e);
      }
    }
  }, [language, voiceCommands]);

  const handleVoiceCommand = useCallback((command: string) => {
    console.log('Processing voice command:', command);
    
    // Stop current audio first
    stopAllAudio();
    
    // English commands
    if (language === 'en') {
      if (command.includes('take picture') || command.includes('capture') || command.includes('analyze') || command.includes('look')) {
        speakText("Taking picture and analyzing...");
        captureImage();
      } else if (command.includes('replay') || command.includes('repeat') || command.includes('say again')) {
        if (lastDescription) {
          speakText("Replaying description...");
          replayDescription();
        } else {
          speakText("No description to replay. Take a picture first.");
        }
      } else if (command.includes('stop') || command.includes('quiet') || command.includes('silence')) {
        speakText("Stopping audio.");
        stopAllAudio();
      } else if (command.includes('help') || command.includes('commands')) {
        speakText("Available commands: Say 'take picture' to analyze your surroundings, 'replay' to hear the last description again, 'more info' for additional context, 'copy' to copy description, 'settings' to open settings, or 'stop' to stop audio.");
      } else if (command.includes('more info') || command.includes('context') || command.includes('details')) {
        if (lastDescription) {
          getContextualInfo();
        } else {
          speakText("No description available. Take a picture first.");
        }
      } else if (command.includes('copy')) {
        if (lastDescription) {
          copyToClipboard();
          speakText("Description copied to clipboard.");
        } else {
          speakText("No description to copy.");
        }
      } else if (command.includes('settings') || command.includes('preferences')) {
        speakText("Opening settings.");
        onSettingsClick();
      } else if (command.includes('quick mode')) {
        speakText("Toggling quick mode.");
        onQuickModeToggle();
      }
    }
    // Hindi commands
    else if (language === 'hi') {
      if (command.includes('फोटो') || command.includes('तस्वीर') || command.includes('देखो')) {
        speakText("तस्वीर ले रहे हैं और विश्लेषण कर रहे हैं...");
        captureImage();
      } else if (command.includes('दोबारा') || command.includes('फिर से')) {
        if (lastDescription) {
          replayDescription();
        } else {
          speakText("दोहराने के लिए कोई विवरण नहीं है। पहले तस्वीर लें।");
        }
      } else if (command.includes('बंद') || command.includes('रोको')) {
        speakText("ऑडियो बंद कर रहे हैं।");
        stopAllAudio();
      } else if (command.includes('मदद') || command.includes('कमांड')) {
        speakText("उपलब्ध कमांड: 'फोटो लो' कहें अपने आसपास का विश्लेषण करने के लिए, 'दोबारा' अंतिम विवरण सुनने के लिए, 'और जानकारी' अतिरिक्त संदर्भ के लिए।");
      }
    }
    // Telugu commands
    else if (language === 'te') {
      if (command.includes('ఫోటో') || command.includes('చిత్రం') || command.includes('చూడు')) {
        speakText("చిత్రం తీసి విశ్లేషిస్తున్నాం...");
        captureImage();
      } else if (command.includes('మళ్లీ') || command.includes('మరోసారి')) {
        if (lastDescription) {
          replayDescription();
        } else {
          speakText("మళ్లీ వినడానికి వివరణ లేదు. మొదట చిత్రం తీయండి।");
        }
      } else if (command.includes('ఆపు') || command.includes('మూకుపోవు')) {
        speakText("ఆడియో ఆపుతున్నాం.");
        stopAllAudio();
      }
    }
  }, [language, lastDescription, captureImage, replayDescription, getContextualInfo, copyToClipboard, onSettingsClick, onQuickModeToggle, speakText, stopAllAudio]);

  const toggleVoiceCommands = useCallback(() => {
    setVoiceCommands(!voiceCommands);
    if (!voiceCommands) {
      speakText("Voice commands enabled. You can now use voice to control the app.");
      initializeVoiceRecognition();
    } else {
      speakText("Voice commands disabled.");
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    }
  }, [voiceCommands, initializeVoiceRecognition, speakText]);

  const isLoading = isCapturing || isProcessing;

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

  // Initialize voice recognition
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeVoiceRecognition();
    }, 3000); // Start after welcome message

    return () => {
      clearTimeout(timer);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [initializeVoiceRecognition]);

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
            captureImage();
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
          toggleVoiceCommands();
          break;
        case 'h':
          event.preventDefault();
          speakText("Keyboard shortcuts: Spacebar or Enter to take picture, R to replay description, C to copy, I for more info, S for settings, Q for quick mode, V to toggle voice commands, H for help.");
          break;
        case 'escape':
          event.preventDefault();
          stopAllAudio();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isLoading, lastDescription, captureImage, replayDescription, copyToClipboard, getContextualInfo, onSettingsClick, onQuickModeToggle, toggleVoiceCommands, speakText, stopAllAudio]);

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      {/* Hidden elements for camera capture */}
      <video ref={videoRef} className="hidden" playsInline />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Control Buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          onClick={toggleVoiceCommands}
          variant={voiceCommands ? "default" : "outline"}
          size="icon"
          className={`border-border ${voiceCommands ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
          title={voiceCommands ? "Voice Commands Active" : "Enable Voice Commands"}
          aria-label={voiceCommands ? "Disable voice commands" : "Enable voice commands"}
        >
          {isListening ? <Mic className="w-4 h-4 animate-pulse" /> : voiceCommands ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </Button>
        <Button
          onClick={onQuickModeToggle}
          variant={isQuickMode ? "default" : "outline"}
          size="icon"
          className={`border-border ${isQuickMode ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
          title={isQuickMode ? "Quick Mode Active" : "Enable Quick Mode"}
          aria-label={isQuickMode ? "Disable quick mode" : "Enable quick mode"}
        >
          <Zap className="w-4 h-4" />
        </Button>
        <Button
          onClick={onSettingsClick}
          variant="outline"
          size="icon"
          className="border-border hover:bg-muted"
          title="Open Settings"
          aria-label="Open settings menu"
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
          aria-label={isLoading ? "Processing image..." : "Take picture and analyze surroundings"}
          role="button"
          tabIndex={0}
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
        <div className="mt-4 space-y-2">
          <p className="text-xs">
            <strong>Voice Commands:</strong> Say "take picture", "replay", "more info", "copy", "settings", "help", or "stop"
          </p>
          <p className="text-xs">
            <strong>Keyboard:</strong> Spacebar (capture), R (replay), C (copy), I (info), S (settings), H (help), Esc (stop)
          </p>
          {voiceCommands && (
            <div className="flex items-center justify-center gap-2 text-xs text-accent">
              <Mic className="w-3 h-3" />
              <span>Voice commands {isListening ? 'listening' : 'enabled'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};