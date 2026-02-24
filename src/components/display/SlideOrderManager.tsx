import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Monitor } from "lucide-react";

export default function SlideOrderManager() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["display-slide-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", [
          "show_heichal_on_display",
          "show_memorial_on_display",
          "show_finance_on_display",
        ]);
      const map: Record<string, string> = {};
      (data || []).forEach((s) => (map[s.key] = s.value));
      return map;
    },
  });

  const showHeichal = settings?.show_heichal_on_display === "true";
  const showMemorial = settings?.show_memorial_on_display !== "false";
  const showFinance = settings?.show_finance_on_display === "true";

  const toggleMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("app_settings")
          .update({ value: String(value) })
          .eq("key", key);
      } else {
        await supabase
          .from("app_settings")
          .insert({ key, value: String(value) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["display-slide-settings"] });
      toast.success("ההגדרה עודכנה");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Monitor className="h-5 w-5" />
          שקפי תצוגה
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>היכל ה׳ לזכרון עולם (כל השנה)</Label>
          <Switch
            checked={showHeichal}
            onCheckedChange={(v) =>
              toggleMutation.mutate({ key: "show_heichal_on_display", value: v })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>אזכרות / יארצייט (לפי תאריך)</Label>
          <Switch
            checked={showMemorial}
            onCheckedChange={(v) =>
              toggleMutation.mutate({ key: "show_memorial_on_display", value: v })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>תצוגת כספים</Label>
          <Switch
            checked={showFinance}
            onCheckedChange={(v) =>
              toggleMutation.mutate({ key: "show_finance_on_display", value: v })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
