import { useState, useEffect } from "react";

export type GearCategory = "rod" | "reel" | "lure" | "line" | "accessory";

export interface GearItem {
  id: string;
  category: GearCategory;
  name: string;
  brand: string;
  description?: string;
}

const STORAGE_KEY = "digon_tackle_box";

export function useTackleBox() {
  const [gear, setGear] = useState<GearItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setGear(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse tackle box data");
      }
    }
  }, []);

  const addGear = (item: Omit<GearItem, "id">) => {
    const newItem: GearItem = {
      ...item,
      id: Date.now().toString()
    };
    const updated = [...gear, newItem];
    setGear(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newItem;
  };

  const removeGear = (id: string) => {
    const updated = gear.filter(item => item.id !== id);
    setGear(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return {
    gear,
    addGear,
    removeGear
  };
}
