import('node-appwrite').then(async appwrite => {
  const { Client, Databases, ID } = appwrite;
  const client = new Client();
  client.setEndpoint('https://fra.cloud.appwrite.io/v1').setProject('6a6748ef003255232493');
  const databases = new Databases(client);
  const DB_ID = '6a674a380025507f9db2';
  
  const DEFAULT_ISRAEL_SPOTS = [
    { name: 'ראש הנקרה - סלעי הגבול', lat: 33.0903, lng: 35.1039, methods: "ז'רז'ור כבד, שור ג'יג" },
    { name: 'חיפה - שובר הגלים הראשי', lat: 32.8277, lng: 34.9810, methods: "ז'רז'ור, פתיונות, בוס" },
    { name: 'מרינה הרצליה - השובר החיצוני', lat: 32.1624, lng: 34.7933, methods: "ז'רז'ור קל, פתיונות, אגינג" },
    { name: 'תל אביב - מזח רידינג', lat: 32.1023, lng: 34.7734, methods: "ז'רז'ור, פתיונות, בולונז" },
    { name: 'אשדוד - השובר הצפוני', lat: 31.8260, lng: 34.6415, methods: "שור ג'יג, פתיונות חי" },
    { name: 'אשקלון - מרינה סלעים', lat: 31.6831, lng: 34.5558, methods: "ז'רז'ור, פתיונות" },
    { name: 'אילת - חוף המזח הדרומי', lat: 29.5085, lng: 34.9220, methods: "ז'רז'ור מים מלוחים, ג'יגינג" },
    { name: 'כנרת - חוף חלוקים', lat: 32.8421, lng: 35.6121, methods: 'דייג עדשים, קרפיונים, בלייק באס' }
  ];

  for (const spot of DEFAULT_ISRAEL_SPOTS) {
    try {
      await databases.createDocument(DB_ID, 'locations', ID.unique(), {
        name: spot.name,
        latitude: spot.lat,
        longitude: spot.lng,
        fishing_methods: spot.methods,
        status: 'approved',
        user_id: 'system',
        added_by: 'system',
        map_url: `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`
      });
      console.log('Added:', spot.name);
    } catch (e) {
      console.error('Failed to add:', spot.name, e);
    }
  }
});
