import { AppShell } from '../components/AppShell';
import './globals.css';

export const metadata = {
  title: 'CareFlow AI+',
  description: 'Healthcare Coordination System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
