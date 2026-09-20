import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'E-Vote | Modern Digital Voting Platform',
  description: 'Secure, transparent, and seamless online e-voting system powered by Next.js and Node.js.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white relative">
        <div className="ambient-glow">
          <div className="ambient-blob-1" />
          <div className="ambient-blob-2" />
          <div className="ambient-blob-3" />
        </div>
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-slate-900/80 bg-slate-950/80 backdrop-blur-md py-6 text-center text-xs text-slate-500">
            <p suppressHydrationWarning>© {new Date().getFullYear()} E-Vote Digital System. All rights reserved.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
