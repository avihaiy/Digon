import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_STORE_ITEMS_ID, APPWRITE_PURCHASES_ID } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store as StoreIcon, ShieldCheck, Ticket, User, Gem, Sparkles, AlertTriangle, ShoppingCart, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Store() {
  const { points, profileData, updateProfileField } = useAuth();
  const [loading, setLoading] = useState(false);

  // Fetch Store Items
  const { data: storeItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["store-items"],
    queryFn: async () => {
      const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_STORE_ITEMS_ID, [
        Query.equal("is_active", true),
        Query.limit(100)
      ]);
      return res.documents;
    }
  });

  const buyItem = async (cost: number, field: string, value: any, itemName: string, isIncrement = false) => {
    if (points < cost) {
      toast.error("אין לך מספיק נקודות דיגון!");
      return;
    }

    setLoading(true);
    try {
      // Deduct points
      const newPoints = points - cost;
      await updateProfileField('points', newPoints);

      // Give item
      let finalValue = value;
      if (isIncrement) {
        const currentVal = profileData?.[field] || 0;
        finalValue = currentVal + value;
      }
      
      const success = await updateProfileField(field, finalValue);
      if (success) {
        // Record the purchase
        try {
          await databases.createDocument(APPWRITE_DB_ID, APPWRITE_PURCHASES_ID, ID.unique(), {
            user_name: profileData?.full_name || profileData?.name || "משתמש דיגון",
            item_name: itemName,
            price: cost
          });
        } catch (e) {
          console.error("Failed to record purchase", e);
        }
        
        toast.success(`התחדשת ב-${itemName}!`);
      } else {
        toast.error("אירעה שגיאה בביצוע הרכישה.");
      }
    } catch (e) {
      toast.error("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  };

  const hasGoldBorder = profileData?.border === 'gold';
  const hasTitleMaster = profileData?.title === 'מלך הלוקוסים';
  const ticketsCount = profileData?.tickets || 0;
  const aiCredits = profileData?.ai_credits || 0;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto min-h-[calc(100vh-80px)]">
      <div className="flex flex-col px-4 mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          חנות דיגון <StoreIcon className="w-6 h-6 text-primary" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          המר את הנקודות שלך להטבות מטורפות
        </p>
      </div>

      <div className="px-4">
        <Card className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/20 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-full">
                <span className="text-xl">🪙</span>
              </div>
              <div>
                <p className="text-xs text-yellow-600 dark:text-yellow-500 font-bold">היתרה שלך</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{points} נק׳</p>
              </div>
            </div>
            {points < 50 && (
              <div className="text-xs text-muted-foreground bg-background/50 px-3 py-1.5 rounded-full border border-border">
                תעלה תפיסות כדי להרוויח עוד
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 space-y-4">
        {itemsLoading && <p className="text-center py-8">טוען את מוצרי החנות...</p>}
        
        {/* Cosmetics */}
        {storeItems && storeItems.filter(i => i.type === 'title' || i.type === 'border').length > 0 && (
          <div>
            <h3 className="font-bold text-base mb-3 flex items-center gap-2">
              <Gem className="w-5 h-5 text-purple-500" /> עיצוב פרופיל
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {storeItems.filter(i => i.type === 'title' || i.type === 'border').map((item) => {
                const isOwned = profileData?.[item.type] === item.value;
                const isGold = item.value === 'gold';
                const Icon = isGold ? User : ShieldCheck;
                
                return (
                  <Card key={item.$id} className={`border-2 ${isOwned ? 'border-primary' : 'border-border/50'}`}>
                    <CardContent className="p-4 text-center flex flex-col h-full">
                      <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${isGold ? 'border-4 border-yellow-400 bg-muted' : 'bg-primary/10'}`}>
                        <Icon className={`w-6 h-6 ${isGold ? 'text-yellow-600' : 'text-primary'}`} />
                      </div>
                      <h4 className="font-bold text-sm mb-1">{item.name}</h4>
                      <p className="text-xs text-muted-foreground mb-3 flex-1">{item.description}</p>
                      {isOwned ? (
                        <Button disabled variant="outline" className="w-full h-8 text-xs font-bold text-primary border-primary mt-auto">בבעלותך</Button>
                      ) : (
                        <Button 
                          disabled={loading || points < item.cost} 
                          onClick={() => buyItem(item.cost, item.type, item.value, item.name)}
                          className={`w-full h-8 text-xs font-bold text-white mt-auto ${isGold ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-primary hover:bg-primary/90'}`}
                        >
                          {item.cost} נק׳
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Raffles */}
        {storeItems && storeItems.filter(i => i.type === 'tickets').length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-base mb-3 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-rose-500" /> כרטיסי הגרלה
            </h3>
            {storeItems.filter(i => i.type === 'tickets').map((item) => (
              <Card key={item.$id} className="border-rose-500/30 bg-rose-500/5 mb-3">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">{item.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-600 rounded-full text-xs font-bold border border-rose-500/20">
                      <Ticket className="w-3.5 h-3.5" /> יש לך {ticketsCount} כרטיסים
                    </div>
                  </div>
                  <Button 
                    disabled={loading || points < item.cost} 
                    onClick={() => buyItem(item.cost, item.type, parseInt(item.value) || 1, item.name, true)}
                    className="h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 font-bold px-6 shrink-0"
                  >
                    {item.cost} נק׳
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* AI Credits */}
        {storeItems && storeItems.filter(i => i.type === 'ai_credits').length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-base mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" /> זיהוי דגים ב-AI
            </h3>
            {storeItems.filter(i => i.type === 'ai_credits').map((item) => (
              <Card key={item.$id} className="border-indigo-500/30 bg-indigo-500/5 mb-3">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">{item.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-600 rounded-full text-xs font-bold border border-indigo-500/20">
                      <Sparkles className="w-3.5 h-3.5" /> נשארו לך {aiCredits} סריקות
                    </div>
                  </div>
                  <Button 
                    disabled={loading || points < item.cost} 
                    onClick={() => buyItem(item.cost, item.type, parseInt(item.value) || 1, item.name, true)}
                    className="h-12 rounded-2xl bg-indigo-500 hover:bg-indigo-600 font-bold px-6 shrink-0"
                  >
                    {item.cost} נק׳
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Other Features */}
        {storeItems && storeItems.filter(i => i.type !== 'title' && i.type !== 'border' && i.type !== 'tickets' && i.type !== 'ai_credits' && i.type !== 'aliexpress').length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-base mb-3 flex items-center gap-2">
              <StoreIcon className="w-5 h-5 text-blue-500" /> מוצרים נוספים
            </h3>
            {storeItems.filter(i => i.type !== 'title' && i.type !== 'border' && i.type !== 'tickets' && i.type !== 'ai_credits' && i.type !== 'aliexpress').map((item) => (
              <Card key={item.$id} className="mb-3">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">{item.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                  <Button 
                    disabled={loading || points < item.cost} 
                    onClick={() => buyItem(item.cost, item.type, isNaN(Number(item.value)) ? item.value : Number(item.value), item.name, !isNaN(Number(item.value)))}
                    className="h-12 rounded-2xl font-bold px-6 shrink-0"
                  >
                    {item.cost} נק׳
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* AliExpress Recommendations */}
        {storeItems && storeItems.filter(i => i.type === 'aliexpress').length > 0 && (
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col items-center justify-center text-center mb-6">
              <div className="p-3 bg-orange-500/10 rounded-full mb-2">
                <ShoppingCart className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="font-black text-xl text-slate-900 dark:text-white">
                המלצות הציוד שלנו
              </h3>
              <p className="text-sm text-muted-foreground max-w-[250px] mt-1">
                ציוד דייג מומלץ שנבדק על ידי הצוות, זמין לרכישה ישירה באליאקספרס 🎣
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {storeItems.filter(i => i.type === 'aliexpress').map((item) => (
                <a 
                  key={item.$id} 
                  href={item.value} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <Card className="h-full border-orange-500/20 bg-gradient-to-b from-white to-orange-50/30 dark:from-slate-900 dark:to-orange-900/10 hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden relative">
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
                      <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        מומלץ
                      </div>
                    </div>
                    <CardContent className="p-3 flex flex-col justify-between h-[calc(100%-100%)]">
                      <div>
                        <h4 className="font-bold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-orange-500 transition-colors">
                          {item.name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                          {item.description}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                        <span className="text-xs font-black text-orange-600 dark:text-orange-500 flex items-center gap-1">
                          קנה עכשיו <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
