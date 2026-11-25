'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions'; 
import SimulateurCadre from './components/SimulateurCadre';
import PanneauSuperAdmin from '../components/PanneauSuperAdmin'; 

import GestionCaisses from './components/GestionCaisses';
import GestionEmplacements from './components/GestionEmplacements';
import GestionVentesHistoriques from './components/GestionVentesHistoriques';
import GestionArticles from './components/GestionArticles';
import GestionDepots from './components/GestionDepots';
import GestionClients from './components/GestionClients';
import GestionCategoriesClients from './components/GestionCategoriesClients';
import GestionChallengesCommerciaux from './components/GestionChallengesCommerciaux';
import GestionFournisseurs from './components/GestionFournisseurs';
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
import GestionTaxesRistournes from './components/GestionTaxesRistournes';
import MenuExplorer from './components/MenuExplorer'; 
import GestionCommandesClientsQR from './components/GestionCommandesClientsQR'; 
import GestionTables from './components/GestionTables';

import GestionTontineParticipants from './components/GestionTontineParticipants';
import GestionTontineCycles from './components/GestionTontineCycles';
import GestionTontineCotisations from './components/GestionTontineCotisations';
import GestionTontineEmprunts from './components/GestionTontineEmprunts';
import GestionElections from './components/GestionElections';

