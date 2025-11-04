import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-eliza-key',
};

interface LinkedInMessage {
  text: string;
  url?: string;
  title?: string;
  description?: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
  executive_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LINKEDIN_ACCESS_TOKEN = Deno.env.get('LINKEDIN_ACCESS_TOKEN');
    if (!LINKEDIN_ACCESS_TOKEN) {
      throw new Error('LINKEDIN_ACCESS_TOKEN not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { text, url, title, description, visibility, executive_name } = await req.json() as LinkedInMessage;

    if (!text) {
      throw new Error('text is required');
    }

    const startTime = Date.now();

    // Get user profile to get person URN
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to get LinkedIn profile');
    }

    const profile = await profileResponse.json();
    const author = `urn:li:person:${profile.id}`;

    // Create share payload
    const sharePayload: any = {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text,
          },
          shareMediaCategory: url ? 'ARTICLE' : 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility || 'PUBLIC',
      },
    };

    // Add article details if URL provided
    if (url) {
      sharePayload.specificContent['com.linkedin.ugc.ShareContent'].media = [{
        status: 'READY',
        originalUrl: url,
        title: { text: title || url },
        description: { text: description || '' },
      }];
    }

    // Post to LinkedIn
    const linkedinResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(sharePayload),
    });

    const result = await linkedinResponse.json();
    const deliveryTime = Date.now() - startTime;

    // Log to communication_logs
    await supabase.from('communication_logs').insert({
      executive_name: executive_name || 'system',
      channel: 'linkedin',
      recipient: visibility || 'PUBLIC',
      message_preview: text.substring(0, 100),
      success: linkedinResponse.ok,
      error_message: result.message || null,
      delivery_time_ms: deliveryTime,
    });

    if (!linkedinResponse.ok) {
      throw new Error(`LinkedIn API error: ${result.message || linkedinResponse.status}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        post_id: result.id,
        delivery_time_ms: deliveryTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('LinkedIn send error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
