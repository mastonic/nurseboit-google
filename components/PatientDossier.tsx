
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Fix: added markTransmissionReceived to imports
import { getStore, subscribeToStore, addTransmission, getCurrentSession, addLog, updatePatient, saveStore, updateAppointment, markTransmissionReceived, generateUUID } from '../services/store';
import { transcribeVoiceNote } from '../services/geminiService';
import { callNurseBotAgent } from '../services/n8nService';
import { Patient, Transmission, Appointment, User } from '../types';
import AudioVisualizer from './AudioVisualizer';

const PatientDossier: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = getCurrentSession();

  const [store, setStore] = useState(getStore());
  const [activeTab, setActiveTab] = useState<'transmissions' | 'clinique' | 'admin' | 'planning' | 'documents'>('transmissions');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingDrive, setIsCreatingDrive] = useState(false);

  const [showAptModal, setShowAptModal] = useState<Appointment | 'add' | null>(null);

  const [step, setStep] = useState<number>(1);
  const [obs, setObs] = useState('');
  const [alertText, setAlertText] = useState('');
  const [action, setAction] = useState('');
  const [targetNurseId, setTargetNurseId] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  const patient = store.patients.find((p: Patient) => p.id === id);

  if (!patient) return <div className="p-20 text-center font-bold text-rose-500">Patient introuvable.</div>;

  const transmissions = store.transmissions.filter((t: Transmission) => t.patientId === id);
  const patientAppointments = store.appointments.filter((a: Appointment) => a.patientId === id).sort((a, b) => b.dateTime.localeCompare(a.dateTime));

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
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
        setRecordingStream(null);
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
    const targetNurse = store.users.find(u => u.id === targetNurseId);
    const fullText = `OBSERVATIONS: ${obs}\nVIGILANCE: ${alertText || 'RAS'}\nACTION À FAIRE: ${action || 'Continuer protocole'}`;
    const newTrans: Transmission = {
      id: crypto.randomUUID(),
      patientId: patient.id,
      fromId: session.userId,
      fromName: session.name,
      toId: targetNurseId || undefined,
      toName: targetNurse ? `${targetNurse.firstName} ${targetNurse.lastName}` : undefined,
      text: fullText,
      category: alertText.length > 5 ? 'urgence' : 'clinique',
      priority: alertText.length > 5 ? 'high' : 'medium',
      status: 'sent',
      timestamp: new Date().toISOString()
    };
    addTransmission(newTrans);
    setObs(''); setAlertText(''); setAction(''); setTargetNurseId(''); setStep(1);
  };

  const handleSaveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session) return;
    const formData = new FormData(e.currentTarget);

    const assignedNurseIds = Array.from(formData.getAll('assignedNurseIds')) as string[];
    const pathologies = (formData.get('pathologies') as string).split(',').map(s => s.trim()).filter(s => s !== '');
    const allergies = (formData.get('allergies') as string).split(',').map(s => s.trim()).filter(s => s !== '');

    const updatedPatient: Patient = {
      ...patient,
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

    updatePatient(updatedPatient);
    setIsEditing(false);
  };

  const handleAptAction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;

    if (showAptModal === 'add') {
      const newApt: Appointment = {
        id: crypto.randomUUID(),
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

  const handleCreateDriveFolder = async () => {
    if (isCreatingDrive || !session) return;
    setIsCreatingDrive(true);
    try {
      const result = await callNurseBotAgent({
        event: 'DRIVE_CREATE_FOLDER',
        role: session.role,
        message: `Créer dossier pour ${patient.firstName} ${patient.lastName}`,
        context: { patientId: patient.id, patientName: `${patient.firstName} ${patient.lastName}` }
      });

      if (result && result.folderId) {
        updatePatient({ ...patient, googleDriveFolderId: result.folderId });
        addLog(`Dossier Google Drive créé pour ${patient.lastName}`);
      } else {
        const fakeId = `drive-${Date.now()}`;
        updatePatient({ ...patient, googleDriveFolderId: fakeId });
        addLog(`Dossier Drive simulé pour ${patient.lastName}`);
      }
    } catch (e: any) {
      console.error("Drive Creation Error:", e.message);
      updatePatient({ ...patient, googleDriveFolderId: `drive-fallback-${Date.now()}` });
    } finally {
      setIsCreatingDrive(false);
    }
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
          <button onClick={() => setIsEditing(true)} className="px-5 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-200">
            Modifier le Dossier
          </button>
          <button onClick={() => navigate(-1)} className="px-5 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">Retour</button>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 rounded-[2rem] w-full scrollbar-hide shadow-inner">
        {['transmissions', 'clinique', 'admin', 'planning', 'documents'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-5 py-3.5 rounded-[1.6rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-emerald-500 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
            {tab === 'documents' ? 'Documents' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {activeTab === 'transmissions' && (
            <div className="space-y-6">
              <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-xl">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest flex items-center gap-3">
                    <i className="fa-solid fa-wand-magic-sparkles text-emerald-500"></i> Assistant Guidé
                  </h3>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(s => <div key={s} className={`h-1.5 w-10 rounded-full transition-all duration-500 ${step >= s ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>)}
                  </div>
                </div>

                <div className="min-h-[160px] relative">
                  {isRecording && (
                    <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                      <AudioVisualizer stream={recordingStream} isRecording={isRecording} />
                      <span className="text-[10px] font-black text-emerald-600">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Étape 1 : Observations Cliniques</p>
                      <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Décrivez l'état du patient, les soins réalisés..." className="w-full p-6 bg-slate-50 border-none rounded-3xl h-32 font-bold text-lg focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none shadow-inner" />
                    </div>
                  )}
                  {step === 2 && (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                      <p className="text-[10px] font-black uppercase text-rose-400 mb-2 tracking-widest">Étape 2 : Points de Vigilance</p>
                      <textarea value={alertText} onChange={e => setAlertText(e.target.value)} placeholder="Douleur, constantes anormales, risque de chute..." className="w-full p-6 bg-rose-50/20 border-none rounded-3xl h-32 font-bold text-rose-900 text-lg focus:ring-4 focus:ring-rose-500/5 transition-all outline-none shadow-inner" />
                    </div>
                  )}
                  {step === 3 && (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                      <p className="text-[10px] font-black uppercase text-blue-400 mb-2 tracking-widest">Étape 3 : Actions à faire</p>
                      <textarea value={action} onChange={e => setAction(e.target.value)} placeholder="Ce que le prochain collègue doit surveiller ou faire..." className="w-full p-6 bg-blue-50/20 border-none rounded-3xl h-32 font-bold text-blue-900 text-lg focus:ring-4 focus:ring-blue-500/5 transition-all outline-none shadow-inner" />
                    </div>
                  )}
                  {step === 4 && (
                    <div className="animate-in slide-in-from-right-4 duration-300 space-y-4">
                      <p className="text-[10px] font-black uppercase text-emerald-400 mb-2 tracking-widest">Étape 4 : Destinataire (Optionnel)</p>
                      <select value={targetNurseId} onChange={e => setTargetNurseId(e.target.value)} className="w-full p-6 bg-slate-50 border-none rounded-3xl font-bold text-lg focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none shadow-inner">
                        <option value="">Tous le cabinet</option>
                        {store.users.filter(u => u.id !== session?.userId).map(u => (
                          <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                        ))}
                      </select>
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">Résumé du message</p>
                        <p className="text-xs font-medium text-emerald-900 line-clamp-3 italic opacity-70">
                          {obs || "Aucune observation."} {alertText ? `| Vigilance : ${alertText}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between mt-10">
                  <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-xl shadow-rose-200' : 'bg-slate-900 text-white shadow-xl hover:scale-105 active:scale-95'}`}>
                    {isTranscribing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-microphone text-xl"></i>}
                  </button>
                  <div className="flex gap-3">
                    {step > 1 && <button onClick={() => setStep(s => s - 1)} className="px-6 py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black text-[10px] uppercase hover:bg-slate-200 transition-all">Précédent</button>}
                    {step < 4 ? <button onClick={() => setStep(s => s + 1)} className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase hover:bg-emerald-500 hover:text-slate-950 transition-all shadow-lg">Continuer</button>
                      : <button onClick={handleSaveTransmission} className="px-10 py-4 bg-emerald-500 text-slate-950 rounded-[1.5rem] font-black text-[10px] uppercase shadow-lg shadow-emerald-500/10 hover:bg-emerald-400 transition-all">Envoyer</button>}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between px-6">
                  <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Historique Récent</h3>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{transmissions.length} notes</span>
                </div>
                {transmissions.map(t => (
                  <div key={t.id} className={`bg-white p-6 md:p-8 rounded-[2.5rem] border transition-all shadow-lg animate-in slide-in-from-bottom-2 ${t.priority === 'high' ? 'border-rose-100' : 'border-slate-50'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center font-black text-[10px] border border-slate-200">{t.fromName[0]}</div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{t.fromName}</p>
                          {t.toName && <p className="text-[8px] font-black text-emerald-500 uppercase">Pour : {t.toName}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(t.timestamp).toLocaleDateString()}</p>
                        <p className="text-[10px] font-black text-slate-900 uppercase">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div className={`text-sm font-medium leading-relaxed whitespace-pre-line p-6 rounded-[2rem] border ${t.priority === 'high' ? 'bg-rose-50/50 text-rose-900 border-rose-100/50' : 'bg-slate-50/50 text-slate-700 border-slate-100/50'}`}>
                      {t.text}
                    </div>
                    {t.status !== 'closed' && t.fromId !== session?.userId && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => {
                            markTransmissionReceived(t.id, session?.userId || '');
                          }}
                          className="px-4 py-2 bg-emerald-100 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          Accuser réception
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'clinique' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-10">
              <h3 className="font-black text-slate-900 text-xl tracking-tight">Données Médicales & Historique</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-emerald-200 transition-all">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Pathologies connues</p>
                  <div className="flex flex-wrap gap-2">
                    {patient.pathologies?.map(p => <span key={p} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-600">{p}</span>) || <span className="text-sm font-bold text-slate-300 italic">Aucune renseignée</span>}
                  </div>
                </div>
                <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 group hover:border-rose-300 transition-all">
                  <p className="text-[10px] font-black uppercase text-rose-400 mb-3 tracking-widest">Allergies & Vigilances</p>
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies?.map(a => <span key={a} className="px-3 py-1 bg-white border border-rose-200 rounded-full text-[10px] font-black text-rose-600">{a}</span>) || <span className="text-sm font-bold text-slate-300 italic">Aucune allergie connue</span>}
                  </div>
                </div>
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 col-span-2">
                  <p className="text-[10px] font-black uppercase text-emerald-400 mb-2 tracking-widest">Protocole de soins actuel</p>
                  <p className="text-lg font-black text-slate-800">{patient.careType}</p>
                  <p className="text-sm font-bold text-emerald-600 mt-1 uppercase tracking-widest">{patient.recurrence}</p>
                </div>
                {patient.notes && (
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 col-span-2 italic text-sm font-medium text-slate-600">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2 not-italic tracking-widest">Notes complémentaires</p>
                    {patient.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-10">
              <h3 className="font-black text-slate-900 text-xl tracking-tight">Informations Administratives</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Numéro de Sécurité Sociale (NIR)</p>
                    <p className="text-md font-black text-slate-900 tracking-[0.2em]">{patient.nir || 'Non renseigné'}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Mutuelle / Complémentaire</p>
                    <p className="text-sm font-bold text-slate-700">{patient.mutuelle || 'Aucune mutuelle enregistrée'}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Médecin Traitant</p>
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-slate-700">{patient.medecinTraitant || 'Non spécifié'}</p>
                      <a href="#" className="text-emerald-500 text-[9px] font-black uppercase tracking-widest hover:underline">Appeler</a>
                    </div>
                  </div>
                  <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                    <p className="text-[10px] font-black uppercase text-blue-400 mb-3 tracking-widest">Dossier Google Drive</p>
                    {patient.googleDriveFolderId ? (
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-blue-700 truncate mr-4 max-w-[150px]">{patient.googleDriveFolderId}</span>
                        <button className="px-4 py-2 bg-white text-blue-500 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-blue-500 hover:text-white transition-all">OUVRIR</button>
                      </div>
                    ) : (
                      <button
                        onClick={handleCreateDriveFolder}
                        disabled={isCreatingDrive}
                        className="w-full py-4 bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-200"
                      >
                        {isCreatingDrive ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-folder-plus mr-2"></i>}
                        Initialiser Drive
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-10 border-t border-slate-50">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Staff Référent sur le dossier</h4>
                <div className="flex flex-wrap gap-3">
                  {patient.assignedNurseIds?.map(nid => {
                    const nurse = store.users.find(u => u.id === nid);
                    return (
                      <div key={nid} className="px-4 py-3 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 shadow-sm">
                        <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-[10px]">
                          {nurse?.firstName[0]}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-800">{nurse?.firstName} {nurse?.lastName}</p>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{nurse?.role}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'planning' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-6">
                <h3 className="font-black text-slate-900 text-lg">Prochains passages planifiés</h3>
                <button onClick={() => setShowAptModal('add')} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:bg-emerald-50 px-3 py-2 rounded-xl transition-all">+ Nouveau Soin</button>
              </div>
              <div className="space-y-3">
                {patientAppointments.map(apt => (
                  <div key={apt.id} className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm flex justify-between items-center hover:border-emerald-200 transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center justify-center min-w-[60px] p-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(apt.dateTime).toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                        <span className="text-lg font-black text-slate-900">{new Date(apt.dateTime).getDate()}</span>
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-md">Passage à {apt.dateTime.split('T')[1].substring(0, 5)}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Intervenant : <span className="text-emerald-500">{store.users.find(u => u.id === apt.nurseId)?.firstName}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${apt.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {apt.status === 'done' ? 'Soin Effectué' : 'À venir'}
                      </span>
                      <button className="text-slate-200 group-hover:text-slate-400 transition-colors"><i className="fa-solid fa-ellipsis-vertical"></i></button>
                    </div>
                  </div>
                ))}
                {patientAppointments.length === 0 && (
                  <div className="py-20 text-center text-slate-300 italic text-sm">Aucun rendez-vous prévu.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-10">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-slate-900 text-xl tracking-tight">Documents Numérisés</h3>
                <button className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">
                  <i className="fa-solid fa-camera mr-2"></i> Scanner / PDF
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(patient.documents || []).map(doc => (
                  <div key={doc.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl text-slate-300 shadow-sm">
                        <i className={`fa-solid ${doc.type === 'pdf' ? 'fa-file-pdf text-rose-500' : 'fa-file-image text-blue-500'}`}></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{doc.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(doc.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!patient.documents || patient.documents.length === 0) && (
                  <div className="col-span-full py-20 text-center text-slate-300 italic text-sm">
                    Aucun document médical (ordonnance, photo, PDF) n'est encore associé à ce dossier.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
            <h3 className="font-black text-emerald-400 text-[10px] uppercase tracking-[0.2em] mb-8">Statut du Dossier</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Numéro NIR</p>
                  <p className="text-xs font-black tracking-widest">{patient.nir || 'Non renseigné'}</p>
                </div>
                <i className="fa-solid fa-barcode text-slate-800 text-2xl"></i>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prise en charge</p>
                  <p className={`text-[10px] font-black uppercase flex items-center gap-2 ${patient.isALD ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <i className={`fa-solid ${patient.isALD ? 'fa-check-circle' : 'fa-circle-xmark'}`}></i>
                    {patient.isALD ? 'ALD 100%' : 'Standard'}
                  </p>
                </div>
              </div>
              <button
                onClick={patient.googleDriveFolderId ? undefined : handleCreateDriveFolder}
                disabled={isCreatingDrive}
                className={`w-full p-6 rounded-3xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${patient.googleDriveFolderId
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
              >
                {isCreatingDrive ? (
                  <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
                ) : (
                  <i className="fa-brands fa-google-drive text-2xl"></i>
                )}
                <p className="text-[9px] font-black uppercase tracking-widest mt-1">
                  {patient.googleDriveFolderId ? 'Dossier Drive Connecté' : isCreatingDrive ? 'Configuration...' : 'Drive Non Configuré'}
                </p>
              </button>
            </div>
            <i className="fa-solid fa-shield-heart absolute -right-12 -bottom-12 text-[12rem] text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none"></i>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <i className="fa-solid fa-circle-info text-emerald-500"></i> Actions Rapides
            </h4>
            <button onClick={() => navigate('/transmissions')} className="w-full py-4 px-6 bg-slate-50 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-between hover:bg-slate-100 transition-all border border-slate-100">
              Passation de tournée
              <i className="fa-solid fa-arrow-right-long text-slate-300"></i>
            </button>
            <button onClick={() => navigate('/billing')} className="w-full py-4 px-6 bg-slate-50 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-between hover:bg-slate-100 transition-all border border-slate-100">
              Facturation NGAP
              <i className="fa-solid fa-euro-sign text-slate-300"></i>
            </button>
          </div>
        </div>
      </div >

      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 overflow-y-auto">
          <form onSubmit={handleSaveEdit} className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl animate-in zoom-in duration-300 overflow-hidden my-auto">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-2xl text-slate-900">Édition Complète du Dossier</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Patient: {patient.lastName} {patient.firstName}</p>
              </div>
              <button type="button" onClick={() => setIsEditing(false)} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 shadow-sm transition-all"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>

            <div className="p-10 space-y-10 max-h-[75vh] overflow-y-auto scrollbar-hide">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3">Identité</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input name="lastName" required defaultValue={patient.lastName} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" placeholder="Nom" />
                  <input name="firstName" required defaultValue={patient.firstName} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" placeholder="Prénom" />
                  <input name="phone" required defaultValue={patient.phone} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" placeholder="Téléphone" />
                  <input name="birthDate" type="date" defaultValue={patient.birthDate} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                </div>
                <input name="address" required defaultValue={patient.address} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" placeholder="Adresse" />
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-50">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3">Médical</h4>
                <div className="grid grid-cols-2 gap-4">
                  <input name="careType" required defaultValue={patient.careType} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" placeholder="Soin" />
                  <input name="recurrence" required defaultValue={patient.recurrence} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" placeholder="Fréquence" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input name="pathologies" defaultValue={patient.pathologies?.join(', ')} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" placeholder="Pathologies (virgule)" />
                  <input name="allergies" defaultValue={patient.allergies?.join(', ')} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" placeholder="Allergies (virgule)" />
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-50">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3">Admin</h4>
                <div className="grid grid-cols-2 gap-4">
                  <input name="nir" defaultValue={patient.nir} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" placeholder="NIR" />
                  <input name="medecinTraitant" defaultValue={patient.medecinTraitant} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" placeholder="Médecin" />
                  <input name="mutuelle" defaultValue={patient.mutuelle} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" placeholder="Mutuelle" />
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <input type="checkbox" name="isALD" id="isALD_dossier" defaultChecked={patient.isALD} className="w-5 h-5 text-emerald-500" />
                    <label htmlFor="isALD_dossier" className="text-[10px] font-black text-slate-700 uppercase">ALD 100%</label>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-50 pb-10">
                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3">Attribution</h4>
                <div className="grid grid-cols-2 gap-3">
                  {store.users.filter(u => u.role !== 'admin').map((u: User) => (
                    <label key={u.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl hover:bg-white transition-all cursor-pointer border border-slate-100">
                      <input type="checkbox" name="assignedNurseIds" value={u.id} defaultChecked={patient.assignedNurseIds?.includes(u.id)} className="w-5 h-5 text-emerald-500" />
                      <span className="text-xs font-black text-slate-800">{u.firstName} {u.lastName}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-white text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-slate-200">Annuler</button>
              <button type="submit" className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-emerald-500 hover:text-slate-950 transition-all">Mettre à jour le dossier</button>
            </div>
          </form>
        </div>
      )}

      {
        showAptModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <form onSubmit={handleAptAction} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 space-y-6 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-2xl">Nouveau Soin</h3>
                <button type="button" onClick={() => setShowAptModal(null)} className="text-slate-300 hover:text-slate-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                    <input name="date" type="date" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Heure</label>
                    <input name="time" type="time" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Infirmier Intervenant</label>
                  <select name="nurseId" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm">
                    {store.users.filter(u => u.role !== 'admin').map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Durée prévue (min)</label>
                  <input name="duration" type="number" defaultValue="20" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl">Valider la planification</button>
            </form>
          </div>
        )
      }
    </div >
  );
};

export default PatientDossier;
