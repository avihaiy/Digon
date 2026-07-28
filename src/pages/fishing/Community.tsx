import { useQuery } from "@tanstack/react-query";
import { databases, storage, APPWRITE_DB_ID, APPWRITE_ADS_ID, APPWRITE_CATCH_IMAGES_BUCKET_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Phone, Tag } from "lucide-react";
import { MarketplaceAdDialog } from "@/components/community/MarketplaceAdDialog";
import { motion } from "framer-motion";

export default function Community() {
  const { data: ads, isLoading } = useQuery({
    queryKey: ["marketplace-ads"],
    queryFn: async () => {
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_ADS_ID, [
          Query.orderDesc("$createdAt"),
          Query.limit(50)
        ]);
        // Only show approved ads
        return res.documents.filter((doc: any) => doc.status === 'approved');
      } catch (e) {
        return [];
      }
    },
  });

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 mt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            שוק קהילתי <ShoppingCart className="w-6 h-6 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            קנייה ומכירה של ציוד יד שנייה
          </p>
        </div>
      </div>

      {/* Action Button */}
      <section className="px-4">
        <MarketplaceAdDialog>
          <Button size="lg" className="w-full h-14 text-base rounded-2xl shadow-sm gap-2">
            <Plus className="w-5 h-5" />
            פרסם מודעה חדשה
          </Button>
        </MarketplaceAdDialog>
      </section>

      {/* Ads List */}
      <section className="px-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : ads?.length === 0 ? (
            <div className="text-center p-12 bg-muted/20 rounded-2xl border border-dashed flex flex-col items-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">אין מודעות כרגע</p>
              <p className="text-xs text-muted-foreground mt-1">תהיה הראשון לפרסם ציוד למכירה!</p>
            </div>
          ) : (
            ads?.map((ad: any, i: number) => {
              const imageUrl = ad.image_url 
                ? storage.getFilePreview(APPWRITE_CATCH_IMAGES_BUCKET_ID, ad.image_url).href 
                : null;
                
              return (
                <motion.div 
                  key={ad.$id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="overflow-hidden border-border/50 shadow-sm">
                    {imageUrl && (
                      <div className="w-full h-48 bg-muted relative">
                        <img src={imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                        <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-md px-3 py-1 rounded-full border shadow-sm flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-primary" />
                          <span className="font-bold text-sm">{ad.price} ₪</span>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      {!imageUrl && (
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg leading-tight">{ad.title}</h3>
                          <Badge variant="secondary" className="font-bold text-base bg-primary/10 text-primary border-0">
                            {ad.price} ₪
                          </Badge>
                        </div>
                      )}
                      {imageUrl && (
                        <h3 className="font-bold text-lg leading-tight mb-2">{ad.title}</h3>
                      )}
                      
                      {ad.description && (
                        <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">
                          {ad.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {ad.user_name?.charAt(0) || "ד"}
                          </div>
                          <span className="text-sm font-medium">{ad.user_name}</span>
                        </div>
                        
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="rounded-full gap-2 px-4 shadow-md bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => window.location.href = `tel:${ad.phone}`}
                        >
                          <Phone className="w-4 h-4 fill-current" />
                          התקשר
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
