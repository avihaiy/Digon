import React, { useState, useRef, useEffect } from "react";
import { HebrewCalendar, HDate } from "@hebcal/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Download, ArrowLeft, Loader2, FileText, Clock, Palette, Image as ImageIcon, Sparkles, Save, FolderOpen, PanelBottom } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import html2pdf from "html2pdf.js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getShabbatTimes } from "@/lib/hebrew-utils";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import defaultLogo from "@/assets/brit-shalom-poster-logo.png";

interface NewsletterData {
  synagogueName: string;
  parasha: string;
  hebrewDate: string;
  logo: string;
  theme: 'classic' | 'modern' | 'minimal' | 'newspaper';
  fontFamily: string;
  contentFontFamily: string;
  fontSize: string;
  dvarTorahTitle: string;
  dvarTorahContent: string;
  halachaTitle: string;
  halachaContent: string;
  dailyStudyTitle: string;
  dailyStudyContent: string;
  childrensCornerTitle: string;
  childrensCornerContent: string;
  announcementsTitle: string;
  announcements: string;
  akkoZmanim?: {
    candleLighting: string;
    havdalah: string;
    rabbeinuTam: string;
  };
  times: { label: string; time: string }[];
  extraPages: { id: string; title: string; content: string }[];
  backPage?: {
    enabled: boolean;
    ads: string[];
    dedications: {
      leiluyNishmat: string;
      refuahShlema: string;
      brachaVeHatzlacha: string;
    }
  };
  footerAd?: string;
  sidebarAds?: string[];
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
  const [isSavingArchive, setIsSavingArchive] = useState(false);
  const [archives, setArchives] = useState<any[]>([]);
  const [isArchivesOpen, setIsArchivesOpen] = useState(false);
  const [isGeneratingDvarTorah, setIsGeneratingDvarTorah] = useState(false);
  const [isGeneratingChildrensCorner, setIsGeneratingChildrensCorner] = useState(false);
  const [isGeneratingHalacha, setIsGeneratingHalacha] = useState(false);
  const newsletterRef = useRef<HTMLDivElement>(null);
  
