'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Vote, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle, Check } from 'lucide-react';
import { fetchApi, getStoredUser } from '@/lib/api';

export default function VotePage({ params }) {
  const resolvedParams = use(params);
  const electionId = parseInt(resolvedParams.id, 10);
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [election, setElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [selections, setSelections] = useState({});
  const [receiptToken, setReceiptToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    const roleLower = stored?.role?.toLowerCase();
    if (!stored || roleLower !== 'voter') {
      router.push('/login');
      return;
    }
    setUser(stored);
    loadBallot();
  }, [electionId, router]);

  const loadBallot = async () => {
    try {
      setLoading(true);
      const data = await fetchApi(`/votes/ballot/${electionId}`);
      if (data.election) {
        setElection(data.election);
        setPositions(data.positions || []);
        setHasVoted(data.hasVoted || false);
        if (data.receiptToken) {
          setReceiptToken(data.receiptToken);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load ballot details');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (positionId, candidateId, maxVote) => {
    setSelections((prev) => {
      const current = prev[positionId] || [];
      if (maxVote === 1) {
        return { ...prev, [positionId]: [candidateId] };
      } else {
        if (current.includes(candidateId)) {
          return { ...prev, [positionId]: current.filter((id) => id !== candidateId) };
        } else {
          if (current.length >= maxVote) {
            return prev;
          }
          return { ...prev, [positionId]: [...current, candidateId] };
        }
      }
    });
  };

  const handleSubmitVotes = async () => {
    setError('');
    setSubmitting(true);

    try {
      const votesPayload = {};
      Object.entries(selections).forEach(([posIdStr, candIds]) => {
        const posId = parseInt(posIdStr, 10);
        if (candIds.length > 0) {
          const pos = positions.find((p) => p.id === posId);
          votesPayload[posId] = pos?.maxVote === 1 ? candIds[0] : candIds;
        }
      });

      const res = await fetchApi('/votes/submit', {
        method: 'POST',
        body: JSON.stringify({ electionId, votes: votesPayload })
      });

      setSuccess(res.message);
      if (res.receiptToken) {
        setReceiptToken(res.receiptToken);
      }
      setHasVoted(true);
      setShowConfirmModal(false);
    } catch (err) {
      setError(err.message || 'Failed to submit ballot');
    } finally {
      setSubmitting(false);
    }
  };

  const totalSelectionsCount = Object.values(selections).reduce((acc, curr) => acc + curr.length, 0);

  if (loading) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Loading official election ballot...</p>
      </div>
    );
  }

  if (hasVoted || success) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-2xl shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white">Ballot Submitted!</h2>
          <p className="text-slate-400 text-sm">
            {success || 'You have successfully cast your vote in this election. Thank you for participating!'}
          </p>
          {receiptToken && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl max-w-sm mx-auto mt-4 text-xs">
              <span className="text-slate-400 block mb-1 font-medium">Anonymous Receipt Token:</span>
              <code className="text-indigo-400 font-mono select-all font-bold">{receiptToken}</code>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center space-x-4 pt-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl font-semibold bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200"
          >
            Return to Dashboard
          </Link>
          <Link
            href={`/election/${electionId}/results`}
            className="px-6 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
          >
            View Election Results
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="space-y-4">
        <Link href="/dashboard" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-wider">
              Official Active Ballot
            </span>
            <span className="text-xs text-slate-400 flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>{election?.type === 'PRIVATE' ? 'Private Verified Ballot' : 'Public Ballot'}</span>
            </span>
          </div>
          <h1 className="text-3xl font-black text-white">{election?.title}</h1>
          <p className="text-slate-400 text-sm">{election?.description || 'Select your preferred candidates for each position below.'}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-8">
        {positions.map((pos) => {
          const selectedForPos = selections[pos.id] || [];
          return (
            <div key={pos.id} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white">{pos.description}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {pos.maxVote === 1 ? 'Select 1 candidate' : `Select up to ${pos.maxVote} candidates`}
                  </p>
                </div>
                <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-300">
                  Chosen: {selectedForPos.length} / {pos.maxVote}
                </div>
              </div>

              {pos.candidates.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs italic">
                  No candidates registered for this position yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pos.candidates.map((cand) => {
                    const isSelected = selectedForPos.includes(cand.id);
                    const initials = `${cand.firstname?.[0] || 'C'}${cand.lastname?.[0] || ''}`.toUpperCase();
                    return (
                      <div
                        key={cand.id}
                        onClick={() => handleSelectCandidate(pos.id, cand.id, pos.maxVote)}
                        className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex items-start space-x-3.5 relative group ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/20'
                            : 'glass-card border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-${pos.maxVote === 1 ? 'full' : 'md'} border flex items-center justify-center shrink-0 mt-1 transition-all ${
                          isSelected ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-500/50' : 'border-slate-700 bg-slate-950/80'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-950 to-slate-900 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
                          {initials}
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <h4 className={`font-bold text-base transition-colors ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                            {cand.firstname} {cand.lastname}
                          </h4>
                          {cand.platform ? (
                            <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">
                              {cand.platform}
                            </p>
                          ) : (
                            <p className="text-slate-500 text-xs italic">
                              No platform statement provided
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-4 z-40 glass-panel p-4 sm:p-5 rounded-2xl border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl bg-slate-950/95 backdrop-blur-xl">
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Vote className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Selections Made</p>
            <p className="text-base font-bold text-white">
              {totalSelectionsCount} {totalSelectionsCount === 1 ? 'Candidate' : 'Candidates'} Selected
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowConfirmModal(true)}
          disabled={totalSelectionsCount === 0}
          className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
        >
          <Vote className="w-4 h-4" />
          <span>Review & Submit Official Ballot</span>
        </button>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-3xl border border-indigo-500/30 max-w-md w-full space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white">Confirm Ballot Submission</h3>
              <p className="text-slate-400 text-xs">
                Are you sure you want to cast your official vote? Your vote choice is 100% anonymous.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <p className="font-semibold text-slate-300">Selected Choices Summary:</p>
              <ul className="space-y-1 text-slate-400 max-h-40 overflow-y-auto pr-1">
                {positions.map((p) => {
                  const selIds = selections[p.id] || [];
                  const cands = p.candidates.filter((c) => selIds.includes(c.id));
                  if (cands.length === 0) return null;
                  return (
                    <li key={p.id} className="flex justify-between py-1 border-b border-slate-800/50">
                      <span className="font-medium text-slate-300">{p.description}:</span>
                      <span className="text-indigo-300 font-semibold">{cands.map((c) => `${c.firstname} ${c.lastname}`).join(', ')}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-1/2 py-3 rounded-xl font-semibold bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-sm"
              >
                Go Back
              </button>
              <button
                onClick={handleSubmitVotes}
                disabled={submitting}
                className="w-1/2 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white text-sm shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Confirm Vote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
