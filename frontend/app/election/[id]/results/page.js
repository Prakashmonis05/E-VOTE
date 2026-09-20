'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, ArrowLeft, Trophy, Users, Percent, Award, CheckCircle2, Lock } from 'lucide-react';
import { fetchApi, getStoredUser } from '@/lib/api';

export default function ElectionResultsPage({ params }) {
  const resolvedParams = use(params);
  const electionId = parseInt(resolvedParams.id, 10);
  const router = useRouter();

  const [election, setElection] = useState(null);
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);
  const [resultsLocked, setResultsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadResults();
  }, [electionId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await fetchApi(`/votes/results/${electionId}`);
      setElection(data.election);
      setStats(data.stats);
      setResults(data.results || []);
      setResultsLocked(!!data.resultsLocked);
    } catch (err) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Tallying election results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-8">
        <Link href="/dashboard" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="glass-panel p-8 rounded-3xl border border-amber-500/20 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Results Currently Locked</h2>
          <p className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
            {error}
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400">
              <span>Mode: Publish After Completion</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back button & Title */}
      <div className="space-y-4">
        <Link href="/dashboard" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
              election?.status === 'ACTIVE' || election?.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
              'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
            }`}>
              {election?.status} Election Results
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase border ${
              election?.type === 'PRIVATE' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {election?.type === 'PRIVATE' ? '🔒 Private' : '🌐 Public'}
            </span>
          </div>

          <h1 className="text-3xl font-black text-white">{election?.title}</h1>
          <p className="text-slate-400 text-sm">{election?.description || 'Official vote counts and candidate standings.'}</p>
        </div>
      </div>

      {/* Turnout Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 flex items-center space-x-4 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Votes Cast</p>
            <p className="text-2xl font-black text-white">{stats?.voterTurnout || 0}</p>
          </div>
        </div>

        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 flex items-center space-x-4 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Eligible Voters</p>
            <p className="text-2xl font-black text-white">{stats?.eligibleVoters || 0}</p>
          </div>
        </div>

        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 flex items-center space-x-4 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Turnout Rate</p>
            <p className="text-2xl font-black text-emerald-400">{stats?.turnoutPercentage || 0}%</p>
          </div>
        </div>
      </div>

      {/* Position Results / Hidden notice */}
      {resultsLocked ? (
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-amber-500/30 text-center space-y-4 shadow-2xl bg-amber-500/5">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Results Hidden Until Election Ends</h2>
          <p className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
            Live candidate vote tallies are protected and encrypted. Results will be automatically unlocked and made public once the voting window closes.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400">
              <span>Publish Mode: After Election Closes</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {results.map((pos) => (
            <div key={pos.id} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center space-x-2">
                    <span>{pos.description}</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">Total Ballots Cast for Position: <span className="font-semibold text-indigo-300">{pos.totalPositionVotes}</span></p>
                </div>
                <div className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-indigo-300 self-start sm:self-auto">
                  Max Allowed Votes: {pos.maxVote}
                </div>
              </div>

              {pos.candidates.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm italic">
                  No candidates registered for this position.
                </div>
              ) : (
                <div className="space-y-5">
                  {pos.candidates.map((cand) => {
                    const percentage = pos.totalPositionVotes > 0
                      ? ((cand.voteCount / pos.totalPositionVotes) * 100).toFixed(1)
                      : 0;
                    const isWinner = cand.isWinner && cand.voteCount > 0;
                    const initials = `${cand.firstname?.[0] || 'C'}${cand.lastname?.[0] || ''}`.toUpperCase();

                    return (
                      <div
                        key={cand.id}
                        className={`p-4 rounded-2xl border transition-all duration-200 space-y-3 ${
                          isWinner
                            ? 'bg-amber-500/5 border-amber-500/30 shadow-lg shadow-amber-500/5'
                            : 'glass-card border-slate-800/70'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                              isWinner
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'bg-slate-900 border-slate-800 text-indigo-300'
                            }`}>
                              {initials}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-white text-base">
                                  {cand.firstname} {cand.lastname}
                                </span>
                                {isWinner && (
                                  <span className="inline-flex items-center space-x-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10">
                                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Leading / Winner</span>
                                  </span>
                                )}
                              </div>
                              {cand.platform && (
                                <p className="text-slate-400 text-xs line-clamp-1 mt-0.5 max-w-lg">
                                  {cand.platform}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-baseline space-x-2 self-end sm:self-auto font-mono">
                            <span className="text-xl font-extrabold text-white">{cand.voteCount}</span>
                            <span className="text-xs text-slate-400 font-sans">votes</span>
                            <span className={`text-sm font-bold ${isWinner ? 'text-amber-300' : 'text-indigo-400'}`}>
                              ({percentage}%)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-3.5 bg-slate-900/90 rounded-full overflow-hidden border border-slate-800/90 relative">
                          <div
                            className={`h-full transition-all duration-700 rounded-full ${
                              isWinner
                                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-indigo-500 shadow-md shadow-amber-500/30'
                                : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500'
                            }`}
                            style={{ width: `${Math.max(percentage, 1.5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

