import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_CATCHES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Target, MapPin, Map, Flame } from "lucide-react";
import { getImageUrl } from "@/hooks/useCatches";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Fix for leaflet default icon issue in React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Rough coordinates for common Israel fishing spots
const LOCATIONS_MAP: Record<string, [number, number]> = {
  "חוף לגונה עכו": [32.9150, 35.0780],
  "לגונה עכו": [32.9150, 35.0780],
  "חוף ארגמן": [32.9184, 35.0788],
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

export default function Radar() {
  const { profileData, points, updateProfileField, loading: authLoading } = useAuth();
  const [unlocking, setUnlocking] = useState(false);
  const [viewMode, setViewMode] = useState<"markers" | "heatmap">("markers");

  const isUnlocked = profileData?.radar_unlocked === "true";

  const handleUnlock = async () => {
    if (points < 50) {
      toast.error("אין לך מספיק נקודות לפתוח את הראדאר!");
      return;
    }
    setUnlocking(true);
    const success = await updateProfileField('radar_unlocked', "true");
    if (success) {
      updateProfileField('points', points - 50);
      toast.success("הראדאר נפתח עבורך לתמיד! 🎯");
    } else {
      toast.error("שגיאה בפתיחת הראדאר");
    }
    setUnlocking(false);
  };

  const { data: catches = [], isLoading } = useQuery({
    queryKey: ["map-catches"],
    queryFn: async () => {
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_CATCHES_ID, [
          Query.equal("status", "approved"),
          Query.orderDesc("$createdAt"),
          Query.limit(200) // Last 200 catches for the map to make heatmap fuller
        ]);
        return res.documents;
      } catch (e) {
        return [];
      }
    },
    enabled: isUnlocked
  });

  // Calculate heatmap data grouped by general location coordinates
  const heatmapData = useMemo(() => {
    if (!catches.length) return [];
    
    const locationCounts: Record<string, { count: number, coords: [number, number] }> = {};
    
    catches.forEach((c: any) => {
      if (!c.location) return;
      const locText = c.location.split('|||')[0].trim();
      let coords = LOCATIONS_MAP[locText];
      if (!coords) {
        const sortedKeys = Object.keys(LOCATIONS_MAP).sort((a, b) => b.length - a.length);
        const match = sortedKeys.find(k => locText.includes(k));
        if (match) coords = LOCATIONS_MAP[match];
      }
      if (coords) {
        const key = `${coords[0]},${coords[1]}`;
        if (!locationCounts[key]) {
          locationCounts[key] = { count: 0, coords };
        }
        locationCounts[key].count += 1;
      }
    });

    return Object.values(locationCounts);
  }, [catches]);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto flex flex-col h-[calc(100vh-80px)]">
      
      <div className="flex flex-col px-4 mt-6 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            מפת תפיסות חיה <MapPin className="w-6 h-6 text-rose-500" />
          </h1>
          {isUnlocked && (
            <ToggleGroup type="single" value={viewMode} onValueChange={(val) => val && setViewMode(val as any)} dir="ltr" className="scale-90">
              <ToggleGroupItem value="markers" aria-label="Markers mode" className="data-[state=on]:bg-rose-500 data-[state=on]:text-white">
                <Map className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="heatmap" aria-label="Heatmap mode" className="data-[state=on]:bg-orange-500 data-[state=on]:text-white">
                <Flame className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          איפה הדגים נושכים ברגע זה? מבוסס על דיווחי הקהילה.
        </p>
      </div>

      {!isUnlocked && !authLoading ? (
        <div className="px-4 mt-8 flex-1">
          <Card className="border-rose-500/30 bg-rose-500/5 text-center h-full flex flex-col items-center justify-center">
            <CardContent className="p-8">
              <div className="w-20 h-20 bg-rose-500/20 rounded-full mx-auto flex items-center justify-center mb-4">
                <Target className="w-10 h-10 text-rose-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">מפת לייב נעולה</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                גלה בדיוק איפה תופסים דגים ברגע זה. המפה סורקת נתונים מהקהילה ומציגה סיכות ומפת חום על חופי ישראל בזמן אמת!
              </p>
              <Button 
                onClick={handleUnlock} 
                disabled={unlocking || points < 50}
                className="w-full max-w-xs h-14 text-lg font-bold bg-rose-500 hover:bg-rose-600 rounded-2xl mx-auto"
              >
                פתח לצמיתות (50 🪙)
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex-1 px-4 mb-4 relative z-0">
          <div className="w-full h-full rounded-2xl overflow-hidden border-4 border-slate-800 shadow-xl min-h-[400px]">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-900">
                <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <MapContainer center={DEFAULT_CENTER} zoom={8} className="w-full h-full z-0">
                <TileLayer
                  url={viewMode === 'heatmap' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                />
                
                {viewMode === 'markers' ? (
                  catches.map((c: any) => {
                    if (!c.location) return null;
                    const locText = c.location.split('|||')[0].trim();
                    let coords = LOCATIONS_MAP[locText];
                    if (!coords) {
                      const sortedKeys = Object.keys(LOCATIONS_MAP).sort((a, b) => b.length - a.length);
                      const match = sortedKeys.find(k => locText.includes(k));
                      if (match) coords = LOCATIONS_MAP[match];
                    }
                    if (!coords) return null;

                    const offsetLat = coords[0] + (Math.random() - 0.5) * 0.02;
                    const offsetLon = coords[1] + (Math.random() - 0.5) * 0.02;

                    return (
                      <Marker key={c.$id} position={[offsetLat, offsetLon]}>
                        <Popup className="custom-popup" dir="rtl">
                          <div className="text-center">
                            <img src={getImageUrl(c.image_id)} alt="catch" className="w-full h-24 object-cover rounded-md mb-2" />
                            <p className="font-bold text-sm text-cyan-600">{c.fish_type}</p>
                            <p className="text-xs text-gray-500">{c.user_name}</p>
                            <p className="text-[10px] text-gray-400 mb-2">{new Date(c.$createdAt).toLocaleDateString('he-IL')}</p>
                            
                            {c.location.includes('|||') && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full h-7 text-[10px] gap-1 rounded-full border-cyan-500/30 text-cyan-600 hover:bg-cyan-50"
                                onClick={() => window.open(c.location.split('|||')[1].trim(), '_blank')}
                              >
                                נווט לנקודה המדויקת
                              </Button>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })
                ) : (
                  heatmapData.map((data, idx) => (
                    <CircleMarker
                      key={`heat-${idx}`}
                      center={data.coords}
                      radius={Math.min(40, 15 + data.count * 3)}
                      pathOptions={{
                        fillColor: data.count > 5 ? '#ef4444' : data.count > 2 ? '#f97316' : '#eab308',
                        fillOpacity: 0.6,
                        color: 'transparent'
                      }}
                    >
                      <Popup dir="rtl">
                        <div className="font-bold text-center">
                          {data.count} תפיסות לאחרונה באזור זה!
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))
                )}
              </MapContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
