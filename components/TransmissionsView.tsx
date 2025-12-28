
import React, { useState, useEffect } from 'react';
import { getStore, subscribeToStore, markTransmissionReceived, getCurrentSession } from '../services/store';
import { Transmission, Patient } from '../types';

const TransmissionsView: React.FC = () => {
  const session = getCurrentSession();
  const [store, setStore] = useState(getStore());
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  const transmissions = store.transmissions.filter((t: Transmission) => {
    if (filter === 'unread') return t.status === 'sent' && t.fromId !== session?.userId;
    if (filter === 'urgent') return t.priority === 'high';
    return true;
  });

  const categoryIcon = {
    clinique: 'fa-stethoscope text-blue-500',
    social: 'fa-users text-purple-500',
    logistique: 'fa-truck-ramp-box text-slate-500',
    urgence: 'fa-triangle-exclamation text-rose-500'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Transmissions Équipe</h1>
          <p className="text-slate-500 font-medium">Continuité des soins et passations de tournée.</p>
        </div>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
           {(['all', 'unread', 'urgent'] as const).map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-emerald-500 shadow-md' : 'text-slate-400'}`}
              >
                 {f === 'all' ? 'Toutes' : f === 'unread' ? 'À lire' : 'Urgentes'}
              </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {transmissions.length > 0 ? transmissions.map(t => {
           const patient = store.patients.find((p:Patient) => p.id === t.patientId);
           return (
             <div key={t.id} className={`bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row gap-8 transition-all hover:shadow-xl ${t.status === 'sent' && t.fromId !== session?.userId ? 'border-l-8 border-l-emerald-500' : 'border-slate-100'}`}>
                <div className="flex flex-col items-center justify-center bg-slate-50 rounded-[2rem] p-6 w-full md:w-48 shrink-0 text-center">
                   <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center text-xl font-black mb-3">
                      {patient?.lastName[0]}
                   </div>
                   <p className="font-black text-slate-900 text-sm truncate w-full">{patient?.lastName} {patient?.firstName}</p>
                   <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1 italic">{patient?.careType}</p>
                </div>

                <div className="flex-1 space-y-4">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         <i className={`fa-solid ${categoryIcon[t.category]} text-lg`}></i>
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.category}</span>
                         {t.priority === 'high' && <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest animate-pulse">Priorité Haute</span>}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Émis le {new Date(t.timestamp).toLocaleString()}</p>
                   </div>
                   <p className="text-slate-700 font-medium leading-relaxed bg-slate-50/50 p-6 rounded-3xl italic border border-slate-50">"{t.text}"</p>
                   <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[8px] font-black">
                            {t.fromName[0]}
                         </div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">De {t.fromName}</p>
                      </div>
                      {t.status === 'sent' && t.fromId !== session?.userId ? (
                        <button 
                          onClick={() => markTransmissionReceived(t.id, session?.userId || '')}
                          className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200"
                        >
                          Accuser Réception
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-300">
                           <i className="fa-solid fa-check-double text-[10px]"></i>
                           <p className="text-[9px] font-black uppercase tracking-widest">Passation Validée</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>
           );
        }) : (
          <div className="py-40 text-center space-y-6">
             <div className="w-24 h-24 bg-slate-100 text-slate-200 rounded-full flex items-center justify-center mx-auto text-4xl">
                <i className="fa-solid fa-cloud-sun"></i>
             </div>
             <div>
                <h3 className="text-xl font-black text-slate-300">Calme plat sur les transmissions</h3>
                <p className="text-sm text-slate-400 font-medium">Toutes les passations ont été traitées ou aucune n'est disponible.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransmissionsView;
