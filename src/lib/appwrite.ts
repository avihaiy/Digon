import { Client, Account, Databases, Storage } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const APPWRITE_DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const APPWRITE_PROFILES_ID = import.meta.env.VITE_APPWRITE_PROFILES_COLLECTION_ID;
export const APPWRITE_CATCHES_ID = "catches_"; // Based on Appwrite screenshot
export const APPWRITE_CATCH_IMAGES_BUCKET_ID = "6a684772002def29debb"; // Based on Appwrite screenshot
export const APPWRITE_LOCATIONS_ID = "locations";
export const APPWRITE_ADS_ID = "ads";
export const APPWRITE_STORE_ITEMS_ID = "store_items";
export const APPWRITE_SETTINGS_ID = "settings";
export const APPWRITE_LIKES_ID = "likes";
export const APPWRITE_COMMENTS_ID = "comments";
export const APPWRITE_NOTIFICATIONS_ID = "notifications";
export const APPWRITE_TOURNAMENTS_ID = "tournaments";
export const APPWRITE_MESSAGES_ID = "messages";
export const APPWRITE_RELATIONSHIPS_ID = "relationships";
export const APPWRITE_CAMS_ID = "cams";

export default client;
export const APPWRITE_PURCHASES_ID = 'purchases';
