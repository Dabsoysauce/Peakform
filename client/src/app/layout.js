import './globals.css';

export const metadata = {
  title: 'PeakForm — Train Smarter. Peak Harder.',
  description: 'Fitness tracking platform for gym athletes and personal trainers',
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
