'use client';

import { useState, useEffect } from 'react';
import { FileText, Search, ShieldCheck } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/admin/logs');
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      (l.target || l.targetId || '')?.toLowerCase().includes(search.toLowerCase()) ||
      (l.adminUsername || l.admin?.username || '')?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center space-x-3">
            <FileText className="w-8 h-8 text-emerald-400" />
            <span>Audit Activity Logs</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Immutable administrative audit trail</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading audit log records...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-panel rounded-3xl border border-slate-800 p-12 text-center text-slate-400">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-white">No audit records found</p>
          <p className="text-xs text-slate-500 mt-1">
            {search ? `No activity matching "${search}"` : 'No audit log activities recorded yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block glass-panel rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Timestamp</th>
                    <th className="px-6 py-4 font-semibold">Admin User</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                    <th className="px-6 py-4 font-semibold">Target Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLogs.map((log) => {
                    const actionLower = log.action?.toLowerCase() || '';
                    const isDelete = actionLower.includes('delete') || actionLower.includes('revoke');
                    const isGrant = actionLower.includes('grant') || actionLower.includes('approve') || actionLower.includes('create');
                    
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-semibold text-white">
                          {log.adminUsername || log.admin?.username || (log.admin ? `${log.admin.firstname} ${log.admin.lastname}` : 'Admin')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-lg border ${
                            isDelete
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : isGrant
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-medium font-mono text-xs">
                          {log.target || log.targetId || 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredLogs.map((log) => {
              const actionLower = log.action?.toLowerCase() || '';
              const isDelete = actionLower.includes('delete') || actionLower.includes('revoke');
              const isGrant = actionLower.includes('grant') || actionLower.includes('approve') || actionLower.includes('create');

              return (
                <div key={log.id} className="glass-card p-4 rounded-2xl border border-slate-800/80 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${
                      isDelete
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : isGrant
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-xs">
                    <span className="text-slate-400">Admin: </span>
                    <span className="font-semibold text-white">
                      {log.adminUsername || log.admin?.username || (log.admin ? `${log.admin.firstname} ${log.admin.lastname}` : 'Admin')}
                    </span>
                  </div>

                  {(log.target || log.targetId) && (
                    <div className="text-xs font-mono bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300 truncate">
                      <span className="text-slate-500">Target: </span>
                      {log.target || log.targetId}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
