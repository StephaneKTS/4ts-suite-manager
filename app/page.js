'use client';

import { useState } from 'react';
import Link from 'next/link';

// Composants Icônes SVG
const IconStock = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const IconVentes = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const IconTiers = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const IconFinances = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconLogistique = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
  </svg>
);

const IconChart = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconUser = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default function Home() {
  const [activeTab, setActiveTab] = useState('accueil');

  const modulesAccueil = [
    { name: 'Gestion Stock', desc: 'Articles, dépôts & mouvements', icon: IconStock, href: '/dashboard', bg: 'bg-amber-100 text-amber-700' },
    { name: 'Ventes & Caisse', desc: 'Caisse & facturation', icon: IconVentes, href: '/dashboard', bg: 'bg-blue-100 text-blue-700' },
    { name: 'Tiers & Relations', desc: 'Clients & Fournisseurs', icon: IconTiers, href: '/dashboard', bg: 'bg-purple-100 text-purple-700' },
    { name: 'Finances & Trésor', desc: 'Caisses & Comptes', icon: IconFinances, href: '/dashboard', bg: 'bg-emerald-100 text-emerald-700' },
    { name: 'Logistique', desc: 'Courses & Flotte', icon: IconLogistique, href: '/dashboard', bg: 'bg-indigo-100 text-indigo-700' },
  ];

  const modulesRapports = [
    { name: 'Rapport Ventes', desc: 'Analyses quotidiennes', icon: IconChart, href: '/dashboard', bg: 'bg-emerald-100 text-emerald-700' },
    { name: 'État de Caisse', desc: 'Synthèse des flux', icon: IconFinances, href: '/dashboard', bg: 'bg-amber-100 text-amber-700' },
    { name: 'Inventaire Stock', desc: 'Valorisation des stocks', icon: IconStock, href: '/dashboard', bg: 'bg-blue-100 text-blue-700' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      
      {/* Carte En-tête / Profil (Fond vert émeraude identique PC/Phone) */}
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

      {/* Contenu Dynamique */}
      <main className="flex-1 px-3 md:px-6 py-2 max-w-7xl mx-auto w-full">
        
        {/* ONGLET ACCUEIL */}
        {activeTab === 'accueil' && (
          <div>
            <h2 className="text-xs md:text-sm font-bold text-slate-500 tracking-wider uppercase mb-3 px-1">
              ACCUEIL - MODULES DE GESTION
            </h2>
            
            <div className="grid grid-cols-4 md:grid-cols-5 gap-2 md:gap-4 mb-6">
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
              RAPPORTS & ANALYTIQUES
            </h2>

            <div className="grid grid-cols-4 md:grid-cols-5 gap-2 md:gap-4 mb-6">
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