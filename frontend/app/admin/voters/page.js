'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, ShieldCheck, Check, Key, Mail, Lock, UserPlus, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminVotersPage() {
  const [voters, setVoters] = useState([]);
  const [preApprovedEmails, setPreApprovedEmails] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleAddPreApprovedEmail = async (e) => {
    e.preventDefault();
    if (!newPreEmail.trim()) return;
    if (!selectedElectionId) {
      setPreMsg({ text: 'Please select an election for pre-approval', isError: true });
      return;
    }

    setPreLoading(true);
    setPreMsg(null);

    try {
      const res = await fetchApi('/voters/preapproved', {
        method: 'POST',
        body: JSON.stringify({ email: newPreEmail.trim(), electionId: parseInt(selectedElectionId, 10) })
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

  const handleToggleVoterStatus = async (voterId, currentStatus) => {
    const isApproved = currentStatus?.toUpperCase() === 'APPROVED';
    const nextStatus = isApproved ? 'DECLINED' : 'APPROVED';
    try {
      await fetchApi(`/voters/${voterId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
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
    <div className="space-y-10 max-w-6xl mx-auto">
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

      {/* 1. Pre-Approved Voter Emails Section */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/20 space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <Mail className="w-5 h-5 text-indigo-400" />
            <span>Pre-Approve Voter Emails</span>
          </h3>
          <p className="text-slate-400 text-xs">
            Add authorized email addresses. Any user who signs up with a pre-approved email automatically receives voting privileges.
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
          <div className="relative w-full sm:w-72">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="email"
              required
              value={newPreEmail}
              onChange={(e) => setNewPreEmail(e.target.value)}
              placeholder="e.g. student@school.edu"
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none font-medium"
            >
              {elections.length === 0 ? (
                <option value="">No Elections Created</option>
              ) : (
                elections.map((e) => (
                  <option key={e.id} value={e.id}>
                    Target: {e.title} ({e.accessCode})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="submit"
            disabled={preLoading || elections.length === 0}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white text-sm shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            {preLoading ? 'Adding...' : 'Pre-Approve Email'}
          </button>
        </form>

        {/* List of Pre-Approved Emails */}
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase text-slate-400 mb-3">Pre-Approved Email List ({preApprovedEmails.length}):</p>
          <div className="flex flex-wrap gap-2">
            {preApprovedEmails.length === 0 ? (
              <span className="text-slate-500 text-xs italic">No pre-approved emails added yet.</span>
            ) : (
              preApprovedEmails.map((item) => (
                <div key={item.id} className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-indigo-300 flex items-center space-x-2">
                  <span>{item.email}</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-[10px] text-indigo-400 font-sans font-bold uppercase">
                    {item.election?.title || `Election #${item.electionId}`}
                  </span>
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

      {/* 2. Registered Voters Table with Grant/Decline Status */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Registered Voters Directory & Access Controls</span>
        </h3>

        {loading ? (
          <div className="py-16 text-center text-slate-500">Loading voters directory...</div>
        ) : (
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Voter Name & Email</th>
                    <th className="px-6 py-4 font-semibold">Election Access Permissions</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {voters.map((v) => {
                    const grantedElectionIds = new Set(v.accessGrants?.map((g) => g.electionId));

                    return (
                      <tr key={v.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white text-base">
                            {v.firstname} {v.lastname}
                          </div>
                          <div className="text-xs text-indigo-400 font-mono mt-0.5">
                            {v.email}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {elections.map((e) => {
                              const hasAccess = grantedElectionIds.has(e.id);
                              return (
                                <button
                                  key={e.id}
                                  onClick={() => toggleElectionAccess(v.id, e.id, hasAccess)}
                                  className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-all flex items-center space-x-1 ${
                                    hasAccess
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                                  }`}
                                  title={hasAccess ? 'Click to revoke access' : 'Click to grant access'}
                                >
                                  {hasAccess && <Check className="w-3 h-3" />}
                                  <span>{e.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openEditModal(v)}
                              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVoter(v.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
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
