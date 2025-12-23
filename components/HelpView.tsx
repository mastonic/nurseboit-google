
import React from 'react';

const HelpView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <section className="text-center space-y-4">
        <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200 rotate-3">
           <i className="fa-solid fa-user-nurse text-4xl"></i>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Bienvenue sur NurseBot Bêta</h1>
        <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">Nous transformons votre quotidien d'IDEL avec l'intelligence artificielle. Voici comment tirer profit de ce test de 15 jours.</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="font-black text-xl text-slate-900 flex items-center gap-3">
               <i className="fa-solid fa-list-check text-emerald-500"></i>
               Guide de test (15 jours)
            </h2>
            <ul className="space-y-4">
               {[
                 { t: "Jour 1", d: "Créez vos dossiers patients actifs." },
                 { t: "Jour 2", d: "Scannez vos ordonnances pour tester l'OCR Bêta." },
                 { t: "Jour 3", d: "Planifiez vos tournées de la semaine prochaine." },
                 { t: "Jour 4", d: "Générez vos premières pré-factures NGAP." },
                 { t: "Jour 5", d: "Testez l'assistant IA pour poser des questions sur le planning." }
               ].map((step, i) => (
                 <li key={i} className="flex gap-4">
                    <span className="font-black text-emerald-500 tabular-nums">{step.t}</span>
                    <p className="text-sm font-bold text-slate-600">{step.d}</p>
                 </li>
               ))}
            </ul>
         </div>

         <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl space-y-6 relative overflow-hidden">
            <h2 className="font-black text-xl flex items-center gap-3 relative z-10">
               <i className="fa-solid fa-map-location-dot text-emerald-400"></i>
               Roadmap Bêta
            </h2>
            <div className="space-y-4 relative z-10">
               {[
                 { t: "Juin 2024", d: "Synchronisation Google Calendar" },
                 { t: "Juillet 2024", d: "Connexion Twilio / WhatsApp réelle" },
                 { t: "Septembre 2024", d: "Version mobile native (iOS/Android)" },
                 { t: "Fin 2024", d: "Module télétransmission agréé" }
               ].map((item, i) => (
                 <div key={i} className="flex items-center justify-between group">
                    <div>
                       <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{item.t}</p>
                       <p className="text-sm font-bold">{item.d}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full border border-slate-700 flex items-center justify-center text-[8px] group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all">
                       <i className="fa-solid fa-clock"></i>
                    </div>
                 </div>
               ))}
            </div>
            <i className="fa-solid fa-rocket absolute -right-6 -bottom-6 text-9xl text-white/5 -rotate-12"></i>
         </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl space-y-4">
         <h3 className="font-black text-amber-900 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation"></i>
            Avertissement Légal
         </h3>
         <p className="text-sm font-medium text-amber-800 leading-relaxed">
            NurseBot est un assistant de coordination en version Bêta. Il ne constitue pas un dispositif médical et les données extraites par l'IA (ordonnances, NGAP) doivent être impérativement vérifiées par un professionnel de santé. 
            <br/><br/>
            <strong>Important :</strong> La facturation générée est une "Pré-facture" informative. Vous devez utiliser votre logiciel agréé SESAM-Vitale habituel pour la télétransmission CPAM officielle.
         </p>
      </div>

      <div className="text-center text-slate-400 py-10">
         <p className="text-xs font-bold uppercase tracking-widest">Besoin d'aide supplémentaire ?</p>
         <p className="text-sm font-medium mt-1">support@nursebot.ai • +33 1 23 45 67 89</p>
      </div>
    </div>
  );
};

export default HelpView;
