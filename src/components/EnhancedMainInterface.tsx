import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Camera, Loader2, Volume2, Settings, Copy, Zap, Info, Brain, Mic, MicOff, BookOpen, Navigation, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { overlayService } from '@/services/overlayService';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { ModeSelector, type AppMode } from './ModeSelector';
import { AnalysisHistory, type AnalysisEntry } from './AnalysisHistory';
import { EmergencyPanel } from './EmergencyPanel';
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
  const [isListening, setIsListening] = useState(false);
  const [voiceCommands, setVoiceCommands] = useState(true);
  const [currentMode, setCurrentMode] = useState<AppMode>('surroundings');
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisEntry[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; address?: string }>();
  const [isVoiceInteractionMode, setIsVoiceInteractionMode] = useState(false);
  const [voiceQuestion, setVoiceQuestion] = useState<string>('');
  const [isProcessingQuestion, setIsProcessingQuestion] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
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

  const analyzeImage = useCallback(async (imageDataUrl: string) => {
    try {
      setIsProcessing(true);
      
      // Use OpenAI for analysis with mode-specific prompts
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          imageDataUrl,
          language,
          detailLevel: currentMode === 'reading' ? 'text-extraction' : currentMode === 'navigation' ? 'navigation-focused' : detailLevel,
          isQuickMode: currentMode === 'reading' ? false : isQuickMode
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
      const modePrefix = currentMode === 'reading' 
        ? "Text found: " 
        : currentMode === 'navigation' 
          ? "Navigation guidance: " 
          : "";

      // Speak the description
      speakText(modePrefix + description);
      
      toast({
        title: currentMode === 'reading' ? "Text Analysis Complete" 
              : currentMode === 'navigation' ? "Navigation Analysis Complete"
              : isQuickMode ? "Quick Analysis Complete" : "Scene Analysis Complete",
        description: currentMode === 'reading' ? "Text extracted and being read aloud"
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
      } else if (command.includes('reading mode') || command.includes('read mode')) {
        setCurrentMode('reading');
        speakText("Reading mode activated. Point your camera at text to extract and read it aloud.");
      } else if (command.includes('navigation mode') || command.includes('navigate')) {
        setCurrentMode('navigation');
        speakText("Navigation mode activated. Get directions and navigate spaces.");
      } else if (command.includes('surroundings mode') || command.includes('describe')) {
        setCurrentMode('surroundings');
        speakText("Surroundings mode activated. Analyze and describe your environment.");
      } else if (command.includes('emergency') || command.includes('help nearby')) {
        speakText("Finding emergency services and help nearby...");
        // Trigger emergency help function
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
          speakText("మళ్లీ వినడానికి వివరణ లేదు. మొదట చిత్రం తీయండి.");
        }
      } else if (command.includes('ఆపు') || command.includes('మూకుపోవు')) {
        speakText("ఆడియో ఆపుతున్నాం.");
        stopAllAudio();
      }
    }
  }, [language, lastDescription, captureImage, replayDescription, getContextualInfo, copyToClipboard, onSettingsClick, speakText, stopAllAudio, setCurrentMode]);

  // Voice interaction system (separate from voice commands)
  const initializeVoiceInteraction = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported for voice interaction');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US';

    recognition.onstart = () => {
      console.log('Voice interaction started');
    };

    recognition.onresult = (event) => {
      const result = event.results[0];
      if (result.isFinal) {
        const question = result[0].transcript;
        console.log('Voice question received:', question);
        setVoiceQuestion(question);
        processVoiceQuestion(question);
      }
    };

    recognition.onerror = (event) => {
      console.error('Voice interaction error:', event.error);
      setIsVoiceInteractionMode(false);
      if (event.error === 'not-allowed') {
        speakText("Microphone access denied for voice interaction.");
      }
    };

    recognition.onend = () => {
      setIsVoiceInteractionMode(false);
    };

    return recognition;
  }, [language]);

  const processVoiceQuestion = useCallback(async (question: string) => {
    if (!lastDescription && !currentLocation) {
      speakText("Please take a picture first or ensure location access to ask questions about your surroundings.");
      return;
    }

    setIsProcessingQuestion(true);
    
    try {
      const context = lastDescription || "User is asking about their current location and surroundings.";
      const locationContext = currentLocation ? `, Location: ${currentLocation.lat}, ${currentLocation.lng}` : "";
      
      const { data, error } = await supabase.functions.invoke('contextual-info', {
        body: {
          query: `Question: "${question}" Context: ${context}${locationContext}`,
          language
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to process voice question');
      }

      if (data && data.contextualInfo) {
        speakText(data.contextualInfo);
        toast({
          title: "Question Answered",
          description: "Voice response is being read aloud",
        });
      } else {
        throw new Error('No response received');
      }
    } catch (error) {
      console.error('Voice question processing error:', error);
      speakText("Sorry, I couldn't process your question. Please try again.");
      toast({
        title: "Voice Question Failed",
        description: "Could not process your question. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingQuestion(false);
    }
  }, [lastDescription, currentLocation, language, speakText, toast]);

  // Push-to-talk functionality with image capture
  const startPushToTalk = useCallback(async () => {
    if (isPushToTalkActive || isVoiceInteractionMode) return;
    
    try {
      setIsPushToTalkActive(true);
      
      // First, capture an image immediately
      console.log('Starting push-to-talk: capturing image...');
      await captureImage();
      
      // Then start voice recognition
      const recognition = initializeVoiceInteraction();
      if (recognition) {
        setIsVoiceInteractionMode(true);
        
        // Brief delay to let image processing start, then start listening
        setTimeout(() => {
          try {
            recognition.start();
            console.log('Voice recognition started for push-to-talk');
          } catch (e) {
            console.error('Failed to start voice recognition:', e);
            setIsVoiceInteractionMode(false);
            setIsPushToTalkActive(false);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error starting push-to-talk:', error);
      setIsPushToTalkActive(false);
      setIsVoiceInteractionMode(false);
    }
  }, [isPushToTalkActive, isVoiceInteractionMode, captureImage, initializeVoiceInteraction]);

  const stopPushToTalk = useCallback(() => {
    if (!isPushToTalkActive) return;
    
    console.log('Stopping push-to-talk');
    setIsPushToTalkActive(false);
    setIsVoiceInteractionMode(false);
    
    // Stop any active recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
  }, [isPushToTalkActive]);

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
          toggleVoiceCommands();
          break;
        case 'h':
          event.preventDefault();
          speakText("Keyboard shortcuts: Spacebar or Enter to take picture, R to replay description, C to copy, I for more info, S for settings, Q for quick mode, V to toggle voice commands, 1 for surroundings, 2 for reading, 3 for navigation, H for help.");
          break;
        case 'escape':
          event.preventDefault();
          stopAllAudio();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isLoading, lastDescription, captureImage, replayDescription, copyToClipboard, getContextualInfo, onSettingsClick, onQuickModeToggle, toggleVoiceCommands, speakText, stopAllAudio, setCurrentMode]);

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
            voiceCommands={voiceCommands}
            isListening={isListening}
          />
        </div>

        {/* Enhanced Main Action Area */}
        <div className="flex flex-col items-center space-y-6">
          
          {/* Enhanced Control Buttons */}
          <div className="absolute top-6 right-6 flex gap-3">
            <Button
              onClick={toggleVoiceCommands}
              variant={voiceCommands ? "default" : "outline"}
              size="icon"
              className={`
                glass border-2 backdrop-blur-md transition-all duration-300 hover:scale-105
                ${voiceCommands 
                  ? 'bg-primary/20 border-primary text-primary shadow-neon' 
                  : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
                }
              `}
              title={voiceCommands ? "Voice Commands Active" : "Enable Voice Commands"}
              aria-label={voiceCommands ? "Disable voice commands" : "Enable voice commands"}
            >
              {isListening ? (
                <Mic className="w-5 h-5 animate-pulse" />
              ) : voiceCommands ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </Button>
            
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

          {/* Enhanced Capture Button with Voice Interaction */}
          <div className="flex flex-col items-center animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative">
              {/* Push-to-Talk Button (slide from left) */}
              <Button
                onMouseDown={startPushToTalk}
                onMouseUp={stopPushToTalk}
                onMouseLeave={stopPushToTalk}
                onTouchStart={startPushToTalk}
                onTouchEnd={stopPushToTalk}
                disabled={isProcessingQuestion || isLoading}
                className={`
                  absolute -left-20 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full
                  glass border-2 backdrop-blur-md transition-all duration-300 hover:scale-105 select-none
                  ${isPushToTalkActive || isVoiceInteractionMode
                    ? 'bg-accent/20 border-accent text-accent shadow-neon animate-pulse' 
                    : 'border-border/50 hover:border-accent/50 hover:bg-accent/5'
                  }
                  ${isProcessingQuestion ? 'bg-primary/20 border-primary text-primary' : ''}
                `}
                title="Push to Talk - Hold to capture image and ask questions"
                aria-label="Hold to capture image and ask questions about surroundings"
              >
                {isProcessingQuestion ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isPushToTalkActive || isVoiceInteractionMode ? (
                  <Mic className="w-6 h-6 animate-pulse" />
                ) : (
                  <MessageCircle className="w-6 h-6" />
                )}
              </Button>

              {/* Main Capture Button */}
              <Button
                onClick={captureImage}
                disabled={isLoading}
                className={`
                  relative w-36 h-36 md:w-40 md:h-40 rounded-full 
                  glass border-4 border-primary/30 backdrop-blur-md transition-all duration-300 hover:scale-105 
                  bg-gradient-to-br from-primary/20 via-primary/10 to-transparent
                  shadow-elevated hover:shadow-2xl group overflow-hidden
                  ${isLoading ? 'animate-pulse' : 'hover:shadow-primary/25 active:scale-95'}
                `}
                title={currentMode === 'reading' ? "Extract and read text" : currentMode === 'navigation' ? "Get navigation guidance" : "Analyze surroundings"}
                aria-label={`${isLoading ? 'Processing...' : 'Take picture and analyze'}`}
               >
                {/* Background shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                {/* Icon */}
                <div className="relative z-10">
                  {isLoading ? (
                    <Loader2 className="w-16 h-16 md:w-20 md:h-20 text-primary-foreground animate-spin" />
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
            <div className="mt-4 px-4 py-2 glass rounded-full border border-primary/20">
              <p className="text-sm font-medium text-primary capitalize">
                {currentMode} Mode
              </p>
            </div>
          </div>

        {/* Action Buttons */}
        {lastDescription && (
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
            {currentMode === 'reading' 
              ? "Point your camera at text to read it aloud."
              : currentMode === 'navigation'
                ? "Get guidance for safe movement and navigation."
                : "Describe your surroundings with AI vision."
            }
          </p>
          {/* Push-to-Talk Instructions */}
          <div className="mt-3 p-3 glass rounded-lg border border-accent/20">
            <p className="text-xs text-accent font-medium mb-1">
              Push-to-Talk Voice Questions
            </p>
            <p className="text-xs">
              Hold the chat button to capture image and ask questions about your surroundings
            </p>
          </div>
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
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-4">
                <span>
                  {new Date(lastAnalysis.timestamp).toLocaleTimeString()}
                </span>
                <span className="capitalize">
                  {lastAnalysis.detailLevel} detail
                </span>
                <span className="capitalize">
                  {lastAnalysis.source} powered
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hidden elements for camera functionality */}
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};