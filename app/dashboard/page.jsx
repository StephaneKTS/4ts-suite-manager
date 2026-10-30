'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import SimulateurCadre from './components/SimulateurCadre';

// Importation de tous vos composants métiers indépendants
import GestionCaisses from './components/GestionCaisses';
import GestionEmplacements from './components/GestionEmplacements';
import GestionVentesHistoriques from './components/GestionVentesHistoriques';
import GestionArticles from './components/GestionArticles';
import GestionDepots from './components/GestionDepots';
import GestionClients from './components/GestionClients';
import GestionCategoriesClients from './components/GestionCategoriesClients';
import GestionChallengesCommerciaux from './components/GestionChallengesCommerciaux';
import GestionFournisseurs from './components/GestionFournisseurs';
import GestionApprovisionnements from './components/GestionApprovisionnements';
import GestionFamilles from './components/GestionFamilles';
import GestionMouvements from './components/GestionMouvements';
import GestionJournalCaisse from './components/GestionJournalCaisse';
import GestionPlanComptable from './components/GestionPlanComptable';
import GestionRoles from './components/GestionRoles';
import GestionUtilisateurs from './components/GestionUtilisateurs';
import EspaceSouscription from './components/EspaceSouscription';
import GestionCommandesLivraison from './components/GestionCommandesLivraison';
import GrilleTarifaireLivraison from './components/GrilleTarifaireLivraison';
import MonProfil from './components/MonProfil';

// Importation de votre module de livraison
import ModuleLivraison from './livraison/page';

