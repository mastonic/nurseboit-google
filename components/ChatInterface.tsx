
import React, { useState, useRef, useEffect } from 'react';
import { processUserMessage, transcribeVoiceNote } from '../services/geminiService';
import { getCurrentSession } from '../services/store';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const session = getCurrentSession();
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (text?: string, isVoice: boolean = false) => {
    const finalContent = text || inputValue;
    if (!finalContent.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      direction: 'outbound' as const,
      text: finalContent,
      timestamp: new Date().toISOString(),
      type: isVoice ? 'voice' : 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const result = await processUserMessage(finalContent, session?.role || 'infirmiere', {});
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        direction: 'inbound' as const,
        text: result.reply,
        timestamp: new Date().toISOString(),
        intent: result.intent,
        structuredData: result.structuredData
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        direction: 'inbound',
        text: "La passerelle VPS ne répond pas. Veuillez vérifier votre configuration n8n.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 1000) return;

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setIsTranscribing(true);
          try {
            const res = await transcribeVoiceNote(base64, mimeType);
            if (res.transcription) {
              handleSendMessage(res.transcription, true);
            }
          } catch (e) {
            console.error("Vocal error:", e);
          } finally {
            setIsTranscribing(false);
          }
        };
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone accès refusé.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Premium Header */}
      <div className="p-8 bg-slate-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-5">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/10">
            <i className="fa-solid fa-robot text-2xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight">NurseBot Orchestrateur</h3>
            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mt-1">
               Passerelle intelligente n8n Connectée
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">
           <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Canal VPS Sécurisé</span>
        </div>
      </div>

      {/* Message Feed */}
      <div ref={scrollRef} className="flex-1 p-10 space-y-8 overflow-y-auto bg-slate-50/20">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-20">
             <i className="fa-solid fa-microphone-lines text-7xl"></i>
             <p className="text-sm font-black uppercase tracking-widest max-w-xs leading-relaxed">
                Utilisez le vocal pour enregistrer une passation ou poser une question clinique.
             </p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
            <div className="max-w-[85%] space-y-2">
               <div className={`p-6 rounded-[2.5rem] shadow-xl relative ${
                 msg.direction === 'inbound' 
                 ? 'bg-white text-slate-800 border border-slate-100 rounded-bl-none' 
                 : 'bg-slate-900 text-white rounded-br-none'
               }`}>
                 {msg.type === 'voice' && (
                    <div className="flex items-center gap-2 mb-3 text-[9px] font-black uppercase tracking-widest opacity-50">
                       <i className="fa-solid fa-waveform"></i> Transcription Vocale VPS
                    </div>
                 )}
                 <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
                 <p className="text-[9px] mt-4 font-black uppercase tracking-widest opacity-40 text-right">
                   {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </p>
               </div>
               
               {msg.direction === 'inbound' && msg.intent && (
                  <div className="flex flex-wrap gap-2 animate-in slide-in-from-left duration-500 ml-4">
                     <button className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10">
                        {msg.intent === 'TRANSMISSION' ? 'Valider Transmission' : 'Ajouter Note Dossier'}
                     </button>
                     <button className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest">Ignorer</button>
                  </div>
               )}
            </div>
          </div>
        ))}

        {(isTyping || isTranscribing) && (
          <div className="flex justify-start animate-in slide-in-from-bottom-2">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xl flex items-center gap-4">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-200"></div>
              </div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                {isTranscribing ? "Le VPS transcrit l'audio..." : "L'IA réfléchit..."}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="p-8 bg-white border-t border-slate-100">
        <div className="flex items-center gap-5 relative">
           <button 
             onMouseDown={startRecording}
             onMouseUp={stopRecording}
             className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-emerald-500 hover:text-slate-950 shadow-inner'}`}
           >
              <i className="fa-solid fa-microphone text-xl"></i>
           </button>
           
           <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isRecording ? "Enregistrement en cours..." : "Posez une question ou dictez un soin..."}
            className="flex-1 bg-slate-50 border-none rounded-[1.5rem] py-5 px-8 text-sm font-black focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner"
           />
           
           <button 
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim()}
            className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] hover:bg-emerald-500 hover:text-slate-950 transition-all shadow-xl disabled:opacity-20 active:scale-95"
           >
              <i className="fa-solid fa-paper-plane text-xl"></i>
           </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
