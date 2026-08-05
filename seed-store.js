import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('6a6748ef003255232493')
    .setKey('standard_064228356a05481b9eb9f73424173ebfb2decbc264fdc20554db1e8e3cb216ecc9af8450103ee9ededa76f37f49378d1981156c227ea4c6a03ef3a2e91ca20ca0435668a4047939317295e18784961fe6751138f87fe9f752085566afdced8511b4c6f09a1b271c167c1faa5d31bf792abd4de4bc840b2fb087359dd8f52bdee');

const databases = new Databases(client);
const DB_ID = '6a674a380025507f9db2';
const COLLECTION_ID = 'store_items';

const items = [
    // Titles
    { name: "אגדת הים", description: "תואר אקסקלוסיבי לטובים ביותר", type: "title", value: "אגדת הים", cost: 1000, is_active: true },
    { name: "רב-חובל", description: "כבוד והדר לפרופיל שלך", type: "title", value: "רב-חובל", cost: 500, is_active: true },
    { name: "צייד מפלצות", description: "לאמיצים שמתעסקים עם הגדולים", type: "title", value: "צייד מפלצות", cost: 2000, is_active: true },
    { name: "רואה ואינו נראה", description: "לדייגי הפיתיונות החשאיים", type: "title", value: "רואה ואינו נראה", cost: 250, is_active: true },
    
    // Borders
    { name: "פלטינום", description: "מסגרת פלטינום בוהקת לפרופיל", type: "border", value: "platinum", cost: 800, is_active: true },
    { name: "אוקיינוס", description: "מסגרת כחולה עם אפקט מים", type: "border", value: "ocean", cost: 400, is_active: true },
    { name: "אש כתומה", description: "למי שנמצא ברצף תפיסות חם", type: "border", value: "fire", cost: 600, is_active: true },

    // AI Credits
    { name: "10 סריקות AI", description: "הוסף 10 זיהויי AI חכמים לדגים", type: "ai_credits", value: "10", cost: 50, is_active: true },
    { name: "50 סריקות AI", description: "הוסף 50 זיהויי AI. מושלם ליום בים!", type: "ai_credits", value: "50", cost: 200, is_active: true },
    
    // Power-ups (Flare & Radar)
    { name: "הדגשת פוסט", description: "התפיסה הבאה שלך תזהר בפיד למשך 24 שעות", type: "flare", value: "1", cost: 150, is_active: true },
    { name: "ראדאר פרימיום (24 ש')", description: "פותח אזורי דיג סודיים במפה", type: "radar_unlock", value: "24", cost: 300, is_active: true },

    // Tickets
    { name: "הגרלת רולר Shimano", description: "כרטיס להגרלת סוף החודש", type: "tickets", value: "1", cost: 50, is_active: true },
    { name: "הגרלת חכת ז'רז'ור", description: "כרטיס להגרלת ציוד איכותי", type: "tickets", value: "1", cost: 100, is_active: true }
];

async function seedStore() {
    console.log("Seeding store items...");
    for (const item of items) {
        try {
            await databases.createDocument(
                DB_ID,
                COLLECTION_ID,
                ID.unique(),
                item,
                [
                    Permission.read(Role.any())
                ]
            );
            console.log(`Created: ${item.name}`);
        } catch (e) {
            console.error(`Failed to create ${item.name}: ${e.message}`);
        }
    }
    console.log("Done!");
}

seedStore();
