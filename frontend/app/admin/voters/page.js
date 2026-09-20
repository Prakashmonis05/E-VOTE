'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, ShieldCheck, Check, Key, Mail, Lock, UserPlus, XCircle, CheckCircle, AlertCircle, CheckSquare, Search } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminVotersPage() {
  const [voters, setVoters] = useState([]);
  const [preApprovedEmails, setPreApprovedEmails] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voterSearch, setVoterSearch] = useState('');

  // Pre-approved Email Input State
  const [newPreEmail, setNewPreEmail] = useState('');
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [preLoading, setPreLoading] = useState(false);
  const [preMsg, setPreMsg] = useState(null);

  // Voter Modal
  const [showModal, setShowModal] = useState(false);
  const [editingVoter, setEditingVoter] = useState(null);
  const [email, setEmail] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [votersRes, electionsRes] = await Promise.all([
        fetchApi('/voters'),
        fetchApi('/elections')
      ]);
      setVoters(votersRes.voters || []);
      setPreApprovedEmails(votersRes.preApprovedEmails || []);
      const elList = electionsRes.elections || [];
      setElections(elList);
      if (elList.length > 0 && !selectedElectionId) {
        setSelectedElectionId(elList[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedElection = elections.find((e) => e.id.toString() === selectedElectionId) || elections[0];
  const activeElectionId = selectedElection ? selectedElection.id : null;

  const filteredPreApproved = preApprovedEmails.filter(
    (p) => activeElectionId && p.electionId === activeElectionId
  );

  const filteredVoters = voters.filter((v) => {
    if (!voterSearch.trim()) return true;
    const q = voterSearch.toLowerCase().trim();
    const fullName = `${v.firstname || ''} ${v.lastname || ''}`.toLowerCase();
    return fullName.includes(q) || (v.email || '').toLowerCase().includes(q);
  });

  const handleAddPreApprovedEmail = async (e) => {
    e.preventDefault();
    if (!newPreEmail.trim()) return;
    if (!activeElectionId) {
      setPreMsg({ text: 'Please select an election for pre-approval', isError: true });
      return;
    }

    setPreLoading(true);
    setPreMsg(null);

    try {
      const res = await fetchApi('/voters/preapproved', {
        method: 'POST',
        body: JSON.stringify({ email: newPreEmail.trim(), electionId: activeElectionId })
      });

      setPreMsg({ text: res.message, isError: false });
      setNewPreEmail('');
      loadData();
    } catch (err) {
      setPreMsg({ text: err.message || 'Failed to add pre-approved email', isError: true });
    } finally {
      setPreLoading(false);
    }
  };

  const handleDeletePreApprovedEmail = async (id) => {
    try {
      await fetchApi(`/voters/preapproved/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openAddModal = () => {
    setEditingVoter(null);
    setEmail('');
    setFirstname('');
    setLastname('');
    setPassword('');
    setShowModal(true);
  };

  const openEditModal = (voter) => {
    setEditingVoter(voter);
    setEmail(voter.email);
    setFirstname(voter.firstname);
    setLastname(voter.lastname);
    setPassword('');
    setShowModal(true);
  };

  const handleSaveVoter = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingVoter) {
        await fetchApi(`/voters/${editingVoter.id}`, {
          method: 'PUT',
          body: JSON.stringify({ email, firstname, lastname, password })
        });
      } else {
        await fetchApi('/voters', {
          method: 'POST',
          body: JSON.stringify({ email, firstname, lastname, password })
        });
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to save voter');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVoter = async (voterId) => {
    if (!confirm('Are you sure you want to delete this voter?')) return;
    try {
      await fetchApi(`/voters/${voterId}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleElectionAccess = async (voterId, electionId, hasAccess) => {
    try {
      if (hasAccess) {
        await fetchApi('/voters/access/revoke', {
          method: 'POST',
          body: JSON.stringify({ voterId, electionId })
        });
      } else {
        await fetchApi('/voters/access/grant', {
          method: 'POST',
          body: JSON.stringify({ voterId, electionId })
        });
      }
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center space-x-3">
            <Users className="w-8 h-8 text-emerald-400" />
            <span>Voter Email & Permission Manager</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Pre-approve emails, manage voter access & grant/decline privileges</p>
        </div>

        <button
          onClick={openAddModal}
          className="px-6 py-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add New Voter</span>
        </button>
      </div>

      {/* Election Selector / Toggle Bar */}
      <div className="glass-panel p-5 rounded-3xl border border-indigo-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Select Target Election</h2>
          </div>
          {selectedElection && (
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
              selectedElection.type === 'PRIVATE' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {selectedElection.type === 'PRIVATE' ? '🔒 Private Election' : '🌐 Public Election'}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full">
          {elections.length === 0 ? (
            <span className="text-xs text-slate-500 italic">No elections created yet.</span>
          ) : (
            elections.map((e) => {
              const isSelected = selectedElectionId === e.id.toString();
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedElectionId(e.id.toString())}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{e.type === 'PRIVATE' ? '🔒' : '🌐'}</span>
                  <span>{e.title}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 1. Pre-Approved Voter Emails Section */}
      {selectedElection?.type === 'PUBLIC' ? (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
          <div className="flex items-center space-x-3 text-emerald-400">
            <CheckCircle className="w-6 h-6 shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-white">
                Public Election: Pre-Approved Email Whitelist Not Required
              </h3>
              <p className="text-slate-300 text-xs mt-1">
                &quot;{selectedElection?.title}&quot; is configured as a <strong>PUBLIC</strong> election. All authenticated voters are automatically eligible to participate without access codes or email pre-approval.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/20 space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Mail className="w-5 h-5 text-indigo-400" />
              <span>Pre-Approve Voter Emails for &quot;{selectedElection?.title || 'Selected Election'}&quot;</span>
            </h3>
            <p className="text-slate-400 text-xs">
              Add authorized email addresses for this election. Any voter signing up with a pre-approved email will automatically receive access.
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
            <div className="relative w-full sm:w-96">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={newPreEmail}
                onChange={(e) => setNewPreEmail(e.target.value)}
                placeholder="e.g. voter@school.edu"
                className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={preLoading || !activeElectionId}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white text-sm shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {preLoading ? 'Adding...' : 'Pre-Approve Email'}
            </button>
          </form>

          {/* Filtered Pre-Approved Emails List */}
          <div className="pt-2">
            <p className="text-xs font-semibold uppercase text-slate-400 mb-3">
              Pre-Approved Email List for &quot;{selectedElection?.title}&quot; ({filteredPreApproved.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {filteredPreApproved.length === 0 ? (
                <span className="text-slate-500 text-xs italic">No pre-approved emails added for this election yet.</span>
              ) : (
                filteredPreApproved.map((item) => (
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
      )}

      {/* 2. Registered Voters Directory & Access Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Registered Voters Directory</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Access permissions for target election: <span className="text-indigo-300 font-semibold">&quot;{selectedElection?.title || 'Selected Election'}&quot;</span>
            </p>
          </div>

          {/* Quick Search Filter */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={voterSearch}
              onChange={(e) => setVoterSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500/70 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            />
            {voterSearch && (
              <button
                onClick={() => setVoterSearch('')}
                className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading voters directory...</span>
          </div>
        ) : filteredVoters.length === 0 ? (
          <div className="glass-panel rounded-3xl border border-slate-800/80 p-12 text-center text-slate-400">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-white">No voters found</p>
            <p className="text-xs text-slate-500 mt-1">
              {voterSearch ? `No registered voters matching "${voterSearch}"` : 'No voters have registered in the system yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (hidden on screens < md) */}
            <div className="hidden md:block glass-panel rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Voter Name & Email</th>
                      <th className="px-6 py-4 font-semibold">Access Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredVoters.map((v) => {
                      const accessGrant = v.accessGrants?.find((g) => activeElectionId && g.electionId === activeElectionId);
                      const isPublic = selectedElection?.type === 'PUBLIC';
                      const hasAccess = isPublic || accessGrant?.status === 'APPROVED';
                      const isPending = accessGrant?.status === 'PENDING';
                      const initials = `${(v.firstname?.[0] || 'V')}${(v.lastname?.[0] || '')}`.toUpperCase();

                      return (
                        <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-950 to-purple-900 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-white text-sm">
                                  {v.firstname} {v.lastname}
                                </div>
                                <div className="text-xs text-indigo-400/90 font-mono mt-0.5">
                                  {v.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {isPublic ? (
                              <span className="inline-flex items-center space-x-1.5 text-xs px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase">
                                <span>🌐</span>
                                <span>Public (All Eligible)</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => activeElectionId && toggleElectionAccess(v.id, activeElectionId, hasAccess)}
                                className={`text-xs px-3.5 py-1.5 rounded-xl border font-bold transition-all flex items-center space-x-1.5 ${
                                  hasAccess
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                                    : isPending
                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-emerald-500/25 animate-pulse'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                                }`}
                              >
                                {hasAccess ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Access Granted (Revoke)</span>
                                  </>
                                ) : isPending ? (
                                  <>
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>Pending Request (Approve)</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Grant Access</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => openEditModal(v)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                title="Edit voter"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteVoter(v.id)}
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Delete voter"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View (shown only on screens < md) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
              {filteredVoters.map((v) => {
                const accessGrant = v.accessGrants?.find((g) => activeElectionId && g.electionId === activeElectionId);
                const isPublic = selectedElection?.type === 'PUBLIC';
                const hasAccess = isPublic || accessGrant?.status === 'APPROVED';
                const isPending = accessGrant?.status === 'PENDING';
                const initials = `${(v.firstname?.[0] || 'V')}${(v.lastname?.[0] || '')}`.toUpperCase();

                return (
                  <div
                    key={v.id}
                    className="glass-card p-4 rounded-2xl border border-slate-800/80 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-950 to-purple-900 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm truncate">
                            {v.firstname} {v.lastname}
                          </p>
                          <p className="text-xs text-indigo-400 font-mono truncate">
                            {v.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => openEditModal(v)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteVoter(v.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      {isPublic ? (
                        <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center text-xs text-emerald-400 font-bold uppercase">
                          🌐 Public Election Eligible
                        </div>
                      ) : (
                        <button
                          onClick={() => activeElectionId && toggleElectionAccess(v.id, activeElectionId, hasAccess)}
                          className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                            hasAccess
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 active:bg-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 active:bg-amber-500/30'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white active:bg-slate-800'
                          }`}
                        >
                          {hasAccess ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Access Granted (Tap to Revoke)</span>
                            </>
                          ) : isPending ? (
                            <>
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Pending Request (Tap to Approve)</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Grant Access</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Voter Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 max-w-md w-full space-y-6">
            <h3 className="text-xl font-bold text-white">{editingVoter ? 'Edit Voter' : 'Add New Voter'}</h3>
            <form onSubmit={handleSaveVoter} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    placeholder="First Name"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    placeholder="Last Name"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voter@example.com"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white font-mono focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                  Password {editingVoter && '(Leave blank to keep unchanged)'}
                </label>
                <input
                  type="password"
                  required={!editingVoter}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                />
              </div>
              <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="w-1/2 py-3 rounded-xl bg-slate-900 text-slate-300 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="w-1/2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-600/30">
                  {saving ? 'Saving...' : 'Save Voter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
