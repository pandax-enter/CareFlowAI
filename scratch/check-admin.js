import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
// Import after dotenv config in ES modules requires dynamic import if not handled elsewhere
const { adminAuth } = await import('../lib/firebase-admin.js');

console.log('Firebase Admin check...');
try {
    console.log('Admin Auth object initialized:', !!adminAuth);
} catch (e) {
    console.error('Initialization failed:', e.message);
    process.exit(1);
}
console.log('Check passed!');
