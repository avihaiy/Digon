import { NavLink } from "react-router-dom";
import { Home, Users, Waves, MapPin, Fish, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navItems = [
    { icon: Home, label: "בית", path: "/fishing" },
    { icon: Users, label: "קהילה", path: "/fishing/community" },
    { icon: Waves, label: "תחזית", path: "/fishing/forecast" },
    { icon: MapPin, label: "מיקומים", path: "/fishing/locations" },
    { icon: Fish, label: "זיהוי", path: "/fishing/identify" },
    { icon: BookOpen, label: "אלבום", path: "/fishing/album" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#0B1426] border-t border-slate-800 flex items-center justify-between px-2 pb-safe z-50">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs transition-colors",
              isActive ? "text-blue-400" : "text-slate-400 hover:text-slate-300"
            )
          }
        >
          <item.icon className="w-5 h-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
};

export default BottomNav;
