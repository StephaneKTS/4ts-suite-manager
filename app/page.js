'use client';

import { useState } from 'react';
import Link from 'next/link';

// Icônes SVG professionnelles
const IconPOS = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);
const IconStock = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
);
const IconDepot = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
);
const IconFamille = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
);
const IconMouvement = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
);
const IconAppro = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
const IconClients = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);
const IconFournisseurs = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
);
const IconRoles = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
);
const IconComptes = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
);
const IconCaisses = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);
const IconJournal = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
);
const IconTresorerie = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

export default function Home() {
  const [activeTab, setActiveTab] = useState('accueil');

  // Toutes les icônes de tables directement sur la page d'Accueil
  const modulesAccueil = [
    { name: 'Caisse & Vente', desc: 'Interface de facturation', icon: IconPOS, href: '/dashboard', bg: 'bg-blue-100 text-blue-700' },
    { name: 'Articles & Stock', desc: 'Catalogue produits & prix', icon: IconStock, href: '/dashboard', bg: 'bg-amber-100 text-amber-700' },
    { name: 'Dépôts & Magasins', desc: 'Entrepôts et emplacements', icon: IconDepot, href: '/dashboard', bg: 'bg-indigo-100 text-indigo-700' },
    { name: 'Familles & Cat.', desc: 'Classification produits', icon: IconFamille, href: '/dashboard', bg: 'bg-orange-100 text-orange-700' },
    { name: 'Mouvements Stock', desc: 'Transferts et inventaires', icon: IconMouvement, href: '/dashboard', bg: 'bg-cyan-100 text-cyan-700' },
    { name: 'Approvisionnements', desc: 'Achats et réceptions', icon: IconAppro, href: '/dashboard', bg: 'bg-emerald-100 text-emerald-700' },
    { name: 'Fichier Clients', desc: 'Répertoire et crédits', icon: IconClients, href: '/dashboard', bg: 'bg-purple-100 text-purple-700' },
    { name: 'Fournisseurs', desc: 'Dettes & coordonnées', icon: IconFournisseurs, href: '/dashboard', bg: 'bg-rose-100 text-rose-700' },
    { name: 'Gestion des Rôles', desc: 'Titres et fonctions', icon: IconRoles, href: '/dashboard', bg: 'bg-teal-100 text-teal-700' },
    { name: 'Comptes Utilisateurs', desc: 'Permissions & accès', icon: IconComptes, href: '/dashboard', bg: 'bg-violet-100 text-violet-700' },
    { name: 'Gestion Caisses', desc: 'Caisses physiques', icon: IconCaisses, href: '/dashboard', bg: 'bg-emerald-100 text-emerald-700' },
  ];

  // Toutes les icônes de rapports sur l'onglet Rapports
  const modulesRapports = [
    { name: 'Journal des Ventes', desc: 'Consultation tickets émis', icon: IconJournal, href: '/dashboard', bg: 'bg-indigo-100 text-indigo-700' },
    { name: 'Trésorerie & Comptabilité', desc: 'Grand livre et clôture', icon: IconTresorerie, href: '/dashboard', bg: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      
      {/* En-tête / Carte Profil */}
      <div className="p-3 md:p-6 max-w-7xl mx-auto w-full">
        <div className="bg-[#005043] rounded-3xl p-4 md:p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-600 text-white font-black text-xl w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner">
              4TS
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] md:text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  ● Supabase Direct Cloud
                </span>
                <span className="bg-orange-500 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full">
                  KEITA SHOP
                </span>
              </div>
              <h1 className="text-lg md:text-2xl font-bold tracking-tight">THEODORE STEPHANE</h1>
              <p className="text-emerald-200/80 text-xs md:text-sm">ID Entreprise : <span className="font-semibold text-white">4TS-TEST</span></p>
            </div>
          </div>
          <div>
            <Link 
              href="/souscription" 
              className="inline-flex items-center space-x-2 bg-emerald-900/60 hover:bg-emerald-950 text-emerald-100 text-xs md:text-sm px-4 py-2 rounded-xl border border-emerald-600/40 transition"
            >
              <span>⚙️ Wizard Souscription</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Contenu Principal */}
      <main className="flex-1 px-3 md:px-6 py-2 max-w-7xl mx-auto w-full">
        
        {/* ONGLET ACCUEIL */}
        {activeTab === 'accueil' && (
          <div>
            <h2 className="text-xs md:text-sm font-bold text-slate-500 tracking-wider uppercase mb-3 px-1">
              ACCUEIL - TOUTES LES TABLES SUPABASE
            </h2>
            <div className="grid grid-cols-4 md:grid-cols-4 gap-2 md:gap-4 mb-6">
              {modulesAccueil.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link 
                    key={idx} 
                    href={item.href}
                    className="bg-white border border-slate-200/80 hover:border-orange-500 rounded-2xl p-2.5 md:p-5 flex flex-col items-center text-center transition shadow-sm hover:shadow-md cursor-pointer group"
                  >
                    <div className={`${item.bg} p-2.5 md:p-4 rounded-2xl mb-2 flex items-center justify-center transition group-hover:scale-105`}>
                      <Icon />
                    </div>
                    <h3 className="text-[11px] md:text-sm font-bold text-slate-800 leading-tight">
                      {item.name}
                    </h3>
                    <p className="hidden md:block text-slate-400 text-xs mt-1">
                      {item.desc}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ONGLET RAPPORTS */}
        {activeTab === 'rapports' && (
          <div>
            <h2 className="text-xs md:text-sm font-bold text-slate-500 tracking-wider uppercase mb-3 px-1">
              RAPPORTS & COMPTABILITÉ
            </h2>
            <div className="grid grid-cols-4 md:grid-cols-4 gap-2 md:gap-4 mb-6">
              {modulesRapports.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link 
                    key={idx} 
                    href={item.href}
                    className="bg-white border border-slate-200/80 hover:border-orange-500 rounded-2xl p-2.5 md:p-5 flex flex-col items-center text-center transition shadow-sm hover:shadow-md cursor-pointer group"
                  >
                    <div className={`${item.bg} p-2.5 md:p-4 rounded-2xl mb-2 flex items-center justify-center transition group-hover:scale-105`}>
                      <Icon />
                    </div>
                    <h3 className="text-[11px] md:text-sm font-bold text-slate-800 leading-tight">
                      {item.name}
                    </h3>
                    <p className="hidden md:block text-slate-400 text-xs mt-1">
                      {item.desc}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ONGLET MON PROFIL */}
        {activeTab === 'profil' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-xl mx-auto shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-4">Profil & Paramètres</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Utilisateur</span>
                <span className="font-semibold text-slate-800">Théodore Stéphane</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Entreprise</span>
                <span className="font-semibold text-slate-800">KEITA SHOP (4TS-TEST)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Licence</span>
                <span className="font-bold text-emerald-600">Standard Pro</span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Barre de Navigation Fixe en Bas */}
      <nav className="bg-white border-t border-slate-200 py-2.5 px-6 flex justify-around items-center text-center sticky bottom-0 z-50 shadow-lg">
        <button 
          onClick={() => setActiveTab('accueil')}
          className={`flex flex-col items-center transition ${activeTab === 'accueil' ? 'text-orange-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <span className="text-lg">🏠</span>
          <span className="text-[10px] md:text-xs">Accueil</span>
        </button>

        <button 
          onClick={() => setActiveTab('rapports')}
          className={`flex flex-col items-center transition ${activeTab === 'rapports' ? 'text-orange-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <span className="text-lg">📊</span>
          <span className="text-[10px] md:text-xs">Rapports</span>
        </button>

        <button 
          onClick={() => setActiveTab('profil')}
          className={`flex flex-col items-center transition ${activeTab === 'profil' ? 'text-orange-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <span className="text-lg">👤</span>
          <span className="text-[10px] md:text-xs">Mon Profil</span>
        </button>
      </nav>

    </div>
  );
}