import { Bell, Check, Info, Trophy, MessageCircle } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function NotificationsPanel() {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const getIcon = (type?: string) => {
    switch (type) {
      case "new_comment": return <MessageCircle className="w-4 h-4 text-cyan-500" />;
      case "new_badge": return <Trophy className="w-4 h-4 text-amber-500" />;
      case "catch_approved": return <Check className="w-4 h-4 text-emerald-500" />;
      case "tournament_win": return <Trophy className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 hover:bg-secondary rounded-lg active:scale-95 transition-transform text-white">
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border-2 border-[#020610]" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-[#0B1426] border-white/10 text-white" align="end" dir="rtl">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="font-bold text-sm">התראות</h3>
          <span className="text-xs text-slate-400">{unreadCount} חדשות</span>
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400 opacity-60">
              <Bell className="w-12 h-12 mb-2" />
              <p className="text-sm">אין לך התראות כרגע</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div 
                  key={n.$id} 
                  onClick={() => {
                    if (n.is_read !== "true") markAsRead(n.$id);
                  }}
                  className={cn(
                    "p-3 border-b border-white/5 flex gap-3 cursor-pointer hover:bg-white/5 transition-colors",
                    n.is_read !== "true" ? "bg-white/5" : "opacity-70"
                  )}
                >
                  <div className="mt-1 shrink-0 bg-black/20 p-2 rounded-full">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-cyan-400 truncate">{n.title}</p>
                    <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {new Date(n.$createdAt).toLocaleDateString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
