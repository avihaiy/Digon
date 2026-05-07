import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, FileText, Receipt as ReceiptIcon, ExternalLink, FileDown, Lock } from "lucide-react";
import { formatCurrency, formatShortDate, PAYMENT_METHOD } from "@/lib/hebrew-utils";

const normalizePhone = (s: string) => (s || "").replace(/\D/g, "");

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

export default function PublicMemberArea() {
  const { memberId } = useParams<{ memberId: string }>();
  const [memberName, setMemberName] = useState<string>("");
  const [memberPhone, setMemberPhone] = useState<string>("");
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [pending, setPending] = useState<PendingPaymentRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!memberId) return;
      try {
        const { data: m, error: mErr } = await supabase
          .from("members")
          .select("full_name, phone")
          .eq("id", memberId)
          .maybeSingle();
        if (mErr || !m) throw new Error("החבר לא נמצא");
        if (cancelled) return;
        setMemberName(m.full_name);
        setMemberPhone(m.phone || "");
        if (sessionStorage.getItem(`member_area_auth_${memberId}`) === "1") {
          setAuthed(true);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "שגיאה בטעינה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [memberId]);

  useEffect(() => {
    let cancelled = false;
    if (!memberId || !authed) return;
    (async () => {
      const [{ data: c }, { data: p }, { data: r }] = await Promise.all([
        supabase
          .from("member_charges" as any)
          .select("id, amount, remaining_balance, description, charge_date")
          .eq("member_id", memberId)
          .gt("remaining_balance", 0)
          .order("charge_date", { ascending: false }),
        supabase
          .from("payments")
          .select("id, amount, method, created_at, receipt:receipts(description)")
          .eq("member_id", memberId)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("receipts")
          .select("id, receipt_number, total_amount, description, created_at")
          .eq("member_id", memberId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (cancelled) return;
      setCharges(((c as any) || []).map((row: any) => ({
        id: row.id,
        amount: Number(row.amount),
        remaining_balance: Number(row.remaining_balance),
        description: row.description,
        charge_date: row.charge_date,
      })));
      setPending(((p as any) || []).map((row: any) => ({
        id: row.id,
        amount: Number(row.amount),
        method: row.method,
        created_at: row.created_at,
        description: row.receipt?.[0]?.description,
      })));
      setReceipts(((r as any) || []).map((row: any) => ({
        id: row.id,
        receipt_number: Number(row.receipt_number),
        total_amount: Number(row.total_amount),
        description: row.description,
        created_at: row.created_at,
      })));
    })();
    return () => { cancelled = true; };
  }, [memberId, authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    const expected = normalizePhone(memberPhone);
    const provided = normalizePhone(pwd);
    if (!expected) {
      setPwdError("לא הוגדר מספר טלפון לחבר. פנה לגזבר.");
      return;
    }
    const tail = (s: string) => s.slice(-9);
    if (provided && tail(provided) === tail(expected)) {
      sessionStorage.setItem(`member_area_auth_${memberId}`, "1");
      setAuthed(true);
      setPwd("");
    } else {
      setPwdError("מספר הטלפון שהוזן אינו נכון");
    }
  };

  const totalCharges = useMemo(
    () => charges.reduce((s, c) => s + c.remaining_balance, 0),
    [charges]
  );
  const totalPending = useMemo(
    () => pending.reduce((s, p) => s + p.amount, 0),
    [pending]
  );
  // יתרה נטו: חיובים פתוחים פחות תשלומים ממתינים (אם יאושרו, יקזזו חיובים)
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-6 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4">
        <header className="text-center space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">בית כנסת "ברית שלום" עכו</p>
          <h1 className="text-2xl font-bold text-foreground">שלום {memberName}</h1>
          <p className="text-sm text-muted-foreground">האזור האישי שלך</p>
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
                {/* סיכום מפורט */}
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
