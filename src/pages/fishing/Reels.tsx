import { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Share2, MoreVertical, MapPin, Music } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// Dummy data for Reels
const REELS_DATA = [
  {
    id: "r1",
    videoUrl: "https://cdn.pixabay.com/video/2024/02/16/200742-913753239_large.mp4",
    user: { name: "אביחי יוסף", avatar: "", handle: "@avihai" },
    description: "פייט מטורף על הבוקר עם אינטיאס של 5 קילו! 🎣🔥",
    likes: 1245,
    comments: 84,
    location: "מזח הרצליה",
    song: "צליל מקורי - אביחי יוסף"
  },
  {
    id: "r2",
    videoUrl: "https://cdn.pixabay.com/video/2019/08/08/25852-352220197_large.mp4",
    user: { name: "רון לוי", avatar: "", handle: "@ron_levy" },
    description: "שקיעה פצצה, הים פלטה, מחכים לאכילות...",
    likes: 852,
    comments: 32,
    location: "חוף פלמחים",
    song: "Relaxing Ocean Waves"
  },
  {
    id: "r3",
    videoUrl: "https://cdn.pixabay.com/video/2020/05/13/38914-422894541_large.mp4",
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

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollPosition = containerRef.current.scrollTop;
    const windowHeight = containerRef.current.clientHeight;
    const newIndex = Math.round(scrollPosition / windowHeight);
    
    if (newIndex !== activeReelIndex && newIndex >= 0 && newIndex < REELS_DATA.length) {
      setActiveReelIndex(newIndex);
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
      <div className="absolute top-4 left-0 right-0 z-50 flex justify-between px-4 pointer-events-none">
        <h1 className="text-xl font-black text-white drop-shadow-md">Digon Reels</h1>
      </div>

      {REELS_DATA.map((reel, index) => (
        <ReelItem 
          key={reel.id} 
          reel={reel} 
          isActive={index === activeReelIndex} 
        />
      ))}
    </div>
  );
}

function ReelItem({ reel, isActive }: { reel: any, isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);

  useEffect(() => {
    if (isActive) {
      videoRef.current?.play().catch(e => console.log("Auto-play prevented", e));
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  }, [isActive]);

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

  return (
    <div className="w-full h-full snap-center snap-always relative bg-black flex items-center justify-center overflow-hidden">
      {/* Video - Only load if active or adjacent to save memory on iOS */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="w-full h-full object-cover"
        loop
        playsInline
        muted={!isActive}
        preload={isActive ? "auto" : "none"}
        onClick={togglePlay}
        onDoubleClick={handleDoubleTap}
      />

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

        <button className="w-10 h-10 flex items-center justify-center mt-2">
          <MoreVertical className="w-6 h-6 text-white drop-shadow-md" />
        </button>
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
