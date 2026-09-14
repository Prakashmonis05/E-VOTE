'use client';

import Link from 'next/link';
import { Vote, ShieldCheck, ArrowRight, BarChart3, Lock, Award } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-16 py-6">
      {/* Hero Section */}
      <div className="relative rounded-3xl p-8 sm:p-12 overflow-hidden glass-panel border border-indigo-500/20 text-center space-y-8">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Encrypted & Transparent E-Voting</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight">
          Next-Generation <span className="gradient-text">Democracy</span> & Election Platform
        </h1>

        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto font-light">
          Cast your vote securely from anywhere. Fast, verifiable, and instant real-time tallying.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-2"
          >
            <Vote className="w-5 h-5" />
            <span>Voter Portal</span>
            <ArrowRight className="w-5 h-5 ml-1" />
          </Link>
          <Link
            href="/admin/login"
            className="px-8 py-4 rounded-xl font-bold bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-2"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Admin Portal</span>
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-800 hover:border-indigo-500/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Cryptographic Security</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Every ballot is authenticated with JWT tokens and stored securely with full data integrity checks.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-800 hover:border-indigo-500/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Real-Time Tallying</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Watch election outcomes update live with detailed breakdown charts, turnout analytics, and winner detection.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-800 hover:border-indigo-500/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Flexible Election Config</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Set custom positions, position candidate limits (`max_vote`), priority order, and unique voter access codes.
          </p>
        </div>
      </div>
    </div>
  );
}
