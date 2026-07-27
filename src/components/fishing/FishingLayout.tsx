import { ReactNode } from "react";
import BottomNav from "./BottomNav";

interface FishingLayoutProps {
  children: ReactNode;
}

const FishingLayout = ({ children }: FishingLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-16">
      {children}
      <BottomNav />
    </div>
  );
};

export default FishingLayout;
