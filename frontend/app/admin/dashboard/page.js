'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Vote, Users, CheckSquare, FileText, ArrowRight, Activity, Plus } from 'lucide-react';
import { fetchApi, getStoredUser } from '@/lib/api';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [recentElections, setRecentElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    const roleLower = stored?.role?.toLowerCase();
    if (!stored || (roleLower !== 'admin' && roleLower !== 'super_admin')) {
      router.push('/admin/login');
      return;
    }
    setUser(stored);
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/admin/stats');
      setStats(data.stats);
      setRecentLogs(data.recentLogs || []);
      setRecentElections(data.recentElections || []);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Administrator Control Center</span>
          </div>
          <h1 className="text-3xl font-black text-white">
            System Overview & Management
          </h1>
          <p className="text-slate-400 text-sm">Logged in as <strong className="text-emerald-400">{user?.username}</strong> ({user?.firstname} {user?.lastname})</p>
        </div>

        <Link
          href="/admin/elections"
          className="px-6 py-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Election</span>
        </Link>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Elections</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-9 w-16 bg-slate-800 animate-pulse rounded-lg my-1" />
          ) : (
            <p className="text-3xl font-black text-white">{stats?.totalElections ?? 0}</p>
          )}
          <p className="text-xs text-emerald-400 font-semibold">{loading ? '...' : (stats?.activeElections ?? 0)} Currently Active</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Registered Voters</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-9 w-16 bg-slate-800 animate-pulse rounded-lg my-1" />
          ) : (
            <p className="text-3xl font-black text-white">{stats?.totalVoters ?? 0}</p>
          )}
          <p className="text-xs text-slate-400 font-medium">System Voters</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Candidates</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Vote className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-9 w-16 bg-slate-800 animate-pulse rounded-lg my-1" />
          ) : (
            <p className="text-3xl font-black text-white">{stats?.totalCandidates ?? 0}</p>
          )}
          <p className="text-xs text-slate-400 font-medium">Across All Elections</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Votes Cast</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-9 w-16 bg-slate-800 animate-pulse rounded-lg my-1" />
          ) : (
            <p className="text-3xl font-black text-white">{stats?.totalVotes ?? 0}</p>
          )}
          <p className="text-xs text-slate-400 font-medium">Recorded Ballots</p>
        </div>
      </div>

      {/* Main Grid: Recent Elections & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Elections */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-indigo-400" />
              <span>Recent Elections</span>
            </h3>
            <Link href="/admin/elections" className="text-xs text-indigo-400 hover:underline font-semibold flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentElections.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No elections found.</p>
            ) : (
              recentElections.map((e) => (
                <div key={e.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{e.title}</h4>
                    <p className="text-xs text-slate-400">Code: <span className="font-mono text-indigo-300">{e.accessCode}</span> • Status: <span className="uppercase text-emerald-400 font-bold text-[10px]">{e.status}</span></p>
                  </div>
                  <Link
                    href={`/admin/elections/${e.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    Manage
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Logs */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span>Audit Activity Logs</span>
            </h3>
            <Link href="/admin/logs" className="text-xs text-emerald-400 hover:underline font-semibold flex items-center space-x-1">
              <span>View All Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No recent audit logs.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-200 uppercase bg-slate-800 px-2 py-0.5 rounded text-[10px] mr-2">
                      {log.action}
                    </span>
                    <span className="text-slate-300 font-medium">{log.target || 'N/A'}</span>
                  </div>
                  <span className="text-slate-500">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
