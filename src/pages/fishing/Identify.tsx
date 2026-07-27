import FishingLayout from "@/components/fishing/FishingLayout";
import { motion } from "framer-motion";
import { ScanSearch, UploadCloud, Camera } from "lucide-react";

export default function Identify() {
  return (
    <FishingLayout>
      <div className="px-4 pt-6 pb-20 flex flex-col h-[calc(100vh-80px)]">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-black text-white text-start">זיהוי דגים חכם</h1>
          <p className="text-cyan-400 text-sm mt-1">צלם דג והבינה המלאכותית תזהה אותו</p>
        </motion.div>

        <div className="flex-1 flex flex-col justify-center items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="relative w-64 h-64 mb-10"
          >
            {/* Animated Scanner UI */}
            <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-3xl"></div>
            
            {/* Corner brackets */}
            <div className="absolute top-0 start-0 w-8 h-8 border-t-4 border-s-4 border-cyan-400 rounded-tl-3xl"></div>
            <div className="absolute top-0 end-0 w-8 h-8 border-t-4 border-e-4 border-cyan-400 rounded-tr-3xl"></div>
            <div className="absolute bottom-0 start-0 w-8 h-8 border-b-4 border-s-4 border-cyan-400 rounded-bl-3xl"></div>
            <div className="absolute bottom-0 end-0 w-8 h-8 border-b-4 border-e-4 border-cyan-400 rounded-br-3xl"></div>
            
            {/* Scanning line animation */}
            <motion.div 
              animate={{ y: [0, 240, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              className="absolute top-0 start-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_3px_rgba(34,211,238,0.8)]"
            />
            
            <div className="absolute inset-0 flex items-center justify-center">
              <ScanSearch className="w-16 h-16 text-cyan-500/50 animate-pulse" />
            </div>
          </motion.div>

          <div className="w-full space-y-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 p-4 rounded-full text-white font-bold text-lg shadow-[0_10px_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-3"
            >
              <Camera className="w-6 h-6" />
              פתח מצלמה
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-full text-white font-bold text-lg flex items-center justify-center gap-3 hover:bg-white/10 transition-colors"
            >
              <UploadCloud className="w-6 h-6 text-cyan-400" />
              העלה תמונה מהגלריה
            </motion.button>
          </div>
          
          <div className="mt-8 text-center text-sm text-slate-400 px-6">
            המערכת תספק מידע על סוג הדג, האם הוא מותר למאכל, וטיפים לדייג הבא!
          </div>
        </div>
      </div>
    </FishingLayout>
  );
}
