import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { LiveCams } from "@/components/fishing/LiveCams";

export default function LiveCamsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">מצלמות חוף בלייב</h1>
      </div>

      <div className="pt-2">
        <LiveCams />
      </div>
    </div>
  );
}
