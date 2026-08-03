import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Send, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

export default function Messages({
  recipientId,
  recipientName,
  onClose
}: {
  recipientId?: string;
  recipientName?: string;
  onClose?: () => void;
}) {
  const { user } = useAuth();
  const location = useLocation();
  const state = location.state as { recipientId?: string; recipientName?: string } | null;
  
  const [activeChatId, setActiveChatId] = useState<string | null>(recipientId || state?.recipientId || null);
  const [activeChatName, setActiveChatName] = useState<string | null>(recipientName || state?.recipientName || null);
  const [messageText, setMessageText] = useState("");
  
  const { inboxUsers, isLoadingInbox } = useMessages();
  const { chatMessages, isLoadingChat, sendMessage, isSending } = useMessages(activeChatId || undefined);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChatId) return;
    
    await sendMessage({ receiverId: activeChatId, text: messageText });
    setMessageText("");
  };

  if (!user) return null;

  // Render specific chat room
  if (activeChatId) {
    return (
      <div className="flex flex-col h-full bg-background min-h-[500px] border rounded-lg overflow-hidden animate-in fade-in slide-in-from-right-4">
        {/* Chat Header */}
        <div className="flex items-center gap-3 p-4 border-b bg-card">
          <Button variant="ghost" size="icon" onClick={() => {
            setActiveChatId(null);
            if (onClose) onClose();
          }}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold">{activeChatName || "משתמש"}</h3>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4 flex flex-col pb-4">
            {isLoadingChat ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground p-8">
                אין הודעות קודמות. שלח הודעה כדי להתחיל שיחה!
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.sender_id === user.$id;
                return (
                  <div key={msg.$id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isMe 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-muted rounded-tl-sm'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <span className={`text-[10px] block mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.$createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-3 border-t bg-card flex gap-2">
          <Input 
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="הקלד הודעה..."
            className="flex-1 rounded-full"
            dir="auto"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!messageText.trim() || isSending}
            className="rounded-full shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    );
  }

  // Render Inbox List
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 pb-20 max-w-2xl mx-auto px-4 mt-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">הודעות 💬</h1>
        <p className="text-sm text-muted-foreground mt-1">
          השיחות הפרטיות שלך עם דייגים אחרים
        </p>
      </div>

      {isLoadingInbox ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : inboxUsers.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent className="pt-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">אין לך הודעות עדיין</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              כנס לפרופיל של דייג אחר ושלח לו הודעה כדי להתחיל.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {inboxUsers.map((chat) => (
            <Card 
              key={chat.user_id} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => {
                setActiveChatId(chat.user_id);
                setActiveChatName(chat.profile?.full_name || "משתמש");
              }}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold truncate">{chat.profile?.full_name || "משתמש"}</h4>
                    {chat.latestMessage && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(chat.latestMessage.$createdAt), { addSuffix: true, locale: he })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.latestMessage?.sender_id === user.$id ? "אתה: " : ""}
                    {chat.latestMessage?.text}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
