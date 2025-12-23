
import React, { useState, useEffect } from 'react';
import { getStore, addLog, saveStore, subscribeToStore, updateSettings, getCurrentSession, updateUser } from '../services/store';
import { User, McpServer, ApiConfig, Role } from '../types';

const SettingsView: React.FC = () => {
  const session = getCurrentSession();
  const [store, setStore] = useState(getStore());
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'api' | 'mcp'>('general');
  const [showUserModal, setShowUserModal] = useState<'add' | User | null>(null);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    return subscribeToStore(() => {
      setStore(getStore());
    });
  }, []);

  useEffect(() => {
    if (showSavedToast) {
      const timer = setTimeout(() => setShowSavedToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSavedToast]);

  const handleUpdateGeneralSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateSettings({
      cabinetName: formData.get('cabinetName') as string,
      cabinetPhone: formData.get('cabinetPhone') as string,
      cabinetAddress: formData.get('cabinetAddress') as string,
      defaultCareDuration: parseInt(formData.get('defaultCareDuration') as string),
      workingHoursStart: formData.get('workingHoursStart') as string,
      workingHoursEnd: formData.get('workingHoursEnd') as string,
      autoArchivePrescriptions: (e.currentTarget.elements.namedItem('autoArchive') as HTMLInputElement).checked
    });
    setShowSavedToast(true);
  };

  const handleUpdateApiConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newConfig: Partial<ApiConfig> = {
      twilioSid: formData.get('twilioSid') as string,
      twilioToken: formData.get('twilioToken') as string,
      twilioPhone: formData.get('twilioPhone') as string,
      resendKey: formData.get('resendKey') as string,
      googleCalendarSync: (e.currentTarget.elements.namedItem('googleSync') as HTMLInputElement).checked
    };
    updateSettings({ apiConfig: newConfig as ApiConfig });
    setShowSavedToast(true);
  };

  const handleUserSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session) return;
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const role = formData.get('role') as Role;
    const pin = formData.get('pin') as string;
    const active = (e.currentTarget.elements.namedItem('active') as HTMLInputElement)?.checked ?? true;

    if (showUserModal === 'add') {
      const newUser: User = {
         id: `u-${Date.now()}`,
         firstName,
         lastName,
         role,
         pin,
         active
      };
      saveStore({ users: [...store.users, newUser] });
      addLog(`Nouvel utilisateur créé : ${firstName}`, session.userId);
    } else if (typeof showUserModal === 'object') {
      const updatedUser: User = {
        ...showUserModal,
        firstName,
        lastName,
        role,
        pin,
        active
      };
      updateUser(updatedUser);
    }
    
    setShowUserModal(null);
    setShowSavedToast(true);
  };

  if (!session || session.role === 'infirmiere') return <div className="p-10 text-center font-bold text-rose-500">Accès non autorisé.</div>;

  return (
    <div className="space-y-8 pb-20 relative">
      {showSavedToast && (
        <div className="fixed top-20 right-8 z-[100] animate-in slide-in-from-right duration-300">
           <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400">
              <i className="fa-solid fa-circle-check text-xl"></i>
              <p className="font-black text-sm uppercase tracking-widest">Enregistré avec succès</p>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Configuration Cabinet</h1>
          <p className="text-slate-500 text-sm font-medium">Gérez l'identité de votre structure et votre équipe.</p>
        </div>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
           {(['general', 'team', 'api', 'mcp'] as const).map(tab => {
              if (tab === 'api' && session.role !== 'admin') return null;
              return (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                   {tab === 'general' ? 'Général' : tab === 'team' ? 'Équipe' : tab === 'api' ? 'APIs' : 'MCP'}
                </button>
              );
           })}
        </div>
      </div>

      {activeTab === 'general' && (
        <div className="animate-in fade-in duration-300">
          <form onSubmit={handleUpdateGeneralSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              <h2 className="font-black text-lg text-slate-800 flex items-center gap-2">
                 <i className="fa-solid fa-hospital text-emerald-500"></i>
                 Identité du Cabinet
              </h2>
              <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom commercial</label>
                   <input name="cabinetName" required defaultValue={store.settings.cabinetName} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone professionnel</label>
                   <input name="cabinetPhone" required defaultValue={store.settings.cabinetPhone} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adresse du cabinet</label>
                   <textarea name="cabinetAddress" required defaultValue={store.settings.cabinetAddress} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm h-24" />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                <h2 className="font-black text-lg text-slate-800 flex items-center gap-2">
                   <i className="fa-solid fa-clock text-emerald-500"></i>
                   Fonctionnement & Tournée
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Début tournée</label>
                     <input name="workingHoursStart" type="time" defaultValue={store.settings.workingHoursStart} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fin tournée</label>
                     <input name="workingHoursEnd" type="time" defaultValue={store.settings.workingHoursEnd} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Durée par défaut d'un soin (min)</label>
                   <input name="defaultCareDuration" type="number" defaultValue={store.settings.defaultCareDuration} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                </div>
                <div className="pt-4 space-y-4 border-t border-slate-100">
                   <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-700">Archivage automatique</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ordonnances expirées</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="autoArchive" defaultChecked={store.settings.autoArchivePrescriptions} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                   </div>
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98]">
                Enregistrer les changements
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
           <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">L'Équipe du Cabinet</h2>
                <p className="text-slate-500 text-xs font-medium">Gérez les accès et les profils de vos collaborateurs.</p>
              </div>
              <button 
                onClick={() => setShowUserModal('add')} 
                className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all"
              >
                Ajouter un profil
              </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {store.users.map(user => (
                <div key={user.id} className={`bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col justify-between transition-all group ${user.active ? 'border-slate-200' : 'border-rose-100 bg-rose-50/30 grayscale'}`}>
                   <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${user.active ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                            {user.firstName[0]}
                         </div>
                         <div>
                            <h4 className="font-black text-slate-900 leading-none mb-1">{user.firstName} {user.lastName}</h4>
                            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">{user.role}</p>
                         </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${user.active ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          {user.active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                   </div>
                   
                   <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                      <div className="text-left">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Code PIN</p>
                         <p className="font-mono font-bold text-sm text-slate-600 tracking-widest">••••</p>
                      </div>
                      <div className="flex gap-2">
                         <button 
                           onClick={() => setShowUserModal(user)} 
                           className="w-10 h-10 bg-slate-100 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl flex items-center justify-center transition-all"
                         >
                            <i className="fa-solid fa-pen-to-square"></i>
                         </button>
                         {session.role === 'admin' && user.id !== session.userId && (
                           <button 
                            onClick={() => { if(confirm(`Supprimer l'utilisateur ${user.firstName} ?`)) saveStore({ users: store.users.filter(u => u.id !== user.id) }); }} 
                            className="w-10 h-10 bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl flex items-center justify-center transition-all"
                           >
                            <i className="fa-solid fa-trash-can"></i>
                           </button>
                         )}
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'api' && session.role === 'admin' && (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 duration-300">
           <form onSubmit={handleUpdateApiConfig} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-brands fa-whatsapp text-emerald-500"></i>
                      Twilio WhatsApp
                    </h3>
                    <input name="twilioSid" placeholder="Account SID" defaultValue={store.settings.apiConfig.twilioSid} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                    <input name="twilioToken" type="password" placeholder="Auth Token" defaultValue={store.settings.apiConfig.twilioToken} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                    <input name="twilioPhone" placeholder="Numéro Twilio" defaultValue={store.settings.apiConfig.twilioPhone} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                 </div>
                 <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-calendar-check text-blue-500"></i>
                      Google Calendar
                    </h3>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                         <input type="checkbox" name="googleSync" defaultChecked={store.settings.apiConfig.googleCalendarSync} className="w-5 h-5 rounded text-emerald-500 border-slate-300 focus:ring-emerald-500" />
                         <span className="text-xs font-bold text-slate-700">Synchronisation auto de la tournée cabinet</span>
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Nécessite une configuration OAuth client ID dans la Google Console.</p>
                 </div>
              </div>
              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800">
                Mettre à jour les configurations API
              </button>
           </form>
        </div>
      )}

      {showUserModal && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <form onSubmit={handleUserSubmit} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in duration-200">
               <div className="flex justify-between items-center mb-2">
                 <h3 className="font-black text-xl">{showUserModal === 'add' ? 'Créer un profil' : 'Modifier le profil'}</h3>
                 <button type="button" onClick={() => setShowUserModal(null)} className="text-slate-300 hover:text-slate-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prénom</label>
                    <input name="firstName" required placeholder="Alice" defaultValue={typeof showUserModal === 'object' ? showUserModal.firstName : ''} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</label>
                    <input name="lastName" required placeholder="Martin" defaultValue={typeof showUserModal === 'object' ? showUserModal.lastName : ''} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                  </div>
               </div>
               
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rôle & Permissions</label>
                  <select name="role" required defaultValue={typeof showUserModal === 'object' ? showUserModal.role : 'infirmiere'} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm">
                     <option value="infirmiere">Infirmière Terrain</option>
                     <option value="infirmiereAdmin">Infirmière Coordinatrice</option>
                     <option value="admin">Administrateur Cabinet</option>
                  </select>
               </div>
               
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Code PIN de sécurité</label>
                  <input name="pin" required maxLength={6} minLength={4} placeholder="Code à 4 chiffres" defaultValue={typeof showUserModal === 'object' ? showUserModal.pin : ''} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm font-mono tracking-widest" />
               </div>

               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Compte actif</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="active" defaultChecked={typeof showUserModal === 'object' ? showUserModal.active : true} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
               </div>

               <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200">
                    {showUserModal === 'add' ? 'Créer le compte' : 'Sauvegarder'}
                  </button>
                  <button type="button" onClick={() => setShowUserModal(null)} className="px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest">
                    Annuler
                  </button>
               </div>
            </form>
         </div>
      )}
    </div>
  );
};

export default SettingsView;
