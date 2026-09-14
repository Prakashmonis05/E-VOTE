import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'E-Vote | Modern Digital Voting Platform',
  description: 'Secure, transparent, and seamless online e-voting system powered by Next.js and Node.js.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} E-Vote Digital System. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
