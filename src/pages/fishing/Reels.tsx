import { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Share2, MoreVertical, MapPin, Music, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useReels } from "@/hooks/useReels";
import { toast } from "sonner";

// Dummy data for Reels (using reliable URLs)
const INITIAL_REELS_DATA = [
  {
    id: "r1",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    user: { name: "דני דייג", avatar: "", handle: "@dani_fishing" },
    description: "תפיסה מטורפת של אינטיאס 12 קילו מזרזר מהחוף! 🎣🔥",
    likes: 1240,
    comments: 89,
    location: "מרינה הרצליה",
    song: "Fishing Vibes - Original Mix"
  },
  {
    id: "r2",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    user: { name: "רון לוי", avatar: "", handle: "@ron_levy" },
    description: "שקיעה פצצה, הים פלטה, מחכים לאכילות...",
    likes: 852,
    comments: 32,
    location: "חוף פלמחים",
    song: "Relaxing Ocean Waves"
  },
  {
    id: "r3",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    user: { name: "צוות אריות הים", avatar: "", handle: "@sea_lions" },
    description: "מי אמר שאין דגים באכזיב? ים עובד! 🌊🐟",
    likes: 2104,
    comments: 156,
    location: "אכזיב",
    song: "Epic Fishing Motivation"
  }
];

import React from 'react';

class ReelsErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-900 text-white p-8 h-screen w-full overflow-auto" dir="ltr">
          <h1 className="text-2xl font-bold mb-4">CRASH DETECTED</h1>
          <pre className="text-xs whitespace-pre-wrap">{this.state.error?.message}</pre>
          <pre className="text-xs mt-4 text-red-200">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ReelsWrapper() {
  return (
    <ReelsErrorBoundary>
      <Reels />
    </ReelsErrorBoundary>
  );
}

function Reels() {
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use real backend data
  const { reels, loading, uploadReel, deleteReel } = useReels();
  
  // Fallback to dummy data if DB is empty
  const displayReels = reels.length > 0 ? reels : INITIAL_REELS_DATA;

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollPosition = containerRef.current.scrollTop;
    const windowHeight = containerRef.current.clientHeight;
    if (windowHeight === 0) return;
    const newIndex = Math.round(scrollPosition / windowHeight);
    
    if (newIndex !== activeReelIndex && newIndex >= 0 && newIndex < displayReels.length) {
      setActiveReelIndex(newIndex);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const toastId = toast.loading("מכווץ ומעלה סרטון... (זה עשוי לקחת קצת זמן) ⏳");
      try {
        const newReel = await uploadReel(file);
        if (newReel) {
          toast.success("הסרטון עלה בהצלחה!", { id: toastId });
          setActiveReelIndex(0);
          if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else {
          toast.dismiss(toastId);
        }
      } catch (err) {
        toast.error("שגיאה בהעלאת הסרטון. נסה שוב.", { id: toastId });
      }
    }
  };

  return (
    <div 
      className="bg-black w-full max-w-lg mx-auto h-[calc(100vh-4rem)] overflow-y-scroll snap-y snap-mandatory relative"
      ref={containerRef}
      onScroll={handleScroll}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <style>{`.hide-scroll::-webkit-scrollbar { display: none; }`}</style>
      
      {/* Header overlay */}
      <div className="absolute top-4 left-0 right-0 z-50 flex justify-between items-center px-4 pointer-events-none">
        <h1 className="text-xl font-black text-white drop-shadow-md">Digon Reels</h1>
        <div className="pointer-events-auto">
          <input 
            type="file" 
            accept="video/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition-transform active:scale-90 border border-white/20"
          >
            <div className="w-5 h-5 flex flex-col items-center justify-center relative">
              <div className="w-full h-[2px] bg-white absolute"></div>
              <div className="w-[2px] h-full bg-white absolute"></div>
            </div>
          </button>
        </div>
      </div>

      {displayReels.map((reel, index) => (
        <ReelItem 
          key={reel.id || (reel as any).$id} 
          reel={reel} 
          isActive={index === activeReelIndex} 
          onDelete={deleteReel}
        />
      ))}
    </div>
  );
}

