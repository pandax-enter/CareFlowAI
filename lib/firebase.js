import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    doc, 
    updateDoc, 
    onSnapshot, 
    setDoc, 
    getDoc,
    increment,
    orderBy,
    limit,
    serverTimestamp,
    deleteDoc
} from 'firebase/firestore';
import { mockPatients, mockNurses, mockInventory, mockDoctors } from './mockData';

// Simulated in-memory DB for when Firebase is not configured
let mockDB = {
    patients:   [...mockPatients],
    nurses:     [...mockNurses],
    inventory:  [...mockInventory],
    doctors:    [...mockDoctors],
    wards: [
        { id: 'W001', name: 'Cardiac ICU',    specialty: 'Cardiac', currentOccupancy: 8,  totalCapacity: 10 },
        { id: 'W002', name: 'General Ward 2B', specialty: 'General', currentOccupancy: 15, totalCapacity: 20 }
    ],
    audit_logs: [],
    users: []
};

let currentMockUser = null;

// Firebase configuration — values come from .env.local
const firebaseConfig = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const isFirebaseConfigured = !!firebaseConfig.apiKey;

let realAuth;
let realDb;

if (isFirebaseConfigured) {
    const existingApps = getApps();
    const app = existingApps.length === 0 ? initializeApp(firebaseConfig) : existingApps[0];
    realAuth = getAuth(app);
    realDb   = getFirestore(app);
}

// ------------------------------------------------------------------ //
// NAMED EXPORTS — allow pages to import { db } for direct Firestore   //
// ------------------------------------------------------------------ //
export const db   = realDb   || { _isMock: true };
export const auth = realAuth || null;

// ------------------------------------------------------------------ //
// AUTH HELPERS                                                         //
// ------------------------------------------------------------------ //
export const loginUser = async (email, password) => {
    if (isFirebaseConfigured) {
        const credential = await signInWithEmailAndPassword(realAuth, email, password);
        return credential.user;
    }
    console.warn('Mock Firebase: Simulating Login');
    const part = email.split('@')[0];
    const name = part.charAt(0).toUpperCase() + part.slice(1);
    currentMockUser = { uid: `mock_${Math.random()}`, email, specialty: name, name: `${name} Nurse` };
    return currentMockUser;
};

export const logoutUser = async () => {
    if (isFirebaseConfigured) {
        await signOut(realAuth);
    } else {
        currentMockUser = null;
    }
};

export const getCurrentUserSpecialty = () => {
    return currentMockUser?.specialty || null;
};

// ------------------------------------------------------------------ //
// PATIENT SERVICES                                                     //
// ------------------------------------------------------------------ //
export const getPatientByIC = async (icNumber) => {
    if (!icNumber) return null;
    if (isFirebaseConfigured) {
        const q = query(collection(realDb, 'patients'), where('icNumber', '==', icNumber));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const doc = snap.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    }
    return mockDB.patients.find(p => p.icNumber === icNumber) || null;
};

export const savePatientRecord = async (patientData, existingPatientId = null) => {
    if (isFirebaseConfigured) {
        if (existingPatientId) {
            const patientRef = doc(realDb, 'patients', existingPatientId);
            await updateDoc(patientRef, patientData);
            await addDoc(collection(realDb, 'patients', existingPatientId, 'consultations'), {
                ...patientData,
                historyTimestamp: serverTimestamp()
            });
            return existingPatientId;
        } else {
            const docRef = await addDoc(collection(realDb, 'patients'), patientData);
            return docRef.id;
        }
    }
    
    // Mock Database handling
    if (existingPatientId) {
        const idx = mockDB.patients.findIndex(p => p.id === existingPatientId);
        if (idx !== -1) {
            mockDB.patients[idx] = { ...mockDB.patients[idx], ...patientData };
        }
        return existingPatientId;
    }
    
    const newPatient = { id: 'P' + Math.floor(Math.random() * 10000), ...patientData };
    mockDB.patients.unshift(newPatient);
    return newPatient.id;
};

