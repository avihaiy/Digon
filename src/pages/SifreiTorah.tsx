import SifreiTorahManager from '@/components/admin/SifreiTorahManager';

export default function SifreiTorah() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">ניהול ספרי תורה</h1>
        <p className="text-muted-foreground mt-2">
          צפייה וניהול של רשימת ספרי התורה, שיוך הספרים לימים קבועים ושיוך לתאריכים ספציפיים.
        </p>
      </div>
      <SifreiTorahManager />
    </div>
  );
}
