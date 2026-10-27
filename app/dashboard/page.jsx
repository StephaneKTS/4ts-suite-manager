'use client';

import { useState, useEffect, Suspense } from 'react';
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
    espaces_souscrits: [],
    module_actif: 'BOUTIQUE'
  });

  const [moduleActif, setModuleActif] = useState(null);
  const [ongletNavigation, setOngletNavigation] = useState('accueil');
  const [moduleCourant, setModuleCourant] = useState('BOUTIQUE');
  
  const [utilisateurConnecte, setUtilisateurConnecte] = useState('CHARGEMENT...');
  const [emailConnecte, setEmailConnecte] = useState('');
  const [permissionsUser, setPermissionsUser] = useState(null);

  // États pour le Panneau Super-Admin (Gestion globale des entreprises)
  const [listeEntreprisesGlobales, setListeEntreprisesGlobales] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const userLocal = localStorage.getItem('utilisateurConnecte');
      const emailLocal = localStorage.getItem('emailConnecte');
      if (userLocal && userLocal !== 'UTILISATEUR') {
        setUtilisateurConnecte(userLocal.toUpperCase());
      }
      if (emailLocal) {
        setEmailConnecte(emailLocal);
      }
    }
  }, []);

  useEffect(() => {
    async function fetchEntrepriseData() {
      try {
        const { data: entData, error } = await supabase
          .from('entreprises')
          .select('*')
          .eq('id_entreprise', entrepriseIdUrl)
          .maybeSingle();

        if (entData) {
          setInfosEntreprise(entData);
          setEntrepriseId(entData.id_entreprise);
          if (typeof window !== 'undefined') {
            localStorage.setItem('entrepriseId', entData.id_entreprise);

            const modLocal = localStorage.getItem('module_actif');
            if (modLocal && entData.espaces_souscrits && entData.espaces_souscrits.map(m => m.toUpperCase()).includes(modLocal.toUpperCase())) {
              setModuleCourant(modLocal.toUpperCase());
            } else if (entData.module_actif) {
              setModuleCourant(entData.module_actif.toUpperCase());
              localStorage.setItem('module_actif', entData.module_actif.toUpperCase());
            }
          }

          if (!localStorage.getItem('utilisateurConnecte') || localStorage.getItem('utilisateurConnecte') === 'UTILISATEUR' || entrepriseIdUrl === '4TS-234321') {
            const nomAdmin = entrepriseIdUrl === '4TS-234321' ? 'STEPHANE KTS' : (entData.nom_entreprise || 'ADMINISTRATEUR');
            setUtilisateurConnecte(nomAdmin.toUpperCase());
            localStorage.setItem('utilisateurConnecte', nomAdmin.toUpperCase());
          }
        } else {
          setInfosEntreprise({
            nom_entreprise: 'ISMA LOGISTIQUE',
            email: emailConnecte || 'stephs7352@gmail.com',
            espaces_souscrits: ['Boutique', 'Livraison'],
            module_actif: 'BOUTIQUE'
          });
        }
      } catch (err) {
        console.error("Erreur de récupération entreprise :", err);
      }
    }

    if (entrepriseIdUrl) {
      fetchEntrepriseData();
    }
  }, [entrepriseIdUrl, emailConnecte]);

  useEffect(() => {
    async function fetchPermissions() {
      if (!emailConnecte && !utilisateurConnecte) return;
      try {
        const { data, error } = await supabase
          .from('utilisateurs')
          .select('permissions, acces_application')
          .eq('id_entreprise', entrepriseId)
          .or(`email.eq.${emailConnecte.toLowerCase()},nom_complet.ilike.${utilisateurConnecte}`)
          .maybeSingle();

        if (data && data.permissions) {
          setPermissionsUser(data.permissions);
        }
      } catch (err) {
        console.error("Erreur chargement permissions :", err);
      }
    }
    fetchPermissions();
  }, [emailConnecte, utilisateurConnecte, entrepriseId]);

  const estModeLivraison = moduleCourant === 'LIVRAISON';

  const emailActuel = emailConnecte || infosEntreprise.email || '';
  const estSuperAdmin = 
    emailActuel.toLowerCase().trim() === 'stephs7352@gmail.com' || 
    emailActuel.toLowerCase().trim() === 'bureauisma26@gmail.com' || 
    emailActuel.toLowerCase().trim() === 'stephanekts1312@gmail.com' ||
    utilisateurConnecte.includes('STÉPHANE') || 
    utilisateurConnecte.includes('KENMOE');

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
      const { data, error } = await supabase.from('entreprises').select('*');
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
        <div className="space-y-4 p-2 text-xs">
          <div className="flex justify-between items-center border-b border-blue-900 pb-2">
            <div>
              <h3 className="font-black text-orange-500 uppercase text-sm">🛡️ Espace Super-Admin</h3>
              <p className="text-[10px] text-slate-300">Gestion globale de toutes vos entreprises et plateformes 4TS.</p>
            </div>
            <button 
              onClick={chargerToutesLesEntreprises}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] transition shadow"
            >
              🔄 Actualiser
            </button>
          </div>

          {loadingAdmin ? (
            <div className="text-center py-8 text-blue-300 font-bold">Chargement des entreprises...</div>
          ) : (
            <div className="space-y-3">
              <p className="font-bold text-slate-200">Total entreprises enregistrées : <span className="text-orange-400">{listeEntreprisesGlobales.length}</span></p>
              
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {listeEntreprisesGlobales.map((ent) => (
                  <div key={ent.id_entreprise} className="bg-slate-900 border border-blue-900/60 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white uppercase">{ent.nom_entreprise}</span>
                        <span className="bg-blue-950 text-blue-400 font-mono text-[10px] px-2 py-0.5 rounded border border-blue-800">{ent.id_entreprise}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">📧 {ent.email || 'Aucun email'} | 📞 {ent.telephone || 'Aucun téléphone'}</p>
                      <p className="text-[10px] text-orange-300">Module actif : <span className="uppercase font-bold">{ent.module_actif || 'BOUTIQUE'}</span></p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => {
                          window.location.href = `/dashboard?entreprise=${ent.id_entreprise}`;
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition shadow"
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

    if (moduleActif === 'commandes_livraison') {
      return <GestionCommandesLivraison entrepriseId={entrepriseId} />;
    }

    if (moduleActif === 'grille_tarifaire') {
      return <GrilleTarifaireLivraison entrepriseId={entrepriseId} />;
    }

    if (moduleActif === 'challenges_commerciaux') {
      return <GestionChallengesCommerciaux entrepriseId={entrepriseId} />;
    }

    switch (moduleActif) {
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
      
      case 'journal': 
        return <GestionJournalCaisse entrepriseId={entrepriseId} vueInitiale="saisie_operations" />;
      case 'grand_livre': 
        return <GestionJournalCaisse entrepriseId={entrepriseId} vueInitiale="grand_livre" />;
      case 'controle': 
        return <GestionJournalCaisse entrepriseId={entrepriseId} vueInitiale="controle_cloture" />;
        
      case 'roles': return <GestionRoles entrepriseId={entrepriseId} />;
      case 'utilisateurs': return <GestionUtilisateurs entrepriseId={entrepriseId} />;
      default: return null;
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] text-white flex items-center justify-center font-sans text-xs">
        Chargement de la suite 4TS...
      </div>
    );
  }

  const contenuApp = (
    <div className="min-h-screen bg-[#0d1b2a] text-slate-100 flex flex-col font-sans relative overflow-y-auto w-full max-w-full">
      
      {/* EN-TÊTE */}
      <div className="sticky top-0 z-20 bg-[#1b263b] border-b border-blue-900/50 px-2 sm:px-4 py-3 text-white shadow-md shrink-0 flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <img 
              src="/logo-4ts.png" 
              alt="4TS" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<span class="font-black tracking-wider text-xs text-white">4TS</span>';
              }}
            />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white uppercase leading-none">
              4TS : {infosEntreprise.nom_entreprise}
            </h1>
            <p className="text-[10px] text-blue-300 font-mono mt-1 uppercase">
              {moduleCourant} | 👤 {utilisateurConnecte}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(moduleActif || ongletNavigation !== 'accueil') ? (
            <button
              onClick={() => {
                if (['journal', 'grand_livre', 'controle'].includes(moduleActif)) {
                  setModuleActif(null);
                  setOngletNavigation('rapports');
                } else {
                  setModuleActif(null);
                  setOngletNavigation('accueil');
                }
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] transition border border-slate-700 shadow-xs flex items-center gap-1"
            >
              {['journal', 'grand_livre', 'controle'].includes(moduleActif) ? '← Retour Rapports' : '← Accueil'}
            </button>
          ) : (
            <span className="text-[10px] bg-blue-950 text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-blue-800/50">
              ● En ligne
            </span>
          )}
        </div>
      </div>

      {/* CONTENU DE LA PAGE */}
      <div className="p-1 sm:p-2.5 space-y-3 flex-1 pb-24 w-full">
        {ongletNavigation === 'rapports' && !moduleActif ? (
          <div className="space-y-3 w-full">
            <h2 className="text-[11px] font-black text-blue-300/70 uppercase tracking-wider px-1">
              RAPPORTS
            </h2>

            <div className="grid grid-cols-1 gap-2.5 w-full">
              {verifierPermission('ventes_historiques') && (
                <div onClick={() => tenterAccesModule('journal', 'Saisie des Opérations')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3.5 rounded-2xl cursor-pointer transition flex items-center space-x-3 shadow-xs group">
                  <span className="text-2xl group-hover:scale-110 transition">📝</span>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-xs">Saisie des Opérations</h3>
                    <p className="text-[10px] text-blue-200/70 mt-0.5">Entrées, dépenses multi-lignes et pièces auto.</p>
                  </div>
                </div>
              )}

              {verifierPermission('ventes_historiques') && (
                <div onClick={() => tenterAccesModule('controle', 'Contrôle & Clôture')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3.5 rounded-2xl cursor-pointer transition flex items-center space-x-3 shadow-xs group">
                  <span className="text-2xl group-hover:scale-110 transition">🛡️</span>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-xs">Contrôle & Clôture</h3>
                    <p className="text-[10px] text-blue-200/70 mt-0.5">Vérification caisse et versement central.</p>
                  </div>
                </div>
              )}

              {verifierPermission('ventes_historiques') && (
                <div onClick={() => tenterAccesModule('grand_livre', 'Grand Livre & Journal')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-3.5 rounded-2xl cursor-pointer transition flex items-center space-x-3 shadow-xs group">
                  <span className="text-2xl group-hover:scale-110 transition">📖</span>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-xs">Grand Livre & Journal</h3>
                    <p className="text-[10px] text-blue-200/70 mt-0.5">Mouvements par période et par compte.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : ongletNavigation === 'profil' && !moduleActif ? (
          <div className="space-y-4 w-full">
            <h2 className="text-[11px] font-black text-blue-300/70 uppercase tracking-wider px-1">
              MON PROFIL
            </h2>

            <div className="bg-[#1b263b] rounded-2xl p-5 shadow border border-blue-900/60 space-y-4 w-full">
              <div className="flex items-center space-x-3 pb-3 border-b border-blue-900/40">
                <div className="bg-orange-600/20 border border-orange-500/40 text-orange-400 w-12 h-12 rounded-full flex items-center justify-center text-base font-black">
                  {utilisateurConnecte ? utilisateurConnecte.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-sm uppercase">{utilisateurConnecte}</h3>
                  <p className="text-xs text-orange-400 font-bold">{emailConnecte || infosEntreprise.email || 'user@entreprise.com'}</p>
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
                  <span className="text-blue-200/70 font-medium">Module Actif :</span>
                  <span className="font-bold text-orange-400 uppercase">{moduleCourant}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-blue-900/30">
                  <span className="text-blue-200/70 font-medium">Utilisateur Connecté :</span>
                  <span className="font-bold text-orange-400 uppercase">{utilisateurConnecte}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-blue-200/70 font-medium">Statut de la session :</span>
                  <span className="bg-blue-950 text-emerald-400 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Actif
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-blue-900/40 space-y-2.5">
                {estSuperAdmin && (
                  <button
                    onClick={() => setModuleActif('super_admin_panel')}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black p-3 rounded-xl transition flex items-center justify-between shadow-md text-xs uppercase tracking-wider"
                  >
                    <span className="flex items-center gap-2">
                      <span>🛡️</span> Espace Super-Admin
                    </span>
                    <span>→</span>
                  </button>
                )}

                <button
                  onClick={() => setModuleActif('souscription')}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold p-3 rounded-xl transition flex items-center justify-between shadow-xs text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span>💳</span> Espace de Souscription & Paramètres
                  </span>
                  <span>→</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm('Voulez-vous vraiment vous déconnecter de l’application ?')) {
                      if (typeof window !== 'undefined') {
                        localStorage.clear();
                        window.location.href = '/connexion';
                      }
                    }
                  }}
                  className="w-full bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800 font-bold p-3 rounded-xl transition flex items-center justify-center gap-2 shadow-xs text-xs"
                >
                  <span>🚪</span> Se déconnecter de la session
                </button>
              </div>
            </div>
          </div>
        ) : moduleActif === 'souscription' || moduleActif === 'super_admin_panel' ? (
          <div className="bg-[#1b263b] rounded-2xl shadow p-2 sm:p-4 border border-blue-900/60 text-slate-100 w-full">
            {rendreModuleActif()}
          </div>
        ) : !moduleActif && !estModeLivraison ? (
          <div className="space-y-3 w-full">
            <h2 className="text-[11px] font-black text-blue-300/70 uppercase tracking-wider px-1">
              ACCUEIL
            </h2>

            <div className="grid grid-cols-3 gap-2 w-full">
              {verifierPermission('caisse') && (
                <div onClick={() => tenterAccesModule('ventes', 'Caisse & Ventes')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 shadow-2xs group">
                  <span className="text-2xl group-hover:scale-110 transition">🛒</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Caisse & Ventes</span>
                </div>
              )}

              {verifierPermission('caisses') && (
                <div onClick={() => tenterAccesModule('caisses', 'Gestion Caisses')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 shadow-2xs group">
                  <span className="text-2xl group-hover:scale-110 transition">🏧</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Création Caisse</span>
                </div>
              )}

              {verifierPermission('depots_stock') && (
                <div onClick={() => tenterAccesModule('emplacements', 'Emplacements Stock')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 shadow-2xs group">
                  <span className="text-2xl group-hover:scale-110 transition">📍</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Emplacements Stock</span>
                </div>
              )}

              {verifierPermission('articles_stock') && (
                <div onClick={() => tenterAccesModule('articles', 'Articles & Stock')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                  <span className="text-2xl group-hover:scale-110 transition">📦</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Stock Articles</span>
                </div>
              )}

              {verifierPermission('depots_stock') && (
                <div onClick={() => tenterAccesModule('depots', 'Dépôts & Magasins')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                  <span className="text-2xl group-hover:scale-110 transition">🏢</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Dépôts de stock</span>
                </div>
              )}

              {verifierPermission('familles_articles') && (
                <div onClick={() => tenterAccesModule('familles', 'Familles & Catégories')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                  <span className="text-2xl group-hover:scale-110 transition">🗂️</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Familles d'Articles</span>
                </div>
              )}

              {verifierPermission('categories_clients') && (
                <div onClick={() => tenterAccesModule('categories', 'Catégories Clients')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                  <span className="text-2xl group-hover:scale-110 transition">🏷️</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Catégories Clients</span>
                </div>
              )}

              {verifierPermission('mouvements_stock') && (
                <div onClick={() => tenterAccesModule('mouvements', 'Mouvements Stock')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                  <span className="text-2xl group-hover:scale-110 transition">🔄</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Mouvement Stock</span>
                </div>
              )}

              {verifierPermission('approvisionnements') && (
                <div onClick={() => tenterAccesModule('approvisionnements', 'Approvisionnements')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                  <span className="text-2xl group-hover:scale-110 transition">📥</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Achats & Approvisionnement</span>
                </div>
              )}

              {verifierPermission('clients') && (
                <div onClick={() => tenterAccesModule('clients', 'Fichier Clients')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                  <span className="text-2xl group-hover:scale-110 transition">👥</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Gestion des Clients</span>
                </div>
              )}

              {verifierPermission('roles_utilisateurs') && (
                <div onClick={() => tenterAccesModule('roles', 'Gestion des Rôles')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                  <span className="text-2xl group-hover:scale-110 transition">🛡️</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Gestion des Rôles</span>
                </div>
              )}

              {verifierPermission('fournisseurs') && (
                <div onClick={() => tenterAccesModule('fournisseurs', 'Fournisseurs')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                  <span className="text-2xl group-hover:scale-110 transition">🤝</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Gestion des Fournisseurs</span>
                </div>
              )}

              {/* MODIFIÉ ICI : Ouvert à tous sur l'accueil (les restrictions se feront sur les actions internes) */}
              <div onClick={() => tenterAccesModule('utilisateurs', 'Gestion du Personnel')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🔑</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Gestion du Personnel</span>
              </div>

              {verifierPermission('ventes_historiques') && (
                <div onClick={() => tenterAccesModule('plan_comptable', 'Plan Comptable')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                  <span className="text-2xl group-hover:scale-110 transition">📚</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Plan Comptable</span>
                </div>
              )}
            </div>
          </div>
        ) : !moduleActif && estModeLivraison ? (
          <div className="space-y-3 w-full">
            <h2 className="text-[11px] font-black text-blue-300/70 uppercase tracking-wider px-1">
              ACCUEIL
            </h2>

            <div className="grid grid-cols-3 gap-2 w-full">
              <div onClick={() => setModuleActif('commandes_livraison')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 shadow-2xs group">
                <span className="text-2xl group-hover:scale-110 transition">📦</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Gestion des commandes et livraisons</span>
              </div>

              <div onClick={() => setModuleActif('articles')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">📦</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Stock Articles</span>
              </div>

              <div onClick={() => setModuleActif('grille_tarifaire')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 shadow-2xs group">
                <span className="text-2xl group-hover:scale-110 transition">🗺️</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Grille Tarifaire</span>
              </div>

              <div onClick={() => setModuleActif('caisses')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 shadow-2xs group">
                <span className="text-2xl group-hover:scale-110 transition">🏧</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Création Caisse</span>
              </div>

              <div onClick={() => setModuleActif('emplacements')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 shadow-2xs group">
                <span className="text-2xl group-hover:scale-110 transition">📍</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Emplacements Livreurs</span>
              </div>

              <div onClick={() => setModuleActif('depots')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🏢</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Dépôts de stock</span>
              </div>

              <div onClick={() => setModuleActif('familles')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🗂️</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Familles d'Articles</span>
              </div>

              <div onClick={() => setModuleActif('challenges_commerciaux')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🏆</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Challenges Commerciaux</span>
              </div>

              <div onClick={() => setModuleActif('mouvements')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🔄</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Mouvement Stock</span>
              </div>

              <div onClick={() => setModuleActif('approvisionnements')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">📥</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Achats & Approvisionnement</span>
              </div>

              {verifierPermission('roles_utilisateurs') && (
                <div onClick={() => setModuleActif('roles')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                  <span className="text-2xl group-hover:scale-110 transition">🛡️</span>
                  <span className="font-bold text-slate-200 text-[11px] leading-tight">Gestion des Rôles</span>
                </div>
              )}

              <div onClick={() => setModuleActif('fournisseurs')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🤝</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Gestion Partenaire</span>
              </div>

              {/* MODIFIÉ ICI : Ouvert à tous sur l'accueil (les restrictions se feront sur les actions internes) */}
              <div onClick={() => setModuleActif('utilisateurs')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">🔑</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Gestion du Personnel</span>
              </div>

              <div onClick={() => setModuleActif('plan_comptable')} className="bg-[#1b263b] hover:bg-[#22324a] border border-blue-900/60 hover:border-blue-500 p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group shadow-2xs">
                <span className="text-2xl group-hover:scale-110 transition">📚</span>
                <span className="font-bold text-slate-200 text-[11px] leading-tight">Plan Comptable</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#1b263b] rounded-2xl shadow p-2 sm:p-4 border border-blue-900/60 text-slate-100 w-full">
            {rendreModuleActif()}
          </div>
        )}
      </div>

      {/* BARRE DE NAVIGATION INFÉRIEURE */}
      <div className="bg-[#1b263b] border-t border-blue-900/60 py-2.5 px-6 flex justify-around items-center fixed bottom-0 left-0 right-0 z-30 shadow-lg shrink-0 w-full">
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
    <div className="w-full min-h-screen bg-slate-950 flex justify-center items-center">
      <div className="hidden md:block w-full max-w-[1400px]">
        <SimulateurCadre>
          {contenuApp}
        </SimulateurCadre>
      </div>
      <div className="block md:hidden w-full">
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