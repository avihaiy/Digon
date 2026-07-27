import FishingLayout from "@/components/fishing/FishingLayout";
import { motion } from "framer-motion";
import { Waves, Wind, Sun, Clock } from "lucide-react";

export default function Forecast() {
  return (
    <FishingLayout>
      <div className="px-4 pt-6 pb-20">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-black text-white text-start">תחזית דייג</h1>
          <p className="text-cyan-400 text-sm mt-1">מצב הים וסיכויי תפיסה</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-blue-600/30 to-cyan-800/30 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden"
        >
          <div className="absolute top-0 end-0 p-4">
            <Sun className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-[spin_10s_linear_infinite]" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-6">מרינה אשדוד</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-[1.5rem] flex flex-col items-center justify-center border border-white/5">
              <Waves className="w-8 h-8 text-cyan-400 mb-2" />
              <div className="text-2xl font-black text-white">40<span className="text-sm font-normal text-slate-300 ms-1">ס״מ</span></div>
              <div className="text-xs text-cyan-200 mt-1">גובה גלים</div>
            </div>
            
            <div className="bg-white/5 p-4 rounded-[1.5rem] flex flex-col items-center justify-center border border-white/5">
              <Wind className="w-8 h-8 text-blue-400 mb-2" />
              <div className="text-2xl font-black text-white">12<span className="text-sm font-normal text-slate-300 ms-1">קמ״ש</span></div>
              <div className="text-xs text-blue-200 mt-1">רוח צפון-מערבית</div>
            </div>
          </div>

          <div className="mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-emerald-400 font-bold text-lg">תנאים אופטימליים!</div>
              <div className="text-emerald-200/70 text-sm">הים רגוע והמים צלולים.</div>
            </div>
            <div className="text-4xl">🎣</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            חלונות זמן פוטנציאליים
          </h3>
          <div className="space-y-3">
            {[
              { time: "06:00 - 08:30", label: "בוקר", rating: "מעולה", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
              { time: "11:00 - 15:00", label: "צהריים", rating: "חלש", color: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/20" },
              { time: "18:30 - 21:00", label: "ערב", rating: "טוב מאוד", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
            ].map((slot, i) => (
              <div key={i} className={`p-4 rounded-[1.5rem] border ${slot.bg} flex items-center justify-between backdrop-blur-sm`}>
                <div>
                  <div className="font-bold text-white text-lg">{slot.time}</div>
                  <div className="text-sm text-slate-300">{slot.label}</div>
                </div>
                <div className={`font-black ${slot.color}`}>
                  {slot.rating}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </FishingLayout>
  );
}
