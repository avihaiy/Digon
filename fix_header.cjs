const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/Radar.tsx', 'utf8');

const oldHeader = `<div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl shadow-xl pointer-events-auto flex items-center gap-2">
          <MapPin className="w-5 h-5 text-rose-500 animate-pulse" />
          <h1 className="text-lg font-black tracking-tight text-white m-0">ראדאר תפיסות</h1>
        </div>`;
        
const newHeader = `<div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={locateMe}
            disabled={isLocating}
            className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-slate-800 shadow-xl transition-colors text-white disabled:opacity-50"
            title="המיקום שלי"
          >
            <Crosshair className={\`w-5 h-5 \${isLocating ? 'animate-spin' : ''}\`} />
          </button>
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-500 animate-pulse" />
            <h1 className="text-lg font-black tracking-tight text-white m-0">ראדאר תפיסות</h1>
          </div>
        </div>`;

// Fallback with CRLF
const oldHeaderCRLF = `<div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl shadow-xl pointer-events-auto flex items-center gap-2">\r
          <MapPin className="w-5 h-5 text-rose-500 animate-pulse" />\r
          <h1 className="text-lg font-black tracking-tight text-white m-0">ראדאר תפיסות</h1>\r
        </div>`;

let modified = false;
if (code.includes(oldHeader)) {
  code = code.replace(oldHeader, newHeader);
  modified = true;
} else if (code.includes(oldHeaderCRLF)) {
  code = code.replace(oldHeaderCRLF, newHeader);
  modified = true;
} else {
  console.log("Could not find the header to replace.");
}

if (modified) {
  fs.writeFileSync('src/pages/fishing/Radar.tsx', code, 'utf8');
  console.log("Successfully replaced header");
}
