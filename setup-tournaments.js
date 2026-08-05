import { Client, Databases, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DB_ID = process.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = 'tournaments';

async function setupTournaments() {
    console.log('Setting up tournaments collection...');
    
    try {
        // Create collection if it doesn't exist
        try {
            await databases.getCollection(DB_ID, COLLECTION_ID);
            console.log('Collection already exists.');
        } catch (e) {
            console.log('Creating collection...');
            await databases.createCollection(
                DB_ID, 
                COLLECTION_ID, 
                'Tournaments',
                [
                    Permission.read(Role.any()),
                    Permission.create(Role.users()),
                    Permission.update(Role.users()),
                    Permission.delete(Role.users())
                ]
            );
            console.log('Collection created.');
        }

        console.log('Creating attributes...');
        // Create attributes
        const attributes = [
            { key: 'title', type: 'string', size: 100, required: true },
            { key: 'description', type: 'string', size: 1000, required: true },
            { key: 'status', type: 'string', size: 50, required: true }, // active, upcoming, completed
            { key: 'start_date', type: 'datetime', required: true },
            { key: 'end_date', type: 'datetime', required: true },
            { key: 'entry_fee', type: 'integer', required: true, default: 0 },
            { key: 'prize_pool', type: 'integer', required: true, default: 0 },
            { key: 'image_id', type: 'string', size: 100, required: false },
        ];

        for (const attr of attributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(DB_ID, COLLECTION_ID, attr.key, attr.size, attr.required, attr.default);
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(DB_ID, COLLECTION_ID, attr.key, attr.required, attr.default === undefined ? 0 : attr.default, attr.default !== undefined);
                } else if (attr.type === 'datetime') {
                    await databases.createDatetimeAttribute(DB_ID, COLLECTION_ID, attr.key, attr.required);
                }
                console.log(`Attribute ${attr.key} created.`);
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log(`Attribute ${attr.key} already exists.`);
                } else {
                    console.error(`Error creating attribute ${attr.key}:`, e.message);
                }
            }
        }
        
        console.log('Wait for attributes to be ready before creating array attribute...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
            await databases.createStringAttribute(DB_ID, COLLECTION_ID, 'participants', 100, false, undefined, true); // array
            console.log(`Attribute participants created.`);
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log(`Attribute participants already exists.`);
            } else {
                console.error(`Error creating attribute participants:`, e.message);
            }
        }

        console.log('Tournaments setup complete!');
    } catch (e) {
        console.error('Setup failed:', e);
    }
}

setupTournaments();
