'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext({});

// Role-permission map
const ROLE_ROUTES = {
    registration_staff: ['/'],
    nurse: ['/', '/dashboard', '/inventory', '/patient'],
    doctor: ['/', '/doctor', '/inventory', '/patient'],
    manager: null, // null = all routes
};

// Default redirect after login per role
const ROLE_HOME = {
    registration_staff: '/',
    nurse: '/dashboard',
    doctor: '/doctor',
    manager: '/manager',
};

const canAccess = (role, path) => {
    if (!role) return false;
    const allowed = ROLE_ROUTES[role];
    if (allowed === null) {
        // Manager sees all routes
        return true;
    }
    return allowed.some(p => path === p || path.startsWith(p + '/'));
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [roleData, setRoleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Dynamically import to avoid SSR issues
        let unsubscribe = () => { };

        (async () => {
            try {
                const { getAuth, onAuthStateChanged } = await import('firebase/auth');
                const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');

                // Guard: if Firebase isn't configured (mock mode)
                if (db?._isMock) {
                    setLoading(false);
                    return;
                }

                const firebaseAuth = getAuth();
                unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
                    if (firebaseUser) {
                        setUser(firebaseUser);
                        try {
                            const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
                            const snap = await getDocs(q);

                            let role, linkedId, department, name;

                            if (!snap.empty) {
                                const data = snap.docs[0].data();
                                role = data.role || 'registration_staff';
                                linkedId = data.linkedId || (role === 'nurse' ? 'N001' : role === 'doctor' ? 'D001' : null);
                                department = data.department || 'General';
                                name = data.name || firebaseUser.email.split('@')[0];
                            } else {
                                // Fallback role derivation from email for demo
                                role = firebaseUser.email.includes('manager') ? 'manager'
                                    : firebaseUser.email.includes('nurse') ? 'nurse'
                                        : firebaseUser.email.includes('doctor') ? 'doctor'
                                            : 'registration_staff';
                                linkedId = role === 'nurse' ? 'N001' : role === 'doctor' ? 'D001' : null;
                                department = 'General';
                                name = firebaseUser.email.split('@')[0];
                            }

                            setRoleData({ role, linkedId, department, name });
                        } catch (err) {
                            console.error('Role fetch error:', err);
                            setRoleData({ role: 'registration_staff', linkedId: null, department: 'General', name: 'User' });
                        }
                    } else {
                        setUser(null);
                        setRoleData(null);
                    }
                    setLoading(false);
                });
            } catch (err) {
                console.error('Auth init error:', err);
                setLoading(false);
            }
        })();

        return () => unsubscribe();
    }, []);

    // Route protection
    useEffect(() => {
        if (loading) return;

        // Skip protection for login page itself
        if (pathname === '/login') {
            // If logged in, redirect to their home
            if (roleData) router.push(ROLE_HOME[roleData.role] || '/');
            return;
        }

        if (!user && !roleData) {
            // Not logged in — send to login
            router.push('/login');
            return;
        }

        if (roleData && !canAccess(roleData.role, pathname)) {
            router.push(ROLE_HOME[roleData.role] || '/');
        }
    }, [user, roleData, loading, pathname, router]);

    const logout = async () => {
        try {
            const { getAuth, signOut } = await import('firebase/auth');
            await signOut(getAuth());
        } catch (err) {
            console.error('Logout error:', err);
        }
        setUser(null);
        setRoleData(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, roleData, loading, logout }}>
            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: '1rem', color: '#64748b' }}>
                    Loading CareFlow AI+...
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
