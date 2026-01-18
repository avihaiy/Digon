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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  HEBREW_MONTHS, getHebrewDate, formatCurrency, getCurrentParasha, 
  getShabbatTimes, formatTimeOnly, ISRAEL_LOCATIONS 
} from '@/lib/hebrew-utils';
import { 
  Clock, Users, DollarSign, Bell, BookOpen, Plus, Edit, Trash2, 
  Flame, Calendar, Monitor, MessageSquare, Settings, MapPin, Sunset, Star 
} from 'lucide-react';
import { SettingsTab } from '@/components/admin/SettingsTab';

export default function Admin() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLocation, setSelectedLocation] = useState('akko');
  const [locationLoaded, setLocationLoaded] = useState(false);
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

  // Load location setting from DB
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

  useEffect(() => {
    if (locationSetting && !locationLoaded) {
      setSelectedLocation(locationSetting);
      setLocationLoaded(true);
    }
  }, [locationSetting, locationLoaded]);

  // Save location mutation
  const saveLocationMutation = useMutation({
    mutationFn: async (location: string) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'display_location', value: location }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-location'] });
      toast({ title: 'המיקום נשמר בהצלחה' });
    },
    onError: () => toast({ title: 'שגיאה בשמירת המיקום', variant: 'destructive' }),
  });

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
    saveLocationMutation.mutate(location);
  };

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [members, payments, aliyot, receipts] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact' }).eq('active', true),
        supabase.from('payments').select('amount').eq('status', 'confirmed'),
        supabase.from('aliyot').select('id', { count: 'exact' }),
        supabase.from('receipts').select('id', { count: 'exact' }),
      ]);
      return {
        activeMembers: members.count || 0,
        totalIncome: payments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
        totalAliyot: aliyot.count || 0,
        totalReceipts: receipts.count || 0,
      };
    },
  });

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
      const { data } = await supabase.from('memorial_names').select('*').order('hebrew_death_month', { ascending: true }).order('hebrew_death_day', { ascending: true });
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
      toast({ title: 'זמן התפילה נשמר בהצלחה' });
      setPrayerDialogOpen(false);
      setPrayerForm({ name: '', time: '', day_type: 'weekday', notes: '' });
      setEditingPrayer(null);
    },
    onError: () => toast({ title: 'שגיאה בשמירה', variant: 'destructive' }),
  });

  const deletePrayerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('prayer_times').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-times'] });
      toast({ title: 'זמן התפילה נמחק' });
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
      toast({ title: 'שם הנפטר נשמר בהצלחה' });
      setMemorialDialogOpen(false);
      setMemorialForm({ deceased_name: '', father_name: '', is_male: true, hebrew_death_day: 1, hebrew_death_month: 1, notes: '' });
      setEditingMemorial(null);
    },
    onError: () => toast({ title: 'שגיאה בשמירה', variant: 'destructive' }),
  });

  const deleteMemorialMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('memorial_names').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memorial-names'] });
      toast({ title: 'שם הנפטר נמחק' });
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
      toast({ title: 'ההודעה נשמרה בהצלחה' });
      setAnnouncementDialogOpen(false);
      setAnnouncementForm({ content: '', priority: 0, show_on_shabbat: false });
      setEditingAnnouncement(null);
    },
    onError: () => toast({ title: 'שגיאה בשמירה', variant: 'destructive' }),
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({ title: 'ההודעה נמחקה' });
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

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Sidebar */}
      <aside className="fixed right-0 top-0 h-full w-64 bg-gradient-to-b from-maroon-900 to-maroon-950 text-white p-6 shadow-xl" style={{ background: 'linear-gradient(to bottom, #5D0E1F, #3D0A14)' }}>
        <div className="text-2xl font-bold mb-8 text-center">
          <Flame className="w-8 h-8 mx-auto mb-2 text-amber-400" />
          ניהול בית הכנסת
        </div>
        
        <nav className="space-y-2">
          {[
            { id: 'overview', label: 'סקירה כללית', icon: Monitor },
            { id: 'prayers', label: 'זמני תפילות', icon: Clock },
            { id: 'memorial', label: 'לוח אזכרות', icon: Flame },
            { id: 'announcements', label: 'הודעות', icon: MessageSquare },
            { id: 'settings', label: 'הגדרות תצוגה', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="text-center text-sm text-white/50 mb-4">
            קישורים לתצוגות
          </div>
          <div className="space-y-2">
            <a
              href="/display-general"
              target="_blank"
              className="block w-full text-center px-4 py-2 rounded-lg bg-blue-600/30 text-blue-200 hover:bg-blue-600/50 transition-colors"
            >
              📺 תצוגה כללית
            </a>
            <a
              href="/display-memorial"
              target="_blank"
              className="block w-full text-center px-4 py-2 rounded-lg bg-amber-600/30 text-amber-200 hover:bg-amber-600/50 transition-colors"
            >
              🕯️ לוח אזכרות
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="mr-64 p-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">שלום, {user.email}</h1>
                <p className="text-gray-500 mt-1">{getHebrewDate(new Date())} • פרשת {getCurrentParasha()}</p>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <Select value={selectedLocation} onValueChange={handleLocationChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISRAEL_LOCATIONS).map(([key, loc]) => (
                      <SelectItem key={key} value={key}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Shabbat Times Card */}
            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Flame className="w-5 h-5 text-orange-500" />
                  זמני שבת - {ISRAEL_LOCATIONS[selectedLocation]?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white/80 rounded-xl">
                    <Flame className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                    <div className="text-sm text-gray-500">הדלקת נרות</div>
                    <div className="text-2xl font-bold text-orange-600">{formatTimeOnly(shabbatTimes.candleLighting)}</div>
                  </div>
                  <div className="text-center p-4 bg-white/80 rounded-xl">
                    <Sunset className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                    <div className="text-sm text-gray-500">כניסת שבת</div>
                    <div className="text-2xl font-bold text-amber-600">{formatTimeOnly(shabbatTimes.shabbatStart)}</div>
                  </div>
                  <div className="text-center p-4 bg-white/80 rounded-xl">
                    <Sunset className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                    <div className="text-sm text-gray-500">צאת שבת</div>
                    <div className="text-2xl font-bold text-blue-600">{formatTimeOnly(shabbatTimes.shabbatEnd)}</div>
                  </div>
                  <div className="text-center p-4 bg-white/80 rounded-xl">
                    <Star className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                    <div className="text-sm text-gray-500">הבדלה</div>
                    <div className="text-2xl font-bold text-purple-600">{formatTimeOnly(shabbatTimes.havdalah)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stats?.activeMembers || 0}</div>
                      <div className="text-sm text-gray-500">חברים פעילים</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{formatCurrency(stats?.totalIncome || 0)}</div>
                      <div className="text-sm text-gray-500">סה״כ הכנסות</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stats?.totalAliyot || 0}</div>
                      <div className="text-sm text-gray-500">עליות לתורה</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Bell className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stats?.totalReceipts || 0}</div>
                      <div className="text-sm text-gray-500">קבלות</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    זמני תפילות להיום
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {prayerTimes.filter((p: any) => p.is_active).slice(0, 5).map((prayer: any) => (
                      <div key={prayer.id} className="flex justify-between items-center">
                        <span className="font-medium">{prayer.name}</span>
                        <span className="text-lg font-bold text-primary">{prayer.time.slice(0, 5)}</span>
                      </div>
                    ))}
                    {prayerTimes.length === 0 && (
                      <p className="text-gray-500 text-center py-4">לא הוגדרו זמני תפילות</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-500" />
                    יארצייטים קרובים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {memorialNames.slice(0, 5).map((name: any) => (
                      <div key={name.id} className="flex justify-between items-center">
                        <span>{name.deceased_name} {name.is_male ? 'בן' : 'בת'} {name.father_name}</span>
                        <span className="text-sm text-gray-500">
                          {name.hebrew_death_day} {getMonthLabel(name.hebrew_death_month)}
                        </span>
                      </div>
                    ))}
                    {memorialNames.length === 0 && (
                      <p className="text-gray-500 text-center py-4">לא הוזנו שמות נפטרים</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Prayers Tab */}
        {activeTab === 'prayers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">זמני תפילות</h2>
              <Dialog open={prayerDialogOpen} onOpenChange={setPrayerDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingPrayer(null); setPrayerForm({ name: '', time: '', day_type: 'weekday', notes: '' }); }}>
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף זמן תפילה
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingPrayer ? 'עריכת זמן תפילה' : 'הוספת זמן תפילה'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>שם התפילה</Label>
                      <Input 
                        value={prayerForm.name} 
                        onChange={e => setPrayerForm({...prayerForm, name: e.target.value})}
                        placeholder="לדוגמה: שחרית, מנחה, ערבית"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>שעה</Label>
                      <Input 
                        type="time"
                        value={prayerForm.time} 
                        onChange={e => setPrayerForm({...prayerForm, time: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>סוג</Label>
                      <Select value={prayerForm.day_type} onValueChange={v => setPrayerForm({...prayerForm, day_type: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekday">תפילה - יום חול</SelectItem>
                          <SelectItem value="shabbat">תפילה - שבת</SelectItem>
                          <SelectItem value="holiday">תפילה - חג</SelectItem>
                          <SelectItem value="torah_class">שיעור תורה - יום חול</SelectItem>
                          <SelectItem value="shabbat_torah_class">שיעור תורה - שבת</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
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

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם התפילה</TableHead>
                    <TableHead>שעה</TableHead>
                    <TableHead>סוג יום</TableHead>
                    <TableHead>פעיל</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prayerTimes.map((prayer: any) => (
                    <TableRow key={prayer.id}>
                      <TableCell className="font-medium">{prayer.name}</TableCell>
                      <TableCell>{prayer.time.slice(0, 5)}</TableCell>
                      <TableCell>
                        {{
                          weekday: 'תפילה - יום חול',
                          shabbat: 'תפילה - שבת',
                          holiday: 'תפילה - חג',
                          torah_class: 'שיעור - יום חול',
                          shabbat_torah_class: 'שיעור - שבת',
                        }[prayer.day_type as string] || prayer.day_type}
                      </TableCell>
                      <TableCell>{prayer.is_active ? '✓' : '✗'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setEditingPrayer(prayer.id);
                              setPrayerForm({ name: prayer.name, time: prayer.time.slice(0, 5), day_type: prayer.day_type, notes: prayer.notes || '' });
                              setPrayerDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deletePrayerMutation.mutate(prayer.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Memorial Tab */}
        {activeTab === 'memorial' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">לוח אזכרות (יארצייט)</h2>
              <Dialog open={memorialDialogOpen} onOpenChange={setMemorialDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingMemorial(null); setMemorialForm({ deceased_name: '', father_name: '', is_male: true, hebrew_death_day: 1, hebrew_death_month: 1, notes: '' }); }}>
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף שם נפטר
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingMemorial ? 'עריכת נפטר' : 'הוספת נפטר חדש'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>שם הנפטר/ת</Label>
                      <Input 
                        value={memorialForm.deceased_name} 
                        onChange={e => setMemorialForm({...memorialForm, deceased_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>שם האב</Label>
                      <Input 
                        value={memorialForm.father_name} 
                        onChange={e => setMemorialForm({...memorialForm, father_name: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <Label>מין</Label>
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
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>יום פטירה (עברי)</Label>
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
                      <div className="space-y-2">
                        <Label>חודש פטירה (עברי)</Label>
                        <Select 
                          value={memorialForm.hebrew_death_month.toString()} 
                          onValueChange={v => setMemorialForm({...memorialForm, hebrew_death_month: parseInt(v)})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HEBREW_MONTHS.map(month => (
                              <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>הערות</Label>
                      <Textarea 
                        value={memorialForm.notes || ''} 
                        onChange={e => setMemorialForm({...memorialForm, notes: e.target.value})}
                      />
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

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם הנפטר/ת</TableHead>
                    <TableHead>בן/בת</TableHead>
                    <TableHead>תאריך פטירה (עברי)</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memorialNames.map((name: any) => (
                    <TableRow key={name.id}>
                      <TableCell className="font-medium">{name.deceased_name}</TableCell>
                      <TableCell>{name.is_male ? 'בן' : 'בת'} {name.father_name}</TableCell>
                      <TableCell>{name.hebrew_death_day} {getMonthLabel(name.hebrew_death_month)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
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
                          <Button size="sm" variant="ghost" onClick={() => deleteMemorialMutation.mutate(name.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">הודעות לרצועה</h2>
              <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingAnnouncement(null); setAnnouncementForm({ content: '', priority: 0, show_on_shabbat: false }); }}>
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף הודעה
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingAnnouncement ? 'עריכת הודעה' : 'הוספת הודעה חדשה'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>תוכן ההודעה</Label>
                      <Textarea 
                        value={announcementForm.content} 
                        onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>עדיפות (מספר גבוה = קודם)</Label>
                      <Input 
                        type="number"
                        value={announcementForm.priority} 
                        onChange={e => setAnnouncementForm({...announcementForm, priority: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={announcementForm.show_on_shabbat}
                        onCheckedChange={v => setAnnouncementForm({...announcementForm, show_on_shabbat: v})}
                      />
                      <Label>הצג גם בשבת</Label>
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

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>תוכן</TableHead>
                    <TableHead>עדיפות</TableHead>
                    <TableHead>שבת</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((ann: any) => (
                    <TableRow key={ann.id}>
                      <TableCell className="font-medium max-w-md truncate">{ann.content}</TableCell>
                      <TableCell>{ann.priority}</TableCell>
                      <TableCell>{ann.show_on_shabbat ? '✓' : '✗'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setEditingAnnouncement(ann.id);
                              setAnnouncementForm({ content: ann.content, priority: ann.priority, show_on_shabbat: ann.show_on_shabbat });
                              setAnnouncementDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteAnnouncementMutation.mutate(ann.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsTab 
            selectedLocation={selectedLocation} 
            onLocationChange={handleLocationChange}
          />
        )}
      </main>
    </div>
  );
}
