import { useAuth } from "@/hooks/useAuth";
import FishingLayout from "@/components/fishing/FishingLayout";
import { Settings, Trophy, MapPin, Waves, Play, Fish, ChevronLeft, MoreHorizontal, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper for circular progress
const CircularProgress = ({ value, label, subLabel, color }: { value: number, label: string, subLabel: string, color: string }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="transform -rotate-90 w-24 h-24">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-slate-800"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        <span className={cn("absolute text-xl font-bold", value > 40 ? "text-orange-500" : "text-red-500")}>
          {value}
        </span>
      </div>
      <div className="mt-2 font-medium text-sm">{label}</div>
      <div className="text-xs text-slate-400 mt-0.5">{subLabel}</div>
    </div>
  );
};

const ActionButton = ({ icon: Icon, label, bgClass }: { icon: LucideIcon, label: string, bgClass?: string }) => (
  <button className={cn("flex flex-col items-center justify-center p-4 rounded-2xl bg-[#0F1C35] hover:bg-[#152545] transition-colors border border-slate-800", bgClass)}>
    <Icon className="w-8 h-8 mb-3 text-blue-400 drop-shadow-md" />
    <span className="font-semibold text-sm">{label}</span>
  </button>
);

const Home = () => {
  const { user } = useAuth();
  
  return (
    <FishingLayout>
      {/* Top Bar */}
      <div className="bg-white text-black px-4 py-3 flex items-center justify-between rounded-b-3xl sticky top-0 z-40">
        <button className="text-blue-500 font-medium">Close</button>
        <div className="text-center flex-1">
          <h1 className="font-bold text-lg leading-tight">דיג בישראל</h1>
          <span className="text-xs text-slate-500">mini app</span>
        </div>
        <button className="text-blue-500">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>

      <div className="px-4 pb-24">
        {/* Hero Section */}
        <div className="relative mt-4 rounded-3xl overflow-hidden h-64 shadow-2xl">
          <img 
            src="/fishing_bg.jpg" 
            alt="Fishing Sunset" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-black/40 to-black/10"></div>
          
          <div className="absolute top-4 right-4 text-right">
            <div className="text-slate-300 text-sm">ברוך הבא,</div>
            <div className="text-white font-bold text-xl flex items-center justify-end gap-2">
              {user?.email?.split('@')[0] || 'avihaiy'} <span className="text-2xl">👋</span>
            </div>
          </div>
          
          <div className="absolute top-4 left-4 bg-black/40 p-2 rounded-full backdrop-blur-md">
            <Settings className="w-5 h-5 text-slate-300" />
          </div>

          <div className="absolute bottom-4 right-4 text-right">
            <h2 className="text-3xl font-black text-white drop-shadow-lg mb-1 flex items-center justify-end gap-2">
              דיג בישראל <span className="text-2xl">🎣</span>
            </h2>
            <div className="flex items-center justify-end gap-2 text-yellow-400 font-medium text-sm">
              <span>הכי טוב היום: מרכז — ציון 44</span>
              <Trophy className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Daily Score Section */}
        <div className="mt-6 bg-[#0F1C35] rounded-3xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div className="bg-slate-800/50 text-slate-300 text-xs px-3 py-1 rounded-full flex items-center gap-1">
              <span>08:53</span>
              <div className="w-2 h-2 rounded-full bg-slate-400 ml-1"></div>
            </div>
            <h3 className="font-bold flex items-center gap-2 text-lg">
              ציון דייג יומי
              <span className="text-xl">📊</span>
            </h3>
          </div>
          
          <div className="flex justify-between items-end px-2">
            <CircularProgress value={37} label="דרום" subLabel="גרוע" color="#ef4444" />
            <div className="bg-[#15274C] rounded-2xl p-2 -mx-2 shadow-lg border border-slate-700/50 transform scale-110">
              <CircularProgress value={44} label="מרכז" subLabel="בינוני" color="#f97316" />
            </div>
            <CircularProgress value={28} label="צפון" subLabel="גרוע" color="#ef4444" />
          </div>
        </div>

        {/* Points Banner */}
        <div className="mt-4 bg-gradient-to-r from-[#2a1c0d] to-[#4a3219] rounded-3xl p-5 border border-yellow-900/50 flex items-center justify-between shadow-lg">
          <ChevronLeft className="w-5 h-5 text-yellow-600" />
          <div className="text-right flex-1 pr-4">
            <div className="text-3xl font-black text-yellow-500 mb-1 drop-shadow-md">165</div>
            <div className="text-yellow-400/80 font-bold text-sm mb-1">CoinsISR</div>
            <div className="text-yellow-600/70 text-xs">צבור מטבעות לפתיחת תוכן בלעדי</div>
          </div>
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center shrink-0 border border-yellow-500/30">
            <Fish className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        {/* Golden Windows */}
        <div className="mt-6">
          <h3 className="font-bold flex items-center gap-2 mb-4 text-right justify-end text-blue-100">
            חלונות זהב לדייג היום <span className="text-slate-400">🕒</span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative rounded-2xl overflow-hidden h-28 border border-slate-800">
              <img src="/fishing_bg.jpg" alt="Evening" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-3 w-full text-center">
                <div className="font-bold text-lg text-white">20:15–19:00</div>
                <div className="text-xs text-orange-300 flex items-center justify-center gap-1">שעת ערב 🌇</div>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden h-28 border border-slate-800">
              <img src="/fishing_bg.jpg" alt="Morning" className="absolute inset-0 w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 to-transparent"></div>
              <div className="absolute bottom-3 w-full text-center">
                <div className="font-bold text-lg text-white">06:45–05:00</div>
                <div className="text-xs text-blue-300 flex items-center justify-center gap-1">שעת בוקר 🌅</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <ActionButton icon={Waves} label="תחזיות דייג" />
          <ActionButton icon={MapPin} label="מיקומי דייג" />
          <ActionButton icon={Fish} label="זיהוי דגים" />
          <ActionButton icon={Play} label="עדכון מהשטח" />
        </div>

        {/* Add Location Button */}
        <button className="w-full mt-6 py-4 rounded-2xl bg-[#0F1C35] border border-dashed border-slate-700 text-blue-400 font-medium flex items-center justify-center gap-2 hover:bg-[#152545] transition-colors">
          <MapPin className="w-5 h-5" />
          הוסף מיקום דייג חדש
        </button>
      </div>
    </FishingLayout>
  );
};

export default Home;
