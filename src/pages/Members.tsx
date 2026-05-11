import { useState } from 'react';
import { MemberDetailDialog } from '@/components/MemberDetailDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  Mail,
  Loader2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatShortDate } from '@/lib/hebrew-utils';

interface Member {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  notification_preference?: 'none' | 'email' | 'whatsapp' | null;
  created_at: string;
}

export default function Members() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [detailMember, setDetailMember] = useState<Member | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    notes: '',
    notification_preference: 'none' as 'none' | 'email' | 'whatsapp',
  });

  // Fetch members
  const { data: members, isLoading } = useQuery({
    queryKey: ['members', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('members')
        .select('*')
        .order('full_name');

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Member[];
    },
  });

  // Create/Update member
  const saveMember = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('members')
          .update({
            full_name: data.full_name,
            phone: data.phone || null,
            email: data.email || null,
            notes: data.notes || null,
            notification_preference: data.notification_preference,
          } as any)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('members')
          .insert({
            full_name: data.full_name,
            phone: data.phone || null,
            email: data.email || null,
            notes: data.notes || null,
            notification_preference: data.notification_preference,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingMember ? 'החבר עודכן בהצלחה' : 'החבר נוסף בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('שגיאה בשמירת החבר', { description: error.message });
    },
  });

  // Toggle active status
  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('members')
        .update({ active: !active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('סטטוס החבר עודכן');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  // Delete member
  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('החבר נמחק בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (error) => {
      toast.error('שגיאה במחיקת החבר', { description: error.message });
    },
  });

  const emptyForm = { full_name: '', phone: '', email: '', notes: '', notification_preference: 'none' as const };

  const handleOpenDialog = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        full_name: member.full_name,
        phone: member.phone || '',
        email: member.email || '',
        notes: member.notes || '',
        notification_preference: (member.notification_preference || 'none') as 'none' | 'email' | 'whatsapp',
      });
    } else {
      setEditingMember(null);
      setFormData(emptyForm);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMember(null);
    setFormData(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMember.mutate({
      ...formData,
      id: editingMember?.id,
    });
  };

  const activeMembers = members?.filter((m) => m.active) || [];
  const inactiveMembers = members?.filter((m) => !m.active) || [];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            ניהול חברים
          </h1>
          <p className="text-muted-foreground">
            {activeMembers.length} חברים פעילים
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="btn-primary-gradient gap-2">
          <Plus className="w-4 h-4" />
          הוסף חבר
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש לפי שם, טלפון או אימייל..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Members Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))
        ) : members?.length === 0 ? (
          <Card className="col-span-full glass-card py-12">
            <CardContent className="text-center text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">אין חברים להצגה</p>
              <p className="text-sm">לחץ על "הוסף חבר" להוספת חבר חדש</p>
            </CardContent>
          </Card>
        ) : (
          members?.map((member) => (
            <Card
              key={member.id}
              className={`glass-card transition-all cursor-pointer hover:ring-2 hover:ring-primary/30 ${
                !member.active ? 'opacity-60' : ''
              }`}
              onClick={() => setDetailMember(member)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      member.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {member.active ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold">{member.full_name}</h3>
                      <Badge variant={member.active ? 'default' : 'secondary'} className="text-xs">
                        {member.active ? 'פעיל' : 'לא פעיל'}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => handleOpenDialog(member)}>
                        <Edit className="w-4 h-4 ml-2" />
                        ערוך
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toggleActive.mutate({ id: member.id, active: member.active })}
                      >
                        {member.active ? (
                          <>
                            <UserX className="w-4 h-4 ml-2" />
                            הפוך ללא פעיל
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 ml-2" />
                            הפעל
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteMember.mutate(member.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        מחק
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm">
                  {member.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span dir="ltr">{member.phone}</span>
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span dir="ltr" className="truncate">{member.email}</span>
                    </div>
                  )}
                </div>

                {member.notes && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    {member.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? 'עריכת חבר' : 'הוספת חבר חדש'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">שם מלא *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notify-pref">שליחת קבלה אוטומטית</Label>
              <select
                id="notify-pref"
                value={formData.notification_preference}
                onChange={(e) => setFormData({ ...formData, notification_preference: e.target.value as any })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="none">לא לשלוח</option>
                <option value="email">דוא״ל</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <p className="text-xs text-muted-foreground">
                לאחר הפקת קבלה ע״י הגזבר, היא תישלח אוטומטית באפיק הנבחר.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                ביטול
              </Button>
              <Button type="submit" className="flex-1 btn-primary-gradient" disabled={saveMember.isPending}>
                {saveMember.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  'שמור'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Member Detail Dialog */}
      <MemberDetailDialog
        memberId={detailMember?.id || null}
        memberName={detailMember?.full_name || ''}
        open={!!detailMember}
        onOpenChange={(open) => !open && setDetailMember(null)}
      />
    </div>
  );
}
