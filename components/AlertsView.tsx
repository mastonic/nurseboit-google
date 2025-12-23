
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStore, markAlertRead, addLog } from '../services/store';

const AlertsView: React.FC = () => {
  const navigate = useNavigate();
  const store = getStore();
  const [alerts, setAlerts] = useState(store.alerts);

  const handleRead = (id: string, path: string) => {
    markAlertRead(id);
    addLog(`Alerte consultée : ${id}`);
    navigate(path);
  };

  const typeIcons = {
    prescription: { icon: 'fa-file-medical', color: 'text-blue-500 bg-blue-50' },
    billing: { icon: 'fa-file-invoice-dollar', color: 'text-amber-500 bg-amber-50' },
    message: { icon: 'fa-message', color: 'text-indigo-500 bg-indigo-50' },
    system: { icon: 'fa-shield-halved', color: 'text-slate-500 bg-slate-50' }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Centre de Notifications</h1>
          <p className="text-slate-500 text-sm font-medium">Alertes système et rappels de soins.</p>
        </div>
        <button onClick={() => { setAlerts(alerts.map(a => ({...a, isRead: true}))); addLog("Toutes les alertes marquées lues"); }} className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline">Tout marquer comme lu</button>
      </div>

      <div className="space-y-3">
         {alerts.map(alert => (
           <div 
             key={alert.id} 
             onClick={() => handleRead(alert.id, alert.path)}
             className={`flex items-start gap-4 p-5 rounded-3xl border transition-all cursor-pointer hover:shadow-lg hover:scale-[1.01] ${alert.isRead ? 'bg-white border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm border-l-4 border-l-emerald-500'}`}
           >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${typeIcons[alert.type].color}`}>
                 <i className={`fa-solid ${typeIcons[alert.type].icon} text-lg`}></i>
              </div>
              <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-black text-slate-900 leading-tight ${alert.isRead ? '' : 'text-lg'}`}>{alert.title}</h3>
                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap ml-2">{new Date(alert.date).toLocaleDateString()}</span>
                 </div>
                 <p className="text-sm text-slate-500 font-medium leading-relaxed">{alert.message}</p>
              </div>
              <div className="self-center">
                 <i className="fa-solid fa-chevron-right text-slate-200"></i>
              </div>
           </div>
         ))}
         {alerts.length === 0 && (
           <div className="py-20 text-center text-slate-300">
              <i className="fa-solid fa-bell-slash text-6xl mb-4 opacity-10"></i>
              <p className="font-bold">Aucune notification.</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default AlertsView;
