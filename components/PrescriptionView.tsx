
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getStore, addLog, addPrescription, subscribeToStore } from '../services/store';
import { analyzePrescriptionOCR } from '../services/geminiService';
import { Prescription } from '../types';

const PrescriptionView: React.FC = () => {
  const [store, setStore] = useState(getStore());
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  const filteredPrescriptions = useMemo(() => {
    return store.prescriptions.filter(p => {
      const patient = store.patients.find(pat => pat.id === p.patientId);
      const matchesSearch = !searchTerm || 
        patient?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.prescriberName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    }).sort((a,b) => b.datePrescribed.localeCompare(a.datePrescribed));
  }, [store.prescriptions, store.patients, searchTerm, filterStatus]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
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
    const patientId = store.patients[0]?.id; // Default or mapping logic
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
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestion Ordonnances</h1>
          <p className="text-slate-500 font-medium mt-1">Extraction IA & Suivi de validité</p>
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 hover:scale-105 transition-all flex items-center gap-3 w-full md:w-auto justify-center"
        >
          {isScanning ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-camera"></i>}
          Scanner Ordonnance
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
         <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Chercher par patient ou docteur..." 
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
            {(['all', 'active', 'expired'] as const).map(s => (
              <button 
                key={s} 
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}
              >
                {s === 'all' ? 'Toutes' : s === 'active' ? 'Valides' : 'Expirées'}
              </button>
            ))}
         </div>
      </div>

      {scannedData && (
        <div className="bg-white border-2 border-emerald-500 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
           <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl">
                 <i className="fa-solid fa-robot"></i>
              </div>
              <h2 className="text-xl font-black text-slate-900">Vérification de l'extraction</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4 text-sm font-bold">
                 <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Docteur</p>
                    {scannedData.prescriber}
                 </div>
                 <div className="p-4 bg-emerald-50 rounded-2xl">
                    <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">Soins</p>
                    {scannedData.careDetails}
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Date</p>
                    {scannedData.datePrescribed}
                 </div>
                 <div className="p-4 bg-rose-50 rounded-2xl">
                    <p className="text-[10px] font-black text-rose-400 uppercase mb-1">Échéance</p>
                    {scannedData.dateExpiry}
                 </div>
              </div>
           </div>
           <div className="flex gap-4">
              <button onClick={handleConfirm} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Enregistrer</button>
              <button onClick={() => setScannedData(null)} className="px-8 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest">Annuler</button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrescriptions.map(script => {
           const patient = store.patients.find(p => p.id === script.patientId);
           const isExpired = script.status === 'expired' || new Date(script.dateExpiry) < new Date();
           return (
            <div key={script.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-lg transition-all relative group overflow-hidden">
               <div className={`absolute top-0 right-0 px-4 py-1.5 text-white text-[9px] font-black uppercase tracking-widest ${isExpired ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                  {isExpired ? 'Expiré' : 'Actif'}
               </div>
               <h3 className="font-black text-xl text-slate-800 mb-1 truncate">{patient?.lastName || 'Patient inconnu'}</h3>
               <p className="text-xs font-bold text-slate-400 mb-6 flex items-center gap-2">
                  <i className="fa-solid fa-user-doctor text-emerald-500"></i> Dr. {script.prescriberName}
               </p>
               <div className="p-4 bg-slate-50 rounded-2xl text-[11px] font-medium text-slate-600 italic line-clamp-3 mb-6">
                  {script.careDetails}
               </div>
               <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Fin : {new Date(script.dateExpiry).toLocaleDateString()}</span>
                  <i className="fa-solid fa-chevron-right text-slate-200 group-hover:text-emerald-500 transition-colors"></i>
               </div>
            </div>
        )})}
        {filteredPrescriptions.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-300 italic">Aucune ordonnance trouvée.</div>
        )}
      </div>
    </div>
  );
};

export default PrescriptionView;
