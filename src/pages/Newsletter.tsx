import React, { useState, useRef, useEffect } from "react";
import { HebrewCalendar, HDate } from "@hebcal/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, ArrowLeft, Loader2, FileText, Clock, Palette } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import html2pdf from "html2pdf.js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface NewsletterData {
  synagogueName: string;
  parasha: string;
  hebrewDate: string;
  dvarTorahTitle: string;
  dvarTorahContent: string;
  halachaTitle: string;
  halachaContent: string;
  announcementsTitle: string;
  announcements: string;
  parnasHashavua: string;
  times: { label: string; time: string }[];
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'align': [] }],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline',
  'list', 'bullet', 'align'
];

export default function Newsletter() {
  const [isExporting, setIsExporting] = useState(false);
  const newsletterRef = useRef<HTMLDivElement>(null);
  
  // Load from local storage or use defaults
  const getInitialData = (): NewsletterData => {
    const saved = localStorage.getItem('newsletter-draft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved newsletter");
      }
    }
    return {
      synagogueName: 'בית כנסת',
      parasha: '',
      hebrewDate: '',
      dvarTorahTitle: 'דבר תורה לפרשת השבוע',
      dvarTorahContent: '<p>הקלידו כאן את דברי התורה...</p>',
      halachaTitle: 'הלכה שבועית',
      halachaContent: '<p>הלכות לקראת שבת...</p>',
      announcementsTitle: 'הודעות הקהילה',
      announcements: '<p>זמני שיעורים, תזכורות וכו\'...</p>',
      parnasHashavua: 'מי תרם השבוע את הקידוש?',
      times: [
        { label: "כניסת שבת", time: "19:00" },
        { label: "מנחה ערב שבת", time: "19:10" },
        { label: "שחרית", time: "08:00" },
        { label: "מנחה של שבת", time: "18:30" },
        { label: "צאת שבת", time: "20:00" },
      ]
    };
  };

  const [data, setData] = useState<NewsletterData>(getInitialData);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('newsletter-draft', JSON.stringify(data));
  }, [data]);

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
    if (data.parasha && data.hebrewDate) return; // Don't override if already set/loaded
    
    try {
      const today = new Date();
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
      const heDateStr = hDate.renderGematriya();
      
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
        html2canvas:  { scale: 2, useCORS: true, windowWidth: 800 },
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

  const addTimeRow = () => {
    setData({ ...data, times: [...data.times, { label: "תפילה חדשה", time: "12:00" }] });
  };

  const removeTimeRow = (idx: number) => {
    const newTimes = data.times.filter((_, i) => i !== idx);
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
            variant="outline"
            onClick={() => {
              if(confirm('האם אתה בטוח שברצונך לאפס את כל התוכן?')) {
                localStorage.removeItem('newsletter-draft');
                window.location.reload();
              }
            }}
          >
            איפוס עלון
          </Button>
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
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content"><FileText className="w-4 h-4 ml-2"/> תוכן</TabsTrigger>
              <TabsTrigger value="times"><Clock className="w-4 h-4 ml-2"/> זמנים ופרטים</TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="space-y-4 mt-4">
              <Card className="shadow-sm border-t-4 border-t-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">דבר תורה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>כותרת</Label>
                    <Input 
                      value={data.dvarTorahTitle}
                      onChange={(e) => setData({ ...data, dvarTorahTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2" dir="ltr">
                    <Label className="text-right block" dir="rtl">תוכן</Label>
                    <ReactQuill 
                      theme="snow" 
                      value={data.dvarTorahContent} 
                      onChange={(content) => setData({ ...data, dvarTorahContent: content })}
                      modules={modules}
                      formats={formats}
                      className="bg-white rounded-md text-right ql-editor-rtl"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-t-4 border-t-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">הלכה שבועית</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>כותרת</Label>
                    <Input 
                      value={data.halachaTitle}
                      onChange={(e) => setData({ ...data, halachaTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2" dir="ltr">
                    <Label className="text-right block" dir="rtl">תוכן</Label>
                    <ReactQuill 
                      theme="snow" 
                      value={data.halachaContent} 
                      onChange={(content) => setData({ ...data, halachaContent: content })}
                      modules={modules}
                      formats={formats}
                      className="bg-white rounded-md text-right ql-editor-rtl"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-t-4 border-t-amber-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">הודעות הקהילה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>כותרת</Label>
                    <Input 
                      value={data.announcementsTitle}
                      onChange={(e) => setData({ ...data, announcementsTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2" dir="ltr">
                    <Label className="text-right block" dir="rtl">תוכן</Label>
                    <ReactQuill 
                      theme="snow" 
                      value={data.announcements} 
                      onChange={(content) => setData({ ...data, announcements: content })}
                      modules={modules}
                      formats={formats}
                      className="bg-white rounded-md text-right ql-editor-rtl"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="times" className="space-y-4 mt-4">
              <Card className="shadow-sm border-t-4 border-t-secondary">
                <CardHeader className="pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">זמני התפילות</CardTitle>
                  <Button variant="outline" size="sm" onClick={addTimeRow}>הוסף זמן</Button>
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
                      <Button variant="destructive" size="icon" className="h-10 w-10 shrink-0" onClick={() => removeTimeRow(idx)}>
                        &times;
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-t-4 border-t-emerald-500">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">פרנס השבוע / תרומות</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    className="min-h-[80px] resize-none"
                    value={data.parnasHashavua}
                    onChange={(e) => setData({ ...data, parnasHashavua: e.target.value })}
                  />
                </CardContent>
              </Card>
              
              <Card className="shadow-sm border-t-4 border-t-slate-500">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">פרטי העלון</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>שם הפרשה</Label>
                    <Input value={data.parasha} onChange={(e) => setData({...data, parasha: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>תאריך עברי</Label>
                    <Input value={data.hebrewDate} onChange={(e) => setData({...data, hebrewDate: e.target.value})} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-8 flex justify-center bg-muted/30 rounded-xl p-4 md:p-8 overflow-auto border border-border/50">
          <div className="relative shadow-2xl bg-white mx-auto transform-gpu origin-top transition-transform duration-300" style={{ width: '210mm', minHeight: '297mm', transform: 'scale(0.85)' }}>
            
            {/* The actual A4 Page to be captured */}
            <div 
              ref={newsletterRef}
              className="w-[210mm] min-h-[297mm] bg-white text-black p-[15mm] relative flex flex-col"
              style={{ direction: 'rtl', fontFamily: '"Heebo", "Frank Ruhl Libre", sans-serif' }}
            >
              {/* Decorative Border Background */}
              <div className="absolute inset-4 border border-primary/30 pointer-events-none rounded-xl z-0"></div>
              <div className="absolute inset-[1.1rem] border border-primary/10 pointer-events-none rounded-lg z-0"></div>
              
              <div className="relative z-10 flex-1 flex flex-col">
                {/* Header */}
                <div className="text-center mb-8 pb-6 border-b border-primary/20 mt-2 flex flex-col items-center">
                  <h1 className="text-5xl font-black text-primary mb-3 tracking-tight">עלון שבת</h1>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">{data.synagogueName}</h2>
                  <div className="flex justify-center items-center gap-4 text-primary font-bold bg-primary/5 py-1.5 px-6 rounded-full border border-primary/10">
                    <span>פרשת {data.parasha}</span>
                    <span className="text-primary/40">•</span>
                    <span>{data.hebrewDate}</span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 flex-1">
                  {/* Main Content Column */}
                  <div className="col-span-8 space-y-8">
                    {/* Dvar Torah */}
                    {data.dvarTorahTitle && (
                      <div className="bg-white">
                        <h3 className="text-2xl font-bold text-primary mb-4 pb-2 border-b-2 border-primary/20 inline-block">
                          {data.dvarTorahTitle}
                        </h3>
                        <div 
                          className="prose prose-slate max-w-none text-gray-800 leading-relaxed text-justify font-serif text-lg [&>p]:mb-4 [&>ul]:list-disc [&>ul]:mr-5 [&>ol]:list-decimal [&>ol]:mr-5 [&>strong]:font-bold"
                          dangerouslySetInnerHTML={{ __html: data.dvarTorahContent }}
                        />
                      </div>
                    )}

                    {/* Halacha */}
                    {data.halachaTitle && (
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                        <h3 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-primary rounded-full"></span>
                          {data.halachaTitle}
                        </h3>
                        <div 
                          className="prose prose-sm max-w-none text-gray-700 leading-relaxed [&>p]:mb-2 [&>ul]:list-disc [&>ul]:mr-5"
                          dangerouslySetInnerHTML={{ __html: data.halachaContent }}
                        />
                      </div>
                    )}

                    {/* Announcements */}
                    {data.announcementsTitle && (
                      <div className="bg-primary/5 p-5 rounded-xl border border-primary/10">
                        <h3 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-primary rounded-full"></span>
                          {data.announcementsTitle}
                        </h3>
                        <div 
                          className="prose prose-sm max-w-none text-gray-700 leading-relaxed [&>p]:mb-2"
                          dangerouslySetInnerHTML={{ __html: data.announcements }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Sidebar Column */}
                  <div className="col-span-4 space-y-6">
                    {/* Prayer Times */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="bg-primary/10 text-primary font-bold text-center py-3 border-b border-primary/10">
                        זמני התפילות
                      </div>
                      <div className="p-4 space-y-3">
                        {data.times.map((t, idx) => (
                          <div key={idx} className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2 last:border-0 last:pb-0">
                            <span className="font-semibold text-gray-700">{t.label}</span>
                            <span className="font-bold text-primary tabular-nums tracking-wider" dir="ltr">{t.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sponsors */}
                    {data.parnasHashavua && (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-100 text-slate-700 font-bold text-center py-3 border-b border-slate-200">
                          פרנס השבוע
                        </div>
                        <div className="p-4 text-slate-800 text-center leading-relaxed whitespace-pre-wrap font-medium">
                          {data.parnasHashavua}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-6 text-center text-gray-400 text-sm font-medium">
                  שבת שלום ומבורך! הופק באמצעות מערכת ניהול בית הכנסת
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
