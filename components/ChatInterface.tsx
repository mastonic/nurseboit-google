
import React, { useState, useRef, useEffect } from 'react';
import { processUserMessage } from '../services/geminiService';
import { Role, Message, AgentType } from '../types';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Fix: Using correct fields for Message type (direction and status instead of senderId, isBot, etc.)
    const userMessage: Message = {
      id: Date.now().toString(),
      patientId: 'bot-assistant',
      direction: 'outbound',
      text: inputValue,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Fix: Use correct Role value 'infirmiere' instead of 'nurse'
      const result = await processUserMessage(inputValue, 'infirmiere', {});
      
      // Fix: Using correct fields for Message type (direction: 'inbound' for bot responses)
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        patientId: 'bot-assistant',
        direction: 'inbound',
        text: result.reply,
        timestamp: new Date().toISOString(),
        status: 'read',
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-emerald-500 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-robot text-lg"></i>
          </div>
          <div>
            <h3 className="font-bold">Assistant NurseBot</h3>
            <p className="text-xs text-emerald-100 flex items-center gap-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              En ligne • Orchestrateur IA
            </p>
          </div>
        </div>
        <div className="text-xs font-medium px-2 py-1 bg-white/10 rounded border border-white/20 uppercase tracking-wider">
           Mode Infirmière
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 p-6 space-y-4 overflow-y-auto bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center py-10 space-y-4">
             <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-sm text-emerald-500">
               <i className="fa-solid fa-comment-medical text-2xl"></i>
             </div>
             <p className="text-slate-400 text-sm max-w-xs mx-auto">
               "Planifie un pansement pour Jean Dupont demain à 9h" ou "Génère une pré-facture pour Marie Curie"
             </p>
          </div>
        )}
        {messages.map((msg) => (
          // Fix: Using msg.direction === 'inbound' to identify bot messages instead of non-existent isBot property
          <div key={msg.id} className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.direction === 'inbound' 
              ? 'bg-white border border-slate-200 text-slate-800 shadow-sm' 
              : 'bg-emerald-500 text-white shadow-md rounded-br-none'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.direction === 'inbound' ? 'text-slate-400' : 'text-emerald-100'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-100"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative flex items-center space-x-2">
           <button className="p-2 text-slate-400 hover:text-emerald-500 transition-colors">
              <i className="fa-solid fa-microphone text-lg"></i>
           </button>
           <button className="p-2 text-slate-400 hover:text-emerald-500 transition-colors">
              <i className="fa-solid fa-camera text-lg"></i>
           </button>
           <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Tapez votre demande ici..." 
            className="flex-1 bg-slate-100 border-none rounded-full py-3 px-6 text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
           />
           <button 
            onClick={handleSendMessage}
            className="p-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-all shadow-md active:scale-95"
           >
              <i className="fa-solid fa-paper-plane"></i>
           </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
