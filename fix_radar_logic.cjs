const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/Radar.tsx', 'utf8');

const locateState = `
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const locateMe = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setIsLocating(false);
      },
      (err) => {
        console.error("Locate error:", err);
        setIsLocating(false);
      }
    );
  };
`;

// Inject state
code = code.replace(
  /const \[filter, setFilter\] = useState<"all" \| "sea" \| "fresh">\(.*?\);/g,
  match => match + '\n' + locateState
);

// MapUpdater needs to accept userLocation and fly to it
const oldMapUpdaterRegex = /function MapUpdater\(\{ filter \}: \{ filter: "all" \| "sea" \| "fresh" \}\) \{[\s\S]*?return null;\r?\n\}/;
const newMapUpdater = `// MapUpdater component to dynamically change map view based on filter
function MapUpdater({ filter, userLocation }: { filter: "all" | "sea" | "fresh", userLocation: [number, number] | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (userLocation) {
      map.flyTo(userLocation, 12, { duration: 1.5 });
    } else if (filter === "fresh") {
      map.flyTo([32.8, 35.5], 10, { duration: 1.5 });
    } else if (filter === "sea") {
      map.flyTo([32.0, 34.5], 8, { duration: 1.5 });
    } else {
      map.flyTo(DEFAULT_CENTER, 8, { duration: 1.5 });
    }
  }, [filter, map, userLocation]);
  return null;
}`;

code = code.replace(oldMapUpdaterRegex, newMapUpdater);
code = code.replace(/<MapUpdater filter=\{filter\} \/>/g, `<MapUpdater filter={filter} userLocation={userLocation} />`);

// Update Windy URL to use userLocation if set
// The URL string has template literals. Let's just find the windy URL line.
code = code.replace(
  /zoom=\\?\$\{filter === 'fresh' \? 10 : 8\}/g,
  "zoom=${userLocation ? 11 : filter === 'fresh' ? 10 : 8}"
);

code = code.replace(
  /lat=\\?\$\{filter === 'fresh' \? 32.8 : 32.2\}/g,
  "lat=${userLocation ? userLocation[0] : filter === 'fresh' ? 32.8 : 32.2}"
);

code = code.replace(
  /lon=\\?\$\{filter === 'fresh' \? 35.5 : 34.8\}/g,
  "lon=${userLocation ? userLocation[1] : filter === 'fresh' ? 35.5 : 34.8}"
);

// Also add a user marker to Leaflet
const tileLayer = `<TileLayer`;
const tileLayerWithMarker = `{userLocation && (
              <CircleMarker center={userLocation} radius={6} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}>
                <Popup>המיקום שלך</Popup>
              </CircleMarker>
            )}
            <TileLayer`;
code = code.replace(tileLayer, tileLayerWithMarker);

fs.writeFileSync('src/pages/fishing/Radar.tsx', code);
console.log('done fixing radar logic');
