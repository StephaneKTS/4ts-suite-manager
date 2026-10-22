'use client';

import { useState, useEffect } from 'react';

export default function SimulateurCadre({ children, titreApp = '4TS MANAGER' }) {
  const [format, setFormat] = useState('tablette'); // 'phone', 'tablette', 'plein'
  const [moduleActuel, setModuleActuel] = useState('BOUTIQUE');
  const [isMounted, setIsMounted] = useState(false);

  // Synchronisation sécurisée du module actif pour éviter tout décalage d'hydratation SSR
  useEffect(() => {
    setIsMounted(true);
    const mod = (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    setModuleActuel(mod);

    // Écouteur pour actualiser instantanément si le module change dans un autre onglet/composant
    const handleStorageChange = () => {
      const modUpdated = (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
      setModuleActuel(modUpdated);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Évite le rendu asynchrone avant le montage complet du composant client
  if (!isMounted) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs">Chargement du simulateur...</div>;
  }

  // Largeurs dynamiques du conteneur selon le format choisi
  const getLargeurCadre = () => {
    switch (format) {
      case 'phone':
        return 'max-w-[420px] shadow-2xl rounded-3xl border-[8px] border-slate-800 my-4';
      case 'tablette':
        return 'max-w-[850px] shadow-2xl rounded-2xl border-[6px] border-slate-800 my-4';
      case 'plein':
      default:
        return 'w-full min-h-screen rounded-none border-0 my-0';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-start p-0 md:p-3 select-none">
      
      {/* BARRE DE CONTRÔLE SUPÉRIEURE DU SIMULATEUR */}
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-2">
          <span className="bg-emerald-700 text-white font-black text-[10px] px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-inner">
            4TS PREVIEW [{moduleActuel}]
          </span>
          <span className="text-slate-400 text-[11px] font-bold hidden sm:inline">
            • {titreApp}
          </span>
        </div>

        {/* SÉLECTEURS DE FORMATS D'AFFICHAGE */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setFormat('phone')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition flex items-center gap-1.5 ${
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
      <div className={`bg-slate-900 transition-all duration-300 overflow-hidden flex flex-col ${getLargeurCadre()}`}>
        <div className="flex-1 w-full bg-slate-900 overflow-y-auto p-2 sm:p-4">
          {children}
        </div>
      </div>

    </div>
  );
}