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

async function migrate() {
    console.log('Starting Migration...');
    const { mockNurses, mockInventory, mockDoctors } = await import('./lib/mockData.js');
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // 1. Nurses
    console.log('Migrating Nurses...');
    for (const nurse of mockNurses) {
        await setDoc(doc(db, 'nurses', nurse.id), {
            ...nurse,
            specialization: nurse.specialty.toLowerCase(),
            currentWorkload: 0,
            performanceScore: nurse.performanceScore || 85,
            basePay: nurse.basePay || 3500,
            lastUpdated: new Date().toISOString()
        });
    }

    // 2. Inventory (to hospital_inventory)
    console.log('Migrating Inventory...');
    for (const item of mockInventory) {
        await setDoc(doc(db, 'hospital_inventory', item.id), {
            ...item,
            itemName: item.name,
            usageRatePerDay: item.dailyUsage,
            category: item.category || 'General Medical',
            lastRestocked: new Date().toISOString()
        });
    }

    // 3. Wards
    console.log('Migrating Wards...');
    const wards = [
        { id: 'W001', name: 'Cardiac ICU', specialty: 'Cardiac', currentOccupancy: 8, totalCapacity: 10 },
        { id: 'W002', name: 'General Ward 2B', specialty: 'General', currentOccupancy: 15, totalCapacity: 20 },
        { id: 'W003', name: 'Orthopedic / Geriatric', specialty: 'Geriatric', currentOccupancy: 5, totalCapacity: 15 }
    ];
    for (const ward of wards) {
        await setDoc(doc(db, 'wards', ward.id), ward);
    }
    
    // 4. Doctors
    console.log('Migrating Doctors...');
    for (const doctor of mockDoctors) {
        await setDoc(doc(db, 'doctors', doctor.id), {
            ...doctor,
            lastConsultation: null,
            assignedPatientsCount: 0,
            lastUpdated: new Date().toISOString()
        });
    }

    console.log('Migration Complete!');
}

migrate().catch(console.error);
