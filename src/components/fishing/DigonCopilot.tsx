import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMarineWeather } from '@/hooks/useMarineWeather';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function DigonCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { data: marineData } = useMarineWeather();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { 
          role: 'assistant', 
          content: `שלום ${user?.name?.split(' ')[0] || 'דייג'}! אני Digon Copilot, עוזר הדיג האישי שלך. אני מחובר לנתוני הים הנוכחיים של ${marineData?.locationName || 'המיקום שלך'}. איך אפשר לעזור לך היום? 🎣` 
        }
      ]);
    }
  }, [isOpen, messages.length, user?.name, marineData?.locationName]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('חסר מפתח API של Gemini');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Build context
      const systemContext = `You are Digon Copilot, a professional, friendly fishing assistant in Israel. Answer in Hebrew. Keep answers short, direct, and helpful (max 3-4 sentences). 
Current user context:
- Name: ${user?.name || 'דייג'}
- Location: ${marineData?.locationName || 'Unknown'}
- Current Sea State: Waves ${marineData?.waveHeight}m, Wind ${marineData?.windSpeed}km/h (${marineData?.windDirectionText}), Water Temp ${marineData?.dailyForecast?.[0]?.tempMax}°C.
- Fishing Score: ${marineData?.fishingScore}/100.
If they ask about the sea or if it's good to fish, use this live data to answer accurately!`;

      // Format previous messages for Gemini
      const chatHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const prompt = `${systemContext}\n\nChat History:\n${chatHistory}\n\nUser: ${userMessage}\nAssistant:`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      setMessages(prev => [...prev, { role: 'assistant', content: text.trim() }]);
    } catch (error) {
      console.error('Copilot error:', error);
      toast.error('שגיאה בתקשורת עם Copilot');
      setMessages(prev => [...prev, { role: 'assistant', content: 'אופס, נתקלתי בבעיית תקשורת. נסה שוב מאוחר יותר.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 left-4 z-[100] p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center",
          "bg-blue-600 hover:bg-blue-700 text-white",
          isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100 hover:scale-110"
        )}
      >
        <Bot className="w-7 h-7" />
        <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-slate-950">AI</span>
      </button>

      {/* Chat Window */}
      <div 
        className={cn(
          "fixed bottom-20 left-4 z-[100] w-[340px] max-w-[calc(100vw-32px)] h-[500px] max-h-[70vh] bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-left",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-0 opacity-0 translate-y-10 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-600/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Digon Copilot</h3>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">עוזר דיג חכם (מחובר למכ"ם)</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-start" : "justify-end")}>
              <div className={cn(
                "max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tr-sm" 
                  : "bg-blue-600 text-white rounded-tl-sm shadow-md"
              )}>
                {msg.content.split('\n').map((line, i) => (
                  <span key={i}>{line}<br/></span>
                ))}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white rounded-2xl rounded-tl-sm p-3 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>חושב...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-background">
          <div className="relative flex items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="הקלד הודעה..."
              className="pl-12 rounded-full bg-slate-50 dark:bg-slate-900 border-none h-11"
              dir="rtl"
            />
            <Button 
              size="icon"
              className="absolute left-1 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send className="w-4 h-4 rtl:-scale-x-100" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
