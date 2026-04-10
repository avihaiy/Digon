import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ISRAEL_LOCATIONS } from '@/lib/hebrew-utils';
import { MapPin, Building2, Save, Monitor, Clock, Database, HardDrive, Loader2, Mail, Lock, ShieldAlert, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SettingsTabProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
}

export function SettingsTab({ selectedLocation, onLocationChange }: SettingsTabProps) {
  const queryClient = useQueryClient();
  const [synagogueName, setSynagogueName] = useState('בית הכנסת');
  const [receiptEmail, setReceiptEmail] = useState('');
  const [displayLockCode, setDisplayLockCode] = useState('1234');
  const [deleteProtectionCode, setDeleteProtectionCode] = useState('');
  const [tvDurations, setTvDurations] = useState({
    general: 30,
    memorial: 20,
    finance: 20,
  });
  const [tvScreensEnabled, setTvScreensEnabled] = useState({
    general: true,
    memorial: true,
    finance: true,
  });
  const [displayRotated, setDisplayRotated] = useState(false);
  // Load synagogue name
  const { data: nameSetting } = useQuery({
    queryKey: ['app-settings-synagogue-name'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'synagogue_name')
        .maybeSingle();
      return data?.value || 'בית הכנסת';
    },
  });

  // Load receipt email
  const { data: receiptEmailSetting } = useQuery({
    queryKey: ['app-settings-receipt-email'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'receipt_email')
        .maybeSingle();
      return data?.value || '';
    },
  });

  // Load display lock code
  const { data: lockCodeSetting } = useQuery({
    queryKey: ['app-settings-display-lock-code'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'display_lock_code')
        .maybeSingle();
      return data?.value || '1234';
    },
  });

  // Load delete protection code
  const { data: deleteCodeSetting } = useQuery({
    queryKey: ['app-settings-delete-code'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'delete_protection_code')
        .maybeSingle();
      return data?.value || '';
    },
  });

  // Load TV durations
  const { data: tvSettings } = useQuery({
    queryKey: ['app-settings-tv-durations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['tv_duration_general', 'tv_duration_memorial', 'tv_duration_finance']);
      
      const result = { general: 30, memorial: 20, finance: 20 };
      data?.forEach(item => {
        if (item.key === 'tv_duration_general') result.general = parseInt(item.value) || 30;
        if (item.key === 'tv_duration_memorial') result.memorial = parseInt(item.value) || 20;
        if (item.key === 'tv_duration_finance') result.finance = parseInt(item.value) || 20;
      });
      return result;
    },
  });

  // Load TV screens enabled settings
  const { data: tvEnabledSettings } = useQuery({
    queryKey: ['app-settings-tv-screens-enabled'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['tv_screen_general', 'tv_screen_memorial', 'tv_screen_finance']);
      
      const result = { general: true, memorial: true, finance: true };
      data?.forEach(item => {
        if (item.key === 'tv_screen_general') result.general = item.value === 'true';
        if (item.key === 'tv_screen_memorial') result.memorial = item.value === 'true';
        if (item.key === 'tv_screen_finance') result.finance = item.value === 'true';
      });
      return result;
    },
  });

  // Load display rotation
  const { data: rotationSetting } = useQuery({
    queryKey: ['app-settings-display-rotation'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'display_rotation')
        .maybeSingle();
      return data?.value === 'true';
    },
  });

  useEffect(() => {
    if (nameSetting) {
      setSynagogueName(nameSetting);
    }
  }, [nameSetting]);

  useEffect(() => {
    if (receiptEmailSetting !== undefined) {
      setReceiptEmail(receiptEmailSetting);
    }
  }, [receiptEmailSetting]);

  useEffect(() => {
    if (tvSettings) {
      setTvDurations(tvSettings);
    }
  }, [tvSettings]);

  useEffect(() => {
    if (tvEnabledSettings) {
      setTvScreensEnabled(tvEnabledSettings);
    }
  }, [tvEnabledSettings]);

  useEffect(() => {
    if (lockCodeSetting) {
      setDisplayLockCode(lockCodeSetting);
    }
  }, [lockCodeSetting]);

  useEffect(() => {
    if (deleteCodeSetting !== undefined) {
      setDeleteProtectionCode(deleteCodeSetting);
    }
  }, [deleteCodeSetting]);

  useEffect(() => {
    if (rotationSetting !== undefined) {
      setDisplayRotated(rotationSetting);
    }
  }, [rotationSetting]);

  // Save synagogue name
  const saveNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'synagogue_name', value: name }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-synagogue-name'] });
      toast({ title: 'שם בית הכנסת נשמר בהצלחה' });
    },
    onError: () => toast({ title: 'שגיאה בשמירה', variant: 'destructive' }),
  });

  // Save receipt email
  const saveReceiptEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'receipt_email', value: email }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-receipt-email'] });
      toast({ title: 'כתובת המייל נשמרה בהצלחה' });
    },
    onError: () => toast({ title: 'שגיאה בשמירה', variant: 'destructive' }),
  });

  // Save TV durations
  const saveTvDurationsMutation = useMutation({
    mutationFn: async (durations: typeof tvDurations) => {
      const updates = [
        { key: 'tv_duration_general', value: String(durations.general) },
        { key: 'tv_duration_memorial', value: String(durations.memorial) },
        { key: 'tv_duration_finance', value: String(durations.finance) },
      ];
      
      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(update, { onConflict: 'key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-tv-durations'] });
      queryClient.invalidateQueries({ queryKey: ['tv-durations'] });
      toast({ title: 'זמני התצוגה נשמרו בהצלחה' });
    },
    onError: () => toast({ title: 'שגיאה בשמירה', variant: 'destructive' }),
  });

  // Save TV screens enabled
  const saveTvScreensMutation = useMutation({
    mutationFn: async (screens: typeof tvScreensEnabled) => {
      const updates = [
        { key: 'tv_screen_general', value: String(screens.general) },
        { key: 'tv_screen_memorial', value: String(screens.memorial) },
        { key: 'tv_screen_finance', value: String(screens.finance) },
      ];
      
      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(update, { onConflict: 'key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-tv-screens-enabled'] });
      queryClient.invalidateQueries({ queryKey: ['tv-screens-enabled'] });
      toast({ title: 'הגדרות המסכים נשמרו בהצלחה' });
    },
    onError: () => toast({ title: 'שגיאה בשמירה', variant: 'destructive' }),
  });

  // Save display rotation
  const saveRotationMutation = useMutation({
    mutationFn: async (rotated: boolean) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'display_rotation', value: String(rotated) }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-display-rotation'] });
      toast({ title: 'כיוון התצוגה נשמר בהצלחה' });
    },
    onError: () => toast({ title: 'שגיאה בשמירה', variant: 'destructive' }),
  });

  // Save display lock code
  const saveLockCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'display_lock_code', value: code }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-display-lock-code'] });
      toast({ title: 'קוד הנעילה נשמר בהצלחה' });
    },
    onError: () => toast({ title: 'שגיאה בשמירה', variant: 'destructive' }),
  });

  // Save delete protection code
  const saveDeleteCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'delete_protection_code', value: code }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-delete-code'] });
      toast({ title: 'קוד הגנת מחיקה נשמר בהצלחה' });
    },
    onError: () => toast({ title: 'שגיאה בשמירה', variant: 'destructive' }),
  });

  // Count enabled screens
  const enabledCount = Object.values(tvScreensEnabled).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">הגדרות תצוגה</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Synagogue Name */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              שם בית הכנסת
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>שם בית הכנסת (יוצג בתצוגה)</Label>
              <Input 
                value={synagogueName}
                onChange={e => setSynagogueName(e.target.value)}
                placeholder="לדוגמה: בית הכנסת הגדול"
              />
            </div>
            <Button 
              onClick={() => saveNameMutation.mutate(synagogueName)}
              disabled={saveNameMutation.isPending}
            >
              <Save className="w-4 h-4 ml-2" />
              שמור שם
            </Button>
          </CardContent>
        </Card>

        {/* Receipt Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              מייל לקבלות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>כתובת מייל לקבלות אוטומטיות</Label>
              <Input 
                type="email"
                value={receiptEmail}
                onChange={e => setReceiptEmail(e.target.value)}
                placeholder="email@example.com"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                כל קבלה חדשה תישלח אוטומטית לכתובת זו
              </p>
            </div>
            <Button 
              onClick={() => saveReceiptEmailMutation.mutate(receiptEmail)}
              disabled={saveReceiptEmailMutation.isPending}
            >
              <Save className="w-4 h-4 ml-2" />
              שמור מייל
            </Button>
          </CardContent>
        </Card>

        {/* Display Lock Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              קוד נעילת תצוגה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>קוד PIN לביטול נעילת מסך (4 ספרות)</Label>
              <Input 
                type="text"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                value={displayLockCode}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setDisplayLockCode(val);
                }}
                placeholder="1234"
                dir="ltr"
                className="font-mono text-center text-xl tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                קוד זה נדרש לביטול נעילת המסך בדף התצוגה
              </p>
            </div>
            <Button 
              onClick={() => saveLockCodeMutation.mutate(displayLockCode)}
              disabled={saveLockCodeMutation.isPending || displayLockCode.length !== 4}
            >
              <Save className="w-4 h-4 ml-2" />
              שמור קוד
            </Button>
          </CardContent>
        </Card>

        {/* Delete Protection Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              קוד הגנת מחיקה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>קוד לאישור מחיקת תשלומים וקבלות</Label>
              <Input 
                type="text"
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
                value={deleteProtectionCode}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setDeleteProtectionCode(val);
                }}
                placeholder="השאר ריק לביטול ההגנה"
                dir="ltr"
                className="font-mono text-center text-xl tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                כשקוד מוגדר, יידרש להזינו לפני כל מחיקה של תשלום או קבלה. השאר ריק כדי לבטל את ההגנה.
              </p>
            </div>
            <Button 
              onClick={() => saveDeleteCodeMutation.mutate(deleteProtectionCode)}
              disabled={saveDeleteCodeMutation.isPending}
            >
              <Save className="w-4 h-4 ml-2" />
              {deleteProtectionCode ? 'שמור קוד' : 'בטל הגנה'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            מיקום לזמנים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>בחר מיקום לחישוב זמני היום</Label>
            <Select value={selectedLocation} onValueChange={onLocationChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ISRAEL_LOCATIONS).map(([key, loc]) => (
                  <SelectItem key={key} value={key}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            המיקום משפיע על חישוב זמני היום, הדלקת נרות וצאת השבת
          </p>
        </CardContent>
      </Card>

      {/* TV Screen Durations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            הגדרות תצוגת TV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              בחר אילו מסכים יוצגו ברוטציה והגדר את משך הזמן לכל מסך
            </p>
            <div className="grid grid-cols-3 gap-6">
              {/* General Screen */}
              <div className={`p-4 rounded-xl border-2 transition-all ${tvScreensEnabled.general ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-slate-50/50 opacity-60'}`}>
                <div className="flex items-center justify-between mb-4">
                  <Label className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">📺</span>
                    לוח כללי
                  </Label>
                  <Switch
                    checked={tvScreensEnabled.general}
                    onCheckedChange={(checked) => {
                      if (!checked && enabledCount <= 1) {
                        toast({ title: 'חייב להיות לפחות מסך אחד פעיל', variant: 'destructive' });
                        return;
                      }
                      setTvScreensEnabled(prev => ({ ...prev, general: checked }));
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number"
                    min={5}
                    max={120}
                    value={tvDurations.general}
                    onChange={e => setTvDurations(prev => ({ ...prev, general: parseInt(e.target.value) || 30 }))}
                    className="w-20"
                    disabled={!tvScreensEnabled.general}
                  />
                  <span className="text-muted-foreground text-sm">שניות</span>
                </div>
              </div>

              {/* Memorial Screen */}
              <div className={`p-4 rounded-xl border-2 transition-all ${tvScreensEnabled.memorial ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-slate-50/50 opacity-60'}`}>
                <div className="flex items-center justify-between mb-4">
                  <Label className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">🕯️</span>
                    אזכרות
                  </Label>
                  <Switch
                    checked={tvScreensEnabled.memorial}
                    onCheckedChange={(checked) => {
                      if (!checked && enabledCount <= 1) {
                        toast({ title: 'חייב להיות לפחות מסך אחד פעיל', variant: 'destructive' });
                        return;
                      }
                      setTvScreensEnabled(prev => ({ ...prev, memorial: checked }));
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number"
                    min={5}
                    max={120}
                    value={tvDurations.memorial}
                    onChange={e => setTvDurations(prev => ({ ...prev, memorial: parseInt(e.target.value) || 20 }))}
                    className="w-20"
                    disabled={!tvScreensEnabled.memorial}
                  />
                  <span className="text-muted-foreground text-sm">שניות</span>
                </div>
              </div>

              {/* Finance Screen */}
              <div className={`p-4 rounded-xl border-2 transition-all ${tvScreensEnabled.finance ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50 opacity-60'}`}>
                <div className="flex items-center justify-between mb-4">
                  <Label className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">💰</span>
                    מצב כספי
                  </Label>
                  <Switch
                    checked={tvScreensEnabled.finance}
                    onCheckedChange={(checked) => {
                      if (!checked && enabledCount <= 1) {
                        toast({ title: 'חייב להיות לפחות מסך אחד פעיל', variant: 'destructive' });
                        return;
                      }
                      setTvScreensEnabled(prev => ({ ...prev, finance: checked }));
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number"
                    min={5}
                    max={120}
                    value={tvDurations.finance}
                    onChange={e => setTvDurations(prev => ({ ...prev, finance: parseInt(e.target.value) || 20 }))}
                    className="w-20"
                    disabled={!tvScreensEnabled.finance}
                  />
                  <span className="text-muted-foreground text-sm">שניות</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={() => {
                saveTvDurationsMutation.mutate(tvDurations);
                saveTvScreensMutation.mutate(tvScreensEnabled);
              }}
              disabled={saveTvDurationsMutation.isPending || saveTvScreensMutation.isPending}
            >
              <Save className="w-4 h-4 ml-2" />
              שמור הגדרות
            </Button>
            <p className="text-sm text-muted-foreground self-center">
              {enabledCount} מסכים פעילים
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Display Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            קישורים לתצוגות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <a
              href="/display-general"
              target="_blank"
              className="flex items-center justify-center gap-2 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 hover:border-blue-400 transition-colors"
            >
              <span className="text-4xl">📺</span>
              <div>
                <div className="font-bold text-lg text-blue-800">תצוגה כללית</div>
                <div className="text-sm text-blue-600">זמני תפילה והודעות</div>
              </div>
            </a>
            <a
              href="/display-memorial"
              target="_blank"
              className="flex items-center justify-center gap-2 p-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 hover:border-amber-400 transition-colors"
            >
              <span className="text-4xl">🕯️</span>
              <div>
                <div className="font-bold text-lg text-amber-800">לוח אזכרות</div>
                <div className="text-sm text-amber-600">יארצייטים להיום</div>
              </div>
            </a>
            <a
              href="/display-tv"
              target="_blank"
              className="flex items-center justify-center gap-2 p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 hover:border-purple-400 transition-colors"
            >
              <span className="text-4xl">🔄</span>
              <div>
                <div className="font-bold text-lg text-purple-800">מצב TV מלא</div>
                <div className="text-sm text-purple-600">רוטציה אוטומטית</div>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Backup Management */}
      <BackupCard />
    </div>
  );
}

function BackupCard() {
  const queryClient = useQueryClient();

  // Get last backup info
  const { data: lastBackup, isLoading } = useQuery({
    queryKey: ['last-backup'],
    queryFn: async () => {
      const { data } = await supabase.storage
        .from('backups')
        .list('', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
      return data?.[0] || null;
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
      queryClient.invalidateQueries({ queryKey: ['last-backup'] });
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: () => {
      toast({ title: 'שגיאה ביצירת גיבוי', variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          גיבוי נתונים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium">גיבוי אחרון</div>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">טוען...</div>
              ) : lastBackup ? (
                <div className="text-sm text-muted-foreground">
                  {new Date(lastBackup.created_at).toLocaleString('he-IL')}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">לא נמצאו גיבויים</div>
              )}
            </div>
          </div>
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            גיבוי אוטומטי מתבצע כל יום בשעה 03:00. גיבויים נשמרים ל-30 יום.
          </p>
          <Link to="/backups">
            <Button variant="link" className="text-primary">
              צפה בכל הגיבויים ←
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
