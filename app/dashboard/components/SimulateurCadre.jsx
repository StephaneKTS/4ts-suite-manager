'use client';

import { useState, useEffect } from 'react';

export default function SimulateurCadre({ children, titreApp = '4TS MANAGER' }) {
  const [format, setFormat] = useState('tablette'); // 'phone', 'tablette', 'plein'
  const [moduleActuel, setModuleActuel] = useState('BOUTIQUE');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const mod = (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    setModuleActuel(mod);

    const handleStorageChange = () => {
      const modUpdated = (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
      setModuleActuel(modUpdated);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!isMounted) {
    return <div className="h-screen bg-slate-950 flex items-center justify-center text-white text-xs">Chargement du simulateur...</div>;
  }

  const getLargeurCadre = () => {
    switch (format) {
      case 'phone':
        return 'max-w-[420px] h-[92vh] max-h-[850px] shadow-2xl rounded-3xl border-[8px] border-slate-800';
      case 'tablette':
        return 'max-w-[850px] h-[94vh] max-h-[920px] shadow-2xl rounded-2xl border-[6px] border-slate-800';
      case 'plein':
      default:
        return 'w-full h-full rounded-none border-0';
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-between p-1 md:p-2 select-none">
      
      {/* BARRE DE CONTRÔLE SUPÉRIEURE DU SIMULATEUR (FIGÉE) */}
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-3 shadow-lg shrink-0 z-20">
        <div className="flex items-center space-x-2">
          <span className="bg-emerald-700 text-white font-black text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-inner">
            4TS PREVIEW [{moduleActuel}]
          </span>
          <span className="text-slate-400 text-[11px] font-bold hidden sm:inline">
            • {titreApp}
          </span>
        </div>

        {/* SÉLECTEURS DE FORMATS D'AFFICHAGE */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setFormat('phone')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-black transition flex items-center gap-1 ${
              format === 'phone'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>📱</span> Phone
          </button>
          
          <button
            type="button"
            onClick={() => setFormat('tablette')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-black transition flex items-center gap-1 ${
              format === 'tablette'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>タブ</span> Tablette
          </button>

          <button
            type="button"
            onClick={() => setFormat('plein')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-black transition flex items-center gap-1 ${
              format === 'plein'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>💻</span> Plein Écran
          </button>
        </div>
      </div>

      {/* CONTENEUR SIMULÉ DE L'APPLICATION */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden my-1">
        <div className={`bg-slate-900 transition-all duration-300 flex flex-col overflow-hidden ${getLargeurCadre()}`}>
          <div className="flex-1 w-full bg-slate-900 flex flex-col h-full overflow-hidden">
            {children}
          </div>
        </div>
      </div>

    </div>
  );
}