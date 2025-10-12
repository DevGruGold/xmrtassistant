import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

console.log(`🏥 Frontend Health Check Scheduler starting...`);

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`🔍 Invoking vercel-manager to check frontend health...`);

    // Invoke vercel-manager to check health
    const { data, error } = await supabase.functions.invoke('vercel-manager', {
      body: { action: 'get_frontend_status' }
    });

    if (error) {
      console.error('❌ Health check failed:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ Health check completed:`, data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        result: data,
        checked_at: new Date().toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in health check scheduler:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});
