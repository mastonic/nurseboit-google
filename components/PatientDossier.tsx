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
  
  const [editPatient, setEditPatient] = useState<Partial<Patient>>({});
  const [showAptModal, setShowAptModal] = useState<Appointment | 'add' | null>(null);
  
  const [step, setStep] = useState<number>(1);
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
    addLog(`Nouvelle transmission pour ${patient.lastName}`, session.userId);
  };

  const handleUpdateProfile = () => {
    updatePatient(editPatient as Patient);
    setIsEditing(false);
    addLog(`Mise à jour profil ${patient.lastName}`, session?.userId);
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
      addLog(`Rendez-vous ajouté pour ${patient.lastName}`);
    } else if (showAptModal && typeof showAptModal === 'object') {
      const updated: Appointment = {
        ...showAptModal,
        nurseId: formData.get('nurseId') as string,
        dateTime: `${date}T${time}:00`,
        durationMinutes: parseInt(formData.get('duration') as string),
      };
      updateAppointment(updated);
      addLog(`Rendez-vous modifié pour ${patient.lastName}`);
    }
    setShowAptModal(null);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">
            {patient.lastName[0]}
          </div>
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-black text-slate-900 truncate">{patient.lastName} {patient.firstName}</h1>
            <div className="flex items-center gap-4">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest truncate">
                 <i className="fa-solid fa-location-dot text-emerald-500 mr-2"></i>{patient.address}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsEditing(!isEditing)} className={`px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isEditing ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {isEditing ? 'Annuler' : 'Modifier Profil'}
          </button>
          <button onClick={() => navigate(-1)} className="px-5 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Retour</button>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 rounded-[2rem] w-full scrollbar-hide">
        {['transmissions', 'clinique', 'admin', 'planning'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-5 py-3.5 rounded-[1.6rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-emerald-500 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {activeTab === 'transmissions' && (
            <div className="space-y-6">
              <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-xl">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest flex items-center gap-3">
                     <i className="fa-solid fa-wand-magic-sparkles text-emerald-500"></i> Assistant IA
                  </h3>
                  <div className="flex gap-2">
                     {[1, 2, 3].map(s => <div key={s} className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= s ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>)}
                  </div>
                </div>

                <div className="min-h-[160px]">
                  {step === 1 && <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Observations cliniques..." className="w-full p-5 bg-slate-50 border-none rounded-3xl h-32 font-bold text-lg" />}
                  {step === 2 && <textarea value={alertText} onChange={e => setAlertText(e.target.value)} placeholder="Points de vigilance (douleur, constantes...)" className="w-full p-5 bg-rose-50/20 border-none rounded-3xl h-32 font-bold text-rose-900 text-lg" />}
                  {step === 3 && <textarea value={action} onChange={e => setAction(e.target.value)} placeholder="Action à réaliser par le prochain collègue..." className="w-full p-5 bg-blue-50/20 border-none rounded-3xl h-32 font-bold text-blue-900 text-lg" />}
                </div>

                <div className="flex justify-between mt-10">
                   <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-xl shadow-rose-200' : 'bg-slate-900 text-white shadow-xl'}`}>
                      {isTranscribing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-microphone text-xl"></i>}
                   </button>
                   <div className="flex gap-3">
                      {step > 1 && <button onClick={() => setStep(s => s - 1)} className="px-6 py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black text-[10px] uppercase">Retour</button>}
                      {step < 3 ? <button onClick={() => setStep(s => s + 1)} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase">Suivant</button>
                      : <button onClick={handleSaveTransmission} className="px-8 py-4 bg-emerald-500 text-slate-950 rounded-[1.5rem] font-black text-[10px] uppercase">Diffuser</button>}
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                {transmissions.map(t => (
                  <div key={t.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-50 shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-black text-xs">{t.fromName[0]}</div>
                        <p className="text-xs font-black text-slate-900">{t.fromName}</p>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl italic">
                      {t.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'clinique' && (
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
               <h3 className="font-black text-slate-900 text-xl">Données Médicales</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                     <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Pathologies</p>
                     <p className="text-sm font-bold">{patient.pathologies?.join(', ') || 'Aucune renseignée'}</p>
                  </div>
                  <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100">
                     <p className="text-[10px] font-black uppercase text-rose-400 mb-2">Allergies</p>
                     <p className="text-sm font-bold text-rose-700">{patient.allergies?.join(', ') || 'Aucune allergie connue'}</p>
                  </div>
                  <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 col-span-2">
                     <p className="text-[10px] font-black uppercase text-emerald-400 mb-2">Protocole de soins</p>
                     <p className="text-sm font-bold">{patient.careType} - {patient.recurrence}</p>
                  </div>
               </div>
            </div>
          )}
          
          {activeTab === 'planning' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-4">
                <h3 className="font-black text-slate-900 text-lg">Prochains passages</h3>
                <button onClick={() => setShowAptModal('add')} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline">+ Ajouter</button>
              </div>
              {patientAppointments.map(apt => (
                <div key={apt.id} className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm flex justify-between items-center hover:border-emerald-200 transition-all">
                  <div>
                    <p className="font-black text-slate-900 text-sm">{new Date(apt.dateTime).toLocaleDateString()} à {apt.dateTime.split('T')[1].substring(0, 5)}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{store.users.find(u => u.id === apt.nurseId)?.firstName} - {apt.type}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${apt.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {apt.status === 'done' ? 'Effectué' : 'Prévu'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
           <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
              <h3 className="font-black text-emerald-400 text-[10px] uppercase tracking-widest mb-6">Résumé Dossier</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                   <span className="text-[10px] font-bold text-slate-400">NIR</span>
                   <span className="text-xs font-black">{patient.nir || 'Non renseigné'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                   <span className="text-[10px] font-bold text-slate-400">ALD 100%</span>
                   <span className={`text-[10px] font-black uppercase ${patient.isALD ? 'text-emerald-400' : 'text-slate-500'}`}>{patient.isALD ? 'Actif' : 'Non'}</span>
                </div>
                <div className={`p-4 rounded-2xl border text-center transition-all ${patient.googleDriveFolderId ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                   <i className={`fa-brands fa-google-drive mb-2 block text-2xl`}></i>
                   <p className="text-[9px] font-black uppercase tracking-widest">
                     {patient.googleDriveFolderId ? 'Accès Google Drive OK' : 'Drive non configuré'}
                   </p>
                </div>
              </div>
           </div>

           {isEditing && (
             <div className="bg-white p-8 rounded-[3rem] border border-rose-100 shadow-xl space-y-6 animate-in slide-in-from-right-4">
                <h3 className="font-black text-slate-900 text-lg uppercase tracking-widest">Édition Profil</h3>
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Adresse</label>
                      <input 
                        value={editPatient.address} 
                        onChange={e => setEditPatient({...editPatient, address: e.target.value})}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm border-none shadow-inner"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Téléphone</label>
                      <input 
                        value={editPatient.phone} 
                        onChange={e => setEditPatient({...editPatient, phone: e.target.value})}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm border-none shadow-inner"
                      />
                   </div>
                </div>
                <button onClick={handleUpdateProfile} className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-200">Enregistrer les modifications</button>
             </div>
           )}
        </div>
      </div>

      {showAptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
           <form onSubmit={handleAptAction} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="font-black text-xl">Planifier un soin</h3>
                 <button type="button" onClick={() => setShowAptModal(null)} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark text-xl"></i></button>
              </div>
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Date</label>
                       <input name="date" type="date" required className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Heure</label>
                       <input name="time" type="time" required className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Infirmier(ère)</label>
                    <select name="nurseId" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm">
                       {store.users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Durée (min)</label>
                    <input name="duration" type="number" defaultValue="20" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" />
                 </div>
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl">Valider</button>
           </form>
        </div>
      )}
    </div>
  );
};

export default PatientDossier;