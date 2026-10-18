'use client';

import Link from 'next/link';

// Icônes épurées
const IconStock = () => (
  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
);
const IconPOS = () => (
  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);
const IconCaisse = () => (
  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
);
const IconLogistique = () => (
  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
);

const modules = [
  { name: 'Stock', desc: 'Gestion des articles', icon: IconStock, color: 'text-emerald-400', bgColor: 'bg-emerald-950/60' },
  { name: 'Ventes', desc: 'Point de vente', icon: IconPOS, color: 'text-blue-400', bgColor: 'bg-blue-950/60' },
  { name: 'Caisse', desc: 'Registres & Flux', icon: IconCaisse, color: 'text-amber-400', bgColor: 'bg-amber-950/60' },
  { name: 'Logistique', desc: 'Flotte & Livraisons', icon: IconLogistique, color: 'text-purple-400', bgColor: 'bg-purple-950/60' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      
      {/* En-tête / Carte Profil Compacte */}
      <div className="p-3">
        <div className="bg-emerald-900/80 border border-emerald-700/50 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30">
                ● Supabase Direct Cloud
              </span>
              <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                KEITA SHOP
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 my-2">
            <div className="bg-orange-600 text-white font-black text-lg w-10 h-10 rounded-xl flex items-center justify-center shadow">
              4TS
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-tight">THEODORE STEPHANE</h1>
              <p className="text-emerald-200/80 text-xs">ID Entreprise : <span className="font-semibold text-white">4TS-TEST</span></p>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-emerald-800/60 flex justify-between items-center">
            <Link 
              href="/souscription" 
              className="inline-flex items-center space-x-1 bg-emerald-950/70 hover:bg-emerald-950 text-emerald-200 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/40 transition"
            >
              <span>⚙️ Wizard Souscription</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-3 py-2 max-w-7xl mx-auto w-full">
        
        {/* Titre Section */}
        <h2 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2 px-1">
          ACCUEIL - MODULES DE GESTION
        </h2>

        {/* ALIGNEMENT 04 ICÔNES SUR LA MÊME LIGNE */}
        <div className="grid grid-cols-4 gap-1.5 md:gap-4 mb-4">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <div 
                key={index} 
                className="bg-slate-900/90 border border-slate-800/80 hover:border-emerald-500/50 rounded-xl p-2 md:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition shadow-sm"
              >
                <div className={`${module.bgColor} ${module.color} p-2 rounded-xl mb-1.5 flex items-center justify-center`}>
                  <Icon />
                </div>
                <h3 className="text-[10px] md:text-sm font-semibold text-slate-100 leading-tight">
                  {module.name}
                </h3>
                <p className="hidden md:block text-slate-400 text-xs mt-1">
                  {module.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Section Statut Compacte */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3">
          <div className="flex justify-between items-center text-center">
            <div>
              <span className="block text-[9px] text-slate-400">Base</span>
              <span className="text-xs font-bold text-emerald-400">Connecté</span>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div>
              <span className="block text-[9px] text-slate-400">Hébergement</span>
              <span className="text-xs font-bold text-blue-400">Vercel</span>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div>
              <span className="block text-[9px] text-slate-400">Licence</span>
              <span className="text-xs font-bold text-amber-400">Pro Active</span>
            </div>
          </div>
        </div>

      </main>

      {/* Barre de Navigation du Bas */}
      <nav className="bg-slate-900 border-t border-slate-800 py-2 px-6 flex justify-around items-center text-center sticky bottom-0 z-50">
        <button className="flex flex-col items-center text-emerald-400">
          <span className="text-base">🏠</span>
          <span className="text-[10px] font-medium">Accueil</span>
        </button>
        <button className="flex flex-col items-center text-slate-400 hover:text-white">
          <span className="text-base">📊</span>
          <span className="text-[10px] font-medium">Rapports</span>
        </button>
        <button className="flex flex-col items-center text-slate-400 hover:text-white">
          <span className="text-base">👤</span>
          <span className="text-[10px] font-medium">Mon Profil</span>
        </button>
      </nav>

    </div>
  );
}