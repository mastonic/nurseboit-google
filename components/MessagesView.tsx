
import React, { useState, useEffect, useRef } from 'react';
import { getStore, saveStore, addLog, subscribeToStore, addInternalMessage, getCurrentSession, addTransmission } from '../services/store';
import { transcribeVoiceNote } from '../services/geminiService';
import { Message, Patient, Transmission } from '../types';

const MessagesView: React.FC = () => {
  const session = getCurrentSession();
  const [store, setStore] = useState(getStore());
  const [activeTab, setActiveTab] = useState<'team' | 'patients'>('team');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(store.patients[0]?.id || null);
  const [replyText, setReplyText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isRealWhatsApp = !!store.settings.apiConfig.twilioWebhookUrl;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [store.messages, store.internalMessages, activeTab]);

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  const handleSend = async (textToSend?: string, isVoice = false) => {
    const text = textToSend || replyText;
    if (!text.trim() || !session) return;

    if (activeTab === 'team') {
      const msg = {
        id: Date.now().toString(),
        authorId: session.userId,
        authorName: session.name,
        text,
        timestamp: new Date().toISOString(),
        type: isVoice ? 'voice' : 'text'
      };
      addInternalMessage(msg);
    } else if (selectedPatientId) {
      const patient = store.patients.find(p => p.id === selectedPatientId);
      const msg: Message = {
        id: Date.now().toString(),
        patientId: selectedPatientId,
        direction: 'outbound',
        text,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };
      saveStore({ messages: [msg, ...store.messages] });
      
      if (isRealWhatsApp) {
        fetch(store.settings.apiConfig.twilioWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: patient?.phone, text, patientId: selectedPatientId })
        }).catch(err => console.error("n8n WA error", err));
      }
      addLog(`WhatsApp envoyé à ${patient?.lastName}`);
    }
    setReplyText('');
  };

  const transformToTransmission = (msg: any) => {
    if (!session || !selectedPatientId) return;
    const patient = store.patients.find(p => p.id === selectedPatientId);
    const newTrans: Transmission = {
      id: `t-chat-${Date.now()}`,
      patientId: selectedPatientId,
      fromId: session.userId,
      fromName: session.name,
      text: msg.text,
      category: 'clinique',
      priority: 'medium',
      status: 'sent',
      timestamp: new Date().toISOString()
    };
    addTransmission(newTrans);
    addLog(`Note chat convertie en transmission pour ${patient?.lastName}`);
    alert("Message converti en transmission !");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setIsTranscribing(true);
          const res = await transcribeVoiceNote(base64);
          if (res.transcription) handleSend(res.transcription, true);
          setIsTranscribing(false);
        };
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) { alert("Microphone bloqué."); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  return (
    <div className="h-[calc(100vh-160px)] flex bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in">
      <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
        <div className="p-8 border-b border-slate-100 bg-white">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
             <button onClick={() => setActiveTab('team')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'team' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Équipe</button>
             <button onClick={() => setActiveTab('patients')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'patients' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Patients</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'team' ? (
            <div className="p-6"><div className="w-full p-4 bg-slate-900 text-white rounded-[1.5rem] flex items-center gap-4 shadow-lg shadow-slate-900/10"><i className="fa-solid fa-users"></i><p className="font-black text-xs uppercase tracking-widest">Cabinet PRO</p></div></div>
          ) : (
            store.patients.map(p => (
              <button key={p.id} onClick={() => setSelectedPatientId(p.id)} className={`w-full p-5 flex items-center gap-4 transition-all hover:bg-white ${selectedPatientId === p.id ? 'bg-white border-l-8 border-emerald-500 shadow-inner' : ''}`}>
                 <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center font-black text-slate-500 shrink-0">{p.lastName[0]}</div>
                 <div className="min-w-0">
                    <p className="font-black text-slate-800 text-xs uppercase truncate">{p.lastName} {p.firstName}</p>
                    <p className="text-[10px] text-slate-400 font-bold truncate">WhatsApp IDEL</p>
                 </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
           <div className="flex items-center gap-4">
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">
                {activeTab === 'team' ? 'Staff interne' : `Canal ${store.patients.find(p=>p.id===selectedPatientId)?.lastName}`}
              </h3>
              {activeTab === 'patients' && (
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isRealWhatsApp ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                   {isRealWhatsApp ? 'WhatsApp Réel' : 'Simulateur'}
                </span>
              )}
           </div>
           {activeTab === 'patients' && <i className="fa-brands fa-whatsapp text-emerald-500 text-xl"></i>}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-6 bg-slate-50/20 flex flex-col">
          {(activeTab === 'team' ? store.internalMessages : store.messages.filter(m => m.patientId === selectedPatientId).slice().reverse()).map((msg: any) => {
             const isMe = activeTab === 'team' ? msg.authorId === session?.userId : msg.direction === 'outbound';
             return (
               <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`max-w-[70%] p-5 rounded-[2rem] shadow-xl relative ${isMe ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'}`}>
                     {!isMe && <p className="text-[9px] font-black uppercase text-emerald-500 mb-2">{msg.authorName || 'Patient'}</p>}
                     <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
                     <div className="flex items-center justify-between mt-3">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-30">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                        {!isMe && activeTab === 'patients' && (
                          <button onClick={() => transformToTransmission(msg)} className="text-[8px] font-black uppercase text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                             Transformer en Transmission
                          </button>
                        )}
                     </div>
                  </div>
               </div>
             );
          })}
        </div>

        <div className="p-8 bg-white border-t border-slate-100 shrink-0">
           <div className="flex items-center gap-4">
              <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:text-emerald-500'}`}>
                 <i className="fa-solid fa-microphone text-xl"></i>
              </button>
              <input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Écrire..." className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm outline-none shadow-inner" />
              <button onClick={() => handleSend()} disabled={!replyText.trim()} className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-emerald-500 disabled:opacity-20"><i className="fa-solid fa-paper-plane"></i></button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesView;
