'use client';

import { useState } from 'react';

export default function SimulateurCadre({ children }) {
  const [mode, setMode] = useState('telephone');

  const getLargeurConteneur = () => {
    switch (mode) {
      case 'telephone': return 'max-w-[390px] h-[820px] shadow-2xl border-[10px] border-slate-800 rounded-[40px] my-4 flex flex-col bg-white overflow-hidden';
      case 'tablette': return 'max-w-[768px] h-[850px] shadow-2xl border-[10px] border-slate-800 rounded-[24px] my-4 flex flex-col bg-white overflow-hidden';
      default: return 'max-w-full h-screen flex flex-col bg-white overflow-hidden';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-2 sm:p-4 font-sans">
      
      {/* BARRE D'OUTILS DU HAUT */}
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl p-3 mb-4 flex flex-wrap justify-between items-center gap-3 shadow-lg shrink-0">
        <div className="flex items-center space-x-2">
          <span className="bg-emerald-700 text-white font-black text-[10px] px-3 py-1.5 rounded-xl uppercase shadow">
            4TS PREVIEW
          </span>
        </div>

        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setMode('telephone')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              mode === 'telephone' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            📱 Phone
          </button>
          <button
            onClick={() => setMode('tablette')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              mode === 'tablette' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            タブ Tablette
          </button>
          <button
            onClick={() => setMode('pc')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              mode === 'pc' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            💻 Plein Écran
          </button>
        </div>
      </div>

      {/* CADRE DE L'APPAREIL SIMULÉ */}
      <div className={`transition-all duration-300 w-full ${getLargeurConteneur()}`}>
        {children}
      </div>

    </div>
  );
}