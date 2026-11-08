'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions'; 
import SimulateurCadre from './components/SimulateurCadre';

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
  const [logoEntreprise, setLogoEntreprise] = useState('');

  // État pour le mode sombre (Nuit = Bleu, Jour = Gris)
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [listeEntreprisesGlobales, setListeEntreprisesGlobales] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const ancienneCleCacheGlobal = '4ts_cache_global_legacy';
      if (localStorage.getItem(ancienneCleCacheGlobal)) {
        localStorage.removeItem(ancienneCleCacheGlobal);
      }

      // Charger la préférence de thème (Nuit/Jour)
      const themeLocal = localStorage.getItem('4ts_theme_mode');
      if (themeLocal) {
        setIsDarkMode(themeLocal === 'dark');
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

  const basculerTheme = () => {
    const nouveauMode = !isDarkMode;
    setIsDarkMode(nouveauMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('4ts_theme_mode', nouveauMode ? 'dark' : 'light');
    }
  };

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

  const estModeLivraison = moduleCourant === 'LIVRAISON';
  const emailActuel = emailConnecte || infosEntreprise.email || 'stephs7352@gmail.com';
  const estSuperAdmin = emailActuel.toLowerCase().trim() === 'stephs7352@gmail.com';

  const { chargementPermissions, verifierPermission: verifierPermissionBrute } = usePermissions(
    entrepriseId,
    utilisateurConnecte,
    emailConnecte,
    moduleCourant
  );

  const verifierPermission = (moduleId) => {
    return verifierPermissionBrute(moduleId, estSuperAdmin);
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
        <div className={`space-y-4 p-3 text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-950'}`}>
          <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-cyan-900' : 'border-blue-200'}`}>
            <div>
              <h3 className={`font-black uppercase text-xs ${isDarkMode ? 'text-cyan-400' : 'text-blue-700'}`}>🛡️ Espace Super-Admin</h3>
              <p className={`text-[10px] ${isDarkMode ? 'text-cyan-200/70' : 'text-slate-500'}`}>Gestion globale de toutes vos entreprises et plateformes 4TS.</p>
            </div>
            <button 
              onClick={chargerToutesLesEntreprises}
              className={`${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'} text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition shadow`}
            >
              🔄 Actualiser
            </button>
          </div>

          {loadingAdmin ? (
            <div className={`text-center py-6 font-bold text-xs ${isDarkMode ? 'text-cyan-300' : 'text-slate-600'}`}>Chargement des entreprises...</div>
          ) : (
            <div className="space-y-2.5">
              <p className={`font-bold text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Total entreprises enregistrées : <span className={isDarkMode ? 'text-cyan-400' : 'text-blue-600'}>{listeEntreprisesGlobales.length}</span></p>
              
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {listeEntreprisesGlobales.map((ent) => (
                  <div key={ent.id_entreprise} className={`${isDarkMode ? 'bg-[#0b1329] border-cyan-900/60 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-2xs'} border p-2.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2`}>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black uppercase text-xs">{ent.nom_entreprise}</span>
                        <span className={`${isDarkMode ? 'bg-cyan-950 text-cyan-400 border-cyan-800' : 'bg-slate-100 text-blue-700 border-slate-200'} font-mono text-[9px] px-1.5 py-0.5 rounded border`}>{ent.id_entreprise}</span>
                      </div>
                      <p className={`text-[9px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>📧 {ent.email || 'Aucun email'} | 📞 {ent.telephone || 'Aucun téléphone'}</p>
                      <p className={`text-[9px] ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`}>Module actif : <span className="uppercase font-bold">{ent.module_actif || 'BOUTIQUE'}</span></p>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => {
                          window.location.href = `/dashboard?entreprise=${ent.id_entreprise}`;
                        }}
                        className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition shadow"
                      >
                        Accéder →
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
                        className={`${isDarkMode ? 'bg-rose-600/20 text-rose-300 border-rose-800 hover:bg-rose-600 hover:text-white' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-600 hover:text-white'} font-bold px-2 py-1 rounded-lg text-[10px] transition`}
                      >
                        🗑️
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
      <div className="min-h-screen bg-slate-100 text-slate-800 flex items-center justify-center font-sans text-xs">
        Chargement instantané de la suite 4TS...
      </div>
    );
  }

  // Styles dynamiques selon le mode Nuit (Bleu) ou Jour (Gris)
  const bgPrincipal = isDarkMode ? 'bg-[#050b18] text-slate-100' : 'bg-slate-100 text-slate-900';
  const bgHeaderNav = isDarkMode 
    ? 'bg-gradient-to-r from-[#0a1931] via-[#0d2347] to-[#0a1931] border-cyan-500/30 text-white shadow-cyan-950/40' 
    : 'bg-white border-blue-600/30 text-slate-900 shadow-sm';
  const logoBoxClass = isDarkMode ? 'bg-cyan-950/60 border-cyan-500/40' : 'bg-slate-100 border-slate-300 shadow-2xs';
  const subTextClass = isDarkMode ? 'text-cyan-300' : 'text-blue-600 font-bold';
  const cardClass = isDarkMode 
    ? 'bg-[#0b1329] hover:bg-[#0f1d3e] border-cyan-900/50 hover:border-cyan-400 text-slate-100 shadow-sm' 
    : 'bg-white hover:bg-blue-50/50 border-blue-600/30 hover:border-blue-500 text-slate-900 shadow-2xs';

  const contenuApp = (
    <div className={`min-h-screen ${bgPrincipal} flex flex-col font-sans relative overflow-y-auto w-full max-w-full text-xs`}>
      
      {/* BARRE SUPÉRIEURE */}
      <div className={`sticky top-0 z-20 ${bgHeaderNav} border-b px-3 py-2.5 shrink-0 flex items-center justify-between w-full`}>
        <div className="flex items-center space-x-2.5">
          <div className={`w-8 h-8 flex items-center justify-center shrink-0 rounded-lg border p-1 ${logoBoxClass}`}>
            <img 
              src={logoEntreprise || "/logo-4ts.png"} 
              alt="4TS" 
              className="w-full h-full object-contain rounded"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black tracking-tight uppercase leading-none">
              4TS : {infosEntreprise.nom_entreprise}
            </h1>
            <p className={`text-[9px] sm:text-[10px] font-mono mt-0.5 uppercase ${subTextClass}`}>
              {moduleCourant} | 👤 {utilisateurConnecte}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* BOUTON INTERRUPTEUR MODE NUIT / MODE JOUR */}
          <button
            onClick={basculerTheme}
            title={isDarkMode ? "Passer en mode Jour (Gris)" : "Passer en mode Nuit (Bleu)"}
            className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-black transition flex items-center gap-1 border shadow-2xs ${
              isDarkMode 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30' 
                : 'bg-slate-800 text-cyan-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span>{isDarkMode ? '☀️ Jour' : '🌙 Nuit'}</span>
          </button>

          {(moduleActif || ongletNavigation !== 'accueil') ? (
            <button
              onClick={() => {
                if (['journal', 'grand_livre', 'controle', 'plan_comptable', 'caisses'].includes(moduleActif)) {
                  setModuleActif(null);
                  setOngletNavigation('rapports');
                } else {
                  setModuleActif(null);
                  setOngletNavigation('accueil');
                }
              }}
              className={`${isDarkMode ? 'bg-sky-900/65 text-cyan-200 border-cyan-500/40 hover:bg-sky-800' : 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300'} font-bold px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] transition border shadow-2xs flex items-center gap-1`}
            >
              {['journal', 'grand_livre', 'controle', 'plan_comptable', 'caisses'].includes(moduleActif) ? '← Comptabilité' : '← Accueil'}
            </button>
          ) : (
            <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${isDarkMode ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              ● En ligne
            </span>
          )}
        </div>
      </div>

      <div className="p-2 sm:p-3 md:p-4 space-y-3 flex-1 pb-20 w-full max-w-7xl mx-auto">
        {ongletNavigation === 'rapports' && !moduleActif ? (
          <div className="space-y-2.5 w-full">
            <h2 className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-0.5 ${isDarkMode ? 'text-cyan-400/80' : 'text-slate-600'}`}>
              COMPTABILITÉ
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {verifierPermission('ventes_historiques') && (
                <div onClick={() => tenterAccesModule('journal', 'Saisie des Opérations')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex items-center space-x-3 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📝</span>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm">Saisie des Opérations</h3>
                    <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-cyan-200/70' : 'text-slate-500'}`}>Entrées, dépenses multi-lignes et pièces auto.</p>
                  </div>
                </div>
              )}
              {verifierPermission('ventes_historiques') && (
                <div onClick={() => tenterAccesModule('plan_comptable', 'Plan Comptable')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex items-center space-x-3 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📚</span>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm">Plan Comptable</h3>
                    <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-cyan-200/70' : 'text-slate-500'}`}>Gestion et consultation du plan comptable.</p>
                  </div>
                </div>
              )}
              {estModeLivraison && verifierPermission('caisses') && (
                <div onClick={() => tenterAccesModule('caisses', 'Gestion Caisses')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex items-center space-x-3 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🏧</span>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm">Création Caisse</h3>
                    <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-cyan-200/70' : 'text-slate-500'}`}>Création et gestion des caisses de livraison.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : ongletNavigation === 'profil' && !moduleActif ? (
          <div className="space-y-3 w-full">
            {/* BOUTON SUPER-ADMIN PLACÉ ICI UNIQUEMENT POUR LE SUPER-ADMIN */}
            {estSuperAdmin && (
              <div className={`${isDarkMode ? 'bg-[#0b1329] border-cyan-900/60' : 'bg-white border-blue-600/30'} p-3 rounded-xl border shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}>
                <div>
                  <h3 className={`font-black uppercase text-xs ${isDarkMode ? 'text-cyan-400' : 'text-blue-700'}`}>🛡️ Espace Super-Admin Global</h3>
                  <p className={`text-[10px] ${isDarkMode ? 'text-cyan-200/70' : 'text-slate-500'}`}>Panneau d'administration centralisé de toutes les entreprises de la plateforme 4TS.</p>
                </div>
                <button
                  onClick={() => setModuleActif(moduleActif === 'super_admin_panel' ? null : 'super_admin_panel')}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black px-3 py-1.5 rounded-lg text-[11px] transition shadow-md border border-amber-400/50 flex items-center gap-1.5 shrink-0"
                >
                  <span>🛡️</span> {moduleActif === 'super_admin_panel' ? 'Fermer le Panneau' : 'Ouvrir Super-Admin'}
                </button>
              </div>
            )}
            <div className={`${isDarkMode ? 'bg-[#0b1329] border-cyan-900/60 text-slate-100' : 'bg-white border-blue-600/30 text-slate-900'} rounded-xl shadow-sm p-3 sm:p-5 border w-full`}>
              <MonProfil entrepriseId={entrepriseId} isDarkMode={isDarkMode} />
            </div>
          </div>
        ) : moduleActif === 'souscription' || moduleActif === 'super_admin_panel' ? (
          <div className={`${isDarkMode ? 'bg-[#0b1329] border-cyan-900/60 text-slate-100' : 'bg-white border-blue-600/30 text-slate-900'} rounded-xl shadow-sm p-3 sm:p-5 border w-full`}>
            {rendreModuleActif()}
          </div>
        ) : !moduleActif && !estModeLivraison ? (
          <div className="space-y-2.5 w-full">
            <h2 className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-0.5 ${isDarkMode ? 'text-cyan-400/80' : 'text-slate-600'}`}>
              ACCUEIL
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 w-full">
              {verifierPermission('caisse') && (
                <div onClick={() => tenterAccesModule('ventes', 'Caisse & Ventes')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🛒</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Caisse & Ventes</span>
                </div>
              )}
              {verifierPermission('caisses') && (
                <div onClick={() => tenterAccesModule('caisses', 'Gestion Caisses')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🏧</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Création Caisse</span>
                </div>
              )}
              {verifierPermission('depots_stock') && (
                <div onClick={() => tenterAccesModule('emplacements', 'Emplacements Stock')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📍</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Emplacements Stock</span>
                </div>
              )}
              {verifierPermission('articles_stock') && (
                <div onClick={() => tenterAccesModule('articles', 'Articles & Stock')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📦</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Stock Articles</span>
                </div>
              )}
              {verifierPermission('depots_stock') && (
                <div onClick={() => tenterAccesModule('depots', 'Dépôts & Magasins')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🏢</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Dépôts de stock</span>
                </div>
              )}
              {verifierPermission('familles_articles') && (
                <div onClick={() => tenterAccesModule('familles', 'Familles & Catégories')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🗂️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Familles d'Articles</span>
                </div>
              )}
              {verifierPermission('categories_clients') && (
                <div onClick={() => tenterAccesModule('categories', 'Catégories Clients')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🏷️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Catégories Clients</span>
                </div>
              )}
              {verifierPermission('mouvements_stock') && (
                <div onClick={() => tenterAccesModule('mouvements', 'Mouvements Stock')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🔄</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Mouvement Stock</span>
                </div>
              )}
              {verifierPermission('approvisionnements') && (
                <div onClick={() => tenterAccesModule('approvisionnements', 'Approvisionnements')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📥</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Achats & Approvisionnement</span>
                </div>
              )}
              {verifierPermission('clients') && (
                <div onClick={() => tenterAccesModule('clients', 'Fichier Clients')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">👥</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion des Clients</span>
                </div>
              )}
              {verifierPermission('roles_utilisateurs') && (
                <div onClick={() => tenterAccesModule('roles', 'Gestion des Rôles')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🛡️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion des Rôles</span>
                </div>
              )}
              {verifierPermission('fournisseurs') && (
                <div onClick={() => tenterAccesModule('fournisseurs', 'Fournisseurs')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🤝</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion des Fournisseurs</span>
                </div>
              )}
              <div onClick={() => tenterAccesModule('utilisateurs', 'Gestion du Personnel')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                <span className="text-2xl group-hover:scale-110 transition">🔑</span>
                <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion du Personnel</span>
              </div>
            </div>
          </div>
        ) : !moduleActif && estModeLivraison ? (
          <div className="space-y-2.5 w-full">
            <h2 className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-0.5 ${isDarkMode ? 'text-cyan-400/80' : 'text-slate-600'}`}>
              ACCUEIL
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 w-full">
              {verifierPermission('commandes_livraison') && (
                <div onClick={() => tenterAccesModule('commandes_livraison', 'Commandes & Livraisons')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📦</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Commandes & Livraisons</span>
                </div>
              )}
              {verifierPermission('articles_stock') && (
                <div onClick={() => tenterAccesModule('articles', 'Stock Articles')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📦</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Stock Articles</span>
                </div>
              )}
              {verifierPermission('grille_tarifaire') && (
                <div onClick={() => tenterAccesModule('grille_tarifaire', 'Grille Tarifaire')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🗺️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Grille Tarifaire</span>
                </div>
              )}
              {verifierPermission('emplacements_stock') && (
                <div onClick={() => tenterAccesModule('emplacements', 'Emplacements Livreurs')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📍</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Emplacements Livreurs</span>
                </div>
              )}
              {verifierPermission('depots_stock') && (
                <div onClick={() => tenterAccesModule('depots', 'Dépôts de stock')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🏢</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Dépôts de stock</span>
                </div>
              )}
              {verifierPermission('familles_articles') && (
                <div onClick={() => tenterAccesModule('familles', "Familles d'Articles")} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🗂️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Familles d'Articles</span>
                </div>
              )}
              {verifierPermission('challenges_commerciaux') && (
                <div onClick={() => tenterAccesModule('challenges_commerciaux', 'Challenges Commerciaux')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🏆</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Challenges Commerciaux</span>
                </div>
              )}
              {verifierPermission('mouvements_stock') && (
                <div onClick={() => tenterAccesModule('mouvements', 'Mouvement Stock')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🔄</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Mouvement Stock</span>
                </div>
              )}
              {verifierPermission('approvisionnements') && (
                <div onClick={() => tenterAccesModule('approvisionnements', 'Achats & Approvisionnement')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📥</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Achats & Approvisionnement</span>
                </div>
              )}
              {verifierPermission('roles_utilisateurs') && (
                <div onClick={() => tenterAccesModule('roles', 'Gestion des Rôles')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🛡️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion des Rôles</span>
                </div>
              )}
              {verifierPermission('fournisseurs') && (
                <div onClick={() => tenterAccesModule('fournisseurs', 'Gestion Partenaire')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🤝</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion Partenaire</span>
                </div>
              )}
              {verifierPermission('roles_utilisateurs') && (
                <div onClick={() => tenterAccesModule('utilisateurs', 'Gestion du Personnel')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🔑</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion du Personnel</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`${isDarkMode ? 'bg-[#0b1329] border-cyan-900/60 text-slate-100' : 'bg-white border-blue-600/30 text-slate-900'} rounded-xl shadow-sm p-3 sm:p-5 border w-full`}>
            {rendreModuleActif()}
          </div>
        )}
      </div>

      {/* BARRE DE NAVIGATION INFÉRIEURE */}
      <div className={`sticky bottom-0 left-0 right-0 z-30 ${bgHeaderNav} border-t py-2.5 px-6 flex justify-around items-center shadow-2xl shrink-0 w-full`}>
        <button
          onClick={() => { setOngletNavigation('accueil'); setModuleActif(null); }}
          className={`flex flex-col items-center space-y-0.5 transition ${
            ongletNavigation === 'accueil' && !moduleActif 
              ? (isDarkMode ? 'text-cyan-400 font-extrabold scale-105' : 'text-blue-600 font-extrabold scale-105') 
              : (isDarkMode ? 'text-cyan-200/60 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900')
          }`}
        >
          <span className="text-lg">🏠</span>
          <span className="text-[10px]">Accueil</span>
        </button>

        <button
          onClick={() => { setOngletNavigation('rapports'); setModuleActif(null); }}
          className={`flex flex-col items-center space-y-0.5 transition ${
            ongletNavigation === 'rapports' && !moduleActif 
              ? (isDarkMode ? 'text-cyan-400 font-extrabold scale-105' : 'text-blue-600 font-extrabold scale-105') 
              : (isDarkMode ? 'text-cyan-200/60 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900')
          }`}
        >
          <span className="text-lg">📊</span>
          <span className="text-[10px]">Comptabilité</span>
        </button>

        <button
          onClick={() => { setOngletNavigation('profil'); setModuleActif(null); }}
          className={`flex flex-col items-center space-y-0.5 transition ${
            ongletNavigation === 'profil' && !moduleActif 
              ? (isDarkMode ? 'text-cyan-400 font-extrabold scale-105' : 'text-blue-600 font-extrabold scale-105') 
              : (isDarkMode ? 'text-cyan-200/60 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900')
          }`}
        >
          <span className="text-lg">👤</span>
          <span className="text-[10px]">Mon Profil</span>
        </button>
      </div>

    </div>
  );

  return (
    <div className={`w-full min-h-screen ${isDarkMode ? 'bg-[#02050b]' : 'bg-slate-200'} flex justify-center items-center`}>
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
    <Suspense fallback={<link rel="stylesheet" href="" />}>
      <DashboardContent />
    </Suspense>
  );
}