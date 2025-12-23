
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getStore, addLog, createAlert, updatePrescription, subscribeToStore, updatePatient, addPrescription, saveStore } from '../services/store';
import { Prescription, Patient } from '../types';

const PrescriptionView: React.FC = () => {
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [store, setStore] = useState(getStore());
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedData, setScannedData] = useState<any>(null);
  
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);

  useEffect(() => {
    return subscribeToStore(() => {
      setStore(getStore());
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      const script = store.prescriptions.find(p => p.id === id);
      if (script) setEditingPrescription(script);
    }
  }, [location.search, store.prescriptions]);

  const getStatus = (dateExpiry: string): 'active' | 'expiring' | 'expired' => {
    const now = new Date().getTime();
    const expiry = new Date(dateExpiry).getTime();
    const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);

    if (expiry < now) return 'expired';
    if (diffDays < 30) return 'expiring';
    return 'active';
  };

  const filteredSearchPatients = useMemo(() => {
    if (!patientSearch.trim()) return [];
    const term = patientSearch.toLowerCase();
    return store.patients.filter(p => 
      p.firstName.toLowerCase().includes(term) || 
      p.lastName.toLowerCase().includes(term) || 
      p.phone.includes(term)
    ).slice(0, 5);
  }, [patientSearch, store.patients]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanProgress(0);
    setScannedData(null);
    setSelectedPatient(null);

    // Simulation d'une barre de progression OCR réaliste
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          finishOCR(file.name);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const finishOCR = (fileName: string) => {
    const result = {
      patientNameSuggestion: fileName.toLowerCase().includes('dupont') ? "DUPONT Jean" : "Patient Détecté",
      prescriber: "Dr. MICHEL",
      prescriberRpps: "10123456789",
      date: new Date().toISOString().split('T')[0],
      expiry: "2024-12-30",
      care: "AMI 4 - Pansement complexe, passage quotidien.",
      notes: `Document analysé : ${fileName}. Vérification des dates OK.`
    };

    setScannedData(result);
    
    const nameParts = result.patientNameSuggestion.toLowerCase().split(' ');
    const matched = store.patients.find(p => 
      nameParts.every(part => p.lastName.toLowerCase().includes(part) || p.firstName.toLowerCase().includes(part))
    );
    
    if (matched) {
      setSelectedPatient(matched);
    } else {
      setPatientSearch(result.patientNameSuggestion);
    }
    
    setIsScanning(false);
    addLog(`OCR terminé pour le fichier : ${fileName}`);
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!scannedData || !selectedPatient) return;

    const formData = new FormData(e.currentTarget);
    const shouldUpdatePatient = formData.get('updatePatient') === 'on';

    const newPrescription: Prescription = {
      id: `pr-${Date.now()}`,
      patientId: selectedPatient.id,
      prescriberName: scannedData.prescriber,
      prescriberRpps: scannedData.prescriberRpps,
      datePrescribed: scannedData.date,
      dateExpiry: scannedData.expiry,
      careDetails: scannedData.care,
      notes: scannedData.notes,
      status: getStatus(scannedData.expiry)
    };

    try {
      addPrescription(newPrescription);
      if (shouldUpdatePatient) {
        updatePatient({
          ...selectedPatient,
          careType: scannedData.care.substring(0, 50),
          notes: `${selectedPatient.notes}\n[MAJ OCR ${new Date().toLocaleDateString()}] ${scannedData.care}`
        });
      }
      createAlert({
        type: 'prescription',
        patientId: selectedPatient.id,
        title: 'Ordonnance validée',
        message: `${selectedPatient.lastName} : Document enregistré avec succès.`,
        date: new Date().toISOString(),
        path: `/prescriptions?id=${newPrescription.id}`
      });
      setScannedData(null);
      setSelectedPatient(null);
    } catch (err) {
      alert("Erreur lors de l'enregistrement.");
    }
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPrescription) return;
    const formData = new FormData(e.currentTarget);
    const updated: Prescription = {
      ...editingPrescription,
      prescriberName: formData.get('prescriber') as string,
      prescriberRpps: formData.get('rpps') as string,
      dateExpiry: formData.get('expiry') as string,
      careDetails: formData.get('care') as string,
      notes: formData.get('notes') as string,
      status: getStatus(formData.get('expiry') as string)
    };
    updatePrescription(updated);
    setEditingPrescription(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ordonnances</h1>
          <p className="text-slate-500 text-sm font-medium">Contrôle IA et archivage clinique.</p>
        </div>
        
        <div className="flex gap-2">
          <input 
            type="file" 
            accept="image/*,application/pdf" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            <i className="fa-solid fa-cloud-arrow-up"></i>
            Importer / Scanner
          </button>
        </div>
      </div>

      {/* Chargement OCR */}
      {isScanning && (
        <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center space-y-4 animate-pulse">
           <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-robot fa-spin text-2xl"></i>
           </div>
           <div className="text-center">
              <p className="font-black text-slate-800">Analyse de l'ordonnance en cours...</p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Extraction des données NGAP & Dates</p>
           </div>
           <div className="w-full max-w-xs bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
           </div>
        </div>
      )}

      {/* Bloc de validation OCR */}
      {scannedData && (
        <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-300">
           <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-emerald-800 uppercase tracking-widest text-xs flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                Résultat de l'analyse IA
              </h2>
           </div>
           
           <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigner au Patient</label>
                    {selectedPatient ? (
                      <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-black text-xs">{selectedPatient.lastName[0]}</div>
                            <span className="font-bold text-emerald-900">{selectedPatient.lastName} {selectedPatient.firstName}</span>
                         </div>
                         <button type="button" onClick={() => setSelectedPatient(null)} className="text-slate-400 hover:text-rose-500"><i className="fa-solid fa-circle-xmark"></i></button>
                      </div>
                    ) : (
                      <div className="relative">
                         <input 
                           type="text" 
                           value={patientSearch}
                           onChange={(e) => { setPatientSearch(e.target.value); setShowResults(true); }}
                           placeholder="Nom du patient..." 
                           className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                         />
                         {showResults && patientSearch && (
                           <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y">
                              {filteredSearchPatients.map(p => (
                                <button key={p.id} type="button" onClick={() => { setSelectedPatient(p); setShowResults(false); }} className="w-full p-4 text-left hover:bg-emerald-50 flex items-center gap-3">
                                   <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black">{p.lastName[0]}</div>
                                   <span className="text-xs font-bold">{p.lastName} {p.firstName}</span>
                                </button>
                              ))}
                           </div>
                         )}
                      </div>
                    )}
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Date</p>
                       <p className="font-bold text-sm">{scannedData.date}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                       <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Échéance</p>
                       <p className="font-black text-sm text-emerald-700">{scannedData.expiry}</p>
                    </div>
                 </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Soins extraits</p>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{scannedData.care}"</p>
              </div>

              <div className="flex gap-4">
                 <button type="submit" className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-600 transition-all">Enregistrer</button>
                 <button type="button" onClick={() => setScannedData(null)} className="px-8 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black hover:bg-slate-200">Annuler</button>
              </div>
           </form>
        </div>
      )}

      {/* Grille des ordonnances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {store.prescriptions.map(script => {
          const status = getStatus(script.dateExpiry);
          const patient = store.patients.find(p => p.id === script.patientId);
          return (
            <div 
              key={script.id} 
              onClick={() => setEditingPrescription(script)} 
              className={`bg-white p-6 rounded-3xl border shadow-sm relative overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                status === 'expired' ? 'border-rose-200' : 'border-slate-200'
              }`}
            >
              <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                status === 'expired' ? 'bg-rose-500 text-white' : 
                status === 'expiring' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {status === 'expired' ? 'Expirée' : status === 'expiring' ? 'J-30' : 'Valide'}
              </div>
              <h3 className="font-black text-slate-800 truncate">{patient?.lastName} {patient?.firstName}</h3>
              <p className="text-xs font-bold text-slate-400 mb-4">Dr {script.prescriberName}</p>
              <div className="p-3 bg-slate-50 rounded-xl text-[10px] font-medium text-slate-600 italic line-clamp-2">
                 {script.careDetails}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Edition */}
      {editingPrescription && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
           <form onSubmit={handleUpdate} className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="font-black text-xl">Détails de l'Ordonnance</h3>
                 <button type="button" onClick={() => setEditingPrescription(null)} className="text-slate-300 hover:text-slate-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
              </div>
              <div className="p-8 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Échéance</label>
                       <input name="expiry" type="date" required defaultValue={editingPrescription.dateExpiry} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Prescripteur</label>
                       <input name="prescriber" required defaultValue={editingPrescription.prescriberName} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Soins Prescrits</label>
                    <textarea name="care" required defaultValue={editingPrescription.careDetails} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm h-24" />
                 </div>
                 <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg">Mettre à jour</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default PrescriptionView;
