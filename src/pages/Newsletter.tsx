import React, { useState, useRef, useEffect } from "react";
import { HebrewCalendar, Location, HDate } from "@hebcal/core";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Share2, FileText, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import html2pdf from "html2pdf.js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface NewsletterData {
  synagogueName: string;
  parasha: string;
  hebrewDate: string;
  dvarTorahTitle: string;
  dvarTorahContent: string;
  announcements: string;
  parnasHashavua: string;
  times: { label: string; time: string }[];
}

export default function Newsletter() {
  const [isExporting, setIsExporting] = useState(false);
  const newsletterRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<NewsletterData>({
    synagogueName: 'בית כנסת',
    parasha: '',
    hebrewDate: '',
    dvarTorahTitle: 'דבר תורה לפרשת השבוע',
    dvarTorahContent: 'הקלידו כאן את דברי התורה...',
    announcements: 'הקלידו כאן את הודעות הקהילה, זמני שיעורים, וכו\'...',
    parnasHashavua: 'מי תרם השבוע את הקידוש?',
    times: [
      { label: "כניסת שבת", time: "19:00" },
      { label: "מנחה ערב שבת", time: "19:10" },
      { label: "שחרית", time: "08:00" },
      { label: "מנחה של שבת", time: "18:30" },
      { label: "צאת שבת", time: "20:00" },
    ]
  });

  // Fetch settings for synagogue name
  useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single();
      
      if (settings?.synagogue_name) {
        setData(prev => ({ ...prev, synagogueName: settings.synagogue_name }));
      }
      return settings;
    }
  });

  useEffect(() => {
    // Auto-calculate Parasha and dates for the upcoming Shabbat
    try {
      const today = new Date();
      // Find next Saturday
      const nextSaturday = new Date(today);
      nextSaturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));
      
      const hDate = new HDate(nextSaturday);
      const events = HebrewCalendar.calendar({
        start: nextSaturday,
        end: nextSaturday,
        sedrot: true,
        noHolidays: true,
      });
      
      const parashaEvent = events.find(e => e.getDesc().startsWith("Parashat"));
      const parashaName = parashaEvent ? parashaEvent.render("he").replace("פרשת ", "") : "";
      
      // Get heb date string like "כ' אלול תשפ\"ד"
      const heDateStr = hDate.render("he");
      
      setData(prev => ({
        ...prev,
        parasha: parashaName || prev.parasha,
        hebrewDate: heDateStr
      }));
    } catch (err) {
      console.error("Error calculating heb dates", err);
    }
  }, []);

  const handleExportPDF = async () => {
    if (!newsletterRef.current) return;
    
    setIsExporting(true);
    const toastId = toast.loading("מייצר קובץ PDF...");
    
    try {
      const element = newsletterRef.current;
      const opt = {
        margin:       0,
        filename:     `עלון-שבת-${data.parasha || 'קהילה'}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success("קובץ ה-PDF הופק בהצלחה!", { id: toastId });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("אירעה שגיאה ביצירת ה-PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleTimeChange = (idx: number, field: 'label' | 'time', value: string) => {
    const newTimes = [...data.times];
    newTimes[idx] = { ...newTimes[idx], [field]: value };
    setData({ ...data, times: newTimes });
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="outline" size="icon" className="rounded-full shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">מחולל עלון שבת</h1>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            onClick={handleExportPDF} 
            disabled={isExporting}
            className="flex-1 md:flex-none shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
          >
            {isExporting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Download className="ml-2 h-4 w-4" />}
            הורד כ-PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Form */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="shadow-sm border-0 border-t-4 border-t-primary">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                תוכן העלון
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>כותרת דבר תורה</Label>
                <Input 
                  value={data.dvarTorahTitle}
                  onChange={(e) => setData({ ...data, dvarTorahTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>תוכן דבר תורה</Label>
                <Textarea 
                  className="min-h-[150px] resize-none"
                  value={data.dvarTorahContent}
                  onChange={(e) => setData({ ...data, dvarTorahContent: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>הודעות הקהילה</Label>
                <Textarea 
                  className="min-h-[100px] resize-none"
                  value={data.announcements}
                  onChange={(e) => setData({ ...data, announcements: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>פרנס השבוע / תרומות</Label>
                <Textarea 
                  className="min-h-[60px] resize-none"
                  value={data.parnasHashavua}
                  onChange={(e) => setData({ ...data, parnasHashavua: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 border-t-4 border-t-secondary">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">זמני התפילות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.times.map((t, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input 
                    value={t.label} 
                    onChange={(e) => handleTimeChange(idx, 'label', e.target.value)}
                    className="flex-1"
                  />
                  <Input 
                    value={t.time} 
                    onChange={(e) => handleTimeChange(idx, 'time', e.target.value)}
                    className="w-24 text-center"
                    dir="ltr"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-8 flex justify-center bg-muted/30 rounded-xl p-4 md:p-8 overflow-auto border border-border/50">
          <div className="relative shadow-2xl bg-white mx-auto transform-gpu origin-top transition-transform duration-300" style={{ width: '210mm', minHeight: '297mm', transform: 'scale(0.8)' }}>
            
            {/* The actual A4 Page to be captured */}
            <div 
              ref={newsletterRef}
              className="w-[210mm] min-h-[297mm] bg-white text-black p-[15mm] relative overflow-hidden"
              style={{ direction: 'rtl', fontFamily: '"Heebo", "Frank Ruhl Libre", sans-serif' }}
            >
              {/* Header */}
              <div className="text-center mb-6 border-b-2 border-primary/20 pb-4">
                <h1 className="text-4xl font-black text-primary mb-2 tracking-tight">עלון שבת</h1>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">{data.synagogueName}</h2>
                <div className="flex justify-center items-center gap-4 text-gray-600 font-medium">
                  <span>פרשת {data.parasha}</span>
                  <span>•</span>
                  <span>{data.hebrewDate}</span>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-8">
                {/* Main Content Column */}
                <div className="col-span-8 space-y-6">
                  {/* Dvar Torah */}
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-bold text-primary mb-3 pb-2 border-b border-primary/10">
                      {data.dvarTorahTitle}
                    </h3>
                    <div className="text-gray-800 leading-relaxed text-justify whitespace-pre-wrap font-serif text-lg">
                      {data.dvarTorahContent}
                    </div>
                  </div>

                  {/* Announcements */}
                  <div className="bg-amber-50 p-5 rounded-xl border border-amber-100/50 shadow-sm">
                    <h3 className="text-xl font-bold text-amber-800 mb-3 pb-2 border-b border-amber-200">
                      הודעות הקהילה
                    </h3>
                    <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {data.announcements}
                    </div>
                  </div>
                </div>

                {/* Sidebar Column */}
                <div className="col-span-4 space-y-6">
                  {/* Prayer Times */}
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <h3 className="text-lg font-bold text-primary mb-4 text-center pb-2 border-b border-primary/20">
                      זמני התפילות
                    </h3>
                    <div className="space-y-3">
                      {data.times.map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-primary/5 pb-2 last:border-0 last:pb-0">
                          <span className="font-semibold text-gray-700">{t.label}</span>
                          <span className="font-bold text-primary tabular-nums tracking-wider" dir="ltr">{t.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sponsors */}
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <h3 className="text-lg font-bold text-emerald-800 mb-3 text-center pb-2 border-b border-emerald-200">
                      פרנס השבוע
                    </h3>
                    <div className="text-emerald-900 text-center leading-snug whitespace-pre-wrap font-medium">
                      {data.parnasHashavua}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="absolute bottom-[10mm] left-[15mm] right-[15mm] text-center pt-4 border-t border-gray-200 text-gray-500 text-sm">
                שבת שלום ומבורך! הופק באמצעות מערכת ניהול בית הכנסת
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
