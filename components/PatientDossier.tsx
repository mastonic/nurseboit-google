
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStore, subscribeToStore, addTransmission, getCurrentSession, addLog, updatePatient, saveStore, updateAppointment } from '../services/store';
import { transcribeVoiceNote } from '../services/geminiService';
import { Patient, Transmission, Appointment } from '../types';

const PatientDossier: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = getCurrentSession();
  
  const [store, setStore] = useState(getStore());
  const [activeTab, setActiveTab] = useState<'transmissions' | 'clinique' | 'admin' | 'planning'>('transmissions');
  const [isEditing, setIsEditing] = useState(false);
  
  // States pour les formulaires
  const [editPatient, setEditPatient] = useState<Partial<Patient>>({});
  const [showAptModal, setShowAptModal] = useState<Appointment | 'add' | null>(null);
  
  // Guided Transmission Wizard
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [obs, setObs] = useState('');
  const [alertText, setAlertText] = useState('');
  const [action, setAction] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  const patient = store.patients.find((p: Patient) => p.id === id);
  
  useEffect(() => {
    if (patient) setEditPatient(patient);
  }, [patient]);

  if (!patient) return <div className="p-20 text-center font-bold text-rose-500">Patient introuvable.</div>;

  const transmissions = store.transmissions.filter((t: Transmission) => t.patientId === id);
  const patientAppointments = store.appointments.filter((a: Appointment) => a.patientId === id).sort((a, b) => b.dateTime.localeCompare(a.dateTime));

  // --- LOGIQUE VOCALE ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setIsTranscribing(true);
          try {
            const res = await transcribeVoiceNote(base64, mimeType);
            if (res.transcription) {
              const text = res.transcription;
              if (step === 1) setObs(prev => prev ? `${prev} ${text}` : text);
              if (step === 2) setAlertText(prev => prev ? `${prev} ${text}` : text);
              if (step === 3) setAction(prev => prev ? `${prev} ${text}` : text);
            }
          } catch (e) { console.error(e); } finally { setIsTranscribing(false); }
        };
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) { alert("Microphone refusé."); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  // --- ACTIONS ---
  const handleSaveTransmission = () => {
    if (!obs.trim() || !session) return;
    const fullText = `OBSERVATIONS: ${obs}\nVIGILANCE: ${alertText || 'RAS'}\nACTION À FAIRE: ${action || 'Continuer protocole'}`;
    const newTrans: Transmission = {
      id: Date.now().toString(),
      patientId: patient.id,
      fromId: session.userId,
      fromName: session.name,
      text: fullText,
      category: alertText.length > 5 ? 'urgence' : 'clinique',
      priority: alertText.length > 5 ? 'high' : 'medium',
      status: 'sent',
      timestamp: new Date().toISOString()
    };
    addTransmission(newTrans);
    setObs(''); setAlertText(''); setAction(''); setStep(1);
    addLog(`Nouvelle transmission créée pour ${patient.lastName}`, session.userId);
  };

  const handleUpdateProfile = () => {
    updatePatient(editPatient as Patient);
    setIsEditing(false);
    addLog(`Profil de ${patient.lastName} mis à jour`, session?.userId);
  };

  const handleAptAction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    
    if (showAptModal === 'add') {
      const newApt: Appointment = {
        id: Date.now().toString(),
        patientId: patient.id,
        nurseId: formData.get('nurseId') as string,
        dateTime: `${date}T${time}:00`,
        durationMinutes: parseInt(formData.get('duration') as string),
        type: 'care',
        status: 'scheduled',
        createdBy: session?.userId
      };
      saveStore({ appointments: [...store.appointments, newApt] });
      addLog(`Nouveau soin planifié pour ${patient.lastName}`);
    } else if (typeof showAptModal === 'object') {
      const updated: Appointment = {
        ...showAptModal,
        nurseId: formData.get('nurseId') as string,
        dateTime: `${date}T${time}:00`,
        durationMinutes: parseInt(formData.get('duration') as string),
      };
      updateAppointment(updated);
      addLog(`Soin modifié pour ${patient.lastName}`);
    }
    setShowAptModal(null);
  };

  const deleteApt = (aptId: string) => {
    if (confirm("Supprimer ce rendez-vous ?")) {
      const filtered = store.appointments.filter((a:Appointment) => a.id !== aptId);
      saveStore({ appointments: filtered });
      addLog(`Rendez-vous supprimé pour ${patient.lastName}`);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      {/* Header Premium */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 text-white rounded-2xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl font-black shadow-lg shrink-0">
            {patient.lastName[0]}
          </div>
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight truncate">{patient.lastName} {patient.firstName}</h1>
            <p className="text-slate-400 font-bold text-xs flex items-center gap-2 uppercase tracking-widest truncate">
               <i className="fa-solid fa-location-dot text-emerald-500"></i>
               {patient.address}
            </p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className={`flex-1 md:flex-none px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isEditing ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <i className={`fa-solid ${isEditing ? 'fa-xmark' : 'fa-pen-to-square'}`}></i>
            {isEditing ? 'Annuler' : 'Modifier Profil'}
          </button>
          <button onClick={() => navigate(-1)} className="hidden md:block px-5 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all">Retour</button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 rounded-[1.5rem] md:rounded-[2rem] w-full scrollbar-hide">
        {[
          { id: 'transmissions', label: 'Transmissions', icon: 'fa-repeat' },
          { id: 'clinique', label: 'Soin & Médical', icon: 'fa-stethoscope' },
          { id: 'admin', label: 'Administratif', icon: 'fa-id-card' },
          { id: 'planning', label: 'Planning', icon: 'fa-calendar' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3.5 rounded-[1.2rem] md:rounded-[1.6rem] text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-emerald-500 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i className={`fa-solid ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          
          {/* --- ONGLET TRANSMISSIONS --- */}
          {activeTab === 'transmissions' && (
            <div className="space-y-6 md:space-y-8">
              {!isEditing ? (
                <>
                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-xl">
                  <div className="flex justify-between items-center mb-8 md:mb-10">
                    <h3 className="font-black text-slate-900 uppercase text-[9px] md:text-xs tracking-[0.2em] flex items-center gap-3">
                       <i className="fa-solid fa-wand-magic-sparkles text-emerald-500"></i>
                       Assistant de passation
                    </h3>
                    <div className="flex gap-1.5 md:gap-2">
                       {[1, 2, 3].map(s => <div key={s} className={`h-1.5 w-8 md:w-12 rounded-full transition-all duration-500 ${step >= s ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-100'}`}></div>)}
                    </div>
                  </div>

                  <div className="min-h-[160px]">
                    {step === 1 && (
                      <div className="space-y-4 animate-in slide-in-from-right-4">
                        <label className="text-lg md:text-xl font-black text-slate-800">1. Observations cliniques ?</label>
                        <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: Patient stable, plaie bourgeonnante..." className="w-full p-5 bg-slate-50 border-none rounded-2xl md:rounded-3xl h-32 font-bold focus:ring-4 focus:ring-emerald-500/10 transition-all text-base md:text-lg" />
                      </div>
                    )}
                    {step === 2 && (
                      <div className="space-y-4 animate-in slide-in-from-right-4">
                        <label className="text-lg md:text-xl font-black text-rose-500">2. Points de vigilance ?</label>
                        <textarea value={alertText} onChange={(e) => setAlertText(e.target.value)} placeholder="Ex: Surveiller température, oedème..." className="w-full p-5 bg-rose-50/20 border-none rounded-2xl md:rounded-3xl h-32 font-bold focus:ring-4 focus:ring-rose-500/10 transition-all text-base md:text-lg text-rose-900 placeholder:text-rose-200" />
                      </div>
                    )}
                    {step === 3 && (
                      <div className="space-y-4 animate-in slide-in-from-right-4">
                        <label className="text-lg md:text-xl font-black text-blue-500">3. Action à faire ?</label>
                        <textarea value={action} onChange={(e) => setAction(e.target.value)} placeholder="Ex: Demander renouvellement..." className="w-full p-5 bg-blue-50/20 border-none rounded-2xl md:rounded-3xl h-32 font-bold focus:ring-4 focus:ring-blue-500/10 transition-all text-base md:text-lg text-blue-900 placeholder:text-blue-200" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center mt-10 md:mt-12 gap-6">
                    <div className="flex items-center gap-5 w-full sm:w-auto">
                       <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shrink-0 ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-xl shadow-rose-500/20' : isTranscribing ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white shadow-xl hover:scale-110 active:scale-95'}`}>
                          {isTranscribing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-microphone text-xl"></i>}
                       </button>
                       <div className="flex flex-col min-w-0">
                          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{isRecording ? "Enregistrement..." : isTranscribing ? "Transcription..." : "Maintenir pour dicter"}</p>
                          {isRecording && <p className="text-xs font-black text-rose-500 mt-1">{recordingTime}s</p>}
                       </div>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                       {step > 1 && <button onClick={() => setStep(s => (s - 1) as any)} className="flex-1 sm:flex-none px-6 py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest">Retour</button>}
                       {step < 3 ? <button onClick={() => setStep(s => (s + 1) as any)} className="flex-1 sm:flex-none px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl">Continuer</button>
                       : <button onClick={handleSaveTransmission} className="flex-1 sm:flex-none px-8 py-4 bg-emerald-500 text-slate-950 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20">Diffuser</button>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <h3 className="font-black text-slate-900 text-lg md:text-xl px-2">Historique clinique</h3>
                  {transmissions.map(t => (
                    <div key={t.id} className={`bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border shadow-lg relative overflow-hidden transition-all ${t.priority === 'high' ? 'border-rose-100 shadow-rose-100/20' : 'border-slate-50'}`}>
                       <div className="flex justify-between items-start mb-4 md:mb-6">
                          <div className="flex items-center gap-3 md:gap-4 min-w-0">
                             <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center font-black text-xs shrink-0">{t.fromName[0]}</div>
                             <div className="min-w-0">
                                <p className="text-sm font-black text-slate-900 truncate">{t.fromName}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                             </div>
                          </div>
                          {t.priority === 'high' && <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase shrink-0">Urgent</span>}
                       </div>
                       <div className="space-y-3 text-sm font-bold text-slate-700 leading-relaxed bg-slate-50/50 p-5 rounded-2xl italic border border-slate-50">
                          {t.text.split('\n').map((line, i) => <p key={i} className={line.includes('VIGILANCE') && !line.includes('RAS') ? 'text-rose-600 font-black' : ''}>{line}</p>)}
                       </div>
                    </div>
                  ))}
                </div>
                </>
              ) : (
                <div className="bg-white p-12 md:p-20 rounded-[2.5rem] md:rounded-[3rem] text-center italic text-slate-400 border-2 border-dashed border-slate-100">
                  <i className="fa-solid fa-lock text-3xl mb-4 opacity-10"></i>
                  <p>Veuillez quitter le mode édition pour saisir une nouvelle transmission.</p>
                </div>
              )}
            </div>
          )}

          {/* --- ONGLET SOIN & MÉDICAL --- */}
          {activeTab === 'clinique' && (
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-xl space-y-8 md:space-y-10">
              <div className="flex justify-between items-center">
                 <h3 className="font-black text-xl md:text-2xl text-slate-900">Profil Thérapeutique</h3>
                 {!isEditing && <button onClick={() => setIsEditing(true)} className="w-10 h-10 bg-slate-100 text-emerald-500 rounded-xl flex items-center justify-center hover:bg-emerald-50 transition-all"><i className="fa-solid fa-pen-to-square"></i></button>}
              </div>

              {isEditing ? (
                <div className="space-y-6 md:space-y-8 animate-in fade-in">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type de soins</label>
                    <input value={editPatient.careType || ''} onChange={e => setEditPatient({...editPatient, careType: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Protocoles infirmiers détaillés</label>
                    <textarea value={editPatient.protocoles || ''} onChange={e => setEditPatient({...editPatient, protocoles: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-bold h-48" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pathologies (virgules)</label>
                      <input value={editPatient.pathologies?.join(', ') || ''} onChange={e => setEditPatient({...editPatient, pathologies: e.target.value.split(',').map(s => s.trim())})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Allergies (virgules)</label>
                      <input value={editPatient.allergies?.join(', ') || ''} onChange={e => setEditPatient({...editPatient, allergies: e.target.value.split(',').map(s => s.trim())})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-bold" />
                    </div>
                  </div>
                  <button onClick={handleUpdateProfile} className="w-full py-4 bg-emerald-500 text-slate-950 rounded-xl md:rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20">Sauvegarder</button>
                </div>
              ) : (
                <div className="space-y-8 md:space-y-10">
                  <div className="p-6 md:p-8 bg-emerald-50/50 border border-emerald-100 rounded-2xl md:rounded-3xl">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Protocole Infirmier</p>
                    <p className="text-emerald-900 font-bold whitespace-pre-wrap leading-relaxed text-sm md:text-base">{patient.protocoles || "Aucun protocole saisi."}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Antécédents / Pathologies</p>
                        <div className="flex flex-wrap gap-2">
                           {patient.pathologies?.map(p => <span key={p} className="px-3 py-1.5 bg-slate-100 rounded-lg text-[11px] font-black text-slate-700">{p}</span>) || "Aucun."}
                        </div>
                     </div>
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-rose-500">Allergies connues</p>
                        <div className="flex flex-wrap gap-2">
                           {patient.allergies?.map(a => <span key={a} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[11px] font-black border border-rose-100">{a}</span>) || "Aucune."}
                        </div>
                     </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- ONGLET ADMINISTRATIF --- */}
          {activeTab === 'admin' && (
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-xl space-y-8 md:space-y-10">
              <h3 className="font-black text-xl md:text-2xl text-slate-900">Dossier Administratif</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sécurité Sociale (NIR)</label>
                    <input readOnly={!isEditing} value={isEditing ? (editPatient.nir || '') : (patient.nir || '')} onChange={e => setEditPatient({...editPatient, nir: e.target.value})} className={`w-full p-4 rounded-xl md:rounded-2xl font-bold ${isEditing ? 'bg-slate-50 border border-slate-200' : 'bg-transparent border-none p-0'}`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mutuelle / AMC</label>
                    <input readOnly={!isEditing} value={isEditing ? (editPatient.mutuelle || '') : (patient.mutuelle || '')} onChange={e => setEditPatient({...editPatient, mutuelle: e.target.value})} className={`w-full p-4 rounded-xl md:rounded-2xl font-bold ${isEditing ? 'bg-slate-50 border border-slate-200' : 'bg-transparent border-none p-0'}`} />
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                     <input type="checkbox" checked={isEditing ? !!editPatient.isALD : !!patient.isALD} onChange={e => isEditing && setEditPatient({...editPatient, isALD: e.target.checked})} className="w-5 h-5 text-emerald-500 rounded border-slate-300" />
                     <label className="text-sm font-bold text-slate-700">Patient en ALD (100%)</label>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Médecin Traitant</label>
                    <input readOnly={!isEditing} value={isEditing ? (editPatient.medecinTraitant || '') : (patient.medecinTraitant || '')} onChange={e => setEditPatient({...editPatient, medecinTraitant: e.target.value})} className={`w-full p-4 rounded-xl md:rounded-2xl font-bold ${isEditing ? 'bg-slate-50 border border-slate-200' : 'bg-transparent border-none p-0'}`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Urgence</label>
                    <input readOnly={!isEditing} value={isEditing ? (editPatient.contactUrgence || '') : (patient.contactUrgence || '')} onChange={e => setEditPatient({...editPatient, contactUrgence: e.target.value})} className={`w-full p-4 rounded-xl md:rounded-2xl font-bold ${isEditing ? 'bg-slate-50 border border-slate-200' : 'bg-transparent border-none p-0'}`} />
                  </div>
                </div>
              </div>

              {isEditing && <button onClick={handleUpdateProfile} className="w-full py-4 bg-emerald-500 text-slate-950 rounded-xl md:rounded-2xl font-black uppercase tracking-widest shadow-xl">Sauvegarder Administratif</button>}
            </div>
          )}

          {/* --- ONGLET PLANNING --- */}
          {activeTab === 'planning' && (
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-xl space-y-6 md:space-y-8">
              <div className="flex justify-between items-center">
                 <h3 className="font-black text-xl md:text-2xl text-slate-900">Agenda des Soins</h3>
                 <button onClick={() => setShowAptModal('add')} className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 transition-all"><i className="fa-solid fa-plus"></i></button>
              </div>

              <div className="space-y-3 md:space-y-4">
                 {patientAppointments.length > 0 ? patientAppointments.map(apt => (
                   <div key={apt.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 md:p-6 bg-slate-50 rounded-2xl md:rounded-[2rem] border border-slate-100 gap-4">
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center font-black text-emerald-500 shadow-sm shrink-0">
                            {new Date(apt.dateTime).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                         </div>
                         <div className="min-w-0">
                            <p className="font-black text-slate-900 text-sm md:text-base">Passage de {apt.dateTime.split('T')[1].substring(0, 5)}</p>
                            <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase truncate">{store.users.find(u => u.id === apt.nurseId)?.firstName} • {apt.durationMinutes} min</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                         <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0 ${apt.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                            {apt.status === 'done' ? 'Effectué' : 'Prévu'}
                         </span>
                         <button onClick={() => setShowAptModal(apt)} className="text-slate-400 hover:text-blue-500 p-2"><i className="fa-solid fa-pen"></i></button>
                         <button onClick={() => deleteApt(apt.id)} className="text-slate-400 hover:text-rose-500 p-2"><i className="fa-solid fa-trash-can"></i></button>
                      </div>
                   </div>
                 )) : (
                   <div className="py-20 text-center text-slate-300 italic border-2 border-dashed border-slate-50 rounded-[2rem]">Aucun rendez-vous.</div>
                 )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Améliorée */}
        <div className="space-y-6 md:space-y-8">
           <div className="bg-slate-900 text-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden group">
              <h3 className="font-black text-emerald-400 text-[10px] uppercase tracking-[0.4em] mb-6 md:mb-8">Transmission Interne</h3>
              <div className="relative z-10">
                 {isEditing ? (
                   <textarea value={editPatient.notes || ''} onChange={e => setEditPatient({...editPatient, notes: e.target.value})} className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Notes confidentielles..." />
                 ) : (
                   <p className="text-xs font-bold text-slate-400 leading-relaxed italic whitespace-pre-wrap">{patient.notes || "Aucune note interne."}</p>
                 )}
              </div>
              <i className="fa-solid fa-user-shield absolute -right-10 -bottom-10 text-[12rem] text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-1000"></i>
           </div>

           <div className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-xl space-y-5 md:space-y-6">
              <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-widest text-center">Contact Direct</h3>
              <div className="space-y-4">
                 <a href={`tel:${patient.phone}`} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all group">
                    <div className="w-10 h-10 bg-white text-slate-400 rounded-xl flex items-center justify-center group-hover:text-emerald-500 shadow-sm"><i className="fa-solid fa-phone"></i></div>
                    <p className="text-sm font-black text-slate-700">{patient.phone}</p>
                 </a>
                 <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <div className="w-10 h-10 bg-white text-slate-400 rounded-xl flex items-center justify-center shadow-sm"><i className="fa-solid fa-envelope"></i></div>
                    <p className="text-sm font-black text-slate-700 truncate">{patient.email || "Non renseigné"}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Modal Planning (Add / Edit) */}
      {showAptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 md:p-10 space-y-6 md:space-y-8 animate-in zoom-in">
              <div className="flex justify-between items-center">
                 <h3 className="font-black text-xl md:text-2xl">{showAptModal === 'add' ? 'Nouveau soin' : 'Modifier le soin'}</h3>
                 <button onClick={() => setShowAptModal(null)} className="text-slate-300 hover:text-slate-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
              </div>
              <form onSubmit={handleAptAction} className="space-y-5 md:space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Date</label>
                       <input name="date" type="date" required defaultValue={typeof showAptModal === 'object' ? showAptModal.dateTime.split('T')[0] : new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Heure</label>
                       <input name="time" type="time" required defaultValue={typeof showAptModal === 'object' ? showAptModal.dateTime.split('T')[1].substring(0, 5) : "08:00"} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-bold" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Infirmier(ère)</label>
                    <select name="nurseId" defaultValue={typeof showAptModal === 'object' ? showAptModal.nurseId : session?.userId} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-bold">
                       {store.users.filter(u => u.role !== 'admin').map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Durée (min)</label>
                    <input name="duration" type="number" defaultValue={typeof showAptModal === 'object' ? showAptModal.durationMinutes : "30"} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-bold" />
                 </div>
                 <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest shadow-xl">
                   {showAptModal === 'add' ? 'Confirmer' : 'Mettre à jour'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default PatientDossier;
