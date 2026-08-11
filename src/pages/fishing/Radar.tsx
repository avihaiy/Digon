import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_CATCHES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation2, Flame, Map, Droplet, Waves, Filter, Crosshair, ChevronRight } from "lucide-react";
import { getImageUrl } from "@/hooks/useCatches";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Link } from "react-router-dom";

// Rough coordinates for common Israel fishing spots
const LOCATIONS_MAP: Record<string, [number, number]> = {
  "חוף לגונה עכו": [32.921, 35.080],
  "לגונה עכו": [32.921, 35.080],
  "חוף ארגמן עכו": [32.9184, 35.0788],
  "תל אביב": [32.0853, 34.7818],
  "אשדוד": [31.8044, 34.6553],
  "אשקלון": [31.6693, 34.5715],
  "חיפה": [32.7940, 34.9896],
  "הרצליה": [32.1624, 34.8447],
  "נתניה": [32.3215, 34.8532],
  "אילת": [29.5577, 34.9519],
  "הכנרת": [32.8191, 35.5914],
  "טבריה": [32.7922, 35.5312],
  "יפו": [32.0504, 34.7522],
  "נהריה": [33.0151, 35.0941],
  "עכו": [32.9331, 35.0827],
  "חדרה": [32.4340, 34.9197],
  "פלמחים": [31.9333, 34.6978],
  "רידינג": [32.1039, 34.7770],
};

const DEFAULT_CENTER: [number, number] = [31.9, 34.8]; // Central Israel

