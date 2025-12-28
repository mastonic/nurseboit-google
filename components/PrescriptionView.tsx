
import React, { useState, useEffect, useRef } from 'react';
import { getStore, addLog, addPrescription, subscribeToStore } from '../services/store';
import { analyzePrescriptionOCR } from '../services/geminiService';
import { Prescription } from '../types';

const PrescriptionView: React.FC = () => {
  const [store, setStore] = useState(getStore());
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      // Conversion en Base64 pour Gemini
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await analyzePrescriptionOCR(base64);
        setScannedData(result);
        setIsScanning(false);
        addLog(`Analyse OCR réussie pour une nouvelle ordonnance`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert("Erreur lors de l'analyse OCR.");
      setIsScanning(false);
    }
  };

  const handleConfirm = () => {
    if (!scannedData) return;
    
    // Pour la beta, on cherche un patient au hasard ou le premier si non trouvé
    const patientId = store.patients[0]?.id;

    const newPresc: Prescription = {
      id: `pr-${Date.now()}`,
      patientId: patientId,
      prescriberName: scannedData.prescriber || 'Inconnu',
      prescriberRpps: scannedData.rpps || '',
      datePrescribed: scannedData.datePrescribed || new Date().toISOString().split('T')[0],
      dateExpiry: scannedData.dateExpiry || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      careDetails: scannedData.careDetails || '',
      status: 'active'
    };

    addPrescription(newPresc);
    setScannedData(null);
    alert("Ordonnance enregistrée et liée au dossier patient.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestion Ordonnances</h1>
          <p className="text-slate-500 font-medium mt-1">Extraction IA & Archivage clinique</p>
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 hover:scale-105 transition-all flex items-center gap-3"
        >
          {isScanning ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-camera"></i>}
          Scanner un document
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
      </div>

      {scannedData && (
        <div className="bg-white border-2 border-emerald-500 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
           <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl">
                 <i className="fa-solid fa-robot"></i>
              </div>
              <div>
                 <h2 className="text-xl font-black text-slate-900 leading-tight">Vérification des données extraites</h2>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Confirmez les informations pour le dossier</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Patient Détecté</p>
                    <p className="font-bold text-slate-800">{scannedData.patientName || "Non identifié"}</p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Prescripteur</p>
                    <p className="font-bold text-slate-800">Dr. {scannedData.prescriber} (RPPS: {scannedData.rpps})</p>
                 </div>
              </div>
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Prescription</p>
                       <p className="font-bold text-slate-800">{scannedData.datePrescribed}</p>
                    </div>
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                       <p className="text-[10px] font-black text-rose-400 uppercase mb-1">Échéance</p>
                       <p className="font-black text-rose-600">{scannedData.dateExpiry}</p>
                    </div>
                 </div>
                 <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">Soins identifiés</p>
                    <p className="text-sm font-bold text-emerald-800 italic leading-relaxed">"{scannedData.careDetails}"</p>
                 </div>
              </div>
           </div>

           <div className="flex gap-4">
              <button onClick={handleConfirm} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">Valider & Archiver</button>
              <button onClick={() => setScannedData(null)} className="px-8 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-sm uppercase tracking-widest">Annuler</button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {store.prescriptions.map(script => (
          <div key={script.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer relative group overflow-hidden">
             <div className="absolute top-0 right-0 px-4 py-1.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest">Actif</div>
             <h3 className="font-black text-xl text-slate-800 mb-1">{store.patients.find(p => p.id === script.patientId)?.lastName}</h3>
             <p className="text-xs font-bold text-slate-400 mb-6 flex items-center gap-2">
                <i className="fa-solid fa-user-doctor text-emerald-500"></i> Dr. {script.prescriberName}
             </p>
             <div className="p-4 bg-slate-50 rounded-2xl text-xs font-medium text-slate-600 italic line-clamp-3">
                {script.careDetails}
             </div>
             <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expire le {new Date(script.dateExpiry).toLocaleDateString()}</p>
                <i className="fa-solid fa-chevron-right text-slate-200 group-hover:text-emerald-500 transition-colors"></i>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrescriptionView;
