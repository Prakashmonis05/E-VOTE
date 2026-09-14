'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Trash2, ArrowUp, ArrowDown, UserPlus, AlertCircle, ShieldCheck, User, Mail, CheckCircle } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function ElectionDetailAdminPage({ params }) {
  const resolvedParams = use(params);
  const electionId = parseInt(resolvedParams.id, 10);
  const router = useRouter();

  const [election, setElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [preApprovedEmails, setPreApprovedEmails] = useState([]);
  const [newPreEmail, setNewPreEmail] = useState('');
  const [preLoading, setPreLoading] = useState(false);
  const [preMsg, setPreMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Position Modal State
  const [showPosModal, setShowPosModal] = useState(false);
  const [editingPos, setEditingPos] = useState(null);
  const [posDesc, setPosDesc] = useState('');
  const [posMaxVote, setPosMaxVote] = useState(1);
  const [posSaving, setPosSaving] = useState(false);

  // Candidate Modal State
  const [showCandModal, setShowCandModal] = useState(false);
  const [targetPosId, setTargetPosId] = useState(null);
  const [editingCand, setEditingCand] = useState(null);
  const [candFirstname, setCandFirstname] = useState('');
  const [candLastname, setCandLastname] = useState('');
  const [candPlatform, setCandPlatform] = useState('');
  const [candPhoto, setCandPhoto] = useState(null);
  const [candSaving, setCandSaving] = useState(false);

  useEffect(() => {
    loadElectionDetails();
  }, [electionId]);

  const loadElectionDetails = async () => {
    try {
      setLoading(true);
      const [data, votersData] = await Promise.all([
        fetchApi(`/elections/${electionId}`),
        fetchApi('/voters')
      ]);
      setElection(data.election);
      setPositions(data.election?.positions || []);
      const allPre = votersData.preApprovedEmails || [];
      setPreApprovedEmails(allPre.filter((p) => p.electionId === electionId));
    } catch (err) {
      setError(err.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPreApprovedEmail = async (e) => {
    e.preventDefault();
    if (!newPreEmail.trim()) return;

    setPreLoading(true);
    setPreMsg(null);
    try {
      const res = await fetchApi('/voters/preapproved', {
        method: 'POST',
        body: JSON.stringify({ email: newPreEmail.trim(), electionId })
      });
      setPreMsg({ text: res.message, isError: false });
      setNewPreEmail('');
      loadElectionDetails();
    } catch (err) {
      setPreMsg({ text: err.message || 'Failed to add pre-approved email', isError: true });
    } finally {
      setPreLoading(false);
    }
  };

  const handleDeletePreApprovedEmail = async (id) => {
    try {
      await fetchApi(`/voters/preapproved/${id}`, { method: 'DELETE' });
      loadElectionDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  // Position Handlers
  const openAddPosModal = () => {
    setEditingPos(null);
    setPosDesc('');
    setPosMaxVote(1);
    setShowPosModal(true);
  };

  const openEditPosModal = (pos) => {
    setEditingPos(pos);
    setPosDesc(pos.description);
    setPosMaxVote(pos.maxVote);
    setShowPosModal(true);
  };

  const handleSavePosition = async (e) => {
    e.preventDefault();
    setPosSaving(true);
    try {
      if (editingPos) {
        await fetchApi(`/positions/${editingPos.id}`, {
          method: 'PUT',
          body: JSON.stringify({ description: posDesc, maxVote: posMaxVote })
        });
      } else {
        await fetchApi('/positions', {
          method: 'POST',
          body: JSON.stringify({ electionId, description: posDesc, maxVote: posMaxVote })
        });
      }
      setShowPosModal(false);
      loadElectionDetails();
    } catch (err) {
      alert(err.message || 'Failed to save position');
    } finally {
      setPosSaving(false);
    }
  };

  const handleDeletePosition = async (posId) => {
    if (!confirm('Are you sure? Deleting this position will remove all its candidates.')) return;
    try {
      await fetchApi(`/positions/${posId}`, { method: 'DELETE' });
      loadElectionDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReorderPosition = async (posId, direction) => {
    try {
      await fetchApi(`/positions/${posId}/reorder`, {
        method: 'POST',
        body: JSON.stringify({ direction })
      });
      loadElectionDetails();
    } catch (err) {
      console.error(err);
    }
  };

  // Candidate Handlers
  const openAddCandModal = (posId) => {
    setTargetPosId(posId);
    setEditingCand(null);
    setCandFirstname('');
    setCandLastname('');
    setCandPlatform('');
    setCandPhoto(null);
    setShowCandModal(true);
  };

  const openEditCandModal = (cand) => {
    setTargetPosId(cand.positionId);
    setEditingCand(cand);
    setCandFirstname(cand.firstname);
    setCandLastname(cand.lastname);
    setCandPlatform(cand.platform || '');
    setCandPhoto(null);
    setShowCandModal(true);
  };

  const handleSaveCandidate = async (e) => {
    e.preventDefault();
    if (!targetPosId) return;

    setCandSaving(true);
    try {
      const formData = new FormData();
      formData.append('positionId', targetPosId.toString());
      formData.append('firstname', candFirstname);
      formData.append('lastname', candLastname);
      formData.append('platform', candPlatform);
      if (candPhoto) {
        formData.append('photo', candPhoto);
      }

      if (editingCand) {
        await fetchApi(`/candidates/${editingCand.id}`, {
          method: 'PUT',
          body: formData
        });
      } else {
        await fetchApi('/candidates', {
          method: 'POST',
          body: formData
        });
      }
      setShowCandModal(false);
      loadElectionDetails();
    } catch (err) {
      alert(err.message || 'Failed to save candidate');
    } finally {
      setCandSaving(false);
    }
  };

  const handleDeleteCandidate = async (candId) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    try {
      await fetchApi(`/candidates/${candId}`, { method: 'DELETE' });
      loadElectionDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-slate-500">Loading election configuration...</div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back button & Title */}
      <div className="space-y-4">
        <Link href="/admin/elections" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Elections</span>
        </Link>

        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase">
                {election?.status}
              </span>
              <span className="text-xs font-mono text-indigo-400">Code: {election?.accessCode}</span>
            </div>
            <h1 className="text-3xl font-black text-white mt-1">{election?.title}</h1>
          </div>

          <button
            onClick={openAddPosModal}
            className="px-5 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Add Position</span>
          </button>
        </div>
      </div>

      {/* Pre-Approved Emails for this Election */}
      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Mail className="w-5 h-5 text-indigo-400" />
            <span>Pre-Approve Emails for "{election?.title}"</span>
          </h3>
          <p className="text-slate-400 text-xs">
            Voters who sign up with these emails will automatically be granted voting access to this election.
          </p>
        </div>

        {preMsg && (
          <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
            preMsg.isError ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          }`}>
            {preMsg.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <span>{preMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleAddPreApprovedEmail} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="email"
              required
              value={newPreEmail}
              onChange={(e) => setNewPreEmail(e.target.value)}
              placeholder="e.g. voter@domain.com"
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={preLoading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white text-sm shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            {preLoading ? 'Adding...' : 'Pre-Approve Email'}
          </button>
        </form>

        <div className="pt-2">
          <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Pre-Approved Emails ({preApprovedEmails.length}):</p>
          <div className="flex flex-wrap gap-2">
            {preApprovedEmails.length === 0 ? (
              <span className="text-slate-500 text-xs italic">No pre-approved emails added for this election.</span>
            ) : (
              preApprovedEmails.map((item) => (
                <div key={item.id} className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-indigo-300 flex items-center space-x-2">
                  <span>{item.email}</span>
                  <button
                    onClick={() => handleDeletePreApprovedEmail(item.id)}
                    className="text-slate-500 hover:text-rose-400 transition-colors ml-1"
                    title="Remove Pre-Approval"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Positions & Candidates List */}
      <div className="space-y-6">
        {positions.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 space-y-3">
            <p className="text-slate-400 text-sm">No positions created for this election yet. Click &quot;Add Position&quot; above!</p>
          </div>
        ) : (
          positions.map((pos, idx) => (
            <div key={pos.id} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => handleReorderPosition(pos.id, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleReorderPosition(pos.id, 'down')}
                      disabled={idx === positions.length - 1}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white">{pos.description}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Max Vote Limit: <strong className="text-indigo-400">{pos.maxVote}</strong></p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openAddCandModal(pos.id)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-400 flex items-center space-x-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Candidate</span>
                  </button>
                  <button
                    onClick={() => openEditPosModal(pos)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Edit Position"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePosition(pos.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete Position"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Candidates Grid */}
              {pos.candidates.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs italic">
                  No candidates added to this position yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pos.candidates.map((cand) => (
                    <div key={cand.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{cand.firstname} {cand.lastname}</h4>
                          <p className="text-slate-400 text-xs line-clamp-2 mt-0.5">{cand.platform || 'No platform statement.'}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => openEditCandModal(cand)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCandidate(cand.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Position Modal */}
      {showPosModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 max-w-md w-full space-y-6">
            <h3 className="text-xl font-bold text-white">{editingPos ? 'Edit Position' : 'Add New Position'}</h3>
            <form onSubmit={handleSavePosition} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Position Title</label>
                <input
                  type="text"
                  required
                  value={posDesc}
                  onChange={(e) => setPosDesc(e.target.value)}
                  placeholder="e.g. President, Treasurer"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Max Votes Allowed</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={posMaxVote}
                  onChange={(e) => setPosMaxVote(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>
              <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowPosModal(false)} className="w-1/2 py-3 rounded-xl bg-slate-900 text-slate-300 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={posSaving} className="w-1/2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-600/30">
                  {posSaving ? 'Saving...' : 'Save Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Modal */}
      {showCandModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 max-w-md w-full space-y-6">
            <h3 className="text-xl font-bold text-white">{editingCand ? 'Edit Candidate' : 'Add Candidate'}</h3>
            <form onSubmit={handleSaveCandidate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">First Name</label>
                  <input
                    type="text"
                    required
                    value={candFirstname}
                    onChange={(e) => setCandFirstname(e.target.value)}
                    placeholder="First Name"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Last Name</label>
                  <input
                    type="text"
                    required
                    value={candLastname}
                    onChange={(e) => setCandLastname(e.target.value)}
                    placeholder="Last Name"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Platform / Agenda Statement</label>
                <textarea
                  rows={3}
                  value={candPlatform}
                  onChange={(e) => setCandPlatform(e.target.value)}
                  placeholder="Candidate objectives and goals..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                />
              </div>
              <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowCandModal(false)} className="w-1/2 py-3 rounded-xl bg-slate-900 text-slate-300 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={candSaving} className="w-1/2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-600/30">
                  {candSaving ? 'Saving...' : 'Save Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
