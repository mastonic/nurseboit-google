import React, { useState, useEffect } from 'react';
import { getStore, addLog, saveStore, calculateInvoiceTotal, updateInvoice, subscribeToStore } from '../services/store';
import { NGAP_CATALOG } from '../constants';
import { PreInvoice } from '../types';

const BillingView: React.FC = () => {
  const [store, setStore] = useState(getStore());
  const [invoices, setInvoices] = useState(store.invoices);
  const [showGenerator, setShowGenerator] = useState<PreInvoice | 'add' | null>(null);

  // BUG-004: Sync state
  useEffect(() => {
    return subscribeToStore(() => {
      const latestStore = getStore();
      setStore(latestStore);
      setInvoices(latestStore.invoices);
    });
  }, []);

  const handleSaveInvoice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formElements = e.currentTarget.elements;

    const patientId = formData.get('patientId') as string;
    const date = formData.get('date') as string;
    const km = parseFloat(formData.get('km') as string) || 0;
    
    // Accès sécurisé aux cases à cocher
    const sundayEl = formElements.namedItem('sunday') as HTMLInputElement | null;
    const nightEl = formElements.namedItem('night') as HTMLInputElement | null;
    const ifiEl = formElements.namedItem('ifi') as HTMLInputElement | null;

    const isSunday = sundayEl?.checked || false;
    const isNight = nightEl?.checked || false;
    const isIFI = ifiEl?.checked || false;
    
    // Récupération des actes sélectionnés
    const selectedActsCodes = Array.from(formData.getAll('acts')) as string[];
    const selectedActs = NGAP_CATALOG.filter(a => selectedActsCodes.includes(a.code));

    const majorations = [];
    if (isSunday) majorations.push({ label: 'Dimanche/Férié', amount: 8.50 });
    if (isNight) majorations.push({ label: 'Majoration Nuit', amount: 9.15 });

    const displacement = { 
      type: isIFI ? 'IFI' as const : 'IK' as const, 
      distance: isIFI ? 0 : km, 
      amount: isIFI ? 2.50 : (km * 0.35) 
    };

    const total = calculateInvoiceTotal(selectedActs, displacement, majorations);

    if (showGenerator === 'add') {
      const newInv: PreInvoice = {
        id: `i-${Date.now()}`,
        patientId,
        date,
        acts: selectedActs,
        majorations,
        displacement,
        totalAmount: total,
        status: 'to_prepare'
      };
      const updated = [newInv, ...invoices];
      saveStore({ invoices: updated });
      addLog(`Pré-facture générée pour ${store.patients.find(p => p.id === patientId)?.lastName}`);
    } else if (typeof showGenerator === 'object') {
      const updated: PreInvoice = {
        ...showGenerator,
        patientId,
        date,
        acts: selectedActs,
        majorations,
        displacement,
        totalAmount: total
      };
      updateInvoice(updated);
    }
    setShowGenerator(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Module Facturation IDEL</h1>
          <p className="text-slate-500 text-sm">Génération de pré-factures NGAP et suivi CPAM.</p>
        </div>
        <button 
          onClick={() => setShowGenerator('add')}
          className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all"
        >
          <i className="fa-solid fa-plus"></i>
          Nouvelle Pré-facture
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
           <i className="fa-solid fa-circle-info"></i>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed font-medium">
          NurseBot aide à la préparation et au suivi de la facturation.
          La télétransmission SESAM-Vitale doit être effectuée avec un logiciel agréé.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Patient</th>
              <th className="px-6 py-4">Actes</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-medium">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 text-slate-400">{new Date(inv.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-bold">{store.patients.find(p => p.id === inv.patientId)?.lastName}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {inv.acts.map(a => <span key={a.code} className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black">{a.code}</span>)}
                  </div>
                </td>
                <td className="px-6 py-4 font-black">{inv.totalAmount.toFixed(2)}€</td>
                <td className="px-6 py-4">
                   <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                     inv.status === 'rejected' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                   }`}>
                     {inv.status.replace('_', ' ')}
                   </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setShowGenerator(inv)} className="text-emerald-500 hover:underline">Détails / Modifier</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showGenerator && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
           <form onSubmit={handleSaveInvoice} className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                 <h3 className="font-black text-xl">Préparation Facturation CPAM</h3>
                 <button type="button" onClick={() => setShowGenerator(null)} className="text-slate-400 hover:text-slate-600 p-2"><i className="fa-solid fa-xmark text-xl"></i></button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</label>
                        <select name="patientId" required defaultValue={typeof showGenerator === 'object' ? showGenerator.patientId : ''} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
                           {store.patients.map(p => <option key={p.id} value={p.id}>{p.lastName} {p.firstName}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date des soins</label>
                        <input name="date" type="date" required defaultValue={typeof showGenerator === 'object' ? showGenerator.date : new Date().toISOString().split('T')[0]} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Actes NGAP (Sélectionner les actes du jour)</label>
                    <div className="grid grid-cols-1 gap-2">
                       {NGAP_CATALOG.map(acte => (
                         <label key={acte.code} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-white transition-all">
                            <input 
                              type="checkbox" 
                              name="acts" 
                              value={acte.code} 
                              defaultChecked={typeof showGenerator === 'object' && showGenerator.acts.some(a => a.code === acte.code)}
                              className="w-4 h-4 text-emerald-500 rounded border-slate-300" 
                            />
                            <div className="flex-1 flex justify-between">
                               <span className="text-xs font-bold text-slate-700">{acte.code} - {acte.label}</span>
                               <span className="text-xs font-black">{acte.amount.toFixed(2)}€</span>
                            </div>
                         </label>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Majorations</label>
                       <div className="space-y-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                             <input type="checkbox" name="sunday" defaultChecked={typeof showGenerator === 'object' && showGenerator.majorations.some(m => m.label.includes('Dimanche'))} className="rounded text-emerald-500" /> Dimanche / Férié
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                             <input type="checkbox" name="night" defaultChecked={typeof showGenerator === 'object' && showGenerator.majorations.some(m => m.label.includes('Nuit'))} className="rounded text-emerald-500" /> Majoration Nuit
                          </label>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Déplacement</label>
                       <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                             <input type="checkbox" name="ifi" defaultChecked={typeof showGenerator === 'object' ? showGenerator.displacement.type === 'IFI' : true} className="rounded text-emerald-500" /> IFI (Forfait)
                          </label>
                          <div className="flex items-center gap-2">
                             <input name="km" type="number" placeholder="KM" defaultValue={typeof showGenerator === 'object' ? showGenerator.displacement.distance : ''} className="w-16 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
                             <span className="text-[9px] font-black text-slate-400">IK</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-4">
                 <button type="submit" className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all shadow-xl">
                    Enregistrer la Pré-facture
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default BillingView;