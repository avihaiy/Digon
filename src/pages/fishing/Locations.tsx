import FishingLayout from "@/components/fishing/FishingLayout";
import { motion } from "framer-motion";
import { MapPin, Navigation2, Star, Users } from "lucide-react";

export default function Locations() {
  const locations = [
    {
      id: 1,
      name: "מרינה אשדוד",
      type: "מים מלוחים",
      distance: "12 ק״מ",
      rating: 4.8,
      activity: "גבוהה",
      activityColor: "text-emerald-400 bg-emerald-400/10",
      image: "/fishing_bg.jpg",
    },
    {
      id: 2,
      name: "שובר גלים הרצליה",
      type: "מים מלוחים",
      distance: "34 ק״מ",
      rating: 4.5,
      activity: "בינונית",
      activityColor: "text-yellow-400 bg-yellow-400/10",
      image: "/fishing_bg.jpg",
    },
    {
      id: 3,
      name: "פארק הירקון",
      type: "מים מתוקים",
      distance: "41 ק״מ",
      rating: 3.9,
      activity: "נמוכה",
      activityColor: "text-rose-400 bg-rose-400/10",
      image: "/fishing_bg.jpg",
    }
  ];

  return (
    <FishingLayout>
      <div className="px-4 pt-6 pb-20">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-black text-white text-start">מיקומי דייג</h1>
          <p className="text-cyan-400 text-sm mt-1">גלה את הספוטים החמים באזורך</p>
        </motion.div>

        {/* Map Placeholder */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full h-48 rounded-[2rem] bg-slate-800 relative overflow-hidden mb-8 border border-white/10"
        >
          <img src="/fishing_bg.jpg" alt="Map" className="w-full h-full object-cover opacity-50 blur-sm scale-110" />
          <div className="absolute inset-0 bg-blue-900/40 mix-blend-overlay"></div>
          
          {/* Fake Map Pins */}
          <div className="absolute top-1/4 start-1/3">
            <div className="relative">
              <div className="w-4 h-4 bg-cyan-400 rounded-full animate-ping absolute opacity-75"></div>
              <div className="w-4 h-4 bg-cyan-400 rounded-full relative border-2 border-white shadow-[0_0_10px_cyan]"></div>
            </div>
          </div>
          <div className="absolute bottom-1/3 end-1/4">
            <div className="w-4 h-4 bg-rose-500 rounded-full border-2 border-white shadow-[0_0_10px_red]"></div>
          </div>
          
          <button className="absolute bottom-4 end-4 bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 shadow-lg text-white">
            <Navigation2 className="w-5 h-5" />
          </button>
        </motion.div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-white">מומלצים עבורך</h3>
          </div>
          
          {locations.map((loc, i) => (
            <motion.div 
              key={loc.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-[1.5rem] p-3 border border-white/5 flex gap-4 items-center cursor-pointer hover:bg-white/10 transition-colors"
            >
              <img src={loc.image} alt={loc.name} className="w-20 h-20 rounded-2xl object-cover border border-white/10" />
              <div className="flex-1">
                <h4 className="font-bold text-white text-lg leading-tight">{loc.name}</h4>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>{loc.type}</span>
                  <span>•</span>
                  <span>{loc.distance}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-yellow-400" />
                    {loc.rating}
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${loc.activityColor}`}>
                    <Users className="w-3 h-3" />
                    פעילות {loc.activity}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </FishingLayout>
  );
}
