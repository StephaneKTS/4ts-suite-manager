'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
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
import EspaceSouscription from './components/EspaceSouscription';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function DashboardContent() {
  const searchParams = useSearchParams();
  const entrepriseIdUrl = searchParams.get('entreprise') || '4TS-TEST';

  const [entrepriseId, setEntrepriseId] = useState(entrepriseIdUrl);
  const [infosEntreprise, setInfosEntreprise] = useState({
    nom_entreprise: 'CHARGEMENT...',
    email: '',
    espaces_souscrits: []
  });

  const [moduleActif, setModuleActif] = useState(null);
  const [ongletNavigation, setOngletNavigation] = useState('accueil');

  // Charger les informations réelles de l'entreprise depuis Supabase
  useEffect(() => {
    async function fetchEntrepriseData() {
      try {
        const { data, error } = await supabase
          .from('entreprises')
          .select('*')
          .eq('id_entreprise', entrepriseIdUrl)
          .maybeSingle();

        if (data) {
          setInfosEntreprise(data);
          setEntrepriseId(data.id_entreprise);
        } else {
          setInfosEntreprise({
            nom_entreprise: 'KEITA SHOP',
            email: 'bureauisma26@gmail.com',
            espaces_souscrits: ['Boutique']
          });
        }
      } catch (err) {
        console.error("Erreur de récupération entreprise :", err);
      }
    }

    fetchEntrepriseData();
  }, [entrepriseIdUrl]);

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
      case 'souscription': return <EspaceSouscription entrepriseId={entrepriseId} />;
      default: return null;
    }
  };

  const contenuApp = (
    <div className="min-h-screen bg-[#0d1b2a] text-slate-100 flex flex-col font-sans relative overflow-y-auto">
      
      {/* EN-TÊTE ÉPURÉ ET PROFESSIONNEL */}
      <div className="sticky top-0 z-20 bg-[#1b263b] border-b border-blue-900/50 px-4 py-3 text-white shadow-md shrink-0 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-600 text-white font-black text-sm px-2.5 py-1 rounded-lg shadow-xs">
            4TS
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white uppercase leading-none">
              {infosEntreprise.nom_entreprise}
            </h1>
            <p className="text-[10px] text-blue-300 font-mono mt-1">
              ID : {entrepriseId}
            </p>
          </div>
        </div>

        <div>
          {(moduleActif || ongletNavigation !== 'accueil') ? (
            <button
              onClick={() => { setModuleActif(null); setOngletNavigation('accueil'); }}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] transition border border-white/20 shadow-xs"
            >
              ← Accueil
            </button>
          ) : (
            <span className="text-[10px] bg-blue-950 text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-blue-800/50">
              ● En ligne
            </span>
          )}
        </div>
      </div>

      {/* CONTENU DE LA PAGE AVEC ESPACE SUFFISANT EN BAS (pb-24) */}
      <div className="p-4 space-y-4 flex-1 pb-24">
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
                  <h3 className="font-extrabold text-slate-100 text-sm">Administrateur</h3>
                  <p className="text-xs text-orange-400 font-bold">{infosEntreprise.email || 'Admin'}</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-blue-900/30">
                  <span className="text-blue-200/70 font-medium">Entreprise :</span>
                  <span className="font-bold text-slate-200 uppercase">{infosEntreprise.nom_entreprise}</span>
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

              <div className="pt-3 border-t border-blue-900/40 space-y-2.5">
                <button
                  onClick={() => setModuleActif('souscription')}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold p-3 rounded-xl transition flex items-center justify-between shadow-xs text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span>💳</span> Espace de Souscription & Paramètres
                  </span>
                  <span>→</span>
                </button>

                {/* Bouton de Déconnexion */}
                <button
                  onClick={() => {
                    if (confirm('Voulez-vous vraiment vous déconnecter de l’application ?')) {
                      localStorage.removeItem('entrepriseId');
                      localStorage.removeItem('utilisateurConnecte');
                      window.location.href = '/connexion';
                    }
                  }}
                  className="w-full bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800 font-bold p-3 rounded-xl transition flex items-center justify-center gap-2 shadow-xs text-xs"
                >
                  <span>🚪</span> Se déconnecter de la session
                </button>
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
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Création Caisse</span>
              </div>

              <div onClick={() => setModuleActif('articles')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">📦</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Stock Articles</span>
              </div>

              <div onClick={() => setModuleActif('depots')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🏢</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Dépôts de stock</span>
              </div>

              <div onClick={() => setModuleActif('familles')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🗂️</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Familles d'Articles</span>
              </div>

              <div onClick={() => setModuleActif('categories')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🏷️</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Catégories Clients</span>
              </div>

              <div onClick={() => setModuleActif('mouvements')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🔄</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Mouvement Stock</span>
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
      <div className="bg-[#1b263b] border-t border-blue-900/60 py-2.5 px-6 flex justify-around items-center fixed bottom-0 left-0 right-0 z-30 shadow-lg shrink-0">
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

export default function DashboardPrincipal() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d1b2a] text-white flex items-center justify-center">Chargement du dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}