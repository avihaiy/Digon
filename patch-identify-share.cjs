const fs = require('fs');

let identifyCode = fs.readFileSync('src/pages/fishing/Identify.tsx', 'utf8');

// Add Share2 import if missing
if (!identifyCode.includes('Share2')) {
  identifyCode = identifyCode.replace(
    /import \{ ScanSearch, UploadCloud, Camera, RefreshCw, AlertTriangle, CheckCircle, Info \} from "lucide-react";/,
    `import { ScanSearch, UploadCloud, Camera, RefreshCw, AlertTriangle, CheckCircle, Info, Share2 } from "lucide-react";`
  );
}

// Add applyDigonFilter import if missing
if (!identifyCode.includes('applyDigonFilter')) {
  identifyCode = identifyCode.replace(
    /import \{ compressImage \} from "@\/lib\/imageCompression";/,
    `import { compressImage } from "@/lib/imageCompression";\nimport { applyDigonFilter } from "@/lib/imageFilter";`
  );
}

// Add state for isSharing
if (!identifyCode.includes('isSharing')) {
  identifyCode = identifyCode.replace(
    /const \[manualName, setManualName\] = useState\(""\);/,
    `const [manualName, setManualName] = useState("");\n  const [isSharing, setIsSharing] = useState(false);`
  );
}

// Add share handler
const shareHandler = `
  const handleShare = async () => {
    if (!image || !result) return;
    setIsSharing(true);
    
    try {
      // Convert base64 to File
      const res = await fetch(image);
      const blob = await res.blob();
      const file = new File([blob], "scanned_fish.jpg", { type: "image/jpeg" });
      
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
          text: \`סרקתי דג בים וגיליתי שזה \${result.name}! זיהוי חכם מתוך אפליקציית Digon 🐟\`,
        });
      } else {
        // Fallback to Download
        const url = URL.createObjectURL(stampedFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`digon_scan.jpg\`;
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
`;

if (!identifyCode.includes('handleShare')) {
  identifyCode = identifyCode.replace(
    /const analyzeImage = async \(base64Str: string\) => \{/,
    shareHandler + '\n  const analyzeImage = async (base64Str: string) => {'
  );
}

// Add the Share button to the UI
const shareButton = `
              <Button 
                variant="default" 
                className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg bg-orange-500 hover:bg-orange-600 text-white mb-3"
                onClick={handleShare}
                disabled={isSharing}
              >
                <Share2 className="w-5 h-5 ml-2" /> {isSharing ? "מכין תמונה..." : "שתף תמונה ממותגת"}
              </Button>
`;

// Insert the share button right before the "Scan Another" button
if (!identifyCode.includes('שתף תמונה ממותגת')) {
  identifyCode = identifyCode.replace(
    /<Button \s*variant="outline" \s*className="w-full h-14 rounded-2xl text-lg font-bold shadow-sm bg-background border-border"\s*onClick=\{\(\) => \{\s*setImage\(null\);\s*setResult\(null\);\s*\}\}\s*>/,
    shareButton + '\n              <Button \n                variant="outline" \n                className="w-full h-14 rounded-2xl text-lg font-bold shadow-sm bg-background border-border"\n                onClick={() => {\n                  setImage(null);\n                  setResult(null);\n                }}\n              >'
  );
}

fs.writeFileSync('src/pages/fishing/Identify.tsx', identifyCode);
