import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addDays, addWeeks, addMonths } from "https://esm.sh/date-fns@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    // Get due reminders that haven't been notified yet
    const { data: dueReminders, error: fetchError } = await supabase
      .from("reminders")
      .select("*")
      .eq("is_dismissed", false)
      .eq("notified", false)
      .lte("reminder_date", now);

    if (fetchError) throw fetchError;

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(JSON.stringify({ message: "No due reminders" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all manager/admin user IDs to notify
    const { data: managerRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "gabai"]);

    if (rolesError) throw rolesError;

    const userIds = [...new Set((managerRoles || []).map((r) => r.user_id))];

    let notificationsCreated = 0;
    let recurrencesCreated = 0;

    for (const reminder of dueReminders) {
      // Create a notification for each manager
      const notifications = userIds.map((userId) => ({
        user_id: userId,
        type: "info",
        message: `⏰ תזכורת: ${reminder.content}`,
        is_read: false,
      }));

      if (notifications.length > 0) {
        const { error: insertError } = await supabase
          .from("notifications")
          .insert(notifications);
        if (insertError) console.error("Insert notification error:", insertError);
        else notificationsCreated += notifications.length;
      }

      // Mark as notified
      await supabase
        .from("reminders")
        .update({ notified: true })
        .eq("id", reminder.id);

      // Handle recurring: create next instance
      if (reminder.recurrence) {
        const currentDate = new Date(reminder.reminder_date);
        let nextDate: Date;

        switch (reminder.recurrence) {
          case "daily":
            nextDate = addDays(currentDate, 1);
            break;
          case "weekly":
            nextDate = addWeeks(currentDate, 1);
            break;
          case "monthly": {
            // Preserve the original day of month
            const originalDay = currentDate.getDate();
            nextDate = addMonths(currentDate, 1);
            // Correct the day (addMonths may clamp to month end)
            const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
            nextDate.setDate(Math.min(originalDay, maxDay));
            break;
          }
          default:
            continue;
        }

        // Auto-dismiss current and create next
        await supabase
          .from("reminders")
          .update({ is_dismissed: true })
          .eq("id", reminder.id);

        const { error: recurError } = await supabase
          .from("reminders")
          .insert({
            content: reminder.content,
            reminder_date: nextDate.toISOString(),
            recurrence: reminder.recurrence,
            created_by: reminder.created_by,
            is_dismissed: false,
            notified: false,
          });

        if (!recurError) recurrencesCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        processed: dueReminders.length,
        notificationsCreated,
        recurrencesCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-reminders error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
