import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Wifi, WifiOff, RefreshCw, CloudOff, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export function OfflineIndicator() {
  const { isOnline, pendingActionsCount, lastSyncTime, isSyncing, syncNow } = useOfflineSync();

  if (isOnline && pendingActionsCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline Status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
            isOnline 
              ? "bg-green-500/10 text-green-600 dark:text-green-400" 
              : "bg-destructive/10 text-destructive"
          )}>
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span>{isOnline ? 'מחובר' : 'לא מחובר'}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isOnline 
            ? 'מחובר לאינטרנט' 
            : 'אין חיבור לאינטרנט - השינויים נשמרים מקומית'}
        </TooltipContent>
      </Tooltip>

      {/* Pending Actions */}
      {pendingActionsCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="gap-1">
                <CloudOff className="w-3 h-3" />
                {pendingActionsCount} ממתינים
              </Badge>
              
              {isOnline && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={syncNow}
                  disabled={isSyncing}
                >
                  <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                </Button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="text-center">
              <p>{pendingActionsCount} פעולות ממתינות לסנכרון</p>
              {lastSyncTime && (
                <p className="text-xs text-muted-foreground mt-1">
                  סנכרון אחרון: {format(lastSyncTime, 'HH:mm dd/MM', { locale: he })}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function OfflineBanner() {
  const { isOnline, pendingActionsCount, isSyncing, syncNow } = useOfflineSync();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">
          אתה במצב אופליין. השינויים נשמרים מקומית ויסונכרנו כשתחזור לאינטרנט.
        </span>
      </div>
      {pendingActionsCount > 0 && (
        <Badge variant="outline" className="text-amber-700 border-amber-500/30">
          {pendingActionsCount} פעולות ממתינות
        </Badge>
      )}
    </div>
  );
}
