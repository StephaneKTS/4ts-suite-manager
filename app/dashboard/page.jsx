'use client';

import { useState } from 'react';
import SimulateurCadre from './components/SimulateurCadre';

// Importation de tous vos composants métiers indépendants
import GestionCaisses from './components/GestionCaisses';
import GestionVentesHistoriques from './components/GestionVentesHistoriques';
import GestionArticles from './components/GestionArticles';
import GestionDepots from './components/GestionDepots';
import GestionClients from './components/GestionClients';
import GestionCategoriesClients from './components/GestionCategoriesClients';
import GestionFournisseurs from './components/GestionFournisseurs';
import GestionApprovisionnements from './components/GestionApprovisionnements';
import GestionFamilles from './components/GestionFamilles';
import GestionMouvements from './components/GestionMouvements';
import GestionJournalCaisse from './components/GestionJournalCaisse';
import GestionRoles from './components/GestionRoles';
import GestionUtilisateurs from './components/GestionUtilisateurs';

export default function DashboardPrincipal() {
  const [moduleActif, setModuleActif] = useState(null);
  const [ongletNavigation, setOngletNavigation] = useState('accueil');
  const entrepriseId = '4TS-TEST';

  const rendreModuleActif = () => {
    switch (moduleActif) {
      case 'caisses': return <GestionCaisses entrepriseId={entrepriseId} />;
      case 'ventes': return <GestionVentesHistoriques entrepriseId={entrepriseId} />;
      case 'articles': return <GestionArticles entrepriseId={entrepriseId} />;
      case 'depots': return <GestionDepots entrepriseId={entrepriseId} />;
      case 'clients': return <GestionClients entrepriseId={entrepriseId} />;
      case 'categories': return <GestionCategoriesClients entrepriseId={entrepriseId} />;
      case 'fournisseurs': return <GestionFournisseurs entrepriseId={entrepriseId} />;
      case 'approvisionnements': return <GestionApprovisionnements entrepriseId={entrepriseId} />;
      case 'familles': return <GestionFamilles entrepriseId={entrepriseId} />;
      case 'mouvements': return <GestionMouvements entrepriseId={entrepriseId} />;
      case 'journal':
      case 'grand_livre':
      case 'controle':
        return <GestionJournalCaisse entrepriseId={entrepriseId} />;
      case 'roles': return <GestionRoles entrepriseId={entrepriseId} />;
      case 'utilisateurs': return <GestionUtilisateurs entrepriseId={entrepriseId} />;
      default: return null;
    }
  };

  // Contenu principal de l'application avec un fond aux teintes bleues inspirées du logo 4TS
  const contenuApp = (
    <div className="min-h-screen bg-[#0d1b2a] text-slate-100 flex flex-col justify-between font-sans pb-16 relative">
      
      {/* EN-TÊTE FIGÉ (STICKY) */}
      <div className="sticky top-0 z-20 bg-[#1b263b] border-b border-blue-900/50 p-4 text-white shadow-md">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-600 text-white font-black text-base px-3 py-1.5 rounded-xl shadow">
                4TS
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-blue-600 text-blue-100 text-[9px] font-bold px-2 py-0.5 rounded-full">
                    ● Supabase Direct Cloud
                  </span>
                  <span className="bg-orange-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    KEITA SHOP
                  </span>
                </div>
                <h1 className="text-base font-black tracking-wide mt-1 text-white">
                  THEODORE STEPHANE
                </h1>
                <p className="text-[11px] text-blue-300 font-medium">
                  ID Entreprise : <span className="font-mono font-bold text-white">{entrepriseId}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-blue-900/40">
            <span className="text-[11px] bg-blue-950 text-blue-200 font-bold px-3 py-1 rounded-xl border border-blue-800/50">
              ⚙️ Wizard Souscription
            </span>
            {(moduleActif || ongletNavigation !== 'accueil') && (
              <button
                onClick={() => { setModuleActif(null); setOngletNavigation('accueil'); }}
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] transition border border-white/20 shadow-xs"
              >
                ← Accueil
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONTENU DE LA PAGE */}
      <div className="p-4 space-y-4 flex-1">
        {ongletNavigation === 'rapports' && !moduleActif ? (
          <div className="space-y-3">
            <h2 className="text-[11px] font-black text-blue-300/70 uppercase tracking-wider px-1">
              TRÉSORERIE & COMPTABILITÉ DIRECTES
            </h2>

            <div className="grid grid-cols-1 gap-2.5">
              <div onClick={() => setModuleActif('journal')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3.5 rounded-2xl cursor-pointer transition flex items-center space-x-3 shadow-xs group">
                <span className="text-2xl group-hover:scale-110 transition">📝</span>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-xs">Saisie des Opérations</h3>
                  <p className="text-[10px] text-blue-200/70 mt-0.5">Entrées, dépenses multi-lignes et pièces auto.</p>
                </div>
              </div>

              <div onClick={() => setModuleActif('grand_livre')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3.5 rounded-2xl cursor-pointer transition flex items-center space-x-3 shadow-xs group">
                <span className="text-2xl group-hover:scale-110 transition">📖</span>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-xs">Grand Livre & Journal</h3>
                  <p className="text-[10px] text-blue-200/70 mt-0.5">Mouvements par période et par compte.</p>
                </div>
              </div>

              <div onClick={() => setModuleActif('controle')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3.5 rounded-2xl cursor-pointer transition flex items-center space-x-3 shadow-xs group">
                <span className="text-2xl group-hover:scale-110 transition">🛡️</span>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-xs">Contrôle & Clôture</h3>
                  <p className="text-[10px] text-blue-200/70 mt-0.5">Vérification caisse et versement central.</p>
                </div>
              </div>
            </div>
          </div>
        ) : ongletNavigation === 'profil' && !moduleActif ? (
          /* AFFICHAGE DÉTAILLÉ DU PROFIL ET DE L'ENTREPRISE */
          <div className="space-y-4">
            <h2 className="text-[11px] font-black text-blue-300/70 uppercase tracking-wider px-1">
              INFORMATIONS DU COMPTE & ENTREPRISE
            </h2>

            <div className="bg-[#1b263b] rounded-2xl p-5 shadow border border-blue-900/60 space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-blue-900/40">
                <div className="bg-blue-950 text-blue-300 p-3 rounded-2xl text-2xl font-black">
                  👤
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-sm">THEODORE STEPHANE</h3>
                  <p className="text-xs text-orange-400 font-bold">Commercial Directeur</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-blue-900/30">
                  <span className="text-blue-200/70 font-medium">Entreprise :</span>
                  <span className="font-bold text-slate-200">KEITA SHOP (ISMA Logistique)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-blue-900/30">
                  <span className="text-blue-200/70 font-medium">ID Entreprise :</span>
                  <span className="font-mono font-bold text-blue-400">{entrepriseId}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-blue-900/30">
                  <span className="text-blue-200/70 font-medium">Base de données :</span>
                  <span className="font-bold text-slate-200">Supabase Direct Cloud</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-blue-200/70 font-medium">Statut de la session :</span>
                  <span className="bg-blue-950 text-blue-400 font-bold px-2 py-0.5 rounded-full text-[10px]">● Actif</span>
                </div>
              </div>
            </div>
          </div>
        ) : !moduleActif ? (
          <div className="space-y-3">
            <h2 className="text-[11px] font-black text-blue-300/70 uppercase tracking-wider px-1">
              ACCUEIL - TOUTES LES TABLES SUPABASE
            </h2>

            <div className="grid grid-cols-3 gap-2.5">
              <div onClick={() => setModuleActif('ventes')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 shadow-2xs group">
                <span className="text-2xl group-hover:scale-110 transition">🛒</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Caisse & Ventes</span>
              </div>

              <div onClick={() => setModuleActif('caisses')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 shadow-2xs group">
                <span className="text-2xl group-hover:scale-110 transition">🏧</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Déclaration Caisses</span>
              </div>

              <div onClick={() => setModuleActif('articles')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">📦</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Stock Articles</span>
              </div>

              <div onClick={() => setModuleActif('depots')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🏢</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Dépôts de stock</span>
              </div>

              <div onClick={() => setModuleActif('categories')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🏷️</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Catégories / Familles</span>
              </div>

              <div onClick={() => setModuleActif('mouvements')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🔄</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Transferts & Mouvements</span>
              </div>

              <div onClick={() => setModuleActif('approvisionnements')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">📥</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Achats & Approvisionnement</span>
              </div>

              <div onClick={() => setModuleActif('clients')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">👥</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Gestion des Clients</span>
              </div>

              <div onClick={() => setModuleActif('roles')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🛡️</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Gestion des Rôles</span>
              </div>

              <div onClick={() => setModuleActif('fournisseurs')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🤝</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Gestion des Fournisseurs</span>
              </div>

              <div onClick={() => setModuleActif('utilisateurs')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🔑</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Comptes Utilisateurs</span>
              </div>

              <div onClick={() => setModuleActif('journal')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">💵</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Trésorerie & Caisse</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#1b263b] rounded-2xl shadow p-4 border border-blue-900/60 text-slate-100">
            {rendreModuleActif()}
          </div>
        )}
      </div>

      {/* BARRE DE NAVIGATION INFÉRIEURE FIXE */}
      <div className="bg-[#1b263b] border-t border-blue-900/60 py-2.5 px-6 flex justify-around items-center fixed bottom-0 left-0 right-0 z-30 shadow-lg">
        <button
          onClick={() => { setOngletNavigation('accueil'); setModuleActif(null); }}
          className={`flex flex-col items-center space-y-0.5 transition ${
            ongletNavigation === 'accueil' && !moduleActif ? 'text-orange-500 font-extrabold' : 'text-blue-200/60 hover:text-slate-100'
          }`}
        >
          <span className="text-lg">🏠</span>
          <span className="text-[10px]">Accueil</span>
        </button>

        <button
          onClick={() => { setOngletNavigation('rapports'); setModuleActif(null); }}
          className={`flex flex-col items-center space-y-0.5 transition ${
            ongletNavigation === 'rapports' && !moduleActif ? 'text-orange-500 font-extrabold' : 'text-blue-200/60 hover:text-slate-100'
          }`}
        >
          <span className="text-lg">📊</span>
          <span className="text-[10px]">Rapports</span>
        </button>

        <button
          onClick={() => { setOngletNavigation('profil'); setModuleActif(null); }}
          className={`flex flex-col items-center space-y-0.5 transition ${
            ongletNavigation === 'profil' && !moduleActif ? 'text-orange-500 font-extrabold' : 'text-blue-200/60 hover:text-slate-100'
          }`}
        >
          <span className="text-lg">👤</span>
          <span className="text-[10px]">Mon Profil</span>
        </button>
      </div>

    </div>
  );

  return (
    <div>
      <div className="hidden md:block">
        <SimulateurCadre>
          {contenuApp}
        </SimulateurCadre>
      </div>
      <div className="block md:hidden">
        {contenuApp}
      </div>
    </div>
  );
}