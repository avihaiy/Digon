import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, FileDown, Printer } from "lucide-react";
import { formatCurrency, formatShortDate, PAYMENT_METHOD } from "@/lib/hebrew-utils";
import html2pdf from "html2pdf.js";
import { toast } from "sonner";

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

export default function PublicMemberDebts() {
  const { memberId } = useParams<{ memberId: string }>();
  const [memberName, setMemberName] = useState<string>("");
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [pending, setPending] = useState<PendingPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!memberId) return;
      try {
        const { data: m, error: mErr } = await supabase
          .from("members")
          .select("full_name")
          .eq("id", memberId)
          .maybeSingle();
        if (mErr || !m) throw new Error("החבר לא נמצא");

        const { data: c } = await supabase
          .from("member_charges" as any)
          .select("id, amount, remaining_balance, description, charge_date")
          .eq("member_id", memberId)
          .gt("remaining_balance", 0)
          .order("charge_date", { ascending: false });

        const { data: p } = await supabase
          .from("payments")
          .select("id, amount, method, created_at, receipt:receipts(description)")
          .eq("member_id", memberId)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (cancelled) return;
        setMemberName(m.full_name);
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
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "שגיאה בטעינה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [memberId]);

  const totalCharges = charges.reduce((s, c) => s + c.remaining_balance, 0);
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const totalOwed = totalCharges + totalPending;

  useEffect(() => {
    document.title = memberName
      ? `חובות פתוחים — ${memberName} • ברית שלום עכו`
      : "רשימת חובות • ברית שלום עכו";
  }, [memberName]);

  const handleDownload = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      await html2pdf()
        .set({
          margin: 8,
          filename: `חובות-${memberName}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
        })
        .from(printRef.current)
        .save();
    } catch {
      toast.error("שגיאה בהורדת הקובץ");
    } finally {
      setDownloading(false);
    }
  };

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

  const hasDebts = totalOwed > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-8 px-4" dir="rtl">
      <div className="max-w-lg mx-auto space-y-4">
        <header className="text-center">
          <h1 className="text-xl font-bold text-foreground">סיכום חוב פתוח</h1>
          <p className="text-sm text-muted-foreground">בית כנסת "ברית שלום" עכו</p>
        </header>

        <Card className="overflow-hidden shadow-xl border-2">
          <div
            ref={printRef}
            className="p-5 text-black bg-white"
            style={{ fontFamily: "'Heebo', Arial, sans-serif", direction: "rtl" }}
          >
            <div style={{ textAlign: "center", fontSize: "12px", fontWeight: 900 }}>בס"ד</div>
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <div style={{ fontSize: "18px", fontWeight: 900 }}>בית כנסת "ברית שלום" עכו</div>
              <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "4px" }}>סיכום חוב פתוח</div>
            </div>

            <div style={{ borderTop: "2px dashed #000", margin: "10px 0" }} />

            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "14px", fontWeight: 800 }}>שם החבר: {memberName}</div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#444" }}>
                תאריך הפקה: {formatShortDate(new Date().toISOString())}
              </div>
            </div>

            {!hasDebts ? (
              <div style={{ textAlign: "center", padding: "20px 0", fontSize: "15px", fontWeight: 800 }}>
                🎉 אין חובות פתוחים
              </div>
            ) : (
              <>
                <div style={{ borderTop: "2px dashed #000", margin: "10px 0" }} />
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <div style={{ fontSize: "13px", fontWeight: 800 }}>סה״כ חוב פתוח</div>
                  <div style={{ fontSize: "28px", fontWeight: 900, color: "#b91c1c" }}>
                    {formatCurrency(totalOwed)}
                  </div>
                </div>
                <div style={{ borderTop: "2px dashed #000", margin: "10px 0" }} />

                {charges.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 900, marginBottom: "6px" }}>
                      חיובים פתוחים ({charges.length})
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "#f3f4f6" }}>
                          <th style={{ padding: "5px", textAlign: "right", fontWeight: 800 }}>תיאור</th>
                          <th style={{ padding: "5px", textAlign: "right", fontWeight: 800 }}>תאריך</th>
                          <th style={{ padding: "5px", textAlign: "left", fontWeight: 800 }}>יתרה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {charges.map((c) => (
                          <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
                            <td style={{ padding: "5px" }}>{c.description || "-"}</td>
                            <td style={{ padding: "5px" }}>{formatShortDate(c.charge_date)}</td>
                            <td style={{ padding: "5px", textAlign: "left", fontWeight: 800, color: "#b91c1c" }}>
                              {formatCurrency(c.remaining_balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {pending.length > 0 && (
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 900, marginBottom: "6px" }}>
                      תשלומים ממתינים ({pending.length})
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "#f3f4f6" }}>
                          <th style={{ padding: "5px", textAlign: "right", fontWeight: 800 }}>תיאור</th>
                          <th style={{ padding: "5px", textAlign: "right", fontWeight: 800 }}>תאריך</th>
                          <th style={{ padding: "5px", textAlign: "left", fontWeight: 800 }}>סכום</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pending.map((p) => (
                          <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                            <td style={{ padding: "5px" }}>
                              {p.description || PAYMENT_METHOD[p.method as keyof typeof PAYMENT_METHOD] || p.method}
                            </td>
                            <td style={{ padding: "5px" }}>{formatShortDate(p.created_at)}</td>
                            <td style={{ padding: "5px", textAlign: "left", fontWeight: 800, color: "#b91c1c" }}>
                              {formatCurrency(p.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            <div style={{ borderTop: "2px dashed #000", margin: "12px 0" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "12px", fontWeight: 800 }}>תודה על תרומתכם!</p>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#444" }}>בית כנסת "ברית שלום" עכו</p>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#444" }}>טלפון: 050-5768723</p>
            </div>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button onClick={handleDownload} disabled={downloading} className="flex-1 gap-2">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            הורד PDF
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="w-4 h-4" />
            הדפסה
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2">
          סיכום זה נשלח אליכם דיגיטלית מבית כנסת ברית שלום עכו
        </p>
      </div>
    </div>
  );
}
