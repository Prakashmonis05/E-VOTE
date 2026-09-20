'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Vote, LogOut, User, ShieldCheck, LayoutDashboard, FileText, Users, CheckSquare, Menu, X } from 'lucide-react';
import { getStoredUser, removeAuthToken } from '@/lib/api';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
    setIsMobileMenuOpen(false);
    router.push('/');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const navLinks = isAdmin
    ? [
        { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard, active: pathname === '/admin/dashboard' },
        { href: '/admin/elections', label: 'Elections', icon: CheckSquare, active: pathname.startsWith('/admin/elections') },
        { href: '/admin/voters', label: 'Voters', icon: Users, active: pathname === '/admin/voters' },
        { href: '/admin/logs', label: 'Audit Logs', icon: FileText, active: pathname === '/admin/logs' },
      ]
    : [
        { href: '/dashboard', label: 'My Elections', icon: LayoutDashboard, active: pathname === '/dashboard' },
      ];

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Desktop Nav Links */}
          <div className="flex items-center space-x-3">
            <Link
              href={user ? (isAdmin ? '/admin/dashboard' : '/dashboard') : '/'}
              className="flex items-center space-x-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 group-hover:shadow-indigo-500/40 transition-all duration-300">
                <Vote className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                E<span className="gradient-text">-VOTE</span>
              </span>
            </Link>

            {user && (
              <div className="hidden md:flex items-center space-x-1 ml-6">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 ${
                        item.active
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Header: Profile, Actions & Hamburger */}
          <div className="flex items-center space-x-2 sm:space-x-3" suppressHydrationWarning>
            {user ? (
              <>
                <div className="flex items-center space-x-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
                  {isAdmin ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <User className="w-4 h-4 text-indigo-400 shrink-0" />
                  )}
                  <span className="font-semibold text-white truncate max-w-[110px] sm:max-w-none">
                    {user.firstname} {user.lastname}
                  </span>
                  <span className="hidden sm:inline uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold ml-1">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="hidden sm:flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Voter Login
                </Link>
                <Link
                  href="/admin/login"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/25"
                >
                  Admin Portal
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors md:hidden focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6 text-slate-200" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2 duration-200" suppressHydrationWarning>
          {user ? (
            <>
              <div className="pb-2 mb-2 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Logged in as</p>
                  <p className="text-sm font-bold text-white">{user.firstname} {user.lastname}</p>
                </div>
                <span className="uppercase text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 font-bold">
                  {user.role}
                </span>
              </div>

              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      item.active
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-indigo-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <button
                onClick={handleLogout}
                className="w-full mt-2 flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <div className="space-y-2 pt-1">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-center py-2.5 rounded-xl text-sm font-medium text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800"
              >
                Voter Login
              </Link>
              <Link
                href="/admin/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-center py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25"
              >
                Admin Portal
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
