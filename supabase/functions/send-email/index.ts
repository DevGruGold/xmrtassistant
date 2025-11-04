import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-eliza-key',
};

interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  from_name?: string;
  reply_to?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: any[];
  executive_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const EMAIL_FROM_ADDRESS = Deno.env.get('EMAIL_FROM_ADDRESS') || 'onboarding@resend.dev';
    const EMAIL_FROM_NAME = Deno.env.get('EMAIL_FROM_NAME') || 'XMRT Ecosystem';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { to, subject, html, from, from_name, reply_to, cc, bcc, attachments, executive_name } = await req.json() as EmailMessage;

    if (!to || !subject || !html) {
      throw new Error('to, subject, and html are required');
    }

    const startTime = Date.now();

    const fromAddress = from || EMAIL_FROM_ADDRESS;
    const fromName = from_name || EMAIL_FROM_NAME;
    const fromHeader = `${fromName} <${fromAddress}>`;

    // Send via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromHeader,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to,
        cc,
        bcc,
        attachments,
      }),
    });

    const result = await resendResponse.json();
    const deliveryTime = Date.now() - startTime;

    const recipients = Array.isArray(to) ? to.join(', ') : to;

    // Log to communication_logs
    await supabase.from('communication_logs').insert({
      executive_name: executive_name || 'system',
      channel: 'email',
      recipient: recipients,
      message_preview: subject,
      success: resendResponse.ok,
      error_message: result.message || null,
      delivery_time_ms: deliveryTime,
    });

    if (!resendResponse.ok) {
      throw new Error(`Resend API error: ${result.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: result.id,
        delivery_time_ms: deliveryTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Email send error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
