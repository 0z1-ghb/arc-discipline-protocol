import type { Metadata } from 'next';
import { GeistSans, GeistMono } from 'geist/font';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arc Discipline Protocol',
  description: 'On-chain discipline tracker built on Arc Network.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
