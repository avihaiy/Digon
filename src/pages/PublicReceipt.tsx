import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, FileDown, Printer } from "lucide-react";
import { formatCurrency, formatDate, getHebrewDate, PAYMENT_METHOD } from "@/lib/hebrew-utils";
import html2pdf from "html2pdf.js";
import { toast } from "sonner";

const PAYMENT_METHOD_DISPLAY: Record<string, string> = {
  cash: "מזומן",
  bit: "ביט",
  check: "צ׳ק",
  bank_transfer: "העברה בנקאית",
};

export default function PublicReceipt() {
  const { receiptNumber } = useParams<{ receiptNumber: string }>();
  const [receipt, setReceipt] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!receiptNumber) return;
      const num = parseInt(receiptNumber, 10);
      if (!num) {
        setError("מספר קבלה לא תקין");
        setLoading(false);
        return;
      }
      try {
        const { data, error: rErr } = await supabase.rpc("get_public_receipt", {
          _receipt_number: num,
        });
        if (rErr || !data) throw new Error("הקבלה לא נמצאה");
        const r: any = data;
        if (cancelled) return;
        setReceipt({
          id: r.id,
          receipt_number: r.receipt_number,
          total_amount: r.total_amount,
          description: r.description,
          created_at: r.created_at,
          member: { full_name: r.member_name },
          payment: r.payment_method
            ? { method: r.payment_method, reference: r.payment_reference }
            : null,
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "שגיאה בטעינת הקבלה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [receiptNumber]);

  const getPaymentMethodName = (): string => {
    const method = receipt?.payment?.method;
    if (!method) return "-";
    if (PAYMENT_METHOD && PAYMENT_METHOD[method as keyof typeof PAYMENT_METHOD]) {
      return PAYMENT_METHOD[method as keyof typeof PAYMENT_METHOD];
    }
    return PAYMENT_METHOD_DISPLAY[method] || method;
  };

  const handleDownload = async () => {
    if (!printRef.current || !receipt) return;
    setDownloading(true);
    try {
      await html2pdf()
        .set({
          margin: 0,
          filename: `קבלה-${receipt.receipt_number}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "mm", format: [80, 120], orientation: "portrait" as const },
        })
        .from(printRef.current)
        .save();
    } catch (e) {
      toast.error("שגיאה בהורדת הקבלה");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    document.title = receipt
      ? `קבלה ${receipt.receipt_number} • בית כנסת ברית שלום עכו`
      : "קבלה • בית כנסת ברית שלום עכו";
  }, [receipt]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center" dir="rtl">
        <h1 className="text-2xl font-bold text-foreground mb-2">קבלה לא נמצאה</h1>
        <p className="text-muted-foreground">{error || "אנא בדקו את הקישור."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-8 px-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-4">
        <header className="text-center mb-2">
          <h1 className="text-xl font-bold text-foreground">קבלה רשמית</h1>
          <p className="text-sm text-muted-foreground">בית כנסת "ברית שלום" עכו</p>
        </header>

        <Card className="overflow-hidden shadow-xl border-2">
          <div
            ref={printRef}
            className="p-4 text-black bg-white"
            style={{
              fontFamily: "'Heebo', Arial, sans-serif",
              fontSize: "12px",
              lineHeight: "1.4",
              fontWeight: 700,
            }}
          >
            <div style={{ textAlign: "center", fontSize: "11px", fontWeight: 900, marginBottom: "6px" }}>בס"ד</div>
            <div style={{ textAlign: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "16px", fontWeight: 900 }}>בית כנסת "ברית שלום" עכו</div>
              <div style={{ fontSize: "11px", fontWeight: 800 }}>רח' קדושי קהיר 18, עכו</div>
            </div>
            <div style={{ textAlign: "center", marginBottom: "4px" }}>
              <div style={{ fontSize: "14px", fontWeight: 900 }}>קבלה מספר: {receipt.receipt_number}</div>
            </div>
            <div style={{ textAlign: "center", fontSize: "11px", fontWeight: 800, marginBottom: "8px" }}>
              <span>{formatDate(receipt.created_at)}</span>
              <span> • </span>
              <span>{getHebrewDate(new Date(receipt.created_at))}</span>
            </div>
            <div style={{ borderTop: "2px dashed #000", margin: "8px 0" }} />
            <div style={{ marginBottom: "8px" }}>
              <Row label="התקבל מאת:" value={receipt.member?.full_name || "-"} />
              <Row label="עבור:" value={receipt.description || "תרומה"} />
              <Row label="אמצעי תשלום:" value={getPaymentMethodName()} />
              {receipt.payment?.reference && <Row label="אסמכתא:" value={receipt.payment.reference} />}
            </div>
            <div style={{ borderTop: "2px dashed #000", margin: "8px 0" }} />
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ fontSize: "13px", fontWeight: 900 }}>סה״כ שולם</div>
              <div style={{ fontSize: "26px", fontWeight: 900 }}>{formatCurrency(Number(receipt.total_amount))}</div>
            </div>
            <div style={{ borderTop: "2px dashed #000", margin: "8px 0" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "13px", fontWeight: 900, marginBottom: "4px" }}>תודה על תרומתכם!</p>
              <p style={{ fontSize: "11px", fontWeight: 800 }}>בית כנסת "ברית שלום" עכו</p>
              <p style={{ fontSize: "11px", fontWeight: 800 }}>טלפון: 050-5768723</p>
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
          קבלה זו נשלחה אליכם דיגיטלית מבית כנסת ברית שלום עכו
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "8px",
        fontSize: "12px",
        fontWeight: 800,
        padding: "1px 0",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
