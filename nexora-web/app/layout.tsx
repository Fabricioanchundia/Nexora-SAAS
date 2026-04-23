import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexora — Facturación Electrónica',
  description: 'Sistema de facturación electrónica para Ecuador',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}