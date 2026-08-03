import { useParams, useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_PROFILES_ID, APPWRITE_CATCHES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { BadgeIcon } from "@/components/fishing/BadgeIcon";
import { getImageUrl } from "@/hooks/useCatches";
import { 
  ArrowRight, Trophy, Fish, Star, MapPin, Scale, 
  UserPlus, Check, Users, MessageCircle, Camera, Calendar, Grid, BarChart3, Medal, ExternalLink, Activity, Info, Anchor, Edit3
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFollowers } from "@/hooks/useFollowers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { storage, APPWRITE_CATCH_IMAGES_BUCKET_ID } from "@/lib/appwrite";
import { ID } from "appwrite";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CatchSocial } from "@/components/fishing/CatchSocial";

type Tab = 'gallery' | 'stats' | 'badges';

export default function Profile() {
  const { userId: urlUserId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateProfileField } = useAuth();
  
  const userId = urlUserId || currentUser?.$id;
  
  const { followers, following, followersCount, followingCount, isFollowing, toggleFollow, isToggling } = useFollowers(userId || "");
  const [selectedCatch, setSelectedCatch] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('gallery');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showFollowersList, setShowFollowersList] = useState<'followers' | 'following' | null>(null);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioState, setBioState] = useState({
    bio: "",
    fishing_style: "",
    favorite_rod: ""
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Profile
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
        Query.equal("user_id", userId),
        Query.limit(1)
      ]);
      const data = res.documents[0] || null;
      if (data) {
        setBioState({
          bio: data.bio || "",
          fishing_style: data.fishing_style || "",
          favorite_rod: data.favorite_rod || ""
        });
      }
      return data;
    },
    enabled: !!userId
  });

  // Fetch User Catches
  const { data: catches = [], isLoading: isCatchesLoading } = useQuery({
    queryKey: ["catches", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_CATCHES_ID, [
        Query.equal("user_id", userId),
        Query.equal("status", "approved"),
        Query.orderDesc("$createdAt")
      ]);
      return res.documents;
    },
    enabled: !!userId
  });

  if (isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background max-w-lg mx-auto">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground max-w-lg mx-auto">
        <h2 className="text-xl font-bold mb-4">פרופיל לא נמצא</h2>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline font-bold">חזור אחורה</button>
      </div>
    );
  }

  const badges = (profile.badges as string[]) || [];

  // Calculate Stats
  let mostCaughtSpecies = "אין מידע";
  let biggestCatchWeight = "אין מידע";

  if (catches.length > 0) {
    const speciesCount: Record<string, number> = {};
    let maxWeight = 0;

    catches.forEach((c: any) => {
      if (c.fish_type) {
        speciesCount[c.fish_type] = (speciesCount[c.fish_type] || 0) + 1;
      }
      
      if (c.weight) {
        const match = c.weight.match(/([\d.]+)/);
        if (match) {
          let val = parseFloat(match[1]);
          if (c.weight.toLowerCase().includes("g") && !c.weight.toLowerCase().includes("kg")) {
            val = val / 1000;
          }
          if (val > maxWeight) {
            maxWeight = val;
            biggestCatchWeight = c.weight;
          }
        }
      }
    });

    if (Object.keys(speciesCount).length > 0) {
      mostCaughtSpecies = Object.keys(speciesCount).reduce((a, b) => speciesCount[a] > speciesCount[b] ? a : b);
    }
  }

  const isOwnProfile = !!currentUser && currentUser.$id === userId;

  const handleAvatarClick = () => {
    if (isOwnProfile) {
      fileInputRef.current?.click();
    }
  };

  const handleSaveBio = async () => {
    toast.loading('שומר פרטים...', { id: 'save-bio' });
    try {
      await updateProfileField('bio', bioState.bio);
      await updateProfileField('fishing_style', bioState.fishing_style);
      await updateProfileField('favorite_rod', bioState.favorite_rod);
      await refetchProfile();
      setIsEditingBio(false);
      toast.success('הפרטים נשמרו בהצלחה!', { id: 'save-bio' });
    } catch (error) {
      toast.error('שגיאה בשמירת הפרטים. בדוק שהוספת את השדות ב-Appwrite.', { id: 'save-bio' });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('נא לבחור קובץ תמונה בלבד');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      toast.loading('מעלה תמונה...', { id: 'avatar-upload' });
      
      // Upload to storage
      const uploadedFile = await storage.createFile(
        APPWRITE_CATCH_IMAGES_BUCKET_ID,
        ID.unique(),
        file
      );

      // Update profile
      const success = await updateProfileField('avatar_id', uploadedFile.$id);
      
      if (success) {
        toast.success('תמונת הפרופיל עודכנה!', { id: 'avatar-upload' });
        // Auto reload profile query could be done here, but updateProfileField sets local state in useAuth
        // However, this profile page uses its own query for `profile`. We should invalidate or update it.
        // For simplicity, we can just reload the page or rely on the query to refetch on focus.
        window.location.reload();
      } else {
        toast.error('העדכון נכשל. האם יצרת את השדה avatar_id במסד הנתונים?', { id: 'avatar-upload' });
      }
    } catch (error: any) {
      console.error(error);
      toast.error('שגיאה בהעלאת התמונה', { id: 'avatar-upload' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black pb-24 max-w-lg mx-auto animate-in fade-in duration-500 shadow-2xl relative overflow-x-hidden">
      
      {/* 1. HERO SECTION (Native App Style) */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-56 bg-slate-900 w-full relative">
          <div className="absolute inset-0 bg-[url('/fishing_sunset_bg.jpg')] opacity-40 bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          
          {/* Back Button */}
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center z-20 border border-white/10"
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Floating Profile Card */}
        <div className="px-4 -mt-16 relative z-10">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col items-center text-center">
            
            {/* Avatar */}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleAvatarUpload} 
            />
            <div 
              onClick={handleAvatarClick}
              className={cn(
              "w-28 h-28 -mt-16 mb-3 rounded-[2rem] bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-xl flex items-center justify-center text-4xl font-black text-white transform rotate-3 transition-transform hover:rotate-0 relative",
              isOwnProfile ? "cursor-pointer hover:scale-105" : "",
              profile.border === 'gold' ? 'ring-4 ring-yellow-400 ring-offset-4 ring-offset-white dark:ring-offset-slate-900 shadow-[0_0_30px_rgba(250,204,21,0.6)]' :
              profile.border === 'platinum' ? 'ring-4 ring-slate-300 ring-offset-4 ring-offset-white dark:ring-offset-slate-900 shadow-[0_0_30px_rgba(203,213,225,0.6)]' :
              profile.border === 'ocean' ? 'ring-4 ring-cyan-400 ring-offset-4 ring-offset-white dark:ring-offset-slate-900 shadow-[0_0_30px_rgba(34,211,238,0.6)]' :
              profile.border === 'fire' ? 'ring-4 ring-orange-500 ring-offset-4 ring-offset-white dark:ring-offset-slate-900 shadow-[0_0_30px_rgba(249,115,22,0.6)]' :
              'border-4 border-white dark:border-slate-900'
            )}>
              {profile.avatar_id ? (
                <img 
                  src={getImageUrl(profile.avatar_id)} 
                  alt="Avatar" 
                  className="w-full h-full object-cover rounded-[1.75rem]"
                />
              ) : (
                profile.full_name?.charAt(0) || profile.user_name?.charAt(0) || "ד"
              )}
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-[1.75rem] flex items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                </div>
              )}
              {isOwnProfile && !isUploadingAvatar && (
                <div className="absolute -bottom-2 -right-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full p-2 shadow-lg hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Name & Title */}
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {profile.full_name || profile.user_name || "דייג אנונימי"}
            </h1>
            {profile.title && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 px-2.5 py-0.5 rounded-full font-bold">
                <Trophy className="w-3 h-3" /> {profile.title}
              </span>
            )}

            {/* Core Stats Bar */}
            <div className="flex items-center justify-between w-full mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col items-center flex-1">
                <span className="font-black text-lg text-slate-900 dark:text-white">{catches.length}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">תפיסות</span>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
              <div 
                className="flex flex-col items-center flex-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl transition-colors"
                onClick={() => setShowFollowersList('followers')}
              >
                <span className="font-black text-lg text-slate-900 dark:text-white">{followersCount}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">עוקבים</span>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
              <div 
                className="flex flex-col items-center flex-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl transition-colors"
                onClick={() => setShowFollowersList('following')}
              >
                <span className="font-black text-lg text-slate-900 dark:text-white">{followingCount}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">נעקבים</span>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
              <div className="flex flex-col items-center flex-1">
                <span className="font-black text-lg text-amber-500">{profile.points || 0}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">מוניטין</span>
              </div>
            </div>

            {/* Action Buttons */}
            {!isOwnProfile && currentUser && (
              <div className="flex gap-2 w-full mt-5">
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  onClick={() => toggleFollow()}
                  disabled={isToggling}
                  className={`flex-1 rounded-2xl h-12 font-black ${isFollowing ? 'border-cyan-500/50 text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30' : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/25'}`}
                >
                  {isFollowing ? <><Check className="w-4 h-4 ml-2" /> נעקב</> : <><UserPlus className="w-4 h-4 ml-2" /> עקוב אחרו</>}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl h-12 w-12 shrink-0 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  onClick={() => navigate('/fishing/messages', { 
                    state: { 
                      recipientId: profile.user_id, 
                      recipientName: profile.full_name || profile.user_name || "דייג"
                    } 
                  })}
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. TAB NAVIGATION (Sticky App-like Bar) */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 mt-4 px-2">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'gallery' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Grid className="w-5 h-5" />
            <span className="text-[10px] font-black">גלריה</span>
            {activeTab === 'gallery' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-4 right-4 h-1 bg-cyan-500 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'stats' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-black">סטטיסטיקות</span>
            {activeTab === 'stats' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-4 right-4 h-1 bg-cyan-500 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('badges')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'badges' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Medal className="w-5 h-5" />
            <span className="text-[10px] font-black">הישגים</span>
            {activeTab === 'badges' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-4 right-4 h-1 bg-cyan-500 rounded-t-full" />}
          </button>
        </div>
      </div>

      {/* 3. TAB CONTENT */}
      <div className="pt-2 min-h-[50vh]">
        <AnimatePresence mode="wait">
          
          {/* GALLERY TAB */}
          {activeTab === 'gallery' && (
            <motion.div 
              key="gallery"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {catches.length > 0 ? (
                <div className="grid grid-cols-3 gap-0.5 w-full">
                  {catches.map((c: any) => (
                    <div 
                      key={c.$id} 
                      className="aspect-square bg-slate-200 dark:bg-slate-800 relative group cursor-pointer"
                      onClick={() => setSelectedCatch(c)}
                    >
                      {c.image_id ? (
                        <img 
                          src={getImageUrl(c.image_id)} 
                          alt="Catch" 
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400">
                          <Fish className="w-6 h-6 opacity-30" />
                        </div>
                      )}
                      {/* Weight overlay icon */}
                      {c.weight && (
                        <div className="absolute top-1 right-1 bg-black/50 backdrop-blur-sm rounded px-1.5 py-0.5 text-[9px] font-bold text-white flex items-center gap-0.5">
                          <Scale className="w-2.5 h-2.5" />
                          {c.weight}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Camera className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-bold">אין תמונות עדיין</p>
                </div>
              )}
            </motion.div>
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-3"
            >
              {/* Bio Section */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm relative">
                {isOwnProfile && !isEditingBio && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute left-3 top-3 rounded-full text-slate-400 hover:text-cyan-500"
                    onClick={() => setIsEditingBio(true)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                )}
                
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-500" />
                  קצת עליי
                </h3>

                {isEditingBio ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">סגנון דיג אהוב</label>
                      <Input 
                        value={bioState.fishing_style} 
                        onChange={(e) => setBioState(s => ({...s, fishing_style: e.target.value}))}
                        placeholder="למשל: ז'רז'ור לייט, פיתיונות..."
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">ציוד מועדף</label>
                      <Input 
                        value={bioState.favorite_rod} 
                        onChange={(e) => setBioState(s => ({...s, favorite_rod: e.target.value}))}
                        placeholder="למשל: Shimano Stella 4000"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">מילים עליי</label>
                      <Textarea 
                        value={bioState.bio} 
                        onChange={(e) => setBioState(s => ({...s, bio: e.target.value}))}
                        placeholder="אוהב לדוג בזריחה..."
                        className="rounded-xl resize-none h-20"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <Button variant="ghost" className="rounded-xl" onClick={() => setIsEditingBio(false)}>ביטול</Button>
                      <Button className="rounded-xl bg-cyan-500 text-white hover:bg-cyan-600" onClick={handleSaveBio}>שמור</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Anchor className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">סגנון דיג אהוב</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{profile.fishing_style || "לא צוין"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Star className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">ציוד מועדף</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{profile.favorite_rod || "לא צוין"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MessageCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">מי אני</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{profile.bio || "לא נכתב תיאור"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <Fish className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">הדג הכי נפוץ</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{mostCaughtSpecies}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Scale className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">משקל שיא</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white" dir="ltr">{biggestCatchWeight}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">ממוצע תפיסות לחודש</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{catches.length > 0 ? (catches.length / 3).toFixed(1) : 0}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* BADGES TAB */}
          {activeTab === 'badges' && (
            <motion.div 
              key="badges"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4"
            >
              {badges.length > 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    ארון הגביעים ({badges.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {badges.map((badgeId: string) => (
                      <BadgeIcon key={badgeId} badgeId={badgeId} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Medal className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-bold">אין תגיות עדיין</p>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* FULL SCREEN CATCH MODAL (Mobile Optimized) */}
      <Dialog open={!!selectedCatch} onOpenChange={(open) => !open && setSelectedCatch(null)}>
        <DialogContent className="max-w-md w-full h-[100dvh] md:h-[90vh] p-0 md:rounded-3xl border-0 bg-black shadow-2xl flex flex-col m-0 overflow-hidden">
          {selectedCatch && (
            <>
              {/* Image Section (Half Screen) */}
              <div className="relative w-full h-[55dvh] bg-black overflow-hidden flex items-center justify-center shrink-0">
                {selectedCatch.image_id ? (
                  <img 
                    src={getImageUrl(selectedCatch.image_id)} 
                    alt={selectedCatch.fish_type} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Fish className="w-20 h-20 text-white/20" />
                )}
                
                {/* Gradient Overlay for Text */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/40 pointer-events-none" />
                
                {/* Close Button Native Style */}
                <button 
                  onClick={() => setSelectedCatch(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center z-50 text-white shadow-lg"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                  <h3 className="text-2xl font-black text-white shadow-sm drop-shadow-md mb-2">{selectedCatch.fish_type || 'דג לא מזוהה'}</h3>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="flex items-center gap-1.5 text-white/90 text-xs font-bold bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-xl">
                      <Scale className="w-3.5 h-3.5" /> {selectedCatch.weight || 'לא צוין משקל'}
                    </span>
                    <span className="flex items-center gap-1.5 text-white/90 text-xs font-bold bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-xl" dir="ltr">
                      <Calendar className="w-3.5 h-3.5" /> {format(new Date(selectedCatch.$createdAt), 'dd/MM/yyyy')}
                    </span>
                  </div>

                  {selectedCatch.text && (
                    <p className="text-xs text-white/80 font-medium leading-relaxed line-clamp-2 drop-shadow-md">
                      {selectedCatch.text}
                    </p>
                  )}

                  {selectedCatch.location?.includes('|||') && (
                    <Button 
                      variant="link"
                      className="p-0 h-auto text-cyan-300 hover:text-cyan-200 mt-1 text-xs font-bold drop-shadow-md"
                      onClick={() => window.open(selectedCatch.location.split('|||')[1].trim(), '_blank')}
                    >
                      <MapPin className="w-3.5 h-3.5 ml-1" /> ניווט לנקודה
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Social Section (Bottom Half) */}
              <div className="flex-1 bg-slate-950 flex flex-col min-h-0 relative z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <CatchSocial catchId={selectedCatch.$id} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Followers / Following List Modal */}
      <Dialog open={showFollowersList !== null} onOpenChange={(open) => !open && setShowFollowersList(null)}>
        <DialogContent className="sm:max-w-[425px] p-0 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-xl font-black text-center text-slate-900 dark:text-white">
              {showFollowersList === 'followers' ? 'עוקבים' : 'נעקבים'}
            </h2>
          </div>
          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
            {(showFollowersList === 'followers' ? followers : following).length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                אין עדיין רשימה להציג.
              </div>
            ) : (
              (showFollowersList === 'followers' ? followers : following).map((u: any) => (
                <div key={u.$id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-900 flex items-center justify-center shrink-0 overflow-hidden text-lg font-bold text-cyan-600">
                      {u.avatar_id ? (
                        <img src={getImageUrl(u.avatar_id)} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        u.full_name?.charAt(0) || u.user_name?.charAt(0) || "ד"
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{u.full_name || u.user_name || "דייג"}</h4>
                      <p className="text-xs text-slate-500">{u.points || 0} נקודות</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-full"
                    onClick={() => {
                      setShowFollowersList(null);
                      navigate(`/fishing/profile/${u.user_id}`);
                    }}
                  >
                    פרופיל
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
