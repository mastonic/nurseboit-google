
import React, { useState, useEffect } from 'react';
import { getStore, saveStore, addLog, subscribeToStore, addTask, updateTask } from '../services/store';
import { Task } from '../types';

const TasksView: React.FC = () => {
  const [store, setStore] = useState(getStore());
  const [showModal, setShowModal] = useState<Task | 'add' | null>(null);

  useEffect(() => {
    return subscribeToStore(() => setStore(getStore()));
  }, []);

  const handleToggleStatus = (task: Task) => {
    const updated = { ...task, status: task.status === 'done' ? 'todo' : 'done' } as Task;
    updateTask(updated);
    addLog(`Tâche "${task.title}" marquée comme ${updated.status}`);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const priority = formData.get('priority') as any;
    const deadline = formData.get('deadline') as string;
    const ownerId = formData.get('ownerId') as string;
    const patientId = formData.get('patientId') as string;

    if (showModal === 'add') {
      const newTask: Task = {
        id: Date.now().toString(),
        title,
        priority,
        deadline,
        ownerId,
        patientId: patientId || undefined,
        status: 'todo'
      };
      addTask(newTask);
    } else if (typeof showModal === 'object') {
      updateTask({ ...showModal, title, priority, deadline, ownerId, patientId });
    }
    setShowModal(null);
  };

  const priorityStyles = {
    high: 'text-rose-600 bg-rose-50 border-rose-100',
    medium: 'text-amber-600 bg-amber-50 border-amber-100',
    low: 'text-blue-600 bg-blue-50 border-blue-100'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Coordination & Tâches</h1>
          <p className="text-slate-500 font-medium">To-do list partagée du cabinet.</p>
        </div>
        <button onClick={() => setShowModal('add')} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3">
           <i className="fa-solid fa-plus-circle"></i> Ajouter une tâche
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {store.tasks.map(task => (
           <div key={task.id} className={`bg-white p-6 rounded-[2rem] border transition-all ${task.status === 'done' ? 'opacity-50 grayscale border-slate-100' : 'border-slate-100 shadow-lg hover:border-emerald-200 group'}`}>
              <div className="flex justify-between items-start mb-5">
                 <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${priorityStyles[task.priority]}`}>
                    {task.priority}
                 </span>
                 <button onClick={() => handleToggleStatus(task)} className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-100 text-slate-300 hover:border-emerald-500'}`}>
                    <i className="fa-solid fa-check"></i>
                 </button>
              </div>
              <h3 className={`font-black text-lg text-slate-800 leading-tight mb-4 ${task.status === 'done' ? 'line-through' : ''}`}>{task.title}</h3>
              <div className="space-y-3">
                 {task.patientId && (
                   <p className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-2">
                     <i className="fa-solid fa-user-circle"></i>
                     {store.patients.find(p => p.id === task.patientId)?.lastName}
                   </p>
                 )}
                 <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center gap-2"><i className="fa-solid fa-calendar"></i> {new Date(task.deadline).toLocaleDateString()}</span>
                    <span className="flex items-center gap-2"><i className="fa-solid fa-user-nurse"></i> {store.users.find(u => u.id === task.ownerId)?.firstName}</span>
                 </div>
              </div>
           </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
           <form onSubmit={handleSave} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 space-y-6 animate-in zoom-in">
              <div className="flex justify-between items-center">
                 <h3 className="font-black text-2xl">{showModal === 'add' ? 'Nouvelle Tâche' : 'Modifier Tâche'}</h3>
                 <button type="button" onClick={() => setShowModal(null)} className="text-slate-300 hover:text-slate-600"><i className="fa-solid fa-xmark text-2xl"></i></button>
              </div>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Intitulé</label>
                    <input name="title" required defaultValue={typeof showModal === 'object' ? showModal.title : ''} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Priorité</label>
                       <select name="priority" defaultValue={typeof showModal === 'object' ? showModal.priority : 'medium'} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase">
                          <option value="low">Basse</option>
                          <option value="medium">Moyenne</option>
                          <option value="high">Haute</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Échéance</label>
                       <input name="deadline" type="date" required defaultValue={typeof showModal === 'object' ? showModal.deadline : new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Assigner à</label>
                    <select name="ownerId" required defaultValue={typeof showModal === 'object' ? showModal.ownerId : ''} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm">
                       {store.users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Lier au patient (Optionnel)</label>
                    <select name="patientId" defaultValue={typeof showModal === 'object' ? showModal.patientId : ''} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm">
                       <option value="">Aucun patient</option>
                       {store.patients.map(p => <option key={p.id} value={p.id}>{p.lastName} {p.firstName}</option>)}
                    </select>
                 </div>
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-200">Enregistrer</button>
           </form>
        </div>
      )}
    </div>
  );
};

export default TasksView;
