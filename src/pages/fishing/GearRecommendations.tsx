import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_STORE_ITEMS_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, ExternalLink, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function GearRecommendations() {
  const { data: storeItems, isLoading } = useQuery({
    queryKey: ["store-items-aliexpress"],
    queryFn: async () => {
      const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_STORE_ITEMS_ID, [
        Query.equal("is_active", true),
        Query.equal("type", "aliexpress"),
        Query.limit(100)
      ]);
      return res.documents;
    }
  });
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto min-h-[calc(100vh-80px)]">
      <div className="sticky top-0 z-40 bg-[#020610]/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5">
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-black text-xl text-white tracking-tight leading-none text-start flex items-center gap-2">
            המלצות ציוד <ShoppingCart className="w-5 h-5 text-orange-500" />
          </h1>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <div className="p-4 bg-orange-500/10 rounded-full mb-3">
            <ShoppingCart className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="font-black text-2xl text-slate-900 dark:text-white mb-2">
            הציוד המומלץ שלנו
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            ציוד דייג איכותי שנבדק על ידי הצוות במים של ישראל, זמין לרכישה ישירה ובטוחה באליאקספרס 🎣
          </p>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 w-full text-xs text-orange-600 dark:text-orange-400">
            <strong>חשוב לדעת:</strong> אני לא מוכר את הציוד ואין הבטחה ממני על המוצרים, אני רק ממליץ על מוצרים טובים מאלי אקספרס.
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground mt-10">טוען המלצות...</div>
        ) : storeItems?.length === 0 ? (
          <div className="text-center text-muted-foreground mt-10 bg-slate-900/50 p-6 rounded-2xl border border-white/5">
            אין כרגע המלצות ציוד. חזור מאוחר יותר!
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {storeItems?.map((item, i) => (
              <motion.a 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={item.$id} 
                href={item.value} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block group"
              >
                <Card className="h-full border-orange-500/20 bg-gradient-to-b from-white to-orange-50/30 dark:from-slate-900 dark:to-orange-900/10 hover:shadow-xl hover:shadow-orange-500/10 transition-all hover:-translate-y-1 overflow-hidden relative">
                  <div className="aspect-square w-full bg-white dark:bg-slate-800 relative overflow-hidden">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ShoppingCart className="w-8 h-8 opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                      מומלץ דייגון
                    </div>
                  </div>
                  <CardContent className="p-4 flex flex-col justify-between h-[calc(100%-100%)] bg-slate-900/40 backdrop-blur-sm">
                    <div>
                      <h4 className="font-bold text-sm leading-tight line-clamp-2 mb-1.5 group-hover:text-orange-400 transition-colors text-white">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/10">
                      <span className="text-xs font-black text-orange-400 group-hover:text-orange-300 flex items-center gap-1.5 transition-colors">
                        קנה באליאקספרס <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
