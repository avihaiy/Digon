import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ISRAEL_LOCATIONS } from '@/lib/hebrew-utils';
import { MapPin, Building2, Save, Monitor, Clock } from 'lucide-react';

interface SettingsTabProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
}

export function SettingsTab({ selectedLocation, onLocationChange }: SettingsTabProps) {
  const queryClient = useQueryClient();
  const [synagogueName, setSynagogueName] = useState('בית הכנסת');
  const [tvDurations, setTvDurations] = useState({
    general: 30,
    memorial: 20,
    finance: 20,
  });

  // Load synagogue name
  const { data: nameSetting } = useQuery({
    queryKey: ['app-settings-synagogue-name'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'synagogue_name')
        .single();
      return data?.value || 'בית הכנסת';
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

  useEffect(() => {
    if (nameSetting) {
      setSynagogueName(nameSetting);
    }
  }, [nameSetting]);

  useEffect(() => {
    if (tvSettings) {
      setTvDurations(tvSettings);
    }
  }, [tvSettings]);

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">הגדרות תצוגה</h2>

      <div className="grid grid-cols-2 gap-6">
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
      </div>

      {/* TV Screen Durations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            זמני תצוגת TV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            הגדר כמה שניות כל מסך יוצג לפני המעבר למסך הבא
          </p>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="text-2xl">📺</span>
                לוח כללי
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number"
                  min={5}
                  max={120}
                  value={tvDurations.general}
                  onChange={e => setTvDurations(prev => ({ ...prev, general: parseInt(e.target.value) || 30 }))}
                  className="w-24"
                />
                <span className="text-muted-foreground">שניות</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="text-2xl">🕯️</span>
                אזכרות
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number"
                  min={5}
                  max={120}
                  value={tvDurations.memorial}
                  onChange={e => setTvDurations(prev => ({ ...prev, memorial: parseInt(e.target.value) || 20 }))}
                  className="w-24"
                />
                <span className="text-muted-foreground">שניות</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                מצב כספי
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number"
                  min={5}
                  max={120}
                  value={tvDurations.finance}
                  onChange={e => setTvDurations(prev => ({ ...prev, finance: parseInt(e.target.value) || 20 }))}
                  className="w-24"
                />
                <span className="text-muted-foreground">שניות</span>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => saveTvDurationsMutation.mutate(tvDurations)}
            disabled={saveTvDurationsMutation.isPending}
            className="mt-4"
          >
            <Save className="w-4 h-4 ml-2" />
            שמור זמנים
          </Button>
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
    </div>
  );
}
