const fs = require('fs');

const files = [
  'src/lib/solunar.ts',
  'src/lib/tides.ts',
  'src/components/AutoNightMode.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    // Remove the old import and constant
    code = code.replace(/import \* as SunCalcModule from 'suncalc';\s*const SunCalc = [\s\S]*?;/, "import SunCalc from 'suncalc';");
    fs.writeFileSync(file, code);
  }
}
