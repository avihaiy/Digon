import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Megaphone, Clock, Calendar, Palette, Image, Upload, X, Wallet } from 'lucide-react';
import MemorialManager from '@/components/display/MemorialManager';
import PrayerTimesEditor from '@/components/display/PrayerTimesEditor';
import { Separator } from '@/components/ui/separator';

type DayType = 'weekdays' | 'friday' | 'shabbat';
type StyleType = 'traditional_gold' | 'modern_dark' | 'clean_white' | 'royal_blue';

interface ScheduledAnnouncement {
  id: string;
  title: string;
  content: string;
  day_types: DayType[];
  start_time: string;
  end_time: string;
  style: StyleType;
  is_active: boolean;
  priority: number;
  image_url: string | null;
  created_at: string;
}

const DAY_TYPE_OPTIONS: { value: DayType; label: string }[] = [
  { value: 'weekdays', label: "ימי חול (א'-ה')" },
  { value: 'friday', label: 'יום שישי' },
  { value: 'shabbat', label: 'שבת' },
];

const DAY_TYPE_LABELS: Record<DayType, string> = {
  weekdays: "ימי חול",
  friday: 'שישי',
  shabbat: 'שבת',
};

const STYLE_LABELS: Record<StyleType, string> = {
  traditional_gold: 'מסורתי זהב',
  modern_dark: 'מודרני כהה',
  clean_white: 'לבן נקי',
  royal_blue: 'כחול מלכותי',
};

const STYLE_PREVIEWS: Record<StyleType, string> = {
  traditional_gold: 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 border-amber-400',
  modern_dark: 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-600',
  clean_white: 'bg-white text-slate-800 border-slate-200',
  royal_blue: 'bg-gradient-to-br from-blue-600 to-blue-800 text-white border-blue-400',
};

const defaultFormData = {
  title: '',
  content: '',
  day_types: ['weekdays'] as DayType[],
  start_time: '08:00',
  end_time: '22:00',
  style: 'traditional_gold' as StyleType,
  priority: 0,
  image_url: null as string | null,
};