function ReelItem({ reel, isActive, onDelete }: { reel: any, isActive: boolean, onDelete?: (id: string, url: string) => Promise<boolean> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [isBroken, setIsBroken] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Must start muted for iOS autoplay
  const { user } = useAuth();

  useEffect(() => {
    if (isActive) {
      if (videoRef.current) {
        // Try playing. If blocked, fallback to muted play
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.warn("Autoplay blocked:", err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(e => console.error("Total playback failure:", e));
          }
        });
      }
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    if (!isLiked) {
      setIsLiked(true);
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 1000);
    }
  };

  if (isBroken) {
    return (
      <div className="w-full h-full snap-center snap-always relative bg-black flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-white/50 text-sm mb-4">הסרטון אינו זמין או נמחק מהשרת</p>
          {user && reel.userId === user.$id && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={async () => {
                if (onDelete) await onDelete(reel.id || reel.$id, reel.videoUrl);
              }}
            >
              מחק סרטון פגום
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full snap-center snap-always relative bg-black flex items-center justify-center overflow-hidden">
      {/* Video - Only load if active or adjacent to save memory on iOS */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="w-full h-full object-cover"
        loop
        playsInline
        muted={isMuted}
        preload={isActive ? "auto" : "none"}
        onClick={togglePlay}
        onDoubleClick={handleDoubleTap}
        onError={() => setIsBroken(true)}
        onCanPlay={() => setIsVideoLoaded(true)}
        onWaiting={() => setIsVideoLoaded(false)}
        onPlaying={() => setIsVideoLoaded(true)}
      />

      {/* Loading Spinner */}
      {!isVideoLoaded && !isBroken && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Mute/Unmute Button */}
      <button 
        onClick={toggleMute}
        className="absolute top-1/2 left-4 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Double Tap Heart Animation */}
      <AnimatePresence>
        {showHeartAnim && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 0 }}
            animate={{ scale: 1.5, opacity: 1, y: -20 }}
            exit={{ scale: 2, opacity: 0, y: -50 }}
            className="absolute z-40 pointer-events-none text-rose-500"
          >
            <Heart className="w-32 h-32 fill-current drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause indicator */}
      {!isPlaying && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-black/20">
          <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
            <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-white border-b-[15px] border-b-transparent ml-2" />
          </div>
        </div>
      )}

      {/* Right Sidebar Actions */}
      <div className="absolute right-4 bottom-24 z-30 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-1 group">
          <button 
            onClick={() => setIsLiked(!isLiked)} 
            className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition-transform active:scale-90"
          >
            <Heart className={`w-7 h-7 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-md">{isLiked ? reel.likes + 1 : reel.likes}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition-transform active:scale-90">
            <MessageCircle className="w-7 h-7 text-white" />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-md">{reel.comments}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition-transform active:scale-90">
            <Share2 className="w-7 h-7 text-white" />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-md">שתף</span>
        </div>

        <Drawer>
          <DrawerTrigger asChild>
            <button className="w-10 h-10 flex items-center justify-center mt-2 transition-transform active:scale-90">
              <MoreVertical className="w-6 h-6 text-white drop-shadow-md" />
            </button>
          </DrawerTrigger>
          <DrawerContent className="bg-black/95 text-white border-white/10">
            <DrawerHeader className="border-b border-white/10 pb-4">
              <DrawerTitle className="text-center text-white">אפשרויות</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col p-4 gap-2 pb-8">
              {user && reel.userId === user.$id && (
                <button 
                  onClick={async () => {
                    const toastId = toast.loading("מוחק סרטון...");
                    try {
                      if (onDelete && await onDelete(reel.id || reel.$id, reel.videoUrl)) {
                        toast.success("הסרטון נמחק בהצלחה", { id: toastId });
                      } else {
                        toast.error("לא ניתן למחוק את הסרטון", { id: toastId });
                      }
                    } catch (err) {
                      toast.error("שגיאה במחיקת הסרטון", { id: toastId });
                    }
                  }}
                  className="flex items-center gap-4 w-full p-4 hover:bg-rose-500/10 rounded-xl transition-colors text-rose-500"
                >
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-rose-500">×</span>
                  </div>
                  <span className="font-bold text-base text-right flex-1" dir="rtl">מחק סרטון</span>
                </button>
              )}

              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/fishing/reels`);
                  toast.success("הקישור הועתק ללוח!");
                }}
                className="flex items-center gap-4 w-full p-4 hover:bg-white/10 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="font-medium text-base text-right flex-1" dir="rtl">העתק קישור</span>
              </button>
              
              <button 
                onClick={() => toast.success("הסרטון נשמר במועדפים!")}
                className="flex items-center gap-4 w-full p-4 hover:bg-white/10 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Heart className="w-5 h-5" />
                </div>
                <span className="font-medium text-base text-right flex-1" dir="rtl">שמור סרטון</span>
              </button>

              <button 
                onClick={() => toast.success("תודה על הדיווח, הנושא ייבדק.")}
                className="flex items-center gap-4 w-full p-4 hover:bg-rose-500/10 rounded-xl transition-colors text-rose-500"
              >
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <span className="text-lg">!</span>
                </div>
                <span className="font-bold text-base text-right flex-1" dir="rtl">דיווח על התוכן</span>
              </button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-16 z-30 p-4 pb-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="w-10 h-10 border-2 border-white/50">
            <AvatarImage src={reel.user.avatar} />
            <AvatarFallback className="bg-cyan-600 text-white font-bold">{reel.user.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-white font-bold text-sm leading-tight drop-shadow-md">{reel.user.name}</h3>
            <span className="text-white/80 text-xs">{reel.user.handle}</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 px-3 text-[10px] ml-auto rounded-full bg-transparent border-white text-white hover:bg-white hover:text-black transition-colors">
            עקוב
          </Button>
        </div>

        <p className="text-white text-sm mb-3 drop-shadow-md line-clamp-2" dir="rtl">
          {reel.description}
        </p>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-white/90 text-xs bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm">
            <MapPin className="w-3.5 h-3.5" />
            <span>{reel.location}</span>
          </div>
          <div className="flex items-center gap-1 text-white/90 text-xs bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm overflow-hidden flex-1">
            <Music className="w-3.5 h-3.5 shrink-0" />
            <div className="w-full relative whitespace-nowrap overflow-hidden mask-fade-right">
              <div className="inline-block animate-marquee pl-full">
                {reel.song}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .animate-marquee { animation: marquee 5s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
      `}</style>
    </div>
  );
}
