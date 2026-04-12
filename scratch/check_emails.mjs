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

async function inspectEmail() {
    console.log("--- Nurses ---");
    const nSnap = await getDocs(query(collection(db, 'nurses'), limit(10)));
    nSnap.forEach(doc => {
        console.log(`ID: ${doc.id}, Name: ${doc.data().name}, Email: ${doc.data().email || 'MISSING'}`);
    });

    console.log("\n--- Doctors ---");
    const dSnap = await getDocs(query(collection(db, 'doctors'), limit(10)));
    dSnap.forEach(doc => {
        console.log(`ID: ${doc.id}, Name: ${doc.data().name}, Email: ${doc.data().email || 'MISSING'}`);
    });
}

inspectEmail().catch(console.error);
