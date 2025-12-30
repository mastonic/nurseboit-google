
import React from 'react';

const BillingView: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-10 py-10 animate-in fade-in zoom-in duration-700">
      {/* Illustration / Icone visuelle */}
      <div className="relative shrink-0">
        <div className="w-28 h-28 md:w-32 md:h-32 bg-emerald-500 text-white rounded-[2.5rem] md:rounded-[3rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 rotate-12 transition-transform hover:rotate-0 duration-500">
          <i className="fa-solid fa-file-invoice-dollar text-4xl md:text-5xl"></i>
        </div>
        <div className="absolute -bottom-1 -right-1 w-10 h-10 md:w-12 md:h-12 bg-slate-900 text-emerald-400 rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl border-4 border-white">
          <i className="fa-solid fa-screwdriver-wrench text-xs md:text-sm"></i>
        </div>
      </div>

      {/* Message de patience */}
      <div className="text-center space-y-4 max-w-lg px-6">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Module Facturation NGAP</h1>
        <p className="text-slate-500 font-medium text-sm md:text-lg leading-relaxed">
          Un peu de patience... Notre équipe peaufine actuellement l'outil de facturation intelligente pour le rendre parfaitement conforme aux dernières nomenclatures.
        </p>
      </div>

      {/* Carte d'information Premium */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl max-w-md w-full relative overflow-hidden group mx-4">
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-3">
             <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">Bientôt disponible</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs md:text-sm font-bold text-slate-700">
              Cette fonctionnalité sera prochainement disponible en <span className="text-emerald-500">option Premium</span>. Elle inclura :
            </p>
          </div>
          <ul className="space-y-4">
            {[
              "Calcul automatique des cotations (AMI, AIS, BSI)",
              "Gestion des majorations de nuit et dimanche",
              "Synchronisation avec votre logiciel de télétransmission",
              "Suivi des rejets CPAM en temps réel"
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-3 text-[11px] md:text-xs text-slate-500 font-medium leading-tight">
                <i className="fa-solid fa-circle-check text-emerald-500 text-[10px] mt-0.5"></i>
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <i className="fa-solid fa-euro-sign absolute -right-8 -bottom-8 text-7xl md:text-8xl text-slate-50 opacity-50 group-hover:scale-110 transition-transform duration-700"></i>
      </div>

      {/* Footer Info */}
      <div className="flex flex-col items-center gap-6 pt-4">
        <p className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">NurseBot Pro • RoadMap 2025</p>
      </div>
    </div>
  );
};

export default BillingView;
