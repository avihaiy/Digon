const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/TackleBox.tsx', 'utf8');

// 1. Add Dashboard UI
const headerMatch = `{/* AI Interactive Advisor */}`;
const dashboardReplace = `
      {/* Dashboard Stats */}
      {gear.length > 0 && (
        <div className="px-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px]" />
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-cyan-400" /> נתוני הקופסה שלך</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <div className="text-slate-400 text-xs font-medium mb-1">סה״כ פריטים</div>
                <div className="text-white font-black text-xl">{gear.length}</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <div className="text-slate-400 text-xs font-medium mb-1">שווי מוערך</div>
                <div className="text-white font-black text-xl">₪{gear.reduce((sum, item) => sum + (item.price || 0), 0).toLocaleString()}</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <div className="text-slate-400 text-xs font-medium mb-1">מצטיין תפיסות</div>
                <div className="text-amber-400 font-black text-sm truncate">
                  {gear.filter(g => g.catchCount).sort((a,b) => (b.catchCount||0) - (a.catchCount||0))[0]?.name || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Interactive Advisor */}`;
code = code.replace(headerMatch, dashboardReplace);

// 2. Add 'setups' to CATEGORIES filters
const filterMatch = `{CATEGORIES.map(c => (`;
const filterReplace = `
            <button
              onClick={() => setFilterCategory("setups")}
              className={\`px-4 py-2 rounded-2xl text-sm font-bold transition-colors \${filterCategory === "setups" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}\`}
            >
              סטאפים אישיים
            </button>
            {CATEGORIES.map(c => (`;
code = code.replace(filterMatch, filterReplace);


// 3. Update Card UI (Image, Wrench, Swipe)
const cardMatch = `<motion.div
                    key={item.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="border-border/50 shadow-sm overflow-hidden group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                            {cat?.icon}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-primary mb-0.5">{cat?.name} | {item.brand}</div>
                            <div className="font-bold text-base">{item.name}</div>
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeGear(item.id)}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>`;
const cardReplace = `
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="relative"
                  >
                    {/* Delete Background for Swipe */}
                    <div className="absolute inset-0 bg-red-500 rounded-xl flex items-center justify-end px-6 text-white font-bold">
                      <Trash2 className="w-6 h-6" />
                    </div>

                    <motion.div
                      drag="x"
                      dragConstraints={{ left: -100, right: 0 }}
                      onDragEnd={(e, info) => {
                        if (info.offset.x < -70) {
                          removeGear(item.id);
                        }
                      }}
                      className="relative z-10"
                    >
                      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group bg-white dark:bg-slate-900 rounded-xl">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {item.image ? (
                              <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm shrink-0">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 shrink-0">
                                {cat?.icon}
                              </div>
                            )}
                            
                            <div>
                              <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 mb-0.5">{cat?.name} | {item.brand}</div>
                              <div className="font-bold text-base text-slate-800 dark:text-slate-100">{item.name}</div>
                              {item.specs && (
                                <div className="text-xs text-slate-500 mt-0.5">{item.specs}</div>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {item.catchCount ? (
                                  <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                                    🏆 {item.catchCount} תפיסות
                                  </div>
                                ) : null}
                                {item.category === 'reel' && (!item.lastServiced || Date.now() - item.lastServiced > 1000 * 60 * 60 * 24 * 180) && (
                                  <div className="inline-flex items-center gap-1 bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/20">
                                    <Wrench className="w-3 h-3" /> דורש טיפול
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>`;
code = code.replace(cardMatch.replace(/\r\n/g, '\n'), cardReplace.replace(/\r\n/g, '\n'));

fs.writeFileSync('src/pages/fishing/TackleBox.tsx', code);
