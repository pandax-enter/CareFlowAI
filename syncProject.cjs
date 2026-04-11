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

async function sync() {
    console.log('🚀 Starting Definitive Project Synchronization...');
    const { mockNurses, mockInventory, mockDoctors, mockPatients } = await import('./lib/mockData.js');
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const icMap = {
        'P001': '590101-01-5543',
        'P002': '820512-10-5212',
        'P003': '460320-01-6678',
        'P004': '691122-08-5431',
        'P005': '541215-01-5990'
    };

    // 1. Nurses
    console.log('Migrating Nurses (with Performance & Pay)...');
    for (const nurse of mockNurses) {
        await setDoc(doc(db, 'nurses', nurse.id), {
            ...nurse,
            specialization: nurse.specialty?.toLowerCase() || 'general',
            currentWorkload: 0,
            performanceScore: nurse.performanceScore || 90,
            basePay: nurse.basePay || 3500,
            lastUpdated: new Date().toISOString()
        });
    }

    // 2. Doctors
    console.log('Migrating Doctors (with Slots & Specialization)...');
    for (const doctor of mockDoctors) {
        await setDoc(doc(db, 'doctors', doctor.id), {
            ...doctor,
            availableSlots: doctor.availableSlots || ['09:00 AM', '11:00 AM', '02:00 PM'],
            specialization: doctor.specialty?.toLowerCase() || 'general',
            assignedPatientsCount: 0,
            lastUpdated: new Date().toISOString()
        });
    }

    // 3. Inventory (as hospital_inventory)
    console.log('Migrating Inventory (with Usage & Thresholds)...');
    for (const item of mockInventory) {
        await setDoc(doc(db, 'hospital_inventory', item.id), {
            ...item,
            itemName: item.name,
            usageRatePerDay: item.dailyUsage || 10,
            minThreshold: item.minThreshold || 50,
            lastRestocked: new Date().toISOString()
        });
    }

    // 4. Patients (Full Clinical Context)
    console.log('Migrating Patients (Full Clinical History + IC)...');
    for (const patient of mockPatients) {
        const standardizedRoutine = (patient.careRoutine || []).map((r, idx) => {
            if (typeof r === 'string') {
                return {
                    task: r,
                    time: `${10 + idx}:00 AM`,
                    completed: false
                };
            }
            return r;
        });

        await setDoc(doc(db, 'patients', patient.id), {
            ...patient,
            icNumber: icMap[patient.id] || `000000-00-${patient.id.slice(1)}`,
            careRoutine: standardizedRoutine,
            status: patient.status || 'Admitted',
            riskLevel: patient.riskLevel || 'Low',
            urgencyLevel: patient.urgencyLevel || 'Standard',
            medicalTranscript: patient.medicalTranscript || "Patient admitted for observation and further diagnostic workup.",
            prescribedMedications: patient.prescribedMedications || "TBD following clinical review.",
            transcriptStatus: patient.transcriptStatus || "Active",
            registeredAt: new Date().toISOString()
        });
    }

    // 5. Wards
    console.log('Migrating Wards...');
    const wards = [
        { id: 'W001', name: 'Cardiac ICU', specialty: 'Cardiac', currentOccupancy: 8, totalCapacity: 10 },
        { id: 'W002', name: 'General Ward 2B', specialty: 'General', currentOccupancy: 15, totalCapacity: 20 },
        { id: 'W003', name: 'Orthopedic / Geriatric', specialty: 'Geriatric', currentOccupancy: 5, totalCapacity: 15 }
    ];
    for (const ward of wards) {
        await setDoc(doc(db, 'wards', ward.id), ward);
    }

    console.log('🏁 Definitive Migration Script Finished.');
}

sync().catch(console.error);
