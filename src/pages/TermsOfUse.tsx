import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsOfUse() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div 
        className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
      >
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowRight className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white mr-2">תנאי שימוש ומדיניות פרטיות</h1>
      </div>
      
      <div className="p-4 max-w-3xl mx-auto space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed" dir="rtl">
        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">1. מבוא</h2>
          <p>
            ברוכים הבאים לאפליקציית Digon. השימוש באפליקציה כפוף לתנאי השימוש המפורטים במסמך זה. עצם ההרשמה והשימוש באפליקציה מהווים את הסכמתך המלאה לתנאים אלו.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">2. אחריות המשתמש</h2>
          <p className="mb-2">
            האפליקציה משמשת כפלטפורמה חברתית לדייגים. באחריותך הבלעדית לוודא כי:
          </p>
          <ul className="list-disc list-inside space-y-2 pr-4">
            <li>כל תוכן (תמונות, טקסט, נ.צ) שאתה מעלה שייך לך או שיש לך אישור להשתמש בו.</li>
            <li>אין להעלות תוכן פוגעני, מסית, או מפר זכויות יוצרים.</li>
            <li>כל יציאה לדייג ולנקודות המופיעות באפליקציה היא על אחריותך בלבד. הנהלת האפליקציה לא תישא באחריות לכל נזק, פציעה או אובדן שייגרמו למשתמש.</li>
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">3. פרטיות ומידע</h2>
          <ul className="list-disc list-inside space-y-2 pr-4">
            <li>אנו שומרים את המידע שאתה מספק (שם, אימייל, תמונות) במסדי הנתונים שלנו על מנת לספק לך את השירות.</li>
            <li>האפליקציה אוספת מיקומי GPS כאשר אתה משתמש במפה או מוסיף תפיסות.</li>
            <li>לא נעביר את המידע האישי שלך לצדדים שלישיים ללא הסכמתך, מלבד לצורך תפעול תקין של המערכת (כגון אחסון ענן).</li>
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">4. ציוד והמלצות רכישה</h2>
          <p>
            האפליקציה עשויה להציג המלצות למוצרים (לדוגמה מאליאקספרס). הנהלת האפליקציה <strong>אינה מוכרת</strong> את הציוד, אינה אחראית לאספקתו, איכותו או למשלוח. כל רכישה מתבצעת ישירות מול המוכר באתר החיצוני ועל אחריות הקונה בלבד.
          </p>
        </section>

        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">5. שינויים וחסימות</h2>
          <p>
            הנהלת האפליקציה שומרת לעצמה את הזכות לערוך, למחוק או לחסום משתמשים ותכנים אשר מפירים את תנאי השימוש, לפי שיקול דעתה הבלעדי וללא צורך בהודעה מוקדמת.
          </p>
        </section>
      </div>
    </div>
  );
}
