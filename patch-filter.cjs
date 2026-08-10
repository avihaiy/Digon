const fs = require('fs');

let dialogCode = fs.readFileSync('src/components/catches/CatchReportDialog.tsx', 'utf8');

if (!dialogCode.includes('import { applyDigonFilter }')) {
  dialogCode = dialogCode.replace(
    /import \{ compressImage \} from "@\/lib\/imageCompression";/,
    `import { compressImage } from "@/lib/imageCompression";\nimport { applyDigonFilter } from "@/lib/imageFilter";`
  );
  
  // Add state for applyFilter
  dialogCode = dialogCode.replace(
    /const \[useFlare, setUseFlare\] = useState\(false\);/,
    `const [useFlare, setUseFlare] = useState(false);\n  const [applyFilter, setApplyFilter] = useState(true);`
  );
  
  // Handle reset on close
  dialogCode = dialogCode.replace(
    /setIsPrivate\(false\);/,
    `setIsPrivate(false);\n      setApplyFilter(true);`
  );

  // Apply the filter in handleSubmit
  const handleSubmitStr = `const compressed = await compressImage(imageFile, { maxWidth: 1920, quality: 0.85 });`;
  const filterLogic = `let finalImageFile = imageFile;
      if (applyFilter) {
        try {
          finalImageFile = await applyDigonFilter(imageFile, {
            fishType,
            weight,
            location,
            marineData
          });
        } catch (e) {
          console.error("Failed to apply Digon filter", e);
        }
      }
      const compressed = await compressImage(finalImageFile, { maxWidth: 1920, quality: 0.85 });`;
  
  dialogCode = dialogCode.replace(handleSubmitStr, filterLogic);

  // Add the Switch in the UI under the image preview
  const imagePreviewStr = `</button>\n              </div>\n            ) : (`;
  const previewUIStr = `</button>\n              </div>\n            ) : (`; // We will put the switch below the image area entirely

  const switchUIStr = `<div className="flex items-center justify-between bg-card p-3 rounded-lg border border-border">
              <div className="space-y-0.5">
                <Label className="text-base font-bold text-orange-500 dark:text-orange-400 flex items-center gap-2">
                  מצלמת Digon Pro
                  <span className="bg-orange-500/20 text-orange-500 text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">New</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  צורב אוטומטית נתונים על התמונה לשיתוף מקצועי
                </p>
              </div>
              <Switch checked={applyFilter} onCheckedChange={setApplyFilter} />
            </div>`;

  dialogCode = dialogCode.replace(
    /<Label className="text-base font-bold flex items-center gap-2">/m,
    switchUIStr + '\n            <Label className="text-base font-bold flex items-center gap-2">'
  );

  // Also add a little preview overlay on the image itself if applyFilter is true
  const imageTagStr = `<img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />`;
  const imageTagWithOverlay = `${imageTagStr}
                {applyFilter && (
                  <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-4 pointer-events-none">
                    <div className="flex justify-between items-end w-full">
                      <div className="flex text-orange-500 font-black text-2xl drop-shadow-md">
                        DIGON <span className="text-white ml-1">PRO</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-lg drop-shadow-md">
                          {fishType || 'דג לא ידוע'} {weight ? '| ' + weight : ''}
                        </div>
                        <div className="text-slate-300 text-xs drop-shadow-md">
                          {location.split('|||')[0] || 'לוקיישן לא ידוע'}
                          {marineData?.waveHeight ? \` • גלים: \${marineData.waveHeight}m\` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )}`;
  dialogCode = dialogCode.replace(imageTagStr, imageTagWithOverlay);
  
  fs.writeFileSync('src/components/catches/CatchReportDialog.tsx', dialogCode);
}
