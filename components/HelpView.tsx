
import React from 'react';

const HelpView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      <section className="text-center space-y-4">
        <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 rotate-6">
           <i className="fa-solid fa-user-nurse text-5xl"></i>
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter mt-8">Test Client : NurseBot PRO</h1>
        <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
           Bienvenue dans votre environnement de test de 15 jours. NurseBot est configuré pour votre cabinet afin d'éliminer vos tâches administratives répétitives.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl space-y-8">
            <h2 className="font-black text-2xl text-slate-900 flex items-center gap-4">
               <i className="fa-solid fa-vial text-emerald-500"></i>
               Objectifs du Test
            </h2>
            <div className="space-y-6">
               {[
                 { t: "Validation OCR", d: "Scannez au moins 10 ordonnances réelles pour valider la précision de l'extraction IA." },
                 { t: "Planning Dynamique", d: "Gérez vos tournées communes et testez les alertes de conflits." },
                 { t: "Cotation NGAP", d: "Générez des pré-factures pour vos patients complexes (BSI, Pansements AMI4)." },
                 { t: "Assistant IA", d: "Utilisez le chat pour demander 'Qui doit passer chez Mme Martin demain ?'." }
               ].map((goal, i) => (
                 <div key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center font-black shrink-0 text-sm">{i+1}</div>
                    <div>
                       <p className="font-black text-slate-800">{goal.t}</p>
                       <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">{goal.d}</p>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <h2 className="font-black text-2xl mb-8 flex items-center gap-4 relative z-10">
               <i className="fa-solid fa-shield-halved text-emerald-400"></i>
               Sécurité des données
            </h2>
            <div className="space-y-6 relative z-10">
               <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  Pendant cette période de test, vos données sont stockées dans le <span className="text-white font-bold">Local Storage sécurisé</span> de votre navigateur.
               </p>
               <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                     <i className="fa-solid fa-lock text-emerald-400 text-xs"></i>
                     <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Conformité RGPD</p>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-normal italic">
                     Aucune donnée de santé n'est stockée sur nos serveurs sans votre accord explicite lors du passage en production finale (HDS). L'IA Gemini traite les données de manière éphémère.
                  </p>
               </div>
            </div>
            <i className="fa-solid fa-microchip absolute -right-10 -bottom-10 text-[15rem] text-white/5 -rotate-12"></i>
         </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 p-10 rounded-[3rem] text-center space-y-4">
         <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Une question ? Un bug ?</p>
         <h3 className="text-2xl font-black text-emerald-900 leading-none">support-premium@nursebot.ai</h3>
         <p className="text-sm font-bold text-emerald-700 opacity-70">Ligne directe IDEL : +33 1 23 45 67 89</p>
      </div>
    </div>
  );
};

export default HelpView;
