
import React, { useState } from 'react';
import { getStore, saveStore, addLog } from '../services/store';

const TasksView: React.FC = () => {
  const store = getStore();
  const [tasks, setTasks] = useState(store.tasks);

  const toggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } as const : t);
    setTasks(updated);
    saveStore({ tasks: updated });
    addLog("Statut de tâche modifié");
  };

  const priorityColors = {
    high: 'text-rose-500 bg-rose-50 border-rose-100',
    medium: 'text-amber-500 bg-amber-50 border-amber-100',
    low: 'text-blue-500 bg-blue-50 border-blue-100'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tâches & Coordination</h1>
          <p className="text-slate-500 text-sm font-medium">Suivi des actions issues des réunions et du quotidien.</p>
        </div>
        <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 shadow-xl transition-all active:scale-95">
           <i className="fa-solid fa-plus-circle"></i>
           Ajouter une tâche
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {tasks.map(task => (
           <div key={task.id} className={`bg-white p-6 rounded-3xl border transition-all ${task.status === 'done' ? 'opacity-50 border-slate-100 grayscale' : 'border-slate-200 shadow-sm hover:border-emerald-200 group'}`}>
              <div className="flex justify-between items-start mb-4">
                 <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${priorityColors[task.priority]}`}>
                    {task.priority}
                 </span>
                 <button onClick={() => toggleTask(task.id)} className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-slate-300 group-hover:border-emerald-500'}`}>
                    <i className="fa-solid fa-check"></i>
                 </button>
              </div>
              <h3 className={`font-black text-lg text-slate-900 leading-tight ${task.status === 'done' ? 'line-through' : ''}`}>{task.title}</h3>
              <div className="mt-4 flex items-center gap-3 text-xs font-bold text-slate-400">
                 <div className="flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar-day"></i>
                    {task.deadline}
                 </div>
                 <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                 <div className="flex items-center gap-1.5">
                    <i className="fa-solid fa-user-tag"></i>
                    {/* Fix: Use store.users instead of non-existent store.nurses, and access firstName directly */}
                    {store.users.find(u => u.id === task.ownerId)?.firstName}
                 </div>
              </div>
           </div>
         ))}
         {tasks.length === 0 && (
           <div className="col-span-full py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
              <i className="fa-solid fa-clipboard-list text-5xl mb-4 opacity-20"></i>
              <p className="font-bold">Aucune tâche en cours.</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default TasksView;
