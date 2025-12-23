
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getStore, login } from '../services/store';

const Login: React.FC = () => {
  const { users } = getStore();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(selectedUserId, pin)) {
      navigate(from, { replace: true });
    } else {
      setError(true);
      setPin('');
    }
  };

  const addDigit = (digit: string) => {
    if (pin.length < 6) setPin(prev => prev + digit);
    setError(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 rotate-3">
             <i className="fa-solid fa-user-nurse text-4xl"></i>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">NurseBot</h1>
          <p className="text-slate-400 font-medium italic">Identification sécurisée du cabinet</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white p-8 rounded-[3rem] shadow-2xl space-y-8 border border-white/10">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Utilisateur</label>
            <div className="grid grid-cols-1 gap-2">
              {users.filter(u => u.active).map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUserId(u.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                    selectedUserId === u.id 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                    selectedUserId === u.id ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {u.firstName[0]}
                  </div>
                  <div className="text-left">
                    <p className={`font-black text-sm ${selectedUserId === u.id ? 'text-emerald-900' : 'text-slate-700'}`}>
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{u.role}</p>
                  </div>
                  {selectedUserId === u.id && <i className="fa-solid fa-circle-check text-emerald-500 ml-auto"></i>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-center gap-3">
              {[...Array(selectedUserId ? 4 : 0)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    i < pin.length ? 'bg-emerald-500 border-emerald-500 scale-125' : 'bg-transparent border-slate-200'
                  }`}
                ></div>
              ))}
            </div>

            {selectedUserId && (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <button 
                    key={n} 
                    type="button" 
                    onClick={() => addDigit(n.toString())}
                    className="h-14 bg-slate-50 rounded-2xl font-black text-slate-700 hover:bg-emerald-500 hover:text-white transition-all text-xl"
                  >
                    {n}
                  </button>
                ))}
                <button type="button" onClick={() => setPin('')} className="h-14 bg-slate-50 rounded-2xl font-black text-rose-500 hover:bg-rose-500 hover:text-white transition-all text-xs uppercase">Effacer</button>
                <button type="button" onClick={() => addDigit('0')} className="h-14 bg-slate-50 rounded-2xl font-black text-slate-700 hover:bg-emerald-500 hover:text-white transition-all text-xl">0</button>
                <button type="submit" className="h-14 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-600">OK</button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-center text-rose-500 text-xs font-black uppercase tracking-widest animate-bounce">
              Code PIN incorrect
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