function DashboardContent() {
  const searchParams = useSearchParams();
  
  const entrepriseIdUrl = searchParams.get('entreprise') || 
    (typeof window !== 'undefined' ? localStorage.getItem('entrepriseId') : null) || 
    '4TS-234321';

  const [mounted, setMounted] = useState(false);
  const [entrepriseId, setEntrepriseId] = useState(entrepriseIdUrl);
  const [infosEntreprise, setInfosEntreprise] = useState({
    nom_entreprise: 'CHARGEMENT...',
    email: '',
    telephone: '',
    espaces_souscrits: [],
    module_actif: 'BOUTIQUE',
    logo: '',
    mot_de_passe: ''
  });

  const [moduleActif, setModuleActif] = useState(null);
  const [ongletNavigation, setOngletNavigation] = useState('accueil');
  const [moduleCourant, setModuleCourant] = useState('BOUTIQUE');
  
  const [utilisateurConnecte, setUtilisateurConnecte] = useState('STEPHANE KTS');
  const [emailConnecte, setEmailConnecte] = useState('stephs7352@gmail.com');
  const [permissionsUser, setPermissionsUser] = useState(null);
  
  const [logoEntreprise, setLogoEntreprise] = useState('');

  const [listeEntreprisesGlobales, setListeEntreprisesGlobales] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Initialisation et nettoyage de session / cache
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const ancienneCleCacheGlobal = '4ts_cache_global_legacy';
      if (localStorage.getItem(ancienneCleCacheGlobal)) {
        localStorage.removeItem(ancienneCleCacheGlobal);
      }

      const userLocal = localStorage.getItem('utilisateurConnecte');
      const emailLocal = localStorage.getItem('emailConnecte');
      if (userLocal && userLocal !== 'UTILISATEUR') {
        setUtilisateurConnecte(userLocal.toUpperCase());
      } else {
        setUtilisateurConnecte('STEPHANE KTS');
        localStorage.setItem('utilisateurConnecte', 'STEPHANE KTS');
      }

      if (emailLocal) {
        setEmailConnecte(emailLocal);
      } else {
        setEmailConnecte('stephs7352@gmail.com');
        localStorage.setItem('emailConnecte', 'stephs7352@gmail.com');
      }
    }
  }, []);

  // Synchronisation de l'entreprise
  useEffect(() => {
    async function fetchEntrepriseData() {
      const cleCacheDashboard = `4ts_dashboard_cache_${entrepriseIdUrl}`;
      try {
        if (typeof window !== 'undefined') {
          const cacheLocal = localStorage.getItem(cleCacheDashboard);
          if (cacheLocal) {
            const parsed = JSON.parse(cacheLocal);
            setInfosEntreprise(parsed);
            setEntrepriseId(parsed.id_entreprise);
            if (parsed.logo) setLogoEntreprise(parsed.logo);
          }
        }

        const { data: entData } = await supabase
          .from('entreprises')
          .select('*')
          .eq('id_entreprise', entrepriseIdUrl)
          .maybeSingle();

        if (entData) {
          setInfosEntreprise(entData);
          setEntrepriseId(entData.id_entreprise);
          setLogoEntreprise(entData.logo || '');

          if (typeof window !== 'undefined') {
            localStorage.setItem('entrepriseId', entData.id_entreprise);
            localStorage.setItem(cleCacheDashboard, JSON.stringify(entData));

            const modLocal = localStorage.getItem('module_actif');
            if (modLocal && entData.espaces_souscrits && entData.espaces_souscrits.map(m => m.toUpperCase()).includes(modLocal.toUpperCase())) {
              setModuleCourant(modLocal.toUpperCase());
            } else if (entData.module_actif) {
              setModuleCourant(entData.module_actif.toUpperCase());
              localStorage.setItem('module_actif', entData.module_actif.toUpperCase());
            }
          }

          if (entrepriseIdUrl === '4TS-234321') {
            setUtilisateurConnecte('STEPHANE KTS');
            localStorage.setItem('utilisateurConnecte', 'STEPHANE KTS');
            setEmailConnecte('stephs7352@gmail.com');
            localStorage.setItem('emailConnecte', 'stephs7352@gmail.com');
          }
        }
      } catch (err) {
        console.error("Erreur de récupération entreprise :", err);
      }
    }

    if (entrepriseIdUrl) {
      fetchEntrepriseData();
    }
  }, [entrepriseIdUrl]);

  // Synchronisation des permissions utilisateur
  useEffect(() => {
    async function fetchUserData() {
      if (!entrepriseId) return;
      try {
        const { data: usersList } = await supabase
          .from('utilisateurs')
          .select('*')
          .eq('id_entreprise', entrepriseId);

        let utilisateurTrouve = null;

        if (usersList && usersList.length > 0) {
          utilisateurTrouve = usersList.find(u => {
            const nomCompletBase = `${u.nom_complet || u.nom || ''} ${u.prenom || ''}`.trim().toLowerCase();
            const nomRecherche = utilisateurConnecte.toLowerCase();
            const matchNom = nomCompletBase.includes(nomRecherche) || nomRecherche.includes(nomCompletBase);
            const matchEmail = emailConnecte && u.email && u.email.toLowerCase() === emailConnecte.toLowerCase();
            return matchNom || matchEmail;
          });
        }

        if (utilisateurTrouve) {
          setPermissionsUser(utilisateurTrouve.permissions || null);
        }
      } catch (err) {
        console.error("Erreur chargement utilisateur :", err);
      }
    }
    fetchUserData();
  }, [emailConnecte, utilisateurConnecte, entrepriseId]);

  const estModeLivraison = moduleCourant === 'LIVRAISON';
  const emailActuel = emailConnecte || infosEntreprise.email || 'stephs7352@gmail.com';
  
  // Reconnaissance absolue et prioritaire du Super-Admin
  const estSuperAdmin = 
    emailActuel.toLowerCase().trim() === 'stephs7352@gmail.com' || 
    emailActuel.toLowerCase().trim() === 'bureauisma26@gmail.com' || 
    emailActuel.toLowerCase().trim() === 'stephanekts1312@gmail.com' ||
    utilisateurConnecte.includes('STÉPHANE') || 
    utilisateurConnecte.includes('KENMOE');

  const estAdminEntreprise = 
    estSuperAdmin || 
    utilisateurConnecte.toUpperCase().includes('ADMIN') || 
    utilisateurConnecte.toUpperCase() === (infosEntreprise.nom_entreprise || '').toUpperCase();

  const verifierPermission = (moduleId) => {
    if (estSuperAdmin) return true;
    if (!permissionsUser) return true;
    const permModule = permissionsUser[moduleId];
    if (!permModule) return true;
    return permModule.lecture === true;
  };

  const tenterAccesModule = (moduleId, nomModuleAffichage) => {
    if (verifierPermission(moduleId)) {
      setModuleActif(moduleId);
    } else {
      alert(`⛔ Accès refusé : Vous n'avez pas les droits de lecture sur le module "${nomModuleAffichage}".`);
    }
  };

  const chargerToutesLesEntreprises = async () => {
    setLoadingAdmin(true);
    try {
      const { data } = await supabase.from('entreprises').select('*');
      if (data) {
        setListeEntreprisesGlobales(data);
      }
    } catch (err) {
      console.error("Erreur chargement entreprises globales :", err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    if (moduleActif === 'super_admin_panel') {
      chargerToutesLesEntreprises();
    }
  }, [moduleActif]);

  const rendreModuleActif = () => {
    if (moduleActif === 'souscription') {
      return <EspaceSouscription entrepriseId={entrepriseId} />;
    }

    if (moduleActif === 'super_admin_panel') {
      return (
        <div className="space-y-4 p-4 text-xs">
          <div className="flex justify-between items-center border-b border-cyan-900 pb-2">
            <div>
              <h3 className="font-black text-cyan-400 uppercase text-sm">🛡️ Espace Super-Admin</h3>
              <p className="text-[10px] text-cyan-200/70">Gestion globale de toutes vos entreprises et plateformes 4TS.</p>
            </div>
            <button 
              onClick={chargerToutesLesEntreprises}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] transition shadow"
            >
              🔄 Actualiser
            </button>
          </div>

          {loadingAdmin ? (
            <div className="text-center py-8 text-cyan-300 font-bold">Chargement des entreprises...</div>
          ) : (
            <div className="space-y-3">
              <p className="font-bold text-slate-200">Total entreprises enregistrées : <span className="text-cyan-400">{listeEntreprisesGlobales.length}</span></p>
              
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {listeEntreprisesGlobales.map((ent) => (
                  <div key={ent.id_entreprise} className="bg-[#0b1329] border border-cyan-900/60 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white uppercase">{ent.nom_entreprise}</span>
                        <span className="bg-cyan-950 text-cyan-400 font-mono text-[10px] px-2 py-0.5 rounded border border-cyan-800">{ent.id_entreprise}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">📧 {ent.email || 'Aucun email'} | 📞 {ent.telephone || 'Aucun téléphone'}</p>
                      <p className="text-[10px] text-cyan-300">Module actif : <span className="uppercase font-bold">{ent.module_actif || 'BOUTIQUE'}</span></p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => {
                          window.location.href = `/dashboard?entreprise=${ent.id_entreprise}`;
                        }}
                        className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition shadow"
                      >
                        Accéder à l'espace →
                      </button>

                      <button
                        onClick={async () => {
                          if (confirm(`Voulez-vous vraiment supprimer l'entreprise "${ent.nom_entreprise}" (${ent.id_entreprise}) et toutes ses données ?`)) {
                            try {
                              await supabase.from('utilisateurs').delete().eq('id_entreprise', ent.id_entreprise);
                              const { error } = await supabase.from('entreprises').delete().eq('id_entreprise', ent.id_entreprise);
                              
                              if (error) throw error;
                              alert("Entreprise supprimée avec succès.");
                              chargerToutesLesEntreprises();
                            } catch (err) {
                              alert("Erreur lors de la suppression : " + err.message);
                            }
                          }
                        }}
                        className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800 font-bold px-3 py-1.5 rounded-lg text-[11px] transition"
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (estModeLivraison && moduleActif === 'module_livraison_specifique') {
      return <ModuleLivraison entrepriseId={entrepriseId} />;
    }

    switch (moduleActif) {
      case 'commandes_livraison': return <GestionCommandesLivraison entrepriseId={entrepriseId} />;
      case 'grille_tarifaire': return <GrilleTarifaireLivraison entrepriseId={entrepriseId} />;
      case 'challenges_commerciaux': return <GestionChallengesCommerciaux entrepriseId={entrepriseId} />;
      case 'caisses': return <GestionCaisses entrepriseId={entrepriseId} />;
      case 'emplacements': return <GestionEmplacements entrepriseId={entrepriseId} />;
      case 'ventes': return <GestionVentesHistoriques entrepriseId={entrepriseId} />;
      case 'articles': return <GestionArticles entrepriseId={entrepriseId} />;
      case 'depots': return <GestionDepots entrepriseId={entrepriseId} />;
      case 'clients': return <GestionClients entrepriseId={entrepriseId} />;
      case 'categories': return <GestionCategoriesClients entrepriseId={entrepriseId} />;
      case 'fournisseurs': return <GestionFournisseurs entrepriseId={entrepriseId} />;
      case 'approvisionnements': return <GestionApprovisionnements entrepriseId={entrepriseId} />;
      case 'familles': return <GestionFamilles entrepriseId={entrepriseId} />;
      case 'mouvements': return <GestionMouvements entrepriseId={entrepriseId} />;
      case 'plan_comptable': return <GestionPlanComptable entrepriseId={entrepriseId} />;
      case 'journal': return <GestionJournalCaisse entrepriseId={entrepriseId} vueInitiale="saisie_operations" />;
      case 'grand_livre': return <GestionJournalCaisse entrepriseId={entrepriseId} vueInitiale="grand_livre" />;
      case 'controle': return <GestionJournalCaisse entrepriseId={entrepriseId} vueInitiale="controle_cloture" />;
      case 'roles': return <GestionRoles entrepriseId={entrepriseId} />;
      case 'utilisateurs': return <GestionUtilisateurs entrepriseId={entrepriseId} />;
      default: return null;
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#050b18] text-white flex items-center justify-center font-sans text-xs">
        Chargement instantané de la suite 4TS...
      </div>
    );
  }

  const contenuApp = (
    <div className="min-h-screen bg-[#050b18] text-slate-100 flex flex-col font-sans relative overflow-y-auto w-full max-w-full">
      
      <div className="sticky top-0 z-20 bg-gradient-to-r from-[#0a1931] via-[#0d2347] to-[#0a1931] border-b border-cyan-500/30 px-3 sm:px-6 py-3 text-white shadow-lg shadow-cyan-950/40 shrink-0 flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0 rounded-xl bg-cyan-950/60 border border-cyan-500/40 p-1 shadow-inner">
            <img 
              src={logoEntreprise || "/logo-4ts.png"} 
              alt="4TS" 
              className="w-full h-full object-contain rounded-lg"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black tracking-tight text-white uppercase leading-none drop-shadow">
              4TS : {infosEntreprise.nom_entreprise}
            </h1>
            <p className="text-[10px] md:text-xs text-cyan-300 font-mono mt-1 uppercase">
              {moduleCourant} | 👤 {utilisateurConnecte}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {estSuperAdmin && (
            <button
              onClick={() => setModuleActif(moduleActif === 'super_admin_panel' ? null : 'super_admin_panel')}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black px-3 py-1.5 rounded-xl text-[11px] md:text-xs transition shadow border border-amber-400/50 flex items-center gap-1"
            >
              <span>🛡️</span> {moduleActif === 'super_admin_panel' ? 'Fermer superAdmin' : 'superAdmin'}
            </button>
          )}

          {(moduleActif || ongletNavigation !== 'accueil') ? (
            <button
              onClick={() => {
                if (['journal', 'grand_livre', 'controle', 'plan_comptable'].includes(moduleActif)) {
                  setModuleActif(null);
                  setOngletNavigation('rapports');
                } else {
                  setModuleActif(null);
                  setOngletNavigation('accueil');
                }
              }}
              className="bg-sky-900/60 hover:bg-sky-800 text-cyan-200 font-bold px-3 py-1.5 rounded-xl text-[11px] md:text-xs transition border border-cyan-500/40 shadow-sm flex items-center gap-1"
            >
              {['journal', 'grand_livre', 'controle', 'plan_comptable'].includes(moduleActif) ? '← Retour Comptabilité' : '← Accueil'}
            </button>
          ) : (
            <span className="text-[10px] md:text-xs bg-cyan-950 text-cyan-300 font-bold px-2.5 py-1 rounded-full border border-cyan-500/40 shadow-sm">
              ● En ligne
            </span>
          )}
        </div>
      </div>

      <div className="p-2 sm:p-4 md:p-6 space-y-4 flex-1 pb-24 w-full max-w-7xl mx-auto">
        {ongletNavigation === 'rapports' && !moduleActif ? (
          <div className="space-y-3 w-full">
            <h2 className="text-xs md:text-sm font-black text-cyan-400/80 uppercase tracking-wider px-1">
              COMPTABILITÉ
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {verifierPermission('ventes_historiques') && (
                <div onClick={() => tenterAccesModule('journal', 'Saisie des Opérations')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-4 rounded-2xl cursor-pointer transition flex items-center space-x-3 shadow-md group">
                  <span className="text-3xl group-hover:scale-110 transition">📝</span>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-sm md:text-base">Saisie des Opérations</h3>
                    <p className="text-[11px] md:text-xs text-cyan-200/70 mt-0.5">Entrées, dépenses multi-lignes et pièces auto.</p>
                  </div>
                </div>
              )}
              {verifierPermission('ventes_historiques') && (
                <div onClick={() => tenterAccesModule('plan_comptable', 'Plan Comptable')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-4 rounded-2xl cursor-pointer transition flex items-center space-x-3 shadow-md group">
                  <span className="text-3xl group-hover:scale-110 transition">📚</span>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-sm md:text-base">Plan Comptable</h3>
                    <p className="text-[11px] md:text-xs text-cyan-200/70 mt-0.5">Gestion et consultation du plan comptable.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : ongletNavigation === 'profil' && !moduleActif ? (
          <div className="space-y-4 w-full">
            <MonProfil entrepriseId={entrepriseId} />
          </div>
        ) : moduleActif === 'souscription' || moduleActif === 'super_admin_panel' ? (
          <div className="bg-[#0b1329] rounded-2xl shadow-lg p-4 sm:p-6 border border-cyan-900/60 text-slate-100 w-full">
            {rendreModuleActif()}
          </div>
        ) : !moduleActif && !estModeLivraison ? (
          <div className="space-y-3 w-full">
            <h2 className="text-xs md:text-sm font-black text-cyan-400/80 uppercase tracking-wider px-1">
              ACCUEIL
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
              {verifierPermission('caisse') && (
                <div onClick={() => tenterAccesModule('ventes', 'Caisse & Ventes')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 shadow-sm group">
                  <span className="text-3xl group-hover:scale-110 transition">🛒</span>
                  <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Caisse & Ventes</span>
                </div>
              )}
              {verifierPermission('caisses') && (
                <div onClick={() => tenterAccesModule('caisses', 'Gestion Caisses')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 shadow-sm group">
                  <span className="text-3xl group-hover:scale-110 transition">🏧</span>
                  <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Création Caisse</span>
                </div>
              )}
              {verifierPermission('depots_stock') && (
                <div onClick={() => tenterAccesModule('emplacements', 'Emplacements Stock')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 shadow-sm group">
                  <span className="text-3xl group-hover:scale-110 transition">📍</span>
                  <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Emplacements Stock</span>
                </div>
              )}
              {verifierPermission('articles_stock') && (
                <div onClick={() => tenterAccesModule('articles', 'Articles & Stock')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                  <span className="text-3xl group-hover:scale-110 transition">📦</span>
                  <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Stock Articles</span>
                </div>
              )}
              {verifierPermission('depots_stock') && (
                <div onClick={() => tenterAccesModule('depots', 'Dépôts & Magasins')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                  <span className="text-3xl group-hover:scale-110 transition">🏢</span>
                  <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Dépôts de stock</span>
                </div>
              )}
              {verifierPermission('familles_articles') && (
                <div onClick={() => tenterAccesModule('familles', 'Familles & Catégories')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                  <span className="text-3xl group-hover:scale-110 transition">🗂️</span>
                  <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Familles d'Articles</span>
                </div>
              )}
              {verifierPermission('categories_clients') && (
                <div onClick={() => tenterAccesModule('categories', 'Catégories Clients')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                  <span className="text-3xl group-hover:scale-110 transition">🏷️</span>
                  <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Catégories Clients</span>
                </div>
              )}
              {verifierPermission('mouvements_stock') && (
                <div onClick={() => tenterAccesModule('mouvements', 'Mouvements Stock')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                  <span className="text-3xl group-hover:scale-110 transition">🔄</span>
                  <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Mouvement Stock</span>
                </div>
              )}
              {verifierPermission('approvisionnements') && (
                <div onClick={() => tenterAccesModule('approvisionnements', 'Approvisionnements')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                  <span className="text-3xl group-hover:scale-110 transition">📥</span>
                  <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Achats & Approvisionnement</span>
                </div>
              )}
              {verifierPermission('clients') && (
                <div onClick={() => tenterAccesModule('clients', 'Fichier Clients')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                  <span className="text-3xl group-hover:scale-110 transition">👥</span>
                  <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Gestion des Clients</span>
                </div>
              )}
              {verifierPermission('roles_utilisateurs') && (
                <div onClick={() => tenterAccesModule('roles', 'Gestion des Rôles')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                  <span className="text-3xl group-hover:scale-110 transition">🛡️</span>
                  <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Gestion des Rôles</span>
                </div>
              )}
              {verifierPermission('fournisseurs') && (
                <div onClick={() => tenterAccesModule('fournisseurs', 'Fournisseurs')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                  <span className="text-3xl group-hover:scale-110 transition">🤝</span>
                  <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Gestion des Fournisseurs</span>
                </div>
              )}
              <div onClick={() => tenterAccesModule('utilisateurs', 'Gestion du Personnel')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                <span className="text-3xl group-hover:scale-110 transition">🔑</span>
                <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Gestion du Personnel</span>
              </div>
            </div>
          </div>
        ) : !moduleActif && estModeLivraison ? (
          <div className="space-y-3 w-full">
            <h2 className="text-xs md:text-sm font-black text-cyan-400/80 uppercase tracking-wider px-1">
              ACCUEIL
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
              <div onClick={() => setModuleActif('commandes_livraison')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 shadow-sm group">
                <span className="text-3xl group-hover:scale-110 transition">📦</span>
                <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Gestion des commandes et livraisons</span>
              </div>
              <div onClick={() => setModuleActif('articles')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                <span className="text-3xl group-hover:scale-110 transition">📦</span>
                <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Stock Articles</span>
              </div>
              <div onClick={() => setModuleActif('grille_tarifaire')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                <span className="text-3xl group-hover:scale-110 transition">🗺️</span>
                <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Grille Tarifaire</span>
              </div>
              <div onClick={() => setModuleActif('caisses')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                <span className="text-3xl group-hover:scale-110 transition">🏧</span>
                <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Création Caisse</span>
              </div>
              <div onClick={() => setModuleActif('emplacements')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                <span className="text-3xl group-hover:scale-110 transition">📍</span>
                <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Emplacements Livreurs</span>
              </div>
              <div onClick={() => setModuleActif('depots')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                <span className="text-3xl group-hover:scale-110 transition">🏢</span>
                <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Dépôts de stock</span>
              </div>
              <div onClick={() => setModuleActif('familles')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                <span className="text-3xl group-hover:scale-110 transition">🗂️</span>
                <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Familles d'Articles</span>
              </div>
              <div onClick={() => setModuleActif('challenges_commerciaux')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                <span className="text-3xl group-hover:scale-110 transition">🏆</span>
                <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Challenges Commerciaux</span>
              </div>
              <div onClick={() => setModuleActif('mouvements')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                <span className="text-3xl group-hover:scale-110 transition">🔄</span>
                <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Mouvement Stock</span>
              </div>
              <div onClick={() => setModuleActif('approvisionnements')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                <span className="text-3xl group-hover:scale-110 transition">📥</span>
                <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Achats & Approvisionnement</span>
              </div>
              {verifierPermission('roles_utilisateurs') && (
                <div onClick={() => setModuleActif('roles')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                  <span className="text-3xl group-hover:scale-110 transition">🛡️</span>
                  <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Gestion des Rôles</span>
                </div>
              )}
              <div onClick={() => setModuleActif('fournisseurs')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                <span className="text-3xl group-hover:scale-110 transition">🤝</span>
                <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Gestion Partenaire</span>
              </div>
              <div onClick={() => setModuleActif('utilisateurs')} className="bg-[#0b1329] hover:bg-[#0f1d3e] border border-cyan-900/50 hover:border-cyan-400 p-3.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-sm">
                <span className="text-3xl group-hover:scale-110 transition">🔑</span>
                <span className="font-bold text-slate-200 text-xs md:text-sm leading-tight">Gestion du Personnel</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#0b1329] rounded-2xl shadow-lg p-4 sm:p-6 border border-cyan-900/60 text-slate-100 w-full">
            {rendreModuleActif()}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-[#0a1931] via-[#0d2347] to-[#0a1931] border-t border-cyan-500/30 py-3 px-6 flex justify-around items-center fixed bottom-0 left-0 right-0 z-30 shadow-2xl shrink-0 w-full">
        <button
          onClick={() => { setOngletNavigation('accueil'); setModuleActif(null); }}
          className={`flex flex-col items-center space-y-0.5 transition ${
            ongletNavigation === 'accueil' && !moduleActif ? 'text-cyan-400 font-extrabold scale-105' : 'text-cyan-200/60 hover:text-slate-100'
          }`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-[10px] md:text-xs">Accueil</span>
        </button>

        <button
          onClick={() => { setOngletNavigation('rapports'); setModuleActif(null); }}
          className={`flex flex-col items-center space-y-0.5 transition ${
            ongletNavigation === 'rapports' && !moduleActif ? 'text-cyan-400 font-extrabold scale-105' : 'text-cyan-200/60 hover:text-slate-100'
          }`}
        >
          <span className="text-xl">📊</span>
          <span className="text-[10px] md:text-xs">Comptabilité</span>
        </button>

        <button
          onClick={() => { setOngletNavigation('profil'); setModuleActif(null); }}
          className={`flex flex-col items-center space-y-0.5 transition ${
            ongletNavigation === 'profil' && !moduleActif ? 'text-cyan-400 font-extrabold scale-105' : 'text-cyan-200/60 hover:text-slate-100'
          }`}
        >
          <span className="text-xl">👤</span>
          <span className="text-[10px] md:text-xs">Mon Profil</span>
        </button>
      </div>

    </div>
  );

  return (
    <div className="w-full min-h-screen bg-[#02050b] flex justify-center items-center">
      {/* Simulateur actif uniquement sur les grands écrans d'ordinateurs pour vos tests de labo */}
      <div className="hidden md:block w-full max-w-[1400px]">
        <SimulateurCadre>
          {contenuApp}
        </SimulateurCadre>
      </div>
      {/* Affichage plein écran automatique sur tablettes et téléphones */}
      <div className="block md:hidden w-full">
        {contenuApp}
      </div>
    </div>
  );
}

export default function DashboardPrincipal() {
  return (
    <Suspense fallback={<link rel="stylesheet" href="" />}>
      <DashboardContent />
    </Suspense>
  );
}