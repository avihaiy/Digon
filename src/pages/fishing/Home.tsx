import { useAuth } from "@/hooks/useAuth";
import FishingLayout from "@/components/fishing/FishingLayout";
import { Settings, Trophy, MapPin, Waves, Play, Fish, ChevronLeft, ChevronRight, MoreHorizontal, Bell, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// Helper for circular progress with Framer Motion and Glow
const CircularProgress = ({ value, label, subLabel, color, glowColor }: { value: number, label: string, subLabel: string, color: string, glowColor: string }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="transform -rotate-90 w-24 h-24 drop-shadow-xl" style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}>
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
            fill="transparent"
          />
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            cx="48"
            cy="48"
            r={radius}
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
          />
        </svg>
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute text-2xl font-black text-white"
          style={{ textShadow: `0 0 10px ${glowColor}` }}
        >
          {value}
        </motion.span>
      </div>
      <div className="mt-3 font-bold text-sm tracking-wide text-slate-200">{label}</div>
      <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{subLabel}</div>
    </div>
  );
};

const ActionButton = ({ icon: Icon, label, delay }: { icon: LucideIcon, label: string, delay: number }) => (
  <motion.button 
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="relative overflow-hidden flex flex-col items-center justify-center p-5 rounded-[2rem] bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-xl border border-white/10 transition-colors group shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <Icon className="w-8 h-8 mb-3 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] group-hover:text-cyan-300 transition-colors z-10" />
    <span className="font-semibold text-sm text-slate-200 z-10">{label}</span>
  </motion.button>
);

