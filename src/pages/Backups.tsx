import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Database, 
  Download, 
  RefreshCw, 
  Calendar, 
  FileJson, 
  Clock,
  HardDrive,
  Loader2,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BackupFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Backups() {
  const queryClient = useQueryClient();
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  // Fetch backup files
  const { data: backups, isLoading, refetch } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('backups')
        .list('', { sortBy: { column: 'created_at', order: 'desc' } });
      
      if (error) throw error;
      return (data || []) as BackupFile[];
    },
  });

  // Manual backup mutation
  const backupMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('daily-backup');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: 'גיבוי בוצע בהצלחה',
        description: `נשמר: ${data.fileName} (${data.totalRecords} רשומות)`
      });
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: () => {
      toast({ title: 'שגיאה ביצירת גיבוי', variant: 'destructive' });
    },
  });

  // Delete backup mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileName: string) => {
      setDeletingFile(fileName);
      const { error } = await supabase.storage
        .from('backups')
        .remove([fileName]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'הגיבוי נמחק בהצלחה' });
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      setDeletingFile(null);
    },
    onError: () => {
      toast({ title: 'שגיאה במחיקת גיבוי', variant: 'destructive' });
      setDeletingFile(null);
    },
  });

  // Download backup
  const handleDownload = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('backups')
        .download(fileName);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: 'הורדת הגיבוי החלה' });
    } catch {
      toast({ title: 'שגיאה בהורדת גיבוי', variant: 'destructive' });
    }
  };

  const totalSize = backups?.reduce((sum, b) => sum + (Number(b.metadata?.size) || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            ניהול גיבויים
          </h1>
          <p className="text-muted-foreground mt-1">
            צפייה והורדה של גיבויי המערכת
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            רענן
          </Button>
          <Button 
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
          >
            {backupMutation.isPending ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <HardDrive className="w-4 h-4 ml-2" />
            )}
            גיבוי ידני
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <FileJson className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{backups?.length || 0}</div>
                <div className="text-sm text-muted-foreground">גיבויים שמורים</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatBytes(totalSize)}</div>
                <div className="text-sm text-muted-foreground">נפח כולל</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-100 text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">30</div>
                <div className="text-sm text-muted-foreground">ימי שמירה</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            רשימת גיבויים
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : backups?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>אין גיבויים שמורים</p>
              <p className="text-sm">לחץ על "גיבוי ידני" ליצירת גיבוי ראשון</p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups?.map((backup, index) => (
                <div 
                  key={backup.name}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">{backup.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {backup.created_at && format(new Date(backup.created_at), 'EEEE, d בMMMM yyyy בשעה HH:mm', { locale: he })}
                        <span className="mx-1">•</span>
                        {formatBytes(Number(backup.metadata?.size) || 0)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {index === 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        אחרון
                      </Badge>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(backup.name)}
                    >
                      <Download className="w-4 h-4 ml-1" />
                      הורד
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>מחיקת גיבוי</AlertDialogTitle>
                          <AlertDialogDescription>
                            האם אתה בטוח שברצונך למחוק את הגיבוי הזה? פעולה זו אינה ניתנת לביטול.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ביטול</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(backup.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingFile === backup.name ? (
                              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            ) : null}
                            מחק
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 h-fit">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-1">גיבוי אוטומטי</h3>
              <p className="text-blue-700 text-sm">
                המערכת מבצעת גיבוי אוטומטי כל יום בשעה 03:00 בלילה.
                גיבויים נשמרים ל-30 יום ונמחקים אוטומטית לאחר מכן.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
