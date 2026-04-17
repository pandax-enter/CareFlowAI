import { AppShell } from '../components/AppShell';
import './globals.css';
import { cookies } from 'next/headers';
import { verifySessionAdmin } from '@/lib/firebase-admin';

export const metadata = {
  title: 'CareFlow AI+',
  description: 'Healthcare Coordination System',
};

export default async function RootLayout({ children }) {
  // Server-side auth verification to minimize client-side flicker
  const sessionCookie = (await cookies()).get('session')?.value;
  const initialAuth = sessionCookie ? await verifySessionAdmin(sessionCookie) : null;

  return (
    <html lang="en">
      <body>
        <AppShell initialAuth={initialAuth}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
