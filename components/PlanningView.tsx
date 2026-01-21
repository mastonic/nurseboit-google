
import React, { useState, useEffect, useMemo } from 'react';
import { getStore, saveStore, addLog, subscribeToStore, updateAppointment, getCurrentSession, setExternalEvents, generateUUID } from '../services/store';
import { callNurseBotAgent } from '../services/n8nService';
import { Appointment, Patient, User } from '../types';

const PlanningView: React.FC = () => {
  const session = getCurrentSession();
  const [store, setStore] = useState(getStore());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'me' | 'cabinet'>(session?.role === 'admin' ? 'cabinet' : 'me');
  const [isSyncing, setIsSyncing] = useState(false);
  const [modalState, setModalState] = useState<{ mode: 'add' | 'edit' | 'view'; data: any } | null>(null);

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  // Fetch Google Calendar events on date or viewMode change if enabled AND configured
  useEffect(() => {
    const hasN8nConfig = !!(store.settings.apiConfig.n8nBaseUrl || process.env.VITE_N8N_BASE_URL);
    if (store.settings.apiConfig.googleCalendarSync && hasN8nConfig) {
      handleGoogleSync();
    }
  }, [selectedDate, viewMode, store.settings.apiConfig.googleCalendarSync, store.settings.apiConfig.n8nBaseUrl]);

  const handleGoogleSync = async () => {
    if (!session) return;

    const n8nUrl = store.settings.apiConfig.n8nBaseUrl || process.env.VITE_N8N_BASE_URL;
    if (!n8nUrl) return;

    setIsSyncing(true);
    try {
      // Determine which calendars to sync
      const targetUsers = viewMode === 'me'
        ? store.users.filter((u: User) => u.id === session.userId)
        : store.users.filter((u: User) => u.active && u.calendarId);

      if (targetUsers.length === 0) {
        setIsSyncing(false);
        return;
      }

      const allFetchedEvents: any[] = [];

      // Loop through users to fetch their individual calendars
      for (const user of targetUsers) {
        if (!user.calendarId) continue;

        try {
          const result = await callNurseBotAgent({
            event: 'GOOGLE_CALENDAR_FETCH',
            role: session.role,
            context: {
              userId: user.id,
              userName: `${user.firstName} ${user.lastName}`,
              calendarId: user.calendarId,
              date: selectedDate
            }
          });

          if (result && result.events) {
            // Tag events with the nurse's name for clarity in the UI
            const tagged = result.events.map((e: any) => ({
              ...e,
              nurseName: user.firstName,
              nurseId: user.id
            }));
            allFetchedEvents.push(...tagged);
          }
        } catch (err) {
          console.error(`Failed to sync calendar for ${user.firstName}`, err);
        }
      }

      setExternalEvents(allFetchedEvents);
    } catch (e: any) {
      console.error("Global Google Sync Error:", e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const currentAppointments = useMemo(() => {
    const internal = store.appointments.filter((a: any) => a.dateTime.startsWith(selectedDate));
    const filtered = viewMode === 'me' && session ? internal.filter((a: any) => a.nurseId === session.userId) : internal;

    // Merge with external events
    const external = store.externalEvents.filter((e: any) => e.start.startsWith(selectedDate)).map((e: any) => ({
      ...e,
      isExternal: true,
      dateTime: e.start
    }));

    return [...filtered, ...external].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [store.appointments, store.externalEvents, viewMode, session, selectedDate]);

  const hours = useMemo(() => {
    const start = parseInt(store.settings.workingHoursStart.split(':')[0]);
    const end = parseInt(store.settings.workingHoursEnd.split(':')[0]);
    return Array.from({ length: end - start + 1 }, (_, i) => i + start);
  }, [store.settings.workingHoursStart, store.settings.workingHoursEnd]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!modalState || !session) return;

    const formData = new FormData(e.currentTarget);
    const targetNurseId = formData.get('nurseId') as string;
    const patientId = formData.get('patientId') as string;
    const durationMinutes = parseInt(formData.get('duration') as string);
    const notes = formData.get('notes') as string;
    const time = formData.get('time') as string;
    const dateTime = `${selectedDate}T${time}:00`;

    let finalApt: Appointment;

    if (modalState.mode === 'add') {
      finalApt = {
        id: generateUUID(),
        patientId,
        nurseId: targetNurseId,
        dateTime,
        durationMinutes,
        type: 'care',
        status: 'scheduled',
        notes,
        createdBy: session.userId
      };
      saveStore({ appointments: [...store.appointments, finalApt] });
    } else {
      finalApt = {
        ...modalState.data,
        patientId,
        nurseId: targetNurseId,
        dateTime,
        durationMinutes,
        notes
      };
      updateAppointment(finalApt);
    }

    // SYNC TO GOOGLE VIA N8N
    const nurse = store.users.find((u: User) => u.id === targetNurseId);
    if (store.settings.apiConfig.googleCalendarSync && nurse?.calendarId && (store.settings.apiConfig.n8nBaseUrl || process.env.VITE_N8N_BASE_URL)) {
      callNurseBotAgent({
        event: 'GOOGLE_CALENDAR_SYNC',
        role: session.role,
        data: JSON.stringify(finalApt),
        context: {
          patient: store.patients.find((p: any) => p.id === patientId),
          calendarId: nurse.calendarId
        }
      }).catch(err => console.error("Sync to Google failed", err.message));
    }

    addLog(`Rendez-vous planifié`);
    setModalState(null);
  };

  const getMapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Planning & Calendriers</h1>
          <p className="text-slate-500 text-sm font-medium">Vue {viewMode === 'me' ? 'Personnelle' : 'Cabinet'}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGoogleSync}
            disabled={isSyncing}
            className={`px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-sm border ${isSyncing
              ? 'bg-indigo-50 border-indigo-100 text-indigo-400 cursor-wait'
              : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 active:scale-95'
              }`}
          >
            <i className={`fa-solid ${isSyncing ? 'fa-sync fa-spin' : 'fa-google'}`}></i>
            {isSyncing ? 'Sync en cours...' : 'Sync Agendas'}
          </button>
          <div className="flex gap-2 p-1 bg-slate-200 rounded-2xl shadow-inner">
            <button onClick={() => setViewMode('me')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'me' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Moi</button>
            <button onClick={() => setViewMode('cabinet')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'cabinet' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Cabinet</button>
          </div>
        </div>
      </div>

      {/* Bar de dates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-lg font-black text-slate-900">
            {new Date(selectedDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-xs font-bold text-slate-400">
            Aujourd'hui : {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex overflow-x-auto gap-2 scrollbar-hide sticky top-0 z-20">
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() + i);
            const iso = d.toISOString().split('T')[0];
            return (
              <button key={iso} onClick={() => setSelectedDate(iso)} className={`flex flex-col items-center min-w-[75px] p-4 rounded-2xl transition-all ${selectedDate === iso ? 'bg-emerald-500 text-white shadow-lg scale-105' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                <span className="text-xl font-black">{d.getDate()}</span>
                <span className="text-[8px] font-bold opacity-60">{d.toLocaleDateString('fr-FR', { month: 'short' })}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        <div className="max-h-[700px] overflow-y-auto">
          {hours.map(h => {
            const hStr = h.toString().padStart(2, '0');
            const hourItems = currentAppointments.filter(a => a.dateTime.includes(`T${hStr}:`));

            return (
              <div key={h} className="grid grid-cols-[80px_1fr] border-b border-slate-50 min-h-[100px]">
                <div className="flex items-center justify-center text-xs font-black text-slate-400 border-r border-slate-50 bg-slate-50/20">{h}h00</div>
                <div className="p-4 relative group flex flex-wrap gap-3">
                  {hourItems.map((apt: any) => {
                    const isExternal = apt.isExternal;
                    const p = store.patients.find((pat: any) => pat.id === apt.patientId);

                    return (
                      <div
                        key={apt.id}
                        onClick={() => !isExternal && setModalState({ mode: 'view', data: apt })}
                        className={`p-4 rounded-2xl shadow-sm transition-all min-w-[220px] max-w-[300px] border-l-4 ${isExternal
                          ? 'bg-indigo-50 border-indigo-500'
                          : 'bg-emerald-50 border-emerald-500 cursor-pointer hover:scale-[1.02]'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col">
                            <p className="text-xs font-black text-slate-900 truncate">
                              {isExternal ? apt.summary : `${p?.lastName} ${p?.firstName}`}
                            </p>
                            {isExternal && apt.nurseName && (
                              <p className="text-[8px] font-black text-indigo-400 uppercase">Agenda de {apt.nurseName}</p>
                            )}
                          </div>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 ${isExternal ? 'bg-indigo-200 text-indigo-700' : 'bg-white text-emerald-600'}`}>
                            {apt.dateTime.split('T')[1].substring(0, 5)}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-medium truncate">
                          {isExternal ? "Événement Google Calendar" : (apt.notes || p?.careType)}
                        </p>
                        {isExternal && <i className="fa-brands fa-google text-[8px] mt-2 text-indigo-300 block"></i>}
                      </div>
                    );
                  })}
                  <button onClick={() => setModalState({ mode: 'add', data: { nurseId: session?.userId, hour: h } })} className="w-10 h-10 opacity-0 group-hover:opacity-100 flex items-center justify-center text-emerald-300 border-2 border-dashed border-emerald-100 rounded-xl hover:bg-emerald-50 transition-all">
                    <i className="fa-solid fa-plus"></i>
                  </button>
                </div>
              </div>
            )
          })}
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
                  const p = store.patients.find((pat: any) => pat.id === apt.patientId);
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
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm">
                            <i className="fa-solid fa-phone"></i>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Téléphone</p>
                            <a href={`tel:${p?.phone}`} className="text-sm font-bold text-slate-700">{p?.phone}</a>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
                            <i className="fa-solid fa-map-location-dot"></i>
                          </div>
                          <div className="flex-1 min-w-0">
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
                  )
                })()
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</label>
                    <select name="patientId" required defaultValue={modalState.data.patientId} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm">
                      <option value="">Sélectionner un patient...</option>
                      {store.patients.map((p: any) => <option key={p.id} value={p.id}>{p.lastName} {p.firstName}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Infirmier(ère)</label>
                      <select name="nurseId" defaultValue={modalState.data.nurseId} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm">
                        {store.users.filter((u: any) => u.role !== 'admin').map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
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
                  <button type="submit" className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200">Valider et Synchroniser</button>
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
