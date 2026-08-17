import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanSearch, UploadCloud, Camera, RefreshCw, AlertTriangle, CheckCircle, Info, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { compressImage } from "@/lib/imageCompression";
import { applyDigonFilter } from "@/lib/imageFilter";

interface ScanResult {
  name: string;
  confidence: number;
  description: string;
  tips: string;
  // Fish specific
  kosher?: boolean;
  danger?: string | null;
  minSize?: string;
  bestBait?: string;
  // Gear specific
  category?: string;
  brand?: string;
  targetFish?: string;
  bestConditions?: string;
}

export default function Identify() {
  const { points, profileData, updateProfileField } = useAuth();
  const aiCredits = profileData?.ai_credits || 0;
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanType, setScanType] = useState<'fish' | 'gear'>('fish');
  const [isEditingName, setIsEditingName] = useState(false);
  const [manualName, setManualName] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, { maxWidth: 1024, quality: 0.8 });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setImage(base64);
          analyzeImage(base64);
        };
        reader.readAsDataURL(compressed);
      } catch (err) {
        toast.error("שגיאה בטעינת התמונה.");
      }
    }
  };

  
  const handleShare = async () => {
    if (!image || !result) return;
    setIsSharing(true);
    
    try {
      // Convert base64 to File robustly
      const arr = image.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const file = new File([u8arr], "scanned_fish.jpg", { type: mime });
      
      // Apply Digon Pro Filter
      const stampedFile = await applyDigonFilter(file, {
        fishType: result.name,
        weight: "זיהוי AI",
        location: "אפליקציית Digon",
      });

      // Share or Download
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [stampedFile] })) {
        await navigator.share({
          files: [stampedFile],
          title: 'זיהוי דג - Digon',
          text: `סרקתי דג בים וגיליתי שזה ${result.name}! זיהוי חכם מתוך אפליקציית Digon 🐟`,
        });
      } else {
        // Fallback to Download
        const url = URL.createObjectURL(stampedFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = `digon_scan.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("התמונה נשמרה בהצלחה!");
      }
    } catch (err) {
      console.error("Share error:", err);
      toast.error("שגיאה בשיתוף התמונה");
    } finally {
      setIsSharing(false);
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
      const mimeMatch = base64Str.match(/^data:(image\/[a-zA-Z0-9]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const base64Data = base64Str.split(",")[1];
      
      const fishPrompt = `
        You are an expert marine biologist and fisherman in Israel (Mediterranean Sea, Red Sea, Sea of Galilee / Kinneret, and Jordan River).
        Identify the fish in this image with maximum accuracy.
        First, analyze the shape, fins, scales, color patterns, and mouth.
        Consider common Israeli sea fish: דניס, ברמונדי, לוקוס, פרידה, אנטיאס, פלמידה, גומבר, בורי, אראס, אבו נפחא, מרמיר, סרגוס, טרכון.
        Consider common Israeli freshwater fish: מושט (אמנון), קרפיון, שפמנון, בינית, כסיף, בורי מים מתוקים.
        If the image DOES NOT contain a fish or marine creature, return "לא זוהה דג בתמונה" for the name, 0 for confidence, and explain what you see in the description.
        Respond in pure JSON format (without markdown blocks) with the following structure:
        {
          "name": "Hebrew name of the fish (and common nickname)",
          "confidence": number between 0-100,
          "kosher": boolean,
          "danger": "string warning if it's venomous/poisonous, otherwise null",
          "description": "Short description in Hebrew",
          "tips": "One short fishing tip or culinary tip in Hebrew",
          "minSize": "Minimum legal catch size in Israel or 'אין הגבלה'",
          "bestBait": "Recommended bait in Hebrew"
        }
      `;

      const gearPrompt = `
        You are an expert fisherman in Israel.
        Identify the fishing gear/lure in this image. 
        Identify if it is a lure, jig, silicon, popper, minnow, reel, rod, line, or accessory.
        Try to identify the brand if visible.
        If the image DOES NOT contain fishing gear, return "לא זוהה ציוד דיג" for the name, 0 for confidence, and explain what you see in the description.
        Respond in pure JSON format (without markdown blocks) with the following structure:
        {
          "name": "Hebrew name/type of the gear (e.g. דמוי פופר, ג'יג כבד)",
          "confidence": number between 0-100,
          "category": "one of: חכה, רולר, פיתיון/דמוי, חוט, ציוד עזר",
          "brand": "Brand name if identified, else null",
          "description": "Short description of what it does and how it works (Hebrew)",
          "tips": "One tip on how to use it best (Hebrew)",
          "targetFish": "Which fish this is usually for in Israel (Hebrew)",
          "bestConditions": "What sea conditions this is best for (e.g. ים רוגש, מים צלולים)"
        }
      `;

      const prompt = scanType === 'fish' ? fishPrompt : gearPrompt;

      let text = "";
      try {
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt, 
            base64Image: base64Data, 
            mimeType, 
            model: "gemini-1.5-flash" 
          })
        });
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        text = data.text;
      } catch (proError: any) {
        console.warn("Pro model failed, falling back to Flash:", proError);
        const fallbackResponse = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt, 
            base64Image: base64Data, 
            mimeType, 
            model: "gemini-1.5-flash-8b" 
          })
        });
        if (!fallbackResponse.ok) throw new Error(fallbackResponse.statusText);
        const data = await fallbackResponse.json();
        if (data.error) throw new Error(data.error);
        text = data.text;
      }
      
      // Robust JSON extraction
      let cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
      }
      
            try {
        const parsedResult = JSON.parse(cleanedText);
        setResult(parsedResult);
      } catch (parseError) {
        console.error("JSON Parse Error. Raw text:", text);
        setResult({
          name: "זיהוי לא ברור",
          confidence: 0,
          kosher: false,
          danger: null,
          description: text || "הבינה המלאכותית לא הצליחה לזהות בוודאות. נסה לצלם מזווית אחרת או קרוב יותר.",
          tips: "וודא שהדג מואר היטב ושלם.",
          minSize: "",
          bestBait: ""
        });
      }
      
    } catch (error: any) {
      console.error("AI Error:", error);
      toast.error(`שגיאה בזיהוי התמונה: ${error.message || 'נסה שוב'}`);
      setResult({
        name: "שגיאת תקשורת / שרת",
        confidence: 0,
        kosher: false,
        danger: null,
        description: error.message || "החיבור לשרת נכשל. בדוק את החיבור לאינטרנט ונסה שוב.",
        tips: "",
        minSize: "",
        bestBait: ""
      });
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
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto min-h-[calc(100vh-80px)] flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col px-4 mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          זיהוי חכם מבוסס AI <ScanSearch className="w-6 h-6 text-blue-500" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1 mb-2">
          {scanType === 'fish' ? 'צלם או העלה תמונה, וה-AI שלנו יזהה את הדג' : 'צלם ציוד דיג או דמוי לקבלת המלצות ושימוש'}
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-600 rounded-full text-xs font-bold border border-indigo-500/20 w-fit mb-4">
          <ScanSearch className="w-3.5 h-3.5" /> נשארו לך {aiCredits} סריקות AI
        </div>
        
        {/* Toggle Fish/Gear */}
        {!image && (
          <div className="flex bg-muted/50 p-1 rounded-xl w-full mb-2">
            <button
              onClick={() => setScanType('fish')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${scanType === 'fish' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-muted-foreground'}`}
            >
              🐟 דגים
            </button>
            <button
              onClick={() => setScanType('gear')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${scanType === 'gear' ? 'bg-white dark:bg-slate-800 shadow-sm text-orange-500' : 'text-muted-foreground'}`}
            >
              🪝 ציוד ודמויים
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 flex flex-col">
        
        {/* Camera Input */}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {/* Gallery Input */}
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={galleryInputRef}
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
                  onClick={() => galleryInputRef.current?.click()}
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

                    {scanType === 'fish' && (
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
                    )}

                    {scanType === 'gear' && result.category && (
                      <div className="flex gap-2 mb-4">
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 font-bold px-3 py-1 text-sm">
                          סוג: {result.category}
                        </Badge>
                        {result.brand && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold px-3 py-1 text-sm">
                            מותג: {result.brand}
                          </Badge>
                        )}
                      </div>
                    )}

                    {scanType === 'fish' && result.danger && (
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
                        <h4 className="font-bold text-blue-600 text-sm">{scanType === 'fish' ? 'טיפ לדייג' : 'טיפ שימוש'}</h4>
                        <p className="text-xs text-blue-600/80 mt-1">{result.tips}</p>
                      </div>
                    </div>

                    {scanType === 'fish' && (result.minSize || result.bestBait) && (
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

                    {scanType === 'gear' && (result.targetFish || result.bestConditions) && (
                      <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                        {result.targetFish && (
                          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                            <span className="text-muted-foreground block font-medium mb-0.5">דגי מטרה:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{result.targetFish}</span>
                          </div>
                        )}
                        {result.bestConditions && (
                          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                            <span className="text-muted-foreground block font-medium mb-0.5">תנאים אופטימליים:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{result.bestConditions}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              {result && (
                <Button 
                  variant="default" 
                  className="w-full h-14 rounded-2xl gap-2 text-lg font-bold mt-4 bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                  onClick={handleShare}
                  disabled={isSharing}
                >
                  <Share2 className="w-5 h-5" />
                  {isSharing ? "מכין תמונה..." : "שתף תמונה ממותגת"}
                </Button>
              )}

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
