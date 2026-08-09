const fs = require('fs');

const files = [
  'src/lib/solunar.ts',
  'src/lib/tides.ts',
  'src/components/AutoNightMode.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace("import SunCalc from 'suncalc';", "import * as SunCalc from 'suncalc';");
    fs.writeFileSync(file, code);
  }
}
