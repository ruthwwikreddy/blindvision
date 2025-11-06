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

    const { imageDataUrl, language, detailLevel, isQuickMode = false, question, mode } = await req.json();
    
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

    // Generate prompt based on detail level, language, mode, and question
    const generatePrompt = (detailLevel: string, language: string, mode: string, question?: string): string => {
      const basePrompts = {
        low: "Briefly identify the most important thing in front of the camera. If it's an object, name it (e.g., 'Keloid ointment tube'). If it's an environment, identify the main element (e.g., 'Staircase with three steps ahead'). Include quick identification or a short translation of any visible sign/label. Keep it under 1–2 sentences.",
        medium: "Give a clear 2–3 sentence description. For objects: name, purpose, and key label text. For environments: describe people, obstacles, or signage (e.g., 'Restroom on your right'). Add basic context to help with awareness (e.g., 'This is a park with a pathway to your left').",
        high: "Provide a detailed 3–5 sentence explanation. For objects: include name, appearance, usage, warnings, and instructions (e.g., 'This is a tube of Keloid ointment used for scar treatment. Apply twice daily.'). For environments: include people, obstacles, distances, directions (left, right, forward), and deeper learning context (e.g., 'This park has benches along the pathway and a children's play area to the right.'). Translate any visible text/signs if present.",
        safety: "Warn only about hazards and obstacles. Use clear, urgent phrasing and directions. Examples: 'Caution: Step down 2 meters ahead.' 'Caution: Bicycle approaching from the left.' Focus only on immediate risks to user safety.",
        currency: "Identify the currency denomination, country, and condition. Include: (1) Currency type and value (e.g., 'US $20 bill'), (2) Series/year if visible, (3) Condition (new, worn, damaged), (4) Authenticity indicators if present. If multiple bills, count and list each.",
        medication: "Identify medication with complete safety information: (1) Drug name (brand and generic), (2) Dosage and form (e.g., '500mg tablet'), (3) Expiration date, (4) Warning labels, (5) Usage instructions, (6) Storage requirements. Warn about expired medications.",
        product: "Identify product with details: (1) Brand and product name, (2) Product type/category, (3) Key features or variants (e.g., flavor, size), (4) Visible price if any, (5) Barcode/QR code detection, (6) Usage or safety warnings. For food items, include allergen information if visible.",
        color: "Provide detailed color analysis: (1) Dominant colors in order (name and describe), (2) RGB values in format 'R,G,B' for each major color, (3) Color temperature (warm/cool), (4) Pattern or texture description, (5) Color contrast levels. Format: 'Primary: [color name] (R,G,B), Secondary: [color name] (R,G,B)'.",
        comparison: "Compare two scenes or states: (1) What changed between states, (2) What stayed the same, (3) Notable differences in position, quantity, or appearance, (4) Before/after assessment if temporal. Use clear 'Before' and 'After' language."
      };
      
      // Use mode-specific prompt if available, otherwise use detail level prompt
      let prompt = basePrompts[mode as keyof typeof basePrompts] || basePrompts[detailLevel as keyof typeof basePrompts] || basePrompts.medium;
      
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

    const prompt = generatePrompt(detailLevel, language, mode || 'surroundings', question);

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
            content: mode === 'reading' 
              ? 'You are an AI assistant helping visually impaired users read text and documents. Extract ALL visible text accurately, maintain structure, identify document types, and read tables row by row. For forms, identify fields and labels. Detect QR/barcodes. If no text, describe visual content.'
              : mode === 'navigation'
              ? 'You are an AI navigation assistant for visually impaired users. Provide clear path status, obstacle locations with distances, ground surface details, doorways, hazards, and directional guidance using clear terms (2 steps ahead, on your left). Warn about low-hanging objects, stairs, ramps.'
              : mode === 'currency'
              ? 'You are an AI assistant specialized in currency identification for visually impaired users. Identify bills and coins with denominations, countries, authenticity features, and condition. Be precise about values to prevent errors in financial transactions.'
              : mode === 'medication'
              ? 'You are an AI assistant specialized in medication identification for visually impaired users. Read all medication labels accurately including drug names, dosages, expiration dates, and warnings. Safety is critical - always highlight expiration status and warnings prominently.'
              : mode === 'product'
              ? 'You are an AI assistant specialized in product identification for visually impaired users. Identify products by brand, name, type, variants, and detect barcodes/QR codes. For food items, prioritize allergen information and expiration dates.'
              : mode === 'color'
              ? 'You are an AI assistant specialized in color analysis for visually impaired users. Provide accurate color identification with RGB values, describe color relationships, patterns, and contrast levels. Use precise color names and technical details.'
              : mode === 'comparison'
              ? 'You are an AI assistant specialized in scene comparison for visually impaired users. Analyze differences and similarities between states or viewpoints. Describe changes clearly using before/after language. Focus on what moved, appeared, or disappeared.'
              : 'You are an AI assistant helping visually impaired users understand their surroundings. Describe objects with approximate distances (e.g., "chair 1 meter ahead"), count people and their positions (no identification), spatial layout, dominant colors, visible text, hazards, and overall scene context.'
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