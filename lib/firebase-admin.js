import admin from 'firebase-admin';

// Singleton initialization pattern for Cloud Run performance
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY 
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
      : undefined;

    if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('Firebase Admin initialized successfully (Singleton)');
    } else {
      console.warn('Firebase Admin credentials missing. Running in mock mode.');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error.stack);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : { 
  collection: () => ({
    where: () => ({ get: async () => ({ empty: true, docs: [] }) }),
    add: async () => ({ id: 'mock_' + Math.random() }),
    doc: () => ({ update: async () => {}, get: async () => ({ exists: false }) })
  }),
  _isMock: true 
};

/**
 * Server-side Patient Services using Admin SDK
 */
export const savePatientRecordAdmin = async (patientData, existingPatientId = null) => {
  if (adminDb._isMock) return 'mock_p_' + Date.now();
  
  const patientsRef = adminDb.collection('patients');
  if (existingPatientId) {
    const patientDoc = patientsRef.doc(existingPatientId);
    await patientDoc.update(patientData);
    await patientDoc.collection('consultations').add({
      ...patientData,
      historyTimestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return existingPatientId;
  } else {
    const docRef = await patientsRef.add(patientData);
    return docRef.id;
  }
};

export const getDoctorsAdmin = async () => {
  if (adminDb._isMock) return [];
  const snap = await adminDb.collection('doctors').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const assignNextAvailableNurseAdmin = async (specialty) => {
  if (adminDb._isMock) return { id: 'mock_n001', name: 'Mock Nurse' };
  const nursesRef = adminDb.collection('nurses');
  const snap = await nursesRef.where('specialization', '==', (specialty || '').toLowerCase()).get();
  
  if (!snap.empty) {
    const nurses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    nurses.sort((a, b) => (a.currentWorkload || 0) - (b.currentWorkload || 0));
    const best = nurses[0];
    return { id: best.id, ...best, specialty: best.specialization };
  }
  return { id: 'N_GENERIC', name: 'Assigned Nurse' };
};

export const assignNextAvailableDoctorAdmin = async (specialty) => {
  if (adminDb._isMock) return { id: 'mock_d001', name: 'Mock Doctor' };
  const doctorsRef = adminDb.collection('doctors');
  const snap = await doctorsRef.where('specialization', '==', (specialty || '').toLowerCase()).get();

  if (!snap.empty) {
    const doctors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    doctors.sort((a, b) => (a.assignedPatientsCount || 0) - (b.assignedPatientsCount || 0));
    const best = doctors[0];
    return { id: best.id, ...best, specialty: best.specialization };
  }
  return { id: 'D001', name: 'Dr. Default (Admin Fallback)' };
};

/**
 * Verify Session Cookie and return User Data (used in Server Components)
 */
export const verifySessionAdmin = async (sessionCookie) => {
  if (!sessionCookie || adminDb._isMock) return null;
  
  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const email = decodedToken.email;

    // Fetch role
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    let roleData = {
      role: 'registration_staff',
      linkedId: null,
      department: 'General',
      name: email.split('@')[0]
    };

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      const extractId = (val) => {
        if (typeof val === 'string') return val;
        if (val && typeof val === 'object' && val.id) return val.id;
        if (val && typeof val === 'object' && val._path) return val._path.segments.pop(); 
        return val;
      };

      roleData.role = extractId(data.role) || 'registration_staff';
      roleData.linkedId = extractId(data.linkedId) || (roleData.role === 'nurse' ? 'N001' : roleData.role === 'doctor' ? 'D001' : null);
      roleData.department = data.department || 'General';
      roleData.name = data.name || email.split('@')[0];
    } else {
      roleData.role = email.includes('manager') ? 'manager'
        : email.includes('nurse') ? 'nurse'
          : email.includes('doctor') ? 'doctor'
            : 'registration_staff';
      roleData.linkedId = roleData.role === 'nurse' ? 'N001' : roleData.role === 'doctor' ? 'D001' : null;
    }

    return {
      uid: decodedToken.uid,
      email: email,
      ...roleData
    };
  } catch (error) {
    console.error('Session verify error:', error);
    return null;
  }
};

export default admin;
