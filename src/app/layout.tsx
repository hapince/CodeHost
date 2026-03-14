import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'CodeHost - Code Hosting & Collaboration Platform | Hapince Technology',
  description: 'A minimalist code hosting platform by Hapince Technology, designed for teams that value clarity, precision, and real-time collaboration.',
  keywords: ['code hosting', 'collaboration', 'version control', 'Hapince Technology', 'Wuhan', 'CodeHost'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
