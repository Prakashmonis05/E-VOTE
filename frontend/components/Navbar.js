'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Vote, LogOut, User, ShieldCheck, LayoutDashboard, FileText, Users, CheckSquare } from 'lucide-react';
import { getStoredUser, removeAuthToken } from '@/lib/api';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
    router.push('/');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <Link href={user ? (isAdmin ? '/admin/dashboard' : '/dashboard') : '/'} className="flex items-center space-x-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Vote className="w-6 h-6 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                E<span className="gradient-text">-VOTE</span>
              </span>
            </Link>

            {user && (
              <div className="hidden md:flex items-center space-x-1 ml-8">
                {isAdmin ? (
                  <>
                    <Link
                      href="/admin/dashboard"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                        pathname === '/admin/dashboard' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Overview</span>
                    </Link>
                    <Link
                      href="/admin/elections"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                        pathname.startsWith('/admin/elections') ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>Elections</span>
                    </Link>
                    <Link
                      href="/admin/voters"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                        pathname === '/admin/voters' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Voters</span>
                    </Link>
                    <Link
                      href="/admin/logs"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                        pathname === '/admin/logs' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Audit Logs</span>
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                      pathname === '/dashboard' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>My Elections</span>
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  {isAdmin ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <User className="w-4 h-4 text-indigo-400" />
                  )}
                  <span className="font-semibold text-white">
                    {user.firstname} {user.lastname}
                  </span>
                  <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold ml-1">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Voter Login
                </Link>
                <Link
                  href="/admin/login"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
                >
                  Admin Portal
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
