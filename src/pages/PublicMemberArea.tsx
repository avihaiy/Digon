import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  FileText,
  Receipt as ReceiptIcon,
  ExternalLink,
  FileDown,
  Lock,
  LogOut,
  AlertTriangle,
  Smartphone,
  Copy,
  Check,
  QrCode,
  Bell,
  MessageSquare,
  Info,
  Megaphone,
  X,
  Trash2,
  User,
  Save,
  Send,
  Building2,
  BookOpen,
  Calendar,
  Clock
} from "lucide-react";
import { formatCurrency, formatShortDate, PAYMENT_METHOD, getHebrewDate } from "@/lib/hebrew-utils";
import { HDate } from "@hebcal/core";
import { toast } from "sonner";
import html2pdf from 'html2pdf.js';

import CountUp from 'react-countup';

// תוקף סשן: 24 שעות
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
// חסימה: 5 ניסיונות, נעילה ל-15 דקות
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const authKey = (id: string) => `member_area_auth_${id}`;
const attemptsKey = (id: string) => `member_area_attempts_${id}`;
const lockoutKey = (id: string) => `member_area_lockout_${id}`;
const phoneKey = (id: string) => `member_area_phone_${id}`;

interface ChargeRow {
  id: string;
  amount: number;
  remaining_balance: number;
  description: string | null;
  charge_date: string;
}

interface PendingPaymentRow {
  id: string;
  amount: number;
  method: string;
  created_at: string;
  description?: string | null;
}

interface ReceiptRow {
  id: string;
  receipt_number: number;
  total_amount: number;
  description: string | null;
  created_at: string;
}

interface MessageRow {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  is_read: boolean;
  is_global: boolean;
}

const TEHILLIM_MONTHLY: Record<number, string> = {
  1: "1-9", 2: "10-17", 3: "18-22", 4: "23-28", 5: "29-34",
  6: "35-38", 7: "39-43", 8: "44-48", 9: "49-54", 10: "55-59",
  11: "60-65", 12: "66-68", 13: "69-71", 14: "72-76", 15: "77-78",
  16: "79-82", 17: "83-87", 18: "88-89", 19: "90-96", 20: "97-103",
  21: "104-105", 22: "106-107", 23: "108-112", 24: "113-118",
  25: "119.1-96", 26: "119.97-176", 27: "120-134", 28: "135-139",
  29: "140-144", 30: "145-150"
};

// Aurora Background Component
const AuroraBackground = () => (
  <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden opacity-30 dark:opacity-40 mix-blend-multiply dark:mix-blend-screen transition-all duration-1000">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--aurora-1,#eab308)] blur-[100px] animate-blob"></div>
    <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--aurora-2,#3b82f6)] blur-[120px] animate-blob animation-delay-2000"></div>
    <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-[var(--aurora-3,#c026d3)] blur-[150px] animate-blob animation-delay-4000"></div>
  </div>
);

function DailyTehillim() {
  const [chapters, setChapters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const hdate = useMemo(() => new HDate(), []);
  const dayOfMonth = hdate.getDate(); // 1 to 30
  const dateString = hdate.renderGematriya(true); // e.g. "י״ד באלול תשפ״ג"

  useEffect(() => {
    const fetchTehillim = async () => {
      try {
        setLoading(true);
        const range = TEHILLIM_MONTHLY[dayOfMonth === 30 ? 30 : dayOfMonth] || "1-9";
        const res = await fetch(`https://www.sefaria.org/api/texts/Psalms.${range}?context=0&he=1`);
        const data = await res.json();
        
        let verses: string[] = [];
        if (Array.isArray(data.he)) {
           if (typeof data.he[0] === 'string') {
             verses = data.he as string[];
           } else {
             verses = (data.he as string[][]).flat();
           }
        }
        setChapters(verses.filter(v => typeof v === 'string' && v.trim().length > 0));
      } catch (err) {
        console.error("Error fetching Tehillim:", err);
        setError("שגיאה בטעינת תהילים. נסה שוב מאוחר יותר.");
      } finally {
        setLoading(false);
      }
    };
    fetchTehillim();
  }, [dayOfMonth]);

  const handleFinish = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 100, 50]); // Success vibration pattern
    }
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#3b82f6', '#10b981', '#6366f1']
    });
    toast.success("אשריך! זכות קריאת התהילים תעמוד לך ולכל ישראל!", {
      duration: 5000,
      icon: "🎉"
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-6 shadow-sm border border-indigo-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10">
          <BookOpen className="w-32 h-32 -mt-4 -mr-4" />
        </div>
        <div className="relative z-10 text-center">
          <h2 className="text-2xl font-bold mb-1">תהילים יומי</h2>
          <p className="text-blue-100">{dateString}</p>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/50 dark:border-zinc-800/50 min-h-[300px]">
        {loading ? (
          <div className="space-y-4">
             <Skeleton className="h-8 w-3/4 mx-auto rounded-full bg-slate-200 dark:bg-zinc-800" />
             <Skeleton className="h-4 w-full rounded-full bg-slate-200 dark:bg-zinc-800" />
             <Skeleton className="h-4 w-5/6 mx-auto rounded-full bg-slate-200 dark:bg-zinc-800" />
             <Skeleton className="h-4 w-full rounded-full bg-slate-200 dark:bg-zinc-800" />
             <Skeleton className="h-4 w-4/6 mx-auto rounded-full bg-slate-200 dark:bg-zinc-800 mt-8" />
             <Skeleton className="h-4 w-full rounded-full bg-slate-200 dark:bg-zinc-800" />
             <Skeleton className="h-4 w-5/6 mx-auto rounded-full bg-slate-200 dark:bg-zinc-800" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            {error}
          </div>
        ) : (
          <div 
            className="text-center md:text-right text-slate-800 dark:text-slate-200" 
            style={{ 
              fontFamily: '"Frank Ruhl Libre", "David Libre", "Times New Roman", serif',
              fontSize: '1.45rem', 
              lineHeight: '2.4',
            }}
          >
             {chapters.map((verse, idx) => {
               // מרווח קל אחרי פסוק שמסתיים בסימון פרשה פתוחה/סתומה
               const isBreak = verse.includes('{פ}') || verse.includes('{ס}');
               return (
                 <span key={idx}>
                   <span dangerouslySetInnerHTML={{ __html: verse }} />
                   {isBreak ? (
                     <div className="h-6 w-full" /> // שבירת שורה משמעותית
                   ) : (
                     <span className="mx-1.5 text-slate-300 dark:text-slate-700">♦</span> // מפריד יפה בין פסוקים במקום רק רווח
                   )}
                 </span>
               );
             })}
          </div>
        )}
      </div>

      {!loading && !error && chapters.length > 0 && (
        <div className="flex justify-center mt-6 mb-4">
          <Button 
            onClick={handleFinish}
            className="rounded-full px-8 py-6 h-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-lg shadow-lg shadow-emerald-500/30 transition-transform active:scale-95"
          >
            <Check className="w-6 h-6 ml-2 stroke-[3px]" />
            סיימתי לקרוא תהילים
          </Button>
        </div>
      )}
    </div>
  );
}

