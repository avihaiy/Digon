import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { storage, APPWRITE_CATCH_IMAGES_BUCKET_ID } from '@/lib/appwrite';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { X, MapPin, Scale } from 'lucide-react';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { getImageUrl } from '@/hooks/useCatches';

interface CatchStoriesProps {
  catches: any[];
}

export function CatchStories({ catches }: CatchStoriesProps) {
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const { playSwoosh } = useSoundEffects();

  // Filter catches that have images, are public, and limit to 8
  const storyCatches = catches
    ?.filter((c: any) => c.status === 'approved' && c.visibility !== 'private' && c.image_id)
    .slice(0, 8) || [];

  useEffect(() => {
    if (activeStoryIndex !== null) {
      // Auto advance or close after 5 seconds
      const timer = setTimeout(() => {
        if (activeStoryIndex < storyCatches.length - 1) {
          setActiveStoryIndex(activeStoryIndex + 1);
        } else {
          setActiveStoryIndex(null);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeStoryIndex, storyCatches.length]);

  if (storyCatches.length === 0) return null;

  const handleOpenStory = (index: number) => {
    setActiveStoryIndex(index);
    playSwoosh();
  };

  const handleCloseStory = () => {
    setActiveStoryIndex(null);
  };

  const handleNextStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeStoryIndex !== null && activeStoryIndex < storyCatches.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      handleCloseStory();
    }
  };

  const handlePrevStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeStoryIndex !== null && activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    }
  };

  return (
    <div className="w-full mt-4 mb-2">
      <div className="flex items-center justify-between px-4 mb-2">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">תפיסות השבוע</h3>
      </div>
      
      {/* Stories Row */}
      <div className="flex overflow-x-auto gap-4 px-4 pb-2 hide-scrollbar snap-x">
        {storyCatches.map((story, index) => {
          const imgUrl = getImageUrl(story.image_id);
          return (
            <motion.button
              key={story.$id}
              onClick={() => handleOpenStory(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-1.5 snap-start shrink-0"
            >
              <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-orange-500 to-pink-500 shadow-md">
                <div className="w-full h-full rounded-full border-2 border-background overflow-hidden bg-muted">
                  {imgUrl ? (
                    <img src={imgUrl} alt={story.fish_type} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-200 dark:bg-slate-800" />
                  )}
                </div>
              </div>
              <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 w-16 truncate text-center">
                {story.user_name?.split(' ')[0] || 'דייג'}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Story Viewer Overlay */}
      <AnimatePresence>
        {activeStoryIndex !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center touch-none"
          >
            {/* Progress Bars */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-safe-top z-20 flex gap-1.5">
              {storyCatches.map((_, i) => (
                <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                  {i === activeStoryIndex && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 5, ease: "linear" }}
                      className="h-full bg-white"
                    />
                  )}
                  {i < activeStoryIndex && <div className="h-full w-full bg-white" />}
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 pt-safe-top mt-8 p-4 z-20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted overflow-hidden border border-white/50">
                   {/* We could use the user's avatar if we had it, fallback to initials */}
                   <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold">
                     {storyCatches[activeStoryIndex].user_name?.charAt(0) || 'ד'}
                   </div>
                </div>
                <div className="text-white drop-shadow-md flex flex-col">
                  <span className="font-bold text-sm">{storyCatches[activeStoryIndex].user_name || 'דייג'}</span>
                  <span className="text-[10px] text-white/80">
                    {formatDistanceToNow(new Date(storyCatches[activeStoryIndex].$createdAt), { locale: he, addSuffix: true })}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleCloseStory}
                className="p-2 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6 drop-shadow-md" />
              </button>
            </div>

            {/* Content areas for tapping (left = prev, right = next) */}
            <div className="absolute inset-0 z-10 flex">
              <div className="w-1/3 h-full" onClick={handlePrevStory} />
              <div className="w-2/3 h-full" onClick={handleNextStory} />
            </div>

            {/* The Image */}
            <div className="relative w-full h-full max-w-lg mx-auto flex items-center justify-center">
              {getImageUrl(storyCatches[activeStoryIndex].image_id) && (
                <img 
                  src={getImageUrl(storyCatches[activeStoryIndex].image_id)} 
                  alt={storyCatches[activeStoryIndex].fish_type} 
                  className="w-full h-full object-cover sm:object-contain"
                />
              )}
              
              {/* Overlay Gradient at bottom for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              
              {/* Catch Details Overlay */}
              <div className="absolute bottom-10 left-0 right-0 p-6 z-20 text-white pointer-events-none">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-4xl font-black mb-2 drop-shadow-lg text-white">
                    {storyCatches[activeStoryIndex].fish_type || 'דג לא ידוע'}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {storyCatches[activeStoryIndex].weight && (
                      <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
                        <Scale className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-sm text-cyan-50">
                          {storyCatches[activeStoryIndex].weight} ק״ג
                        </span>
                      </div>
                    )}
                    {storyCatches[activeStoryIndex].location && (
                      <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
                        <MapPin className="w-4 h-4 text-yellow-400" />
                        <span className="font-bold text-sm text-yellow-50">
                          {storyCatches[activeStoryIndex].location.split('|||')[0].trim()}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
