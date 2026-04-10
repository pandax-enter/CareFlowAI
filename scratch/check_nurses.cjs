const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function checkNurses() {
    try {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const querySnapshot = await getDocs(collection(db, 'nurses'));
        const nurses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(JSON.stringify(nurses, null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkNurses();