const Home = () => {
  const { user } = useAuth();
  
  return (
    <FishingLayout>
      {/* Top Bar - Sticky Glassmorphism */}
      <motion.div 
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-40 bg-[#020610]/80 backdrop-blur-2xl border-b border-white/5 px-5 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <img src="/digon-logo.jpg" alt="Digon" className="w-10 h-10 rounded-xl shadow-lg border border-white/10 object-cover" />
          <div className="flex flex-col">
            <h1 className="font-black text-xl text-white tracking-tight leading-none text-start">דיגון</h1>
            <span className="text-[11px] text-cyan-400 font-medium mt-1">קהילת הדייגים בישראל</span>
          </div>
        </div>
        <button className="relative p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5">
          <Bell className="w-5 h-5 text-slate-300" />
          <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(225,29,72,0.8)] animate-pulse"></span>
        </button>
      </motion.div>

      <div className="px-4 pb-10">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative mt-5 rounded-[2.5rem] overflow-hidden h-72 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
        >
          <img 
            src="/fishing_bg.jpg" 
            alt="Fishing Sunset" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#020610]/60 via-transparent to-[#020610]"></div>
          
          <div className="absolute top-5 start-5 text-start z-10">
            <div className="text-slate-300 text-xs font-medium tracking-wider mb-1">ברוך הבא,</div>
            <div className="text-white font-black text-2xl flex items-center justify-start gap-2 drop-shadow-lg">
              {user?.email?.split('@')[0] || 'avihaiy'} <motion.span animate={{ rotate: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }} className="text-2xl origin-bottom-right">👋</motion.span>
            </div>
          </div>
          
          {/* Action Buttons (Login / Management) */}
          <div className="absolute top-5 end-5 flex flex-col gap-2 z-10">
            {!user ? (
              <Link to="/login" className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg transition-colors border border-cyan-400/50 flex items-center gap-1">
                התחברות למערכת
              </Link>
            ) : (
              <Link to="/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg transition-colors border border-blue-500/50 flex items-center gap-1">
                <Settings className="w-3.5 h-3.5" />
                ניהול
              </Link>
            )}
          </div>

          <div className="absolute bottom-5 start-0 text-start z-10 w-full px-5">
            <h2 className="text-4xl font-black text-white drop-shadow-2xl mb-2 flex items-center justify-start gap-3">
              דיג בישראל 
              <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]">🎣</span>
            </h2>
            <div className="inline-flex items-center gap-2 bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 px-3 py-1.5 rounded-full text-yellow-400 font-bold text-sm shadow-[0_0_15px_rgba(234,179,8,0.2)]">
              <span>הכי טוב היום: מרכז — ציון 44</span>
              <Trophy className="w-4 h-4" />
            </div>
          </div>
        </motion.div>

        {/* Daily Score Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px] -z-10" />
          
          <div className="flex justify-between items-center mb-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 text-cyan-300 font-medium text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
              <span>08:53</span>
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></div>
            </div>
            <h3 className="font-black flex items-center gap-2 text-xl text-white">
              ציון דייג יומי
            </h3>
          </div>
          
          <div className="flex justify-between items-end px-1 relative">
            <CircularProgress value={37} label="דרום" subLabel="גרוע" color="#ef4444" glowColor="rgba(239,68,68,0.5)" />
            
            {/* Center prominent score */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md rounded-[2rem] p-3 -mx-2 shadow-[0_0_30px_rgba(34,211,238,0.15)] border border-white/20 transform scale-110 relative z-10"
            >
              <CircularProgress value={44} label="מרכז" subLabel="בינוני" color="#06b6d4" glowColor="rgba(6,182,212,0.6)" />
            </motion.div>
            
            <CircularProgress value={28} label="צפון" subLabel="גרוע" color="#ef4444" glowColor="rgba(239,68,68,0.5)" />
          </div>
        </motion.div>

        {/* Points Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-5 relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 backdrop-blur-xl rounded-[2.5rem] p-6 border border-yellow-500/30 flex items-center justify-between shadow-[0_10px_40px_rgba(245,158,11,0.15)] group cursor-pointer"
        >
          {/* Animated shine effect */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
          
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-[0_0_25px_rgba(245,158,11,0.4)] -rotate-3 group-hover:-rotate-12 transition-transform duration-500">
            <Fish className="w-8 h-8 text-white drop-shadow-md" />
          </div>
          <div className="text-start flex-1 px-5">
            <div className="flex flex-col items-start">
              <span className="text-4xl font-black bg-gradient-to-r from-yellow-200 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">165</span>
              <span className="text-yellow-500 font-bold text-sm tracking-widest mt-0.5">CoinsISR</span>
            </div>
            <div className="text-amber-200/70 text-xs font-medium mt-1.5">צבור מטבעות לפתיחת תוכן בלעדי</div>
          </div>
          <ChevronLeft className="w-5 h-5 text-yellow-500/70" />
        </motion.div>

        {/* Golden Windows */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <div className="flex items-center justify-start gap-2 mb-4">
            <div className="bg-yellow-500/20 p-1.5 rounded-full text-yellow-400">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="font-black text-lg text-white">חלונות זהב לדייג היום</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <motion.div whileHover={{ scale: 1.02 }} className="relative rounded-[2rem] overflow-hidden h-32 border border-white/10 shadow-lg cursor-pointer">
              <img src="/fishing_bg.jpg" alt="Evening" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020610]/90 via-[#020610]/40 to-transparent"></div>
              <div className="absolute bottom-4 w-full text-center">
                <div className="font-black text-xl text-white tracking-wide">20:15–19:00</div>
                <div className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1 mt-1">שעת ערב 🌇</div>
              </div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="relative rounded-[2rem] overflow-hidden h-32 border border-white/10 shadow-lg cursor-pointer">
              <img src="/fishing_bg.jpg" alt="Morning" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-[#020610]/40"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/90 via-cyan-900/30 to-transparent"></div>
              <div className="absolute bottom-4 w-full text-center">
                <div className="font-black text-xl text-white tracking-wide">06:45–05:00</div>
                <div className="text-xs font-bold text-cyan-300 flex items-center justify-center gap-1 mt-1">שעת בוקר 🌅</div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <ActionButton icon={Waves} label="תחזיות דייג" delay={0.5} />
          <ActionButton icon={MapPin} label="מיקומי דייג" delay={0.6} />
          <ActionButton icon={Fish} label="זיהוי דגים" delay={0.7} />
          <ActionButton icon={Play} label="עדכון מהשטח" delay={0.8} />
        </div>

        {/* Add Location Button */}
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="w-full mt-6 py-5 rounded-[2rem] bg-cyan-500/10 border border-dashed border-cyan-500/30 text-cyan-400 font-bold text-base flex items-center justify-center gap-3 hover:bg-cyan-500/20 transition-colors"
        >
          <div className="bg-cyan-500/20 p-1.5 rounded-full">
            <MapPin className="w-5 h-5" />
          </div>
          הוסף מיקום דייג חדש
        </motion.button>
      </div>
    </FishingLayout>
  );
};

export default Home;
