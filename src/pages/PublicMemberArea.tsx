import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  Info
} from "lucide-react";
import { formatCurrency, formatShortDate, PAYMENT_METHOD } from "@/lib/hebrew-utils";
import { toast } from "sonner";

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

export default function PublicMemberArea() {
  const { memberId } = useParams<{ memberId: string }>();
  const [memberName, setMemberName] = useState<string>("");

  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [pending, setPending] = useState<PendingPaymentRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [bitPhone, setBitPhone] = useState<string>("");
  const [bitEnabled, setBitEnabled] = useState(false);
  const [payboxPhone, setPayboxPhone] = useState<string>("");
  const [payboxEnabled, setPayboxEnabled] = useState(false);
  const [payboxDialogOpen, setPayboxDialogOpen] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [sendingPayment, setSendingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState<"debts" | "receipts" | "messages">("debts");
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);

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
    setBitPhone(d.bit_phone || "");
    setBitEnabled(!!d.bit_enabled);
    setPayboxPhone(d.paybox_phone || "");
    setPayboxEnabled(!!d.paybox_enabled);
    setCreditBalance(Number(d.credit_balance || 0));
  };

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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-20" dir="rtl">
      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center justify-between shadow-sm">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">אזור אישי</span>
          <h1 className="text-lg font-bold text-foreground">שלום {memberName}</h1>
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
        {messages.filter(m => m.is_global).length > 0 && activeTab !== 'messages' && (
          <div className="bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="mt-0.5">
              <Megaphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-indigo-900 dark:text-indigo-100 text-sm mb-1">הודעה מהגבאי</h4>
              <p className="text-xs text-indigo-800/90 dark:text-indigo-200/90 line-clamp-2">
                {messages.find(m => m.is_global)?.content}
              </p>
              <Button 
                variant="link" 
                className="h-auto p-0 text-[11px] text-indigo-600 dark:text-indigo-400 mt-1"
                onClick={() => setActiveTab('messages')}
              >
                קרא הכל
              </Button>
            </div>
          </div>
        )}

        {/* BALANCE CARD */}
        <div className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-xl transition-all ${netOwed > 0 ? 'bg-gradient-to-br from-indigo-500 to-blue-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-2">
            <span className="text-white/80 text-sm font-medium">
              {netOwed > 0 ? 'יתרת חוב כוללת' : 'יתרת זכות'}
            </span>
            <div className="text-5xl font-extrabold tracking-tight">
              {formatCurrency(netOwed > 0 ? netOwed : creditBalance)}
            </div>
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
                  supabase.rpc("record_bit_payment_intent", {
                    _member_id: memberId!,
                    _amount: netOwed,
                    _user_agent: navigator.userAgent.slice(0, 500),
                  }).finally(() => {
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
        <div className="pb-8">
          {activeTab === 'debts' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 text-center border border-slate-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-lg mb-1">אין חובות פתוחים</h4>
                  <p className="text-sm text-muted-foreground">תודה רבה!</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-zinc-800 shadow-sm divide-y divide-slate-100 dark:divide-zinc-800">
                  {charges.map(c => (
                    <div key={c.id} className="p-4 flex items-center justify-between">
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
                    </div>
                  ))}
                  {pending.map(p => (
                    <div key={p.id} className="p-4 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/10">
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'receipts' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="font-bold text-lg px-1">הקבלות שלי</h3>
              
              {receipts.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 text-center border border-slate-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ReceiptIcon className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-lg mb-1">אין קבלות עדיין</h4>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-zinc-800 shadow-sm divide-y divide-slate-100 dark:divide-zinc-800">
                  {receipts.map(r => (
                    <Link key={r.id} to={`/r/${r.receipt_number}`} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
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
                        <ExternalLink className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="font-bold text-lg px-1">הודעות מהגבאי</h3>
              
              {messages.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 text-center border border-slate-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-lg mb-1">אין הודעות חדשות</h4>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map(m => {
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
        </div>
        
        <div className="text-center mt-12 mb-4 text-xs text-slate-400 dark:text-slate-500">
          <div>© {new Date().getFullYear()} כל הזכויות שמורות לברית שלום</div>
          <div className="mt-1">פותח ע״י אביחי יוסיפוביץ</div>
        </div>
      </main>

      {/* BOTTOM NAVIGATION (Sticky) */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-zinc-800 px-6 py-2 pb-safe z-50">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button 
            onClick={() => setActiveTab('debts')} 
            className={`flex flex-col items-center justify-center p-2 transition-all ${activeTab === 'debts' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <div className={`${activeTab === 'debts' ? 'bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-xl mb-1' : 'p-1.5 mb-1'}`}>
              <FileText className={`w-6 h-6 ${activeTab === 'debts' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            </div>
            <span className="text-[11px] font-semibold">חובות</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('receipts')} 
            className={`flex flex-col items-center justify-center p-2 transition-all ${activeTab === 'receipts' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <div className={`${activeTab === 'receipts' ? 'bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-xl mb-1' : 'p-1.5 mb-1'}`}>
              <ReceiptIcon className={`w-6 h-6 ${activeTab === 'receipts' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            </div>
            <span className="text-[11px] font-semibold">קבלות</span>
          </button>

          <button 
            onClick={() => setActiveTab('messages')} 
            className={`flex flex-col items-center justify-center p-2 transition-all relative ${activeTab === 'messages' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <div className={`${activeTab === 'messages' ? 'bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-xl mb-1' : 'p-1.5 mb-1'} relative`}>
              <Bell className={`w-6 h-6 ${activeTab === 'messages' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              {messages.some(m => !m.is_global && !m.is_read) && (
                <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse"></span>
              )}
            </div>
            <span className="text-[11px] font-semibold">הודעות</span>
          </button>
        </div>
      </nav>
      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
      `}</style>
    </div>
  );
}