export const getAllPatients = async () => {
    if (isFirebaseConfigured) {
        const q = query(collection(realDb, 'patients'), where('status', 'in', ['Admitted', 'Waiting']));
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data();
            return { 
                id: d.id, 
                ...data,
                icNumber: data.icNumber || data.ic_number || 'N/A'
            };
        });
    }
    return [...mockDB.patients].filter(p => p.status !== 'Discharged');
};

export const getPatientsBySpecialty = async (specialty) => {
    if (isFirebaseConfigured) {
        const q = query(collection(realDb, 'patients'), where('requiredSpecialty', '==', specialty));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return mockDB.patients.filter(p =>
        (p.requiredSpecialty || '').toLowerCase() === (specialty || '').toLowerCase()
    );
};

export const updatePatientRecord = async (patientId, updateData) => {
    if (isFirebaseConfigured) {
        await updateDoc(doc(realDb, 'patients', patientId), updateData);
    } else {
        const idx = mockDB.patients.findIndex(p => p.id === patientId);
        if (idx !== -1) mockDB.patients[idx] = { ...mockDB.patients[idx], ...updateData };
    }
};

// ------------------------------------------------------------------ //
// NURSE SERVICES                                                       //
// ------------------------------------------------------------------ //
export const createNurseAlert = async (alertData) => {
    if (isFirebaseConfigured) {
        // Deduplication check: only add if no active alert for this sourceId
        if (alertData.sourceId) {
            const q = query(
                collection(realDb, 'alerts'), 
                where('sourceId', '==', alertData.sourceId),
                where('status', '==', 'active')
            );
            const snap = await getDocs(q);
            if (!snap.empty) return snap.docs[0].id; // Return existing
        }

        const docRef = await addDoc(collection(realDb, 'alerts'), {
            ...alertData,
            status: alertData.status || 'active',
            timestamp: serverTimestamp()
        });
        return docRef.id;
    }
    if (!mockDB.alerts) mockDB.alerts = [];
    const existing = alertData.sourceId ? mockDB.alerts.find(a => a.sourceId === alertData.sourceId && a.status === 'active') : null;
    if (existing) return existing.id;
    const newAlert = { id: 'ALT' + Math.random(), ...alertData, status: alertData.status || 'active', timestamp: new Date().toISOString() };
    mockDB.alerts.unshift(newAlert);
    return newAlert.id;
};

export const getNurses = async () => {
    if (isFirebaseConfigured) {
        const snap = await getDocs(collection(realDb, 'nurses'));
        return snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                specialty:        data.specialty || data.specialization || 'General',
                currentLoad:      data.currentLoad || data.currentWorkload || 0,
                performanceScore: data.performanceScore || 85,
                basePay:          data.basePay || 3000
            };
        });
    }
    return mockDB.nurses.map(n => ({
        ...n,
        currentLoad:      n.currentLoad || mockDB.patients.filter(p => p.assignedNurseId === n.id && p.status !== 'Discharged').length,
        performanceScore: n.performanceScore || 85,
        basePay:          n.basePay || 3000
    }));
};

export const updateNurse = async (nurseId, updateData) => {
    if (isFirebaseConfigured) {
        await updateDoc(doc(realDb, 'nurses', nurseId), updateData);
    } else {
        const idx = mockDB.nurses.findIndex(n => n.id === nurseId);
        if (idx !== -1) mockDB.nurses[idx] = { ...mockDB.nurses[idx], ...updateData };
    }
};

export const assignNextAvailableNurse = async (specialty) => {
    if (isFirebaseConfigured) {
        const q = query(
            collection(realDb, 'nurses'),
            where('specialization', '==', (specialty || '').toLowerCase()),
            orderBy('currentWorkload', 'asc'),
            limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            const d = snap.docs[0];
            return { id: d.id, ...d.data(), specialty: d.data().specialization };
        }
        return { id: 'N_GENERIC', name: 'Assigned Nurse' };
    }
    const candidates = mockDB.nurses.filter(n =>
        (n.specialty || n.specialization || '').toLowerCase() === (specialty || '').toLowerCase()
    );
    const pool = candidates.length > 0 ? candidates : mockDB.nurses;
    let best = pool[0];
    let minLoad = Infinity;
    pool.forEach(n => {
        const load = mockDB.patients.filter(p => p.assignedNurseId === n.id).length;
        if (load < minLoad) { minLoad = load; best = n; }
    });
    return best;
};

