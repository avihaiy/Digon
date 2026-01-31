import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UnlockUserRequest {
  userId: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create a client with the user's token to verify they're an admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user: currentUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !currentUser) {
      throw new Error("Unauthorized");
    }

    // Check if the user is an admin
    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (roleError || !roleData || roleData.role !== "admin") {
      throw new Error("Only admins can unlock users");
    }

    // Parse the request body
    const { userId }: UnlockUserRequest = await req.json();

    if (!userId) {
      throw new Error("Missing userId");
    }

    // Use the service role client to unlock the user
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Unlock the user by resetting ban_duration and confirming email
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { 
        ban_duration: 'none',
        email_confirm: true
      }
    );

    if (updateError) {
      throw new Error(`Failed to unlock user: ${updateError.message}`);
    }

    console.log(`User ${userId} unlocked by admin ${currentUser.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "User unlocked successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in unlock-user function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: errorMessage === "Unauthorized" || errorMessage.includes("admin") ? 403 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
