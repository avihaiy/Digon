const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/Identify.tsx', 'utf8');

// 1. Add imports
const importHookStr = `import { useTackleBox, GearCategory } from "@/hooks/useTackleBox";
import { PackagePlus } from "lucide-react";`;
code = code.replace(/import { toast } from "sonner";/, `import { toast } from "sonner";\n${importHookStr}`);

// 2. Add useTackleBox hook to the component
const hookInitStr = `  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanType, setScanType] = useState<'fish'|'gear'>('fish');
  
  const { addGear } = useTackleBox();
  const [addedToTackleBox, setAddedToTackleBox] = useState(false);`;

code = code.replace(/  const \[isScanning, setIsScanning\] = useState\(false\);\s+const \[result, setResult\] = useState<ScanResult \| null>\(null\);\s+const \[scanType, setScanType\] = useState<'fish'\|'gear'>\('fish'\);/, hookInitStr);

// 3. Reset addedToTackleBox when resetting scanner
code = code.replace(/setResult\(null\);\s+setImage\(null\);/, `setResult(null);\n    setImage(null);\n    setAddedToTackleBox(false);`);

// 4. Add handleAddToTackleBox function
const handleAddFunc = `
  const handleAddToTackleBox = () => {
    if (!result) return;
    
    // Map Hebrew categories to english GearCategory
    let gearCat: GearCategory = 'accessory';
    const heCategory = result.category || "";
    if (heCategory.includes('חכה')) gearCat = 'rod';
    else if (heCategory.includes('רולר')) gearCat = 'reel';
    else if (heCategory.includes('דימוי') || heCategory.includes('פיתיון')) gearCat = 'lure';
    else if (heCategory.includes('חוט')) gearCat = 'line';
    
    addGear({
      category: gearCat,
      name: result.name,
      brand: result.brand || "לא ידוע",
      description: result.description
    });
    setAddedToTackleBox(true);
    toast.success("הפריט נוסף בהצלחה לקופסת הציוד שלך!");
  };

  const handleShare = async () => {`;

code = code.replace(/  const handleShare = async \(\) => {/, handleAddFunc);

// 5. Add the button to the UI
const buttonUI = `
                {result && scanType === 'gear' && (
                  <Button 
                    variant="outline" 
                    className="w-full h-14 rounded-2xl gap-2 text-lg font-bold mt-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                    onClick={handleAddToTackleBox}
                    disabled={addedToTackleBox}
                  >
                    <PackagePlus className="w-5 h-5" />
                    {addedToTackleBox ? "נוסף לקופסת ציוד" : "הוסף לקופסת ציוד"}
                  </Button>
                )}
                
                {result && (
                  <Button 
                    variant="default" `;

code = code.replace(/                \{result && \(\s*<Button \s*variant="default" /s, buttonUI);

fs.writeFileSync('src/pages/fishing/Identify.tsx', code, 'utf8');
console.log('done fixing Identify.tsx');