export default function ManageAds() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMemorial, setShowMemorial] = useState(true);
  const [showFinance, setShowFinance] = useState(false);
  const [displayBgUrl, setDisplayBgUrl] = useState<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch memorial and finance toggle settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['show_memorial_on_display', 'show_finance_on_display', 'display_background_url']);
      if (data) {
        for (const setting of data) {
          if (setting.key === 'show_memorial_on_display') {
            setShowMemorial(setting.value !== 'false');
          }
          if (setting.key === 'show_finance_on_display') {
            setShowFinance(setting.value === 'true');
          }
          if (setting.key === 'display_background_url') {
            setDisplayBgUrl(setting.value || null);
          }
        }
      }
    };
    fetchSettings();
  }, []);

  const toggleMemorial = async (checked: boolean) => {
    setShowMemorial(checked);
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', 'show_memorial_on_display')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('app_settings')
        .update({ value: checked ? 'true' : 'false' })
        .eq('key', 'show_memorial_on_display');
    } else {
      await supabase
        .from('app_settings')
        .insert({ key: 'show_memorial_on_display', value: checked ? 'true' : 'false' });
    }
    toast.success(checked ? 'אשכבות יוצגו על המסך' : 'אשכבות הוסרו מהמסך');
  };

  const toggleFinance = async (checked: boolean) => {
    setShowFinance(checked);
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', 'show_finance_on_display')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('app_settings')
        .update({ value: checked ? 'true' : 'false' })
        .eq('key', 'show_finance_on_display');
    } else {
      await supabase
        .from('app_settings')
        .insert({ key: 'show_finance_on_display', value: checked ? 'true' : 'false' });
    }
    toast.success(checked ? 'מצב כספי יוצג על המסך' : 'מצב כספי הוסר מהמסך');
  };

  // Background image upload/remove
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('הקובץ גדול מדי. הגודל המקסימלי הוא 5MB');
      return;
    }
    setBgUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `background/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('announcement-images')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('announcement-images')
        .getPublicUrl(fileName);

      // Save to app_settings
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', 'display_background_url')
        .maybeSingle();

      if (existing) {
        await supabase.from('app_settings').update({ value: publicUrl }).eq('key', 'display_background_url');
      } else {
        await supabase.from('app_settings').insert({ key: 'display_background_url', value: publicUrl });
      }
      setDisplayBgUrl(publicUrl);
      toast.success('רקע התצוגה עודכן בהצלחה');
    } catch (err) {
      console.error('Background upload error:', err);
      toast.error('שגיאה בהעלאת הרקע');
    } finally {
      setBgUploading(false);
      if (bgFileInputRef.current) bgFileInputRef.current.value = '';
    }
  };

  const handleRemoveBg = async () => {
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', 'display_background_url')
      .maybeSingle();

    if (existing) {
      await supabase.from('app_settings').update({ value: '' }).eq('key', 'display_background_url');
    }
    setDisplayBgUrl(null);
    toast.success('רקע התצוגה הוסר');
  };

  // Fetch announcements
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['scheduled-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_announcements')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ScheduledAnnouncement[];
    },
  });

  // Upload image to storage
  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `announcements/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('announcement-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('announcement-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      setIsUploading(true);
      
      // Upload new image if selected
      let imageUrl = data.image_url;
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          throw new Error('Failed to upload image');
        }
      }

      if (data.id) {
        const { error } = await supabase
          .from('scheduled_announcements')
          .update({
            title: data.title,
            content: data.content,
            day_types: data.day_types,
            start_time: data.start_time,
            end_time: data.end_time,
            style: data.style,
            priority: data.priority,
            image_url: imageUrl,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('scheduled_announcements')
          .insert({
            title: data.title,
            content: data.content,
            day_types: data.day_types,
            start_time: data.start_time,
            end_time: data.end_time,
            style: data.style,
            priority: data.priority,
            image_url: imageUrl,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-announcements'] });
      toast.success(editingId ? 'המודעה עודכנה בהצלחה' : 'המודעה נוספה בהצלחה');
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast.error('שגיאה בשמירת המודעה');
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-announcements'] });
      toast.success('המודעה נמחקה בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה במחיקת המודעה');
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('scheduled_announcements')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-announcements'] });
      toast.success('הסטטוס עודכן');
    },
    onError: () => {
      toast.error('שגיאה בעדכון הסטטוס');
    },
  });

  const handleEdit = (announcement: ScheduledAnnouncement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      day_types: announcement.day_types,
      start_time: announcement.start_time.slice(0, 5),
      end_time: announcement.end_time.slice(0, 5),
      style: announcement.style,
      priority: announcement.priority,
      image_url: announcement.image_url,
    });
    setImagePreview(announcement.image_url);
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData(defaultFormData);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('הקובץ גדול מדי. הגודל המקסימלי הוא 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ ...formData, id: editingId || undefined });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6" />
            ניהול מודעות
          </h1>
          <p className="text-muted-foreground">נהל מודעות מתוזמנות לתצוגת הטלוויזיה</p>
        </div>
      </div>

      <MemorialManager showMemorial={showMemorial} onToggleMemorial={toggleMemorial} />

      {/* Finance Display Toggle */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-semibold text-sm">תצוגת מצב כספי</p>
                <p className="text-xs text-muted-foreground">
                  הצג סיכום הכנסות, הוצאות ויתרה על מסך התצוגה
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">הצג על המסך</span>
              <Switch checked={showFinance} onCheckedChange={toggleFinance} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Background Image */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Image className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-semibold text-sm">רקע מסך תצוגה</p>
                <p className="text-xs text-muted-foreground">
                  העלה תמונת רקע שתוצג מאחורי התוכן במסך התצוגה
                </p>
              </div>
            </div>
          </div>
          <input
            ref={bgFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleBgUpload}
            className="hidden"
          />
          {displayBgUrl ? (
            <div className="relative rounded-lg overflow-hidden border">
              <img src={displayBgUrl} alt="רקע תצוגה" className="w-full h-32 object-cover" />
              <div className="absolute top-2 left-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => bgFileInputRef.current?.click()}
                  disabled={bgUploading}
                  className="h-8"
                >
                  <Upload className="w-3 h-3 ml-1" />
                  החלף
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleRemoveBg}
                  className="h-8"
                >
                  <X className="w-3 h-3 ml-1" />
                  הסר
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-20 border-dashed"
              onClick={() => bgFileInputRef.current?.click()}
              disabled={bgUploading}
            >
              <div className="flex flex-col items-center gap-1">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {bgUploading ? 'מעלה...' : 'לחץ להעלאת תמונת רקע'}
                </span>
              </div>
            </Button>
          )}
        </CardContent>
      </Card>

      <div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); setFormData(defaultFormData); }}>
              <Plus className="w-4 h-4 ml-2" />
              הוסף מודעה
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'עריכת מודעה' : 'הוספת מודעה חדשה'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">כותרת</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    const updates: Partial<typeof formData> = { title: newTitle };
                    // Auto-init JSON content when switching to prayer times
                    if (newTitle === 'זמני תפילה') {
                      try { JSON.parse(formData.content); } catch {
                        updates.content = JSON.stringify({
                          weekday: { prayers: [{ name: 'שחרית', time: '05:00' }], lessons: [] },
                          shabbat: { prayers: [{ name: 'שחרית שבת', time: '08:30' }], lessons: [] },
                        }, null, 2);
                      }
                    }
                    setFormData({ ...formData, ...updates });
                  }}
                  placeholder="כותרת המודעה"
                  required
                />
              </div>

              {formData.title === 'זמני תפילה' ? (
                <PrayerTimesEditor
                  value={formData.content}
                  onChange={(json) => setFormData({ ...formData, content: json })}
                />
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="content">תוכן</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="תוכן המודעה"
                    rows={3}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  ימי הצגה
                </Label>
                <div className="grid grid-cols-1 gap-2 p-3 border rounded-lg">
                  {DAY_TYPE_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`day-${option.value}`}
                        checked={formData.day_types.includes(option.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              day_types: [...formData.day_types, option.value],
                            });
                          } else {
                            // Prevent unchecking if it's the last one
                            if (formData.day_types.length > 1) {
                              setFormData({
                                ...formData,
                                day_types: formData.day_types.filter((d) => d !== option.value),
                              });
                            }
                          }
                        }}
                      />
                      <Label htmlFor={`day-${option.value}`} className="cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    שעת התחלה
                  </Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">שעת סיום</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  סגנון עיצוב
                </Label>
                <Select
                  value={formData.style}
                  onValueChange={(value: StyleType) => setFormData({ ...formData, style: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STYLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border ${STYLE_PREVIEWS[value as StyleType]}`} />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Style Preview */}
                <div className={`p-4 rounded-lg border-2 mt-2 ${STYLE_PREVIEWS[formData.style]}`}>
                  <p className="font-bold text-lg">{formData.title || 'כותרת לדוגמה'}</p>
                  <p className="text-sm opacity-90">{formData.content || 'תוכן המודעה יופיע כאן'}</p>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  תמונה (אופציונלי)
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="תצוגה מקדימה"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 left-2 w-6 h-6"
                      onClick={handleRemoveImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-24 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">לחץ להעלאת תמונה</span>
                    </div>
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">עדיפות (0-100)</Label>
                <Input
                  id="priority"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex gap-2 justify-end sticky bottom-0 bg-background pt-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="min-h-[44px]">
                  ביטול
                </Button>
                <Button type="submit" disabled={saveMutation.isPending || isUploading} className="min-h-[44px]">
                  {isUploading ? 'מעלה תמונה...' : saveMutation.isPending ? 'שומר...' : editingId ? 'עדכן' : 'הוסף'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements Table */}
      <Card>
        <CardHeader>
          <CardTitle>רשימת מודעות ({announcements.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">טוען...</div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>אין מודעות. לחץ על "הוסף מודעה" כדי להתחיל.</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block sm:hidden divide-y divide-border">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="p-4 space-y-3 active:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      {announcement.image_url && (
                        <img 
                          src={announcement.image_url} 
                          alt="" 
                          className="w-16 h-16 object-cover rounded-lg shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base">{announcement.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-line">{announcement.content}</p>
                      </div>
                      <Switch
                        checked={announcement.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: announcement.id, is_active: checked })
                        }
                        className="shrink-0"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={`text-xs ${STYLE_PREVIEWS[announcement.style]}`}>
                        {STYLE_LABELS[announcement.style]}
                      </Badge>
                      {announcement.day_types.map((day) => (
                        <Badge key={day} variant="outline" className="text-xs">{DAY_TYPE_LABELS[day]}</Badge>
                      ))}
                      <Badge variant="secondary" className="text-xs">
                        {announcement.start_time.slice(0, 5)} - {announcement.end_time.slice(0, 5)}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEdit(announcement)}
                        className="flex-1 h-10 text-sm"
                      >
                        <Edit className="w-4 h-4 ml-1" />
                        עריכה
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => deleteMutation.mutate(announcement.id)}
                        className="h-10 px-3"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right w-16">תמונה</TableHead>
                      <TableHead className="text-right">כותרת</TableHead>
                      <TableHead className="text-right">יום</TableHead>
                      <TableHead className="text-right">שעות</TableHead>
                      <TableHead className="text-right">סגנון</TableHead>
                      <TableHead className="text-right">פעיל</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell>
                          {announcement.image_url ? (
                            <img 
                              src={announcement.image_url} 
                              alt="" 
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <Image className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{announcement.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">{announcement.content}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {announcement.day_types.map((day) => (
                              <Badge key={day} variant="outline" className="text-xs">
                                {DAY_TYPE_LABELS[day]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell dir="ltr" className="text-right">
                          {announcement.start_time.slice(0, 5)} - {announcement.end_time.slice(0, 5)}
                        </TableCell>
                        <TableCell>
                          <div className={`px-2 py-1 rounded text-xs ${STYLE_PREVIEWS[announcement.style]}`}>
                            {STYLE_LABELS[announcement.style]}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={announcement.is_active}
                            onCheckedChange={(checked) => 
                              toggleActiveMutation.mutate({ id: announcement.id, is_active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(announcement)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(announcement.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
