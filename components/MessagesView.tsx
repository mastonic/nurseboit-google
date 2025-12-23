
import React, { useState, useEffect } from 'react';
import { getStore, saveStore, addLog, subscribeToStore } from '../services/store';
import { processUserMessage } from '../services/geminiService';
import { Message, Patient } from '../types';

const MessagesView: React.FC = () => {
  const [store, setStore] = useState(getStore());
  const [messages, setMessages] = useState(store.messages);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(store.patients[0]?.id || null);
  const [replyText, setReplyText] = useState('');
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToStore(() => {
      const latestStore = getStore();
      setStore(latestStore);
      setMessages(latestStore.messages);
    });
  }, []);

  const patientMessages = messages.filter(m => m.patientId === selectedPatientId);
  const selectedPatient = store.patients.find(p => p.id === selectedPatientId);

  // Simuler la réception d'un message vocal pour la démo
  const simulateIncomingVoice = () => {
    if (!selectedPatientId) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      patientId: selectedPatientId,
      direction: 'inbound',
      text: "🎤 Message vocal (0:12) - Transcription : 'Bonjour, est-ce qu'on peut décaler mon pansement de demain après-midi à mercredi matin ?'",
      timestamp: new Date().toISOString(),
      status: 'delivered'
    };
    const updated = [newMsg, ...messages];
    saveStore({ messages: updated });
    generateAiSuggestion(newMsg.text);
  };

  const generateAiSuggestion = async (input: string) => {
    setIsGeneratingSuggestion(true);
    try {
      // Appel à l'orchestrateur IA
      const result = await processUserMessage(input, 'patient', { patient: selectedPatient });
      setAiSuggestion(result.reply);
    } catch (e) {
      setAiSuggestion("Désolé, je n'ai pas pu générer de suggestion.");
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  const handleSend = (textToSend?: string) => {
    const finalContent = textToSend || replyText;
    if (!finalContent.trim() || !selectedPatientId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      patientId: selectedPatientId,
      direction: 'outbound',
      text: finalContent,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    const updated = [newMessage, ...messages];
    saveStore({ messages: updated });
    addLog(`Message WhatsApp envoyé à ${selectedPatient?.lastName}`);
    setReplyText('');
    setAiSuggestion(null);
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col md:flex-row bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Sidebar Patients */}
      <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/30">
        <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center">
          <h2 className="font-black text-slate-900 tracking-tight">Inbox WhatsApp</h2>
          <button onClick={simulateIncomingVoice} className="text-emerald-500 hover:text-emerald-600">
             <i className="fa-solid fa-circle-plus"></i>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {store.patients.map(patient => {
            const patientMsgs = messages.filter(m => m.patientId === patient.id);
            const lastMsg = patientMsgs[0];
            const isUnread = patientMsgs.some(m => m.direction === 'inbound' && m.status !== 'read');
            return (
              <button 
                key={patient.id} 
                onClick={() => setSelectedPatientId(patient.id)}
                className={`w-full p-4 flex items-center gap-4 transition-all hover:bg-white text-left ${selectedPatientId === patient.id ? 'bg-white shadow-sm border-l-4 border-emerald-500' : 'border-l-4 border-transparent'}`}
              >
                <div className="w-12 h-12 bg-slate-200 rounded-2xl flex items-center justify-center font-black text-slate-500 shrink-0">
                  {patient.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="font-bold text-slate-900 truncate">{patient.lastName}</p>
                    <span className="text-[9px] font-bold text-slate-400">{lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                  <p className={`text-xs truncate ${isUnread ? 'font-black text-slate-900' : 'text-slate-500 font-medium'}`}>
                    {lastMsg ? lastMsg.text : 'Aucun message'}
                  </p>
                </div>
                {isUnread && <div className="w-2 h-2 bg-rose-500 rounded-full"></div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedPatient ? (
          <>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center font-black">
                   {selectedPatient.lastName[0]}
                </div>
                <div>
                   <p className="font-black text-slate-900 leading-none">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                   <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-1">Patient WhatsApp Connecté</p>
                </div>
              </div>
              <div className="flex gap-2">
                 <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold text-slate-500">Live Webhook OK</span>
                 </div>
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50 flex flex-col-reverse">
               {/* Suggestion IA */}
               {isGeneratingSuggestion && (
                 <div className="flex justify-start">
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl animate-pulse">
                       <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">NurseBot réfléchit...</p>
                       <div className="h-4 w-48 bg-emerald-100 rounded"></div>
                    </div>
                 </div>
               )}

               {aiSuggestion && !isGeneratingSuggestion && (
                 <div className="flex justify-start">
                    <div className="bg-emerald-50 border-2 border-emerald-200 p-5 rounded-3xl max-w-[85%] shadow-lg shadow-emerald-100/50">
                       <div className="flex items-center gap-2 mb-2">
                          <i className="fa-solid fa-robot text-emerald-500"></i>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Réponse proposée par NurseBot</p>
                       </div>
                       <p className="text-sm font-bold text-emerald-900 leading-relaxed italic">"{aiSuggestion}"</p>
                       <div className="mt-4 flex gap-2">
                          <button 
                            onClick={() => handleSend(aiSuggestion)}
                            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md hover:bg-emerald-600"
                          >
                             Valider & Envoyer
                          </button>
                          <button 
                            onClick={() => setAiSuggestion(null)}
                            className="px-4 py-2 bg-white text-slate-400 rounded-xl text-xs font-black border border-slate-200"
                          >
                             Ignorer
                          </button>
                       </div>
                    </div>
                 </div>
               )}

               {patientMessages.map(msg => (
                 <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-3xl ${msg.direction === 'outbound' ? 'bg-slate-900 text-white rounded-br-none shadow-xl' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                       <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                       <p className={`text-[9px] mt-2 font-black uppercase ${msg.direction === 'outbound' ? 'text-slate-500' : 'text-slate-400'}`}>
                          {new Date(msg.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })} • {msg.status}
                       </p>
                    </div>
                 </div>
               ))}
            </div>

            <div className="p-6 border-t border-slate-100">
               <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Tapez votre réponse WhatsApp..." 
                    className="flex-1 px-6 py-4 bg-slate-100 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <button onClick={() => handleSend()} className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all">
                     <i className="fa-solid fa-paper-plane"></i>
                  </button>
               </div>
               <div className="mt-3 flex gap-2">
                  <button 
                    onClick={() => generateAiSuggestion(patientMessages[0]?.text || "Besoin d'aide")}
                    className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all"
                  >
                     <i className="fa-solid fa-wand-magic-sparkles mr-1"></i>
                     Suggérer une réponse IA
                  </button>
                  <button className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:text-emerald-500 transition-all">Relance ordonnance</button>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-300">
             <i className="fa-solid fa-comments text-7xl mb-6 opacity-20"></i>
             <h3 className="text-xl font-black text-slate-400">Aucune conversation WhatsApp</h3>
             <p className="text-sm font-medium">Sélectionnez un patient pour voir l'historique WhatsApp.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesView;
