import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Megaphone, MessageSquare, Send, CheckCircle2, Trash2, Loader2, MailQuestion, Check, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function Messages() {
  const queryClient = useQueryClient();
  const [targetType, setTargetType] = useState<'global' | 'personal'>('global');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

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

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('member_messages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('ההודעה נמחקה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['member_messages'] });
    },
    onError: () => {
      toast.error('שגיאה במחיקת ההודעה');
    }
  });

  // Fetch inquiries
  const { data: inquiries = [], isLoading: isLoadingInquiries } = useQuery({
    queryKey: ['member_inquiries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_inquiries')
        .select(`
          id, subject, content, status, created_at, member_id, resolved_at,
          members ( full_name, phone )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const resolveInquiryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('member_inquiries')
        .update({ 
          status: 'resolved', 
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('הפנייה סומנה כטופלה');
      queryClient.invalidateQueries({ queryKey: ['member_inquiries'] });
    },
    onError: () => {
      toast.error('שגיאה בעדכון הפנייה');
    }
  });

  const replyInquiryMutation = useMutation({
    mutationFn: async ({ id, reply }: { id: string, reply: string }) => {
      const { error } = await supabase
        .from('member_inquiries')
        .update({ 
          status: 'resolved', 
          reply: reply,
          replied_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('התשובה נשלחה והפנייה סומנה כטופלה');
      setReplyInputs({});
      queryClient.invalidateQueries({ queryKey: ['member_inquiries'] });
    },
    onError: () => {
      toast.error('שגיאה בשליחת התשובה');
    }
  });

  const handleReplyChange = (id: string, text: string) => {
    setReplyInputs(prev => ({ ...prev, [id]: text }));
  };

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
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6" />
            הודעות למתפללים
          </h1>
          <p className="text-muted-foreground mt-1">
            שליחת הודעות כלליות או אישיות לאזור האישי של המתפללים
          </p>
        </div>
      </div>

      <Tabs defaultValue="outbox" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
          <TabsTrigger value="outbox">הודעות יוצאות</TabsTrigger>
          <TabsTrigger value="inbox" className="relative">
            פניות נכנסות
            {inquiries.filter(i => i.status === 'new').length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {inquiries.filter(i => i.status === 'new').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outbox">
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
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm')}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            if (confirm('האם אתה בטוח שברצונך למחוק הודעה זו?')) {
                              deleteMessageMutation.mutate(msg.id);
                            }
                          }}
                          disabled={deleteMessageMutation.isPending}
                        >
                          {deleteMessageMutation.isPending && deleteMessageMutation.variables === msg.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
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
        </TabsContent>

        <TabsContent value="inbox">
          <Card>
            <CardHeader>
              <CardTitle>פניות מתפללים</CardTitle>
              <CardDescription>בקשות, שאלות ופניות שהגיעו מהאזור האישי של המתפללים</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInquiries ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : inquiries.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-xl">
                  <MailQuestion className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>אין פניות ממתינות</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {inquiries.map((inquiry: any) => (
                    <div 
                      key={inquiry.id} 
                      className={`p-4 rounded-xl border transition-colors ${
                        inquiry.status === 'new' 
                          ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' 
                          : 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">{inquiry.members?.full_name}</span>
                            <span className="text-sm text-muted-foreground">• {inquiry.members?.phone}</span>
                          </div>
                          <h4 className="font-semibold text-lg">{inquiry.subject}</h4>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(inquiry.created_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                          
                          {inquiry.status === 'new' ? (
                            <Button 
                              size="sm" 
                              onClick={() => resolveInquiryMutation.mutate(inquiry.id)}
                              disabled={resolveInquiryMutation.isPending && resolveInquiryMutation.variables === inquiry.id}
                              className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                            >
                              {resolveInquiryMutation.isPending && resolveInquiryMutation.variables === inquiry.id ? (
                                <Loader2 className="w-3 h-3 animate-spin ml-1" />
                              ) : (
                                <Check className="w-3 h-3 ml-1" />
                              )}
                              סמן כטופל
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3" />
                              טופל
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap mt-3 p-3 bg-white dark:bg-zinc-950 rounded-lg border">
                        {inquiry.content}
                      </p>
                      
                      {inquiry.members?.phone && (
                        <div className="mt-3 flex justify-end">
                          <a 
                            href={`https://wa.me/972${inquiry.members.phone.replace(/^0/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 dark:text-green-500 hover:underline flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            שלח וואטסאפ למתפלל
                          </a>
                        </div>
                      )}

                      {inquiry.reply && (
                        <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                          <div className="flex items-center gap-1 mb-1 text-indigo-700 dark:text-indigo-400">
                            <Send className="w-3.5 h-3.5" />
                            <span className="font-semibold text-sm">תשובת הגבאי</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{inquiry.reply}</p>
                        </div>
                      )}

                      {inquiry.status === 'new' && (
                        <div className="mt-4 border-t pt-4">
                          <Label className="mb-2 block text-sm">מענה לפנייה (המתפלל יראה זאת באזור האישי)</Label>
                          <Textarea
                            placeholder="הקלד את תשובתך למתפלל כאן..."
                            value={replyInputs[inquiry.id] || ''}
                            onChange={(e) => handleReplyChange(inquiry.id, e.target.value)}
                            className="min-h-[80px] text-sm resize-none"
                          />
                          <div className="flex justify-end mt-2">
                            <Button
                              size="sm"
                              disabled={replyInquiryMutation.isPending && replyInquiryMutation.variables?.id === inquiry.id}
                              onClick={() => {
                                const txt = replyInputs[inquiry.id];
                                if (!txt?.trim()) {
                                  toast.error('אנא הזן תוכן למענה לפנייה');
                                  return;
                                }
                                replyInquiryMutation.mutate({ id: inquiry.id, reply: txt });
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700"
                            >
                              {replyInquiryMutation.isPending && replyInquiryMutation.variables?.id === inquiry.id ? (
                                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                              ) : (
                                <Send className="w-4 h-4 ml-2" />
                              )}
                              שלח תשובה וסגור פניה
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
