const fs = require('fs');

let code = fs.readFileSync('src/hooks/useTackleBox.ts', 'utf8');

// Update GearItem interface
const gearItemMatch = `export interface GearItem {
  id: string;
  category: GearCategory;
  name: string;
  brand: string;
  description?: string;
  specs?: string; // e.g., "10-30g", "3000", "15g Sinking"
  catchCount?: number;
}`;
const gearItemReplace = `export interface GearItem {
  id: string;
  category: GearCategory;
  name: string;
  brand: string;
  description?: string;
  specs?: string; // e.g., "10-30g", "3000", "15g Sinking"
  catchCount?: number;
  image?: string; // Base64 thumbnail
  price?: number;
  lastServiced?: number; // Timestamp
}

export interface TackleSetup {
  id: string;
  name: string;
  rodId?: string;
  reelId?: string;
  lureId?: string;
}`;
code = code.replace(gearItemMatch.replace(/\r\n/g, '\n'), gearItemReplace.replace(/\r\n/g, '\n'));

// Add Setups to state
const stateMatch = `  const [gear, setGear] = useState<GearItem[]>([]);`;
const stateReplace = `  const [gear, setGear] = useState<GearItem[]>([]);
  const [setups, setSetups] = useState<TackleSetup[]>([]);`;
code = code.replace(stateMatch, stateReplace);

// Update useEffect to load setups
const useEffectMatch = `    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setGear(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse tackle box data");
      }
    }`;
const useEffectReplace = `    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setGear(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse tackle box data");
      }
    }
    const savedSetups = localStorage.getItem(STORAGE_KEY + "_setups");
    if (savedSetups) {
      try {
        setSetups(JSON.parse(savedSetups));
      } catch (e) {}
    }`;
code = code.replace(useEffectMatch.replace(/\r\n/g, '\n'), useEffectReplace.replace(/\r\n/g, '\n'));

// Add Setup Functions and markServiced
const methodsMatch = `  return {`;
const methodsReplace = `  const addSetup = (setup: Omit<TackleSetup, "id">) => {
    const newSetup: TackleSetup = {
      ...setup,
      id: Date.now().toString()
    };
    const updated = [...setups, newSetup];
    setSetups(updated);
    localStorage.setItem(STORAGE_KEY + "_setups", JSON.stringify(updated));
    return newSetup;
  };

  const removeSetup = (id: string) => {
    const updated = setups.filter(s => s.id !== id);
    setSetups(updated);
    localStorage.setItem(STORAGE_KEY + "_setups", JSON.stringify(updated));
  };

  const markServiced = (id: string) => {
    const updated = gear.map(item => {
      if (item.id === id) {
        return { ...item, lastServiced: Date.now() };
      }
      return item;
    });
    setGear(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return {`;
code = code.replace(methodsMatch, methodsReplace);

// Update return object
const returnMatch = `    gear,
    addGear,
    removeGear,
    incrementCatchCount
  };`;
const returnReplace = `    gear,
    setups,
    addGear,
    removeGear,
    incrementCatchCount,
    addSetup,
    removeSetup,
    markServiced
  };`;
code = code.replace(returnMatch.replace(/\r\n/g, '\n'), returnReplace.replace(/\r\n/g, '\n'));

fs.writeFileSync('src/hooks/useTackleBox.ts', code);
