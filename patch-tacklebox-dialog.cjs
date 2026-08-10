const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/TackleBox.tsx', 'utf8');

// Update Dialog Content
code = code.replace(
  '<DialogContent className="rounded-3xl p-6">',
  '<DialogContent className="rounded-3xl p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl">'
);

// Update Dialog Title
code = code.replace(
  '<DialogTitle className="text-xl">הוספת ציוד חדש</DialogTitle>',
  '<DialogTitle className="text-2xl font-black flex items-center gap-2 text-slate-800 dark:text-slate-100"><Package className="w-7 h-7 text-cyan-500" /> הוספת ציוד לקופסה</DialogTitle>'
);

// Update Labels
code = code.replaceAll(
  '<Label>',
  '<Label className="text-slate-700 dark:text-slate-300 font-bold">'
);
code = code.replace(
  '<Label>מותג (לדוגמה: Shimano, Daiwa)</Label>',
  '<Label className="text-slate-700 dark:text-slate-300 font-bold">מותג (לדוגמה: Shimano, Daiwa)</Label>'
);
code = code.replace(
  '<Label>שם הדגם / הציוד</Label>',
  '<Label className="text-slate-700 dark:text-slate-300 font-bold">שם הדגם / הציוד</Label>'
);
code = code.replace(
  '<Label>מפרט טכני (אופציונלי)</Label>',
  '<Label className="text-slate-700 dark:text-slate-300 font-bold">מפרט טכני (אופציונלי)</Label>'
);

// Update SelectTrigger
code = code.replace(
  '<SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0">',
  '<SelectTrigger className="h-14 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 shadow-inner font-medium text-lg">'
);

// Update Inputs
code = code.replaceAll(
  'className="h-12 rounded-2xl bg-muted/50 border-0"',
  'className="h-14 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner font-medium text-lg placeholder:text-slate-400 dark:placeholder:text-slate-500"'
);

// Update Add Button
code = code.replace(
  '<Button type="submit" className="w-full h-12 rounded-2xl text-lg font-bold mt-2">',
  '<Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all duration-300 border-0">'
);

fs.writeFileSync('src/pages/fishing/TackleBox.tsx', code);
