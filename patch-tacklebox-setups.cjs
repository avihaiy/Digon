const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/TackleBox.tsx', 'utf8');

// 1. Destructure setups methods
code = code.replace(
  'const { gear, addGear, removeGear } = useTackleBox();',
  'const { gear, setups, addGear, removeGear, addSetup, removeSetup, markServiced } = useTackleBox();'
);

// 2. Add Setup Builder State
code = code.replace(
  '  const [name, setName] = useState("");',
  `  const [name, setName] = useState("");
  
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupRod, setSetupRod] = useState("");
  const [setupReel, setSetupReel] = useState("");
  const [setupLure, setSetupLure] = useState("");

  const handleAddSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupName) {
      toast.error("אנא מלא שם לסטאפ");
      return;
    }
    addSetup({
      name: setupName,
      rodId: setupRod || undefined,
      reelId: setupReel || undefined,
      lureId: setupLure || undefined
    });
    setSetupOpen(false);
    setSetupName("");
    setSetupRod("");
    setSetupReel("");
    setSetupLure("");
    toast.success("סטאפ חדש נוצר בהצלחה!");
  };`
);

// 3. Render Setups View or Gear View
const renderGearMatch = `{gear.length === 0 ? (`;
const renderGearReplace = `
        {filterCategory === "setups" ? (
          <div className="space-y-4">
            <Button onClick={() => setSetupOpen(true)} className="w-full h-14 rounded-2xl border-2 border-dashed border-cyan-500/50 bg-cyan-500/5 text-cyan-600 font-bold hover:bg-cyan-500/10">
              <Plus className="w-5 h-5 ml-2" /> צור סטאפ חדש (Combo)
            </Button>
            
            <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
              <DialogContent className="rounded-3xl p-6 bg-white dark:bg-slate-900 border-0 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2"><Fish className="text-cyan-500" /> בניית סטאפ</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddSetup} className="space-y-4">
                  <div className="space-y-2">
                    <Label>שם הסטאפ (למשל: לייט כנרת)</Label>
                    <Input value={setupName} onChange={e => setSetupName(e.target.value)} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div className="space-y-2">
                    <Label>חכה</Label>
                    <Select value={setupRod} onValueChange={setSetupRod}>
                      <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800"><SelectValue placeholder="בחר חכה..." /></SelectTrigger>
                      <SelectContent>
                        {gear.filter(g => g.category === 'rod').map(g => <SelectItem key={g.id} value={g.id}>{g.brand} {g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>רולר</Label>
                    <Select value={setupReel} onValueChange={setSetupReel}>
                      <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800"><SelectValue placeholder="בחר רולר..." /></SelectTrigger>
                      <SelectContent>
                        {gear.filter(g => g.category === 'reel').map(g => <SelectItem key={g.id} value={g.id}>{g.brand} {g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full h-14 rounded-2xl font-bold bg-cyan-500 text-white">שמור סטאפ</Button>
                </form>
              </DialogContent>
            </Dialog>

            {setups.map(setup => (
              <Card key={setup.id} className="border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden relative">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg">{setup.name}</h3>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeSetup(setup.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    {setup.rodId && <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-500" /> {gear.find(g => g.id === setup.rodId)?.brand} {gear.find(g => g.id === setup.rodId)?.name}</div>}
                    {setup.reelId && <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> {gear.find(g => g.id === setup.reelId)?.brand} {gear.find(g => g.id === setup.reelId)?.name}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : gear.length === 0 ? (`;
code = code.replace(renderGearMatch, renderGearReplace);

// 4. Add "Mark as Serviced" to card
const markMatch = `<Wrench className="w-3 h-3" /> דורש טיפול
                                  </div>
                                )}`;
const markReplace = `<Wrench className="w-3 h-3" /> דורש טיפול
                                  </div>
                                )}
                                {item.category === 'reel' && (
                                  <button onClick={() => markServiced(item.id)} className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold ml-2 underline">סומן כטופל</button>
                                )}`;
code = code.replace(markMatch, markReplace);


fs.writeFileSync('src/pages/fishing/TackleBox.tsx', code);
