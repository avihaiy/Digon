import { useState } from "react";
import { Bell, Check, Trash2, Info } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function NotificationsDropdown() {
  const { notifications, unreadCount, markAsRead, isLoading } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5 outline-none focus:outline-none">
          <Bell className="w-5 h-5 text-slate-300" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 end-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(225,29,72,0.8)] border border-[#020610] animate-pulse flex items-center justify-center text-[8px] font-bold text-white">
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-[#0B1426]/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl mr-4" align="end" sideOffset={10}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <h4 className="font-bold text-white">התראות ({unreadCount})</h4>
        </div>
        <ScrollArea className="h-80" dir="rtl">
          {isLoading ? (
            <div className="p-4 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
              טוען...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center opacity-60">
              <Bell className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-400 font-medium">אין התראות חדשות</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <div
                  key={notif.$id}
                  onClick={() => {
                    if (notif.is_read !== "true") {
                      markAsRead(notif.$id);
                    }
                  }}
                  className={cn(
                    "flex gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer",
                    notif.is_read !== "true" ? "bg-cyan-900/10" : ""
                  )}
                >
                  <div className="shrink-0 mt-1">
                    {notif.is_read !== "true" ? (
                      <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                    ) : (
                      <Check className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-start">
                    <p className={cn("text-sm font-semibold truncate", notif.is_read !== "true" ? "text-white" : "text-slate-300")}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-tight">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {new Date(notif.$createdAt).toLocaleDateString('he-IL', { hour: '2-digit', minute: '2-digit' })}
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
