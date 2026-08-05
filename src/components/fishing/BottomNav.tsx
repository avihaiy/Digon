import { NavLink } from "react-router-dom";
import { Home, Users, Waves, MapPin, Fish, PlaySquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const BottomNav = () => {
  const navItems = [
    { icon: Home, label: "בית", path: "/" },
    { icon: Users, label: "קהילה", path: "/fishing/community" },
    { icon: PlaySquare, label: "Reels", path: "/fishing/reels" },
    { icon: Waves, label: "תחזית", path: "/fishing/forecast" },
    { icon: MapPin, label: "מיקומים", path: "/fishing/locations" },
  ];

  return (
    <div className="fixed bottom-0 sm:bottom-6 left-0 sm:left-1/2 sm:-translate-x-1/2 w-full sm:w-[90%] max-w-md z-50">
      <div className="mx-2 mb-2 sm:mb-0 bg-[#0B1426]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.5)] px-2 py-3 flex items-center justify-between relative overflow-hidden">
        {/* Ambient glow inside nav */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
        
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "relative flex flex-col items-center justify-center w-full space-y-1 transition-all duration-300",
                isActive ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
              )
            }
          >
            {({ isActive }) => (
              <>
                <motion.div
                  initial={false}
                  animate={{ 
                    y: isActive ? -4 : 0,
                    scale: isActive ? 1.1 : 1 
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative"
                >
                  <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]")} />
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                  )}
                </motion.div>
                <span className={cn(
                  "text-[10px] font-medium transition-all duration-300",
                  isActive ? "opacity-100 font-bold" : "opacity-70"
                )}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;
