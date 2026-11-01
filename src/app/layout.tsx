import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';

export const metadata: Metadata = {
  title: 'LostLink 2.0 — Smart Multi-College Lost & Found Platform',
  description:
    'LostLink 2.0 is an enterprise multi-college lost and found platform providing deterministic rule-based matching, zero-knowledge ownership verification, and secure campus custodian custody handovers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-brandTeal-600 selection:text-white">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

