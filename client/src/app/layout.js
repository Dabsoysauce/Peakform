import './globals.css';
import { Inter, Rajdhani } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-rajdhani' });

export const metadata = {
  title: 'Athlete Edge — Train Smarter. Gain the Edge.',
  description: 'Sports platform for high school basketball players and coaches',
  verification: {
    google: 'MYQ7cO12Sp5VFP8SwOyh6mptOJZNWhdugKUdCaXmf9A',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${rajdhani.variable}`}>
      <body style={{ backgroundColor: '#0f0f1a', color: 'white', minHeight: '100vh', fontFamily: 'var(--font-inter)' }}>
        {children}
      </body>
    </html>
  );
}