  const getInitialData = (): NewsletterData => {
    const saved = localStorage.getItem('newsletter-draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure new fields exist in old saves
        return {
          logo: '',
          theme: 'classic',
          fontFamily: 'Assistant',
          contentFontFamily: 'Frank Ruhl Libre',
          fontSize: 'text-base',
          dailyStudyTitle: 'לימוד יומי',
          dailyStudyContent: '',
          childrensCornerTitle: 'פינת הילדים',
          childrensCornerContent: '',
          extraPages: [],
          backPage: {
            enabled: false,
            ads: ['', '', ''],
            dedications: {
              leiluyNishmat: '',
              refuahShlema: '',
              brachaVeHatzlacha: ''
            }
          },
          akkoZmanim: {
            candleLighting: '',
            havdalah: '',
            rabbeinuTam: ''
          },
          sidebarAds: ['', ''],
          ...parsed,
        };
        // Ensure akkoZmanim exists even if parsed from old storage
        if (!parsed.akkoZmanim) {
          result.akkoZmanim = {
            candleLighting: '',
            havdalah: '',
            rabbeinuTam: ''
          };
        }
        if (!parsed.sidebarAds) {
          result.sidebarAds = ['', ''];
        }
        return result;
      } catch (e) {
        console.error("Failed to parse saved newsletter");
      }
    }
    return {
      synagogueName: 'בית כנסת',
      parasha: '',
      hebrewDate: '',
      logo: '',
      theme: 'classic',
      fontFamily: 'Assistant',
      contentFontFamily: 'Frank Ruhl Libre',
      fontSize: 'text-base',
      dvarTorahTitle: 'דבר תורה לפרשת השבוע',
      dvarTorahContent: '<p>הקלידו כאן את דברי התורה...</p>',
      halachaTitle: 'הלכה שבועית',
      halachaContent: '<p>הלכות לקראת שבת...</p>',
      dailyStudyTitle: 'לימוד יומי',
      dailyStudyContent: '',
      childrensCornerTitle: 'פינת הילדים',
      childrensCornerContent: '',
      announcementsTitle: 'הודעות הקהילה',
      announcements: '<p>זמני שיעורים, תזכורות וכו\'...</p>',
      akkoZmanim: {
        candleLighting: '',
        havdalah: '',
        rabbeinuTam: ''
      },
      times: [
        { label: "כניסת שבת", time: "19:00" },
        { label: "מנחה ערב שבת", time: "19:10" },
        { label: "שחרית", time: "08:00" },
        { label: "מנחה של שבת", time: "18:30" },
        { label: 'ערבית מוצ"ש', time: "19:40" },
        { label: "צאת שבת", time: "20:00" },
      ],
      extraPages: [],
      backPage: {
        enabled: false,
        ads: ['', '', ''],
        dedications: {
          leiluyNishmat: '',
          refuahShlema: '',
          brachaVeHatzlacha: ''
        }
      },
      footerAd: '',
      sidebarAds: ['', '']
    };
  };

  const [data, setData] = useState<NewsletterData>(getInitialData);
  const [isFetchingAkkoZmanim, setIsFetchingAkkoZmanim] = useState(false);

  useEffect(() => {
    const adjustFit = () => {
      if (!newsletterRef.current) return;
      const contents = newsletterRef.current.querySelectorAll('.page-inner-content');
      const containers = newsletterRef.current.querySelectorAll('.a4-page');
      
      contents.forEach((content: any, index: number) => {
        const container = containers[index] as HTMLElement;
        if (!content || !container) return;

        // Reset styles to measure natural height
        content.style.transform = 'none';
        content.style.width = '100%';
        
        setTimeout(() => {
          // The container has h-[297mm] and p-[15mm].
          // Get the exact available height inside the padding
          const computedStyle = window.getComputedStyle(container);
          const paddingTop = parseFloat(computedStyle.paddingTop);
          const paddingBottom = parseFloat(computedStyle.paddingBottom);
          const targetHeight = container.clientHeight - paddingTop - paddingBottom;
          
          // scrollHeight of the content wrapper will reflect the actual content size
          let scrollHeight = content.scrollHeight;
          
          if (scrollHeight > targetHeight && targetHeight > 0) {
            // Content overflows. Let's find the optimal scale.
            let bestScale = 1;
            let min = 0.4; // minimum scale
            let max = 1.0;
            
            for (let i = 0; i < 15; i++) {
              const mid = (min + max) / 2;
              content.style.width = `${100 / mid}%`;
              if (content.scrollHeight * mid <= targetHeight) {
                bestScale = mid;
                min = mid; 
              } else {
                max = mid; 
              }
            }
            
            content.style.width = `${100 / bestScale}%`;
            content.style.transform = `scale(${bestScale})`;
            content.style.transformOrigin = 'top right';
          }
        }, 100);
      });
    };
    
    adjustFit();
  }, [data]);

  useEffect(() => {
    localStorage.setItem('newsletter-draft', JSON.stringify(data));
  }, [data]);

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

  const fetchAkkoZmanim = async () => {
    setIsFetchingAkkoZmanim(true);
    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
      const nextFriday = new Date(today);
      nextFriday.setDate(today.getDate() + daysUntilFriday);
      const dateStr = nextFriday.toISOString().split('T')[0];
      
      const res = await fetch(`https://www.hebcal.com/zmanim?cfg=json&latitude=32.9272&longitude=35.0818&tzid=Asia/Jerusalem&date=${dateStr}`);
      const zmanim = await res.json();
      
      const sunset = new Date(zmanim.times.sunset);
      const candleLighting = new Date(sunset.getTime() - 30 * 60000); // 30 minutes before sunset is the standard in Haifa/Akko
      const havdalah = new Date(zmanim.times.tzeit85deg); // 8.5 degrees is standard in Israel
      const rabbeinuTam = new Date(zmanim.times.tzeit72min);
      
      const formatTime = (d: Date) => d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });
      
      setData(prev => ({
        ...prev,
        akkoZmanim: {
          candleLighting: formatTime(candleLighting),
          havdalah: formatTime(havdalah),
          rabbeinuTam: formatTime(rabbeinuTam)
        }
      }));
    } catch (e) {
      console.error("Failed to fetch Akko zmanim", e);
    } finally {
      setIsFetchingAkkoZmanim(false);
    }
  };

  useEffect(() => {
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
      
      const shabbatTimes = getShabbatTimes('jerusalem', nextSaturday);
      const candleTime = shabbatTimes.candleLighting ? shabbatTimes.candleLighting.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : "";
      const havdalahTime = shabbatTimes.havdalah ? shabbatTimes.havdalah.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : "";

      setData(prev => {
        let needsUpdate = false;
        const updates: Partial<NewsletterData> = {};
        
        if (!prev.hebrewDate || !prev.parasha || prev.hebrewDate !== heDateStr) {
          const newTimes = [...(prev.times || [])];
          
          if (candleTime) {
            const candleIdx = newTimes.findIndex(t => t.label === "כניסת שבת" || t.label.includes("כניסת שבת") || t.label.includes("הדלקת נרות"));
            if (candleIdx >= 0) newTimes[candleIdx].time = candleTime;
          }
          if (havdalahTime) {
            const havdalahIdx = newTimes.findIndex(t => t.label === "צאת שבת" || t.label.includes("צאת שבת") || t.label.includes("הבדלה"));
            if (havdalahIdx >= 0) newTimes[havdalahIdx].time = havdalahTime;
          }

          needsUpdate = true;
          updates.parasha = parashaName || prev.parasha;
          updates.hebrewDate = heDateStr;
          updates.times = newTimes;
        }

        return needsUpdate ? { ...prev, ...updates } : prev;
      });
      
      // We must fetch outside of the setData updater function to avoid side effects during render
      setData(current => {
        if (!current.akkoZmanim?.candleLighting && !isFetchingAkkoZmanim) {
           setTimeout(() => fetchAkkoZmanim(), 0);
        }
        return current;
      });
    } catch (err) {
      console.error("Error calculating heb dates", err);
    }
  }, []);

  const handleExportPDF = async () => {
    if (!newsletterRef.current) return;
    
    setIsExporting(true);
    const toastId = toast.loading("מייצר קובץ PDF...");
    
    try {
      const root = document.documentElement;
      const originalDir = root.dir;
      root.dir = 'ltr';

      const el = newsletterRef.current;
      const clone = el.cloneNode(true) as HTMLElement;
      clone.dir = 'rtl';
      clone.style.gap = '0';
      const numPages = 1 + data.extraPages.length + (data.backPage?.enabled ? 1 : 0);
      clone.style.height = `${numPages * 297 - 0.5}mm`;
      clone.style.overflow = 'hidden';

      const outerContainer = document.createElement('div');
      outerContainer.style.position = 'absolute';
      outerContainer.style.top = '-9999px';
      outerContainer.style.left = '-9999px';
      outerContainer.style.zIndex = '-9999';
      outerContainer.dir = 'ltr';
      
      const scaledContainer = document.createElement('div');
      scaledContainer.style.transform = 'scale(1)';
      scaledContainer.style.transformOrigin = 'top left';
      scaledContainer.style.width = '210mm';
      
      scaledContainer.appendChild(clone);
      outerContainer.appendChild(scaledContainer);
      document.body.appendChild(outerContainer);

      await new Promise(resolve => setTimeout(resolve, 150));

      const opt = {
        margin:       0,
        filename:     `עלון-שבת-${data.parasha || 'קהילה'}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 3, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
      };

      await html2pdf().set(opt).from(scaledContainer).save();
      
      document.body.removeChild(outerContainer);
      root.dir = originalDir;

      toast.success("קובץ ה-PDF הופק בהצלחה!", { id: toastId });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("אירעה שגיאה ביצירת ה-PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const fetchArchives = async () => {
    const { data: dbArchives, error } = await supabase
      .from('newsletters')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && dbArchives) {
      setArchives(dbArchives);
    }
  };

  useEffect(() => {
    if (isArchivesOpen) {
      fetchArchives();
    }
  }, [isArchivesOpen]);

  const handleSaveArchive = async () => {
    setIsSavingArchive(true);
    try {
      const { error } = await supabase.from('newsletters').insert({
        parasha: data.parasha || 'כללי',
        hebrew_date: data.hebrewDate || '',
        data: data
      });
      if (error) throw error;
      toast.success('העלון נשמר לארכיון בהצלחה!');
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בשמירת העלון');
    } finally {
      setIsSavingArchive(false);
    }
  };

  const generateDvarTorah = async () => {
    if (!data.parasha) {
      toast.error("אנא בחר פרשה קודם");
      return;
    }
    
    // Attempt to get API key from environment, or ask user
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      const savedKey = localStorage.getItem('gemini_api_key');
      if (savedKey) {
        apiKey = savedKey;
      } else {
        apiKey = prompt("אנא הזן מפתח API של Google Gemini:");
        if (apiKey) {
          localStorage.setItem('gemini_api_key', apiKey);
        } else {
          return;
        }
      }
    }

    setIsGeneratingDvarTorah(true);
    const toastId = toast.loading("ה-AI כותב דבר תורה...");
    try {
      const promptText = `כתוב לי דבר תורה קצר ותמציתי מאוד (עד 80 מילים בלבד!) על פרשת ${data.parasha}. הדבר תורה מיועד לעלון שבת קהילתי מודפס וצפוף, ולכן עליו להיות קצר במיוחד. על המאמר לכלול מסר או מוסר השכל קצר ויפה. חשוב מאוד: הקפד לנקד את הטקסט במלואו (ניקוד מלא לכל המילים). החזר את התשובה בפורמט HTML נקי (רק תגיות p, strong, ul וכו') כדי שאוכל לשתול אותו ישירות. בלי עטיפת markdown של html.`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || "שגיאה מה-API");
      }

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanHtml = text.replace(/```html/g, '').replace(/```/g, '').trim();

      if (cleanHtml) {
        setData({ ...data, dvarTorahContent: cleanHtml });
        toast.success("דבר תורה נכתב בהצלחה!", { id: toastId });
      } else {
        throw new Error("לא התקבל טקסט");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`שגיאה ביצירת דבר התורה: ${err.message}`, { id: toastId });
    } finally {
      setIsGeneratingDvarTorah(false);
    }
  };

  const generateChildrensCorner = async () => {
    if (!data.parasha) {
      toast.error("אנא בחר פרשה קודם");
      return;
    }
    
    // Attempt to get API key from environment, or ask user
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      const savedKey = localStorage.getItem('gemini_api_key');
      if (savedKey) {
        apiKey = savedKey;
      } else {
        apiKey = prompt("אנא הזן מפתח API של Google Gemini:");
        if (apiKey) {
          localStorage.setItem('gemini_api_key', apiKey);
        } else {
          return;
        }
      }
    }

    setIsGeneratingChildrensCorner(true);
    const toastId = toast.loading("ה-AI כותב פינת ילדים...");
    try {
      const promptText = `כתוב לי סיפור קצרצר או חידה לילדים (עד 50 מילים בלבד!) על פרשת ${data.parasha} או לכבוד שבת. הטקסט מיועד לפינת הילדים בעלון שבת קהילתי מודפס וצפוף. על הקטע להיות מנוסח בשפה מותאמת ומרתקת לילדים, וקצר במיוחד. החזר את התשובה בפורמט HTML נקי (רק תגיות p, strong, ul וכו'). בלי עטיפת markdown.`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || "שגיאה מה-API");
      }

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanHtml = text.replace(/```html/g, '').replace(/```/g, '').trim();

      if (cleanHtml) {
        setData({ ...data, childrensCornerContent: cleanHtml });
        toast.success("פינת הילדים נכתבה בהצלחה!", { id: toastId });
      } else {
        throw new Error("לא התקבל טקסט");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`שגיאה ביצירת פינת הילדים: ${err.message}`, { id: toastId });
    } finally {
      setIsGeneratingChildrensCorner(false);
    }
  };

  const generateHalacha = async () => {
    if (!data.parasha) {
      toast.error("אנא בחר פרשה קודם");
      return;
    }
    
    // Attempt to get API key from environment, or ask user
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      const savedKey = localStorage.getItem('gemini_api_key');
      if (savedKey) {
        apiKey = savedKey;
      } else {
        apiKey = prompt("אנא הזן מפתח API של Google Gemini:");
        if (apiKey) {
          localStorage.setItem('gemini_api_key', apiKey);
        } else {
          return;
        }
      }
    }

    setIsGeneratingHalacha(true);
    const toastId = toast.loading("ה-AI כותב הלכה שבועית...");
    try {
      const promptText = `כתוב לי הלכה שבועית קצרה, שימושית ותמציתית מאוד (עד 40 מילים בלבד!) לפרשת ${data.parasha} או הלכה שקשורה לשבת/מועדים. הטקסט מיועד לפינת ההלכה בעלון שבת קהילתי מודפס, אז חובה לשמור על טקסט קצר מאוד. חשוב מאוד: הקפד לנקד את הטקסט במלואו (ניקוד מלא לכל המילים). החזר את התשובה בפורמט HTML נקי (רק תגיות p, strong, ul וכו'). בלי עטיפת markdown.`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || "שגיאה מה-API");
      }

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanHtml = text.replace(/```html/g, '').replace(/```/g, '').trim();

      if (cleanHtml) {
        setData({ ...data, halachaContent: cleanHtml });
        toast.success("הלכה שבועית נכתבה בהצלחה!", { id: toastId });
      } else {
        throw new Error("לא התקבל טקסט");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`שגיאה ביצירת ההלכה: ${err.message}`, { id: toastId });
    } finally {
      setIsGeneratingHalacha(false);
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setData({ ...data, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
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
        
        <div className="flex gap-2 w-full md:w-auto flex-wrap justify-end">
          <Button 
            variant="outline"
            onClick={handleSaveArchive}
            disabled={isSavingArchive}
            className="flex-1 md:flex-none shadow-sm"
          >
            {isSavingArchive ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
            <span className="hidden sm:inline">שמור לארכיון</span>
          </Button>

          <Dialog open={isArchivesOpen} onOpenChange={setIsArchivesOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 md:flex-none shadow-sm">
                <FolderOpen className="ml-2 h-4 w-4" />
                <span className="hidden sm:inline">טען מארכיון</span>
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>ארכיון עלונים</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {archives.length === 0 ? (
                   <p className="text-center text-muted-foreground py-8">אין עלונים בארכיון עדיין.</p>
                ) : (
                  <div className="grid gap-3">
                    {archives.map(arch => (
                      <Card key={arch.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
                        setData(arch.data);
                        setIsArchivesOpen(false);
                        toast.success("עלון נטען בהצלחה");
                      }}>
                        <CardContent className="p-4 flex justify-between items-center">
                          <div>
                            <div className="font-bold">פרשת {arch.parasha}</div>
                            <div className="text-sm text-muted-foreground">{arch.hebrew_date}</div>
                          </div>
                          <div className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                            {new Date(arch.created_at).toLocaleDateString('he-IL')}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline"
            onClick={() => {
              if(confirm('האם אתה בטוח שברצונך לאפס את כל התוכן?')) {
                localStorage.removeItem('newsletter-draft');
                window.location.reload();
              }
            }}
          >
            איפוס
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="content" className="text-xs md:text-sm"><FileText className="w-4 h-4 md:ml-1"/><span className="hidden md:inline">תוכן</span></TabsTrigger>
              <TabsTrigger value="times" className="text-xs md:text-sm"><Clock className="w-4 h-4 md:ml-1"/><span className="hidden md:inline">זמנים</span></TabsTrigger>
              <TabsTrigger value="design" className="text-xs md:text-sm"><Palette className="w-4 h-4 md:ml-1"/><span className="hidden md:inline">עיצוב</span></TabsTrigger>
              <TabsTrigger value="pages" className="text-xs md:text-sm"><FolderOpen className="w-4 h-4 md:ml-1"/><span className="hidden md:inline">עמודים</span></TabsTrigger>
              <TabsTrigger value="backpage" className="text-xs md:text-sm"><PanelBottom className="w-4 h-4 md:ml-1"/><span className="hidden md:inline">אחורי</span></TabsTrigger>
            </TabsList>
            
            <TabsContent value="design" className="space-y-4 mt-4">
              <Card className="shadow-sm border-t-4 border-t-purple-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">עיצוב ומיתוג</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>שם בית הכנסת</Label>
                    <Input 
                      value={data.synagogueName} 
                      onChange={e => setData({...data, synagogueName: e.target.value})} 
                      placeholder="לדוגמה: בית כנסת - ברית שלום עכו" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>תבנית עיצוב (Theme)</Label>
                    <Select value={data.theme} onValueChange={(val: any) => setData({...data, theme: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר תבנית" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic">קלאסי (מסגרות מסורתיות)</SelectItem>
                        <SelectItem value="modern">מודרני (נקי עם הצללות)</SelectItem>
                        <SelectItem value="minimal">מינימליסטי (שטח לבן ואלגנטי)</SelectItem>
                        <SelectItem value="newspaper">עיתון קלאסי (שחור-לבן, 3 עמודות)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>פונט (כותרות ומסגרת)</Label>
                    <Select value={data.fontFamily || 'Assistant'} onValueChange={(val: string) => setData({...data, fontFamily: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר גופן" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Assistant"><span style={{fontFamily: 'Assistant'}}>Assistant (מודרני וקריא)</span></SelectItem>
                        <SelectItem value="Heebo"><span style={{fontFamily: 'Heebo'}}>Heebo (עבה ומרשים)</span></SelectItem>
                        <SelectItem value="Frank Ruhl Libre"><span style={{fontFamily: 'Frank Ruhl Libre'}}>Frank Ruhl Libre (תורני קלאסי)</span></SelectItem>
                        <SelectItem value="David Libre"><span style={{fontFamily: 'David Libre'}}>David Libre (תורני מסורתי)</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>פונט (תוכן העלון)</Label>
                    <Select value={data.contentFontFamily || 'Frank Ruhl Libre'} onValueChange={(val: string) => setData({...data, contentFontFamily: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר גופן לתוכן" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Frank Ruhl Libre"><span style={{fontFamily: 'Frank Ruhl Libre'}}>Frank Ruhl Libre (תורני קלאסי)</span></SelectItem>
                        <SelectItem value="David Libre"><span style={{fontFamily: 'David Libre'}}>David Libre (תורני מסורתי)</span></SelectItem>
                        <SelectItem value="Assistant"><span style={{fontFamily: 'Assistant'}}>Assistant (מודרני וקריא)</span></SelectItem>
                        <SelectItem value="Heebo"><span style={{fontFamily: 'Heebo'}}>Heebo (עבה ומרשים)</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>גודל הכתב (לתוכן)</Label>
                    <Select value={data.fontSize || 'text-base'} onValueChange={(val: string) => setData({...data, fontSize: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר גודל כתב" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text-sm">קטן יותר (דוחס יותר טקסט בעמוד)</SelectItem>
                        <SelectItem value="text-base">רגיל (ברירת מחדל)</SelectItem>
                        <SelectItem value="text-lg">גדול וקריא (למבוגרים)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>לוגו בית הכנסת (אופציונלי)</Label>
                    <div className="flex items-center gap-4">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload}
                        className="flex-1"
                      />
                      {data.logo !== 'none' ? (
                        <Button variant="outline" size="sm" onClick={() => setData({...data, logo: 'none'})}>
                          הסר לוגו
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setData({...data, logo: ''})}>
                          הצג לוגו מחדל
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t">
                    <Label>פרסומת קבועה לתחתית כל עמוד (אופציונלי) <span className="text-slate-400 font-normal text-xs">(גובה מומלץ: כ-100 עד 200 פיקסלים, לרוחב העמוד)</span></Label>
                    <div className="flex items-center gap-4">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setData({...data, footerAd: reader.result as string});
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="flex-1"
                      />
                      {data.footerAd && (
                        <Button variant="destructive" size="sm" onClick={() => setData({...data, footerAd: ''})}>
                          הסר פרסומת
                        </Button>
                      )}
                    </div>
                    {data.footerAd && (
                      <div className="mt-2 h-12 w-full bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                        <img src={data.footerAd} alt="Footer Ad Preview" className="h-full object-contain" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="pages" className="space-y-4 mt-4">
              <Card className="shadow-sm border-t-4 border-t-blue-500">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">עמודים נוספים</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setData({
                      ...data, 
                      extraPages: [
                        ...data.extraPages, 
                        { id: Date.now().toString(), title: `עמוד נוסף ${data.extraPages.length + 1}`, content: '<p>הכנס תוכן כאן...</p>' }
                      ]
                    })}
                  >
                    + הוסף עמוד
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {data.extraPages.length === 0 ? (
                    <div className="text-center text-slate-500 py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      אין עמודים נוספים. לחץ על הכפתור למעלה כדי להוסיף עמוד חדש.
                    </div>
                  ) : (
                    data.extraPages.map((page, index) => (
                      <div key={page.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4 relative">
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="absolute -top-3 -left-3 h-8 w-8 rounded-full shadow-md z-10"
                          onClick={() => {
                            const newPages = [...data.extraPages];
                            newPages.splice(index, 1);
                            setData({...data, extraPages: newPages});
                          }}
                        >
                          &times;
                        </Button>
                        <div className="space-y-2">
                          <Label>כותרת העמוד (לא חובה)</Label>
                          <Input 
                            value={page.title} 
                            onChange={(e) => {
                              const newPages = [...data.extraPages];
                              newPages[index].title = e.target.value;
                              setData({...data, extraPages: newPages});
                            }} 
                            placeholder="למשל: המשך דבר תורה"
                          />
                        </div>
                        <div className="space-y-2" dir="ltr">
                          <Label className="text-right block" dir="rtl">תוכן העמוד</Label>
                          <ReactQuill 
                            theme="snow" 
                            value={page.content} 
                            onChange={(content) => {
                              const newPages = [...data.extraPages];
                              newPages[index].content = content;
                              setData({...data, extraPages: newPages});
                            }}
                            modules={modules}
                            formats={formats}
                            className="bg-white rounded-md text-right ql-editor-rtl"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="backpage" className="space-y-4 mt-4">
              <Card className="shadow-sm border-t-4 border-t-teal-500">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">עמוד אחורי (פרסומות והקדשות)</CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="enable-backpage" className="cursor-pointer">הפעל עמוד אחורי</Label>
                    <Switch 
                      id="enable-backpage"
                      checked={data.backPage?.enabled}
                      onCheckedChange={(checked) => setData({
                        ...data,
                        backPage: { ...data.backPage!, enabled: checked }
                      })}
                    />
                  </div>
                </CardHeader>
                {data.backPage?.enabled && (
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-bold border-b pb-2">פרסומות (עד 3)</h3>
                      {[0, 1, 2].map((idx) => (
                        <div key={idx} className="space-y-2 bg-slate-50 p-3 rounded border">
                          <Label>פרסומת {idx + 1} <span className="text-slate-400 font-normal text-xs mr-2">(גודל מומלץ: 1000x400 פיקסלים)</span></Label>
                          <div className="flex items-center gap-4">
                            <Input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    const newAds = [...data.backPage!.ads];
                                    newAds[idx] = reader.result as string;
                                    setData({
                                      ...data,
                                      backPage: { ...data.backPage!, ads: newAds }
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            {data.backPage.ads[idx] && (
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => {
                                  const newAds = [...data.backPage!.ads];
                                  newAds[idx] = '';
                                  setData({
                                    ...data,
                                    backPage: { ...data.backPage!, ads: newAds }
                                  });
                                }}
                              >
                                הסר
                              </Button>
                            )}
                          </div>
                          {data.backPage.ads[idx] && (
                            <div className="mt-2 h-32 w-full bg-slate-200 rounded overflow-hidden flex items-center justify-center">
                              <img src={data.backPage.ads[idx]} alt={`Ad ${idx+1}`} className="max-h-full object-contain" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold border-b pb-2">הקדשות (שורת טקסט רציפה)</h3>
                      <div className="space-y-2">
                        <Label>🕯️ לעילוי נשמת</Label>
                        <Input 
                          placeholder="שמות מופרדים בנקודה (למשל: רחל בת שרה • יעקב בן דוד)"
                          value={data.backPage.dedications.leiluyNishmat}
                          onChange={(e) => setData({
                            ...data,
                            backPage: {
                              ...data.backPage!,
                              dedications: { ...data.backPage!.dedications, leiluyNishmat: e.target.value }
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>❤️ לרפואה שלמה</Label>
                        <Input 
                          placeholder="שמות מופרדים בנקודה"
                          value={data.backPage.dedications.refuahShlema}
                          onChange={(e) => setData({
                            ...data,
                            backPage: {
                              ...data.backPage!,
                              dedications: { ...data.backPage!.dedications, refuahShlema: e.target.value }
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>💰 ברכה והצלחה</Label>
                        <Input 
                          placeholder="שמות מופרדים בנקודה"
                          value={data.backPage.dedications.brachaVeHatzlacha}
                          onChange={(e) => setData({
                            ...data,
                            backPage: {
                              ...data.backPage!,
                              dedications: { ...data.backPage!.dedications, brachaVeHatzlacha: e.target.value }
                            }
                          })}
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </TabsContent>

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
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">הלכה שבועית</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateHalacha}
                    disabled={isGeneratingHalacha}
                    className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    {isGeneratingHalacha ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    צור בעזרת AI
                  </Button>
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

              <Card className="shadow-sm border-t-4 border-t-pink-500">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">פינת הילדים</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateChildrensCorner}
                    disabled={isGeneratingChildrensCorner}
                    className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    {isGeneratingChildrensCorner ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    צור בעזרת AI
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>כותרת</Label>
                    <Input 
                      value={data.childrensCornerTitle}
                      onChange={(e) => setData({ ...data, childrensCornerTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2" dir="ltr">
                    <Label className="text-right block" dir="rtl">תוכן</Label>
                    <ReactQuill 
                      theme="snow" 
                      value={data.childrensCornerContent} 
                      onChange={(content) => setData({ ...data, childrensCornerContent: content })}
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

              <Card className="shadow-sm border-t-4 border-t-indigo-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">לימוד יומי</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>כותרת (לדוגמה: הדף היומי / רמב"ם)</Label>
                    <Input 
                      value={data.dailyStudyTitle}
                      onChange={(e) => setData({ ...data, dailyStudyTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2" dir="ltr">
                    <Label className="text-right block" dir="rtl">תוכן</Label>
                    <ReactQuill 
                      theme="snow" 
                      value={data.dailyStudyContent} 
                      onChange={(content) => setData({ ...data, dailyStudyContent: content })}
                      modules={modules}
                      formats={formats}
                      className="bg-white rounded-md text-right ql-editor-rtl"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-t-4 border-t-emerald-500">
                <CardHeader className="pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">זמני שבת עכו</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchAkkoZmanim}
                    disabled={isFetchingAkkoZmanim}
                    className="flex items-center gap-2"
                  >
                    {isFetchingAkkoZmanim ? <Loader2 className="w-4 h-4 animate-spin" /> : "עדכן זמנים אוטומטית"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>כניסת שבת</Label>
                      <Input 
                        value={data.akkoZmanim?.candleLighting || ''}
                        onChange={(e) => setData({ ...data, akkoZmanim: { ...data.akkoZmanim!, candleLighting: e.target.value } })}
                        placeholder="19:20"
                        dir="ltr"
                        className="text-center"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>צאת שבת</Label>
                      <Input 
                        value={data.akkoZmanim?.havdalah || ''}
                        onChange={(e) => setData({ ...data, akkoZmanim: { ...data.akkoZmanim!, havdalah: e.target.value } })}
                        placeholder="20:25"
                        dir="ltr"
                        className="text-center"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>רבנו תם</Label>
                      <Input 
                        value={data.akkoZmanim?.rabbeinuTam || ''}
                        onChange={(e) => setData({ ...data, akkoZmanim: { ...data.akkoZmanim!, rabbeinuTam: e.target.value } })}
                        placeholder="20:55"
                        dir="ltr"
                        className="text-center"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-t-4 border-t-purple-500">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">פרסומות מתחת לזמנים</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[0, 1].map((index) => (
                    <div key={index} className="space-y-2">
                      <Label>פרסומת {index + 1}</Label>
                      {data.sidebarAds?.[index] ? (
                        <div className="relative inline-block border rounded overflow-hidden">
                          <img src={data.sidebarAds[index]} alt={`Ad ${index + 1}`} className="h-20 object-contain" />
                          <Button 
                            variant="destructive" 
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 rounded-full"
                            onClick={() => {
                              const newAds = [...(data.sidebarAds || ['', ''])];
                              newAds[index] = '';
                              setData({ ...data, sidebarAds: newAds });
                            }}
                          >
                            <span className="sr-only">Remove</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </Button>
                        </div>
                      ) : (
                        <Input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const newAds = [...(data.sidebarAds || ['', ''])];
                                newAds[index] = event.target?.result as string;
                                setData({ ...data, sidebarAds: newAds });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      )}
                    </div>
                  ))}
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
                    <div className="flex justify-between items-center mb-1">
                      <Label>תוכן דבר התורה</Label>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={generateDvarTorah}
                        disabled={isGeneratingDvarTorah}
                        className="h-8 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        {isGeneratingDvarTorah ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        כתוב לי ב-AI
                      </Button>
                    </div>
                    <ReactQuill theme="snow" value={data.dvarTorahContent} onChange={(val) => setData({...data, dvarTorahContent: val})} modules={modules} formats={formats} className="bg-white rounded-md mb-2" />
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
          <div className="relative mx-auto transform-gpu origin-top transition-transform duration-300" style={{ transform: 'scale(0.85)' }}>
            
            <div ref={newsletterRef} className="flex flex-col gap-8 bg-transparent">
              <style>
                {`
                  .prose, .content-font { font-family: '${data.contentFontFamily || 'Frank Ruhl Libre'}' !important; }
                `}
              </style>

              {/* PAGE 1: Main Newsletter */}
              <div 
                className={`a4-page shadow-2xl w-[210mm] h-[297mm] overflow-hidden text-black p-[10mm] relative flex flex-col ${data.fontSize || 'text-base'} ${data.theme === 'modern' ? 'bg-slate-50' : 'bg-white'}`}
                style={{ direction: 'rtl', fontFamily: data.fontFamily || 'Assistant' }}
              >
                {/* Outer Page Styles by Theme */}
                {data.theme === 'classic' && (
                  <>
                    <div className="absolute inset-4 border border-primary/40 pointer-events-none rounded-xl z-0"></div>
                    <div className="absolute inset-[1.1rem] border border-primary/10 pointer-events-none rounded-lg z-0"></div>
                  </>
                )}
                {data.theme === 'modern' && (
                  <div className="absolute top-0 left-0 right-0 h-[150px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none z-0"></div>
                )}
                {data.theme === 'minimal' && (
                  <div className="absolute inset-4 border-b-2 border-t-2 border-slate-200 pointer-events-none z-0"></div>
                )}
                
                <div className="relative z-10 flex-1 flex flex-col page-inner-content">
                {data.theme === 'newspaper' ? (
                  <div className="flex-1 flex flex-col">
                    {/* Newspaper Header */}
                    <div className="flex justify-between items-start border-b-4 border-double border-slate-900 pb-4 mb-6 mt-2">
                      <div className="flex-1 flex flex-col justify-center text-right pr-2">
                        <h2 className="text-xl font-bold text-slate-900 mb-1">{data.synagogueName}</h2>
                        <div className="text-slate-800 font-bold text-sm">
                          <span>פרשת {data.parasha}</span>
                          <span className="mx-2">•</span>
                          <span>{data.hebrewDate}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center flex-[1.5]">
                        {(data.logo !== 'none') && (
                          <img src={data.logo || defaultLogo} alt="Logo" className="h-16 w-auto object-contain mb-2 grayscale" />
                        )}
                        <h1 className="text-6xl font-black text-slate-900 tracking-tighter" style={{ fontFamily: '"Frank Ruhl Libre", serif' }}>עלון שבת</h1>
                      </div>
                      
                      {/* Zmanim Top Left */}
                      <div className="flex-1 pl-2 flex justify-end">
                        <div className="border-[3px] border-slate-900 p-2 bg-white w-52 text-sm">
                          <div className="bg-slate-900 text-white text-center font-bold mb-2 py-1">זמני כניסה ויציאת השבת</div>
                          <div className="space-y-1">
                            {data.times.map((t, idx) => (
                              <div key={idx} className="flex justify-between items-center border-b border-slate-300 pb-1 last:border-0 last:pb-0">
                                <span className="font-semibold text-slate-900">{t.label}</span>
                                <span className="font-bold text-slate-900 tabular-nums" dir="ltr">{t.time}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Newspaper Columns */}
                    <div className="grid grid-cols-12 gap-6 flex-1">
                      {/* Right Column (Sidebar 1) */}
                      <div className="col-span-3 flex flex-col gap-5 border-l border-slate-400 pl-5">
                        {data.halachaTitle && (
                          <div className="border border-slate-900 p-3 bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-900 pb-1 mb-2">
                              {data.halachaTitle}
                            </h3>
                            <div className={`prose ${data.fontSize === 'text-sm' ? 'prose-sm' : data.fontSize === 'text-lg' ? 'prose-lg' : ''} prose-p:leading-tight text-slate-800 [&>p]:mb-2`} dangerouslySetInnerHTML={{ __html: data.halachaContent }} />
                          </div>
                        )}
                        
                        {data.dailyStudyTitle && data.dailyStudyContent && data.dailyStudyContent !== '<p><br></p>' && (
                          <div className="border-t-2 border-slate-900 pt-3">
                            <h3 className="text-base font-bold text-white bg-slate-900 px-2 py-1 inline-block mb-2">{data.dailyStudyTitle}</h3>
                            <div className={`prose ${data.fontSize === 'text-sm' ? 'prose-sm' : data.fontSize === 'text-lg' ? 'prose-lg' : ''} text-slate-800`} dangerouslySetInnerHTML={{ __html: data.dailyStudyContent }} />
                          </div>
                        )}
                      </div>

                      {/* Center Column (Main Dvar Torah) */}
                      <div className="col-span-6 flex flex-col pr-1 pl-1">
                         {data.dvarTorahTitle && (
                           <div>
                             <h3 className="text-4xl font-black text-slate-900 text-center mb-6 leading-tight" style={{ fontFamily: '"Frank Ruhl Libre", serif' }}>
                               {data.dvarTorahTitle}
                             </h3>
                             <div 
                               className="prose prose-slate max-w-none text-slate-900 leading-relaxed text-justify columns-2 gap-6 [&>p]:mb-4"
                               dangerouslySetInnerHTML={{ __html: data.dvarTorahContent }}
                             />
                           </div>
                         )}
                      </div>

                      {/* Left Column (Sidebar 2) */}
                      <div className="col-span-3 flex flex-col gap-5 border-r border-slate-400 pr-5">
                        {data.announcementsTitle && (
                          <div className="border border-slate-900 p-3 relative mt-2">
                            <div className="absolute -top-3 right-3 bg-white px-2">
                                <h3 className="text-base font-bold text-slate-900">{data.announcementsTitle}</h3>
                            </div>
                            <div className={`prose ${data.fontSize === 'text-sm' ? 'prose-sm' : data.fontSize === 'text-lg' ? 'prose-lg' : ''} text-slate-800 mt-2 [&>p]:mb-2`} dangerouslySetInnerHTML={{ __html: data.announcements }} />
                          </div>
                        )}

                        {data.childrensCornerTitle && data.childrensCornerContent && data.childrensCornerContent !== '<p><br></p>' && (
                          <div className="border-t-4 border-double border-slate-900 pt-3">
                            <h3 className="text-lg font-bold text-slate-900 mb-2 text-center">{data.childrensCornerTitle}</h3>
                            <div className={`prose ${data.fontSize === 'text-sm' ? 'prose-sm' : data.fontSize === 'text-lg' ? 'prose-lg' : ''} text-slate-800`} dangerouslySetInnerHTML={{ __html: data.childrensCornerContent }} />
                          </div>
                        )}

                        {data.akkoZmanim && (
                          <div className="border-2 border-slate-900 mt-auto bg-slate-100 flex flex-col items-center">
                            <div className="bg-slate-900 text-white font-bold text-center py-1 w-full text-lg">זמני שבת עכו</div>
                            <div className="p-3 w-full space-y-2">
                              <div className="flex justify-between font-bold border-b border-slate-300 pb-1">
                                <span>כניסת שבת</span><span className="text-slate-900">{data.akkoZmanim.candleLighting || '---'}</span>
                              </div>
                              <div className="flex justify-between font-bold border-b border-slate-300 pb-1">
                                <span>צאת שבת</span><span className="text-slate-900">{data.akkoZmanim.havdalah || '---'}</span>
                              </div>
                              <div className="flex justify-between font-bold text-slate-700">
                                <span>רבנו תם</span><span>{data.akkoZmanim.rabbeinuTam || '---'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Sidebar Ads */}
                        {data.sidebarAds && (
                          <div className="mt-4 space-y-4 flex flex-col items-center w-full">
                            {data.sidebarAds.map((ad, idx) => ad ? (
                              <img key={idx} src={ad} alt={`Ad ${idx + 1}`} className="w-full h-auto object-contain rounded-md shadow-sm border border-slate-300" />
                            ) : (
                              <div key={idx} className="w-full bg-[#42b8c5] rounded-md p-3 text-center shadow-sm border border-[#42b8c5]/20">
                                <span className="text-white font-bold text-sm leading-tight inline-block">מעוניינים לפרסם בעלון? פנו לגבאי בית הכנסת</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header for Standard Themes */}
                    <div className={`flex flex-col items-center text-center mb-8 pb-6 ${data.theme === 'minimal' ? 'border-none' : 'border-b border-primary/20'} mt-2`}>
                      {(data.logo !== 'none') && (
                        <img src={data.logo || defaultLogo} alt="Logo" className="h-20 w-auto object-contain mb-4 rounded" />
                      )}
                      <h1 className={`font-black text-primary mb-3 tracking-tight ${data.theme === 'minimal' ? 'text-4xl uppercase tracking-widest' : 'text-5xl drop-shadow-sm'}`}>עלון שבת</h1>
                      <h2 className={`text-2xl font-bold ${data.theme === 'modern' ? 'text-primary/80' : 'text-gray-800'} mb-4`}>{data.synagogueName}</h2>
                      <div className={`flex justify-center items-center gap-4 text-primary font-bold ${data.theme === 'modern' ? 'bg-white shadow-sm' : 'bg-primary/5'} py-1.5 px-6 rounded-full border border-primary/10`}>
                        <span>פרשת {data.parasha}</span>
                        <span className="text-primary/40">•</span>
                        <span>{data.hebrewDate}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-8 flex-1">
                      {/* Main Content Column */}
                      <div className="col-span-8 space-y-6">
                        {/* Dvar Torah */}
                        {data.dvarTorahTitle && (
                          <div className={`${data.theme === 'modern' ? 'bg-white p-6 rounded-2xl shadow-sm border border-slate-100' : data.theme === 'minimal' ? 'bg-transparent' : 'bg-white'}`}>
                            <h3 className={`text-2xl font-bold text-primary mb-4 pb-2 ${data.theme === 'minimal' ? 'border-b border-slate-200' : 'border-b-2 border-primary/20 inline-block'}`}>
                              {data.dvarTorahTitle}
                            </h3>
                            <div 
                              className="prose prose-slate max-w-none text-gray-800 leading-relaxed text-justify [&>p]:mb-4 [&>ul]:list-disc [&>ul]:mr-5 [&>ol]:list-decimal [&>ol]:mr-5 [&>strong]:font-bold"
                              dangerouslySetInnerHTML={{ __html: data.dvarTorahContent }}
                            />
                          </div>
                        )}

                        {/* Halacha */}
                        {data.halachaTitle && (
                          <div className={`${data.theme === 'modern' ? 'bg-white p-5 rounded-xl shadow-sm border border-slate-100' : data.theme === 'minimal' ? 'bg-transparent pt-4 border-t border-slate-100' : 'bg-slate-50 p-5 rounded-xl border border-slate-100'}`}>
                            <h3 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
                              {data.theme !== 'minimal' && <span className="w-2 h-2 bg-primary rounded-full"></span>}
                              {data.halachaTitle}
                            </h3>
                            <div 
                              className={`prose ${data.fontSize === 'text-sm' ? 'prose-sm' : data.fontSize === 'text-lg' ? 'prose-lg' : ''} max-w-none text-gray-700 leading-relaxed [&>p]:mb-2 [&>ul]:list-disc [&>ul]:mr-5`}
                              dangerouslySetInnerHTML={{ __html: data.halachaContent }}
                            />
                          </div>
                        )}

                        {/* Announcements */}
                        {data.announcementsTitle && (
                          <div className={`${data.theme === 'modern' ? 'bg-white p-5 rounded-xl shadow-sm border border-slate-100' : data.theme === 'minimal' ? 'bg-transparent pt-4 border-t border-slate-100' : 'bg-primary/5 p-5 rounded-xl border border-primary/10'}`}>
                            <h3 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
                              {data.theme !== 'minimal' && <span className="w-2 h-2 bg-primary rounded-full"></span>}
                              {data.announcementsTitle}
                            </h3>
                            <div 
                              className={`prose ${data.fontSize === 'text-sm' ? 'prose-sm' : data.fontSize === 'text-lg' ? 'prose-lg' : ''} max-w-none text-gray-700 leading-relaxed [&>p]:mb-2`}
                              dangerouslySetInnerHTML={{ __html: data.announcements }}
                            />
                          </div>
                        )}
                        
                        {/* Children's Corner */}
                        {data.childrensCornerTitle && data.childrensCornerContent && data.childrensCornerContent !== '<p><br></p>' && (
                          <div className={`mt-6 ${data.theme === 'modern' ? 'bg-gradient-to-br from-pink-50 to-white p-5 rounded-xl shadow-sm border border-pink-100' : data.theme === 'minimal' ? 'bg-transparent pt-4 border-t border-slate-100' : 'bg-pink-50 p-5 rounded-xl border border-pink-100'}`}>
                            <h3 className="text-xl font-bold text-pink-600 mb-3 flex items-center gap-2">
                              {data.theme !== 'minimal' && <span className="w-2 h-2 bg-pink-500 rounded-full"></span>}
                              {data.childrensCornerTitle}
                            </h3>
                            <div 
                              className={`prose ${data.fontSize === 'text-sm' ? 'prose-sm' : data.fontSize === 'text-lg' ? 'prose-lg' : ''} max-w-none text-gray-800 leading-relaxed [&>p]:mb-2`}
                              dangerouslySetInnerHTML={{ __html: data.childrensCornerContent }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Sidebar Column */}
                      <div className="col-span-4 space-y-6">
                        {/* Prayer Times */}
                        <div className={`${data.theme === 'modern' ? 'bg-white rounded-2xl border-0 shadow-md overflow-hidden' : data.theme === 'minimal' ? 'bg-transparent border-t-2 border-slate-800 pt-2' : 'bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm'}`}>
                          <div className={`${data.theme === 'modern' ? 'bg-primary/5 text-primary' : data.theme === 'minimal' ? 'bg-transparent text-slate-800 text-right text-xl border-b-2 border-slate-800 pb-2 mb-2' : 'bg-primary/10 text-primary border-b border-primary/10'} font-bold text-center py-3`}>
                            זמני התפילות - ברית שלום עכו
                          </div>
                          <div className={`${data.theme === 'minimal' ? 'p-0' : 'p-4'} space-y-3`}>
                            {data.times.map((t, idx) => (
                              <div key={idx} className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2 last:border-0 last:pb-0">
                                <span className="font-semibold text-gray-700">{t.label}</span>
                                <span className="font-bold text-primary tabular-nums tracking-wider" dir="ltr">{t.time}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Daily Study */}
                        {data.dailyStudyTitle && data.dailyStudyContent && data.dailyStudyContent !== '<p><br></p>' && (
                          <div className={`${data.theme === 'modern' ? 'bg-white rounded-2xl border-0 shadow-md overflow-hidden' : data.theme === 'minimal' ? 'bg-transparent border-t-2 border-slate-800 pt-2 mt-8' : 'bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm'}`}>
                            <div className={`${data.theme === 'modern' ? 'bg-indigo-50 text-indigo-700' : data.theme === 'minimal' ? 'bg-transparent text-slate-800 text-right text-xl border-b-2 border-slate-800 pb-2 mb-2' : 'bg-indigo-50 text-indigo-800 border-b border-indigo-100'} font-bold text-center py-3`}>
                              {data.dailyStudyTitle}
                            </div>
                            <div className={`${data.theme === 'minimal' ? 'p-0 pt-2' : 'p-4'}`}>
                              <div 
                                className={`prose ${data.fontSize === 'text-sm' ? 'prose-sm' : data.fontSize === 'text-lg' ? 'prose-lg' : ''} max-w-none text-slate-700 leading-relaxed text-center`}
                                dangerouslySetInnerHTML={{ __html: data.dailyStudyContent }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Akko Zmanim */}
                        {data.akkoZmanim && (
                          <div className={`${data.theme === 'modern' ? 'bg-white rounded-2xl border-0 shadow-md overflow-hidden mt-6' : data.theme === 'minimal' ? 'bg-transparent border-t-2 border-slate-800 pt-2 mt-8' : 'bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mt-6'}`}>
                            <div className={`${data.theme === 'modern' ? 'bg-indigo-600 text-white' : data.theme === 'minimal' ? 'bg-transparent text-slate-800 text-center text-2xl border-b-2 border-slate-800 pb-2 mb-2' : 'bg-slate-800 text-white border-b border-slate-200'} font-bold text-center py-3 text-lg`}>
                              זמני שבת - עכו והסביבה
                            </div>
                            <div className={`${data.theme === 'minimal' ? 'p-0 pt-4' : 'p-5'} text-slate-800 text-center leading-relaxed font-medium`}>
                              <div className="grid grid-cols-1 gap-3">
                                <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                                  <span className="text-slate-600 font-bold">כניסת שבת</span>
                                  <span className="text-xl font-black text-indigo-700">{data.akkoZmanim.candleLighting || '---'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                                  <span className="text-slate-600 font-bold">צאת שבת</span>
                                  <span className="text-xl font-black text-indigo-700">{data.akkoZmanim.havdalah || '---'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                                  <span className="text-slate-500">צאת שבת (רבנו תם)</span>
                                  <span className="text-lg font-bold text-slate-700">{data.akkoZmanim.rabbeinuTam || '---'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Sidebar Ads */}
                        {data.sidebarAds && (
                          <div className="mt-4 space-y-4 flex flex-col items-center w-full">
                            {data.sidebarAds.map((ad, idx) => ad ? (
                              <img key={idx} src={ad} alt={`Ad ${idx + 1}`} className="w-full h-auto object-contain rounded-xl shadow-sm border border-slate-100" />
                            ) : (
                              <div key={idx} className="w-full bg-[#42b8c5] rounded-xl p-3 text-center shadow-sm">
                                <span className="text-white font-bold text-sm leading-tight inline-block">מעוניינים לפרסם בעלון? פנו לגבאי בית הכנסת</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Footer Ad or Fallback */}
                {data.footerAd ? (
                  <div className="mt-auto pt-4 flex justify-center w-full">
                    <img src={data.footerAd} alt="Footer Ad" className="max-h-[150px] object-contain w-full" />
                  </div>
                ) : (
                  <div className="mt-auto pt-4 w-full">
                    <div className="bg-[#42b8c5] rounded-lg p-3 text-center shadow-sm">
                      <span className="text-white font-bold text-sm">מעוניינים לפרסם בעלון? פנו לגבאי בית הכנסת</span>
                    </div>
                  </div>
                )}
                </div>
              </div>

              {/* EXTRA PAGES */}
              {data.extraPages.map((page) => (
                <div 
                  key={page.id}
                  className={`a4-page shadow-2xl w-[210mm] h-[297mm] overflow-hidden text-black p-[10mm] relative flex flex-col ${data.fontSize || 'text-base'} ${data.theme === 'modern' ? 'bg-slate-50' : 'bg-white'}`}
                  style={{ direction: 'rtl', fontFamily: data.fontFamily || 'Assistant' }}
                >
                  {/* Theme Backgrounds */}
                  {data.theme === 'classic' && (
                    <>
                      <div className="absolute inset-4 border border-primary/40 pointer-events-none rounded-xl z-0"></div>
                      <div className="absolute inset-[1.1rem] border border-primary/10 pointer-events-none rounded-lg z-0"></div>
                    </>
                  )}
                  {data.theme === 'modern' && (
                    <div className="absolute top-0 left-0 right-0 h-[150px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none z-0"></div>
                  )}
                  {data.theme === 'minimal' && (
                    <div className="absolute inset-4 border-b-2 border-t-2 border-slate-200 pointer-events-none z-0"></div>
                  )}

                  <div className="relative z-10 flex-1 flex flex-col page-inner-content">
                    {page.title && <h2 className="text-3xl font-bold mb-6 text-center text-primary" style={{ fontFamily: '"Frank Ruhl Libre", serif' }}>{page.title}</h2>}
                    <div 
                      className="prose prose-slate max-w-none text-gray-800 leading-relaxed text-justify [&>p]:mb-4 [&>ul]:list-disc [&>ul]:mr-5 [&>ol]:list-decimal [&>ol]:mr-5 [&>strong]:font-bold"
                      dangerouslySetInnerHTML={{ __html: page.content }}
                    />
                  </div>

                  {/* Extra Page Footer Ad or Fallback */}
                  {data.footerAd ? (
                    <div className="mt-4 pt-4 border-t border-slate-200 flex justify-center w-full relative z-10">
                      <img src={data.footerAd} alt="Footer Ad" className="max-h-[150px] object-contain w-full" />
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-slate-200 w-full relative z-10">
                      <div className="bg-[#42b8c5] rounded-lg p-3 text-center shadow-sm">
                        <span className="text-white font-bold text-sm">מעוניינים לפרסם בעלון? פנו לגבאי בית הכנסת</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* BACK PAGE */}
              {data.backPage?.enabled && (
                <div 
                  className={`a4-page shadow-2xl bg-white w-[210mm] h-[297mm] overflow-hidden text-black relative flex flex-col`}
                  style={{ direction: 'rtl', fontFamily: data.fontFamily || 'Assistant' }}
                >
                  {/* Ads Section */}
                  <div className="flex-1 flex flex-col p-[15mm] pb-0 gap-4">
                    {data.backPage.ads.map((ad, idx) => (
                      ad ? (
                        <div key={idx} className="flex-1 rounded-xl overflow-hidden shadow-sm border border-slate-100 flex items-center justify-center">
                          <img src={ad} alt={`Ad ${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div key={idx} className="flex-1 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400/80 p-4 text-center">
                          <span className="font-bold text-xl">מעוניינים לפרסם בעלון? פנו לגבאי בית הכנסת</span>
                        </div>
                      )
                    ))}
                  </div>

                  {/* Dedications Section */}
                  <div className="bg-[#42b8c5] mt-[10mm] p-6 text-white relative min-h-[120px] flex items-center">
                    <div className="flex-1 space-y-3 pr-4 relative z-10">
                      {data.backPage.dedications.leiluyNishmat && (
                        <div className="flex items-start gap-2 text-sm leading-tight">
                          <span className="text-xl">🕯️</span>
                          <div>
                            <span className="font-bold">לעילוי נשמת: </span>
                            <span>{data.backPage.dedications.leiluyNishmat}</span>
                          </div>
                        </div>
                      )}
                      {data.backPage.dedications.refuahShlema && (
                        <div className="flex items-start gap-2 text-sm leading-tight">
                          <span className="text-xl">❤️</span>
                          <div>
                            <span className="font-bold">רפואה שלמה: </span>
                            <span>{data.backPage.dedications.refuahShlema}</span>
                          </div>
                        </div>
                      )}
                      {data.backPage.dedications.brachaVeHatzlacha && (
                        <div className="flex items-start gap-2 text-sm leading-tight">
                          <span className="text-xl">💰</span>
                          <div>
                            <span className="font-bold">ברכה והצלחה וכל הישועות: </span>
                            <span>{data.backPage.dedications.brachaVeHatzlacha}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Gold Badge */}
                    <div className="w-[140px] h-[140px] bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 rounded-full absolute left-8 -top-8 shadow-xl border-4 border-white flex flex-col items-center justify-center text-center p-2 transform -rotate-6 z-20">
                      <div className="font-black text-slate-900 text-3xl leading-none">העלון<br/>מוקדש</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
