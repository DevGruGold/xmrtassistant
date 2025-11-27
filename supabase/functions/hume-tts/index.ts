import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate text to prevent memory issues (max 1000 chars)
    const MAX_TEXT_LENGTH = 1000;
    const truncatedText = text.length > MAX_TEXT_LENGTH 
      ? text.substring(0, MAX_TEXT_LENGTH) + '...' 
      : text;

    const humeApiKey = Deno.env.get('HUME_API_KEY');
    if (!humeApiKey) {
      console.error('HUME_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Hume API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default voice ID if not provided
    const selectedVoiceId = voiceId || 'c7aa10be-57c1-4647-9306-7ac48dde3536';

    console.log('🎙️ Hume TTS request:', { 
      originalLength: text.length,
      truncatedLength: truncatedText.length,
      wasTruncated: text.length > MAX_TEXT_LENGTH,
      voiceId: selectedVoiceId,
      textPreview: truncatedText.substring(0, 50) + '...'
    });

    // Call Hume TTS API with X-Hume-Api-Key header
    const response = await fetch('https://api.hume.ai/v0/tts', {
      method: 'POST',
      headers: {
        'X-Hume-Api-Key': humeApiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        utterances: [{ 
          text: truncatedText, 
          voice: { id: selectedVoiceId } 
        }],
        format: { type: 'mp3' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Hume TTS API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Hume TTS API error', 
          status: response.status,
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the audio data as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64 for easy client-side handling
    const base64Audio = btoa(
      new Uint8Array(audioBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    console.log('✅ Hume TTS success, audio size:', audioBuffer.byteLength, 'bytes');

    return new Response(
      JSON.stringify({ 
        audio: base64Audio,
        format: 'mp3',
        size: audioBuffer.byteLength
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Hume TTS error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
