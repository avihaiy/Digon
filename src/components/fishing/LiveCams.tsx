import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Video, Play, MapPin, X } from "lucide-react";
import { motion } from "framer-motion";

// You can easily update these YouTube video IDs or iframe URLs
const CAMS = [
  {
    id: 'cam1',
    name: 'תל אביב - חוף גורדון',
    location: 'Tel Aviv',
    // Using a sample YouTube embed. To use a specific video, replace with its ID
    url: 'https://www.youtube.com/embed/5a8RjUf6rG4?autoplay=1&mute=1',
    thumbnail: 'https://images.unsplash.com/photo-1544237517-578ceb8cb36b?auto=format&fit=crop&q=80&w=400&h=250',
    status: 'LIVE'
  },
  {
    id: 'cam2',
    name: 'חיפה - בת גלים',
    location: 'Haifa',
    url: 'https://www.youtube.com/embed/P6IGK6Fq_8U?autoplay=1&mute=1', // Placeholder ID
    thumbnail: 'https://images.unsplash.com/photo-1596484552993-9c869fb8cefc?auto=format&fit=crop&q=80&w=400&h=250',
    status: 'LIVE'
  },
  {
    id: 'cam3',
    name: 'אשדוד - הקשתות',
    location: 'Ashdod',
    url: 'https://www.youtube.com/embed/P6IGK6Fq_8U?autoplay=1&mute=1', // Placeholder ID
    thumbnail: 'https://images.unsplash.com/photo-1580130006764-585bb69eb74b?auto=format&fit=crop&q=80&w=400&h=250',
    status: 'OFFLINE'
  },
  {
    id: 'cam4',
    name: 'אילת - החוף הצפוני',
    location: 'Eilat',
    url: 'https://www.youtube.com/embed/P6IGK6Fq_8U?autoplay=1&mute=1', // Placeholder ID
    thumbnail: 'https://images.unsplash.com/photo-1582298284594-e3c3b5860368?auto=format&fit=crop&q=80&w=400&h=250',
    status: 'LIVE'
  }
];

export function LiveCams() {
  const [selectedCam, setSelectedCam] = useState<typeof CAMS[0] | null>(null);

  return (
    <div className="w-full mt-6">
      <div className="flex items-center gap-2 mb-4 px-4">
        <Video className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">מצלמות חוף (לייב)</h3>
      </div>

      <div className="flex overflow-x-auto pb-4 px-4 gap-4 snap-x hide-scrollbar">
        {CAMS.map((cam) => (
          <motion.div 
            key={cam.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="snap-center shrink-0 w-64 cursor-pointer"
            onClick={() => {
              if (cam.status === 'LIVE') {
                setSelectedCam(cam);
              }
            }}
          >
            <Card className="overflow-hidden border-slate-100 dark:border-slate-800 shadow-sm relative group">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
              <div className="relative h-36 w-full bg-slate-200 dark:bg-slate-800">
                <img 
                  src={cam.thumbnail} 
                  alt={cam.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Status Badge */}
                <div className="absolute top-2 right-2 z-20">
                  {cam.status === 'LIVE' ? (
                    <Badge className="bg-red-500 hover:bg-red-600 text-white font-bold flex items-center gap-1.5 px-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      לייב
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-black/50 text-white border-0 font-bold backdrop-blur-md">
                      לא זמין
                    </Badge>
                  )}
                </div>

                {/* Play Button Overlay */}
                {cam.status === 'LIVE' && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 text-white fill-white ml-1" />
                    </div>
                  </div>
                )}
              </div>
              
              <CardContent className="p-3 bg-white dark:bg-slate-900">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{cam.name}</h4>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3 h-3" />
                  {cam.location}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Video Modal */}
      <Dialog open={!!selectedCam} onOpenChange={(open) => !open && setSelectedCam(null)}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 bg-black border-slate-800 rounded-3xl overflow-hidden shadow-2xl [&>button]:hidden">
          {selectedCam && (
            <div className="flex flex-col h-full relative">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-center pointer-events-none">
                <div className="flex items-center gap-2 text-white pointer-events-auto">
                  <Badge className="bg-red-500 text-white border-0 animate-pulse font-bold">LIVE</Badge>
                  <h3 className="font-bold text-sm drop-shadow-md">{selectedCam.name}</h3>
                </div>
                <button 
                  onClick={() => setSelectedCam(null)}
                  className="w-8 h-8 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white backdrop-blur-sm pointer-events-auto transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Video Player (16:9 Aspect Ratio Container) */}
              <div className="relative w-full pb-[56.25%] bg-black">
                <iframe
                  src={selectedCam.url}
                  title={selectedCam.name}
                  className="absolute top-0 left-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