// ------------------------------------------------------------------ //
// DOCTOR SERVICES                                                      //
// ------------------------------------------------------------------ //
export const getDoctors = async () => {
    if (isFirebaseConfigured) {
        const snap = await getDocs(collection(realDb, 'doctors'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return mockDB.doctors;
};

export const subscribeToDoctorPatients = (doctorId, callback) => {
    if (isFirebaseConfigured) {
        const q = query(
            collection(realDb, 'patients'), 
            where('assignedDoctorId', '==', doctorId),
            where('status', 'in', ['Admitted', 'Waiting'])
        );
        return onSnapshot(q, snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }
    callback(mockDB.patients.filter(p => p.assignedDoctorId === doctorId || p.assignedDoctor === doctorId));
    return () => {};
};

export const subscribeToBookedSlots = (doctorId, callback) => {
    if (isFirebaseConfigured) {
        const q = query(collection(realDb, 'consultation_schedule'), where('doctorId', '==', doctorId));
        return onSnapshot(q, snap => {
            callback(snap.docs.map(d => d.data().slot));
        });
    }
    const booked = (mockDB.consultations || []).filter(c => c.doctorId === doctorId).map(c => c.slot);
    callback(booked);
    return () => {};
};

export const addConsultationSchedule = async (patientId, doctorId, slot, notes = '') => {
    if (isFirebaseConfigured) {
        // Double-booking check
        const q = query(
            collection(realDb, 'consultation_schedule'), 
            where('doctorId', '==', doctorId),
            where('slot', '==', slot)
        );
        const snap = await getDocs(q);
        if (!snap.empty) throw new Error("This slot is already booked for this doctor.");

        await addDoc(collection(realDb, 'consultation_schedule'), {
            patientId,
            doctorId,
            slot,
            notes,
            status: 'scheduled',
            timestamp: serverTimestamp()
        });

        // Also update patient record to link consultation
        await updateDoc(doc(realDb, 'patients', patientId), {
            scheduledConsultation: slot,
            assignedDoctorId: doctorId,
            status: 'Waiting'
        });

        return true;
    }

    // Mock implementation
    if (!mockDB.consultations) mockDB.consultations = [];
    const exists = mockDB.consultations.find(c => c.doctorId === doctorId && c.slot === slot);
    if (exists) throw new Error("This slot is already booked.");

    mockDB.consultations.push({ patientId, doctorId, slot, notes });
    const pIdx = mockDB.patients.findIndex(p => p.id === patientId);
    if (pIdx !== -1) {
        mockDB.patients[pIdx].scheduledConsultation = slot;
        mockDB.patients[pIdx].assignedDoctorId = doctorId;
        mockDB.patients[pIdx].status = 'Waiting';
    }
    return true;
};

export const subscribeToNursePatients = (nurseId, callback) => {
    if (isFirebaseConfigured) {
        const q = query(
            collection(realDb, 'patients'), 
            where('assignedNurseId', '==', nurseId),
            where('status', 'in', ['Admitted', 'Waiting'])
        );
        return onSnapshot(q, snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }
    callback(mockDB.patients.filter(p => p.assignedNurseId === nurseId && p.status !== 'Discharged'));
    return () => {};
};

export const subscribeToWardPatients = (ward, callback) => {
    if (isFirebaseConfigured) {
        const q = query(
            collection(realDb, 'patients'), 
            where('assignedWard', '==', ward),
            where('status', 'in', ['Admitted', 'Waiting'])
        );
        return onSnapshot(q, snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }
    callback(mockDB.patients.filter(p => p.assignedWard === ward && p.status !== 'Discharged'));
    return () => {};
};

export const subscribeToAllPatients = (callback) => {
    if (isFirebaseConfigured) {
        const q = query(collection(realDb, 'patients'), where('status', 'in', ['Admitted', 'Waiting']));
        return onSnapshot(q, snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }
    callback([...mockDB.patients].filter(p => p.status !== 'Discharged'));
    return () => {};
};

// ------------------------------------------------------------------ //
// ALERT SERVICES                                                       //
// ------------------------------------------------------------------ //
export const subscribeToAlerts = (callback) => {
    if (isFirebaseConfigured) {
        const q = query(collection(realDb, 'alerts'), orderBy('timestamp', 'desc'));
        return onSnapshot(q, snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }
    callback(mockDB.alerts || []);
    return () => {};
};

export const createAlert = async (alertData) => {
    const entry = {
        ...alertData,
        timestamp: new Date().toISOString(),
        status: 'active'
    };
    if (isFirebaseConfigured) {
        await addDoc(collection(realDb, 'alerts'), { ...entry, serverTimestamp: serverTimestamp() });
    } else {
        if (!mockDB.alerts) mockDB.alerts = [];
        mockDB.alerts.unshift({ id: 'ALT' + Math.random(), ...entry });
    }
};

export const deleteAlert = async (alertId) => {
    if (isFirebaseConfigured) {
        try {
            // Check if it's a doc path or just ID
            await updateDoc(doc(realDb, 'alerts', alertId), { status: 'resolved' });
        } catch (e) {
            console.error('Failed to resolve alert:', e);
        }
    } else {
        const idx = (mockDB.alerts || []).findIndex(a => a.id === alertId);
        if (idx !== -1) mockDB.alerts[idx].status = 'resolved';
    }
};

// ------------------------------------------------------------------ //
// INVENTORY SERVICES                                                   //
// ------------------------------------------------------------------ //
export const subscribeToInventory = (callback) => {
    const colName = isFirebaseConfigured ? 'hospital_inventory' : 'inventory';
    if (isFirebaseConfigured) {
        return onSnapshot(collection(realDb, colName), snap => {
            const items = snap.docs.map(d => {
                const data = d.data();
                return {
                    id:           d.id,
                    ...data,
                    name:         data.name         || data.itemName        || 'Unnamed Item',
                    dailyUsage:   data.dailyUsage   || data.usageRatePerDay || 0,
                    minThreshold: data.minThreshold || 50,
                    unit:         data.unit         || 'units'
                };
            });
            callback(items);
        });
    }
    callback(mockDB.inventory);
    return () => {};
};

export const updateInventoryStock = async (itemId, amount, isDirect = false) => {
    if (isFirebaseConfigured) {
        const itemRef = doc(realDb, 'hospital_inventory', itemId);
        if (isDirect) {
            await updateDoc(itemRef, { stock: amount });
        } else {
            await updateDoc(itemRef, { stock: increment(amount) });
        }
    } else {
        const idx = mockDB.inventory.findIndex(i => i.id === itemId);
        if (idx !== -1) {
            if (isDirect) mockDB.inventory[idx].stock = Math.max(0, amount);
            else          mockDB.inventory[idx].stock = Math.max(0, mockDB.inventory[idx].stock + amount);
        }
    }
    await logAction('UPDATE_INVENTORY', { itemId, amount, isDirect });
};

// ------------------------------------------------------------------ //
// WARD & AUDIT SERVICES                                               //
// ------------------------------------------------------------------ //
export const getWards = async () => {
    if (isFirebaseConfigured) {
        const snap = await getDocs(collection(realDb, 'wards'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return mockDB.wards;
};

export const logAction = async (action, details) => {
    const entry = {
        action,
        details,
        timestamp: new Date().toISOString(),
        userId:    currentMockUser?.uid || 'system'
    };
    if (isFirebaseConfigured) {
        try {
            await addDoc(collection(realDb, 'audit_logs'), { ...entry, serverTimestamp: serverTimestamp() });
        } catch (e) {
            console.error('Audit log write failed:', e);
        }
    } else {
        mockDB.audit_logs.push(entry);
    }
};

// ------------------------------------------------------------------ //
// REAL-TIME SUBSCRIPTION HELPERS (used by older nurse dashboard code) //
// ------------------------------------------------------------------ //
export const subscribeToPatients = (specialty, callback) => {
    if (isFirebaseConfigured) {
        const q = query(collection(realDb, 'patients'), where('requiredSpecialty', '==', specialty));
        return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }
    callback(mockDB.patients.filter(p => (p.requiredSpecialty || '').toLowerCase() === (specialty || '').toLowerCase()));
    return () => {};
};
