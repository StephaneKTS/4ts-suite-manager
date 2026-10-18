'use client';

import { useState } from 'react';
import GestionArticles from './components/GestionArticles';
import GestionDepots from './components/GestionDepots';
import GestionFamilles from './components/GestionFamilles';
import GestionFournisseurs from './components/GestionFournisseurs';
import GestionClients from './components/GestionClients';
import GestionCategoriesClients from './components/GestionCategoriesClients';
import GestionMouvements from './components/GestionMouvements';
import GestionApprovisionnements from './components/GestionApprovisionnements';
import GestionRoles from './components/GestionRoles';
import GestionUtilisateurs from './components/GestionUtilisateurs';
import GestionRapports from './components/GestionRapports';

export default function DashboardDirect() {
  const [groupeActif, setGroupeActif] = useState('accueil');
  const [tableActive, setTableActive] = useState(null);
  const [vueToutVoir, setVueToutVoir] = useState(false); // Mode plein écran pour toutes les tables
  const [tiroirOuvert, setTiroirOuvert] = useState(null);
  const [rechercheToutVoir, setRechercheToutVoir] = useState('');

  // Liste exhaustive de toutes les tables Supabase
  const toutesLesTables = [
    { id: 'caisse', nom: 'Caisse & Vente Directe', icon: '🛒', desc: 'Interface de facturation' },
    { id: 'articles_stock', nom: 'Articles & Stock', icon: '📦', desc: 'Catalogue produits et prix' },
    { id: 'depots_stock', nom: 'Dépôts & Magasins', icon: '🏢', desc: 'Entrepôts et emplacements' },
    { id: 'familles_articles', nom: 'Familles & Catégories', icon: '🏷️', desc: 'Classification produits' },
    { id: 'mouvements_stock', nom: 'Mouvements Stock', icon: '🔄', desc: 'Transferts, inventaires et avaries' },
    { id: 'approvisionnements', nom: 'Approvisionnements', icon: '📥', desc: 'Achats et réceptions' },
    { id: 'clients', nom: 'Fichier Clients', icon: '👥', desc: 'Répertoire et crédits clients' },
    { id: 'categories_clients', nom: 'Catégories Clients', icon: '🏷️', desc: 'Grilles tarifaires, remises et TVA' },
    { id: 'fournisseurs', nom: 'Fournisseurs', icon: '🤝', desc: 'Dettes et coordonnées fournisseurs' },
    { id: 'roles', nom: 'Gestion des Rôles', icon: '🛡️', desc: 'Titres et fonctions du personnel' },
    { id: 'utilisateurs', nom: 'Comptes Utilisateurs', icon: '🔐', desc: 'Permissions et accès par agent' },
    { id: 'caisses', nom: 'Gestion Caisses', icon: '💵', desc: 'Caisses physiques et trésorerie' },
  ];

  // Groupes de gestion de l'Accueil
  const groupesAccueil = [
    {
      id: 'stock',
      nom: 'Gestion Stock',
      icon: '📦',
      desc: 'Articles, dépôts, familles, mouvements et approvisionnements',
      tables: [
        { id: 'articles_stock', nom: 'Articles & Stock', icon: '📦', desc: 'Catalogue produits et prix' },
        { id: 'depots_stock', nom: 'Dépôts & Magasins', icon: '🏢', desc: 'Entrepôts et emplacements' },
        { id: 'familles_articles', nom: 'Familles & Catégories', icon: '🏷️', desc: 'Classification produits' },
        { id: 'mouvements_stock', nom: 'Mouvements Stock', icon: '🔄', desc: 'Transferts, inventaires et avaries' },
        { id: 'approvisionnements', nom: 'Approvisionnements', icon: '📥', desc: 'Achats et réceptions' },
      ],
    },
    {
      id: 'caisse',
      nom: 'Ventes & Caisse',
      icon: '🛒',
      desc: 'Caisse enregistreuse et facturation directe',
      tables: [
        { id: 'caisse', nom: 'Caisse & Vente Directe', icon: '🛒', desc: 'Interface de facturation' },
      ],
    },
    {
      id: 'tiers',
      nom: 'Tiers & Relations',
      icon: '👥',
      desc: 'Répertoire clients, catégories, fournisseurs, rôles et accès',
      tables: [
        { id: 'clients', nom: 'Fichier Clients', icon: '👥', desc: 'Répertoire et crédits clients' },
        { id: 'categories_clients', nom: 'Catégories Clients', icon: '🏷️', desc: 'Grilles tarifaires, remises et TVA' },
        { id: 'fournisseurs', nom: 'Fournisseurs', icon: '🤝', desc: 'Dettes et coordonnées fournisseurs' },
        { id: 'roles', nom: 'Gestion des Rôles', icon: '🛡️', desc: 'Titres et fonctions du personnel' },
        { id: 'utilisateurs', nom: 'Comptes Utilisateurs', icon: '🔐', desc: 'Permissions et accès par agent' },
      ],
    },
    {
      id: 'finances',
      nom: 'Finances & Trésorerie',
      icon: '💵',
      desc: 'Caisses physiques, comptes et trésorerie',
      tables: [
        { id: 'caisses', nom: 'Gestion Caisses', icon: '💵', desc: 'Caisses physiques et trésorerie' },
      ],
    },
  ];

  const ClicSurBlocAccueil = (groupe) => {
    if (groupe.tables && groupe.tables.length === 1) {
      setTableActive(groupe.tables[0].id);
      setTiroirOuvert(null);
    } else {
      setTiroirOuvert(groupe);
    }
  };

  const selectionnerSousTable = (tableId) => {
    setTableActive(tableId);
    setTiroirOuvert(null);
    setVueToutVoir(false);
  };

  const tablesFiltreesToutVoir = toutesLesTables.filter((t) =>
    t.nom.toLowerCase().includes(rechercheToutVoir.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-3 sm:p-6 font-sans pb-28">
      <div className="max-w-6xl mx-auto space-y-5">
        
        {/* En-tête de l'application */}
        <div className="bg-[#005a5b] text-white p-4 sm:p-6 rounded-3xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg">
              4TS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  ● Supabase Direct Cloud
                </span>
                <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  KEITA SHOP
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white mt-1">THEODORE STEPHANE</h1>
              <p className="text-emerald-100 text-xs">ID Entreprise : <code className="text-orange-300 font-bold">4TS-TEST</code></p>
            </div>
          </div>

          <a href="/souscription" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition border border-white/20 flex items-center gap-2">
            ⚙️ Wizard Souscription
          </a>
        </div>

        {/* CONTENU PRINCIPAL ACCUEIL (Mode Cartes de Blocs) */}
        {groupeActif === 'accueil' && !tableActive && !vueToutVoir && (
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
              ACCUEIL - MODULES DE GESTION
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              {groupesAccueil.map((g) => (
                <button
                  key={g.id}
                  onClick={() => ClicSurBlocAccueil(g)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 p-5 rounded-3xl flex flex-col items-center text-center gap-3 shadow-sm hover:shadow-md transition duration-200"
                >
                  <span className="text-4xl p-3 bg-slate-100 rounded-2xl">{g.icon}</span>
                  <div>
                    <span className="font-extrabold text-sm text-slate-800 block">{g.nom}</span>
                    <span className="text-[11px] text-slate-400 mt-1 block leading-snug">{g.desc}</span>
                  </div>
                </button>
              ))}

              {/* ICONE TOUT VOIR (Plein Écran) */}
              <button
                onClick={() => setVueToutVoir(true)}
                className="bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white p-5 rounded-3xl flex flex-col items-center text-center gap-3 shadow-md hover:shadow-lg transition duration-200"
              >
                <span className="text-4xl p-3 bg-white/20 rounded-2xl">🎛️</span>
                <div>
                  <span className="font-extrabold text-sm block">Tout Voir</span>
                  <span className="text-[11px] text-orange-100 mt-1 block leading-snug">Voir toutes les tables en plein écran</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* VUE PLEIN ÉCRAN : TOUT VOIR */}
        {groupeActif === 'accueil' && vueToutVoir && !tableActive && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎛️</span>
                <h2 className="text-sm font-extrabold uppercase text-slate-800">Toutes les Tables Supabase</h2>
              </div>
              <button
                onClick={() => {
                  setVueToutVoir(false);
                  setRechercheToutVoir('');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition"
              >
                ⬅️ Retour aux modules
              </button>
            </div>

            {/* Barre de recherche */}
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher une table..."
                value={rechercheToutVoir}
                onChange={(e) => setRechercheToutVoir(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 pl-11 text-sm text-slate-800 focus:outline-none focus:border-orange-500 shadow-sm"
              />
              <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
            </div>

            {/* Grille Plein Écran de toutes les tables */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {tablesFiltreesToutVoir.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectionnerSousTable(t.id)}
                  className="bg-white hover:bg-orange-50 hover:border-orange-200 border border-slate-200 p-4 rounded-2xl flex flex-col items-center text-center gap-2 transition shadow-sm"
                >
                  <span className="text-3xl p-2.5 bg-slate-100 rounded-2xl">{t.icon}</span>
                  <div>
                    <span className="font-extrabold text-xs text-slate-800 block leading-tight">{t.nom}</span>
                    <span className="text-[10px] text-slate-400 block mt-1 line-clamp-1">{t.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CONTENU ONGLET RAPPORTS */}
        {groupeActif === 'rapports' && !tableActive && (
          <GestionRapports entrepriseId="4TS-TEST" />
        )}

        {/* CONTENU ONGLET MON PROFIL */}
        {groupeActif === 'profil' && !tableActive && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-lg text-slate-800">👤 Mon Profil & Espace Entreprise</h3>
            <p className="text-xs text-slate-500">Informations de l'entreprise, formule d'abonnement et licences.</p>
          </div>
        )}

        {/* ZONE DE CONTENU D'UNE TABLE ACTIVE SÉLECTIONNÉE */}
        {tableActive && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <button
                onClick={() => setTableActive(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1"
              >
                ⬅️ Retour au tableau de bord
              </button>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                ● Connecté à Supabase
              </span>
            </div>

            {/* Injections des composants */}
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

            {!['articles_stock', 'depots_stock', 'familles_articles', 'mouvements_stock', 'approvisionnements', 'clients', 'categories_clients', 'fournisseurs', 'roles', 'utilisateurs'].includes(tableActive) && (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                <p className="text-3xl">🗄️</p>
                <p className="font-bold text-sm text-slate-700">Table Supabase &laquo; {tableActive} &raquo;</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Prêt pour l'intégration du composant spécifique.
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* BOTTOM SHEET / TIROIR DU BAS (Pour les blocs multi-tables) */}
      {tiroirOuvert && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{tiroirOuvert.icon}</span>
                <h3 className="font-extrabold text-base text-slate-800">{tiroirOuvert.nom}</h3>
              </div>
              <button
                onClick={() => setTiroirOuvert(null)}
                className="text-slate-400 hover:text-slate-600 font-black p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tiroirOuvert.tables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectionnerSousTable(t.id)}
                  className="bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 p-3 rounded-2xl flex flex-col items-center text-center gap-1.5 transition"
                >
                  <span className="text-2xl">{t.icon}</span>
                  <span className="font-extrabold text-xs text-slate-800 leading-tight">{t.nom}</span>
                  <span className="text-[10px] text-slate-400 line-clamp-1">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BARRE DE NAVIGATION FIXE DU BAS */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 px-4 shadow-2xl z-40">
        <div className="max-w-md mx-auto flex justify-between items-center">
          {[
            { id: 'accueil', icon: '🏠', label: 'Accueil' },
            { id: 'rapports', icon: '📊', label: 'Rapports' },
            { id: 'profil', icon: '👤', label: 'Mon Profil' },
          ].map((item) => {
            const actif = groupeActif === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setGroupeActif(item.id);
                  setTableActive(null);
                  setTiroirOuvert(null);
                  setVueToutVoir(false);
                }}
                className={`flex flex-col items-center gap-1 transition px-4 py-1 rounded-xl ${
                  actif ? 'text-orange-600 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-600 font-medium'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[10px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}