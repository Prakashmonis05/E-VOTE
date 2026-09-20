'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, CheckSquare, Edit, Trash2, Calendar, Clock, Key, AlertCircle, Settings, BarChart2, Copy, Check } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminElectionsPage() {
  const router = useRouter();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingElection, setEditingElection] = useState(null);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('PUBLIC');
  const [accessCode, setAccessCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('pending');
  const [resultsPublic, setResultsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadElections();
  }, []);

  const loadElections = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/elections');
      setElections(data.elections || []);
    } catch (err) {
      setError(err.message || 'Failed to load elections');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingElection(null);
    setTitle('');
    setDescription('');
    setType('PUBLIC');
    setAccessCode('');
    const today = new Date().toISOString().slice(0, 16);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    setStartDate(today);
    setEndDate(nextWeek);
    setStatus('pending');
    setResultsPublic(false);
    setShowCreateModal(true);
  };

  const openEditModal = (election) => {
    setEditingElection(election);
    setTitle(election.title);
    setDescription(election.description || '');
    setType(election.type || 'PUBLIC');
    const rawCode = election.accessCode || '';
    setAccessCode(rawCode.startsWith('$2') ? 'SAMCA' : rawCode);
    setStartDate(new Date(election.startDate).toISOString().slice(0, 16));
    setEndDate(new Date(election.endDate).toISOString().slice(0, 16));
    setStatus(election.status);
    setResultsPublic(!!election.resultsPublic);
    setShowCreateModal(true);
  };

  const handleSaveElection = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        title,
        description,
        type,
        accessCode: type === 'PRIVATE' ? accessCode : null,
        startDate,
        endDate,
        status,
        resultsPublic
      };

      if (editingElection) {
        await fetchApi(`/elections/${editingElection.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchApi('/elections', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setShowCreateModal(false);
      loadElections();
    } catch (err) {
      setError(err.message || 'Failed to save election');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteElection = async (id) => {
    if (!confirm('Are you sure you want to delete this election? All positions, candidates, and votes will be permanently deleted!')) {
      return;
    }

    try {
      await fetchApi(`/elections/${id}`, { method: 'DELETE' });
      loadElections();
    } catch (err) {
      alert(err.message || 'Failed to delete election');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center space-x-3">
            <CheckSquare className="w-8 h-8 text-indigo-400" />
            <span>Elections Management</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Configure active elections, access codes, and dates</p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-6 py-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Election</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Elections Cards */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading elections...</div>
      ) : elections.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 space-y-4">
          <CheckSquare className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">No elections created yet. Click &quot;New Election&quot; to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {elections.map((e) => (
            <div key={e.id} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                      e.status === 'active' || e.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      e.status === 'completed' || e.status === 'COMPLETED' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {e.status}
                    </span>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${
                      e.type === 'PRIVATE'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {e.type === 'PRIVATE' ? '🔒 PRIVATE' : '🌐 PUBLIC'}
                    </span>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${
                      e.resultsPublic
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {e.resultsPublic ? '📊 Live Results' : '🔒 Post-Completion'}
                    </span>
                  </div>
                  {e.type === 'PRIVATE' && (
                    <div className="flex items-center space-x-1.5 text-xs font-mono text-indigo-300 bg-slate-900 border border-indigo-500/30 px-3 py-1 rounded-xl">
                      <Key className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-slate-400 font-sans text-[11px]">Code:</span>
                      <strong className="font-bold tracking-wider text-indigo-200">
                        {e.accessCode?.startsWith('$2') ? 'SAMCA' : (e.accessCode || 'None')}
                      </strong>
                      {e.accessCode && (
                        <button
                          type="button"
                          onClick={(evt) => {
                            evt.stopPropagation();
                            const codeToCopy = e.accessCode?.startsWith('$2') ? 'SAMCA' : e.accessCode;
                            navigator.clipboard.writeText(codeToCopy);
                            setCopiedCode(e.id);
                            setTimeout(() => setCopiedCode(null), 2000);
                          }}
                          className="text-slate-400 hover:text-white transition-colors ml-1 p-0.5"
                          title="Copy Access Code"
                        >
                          {copiedCode === e.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-white">{e.title}</h3>
                  <p className="text-slate-400 text-sm line-clamp-2 mt-1">{e.description || 'No description provided.'}</p>
                </div>

                <div className="flex items-center space-x-4 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Start: {new Date(e.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>End: {new Date(e.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/admin/elections/${e.id}`}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 shadow-md shadow-indigo-600/20"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Manage Positions & Candidates</span>
                  </Link>

                  <Link
                    href={`/election/${e.id}/results`}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 flex items-center space-x-1"
                  >
                    <BarChart2 className="w-4 h-4 text-emerald-400" />
                    <span>Results</span>
                  </Link>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(e)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteElection(e.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 max-w-lg w-full space-y-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-white">
              {editingElection ? 'Edit Election' : 'Create New Election'}
            </h3>

            <form onSubmit={handleSaveElection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Student Council Election 2026"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Election details and guidelines..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Election Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType('PUBLIC')}
                    className={`py-3 px-4 rounded-xl font-bold text-xs border transition-all flex items-center justify-center space-x-2 ${
                      type === 'PUBLIC'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>🌐 Public (Open to All)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType('PRIVATE');
                      if (!accessCode) setAccessCode(`CODE-${Math.floor(1000 + Math.random() * 9000)}`);
                    }}
                    className={`py-3 px-4 rounded-xl font-bold text-xs border transition-all flex items-center justify-center space-x-2 ${
                      type === 'PRIVATE'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>🔒 Private (Code Protected)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {type === 'PRIVATE' ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Access Code</label>
                      <button
                        type="button"
                        onClick={() => setAccessCode(`CODE-${Math.floor(1000 + Math.random() * 9000)}`)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline"
                      >
                        Generate Random
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      placeholder="e.g. SECURE123"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white font-mono uppercase focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Access Control</label>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 font-medium">
                      No code or whitelist required
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">End Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Results Publishing Mode</label>
                <select
                  value={resultsPublic ? 'live' : 'completion'}
                  onChange={(e) => setResultsPublic(e.target.value === 'live')}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                >
                  <option value="completion">Publish After Completion (Voters view results after voting ends)</option>
                  <option value="live">Live Results (Voters view real-time vote totals while active)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {resultsPublic ? '📊 Voters can see live candidate vote counts during voting.' : '🔒 Results remain hidden from voters until election status is set to Completed.'}
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-3 rounded-xl font-semibold bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white text-sm shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Election'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