export default function PublicMemberArea() {
  const { memberId } = useParams<{ memberId: string }>();
  const [memberName, setMemberName] = useState<string>("");

  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [pending, setPending] = useState<PendingPaymentRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [bitPhone, setBitPhone] = useState<string>("");
  const [bitEnabled, setBitEnabled] = useState(false);

  // Custom Theme State
  const [userTheme, setUserTheme] = useState<string>(() => {
    return localStorage.getItem(`member_theme_${memberId}`) || 'theme-auto';
  });

  // Handle theme change
  const handleThemeChange = (theme: string) => {
    setUserTheme(theme);
    localStorage.setItem(`member_theme_${memberId}`, theme);
  };

  // Theme background based on time of day (fallback for auto theme)
  const autoBgTheme = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'bg-gradient-to-b from-sky-100/50 to-slate-50 dark:from-sky-900/20 dark:to-zinc-950'; // Morning
    if (hour >= 12 && hour < 18) return 'bg-gradient-to-b from-amber-50/50 to-slate-50 dark:from-amber-900/10 dark:to-zinc-950'; // Afternoon
    return 'bg-gradient-to-b from-indigo-50/50 to-slate-50 dark:from-indigo-950/20 dark:to-zinc-950'; // Evening
  }, []);

  const themeClasses: Record<string, string> = {
    'theme-jerusalem': 'bg-amber-50/50 dark:bg-amber-950/20 theme-jerusalem',
    'theme-ocean': 'bg-blue-50/50 dark:bg-blue-950/20 theme-ocean',
    'theme-space': 'bg-slate-950 dark:bg-black theme-space'
  };

  const currentContainerClasses = userTheme === 'theme-auto' 
    ? autoBgTheme 
    : themeClasses[userTheme] || autoBgTheme;
    
  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000); // update every 10s
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const hebDateString = getHebrewDate(currentTime);
  const gregorianDateString = currentTime.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Confetti effect for Zero Debt
  useEffect(() => {
    if (!loading && totalCharges > 0 && netOwed === 0) {
      setTimeout(async () => {
        try {
          const confettiModule = await import("canvas-confetti");
          const fireConfetti = confettiModule.default || confettiModule;
          if (typeof fireConfetti === 'function') {
            fireConfetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10b981', '#3b82f6', '#fbbf24', '#f43f5e', '#8b5cf6'],
              disableForReducedMotion: true
            });
          }
        } catch (err) {
          console.error("Confetti failed to load", err);
        }
      }, 500);
    }
  }, [loading, netOwed, totalCharges]);
  const [payboxPhone, setPayboxPhone] = useState<string>("");
  const [payboxEnabled, setPayboxEnabled] = useState(false);
  const [bankAccountDetails, setBankAccountDetails] = useState<string>("");
  const [taxReceiptEnabled, setTaxReceiptEnabled] = useState(true);
  const [payboxDialogOpen, setPayboxDialogOpen] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [sendingPayment, setSendingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState<"debts" | "receipts" | "messages" | "tehillim" | "profile" | "contact">("debts");
  
  // Profile state
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [spouseName, setSpouseName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Contact State
  const [contactSubject, setContactSubject] = useState("");
  const [contactContent, setContactContent] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear() - 1);
  const [isGeneratingTax, setIsGeneratingTax] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [lastSeenGlobal, setLastSeenGlobal] = useState<string | null>(
    localStorage.getItem(`last_seen_global_${memberId}`)
  );
  const [dismissedGlobal, setDismissedGlobal] = useState<string | null>(
    localStorage.getItem(`dismissed_global_${memberId}`)
  );
  const [hiddenMessages, setHiddenMessages] = useState<string[]>(
    JSON.parse(localStorage.getItem(`hidden_messages_${memberId}`) || '[]')
  );

  const visibleMessages = messages.filter(m => !hiddenMessages.includes(m.id));

  const handleClearMessages = () => {
    const newHidden = [...new Set([...hiddenMessages, ...messages.map(m => m.id)])];
    setHiddenMessages(newHidden);
    localStorage.setItem(`hidden_messages_${memberId}`, JSON.stringify(newHidden));
    toast.success("ההודעות הוסתרו בהצלחה");
  };

  useEffect(() => {
    if (activeTab === 'messages' && memberId) {
      const globalMsgs = messages.filter(m => m.is_global);
      if (globalMsgs.length > 0) {
        const latestId = globalMsgs[0].id;
        if (latestId !== lastSeenGlobal) {
          localStorage.setItem(`last_seen_global_${memberId}`, latestId);
          setLastSeenGlobal(latestId);
        }
      }
    }
  }, [activeTab, messages, memberId, lastSeenGlobal]);

  useEffect(() => {
    if (window.matchMedia && !window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallPrompt(true);
    }
    
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // טיק לעדכון תצוגת זמן הנעילה
  useEffect(() => {
    if (!lockedUntil) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const [hasPhone, setHasPhone] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!memberId) {
        setError("חסר מזהה חבר בקישור");
        setLoading(false);
        return;
      }
      // Validate UUID format before hitting the DB
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(memberId)) {
        setError("הקישור אינו תקין (מזהה חבר לא חוקי)");
        setLoading(false);
        return;
      }
      try {
        const { data, error: mErr } = await supabase.rpc("get_public_member_profile", {
          _member_id: memberId,
        });
        if (mErr) {
          console.error("[PublicMemberArea] RPC error:", mErr);
          throw new Error("שגיאת שרת בטעינת פרטי החבר");
        }
        if (!data) {
          console.warn("[PublicMemberArea] Member not found for id:", memberId);
          throw new Error("החבר לא נמצא במערכת");
        }
        if (cancelled) return;
        const d: any = data;
        setMemberName(d.member_name);
        setHasPhone(!!d.has_phone);

        const raw = sessionStorage.getItem(authKey(memberId));
        if (raw) {
          const ts = parseInt(raw, 10);
          if (!isNaN(ts) && Date.now() - ts < SESSION_TTL_MS) {
            sessionStorage.removeItem(authKey(memberId));
          }
        }

        const lockRaw = localStorage.getItem(lockoutKey(memberId));
        if (lockRaw) {
          const until = parseInt(lockRaw, 10);
          if (!isNaN(until) && until > Date.now()) {
            setLockedUntil(until);
          } else {
            localStorage.removeItem(lockoutKey(memberId));
            localStorage.removeItem(attemptsKey(memberId));
          }
        }

        const savedPhone = localStorage.getItem(phoneKey(memberId));
        if (savedPhone && d.has_phone) {
          // Attempt auto-login
          const { data: autoData, error: autoErr } = await supabase.rpc("get_member_area_data", {
            _member_id: memberId,
            _phone: savedPhone,
            _user_agent: navigator.userAgent.slice(0, 500),
          });
          if (!autoErr && autoData && (autoData as any).success) {
            applyMemberData(autoData as any);
            setAuthed(true);
            setLockedUntil(null);
          } else {
            localStorage.removeItem(phoneKey(memberId));
          }
        }

      } catch (e: any) {
        if (!cancelled) setError(e?.message || "שגיאה בטעינה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const applyMemberData = (d: any) => {
    setCharges(
      (d.charges || []).map((row: any) => ({
        id: row.id,
        amount: Number(row.amount),
        remaining_balance: Number(row.remaining_balance),
        description: row.description,
        charge_date: row.charge_date,
      })),
    );
    setPending(
      (d.pending || []).map((row: any) => ({
        id: row.id,
        amount: Number(row.amount),
        method: row.method,
        created_at: row.created_at,
        description: row.description,
      })),
    );
    setReceipts(
      (d.receipts || []).map((row: any) => ({
        id: row.id,
        receipt_number: Number(row.receipt_number),
        total_amount: Number(row.total_amount),
        description: row.description,
        created_at: row.created_at,
      })),
    );
    setMessages(
      (d.messages || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        created_at: row.created_at,
        is_read: !!row.is_read,
        is_global: !!row.is_global,
      })),
    );
    setInquiries(d.inquiries || []);
    setBitPhone(d.bit_phone || "");
    setBitEnabled(!!d.bit_enabled);
    setPayboxPhone(d.paybox_phone || "");
    setPayboxEnabled(!!d.paybox_enabled);
      
      // Fetch bank account details directly
      supabase.from('app_settings').select('value').eq('key', 'bank_account_details').maybeSingle().then(({ data }) => {
        if (data && data.value) setBankAccountDetails(data.value);
      });
      
      setTaxReceiptEnabled(d.tax_receipt_enabled !== false); // default true
    setCreditBalance(Number(d.credit_balance || 0));
    
    // Profile
    if (d.email !== undefined) setEmail(d.email || "");
    if (d.address !== undefined) setAddress(d.address || "");
    if (d.spouse_name !== undefined) setSpouseName(d.spouse_name || "");
  };

  // Auto-refresh data every 15 seconds when authenticated
  useEffect(() => {
    if (!authed || !memberId) return;
    
    const savedPhone = localStorage.getItem(phoneKey(memberId));
    if (!savedPhone) return;

    const fetchLatest = async () => {
      try {
        const { data, error } = await supabase.rpc("get_member_area_data", {
          _member_id: memberId,
          _phone: savedPhone,
          _user_agent: navigator.userAgent.slice(0, 500),
        });
        if (!error && data && (data as any).success) {
          applyMemberData(data as any);
        }
      } catch (e) {
        // Silently fail on background refresh
      }
    };

    const intervalId = setInterval(fetchLatest, 15000);
    return () => clearInterval(intervalId);
  }, [authed, memberId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (!memberId) return;

    if (lockedUntil && lockedUntil > Date.now()) {
      return;
    }

    if (!hasPhone) {
      setPwdError("לא הוגדר מספר טלפון לחבר במערכת");
      return;
    }

    const { data, error: rpcErr } = await supabase.rpc("get_member_area_data", {
      _member_id: memberId,
      _phone: pwd,
      _user_agent: navigator.userAgent.slice(0, 500),
    });

    if (rpcErr || !data || !(data as any).success) {
      const prev = parseInt(localStorage.getItem(attemptsKey(memberId)) || "0", 10) || 0;
      const next = prev + 1;
      localStorage.setItem(attemptsKey(memberId), String(next));
      if (next >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        localStorage.setItem(lockoutKey(memberId), String(until));
        setLockedUntil(until);
        setPwdError("חרגת ממספר הניסיונות המותר. נסה שוב בעוד 15 דקות.");
      } else {
        setPwdError(`מספר הטלפון שהוזן אינו נכון. נותרו ${MAX_ATTEMPTS - next} ניסיונות.`);
      }
      return;
    }

    const d: any = data;
    applyMemberData(d);

    sessionStorage.setItem(authKey(memberId), String(Date.now()));
    localStorage.setItem(phoneKey(memberId), pwd);
    localStorage.removeItem(attemptsKey(memberId));
    localStorage.removeItem(lockoutKey(memberId));
    setAuthed(true);
    setPwd("");
    setLockedUntil(null);
  };

  const handleLogout = () => {
    if (!memberId) return;
    sessionStorage.removeItem(authKey(memberId));
    localStorage.removeItem(phoneKey(memberId));
    setAuthed(false);
    setCharges([]);
    setPending([]);
    setReceipts([]);
    toast.success("התנתקת מהאזור האישי");
  };



  const handleTabChange = (tab: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50); // Light haptic feedback
    }
    setActiveTab(tab as any);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !authed) return;
    
    const savedPhone = localStorage.getItem(phoneKey(memberId));
    if (!savedPhone) return;

    setIsSavingProfile(true);
    try {
      const { data, error } = await supabase.rpc('update_public_member_profile', {
        _member_id: memberId,
        _phone: savedPhone,
        _new_full_name: memberName,
        _new_email: email,
        _new_address: address,
        _new_spouse_name: spouseName
      });
      
      if (error || !data) throw new Error("שגיאה בשמירת הנתונים");
      
      const cachedRaw = localStorage.getItem("memberData");
      if (cachedRaw) {
        try {
          const parsed = JSON.parse(cachedRaw);
          parsed.address = address;
          parsed.spouse_name = spouseName;
          parsed.email = email;
          parsed.member_name = memberName;
          localStorage.setItem("memberData", JSON.stringify(parsed));
          // setCachedData removed - not defined
        } catch(e) {}
      }

      toast.success("הפרטים עודכנו בהצלחה!");
    } catch (err) {
      toast.error("לא הצלחנו לעדכן את הפרטים. נסה שוב מאוחר יותר.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSubject.trim() || !contactContent.trim()) {
      toast.error("אנא מלא את נושא ותוכן הפניה");
      return;
    }
    
    const savedPhone = localStorage.getItem(phoneKey(memberId!));
    if (!savedPhone) return;

    setIsSendingContact(true);
    try {
      const { data, error } = await supabase.rpc('submit_member_inquiry', {
        _member_id: memberId,
        _phone: savedPhone,
        _subject: contactSubject,
        _content: contactContent
      });
      
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error || 'Unknown error');
      
      toast.success("פנייתך נשלחה בהצלחה לגבאי");
      setContactSubject("");
      setContactContent("");
    } catch (e: any) {
      toast.error(e.message || "שגיאה בשליחת הפניה");
    } finally {
      setIsSendingContact(false);
    }
  };

  const handleGenerateTaxReceipt = async () => {
    if (!memberId || !authed) return;
    const savedPhone = localStorage.getItem(phoneKey(memberId));
    if (!savedPhone) return;

    setIsGeneratingTax(true);
    try {
      const { data, error } = await supabase.rpc('get_member_yearly_receipts', {
        _member_id: memberId,
        _phone: savedPhone,
        _year: taxYear
      });

      if (error || !data || !(data as any).success) {
        throw new Error("שגיאה בשליפת הקבלות");
      }

      const yearlyReceipts = (data as any).receipts || [];
      if (yearlyReceipts.length === 0) {
        toast.error(`לא נמצאו קבלות לשנת ${taxYear}`);
        setIsGeneratingTax(false);
        return;
      }

      const totalAmount = yearlyReceipts.reduce((sum: number, r: any) => sum + Number(r.total_amount), 0);

      // Generate HTML string for PDF
      const htmlContent = `
        <div style="font-family: 'Heebo', Arial, sans-serif; direction: rtl; padding: 20px; color: #333; max-width: 800px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ddd; padding-bottom: 20px;">
            <h1 style="margin: 0; font-size: 28px; color: #1e3a8a;">בית כנסת "ברית שלום" עכו</h1>
            <p style="margin: 5px 0; font-size: 16px;">רחוב קדושי קהיר 18, עכו</p>
            <p style="margin: 5px 0; font-size: 14px; font-weight: bold; background-color: #f0f9ff; display: inline-block; padding: 5px 15px; border-radius: 5px; color: #0369a1;">
              מוסד ציבורי מוכר לעניין תרומות לפי סעיף 46 לפקודת מס הכנסה
            </p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h2 style="text-align: center; font-size: 22px; margin-bottom: 20px; text-decoration: underline;">ריכוז תרומות לשנת המס ${taxYear}</h2>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="margin: 5px 0; font-size: 16px;"><strong>שם התורם:</strong> ${memberName}</p>
              ${address ? `<p style="margin: 5px 0; font-size: 16px;"><strong>כתובת:</strong> ${address}</p>` : ''}
              <p style="margin: 5px 0; font-size: 16px;"><strong>טלפון:</strong> <span dir="ltr">${savedPhone}</span></p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
            <thead>
              <tr style="background-color: #e5e7eb;">
                <th style="padding: 12px; border: 1px solid #ccc; text-align: right;">מס' קבלה</th>
                <th style="padding: 12px; border: 1px solid #ccc; text-align: right;">תאריך</th>
                <th style="padding: 12px; border: 1px solid #ccc; text-align: right;">תיאור</th>
                <th style="padding: 12px; border: 1px solid #ccc; text-align: left;">סכום</th>
              </tr>
            </thead>
            <tbody>
              ${yearlyReceipts.map((r: any) => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;">${r.receipt_number}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${formatShortDate(r.created_at)}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${r.description || 'תרומה'}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">${formatCurrency(Number(r.total_amount))}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background-color: #f3f4f6; font-weight: bold; font-size: 16px;">
                <td colspan="3" style="padding: 15px; border: 1px solid #ccc; text-align: right;">סך הכל תרומות בשנת ${taxYear}:</td>
                <td style="padding: 15px; border: 1px solid #ccc; text-align: left; color: #15803d;">${formatCurrency(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 50px; text-align: left;">
            <div style="border-top: 1px solid #000; width: 200px; padding-top: 10px; margin-right: auto; text-align: center;">
              <p style="margin: 0;">חתימה / חותמת מורשה חתימה</p>
              <p style="margin: 0; font-size: 12px; color: #666;">הופק אוטומטית מאתר בית הכנסת ברית שלום</p>
            </div>
          </div>
        </div>
      `;

      const el = document.createElement('div');
      el.innerHTML = htmlContent;
      document.body.appendChild(el);

      const generatePdf = (html2pdf as any).default || html2pdf;
      const worker = generatePdf().set({
        margin: 10,
        filename: `אישור_מס_${taxYear}_${memberName.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      }).from(el);

      await worker.save();
      
      document.body.removeChild(el);
      toast.success("אישור המס הופק בהצלחה!");
      
    } catch (err: any) {
      console.error(err);
      toast.error(`שגיאה בהפקת אישור מס: ${err?.message || "שגיאה לא ידועה"}`);
    } finally {
      setIsGeneratingTax(false);
    }
  };

  const totalCharges = useMemo(() => charges.reduce((s, c) => s + c.remaining_balance, 0), [charges]);
  const totalPending = useMemo(() => pending.reduce((s, p) => s + p.amount, 0), [pending]);
  const netOwed = useMemo(() => Math.max(0, totalCharges - totalPending), [totalCharges, totalPending]);
  const pendingCredit = useMemo(() => Math.max(0, totalPending - totalCharges), [totalCharges, totalPending]);
  const totalOwed = netOwed;

  const totalReceipts = useMemo(() => receipts.reduce((s, r) => s + r.total_amount, 0), [receipts]);

  useEffect(() => {
    document.title = memberName ? `אזור אישי — ${memberName} • ברית שלום עכו` : "אזור אישי • ברית שלום עכו";
  }, [memberName]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    const fullUrl = typeof window !== "undefined" ? window.location.href : "";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center" dir="rtl">
        <AlertTriangle className="w-10 h-10 text-destructive mb-3" />
        <h1 className="text-2xl font-bold text-foreground mb-2">לא ניתן לטעון את האזור האישי</h1>
        <p className="text-muted-foreground mb-1">{error}</p>
        <p className="text-xs text-muted-foreground mt-4 max-w-md">
          ייתכן שהקישור שגוי, שכרטיס החבר נמחק, או שהקישור לא הועתק במלואו.<br />
          אנא פנה לגזבר בית הכנסת לקבלת קישור חדש.
        </p>
        {memberId && (
          <div className="mt-4 text-[11px] text-muted-foreground/80 font-mono break-all max-w-md space-y-1">
            <div>מזהה בקישור: {memberId}</div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(fullUrl || memberId);
                  toast.success("הקישור הועתק");
                } catch {
                  toast.error("שגיאה בהעתקה");
                }
              }}
            >
              <Copy className="w-3 h-3" /> העתק קישור לשליחה לגזבר
            </Button>
          </div>
        )}
      </div>
    );
  }



  if (!authed) {
    const noPhone = !hasPhone;
    const isLocked = !!(lockedUntil && lockedUntil > now);
    const remainingSec = isLocked ? Math.ceil(((lockedUntil as number) - now) / 1000) : 0;
    const remainingMin = Math.floor(remainingSec / 60);
    const remainingSecPart = remainingSec % 60;

    return (
      <div className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 pt-[max(1rem,env(safe-area-inset-top))]" dir="rtl">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] p-8 shadow-xl border border-slate-100 dark:border-zinc-800 space-y-6 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          
          <div className="text-center space-y-2 relative z-10">
            <div className="mx-auto w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4 shadow-sm border border-indigo-100 dark:border-indigo-800">
              <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">אזור אישי</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">שלום {memberName}</p>
            {!noPhone && !isLocked && <p className="text-xs text-slate-400 dark:text-slate-500 pt-1">להתחברות, הזן את מספר הטלפון שלך</p>}
          </div>

          <div className="relative z-10">
            {noPhone ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/30 dark:border-amber-900/50 p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <div className="font-bold text-amber-900 dark:text-amber-200 text-sm">לא ניתן להתחבר</div>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                      לא הוגדר מספר טלפון בכרטיס שלך במערכת. כדי להפעיל את האזור האישי, יש לפנות לגזבר בית הכנסת ולבקש
                      לעדכן את מספר הטלפון.
                    </p>
                  </div>
                </div>
              </div>
            ) : isLocked ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/50 dark:bg-red-950/30 dark:border-red-900/50 p-4 text-center space-y-2">
                <div className="font-bold text-red-600 dark:text-red-400 text-sm">הכניסה נחסמה זמנית</div>
                <p className="text-xs text-red-600/80 dark:text-red-400/80">
                  בשל ניסיונות כניסה רבים מדי. נסה שוב בעוד{" "}
                  <span className="font-bold tabular-nums bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-md ml-1 inline-block">
                    {remainingMin}:{String(remainingSecPart).padStart(2, "0")}
                  </span>
                </p>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone-pwd" className="text-xs font-semibold text-slate-500 mr-1">מספר טלפון</Label>
                  <Input
                    id="phone-pwd"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="050-1234567"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    dir="ltr"
                    className="h-12 text-center text-lg tracking-wider rounded-xl bg-slate-50/50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                  {pwdError && <p className="text-xs text-red-500 text-center font-medium">{pwdError}</p>}
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]">
                  כניסה לחשבון
                </Button>
              </form>
            )}
          </div>
        </div>
        
        <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-slate-400 dark:text-slate-500">
          <div>© {new Date().getFullYear()} כל הזכויות שמורות לברית שלום</div>
          <div className="mt-1">פותח ע״י אביחי יוסיפוביץ</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 ${currentContainerClasses} transition-colors duration-1000`} dir="rtl">
      <AuroraBackground />
      
      {/* HEADER */}
      <header className={`sticky top-0 z-10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl border-b border-slate-200/50 dark:border-zinc-800/50 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center justify-between shadow-sm transition-colors duration-500`}>
        <div className="flex flex-col gap-0.5">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap mb-0.5">
            <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" /> {hebDateString}</span>
            <span className="opacity-50">•</span>
            <span>{gregorianDateString}</span>
            <span className="opacity-50">•</span>
            <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {timeString}</span>
          </div>
          <h1 className="text-lg font-bold text-foreground leading-tight">
            שלום {memberName ? memberName.split(' ')[0] : ''} 👋
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          title="התנתק"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        {/* INSTALL PROMPT */}
        {showInstallPrompt && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-start gap-3 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
            <div className="flex-1 space-y-2">
              <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">שמור כאפליקציה במסך הבית</h4>
              
              <p className="text-xs text-blue-800/80 dark:text-blue-200/80 leading-relaxed">
                {deferredPrompt 
                  ? "הוסף את האזור האישי למסך הבית שלך לגישה מהירה ונוחה!" 
                  : "באפשרותך להוסיף את האזור האישי למסך הבית כאפליקציה נפרדת."}
              </p>

              {!deferredPrompt && showInstructions && (
                <div className="bg-white/60 dark:bg-black/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 text-[11px] text-blue-900 dark:text-blue-100 mt-2 space-y-2">
                  <p><strong>באייפון (Safari):</strong><br/>יש ללחוץ על כפתור השיתוף (הריבוע עם החץ כלפי מעלה) בתחתית המסך, ואז לבחור באפשרות <strong>"הוסף למסך הבית"</strong>.</p>
                  <p><strong>באנדרואיד (Chrome):</strong><br/>יש ללחוץ על 3 הנקודות בתפריט העליון, ואז לבחור באפשרות <strong>"הוסף למסך הבית"</strong>.</p>
                </div>
              )}

              <Button 
                size="sm" 
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                onClick={async () => {
                  if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                      setDeferredPrompt(null);
                      setShowInstallPrompt(false);
                    }
                  } else {
                    setShowInstructions(!showInstructions);
                  }
                }}
              >
                {deferredPrompt ? "התקן אפליקציה" : (showInstructions ? "הסתר הנחיות" : "איך מתקינים כ-App?")}
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-400 shrink-0 -mt-1 -ml-1" onClick={() => setShowInstallPrompt(false)}>
              <LogOut className="w-4 h-4 rotate-45" />
            </Button>
          </div>
        )}

        {/* GLOBAL MESSAGES */}
        {(() => {
          const globalMsg = messages.find(m => m.is_global);
          if (!globalMsg || activeTab === 'messages' || globalMsg.id === dismissedGlobal || globalMsg.id === lastSeenGlobal) return null;

          return (
            <div className="bg-gradient-to-r from-rose-500 to-red-500 rounded-3xl p-5 flex items-start gap-4 shadow-lg shadow-red-500/20 text-white animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-3 top-3 h-7 w-7 text-white/70 hover:text-white hover:bg-white/20 rounded-full z-10"
                onClick={() => {
                  localStorage.setItem(`dismissed_global_${memberId}`, globalMsg.id);
                  setDismissedGlobal(globalMsg.id);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
              <div className="mt-1 bg-white/20 p-2.5 rounded-full shrink-0 relative">
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-white rounded-full"></span>
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg mb-1.5 flex items-center gap-2">
                  הודעה חשובה מהגבאי
                </h4>
                <p className="text-sm text-red-50 leading-relaxed font-medium pl-6">
                  {globalMsg.content}
                </p>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="mt-3.5 bg-white text-red-600 hover:bg-red-50 shadow-sm font-bold w-auto h-8 px-4 text-xs rounded-full"
                  onClick={() => setActiveTab('messages')}
                >
                  קרא עוד
                </Button>
              </div>
            </div>
          );
        })()}

        {/* BALANCE CARD */}
        <div className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-xl transition-all ${netOwed > 0 ? 'bg-gradient-to-br from-indigo-500 to-blue-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-2">
            <span className="text-white/80 text-sm font-medium">
              {netOwed > 0 ? 'יתרת חוב כוללת' : (creditBalance > 0 ? 'יתרת זכות' : 'כל החובות שולמו, תודה רבה!')}
            </span>
            <motion.div 
              className="text-5xl font-extrabold tracking-tight drop-shadow-md"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              dir="ltr"
            >
              <CountUp 
                end={netOwed > 0 ? netOwed : creditBalance} 
                duration={2.5} 
                separator="," 
                prefix="₪" 
              />
            </motion.div>
            {totalPending > 0 && netOwed > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm mt-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                ממתין לאישור תשלום: {formatCurrency(totalPending)}
              </span>
            )}
            {pendingCredit > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm mt-2">
                <Check className="w-3 h-3" />
                זכות צפויה לאחר אישור: {formatCurrency(pendingCredit)}
              </span>
            )}
            {creditBalance > 0 && netOwed > 0 && (
              <span className="text-xs text-white/70 mt-1">
                (כולל קיזוז זכות של {formatCurrency(creditBalance)})
              </span>
            )}
          </div>
        </div>

        {/* PAYMENT BUTTONS */}
        {bankAccountDetails && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">העברה בנקאית (בנק בית הכנסת)</h3>
                <p className="text-xs text-muted-foreground">העתיקו את הפרטים להעברה</p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl text-sm font-medium whitespace-pre-wrap font-mono relative group">
              {bankAccountDetails}
              <Button 
                variant="secondary" 
                size="sm" 
                className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  navigator.clipboard.writeText(bankAccountDetails);
                  toast.success("פרטי הבנק הועתקו בהצלחה!");
                }}
              >
                <Copy className="w-4 h-4 ml-1.5" />
                העתק
              </Button>
            </div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              לאחר ביצוע ההעברה, נא לשלוח צילום מסך או אסמכתא לגבאי לאישור התשלום.
            </p>
          </div>
        )}

        {/* PAYMENT BUTTONS */}
        {netOwed > 0 && (bitEnabled || payboxEnabled) && (
          <div className="grid grid-cols-2 gap-3">
            {bitEnabled && bitPhone && (
              <Button 
                onClick={() => {
                  let cleanPhone = (bitPhone || "").replace(/\D/g, "");
                  if (cleanPhone.startsWith("972")) cleanPhone = "0" + cleanPhone.slice(3);
                  if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone;
                  if (!cleanPhone || cleanPhone.length < 9) {
                    toast.error("מספר טלפון של ביט אינו תקין");
                    return;
                  }
                  
                  // Record intent
                  setSendingPayment(true);
                  Promise.resolve(supabase.rpc("record_bit_payment_intent", {
                    _member_id: memberId!,
                    _amount: netOwed,
                    _user_agent: navigator.userAgent.slice(0, 500),
                  })).finally(() => {
                    setSendingPayment(false);
                    const amount = Math.round(netOwed * 100) / 100;
                    window.location.href = `https://bitpay.co.il/pay?phone=${cleanPhone}&amount=${amount}`;
                  });
                }}
                disabled={sendingPayment}
                className="h-14 rounded-2xl bg-[#0066ff] hover:bg-[#0055dd] text-white shadow-lg shadow-blue-500/25 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
              >
                {sendingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                <span className="font-bold text-sm">תשלום ב-Bit</span>
              </Button>
            )}

            {payboxEnabled && payboxPhone && (
              <Button 
                onClick={() => {
                  let cleanPhone = (payboxPhone || "").replace(/\D/g, "");
                  if (cleanPhone.startsWith("972")) cleanPhone = "0" + cleanPhone.slice(3);
                  if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone;
                  const amount = Math.round(netOwed * 100) / 100;
                  const payboxUrl = `https://link.payboxapp.com/business?phone=${cleanPhone}&amount=${amount}`;
                  window.location.href = `https://payboxapp.page.link/?link=${encodeURIComponent(payboxUrl)}`;
                }}
                className="h-14 rounded-2xl bg-[#00c47a] hover:bg-[#00a86b] text-white shadow-lg shadow-emerald-500/25 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
              >
                <Smartphone className="w-5 h-5" />
                <span className="font-bold text-sm">תשלום ב-PayBox</span>
              </Button>
            )}
          </div>
        )}

        {/* TAB VIEWS */}
        <div className="pb-8 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full"
            >
              {activeTab === 'debts' && (
                <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-lg">פירוט חובות פתוחים</h3>
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs font-medium text-blue-600 dark:text-blue-400">
                  <Link to={`/d/${memberId}`}>
                    <FileDown className="w-3.5 h-3.5 ml-1.5" />
                    הורד PDF
                  </Link>
                </Button>
              </div>
              
              {charges.length === 0 && pending.length === 0 ? (
                <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl p-10 text-center border border-slate-200/50 dark:border-zinc-800/50 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/30 to-teal-100/30 dark:from-emerald-900/10 dark:to-teal-900/10" />
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10"
                  >
                    <div className="w-20 h-20 bg-gradient-to-tr from-emerald-400 to-teal-400 text-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/30">
                      <Check className="w-10 h-10 stroke-[2.5px]" />
                    </div>
                    <h4 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-2">אין חובות פתוחים</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">החשבון שלך נקי, תודה רבה!</p>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-4">
                  {charges.map((c, idx) => (
                    <motion.div 
                      key={c.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-3xl p-4 flex items-center justify-between border border-slate-200/50 dark:border-zinc-800/50 shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm line-clamp-1">{c.description || "חיוב"}</div>
                          <div className="text-xs text-muted-foreground">{formatShortDate(c.charge_date)}</div>
                        </div>
                      </div>
                      <div className="font-bold text-red-600 dark:text-red-400 shrink-0 mr-3">
                        {formatCurrency(c.remaining_balance)}
                      </div>
                    </motion.div>
                  ))}
                  {pending.map((p, idx) => (
                    <motion.div 
                      key={p.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (charges.length + idx) * 0.1 }}
                      className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md rounded-3xl p-4 flex items-center justify-between border border-slate-200/50 dark:border-zinc-800/50 shadow-md opacity-80 grayscale"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shrink-0">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm line-clamp-1">{p.description || PAYMENT_METHOD[p.method as keyof typeof PAYMENT_METHOD] || p.method}</div>
                          <div className="text-xs text-amber-600/80 dark:text-amber-500/80">ממתין לאישור • {formatShortDate(p.created_at)}</div>
                        </div>
                      </div>
                      <div className="font-bold text-amber-600 shrink-0 mr-3">
                        {formatCurrency(p.amount)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'receipts' && (
            <div className="space-y-4">
              {/* Tax Receipt Section */}
              {taxReceiptEnabled && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-900/20 rounded-3xl p-5 border border-indigo-100 dark:border-indigo-900 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <FileDown className="w-24 h-24" />
                  </div>
                  <div className="relative z-10 space-y-3">
                    <div>
                      <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        אישור מס (סעיף 46) מרוכז
                      </h3>
                      <p className="text-sm text-indigo-700/80 dark:text-indigo-300/80">
                        הורדת ריכוז קבלות לצורך החזר מס.
                      </p>
                    </div>
                    
                    <div className="flex gap-2 items-center">
                      <select
                        value={taxYear}
                        onChange={(e) => setTaxYear(Number(e.target.value))}
                        className="h-10 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white/80 dark:bg-zinc-900/80 px-3 text-sm focus:ring-2 focus:ring-indigo-500 font-medium w-28"
                      >
                        {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <Button 
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm gap-2"
                        onClick={handleGenerateTaxReceipt}
                        disabled={isGeneratingTax}
                      >
                        {isGeneratingTax ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                        הפק PDF
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <h3 className="font-bold text-lg px-1 mt-6">הקבלות שלי</h3>
              
              {receipts.length === 0 ? (
                <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl p-10 text-center border border-slate-200/50 dark:border-zinc-800/50 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 to-indigo-100/30 dark:from-blue-900/10 dark:to-indigo-900/10" />
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10"
                  >
                    <div className="w-20 h-20 bg-gradient-to-tr from-blue-400 to-indigo-400 text-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/30">
                      <ReceiptIcon className="w-10 h-10 stroke-[2.5px]" />
                    </div>
                    <h4 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-2">אין קבלות עדיין</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">הקבלות שלך יופיעו כאן לאחר תשלום.</p>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-4 pb-20">
                  {receipts.map((r, idx) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Link 
                        to={`/r/${r.receipt_number}`} 
                        className="block bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-3xl p-4 border border-slate-200/50 dark:border-zinc-800/50 shadow-md hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors"
                      >
                      <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0">
                          <ReceiptIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">קבלה #{r.receipt_number}</div>
                          <div className="text-xs text-muted-foreground">{r.description || "תרומה"} • {formatShortDate(r.created_at)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold">{formatCurrency(r.total_amount)}</div>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </Link>
                  </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-lg">הודעות מהגבאי</h3>
                {visibleMessages.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={handleClearMessages}
                  >
                    <Trash2 className="w-3.5 h-3.5 ml-1.5" />
                    נקה הודעות
                  </Button>
                )}
              </div>
              
              {visibleMessages.length === 0 ? (
                <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl p-10 text-center border border-slate-200/50 dark:border-zinc-800/50 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-100/30 to-orange-100/30 dark:from-amber-900/10 dark:to-orange-900/10" />
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10"
                  >
                    <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-orange-400 text-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/30">
                      <MessageSquare className="w-10 h-10 stroke-[2.5px]" />
                    </div>
                    <h4 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-2">אין הודעות חדשות</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">תקבל כאן עדכונים חשובים מהגבאי.</p>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleMessages.map(m => {
                    const isGlobal = m.is_global;
                    const isUnread = !isGlobal && !m.is_read;
                    
                    // Mark as read immediately when viewed if it's personal and unread
                    if (isUnread) {
                      supabase.rpc('mark_message_read', { _message_id: m.id }).then(() => {
                        setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, is_read: true } : msg));
                      });
                    }

                    return (
                      <div key={m.id} className={`bg-white dark:bg-zinc-900 rounded-2xl p-4 border shadow-sm ${isUnread ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-zinc-800'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isGlobal ? 'bg-blue-50 text-blue-500' : 'bg-indigo-50 text-indigo-500'} dark:bg-opacity-10`}>
                            {isGlobal ? <Info className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start">
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isGlobal ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'}`}>
                                {isGlobal ? 'כללי' : 'אישי'}
                              </span>
                              <span className="text-xs text-muted-foreground">{formatShortDate(m.created_at)}</span>
                            </div>
                            {m.title && <h4 className="font-bold text-sm leading-tight">{m.title}</h4>}
                            <p className="text-sm text-foreground/90 whitespace-pre-wrap pt-1">{m.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg px-1">הפרופיל שלי</h3>
              <form onSubmit={handleSaveProfile} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="space-y-2">
                  <Label>שם מלא</Label>
                  <Input 
                    value={memberName} 
                    onChange={e => setMemberName(e.target.value)} 
                    placeholder="שם מלא"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>שם בן/בת זוג</Label>
                  <Input 
                    value={spouseName} 
                    onChange={e => setSpouseName(e.target.value)} 
                    placeholder="למשל: רחל"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>כתובת מלאה</Label>
                  <Input 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    placeholder="למשל: הרצל 10, עכו"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>אימייל</Label>
                  <Input 
                    type="email"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="example@gmail.com"
                    className="h-12 rounded-xl text-left"
                    dir="ltr"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isSavingProfile}
                  className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20 mt-2"
                >
                  {isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 ml-2" />}
                  שמור שינויים
                </Button>
              </form>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm mt-4">
              <h4 className="font-bold text-md mb-4 flex items-center gap-2">
                <span className="text-xl">✨</span> עיצוב האפליקציה (Theme)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleThemeChange('theme-auto')}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${userTheme === 'theme-auto' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-zinc-800 hover:border-slate-200'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-400"></div>
                  <span className="text-xs font-semibold">אוטומטי (לפי שעה)</span>
                </button>
                
                <button 
                  onClick={() => handleThemeChange('theme-jerusalem')}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${userTheme === 'theme-jerusalem' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-slate-100 dark:border-zinc-800 hover:border-slate-200'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-amber-500"></div>
                  <span className="text-xs font-semibold">ירושלים של זהב</span>
                </button>
                
                <button 
                  onClick={() => handleThemeChange('theme-ocean')}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${userTheme === 'theme-ocean' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-zinc-800 hover:border-slate-200'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-300 to-blue-600"></div>
                  <span className="text-xs font-semibold">אוקיינוס כחול</span>
                </button>
                
                <button 
                  onClick={() => handleThemeChange('theme-space')}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${userTheme === 'theme-space' ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/20' : 'border-slate-100 dark:border-zinc-800 hover:border-slate-200'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600"></div>
                  <span className="text-xs font-semibold">חלל עמוק (כהה)</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'tehillim' && (
            <DailyTehillim />
          )}

          {activeTab === 'contact' && (
            <div className="space-y-4">
                      <h3 className="font-bold text-lg px-1">פנייה לגבאי</h3>
                      <form onSubmit={handleContactSubmit} className="space-y-4 bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-zinc-800">
                        <div className="space-y-2">
                          <Label>נושא הפניה</Label>
                          <select 
                            value={contactSubject}
                            onChange={(e) => setContactSubject(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">בחר נושא...</option>
                            <option value="בירור חיוב / יתרת חוב">בירור חיוב / יתרת חוב</option>
                            <option value="שאלה לגבי קבלה / אישור מס">שאלה לגבי קבלה / אישור מס</option>
                            <option value="עדכון פרטים אישיים">עדכון פרטים אישיים</option>
                            <option value="שאלה או בקשה כללית">שאלה או בקשה כללית</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>פירוט הפניה</Label>
                          <textarea
                            value={contactContent}
                            onChange={(e) => setContactContent(e.target.value)}
                            placeholder="כתוב כאן את הודעתך לגבאי..."
                            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                          />
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full h-12 rounded-xl text-md font-medium"
                          disabled={isSendingContact}
                        >
                          {isSendingContact ? (
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                          ) : (
                            <>
                              <Send className="w-5 h-5 ml-2" />
                              שלח פניה לגבאי
                            </>
                          )}
                        </Button>
                      </form>

                      {inquiries && inquiries.length > 0 && (
                        <div className="mt-8">
                          <h4 className="font-bold text-lg px-1 mb-4">היסטוריית פניות</h4>
                          <div className="space-y-4">
                            {inquiries.map((inq: any) => (
                              <div key={inq.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="font-bold text-sm">{inq.subject}</h5>
                                  <span className="text-[10px] text-muted-foreground">{formatShortDate(inq.created_at)}</span>
                                </div>
                                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{inq.content}</p>
                                
                                {inq.reply && (
                                  <div className="mt-3 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                    <div className="flex items-center gap-1.5 mb-1.5 text-indigo-700 dark:text-indigo-400">
                                      <MessageSquare className="w-4 h-4" />
                                      <span className="font-bold text-xs">תשובת הגבאי</span>
                                    </div>
                                    <p className="text-sm text-indigo-900 dark:text-indigo-200 whitespace-pre-wrap">{inq.reply}</p>
                                    {inq.replied_at && (
                                      <div className="text-[10px] text-indigo-500/70 mt-1.5 flex justify-end">
                                        {formatShortDate(inq.replied_at)}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {!inq.reply && inq.status === 'new' && (
                                  <div className="mt-3 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md w-fit">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>ממתין למענה</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
            </motion.div>
          </AnimatePresence>
        </div>
        
        <div className="text-center mt-12 mb-4 text-xs text-slate-400 dark:text-slate-500">
          <div>© {new Date().getFullYear()} כל הזכויות שמורות לברית שלום</div>
          <div className="mt-1">פותח ע״י אביחי יוסיפוביץ</div>
        </div>
      </main>

      {/* BOTTOM NAVIGATION (Sticky) */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border-t border-slate-200/50 dark:border-zinc-800/50 px-6 py-2 pb-safe z-50">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <motion.button 
            whileTap={{ scale: 0.85 }}
            onClick={() => handleTabChange('debts')} 
            className={`flex flex-col items-center justify-center p-2 transition-all ${activeTab === 'debts' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <div className={`${activeTab === 'debts' ? 'bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-xl mb-1' : 'p-1.5 mb-1'}`}>
              <FileText className={`w-6 h-6 ${activeTab === 'debts' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            </div>
            <span className="text-[11px] font-semibold">חובות</span>
          </motion.button>
          
          <motion.button 
            whileTap={{ scale: 0.85 }}
            onClick={() => handleTabChange('receipts')} 
            className={`flex flex-col items-center justify-center p-2 transition-all ${activeTab === 'receipts' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <div className={`${activeTab === 'receipts' ? 'bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-xl mb-1' : 'p-1.5 mb-1'}`}>
              <ReceiptIcon className={`w-6 h-6 ${activeTab === 'receipts' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            </div>
            <span className="text-[11px] font-semibold">קבלות</span>
          </motion.button>

          <motion.button 
            whileTap={{ scale: 0.85 }}
            onClick={() => handleTabChange('messages')} 
            className={`flex flex-col items-center justify-center p-2 transition-all relative ${activeTab === 'messages' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <div className={`${activeTab === 'messages' ? 'bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-xl mb-1' : 'p-1.5 mb-1'} relative`}>
              <Bell className={`w-6 h-6 ${activeTab === 'messages' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              {(visibleMessages.some(m => !m.is_global && !m.is_read) || (visibleMessages.some(m => m.is_global) && visibleMessages.find(m => m.is_global)?.id !== lastSeenGlobal)) && (
                <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse"></span>
              )}
            </div>
            <span className="text-[11px] font-semibold">הודעות</span>
          </motion.button>
          
          <motion.button 
            whileTap={{ scale: 0.85 }}
            onClick={() => handleTabChange('tehillim')} 
            className={`flex flex-col items-center justify-center p-2 transition-all ${activeTab === 'tehillim' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <div className={`${activeTab === 'tehillim' ? 'bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-xl mb-1' : 'p-1.5 mb-1'}`}>
              <BookOpen className={`w-6 h-6 ${activeTab === 'tehillim' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            </div>
            <span className="text-[11px] font-semibold">תהילים יומי</span>
          </motion.button>

          <motion.button 
            whileTap={{ scale: 0.85 }}
            onClick={() => handleTabChange('profile')} 
            className={`flex flex-col items-center justify-center p-2 transition-all ${activeTab === 'profile' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <div className={`${activeTab === 'profile' ? 'bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-xl mb-1' : 'p-1.5 mb-1'}`}>
              <User className={`w-6 h-6 ${activeTab === 'profile' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            </div>
            <span className="text-[11px] font-semibold">פרופיל</span>
          </motion.button>

          <motion.button 
            whileTap={{ scale: 0.85 }}
            onClick={() => handleTabChange('contact')} 
            className={`flex flex-col items-center justify-center p-2 transition-all ${activeTab === 'contact' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <div className={`${activeTab === 'contact' ? 'bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-xl mb-1' : 'p-1.5 mb-1'}`}>
              <MessageSquare className={`w-6 h-6 ${activeTab === 'contact' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            </div>
            <span className="text-[11px] font-semibold">פניות</span>
          </motion.button>
        </div>
      </nav>
      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
      `}</style>
    </div>
  );
}
