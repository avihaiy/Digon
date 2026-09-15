const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/Radar.tsx', 'utf8');

// Fix ToggleGroupItem colors
code = code.replace(
  /className="rounded-full data-\[state=on\]:bg-cyan-500 data-\[state=on\]:text-white"/g,
  `className="text-slate-300 rounded-full data-[state=on]:bg-cyan-500 data-[state=on]:text-white"`
);
code = code.replace(
  /className="rounded-full data-\[state=on\]:bg-orange-500 data-\[state=on\]:text-white"/g,
  `className="text-slate-300 rounded-full data-[state=on]:bg-orange-500 data-[state=on]:text-white"`
);
code = code.replace(
  /className="rounded-full data-\[state=on\]:bg-blue-500 data-\[state=on\]:text-white relative group"/g,
  `className="text-slate-300 rounded-full data-[state=on]:bg-blue-500 data-[state=on]:text-white relative group"`
);
code = code.replace(
  /className="rounded-full data-\[state=on\]:bg-indigo-500 data-\[state=on\]:text-white relative group"/g,
  `className="text-slate-300 rounded-full data-[state=on]:bg-indigo-500 data-[state=on]:text-white relative group"`
);

// Fix filter chips flex container
code = code.replace(
  `className="flex gap-2 pointer-events-auto overflow-x-auto pb-2 scrollbar-hide rtl"`,
  `className="flex flex-wrap gap-2 pointer-events-auto justify-end rtl pb-2"`
);

fs.writeFileSync('src/pages/fishing/Radar.tsx', code);
