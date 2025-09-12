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

    const { imageDataUrl, language, detailLevel, isQuickMode = false, question } = await req.json();
    
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

    // Generate prompt based on detail level, language, and question
    const generatePrompt = (detailLevel: string, language: string, question?: string): string => {
      const basePrompts = {
        low: "Briefly identify the most important thing in front of the camera. If it's an object, name it (e.g., 'Keloid ointment tube'). If it's an environment, identify the main element (e.g., 'Staircase with three steps ahead'). Include quick identification or a short translation of any visible sign/label. Keep it under 1–2 sentences.",
        medium: "Give a clear 2–3 sentence description. For objects: name, purpose, and key label text. For environments: describe people, obstacles, or signage (e.g., 'Restroom on your right'). Add basic context to help with awareness (e.g., 'This is a park with a pathway to your left').",
        high: "Provide a detailed 3–5 sentence explanation. For objects: include name, appearance, usage, warnings, and instructions (e.g., 'This is a tube of Keloid ointment used for scar treatment. Apply twice daily.'). For environments: include people, obstacles, distances, directions (left, right, forward), and deeper learning context (e.g., 'This park has benches along the pathway and a children's play area to the right.'). Translate any visible text/signs if present.",
        safety: "Warn only about hazards and obstacles. Use clear, urgent phrasing and directions. Examples: 'Caution: Step down 2 meters ahead.' 'Caution: Bicycle approaching from the left.' Focus only on immediate risks to user safety."
      };
      
      let prompt = basePrompts[detailLevel as keyof typeof basePrompts] || basePrompts.medium;
      
      // Add question context if provided
      if (question) {
        prompt = `Answer this question about the image: "${question}"\n\nAlso provide this context: ${prompt}`;
      }
      
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

    const prompt = generatePrompt(detailLevel, language, question);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that helps visually impaired users navigate their environment. Focus on describing objects, text, obstacles, and spatial relationships. For people, describe their general presence, position, and actions without identifying who they are (e.g., "a person sitting at a table" rather than trying to identify them).'
          },
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
        max_tokens: detailLevel === 'high' ? 1000 : detailLevel === 'medium' ? 500 : 200
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