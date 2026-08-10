const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/TackleBox.tsx', 'utf8');

// 1. Imports
code = code.replace(
  'import { useState, useMemo } from "react";',
  'import { useState, useMemo, useRef } from "react";'
);
code = code.replace(
  'import { Trash2, Plus, Package, Fish, Anchor, Sparkles } from "lucide-react";',
  'import { Trash2, Plus, Package, Fish, Anchor, Sparkles, Camera, Wrench, X, TrendingUp } from "lucide-react";'
);
code = code.replace(
  'import { useTackleBox, GearCategory } from "@/hooks/useTackleBox";',
  'import { useTackleBox, GearCategory, TackleSetup } from "@/hooks/useTackleBox";'
);

// 2. Add New States to TackleBox Component
const hookMatch = `  const [category, setCategory] = useState<string>("rod");`;
const hookReplace = `  const [category, setCategory] = useState<string>("rod");
  const [price, setPrice] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        // Compress heavily to save localStorage space (0.6 quality WebP)
        const compressedBase64 = canvas.toDataURL("image/webp", 0.6);
        setImagePreview(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
`;
code = code.replace(hookMatch, hookReplace);

// 3. Update handleAdd
const addMatch = `    addGear({
      category: category as GearCategory,
      brand,
      name
    });

    setOpen(false);
    setBrand("");
    setName("");`;
const addReplace = `    addGear({
      category: category as GearCategory,
      brand,
      name,
      specs,
      price: price ? parseFloat(price) : undefined,
      image: imagePreview || undefined
    });

    setOpen(false);
    setBrand("");
    setName("");
    setSpecs("");
    setPrice("");
    setImagePreview(null);`;
code = code.replace(addMatch.replace(/\r\n/g, '\n'), addReplace.replace(/\r\n/g, '\n'));

// 4. Update the form to include Image and Price
const formFieldsMatch = `              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold">מפרט טכני (אופציונלי)</Label>`;
const formFieldsReplace = `              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold">תמונה (אופציונלי)</Label>
                <div className="flex gap-2">
                  {imagePreview ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={imagePreview} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setImagePreview(null)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <>
                      <Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl border-slate-200 dark:border-slate-700 text-slate-500" onClick={() => cameraInputRef.current?.click()}>
                        <Camera className="w-5 h-5 ml-2" /> צלם
                      </Button>
                      <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleFileChange} />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold">מחיר מוערך ₪ (אופציונלי)</Label>
                <Input 
                  type="number"
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  className="h-14 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner font-medium text-lg placeholder:text-slate-400 dark:placeholder:text-slate-500" 
                  placeholder="למשל: 350"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold">מפרט טכני (אופציונלי)</Label>`;
code = code.replace(formFieldsMatch, formFieldsReplace);

fs.writeFileSync('src/pages/fishing/TackleBox.tsx', code);
