import { supabase } from '@/integrations/supabase/client';
import { getOpenAiApiKey, hasUserApiKey } from '@/lib/apiKeys';
import { isLocalEnvironment } from '@/lib/environment';

function useDirectOpenAI(): boolean {
  return hasUserApiKey() || !isLocalEnvironment();
}

function getApiKey(): string {
  const key = getOpenAiApiKey();
  if (!key) throw new Error('OpenAI API key not configured');
  return key;
}

const VOICE_MAP: Record<string, string> = {
  en: 'alloy',
  hi: 'nova',
  bn: 'nova',
  te: 'shimmer',
  mr: 'nova',
  ta: 'shimmer',
  gu: 'nova',
  kn: 'shimmer',
  ml: 'nova',
  pa: 'alloy',
  or: 'nova',
  ur: 'nova',
  es: 'nova',
  fr: 'shimmer',
  de: 'echo',
  ja: 'shimmer',
  ko: 'nova',
  zh: 'alloy',
};

function generateAnalysisPrompt(detailLevel: string, language: string, question?: string): string {
  const comprehensivePrompt =
    detailLevel === 'high' || detailLevel === 'full'
      ? `Provide comprehensive analysis covering:

1. SCENE OVERVIEW: Describe the environment, main objects, and spatial layout
2. TEXT & SIGNS: Read all visible text, labels, signs, or documents
3. NAVIGATION: Note obstacles, distances, directions, pathways, stairs, or hazards
4. SAFETY: Identify any immediate risks or warnings
5. SPECIAL ITEMS (if present):
   - Currency: denomination, country, condition
   - Medication: name, dosage, expiration, warnings
   - Products: brand, type, price, barcodes, allergens
   - Colors: dominant colors with RGB values (R,G,B format)

Keep response structured but natural. Prioritize most relevant information first.`
      : detailLevel === 'medium'
        ? `Describe what's in the image including: main objects, visible text/labels, any obstacles or navigation info, and safety concerns. Mention currency, medications, or products if present.`
        : `Briefly identify the main elements and any critical text or safety information.`;

  let prompt = question
    ? `Answer this question about the image: "${question}"\n\nAlso provide: ${comprehensivePrompt}`
    : comprehensivePrompt;

  if (language !== 'en') {
    const languageNames: Record<string, string> = {
      es: 'Spanish', fr: 'French', de: 'German', zh: 'Chinese', ja: 'Japanese',
      ar: 'Arabic', hi: 'Hindi', bn: 'Bengali', te: 'Telugu', mr: 'Marathi',
      ta: 'Tamil', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi',
      or: 'Odia', ur: 'Urdu',
    };
    const languageName = languageNames[language] || language;
    prompt += ` Please respond in ${languageName}.`;
  }

  return prompt;
}

async function analyzeImageDirect(params: {
  imageDataUrl: string;
  language: string;
  detailLevel: string;
  isQuickMode?: boolean;
  question?: string;
}) {
  const { imageDataUrl, language, detailLevel, question } = params;
  const effectiveDetail = params.isQuickMode ? 'low' : detailLevel === 'full' ? 'high' : detailLevel === 'small' ? 'low' : detailLevel;
  const prompt = generateAnalysisPrompt(effectiveDetail, language, question);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a comprehensive AI visual assistant for visually impaired users. Analyze images holistically covering: scene understanding, text/document reading, navigation guidance, safety warnings, and specialized identification (currency, medications, products, colors). Provide clear, structured information with distances, directions, and actionable details. Prioritize safety and accuracy.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
                detail: effectiveDetail === 'high' || effectiveDetail === 'full' ? 'high' : 'low',
              },
            },
          ],
        },
      ],
      max_tokens: effectiveDetail === 'high' || effectiveDetail === 'full' ? 1000 : effectiveDetail === 'medium' ? 500 : 200,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image analysis failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return {
    description: data.choices[0].message.content as string,
    language,
    detailLevel: effectiveDetail,
    timestamp: new Date().toISOString(),
    source: 'openai-direct',
  };
}

async function textToSpeechDirect(text: string, language: string) {
  const selectedVoice = VOICE_MAP[language] || 'alloy';

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: selectedVoice,
      response_format: 'mp3',
      speed: 0.9,
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 32768;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return {
    audioContent: btoa(binary),
    voice: selectedVoice,
    timestamp: new Date().toISOString(),
  };
}

async function speechToTextDirect(base64Audio: string, language: string) {
  const binary = atob(base64Audio);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const formData = new FormData();
  formData.append('file', new Blob([bytes], { type: 'audio/webm' }), 'audio.webm');
  formData.append('model', 'whisper-1');
  if (language !== 'en') formData.append('language', language);

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getApiKey()}` },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.status}`);
  }

  const result = await response.json();
  return { text: result.text as string, language, timestamp: new Date().toISOString() };
}

export async function analyzeImage(params: {
  imageDataUrl: string;
  language: string;
  detailLevel: string;
  isQuickMode?: boolean;
  question?: string;
}) {
  if (useDirectOpenAI()) {
    return analyzeImageDirect(params);
  }

  const { data, error } = await supabase.functions.invoke('analyze-image', { body: params });
  if (error) throw new Error(error.message || 'Analysis failed');
  return data;
}

export async function openAiTts(text: string, language: string) {
  if (useDirectOpenAI()) {
    return textToSpeechDirect(text, language);
  }

  const { data, error } = await supabase.functions.invoke('openai-tts', {
    body: { text, language, voice: 'alloy' },
  });
  if (error) throw new Error(error.message || 'TTS failed');
  return data;
}

export async function speechToText(base64Audio: string, language: string) {
  if (useDirectOpenAI()) {
    return speechToTextDirect(base64Audio, language);
  }

  const { data, error } = await supabase.functions.invoke('speech-to-text', {
    body: { audio: base64Audio, language },
  });
  if (error) throw new Error(error.message || 'Transcription failed');
  return data;
}

export async function getContextualInfo(query: string, language: string) {
  if (useDirectOpenAI()) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Provide brief, helpful contextual information about objects or scenes for visually impaired users. Be concise and practical.',
          },
          { role: 'user', content: `Provide additional context about: ${query}` },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) throw new Error(`Context lookup failed: ${response.status}`);
    const data = await response.json();
    return { contextualInfo: data.choices[0].message.content as string };
  }

  const { data, error } = await supabase.functions.invoke('contextual-info', {
    body: { query, language },
  });
  if (error) throw new Error(error.message || 'Context lookup failed');
  return data;
}

export async function validateOpenAiApiKey(key: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key.trim()}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}
