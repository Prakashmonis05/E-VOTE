'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Key, Vote, BarChart2, CheckCircle2, Clock, Calendar, AlertCircle, ArrowRight, Lock, X } from 'lucide-react';
import { fetchApi, getStoredUser } from '@/lib/api';

export default function VoterDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [elections, setElections] = useState([]);
  const [accessCode, setAccessCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMsg, setJoinMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  // Card-specific access code modal state
  const [selectedElectionForCode, setSelectedElectionForCode] = useState(null);
  const [cardCodeInput, setCardCodeInput] = useState('');
  const [cardCodeLoading, setCardCodeLoading] = useState(false);
  const [cardCodeError, setCardCodeError] = useState('');

  const handleCardJoin = async (e) => {
    e.preventDefault();
    if (!cardCodeInput.trim() || !selectedElectionForCode) return;
    setCardCodeLoading(true);
    setCardCodeError('');
    try {
      const res = await fetchApi('/elections/join', {
        method: 'POST',
        body: JSON.stringify({ accessCode: cardCodeInput.trim(), electionId: selectedElectionForCode.id })
      });
      setJoinMsg({ text: res.message, isError: false });
      setSelectedElectionForCode(null);
      setCardCodeInput('');
      loadElections();
    } catch (err) {
      setCardCodeError(err.message || 'Invalid access code');
    } finally {
      setCardCodeLoading(false);
    }
  };

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
      if (elections.length === 0) setLoading(true);
      const data = await fetchApi('/elections', { priority: 'high' });
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
          <h1 className="text-3xl font-bold text-white" suppressHydrationWarning>
            Welcome back, <span className="gradient-text">{user?.firstname} {user?.lastname}</span>
          </h1>
          <p className="text-slate-400 text-sm" suppressHydrationWarning>Voter Email: <span className="font-mono text-indigo-300 font-bold">{user?.email}</span></p>
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

        {loading && elections.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-20 bg-slate-800 rounded-full" />
                  <div className="h-5 w-28 bg-slate-800 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-6 w-3/4 bg-slate-800 rounded-lg" />
                  <div className="h-4 w-full bg-slate-800/60 rounded-lg" />
                  <div className="h-4 w-2/3 bg-slate-800/40 rounded-lg" />
                </div>
                <div className="flex gap-4 pt-2">
                  <div className="h-3 w-28 bg-slate-800/60 rounded" />
                  <div className="h-3 w-28 bg-slate-800/60 rounded" />
                </div>
                <div className="pt-4 border-t border-slate-800/80 flex justify-between">
                  <div className="h-9 w-28 bg-slate-800 rounded-xl" />
                  <div className="h-9 w-24 bg-slate-800/60 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : elections.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 space-y-3">
            <Vote className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm">No elections available right now. Enter an access code above to join one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {elections.map((e) => {
              const isResultsUnlocked = e.resultsPublic || e.status === 'COMPLETED' || e.status === 'completed';
              const isPublic = e.type === 'PUBLIC';
              const canAccess = isPublic || e.hasAccess || e.accessStatus === 'APPROVED';

              return (
                <div key={e.id} className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        e.status === 'ACTIVE' || e.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        e.status === 'COMPLETED' || e.status === 'completed' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {e.status}
                      </span>
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${
                        isPublic
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      }`}>
                        {isPublic ? '🌐 Public Election' : '🔒 Private Election'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white">{e.title}</h3>
                      <p className="text-slate-400 text-sm line-clamp-2 mt-1">
                        {e.description || 'Official digital election.'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-slate-400 pt-2">
                      <div className="flex items-center space-x-1" suppressHydrationWarning>
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Starts: {new Date(e.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1" suppressHydrationWarning>
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>Ends: {new Date(e.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {e.hasVoted ? (
                      <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ballot Submitted</span>
                      </div>
                    ) : canAccess ? (
                      (e.status === 'ACTIVE' || e.status === 'active') ? (
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
                          {(e.status === 'COMPLETED' || e.status === 'completed') ? 'Election Closed' : 'Election Pending'}
                        </span>
                      )
                    ) : e.accessStatus === 'PENDING' ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-xl font-medium">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>Waiting for approval</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedElectionForCode(e);
                            setCardCodeInput('');
                            setCardCodeError('');
                          }}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all flex items-center space-x-1.5"
                          title="Have an access code? Unlock directly"
                        >
                          <Key className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Enter Code</span>
                        </button>
                      </div>
                    ) : e.accessStatus === 'DECLINED' ? (
                      <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-2 rounded-xl font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Access declined</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedElectionForCode(e);
                          setCardCodeInput('');
                          setCardCodeError('');
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all flex items-center justify-center space-x-2 shadow-sm shadow-indigo-600/10"
                      >
                        <Key className="w-4 h-4 text-indigo-400" />
                        <span>Unlock with Access Code</span>
                      </button>
                    )}

                    {canAccess && (
                      isResultsUnlocked ? (
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
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Enter Access Code for Specific Election */}
      {selectedElectionForCode && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/30 max-w-md w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedElectionForCode(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
                <Key className="w-3.5 h-3.5" />
                <span>Private Election Access</span>
              </div>
              <h3 className="text-2xl font-bold text-white">Unlock Election</h3>
              <p className="text-slate-400 text-xs">
                Enter the secret access code for <strong className="text-indigo-300">&quot;{selectedElectionForCode.title}&quot;</strong> to gain voting access.
              </p>
            </div>

            {cardCodeError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cardCodeError}</span>
              </div>
            )}

            <form onSubmit={handleCardJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Access Code</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={cardCodeInput}
                    onChange={(e) => setCardCodeInput(e.target.value)}
                    placeholder="e.g. SAMCA or CODE-1234"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-white font-mono uppercase focus:outline-none text-sm placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedElectionForCode(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cardCodeLoading || !cardCodeInput.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 flex items-center space-x-2"
                >
                  {cardCodeLoading ? <span>Verifying...</span> : <span>Unlock & Join</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
