'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Key, Vote, BarChart2, CheckCircle2, Clock, Calendar, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { fetchApi, getStoredUser } from '@/lib/api';

export default function VoterDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [elections, setElections] = useState([]);
  const [accessCode, setAccessCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMsg, setJoinMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    const roleLower = stored?.role?.toLowerCase();
    if (!stored || roleLower !== 'voter') {
      router.push('/login');
      return;
    }
    setUser(stored);
    loadElections();
  }, [router]);

  const loadElections = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/elections');
      if (data.elections) {
        setElections(data.elections);
      }
    } catch (err) {
      console.error('Failed to load elections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinElection = async (e) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setJoinLoading(true);
    setJoinMsg(null);

    try {
      const res = await fetchApi('/elections/join', {
        method: 'POST',
        body: JSON.stringify({ accessCode: accessCode.trim() })
      });

      setJoinMsg({ text: res.message, isError: false });
      setAccessCode('');
      loadElections();
    } catch (err) {
      setJoinMsg({ text: err.message || 'Failed to enter access code', isError: true });
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
            <Vote className="w-3.5 h-3.5" />
            <span>Voter Workspace</span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, <span className="gradient-text">{user?.firstname} {user?.lastname}</span>
          </h1>
          <p className="text-slate-400 text-sm">Voter Email: <span className="font-mono text-indigo-300 font-bold">{user?.email}</span></p>
        </div>

        {/* Enter Code Box */}
        <form onSubmit={handleJoinElection} className="w-full md:w-auto bg-slate-900/90 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Key className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Access Code or Election ID..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={joinLoading}
            className="w-full sm:w-auto px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-1 disabled:opacity-50"
          >
            {joinLoading ? <span>Verifying...</span> : <span>Join Election</span>}
          </button>
        </form>
      </div>

      {joinMsg && (
        <div className={`p-4 rounded-xl text-sm flex items-center space-x-2 ${
          joinMsg.isError
            ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
        }`}>
          {joinMsg.isError ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span>{joinMsg.text}</span>
        </div>
      )}

      {/* Elections List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <span>Available Elections</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{elections.length}</span>
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse">Loading elections list...</div>
        ) : elections.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-3">
            <Vote className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm">No elections available right now. Enter an access code above to join one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {elections.map((e) => {
              const isResultsUnlocked = e.resultsPublic || e.status === 'COMPLETED';

              return (
                <div key={e.id} className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        e.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        e.status === 'COMPLETED' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {e.status}
                      </span>
                      <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        Code: {e.accessCode}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white">{e.title}</h3>
                      <p className="text-slate-400 text-sm line-clamp-2 mt-1">
                        {e.description || 'Official digital election.'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-slate-400 pt-2">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Starts: {new Date(e.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>Ends: {new Date(e.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    {e.hasVoted ? (
                      <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ballot Submitted</span>
                      </div>
                    ) : e.status === 'ACTIVE' ? (
                      <Link
                        href={`/election/${e.id}/vote`}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2"
                      >
                        <Vote className="w-4 h-4" />
                        <span>Cast Vote</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium italic">
                        {e.status === 'COMPLETED' ? 'Election Closed' : 'Election Pending'}
                      </span>
                    )}

                    {isResultsUnlocked ? (
                      <Link
                        href={`/election/${e.id}/results`}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-colors flex items-center space-x-1.5"
                      >
                        <BarChart2 className="w-4 h-4 text-indigo-400" />
                        <span>Results</span>
                      </Link>
                    ) : (
                      <span
                        title="Results will be published after completion"
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800/80 text-slate-500 flex items-center space-x-1 cursor-not-allowed"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                        <span>Results Locked</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
