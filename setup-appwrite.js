import { Client, Databases, ID } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('6a6748ef003255232493')
    .setKey('standard_064228356a05481b9eb9f73424173ebfb2decbc264fdc20554db1e8e3cb216ecc9af8450103ee9ededa76f37f49378d1981156c227ea4c6a03ef3a2e91ca20ca0435668a4047939317295e18784961fe6751138f87fe9f752085566afdced8511b4c6f09a1b271c167c1faa5d31bf792abd4de4bc840b2fb087359dd8f52bdee');

const databases = new Databases(client);

async function setupAppwrite() {
    try {
        console.log('Creating database...');
        const db = await databases.create(ID.unique(), 'DigonDB');
        console.log('Database created:', db.$id);

        console.log('Creating profiles collection...');
        const profilesColl = await databases.createCollection(db.$id, ID.unique(), 'profiles');
        
        console.log('Creating attributes for profiles...');
        await databases.createStringAttribute(db.$id, profilesColl.$id, 'user_id', 255, true);
        await databases.createStringAttribute(db.$id, profilesColl.$id, 'full_name', 255, false);
        await databases.createStringAttribute(db.$id, profilesColl.$id, 'role', 50, false, 'USER');
        
        console.log('Setup complete! Save this Database ID:');
        console.log(`VITE_APPWRITE_DATABASE_ID="${db.$id}"`);
        console.log(`VITE_APPWRITE_PROFILES_COLLECTION_ID="${profilesColl.$id}"`);
    } catch (e) {
        console.error('Setup failed:', e.message);
    }
}

setupAppwrite();
