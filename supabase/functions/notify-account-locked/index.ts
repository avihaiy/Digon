import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LockNotificationRequest {
  identifier: string; // email or username that was used
  attemptCount: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { identifier, attemptCount }: LockNotificationRequest = await req.json();

    if (!identifier) {
      throw new Error("Missing identifier");
    }

    // Get admin email from app_settings
    const { data: settingData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "receipt_email")
      .maybeSingle();

    const adminEmail = settingData?.value || "avihaidj0@gmail.com";

    const now = new Date();
    const timestamp = now.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });

    // Send notification email using Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'בית הכנסת ברית שלום <onboarding@resend.dev>',
        to: [adminEmail],
        subject: '⚠️ התראת אבטחה - נסיון התחברות חשוד',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">⚠️ התראת אבטחה</h1>
            </div>
            
            <div style="background: #fef2f2; padding: 30px; border-radius: 0 0 10px 10px;">
              <h3 style="color: #991b1b; margin-top: 0;">נסיון התחברות חשוד זוהה</h3>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border-right: 4px solid #dc2626;">
                <p style="margin: 0 0 10px;"><strong>פרטי המשתמש/אימייל:</strong> ${identifier}</p>
                <p style="margin: 0 0 10px;"><strong>מספר נסיונות כושלים:</strong> ${attemptCount}</p>
                <p style="margin: 0;"><strong>זמן:</strong> ${timestamp}</p>
              </div>
              
              <div style="background: #fecaca; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <p style="margin: 0; color: #991b1b;">
                  <strong>מה לעשות?</strong><br>
                  אם אתה מזהה את המשתמש ורוצה לשחרר אותו, היכנס לניהול המשתמשים ולחץ על כפתור השחרור (🔓).
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="color: #888; font-size: 12px; text-align: center;">
                הודעה זו נשלחה אוטומטית ממערכת ניהול בית הכנסת<br>
                ${timestamp}
              </p>
            </div>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(`Failed to send email: ${JSON.stringify(emailResult)}`);
    }

    console.log("Lock notification email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-account-locked function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
