import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanSearch, UploadCloud, Camera, RefreshCw, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ScanResult {
  name: string;
  confidence: number;
  kosher: boolean;
  danger: string | null;
  description: string;
  tips: string;
  minSize?: string;
  bestBait?: string;
}

export default function Identify() {
  const { points, profileData, updateProfileField } = useAuth();
  const aiCredits = profileData?.ai_credits || 0;
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [manualName, setManualName] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        analyzeImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64Str: string) => {
    if (aiCredits < 1) {
      toast.error("אין לך מספיק סריקות AI! תוכל לרכוש חבילת סריקות בחנות.");
      return;
    }

    setIsScanning(true);
    setResult(null);
    
    // Deduct credit
    try {
      await updateProfileField('ai_credits', aiCredits - 1);
    } catch (e) {
      // Ignore
    }

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        toast.info("מפתח API של Gemini לא נמצא, מציג תוצאה להדגמה.");
        await new Promise(resolve => setTimeout(resolve, 2000));
        setResult({
          name: "לוקוס לבן (דקר)",
          confidence: 96,
          kosher: true,
          danger: null,
          description: "דג טורף ממשפחת הדקריים, נחשב לאחד ממשובחי הדגים בים התיכון.",
          tips: "מומלץ להשתמש בשיטת ז'רז'ור עם דמויים גדולים או פיתיון חי ליד סלעים.",
          minSize: "45 ס״מ (חוק הגנת הדייג בישראל)",
          bestBait: "סבידה / תמנון / דמוי שוקע 120 מ״מ"
        });
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      
      const mimeMatch = base64Str.match(/^data:(image\/[a-zA-Z0-9]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const base64Data = base64Str.split(",")[1];
      
      const prompt = `
        You are an expert marine biologist and fisherman in Israel (Mediterranean Sea, Red Sea, Sea of Galilee).
        Identify the fish in this image with maximum accuracy.
        First, analyze the shape, fins, scales, color patterns, and mouth.
        Consider common Israeli fish: דניס, ברמונדי, לוקוס, פרידה, אנטיאס, פלמידה, גומבר, בורי, אראס, אבו נפחא, מרמיר, סרגוס, טרכון, שולה, טונה שחורה, חרב.
        If it's an invasive species from the Red Sea (Lessepsian migration), note it.
        If the image DOES NOT contain a fish or marine creature, return "לא זוהה דג בתמונה" for the name, 0 for confidence, and explain what you see in the description.
        Respond in pure JSON format (without markdown blocks) with the following structure:
        {
          "name": "Hebrew name of the fish (and common nickname)",
          "confidence": number between 0-100,
          "kosher": boolean,
          "danger": "string warning if it's venomous/poisonous (like Aras or Abu Nafha), otherwise null",
          "description": "Short description in Hebrew",
          "tips": "One short fishing tip or culinary tip in Hebrew",
          "minSize": "Minimum legal catch size in Israel (e.g. 45 ס״מ) or 'אין הגבלה'",
          "bestBait": "Recommended bait in Hebrew"
        }
      `;

      let text = "";
      try {
        // Try Pro first
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const aiResult = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType: mimeType } }
        ]);
        text = aiResult.response.text();
      } catch (proError: any) {
        console.warn("Pro model failed, falling back to Flash:", proError);
        // Fallback to Flash (handles rate limits or model availability issues)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const aiResult = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType: mimeType } }
        ]);
        text = aiResult.response.text();
      }
      
      // Robust JSON extraction
      let cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
      }
      
      const parsedResult = JSON.parse(cleanedText);
      setResult(parsedResult);
      
    } catch (error: any) {
      console.error("AI Error:", error);
      toast.error(`שגיאה בזיהוי התמונה: ${error.message || 'נסה שוב'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    setImage(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto min-h-[calc(100vh-80px)] flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col px-4 mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          זיהוי דגים חכם <ScanSearch className="w-6 h-6 text-blue-500" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1 mb-2">
          צלם או העלה תמונה, וה-AI שלנו יזהה את הדג
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-600 rounded-full text-xs font-bold border border-indigo-500/20 w-fit">
          <ScanSearch className="w-3.5 h-3.5" /> נשארו לך {aiCredits} סריקות AI
        </div>
      </div>

      <div className="flex-1 px-4 flex flex-col">
        
        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        <AnimatePresence mode="wait">
          {!image ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex-1 flex flex-col items-center justify-center space-y-6"
            >
              <div 
                className="w-48 h-48 rounded-full bg-blue-500/10 border-4 border-dashed border-blue-500/30 flex items-center justify-center cursor-pointer hover:bg-blue-500/20 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-16 h-16 text-blue-500/50" />
              </div>
              
              <div className="w-full space-y-3">
                <Button 
                  className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-5 h-5 ml-2" /> צלם / העלה תמונה (סריקה 1)
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full h-14 text-base rounded-2xl gap-2 bg-background shadow-sm"
                  onClick={() => fileInputRef.current?.click()} // Can also be specific to gallery
                >
                  <UploadCloud className="w-5 h-5 text-blue-500" />
                  העלה מהגלריה
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-4"
            >
              <Card className="overflow-hidden border-border/50 shadow-sm relative rounded-3xl">
                <div className="h-64 w-full bg-muted relative">
                  <img src={image} alt="Scanned fish" className="w-full h-full object-cover" />
                  
                  {isScanning && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center">
                      {/* Scanning Animation */}
                      <div className="relative w-32 h-32 mb-4">
                        <div className="absolute inset-0 border-2 border-blue-500/30 rounded-3xl"></div>
                        <div className="absolute top-0 start-0 w-4 h-4 border-t-2 border-s-2 border-blue-400 rounded-tl-xl"></div>
                        <div className="absolute top-0 end-0 w-4 h-4 border-t-2 border-e-2 border-blue-400 rounded-tr-xl"></div>
                        <div className="absolute bottom-0 start-0 w-4 h-4 border-b-2 border-s-2 border-blue-400 rounded-bl-xl"></div>
                        <div className="absolute bottom-0 end-0 w-4 h-4 border-b-2 border-e-2 border-blue-400 rounded-br-xl"></div>
                        <motion.div 
                          animate={{ y: [0, 120, 0] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="absolute top-0 start-0 w-full h-0.5 bg-blue-400 shadow-[0_0_10px_2px_rgba(59,130,246,0.8)]"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ScanSearch className="w-8 h-8 text-blue-500/50 animate-pulse" />
                        </div>
                      </div>
                      <span className="text-primary font-bold animate-pulse">מנתח תמונה...</span>
                    </div>
                  )}
                </div>

                {result && (
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-2xl text-slate-900 dark:text-white leading-tight">
                          {result.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          רמת ביטחון: <span className="font-bold text-primary">{result.confidence}%</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      {result.kosher ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold px-3 py-1 text-sm flex gap-1">
                          <CheckCircle className="w-4 h-4" /> כשר
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold px-3 py-1 text-sm flex gap-1">
                          <AlertTriangle className="w-4 h-4" /> לא כשר
                        </Badge>
                      )}
                    </div>

                    {result.danger && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl mb-4 flex gap-3 items-start">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-rose-600 text-sm">אזהרת סכנה!</h4>
                          <p className="text-xs text-rose-600/80 mt-1">{result.danger}</p>
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                      {result.description}
                    </p>

                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex gap-3 items-start mb-3">
                      <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-blue-600 text-sm">טיפ לדייג</h4>
                        <p className="text-xs text-blue-600/80 mt-1">{result.tips}</p>
                      </div>
                    </div>

                    {(result.minSize || result.bestBait) && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {result.minSize && (
                          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                            <span className="text-muted-foreground block font-medium mb-0.5">גודל מינימלי מותר:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{result.minSize}</span>
                          </div>
                        )}
                        {result.bestBait && (
                          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                            <span className="text-muted-foreground block font-medium mb-0.5">פיתיון מומלץ:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{result.bestBait}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              {(!isScanning || result) && (
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-2xl gap-2 font-bold mt-4 bg-background shadow-sm"
                  onClick={resetScanner}
                >
                  <RefreshCw className="w-4 h-4" />
                  סרוק תמונה נוספת
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
