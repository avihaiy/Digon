import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';

export default function Reminders() {
  const { user, loading, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders' as any)
        .select('*')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('reminders' as any)
        .insert({ content, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['active-reminders'] });
      setContent('');
      setShowForm(false);
      toast.success('תזכורת נוספה בהצלחה');
    },
    onError: () => toast.error('שגיאה בהוספת תזכורת'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reminders' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['active-reminders'] });
      toast.success('תזכורת נמחקה');
    },
    onError: () => toast.error('שגיאה במחיקת תזכורת'),
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reminders' as any)
        .update({ is_dismissed: true } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['active-reminders'] });
    },
  });

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">תזכורות</h1>
          {reminders.length > 0 && (
            <Badge variant="secondary">{reminders.length}</Badge>
          )}
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-4 h-4 ml-1" />
            הוסף תזכורת
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="animate-in slide-in-from-top-2">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="תוכן התזכורת..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && content.trim()) {
                    addMutation.mutate(content.trim());
                  }
                }}
              />
              <Button
                onClick={() => content.trim() && addMutation.mutate(content.trim())}
                disabled={!content.trim() || addMutation.isPending}
              >
                שמור
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">טוען...</div>
      ) : reminders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>אין תזכורות פעילות</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder: any) => (
            <Card key={reminder.id} className="group">
              <CardContent className="py-4 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium">{reminder.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(reminder.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => dismissMutation.mutate(reminder.id)}
                    title="סגור תזכורת"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(reminder.id)}
                      title="מחק תזכורת"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
