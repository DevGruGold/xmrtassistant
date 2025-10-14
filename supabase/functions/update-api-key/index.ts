import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { service, secret_name, api_key } = await req.json();

    if (!service || !secret_name || !api_key) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: service, secret_name, api_key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key format based on service
    const validations: Record<string, (key: string) => boolean> = {
      'vercel_ai': (key) => key.startsWith('vck_'),
      'lovable_ai': (key) => key.startsWith('lvbl_'),
      'deepseek': (key) => key.startsWith('sk-'),
      'gemini': (key) => key.startsWith('AIza'),
      'openai': (key) => key.startsWith('sk-'),
    };

    const validator = validations[service];
    if (!validator || !validator(api_key)) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key format for this service' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the secret using Supabase CLI approach
    // Note: In a real deployment, you'd use Supabase Management API or Vault
    // For now, we'll store it in an environment variable pattern
    Deno.env.set(secret_name, api_key);

    console.log(`✅ Updated ${service} API key (${secret_name})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${service} API key updated successfully`,
        service,
        secret_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating API key:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
