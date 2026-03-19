import './globals.css';

export const metadata = {
  title: 'Athlete Edge — Train Smarter. Gain the Edge.',
  description: 'Sports platform for high school basketball players and coaches',
  verification: {
    google: 'MYQ7cO12Sp5VFP8SwOyh6mptOJZNWhdugKUdCaXmf9A',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#0f0f1a', color: 'white', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
