import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Play, MapPin, X, Heart, Search } from "lucide-react";
import { motion } from "framer-motion";

import { useCams } from '@/hooks/useCams';

export function LiveCams() {
  const { cams, isLoading } = useCams();
  const [selectedCam, setSelectedCam] = useState<any>(null);
  const [activeRegion, setActiveRegion] = useState<string>('הכל');
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('digon_fav_cams');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem('digon_fav_cams', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (e: React.MouseEvent, camId: string) => {
    e.stopPropagation();
    setFavorites(prev => prev.includes(camId) ? prev.filter(id => id !== camId) : [...prev, camId]);
  };

  const sortedRegions = useMemo(() => {
    const grouped = cams.reduce((acc, cam) => {
      const region = cam.region || 'אחר';
      if (!acc[region]) acc[region] = [];
      acc[region].push(cam);
      return acc;
    }, {} as Record<string, typeof cams>);

    const order = ['צפון', 'שרון', 'מרכז', 'דרום', 'כנרת', 'אילת', 'אחר'];
    
    return Object.keys(grouped).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    }).map(region => ({
      name: region,
      cams: grouped[region]
    }));
  }, [cams]);

  const filteredRegions = useMemo(() => {
    // Apply search filter first
    const searchedCams = cams.filter(cam => 
      cam.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      cam.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group the searched cams
    const grouped = searchedCams.reduce((acc, cam) => {
      const region = cam.region || 'אחר';
      if (!acc[region]) acc[region] = [];
      acc[region].push(cam);
      return acc;
    }, {} as Record<string, typeof cams>);

    const order = ['צפון', 'שרון', 'מרכז', 'דרום', 'כנרת', 'אילת', 'אחר'];
    let regionsList = Object.keys(grouped).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    }).map(region => ({
      name: region,
      cams: grouped[region]
    }));

    // If favorites tab is active, ONLY show favorites across all regions, or as a single category
    if (activeRegion === 'מועדפים') {
      const favCams = searchedCams.filter(c => favorites.includes(c.$id));
      return [{ name: 'מועדפים שלי', cams: favCams }];
    }

    if (activeRegion !== 'הכל') {
      regionsList = regionsList.filter(r => r.name === activeRegion);
    }

    return regionsList;
  }, [cams, activeRegion, searchQuery, favorites]);

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4 pb-6 mt-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="w-full">
              <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm relative h-full flex flex-col">
                <div className="w-full aspect-video bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <CardContent className="p-2 sm:p-3 bg-white dark:bg-slate-950 flex-1 flex flex-col justify-start gap-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-1/2" />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Search and Category Filter */}
      <div className="px-4 pt-2">
        <div className="relative mb-3">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="חפש מצלמה או אזור..." 
            className="pr-9 rounded-2xl bg-card border-slate-200 dark:border-slate-800 shadow-sm h-10 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-4 px-4 scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          <Button
            variant={activeRegion === 'הכל' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveRegion('הכל')}
            className={`rounded-full ${activeRegion === 'הכל' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
          >
            הכל
          </Button>
          <Button
            variant={activeRegion === 'מועדפים' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveRegion('מועדפים')}
            className={`rounded-full ${activeRegion === 'מועדפים' ? 'bg-rose-500 hover:bg-rose-600 text-white border-0' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-rose-500 hover:text-rose-600'}`}
          >
            <Heart className="w-3.5 h-3.5 mr-1" fill={activeRegion === 'מועדפים' ? "currentColor" : "none"} />
            מועדפים
          </Button>
          {sortedRegions.map(region => (
            <Button
              key={region.name}
              variant={activeRegion === region.name ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveRegion(region.name)}
              className={`rounded-full ${activeRegion === region.name ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
            >
              {region.name}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${activeRegion === region.name ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                {region.cams.length}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-10 px-4 pb-6">
        {filteredRegions.map(region => (
          <div key={region.name} className="flex flex-col">
            <div className="flex items-center gap-2 mb-4 pr-3 border-r-4 border-blue-500">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{region.name}</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                {region.cams.length}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {region.cams.map((cam) => (
                <motion.div 
                  key={cam.$id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full cursor-pointer"
                  onClick={() => {
                    if (cam.status === 'LIVE') {
                      if ((cam as any).external) {
                        window.open(cam.url, '_blank');
                      } else {
                        setSelectedCam(cam);
                      }
                    }
                  }}
                >
                  <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm relative group h-full flex flex-col">
                    <div className="absolute inset-0 bg-black/5 sm:bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                    
                    {/* Favorite Button */}
                    <button 
                      onClick={(e) => toggleFavorite(e, cam.$id)}
                      className="absolute top-1 left-1 sm:top-2 sm:left-2 z-30 p-1.5 sm:p-2 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full transition-colors"
                    >
                      <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${favorites.includes(cam.$id) ? 'text-rose-500 fill-rose-500' : 'text-white'}`} />
                    </button>

                    {/* Thumbnail Section */}
                    <div className="relative w-full aspect-video bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border-b border-slate-100 dark:border-slate-800">
                      {cam.thumbnail ? (
                        <img 
                          src={cam.thumbnail} 
                          alt={cam.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <iframe
                          src={cam.url}
                          title={cam.name}
                          className="w-full h-full border-0 pointer-events-none scale-105"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20">
                        {cam.status === 'LIVE' ? (
                          <Badge className="bg-red-500 hover:bg-red-600 text-white font-bold flex items-center gap-1 px-1.5 py-0 sm:px-2 sm:py-0.5 text-[9px] sm:text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            לייב
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-black/50 text-white border-0 font-bold backdrop-blur-md text-[9px] sm:text-xs px-1.5 py-0 sm:px-2 sm:py-0.5">
                            לא זמין
                          </Badge>
                        )}
                      </div>

                      {/* Play Button Overlay */}
                      {cam.status === 'LIVE' && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg">
                            <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white ml-0.5 sm:ml-1" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Content Section */}
                    <CardContent className="p-2 sm:p-3 bg-white dark:bg-slate-950 flex-1 flex flex-col justify-start">
                      <h4 className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-sm leading-tight line-clamp-2">{cam.name}</h4>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{cam.location}</span>
                        </div>
                        {cam.source && (
                          <div className="text-[9px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 opacity-90 truncate mt-0.5">
                            מקור: {cam.source}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
        {filteredRegions.length === 0 && (
          <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
            <Video className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-bold">לא נמצאו מצלמות התואמות לחיפוש שלך.</p>
            {activeRegion === 'מועדפים' && <p className="text-sm mt-1">לחץ על כפתור הלב במצלמות כדי להוסיף אותן לכאן.</p>}
          </div>
        )}
      </div>

      {/* Video Modal */}
      <Dialog open={!!selectedCam} onOpenChange={(open) => !open && setSelectedCam(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[80vh] md:h-auto p-0 bg-black border-slate-800 rounded-3xl overflow-hidden shadow-2xl [&>button]:hidden flex flex-col">
          {selectedCam && (
            <div className="flex flex-col flex-1 h-full relative">
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

              {/* Video Player / iframe container (Responsive) */}
              <div className="relative w-full flex-1 min-h-[50vh] bg-black">
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
