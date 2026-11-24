'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import CentreNotificationSuperAdmin from './CentreNotificationSuperAdmin';

const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const LISTE_MODULES_DISPONIBLES = ['BOUTIQUE', 'LIVRAISON', 'LOGISTIQUE', 'TONTINE'];

export default function PanneauSuperAdmin({ isDarkMode = false }) {
  const [modalActive, setModalActive] = useState(null);

  const [modeContournement, setModeContournement] = useState(false);
  const [chargementTarifs, setChargementTarifs] = useState(false);

  // 📋 États pour la création et gestion de tableaux dynamiques synchronisés via Supabase
  const [listeTableaux, setListeTableaux] = useState([]);
  const [chargementTableaux, setChargementTableaux] = useState(false);
  const [chargementCreationTableau, setChargementCreationTableau] = useState(false);

  const [sousVueTableau, setSousVueTableau] = useState('creer'); // 'creer' ou 'liste'
  const [tableauEnEditionId, setTableauEnEditionId] = useState(null);
  const [nouveauTableauTitre, setNouveauTableauTitre] = useState('');
  const [avecNumerotationAutomatique, setAvecNumerotationAutomatique] = useState(true);
  const [colonnesTableau, setColonnesTableau] = useState([
    { id: 1, nom: 'Nom et Prénom', type: 'texte' }
  ]);
  
  // États pour la modale de remplissage/consultation et modification de ligne
  const [modalRemplissageOuverte, setModalRemplissageOuverte] = useState(false);
  const [tableauEnCoursRemplissage, setTableauEnCoursRemplissage] = useState(null);
  const [nouvelleLigneDonnees, setNouvelleLigneDonnees] = useState({});
  const [modalSaisieLigneOuverte, setModalSaisieLigneOuverte] = useState(false);
  const [indexLigneEnEdition, setIndexLigneEnEdition] = useState(null);

  // 🧩 États pour la gestion dynamique des modules et comptage des souscriptions réelles
  const [listeModulesSupabase, setListeModulesSupabase] = useState([]);
  const [chargementModules, setChargementModules] = useState(false);
  const [initialisationModulesEnCours, setInitialisationModulesEnCours] = useState(false);
  const [comptageSouscriptionsModules, setComptageSouscriptionsModules] = useState({});

  const [confirmModuleModal, setConfirmModuleModal] = useState({
    ouverte: false,
    idModule: null,
    nomModule: '',
    champ: '', 
    valeurActuelle: true
  });

  const [listeEntreprises, setListeEntreprises] = useState([]);
  const [chargementEntreprises, setChargementEntreprises] = useState(false);
  const [utilisateursParEntreprise, setUtilisateursParEntreprise] = useState({});
  
  // État pour la modale de confirmation d'accès direct à une entreprise
  const [entrepriseCibleAcces, setEntrepriseCibleAcces] = useState(null);
  
  const [utilisateursEntrepriseSelectionnee, setUtilisateursEntrepriseSelectionnee] = useState([]);
  const [rolesEntrepriseSelectionnee, setRolesEntrepriseSelectionnee] = useState([]);
  const [chargementUtilisateursEnt, setChargementUtilisateursEnt] = useState(false);
  const [modalPersonnelOuverte, setModalPersonnelOuverte] = useState(false);

  const [entrepriseSelectionnee, setEntrepriseSelectionnee] = useState(null);
  const [donneesEdition, setDonneesEdition] = useState(null);
  const [initialEditionJson, setInitialEditionJson] = useState('');
  const [chargementActionEntreprise, setChargementActionEntreprise] = useState(false);
  const [confirmSuppressionModal, setConfirmSuppressionModal] = useState(false);

  const [tarifsConfig, setTarifsConfig] = useState({
    Boutique: { installation: 25000, mensuelPerUser: 5000 },
    Logistique: { installation: 20000, mensuelPerUser: 4000 },
    Livraison: { installation: 25000, mensuelPerUser: 5000 },
    Tontine: { installation: 25000, mensuelPerUser: 2500 },
    remisesDuree: [
      { seuil: 3, taux: 5 },
      { seuil: 6, taux: 10 },
      { seuil: 12, taux: 15 }
    ],
    remisesUsers: [
      { seuil: 10, taux: 5 },
      { seuil: 20, taux: 10 },
      { seuil: 50, taux: 15 }
    ]
  });

  const [tarifsInitiauxJson, setTarifsInitiauxJson] = useState(
    JSON.stringify({
      Boutique: { installation: 25000, mensuelPerUser: 5000 },
      Logistique: { installation: 20000, mensuelPerUser: 4000 },
      Livraison: { installation: 25000, mensuelPerUser: 5000 },
      Tontine: { installation: 25000, mensuelPerUser: 2500 },
      remisesDuree: [
        { seuil: 3, taux: 5 },
        { seuil: 6, taux: 10 },
        { seuil: 12, taux: 15 }
      ],
      remisesUsers: [
        { seuil: 10, taux: 5 },
        { seuil: 20, taux: 10 },
        { seuil: 50, taux: 15 }
      ]
    })
  );

  const [modalInfo, setModalInfo] = useState({
    ouverte: false,
    titre: '',
    message: '',
    type: 'succes'
  });

  const [confirmModal, setConfirmModal] = useState({
    ouverte: false,
    nouveauStatutCible: false
  });

  const [confirmTarifsModal, setConfirmTarifsModal] = useState(false);

  const afficherMessageModal = (titre, message, type = 'succes') => {
    setModalInfo({ ouverte: true, titre, message, type });
  };

  // 🚀 CHARGEMENT INITIAL GLOBAL (PRÉCHARGEMENT EN ARRIÈRE-PLAN DES ENTREPRISES ET MODULES POUR ZÉRO LATENCE)
  useEffect(() => {
    const chargerDonneesSuperAdmin = async () => {
      try {
        const supabase = getSupabaseClient();
        
        const [configRes, tarifsRes, entreprisesRes, usersRes, modulesRes] = await Promise.all([
          supabase.from('configuration_globale').select('valeur').eq('cle', '4ts_contournement_cinetpay').maybeSingle(),
          supabase.from('configuration_globale').select('valeur').eq('cle', '4ts_tarifs_plateforme').maybeSingle(),
          supabase.from('entreprises').select('*').order('created_at', { ascending: false }),
          supabase.from('utilisateurs').select('id_entreprise'),
          supabase.from('espaces_modules').select('*').order('id', { ascending: true })
        ]);

        if (configRes.data) {
          const actif = String(configRes.data.valeur) === 'true' || configRes.data.valeur === true;
          setModeContournement(actif);
        }

        if (tarifsRes.data && tarifsRes.data.valeur) {
          const parsedTarifs = typeof tarifsRes.data.valeur === 'string' ? JSON.parse(tarifsRes.data.valeur) : tarifsRes.data.valeur;
          
          if (parsedTarifs.remisesDuree && !Array.isArray(parsedTarifs.remisesDuree)) {
            parsedTarifs.remisesDuree = [
              { seuil: 3, taux: parsedTarifs.remisesDuree.mois3 || 5 },
              { seuil: 6, taux: parsedTarifs.remisesDuree.mois6 || 10 },
              { seuil: 12, taux: parsedTarifs.remisesDuree.mois12 || 15 }
            ];
          }
          if (parsedTarifs.remisesUsers && !Array.isArray(parsedTarifs.remisesUsers)) {
            parsedTarifs.remisesUsers = [
              { seuil: 10, taux: parsedTarifs.remisesUsers.users10 || 5 },
              { seuil: 20, taux: parsedTarifs.remisesUsers.users20 || 10 },
              { seuil: 50, taux: parsedTarifs.remisesUsers.users50 || 15 }
            ];
          }

          setTarifsConfig(parsedTarifs);
          setTarifsInitiauxJson(JSON.stringify(parsedTarifs));
        }

        let entreprisesData = [];
        if (entreprisesRes.data) {
          entreprisesData = entreprisesRes.data;
          setListeEntreprises(entreprisesData);
        }

        if (usersRes.data) {
          const counts = {};
          usersRes.data.forEach((u) => {
            const idEnt = u.id_entreprise;
            if (idEnt) {
              counts[idEnt] = (counts[idEnt] || 0) + 1;
            }
          });
          setUtilisateursParEntreprise(counts);
        }

        if (modulesRes.data) {
          const comptage = {};
          LISTE_MODULES_DISPONIBLES.forEach(m => { comptage[m] = 0; });

          entreprisesData.forEach(ent => {
            let espaces = ent.espaces_souscrits;
            if (!espaces && ent.module_actif) espaces = [ent.module_actif];
            
            if (typeof espaces === 'string') {
              espaces = espaces.split(',').map(s => s.trim().toUpperCase());
            } else if (Array.isArray(espaces)) {
              espaces = espaces.map(s => String(s).trim().toUpperCase());
            } else {
              espaces = ['BOUTIQUE'];
            }

            espaces.forEach(esp => {
              const match = LISTE_MODULES_DISPONIBLES.find(m => esp.includes(m));
              if (match) {
                comptage[match] = (comptage[match] || 0) + 1;
              }
            });
          });

          setComptageSouscriptionsModules(comptage);

          const modulesFiltres = modulesRes.data.filter((mod) => {
            const codeUpper = (mod.code_espace || '').toUpperCase();
            return LISTE_MODULES_DISPONIBLES.some((m) => codeUpper.includes(m));
          });
          setListeModulesSupabase(modulesFiltres);
        }

      } catch (err) {
        console.warn("Erreur chargement initial superadmin :", err);
      }
    };

    chargerDonneesSuperAdmin();
  }, []);

  // ⚡ ÉCOUTEUR TEMPS RÉEL (REALTIME SUPABASE) POUR LES TABLEAUX DYNAMIQUES
  useEffect(() => {
    const supabase = getSupabaseClient();
    const canalRealtime = supabase
      .channel('public:tableaux_dynamiques')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tableaux_dynamiques' }, (payload) => {
        chargerTableauxSupabase();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalRealtime);
    };
  }, []);

  useEffect(() => {
    if (modalActive === 'tableaux') {
      chargerTableauxSupabase();
    }
  }, [modalActive]);

  const chargerTableauxSupabase = async () => {
    setChargementTableaux(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('tableaux_dynamiques')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erreur Supabase tableaux_dynamiques :", error.message);
        afficherMessageModal("Erreur Base de Données", "Impossible de charger les tableaux : " + error.message, "erreur");
        return;
      }

      if (data) {
        const tableauxFormates = data.map(item => ({
          id: item.id,
          titre: item.titre,
          colonnes: typeof item.colonnes === 'string' ? JSON.parse(item.colonnes) : (item.colonnes || []),
          lignes: typeof item.lignes === 'string' ? JSON.parse(item.lignes) : (item.lignes || [])
        }));
        setListeTableaux(tableauxFormates);

        setTableauEnCoursRemplissage(prev => {
          if (!prev) return null;
          const trouve = tableauxFormates.find(t => t.id === prev.id);
          return trouve || prev;
        });
      }
    } catch (err) {
      console.error("Erreur inattendue chargement tableaux :", err);
      afficherMessageModal("Erreur", "Une erreur technique est survenue lors du chargement des tableaux.", "erreur");
    } finally {
      setChargementTableaux(false);
    }
  };

  const chargerModulesSupabase = async () => {
    if (listeModulesSupabase.length > 0) return;
    setChargementModules(true);
    try {
      const supabase = getSupabaseClient();
      const { data: modulesData, error: errModules } = await supabase
        .from('espaces_modules')
        .select('*')
        .order('id', { ascending: true });

      if (errModules) throw errModules;

      const modulesFiltres = (modulesData || []).filter((mod) => {
        const codeUpper = (mod.code_espace || '').toUpperCase();
        return LISTE_MODULES_DISPONIBLES.some((m) => codeUpper.includes(m));
      });

      setListeModulesSupabase(modulesFiltres);
    } catch (err) {
      console.error("Erreur chargement espaces_modules :", err);
    } finally {
      setChargementModules(false);
    }
  };

  const synchroniserModulesOfficiels = async () => {
    setInitialisationModulesEnCours(true);
    try {
      const supabase = getSupabaseClient();

      const { data: existants } = await supabase.from('espaces_modules').select('*');
      if (existants) {
        for (const item of existants) {
          const code = (item.code_espace || '').toUpperCase();
          const estValide = LISTE_MODULES_DISPONIBLES.some((m) => code.includes(m));
          if (!estValide) {
            await supabase.from('espaces_modules').delete().eq('id', item.id);
          }
        }
      }

      const definitionsModules = [
        {
          code_espace: 'ESPACE_BOUTIQUE',
          nom_espace: 'ESPACE BOUTIQUE',
          description: 'Gestion des ventes, caisses, articles et stocks par dépôt',
          visible: true,
          souscription_active: true
        },
        {
          code_espace: 'ESPACE_LIVRAISON',
          nom_espace: 'ESPACE LIVRAISON',
          description: 'Gestion des commandes, courses, livreurs et grilles tarifaires',
          visible: true,
          souscription_active: true
        },
        {
          code_espace: 'ESPACE_TONTINE',
          nom_espace: 'ESPACE TONTINE',
          description: 'Gestion des cycles, cotisations, emprunts et élections du bureau',
          visible: true,
          souscription_active: true
        },
        {
          code_espace: 'ESPACE_LOGISTIQUE',
          nom_espace: 'ESPACE LOGISTIQUE',
          description: 'Gestion de la flotte et du transport (En cours de développement)',
          visible: false,
          souscription_active: false
        }
      ];

      for (const def of definitionsModules) {
        const motCle = def.code_espace.replace('ESPACE_', '');
        const dejaPresent = (existants || []).some((e) =>
          (e.code_espace || '').toUpperCase().includes(motCle)
        );
        if (!dejaPresent) {
          await supabase.from('espaces_modules').insert([def]);
        }
      }

      const { data: refreshed } = await supabase.from('espaces_modules').select('*').order('id', { ascending: true });
      if (refreshed) {
        setListeModulesSupabase(refreshed.filter(mod => LISTE_MODULES_DISPONIBLES.some(m => (mod.code_espace || '').toUpperCase().includes(m))));
      }

      afficherMessageModal("Synchronisé", "La base de données a été alignée avec vos 4 modules officiels.", "succes");
    } catch (err) {
      afficherMessageModal("Erreur", "Échec de la synchronisation : " + err.message, "erreur");
    } finally {
      setInitialisationModulesEnCours(false);
    }
  };

  const demanderConfirmationModule = (mod, champ, valeurActuelle) => {
    setConfirmModuleModal({
      ouverte: true,
      idModule: mod.id,
      nomModule: mod.nom_espace || mod.code_espace,
      champ: champ,
      valeurActuelle: valeurActuelle
    });
  };

  const executerModificationModule = async () => {
    const { idModule, champ, valeurActuelle } = confirmModuleModal;
    setConfirmModuleModal({ ouverte: false, idModule: null, nomModule: '', champ: '', valeurActuelle: true });

    try {
      const supabase = getSupabaseClient();
      const nouveauStatut = !valeurActuelle;

      const { error } = await supabase
        .from('espaces_modules')
        .update({ [champ]: nouveauStatut })
        .eq('id', idModule);

      if (error) throw error;

      setListeModulesSupabase(prev =>
        prev.map(m => (m.id === idModule ? { ...m, [champ]: nouveauStatut } : m))
      );
      afficherMessageModal("Succès", "Le statut du module a été mis à jour avec succès !", "succes");
    } catch (err) {
      afficherMessageModal("Erreur", "Impossible de mettre à jour le module : " + err.message, "erreur");
    }
  };

  const chargerListeEntreprises = async () => {
    if (listeEntreprises.length > 0) return;
    setChargementEntreprises(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('entreprises')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListeEntreprises(data || []);
    } catch (err) {
      console.error("Erreur chargement entreprises :", err);
    } finally {
      setChargementEntreprises(false);
    }
  };

  const executerAccesEntreprise = () => {
    if (!entrepriseCibleAcces || typeof window === 'undefined') return;
    const ent = entrepriseCibleAcces;
    const idEnt = ent.id_entreprise || ent.id;
    if (!idEnt) return;

    localStorage.setItem('entreprise_id', idEnt);
    localStorage.setItem('entrepriseId', idEnt);
    localStorage.setItem('id_entreprise', idEnt);
    
    if (ent.nom_entreprise) {
      localStorage.setItem('nom_entreprise', ent.nom_entreprise);
    }
    
    let moduleActifCible = ent.module_actif;
    if (!moduleActifCible && ent.espaces_souscrits) {
      const espaces = Array.isArray(ent.espaces_souscrits) 
        ? ent.espaces_souscrits 
        : String(ent.espaces_souscrits).split(',').map(s => s.trim());
      if (espaces.length > 0) moduleActifCible = espaces[0];
    }
    if (moduleActifCible) {
      localStorage.setItem('module_actif', moduleActifCible);
    }

    setEntrepriseCibleAcces(null);
    setModalActive(null);
    window.location.reload();
  };

  const ouvrirDetailsEntreprise = async (ent) => {
    setEntrepriseSelectionnee(ent);
    const copie = { ...ent };
    setDonneesEdition(copie);
    setInitialEditionJson(JSON.stringify(copie));

    const idEnt = ent.id_entreprise || ent.id;
    if (idEnt) {
      setChargementUtilisateursEnt(true);
      try {
        const supabase = getSupabaseClient();
        const [usersRes, rolesRes] = await Promise.all([
          supabase.from('utilisateurs').select('*').eq('id_entreprise', idEnt),
          supabase.from('roles').select('*').eq('id_entreprise', idEnt)
        ]);

        if (usersRes.data) setUtilisateursEntrepriseSelectionnee(usersRes.data);
        if (rolesRes.data) setRolesEntrepriseSelectionnee(rolesRes.data);

      } catch (errU) {
        console.warn("Erreur chargement utilisateurs/rôles de l'entreprise :", errU);
        setUtilisateursEntrepriseSelectionnee([]);
        setRolesEntrepriseSelectionnee([]);
      } finally {
        setChargementUtilisateursEnt(false);
      }
    }
  };

  const basculerAccesUtilisateur = async (userId, statutActuel) => {
    try {
      const supabase = getSupabaseClient();
      const nouveauStatutAcces = !statutActuel;

      const { error } = await supabase
        .from('utilisateurs')
        .update({ acces: nouveauStatutAcces, acces_application: nouveauStatutAcces })
        .eq('id', userId);

      if (error) throw error;

      setUtilisateursEntrepriseSelectionnee(prev =>
        prev.map(u => (u.id === userId ? { ...u, acces: nouveauStatutAcces, acces_application: nouveauStatutAcces } : u))
      );
      afficherMessageModal("Succès", "Statut d'accès de l'employé mis à jour avec succès !", "succes");
    } catch (err) {
      afficherMessageModal("Erreur", "Impossible de modifier l'accès : " + err.message, "erreur");
    }
  };

  const supprimerUtilisateurEntreprise = async (userId, nomEmploye) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer définitivement ${nomEmploye || 'cet employé'} de cette entreprise ?`)) {
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('utilisateurs')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUtilisateursEntrepriseSelectionnee(prev => prev.filter(u => u.id !== userId));
      
      if (entrepriseSelectionnee) {
        const idEnt = entrepriseSelectionnee.id_entreprise || entrepriseSelectionnee.id;
        setUtilisateursParEntreprise(prev => ({
          ...prev,
          [idEnt]: Math.max(0, (prev[idEnt] || 1) - 1)
        }));
      }

      afficherMessageModal("Supprimé", "L'employé a été supprimé de la base de données.", "succes");
    } catch (err) {
      afficherMessageModal("Erreur", "Impossible de supprimer l'employé : " + err.message, "erreur");
    }
  };

  const modifierLicences = (delta) => {
    if (!donneesEdition) return;
    const actuel = Number(donneesEdition.limite_utilisateurs) || 1;
    const nouveau = Math.max(1, actuel + delta);
    setDonneesEdition({ ...donneesEdition, limite_utilisateurs: nouveau });
  };

  const modifierMoisAbonnement = (delta) => {
    if (!donneesEdition) return;
    const actuelMois = Number(donneesEdition.duree_abonnement_mois) || 1;
    const nouveauMois = Math.max(1, actuelMois + delta);
    setDonneesEdition({ ...donneesEdition, duree_abonnement_mois: nouveauMois });
  };

  const basculerModuleEntreprise = (nomModule) => {
    if (!donneesEdition) return;
    let espacesActuels = donneesEdition.espaces_souscrits;
    
    if (!espacesActuels) {
      espacesActuels = [donneesEdition.module_actif || 'BOUTIQUE'];
    } else if (typeof espacesActuels === 'string') {
      espacesActuels = espacesActuels.split(',').map(m => m.trim().toUpperCase());
    } else if (Array.isArray(espacesActuels)) {
      espacesActuels = espacesActuels.map(m => String(m).trim().toUpperCase());
    }

    const modUpper = nomModule.toUpperCase();
    let nouveauxEspaces = [];

    if (espacesActuels.includes(modUpper)) {
      nouveauxEspaces = espacesActuels.filter(m => m !== modUpper);
    } else {
      nouveauxEspaces = [...espacesActuels, modUpper];
    }

    setDonneesEdition({ ...donneesEdition, espaces_souscrits: nouveauxEspaces });
  };

  const modificationsEntrepriseApportees = donneesEdition && initialEditionJson && JSON.stringify(donneesEdition) !== initialEditionJson;

  const enregistrerModificationsEntreprise = async () => {
    if (!modificationsEntrepriseApportees) return;
    setChargementActionEntreprise(true);
    try {
      const supabase = getSupabaseClient();
      const idEnt = donneesEdition.id_entreprise || donneesEdition.id;
      const primaryKeyCol = donneesEdition.id_entreprise ? 'id_entreprise' : 'id';

      const { error } = await supabase
        .from('entreprises')
        .update({
          nom_entreprise: donneesEdition.nom_entreprise,
          email: donneesEdition.email,
          telephone: donneesEdition.telephone,
          statut_licence: donneesEdition.statut_licence,
          limite_utilisateurs: Number(donneesEdition.limite_utilisateurs),
          duree_abonnement_mois: Number(donneesEdition.duree_abonnement_mois),
          espaces_souscrits: donneesEdition.espaces_souscrits
        })
        .eq(primaryKeyCol, idEnt);

      if (error) throw error;

      afficherMessageModal("Succès", "Les informations et les modules de l'entreprise ont été mis à jour avec succès !", "succes");
      setEntrepriseSelectionnee(null);
      setDonneesEdition(null);
      setUtilisateursEntrepriseSelectionnee([]);
      setRolesEntrepriseSelectionnee([]);
    } catch (err) {
      afficherMessageModal("Erreur", "Échec de la mise à jour : " + err.message, "erreur");
    } finally {
      setChargementActionEntreprise(false);
    }
  };

  const executerSuppressionEntreprise = async () => {
    if (!entrepriseSelectionnee) return;
    setConfirmSuppressionModal(false);
    setChargementActionEntreprise(true);

    try {
      const supabase = getSupabaseClient();
      const idEnt = entrepriseSelectionnee.id_entreprise || entrepriseSelectionnee.id;
      const primaryKeyCol = entrepriseSelectionnee.id_entreprise ? 'id_entreprise' : 'id';

      const { error } = await supabase
        .from('entreprises')
        .delete()
        .eq(primaryKeyCol, idEnt);

      if (error) throw error;

      afficherMessageModal("Supprimé", "L'entreprise a été complètement supprimée de la base de données.", "succes");
      setEntrepriseSelectionnee(null);
      setDonneesEdition(null);
      setUtilisateursEntrepriseSelectionnee([]);
      setRolesEntrepriseSelectionnee([]);
      setListeEntreprises(prev => prev.filter(e => (e.id_entreprise || e.id) !== idEnt));
    } catch (err) {
      afficherMessageModal("Erreur", "Impossible de supprimer l'entreprise : " + err.message, "erreur");
    } finally {
      setChargementActionEntreprise(false);
    }
  };

  const demanderConfirmationBasculement = (e) => {
    const nouveauStatut = e.target.checked;
    setConfirmModal({ ouverte: true, nouveauStatutCible: nouveauStatut });
  };

  const confirmerBasculementContournement = async () => {
    const nouveauStatut = confirmModal.nouveauStatutCible;
    setConfirmModal({ ouverte: false, nouveauStatutCible: false });
    setModeContournement(nouveauStatut);

    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('configuration_globale')
        .upsert([{ cle: '4ts_contournement_cinetpay', valeur: String(nouveauStatut) }], { onConflict: 'cle' });

      if (typeof window !== 'undefined') {
        localStorage.setItem('4ts_contournement_cinetpay', String(nouveauStatut));
      }

      afficherMessageModal(
        "Mise à jour réussie (Global)",
        nouveauStatut ? "Mode contournement CinetPay activé globalement !" : "Mode contournement CinetPay désactivé.",
        "succes"
      );
    } catch (err) {
      console.error("Erreur sauvegarde globale :", err);
      afficherMessageModal("Erreur", "Impossible d'enregistrer le paramètre.", "erreur");
    }
  };

  const ajouterPalierDuree = () => {
    const liste = [...(tarifsConfig.remisesDuree || []), { seuil: 1, taux: 0 }];
    setTarifsConfig({ ...tarifsConfig, remisesDuree: liste });
  };

  const supprimerPalierDuree = (index) => {
    const liste = [...tarifsConfig.remisesDuree];
    liste.splice(index, 1);
    setTarifsConfig({ ...tarifsConfig, remisesDuree: liste });
  };

  const modifierPalierDuree = (index, champ, valeur) => {
    const liste = [...tarifsConfig.remisesDuree];
    liste[index][champ] = valeur === '' ? '' : Number(valeur);
    setTarifsConfig({ ...tarifsConfig, remisesDuree: liste });
  };

  const ajouterPalierUser = () => {
    const liste = [...(tarifsConfig.remisesUsers || []), { seuil: 1, taux: 0 }];
    setTarifsConfig({ ...tarifsConfig, remisesUsers: liste });
  };

  const supprimerPalierUser = (index) => {
    const liste = [...tarifsConfig.remisesUsers];
    liste.splice(index, 1);
    setTarifsConfig({ ...tarifsConfig, remisesUsers: liste });
  };

  const modifierPalierUser = (index, champ, valeur) => {
    const liste = [...tarifsConfig.remisesUsers];
    liste[index][champ] = valeur === '' ? '' : Number(valeur);
    setTarifsConfig({ ...tarifsConfig, remisesUsers: liste });
  };

  const modificationsApportees = JSON.stringify(tarifsConfig) !== tarifsInitiauxJson;

  const initierEnregistrementTarifs = (e) => {
    e.preventDefault();
    if (!modificationsApportees) return;
    setConfirmTarifsModal(true);
  };

  const executerEnregistrementTarifs = async () => {
    setConfirmTarifsModal(false);
    setChargementTarifs(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('configuration_globale')
        .upsert([{ cle: '4ts_tarifs_plateforme', valeur: tarifsConfig }], { onConflict: 'cle' });

      if (error) throw error;

      if (typeof window !== 'undefined') {
        localStorage.setItem('4ts_tarifs_plateforme', JSON.stringify(tarifsConfig));
      }

      setTarifsInitiauxJson(JSON.stringify(tarifsConfig));

      afficherMessageModal("Succès", "Les tarifs, frais et grilles de réductions personnalisées ont été mis à jour avec succès !", "succes");
    } catch (err) {
      afficherMessageModal("Erreur", "Échec de l'enregistrement des tarifs : " + err.message, "erreur");
    } finally {
      setChargementTarifs(false);
    }
  };

  const mainBg = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const cardBg = isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-xl' : 'bg-white border-[#0d2347]/30 text-slate-900 shadow-xl';
  const innerCardBg = isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900';
  const inputBg = isDarkMode ? 'bg-slate-950 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-300 font-bold';
  
  const titleColor = isDarkMode ? 'text-slate-200' : 'text-[#0d2347]';
  const subTitleColor = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  
  const accentBtnBg = isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' : 'bg-[#0d2347] hover:bg-[#133265] text-white';
  const secondaryBtnBg = isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-[#0d2347] font-bold border border-slate-300';
  
  const menuButtonClass = isDarkMode 
    ? 'py-3 px-2 rounded-xl font-black uppercase text-[10px] transition border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 shadow-sm cursor-pointer flex items-center justify-center text-center gap-1.5' 
    : 'py-3 px-2 rounded-xl font-black uppercase text-[10px] transition border border-[#0d2347]/30 bg-white hover:bg-slate-50 text-[#0d2347] shadow-sm cursor-pointer flex items-center justify-center text-center gap-1.5';

  return (
    <div className={`w-full min-w-full space-y-4 px-2 sm:px-4 py-3 text-xs font-sans box-border overflow-x-hidden ${mainBg}`} style={{ width: '100%', maxWidth: '100%' }}>
      
      {/* EN-TÊTE DU PANNEAU */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 gap-3 w-full ${isDarkMode ? 'border-slate-800' : 'border-slate-300'}`}>
        <div>
          <h2 className={`font-black uppercase text-xs sm:text-sm tracking-wide ${titleColor}`}>
            🛡️ PANNEAU SUPER ADMINISTRATEUR
          </h2>
          <p className={`text-[10px] sm:text-[11px] mt-0.5 font-medium ${subTitleColor}`}>
            Supervision globale, grilles tarifaires et passerelles de paiement.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className={`${secondaryBtnBg} px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] transition cursor-pointer flex items-center gap-1.5 shrink-0`}
        >
          <span>🔄</span> Actualiser
        </button>
      </div>

      {/* BOUTONS D'ACCÈS RAPIDE */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
        <button onClick={() => setModalActive('paiements')} className={menuButtonClass}>
          <span>💳</span> Paiements
        </button>
        <button onClick={() => setModalActive('tarifs')} className={menuButtonClass}>
          <span>🏷️</span> Tarifs
        </button>
        <button 
          onClick={() => {
            setModalActive('entreprises');
            chargerListeEntreprises();
          }} 
          className={menuButtonClass}
        >
          <span>🏢</span> Entreprises
        </button>
        <button onClick={() => setModalActive('notifications')} className={menuButtonClass}>
          <span>📢</span> Notifications
        </button>
        <button 
          onClick={() => {
            setModalActive('modules');
            chargerModulesSupabase();
          }} 
          className={menuButtonClass}
        >
          <span>🧩</span> Modules
        </button>
        <button onClick={() => setModalActive('maintenance')} className={menuButtonClass}>
          <span>⚙️</span> Maintenance
        </button>
        <button onClick={() => { setModalActive('tableaux'); setSousVueTableau('creer'); }} className={menuButtonClass}>
          <span>📋</span> Tableaux Dynamiques
        </button>
      </div>

      {/* 💳 MODALE PAIEMENTS */}
      {modalActive === 'paiements' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-5 space-y-4 ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h3 className={`font-black uppercase text-xs sm:text-sm flex items-center gap-2 ${titleColor}`}>
                <span>💳</span> GESTION DE LA PASSERELLE DE PAIEMENT
              </h3>
              <button onClick={() => setModalActive(null)} className={`font-bold px-3 py-1 rounded-lg text-xs cursor-pointer ${secondaryBtnBg}`}>
                Fermer ✕
              </button>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 w-full py-2">
              <div className="space-y-2 flex-1 w-full pr-0 sm:pr-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-black uppercase text-xs tracking-wide">PASSERELLE CINETPAY (1.0 AURORE)</span>
                  <span className={`text-[10px] font-black px-3 py-0.5 rounded-full border ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-[#0d2347]/10 text-[#0d2347] border-[#0d2347]/30'}`}>
                    MODE CONTOURNEMENT {modeContournement ? '(ACTIF)' : '(INACTIF)'}
                  </span>
                </div>
                <p className={`text-[11px] leading-relaxed w-full font-medium ${subTitleColor}`}>
                  Lorsque le contournement est actif, CinetPay est court-circuité globalement : les nouvelles entreprises sur le lien public sont créées et activées immédiatement sans exigence de paiement.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={modeContournement} onChange={demanderConfirmationBasculement} className="sr-only peer" />
                <div className={`w-14 h-8 bg-slate-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all ${isDarkMode ? 'peer-checked:bg-slate-700' : 'peer-checked:bg-[#0d2347]'}`}></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 🏷️ MODALE TARIFS & RÉDUCTIONS */}
      {modalActive === 'tarifs' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border p-5 space-y-4 max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h3 className={`font-black uppercase text-xs sm:text-sm ${titleColor}`}>
                🏷️ Configuration des Tarifs, Frais et Paliers de Réductions
              </h3>
              <button onClick={() => setModalActive(null)} className={`font-bold px-3 py-1 rounded-lg text-xs cursor-pointer ${secondaryBtnBg}`}>
                Fermer ✕
              </button>
            </div>

            <form onSubmit={initierEnregistrementTarifs} className="space-y-4">
              <div className="space-y-2.5">
                <h4 className={`font-black uppercase text-[10px] sm:text-[11px] ${titleColor}`}>1. Tarifs par Module</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['Boutique', 'Logistique', 'Livraison', 'Tontine'].map((mod) => (
                    <div key={mod} className={`p-3 rounded-xl border ${innerCardBg} space-y-2 shadow-2xs`}>
                      <h5 className={`font-black text-xs uppercase ${titleColor}`}>{mod}</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`block text-[8.5px] uppercase font-bold mb-1 truncate ${subTitleColor}`}>Installation (XAF)</label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            onFocus={(e) => e.target.select()}
                            value={tarifsConfig[mod]?.installation ?? 0}
                            onChange={(e) => setTarifsConfig({
                              ...tarifsConfig,
                              [mod]: { ...tarifsConfig[mod], installation: e.target.value === '' ? '' : Number(e.target.value) }
                            })}
                            className={`w-full border rounded-lg p-2 text-xs font-bold text-center ${inputBg}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-[8.5px] uppercase font-bold mb-1 truncate ${subTitleColor}`}>Mensuel / User (XAF)</label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            onFocus={(e) => e.target.select()}
                            value={tarifsConfig[mod]?.mensuelPerUser ?? 0}
                            onChange={(e) => setTarifsConfig({
                              ...tarifsConfig,
                              [mod]: { ...tarifsConfig[mod], mensuelPerUser: e.target.value === '' ? '' : Number(e.target.value) }
                            })}
                            className={`w-full border rounded-lg p-2 text-xs font-bold text-center ${inputBg}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-300/40">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <h4 className={`font-black uppercase text-[10px] sm:text-[11px] ${titleColor}`}>2. Réductions par Durée (%)</h4>
                    <button type="button" onClick={ajouterPalierDuree} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer shadow-xs">
                      + Ajouter
                    </button>
                  </div>
                  <div className={`p-3 rounded-xl border ${innerCardBg} space-y-2.5`}>
                    {(tarifsConfig.remisesDuree || []).map((palier, index) => (
                      <div key={index} className={`flex items-center gap-2 p-2 rounded-lg border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                        <span className="text-[10px] font-bold shrink-0">Dès :</span>
                        <input type="tel" inputMode="numeric" value={palier.seuil} onChange={(e) => modifierPalierDuree(index, 'seuil', e.target.value)} className={`w-14 border rounded p-1 text-xs text-center font-bold ${inputBg}`} />
                        <span className="text-[10px] font-bold shrink-0">mois →</span>
                        <input type="tel" inputMode="numeric" value={palier.taux} onChange={(e) => modifierPalierDuree(index, 'taux', e.target.value)} className={`w-14 border rounded p-1 text-xs text-center font-bold ${inputBg}`} />
                        <span className="text-[10px] font-black shrink-0">%</span>
                        <button type="button" onClick={() => supprimerPalierDuree(index)} className="ml-auto bg-rose-600 hover:bg-rose-700 text-white p-1 rounded text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <h4 className={`font-black uppercase text-[10px] sm:text-[11px] ${titleColor}`}>3. Réductions par Utilisateurs (%)</h4>
                    <button type="button" onClick={ajouterPalierUser} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer shadow-xs">
                      + Ajouter
                    </button>
                  </div>
                  <div className={`p-3 rounded-xl border ${innerCardBg} space-y-2.5`}>
                    {(tarifsConfig.remisesUsers || []).map((palier, index) => (
                      <div key={index} className={`flex items-center gap-2 p-2 rounded-lg border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                        <span className="text-[10px] font-bold shrink-0">Dès :</span>
                        <input type="tel" inputMode="numeric" value={palier.seuil} onChange={(e) => modifierPalierUser(index, 'seuil', e.target.value)} className={`w-14 border rounded p-1 text-xs text-center font-bold ${inputBg}`} />
                        <span className="text-[10px] font-bold shrink-0">users →</span>
                        <input type="tel" inputMode="numeric" value={palier.taux} onChange={(e) => modifierPalierUser(index, 'taux', e.target.value)} className={`w-14 border rounded p-1 text-xs text-center font-bold ${inputBg}`} />
                        <span className="text-[10px] font-black shrink-0">%</span>
                        <button type="button" onClick={() => supprimerPalierUser(index)} className="ml-auto bg-rose-600 hover:bg-rose-700 text-white p-1 rounded text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setModalActive(null)} className={`px-4 py-2 rounded-xl text-xs font-bold ${secondaryBtnBg}`}>Annuler</button>
                <button type="submit" disabled={!modificationsApportees || chargementTarifs} className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${modificationsApportees ? accentBtnBg : 'bg-slate-400 text-slate-700 cursor-not-allowed'}`}>
                  {chargementTarifs ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🏢 MODALE ENTREPRISES */}
      {modalActive === 'entreprises' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-3xl rounded-2xl shadow-2xl border p-5 space-y-4 max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h3 className={`font-black uppercase text-xs sm:text-sm ${titleColor}`}>
                🏢 Liste globale des entreprises de l'écosystème ({listeEntreprises.length})
              </h3>
              <button onClick={() => setModalActive(null)} className={`font-bold px-3 py-1 rounded-lg text-xs cursor-pointer ${secondaryBtnBg}`}>
                Fermer ✕
              </button>
            </div>

            {chargementEntreprises && listeEntreprises.length === 0 ? (
              <div className={`py-12 text-center font-bold ${subTitleColor}`}>Chargement des entreprises...</div>
            ) : listeEntreprises.length === 0 ? (
              <div className={`py-12 text-center font-bold ${subTitleColor}`}>Aucune entreprise enregistrée pour le moment.</div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {listeEntreprises.map((ent) => {
                  const idEnt = ent.id_entreprise || ent.id;
                  const nbConsommes = utilisateursParEntreprise[idEnt] || 0;
                  const limiteMax = Number(ent.limite_utilisateurs) || 1;

                  return (
                    <div 
                      key={idEnt}
                      className={`p-3 rounded-xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'}`}
                    >
                      <div className="space-y-1 cursor-pointer flex-1" onClick={() => ouvrirDetailsEntreprise(ent)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-[#0d2347]/10 text-[#0d2347] border-[#0d2347]/30'}`}>
                            {idEnt}
                          </span>
                          <h4 className="font-black uppercase text-xs tracking-wide">
                            {ent.nom_entreprise || 'Nom non défini'}
                          </h4>
                        </div>
                        <div className={`text-[10px] flex flex-wrap gap-x-4 gap-y-0.5 font-medium ${subTitleColor}`}>
                          <span>📧 {ent.email || 'N/A'}</span>
                          <span>📞 {ent.telephone || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-300/40">
                        <div className="text-right mr-2 hidden sm:block">
                          <span className={`text-[9px] block uppercase font-bold ${subTitleColor}`}>Licences / Users</span>
                          <span className="text-xs font-mono font-black text-emerald-500">
                            {nbConsommes} / {limiteMax} actifs
                          </span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEntrepriseCibleAcces(ent);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] px-3 py-1.5 rounded-lg shadow-sm transition uppercase cursor-pointer flex items-center gap-1"
                          title="Accéder directement à cette entreprise"
                        >
                          <span>🚀</span> Accéder
                        </button>

                        <button 
                          type="button" 
                          onClick={() => ouvrirDetailsEntreprise(ent)}
                          className={`font-black text-[10px] px-3 py-1.5 rounded-lg shadow-sm transition uppercase cursor-pointer ${accentBtnBg}`}
                        >
                          Voir détails 🔍
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🛡️ MODALE DE CONFIRMATION D'ACCÈS À UNE ENTREPRISE */}
      {entrepriseCibleAcces && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl p-5 space-y-4 text-center shadow-2xl border ${cardBg}`}>
            <div className="space-y-1.5">
              <span className="text-2xl">🚀</span>
              <h4 className="font-black text-xs sm:text-sm uppercase tracking-wide text-emerald-500">
                Confirmation d'accès
              </h4>
              <p className="text-[11px] font-semibold leading-relaxed pt-1">
                Voulez-vous vraiment accéder à l'entreprise <strong className="uppercase text-cyan-400">"{entrepriseCibleAcces.nom_entreprise || entrepriseCibleAcces.id_entreprise}"</strong> ?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEntrepriseCibleAcces(null)}
                className={`py-2 px-3 rounded-xl font-black text-xs uppercase ${secondaryBtnBg}`}
              >
                Annuler ✕
              </button>
              <button
                type="button"
                onClick={executerAccesEntreprise}
                className="py-2 px-3 rounded-xl font-black text-xs uppercase bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition"
              >
                Confirmer ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📢 MODALE NOTIFICATIONS */}
      {modalActive === 'notifications' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl border p-5 space-y-4 max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h3 className={`font-black uppercase text-xs sm:text-sm ${titleColor}`}>
                📢 Centre de Diffusion des Notifications
              </h3>
              <button onClick={() => setModalActive(null)} className={`font-bold px-3 py-1 rounded-lg text-xs cursor-pointer ${secondaryBtnBg}`}>
                Fermer ✕
              </button>
            </div>
            <CentreNotificationSuperAdmin />
          </div>
        </div>
      )}

      {/* 🧩 MODALE MODULES */}
      {modalActive === 'modules' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl border p-5 space-y-4 max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40 gap-2">
              <h3 className={`font-black uppercase text-xs sm:text-sm ${titleColor}`}>
                🧩 Gestion Centralisée des Modules (Base de Données)
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={initialisationModulesEnCours}
                  onClick={synchroniserModulesOfficiels}
                  title="Aligner la base de données avec vos modules officiels"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase cursor-pointer shadow-xs"
                >
                  {initialisationModulesEnCours ? 'Sync...' : '🔄 Aligner BD'}
                </button>
                <button onClick={() => setModalActive(null)} className={`font-bold px-3 py-1 rounded-lg text-xs cursor-pointer ${secondaryBtnBg}`}>
                  Fermer ✕
                </button>
              </div>
            </div>

            {chargementModules && listeModulesSupabase.length === 0 ? (
              <div className={`py-12 text-center font-bold ${subTitleColor}`}>Chargement des modules et comptage des souscriptions...</div>
            ) : listeModulesSupabase.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className={`font-bold ${subTitleColor}`}>Aucun module enregistré dans la table `espaces_modules`.</p>
                <button
                  type="button"
                  disabled={initialisationModulesEnCours}
                  onClick={synchroniserModulesOfficiels}
                  className={`px-4 py-2 rounded-xl font-black text-xs uppercase cursor-pointer ${accentBtnBg}`}
                >
                  {initialisationModulesEnCours ? 'Initialisation...' : '➕ Initialiser les modules officiels'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {listeModulesSupabase.map((mod) => {
                  const estVisible = mod.visible !== false;
                  const estActifSouscription = mod.souscription_active !== false;

                  const codeUpper = (mod.code_espace || '').toUpperCase();
                  const nomCleMatching = LISTE_MODULES_DISPONIBLES.find(m => codeUpper.includes(m)) || codeUpper;
                  
                  const nombreEntreprisesInscrites = comptageSouscriptionsModules[nomCleMatching] || 0;
                  const moduleEnProduction = nombreEntreprisesInscrites > 0;

                  return (
                    <div key={mod.id} className={`p-3.5 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${innerCardBg}`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${isDarkMode ? 'bg-slate-900 text-cyan-400' : 'bg-[#0d2347]/15 text-[#0d2347]'}`}>
                            {mod.code_espace}
                          </span>
                          <h4 className="font-black uppercase text-xs">{mod.nom_espace}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-slate-400">{mod.description || 'Aucune description.'}</p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${nombreEntreprisesInscrites > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                            🏢 {nombreEntreprisesInscrites} entreprise(s) inscrite(s)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-300/40">
                        {moduleEnProduction ? (
                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wide">
                            🔒 Verrouillé (En prod)
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => demanderConfirmationModule(mod, 'visible', estVisible)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                                estVisible ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-500 hover:bg-slate-600 text-white'
                              }`}
                              title="Rendre visible ou masquer le module"
                            >
                              {estVisible ? '👁️ Visible' : '🔒 Masqué'}
                            </button>

                            <button
                              type="button"
                              onClick={() => demanderConfirmationModule(mod, 'souscription_active', estActifSouscription)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                                estActifSouscription ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'
                              }`}
                              title="Activer ou bloquer la souscription à ce module"
                            >
                              {estActifSouscription ? '✅ Souscriptible' : '⛔ Bloqué'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🛡️ MODALE DE CONFIRMATION D'ACTION SUR UN MODULE */}
      {confirmModuleModal.ouverte && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl p-5 space-y-4 text-center shadow-2xl border ${cardBg}`}>
            <div className="space-y-1.5">
              <span className="text-2xl">⚠️</span>
              <h4 className="font-black text-xs sm:text-sm uppercase tracking-wide text-amber-500">
                Confirmation requise
              </h4>
              <p className="text-[11px] font-semibold leading-relaxed pt-1">
                Voulez-vous vraiment <span className="underline font-black">{confirmModuleModal.valeurActuelle ? (confirmModuleModal.champ === 'visible' ? 'masquer' : 'bloquer') : (confirmModuleModal.champ === 'visible' ? 'rendre visible' : 'rendre souscriptible')}</span> le module <strong className="uppercase text-cyan-400">"{confirmModuleModal.nomModule}"</strong> ?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModuleModal({ ouverte: false, idModule: null, nomModule: '', champ: '', valeurActuelle: true })}
                className={`py-2 px-3 rounded-xl font-black text-xs uppercase ${secondaryBtnBg}`}
              >
                Annuler ✕
              </button>
              <button
                type="button"
                onClick={executerModificationModule}
                className="py-2 px-3 rounded-xl font-black text-xs uppercase bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition"
              >
                Confirmer ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ MODALE MAINTENANCE */}
      {modalActive === 'maintenance' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4 text-center ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h3 className={`font-black uppercase text-xs ${titleColor}`}>⚙️ Maintenance Système</h3>
              <button onClick={() => setModalActive(null)} className={`font-bold px-3 py-1 rounded-lg text-xs cursor-pointer ${secondaryBtnBg}`}>Fermer ✕</button>
            </div>
            <p className={`py-8 text-xs font-bold ${subTitleColor}`}>Outils de maintenance, purges de cache et journaux système.</p>
          </div>
        </div>
      )}

      {/* 📋 MODALE TABLEAUX DYNAMIQUES */}
      {modalActive === 'tableaux' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-4xl rounded-2xl shadow-2xl border p-5 space-y-4 max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h3 className={`font-black uppercase text-xs sm:text-sm ${titleColor}`}>
                📋 Gestionnaire de Tableaux Dynamiques
              </h3>
              <button onClick={() => { setModalActive(null); setTableauEnEditionId(null); }} className={`font-bold px-3 py-1 rounded-lg text-xs cursor-pointer ${secondaryBtnBg}`}>
                Fermer ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-300/40">
              <button
                type="button"
                onClick={() => {
                  setSousVueTableau('creer');
                  setTableauEnEditionId(null);
                  setNouveauTableauTitre('');
                  setAvecNumerotationAutomatique(true);
                  setColonnesTableau([{ id: 1, nom: 'Nom et Prénom', type: 'texte' }]);
                }}
                className={`py-2 px-3 rounded-xl font-black text-xs uppercase transition cursor-pointer flex items-center justify-center gap-2 ${
                  sousVueTableau === 'creer' ? accentBtnBg : secondaryBtnBg
                }`}
              >
                <span>➕</span> {tableauEnEditionId ? 'Modifier la structure' : 'Créer un tableau'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSousVueTableau('liste');
                  chargerTableauxSupabase();
                }}
                className={`py-2 px-3 rounded-xl font-black text-xs uppercase transition cursor-pointer flex items-center justify-center gap-2 ${
                  sousVueTableau === 'liste' ? accentBtnBg : secondaryBtnBg
                }`}
              >
                <span>📂</span> Mes tableaux enregistrés ({listeTableaux.length})
              </button>
            </div>

            {sousVueTableau === 'creer' ? (
              <div className={`p-4 rounded-xl border space-y-3 ${innerCardBg}`}>
                <h4 className={`font-black uppercase text-xs ${titleColor}`}>
                  {tableauEnEditionId ? '✏️ Modifier la structure du tableau' : '➕ Créer un nouveau tableau personnalisé'}
                </h4>
                
                <div>
                  <label className="block text-[9px] uppercase font-bold mb-1">Nom du tableau</label>
                  <input
                    type="text"
                    value={nouveauTableauTitre}
                    onChange={(e) => setNouveauTableauTitre(e.target.value)}
                    placeholder="Ex: Liste des participants..."
                    className={`w-full border rounded-lg p-2 text-xs ${inputBg}`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="checkAuto"
                    checked={avecNumerotationAutomatique}
                    onChange={(e) => setAvecNumerotationAutomatique(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <label htmlFor="checkAuto" className="font-bold text-xs cursor-pointer">
                    Activer la première colonne en numérotation automatique croissante (1, 2, 3...)
                  </label>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold uppercase text-[10px]">Colonnes personnalisées :</span>
                    <button
                      type="button"
                      onClick={() => setColonnesTableau([...colonnesTableau, { id: Date.now(), nom: `Colonne ${colonnesTableau.length + 1}`, type: 'texte' }])}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded text-[10px]"
                    >
                      + Ajouter une colonne
                    </button>
                  </div>

                  <div className="space-y-2">
                    {colonnesTableau.map((col, idx) => (
                      <div key={col.id} className="flex items-center gap-2">
                        <span className="font-bold text-[10px] w-6">#{idx + 1}</span>
                        <input
                          type="text"
                          value={col.nom}
                          onChange={(e) => {
                            const copie = [...colonnesTableau];
                            copie[idx].nom = e.target.value;
                            setColonnesTableau(copie);
                          }}
                          placeholder={`Nom de la colonne ${idx + 1}`}
                          className={`w-full border rounded-lg p-1.5 text-xs ${inputBg}`}
                        />
                        {colonnesTableau.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setColonnesTableau(colonnesTableau.filter((_, i) => i !== idx))}
                            className="bg-rose-600 text-white px-2 py-1.5 rounded text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={chargementCreationTableau}
                  onClick={async () => {
                    if (!nouveauTableauTitre.trim()) {
                      afficherMessageModal("Erreur", "Veuillez donner un nom à votre tableau.", "erreur");
                      return;
                    }

                    let finalColonnes = [...colonnesTableau];
                    if (avecNumerotationAutomatique) {
                      finalColonnes.unshift({ id: 'auto_num', nom: 'N°', type: 'nombre', automatique: true });
                    }

                    setChargementCreationTableau(true);
                    try {
                      const supabase = getSupabaseClient();

                      if (tableauEnEditionId) {
                        const { error } = await supabase
                          .from('tableaux_dynamiques')
                          .update({
                            titre: nouveauTableauTitre.trim(),
                            colonnes: finalColonnes
                          })
                          .eq('id', tableauEnEditionId);

                        if (error) throw error;

                        setTableauEnEditionId(null);
                        afficherMessageModal("Succès", "La structure du tableau a été mise à jour et synchronisée !", "succes");
                      } else {
                        const nouveauTabPayload = {
                          titre: nouveauTableauTitre.trim(),
                          colonnes: finalColonnes,
                          lignes: []
                        };

                        const { error } = await supabase
                          .from('tableaux_dynamiques')
                          .insert([nouveauTabPayload]);

                        if (error) throw error;

                        afficherMessageModal("Succès", "Votre tableau a été créé et synchronisé !", "succes");
                      }

                      setNouveauTableauTitre('');
                      setColonnesTableau([{ id: 1, nom: 'Nom et Prénom', type: 'texte' }]);
                      await chargerTableauxSupabase();
                      setSousVueTableau('liste');

                    } catch (err) {
                      afficherMessageModal("Erreur de synchronisation", "Impossible d'enregistrer sur Supabase : " + err.message, "erreur");
                    } finally {
                      setChargementCreationTableau(false);
                    }
                  }}
                  className={`w-full py-2.5 rounded-xl font-black uppercase text-xs shadow-md ${chargementCreationTableau ? 'opacity-50 cursor-not-allowed' : ''} ${accentBtnBg}`}
                >
                  {chargementCreationTableau ? 'Enregistrement en cours...' : (tableauEnEditionId ? 'Mettre à jour le Tableau 💾' : 'Enregistrer et Créer le Tableau 🚀')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className={`font-black uppercase text-xs ${titleColor}`}>📂 Mes Tableaux Synchronisés ({listeTableaux.length})</h4>
                  <button
                    onClick={chargerTableauxSupabase}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-[10px] font-bold"
                  >
                    🔄 Rafraîchir
                  </button>
                </div>

                {chargementTableaux ? (
                  <p className={`text-xs font-medium py-6 text-center ${subTitleColor}`}>Chargement des tableaux...</p>
                ) : listeTableaux.length === 0 ? (
                  <p className={`text-xs font-medium italic py-6 text-center ${subTitleColor}`}>Aucun tableau trouvé.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {listeTableaux.map((tab) => (
                      <div key={tab.id} className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${innerCardBg}`}>
                        <div>
                          <h5 className="font-black text-xs uppercase tracking-wide">{tab.titre}</h5>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {tab.colonnes.length} colonne(s) | {tab.lignes.length} ligne(s)
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => {
                              setTableauEnCoursRemplissage(tab);
                              setModalRemplissageOuverte(true);
                            }}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-black text-[10px] uppercase ${accentBtnBg}`}
                          >
                            Remplir / Consulter 📝
                          </button>
                          
                          <button
                            onClick={() => {
                              setTableauEnEditionId(tab.id);
                              setNouveauTableauTitre(tab.titre);
                              const colsSansAuto = tab.colonnes.filter(c => !c.automatique);
                              const aAuto = tab.colonnes.some(c => c.automatique);
                              setAvecNumerotationAutomatique(aAuto);
                              setColonnesTableau(colsSansAuto.length > 0 ? colsSansAuto : [{ id: 1, nom: 'Nom', type: 'texte' }]);
                              setSousVueTableau('creer');
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"
                            title="Modifier la structure"
                          >
                            ✏️
                          </button>

                          <button
                            onClick={async () => {
                              if (window.confirm(`Voulez-vous supprimer définitivement le tableau "${tab.titre}" ?`)) {
                                try {
                                  const supabase = getSupabaseClient();
                                  const { error } = await supabase
                                    .from('tableaux_dynamiques')
                                    .delete()
                                    .eq('id', tab.id);

                                  if (error) throw error;
                                  await chargerTableauxSupabase();
                                  afficherMessageModal("Supprimé", "Le tableau a été supprimé avec succès.", "succes");
                                } catch (err) {
                                  afficherMessageModal("Erreur", "Impossible de supprimer : " + err.message, "erreur");
                                }
                              }
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-lg text-xs"
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE DE REMPLISSAGE */}
      {modalRemplissageOuverte && tableauEnCoursRemplissage && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl rounded-2xl shadow-2xl border p-5 space-y-4 max-h-[90vh] overflow-y-auto ${cardBg}`}>
            
            <div className="flex items-center justify-between border-b pb-3 border-slate-300/40">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📊</span>
                <div>
                  <h4 className={`font-black uppercase text-sm tracking-wide ${titleColor}`}>
                    {tableauEnCoursRemplissage.titre}
                  </h4>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                    Généré par 4TSuite Manager
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className={`font-bold px-3 py-1 rounded-lg text-xs cursor-pointer flex items-center gap-1.5 ${secondaryBtnBg}`}
                >
                  <span>🖨️</span> Imprimer / Exporter
                </button>
                <button 
                  onClick={() => { setModalRemplissageOuverte(false); setTableauEnCoursRemplissage(null); }} 
                  className={`font-bold px-3 py-1 rounded-lg text-xs cursor-pointer ${secondaryBtnBg}`}
                >
                  Fermer ✕
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center print:hidden">
              <span className="text-[10px] font-bold uppercase text-slate-400">Données enregistrées ({tableauEnCoursRemplissage.lignes.length} lignes)</span>
              <button
                onClick={() => {
                  const initialData = {};
                  tableauEnCoursRemplissage.colonnes.forEach((col, idx) => {
                    if (col.automatique && idx === 0) {
                      initialData[col.nom] = (tableauEnCoursRemplissage.lignes.length + 1);
                    } else {
                      initialData[col.nom] = '';
                    }
                  });
                  setNouvelleLigneDonnees(initialData);
                  setIndexLigneEnEdition(null);
                  setModalSaisieLigneOuverte(true);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase shadow-sm ${accentBtnBg}`}
              >
                + Ajouter une ligne
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-300/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-800'}>
                    {tableauEnCoursRemplissage.colonnes.map((col, idx) => (
                      <th key={idx} className="p-2.5 font-black uppercase border-b border-slate-300/40">
                        {col.nom} {col.automatique && '⚙️'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableauEnCoursRemplissage.lignes.length === 0 ? (
                    <tr>
                      <td colSpan={tableauEnCoursRemplissage.colonnes.length} className="text-center py-8 text-slate-400 font-bold">
                        Aucune donnée enregistrée.
                      </td>
                    </tr>
                  ) : (
                    tableauEnCoursRemplissage.lignes.map((ligne, lIndex) => (
                      <tr 
                        key={lIndex} 
                        onClick={() => {
                          setNouvelleLigneDonnees({ ...ligne });
                          setIndexLigneEnEdition(lIndex);
                          setModalSaisieLigneOuverte(true);
                        }}
                        className={`border-b cursor-pointer transition ${isDarkMode ? 'border-slate-800 hover:bg-slate-800/80' : 'border-slate-200 hover:bg-blue-50/50'}`}
                      >
                        {tableauEnCoursRemplissage.colonnes.map((col, cIndex) => (
                          <td key={cIndex} className="p-2.5 font-medium">
                            {ligne[col.nom] !== undefined ? String(ligne[col.nom]) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SOUS-MODALE DE SAISIE */}
      {modalSaisieLigneOuverte && tableauEnCoursRemplissage && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xs flex items-start justify-center z-50 p-4 pt-10 sm:pt-16 overflow-y-auto">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-5 space-y-4 ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h4 className={`font-black uppercase text-xs ${titleColor}`}>
                {indexLigneEnEdition !== null ? '✏️ Modifier ou supprimer la ligne' : '➕ Ajouter une information'}
              </h4>
              <button onClick={() => setModalSaisieLigneOuverte(false)} className={`text-xs font-bold px-2 py-0.5 rounded ${secondaryBtnBg}`}>✕</button>
            </div>

            <div className="space-y-3">
              {tableauEnCoursRemplissage.colonnes.map((col, idx) => (
                <div key={idx}>
                  <label className="block text-[9px] uppercase font-bold mb-1">{col.nom} {col.automatique && '(Auto)'}</label>
                  <input
                    type="text"
                    disabled={col.automatique}
                    value={nouvelleLigneDonnees[col.nom] !== undefined ? nouvelleLigneDonnees[col.nom] : ''}
                    onChange={(e) => {
                      setNouvelleLigneDonnees({
                        ...nouvelleLigneDonnees,
                        [col.nom]: e.target.value
                      });
                    }}
                    className={`w-full border rounded-lg p-2 text-xs ${col.automatique ? 'opacity-60 cursor-not-allowed' : ''} ${inputBg}`}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setModalSaisieLigneOuverte(false)} className={`py-2 rounded-xl font-black text-xs uppercase ${secondaryBtnBg}`}>Annuler</button>
                <button
                  onClick={async () => {
                    let nouvellesLignes = [...tableauEnCoursRemplissage.lignes];
                    if (indexLigneEnEdition !== null) {
                      nouvellesLignes[indexLigneEnEdition] = nouvelleLigneDonnees;
                    } else {
                      nouvellesLignes.push(nouvelleLigneDonnees);
                    }

                    try {
                      const supabase = getSupabaseClient();
                      const { error } = await supabase
                        .from('tableaux_dynamiques')
                        .update({ lignes: nouvellesLignes })
                        .eq('id', tableauEnCoursRemplissage.id);

                      if (error) throw error;

                      const tableauMisAJour = { ...tableauEnCoursRemplissage, lignes: nouvellesLignes };
                      setTableauEnCoursRemplissage(tableauMisAJour);
                      await chargerTableauxSupabase();

                      setModalSaisieLigneOuverte(false);
                      afficherMessageModal("Succès", indexLigneEnEdition !== null ? "Ligne modifiée !" : "Ligne ajoutée !", "succes");
                    } catch (err) {
                      afficherMessageModal("Erreur", "Impossible de synchroniser : " + err.message, "erreur");
                    }
                  }}
                  className={`py-2 rounded-xl font-black text-xs uppercase ${accentBtnBg}`}
                >
                  Enregistrer ✓
                </button>
              </div>

              {indexLigneEnEdition !== null && (
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("Voulez-vous vraiment supprimer cette ligne ?")) {
                      const nouvellesLignes = tableauEnCoursRemplissage.lignes.filter((_, idx) => idx !== indexLigneEnEdition);
                      const colonnesAuto = tableauEnCoursRemplissage.colonnes.filter(c => c.automatique);
                      const lignesMisesAJour = nouvellesLignes.map((lig, indexLig) => {
                        const copieLig = { ...lig };
                        colonnesAuto.forEach(ca => {
                          copieLig[ca.nom] = indexLig + 1;
                        });
                        return copieLig;
                      });

                      try {
                        const supabase = getSupabaseClient();
                        const { error } = await supabase
                          .from('tableaux_dynamiques')
                          .update({ lignes: lignesMisesAJour })
                          .eq('id', tableauEnCoursRemplissage.id);

                        if (error) throw error;

                        const tableauMisAJour = { ...tableauEnCoursRemplissage, lignes: lignesMisesAJour };
                        setTableauEnCoursRemplissage(tableauMisAJour);
                        await chargerTableauxSupabase();

                        setModalSaisieLigneOuverte(false);
                        afficherMessageModal("Supprimé", "La ligne a été supprimée.", "succes");
                      } catch (err) {
                        afficherMessageModal("Erreur", "Impossible de supprimer : " + err.message, "erreur");
                      }
                    }
                  }}
                  className="w-full py-2 rounded-xl font-black text-xs uppercase bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
                >
                  Supprimer cette ligne 🗑️
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🏢 MODALE DÉTAILS ET MODIFICATION D'UNE ENTREPRISE */}
      {entrepriseSelectionnee && donneesEdition && (() => {
        const idEnt = donneesEdition.id_entreprise || donneesEdition.id;
        const nbConsommes = utilisateursParEntreprise[idEnt] || 0;
        const limiteMax = Number(donneesEdition.limite_utilisateurs) || 1;
        const licencesRestantes = Math.max(0, limiteMax - nbConsommes);

        let dateInscriptionFormatted = 'N/A';
        let dateExpirationFormatted = 'N/A';
        if (donneesEdition.created_at) {
          const dateInsc = new Date(donneesEdition.created_at);
          dateInscriptionFormatted = dateInsc.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
          
          const dureeMois = Number(donneesEdition.duree_abonnement_mois) || 1;
          const dateExp = new Date(dateInsc);
          dateExp.setMonth(dateExp.getMonth() + dureeMois);
          dateExpirationFormatted = dateExp.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }

        let espacesActuelsListe = donneesEdition.espaces_souscrits;
        if (!espacesActuelsListe) {
          espacesActuelsListe = [donneesEdition.module_actif || 'BOUTIQUE'];
        } else if (typeof espacesActuelsListe === 'string') {
          espacesActuelsListe = espacesActuelsListe.split(',').map(m => m.trim().toUpperCase());
        } else if (Array.isArray(espacesActuelsListe)) {
          espacesActuelsListe = espacesActuelsListe.map(m => String(m).trim().toUpperCase());
        }

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-5 space-y-4 max-h-[90vh] overflow-y-auto ${cardBg}`}>
              
              <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
                <div>
                  <span className={`font-mono text-[10px] font-bold ${titleColor}`}>{idEnt}</span>
                  <input
                    type="text"
                    value={donneesEdition.nom_entreprise || ''}
                    onChange={(e) => setDonneesEdition({ ...donneesEdition, nom_entreprise: e.target.value })}
                    className={`w-full border rounded-lg px-2 py-1 text-sm sm:text-base font-black uppercase mt-1 ${inputBg}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setEntrepriseSelectionnee(null); setDonneesEdition(null); setUtilisateursEntrepriseSelectionnee([]); setRolesEntrepriseSelectionnee([]); }}
                  className={`font-bold px-3 py-1 rounded-lg text-xs cursor-pointer ${secondaryBtnBg}`}
                >
                  Fermer ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-xl border space-y-2 ${innerCardBg}`}>
                  <span className={`text-[9px] uppercase font-bold block ${subTitleColor}`}>Contact & Email</span>
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500">Email</label>
                    <input
                      type="email"
                      value={donneesEdition.email || ''}
                      onChange={(e) => setDonneesEdition({ ...donneesEdition, email: e.target.value })}
                      className={`w-full border rounded-md p-1.5 text-xs ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500">Téléphone</label>
                    <input
                      type="text"
                      value={donneesEdition.telephone || ''}
                      onChange={(e) => setDonneesEdition({ ...donneesEdition, telephone: e.target.value })}
                      className={`w-full border rounded-md p-1.5 text-xs ${inputBg}`}
                    />
                  </div>
                </div>

                <div className={`p-3 rounded-xl border space-y-2 ${innerCardBg}`}>
                  <span className={`text-[9px] uppercase font-bold block ${subTitleColor}`}>Statut & Durée (Mois)</span>
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500">Statut Licence</label>
                    <select
                      value={donneesEdition.statut_licence || 'ACTIF'}
                      onChange={(e) => setDonneesEdition({ ...donneesEdition, statut_licence: e.target.value })}
                      className={`w-full border rounded-md p-1.5 text-xs font-bold ${inputBg}`}
                    >
                      <option value="ACTIF">ACTIF</option>
                      <option value="EXPIRE">EXPIRE</option>
                      <option value="suspendu">SUSPENDU</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-bold text-slate-400">Mois :</span>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => modifierMoisAbonnement(-1)} className="bg-slate-700 hover:bg-slate-600 text-white font-black px-2.5 py-0.5 rounded text-xs">-</button>
                      <button type="button" onClick={() => modifierMoisAbonnement(1)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-2.5 py-0.5 rounded text-xs">+</button>
                      <span className="text-[10px] font-black pl-1">{donneesEdition.duree_abonnement_mois || 1} mois</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs ${innerCardBg}`}>
                <span className={`text-[9px] uppercase font-bold ${subTitleColor}`}>📅 Dates Clés :</span>
                <div className="flex flex-wrap items-center gap-4 font-medium">
                  <span>Inscription : <strong className="font-bold">{dateInscriptionFormatted}</strong></span>
                  <span>⏳ Expiration : <strong className="text-emerald-500 font-bold">{dateExpirationFormatted}</strong></span>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${innerCardBg}`}>
                <span className={`text-[9px] uppercase font-bold block ${subTitleColor}`}>🧩 Modules & Espaces</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LISTE_MODULES_DISPONIBLES.map((mod) => {
                    const estActif = espacesActuelsListe.includes(mod);
                    return (
                      <div key={mod} className={`flex items-center justify-between p-2 rounded-lg border text-[10px] ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <span className="font-extrabold uppercase">{mod}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold ${estActif ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {estActif ? 'Actif ✓' : 'Inactif ✕'}
                          </span>
                          <button
                            type="button"
                            onClick={() => basculerModuleEntreprise(mod)}
                            className={`px-2.5 py-1 rounded text-[9px] font-black uppercase transition cursor-pointer shadow-xs ${estActif ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                          >
                            {estActif ? 'Supprimer' : 'Activer'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`p-4 rounded-xl border space-y-3 ${innerCardBg}`}>
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className={`font-black uppercase text-xs ${titleColor}`}>📊 Suivi des Licences</h4>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => modifierLicences(-1)} className="bg-slate-700 text-white px-2 py-0.5 rounded text-xs">-</button>
                    <button type="button" onClick={() => modifierLicences(1)} className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs">+</button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
                    <span className="text-[9px] uppercase block text-slate-400">Total</span>
                    <span className="text-sm font-black font-mono">{limiteMax}</span>
                  </div>
                  <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
                    <span className="text-[9px] uppercase block text-slate-400">Consommées</span>
                    <span className="text-sm font-black font-mono text-emerald-500">{nbConsommes}</span>
                  </div>
                  <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
                    <span className="text-[9px] uppercase block text-slate-400">Restantes</span>
                    <span className="text-sm font-black font-mono text-cyan-400">{licencesRestantes}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalPersonnelOuverte(true)}
                  className={`w-full py-2 px-3 rounded-xl font-black text-xs uppercase transition cursor-pointer ${accentBtnBg}`}
                >
                  <span>👥</span> Afficher le personnel ({utilisateursEntrepriseSelectionnee.length}) ➔
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmSuppressionModal(true)}
                  disabled={chargementActionEntreprise}
                  className="py-2 px-3 rounded-xl font-black text-xs uppercase bg-rose-600 hover:bg-rose-700 text-white transition shadow-md cursor-pointer"
                >
                  Supprimer 🗑️
                </button>

                <button
                  type="button"
                  onClick={enregistrerModificationsEntreprise}
                  disabled={!modificationsEntrepriseApportees || chargementActionEntreprise}
                  className={`py-2 px-3 rounded-xl font-black text-xs uppercase shadow-md transition text-center ${modificationsEntrepriseApportees ? accentBtnBg : 'bg-slate-400 text-slate-700 cursor-not-allowed'}`}
                >
                  {chargementActionEntreprise ? 'Enregistrement...' : 'Enregistrer 💾'}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 👥 MODALE DÉDIÉE : LISTE DU PERSONNEL */}
      {modalPersonnelOuverte && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border p-5 space-y-4 max-h-[85vh] overflow-y-auto ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h3 className={`font-black uppercase text-xs sm:text-sm ${titleColor}`}>
                👥 Personnel de l'entreprise — {entrepriseSelectionnee?.nom_entreprise}
              </h3>
              <button onClick={() => setModalPersonnelOuverte(false)} className={`font-bold px-3 py-1 rounded-lg text-xs cursor-pointer ${secondaryBtnBg}`}>Fermer ✕</button>
            </div>

            {chargementUtilisateursEnt ? (
              <div className="text-center py-12 text-xs font-bold">Chargement...</div>
            ) : utilisateursEntrepriseSelectionnee.length === 0 ? (
              <div className="text-center py-12 text-xs font-medium">Aucun employé rattaché.</div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {utilisateursEntrepriseSelectionnee.map((usr) => {
                  const userId = usr.id || usr.id_utilisateur;
                  const nomUser = usr.nom || usr.nom_complet || 'Nom inconnu';
                  const aAcces = usr.acces !== false && usr.acces_application !== false && usr.statut !== 'bloque';

                  const roleTrouve = rolesEntrepriseSelectionnee.find(
                    (r) => String(r.id) === String(usr.id_role) || String(r.id) === String(usr.role_id)
                  );
                  const intituleRole = roleTrouve ? roleTrouve.nom_role : (usr.nom_role || 'ADMINISTRATEUR');

                  return (
                    <div key={userId} className={`p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${innerCardBg}`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-xs uppercase">{nomUser}</h4>
                          <span className="bg-orange-500/15 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded font-black text-[9.5px]">
                            🛡️ {intituleRole}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">{usr.email || 'N/A'} | {usr.telephone || 'N/A'}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-300/40">
                        <button onClick={() => basculerAccesUtilisateur(userId, aAcces)} className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${aAcces ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                          {aAcces ? 'Bloquer 🔒' : 'Activer 🔓'}
                        </button>
                        <button onClick={() => supprimerUtilisateurEntreprise(userId, nomUser)} className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded text-[10px] font-black uppercase">
                          Supprimer 🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION DE SUPPRESSION */}
      {confirmSuppressionModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-sm rounded-2xl p-5 space-y-4 text-center shadow-2xl border ${cardBg}`}>
            <h4 className="font-black text-sm uppercase text-rose-600">Confirmation de suppression</h4>
            <p className="text-[11px] font-bold">Voulez-vous vraiment supprimer définitivement cette entreprise ?</p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => setConfirmSuppressionModal(false)} className={`py-2 px-3 rounded-xl font-black text-xs uppercase ${secondaryBtnBg}`}>Annuler</button>
              <button onClick={executerSuppressionEntreprise} className="py-2 px-3 rounded-xl font-black text-xs uppercase bg-rose-600 text-white">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALES DE CONFIRMATION TARIFS & CONTOURNEMENT */}
      {confirmModal.ouverte && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-sm rounded-2xl p-5 space-y-4 text-center shadow-2xl border ${cardBg}`}>
            <h4 className="font-black text-sm uppercase text-amber-500">Confirmation CinetPay</h4>
            <p className="text-[11px] font-semibold">
              Voulez-vous {confirmModal.nouveauStatutCible ? 'activer' : 'désactiver'} le mode contournement CinetPay global ?
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => setConfirmModal({ ouverte: false, nouveauStatutCible: false })} className={`py-2 px-3 rounded-xl font-black text-xs uppercase ${secondaryBtnBg}`}>Annuler</button>
              <button onClick={confirmerBasculementContournement} className="py-2 px-3 rounded-xl font-black text-xs uppercase bg-emerald-600 text-white">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {confirmTarifsModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-sm rounded-2xl p-5 space-y-4 text-center shadow-2xl border ${cardBg}`}>
            <h4 className="font-black text-sm uppercase text-amber-500">Enregistrer les tarifs</h4>
            <p className="text-[11px] font-semibold">Confirmer la mise à jour de la grille tarifaire globale ?</p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => setConfirmTarifsModal(false)} className={`py-2 px-3 rounded-xl font-black text-xs uppercase ${secondaryBtnBg}`}>Annuler</button>
              <button onClick={executerEnregistrementTarifs} className="py-2 px-3 rounded-xl font-black text-xs uppercase bg-emerald-600 text-white">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE NOTIFICATION SUCCÈS / ERREUR */}
      {modalInfo.ouverte && (
        <div className="fixed inset-0 bg-slate-950/75 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-sm rounded-2xl p-5 space-y-4 text-center shadow-2xl border ${cardBg}`}>
            <h4 className={`font-black text-sm uppercase ${modalInfo.type === 'erreur' ? 'text-rose-500' : 'text-emerald-500'}`}>{modalInfo.titre}</h4>
            <p className="text-[11px] font-semibold">{modalInfo.message}</p>
            <button onClick={() => setModalInfo({ ...modalInfo, ouverte: false })} className={`w-full py-2.5 rounded-xl font-black text-xs uppercase ${accentBtnBg}`}>Compris 👍</button>
          </div>
        </div>
      )}

    </div>
  );
}