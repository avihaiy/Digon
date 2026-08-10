const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/TackleBox.tsx', 'utf8');

// 1. Add states
const stateMatch = 'const [category, setCategory] = useState<string>("rod");';
code = code.replace(
  stateMatch,
  'const [category, setCategory] = useState<string>("rod");\n  const [specs, setSpecs] = useState("");\n  const [filterCategory, setFilterCategory] = useState<string>("all");'
);

// 2. Update addGear call
const addGearMatch = `category: category as GearCategory,
      brand,
      name
    });

    setOpen(false);
    setBrand("");
    setName("");`;
const addGearReplace = `category: category as GearCategory,
      brand,
      name,
      specs
    });

    setOpen(false);
    setBrand("");
    setName("");
    setSpecs("");`;
code = code.replace(addGearMatch.replace(/\r\n/g, '\n'), addGearReplace.replace(/\r\n/g, '\n')); // handle line endings

// 3. Add Specs input to form
const btnMatch = '<Button type="submit" className="w-full h-12 rounded-2xl text-lg font-bold mt-2">';
const btnReplace = `<div className="space-y-2">
                <Label>מפרט טכני (אופציונלי)</Label>
                <Input 
                  value={specs} 
                  onChange={(e) => setSpecs(e.target.value)} 
                  className="h-12 rounded-2xl bg-muted/50 border-0" 
                  placeholder={
                    category === 'rod' ? 'לדוגמה: משקלי זריקה 10-30g' : 
                    category === 'reel' ? 'לדוגמה: מידה 3000' : 
                    category === 'lure' ? 'לדוגמה: 15g Sinking' : 
                    'לדוגמה: מידה / משקל / צבע'
                  }
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-2xl text-lg font-bold mt-2">`;
code = code.replace(btnMatch, btnReplace);

// 4. Add Filters
const filterMatch = '<div className="px-4 flex-1">';
const filterReplace = `{/* Filter Tabs */}
      {gear.length > 0 && (
        <div className="px-4 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            <button
              onClick={() => setFilterCategory("all")}
              className={\`px-4 py-2 rounded-2xl text-sm font-bold transition-colors \${filterCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}\`}
            >
              הכל
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setFilterCategory(c.id)}
                className={\`px-4 py-2 rounded-2xl text-sm font-bold transition-colors flex items-center gap-1.5 \${filterCategory === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}\`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 flex-1">`;
code = code.replace(filterMatch, filterReplace);

// 5. Update render loop and card content
const mapMatch = '{gear.map((item) => {';
const mapReplace = '{gear.filter(item => filterCategory === "all" || item.category === filterCategory).map((item) => {';
code = code.replace(mapMatch, mapReplace);

const cardMatch = `<div className="font-bold text-base">{item.name}</div>
                          </div>
                        </div>
                        <Button `;
const cardReplace = `<div className="font-bold text-base">{item.name}</div>
                            {item.specs && (
                              <div className="text-xs text-muted-foreground mt-0.5">{item.specs}</div>
                            )}
                            {item.catchCount ? (
                              <div className="mt-1.5 inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                                🏆 {item.catchCount} תפיסות
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <Button `;
code = code.replace(cardMatch.replace(/\r\n/g, '\n'), cardReplace.replace(/\r\n/g, '\n'));

fs.writeFileSync('src/pages/fishing/TackleBox.tsx', code);
