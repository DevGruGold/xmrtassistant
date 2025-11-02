import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Service-specific validation rules
const SERVICE_VALIDATORS: Record<string, { prefix?: string; minLength: number; name: string }> = {
  openai: { prefix: 'sk-', minLength: 20, name: 'OpenAI' },
  deepseek: { prefix: 'sk-', minLength: 20, name: 'DeepSeek' },
  gemini: { prefix: 'AIza', minLength: 30, name: 'Google Gemini' },
  xai: { minLength: 10, name: 'xAI' },
  github: { prefix: 'ghp_', minLength: 36, name: 'GitHub' },
  elevenlabs: { minLength: 20, name: 'ElevenLabs' },
  vercel_ai: { prefix: 'vck_', minLength: 20, name: 'Vercel AI' },
  lovable_ai: { prefix: 'lvbl_', minLength: 20, name: 'Lovable AI' },
};

function validateAPIKey(service: string, apiKey: string): { valid: boolean; error?: string } {
  const validator = SERVICE_VALIDATORS[service.toLowerCase()];
  
  if (!validator) {
    console.warn(`⚠️ No validation rules for service: ${service}`);
    return { valid: true };
  }

  if (apiKey.length < validator.minLength) {
    return { 
      valid: false, 
      error: `${validator.name} API key must be at least ${validator.minLength} characters` 
    };
  }

  if (validator.prefix) {
    if (service === 'github') {
      if (!apiKey.startsWith('ghp_') && !apiKey.startsWith('github_pat_')) {
        return { 
          valid: false, 
          error: 'GitHub tokens must start with "ghp_" or "github_pat_"' 
        };
      }
    } else if (!apiKey.startsWith(validator.prefix)) {
      return { 
        valid: false, 
        error: `${validator.name} API keys must start with "${validator.prefix}"` 
      };
    }
  }

  return { valid: true };
}

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

    const validationResult = validateAPIKey(service, api_key);
    if (!validationResult.valid) {
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
