
import React from 'react';
import { getStore } from '../services/store';

const LogsView: React.FC = () => {
  const { logs } = getStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activité & Audit</h1>
        <p className="text-slate-500 text-sm">Traçabilité complète des actions du cabinet.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
            <tr>
              <th className="px-6 py-4">Horodatage</th>
              <th className="px-6 py-4">Utilisateur</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 text-slate-400 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 font-bold text-emerald-600">{log.user}</td>
                <td className="px-6 py-4 text-slate-700">{log.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogsView;
