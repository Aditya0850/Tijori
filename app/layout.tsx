import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tijori - Freelance Deal Escrow',
  description: 'Secure escrow platform with Panchayat AI dispute resolution',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}