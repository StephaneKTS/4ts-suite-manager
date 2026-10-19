'use client';

import { useState } from 'react';
import Link from 'next/link';
import GestionArticles from './dashboard/components/GestionArticles';
import GestionDepots from './dashboard/components/GestionDepots';
import GestionFamilles from './dashboard/components/GestionFamilles';
import GestionFournisseurs from './dashboard/components/GestionFournisseurs';
import GestionClients from './dashboard/components/GestionClients';
import GestionCategoriesClients from './dashboard/components/GestionCategoriesClients';
import GestionMouvements from './dashboard/components/GestionMouvements';
import GestionApprovisionnements from './dashboard/components/GestionApprovisionnements';
import GestionRoles from './dashboard/components/GestionRoles';
import GestionUtilisateurs from './dashboard/components/GestionUtilisateurs';
import GestionRapports from './dashboard/components/GestionRapports';
import GestionVentesHistoriques from './dashboard/components/GestionVentesHistoriques'; // 👈 Pour Caisse & Ventes
import GestionCaisse from './dashboard/components/GestionJournalCaisse'; // 👈 Pour Trésorerie (mouvements_caisse)

export default function Home() {
  const [groupeActif, setGroupeActif] = useState('accueil');
  const [tableActive, setTableActive] = useState(null);
  const [deviceMode, setDeviceMode] = useState('full');

  const toutesLesTables = [
    { id: 'caisse', nom: 'Caisse & Ventes', icon: '🛒', bg: 'bg-blue-100 text-blue-700' },
    { id: 'articles_stock', nom: 'Stock', icon: '📦', bg: 'bg-amber-100 text-amber-700' },
    { id: 'depots_stock', nom: 'Dépôts', icon: '🏢', bg: 'bg-indigo-100 text-indigo-700' },
    { id: 'familles_articles', nom: 'Catégories', icon: '🏷️', bg: 'bg-orange-100 text-orange-700' },
    { id: 'mouvements_stock', nom: 'Transferts', icon: '🔄', bg: 'bg-cyan-100 text-cyan-700' },
    { id: 'approvisionnements', nom: 'Achats', icon: '📥', bg: 'bg-emerald-100 text-emerald-700' },
    { id: 'clients', nom: 'Clients', icon: '👥', bg: 'bg-purple-100 text-purple-700' },
    { id: 'categories_clients', nom: 'Grilles Tarifs', icon: '🏷️', bg: 'bg-teal-100 text-teal-700' },
    { id: 'fournisseurs', nom: 'Fournisseurs', icon: '🤝', bg: 'bg-rose-100 text-rose-700' },
    { id: 'roles', nom: 'Rôles', icon: '🛡️', bg: 'bg-amber-100 text-amber-700' },
    { id: 'utilisateurs', nom: 'Comptes', icon: '🔐', bg: 'bg-violet-100 text-violet-700' },
    { id: 'caisses', nom: 'Trésorerie', icon: '💵', bg: 'bg-emerald-100 text-emerald-700' },
  ];

  const getContainerWidth = () => {
    if (deviceMode === 'mobile') return 'max-w-[420px] border-x-4 border-slate-700 shadow-2xl my-4 rounded-3xl overflow-hidden';
    if (deviceMode === 'tablet') return 'max-w-[768px] border-x-4 border-slate-700 shadow-2xl my-4 rounded-2xl overflow-hidden';
    return 'w-full';
  };

  const getGridCols = () => {
    if (deviceMode === 'mobile') return 'grid-cols-3 gap-2';
    if (deviceMode === 'tablet') return 'grid-cols-4 gap-3';
    return 'grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-800 flex flex-col items-center font-sans">
      
      {/* BARRE DU SIMULATEUR */}
      <header className="bg-slate-950 text-white w-full py-2.5 px-4 flex justify-between items-center border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span className="bg-emerald-600 px-2 py-0.5 rounded text-[10px]">4TS PREVIEW</span>
          <span className="text-slate-400 hidden sm:inline">Simulateur d'affichage</span>
        </div>
        
        <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 space-x-1">
          <button 
            onClick={() => setDeviceMode('mobile')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition ${deviceMode === 'mobile' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            📱 Phone
          </button>
          <button 
            onClick={() => setDeviceMode('tablet')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition ${deviceMode === 'tablet' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            📑 Tablette
          </button>
          <button 
            onClick={() => setDeviceMode('full')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition ${deviceMode === 'full' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            💻 Plein Écran
          </button>
        </div>
      </header>

      {/* Cadre de l'Application Simulée */}
      <div className={`bg-slate-100 flex-1 flex flex-col transition-all duration-300 mx-auto ${getContainerWidth()}`}>
        
        {/* Carte Profil / En-tête */}
        <div className="p-3 sm:p-5 w-full">
          <div className="bg-[#005043] rounded-2xl p-3.5 sm:p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-600 text-white font-black text-base sm:text-xl w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-inner flex-shrink-0">
                4TS
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30 whitespace-nowrap">
                    ● Supabase Direct Cloud
                  </span>
                  <span className="bg-orange-500 text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap uppercase">
                    KEITA SHOP
                  </span>
                </div>
                <h1 className="text-sm sm:text-lg font-bold tracking-tight truncate">THEODORE STEPHANE</h1>
                <p className="text-emerald-200/80 text-[10px] sm:text-xs">ID Entreprise : <span className="font-semibold text-white">4TS-TEST</span></p>
              </div>
            </div>
            <div>
              <Link 
                href="/souscription" 
                className="inline-flex items-center space-x-1.5 bg-emerald-900/60 hover:bg-emerald-950 text-emerald-100 text-[10px] sm:text-xs px-3 py-1.5 rounded-lg border border-emerald-600/40 transition whitespace-nowrap"
              >
                <span>⚙️ Wizard Souscription</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Contenu Principal */}
        <main className="flex-1 px-3 sm:px-5 py-2 w-full pb-20">
          
          {/* ONGLET ACCUEIL */}
          {groupeActif === 'accueil' && !tableActive && (
            <div>
              <h2 className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-wider uppercase mb-2.5 px-1">
                ACCUEIL - TOUTES LES TABLES SUPABASE
              </h2>
              <div className={`grid ${getGridCols()} mb-6`}>
                {toutesLesTables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTableActive(t.id)}
                    className="bg-white border border-slate-200/90 hover:border-orange-500 rounded-xl p-2 sm:p-3.5 flex flex-col items-center text-center transition shadow-sm hover:shadow-md cursor-pointer group"
                  >
                    <span className="text-2xl sm:text-3xl mb-1 flex items-center justify-center transition group-hover:scale-105">
                      {t.icon}
                    </span>
                    <h3 className="text-[10px] sm:text-xs font-bold text-slate-800 leading-tight truncate w-full">
                      {t.nom}
                    </h3>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ONGLET RAPPORTS */}
          {groupeActif === 'rapports' && !tableActive && (
            <GestionRapports entrepriseId="4TS-TEST" />
          )}

          {/* ONGLET MON PROFIL */}
          {groupeActif === 'profil' && !tableActive && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 max-w-xl mx-auto shadow-sm space-y-3">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800">👤 Mon Profil & Espace Entreprise</h3>
              <p className="text-xs text-slate-500">Informations de l'entreprise, formule d'abonnement et licences.</p>
              <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Utilisateur</span>
                  <span className="font-semibold text-slate-800">Théodore Stéphane</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Entreprise</span>
                  <span className="font-semibold text-slate-800">KEITA SHOP (4TS-TEST)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Licence</span>
                  <span className="font-bold text-emerald-600">Standard Pro</span>
                </div>
              </div>
            </div>
          )}

          {/* ZONE DE CONTENU D'UNE TABLE ACTIVE SÉLECTIONNÉE */}
          {tableActive && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <button
                  onClick={() => setTableActive(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1"
                >
                  ⬅️ Retour au tableau de bord
                </button>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                  ● Connecté à Supabase
                </span>
              </div>

              {/* Injections dynamiques distinctes */}
              {tableActive === 'caisse' && <GestionVentesHistoriques entrepriseId="4TS-TEST" />}
              {tableActive === 'caisses' && <GestionCaisse entrepriseId="4TS-TEST" />}
              {tableActive === 'articles_stock' && <GestionArticles entrepriseId="4TS-TEST" />}
              {tableActive === 'depots_stock' && <GestionDepots entrepriseId="4TS-TEST" />}
              {tableActive === 'familles_articles' && <GestionFamilles entrepriseId="4TS-TEST" />}
              {tableActive === 'mouvements_stock' && <GestionMouvements entrepriseId="4TS-TEST" />}
              {tableActive === 'approvisionnements' && <GestionApprovisionnements entrepriseId="4TS-TEST" />}
              {tableActive === 'clients' && <GestionClients entrepriseId="4TS-TEST" />}
              {tableActive === 'categories_clients' && <GestionCategoriesClients entrepriseId="4TS-TEST" />}
              {tableActive === 'fournisseurs' && <GestionFournisseurs entrepriseId="4TS-TEST" />}
              {tableActive === 'roles' && <GestionRoles entrepriseId="4TS-TEST" />}
              {tableActive === 'utilisateurs' && <GestionUtilisateurs entrepriseId="4TS-TEST" />}

              {!['caisse', 'caisses', 'articles_stock', 'depots_stock', 'familles_articles', 'mouvements_stock', 'approvisionnements', 'clients', 'categories_clients', 'fournisseurs', 'roles', 'utilisateurs'].includes(tableActive) && (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                  <p className="text-3xl">🗄️</p>
                  <p className="font-bold text-sm text-slate-700">Module &laquo; {tableActive} &raquo;</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Prêt pour l'intégration du composant spécifique.
                  </p>
                </div>
              )}
            </div>
          )}

        </main>

        {/* Barre de Navigation Fixe en Bas */}
        <nav className="bg-white border-t border-slate-200 py-2 px-4 flex justify-around items-center text-center sticky bottom-0 z-40 shadow-lg">
          <button 
            onClick={() => { setGroupeActif('accueil'); setTableActive(null); }}
            className={`flex flex-col items-center transition ${groupeActif === 'accueil' && !tableActive ? 'text-orange-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <span className="text-base">🏠</span>
            <span className="text-[10px]">Accueil</span>
          </button>

          <button 
            onClick={() => { setGroupeActif('rapports'); setTableActive(null); }}
            className={`flex flex-col items-center transition ${groupeActif === 'rapports' ? 'text-orange-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <span className="text-base">📊</span>
            <span className="text-[10px]">Rapports</span>
          </button>

          <button 
            onClick={() => { setGroupeActif('profil'); setTableActive(null); }}
            className={`flex flex-col items-center transition ${groupeActif === 'profil' ? 'text-orange-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <span className="text-base">👤</span>
            <span className="text-[10px]">Mon Profil</span>
          </button>
        </nav>

      </div>
    </div>
  );
}