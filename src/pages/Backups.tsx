import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Database, 
  Download, 
  RefreshCw, 
  Calendar, 
  FileJson, 
  Clock,
  HardDrive,
  Loader2,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Mail,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface BackupData {
  timestamp: string;
  tables: Record<string, unknown[]>;
  summary: Record<string, { success: boolean; count?: number; error?: string }>;
}

const TABLES_LABELS: Record<string, string> = {
  members: 'חברים',
  aliyot: 'עליות',
  payments: 'תשלומים',
  receipts: 'קבלות',
  expenses: 'הוצאות',
  expense_categories: 'קטגוריות הוצאות',
  expense_attachments: 'קבצי הוצאות',
  budget_transactions: 'תנועות תקציב',
  budget_categories: 'קטגוריות תקציב',
  equipment: 'ציוד',
  equipment_loans: 'השאלות ציוד',
  memorial_names: 'שמות לאזכרה',
  announcements: 'הודעות',
  prayer_times: 'זמני תפילה',
  app_settings: 'הגדרות מערכת',
  profiles: 'פרופילים',
  user_roles: 'תפקידי משתמשים',
  notifications: 'התראות',
  audit_logs: 'יומן פעולות',
};

export default function Backups() {
  const queryClient = useQueryClient();
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [backupEmail, setBackupEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  // Email receipts backup mutation
  const emailBackupMutation = useMutation({
    mutationFn: async ({ email, startDate, endDate }: { email: string; startDate?: string; endDate?: string }) => {
      const { data, error } = await supabase.functions.invoke('email-receipts-backup', {
        body: { email, startDate, endDate }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: 'גיבוי קבלות נשלח למייל',
        description: `נשלחו ${data.receiptsCount} קבלות בסכום כולל של ₪${data.totalAmount?.toLocaleString('he-IL') || 0}`
      });
      setEmailDialogOpen(false);
      setBackupEmail('');
      setStartDate('');
      setEndDate('');
    },
    onError: (error) => {
      toast({ 
        title: 'שגיאה בשליחת גיבוי למייל', 
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה',
        variant: 'destructive' 
      });
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

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async ({ tables, data }: { tables: string[]; data: BackupData }) => {
      const results: { table: string; success: boolean; error?: string }[] = [];
      
      for (const tableName of tables) {
        const tableData = data.tables[tableName];
        if (!tableData || tableData.length === 0) {
          results.push({ table: tableName, success: true });
          continue;
        }

        try {
          // Delete existing data first
          const { error: deleteError } = await supabase
            .from(tableName as never)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
          
          if (deleteError) {
            results.push({ table: tableName, success: false, error: deleteError.message });
            continue;
          }

          // Insert backup data
          const { error: insertError } = await supabase
            .from(tableName as never)
            .insert(tableData as never);
          
          if (insertError) {
            results.push({ table: tableName, success: false, error: insertError.message });
          } else {
            results.push({ table: tableName, success: true });
          }
        } catch (err) {
          results.push({ table: tableName, success: false, error: String(err) });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success);
      
      if (failed.length === 0) {
        toast({ 
          title: 'שחזור הושלם בהצלחה',
          description: `${successful} טבלאות שוחזרו`
        });
      } else {
        toast({ 
          title: 'שחזור הושלם עם שגיאות',
          description: `${successful} הצליחו, ${failed.length} נכשלו`,
          variant: 'destructive'
        });
      }
      
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
      setBackupData(null);
      setSelectedTables([]);
      queryClient.invalidateQueries();
    },
    onError: () => {
      toast({ title: 'שגיאה בשחזור', variant: 'destructive' });
    },
  });

  // Load backup data for restore
  const handlePrepareRestore = async (fileName: string) => {
    setLoadingBackup(true);
    setSelectedBackup(fileName);
    
    try {
      const { data, error } = await supabase.storage
        .from('backups')
        .download(fileName);
      
      if (error) throw error;
      
      const text = await data.text();
      const parsed: BackupData = JSON.parse(text);
      
      setBackupData(parsed);
      setSelectedTables(Object.keys(parsed.tables).filter(t => parsed.tables[t]?.length > 0));
      setRestoreDialogOpen(true);
    } catch {
      toast({ title: 'שגיאה בטעינת הגיבוי', variant: 'destructive' });
    } finally {
      setLoadingBackup(false);
    }
  };

  const handleTableToggle = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName)
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const handleRestore = () => {
    if (!backupData || selectedTables.length === 0) return;
    restoreMutation.mutate({ tables: selectedTables, data: backupData });
  };

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
            variant="outline"
            onClick={() => setEmailDialogOpen(true)}
          >
            <Mail className="w-4 h-4 ml-2" />
            שלח קבלות למייל
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
                      onClick={() => handlePrepareRestore(backup.name)}
                      disabled={loadingBackup && selectedBackup === backup.name}
                    >
                      {loadingBackup && selectedBackup === backup.name ? (
                        <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4 ml-1" />
                      )}
                      שחזר
                    </Button>
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

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              שחזור מגיבוי
            </DialogTitle>
            <DialogDescription>
              בחר את הטבלאות שברצונך לשחזר מהגיבוי. שים לב: הנתונים הקיימים יימחקו ויוחלפו בנתונים מהגיבוי.
            </DialogDescription>
          </DialogHeader>

          {backupData && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>אזהרה:</strong> פעולה זו תמחק את הנתונים הקיימים בטבלאות הנבחרות ותחליף אותם בנתונים מהגיבוי. פעולה זו אינה ניתנת לביטול.
                </div>
              </div>

              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {Object.entries(backupData.tables).map(([tableName, records]) => {
                    const recordCount = Array.isArray(records) ? records.length : 0;
                    return (
                      <div 
                        key={tableName}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={tableName}
                            checked={selectedTables.includes(tableName)}
                            onCheckedChange={() => handleTableToggle(tableName)}
                            disabled={recordCount === 0}
                          />
                          <label 
                            htmlFor={tableName}
                            className={`font-medium cursor-pointer ${recordCount === 0 ? 'text-muted-foreground' : ''}`}
                          >
                            {TABLES_LABELS[tableName] || tableName}
                          </label>
                        </div>
                        <Badge variant="secondary">
                          {recordCount} רשומות
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="flex gap-2 justify-between text-sm text-muted-foreground">
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-sm"
                  onClick={() => setSelectedTables(Object.keys(backupData.tables).filter(t => backupData.tables[t]?.length > 0))}
                >
                  בחר הכל
                </Button>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-sm"
                  onClick={() => setSelectedTables([])}
                >
                  נקה בחירה
                </Button>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleRestore}
              disabled={selectedTables.length === 0 || restoreMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {restoreMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              שחזר {selectedTables.length} טבלאות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Receipts Backup Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              גיבוי קבלות למייל
            </DialogTitle>
            <DialogDescription>
              שלח קובץ CSV עם כל הקבלות לכתובת מייל. ניתן לסנן לפי תאריכים.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backup-email">כתובת מייל</Label>
              <Input
                id="backup-email"
                type="email"
                placeholder="example@gmail.com"
                value={backupEmail}
                onChange={(e) => setBackupEmail(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">מתאריך (אופציונלי)</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">עד תאריך (אופציונלי)</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              השאר את שדות התאריך ריקים לקבלת כל הקבלות במערכת.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              ביטול
            </Button>
            <Button 
              onClick={() => emailBackupMutation.mutate({ 
                email: backupEmail, 
                startDate: startDate || undefined, 
                endDate: endDate || undefined 
              })}
              disabled={!backupEmail || emailBackupMutation.isPending}
            >
              {emailBackupMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              <Mail className="w-4 h-4 ml-2" />
              שלח למייל
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