// 🔔 IMPORTATION DU WIDGET DE NOTIFICATION UTILISATEUR
import WidgetNotificationsUtilisateur from './components/WidgetNotificationsUtilisateur';

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [authentifie, setAuthentifie] = useState(false);

  const entrepriseIdUrl = searchParams.get('entreprise') || 
    (typeof window !== 'undefined' ? localStorage.getItem('entrepriseId') : null);

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
  
  // 🎯 État pour le compteur en temps réel des commandes QR en attente sur la tuile d'accueil
  const [nombreCommandesEnAttente, setNombreCommandesEnAttente] = useState(0);

  // 🎯 CORRECTION CLEF : Lecture prioritaire du stockage local pour éviter l'écrasement par la base
  const [moduleCourant, setModuleCourant] = useState(() => {
    if (typeof window !== 'undefined') {
      const modLocal = localStorage.getItem('module_actif') || localStorage.getItem('moduleActif');
      if (modLocal) return modLocal.toUpperCase();
    }
    return 'BOUTIQUE';
  });
  
  const [utilisateurConnecte, setUtilisateurConnecte] = useState('');
  const [emailConnecte, setEmailConnecte] = useState('');
  const [logoEntreprise, setLogoEntreprise] = useState('');

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const themeLocal = localStorage.getItem('4ts_theme_mode');
      if (themeLocal !== null) {
        return themeLocal === 'dark';
      }
    }
    return true; 
  });

  // --- ÉTATS & RÉFÉRENCES POUR LA SURVEILLANCE GLOBALE DES COMMANDES QR ---
  const [audioActiveGlobal, setAudioActiveGlobal] = useState(true);
  const fileDAbsolueAudio = useRef([]);
  const enTrainDeJouerAudio = useRef(false);
  const idsCommandesConnuesGlobal = useRef(new Set());

  // Formateur élégant du numéro de commande
  const formaterNumeroElegant = (numeroBrut) => {
    if (!numeroBrut) return 'CMD-000';
    const parts = numeroBrut.split('-');
    if (parts.length > 1) {
      const suffixe = parts[parts.length - 1];
      const prefixeRef = parts[parts.length - 2] || '';
      if (suffixe.length <= 4 && !isNaN(suffixe)) {
        return `CMD-${suffixe}`;
      }
      return `${prefixeRef}-${suffixe}`.toUpperCase();
    }
    return numeroBrut;
  };

  // Gestion de la file d'attente audio globale
  const traiterFileDAbsolueGlobal = async () => {
    if (enTrainDeJouerAudio.current || fileDAbsolueAudio.current.length === 0 || !audioActiveGlobal) {
      return;
    }
    enTrainDeJouerAudio.current = true;
    const tacheCourante = fileDAbsolueAudio.current.shift();

    try {
      if (tacheCourante.type === 'ALERTE_ET_VOIX') {
        await executerSonFortGlobal();
        await executerVoixGlobal(tacheCourante.texte);
      }
    } catch (e) {
      console.log("Erreur lecture audio globale :", e);
    } finally {
      enTrainDeJouerAudio.current = false;
      if (fileDAbsolueAudio.current.length > 0) {
        traiterFileDAbsolueGlobal();
      }
    }
  };

  const ajouterAlerteCompleteGlobal = (texte) => {
    if (!audioActiveGlobal) return;
    fileDAbsolueAudio.current.push({ type: 'ALERTE_ET_VOIX', texte });
    traiterFileDAbsolueGlobal();
  };

  const executerSonFortGlobal = () => {
    return new Promise(async (resolve) => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        const dureeBipMs = 250;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dureeBipMs / 1000);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + dureeBipMs / 1000);

        setTimeout(resolve, dureeBipMs);
      } catch (e) {
        resolve();
      }
    });
  };

  const executerVoixGlobal = (texte) => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.resume();
          const utterance = new SpeechSynthesisUtterance(texte);
          utterance.lang = 'fr-FR';
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          resolve();
        }
      } else {
        resolve();
      }
    });
  };

  const declencherVibrationGlobal = () => {
    if (!audioActiveGlobal) return;
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([400, 100, 400]); } catch (e) {}
    }
  };

  // Fonction pour actualiser le compteur des commandes en attente depuis la base
  const rafraichirCompteurEnAttente = async (idEnt) => {
    try {
      const { data, error } = await supabase
        .from('commandes_clients_qr')
        .select('id, statut')
        .eq('id_entreprise', idEnt)
        .eq('statut', 'EN_ATTENTE');
      
      if (!error && data) {
        setNombreCommandesEnAttente(data.length);
      }
    } catch (e) {}
  };

  const notifierNouvelleCommandeGlobal = (cmd) => {
    const nomClientPropre = (cmd.nom_client || 'Client').replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, ' ');
    const numeroElegant = formaterNumeroElegant(cmd.numero_commande);
    const messageVocal = `Attention ! Nouvelle commande, ${numeroElegant}. Pour le client, ${nomClientPropre}. Table, ${cmd.numero_table || 'non spécifiée'}.`;
    
    if (audioActiveGlobal) {
      declencherVibrationGlobal();
      ajouterAlerteCompleteGlobal(messageVocal);
    }
    // Met à jour instantanément le compteur sur la tuile d'accueil
    if (entrepriseId) {
      rafraichirCompteurEnAttente(entrepriseId);
    }
  };

  // --- EFFECT GLOBAL DE SURVEILLANCE DES COMMANDES QR SUR TOUTES LES PAGES ---
  useEffect(() => {
    if (!authentifie || !entrepriseId) return;

    const preferenceAudio = localStorage.getItem('4ts_audio_active');
    if (preferenceAudio !== null) {
      setAudioActiveGlobal(preferenceAudio === 'true');
    }

    async function initialiserCommandesConnues() {
      try {
        const { data } = await supabase
          .from('commandes_clients_qr')
          .select('id, statut')
          .eq('id_entreprise', entrepriseId);
        if (data) {
          data.forEach(c => idsCommandesConnuesGlobal.current.add(c.id));
          const enAttenteInit = data.filter(c => c.statut === 'EN_ATTENTE').length;
          setNombreCommandesEnAttente(enAttenteInit);
        }
      } catch (e) {}
    }
    initialiserCommandesConnues();

    const nomCanalGlobal = `commandes-global-realtime-${entrepriseId}`;
    supabase.getChannels().forEach((c) => {
      if (c.topic.includes(nomCanalGlobal)) {
        supabase.removeChannel(c);
      }
    });

    const canalGlobal = supabase
      .channel(nomCanalGlobal)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commandes_clients_qr',
          filter: `id_entreprise=eq.${entrepriseId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const nouvelleCmd = payload.new;
            if (nouvelleCmd && !idsCommandesConnuesGlobal.current.has(nouvelleCmd.id)) {
              idsCommandesConnuesGlobal.current.add(nouvelleCmd.id);
              notifierNouvelleCommandeGlobal(nouvelleCmd);
            }
          }
          // Actualise le compteur à chaque modification ou suppression
          rafraichirCompteurEnAttente(entrepriseId);
        }
      )
      .subscribe();

    const intervalSecoursGlobal = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('commandes_clients_qr')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (data) {
          data.forEach(cmd => {
            if (!idsCommandesConnuesGlobal.current.has(cmd.id)) {
              const diffMs = new Date() - new Date(cmd.created_at);
              if (diffMs < 120000) {
                idsCommandesConnuesGlobal.current.add(cmd.id);
                notifierNouvelleCommandeGlobal(cmd);
              } else {
                idsCommandesConnuesGlobal.current.add(cmd.id);
              }
            }
          });
          rafraichirCompteurEnAttente(entrepriseId);
        }
      } catch (e) {}
    }, 4000);

    return () => {
      supabase.removeChannel(canalGlobal);
      clearInterval(intervalSecoursGlobal);
    };
  }, [authentifie, entrepriseId, audioActiveGlobal]);

  // 🔄 Synchronisation instantanée du module courant si modifié dans le localStorage
  useEffect(() => {
    const synchroniserModuleStockage = () => {
      if (typeof window !== 'undefined') {
        const modStock = localStorage.getItem('module_actif') || localStorage.getItem('moduleActif');
        if (modStock && modStock.toUpperCase() !== moduleCourant) {
          setModuleCourant(modStock.toUpperCase());
        }
      }
    };

    window.addEventListener('storage', synchroniserModuleStockage);
    const intervalId = setInterval(synchroniserModuleStockage, 500);

    return () => {
      window.removeEventListener('storage', synchroniserModuleStockage);
      clearInterval(intervalId);
    };
  }, [moduleCourant]);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const userLocal = localStorage.getItem('utilisateurConnecte');
      const emailLocal = localStorage.getItem('emailConnecte');
      const entLocal = localStorage.getItem('entrepriseId');
      const modLocal = localStorage.getItem('module_actif') || localStorage.getItem('moduleActif');

      if (!userLocal || !emailLocal || !entLocal) {
        localStorage.clear();
        router.replace('/connexion');
        return;
      }

      setAuthentifie(true);
      setUtilisateurConnecte(userLocal.toUpperCase());
      setEmailConnecte(emailLocal);
      if (modLocal) {
        setModuleCourant(modLocal.toUpperCase());
      }

      const themeLocal = localStorage.getItem('4ts_theme_mode');
      if (themeLocal) {
        setIsDarkMode(themeLocal === 'dark');
      } else {
        localStorage.setItem('4ts_theme_mode', 'dark');
      }
    }
  }, [router]);

  const basculerTheme = () => {
    const nouveauMode = !isDarkMode;
    setIsDarkMode(nouveauMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('4ts_theme_mode', nouveauMode ? 'dark' : 'light');
    }
  };

  useEffect(() => {
    if (!authentifie || !entrepriseIdUrl) return;

    async function fetchEntrepriseData() {
      const cleCacheDashboard = `4ts_dashboard_cache_${entrepriseIdUrl}`;
      try {
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
          }
        }

        if (utilisateurConnecte || emailConnecte) {
          const { data: userData } = await supabase
            .from('utilisateurs')
            .select('modules_cibles, module, nom_complet')
            .eq('id_entreprise', entrepriseIdUrl)
            .or(`email.eq.${emailConnecte},nom_complet.eq.${utilisateurConnecte}`);

          let modulesAutorisesUser = [];
          if (userData && userData.length > 0) {
            const exactUser = userData.find(u => 
              (u.email && u.email.toLowerCase() === (emailConnecte || '').toLowerCase()) || 
              (u.nom_complet && u.nom_complet.toUpperCase() === (utilisateurConnecte || ''))
            ) || userData[0];

            if (exactUser && exactUser.nom_complet) {
              const nomDb = exactUser.nom_complet.toUpperCase();
              setUtilisateurConnecte(nomDb);
              if (typeof window !== 'undefined') {
                localStorage.setItem('utilisateurConnecte', nomDb);
              }
            }

            userData.forEach(row => {
              if (Array.isArray(row.modules_cibles) && row.modules_cibles.length > 0) {
                row.modules_cibles.forEach(m => modulesAutorisesUser.push(m.toUpperCase()));
              }
              if (row.module) {
                modulesAutorisesUser.push(row.module.toUpperCase());
              }
            });
          }
          modulesAutorisesUser = [...new Set(modulesAutorisesUser)];

          const modActuelStorage = typeof window !== 'undefined' ? (localStorage.getItem('module_actif') || localStorage.getItem('moduleActif'))?.toUpperCase() : null;

          if (modActuelStorage && modulesAutorisesUser.includes(modActuelStorage)) {
            setModuleCourant(modActuelStorage);
          } else if (!modActuelStorage && modulesAutorisesUser.length > 0) {
            const moduleParDefaut = modulesAutorisesUser[0];
            setModuleCourant(moduleParDefaut);
            if (typeof window !== 'undefined') {
              localStorage.setItem('moduleActif', moduleParDefaut);
              localStorage.setItem('module_actif', moduleParDefaut);
            }
          }
        }

      } catch (err) {
        console.error("Erreur de récupération entreprise :", err);
      }
    }

    fetchEntrepriseData();
  }, [authentifie, entrepriseIdUrl, utilisateurConnecte, emailConnecte]);

  const estModeLivraison = moduleCourant === 'LIVRAISON';
  const estModeTontine = moduleCourant === 'TONTINE';
  const estModeLogistique = moduleCourant === 'LOGISTIQUE';
  const emailActuel = emailConnecte || infosEntreprise.email || '';
  
  const estSuperAdmin = emailActuel.toLowerCase().trim() === 'stephs7352@gmail.com';

  const { 
    verifierPermission, 
    verifierCreation, 
    verifierModification, 
    verifierSuppression 
  } = usePermissions(
    entrepriseId, 
    utilisateurConnecte, 
    emailConnecte, 
    moduleCourant
  );

  const tenterAccesModule = (moduleId, nomModuleAffichage) => {
    if (verifierPermission(moduleId, estSuperAdmin)) {
      setModuleActif(moduleId);
    } else {
      alert(`⛔ Accès refusé : Vous n'avez pas les droits de lecture sur le module "${nomModuleAffichage}".`);
    }
  };

  const rendreModuleActif = () => {
    if (moduleActif === 'souscription') {
      return <EspaceSouscription entrepriseId={entrepriseId} isDarkMode={isDarkMode} />;
    }

    if (moduleActif === 'commandes_clients_qr') {
      return <GestionCommandesClientsQR entrepriseId={entrepriseId} isDarkMode={isDarkMode} />;
    }

    if (moduleActif === 'gestion_tables') {
      return (
        <GestionTables 
          entrepriseId={entrepriseId} 
          isDarkMode={isDarkMode}
          autoriserCreation={verifierCreation('gestion_tables', estSuperAdmin)}
          autoriserModification={verifierModification('gestion_tables', estSuperAdmin)}
          autoriserSuppression={verifierSuppression('gestion_tables', estSuperAdmin)}
        />
      );
    }

    if (moduleActif === 'tontine_participants') {
      return <GestionTontineParticipants entrepriseId={entrepriseId} isDarkMode={isDarkMode} />;
    }
    if (moduleActif === 'tontine_cycles') {
      return <GestionTontineCycles entrepriseId={entrepriseId} isDarkMode={isDarkMode} />;
    }
    if (moduleActif === 'tontine_cotisations') {
      return <GestionTontineCotisations entrepriseId={entrepriseId} isDarkMode={isDarkMode} />;
    }
    if (moduleActif === 'tontine_emprunts') {
      return <GestionTontineEmprunts entrepriseId={entrepriseId} isDarkMode={isDarkMode} />;
    }
    if (moduleActif === 'tontine_elections') {
      return <GestionElections entrepriseId={entrepriseId} isDarkMode={isDarkMode} />;
    }

    if (moduleActif === 'super_admin_panel' && estSuperAdmin) {
      return <PanneauSuperAdmin isDarkMode={isDarkMode} />;
    }

    if (estModeLivraison && moduleActif === 'module_livraison_specifique') {
      return <ModuleLivraison entrepriseId={entrepriseId} isDarkMode={isDarkMode} />;
    }

    switch (moduleActif) {
      case 'taxes_ristournes': 
        return <GestionTaxesRistournes entrepriseId={entrepriseId} isDarkMode={isDarkMode} />;
      
      case 'commandes_livraison': 
        return (
          <GestionCommandesLivraison 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('commandes_livraison', estSuperAdmin)}
            autoriserModification={verifierModification('commandes_livraison', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('commandes_livraison', estSuperAdmin)}
          />
        );

      case 'grille_tarifaire': 
        return (
          <GrilleTarifaireLivraison 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('grille_tarifaire', estSuperAdmin)}
            autoriserModification={verifierModification('grille_tarifaire', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('grille_tarifaire', estSuperAdmin)}
          />
        );

      case 'challenges_commerciaux': 
        return (
          <GestionChallengesCommerciaux 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('challenges_commerciaux', estSuperAdmin)}
            autoriserModification={verifierModification('challenges_commerciaux', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('challenges_commerciaux', estSuperAdmin)}
          />
        );

      case 'caisses': 
        return (
          <GestionCaisses 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('caisses', estSuperAdmin)}
            autoriserModification={verifierModification('caisses', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('caisses', estSuperAdmin)}
          />
        );

      case 'emplacements': 
        return (
          <GestionEmplacements 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('emplacements_stock', estSuperAdmin)}
            autoriserModification={verifierModification('emplacements_stock', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('emplacements_stock', estSuperAdmin)}
          />
        );

      case 'ventes': 
        return (
          <GestionVentesHistoriques 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('caisse', estSuperAdmin)}
            autoriserModification={verifierModification('caisse', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('caisse', estSuperAdmin)}
          />
        );

      case 'articles': 
        return (
          <GestionArticles 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('articles_stock', estSuperAdmin)}
            autoriserModification={verifierModification('articles_stock', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('articles_stock', estSuperAdmin)}
          />
        );

      case 'depots': 
        return (
          <GestionDepots 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('depots_stock', estSuperAdmin)}
            autoriserModification={verifierModification('depots_stock', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('depots_stock', estSuperAdmin)}
          />
        );

      case 'clients': 
        return (
          <GestionClients 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('clients', estSuperAdmin)}
            autoriserModification={verifierModification('clients', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('clients', estSuperAdmin)}
          />
        );

      case 'categories': 
        return (
          <GestionCategoriesClients 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('categories_clients', estSuperAdmin)}
            autoriserModification={verifierModification('categories_clients', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('categories_clients', estSuperAdmin)}
          />
        );

      case 'fournisseurs': 
        return (
          <GestionFournisseurs 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('fournisseurs', estSuperAdmin)}
            autoriserModification={verifierModification('fournisseurs', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('fournisseurs', estSuperAdmin)}
          />
        );

      case 'familles': 
        return (
          <GestionFamilles 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('familles_articles', estSuperAdmin)}
            autoriserModification={verifierModification('familles_articles', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('familles_articles', estSuperAdmin)}
          />
        );

      case 'mouvements': 
        return (
          <GestionMouvements 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('mouvements_stock', estSuperAdmin)}
            autoriserModification={verifierModification('mouvements_stock', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('mouvements_stock', estSuperAdmin)}
          />
        );

      case 'plan_comptable': 
        return (
          <GestionPlanComptable 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('plan_comptable', estSuperAdmin)}
            autoriserModification={verifierModification('plan_comptable', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('plan_comptable', estSuperAdmin)}
          />
        );

      case 'journal': 
        return (
          <GestionJournalCaisse 
            entrepriseId={entrepriseId} 
            vueInitiale="saisie_operations" 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('plan_comptable', estSuperAdmin)}
            autoriserModification={verifierModification('plan_comptable', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('plan_comptable', estSuperAdmin)}
          />
        );

      case 'grand_livre': 
        return <GestionJournalCaisse entrepriseId={entrepriseId} vueInitiale="grand_livre" isDarkMode={isDarkMode} />;
      
      case 'controle': 
        return <GestionJournalCaisse entrepriseId={entrepriseId} vueInitiale="controle_cloture" isDarkMode={isDarkMode} />;
      
      case 'roles': 
        return (
          <GestionRoles 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('roles_utilisateurs', estSuperAdmin)}
            autoriserModification={verifierModification('roles_utilisateurs', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('roles_utilisateurs', estSuperAdmin)}
          />
        );

      case 'utilisateurs': 
        return (
          <GestionUtilisateurs 
            entrepriseId={entrepriseId} 
            isDarkMode={isDarkMode}
            autoriserCreation={verifierCreation('roles_utilisateurs', estSuperAdmin)}
            autoriserModification={verifierModification('roles_utilisateurs', estSuperAdmin)}
            autoriserSuppression={verifierSuppression('roles_utilisateurs', estSuperAdmin)}
          />
        );

      default: 
        return null;
    }
  };

  if (!mounted || !authentifie) {
    return (
      <div className="h-screen bg-slate-900 text-slate-100 flex items-center justify-center font-sans text-xs">
        Vérification des droits d'accès sécurisés...
      </div>
    );
  }

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
    <div className={`h-full ${bgPrincipal} flex flex-col font-sans relative overflow-x-hidden w-full max-w-full text-xs`}>
      
      {/* 1. BARRE SUPÉRIEURE (HEADER) */}
      <div className={`top-0 z-20 ${bgHeaderNav} border-b px-3 py-2.5 shrink-0 flex items-center justify-between w-full`}>
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
          {/* Indicateur visuel permanent du radar QR Code actif (Corrigé pour s'afficher aussi sur mobile) */}
          <div 
            title="Radar de commandes QR actif en arrière-plan" 
            className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 px-2 py-1 rounded-lg text-[9px] font-black text-orange-400 shrink-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
            <span>Radar QR Actif</span>
          </div>

          <WidgetNotificationsUtilisateur isDarkMode={isDarkMode} />

          <button
            onClick={basculerTheme}
            title={isDarkMode ? "Passer en mode Jour" : "Passer en mode Nuit"}
            className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-black transition flex items-center gap-1 border shadow-2xs cursor-pointer ${
              isDarkMode 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30' 
                : 'bg-slate-800 text-cyan-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span>{isDarkMode ? '☀️' : '🌙'}</span>
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
              className={`${isDarkMode ? 'bg-sky-900/65 text-cyan-200 border-cyan-500/40 hover:bg-sky-800' : 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300'} font-bold px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] transition border shadow-2xs flex items-center gap-1 cursor-pointer`}
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

      {/* 2. ZONE CENTRALE */}
      <div className="p-1 sm:p-2 space-y-4 flex-1 overflow-y-auto w-full max-w-full mx-auto flex flex-col min-h-0">
        {ongletNavigation === 'explorer' && !moduleActif ? (
          <div className="w-full flex-1">
            <MenuExplorer entrepriseId={entrepriseId} isDarkMode={isDarkMode} />
          </div>
        ) : ongletNavigation === 'rapports' && !moduleActif ? (
          <div className="space-y-2.5 w-full">
            <h2 className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-0.5 ${isDarkMode ? 'text-cyan-400/80' : 'text-slate-600'}`}>
              COMPTABILITÉ
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
              {verifierPermission('ventes_historiques', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('journal', 'Saisie des Opérations')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex items-center space-x-3 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📝</span>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm">Saisie des Opérations</h3>
                    <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-cyan-200/70' : 'text-slate-500'}`}>Entrées, dépenses multi-lignes et pièces auto.</p>
                  </div>
                </div>
              )}
              {verifierPermission('ventes_historiques', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('plan_comptable', 'Plan Comptable')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex items-center space-x-3 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📚</span>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm">Plan Comptable</h3>
                    <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-cyan-200/70' : 'text-slate-500'}`}>Gestion et consultation du plan comptable.</p>
                  </div>
                </div>
              )}
              {verifierPermission('caisses', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('caisses', 'Gestion Caisses')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex items-center space-x-3 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🏧</span>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm">Création Caisse</h3>
                    <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-cyan-200/70' : 'text-slate-500'}`}>Gestion et création des caisses de l'entreprise.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : ongletNavigation === 'profil' && !moduleActif ? (
          <div className="space-y-3 w-full">
            {estSuperAdmin && (
              <div className={`${isDarkMode ? 'bg-[#0b1329] border-cyan-900/60' : 'bg-white border-blue-600/30'} p-3 rounded-xl border shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full`}>
                <div>
                  <h3 className={`font-black uppercase text-xs ${isDarkMode ? 'text-cyan-400' : 'text-blue-700'}`}>🛡️ ESPACE SUPER-ADMIN GLOBAL</h3>
                  <p className={`text-[10px] ${isDarkMode ? 'text-cyan-200/70' : 'text-slate-500'}`}>Panneau d'administration centralisé de toutes les entreprises.</p>
                </div>
                <button
                  onClick={() => setModuleActif(moduleActif === 'super_admin_panel' ? null : 'super_admin_panel')}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black px-4 py-2 rounded-xl text-xs transition shadow-md border border-amber-400/50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>🛡️</span> {moduleActif === 'super_admin_panel' ? 'Fermer le Panneau' : 'Ouvrir Super-Admin'}
                </button>
              </div>
            )}
            <div className={`${isDarkMode ? 'bg-[#0b1329] border-cyan-900/60 text-slate-100' : 'bg-white border-blue-600/30 text-slate-900'} rounded-xl shadow-sm p-2 sm:p-4 border w-full flex-1`}>
              <MonProfil entrepriseId={entrepriseId} isDarkMode={isDarkMode} />
            </div>
          </div>
        ) : moduleActif === 'super_admin_panel' && estSuperAdmin ? (
          <div className="w-full flex-1">
            {rendreModuleActif()}
          </div>
        ) : moduleActif === 'souscription' ? (
          <div className={`${isDarkMode ? 'bg-[#0b1329] border-cyan-900/60 text-slate-100' : 'bg-white border-blue-600/30 text-slate-900'} rounded-xl shadow-sm p-3 sm:p-6 border w-full flex-1`}>
            {rendreModuleActif()}
          </div>
        ) : !moduleActif && moduleCourant === 'TONTINE' ? (
          <div className="space-y-2.5 w-full">
            <h2 className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-0.5 ${isDarkMode ? 'text-cyan-400/80' : 'text-slate-600'}`}>
              ACCUEIL - MODULE TONTINE
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full">
              {verifierPermission('tontine_cycles', estSuperAdmin) && (
                <div onClick={() => setModuleActif('tontine_cycles')} className={`${cardClass} p-4 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group`}>
                  <span className="text-3xl group-hover:scale-110 transition">🔄</span>
                  <span className="font-bold text-xs leading-tight">Cycles & Sessions</span>
                </div>
              )}
              {verifierPermission('tontine_participants', estSuperAdmin) && (
                <div onClick={() => setModuleActif('tontine_participants')} className={`${cardClass} p-4 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group`}>
                  <span className="text-3xl group-hover:scale-110 transition">👥</span>
                  <span className="font-bold text-xs leading-tight">Gestion des Participants</span>
                </div>
              )}
              {verifierPermission('tontine_cotisations', estSuperAdmin) && (
                <div onClick={() => setModuleActif('tontine_cotisations')} className={`${cardClass} p-4 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group`}>
                  <span className="text-3xl group-hover:scale-110 transition">💰</span>
                  <span className="font-bold text-xs leading-tight">Suivi des Cotisations</span>
                </div>
              )}
              {verifierPermission('tontine_emprunts', estSuperAdmin) && (
                <div onClick={() => setModuleActif('tontine_emprunts')} className={`${cardClass} p-4 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group`}>
                  <span className="text-3xl group-hover:scale-110 transition">💳</span>
                  <span className="font-bold text-xs leading-tight">Gestion des Emprunts</span>
                </div>
              )}
              {verifierPermission('tontine_elections', estSuperAdmin) && (
                <div onClick={() => setModuleActif('tontine_elections')} className={`${cardClass} p-4 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group`}>
                  <span className="text-3xl group-hover:scale-110 transition">🏛️</span>
                  <span className="font-bold text-xs leading-tight">Élections du Bureau</span>
                </div>
              )}
              {verifierPermission('roles_utilisateurs', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('roles_utilisateurs', 'Gestion des Rôles')} className={`${cardClass} p-4 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-2 group`}>
                  <span className="text-3xl group-hover:scale-110 transition">🛡️</span>
                  <span className="font-bold text-xs leading-tight">Gestion des Rôles</span>
                </div>
              )}
            </div>
          </div>
        ) : !moduleActif && moduleCourant === 'LIVRAISON' ? (
          <div className="space-y-2.5 w-full">
            <h2 className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-0.5 ${isDarkMode ? 'text-cyan-400/80' : 'text-slate-600'}`}>
              ACCUEIL - MODULE LIVRAISON
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
              {verifierPermission('commandes_livraison', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('commandes_livraison', 'Commandes & Livraisons')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📦</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Commandes & Livraisons</span>
                </div>
              )}
              {verifierPermission('articles_stock', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('articles', 'Stock Articles')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📦</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Stock Articles</span>
                </div>
              )}
              {verifierPermission('grille_tarifaire', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('grille_tarifaire', 'Grille Tarifaire')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🗺️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Grille Tarifaire</span>
                </div>
              )}
              {verifierPermission('emplacements_stock', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('emplacements', 'Emplacements Livreurs')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📍</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Emplacements Livreurs</span>
                </div>
              )}
              {verifierPermission('depots_stock', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('depots', 'Dépôts de stock')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🏢</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Dépôts de stock</span>
                </div>
              )}
              {verifierPermission('familles_articles', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('familles', "Familles d'Articles")} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🗂️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Familles d'Articles</span>
                </div>
              )}
              {verifierPermission('challenges_commerciaux', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('challenges_commerciaux', 'Challenges Commerciaux')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🏆</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Challenges Commerciaux</span>
                </div>
              )}
              {verifierPermission('mouvements_stock', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('mouvements', 'Approvisionnement et Mouvement de stock')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🔄</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Approvisionnement et Mouvement de stock</span>
                </div>
              )}
              {verifierPermission('roles_utilisateurs', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('roles', 'Gestion des Rôles')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🛡️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion des Rôles</span>
                </div>
              )}
              {verifierPermission('fournisseurs', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('fournisseurs', 'Gestion Partenaire')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🤝</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion Partenaire</span>
                </div>
              )}
              {verifierPermission('roles_utilisateurs', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('utilisateurs', 'Gestion du Personnel')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🔑</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion du Personnel</span>
                </div>
              )}
              {verifierPermission('taxes_ristournes', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('taxes_ristournes', 'Taxes & Promos')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🏷️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Taxes & Promos</span>
                </div>
              )}
            </div>
          </div>
        ) : !moduleActif ? (
          <div className="space-y-2.5 w-full">
            <h2 className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-0.5 ${isDarkMode ? 'text-cyan-400/80' : 'text-slate-600'}`}>
              ACCUEIL - BOUTIQUE
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
              
              {verifierPermission('commandes_clients_qr', estSuperAdmin) && (
                <div 
                  onClick={() => setModuleActif('commandes_clients_qr')} 
                  className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group border-2 border-orange-500/50 relative`}
                >
                  {/* 🎯 COMPTEUR VISUEL DE COMMANDES QR EN ATTENTE SUR LA TUILE */}
                  {nombreCommandesEnAttente > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg ring-2 ring-white animate-bounce">
                      {nombreCommandesEnAttente}
                    </span>
                  )}

                  <span className="text-2xl group-hover:scale-110 transition">📱</span>
                  <span className="font-black text-[11px] sm:text-xs leading-tight text-orange-600">Commandes QR Code</span>
                </div>
              )}

              {verifierPermission('caisse', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('ventes', 'Caisse & Ventes')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🛒</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Caisse & Ventes</span>
                </div>
              )}

              {verifierPermission('articles_stock', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('articles', 'Articles & Stock')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📦</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Stock Articles</span>
                </div>
              )}

              {verifierPermission('gestion_tables', estSuperAdmin) && (
                <div 
                  onClick={() => tenterAccesModule('gestion_tables', 'Gestion des Tables')} 
                  className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group border-2 border-amber-500/50`}
                >
                  <span className="text-2xl group-hover:scale-110 transition">🪑</span>
                  <span className="font-black text-[11px] sm:text-xs leading-tight text-amber-500">Gestion des Tables</span>
                </div>
              )}

              {verifierPermission('mouvements_stock', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('mouvements', 'Approvisionnement et Mouvement de stock')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🔄</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Approvisionnement et Mouvement de stock</span>
                </div>
              )}
              {verifierPermission('emplacements_stock', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('emplacements', 'Emplacements Stock')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">📍</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Emplacements Stock</span>
                </div>
              )}
              {verifierPermission('depots_stock', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('depots', 'Dépôts & Magasins')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🏢</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Dépôts de stock</span>
                </div>
              )}
              {verifierPermission('familles_articles', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('familles', 'Familles & Catégories')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🗂️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Familles d'Articles</span>
                </div>
              )}
              {verifierPermission('categories_clients', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('categories', 'Catégories Clients')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🏷️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Catégories Clients</span>
                </div>
              )}
              {verifierPermission('clients', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('clients', 'Fichier Clients')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">👥</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion des Clients</span>
                </div>
              )}
              {verifierPermission('roles_utilisateurs', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('roles', 'Gestion des Rôles')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🛡️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion des Rôles</span>
                </div>
              )}
              {verifierPermission('fournisseurs', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('fournisseurs', 'Fournisseurs')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🤝</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion des Fournisseurs</span>
                </div>
              )}
              {verifierPermission('roles_utilisateurs', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('utilisateurs', 'Gestion du Personnel')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🔑</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Gestion du Personnel</span>
                </div>
              )}
              {verifierPermission('taxes_ristournes', estSuperAdmin) && (
                <div onClick={() => tenterAccesModule('taxes_ristournes', 'Taxes & Promos')} className={`${cardClass} p-3 rounded-xl cursor-pointer transition flex flex-col items-center text-center space-y-1.5 group`}>
                  <span className="text-2xl group-hover:scale-110 transition">🏷️</span>
                  <span className="font-bold text-[11px] sm:text-xs leading-tight">Taxes & Promos</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`${isDarkMode ? 'bg-[#0b1329] border-cyan-900/60 text-slate-100' : 'bg-white border-blue-600/30 text-slate-900'} rounded-xl shadow-sm p-3 sm:p-6 border w-full flex-1`}>
            {rendreModuleActif()}
          </div>
        )}
      </div>

      {/* 3. BARRE DE NAVIGATION INFÉRIEURE */}
      <div className={`bottom-0 left-0 right-0 z-30 ${bgHeaderNav} border-t py-2.5 px-6 flex justify-around items-center shadow-2xl shrink-0 w-full`}>
        <button
          onClick={() => { setOngletNavigation('accueil'); setModuleActif(null); }}
          className={`flex flex-col items-center space-y-0.5 transition cursor-pointer ${
            ongletNavigation === 'accueil' && !moduleActif 
              ? (isDarkMode ? 'text-cyan-400 font-extrabold scale-105' : 'text-blue-600 font-extrabold scale-105') 
              : (isDarkMode ? 'text-cyan-200/60 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900')
          }`}
        >
          <span className="text-lg">🏠</span>
          <span className="text-[10px]">Accueil</span>
        </button>

        {!estModeTontine && (
          <button
            onClick={() => { setOngletNavigation('rapports'); setModuleActif(null); }}
            className={`flex flex-col items-center space-y-0.5 transition cursor-pointer ${
              ongletNavigation === 'rapports' && !moduleActif 
                ? (isDarkMode ? 'text-cyan-400 font-extrabold scale-105' : 'text-blue-600 font-extrabold scale-105') 
                : (isDarkMode ? 'text-cyan-200/60 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900')
            }`}
          >
            <span className="text-lg">📊</span>
            <span className="text-[10px]">Comptabilité</span>
          </button>
        )}

        <button
          onClick={() => { setOngletNavigation('explorer'); setModuleActif(null); }}
          className={`flex flex-col items-center space-y-0.5 transition cursor-pointer ${
            ongletNavigation === 'explorer' && !moduleActif 
              ? (isDarkMode ? 'text-cyan-400 font-extrabold scale-105' : 'text-blue-600 font-extrabold scale-105') 
              : (isDarkMode ? 'text-cyan-200/60 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900')
          }`}
        >
          <span className="text-lg">🧭</span>
          <span className="text-[10px]">Explorer</span>
        </button>

        <button
          onClick={() => { setOngletNavigation('profil'); setModuleActif(null); }}
          className={`flex flex-col items-center space-y-0.5 transition cursor-pointer ${
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
    <div className={`w-full h-screen ${isDarkMode ? 'bg-[#02050b]' : 'bg-slate-200'} flex justify-center items-center overflow-hidden`}>
      <div className="hidden md:block w-full h-full max-w-full px-2 py-1">
        <SimulateurCadre>
          {contenuApp}
        </SimulateurCadre>
      </div>
      <div className="block md:hidden w-full h-full">
        {contenuApp}
      </div>
    </div>
  );
}

export default function DashboardPrincipal() {
  return (
    <Suspense fallback={<div className="h-screen bg-slate-900 text-white flex items-center justify-center">Chargement...</div>}>
      <DashboardContent />
    </Suspense>
  );
}