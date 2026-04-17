import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'ID Token is required' }, { status: 400 });
    }

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const email = decodedToken.email;

    // Fetch user role data from Firestore (on the server = faster)
    let roleData = {
      role: 'registration_staff',
      linkedId: null,
      department: 'General',
      name: email.split('@')[0]
    };

    try {
      const usersRef = adminDb.collection('users');
      const snapshot = await usersRef.where('email', '==', email).get();

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
        // Fallback role derivation logic matching AuthContext.js
        roleData.role = email.includes('manager') ? 'manager'
          : email.includes('nurse') ? 'nurse'
            : email.includes('doctor') ? 'doctor'
              : 'registration_staff';
        roleData.linkedId = roleData.role === 'nurse' ? 'N001' : roleData.role === 'doctor' ? 'D001' : null;
      }
    } catch (dbError) {
      console.error('Firestore role fetch error:', dbError);
      // Continue with default roleData
    }

    // Create the session cookie (expires in 5 days)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // Set the cookie
    (await cookies()).set('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return NextResponse.json({ 
      status: 'success', 
      user: {
        uid: decodedToken.uid,
        email: email,
        ...roleData
      }
    });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
