import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    console.log('Analyze image function called');
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
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

    console.log(`Processing image analysis with language: ${language}, detail: ${detailLevel}`);

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
          hi: 'Hindi'
        };
        
        const languageName = languageNames[language as keyof typeof languageNames] || language;
        prompt += ` Please respond in ${languageName}.`;
      }
      
      return prompt;
    };

    const prompt = generatePrompt(detailLevel, language);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
                  url: imageDataUrl,
                  detail: detailLevel === 'high' ? 'high' : 'low'
                }
              }
            ]
          }
        ],
        max_tokens: detailLevel === 'high' ? 1000 : detailLevel === 'medium' ? 500 : 200,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
      const errorData = await response.text();
      console.error('Error details:', errorData);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to analyze image',
          details: `API returned ${response.status}` 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('OpenAI response received successfully');
    
    const description = data.choices[0].message.content;
    
    return new Response(
      JSON.stringify({ 
        description,
        language,
        detailLevel,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-image function:', error);
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