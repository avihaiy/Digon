import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import { PWAUpdatePrompt } from "../PWAUpdatePrompt";

interface FishingLayoutProps {
  children: ReactNode;
}

const FishingLayout = ({ children }: FishingLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#020610] text-slate-100 font-sans pb-24 relative overflow-x-hidden selection:bg-cyan-500/30">
      {/* Background ambient lighting */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 max-w-lg mx-auto">
        {children}
      </div>
      <div className="max-w-lg mx-auto">
        <BottomNav />
      </div>
      <PWAUpdatePrompt />
    </div>
  );
};

export default FishingLayout;
