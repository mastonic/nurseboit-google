import React, { useState, useEffect, useMemo } from 'react';
// Removed checkAppointmentConflict which was not exported from store.ts and was unused
import { getStore, saveStore, addLog, subscribeToStore, updateAppointment, getCurrentSession } from '../services/store';
import { Appointment, Patient } from '../types';

const PlanningView: React.FC = () => {
  const session = getCurrentSession();
  const [store, setStore] = useState(getStore());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'me' | 'cabinet'>(session?.role === 'admin' ? 'cabinet' : 'me');
  const [appointments, setAppointments] = useState(store.appointments);
  const [modalState, setModalState] = useState<{ mode: 'add' | 'edit' | 'view'; data: any } | null>(null);
  
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    return subscribeToStore(() => {
      const latestStore = getStore();
      setStore(latestStore);
      setAppointments(latestStore.appointments);
    });
  }, []);

  const currentAppointments = useMemo(() => {
    if (viewMode === 'me' && session) {
      return appointments.filter(a => a.nurseId === session.userId);
    }
    return appointments;
  }, [appointments, viewMode, session]);

  // Génération dynamique de la plage horaire basée sur les réglages
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Planning</h1>
          <p className="text-slate-500 text-sm font-medium">Vue {viewMode === 'me' ? 'Personnelle' : 'Cabinet'}</p>
        </div>
        
        <div className="flex gap-2 p-1 bg-slate-200 rounded-2xl">
           <button 
            onClick={() => setViewMode('me')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'me' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-500'}`}
           >
              Mon Planning
           </button>
           <button 
            onClick={() => setViewMode('cabinet')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'cabinet' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-500'}`}
           >
              Cabinet
           </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex overflow-x-auto gap-2 scrollbar-hide sticky top-0 z-20">
        {Array.from({ length: 14 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() + i);
          const iso = d.toISOString().split('T')[0];
          return (
            <button
              key={iso}
              onClick={() => setSelectedDate(iso)}
              className={`flex flex-col items-center min-w-[75px] p-4 rounded-2xl transition-all ${selectedDate === iso ? 'bg-emerald-500 text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
              <span className="text-xl font-black">{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        {viewMode === 'cabinet' ? (
          <div className="grid grid-cols-[80px_repeat(3,1fr)] border-b border-slate-100 bg-slate-50/50">
            <div className="p-4 flex items-center justify-center text-[10px] font-black text-slate-400">HEURE</div>
            {store.users.filter(u => u.role !== 'admin').map(u => (
               <div key={u.id} className="p-4 text-center border-l border-slate-100">
                  <p className="text-xs font-black text-slate-900">{u.firstName}</p>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase">{u.role}</p>
               </div>
            ))}
          </div>
        ) : null}

        <div className="max-h-[700px] overflow-y-auto">
          {hours.map(h => (
            <div key={h} className={`grid ${viewMode === 'me' ? 'grid-cols-[80px_1fr]' : 'grid-cols-[80px_repeat(3,1fr)]'} border-b border-slate-50 min-h-[80px]`}>
              <div className="flex items-center justify-center text-xs font-black text-slate-400 border-r border-slate-50 bg-slate-50/20">{h}h00</div>
              
              {viewMode === 'me' ? (
                 <div className="p-2 relative group">
                    {currentAppointments.find(a => a.dateTime.startsWith(`${selectedDate}T${h.toString().padStart(2, '0')}`)) ? (
                       (() => {
                          const apt = currentAppointments.find(a => a.dateTime.startsWith(`${selectedDate}T${h.toString().padStart(2, '0')}`))!;
                          const p = store.patients.find(pat => pat.id === apt.patientId);
                          return (
                            <div onClick={() => setModalState({ mode: 'view', data: apt })} className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-2xl h-full shadow-sm cursor-pointer hover:scale-[1.01] transition-all">
                               <p className="text-xs font-black text-slate-900">{p?.lastName} {p?.firstName}</p>
                               <p className="text-[10px] text-slate-500 font-medium truncate">{apt.notes || p?.careType}</p>
                            </div>
                          );
                       })()
                    ) : (
                       <button onClick={() => setModalState({ mode: 'add', data: { nurseId: session?.userId, hour: h } })} className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-emerald-300 transition-all">
                          <i className="fa-solid fa-plus-circle text-2xl"></i>
                       </button>
                    )}
                 </div>
              ) : (
                store.users.filter(u => u.role !== 'admin').map(u => (
                  <div key={u.id} className="p-2 border-l border-slate-50 relative group">
                    {appointments.find(a => a.nurseId === u.id && a.dateTime.startsWith(`${selectedDate}T${h.toString().padStart(2, '0')}`)) ? (
                       (() => {
                          const apt = appointments.find(a => a.nurseId === u.id && a.dateTime.startsWith(`${selectedDate}T${h.toString().padStart(2, '0')}`))!;
                          const p = store.patients.find(pat => pat.id === apt.patientId);
                          return (
                            <div onClick={() => setModalState({ mode: 'view', data: apt })} className="bg-white border border-slate-100 p-2 rounded-xl h-full shadow-sm cursor-pointer hover:border-emerald-200">
                               <p className="text-[10px] font-black text-slate-700 truncate">{p?.lastName}</p>
                               <div className="w-full h-1 bg-slate-100 rounded-full mt-1"><div className="h-full bg-emerald-500 rounded-full" style={{width: '60%'}}></div></div>
                            </div>
                          );
                       })()
                    ) : (
                       <button 
                        disabled={session?.role === 'infirmiere'} 
                        onClick={() => setModalState({ mode: 'add', data: { nurseId: u.id, hour: h } })} 
                        className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-slate-200"
                       >
                          <i className="fa-solid fa-plus-circle text-xl"></i>
                       </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      {modalState && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="font-black text-2xl">{modalState.mode === 'add' ? 'Planifier un passage' : 'Détails du passage'}</h3>
                 <button onClick={() => setModalState(null)} className="text-slate-300 hover:text-slate-600 p-2"><i className="fa-solid fa-xmark text-2xl"></i></button>
              </div>

              {modalState.mode === 'view' ? (
                <div className="p-8 space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-2xl font-black">{store.patients.find(p => p.id === modalState.data.patientId)?.lastName[0]}</div>
                      <div>
                         <h4 className="font-black text-xl">{store.patients.find(p => p.id === modalState.data.patientId)?.lastName} {store.patients.find(p => p.id === modalState.data.patientId)?.firstName}</h4>
                         <p className="text-slate-500 text-sm font-bold italic">Passage prévu à {modalState.data.dateTime.split('T')[1].substring(0, 5)}</p>
                      </div>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-medium">
                      {modalState.data.notes || "Aucune note consignée."}
                   </div>
                   <div className="flex gap-4">
                      <button onClick={() => setModalState({ mode: 'edit', data: modalState.data })} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Modifier</button>
                      <button onClick={() => setModalState(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest">Fermer</button>
                   </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                         <input name="time" type="time" defaultValue={`${modalState.data.hour.toString().padStart(2, '0')}:00`} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
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
      )}
    </div>
  );
};

export default PlanningView;