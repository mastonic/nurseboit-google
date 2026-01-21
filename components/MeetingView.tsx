
import React, { useState, useEffect } from 'react';
import { transcribeMeeting } from '../services/geminiService';
import { getStore, addLog, subscribeToStore, upsertUser, deleteUser, getCurrentSession } from '../services/store';
import { User, Role } from '../types';

const MeetingView: React.FC = () => {
  const [store, setStore] = useState(getStore());
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [rawText, setRawText] = useState("");
  const [showUserModal, setShowUserModal] = useState<User | 'add' | null>(null);

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  const handleGenerate = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    try {
      const result = await transcribeMeeting(rawText);
      setSummary(result);
      addLog("Génération d'un compte-rendu de réunion staff");
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const handleSaveUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const role = formData.get('role') as Role;
    const phone = formData.get('phone') as string;
    const pin = formData.get('pin') as string;
    const calendarId = formData.get('calendarId') as string;

    const userData: User = {
      id: typeof showUserModal === 'object' && showUserModal ? showUserModal.id : `u-${Date.now()}`,
      firstName,
      lastName,
      role,
      phone,
      pin: pin || '1234',
      active: true,
      calendarId: calendarId || undefined
    };
    upsertUser(userData);
    setShowUserModal(null);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce membre ? Cette action est irréversible.")) {
      deleteUser(userId);
      setShowUserModal(null);
      addLog(`Suppression du membre du staff (ID: ${userId})`);
    }
  };

  const currentSession = getCurrentSession();
  const canManageStaff = currentSession?.role === 'admin' || currentSession?.role === 'infirmiereAdmin';

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-500">
      {/* SECTION ÉQUIPE */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff & Équipe</h1>
            <p className="text-slate-500 font-medium">Gérez les membres et la coordination du cabinet.</p>
          </div>
          <button onClick={() => setShowUserModal('add')} className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3">
            <i className="fa-solid fa-user-plus"></i> Nouveau Membre
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {store.users.map(u => (
            <div key={u.id} onClick={() => setShowUserModal(u)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-lg hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden">
              <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl mb-5 group-hover:scale-110 transition-transform">
                {u.firstName[0]}
              </div>
              <h3 className="font-black text-slate-900 leading-tight uppercase text-sm truncate">{u.firstName} {u.lastName}</h3>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">{u.role}</p>

              {u.calendarId && (
                <div className="absolute top-4 right-4 text-emerald-500" title="Calendar Sync Enabled">
                  <i className="fa-solid fa-calendar-check"></i>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-3 text-slate-400">
                <i className="fa-solid fa-phone text-[10px]"></i>
                <span className="text-[10px] font-bold">{u.phone || 'Non renseigné'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION RÉUNION IA */}
      <section className="space-y-6 pt-12 border-t border-slate-100">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-4">
          <i className="fa-solid fa-wand-magic-sparkles text-emerald-500"></i>
          Synthèse de réunion IA
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
            <textarea
              className="w-full h-64 p-6 bg-slate-50 border-none rounded-3xl text-sm font-medium outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
              placeholder="Collez ici les notes brutes de la réunion staff ou dictez les points clés..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            <button onClick={handleGenerate} disabled={isProcessing || !rawText} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl disabled:opacity-50">
              {isProcessing ? <i className="fa-solid fa-spinner fa-spin mr-3"></i> : <i className="fa-solid fa-brain mr-3 text-emerald-400"></i>}
              Générer Compte-rendu IA
            </button>
          </div>

          <div className="space-y-6">
            {summary ? (
              <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl space-y-10 animate-in slide-in-from-right duration-500">
                <section className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.4em]">Décisions Adoptées</h3>
                  <ul className="space-y-4">
                    {summary.decisions.map((d: string, i: number) => (
                      <li key={i} className="flex gap-4 text-sm font-bold text-slate-300">
                        <i className="fa-solid fa-check text-emerald-400 mt-1"></i>
                        {d}
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.4em]">Tâches à dispatcher</h3>
                  <div className="space-y-3">
                    {summary.tasks.map((t: any, i: number) => (
                      <div key={i} className="bg-white/5 p-5 rounded-[1.5rem] border border-white/10 flex justify-between items-center group hover:bg-white/10 transition-all">
                        <div>
                          <p className="font-black text-sm text-white mb-1">{t.title}</p>
                          <p className="text-[9px] text-slate-500 uppercase font-black">{t.owner} • {t.deadline}</p>
                        </div>
                        <i className="fa-solid fa-circle-arrow-right text-emerald-500 opacity-0 group-hover:opacity-100 transition-all"></i>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center p-20 text-center text-slate-300">
                <i className="fa-solid fa-microphone-lines text-6xl mb-6 opacity-5"></i>
                <p className="font-black text-xs uppercase tracking-widest opacity-20">En attente des notes du staff...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <form onSubmit={handleSaveUser} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 space-y-6 animate-in zoom-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-2xl">{showUserModal === 'add' ? 'Nouveau Membre' : 'Modifier Profil'}</h3>
              <button type="button" onClick={() => setShowUserModal(null)} className="text-slate-300 hover:text-slate-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Prénom</label>
                  <input name="firstName" required defaultValue={typeof showUserModal === 'object' ? showUserModal.firstName : ''} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nom</label>
                  <input name="lastName" required defaultValue={typeof showUserModal === 'object' ? showUserModal.lastName : ''} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Rôle Cabinet</label>
                <select name="role" defaultValue={typeof showUserModal === 'object' ? showUserModal.role : 'infirmiere'} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase">
                  <option value="infirmiere">Infirmier(ère)</option>
                  <option value="infirmiereAdmin">Infirmier(ère) Coordinatrice</option>
                  <option value="admin">Administrateur Cabinet</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Téléphone</label>
                <input name="phone" required defaultValue={typeof showUserModal === 'object' ? showUserModal.phone : ''} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Google Calendar ID</label>
                <input name="calendarId" defaultValue={typeof showUserModal === 'object' ? showUserModal.calendarId : ''} placeholder="exemple@gmail.com ou ID-agenda" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                <p className="text-[9px] text-slate-400 italic ml-1">Utilisé pour la synchronisation du planning.</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Code PIN (4 chiffres)</label>
                <input name="pin" maxLength={4} defaultValue={typeof showUserModal === 'object' ? showUserModal.pin : '1234'} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-center tracking-[1em]" />
              </div>
            </div>
            <div className="flex gap-4">
              <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl">
                Enregistrer le membre
              </button>
              {typeof showUserModal === 'object' && showUserModal && canManageStaff && showUserModal.id !== currentSession?.userId && (
                <button
                  type="button"
                  onClick={() => handleDeleteUser(showUserModal.id)}
                  className="px-6 py-4 bg-rose-50 text-rose-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                  title="Supprimer définitivement"
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MeetingView;
