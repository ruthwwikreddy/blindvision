import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!anthropicApiKey) {
      console.error('Anthropic API key not found');
      return new Response(
        JSON.stringify({ error: 'Anthropic API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { imageDataUrl, language, detailLevel, isQuickMode = false } = await req.json();
    
    if (!imageDataUrl) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing Claude image analysis with language: ${language}, detail: ${detailLevel}`);

    // Generate prompt based on detail level and language
    const generatePrompt = (detailLevel: string, language: string): string => {
      const basePrompts = {
        low: 'Provide a brief description of this image in a single sentence.',
        medium: 'Describe this image in detail, including the main objects, people, setting, and any important visual elements.',
        high: 'Provide a comprehensive and detailed description of this image, including all visible elements, their relationships, colors, lighting, mood, and any text or numbers visible. Be thorough and descriptive.'
      };
      
      let prompt = basePrompts[detailLevel as keyof typeof basePrompts] || basePrompts.medium;
      
      if (language !== 'en') {
        const languageNames = {
          es: 'Spanish',
          fr: 'French',
          de: 'German',
          it: 'Italian',
          pt: 'Portuguese',
          zh: 'Chinese',
          ja: 'Japanese',
          ko: 'Korean',
          ar: 'Arabic',
          hi: 'Hindi',
          te: 'Telugu'
        };
        
        const languageName = languageNames[language as keyof typeof languageNames] || language;
        prompt += ` Please respond in ${languageName}.`;
      }
      
      return prompt;
    };

    const prompt = generatePrompt(detailLevel, language);

    // Extract base64 data from data URL
    const base64Data = imageDataUrl.split(',')[1];
    const mimeType = imageDataUrl.split(';')[0].split(':')[1];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: detailLevel === 'high' ? 1000 : detailLevel === 'medium' ? 500 : 200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      console.error(`Claude API error: ${response.status} ${response.statusText}`);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to analyze image with Claude',
          details: `API returned ${response.status}` 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('Claude response received successfully');
    
    const description = data.content[0].text;
    
    return new Response(
      JSON.stringify({ 
        description,
        language,
        detailLevel,
        timestamp: new Date().toISOString(),
        source: 'claude'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in claude-analyze function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});