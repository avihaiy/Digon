import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Megaphone, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Messages() {
  const queryClient = useQueryClient();
  const [targetType, setTargetType] = useState<'global' | 'personal'>('global');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch members for the dropdown
  const { data: members = [] } = useQuery({
    queryKey: ['members-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name, active')
        .eq('active', true)
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch past messages
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['member_messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_messages')
        .select(`
          id, title, content, created_at, is_read, member_id,
          members ( full_name )
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('נא להזין תוכן להודעה');
      return;
    }
    
    if (targetType === 'personal' && !selectedMember) {
      toast.error('נא לבחור מתפלל');
      return;
    }

    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('member_messages')
      .insert({
        member_id: targetType === 'personal' ? selectedMember : null,
        title: title.trim() || null,
        content: content.trim(),
        created_by: (await supabase.auth.getUser()).data.user?.id
      });

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      toast.error('אירעה שגיאה בשליחת ההודעה');
    } else {
      toast.success('ההודעה נשלחה בהצלחה!');
      setTitle('');
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['member_messages'] });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="הודעות למתפללים"
        description="שליחת הודעות כלליות או אישיות לאזור האישי של המתפללים"
        icon={Megaphone}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">שליחת הודעה חדשה</CardTitle>
            <CardDescription>ההודעה תופיע באזור האישי של המתפלל</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>סוג הודעה</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={targetType === 'global' ? 'default' : 'outline'}
                    onClick={() => setTargetType('global')}
                    className="w-full"
                  >
                    כללית לכולם
                  </Button>
                  <Button
                    type="button"
                    variant={targetType === 'personal' ? 'default' : 'outline'}
                    onClick={() => setTargetType('personal')}
                    className="w-full"
                  >
                    אישית למתפלל
                  </Button>
                </div>
              </div>

              {targetType === 'personal' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label>בחר מתפלל</Label>
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מתפלל מהרשימה..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>כותרת (אופציונלי)</Label>
                <Input 
                  placeholder="למשל: עדכון זמני תפילות" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>תוכן ההודעה</Label>
                <Textarea 
                  placeholder="הקלד את תוכן ההודעה כאן..." 
                  className="min-h-[120px] resize-none"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    שלח הודעה
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">היסטוריית הודעות</CardTitle>
            <CardDescription>הודעות אחרונות שנשלחו למתפללים</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMessages ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>לא נשלחו עדיין הודעות</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg: any) => (
                  <div key={msg.id} className="bg-muted/50 p-4 rounded-xl border relative group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {msg.member_id ? (
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium border border-primary/20">
                            אישית ל{msg.members?.full_name}
                          </span>
                        ) : (
                          <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-medium border border-blue-500/20">
                            הודעה כללית
                          </span>
                        )}
                        {msg.title && <h4 className="font-semibold text-sm">{msg.title}</h4>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                    
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    
                    {msg.member_id && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {msg.is_read ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            <span>נקרא ע״י המתפלל</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 opacity-40" />
                            <span>טרם נקרא</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
