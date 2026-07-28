import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Link2, Scissors, Anchor } from "lucide-react";
import { motion } from "framer-motion";

const KNOTS_DB = [
  {
    id: "palomar",
    name: "קשר פלומר (Palomar Knot)",
    difficulty: "קל",
    useCase: "חיבור קרס, סביבל או דמוי לחוט",
    color: "bg-emerald-500/10 text-emerald-500",
    desc: "הקשר החזק והאמין ביותר שקיים לחוטי בד וניילון. קל מאוד לביצוע גם בחושך ואינו מחליש את החוט.",
    steps: [
      "כפלו כ-15 ס״מ מקצה החוט.",
      "העבירו את הלולאה הכפולה דרך טבעת הקרס/סביבל.",
      "עשו קשר סבתא (Overhand knot) פשוט עם החוט הכפול (אל תהדקו עדיין).",
      "העבירו את הקרס כולו דרך הלולאה שנוצרה בקצה.",
      "הרטבו את החוט (עם רוק או מים) והדקו בעדינות את שני הקצוות.",
      "חתכו את השארית בעזרת מספריים."
    ]
  },
  {
    id: "fg",
    name: "קשר FG (FG Knot)",
    difficulty: "קשה",
    useCase: "חיבור חוט בד (Braid) לחוט שוק-לידר (Fluorocarbon/Mono)",
    color: "bg-rose-500/10 text-rose-500",
    desc: "קשר מתקדם לדייגי ז'רז'ור. הוא דק במיוחד ומאפשר לחוט לעבור בטבעות החכה בצורה חלקה ללא חיכוך. דורש תרגול.",
    steps: [
      "החזיקו את חוט הבד מתוח (אפשר להיעזר בשיניים או בידית הרולר).",
      "הניחו את חוט הפלורוקרבון מעל חוט הבד.",
      "לפפו את חוט הפלורוקרבון מתחת ומעל חוט הבד בצורת שמיניות 20-22 פעמים.",
      "עשו קשר סבתא פשוט עם קצה חוט הבד סביב שני החוטים יחד כדי לנעול את הליפופים.",
      "הדקו חזק מאוד (החוט צריך לשנות צבע קצת).",
      "עשו עוד 2-3 קשרי סבתא לביטחון וחתכו שאריות."
    ]
  },
  {
    id: "clinch",
    name: "קשר קלינץ' משופר (Improved Clinch Knot)",
    difficulty: "בינוני",
    useCase: "חיבור קרס קטנה או סביבל לחוט ניילון/פלורוקרבון",
    color: "bg-yellow-500/10 text-yellow-600",
    desc: "קשר קלאסי ומוכר לדייג פיתיונות ובוס. מהיר מאוד לקשירה, מתאים לחוטי מונו/פלורו אך לא מומלץ לחוטי בד חלקים.",
    steps: [
      "העבירו את קצה החוט דרך טבעת הקרס.",
      "לפפו את קצה החוט סביב החוט הראשי 5-7 פעמים.",
      "העבירו את קצה החוט בחזרה דרך הלולאה הראשונה שנוצרה צמוד לטבעת.",
      "כעת העבירו את הקצה דרך הלולאה הגדולה החדשה שנוצרה (זה ה'שיפור').",
      "הרטבו את החוט והדקו במשיכה קלה של החוט הראשי."
    ]
  },
  {
    id: "loop",
    name: "קשר לולאת רפלה (Rapala Knot)",
    difficulty: "בינוני",
    useCase: "חיבור דמויים ללא סナップ (סיכה)",
    color: "bg-blue-500/10 text-blue-500",
    desc: "קשר שמשאיר לולאה קטנה ולא ננעל צמוד לדמוי. מאפשר לדמוי לשחות בצורה טבעית ומשוחררת במים.",
    steps: [
      "עשו קשר סבתא פשוט בחוט, כ-10 ס״מ מהקצה, ואל תהדקו אותו.",
      "העבירו את הקצה דרך הטבעת של הדמוי.",
      "העבירו את הקצה בחזרה דרך הקשר סבתא שעשינו קודם.",
      "לפפו 3 פעמים סביב החוט הראשי.",
      "העבירו את הקצה שוב דרך קשר הסבתא, ואז דרך הלולאה הגדולה שנוצרה.",
      "הרטבו והדקו."
    ]
  }
];

export default function Knots() {
  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto min-h-[calc(100vh-80px)]">
      
      {/* Header */}
      <div className="flex flex-col px-4 mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          מדריך קשרים <Link2 className="w-6 h-6 text-primary" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          קשרים שיחזיקו כל דג, שלב אחר שלב.
        </p>
      </div>

      <div className="px-4">
        <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-primary/5 pb-4 border-b border-border/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Anchor className="w-5 h-5 text-primary" /> קשרים בסיסיים ומתקדמים
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              {KNOTS_DB.map((knot, idx) => (
                <AccordionItem value={knot.id} key={knot.id} className={idx === KNOTS_DB.length - 1 ? "border-0" : ""}>
                  <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-start text-start">
                      <span className="font-bold text-base">{knot.name}</span>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className={`border-0 ${knot.color} px-2 py-0.5 text-[10px]`}>
                          {knot.difficulty}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground flex items-center">{knot.useCase}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-2">
                    <div className="bg-muted/30 p-4 rounded-2xl mb-4 border border-border/50">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {knot.desc}
                      </p>
                    </div>
                    
                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-primary" /> שלבי קשירה:
                    </h4>
                    <ol className="space-y-3 ms-2">
                      {knot.steps.map((step, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-start gap-3"
                        >
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-sm text-muted-foreground leading-relaxed pt-0.5">
                            {step}
                          </span>
                        </motion.li>
                      ))}
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
