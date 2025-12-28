
import React, { useState, useEffect, useMemo } from 'react';
import { getStore, saveStore, addLog, subscribeToStore, updateAppointment, getCurrentSession } from '../services/store';
import { Appointment, Patient } from '../types';

const PlanningView: React.FC = () => {
  const session = getCurrentSession();
  const [store, setStore] = useState(getStore());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'me' | 'cabinet'>(session?.role === 'admin' ? 'cabinet' : 'me');
  const [appointments, setAppointments] = useState(store.appointments);
  const [modalState, setModalState] = useState<{ mode: 'add' | 'edit' | 'view'; data: any } | null>(null);

  useEffect(() => {
    return subscribeToStore(() => {
      const latestStore = getStore();
      setStore(latestStore);
      setAppointments(latestStore.appointments);
    });
  }, []);

  const currentAppointments = useMemo(() => {
    const filtered = appointments.filter(a => a.dateTime.startsWith(selectedDate));
    if (viewMode === 'me' && session) {
      return filtered.filter(a => a.nurseId === session.userId);
    }
    return filtered;
  }, [appointments, viewMode, session, selectedDate]);

  const hours = useMemo(() => {
    const start = parseInt(store.settings.workingHoursStart.split(':')[0]);
    const end = parseInt(store.settings.workingHoursEnd.split(':')[0]);
    const length = end - start + 1;
    return Array.from({ length }, (_, i) => i + start);
  }, [store.settings.workingHoursStart, store.settings.workingHoursEnd]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!modalState || !session) return;

    const formData = new FormData(e.currentTarget);
    const targetNurseId = formData.get('nurseId') as string;
    
    if (session.role === 'infirmiere' && targetNurseId !== session.userId) {
       alert("Vous ne pouvez planifier des soins que pour vous-même.");
       return;
    }

    const patientId = formData.get('patientId') as string;
    const durationMinutes = parseInt(formData.get('duration') as string);
    const notes = formData.get('notes') as string;
    const time = formData.get('time') as string;
    const dateTime = `${selectedDate}T${time}:00`;

    if (modalState.mode === 'add') {
      const newApt: Appointment = {
        id: Date.now().toString(),
        patientId,
        nurseId: targetNurseId,
        dateTime,
        durationMinutes,
        type: 'care',
        status: 'scheduled',
        notes,
        createdBy: session.userId
      };
      saveStore({ appointments: [...appointments, newApt] });
      addLog(`Nouveau passage planifié pour ${targetNurseId}`, session.userId);
    } else {
      const updated: Appointment = {
        ...modalState.data,
        patientId,
        nurseId: targetNurseId,
        dateTime,
        durationMinutes,
        notes
      };
      updateAppointment(updated);
    }
    setModalState(null);
  };

  const getMapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Planning</h1>
          <p className="text-slate-500 text-sm font-medium">Vue {viewMode === 'me' ? 'Personnelle' : 'Cabinet'}</p>
        </div>
        
        <div className="flex gap-2 p-1 bg-slate-200 rounded-2xl">
           <button onClick={() => setViewMode('me')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'me' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-500'}`}>Mon Planning</button>
           <button onClick={() => setViewMode('cabinet')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'cabinet' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-500'}`}>Cabinet</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex overflow-x-auto gap-2 scrollbar-hide sticky top-0 z-20">
        {Array.from({ length: 14 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() + i);
          const iso = d.toISOString().split('T')[0];
          return (
            <button key={iso} onClick={() => setSelectedDate(iso)} className={`flex flex-col items-center min-w-[75px] p-4 rounded-2xl transition-all ${selectedDate === iso ? 'bg-emerald-500 text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
              <span className="text-[10px] font-black uppercase tracking-widest">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
              <span className="text-xl font-black">{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        <div className="max-h-[700px] overflow-y-auto">
          {hours.map(h => {
            const hStr = h.toString().padStart(2, '0');
            return (
            <div key={h} className="grid grid-cols-[80px_1fr] border-b border-slate-50 min-h-[80px]">
              <div className="flex items-center justify-center text-xs font-black text-slate-400 border-r border-slate-50 bg-slate-50/20">{h}h00</div>
              <div className="p-2 relative group flex flex-wrap gap-2">
                 {currentAppointments.filter(a => a.dateTime.includes(`T${hStr}:`)).map(apt => {
                    const p = store.patients.find(pat => pat.id === apt.patientId);
                    return (
                      <div key={apt.id} onClick={() => setModalState({ mode: 'view', data: apt })} className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-2xl shadow-sm cursor-pointer hover:scale-[1.01] transition-all min-w-[200px]">
                         <div className="flex justify-between items-start">
                           <p className="text-xs font-black text-slate-900">{p?.lastName} {p?.firstName}</p>
                           <span className="text-[8px] font-black text-emerald-600 bg-white px-1.5 py-0.5 rounded uppercase">{apt.dateTime.split('T')[1].substring(0, 5)}</span>
                         </div>
                         <p className="text-[9px] text-slate-500 font-medium truncate mt-1">{apt.notes || p?.careType}</p>
                      </div>
                    );
                 })}
                 <button onClick={() => setModalState({ mode: 'add', data: { nurseId: session?.userId, hour: h } })} className="w-10 h-10 opacity-0 group-hover:opacity-100 flex items-center justify-center text-emerald-300 border-2 border-dashed border-emerald-100 rounded-xl hover:bg-emerald-50 transition-all">
                    <i className="fa-solid fa-plus"></i>
                 </button>
              </div>
            </div>
          )})}
        </div>
      </div>

      {modalState && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
                 <h3 className="font-black text-2xl">{modalState.mode === 'add' ? 'Planifier un passage' : 'Détails du passage'}</h3>
                 <button onClick={() => setModalState(null)} className="text-slate-300 hover:text-slate-600 p-2"><i className="fa-solid fa-xmark text-2xl"></i></button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto">
              {modalState.mode === 'view' ? (
                (() => {
                  const apt = modalState.data;
                  const p = store.patients.find(pat => pat.id === apt.patientId);
                  return (
                  <div className="space-y-6">
                     <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-2xl font-black">{p?.lastName[0]}</div>
                        <div>
                           <h4 className="font-black text-xl">{p?.lastName} {p?.firstName}</h4>
                           <p className="text-slate-500 text-sm font-bold italic">Passage prévu à {apt.dateTime.split('T')[1].substring(0, 5)}</p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 group">
                           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                              <i className="fa-solid fa-phone"></i>
                           </div>
                           <div className="flex-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase">Téléphone</p>
                              <a href={`tel:${p?.phone}`} className="text-sm font-bold text-slate-700 hover:text-emerald-500 transition-all">{p?.phone}</a>
                           </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 group">
                           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
                              <i className="fa-solid fa-map-location-dot"></i>
                           </div>
                           <div className="flex-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase">Adresse</p>
                              <p className="text-sm font-bold text-slate-700 truncate">{p?.address}</p>
                           </div>
                           <a href={getMapsUrl(p?.address || '')} target="_blank" rel="noopener noreferrer" className="p-3 bg-white text-blue-500 rounded-xl shadow-sm hover:bg-blue-50 transition-all">
                              <i className="fa-solid fa-directions"></i>
                           </a>
                        </div>
                     </div>

                     <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 text-sm font-medium text-amber-900 italic">
                        <p className="text-[10px] font-black uppercase text-amber-500 mb-2">Instructions / Notes</p>
                        {apt.notes || "Aucune note consignée."}
                     </div>

                     <div className="flex gap-4">
                        <button onClick={() => setModalState({ mode: 'edit', data: apt })} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Modifier</button>
                        <button onClick={() => setModalState(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest">Fermer</button>
                     </div>
                  </div>
                )})()
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</label>
                      <select name="patientId" required defaultValue={modalState.data.patientId} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm">
                         <option value="">Sélectionner un patient...</option>
                         {store.patients.map(p => <option key={p.id} value={p.id}>{p.lastName} {p.firstName}</option>)}
                      </select>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Infirmier(ère)</label>
                         <select name="nurseId" defaultValue={modalState.data.nurseId} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm">
                            {store.users.filter(u => u.role !== 'admin').map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                         </select>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Heure</label>
                         <input name="time" type="time" defaultValue={`${(modalState.data.hour || 8).toString().padStart(2, '0')}:00`} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Durée prévue (min)</label>
                      <input name="duration" type="number" defaultValue={store.settings.defaultCareDuration} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes du soin</label>
                      <textarea name="notes" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm h-24" placeholder="Instructions particulières..."></textarea>
                   </div>
                   <button type="submit" className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200">Valider la planification</button>
                </form>
              )}
              </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default PlanningView;
