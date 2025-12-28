
import React, { useState, useEffect } from 'react';
import { getStore, saveStore, addLog, subscribeToStore, handleIncomingTwilioMessage } from '../services/store';
import { processUserMessage } from '../services/geminiService';
import { Message, Patient } from '../types';

const MessagesView: React.FC = () => {
  const [store, setStore] = useState(getStore());
  const [messages, setMessages] = useState(store.messages);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(store.patients[0]?.id || null);
  const [replyText, setReplyText] = useState('');
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  // Simulator State
  const [showTwilioLab, setShowTwilioLab] = useState(false);
  const [simPhone, setSimPhone] = useState('+33612345678');
  const [simBody, setSimBody] = useState('');

  // Fix: Use process.env instead of import.meta.env to resolve Property 'env' does not exist error
  const webhookActive = process.env.VITE_N8N_BASE_URL ? true : false;

  useEffect(() => {
    return subscribeToStore(() => {
      const latestStore = getStore();
      setStore(latestStore);
      setMessages(latestStore.messages);
    });
  }, []);

  const patientMessages = messages.filter(m => m.patientId === selectedPatientId);
  const selectedPatient = store.patients.find(p => p.id === selectedPatientId);

  const runTwilioSimulation = async () => {
    if (!simBody.trim()) return;
    const payload = { From: simPhone, Body: simBody };
    const result = await handleIncomingTwilioMessage(payload);
    if (result.role === 'patient') {
      setSelectedPatientId(result.user.id);
      generateAiSuggestion(simBody, result.user);
    }
    setSimBody('');
    setShowTwilioLab(false);
  };

  const generateAiSuggestion = async (input: string, patientObj?: Patient) => {
    setIsGeneratingSuggestion(true);
    try {
      const result = await processUserMessage(input, 'patient', { patient: patientObj || selectedPatient });
      setAiSuggestion(result.reply);
    } catch (e) {
      setAiSuggestion("L'IA est momentanément indisponible.");
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const finalContent = textToSend || replyText;
    if (!finalContent.trim() || !selectedPatientId || !selectedPatient) return;

    setIsSending(true);

    const newMessage: Message = {
      id: Date.now().toString(),
      patientId: selectedPatientId,
      direction: 'outbound',
      text: finalContent,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    saveStore({ messages: [newMessage, ...messages] });

    if (webhookActive) {
      try {
        // Fix: Use process.env instead of import.meta.env to resolve property access error
        await fetch(`${process.env.VITE_N8N_BASE_URL}/webhook/outbound_message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedPatient.phone,
            body: finalContent,
            patientId: selectedPatient.id
          })
        });
      } catch (err) {
        console.error("Webhook error:", err);
      }
    }

    setReplyText('');
    setAiSuggestion(null);
    setIsSending(false);
    addLog(`WhatsApp envoyé à ${selectedPatient.lastName}`);
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col md:flex-row bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in duration-500">
      <div className="w-full md:w-96 border-r border-slate-100 flex flex-col bg-slate-50/50">
        <div className="p-8 border-b border-slate-100 bg-white flex justify-between items-center">
          <div>
            <h2 className="font-black text-slate-900 tracking-tight">Messagerie Patient</h2>
            <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${webhookActive ? 'text-emerald-500' : 'text-amber-500'}`}>
              {webhookActive ? '● Webhook n8n Actif' : '○ Mode Simulateur'}
            </p>
          </div>
          <button onClick={() => setShowTwilioLab(true)} className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-all">
             <i className="fa-solid fa-flask-vial"></i>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {store.patients.map(patient => {
            const lastMsg = messages.filter(m => m.patientId === patient.id)[0];
            return (
              <button 
                key={patient.id} 
                onClick={() => setSelectedPatientId(patient.id)}
                className={`w-full p-6 flex items-center gap-5 transition-all hover:bg-white text-left ${selectedPatientId === patient.id ? 'bg-white shadow-inner border-l-8 border-l-emerald-500' : ''}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black shrink-0 ${selectedPatientId === patient.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 text-slate-500'}`}>
                  {patient.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="font-black text-slate-900 truncate text-sm uppercase tracking-tight">{patient.lastName}</p>
                    <span className="text-[9px] font-black text-slate-400">{lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                  <p className="text-[11px] truncate text-slate-500 font-bold italic leading-none">
                    {lastMsg ? lastMsg.text : 'Aucun échange.'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {selectedPatient ? (
          <>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl">
                   {selectedPatient.lastName[0]}
                </div>
                <div>
                   <p className="font-black text-slate-900 leading-none text-lg tracking-tight uppercase">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                   <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                      <i className="fa-brands fa-whatsapp text-sm"></i>
                      {selectedPatient.phone}
                   </p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-10 overflow-y-auto space-y-8 bg-slate-50/30 flex flex-col-reverse">
               {aiSuggestion && (
                 <div className="flex justify-start animate-in zoom-in duration-300">
                    <div className="bg-white border-2 border-emerald-500 p-8 rounded-[3rem] max-w-lg shadow-2xl shadow-emerald-500/5">
                       <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center text-xs">
                             <i className="fa-solid fa-robot"></i>
                          </div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Réponse Suggérée (IA)</p>
                       </div>
                       <p className="text-sm font-bold text-slate-800 leading-relaxed italic mb-8">"{aiSuggestion}"</p>
                       <div className="flex gap-3">
                          <button onClick={() => handleSend(aiSuggestion)} className="flex-1 py-4 bg-emerald-500 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20">Confirmer l'envoi</button>
                          <button onClick={() => setAiSuggestion(null)} className="px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Ignorer</button>
                       </div>
                    </div>
                 </div>
               )}

               {patientMessages.map(msg => (
                 <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-6 rounded-[2.5rem] shadow-xl ${msg.direction === 'outbound' ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'}`}>
                       <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
                       <p className="text-[9px] mt-4 font-black uppercase tracking-widest opacity-30 text-right">
                          {new Date(msg.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                       </p>
                    </div>
                 </div>
               ))}
            </div>

            <div className="p-10 bg-white border-t border-slate-50">
               <div className="flex gap-5">
                  <input 
                    type="text" 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Message WhatsApp..." 
                    className="flex-1 px-8 py-6 bg-slate-50 border-none rounded-[2rem] font-black text-sm outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner"
                  />
                  <button onClick={() => handleSend()} disabled={!replyText.trim() || isSending} className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl hover:bg-emerald-500 hover:text-slate-950 transition-all active:scale-95 disabled:opacity-10">
                     <i className="fa-solid fa-paper-plane text-xl"></i>
                  </button>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-20">
             <i className="fa-solid fa-comments text-7xl mb-6"></i>
             <h3 className="text-2xl font-black text-slate-400">Sélectionnez un patient</h3>
          </div>
        )}
      </div>

      {showTwilioLab && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-12 space-y-10 animate-in zoom-in">
              <div className="flex justify-between items-center">
                 <h3 className="font-black text-2xl flex items-center gap-3 text-emerald-600">
                    <i className="fa-solid fa-flask-vial"></i>
                    Simulateur WhatsApp
                 </h3>
                 <button onClick={() => setShowTwilioLab(false)} className="text-slate-300 hover:text-slate-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
              </div>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Numéro Patient</label>
                    <input value={simPhone} onChange={(e) => setSimPhone(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Entrant</label>
                    <textarea value={simBody} onChange={(e) => setSimBody(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm h-32" />
                 </div>
                 <button onClick={runTwilioSimulation} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">Simuler Réception</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MessagesView;
