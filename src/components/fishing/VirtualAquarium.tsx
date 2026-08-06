import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCatches } from "@/hooks/useCatches";
import { Fish, Waves, ScanSearch } from "lucide-react";
import { motion } from "framer-motion";

// Helper to determine fish sizes and images based on species name
const getFishAsset = (species: string) => {
  const s = species.toLowerCase();
  
  if (s.includes("לוקוס") || s.includes("grouper")) {
    return { size: "w-24 h-24", type: "grouper" };
  }
  if (s.includes("אינטיאס") || s.includes("amberjack")) {
    return { size: "w-32 h-16", type: "amberjack" };
  }
  if (s.includes("סרגוס") || s.includes("bream")) {
    return { size: "w-12 h-12", type: "bream" };
  }
  if (s.includes("פלמידה") || s.includes("mackerel")) {
    return { size: "w-28 h-12", type: "mackerel" };
  }
  
  // Generic
  return { size: "w-16 h-12", type: "generic" };
};

export default function VirtualAquarium({ catches }: { catches: any[] }) {
  // Extract unique fish species the user has caught
  const uniqueSpecies = useMemo(() => {
    if (!catches || catches.length === 0) return [];
    
    // Extract species
    const speciesMap = new Map();
    catches.forEach(c => {
      // The database field is fish_type, not fish_species
      const fishName = c.fish_type || c.fish_species; 
      
      if (fishName) {
        if (!speciesMap.has(fishName)) {
          speciesMap.set(fishName, {
            name: fishName,
            count: 1,
            asset: getFishAsset(fishName)
          });
        } else {
          speciesMap.get(fishName).count++;
        }
      }
    });
    
    return Array.from(speciesMap.values());
  }, [catches]);

  return (
    <div className="w-full h-[350px] relative rounded-3xl overflow-hidden shadow-inner border border-blue-900/30 bg-gradient-to-b from-blue-400 via-blue-600 to-blue-900">
      
      {/* Light rays from top */}
      <div className="absolute inset-0 pointer-events-none opacity-30 flex justify-around">
        <motion.div 
          animate={{ opacity: [0.1, 0.4, 0.1], x: [0, 20, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-full bg-gradient-to-b from-white to-transparent transform -skew-x-12 origin-top"
        />
        <motion.div 
          animate={{ opacity: [0.2, 0.5, 0.2], x: [0, -20, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="w-24 h-full bg-gradient-to-b from-white to-transparent transform -skew-x-12 origin-top"
        />
      </div>

      {/* Bubbles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={`bubble-${i}`}
            initial={{ y: "110%", x: Math.random() * 300, opacity: 0 }}
            animate={{ 
              y: "-10%", 
              x: Math.random() * 300,
              opacity: [0, 0.5, 0] 
            }}
            transition={{ 
              duration: 3 + Math.random() * 4, 
              repeat: Infinity, 
              ease: "easeOut",
              delay: Math.random() * 5
            }}
            className="absolute bottom-0 w-2 h-2 rounded-full border border-white/40 bg-white/10"
          />
        ))}
      </div>

      {/* Empty State */}
      {uniqueSpecies.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 z-20">
          <Fish className="w-12 h-12 mb-2 opacity-50" />
          <p className="font-bold text-sm">האקווריום ריק...</p>
          <p className="text-xs opacity-75 mt-1">צא לים ותעד תפיסות כדי למלא אותו!</p>
        </div>
      )}

      {/* The Fishes */}
      {uniqueSpecies.map((fish, i) => (
        <AnimatedFish key={i} fish={fish} index={i} total={uniqueSpecies.length} />
      ))}

      {/* Ocean floor */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-blue-950 to-transparent z-10" />

      {/* Stats Overlay */}
      <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10 z-30 flex items-center gap-2">
        <Fish className="w-4 h-4 text-cyan-400" />
        <span className="text-white text-xs font-bold">{uniqueSpecies.length} מינים באוסף</span>
      </div>
    </div>
  );
}

function AnimatedFish({ fish, index, total }: { fish: any, index: number, total: number }) {
  // Randomize start position
  const startY = 10 + (index * (80 / Math.max(1, total))) + Math.random() * 10;
  const duration = 15 + Math.random() * 15;
  const startLeft = Math.random() > 0.5;

  return (
    <motion.div
      initial={{ 
        x: startLeft ? "-20%" : "120%", 
        y: `${startY}%`,
        scaleX: startLeft ? 1 : -1
      }}
      animate={{ 
        x: startLeft ? ["-20%", "120%"] : ["120%", "-20%"],
        y: [`${startY}%`, `${startY - 5}%`, `${startY + 5}%`, `${startY}%`]
      }}
      transition={{ 
        x: { duration, repeat: Infinity, repeatType: "reverse", ease: "linear" },
        y: { duration: duration / 2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
      }}
      className={`absolute z-20 ${fish.asset.size} flex flex-col items-center group cursor-pointer`}
      style={{ top: 0, left: 0, width: '100px' }} // bounding box
    >
      <FishSvg type={fish.asset.type} className="w-full h-full drop-shadow-lg group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all" />
      
      {/* Label on hover */}
      <div className="opacity-0 group-hover:opacity-100 absolute -bottom-6 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap pointer-events-none transition-opacity">
        {fish.name} ({fish.count})
      </div>
    </motion.div>
  );
}

function FishSvg({ type, className }: { type: string, className?: string }) {
  // Return different SVGs based on type
  switch (type) {
    case 'grouper':
      return (
        <svg viewBox="0 0 100 50" className={className}>
          <path d="M85,25 C75,5 35,5 15,20 C5,25 0,20 0,20 C5,35 5,45 0,50 C15,45 25,40 35,45 C55,55 75,45 85,25 Z M95,15 C90,25 85,25 85,25 L95,40 Z" fill="#475569" />
          <circle cx="25" cy="22" r="2.5" fill="#0f172a" />
          <path d="M40,15 C55,10 65,15 65,15 C60,25 50,25 40,15 Z" fill="rgba(255,255,255,0.4)" />
          {/* Grouper spots */}
          <circle cx="45" cy="35" r="1.5" fill="rgba(255,255,255,0.3)" />
          <circle cx="60" cy="30" r="2" fill="rgba(255,255,255,0.3)" />
          <circle cx="70" cy="25" r="1.5" fill="rgba(255,255,255,0.3)" />
        </svg>
      );
    case 'amberjack':
      return (
        <svg viewBox="0 0 100 50" className={className}>
          <path d="M90,25 C75,15 45,10 20,20 C10,23 0,25 0,25 C10,27 20,28 30,30 C50,40 75,35 90,25 Z M98,10 C92,20 90,25 90,25 L98,40 Z" fill="#94a3b8" />
          <path d="M20,20 C45,10 75,15 90,25 C75,20 45,15 20,20 Z" fill="#cbd5e1" />
          <circle cx="22" cy="23" r="1.5" fill="#0f172a" />
          <path d="M50,15 C55,12 65,15 65,15 C60,18 55,18 50,15 Z" fill="rgba(255,255,255,0.6)" />
        </svg>
      );
    case 'bream':
      return (
        <svg viewBox="0 0 100 60" className={className}>
          <path d="M80,30 C70,0 40,0 20,20 C10,25 0,25 0,25 C10,35 15,45 25,50 C40,60 70,60 80,30 Z M95,15 C90,25 80,30 80,30 L95,45 Z" fill="#cbd5e1" />
          <circle cx="22" cy="22" r="2" fill="#0f172a" />
          <path d="M40,20 C45,10 55,15 55,15 C50,25 45,25 40,20 Z" fill="rgba(255,255,255,0.5)" />
          {/* Bream stripes */}
          <path d="M40,10 L40,50 M55,10 L55,50 M70,15 L70,45" stroke="rgba(0,0,0,0.2)" strokeWidth="3" fill="none" />
          <circle cx="75" cy="30" r="3" fill="rgba(0,0,0,0.4)" />
        </svg>
      );
    case 'mackerel':
      return (
        <svg viewBox="0 0 100 30" className={className}>
          <path d="M95,15 C75,5 40,5 15,12 C5,14 0,15 0,15 C5,16 15,18 30,22 C50,28 75,25 95,15 Z M100,5 C95,10 95,15 95,15 L100,25 Z" fill="#38bdf8" />
          {/* Silver belly */}
          <path d="M15,12 C40,5 75,5 95,15 C75,10 40,10 15,12 Z" fill="#e0f2fe" />
          <circle cx="18" cy="14" r="1" fill="#0f172a" />
          {/* Mackerel zig-zag stripes */}
          <path d="M30,8 L32,12 L35,7 M45,7 L47,12 L50,6 M60,8 L62,13 L65,7" stroke="#0284c7" strokeWidth="1.5" fill="none" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 100 50" className={className}>
          <path d="M80,25 C70,10 40,5 20,20 C10,25 0,20 0,20 C5,30 5,40 0,50 C10,45 20,40 30,45 C50,55 70,40 80,25 Z M95,15 C90,20 80,25 80,25 L95,35 Z" fill="rgba(255,255,255,0.8)" />
          <circle cx="25" cy="22" r="2" fill="#0f172a" />
          <path d="M45,15 C55,10 65,15 65,15 C60,20 50,20 45,15 Z" fill="rgba(255,255,255,0.5)" />
        </svg>
      );
  }
}
