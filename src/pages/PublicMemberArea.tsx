import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, FileText, Receipt as ReceiptIcon, ExternalLink, FileDown, Lock, LogOut, AlertTriangle, Smartphone, Copy, Check } from "lucide-react";
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

// Note: login attempts are logged server-side by get_member_area_data RPC.

export default function PublicMemberArea() {
  const { memberId } = useParams<{ memberId: string }>();
  const [memberName, setMemberName] = useState<string>("");
  
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [pending, setPending] = useState<PendingPaymentRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [bitPhone, setBitPhone] = useState<string>("");
  const [bitEnabled, setBitEnabled] = useState(false);
  const [bitDialogOpen, setBitDialogOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<"phone" | "amount" | null>(null);

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
      if (!memberId) return;
      try {
        const { data, error: mErr } = await supabase.rpc("get_public_member_profile", {
          _member_id: memberId,
        });
        if (mErr || !data) throw new Error("החבר לא נמצא");
        if (cancelled) return;
        const d: any = data;
        setMemberName(d.member_name);
        setHasPhone(!!d.has_phone);

        // session check (UI hint only — server still re-verifies on data fetch)
        const raw = sessionStorage.getItem(authKey(memberId));
        if (raw) {
          const ts = parseInt(raw, 10);
          if (!isNaN(ts) && Date.now() - ts < SESSION_TTL_MS) {
            // session expired or no cached phone — require re-login for security
            sessionStorage.removeItem(authKey(memberId));
          }
        }

        // lockout check
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
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "שגיאה בטעינה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [memberId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (!memberId) return;

    // local lockout check
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
    setCharges((d.charges || []).map((row: any) => ({
      id: row.id,
      amount: Number(row.amount),
      remaining_balance: Number(row.remaining_balance),
      description: row.description,
      charge_date: row.charge_date,
    })));
    setPending((d.pending || []).map((row: any) => ({
      id: row.id,
      amount: Number(row.amount),
      method: row.method,
      created_at: row.created_at,
      description: row.description,
    })));
    setReceipts((d.receipts || []).map((row: any) => ({
      id: row.id,
      receipt_number: Number(row.receipt_number),
      total_amount: Number(row.total_amount),
      description: row.description,
      created_at: row.created_at,
    })));
    setBitPhone(d.bit_phone || "");
    setBitEnabled(!!d.bit_enabled);

    sessionStorage.setItem(authKey(memberId), String(Date.now()));
    localStorage.removeItem(attemptsKey(memberId));
    localStorage.removeItem(lockoutKey(memberId));
    setAuthed(true);
    setPwd("");
    setLockedUntil(null);
  };

  const handleLogout = () => {
    if (!memberId) return;
    sessionStorage.removeItem(authKey(memberId));
    setAuthed(false);
    setCharges([]);
    setPending([]);
    setReceipts([]);
    toast.success("התנתקת מהאזור האישי");
  };

  const totalCharges = useMemo(
    () => charges.reduce((s, c) => s + c.remaining_balance, 0),
    [charges]
  );
  const totalPending = useMemo(
    () => pending.reduce((s, p) => s + p.amount, 0),
    [pending]
  );
  const netOwed = useMemo(
    () => Math.max(0, totalCharges - totalPending),
    [totalCharges, totalPending]
  );
  const pendingCredit = useMemo(
    () => Math.max(0, totalPending - totalCharges),
    [totalCharges, totalPending]
  );
  const totalOwed = netOwed;

  const totalReceipts = useMemo(
    () => receipts.reduce((s, r) => s + r.total_amount, 0),
    [receipts]
  );

  useEffect(() => {
    document.title = memberName
      ? `אזור אישי — ${memberName} • ברית שלום עכו`
      : "אזור אישי • ברית שלום עכו";
  }, [memberName]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center" dir="rtl">
        <h1 className="text-2xl font-bold text-foreground mb-2">לא נמצא</h1>
        <p className="text-muted-foreground">{error}</p>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 p-4" dir="rtl">
        <Card className="w-full max-w-sm p-6 space-y-4">
          <div className="text-center space-y-1">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">אזור אישי</h1>
            <p className="text-sm text-muted-foreground">שלום {memberName}</p>
            {!noPhone && !isLocked && (
              <p className="text-xs text-muted-foreground">להתחברות, הזן את מספר הטלפון שלך</p>
            )}
          </div>

          {noPhone ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                    לא ניתן להתחבר
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    לא הוגדר מספר טלפון בכרטיס שלך במערכת. כדי להפעיל את האזור האישי, יש לפנות לגזבר בית הכנסת ולבקש לעדכן את מספר הטלפון.
                  </p>
                </div>
              </div>
            </div>
          ) : isLocked ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center space-y-1">
              <div className="font-bold text-destructive text-sm">הכניסה נחסמה זמנית</div>
              <p className="text-xs text-destructive/90">
                בשל ניסיונות כניסה רבים מדי. נסה שוב בעוד{" "}
                <span className="font-bold tabular-nums">
                  {remainingMin}:{String(remainingSecPart).padStart(2, "0")}
                </span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone-pwd">מספר טלפון</Label>
                <Input
                  id="phone-pwd"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="050-1234567"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  dir="ltr"
                  className="text-center text-lg tracking-wider"
                />
                {pwdError && <p className="text-xs text-destructive">{pwdError}</p>}
              </div>
              <Button type="submit" className="w-full">כניסה</Button>
            </form>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-6 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4">
        <header className="text-center space-y-1 relative">
          <p className="text-xs font-semibold text-muted-foreground">בית כנסת "ברית שלום" עכו</p>
          <h1 className="text-2xl font-bold text-foreground">שלום {memberName}</h1>
          <p className="text-sm text-muted-foreground">האזור האישי שלך</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="absolute top-0 left-0 gap-1.5 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">התנתק</span>
          </Button>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">סה״כ חוב פתוח</div>
            <div className={`text-2xl font-extrabold ${totalOwed > 0 ? "text-destructive" : "text-emerald-600"}`}>
              {formatCurrency(totalOwed)}
            </div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">סה״כ קבלות</div>
            <div className="text-2xl font-extrabold text-foreground">
              {formatCurrency(totalReceipts)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">{receipts.length} קבלות</div>
          </Card>
        </div>

        <Tabs defaultValue="debts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="debts" className="gap-2">
              <FileText className="w-4 h-4" />
              חובות
            </TabsTrigger>
            <TabsTrigger value="receipts" className="gap-2">
              <ReceiptIcon className="w-4 h-4" />
              קבלות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="debts" className="mt-4 space-y-3">
            {charges.length === 0 && pending.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-4xl mb-2">🎉</div>
                <div className="font-bold text-foreground">אין חובות פתוחים</div>
                <p className="text-sm text-muted-foreground mt-1">תודה רבה!</p>
              </Card>
            ) : (
              <>
                <Card className="p-4 space-y-2">
                  <div className="font-bold mb-1">סיכום</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">סה״כ חיובים פתוחים</span>
                    <span className="font-bold">{formatCurrency(totalCharges)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">סה״כ תשלומים ממתינים לאישור</span>
                    <span className="font-bold text-amber-600">{formatCurrency(totalPending)}</span>
                  </div>
                  <div className="border-t pt-2 mt-1 flex items-center justify-between">
                    <span className="font-bold">יתרת חוב מחושבת</span>
                    <span className={`font-extrabold text-lg ${netOwed > 0 ? "text-destructive" : "text-emerald-600"}`}>
                      {formatCurrency(netOwed)}
                    </span>
                  </div>
                  {pendingCredit > 0 && (
                    <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 rounded-md p-2 mt-1">
                      <span>זיכוי צפוי לאחר אישור התשלומים</span>
                      <span className="font-bold">{formatCurrency(pendingCredit)}</span>
                    </div>
                  )}
                  {totalPending > 0 && netOwed > 0 && (
                    <p className="text-[11px] text-muted-foreground pt-1">
                      * תשלומים ממתינים לאישור הגזבר ויקזזו את החוב לאחר אישורם.
                    </p>
                  )}
                </Card>

                {charges.length > 0 && (
                  <Card className="p-4">
                    <div className="font-bold mb-3">חיובים פתוחים ({charges.length})</div>
                    <div className="space-y-2">
                      {charges.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold truncate">{c.description || "חיוב"}</div>
                            <div className="text-xs text-muted-foreground">{formatShortDate(c.charge_date)}</div>
                          </div>
                          <div className="font-bold text-destructive">{formatCurrency(c.remaining_balance)}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                {pending.length > 0 && (
                  <Card className="p-4">
                    <div className="font-bold mb-3">תשלומים ממתינים לאישור ({pending.length})</div>
                    <div className="space-y-2">
                      {pending.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold truncate">
                              {p.description || PAYMENT_METHOD[p.method as keyof typeof PAYMENT_METHOD] || p.method}
                            </div>
                            <div className="text-xs text-muted-foreground">{formatShortDate(p.created_at)}</div>
                          </div>
                          <div className="font-bold text-amber-600">{formatCurrency(p.amount)}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                {bitEnabled && bitPhone && netOwed > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      // נקה את מספר הטלפון - השאר רק ספרות, ודא פורמט ישראלי 0XXXXXXXXX
                      let cleanPhone = (bitPhone || "").replace(/\D/g, "");
                      // אם מתחיל ב-972, החלף ב-0
                      if (cleanPhone.startsWith("972")) {
                        cleanPhone = "0" + cleanPhone.slice(3);
                      }
                      // ודא שמתחיל ב-0
                      if (cleanPhone.length === 9 && !cleanPhone.startsWith("0")) {
                        cleanPhone = "0" + cleanPhone;
                      }

                      if (!cleanPhone || cleanPhone.length < 9) {
                        toast.error("מספר טלפון של ביט אינו תקין", {
                          description: "פנה לגזבר לעדכון מספר ביט בהגדרות",
                        });
                        return;
                      }

                      try {
                        await supabase.rpc("record_bit_payment_intent", {
                          _member_id: memberId!,
                          _amount: netOwed,
                          _user_agent: navigator.userAgent.slice(0, 500),
                        });
                      } catch (e) {
                        console.warn("Failed to record bit intent", e);
                      }

                      const description = encodeURIComponent(`תשלום מ${memberName}`);
                      const amountStr = String(Math.round(netOwed * 100) / 100);
                      // קישור Universal Link של ביט - פותח את האפליקציה במובייל אם מותקנת
                      const bitUrl = `https://www.bitpay.co.il/app/share-money/${cleanPhone}?amount=${amountStr}&description=${description}`;

                      // ניסיון פתיחה ישירה (במובייל זה יפעיל את האפליקציה)
                      window.location.href = bitUrl;

                      toast.success("נרשמה בקשת תשלום בביט", {
                        description: "תשלומך יאושר על ידי הגזבר לאחר קבלתו",
                      });
                    }}
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-md font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #0066ff, #00aaff)" }}
                  >
                    <Smartphone className="w-5 h-5" />
                    שלם {formatCurrency(netOwed)} בביט
                  </button>
                )}
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link to={`/d/${memberId}`}>
                    <FileDown className="w-4 h-4" />
                    הורד דו״ח חובות PDF
                  </Link>
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="receipts" className="mt-4 space-y-3">
            {receipts.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-sm text-muted-foreground">אין קבלות זמינות</div>
              </Card>
            ) : (
              <Card className="p-2">
                <div className="divide-y">
                  {receipts.map((r) => (
                    <Link
                      key={r.id}
                      to={`/r/${r.receipt_number}`}
                      className="flex items-center justify-between p-3 hover:bg-muted/40 rounded-lg transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold truncate">
                          קבלה #{r.receipt_number}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.description || "תרומה"} • {formatShortDate(r.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-foreground">{formatCurrency(r.total_amount)}</div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground pt-2">
          האזור האישי שלך בבית כנסת ברית שלום עכו
        </p>
      </div>
    </div>
  );
}
