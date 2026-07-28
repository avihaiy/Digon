import { Client, Databases, Permission, Role } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('6a6748ef003255232493')
    .setKey('standard_064228356a05481b9eb9f73424173ebfb2decbc264fdc20554db1e8e3cb216ecc9af8450103ee9ededa76f37f49378d1981156c227ea4c6a03ef3a2e91ca20ca0435668a4047939317295e18784961fe6751138f87fe9f752085566afdced8511b4c6f09a1b271c167c1faa5d31bf792abd4de4bc840b2fb087359dd8f52bdee');

const databases = new Databases(client);
const DB_ID = '6a674a380025507f9db2';

async function resetAndSetup() {
    try {
        console.log('Cleaning up old collections...');
        try { await databases.deleteCollection(DB_ID, 'ads'); } catch(e){}
        try { await databases.deleteCollection(DB_ID, 'locations'); } catch(e){}

        console.log('Creating ads collection...');
        await databases.createCollection(DB_ID, 'ads', 'ads', [
            Permission.read(Role.any()),
            Permission.create(Role.any()),
            Permission.update(Role.any()),
            Permission.delete(Role.any())
        ]);
        
        await databases.createStringAttribute(DB_ID, 'ads', 'title', 255, true);
        await databases.createStringAttribute(DB_ID, 'ads', 'description', 5000, true);
        await databases.createFloatAttribute(DB_ID, 'ads', 'price', false);
        await databases.createStringAttribute(DB_ID, 'ads', 'image_url', 1000, false);
        await databases.createStringAttribute(DB_ID, 'ads', 'status', 50, false, 'pending');
        await databases.createStringAttribute(DB_ID, 'ads', 'user_id', 100, true);
        await databases.createDatetimeAttribute(DB_ID, 'ads', 'created_at', false);

        console.log('Creating locations collection...');
        await databases.createCollection(DB_ID, 'locations', 'locations', [
            Permission.read(Role.any()),
            Permission.create(Role.any()),
            Permission.update(Role.any()),
            Permission.delete(Role.any())
        ]);
        
        await databases.createStringAttribute(DB_ID, 'locations', 'name', 255, true);
        await databases.createStringAttribute(DB_ID, 'locations', 'description', 5000, false);
        await databases.createFloatAttribute(DB_ID, 'locations', 'latitude', true);
        await databases.createFloatAttribute(DB_ID, 'locations', 'longitude', true);
        await databases.createStringAttribute(DB_ID, 'locations', 'image_url', 1000, false);
        await databases.createStringAttribute(DB_ID, 'locations', 'added_by', 100, true);
        await databases.createDatetimeAttribute(DB_ID, 'locations', 'created_at', false);

        console.log('Digon collections created successfully!');
    } catch (e) {
        console.error('Setup failed:', e.message);
    }
}

resetAndSetup();
