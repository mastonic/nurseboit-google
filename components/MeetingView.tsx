
import React, { useState } from 'react';
import { transcribeMeeting } from '../services/geminiService';
import { addLog } from '../services/store';

const MeetingView: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [rawText, setRawText] = useState("");

  const handleGenerate = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    try {
      const result = await transcribeMeeting(rawText);
      setSummary(result);
      addLog("Génération d'un compte-rendu de réunion");
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Coordination Cabinet</h1>
          <p className="text-slate-500 text-sm">Transformez vos réunions en actions concrètes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="font-black text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-microphone-lines text-emerald-500"></i>
            Saisie de la Réunion
          </h2>
          <textarea 
            className="w-full h-64 p-6 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            placeholder="Collez ici les notes de la réunion ou parlez..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <button 
            onClick={handleGenerate}
            disabled={isProcessing || !rawText}
            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 disabled:opacity-50 transition-all active:scale-95"
          >
            {isProcessing ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : null}
            Générer le compte-rendu IA
          </button>
        </div>

        <div className="space-y-6">
          {summary ? (
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl space-y-8 animate-in slide-in-from-right duration-500">
               <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Décisions Clés</h3>
                  <ul className="space-y-2">
                    {summary.decisions.map((d: string, i: number) => (
                      <li key={i} className="flex gap-3 text-sm font-medium">
                        <i className="fa-solid fa-check-double text-emerald-400 mt-1"></i>
                        {d}
                      </li>
                    ))}
                  </ul>
               </section>

               <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Plan d'Action</h3>
                  <div className="space-y-3">
                    {summary.tasks.map((t: any, i: number) => (
                      <div key={i} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-sm">{t.title}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-black">{t.owner} • {t.deadline}</p>
                        </div>
                        <i className="fa-solid fa-clock-rotate-left text-slate-600"></i>
                      </div>
                    ))}
                  </div>
               </section>
               <button className="w-full py-3 bg-white text-slate-900 rounded-xl font-black text-xs">Partager par Email/WhatsApp</button>
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-12 text-center text-slate-400">
               <i className="fa-solid fa-robot text-5xl mb-4 opacity-20"></i>
               <p className="font-bold">En attente de vos notes...</p>
               <p className="text-xs mt-2 italic">L'IA NurseBot structurera automatiquement vos points clés et tâches.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingView;
