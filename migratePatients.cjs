const { initializeApp } = require('firebase/app');
const { getFirestore, collection, setDoc, doc } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function migratePatients() {
    console.log('Starting Patient Migration...');
    const { mockPatients } = await import('./lib/mockData.js');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    for (const patient of mockPatients) {
        // Enriched fields
        await setDoc(doc(db, 'patients', patient.id), {
            ...patient,
            riskLevel: patient.riskLevel || 'Low',
            urgencyLevel: patient.urgencyLevel || 'Standard',
            status: patient.status || 'Waiting',
            timestamp: new Date().toISOString()
        });
    }
    console.log('Patient Migration Complete!');
}

migratePatients().catch(console.error);
