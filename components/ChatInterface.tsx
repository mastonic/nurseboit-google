
import React, { useState, useRef, useEffect } from 'react';
import { callNurseBotAgent } from '../services/n8nService';
import { getCurrentSession, getStore } from '../services/store';
import { agentService } from '../services/agentService';
import AudioVisualizer from './AudioVisualizer';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);

  const session = getCurrentSession();
  const store = getStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isTranscribing]);

  const handleSendMessage = async (textCommand?: string, isVoice: boolean = false, audioBlob?: Blob) => {
    const finalContent = textCommand || inputValue;
    if (!finalContent && !audioBlob) return;

    const userMessage = {
      id: Date.now().toString(),
      direction: 'outbound' as const,
      text: finalContent || "(Audio command)",
      timestamp: new Date().toISOString(),
      type: isVoice ? 'voice' : 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const result = await agentService.processCommand(audioBlob || finalContent, !!audioBlob);

      const botMessage = {
        id: (Date.now() + 1).toString(),
        direction: 'inbound' as const,
        text: result.feedback ? `${result.feedback}\n\n${result.reply}` : result.reply,
        timestamp: new Date().toISOString(),
        intent: result.raw.intent,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        direction: 'inbound',
        text: `Désolé, j'ai rencontré une erreur : ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);

      // Robust MIME type detection for Mobile/iOS
      const mimeTypes = [
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
        'audio/wav',
        'audio/aac'
      ];
      const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 1000) return;

        setIsTranscribing(true);
        handleSendMessage(undefined, true, audioBlob);
        setIsTranscribing(false);

        stream.getTracks().forEach(t => t.stop());
        setRecordingStream(null);
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
    <div className="flex flex-col h-[calc(100vh-100px)] md:h-[calc(100vh-180px)] bg-white rounded-none md:rounded-[3rem] border-0 md:border border-slate-100 shadow-none md:shadow-2xl overflow-hidden animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="p-4 md:p-8 bg-slate-900 text-white flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center space-x-3 md:space-x-5">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-emerald-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/10">
            <i className="fa-solid fa-robot text-lg md:text-2xl"></i>
          </div>
          <div>
            <h3 className="text-base md:text-xl font-black tracking-tight">NurseBot</h3>
            <p className="text-[8px] md:text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mt-0.5 md:mt-1">
              Assistant IA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest text-slate-400">Prêt pour {store.users.length} infirmières</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 p-4 md:p-10 space-y-6 md:space-y-8 overflow-y-auto bg-slate-50/20 pb-20 md:pb-10">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 md:space-y-6 opacity-20">
            <i className="fa-solid fa-microphone-lines text-5xl md:text-7xl"></i>
            <p className="text-xs md:text-sm font-black uppercase tracking-widest max-w-[200px] md:max-w-xs leading-relaxed">
              Parlez à l'IA...
            </p>
          </div>
        )}
        <div key={msg.id} className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
          <div className="max-w-[85%] space-y-2">
            <div className={`p-6 rounded-[2.5rem] shadow-xl relative ${msg.direction === 'inbound'
              ? 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
              : 'bg-slate-900 text-white rounded-br-none'
              }`}>
              <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
              <p className="text-[9px] mt-4 font-black uppercase tracking-widest opacity-40 text-right">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
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
                {isTranscribing ? "Transcription..." : "L'IA réfléchit..."}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-8 bg-white border-t border-slate-100">
        <div className="flex items-center gap-3 md:gap-5 relative">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-emerald-500 hover:text-slate-950 shadow-inner'}`}
          >
            <i className={`fa-solid ${isRecording ? 'fa-stop' : 'fa-microphone'} text-xl`}></i>
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Message..."
            className="flex-1 bg-slate-50 border-none rounded-[1.5rem] py-4 px-6 md:py-5 md:px-8 text-sm font-black focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim()}
            className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] hover:bg-emerald-500 hover:text-slate-950 transition-all shadow-xl disabled:opacity-20"
          >
            <i className="fa-solid fa-paper-plane text-xl"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
