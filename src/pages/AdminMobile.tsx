import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  HEBREW_MONTHS, getHebrewDate, getCurrentParasha, 
  getShabbatTimes, formatTimeOnly, ISRAEL_LOCATIONS 
} from '@/lib/hebrew-utils';
import { 
  Clock, Plus, Edit, Trash2, Flame, Menu, Monitor, 
  MessageSquare, Settings, MapPin, ExternalLink, Building2, Save
} from 'lucide-react';

export default function AdminMobile() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('prayers');
  const [selectedLocation, setSelectedLocation] = useState('akko');
  const [synagogueName, setSynagogueName] = useState('בית הכנסת');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const shabbatTimes = getShabbatTimes(selectedLocation);
  
  // Dialog states
  const [prayerDialogOpen, setPrayerDialogOpen] = useState(false);
  const [memorialDialogOpen, setMemorialDialogOpen] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  
  // Form states
  const [prayerForm, setPrayerForm] = useState({ name: '', time: '', day_type: 'weekday', notes: '' });
  const [memorialForm, setMemorialForm] = useState({ 
    deceased_name: '', father_name: '', is_male: true, 
    hebrew_death_day: 1, hebrew_death_month: 1, notes: '' 
  });
  const [announcementForm, setAnnouncementForm] = useState({ 
    content: '', priority: 0, show_on_shabbat: false 
  });
  
  const [editingPrayer, setEditingPrayer] = useState<string | null>(null);
  const [editingMemorial, setEditingMemorial] = useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<string | null>(null);

  // Load settings
  const { data: locationSetting } = useQuery({
    queryKey: ['app-settings-location'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'display_location')
        .single();
      return data?.value || 'akko';
    },
  });

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

  useEffect(() => {
    if (locationSetting) setSelectedLocation(locationSetting);
    if (nameSetting) setSynagogueName(nameSetting);
  }, [locationSetting, nameSetting]);

  // Queries
  const { data: prayerTimes = [] } = useQuery({
    queryKey: ['prayer-times'],
    queryFn: async () => {
      const { data } = await supabase.from('prayer_times').select('*').order('time');
      return data || [];
    },
  });

  const { data: memorialNames = [] } = useQuery({
    queryKey: ['memorial-names'],
    queryFn: async () => {
      const { data } = await supabase.from('memorial_names').select('*').order('hebrew_death_month').order('hebrew_death_day');
      return data || [];
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data } = await supabase.from('announcements').select('*').order('priority', { ascending: false });
      return data || [];
    },
  });

  // Mutations
  const saveLocationMutation = useMutation({
    mutationFn: async (location: string) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'display_location', value: location }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-location'] });
      toast({ title: 'המיקום נשמר' });
    },
  });

  const saveNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'synagogue_name', value: name }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-synagogue-name'] });
      toast({ title: 'השם נשמר' });
    },
  });

  const savePrayerMutation = useMutation({
    mutationFn: async (data: typeof prayerForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from('prayer_times').update(data).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('prayer_times').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-times'] });
      toast({ title: 'נשמר בהצלחה' });
      setPrayerDialogOpen(false);
      setPrayerForm({ name: '', time: '', day_type: 'weekday', notes: '' });
      setEditingPrayer(null);
    },
  });

  const deletePrayerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('prayer_times').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-times'] });
      toast({ title: 'נמחק' });
    },
  });

  const saveMemorialMutation = useMutation({
    mutationFn: async (data: typeof memorialForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from('memorial_names').update(data).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('memorial_names').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memorial-names'] });
      toast({ title: 'נשמר בהצלחה' });
      setMemorialDialogOpen(false);
      setMemorialForm({ deceased_name: '', father_name: '', is_male: true, hebrew_death_day: 1, hebrew_death_month: 1, notes: '' });
      setEditingMemorial(null);
    },
  });

  const deleteMemorialMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('memorial_names').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memorial-names'] });
      toast({ title: 'נמחק' });
    },
  });

  const saveAnnouncementMutation = useMutation({
    mutationFn: async (data: typeof announcementForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from('announcements').update(data).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('announcements').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({ title: 'נשמר בהצלחה' });
      setAnnouncementDialogOpen(false);
      setAnnouncementForm({ content: '', priority: 0, show_on_shabbat: false });
      setEditingAnnouncement(null);
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({ title: 'נמחק' });
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const getMonthLabel = (month: number) => {
    return HEBREW_MONTHS.find(m => m.value === month)?.label || month.toString();
  };

  const getDayTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      weekday: 'יום חול',
      shabbat: 'שבת',
      holiday: 'חג',
      torah_class: 'שיעור - יום חול',
      shabbat_torah_class: 'שיעור - שבת',
    };
    return labels[type] || type;
  };

  const navItems = [
    { id: 'prayers', label: 'תפילות', icon: Clock },
    { id: 'memorial', label: 'אזכרות', icon: Flame },
    { id: 'announcements', label: 'הודעות', icon: MessageSquare },
    { id: 'settings', label: 'הגדרות', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 flex items-center justify-between shadow-lg">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <div className="bg-gradient-to-b from-primary to-primary/90 h-full text-white p-6">
              <div className="text-xl font-bold mb-6 flex items-center gap-2">
                <Flame className="w-6 h-6 text-amber-400" />
                ניהול בית הכנסת
              </div>
              <nav className="space-y-2">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeTab === item.id
                        ? 'bg-white/20'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </nav>
              
              <div className="mt-8 pt-6 border-t border-white/20 space-y-3">
                <a
                  href="/display-general"
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/30 hover:bg-blue-500/50"
                >
                  <Monitor className="w-4 h-4" />
                  תצוגה כללית
                  <ExternalLink className="w-3 h-3 mr-auto" />
                </a>
                <a
                  href="/display-memorial"
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/30 hover:bg-amber-500/50"
                >
                  <Flame className="w-4 h-4" />
                  לוח אזכרות
                  <ExternalLink className="w-3 h-3 mr-auto" />
                </a>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        <h1 className="text-lg font-bold">ניהול בית הכנסת</h1>
        
        <div className="w-10" /> {/* Spacer for balance */}
      </header>

      {/* Quick Actions Bar */}
      <div className="flex gap-2 p-3 overflow-x-auto bg-white border-b">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              activeTab === item.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="p-4 pb-24 space-y-4">
        {/* Prayers Tab */}
        {activeTab === 'prayers' && (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">זמני תפילות</h2>
              <Dialog open={prayerDialogOpen} onOpenChange={setPrayerDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => { setEditingPrayer(null); setPrayerForm({ name: '', time: '', day_type: 'weekday', notes: '' }); }}>
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>{editingPrayer ? 'עריכה' : 'הוספה'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>שם</Label>
                      <Input 
                        value={prayerForm.name} 
                        onChange={e => setPrayerForm({...prayerForm, name: e.target.value})}
                        placeholder="שחרית, מנחה..."
                      />
                    </div>
                    <div>
                      <Label>שעה</Label>
                      <Input 
                        type="time"
                        value={prayerForm.time} 
                        onChange={e => setPrayerForm({...prayerForm, time: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>סוג</Label>
                      <Select value={prayerForm.day_type} onValueChange={v => setPrayerForm({...prayerForm, day_type: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekday">תפילה - יום חול</SelectItem>
                          <SelectItem value="shabbat">תפילה - שבת</SelectItem>
                          <SelectItem value="torah_class">שיעור - יום חול</SelectItem>
                          <SelectItem value="shabbat_torah_class">שיעור - שבת</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>הערות</Label>
                      <Textarea 
                        value={prayerForm.notes || ''} 
                        onChange={e => setPrayerForm({...prayerForm, notes: e.target.value})}
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => savePrayerMutation.mutate(editingPrayer ? {...prayerForm, id: editingPrayer} : prayerForm)}
                    >
                      שמור
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {prayerTimes.map((prayer: any) => (
                <Card key={prayer.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">{prayer.name}</div>
                      <div className="text-sm text-gray-500">
                        {getDayTypeLabel(prayer.day_type)} • {prayer.time.slice(0, 5)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => {
                          setEditingPrayer(prayer.id);
                          setPrayerForm({ name: prayer.name, time: prayer.time.slice(0, 5), day_type: prayer.day_type, notes: prayer.notes || '' });
                          setPrayerDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deletePrayerMutation.mutate(prayer.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {prayerTimes.length === 0 && (
                <p className="text-center text-gray-500 py-8">לא הוגדרו זמנים</p>
              )}
            </div>
          </>
        )}

        {/* Memorial Tab */}
        {activeTab === 'memorial' && (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">לוח אזכרות</h2>
              <Dialog open={memorialDialogOpen} onOpenChange={setMemorialDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => { setEditingMemorial(null); setMemorialForm({ deceased_name: '', father_name: '', is_male: true, hebrew_death_day: 1, hebrew_death_month: 1, notes: '' }); }}>
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingMemorial ? 'עריכה' : 'הוספה'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>שם הנפטר/ת</Label>
                      <Input 
                        value={memorialForm.deceased_name} 
                        onChange={e => setMemorialForm({...memorialForm, deceased_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>שם האב</Label>
                      <Input 
                        value={memorialForm.father_name} 
                        onChange={e => setMemorialForm({...memorialForm, father_name: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          checked={memorialForm.is_male} 
                          onChange={() => setMemorialForm({...memorialForm, is_male: true})}
                        />
                        זכר
                      </label>
                      <label className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          checked={!memorialForm.is_male} 
                          onChange={() => setMemorialForm({...memorialForm, is_male: false})}
                        />
                        נקבה
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>יום</Label>
                        <Select 
                          value={memorialForm.hebrew_death_day.toString()} 
                          onValueChange={v => setMemorialForm({...memorialForm, hebrew_death_day: parseInt(v)})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                              <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>חודש</Label>
                        <Select 
                          value={memorialForm.hebrew_death_month.toString()} 
                          onValueChange={v => setMemorialForm({...memorialForm, hebrew_death_month: parseInt(v)})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HEBREW_MONTHS.map(m => (
                              <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => saveMemorialMutation.mutate(editingMemorial ? {...memorialForm, id: editingMemorial} : memorialForm)}
                    >
                      שמור
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {memorialNames.map((name: any) => (
                <Card key={name.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">{name.deceased_name} {name.is_male ? 'בן' : 'בת'} {name.father_name}</div>
                      <div className="text-sm text-gray-500">
                        {name.hebrew_death_day} {getMonthLabel(name.hebrew_death_month)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => {
                          setEditingMemorial(name.id);
                          setMemorialForm({ 
                            deceased_name: name.deceased_name, 
                            father_name: name.father_name, 
                            is_male: name.is_male,
                            hebrew_death_day: name.hebrew_death_day,
                            hebrew_death_month: name.hebrew_death_month,
                            notes: name.notes || ''
                          });
                          setMemorialDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMemorialMutation.mutate(name.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {memorialNames.length === 0 && (
                <p className="text-center text-gray-500 py-8">לא הוזנו שמות</p>
              )}
            </div>
          </>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">הודעות</h2>
              <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => { setEditingAnnouncement(null); setAnnouncementForm({ content: '', priority: 0, show_on_shabbat: false }); }}>
                    <Plus className="w-4 h-4 ml-1" />
                    הוסף
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>{editingAnnouncement ? 'עריכה' : 'הוספה'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>תוכן ההודעה</Label>
                      <Textarea 
                        value={announcementForm.content} 
                        onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>עדיפות (מספר גבוה = יוצג ראשון)</Label>
                      <Input 
                        type="number"
                        value={announcementForm.priority} 
                        onChange={e => setAnnouncementForm({...announcementForm, priority: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch 
                        checked={announcementForm.show_on_shabbat}
                        onCheckedChange={v => setAnnouncementForm({...announcementForm, show_on_shabbat: v})}
                      />
                      <Label>הצג בשבת</Label>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => saveAnnouncementMutation.mutate(editingAnnouncement ? {...announcementForm, id: editingAnnouncement} : announcementForm)}
                    >
                      שמור
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {announcements.map((ann: any) => (
                <Card key={ann.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{ann.content}</div>
                      <div className="text-sm text-gray-500 flex gap-2 mt-1">
                        <span>עדיפות: {ann.priority}</span>
                        {ann.show_on_shabbat && <span className="text-purple-600">• שבת</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => {
                          setEditingAnnouncement(ann.id);
                          setAnnouncementForm({ content: ann.content, priority: ann.priority, show_on_shabbat: ann.show_on_shabbat });
                          setAnnouncementDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteAnnouncementMutation.mutate(ann.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {announcements.length === 0 && (
                <p className="text-center text-gray-500 py-8">אין הודעות</p>
              )}
            </div>
          </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">הגדרות</h2>
            
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-bold">שם בית הכנסת</h3>
              </div>
              <div className="space-y-3">
                <Input 
                  value={synagogueName}
                  onChange={e => setSynagogueName(e.target.value)}
                  placeholder="שם בית הכנסת"
                />
                <Button 
                  className="w-full"
                  onClick={() => saveNameMutation.mutate(synagogueName)}
                  disabled={saveNameMutation.isPending}
                >
                  <Save className="w-4 h-4 ml-2" />
                  שמור שם
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-bold">מיקום לזמנים</h3>
              </div>
              <Select 
                value={selectedLocation} 
                onValueChange={v => {
                  setSelectedLocation(v);
                  saveLocationMutation.mutate(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ISRAEL_LOCATIONS).map(([key, loc]) => (
                    <SelectItem key={key} value={key}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4">
              <h3 className="font-bold mb-3">זמני שבת - {ISRAEL_LOCATIONS[selectedLocation]?.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>הדלקת נרות</span>
                  <span className="font-bold">{formatTimeOnly(shabbatTimes.candleLighting)}</span>
                </div>
                <div className="flex justify-between">
                  <span>צאת השבת</span>
                  <span className="font-bold">{formatTimeOnly(shabbatTimes.havdalah)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-bold mb-3">קישורים לתצוגות</h3>
              <div className="space-y-2">
                <a
                  href="/display-general"
                  target="_blank"
                  className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200"
                >
                  <Monitor className="w-5 h-5" />
                  <span>פתח תצוגה כללית</span>
                  <ExternalLink className="w-4 h-4 mr-auto" />
                </a>
                <a
                  href="/display-memorial"
                  target="_blank"
                  className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-200"
                >
                  <Flame className="w-5 h-5" />
                  <span>פתח לוח אזכרות</span>
                  <ExternalLink className="w-4 h-4 mr-auto" />
                </a>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
