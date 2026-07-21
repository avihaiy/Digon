import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Monitor, RefreshCw, Send, Settings, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface AnyDeskScreen {
  id: string;
  name: string;
}

interface ScreensManagementPanelProps {
  screens: AnyDeskScreen[];
  children: React.ReactNode;
}

export function ScreensManagementPanel({ screens, children }: ScreensManagementPanelProps) {
  const navigate = useNavigate();
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [msgContent, setMsgContent] = useState('');
  const [selectedScreenForMsg, setSelectedScreenForMsg] = useState<string | null>(null);

  const downloadAnyDeskBat = (screenId: string, screenName: string) => {
    const cleanId = screenId.replace(/\s/g, '');
    const batContent = `@echo off\r\nchcp 65001 > nul\r\necho מתחבר ל${screenName}...\r\nset ID=${cleanId}\r\n\r\n:: 1. Standard paths\r\nif exist "C:\\Program Files (x86)\\AnyDesk\\AnyDesk.exe" start "" "C:\\Program Files (x86)\\AnyDesk\\AnyDesk.exe" %ID% ^& exit\r\nif exist "C:\\Program Files\\AnyDesk\\AnyDesk.exe" start "" "C:\\Program Files\\AnyDesk\\AnyDesk.exe" %ID% ^& exit\r\nif exist "%LOCALAPPDATA%\\AnyDesk\\AnyDesk.exe" start "" "%LOCALAPPDATA%\\AnyDesk\\AnyDesk.exe" %ID% ^& exit\r\nif exist "%APPDATA%\\AnyDesk\\AnyDesk.exe" start "" "%APPDATA%\\AnyDesk\\AnyDesk.exe" %ID% ^& exit\r\n\r\n:: 2. Desktop and Downloads (portable version)\r\nif exist "%USERPROFILE%\\Desktop\\AnyDesk.exe" start "" "%USERPROFILE%\\Desktop\\AnyDesk.exe" %ID% ^& exit\r\nif exist "%USERPROFILE%\\Downloads\\AnyDesk.exe" start "" "%USERPROFILE%\\Downloads\\AnyDesk.exe" %ID% ^& exit\r\n\r\n:: 3. Try generic start if registered in Path/App Paths\r\nstart "" anydesk.exe %ID% 2>nul\r\nif %ERRORLEVEL% EQU 0 exit\r\n\r\necho לא מצאתי את תוכנת AnyDesk על המחשב שלך!\r\necho ודא ש-AnyDesk מותקנת, או נמצאת בשולחן העבודה / תיקיית הורדות.\r\npause`;

    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connect-${screenName.replace(/[^a-zA-Zא-ת0-9-]/g, '-')}.bat`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'הקובץ הורד בהצלחה',
      description: 'פתח את הקובץ שהורד כדי להתחבר מיד למסך.',
    });
  };

  const handleRefreshScreens = async () => {
    try {
      await supabase.channel('tv-commands').send({
        type: 'broadcast',
        event: 'tv-command',
        payload: { command: 'refresh' },
      });
      toast({ title: 'פקודת רענון נשלחה למסכים' });
    } catch (e) {
      toast({ title: 'שגיאה בשליחת הפקודה', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if (!msgContent.trim()) return;
    
    setIsSendingMsg(true);
    try {
      await supabase.channel('tv-commands').send({
        type: 'broadcast',
        event: 'tv-command',
        payload: { command: 'message', content: msgContent },
      });
      toast({ title: 'ההודעה נשלחה בהצלחה למסכים' });
      setMsgContent('');
      setSelectedScreenForMsg(null);
    } catch (e) {
      toast({ title: 'שגיאה בשליחת ההודעה', variant: 'destructive' });
    } finally {
      setIsSendingMsg(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="left" className="w-[400px] sm:w-[540px] flex flex-col h-full overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-2xl">
            <Monitor className="w-6 h-6 text-blue-500" />
            פאנל ניהול מסכים
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 flex-1">
          {/* Global Actions */}
          <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">פעולות גלובליות (לכל המסכים)</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 bg-background hover:bg-muted"
                onClick={handleRefreshScreens}
              >
                <RefreshCw className="w-4 h-4 mr-2 ml-2" />
                רענן מסכים מרחוק
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 bg-background hover:bg-muted"
                onClick={() => setSelectedScreenForMsg('all')}
              >
                <Send className="w-4 h-4 mr-2 ml-2" />
                שלח הודעה צפה
              </Button>
            </div>

            {selectedScreenForMsg === 'all' && (
              <div className="mt-4 p-4 bg-background rounded-lg border space-y-3 animate-in fade-in zoom-in-95">
                <Textarea 
                  placeholder="הקלד הודעה שתוצג על גבי המסכים..."
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedScreenForMsg(null)}>
                    ביטול
                  </Button>
                  <Button size="sm" onClick={handleSendMessage} disabled={isSendingMsg || !msgContent.trim()}>
                    {isSendingMsg ? 'שולח...' : 'שדר הודעה'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Screens List */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex justify-between items-center">
              <span>מסכי בית הכנסת ({screens.length})</span>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate('/settings')}>
                <Settings className="w-3 h-3 ml-1" />
                הגדרות
              </Button>
            </h3>
            
            {screens.length === 0 ? (
              <div className="text-center p-8 bg-muted/30 rounded-xl border border-dashed text-muted-foreground">
                לא הוגדרו מסכים במערכת.
                <br />
                <Button variant="link" onClick={() => navigate('/settings')} className="mt-2">
                  מעבר להגדרות מסכים
                </Button>
              </div>
            ) : (
              screens.map((screen, idx) => (
                <div key={idx} className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{screen.name}</h4>
                      <p className="text-sm text-muted-foreground dir-ltr text-right">{screen.id}</p>
                    </div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                      <Monitor className="w-5 h-5" />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => downloadAnyDeskBat(screen.id, screen.name)}
                    >
                      <ExternalLink className="w-4 h-4 ml-2" />
                      התחבר עכשיו
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
