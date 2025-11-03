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
    const { text, voice = 'alloy', speed = 1.0 } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('🎵 OpenAI TTS - Processing request:', {
      textLength: text.length,
      voice,
      speed
    });

    // Call OpenAI Text-to-Speech API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        speed: speed,
        response_format: 'mp3'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI TTS API error:', errorText);
      
      // Check for quota error and provide graceful fallback
      if (errorText.includes('insufficient_quota')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'OpenAI TTS quota exceeded. Voice features temporarily unavailable.',
          fallback: 'text_only'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`OpenAI TTS API error: ${errorText}`);
    }

    // Convert audio buffer to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    console.log('✅ OpenAI TTS - Audio generated successfully:', {
      audioSize: arrayBuffer.byteLength,
      base64Length: base64Audio.length
    });

    return new Response(JSON.stringify({
      success: true,
      audioContent: base64Audio,
      voice,
      speed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ OpenAI TTS function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});