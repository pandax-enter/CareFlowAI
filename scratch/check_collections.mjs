import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const firebaseConfig = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectData() {
    // Note: Firestore Web SDK doesn't have a listCollections method.
    // We have to guess common names based on the app logic.
    const collections = ['patients', 'users', 'nurses', 'doctors', 'hospital_inventory', 'wards', 'alerts', 'staff'];
    
    for (const col of collections) {
        console.log(`--- Checking Collection: ${col} ---`);
        const snap = await getDocs(query(collection(db, col), limit(1)));
        if (snap.empty) {
            console.log(`  Empty or does not exist.`);
        } else {
            console.log(`  Found! First doc: ${snap.docs[0].id}`);
            console.log(JSON.stringify(snap.docs[0].data(), null, 2));
        }
    }
}

inspectData().catch(console.error);
