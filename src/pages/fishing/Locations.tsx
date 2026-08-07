import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { databases, storage, APPWRITE_DB_ID, APPWRITE_LOCATIONS_ID, APPWRITE_CATCH_IMAGES_BUCKET_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Navigation2, Map as MapIcon, Star, Info } from "lucide-react";
import { LocationReportDialog } from "@/components/locations/LocationReportDialog";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";

// Fix Leaflet marker icon issue in React
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function Locations() {
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');

  const { data: dbLocations, isLoading } = useQuery({
    queryKey: ["fishing-locations"],
    queryFn: async () => {
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_LOCATIONS_ID, [
          Query.limit(50)
        ]);
        return res.documents.filter((doc: any) => doc.status === 'approved');
      } catch (e) {
        return [];
      }
    },
  });

  const DEFAULT_ISRAEL_SPOTS = [
    { id: 'spot-1', name: 'ראש הנקרה - סלעי הגבול', lat: 33.0903, lng: 35.1039, methods: 'ז\'רז\'ור כבד, שור ג\'יג', rating: 4.9 },
    { id: 'spot-2', name: 'חיפה - שובר הגלים הראשי', lat: 32.8277, lng: 34.9810, methods: 'ז\'רז\'ור, פתיונות, בוס', rating: 4.7 },
    { id: 'spot-3', name: 'מרינה הרצליה - השובר החיצוני', lat: 32.1624, lng: 34.7933, methods: 'ז\'רז\'ור קל, פתיונות, אגינג', rating: 4.6 },
    { id: 'spot-4', name: 'תל אביב - מזח רידינג', lat: 32.1023, lng: 34.7734, methods: 'ז\'רז\'ור, פתיונות, בולונז', rating: 4.8 },
    { id: 'spot-5', name: 'אשדוד - השובר הצפוני', lat: 31.8260, lng: 34.6415, methods: 'שור ג\'יג, פתיונות חי', rating: 4.8 },
    { id: 'spot-6', name: 'אשקלון - מרינה סלעים', lat: 31.6831, lng: 34.5558, methods: 'ז\'רז\'ור, פתיונות', rating: 4.5 },
    { id: 'spot-7', name: 'אילת - חוף המזח הדרומי', lat: 29.5085, lng: 34.9220, methods: 'ז\'רז\'ור מים מלוחים, ג\'יגינג', rating: 4.9 },
    { id: 'spot-8', name: 'כנרת - חוף חלוקים', lat: 32.8421, lng: 35.6121, methods: 'דייג עדשים, קרפיונים, בלייק באס', rating: 4.7 }
  ];

  // Add DB locations + Default spots
  const allLocations: any[] = [...DEFAULT_ISRAEL_SPOTS];
  if (dbLocations) {
    dbLocations.forEach((loc: any) => {
      if (!allLocations.find(l => l.name === loc.name)) {
        allLocations.push({
          id: loc.$id,
          name: loc.name,
          lat: loc.lat || 32.0853,
          lng: loc.lng || 34.7818,
          methods: loc.fishing_methods || "כללי",
          rating: 4.5,
          dbLoc: loc
        });
      }
    });
  }

  return (
    <div className="space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto overflow-hidden flex flex-col h-[calc(100vh-4rem)]">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            מפת חום <MapIcon className="w-5 h-5 text-cyan-500" />
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            גלה ספוטים שווים איפה שאנשים תופסים עכשיו
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 shrink-0">
        <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex">
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'map' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            מפה אינטראקטיבית
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'list' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            רשימת ספוטים
          </button>
        </div>
      </div>

      {/* Map View */}
      {activeTab === 'map' && (
        <div className="flex-1 relative mx-4 rounded-3xl overflow-hidden shadow-xl shadow-cyan-500/10 border border-slate-200 dark:border-slate-800 z-10">
          <MapContainer 
            center={[32.0853, 34.7818]} // Center of Israel coast roughly
            zoom={8} 
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {allLocations.map((loc, idx) => (
              <Marker key={loc.id || idx} position={[loc.lat, loc.lng]} icon={customIcon}>
                <Popup className="custom-popup">
                  <div className="p-1 text-right" dir="rtl">
                    <h3 className="font-black text-sm mb-1">{loc.name}</h3>
                    <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold mb-2">
                      <Star className="w-3 h-3 fill-yellow-500" /> {loc.rating}
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2">{loc.methods}</p>
                    <Button 
                      size="sm" 
                      className="w-full h-7 text-xs bg-cyan-500 hover:bg-cyan-600 rounded-lg"
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`, '_blank')}
                    >
                      נווט לנקודה
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          <div className="absolute top-4 left-4 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg shadow-black/5 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></div>
            <span className="text-xs font-bold">{allLocations.length} ספוטים זמינים</span>
          </div>
        </div>
      )}

      {/* List View */}
      {activeTab === 'list' && (
        <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
          <LocationReportDialog>
            <Button size="lg" variant="outline" className="w-full h-14 text-base rounded-2xl shadow-sm gap-2 bg-white dark:bg-slate-900 border-dashed border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
              <Plus className="w-5 h-5 text-cyan-500" />
              דווח על ספוט חדש
            </Button>
          </LocationReportDialog>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            allLocations.map((loc: any, idx) => {
              const methodsArray = loc.methods ? loc.methods.split(",").map((m: string) => m.trim()).filter(Boolean) : [];
              const previewUrl = loc.dbLoc?.image_url 
                ? storage.getFilePreview(APPWRITE_CATCH_IMAGES_BUCKET_ID, loc.dbLoc.image_url).href 
                : null;
                
              return (
                <Card key={loc.id || idx} className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl">
                  <div className="flex flex-col p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                          {loc.name}
                        </h3>
                        <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold mt-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-500" />
                          {loc.rating} <span className="text-slate-400 ml-1 font-normal">(אימות קהילה)</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 rounded-full shrink-0"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`, '_blank')}
                      >
                        <Navigation2 className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1.5">
                            {methodsArray.map((method: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {method}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center text-[10px] text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-500/10 w-fit px-2 py-1 rounded-md">
                          <MapPin className="w-3 h-3 ml-1" /> פתוח לציבור
                        </div>
                      </div>
                      
                      {previewUrl ? (
                        <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800 shadow-inner">
                          <img src={previewUrl} alt={loc.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-2xl shrink-0 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                          <MapIcon className="w-6 h-6 opacity-20" />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