const createCustomIcon = (imageUrl: string, isFreshwater: boolean) => {
  const color = isFreshwater ? '#10b981' : '#06b6d4'; // Emerald for freshwater, Cyan for sea
  const bgImage = imageUrl ? `url('${imageUrl}')` : 'none';
  
  return L.divIcon({
    className: 'custom-div-icon bg-transparent border-0',
    html: `
      <div style="
        width: 44px; height: 44px; 
        border-radius: 50%; 
        border: 3px solid ${color}; 
        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
        background-color: #1e293b;
        background-image: ${bgImage};
        background-size: cover;
        background-position: center;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${!imageUrl ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-1.5 1.5-3 2.5-5 3.5-3 1.5-7 2-10.5.5-3.5-1.5-5.5-3.5-7-6Z"/><path d="M18 12v.5"/><path d="M16 17.93a9.77 9.77 0 0 1-5.04.07"/><path d="M9.46 17.65a9.66 9.66 0 0 1-5.3-2.02"/></svg>` : ''}
        <div style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid ${color};"></div>
      </div>
    `,
    iconSize: [44, 54],
    iconAnchor: [22, 54],
    popupAnchor: [0, -54]
  });
};

// Create custom cluster icon
const createClusterCustomIcon = function (cluster: any) {
  return L.divIcon({
    html: `<div class="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]">
             <span class="text-white font-black text-sm drop-shadow-md">${cluster.getChildCount()}</span>
           </div>`,
    className: 'custom-marker-cluster bg-transparent',
    iconSize: L.point(48, 48, true),
  });
};

const PopupActions = ({ coords, wazeUrl }: { coords: [number, number], wazeUrl: string }) => {
  const map = useMap();
  
  return (
    <div className="flex items-center gap-2 mt-2">
      <Button 
        size="sm" 
        className="flex-1 h-8 text-[11px] font-bold gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        onClick={() => window.open(wazeUrl, '_blank')}
      >
        <Navigation2 className="w-3 h-3" /> נווט
      </Button>
      <Button 
        size="sm" 
        variant="outline"
        className="flex-1 h-8 text-[11px] font-bold gap-1 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={() => {
          map.flyTo(coords, 17, { duration: 1.5 });
          map.closePopup();
        }}
      >
        <Crosshair className="w-3 h-3" /> התמקד
      </Button>
    </div>
  );
};

export default function Radar() {
  const [viewMode, setViewMode] = useState<"markers" | "heatmap">("markers");
  const [filter, setFilter] = useState<"all" | "sea" | "fresh">("all");

  const { data: allCatches = [], isLoading } = useQuery({
    queryKey: ["map-catches"],
    queryFn: async () => {
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_CATCHES_ID, [
          Query.equal("status", "approved"),
          Query.orderDesc("$createdAt"),
          Query.limit(300) // Last 300 catches
        ]);
        return res.documents;
      } catch (e) {
        return [];
      }
    },
  });

  // Filter catches and process coordinates
  const catches = useMemo(() => {
    return allCatches.filter((c: any) => {
      if (!c.location) return false;
      const isFreshwater = c.location.includes("כנרת") || c.location.includes("טבריה");
      if (filter === "sea" && isFreshwater) return false;
      if (filter === "fresh" && !isFreshwater) return false;
      return true;
    }).map((c: any) => {
      const locText = c.location.split('|||')[0].trim();
      const mapUrl = c.location.includes('|||') ? c.location.split('|||')[1].trim() : '';
      
      let coords: [number, number] | null = null;
      
      // Attempt to extract exact coordinates from Waze/Google Maps URL
      if (mapUrl) {
        // Look for typical Israel coordinates: Lat ~29-34, Lng ~34-36
        const match = mapUrl.match(/(29|3[0-3])\.\d+(,|%2C)(3[4-5])\.\d+/);
        if (match) {
          const lat = parseFloat(match[0].replace('%2C', ',').split(',')[0]);
          const lng = parseFloat(match[0].replace('%2C', ',').split(',')[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            coords = [lat, lng];
          }
        }
      }

      // Fallback to generic map mapping
      if (!coords) {
        coords = LOCATIONS_MAP[locText] || null;
        if (!coords) {
          const sortedKeys = Object.keys(LOCATIONS_MAP).sort((a, b) => b.length - a.length);
          const match = sortedKeys.find(k => locText.includes(k));
          if (match) coords = LOCATIONS_MAP[match];
        }
      }
      
      if (!coords) return null;
      
      return {
        ...c,
        coords: [coords[0], coords[1]],
        isFreshwater: c.location.includes("כנרת") || c.location.includes("טבריה")
      };
    }).filter(Boolean);
  }, [allCatches, filter]);

  // Calculate heatmap data
  const heatmapData = useMemo(() => {
    if (!catches.length) return [];
    
    const locationCounts: Record<string, { count: number, coords: [number, number] }> = {};
    
    catches.forEach((c: any) => {
      // Use rounded coordinates to group them for the heatmap
      const key = `${c.coords[0].toFixed(2)},${c.coords[1].toFixed(2)}`;
      if (!locationCounts[key]) {
        locationCounts[key] = { count: 0, coords: [parseFloat(c.coords[0].toFixed(2)), parseFloat(c.coords[1].toFixed(2))] };
      }
      locationCounts[key].count += 1;
    });

    return Object.values(locationCounts);
  }, [catches]);

  return (
    <div className="absolute inset-0 z-10 bg-slate-900 pb-16 overflow-hidden">
      
      {/* Floating Header */}
      <div className="absolute inset-x-4 z-[1000] flex items-center justify-between pointer-events-none" style={{ top: 'max(env(safe-area-inset-top, 1rem), 1rem)' }}>
        <Link to="/" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center pointer-events-auto hover:bg-white/20 shadow-lg transition-colors text-white">
          <ChevronRight className="w-6 h-6" />
        </Link>
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl shadow-xl pointer-events-auto flex items-center gap-2">
          <MapPin className="w-5 h-5 text-rose-500 animate-pulse" />
          <h1 className="text-lg font-black tracking-tight text-white m-0">ראדאר תפיסות</h1>
        </div>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Floating Filters & Controls */}
      <div className="absolute inset-x-4 z-[1000] flex flex-col gap-3 pointer-events-none" style={{ bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 0px) + 5rem)' }}>
        {/* Toggle Mode */}
        <div className="flex justify-end pointer-events-auto">
          <ToggleGroup type="single" value={viewMode} onValueChange={(val) => val && setViewMode(val as any)} dir="ltr" className="bg-slate-900/90 backdrop-blur-xl p-1 rounded-full border border-white/10 shadow-lg">
            <ToggleGroupItem value="markers" aria-label="Markers mode" className="rounded-full data-[state=on]:bg-cyan-500 data-[state=on]:text-white">
              <Map className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="heatmap" aria-label="Heatmap mode" className="rounded-full data-[state=on]:bg-orange-500 data-[state=on]:text-white">
              <Flame className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 pointer-events-auto overflow-x-auto pb-2 scrollbar-hide rtl">
          <button 
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-bold shrink-0 shadow-lg transition-all border ${filter === 'all' ? 'bg-white text-slate-900 border-white' : 'bg-slate-900/80 backdrop-blur-xl text-slate-300 border-white/10 hover:bg-slate-800'}`}
          >
            <Filter className="w-4 h-4 inline-block mr-1.5" />
            הכל
          </button>
          <button 
            onClick={() => setFilter("sea")}
            className={`px-4 py-2 rounded-full text-sm font-bold shrink-0 shadow-lg transition-all border ${filter === 'sea' ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-slate-900/80 backdrop-blur-xl text-slate-300 border-white/10 hover:bg-slate-800'}`}
          >
            <Waves className="w-4 h-4 inline-block mr-1.5" />
            ים תיכון וים סוף
          </button>
          <button 
            onClick={() => setFilter("fresh")}
            className={`px-4 py-2 rounded-full text-sm font-bold shrink-0 shadow-lg transition-all border ${filter === 'fresh' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-900/80 backdrop-blur-xl text-slate-300 border-white/10 hover:bg-slate-800'}`}
          >
            <Droplet className="w-4 h-4 inline-block mr-1.5" />
            כנרת ומתוקים
          </button>
        </div>
      </div>

      {/* Fullscreen Map Layer */}
      <div className="w-full h-full relative z-[1]">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
            <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mb-4" />
            <p className="text-slate-400 font-bold tracking-wide">טוען ראדאר סודי...</p>
          </div>
        ) : (
          <MapContainer 
            center={DEFAULT_CENTER} 
            zoom={8} 
            className="w-full h-full"
            zoomControl={false} // Hide default controls to keep it native looking
          >
            <TileLayer
              url={viewMode === 'heatmap' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://mt1.google.com/vt/lyrs=m&hl=he&x={x}&y={y}&z={z}"}
              attribution={viewMode === 'heatmap' ? '&copy; CartoDB' : 'Map data © Google'}
            />
            
            {viewMode === 'markers' ? (
              <MarkerClusterGroup
                chunkedLoading
                iconCreateFunction={createClusterCustomIcon}
                showCoverageOnHover={false}
                maxClusterRadius={40}
              >
                {catches.map((c: any) => {
                  const icon = createCustomIcon(getImageUrl(c.image_id), c.isFreshwater);
                  return (
                    <Marker key={c.$id} position={c.coords} icon={icon}>
                      <Popup className="custom-popup p-0 border-0 shadow-none bg-transparent" minWidth={220} dir="rtl">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col">
                          <div className="h-28 relative bg-slate-100 dark:bg-slate-800">
                            {c.image_id ? (
                              <img src={getImageUrl(c.image_id)} alt="catch" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300"><MapPin className="w-10 h-10" /></div>
                            )}
                            <Badge className="absolute top-2 right-2 bg-black/60 text-white backdrop-blur-md border-0 text-[10px]">
                              {new Date(c.$createdAt).toLocaleDateString('he-IL')}
                            </Badge>
                          </div>
                          
                          <div className="p-4 text-center">
                            <h3 className="font-black text-lg text-slate-900 dark:text-white mb-0.5 leading-tight">{c.fish_type}</h3>
                            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-bold mb-3">{c.user_name}</p>
                            
                            {c.weight && (
                              <Badge variant="outline" className="mb-3 text-[10px] font-bold">
                                ממוצע משקל: {c.weight} ק"ג
                              </Badge>
                            )}
                            
                            {c.location.includes('|||') && (
                              <PopupActions coords={c.coords} wazeUrl={c.location.split('|||')[1].trim()} />
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MarkerClusterGroup>
            ) : (
              // Heatmap Bubbles Layer
              heatmapData.map((data, idx) => (
                <CircleMarker
                  key={`heat-${idx}`}
                  center={data.coords}
                  radius={Math.min(50, 20 + data.count * 4)}
                  pathOptions={{
                    fillColor: data.count > 10 ? '#ef4444' : data.count > 3 ? '#f97316' : '#eab308',
                    fillOpacity: 0.6,
                    color: 'transparent'
                  }}
                >
                  <Popup dir="rtl">
                    <div className="font-bold text-center text-sm p-1">
                      🔥 אזור חם!<br/>
                      {data.count} תפיסות מדווחות
                    </div>
                  </Popup>
                </CircleMarker>
              ))
            )}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
