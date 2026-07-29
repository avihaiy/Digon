import { Medal, Star, Trophy, Target, Fish } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const BADGE_DEFINITIONS: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  "first_catch": { label: "דייג מתחיל (תפיסה 1)", icon: Target, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  "pro": { label: "דייג מקצוען", icon: Trophy, color: "text-amber-400", bg: "bg-amber-500/10" },
  "veteran": { label: "ותיק הים", icon: Medal, color: "text-blue-400", bg: "bg-blue-500/10" },
  "100_club": { label: "מועדון ה-100", icon: Star, color: "text-purple-400", bg: "bg-purple-500/10" },
  "admin": { label: "מנהל קהילה", icon: Fish, color: "text-rose-400", bg: "bg-rose-500/10" }
};

export function BadgeIcon({ badgeId }: { badgeId: string }) {
  const def = BADGE_DEFINITIONS[badgeId];
  if (!def) return null;

  const Icon = def.icon;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`p-1 rounded-full ${def.bg} border border-white/5 shadow-sm flex items-center justify-center`}>
            <Icon className={`w-3.5 h-3.5 ${def.color}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-[#0B1426] border-white/10 text-white font-medium text-xs">
          {def.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
