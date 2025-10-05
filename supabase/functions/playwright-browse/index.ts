import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { url, action = 'browse', query } = await req.json();
    
    if (!url && !query) {
      return new Response(
        JSON.stringify({ error: 'Either url or query parameter is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const HARPA_API_KEY = Deno.env.get('HARPA_API_KEY');
    
    if (!HARPA_API_KEY) {
      console.warn('⚠️ HARPA_API_KEY not configured, using basic fetch');
      
      // Fallback to simple fetch if no HARPA API key
      if (!url) {
        return new Response(
          JSON.stringify({ 
            error: 'HARPA_API_KEY not configured. For search queries, API key is required. For direct URLs, provide the url parameter.' 
          }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PlaywrightBrowse/1.0)',
        }
      });
      
      const html = await response.text();
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            url,
            title: extractTitle(html),
            content: html.substring(0, 5000), // First 5000 chars
            status: response.status
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🌐 Playwright Browse: Using HARPA AI for', action, url || query);

    // Use HARPA AI for intelligent browsing
    const harpaPayload: any = {
      apiKey: HARPA_API_KEY,
    };

    if (action === 'search' || query) {
      // Web search
      harpaPayload.query = query || url;
      harpaPayload.num_results = 5;
    } else if (url) {
      // URL scraping
      harpaPayload.url = url;
      harpaPayload.extract_content = true;
    }

    const harpaResponse = await fetch('https://api.harpa.ai/api/v1/grid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HARPA_API_KEY}`,
      },
      body: JSON.stringify(harpaPayload),
    });

    if (!harpaResponse.ok) {
      const errorText = await harpaResponse.text();
      console.error('❌ HARPA AI error:', harpaResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `HARPA AI error: ${harpaResponse.status}`,
          details: errorText.substring(0, 500)
        }),
        { 
          status: harpaResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const harpaData = await harpaResponse.json();
    
    console.log('✅ HARPA AI response received');

    return new Response(
      JSON.stringify({
        success: true,
        data: harpaData,
        source: 'harpa-ai'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Playwright browse error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : 'Untitled';
}
