
import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <i className="fa-solid fa-user-nurse text-white text-xl"></i>
                        </div>
                        <span className="text-xl font-black tracking-tighter text-slate-900">NurseBot PRO</span>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                    >
                        Accès Cabinet
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest">L'IA au service de votre cabinet</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        Simplifiez votre tournée.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-indigo-500 italic">Boostez votre cabinet.</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg text-slate-500 font-medium leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-12 duration-700">
                        L'assistant intelligent qui gère vos ordonnances, vos transmissions et votre planning, pour que vous puissiez vous concentrer sur l'essentiel : vos patients.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-700">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-10 py-5 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-2xl shadow-emerald-200 hover:scale-105 transition-all text-sm w-full sm:w-auto"
                        >
                            Démarrer gratuitement
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:border-emerald-200 transition-colors group">
                            <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-2xl mb-8 shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-robot"></i>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-4">Triage Intelligent</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">
                                Notre IA master-agent analyse vos messages et trie automatiquement les dossiers, les soins et les urgences.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:border-indigo-200 transition-colors group">
                            <div className="w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center text-2xl mb-8 shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-file-medical"></i>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-4">OCR Ordonnances</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">
                                Prenez une photo, l'IA extrait les dates, le type de soin et le médecin traitant en quelques secondes.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:border-emerald-200 transition-colors group">
                            <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-2xl mb-8 shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-comments-dollar"></i>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-4">Transmissions Fluides</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">
                                Une passation de tournée simplifiée avec notifications en temps réel et validation visuelle instantanée.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof / Stats */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full"></div>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-12 relative z-10">Conçu par des infirmiers, pour des infirmiers.</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                        <div>
                            <p className="text-4xl font-black text-emerald-400 mb-2">+1500</p>
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Cabinets</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-emerald-400 mb-2">99.9%</p>
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Disponibilité</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-emerald-400 mb-2">30min</p>
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Gagnées / Jour</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-emerald-400 mb-2">🔒 RGPD</p>
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Data Health</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-slate-100">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                            <i className="fa-solid fa-user-nurse text-sm"></i>
                        </div>
                        <span className="text-lg font-black tracking-tighter text-slate-900">NurseBot PRO</span>
                    </div>
                    <div className="flex gap-8 text-slate-400 font-bold text-xs uppercase tracking-widest">
                        <a href="#" className="hover:text-slate-900 transition-colors">Confidentialité</a>
                        <a href="#" className="hover:text-slate-900 transition-colors">CGU</a>
                        <a href="#" className="hover:text-slate-900 transition-colors">Mentions Légales</a>
                    </div>
                    <p className="text-slate-400 font-medium text-sm">
                        © 2026 NurseBot PRO. Tous droits réservés.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
