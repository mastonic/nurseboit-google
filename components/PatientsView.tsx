
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStore, addLog, updatePatient, subscribeToStore, getCurrentSession, addPatient } from '../services/store';
import { Patient, User } from '../types';

const PatientsView: React.FC = () => {
   const navigate = useNavigate();
   const session = getCurrentSession();
   const [store, setStore] = useState(getStore());
   const [viewMode, setViewMode] = useState<'me' | 'cabinet'>(session?.role === 'admin' ? 'cabinet' : 'me');
   const [searchTerm, setSearchTerm] = useState('');
   const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
   const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

   useEffect(() => {
      return subscribeToStore(() => {
         setStore(getStore());
      });
   }, []);

   const patients = useMemo(() => {
      if (viewMode === 'me' && session) {
         return store.patients.filter(p =>
            (p.assignedNurseIds?.includes(session.userId)) ||
            (p.createdBy === session.userId) ||
            (store.appointments.some(a => a.patientId === p.id && a.nurseId === session.userId))
         );
      }
      return store.patients;
   }, [store.patients, store.appointments, viewMode, session]);

   const filteredPatients = patients.filter(p =>
      p.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.includes(searchTerm)
   );

   const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!session) return;
      const formData = new FormData(e.currentTarget);

      const assignedNurseIds = Array.from(formData.getAll('assignedNurseIds')) as string[];
      const pathologies = (formData.get('pathologies') as string).split(',').map(s => s.trim()).filter(s => s !== '');
      const allergies = (formData.get('allergies') as string).split(',').map(s => s.trim()).filter(s => s !== '');

      const patientData: Partial<Patient> = {
         lastName: formData.get('lastName') as string,
         firstName: formData.get('firstName') as string,
         phone: formData.get('phone') as string,
         address: formData.get('address') as string,
         birthDate: formData.get('birthDate') as string,
         nir: formData.get('nir') as string,
         isALD: formData.get('isALD') === 'on',
         careType: formData.get('careType') as string,
         recurrence: formData.get('recurrence') as string,
         medecinTraitant: formData.get('medecinTraitant') as string,
         mutuelle: formData.get('mutuelle') as string,
         notes: formData.get('notes') as string,
         pathologies,
         allergies,
         assignedNurseIds
      };

      if (modalMode === 'add') {
         const newPatient: Patient = {
            ...patientData as Patient,
            id: crypto.randomUUID(),
            createdBy: session.userId,
         };
         addPatient(newPatient);
         // saveStore({ patients: [...store.patients, newPatient] }); // Remplace par addPatient
         addLog(`Nouveau patient créé: ${newPatient.lastName}`, session.userId);
      } else if (modalMode === 'edit' && selectedPatient) {
         const updated = { ...selectedPatient, ...patientData };
         updatePatient(updated as Patient);
         addLog(`Patient mis à jour: ${updated.lastName}`, session.userId);
      }
      setModalMode(null);
   };

   return (
      <div className="space-y-6 animate-in fade-in duration-500">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dossiers Patients</h1>
               <p className="text-slate-500 text-sm font-medium tracking-tight">Gérez les dossiers et les attributions du staff.</p>
            </div>

            <div className="flex flex-wrap gap-2">
               <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mr-2 shadow-inner">
                  <button onClick={() => setViewMode('me')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'me' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Mes Patients</button>
                  <button onClick={() => setViewMode('cabinet')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'cabinet' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Tout le Cabinet</button>
               </div>
               <button
                  onClick={() => { setSelectedPatient(null); setModalMode('add'); }}
                  className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-emerald-500 hover:text-slate-950 shadow-lg transition-all"
               >
                  <i className="fa-solid fa-user-plus text-[10px]"></i>
                  Nouveau Patient
               </button>
            </div>
         </div>

         <div className="relative group">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"></i>
            <input
               type="text"
               placeholder="Recherche rapide (Nom, Prénom, Téléphone...)"
               className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-sm"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map(patient => (
               <div
                  key={patient.id}
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-xl transition-all group relative cursor-pointer"
               >
                  <div className="absolute top-4 right-4 flex gap-2">
                     {patient.isALD && <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">ALD</span>}
                     <button onClick={(e) => { e.stopPropagation(); setSelectedPatient(patient); setModalMode('edit'); }} className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"><i className="fa-solid fa-pen-to-square text-sm"></i></button>
                  </div>
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                     {patient.lastName?.[0] || '?'}
                  </div>
                  <h3 className="font-black text-xl text-slate-900 leading-tight mb-1">{patient.lastName} {patient.firstName}</h3>
                  <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-4 truncate">{patient.careType || 'Non spécifié'}</p>

                  <div className="space-y-2 text-xs font-bold text-slate-400 italic">
                     <p className="flex items-center gap-2"><i className="fa-solid fa-phone text-slate-300 text-[10px]"></i>{patient.phone || 'N/A'}</p>
                     <p className="truncate flex items-center gap-2"><i className="fa-solid fa-location-dot text-slate-300 text-[10px]"></i>{patient.address || 'N/A'}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                     <div className="flex -space-x-2">
                        {(patient.assignedNurseIds || []).slice(0, 3).map(nid => (
                           <div key={nid} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-500" title={store.users.find(u => u.id === nid)?.firstName}>
                              {store.users.find(u => u.id === nid)?.firstName[0]}
                           </div>
                        ))}
                        {(patient.assignedNurseIds?.length || 0) > 3 && (
                           <div className="w-6 h-6 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400">
                              +{patient.assignedNurseIds!.length - 3}
                           </div>
                        )}
                        {(!patient.assignedNurseIds || patient.assignedNurseIds.length === 0) && (
                           <span className="text-[9px] font-bold text-slate-300">Non attribué</span>
                        )}
                     </div>
                     <span className="text-emerald-500 text-[10px] font-black uppercase flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                        Dossier <i className="fa-solid fa-arrow-right"></i>
                     </span>
                  </div>
               </div>
            ))}
         </div>

         {modalMode && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 overflow-y-auto">
               <form onSubmit={handleSave} className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl animate-in zoom-in duration-300 overflow-hidden my-auto">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                     <div>
                        <h3 className="font-black text-2xl text-slate-900">{modalMode === 'add' ? 'Nouveau Patient' : 'Modifier le Dossier'}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Édition complète des données de santé</p>
                     </div>
                     <button type="button" onClick={() => setModalMode(null)} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 shadow-sm transition-all"><i className="fa-solid fa-xmark text-lg"></i></button>
                  </div>

                  <div className="p-10 space-y-10 max-h-[75vh] overflow-y-auto scrollbar-hide">

                     {/* SECTION 1: IDENTITÉ */}
                     <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3">
                           <i className="fa-solid fa-id-card"></i> État Civil & Identité
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom de famille</label>
                              <input name="lastName" required placeholder="DUPONT" defaultValue={selectedPatient?.lastName} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                              <input name="firstName" required placeholder="Jean" defaultValue={selectedPatient?.firstName} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone mobile</label>
                              <input name="phone" required placeholder="06 00 00 00 00" defaultValue={selectedPatient?.phone} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de naissance</label>
                              <input name="birthDate" type="date" defaultValue={selectedPatient?.birthDate} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse complète</label>
                           <input name="address" required placeholder="12 rue de la Paix, 75000 Paris" defaultValue={selectedPatient?.address} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                        </div>
                     </div>

                     {/* SECTION 2: CLINIQUE */}
                     <div className="space-y-6 pt-6 border-t border-slate-50">
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3">
                           <i className="fa-solid fa-stethoscope"></i> Données Cliniques
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type de soin (Intitulé)</label>
                              <input name="careType" required placeholder="Pansement complexe, Insuline..." defaultValue={selectedPatient?.careType} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Récurrence</label>
                              <input name="recurrence" required placeholder="Quotidien, 1x/sem..." defaultValue={selectedPatient?.recurrence} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pathologies (séparées par des virgules)</label>
                              <input name="pathologies" placeholder="Diabète, HTA..." defaultValue={selectedPatient?.pathologies?.join(', ')} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Allergies (séparées par des virgules)</label>
                              <input name="allergies" placeholder="Pénicilline..." defaultValue={selectedPatient?.allergies?.join(', ')} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes & Protocoles particuliers</label>
                           <textarea name="notes" defaultValue={selectedPatient?.notes} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm h-24 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" placeholder="Passage code porte, précautions d'hygiène..."></textarea>
                        </div>
                     </div>

                     {/* SECTION 3: ADMIN */}
                     <div className="space-y-6 pt-6 border-t border-slate-50">
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3">
                           <i className="fa-solid fa-briefcase"></i> Administration & Facturation
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NIR (Sécurité Sociale)</label>
                              <input name="nir" placeholder="1 80 00 00 000 000" defaultValue={selectedPatient?.nir} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Médecin Traitant</label>
                              <input name="medecinTraitant" placeholder="Dr. Legrand" defaultValue={selectedPatient?.medecinTraitant} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Complémentaire / Mutuelle</label>
                              <input name="mutuelle" placeholder="MGEN, Alan..." defaultValue={selectedPatient?.mutuelle} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                           </div>
                           <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl mt-4 self-end h-[56px] border border-slate-100">
                              <input type="checkbox" name="isALD" id="isALD" defaultChecked={selectedPatient?.isALD} className="w-5 h-5 text-emerald-500 rounded border-slate-300 transition-all cursor-pointer" />
                              <label htmlFor="isALD" className="text-[11px] font-black text-slate-700 uppercase tracking-widest cursor-pointer">Patient ALD (100%)</label>
                           </div>
                        </div>
                     </div>

                     {/* SECTION 4: ASSIGNATION */}
                     <div className="space-y-6 pt-6 border-t border-slate-50 pb-10">
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3">
                           <i className="fa-solid fa-user-plus"></i> Attribution du Staff
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 italic">Cochez les membres du cabinet responsables de ce dossier :</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                           {store.users.filter(u => u.role !== 'admin').map((u: User) => (
                              <label key={u.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md transition-all cursor-pointer">
                                 <input
                                    type="checkbox"
                                    name="assignedNurseIds"
                                    value={u.id}
                                    defaultChecked={selectedPatient?.assignedNurseIds?.includes(u.id)}
                                    className="w-5 h-5 text-emerald-500 rounded border-slate-300"
                                 />
                                 <div>
                                    <p className="text-xs font-black text-slate-800">{u.firstName} {u.lastName}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{u.role}</p>
                                 </div>
                              </label>
                           ))}
                        </div>
                     </div>

                  </div>

                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                     <button type="button" onClick={() => setModalMode(null)} className="flex-1 py-4 bg-white text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-200 hover:bg-slate-50 transition-all">Annuler</button>
                     <button type="submit" className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-emerald-500 hover:text-slate-950 transition-all">
                        {modalMode === 'add' ? 'Créer le dossier' : 'Enregistrer les modifications'}
                     </button>
                  </div>
               </form>
            </div>
         )}
      </div>
   );
};

export default PatientsView;
