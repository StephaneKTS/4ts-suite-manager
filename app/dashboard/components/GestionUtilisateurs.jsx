'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { localSync } from '../../lib/localSync';

const LISTE_PAYS = [
  { code: 'cmr', indicatif: '+237', longueur: 9 },
  { code: 'fra', indicatif: '+33', longueur: 9 },
  { code: 'civ', indicatif: '+225', longueur: 10 },
  { code: 'sen', indicatif: '+221', longueur: 9 },
  { code: 'gab', indicatif: '+241', longueur: 7 },
  { code: 'cog', indicatif: '+242', longueur: 9 },
  { code: 'rdc', indicatif: '+243', longueur: 9 },
  { code: 'mli', indicatif: '+223', longueur: 8 },
  { code: 'bfa', indicatif: '+226', longueur: 8 },
  { code: 'tgo', indicatif: '+228', longueur: 8 },
  { code: 'ben', indicatif: '+229', longueur: 8 },
  { code: 'nga', indicatif: '+234', longueur: 10 },
  { code: 'mar', indicatif: '+212', longueur: 9 },
  { code: 'tun', indicatif: '+216', longueur: 8 },
  { code: 'dza', indicatif: '+213', longueur: 9 },
];

const MODULES_DISPONIBLES = [
  { id: 'BOUTIQUE', label: '🏪 Boutique / Ventes' },
  { id: 'LIVRAISON', label: '🚚 Livraison / Transport' },
  { id: 'LOGISTIQUE', label: '📦 Stock & Logistique' },
  { id: 'TONTINE', label: '👥 Tontine & Épargne' },
];

export default function GestionUtilisateurs({ entrepriseId = '4TS-TEST', isDarkMode = false }) {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [caisses, setCaisses] = useState([]);
  const [emplacements, setEmplacements] = useState([]);
  const [entrepriseInfo, setEntrepriseInfo] = useState(null);
  const [modulesSouscrits, setModulesSouscrits] = useState(['BOUTIQUE']);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [userEnEdition, setUserEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  const [afficherModalePermissions, setAfficherModalePermissions] = useState(false);
  const [etatModale, setEtatModale] = useState({
    ouverte: false,
    titre: '',
    message: '',
    type: 'info',
    onConfirmer: null
  });

  const fileInputRef = useRef(null);

  const [triCol, setTriCol] = useState('nom_complet');
  const [triOrdre, setTriOrdre] = useState('asc');

  // 🔄 LISTE UNIFIÉE IDENTIQUE À GestionRoles.jsx
  const modulesBoutique = [
    { id: 'commandes_clients_qr', nom: '📱 Commandes QR Code' },
    { id: 'caisse', nom: '🛒 Caisse & Vente' },
    { id: 'articles_stock', nom: '📦 Articles & Stock' },
    { id: 'depots_stock', nom: '🏢 Dépôts & Magasins' },
    { id: 'emplacements_stock', nom: '📍 Emplacements & Zones' },
    { id: 'familles_articles', nom: '🏷️ Familles & Catégories' },
    { id: 'mouvements_stock', nom: '🔄 Mouvements Stock' },
    { id: 'approvisionnements', nom: '📥 Approvisionnements' },
    { id: 'clients', nom: '👥 Fichier Clients' },
    { id: 'categories_clients', nom: '🏷️ Catégories Clients' },
    { id: 'fournisseurs', nom: '🤝 Fournisseurs' },
    { id: 'caisses', nom: '💵 Gestion Caisses' },
    { id: 'ventes_historiques', nom: '📊 Historique Ventes & Rapports' },
    { id: 'journal', nom: '📝 Journal de Caisse & Saisie' },
    { id: 'grand_livre', nom: '📚 Grand Livre & Rapports' },
    { id: 'controle', nom: '🔍 Contrôle & Clôture' },
    { id: 'commandes_livraison', nom: '📦 Commandes & Livraisons' },
    { id: 'grille_tarifaire', nom: '🗺️ Grille Tarifaire Livraison' },
    { id: 'challenges_commerciaux', nom: '🏆 Challenges Commerciaux' },
    { id: 'plan_comptable', nom: '📚 Plan Comptable' },
    { id: 'taxes_ristournes', nom: '🏷️ Taxes & Promos' },
    { id: 'roles_utilisateurs', nom: '🔑 Rôles & Personnel' }
  ];

  const modulesTontine = [
    { id: 'tontine_participants', nom: '👥 Participants & Membres' },
    { id: 'tontine_cycles', nom: '🔄 Cycles & Sessions' },
    { id: 'tontine_cotisations', nom: '💰 Suivi des Cotisations' },
    { id: 'tontine_attributions', nom: '🏆 Attributions & Cagnottes' }
  ];

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const estTontine = moduleActuel === 'TONTINE';
  const modulesApp = estTontine ? modulesTontine : modulesBoutique;
  const cleCacheUtilisateurs = `utilisateurs_${entrepriseId}_${moduleActuel}`;
  const cleCacheRoles = `roles_${entrepriseId}_${moduleActuel}`;
  const cleCacheCaisses = `caisses_${entrepriseId}_${moduleActuel}`;
  const estModeLivraison = moduleActuel === 'LIVRAISON';

  const initialiserPermissionsDefaut = () => {
    const perms = {};
    modulesApp.forEach((m) => {
      perms[m.id] = { lecture: false, creation: false, modification: false, suppression: false };
    });
    return perms;
  };

  const [nouveauUser, setNouveauUser] = useState({
    nom_complet: '',
    prenom: '',
    date_naissance: '',
    lieu_naissance: '',
    statut_matrimonial: 'CELIBATAIRE',
    nombre_enfants: 0,
    lieu_residence: '',
    numero_cni: '',
    type_collaborateur: 'EMPLOYE',
    categorie_permis: '',
    numero_permis: '',
    email: '',
    pays: 'cmr',
    telephone: '',
    mot_de_passe: '',
    id_role: '',
    nom_role: '',
    id_caisse: '',
    id_emplacement: '',
    photo: '',
    statut: 'ACTIF',
    acces_application: true,
    modules_cibles: [],
    permissions: initialiserPermissionsDefaut(),
  });

  const roleActuelObj = roles.find((r) => String(r.id) === String(nouveauUser.id_role));
  const estRoleLivreurStrict = roleActuelObj && (roleActuelObj.nom_role || '').trim().toUpperCase() === 'LIVREUR';
  const estRoleLivreurOuChauffeur = estRoleLivreurStrict || (roleActuelObj && (roleActuelObj.nom_role.toUpperCase().includes('LIVREUR') || roleActuelObj.nom_role.toUpperCase().includes('CHAUFFEUR'))) || nouveauUser.type_collaborateur === 'LIVREUR' || nouveauUser.type_collaborateur === 'CHAUFFEUR';

  const chargerDonnees = async () => {
    const utilisateursLocaux = localSync.recupererDonneesLocales(cleCacheUtilisateurs);
    const rolesLocaux = localSync.recupererDonneesLocales(cleCacheRoles);
    const caissesLocales = localSync.recupererDonneesLocales(cleCacheCaisses);

    if (utilisateursLocaux && utilisateursLocaux.length > 0) {
      setUtilisateurs(utilisateursLocaux);
      setChargement(false);
    } else {
      setChargement(true);
    }

    if (rolesLocaux && rolesLocaux.length > 0) setRoles(rolesLocaux);
    if (caissesLocales && caissesLocales.length > 0) setCaisses(caissesLocales);

    try {
      const { data: dataEnt } = await supabase
        .from('entreprises')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .maybeSingle();
      
      if (dataEnt) {
        setEntrepriseInfo(dataEnt);
        let rawEspaces = dataEnt.espaces_souscrits || dataEnt.modules_souscrits;
        if (rawEspaces) {
          if (typeof rawEspaces === 'string') {
            rawEspaces = rawEspaces.split(',').map(m => m.trim().toUpperCase());
          } else if (Array.isArray(rawEspaces)) {
            rawEspaces = rawEspaces.map(m => String(m).trim().toUpperCase());
          }
          setModulesSouscrits(rawEspaces.map(m => m.replace('ESPACE_', '')));
        } else if (dataEnt.module) {
          setModulesSouscrits([dataEnt.module.toUpperCase().replace('ESPACE_', '')]);
        } else {
          setModulesSouscrits([moduleActuel, 'BOUTIQUE']);
        }
      }

      let { data: dataRoles } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      let adminRole = dataRoles?.find(r => (r.nom_role || '').trim().toUpperCase() === 'ADMINISTRATEUR');
      if (!adminRole) {
        const { data: newRole } = await supabase
          .from('roles')
          .insert([{
            id_entreprise: entrepriseId,
            module: moduleActuel,
            nom_role: 'ADMINISTRATEUR',
            description: 'Rôle système administrateur avec tous les droits par défaut.',
            permissions: { _plein_acces: true }
          }])
          .select()
          .single();
        
        if (newRole) {
          adminRole = newRole;
          dataRoles = dataRoles ? [...dataRoles, newRole] : [newRole];
        }
      }

      if (dataRoles) {
        setRoles(dataRoles);
        localSync.sauvegarderDonneesLocales(cleCacheRoles, dataRoles);
      }

      const { data: dataCaisses } = await supabase
        .from('caisses')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      if (dataCaisses) {
        setCaisses(dataCaisses);
        localSync.sauvegarderDonneesLocales(cleCacheCaisses, dataCaisses);
      }

      const { data: dataEmplacements } = await supabase
        .from('emplacements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      if (dataEmplacements) setEmplacements(dataEmplacements);

      const { data: dataUsers, error } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      let rawUsers = dataUsers || [];

      if (rawUsers.length === 0 && dataEnt) {
        const payloadAdminAuto = {
          id_entreprise: entrepriseId,
          module: moduleActuel,
          nom_complet: (dataEnt.nom_entreprise || 'ADMINISTRATEUR').trim().toUpperCase(),
          prenom: '',
          email: (dataEnt.email || '').trim().toLowerCase(),
          telephone: dataEnt.telephone || '',
          mot_de_passe: dataEnt.mot_de_passe || dataEnt.code_pin_activation || 'Keita@shop50',
          id_role: adminRole ? adminRole.id : null,
          nom_role: 'ADMINISTRATEUR',
          statut: 'ACTIF',
          acces_application: true,
          permissions: { _plein_acces: true }
        };

        const { data: insertedAdmin, error: errInsAdmin } = await supabase
          .from('utilisateurs')
          .insert([payloadAdminAuto])
          .select()
          .maybeSingle();

        if (!errInsAdmin && insertedAdmin) {
          rawUsers = [insertedAdmin];
        }
      }

      const mapUniques = new Map();
      rawUsers.forEach((u) => {
        const cleUnique = (u.nom_complet || '').trim().toUpperCase() + '_' + (u.prenom || '').trim().toUpperCase();
        if (!mapUniques.has(cleUnique) || (u.module || '').toUpperCase() === moduleActuel) {
          mapUniques.set(cleUnique, u);
        }
      });
      const listUsers = Array.from(mapUniques.values());

      setUtilisateurs(listUsers);
      localSync.sauvegarderDonneesLocales(cleCacheUtilisateurs, listUsers);
    } catch (err) {
      console.error('Erreur chargement utilisateurs :', err.message);
      if (!utilisateursLocaux || utilisateursLocaux.length === 0) {
        setUtilisateurs([]);
      }
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
    localSync.synchroniserVersCloud(supabase);
  }, [entrepriseId, moduleActuel]);

  // 🔄 SYNCHRONISATION AUTOMATIQUE CORRIGÉE (.on() AVANT .subscribe())[cite: 61]
  useEffect(() => {
    const channelRoles = supabase
      .channel(`sync-roles-${entrepriseId}-${moduleActuel}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roles',
          filter: `id_entreprise=eq.${entrepriseId}`
        },
        () => {
          localStorage.removeItem(cleCacheRoles);
          chargerDonnees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelRoles);
    };
  }, [entrepriseId, moduleActuel]);

  const gererSaisieTelephone = (e) => {
    const chiffres = e.target.value.replace(/[^0-9]/g, '');
    setNouveauUser({ ...nouveauUser, telephone: chiffres });
  };

  const gererSelectionImage = (e) => {
    const fichier = e.target.files[0];
    if (fichier) {
      const lecteur = new FileReader();
      lecteur.onloadend = () => {
        setNouveauUser((prev) => ({ ...prev, photo: lecteur.result }));
      };
      lecteur.readAsDataURL(fichier);
    }
  };

  const basculerModuleCible = (modId) => {
    if (!modulesSouscrits.includes(modId)) {
      setEtatModale({
        ouverte: true,
        titre: 'Module non souscrit',
        message: `Votre entreprise n'a pas souscrit au module "${modId}". Veuillez souscrire à ce module pour y autoriser du personnel.`,
        type: 'erreur',
        onConfirmer: null
      });
      return;
    }

    setNouveauUser(prev => {
      const exists = prev.modules_cibles.includes(modId);
      if (exists) {
        return { ...prev, modules_cibles: prev.modules_cibles.filter(m => m !== modId) };
      } else {
        return { ...prev, modules_cibles: [...prev.modules_cibles, modId] };
      }
    });
  };

  const togglePermissionUser = (moduleId, action) => {
    setNouveauUser((prev) => {
      const permsModule = prev.permissions[moduleId] || { lecture: false, creation: false, modification: false, suppression: false };
      const nouvelleValeur = !permsModule[action];
      let majModule = { ...permsModule, [action]: nouvelleValeur };
      if ((action === 'creation' || action === 'modification' || action === 'suppression') && nouvelleValeur) {
        majModule.lecture = true;
      }
      return {
        ...prev,
        permissions: { ...prev.permissions, [moduleId]: majModule },
      };
    });
  };

  const accorderToutModuleUser = (moduleId, toutAccorder) => {
    setNouveauUser((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: { lecture: toutAccorder, creation: toutAccorder, modification: toutAccorder, suppression: toutAccorder },
      },
    }));
  };

  // 🎯 CONSTRUCTION DES PERMISSIONS EN FUSIONNANT LE RÔLE ET LES DROITS SPÉCIFIQUES
  const construirePermissionsFusionnees = (roleObj, permsPerso = {}) => {
    const base = initialiserPermissionsDefaut();
    const rolePerms = roleObj?.permissions || {};
    const estPleinAcces = rolePerms._plein_acces === true || (roleObj?.nom_role || '').trim().toUpperCase() === 'ADMINISTRATEUR';

    modulesApp.forEach((m) => {
      if (estPleinAcces) {
        base[m.id] = { lecture: true, creation: true, modification: true, suppression: true };
      } else {
        base[m.id] = {
          lecture: Boolean(permsPerso?.[m.id]?.lecture ?? rolePerms?.[m.id]?.lecture ?? false),
          creation: Boolean(permsPerso?.[m.id]?.creation ?? rolePerms?.[m.id]?.creation ?? false),
          modification: Boolean(permsPerso?.[m.id]?.modification ?? rolePerms?.[m.id]?.modification ?? false),
          suppression: Boolean(permsPerso?.[m.id]?.suppression ?? rolePerms?.[m.id]?.suppression ?? false),
        };
      }
    });

    return base;
  };

  const changerRoleUtilisateur = (e) => {
    const roleId = e.target.value;
    const roleObj = roles.find(r => String(r.id) === String(roleId));
    
    setNouveauUser(prev => ({
      ...prev,
      id_role: roleId,
      nom_role: roleObj ? roleObj.nom_role : '',
      permissions: construirePermissionsFusionnees(roleObj, {})
    }));
  };

  const preparerEnregistrement = (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (!nouveauUser.nom_complet.trim()) {
      setEtatModale({
        ouverte: true,
        titre: 'Champ requis',
        message: 'Veuillez renseigner le nom du collaborateur.',
        type: 'erreur',
        onConfirmer: null
      });
      return;
    }
    if (!nouveauUser.id_role) {
      setEtatModale({
        ouverte: true,
        titre: 'Champ requis',
        message: 'Veuillez sélectionner un rôle ou une fonction.',
        type: 'erreur',
        onConfirmer: null
      });
      return;
    }

    const emailNettoye = (nouveauUser.email || '').trim().toLowerCase();
    const paysObj = LISTE_PAYS.find(p => p.code === nouveauUser.pays) || LISTE_PAYS[0];
    const chiffresPur = (nouveauUser.telephone || '').replace(/[^0-9]/g, '');

    if (nouveauUser.acces_application) {
      if (!emailNettoye && chiffresPur.length === 0) {
        setEtatModale({
          ouverte: true,
          titre: 'Information de connexion requise',
          message: 'Veuillez renseigner soit un email, soit un numéro de téléphone pour permettre la connexion.',
          type: 'erreur',
          onConfirmer: null
        });
        return;
      }

      if (chiffresPur.length > 0 && chiffresPur.length !== paysObj.longueur) {
        setEtatModale({
          ouverte: true,
          titre: 'Numéro invalide',
          message: `Numéro invalide pour ${paysObj.code}. Le numéro doit comporter exactement ${paysObj.longueur} chiffres.`,
          type: 'erreur',
          onConfirmer: null
        });
        return;
      }
    }

    setEtatModale({
      ouverte: true,
      titre: 'Confirmation requise',
      message: `Voulez-vous véritablement valider et enregistrer les accès et permissions pour "${nouveauUser.nom_complet}" ?`,
      type: 'confirmation',
      onConfirmer: enregistrerUtilisateurDefinitif
    });
  };

  const enregistrerUtilisateurDefinitif = async () => {
    if (enTrainDeSauvegarder) return;

    const emailNettoye = (nouveauUser.email || '').trim().toLowerCase();
    const paysObj = LISTE_PAYS.find(p => p.code === nouveauUser.pays) || LISTE_PAYS[0];
    const chiffresPur = (nouveauUser.telephone || '').replace(/[^0-9]/g, '');

    const modulesPayload = nouveauUser.modules_cibles.length > 0 
      ? nouveauUser.modules_cibles 
      : [moduleActuel];

    const numeroComplet = chiffresPur ? `${paysObj.indicatif}${chiffresPur}` : null;
    const emailFinal = emailNettoye ? emailNettoye : null;

    const selectedRoleObj = roles.find(r => String(r.id) === String(nouveauUser.id_role));
    const nomRoleFinal = selectedRoleObj ? selectedRoleObj.nom_role.trim().toUpperCase() : (nouveauUser.nom_role || 'EMPLOYE').trim().toUpperCase();
    const isRoleAdmin = nomRoleFinal === 'ADMINISTRATEUR';

    setEnTrainDeSauvegarder(true);
    try {
      let emplacementIdFinal = nouveauUser.id_emplacement;
      const nomNomCollab = (nouveauUser.nom_complet || '').trim().toUpperCase();

      if (estRoleLivreurStrict) {
        if (!emplacementIdFinal) {
          const payloadNouvelEmplacement = {
            id_entreprise: entrepriseId,
            module: 'LIVRAISON',
            nom_emplacement: nomNomCollab,
            responsable_emplacement: nomNomCollab
          };

          const { data: empCree, error: errEmp } = await supabase
            .from('emplacements_stock')
            .insert([payloadNouvelEmplacement])
            .select()
            .maybeSingle();

          if (!errEmp && empCree) {
            emplacementIdFinal = empCree.id;
          }
        }
      }

      let basePayload = {
        id_entreprise: entrepriseId,
        nom_complet: nomNomCollab,
        prenom: (nouveauUser.prenom || '').trim().toUpperCase(),
        date_naissance: nouveauUser.date_naissance || null,
        lieu_naissance: (nouveauUser.lieu_naissance || '').trim().toUpperCase(),
        statut_matrimonial: nouveauUser.statut_matrimonial,
        nombre_enfants: parseInt(nouveauUser.nombre_enfants || 0),
        lieu_residence: (nouveauUser.lieu_residence || '').trim().toUpperCase(),
        numero_cni: (nouveauUser.numero_cni || '').trim().toUpperCase(),
        type_collaborateur: nouveauUser.type_collaborateur,
        categorie_permis: estRoleLivreurOuChauffeur ? (nouveauUser.categorie_permis || '').trim().toUpperCase() : null,
        numero_permis: estRoleLivreurOuChauffeur ? (nouveauUser.numero_permis || '').trim().toUpperCase() : null,
        email: emailFinal,
        pays: nouveauUser.pays,
        telephone: numeroComplet,
        mot_de_passe: nouveauUser.acces_application ? nouveauUser.mot_de_passe : null,
        id_role: nouveauUser.id_role || null,
        nom_role: nomRoleFinal,
        id_caisse: estModeLivraison ? null : (nouveauUser.id_caisse || null),
        id_emplacement: estRoleLivreurStrict ? (emplacementIdFinal || null) : null,
        photo: nouveauUser.photo || null,
        statut: nouveauUser.statut,
        acces_application: nouveauUser.acces_application,
        permissions: isRoleAdmin ? { _plein_acces: true } : nouveauUser.permissions
      };

      if (userEnEdition) {
        const { error: errUpdateDirect } = await supabase
          .from('utilisateurs')
          .update(basePayload)
          .eq('id', userEnEdition.id);

        if (errUpdateDirect) throw errUpdateDirect;

        const { data: existingRecords } = await supabase
          .from('utilisateurs')
          .select('id, module')
          .eq('id_entreprise', entrepriseId)
          .eq('nom_complet', nomNomCollab);

        for (const modObj of MODULES_DISPONIBLES) {
          const modCible = modObj.id;
          const doitEtreActif = modulesPayload.includes(modCible);
          const recordTrouve = existingRecords?.find(r => (r.module || '').toUpperCase() === modCible);

          if (doitEtreActif) {
            if (recordTrouve) {
              await supabase
                .from('utilisateurs')
                .update({ ...basePayload, module: modCible })
                .eq('id', recordTrouve.id);
            } else {
              await supabase
                .from('utilisateurs')
                .insert([{ ...basePayload, module: modCible }]);
            }
          } else if (recordTrouve && recordTrouve.id !== userEnEdition.id) {
            await supabase
              .from('utilisateurs')
              .delete()
              .eq('id', recordTrouve.id);
          }
        }
      } else {
        for (const modCible of modulesPayload) {
          let payloadModule = { ...basePayload, module: modCible };
          const { error } = await supabase.from('utilisateurs').insert([payloadModule]);
          if (error) console.error(`Erreur insertion module ${modCible}:`, error.message);
        }
      }

      localStorage.removeItem(cleCacheUtilisateurs);
      annulerForm();
      await chargerDonnees();

      setEtatModale({
        ouverte: true,
        titre: 'Opération réussie',
        message: 'Accès et permissions mis à jour avec succès !',
        type: 'succes',
        onConfirmer: null
      });

    } catch (err) {
      setEtatModale({
        ouverte: true,
        titre: 'Erreur',
        message: 'Erreur lors de l’enregistrement : ' + err.message,
        type: 'erreur',
        onConfirmer: null
      });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = (user) => {
    setUserEnEdition(user);
    let telLocal = user.telephone || '';
    const paysTrouve = LISTE_PAYS.find(p => user.telephone && user.telephone.startsWith(p.indicatif)) || LISTE_PAYS[0];
    if (user.telephone && user.telephone.startsWith(paysTrouve.indicatif)) {
      telLocal = user.telephone.replace(paysTrouve.indicatif, '');
    }

    let roleIdMatch = '';
    let roleObjMatch = null;
    if (user.id_role && roles.some(r => String(r.id) === String(user.id_role))) {
      roleIdMatch = String(user.id_role);
      roleObjMatch = roles.find(r => String(r.id) === String(user.id_role));
    } else if (user.nom_role) {
      const roleParNom = roles.find(r => (r.nom_role || '').trim().toUpperCase() === user.nom_role.trim().toUpperCase());
      if (roleParNom) {
        roleIdMatch = String(roleParNom.id);
        roleObjMatch = roleParNom;
      }
    }

    setNouveauUser({
      nom_complet: user.nom_complet || '',
      prenom: user.prenom || '',
      date_naissance: user.date_naissance || '',
      lieu_naissance: user.lieu_naissance || '',
      statut_matrimonial: user.statut_matrimonial || 'CELIBATAIRE',
      nombre_enfants: user.nombre_enfants || 0,
      lieu_residence: user.lieu_residence || '',
      numero_cni: user.numero_cni || '',
      type_collaborateur: user.type_collaborateur || 'EMPLOYE',
      categorie_permis: user.categorie_permis || '',
      numero_permis: user.numero_permis || '',
      email: (user.email || '').toLowerCase(),
      pays: user.pays || paysTrouve.code,
      telephone: telLocal.replace(/[^0-9]/g, ''),
      mot_de_passe: user.mot_de_passe || '',
      id_role: roleIdMatch,
      nom_role: user.nom_role || '',
      id_caisse: user.id_caisse || '',
      id_emplacement: user.id_emplacement || '',
      photo: user.photo || '',
      statut: user.statut || 'ACTIF',
      acces_application: user.acces_application ?? true,
      modules_cibles: [moduleActuel],
      permissions: construirePermissionsFusionnees(roleObjMatch, user.permissions || {}),
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    if (enTrainDeSauvegarder) return;
    setUserEnEdition(null);
    setNouveauUser({
      nom_complet: '', prenom: '', date_naissance: '', lieu_naissance: '', statut_matrimonial: 'CELIBATAIRE',
      nombre_enfants: 0, lieu_residence: '', numero_cni: '', type_collaborateur: 'EMPLOYE', categorie_permis: '',
      numero_permis: '', email: '', pays: 'cmr', telephone: '', mot_de_passe: '', id_role: '', nom_role: '', id_caisse: '',
      id_emplacement: '', photo: '', statut: 'ACTIF', acces_application: true, modules_cibles: [moduleActuel],
      permissions: initialiserPermissionsDefaut()
    });
    setAfficherForm(false);
  };

  const supprimerUtilisateur = async () => {
    if (enTrainDeSauvegarder || !userEnEdition) return;
    
    setEtatModale({
      ouverte: true,
      titre: 'Confirmer la suppression',
      message: `Voulez-vous vraiment supprimer définitivement le collaborateur "${userEnEdition.nom_complet}" ?`,
      type: 'confirmation',
      onConfirmer: async () => {
        setEnTrainDeSauvegarder(true);
        try {
          const nomCollab = (userEnEdition.nom_complet || '').trim();
          let queryDel = supabase.from('utilisateurs').delete().eq('id_entreprise', entrepriseId);
          if (nomCollab) {
            queryDel = queryDel.or(`id.eq.${userEnEdition.id},nom_complet.eq.${nomCollab}`);
          } else {
            queryDel = queryDel.eq('id', userEnEdition.id);
          }

          const { error } = await queryDel;
          if (error) throw error;

          setUtilisateurs(prev => prev.filter(u => u.id !== userEnEdition.id));
          localStorage.removeItem(cleCacheUtilisateurs);
          annulerForm();
          await chargerDonnees();

          setEtatModale({
            ouverte: true,
            titre: 'Succès',
            message: 'Collaborateur supprimé avec succès.',
            type: 'succes',
            onConfirmer: null
          });
        } catch (err) {
          setEtatModale({
            ouverte: true,
            titre: 'Erreur',
            message: 'Erreur : ' + err.message,
            type: 'erreur',
            onConfirmer: null
          });
        } finally {
          setEnTrainDeSauvegarder(false);
        }
      }
    });
  };

  const gererTri = (colonne) => {
    if (enTrainDeSauvegarder) return;
    if (triCol === colonne) {
      setTriOrdre(triOrdre === 'asc' ? 'desc' : 'asc');
    } else {
      setTriCol(colonne);
      setTriOrdre('asc');
    }
  };

  const rendreFlecheTri = (colonne) => {
    if (triCol !== colonne) return <span className="text-slate-400 ml-1">↕</span>;
    return <span className="text-orange-600 ml-1 font-bold">{triOrdre === 'asc' ? '↑' : '↓'}</span>;
  };

  const nbLicencesUtilisees = utilisateurs.filter(u => u.acces_application).length;
  const limiteLicenceMax = entrepriseInfo?.limite_utilisateurs || 5;

  const utilisateursTriesParCreation = [...utilisateurs].sort((a, b) => {
    const tA = a.created_at || '';
    const tB = b.created_at || '';
    if (tA < tB) return -1;
    if (tA > tB) return 1;
    return (a.nom_complet || '').localeCompare(b.nom_complet || '');
  });

  const mapIdStables = new Map();
  const largeurPad = Math.max(2, String(utilisateursTriesParCreation.length).length);
  utilisateursTriesParCreation.forEach((u, idx) => {
    const numeroSeq = String(idx + 1).padStart(largeurPad, '0');
    mapIdStables.set(u.id, `${entrepriseId}-${numeroSeq}`);
  });

  const usersFiltres = utilisateurs
    .filter((u) => {
      const nomComplet = `${u.nom_complet || ''} ${u.prenom || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const query = recherche.toLowerCase();
      return nomComplet.includes(query) || email.includes(query);
    })
    .sort((a, b) => {
      let valA = '';
      let valB = '';
      
      if (triCol === 'id') {
        valA = mapIdStables.get(a.id) || '';
        valB = mapIdStables.get(b.id) || '';
      } else if (triCol === 'nom_complet') {
        valA = a.nom_complet || '';
        valB = b.nom_complet || '';
      } else if (triCol === 'role') {
        const rA = roles.find((r) => String(r.id) === String(a.id_role));
        const rB = roles.find((r) => String(r.id) === String(b.id_role));
        valA = (rA ? rA.nom_role : a.nom_role) || '';
        valB = (rB ? rB.nom_role : b.nom_role) || '';
      } else if (triCol === 'acces') {
        valA = String(a.acces_application ?? true);
        valB = String(b.acces_application ?? true);
      }

      if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
      return 0;
    });

  const paysActuelObj = LISTE_PAYS.find(p => p.code === nouveauUser.pays) || LISTE_PAYS[0];

  const containerBg = isDarkMode ? 'bg-[#050b18] text-slate-100' : 'bg-slate-100 text-[#0a1931]';
  const headerCardBg = isDarkMode ? 'bg-[#0b1329] border border-slate-800 text-slate-100 shadow-sm' : 'bg-white border border-slate-200 text-[#0a1931] shadow-sm';
  const subTextColor = isDarkMode ? 'text-slate-400' : 'text-slate-600 font-medium';
  const inputBg = isDarkMode ? 'bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-white border border-slate-200 text-black font-medium placeholder:text-slate-400';
  const tableHeaderBg = isDarkMode ? 'bg-slate-900/80 text-slate-300 border-b border-slate-800' : 'bg-[#0a1931] text-white border-b border-blue-900';
  const rowHoverBg = isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-blue-50/50';

  return (
    <div className={`space-y-3 text-[11px] font-sans ${containerBg} p-2 rounded-xl transition-colors`}>
      
      {/* EN-TÊTE */}
      <div className={`flex justify-between items-center p-3 rounded-xl ${headerCardBg}`}>
        <div>
          <h3 className={`font-black uppercase text-xs sm:text-sm flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-[#0a1931]'}`}>
            <span>👥</span> GESTION DU PERSONNEL & PERMISSIONS ({moduleActuel})
          </h3>
          <p className={`text-[10px] mt-0.5 ${subTextColor}`}>
            Licences app : <strong className={nbLicencesUtilisees > limiteLicenceMax ? 'text-red-500' : (isDarkMode ? 'text-emerald-400' : 'text-emerald-700 font-extrabold')}>{nbLicencesUtilisees}</strong> / {limiteLicenceMax} utilisées
          </p>
        </div>
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => {
            if (enTrainDeSauvegarder) return;
            if (afficherForm) {
              annulerForm();
            } else {
              setNouveauUser({
                nom_complet: '', prenom: '', date_naissance: '', lieu_naissance: '', statut_matrimonial: 'CELIBATAIRE',
                nombre_enfants: 0, lieu_residence: '', numero_cni: '', type_collaborateur: 'EMPLOYE', categorie_permis: '',
                numero_permis: '', email: '', pays: 'cmr', telephone: '', mot_de_passe: '', id_role: '', nom_role: '', id_caisse: '',
                id_emplacement: '', photo: '', statut: 'ACTIF', acces_application: true, modules_cibles: [moduleActuel],
                permissions: initialiserPermissionsDefaut()
              });
              setUserEnEdition(null);
              setAfficherForm(true);
            }
          }}
          className={`font-black px-3.5 py-2 rounded-lg transition shadow-xs text-xs cursor-pointer ${
            isDarkMode 
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' 
              : 'bg-[#0a1931] hover:bg-[#132d5c] text-white border border-[#0a1931]'
          }`}
        >
          {afficherForm ? '✖ Fermer' : '＋ Nouveau'}
        </button>
      </div>

      <div className="flex justify-start items-center gap-1.5">
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => { if (!enTrainDeSauvegarder) annulerForm(); }}
          className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition whitespace-nowrap shadow-xs cursor-pointer ${
            !afficherForm 
              ? (isDarkMode ? 'bg-slate-800 text-white border border-slate-700' : 'bg-[#0a1931] text-white border border-[#0a1931]') 
              : (isDarkMode ? 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800' : 'bg-white text-[#0a1931] border border-slate-200 hover:bg-slate-50')
          }`}
        >
          📋 Liste du personnel ({utilisateurs.length})
        </button>
      </div>

      {/* FORMULAIRE D'EDITION / CREATION */}
      {afficherForm && (
        <div className={`border p-3.5 rounded-xl space-y-3.5 shadow-md max-h-[80vh] overflow-y-auto pr-2 pb-24 ${isDarkMode ? 'bg-[#0b1329] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-[#0a1931]'}`}>
          <div className="flex justify-between items-center border-b pb-2 border-slate-700/20">
            <div>
              <h4 className={`font-black uppercase text-xs ${isDarkMode ? 'text-slate-200' : 'text-[#0a1931]'}`}>
                {userEnEdition ? '✏️ Fiche du collaborateur & Permissions' : '➕ Nouveau collaborateur & Permissions'}
              </h4>
              {userEnEdition && userEnEdition.id && (
                <p className="text-[10px] font-mono font-bold text-amber-500 mt-0.5">
                  ID Unique : {userEnEdition.id}
                </p>
              )}
            </div>
            <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerForm} className="text-slate-400 hover:text-white font-bold text-xs p-0.5 cursor-pointer">✖</button>
          </div>

          <form onSubmit={preparerEnregistrement} className="space-y-3">
            <div className={`p-3 rounded-xl space-y-1 border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-blue-50/50 border-blue-200 text-[#0a1931]'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={enTrainDeSauvegarder}
                  checked={nouveauUser.acces_application}
                  onChange={(e) => setNouveauUser({ ...nouveauUser, acces_application: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span className="font-black text-[11px]">
                  Accès à l'application (Consomme une licence / Connexion active)
                </span>
              </label>
            </div>

            <div className={`p-3 rounded-xl space-y-2 border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`font-black text-[10.5px] uppercase block tracking-wide ${isDarkMode ? 'text-slate-200' : 'text-[#0a1931]'}`}>
                💳 Modules et accès autorisés pour cet employé :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {MODULES_DISPONIBLES.map((mod) => {
                  const estSouscrit = modulesSouscrits.includes(mod.id);
                  const estCoche = nouveauUser.modules_cibles.includes(mod.id);

                  return (
                    <div 
                      key={mod.id} 
                      onClick={() => estSouscrit && basculerModuleCible(mod.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition select-none ${
                        !estSouscrit 
                          ? (isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-600 opacity-60 cursor-not-allowed' : 'bg-slate-100 border-slate-200 text-slate-400 opacity-70 cursor-not-allowed font-medium') 
                          : estCoche 
                            ? (isDarkMode ? 'bg-slate-800 border-slate-700 text-white font-black cursor-pointer shadow-xs' : 'bg-blue-50 border-blue-400 text-[#0a1931] font-black cursor-pointer shadow-xs') 
                            : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300 cursor-pointer hover:bg-slate-800/80 font-medium' : 'bg-white border-slate-200 text-slate-800 cursor-pointer hover:bg-slate-50 font-medium')
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          disabled={!estSouscrit}
                          checked={estCoche}
                          onChange={() => {}}
                          className="w-4 h-4 accent-amber-500 rounded cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className="text-[11px] truncate">{mod.label}</span>
                      </div>
                      {!estSouscrit && <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold shrink-0 ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-600'}`}>Non souscrit</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={gererSelectionImage} accept="image/*" className="hidden" />

            <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div 
                onClick={() => !enTrainDeSauvegarder && fileInputRef.current && fileInputRef.current.click()}
                className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-xs cursor-pointer hover:opacity-80 transition relative group"
              >
                {nouveauUser.photo ? (
                  <img src={nouveauUser.photo} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-300 text-lg font-black">📷</span>
                )}
              </div>
              <div className="flex-1">
                <p className={`font-black text-[10px] uppercase ${isDarkMode ? 'text-slate-200' : 'text-[#0a1931]'}`}>Photo de profil du collaborateur</p>
                <p className={`text-[9.5px] font-medium mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Cliquez sur l'icône pour ajouter une photo.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block font-black mb-1 text-[9.5px] uppercase ${isDarkMode ? 'text-slate-300' : 'text-[#0a1931]'}`}>Nom *</label>
                <input type="text" required disabled={enTrainDeSauvegarder} value={nouveauUser.nom_complet} onChange={(e) => setNouveauUser({ ...nouveauUser, nom_complet: e.target.value.toUpperCase() })} placeholder="EX: MBOA" className={`w-full rounded p-2 font-extrabold uppercase text-xs shadow-xs ${inputBg}`} />
              </div>
              <div>
                <label className={`block font-black mb-1 text-[9.5px] uppercase ${isDarkMode ? 'text-slate-300' : 'text-[#0a1931]'}`}>Prénom</label>
                <input type="text" disabled={enTrainDeSauvegarder} value={nouveauUser.prenom} onChange={(e) => setNouveauUser({ ...nouveauUser, prenom: e.target.value.toUpperCase() })} placeholder="EX: JEAN" className={`w-full rounded p-2 font-extrabold uppercase text-xs shadow-xs ${inputBg}`} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end pt-1">
              <div>
                <label className={`block font-black mb-1 text-[9.5px] uppercase ${isDarkMode ? 'text-slate-300' : 'text-[#0a1931]'}`}>Rôle / Fonction ({moduleActuel}) *</label>
                <select required disabled={enTrainDeSauvegarder} value={nouveauUser.id_role} onChange={changerRoleUtilisateur} className={`w-full rounded p-2 font-extrabold text-xs shadow-xs ${inputBg}`}>
                  <option value="">-- Sélectionner un Rôle --</option>
                  {roles.map((r) => (<option key={r.id} value={String(r.id)}>{r.nom_role}</option>))}
                </select>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setAfficherModalePermissions(true)}
                  className={`w-full font-black py-2.5 px-3 rounded-lg text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer border ${
                    isDarkMode 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700' 
                      : 'bg-[#0a1931] hover:bg-[#132d5c] text-white border-[#0a1931]'
                  }`}
                >
                  <span>🔑</span> Configurer Permissions
                </button>
              </div>
            </div>

            <div>
              <label className={`block font-black mb-1 text-[9.5px] uppercase ${isDarkMode ? 'text-slate-300' : 'text-[#0a1931]'}`}>Type Collaborateur</label>
              <select disabled={enTrainDeSauvegarder} value={nouveauUser.type_collaborateur} onChange={(e) => setNouveauUser({ ...nouveauUser, type_collaborateur: e.target.value })} className={`w-full rounded p-2 font-extrabold text-xs shadow-xs ${inputBg}`}>
                <option value="EMPLOYE">Employé standard</option>
                <option value="LIVREUR">Livreur</option>
                <option value="CHAUFFEUR">Chauffeur</option>
              </select>
            </div>

            {nouveauUser.acces_application && (
              <div>
                <label className={`block font-black mb-1 text-[9.5px] uppercase ${isDarkMode ? 'text-slate-300' : 'text-[#0a1931]'}`}>Mot de Passe de Connexion *</label>
                <div className="relative flex items-center">
                  <input 
                    type={afficherMotDePasse ? "text" : "password"} 
                    disabled={enTrainDeSauvegarder}
                    required={nouveauUser.acces_application} 
                    value={nouveauUser.mot_de_passe} 
                    onChange={(e) => setNouveauUser({ ...nouveauUser, mot_de_passe: e.target.value })} 
                    placeholder="••••••••" 
                    className={`w-full rounded p-2 pr-8 font-mono font-extrabold text-xs shadow-xs ${inputBg}`} 
                  />
                  <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setAfficherMotDePasse(!afficherMotDePasse)} className="absolute right-2.5 text-slate-400 hover:text-white text-xs cursor-pointer">
                    {afficherMotDePasse ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/20">
              <div>
                <label className={`block font-black mb-1 text-[9.5px] uppercase ${isDarkMode ? 'text-slate-300' : 'text-[#0a1931]'}`}>Pays</label>
                <select disabled={enTrainDeSauvegarder} value={nouveauUser.pays} onChange={(e) => setNouveauUser({ ...nouveauUser, pays: e.target.value })} className={`w-full rounded p-2 font-extrabold text-[11px] shadow-xs ${inputBg}`}>
                  {LISTE_PAYS.map((p) => (<option key={p.code} value={p.code}>{p.code.toUpperCase()}</option>))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={`block font-black mb-1 text-[9.5px] uppercase ${isDarkMode ? 'text-slate-300' : 'text-[#0a1931]'}`}>Téléphone ({paysActuelObj.longueur} chiffres)</label>
                <div className={`flex items-center rounded overflow-hidden shadow-xs border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className={`px-2.5 py-2 text-[11px] font-bold border-r shrink-0 ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-800' : 'bg-slate-100 text-[#0a1931] border-slate-200'}`}>{paysActuelObj.indicatif}</span>
                  <input type="text" disabled={enTrainDeSauvegarder} maxLength={paysActuelObj.longueur} value={nouveauUser.telephone} onChange={gererSaisieTelephone} placeholder="6XXXXXXXX" className={`w-full p-2 font-mono text-[11px] font-extrabold focus:outline-none ${inputBg} border-0`} />
                </div>
              </div>
            </div>

            <div>
              <label className={`block font-black mb-1 text-[9.5px] uppercase ${isDarkMode ? 'text-slate-300' : 'text-[#0a1931]'}`}>Email (minuscules)</label>
              <input type="email" disabled={enTrainDeSauvegarder} value={nouveauUser.email} onChange={(e) => setNouveauUser({ ...nouveauUser, email: e.target.value.toLowerCase() })} placeholder="collaborateur@keita.cm" className={`w-full rounded p-2 font-bold lowercase text-[11px] shadow-xs ${inputBg}`} />
            </div>

            <div className="pt-3 border-t border-slate-700/20 flex justify-between items-center">
              {userEnEdition && (
                <button type="button" disabled={enTrainDeSauvegarder} onClick={supprimerUtilisateur} className="bg-red-600 hover:bg-red-700 text-white font-black px-3.5 py-2 rounded-lg text-xs shadow-xs transition cursor-pointer">
                  🗑️ Supprimer
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerForm} className={`font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer border ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-slate-200 text-slate-900 border-slate-300 hover:bg-slate-300'}`}>
                  Annuler
                </button>
                <button type="submit" disabled={enTrainDeSauvegarder} className={`font-black px-5 py-2 rounded-lg text-xs shadow-xs transition cursor-pointer border ${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500' : 'bg-[#0a1931] hover:bg-[#132d5c] text-white border-[#0a1931]'}`}>
                  {enTrainDeSauvegarder ? 'Enregistrement...' : (userEnEdition ? 'Mettre à jour' : 'Valider & Enregistrer')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 🪟 MODALE DE CONFIGURATION DES PERMISSIONS */}
      {afficherModalePermissions && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`border rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-xl ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-[#0a1931]'}`}>
            
            <div className="flex justify-between items-center border-b pb-3 border-slate-700/20">
              <h4 className={`font-black text-sm uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-[#0a1931]'}`}>
                <span>🔑</span> Matrice des Droits par Module ({moduleActuel})
              </h4>
              <button
                type="button"
                onClick={() => setAfficherModalePermissions(false)}
                className="text-slate-400 hover:text-white font-bold text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Cochez ou décochez les actions autorisées pour ce collaborateur sur chaque module du système.
            </p>

            <div className={`overflow-x-auto border rounded-xl shadow-inner max-h-[55vh] ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[10px] uppercase font-black sticky top-0 z-10 ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-[#0a1931] text-white border-blue-900'}`}>
                  <tr>
                    <th className="p-2.5">Module / Table</th>
                    <th className="p-2.5 text-center">👁️ Lecture</th>
                    <th className="p-2.5 text-center">➕ Création</th>
                    <th className="p-2.5 text-center">✏️ Modif.</th>
                    <th className="p-2.5 text-center">🗑️ Suppr.</th>
                    <th className="p-2.5 text-center">Action Rapide</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-[10.5px] ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {modulesApp.map((m) => {
                    const p = nouveauUser.permissions[m.id] || { lecture: false, creation: false, modification: false, suppression: false };
                    const estToutAccorde = p.lecture && p.creation && p.modification && p.suppression;
                    return (
                      <tr key={m.id} className={isDarkMode ? 'hover:bg-slate-900/50' : 'hover:bg-blue-50/50 font-medium'}>
                        <td className={`p-2.5 font-bold ${isDarkMode ? 'text-slate-200' : 'text-[#0a1931]'}`}>{m.nom}</td>
                        <td className="p-2.5 text-center"><input type="checkbox" checked={p.lecture} onChange={() => togglePermissionUser(m.id, 'lecture')} className="w-4 h-4 accent-amber-500 rounded cursor-pointer" /></td>
                        <td className="p-2.5 text-center"><input type="checkbox" checked={p.creation} onChange={() => togglePermissionUser(m.id, 'creation')} className="w-4 h-4 accent-emerald-500 rounded cursor-pointer" /></td>
                        <td className="p-2.5 text-center"><input type="checkbox" checked={p.modification} onChange={() => togglePermissionUser(m.id, 'modification')} className="w-4 h-4 accent-blue-500 rounded cursor-pointer" /></td>
                        <td className="p-2.5 text-center"><input type="checkbox" checked={p.suppression} onChange={() => togglePermissionUser(m.id, 'suppression')} className="w-4 h-4 accent-red-500 rounded cursor-pointer" /></td>
                        <td className="p-2.5 text-center">
                          <button type="button" onClick={() => accorderToutModuleUser(m.id, !estToutAccorde)} className={`px-2 py-1 rounded text-[9.5px] font-black cursor-pointer ${estToutAccorde ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
                            {estToutAccorde ? 'Aucun' : 'Tous'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setAfficherModalePermissions(false)}
                className={`font-black px-6 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer border ${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500' : 'bg-[#0a1931] hover:bg-[#132d5c] text-white border-[#0a1931]'}`}
              >
                Valider & Fermer 👍
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🔔 MODALE UNIFIÉE DE CONFIRMATION / SUCCÈS / ERREUR */}
      {etatModale.ouverte && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`border rounded-2xl max-w-sm w-full p-5 space-y-4 text-center shadow-xl ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-[#0a1931]'}`}>
            
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black ${
              etatModale.type === 'confirmation' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              etatModale.type === 'succes' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {etatModale.type === 'confirmation' ? '❓' :
               etatModale.type === 'succes' ? '✓' : '⚠️'}
            </div>

            <div className="space-y-1">
              <h4 className={`font-black text-sm uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-[#0a1931]'}`}>
                {etatModale.titre}
              </h4>
              <p className={`text-xs font-medium leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                {etatModale.message}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              {etatModale.type === 'confirmation' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                    className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer border ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-slate-200 text-slate-900 border-slate-300 hover:bg-slate-300'}`}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const action = etatModale.onConfirmer;
                      setEtatModale({ ...etatModale, ouverte: false });
                      if (action) action();
                    }}
                    className={`flex-1 font-black py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer border ${isDarkMode ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500' : 'bg-[#0a1931] hover:bg-[#132d5c] text-white border-[#0a1931]'}`}
                  >
                    Confirmer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                  className={`w-full font-black py-2.5 rounded-xl text-xs transition shadow-xs cursor-pointer border ${isDarkMode ? 'bg-slate-800 text-slate-100 border-slate-700' : 'bg-[#0a1931] hover:bg-[#132d5c] text-white border-[#0a1931]'}`}
                >
                  Compris 👍
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* LISTE DES UTILISATEURS */}
      {!afficherForm && (
        <>
          <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <input type="text" disabled={enTrainDeSauvegarder} value={recherche} onChange={(e) => setRecherche(e.target.value.toUpperCase())} placeholder="RECHERCHER PAR NOM OU EMAIL..." className={`w-full rounded-lg px-3 py-2 font-extrabold uppercase text-xs focus:outline-none shadow-xs ${inputBg}`} />
          </div>

          <div className={`flex justify-between items-center text-[10.5px] px-1 font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            <span>Total répertorié : <strong>{usersFiltres.length}</strong> personne(s)</span>
          </div>

          {chargement ? (
            <div className="p-4 text-center text-slate-400 font-bold">Chargement...</div>
          ) : usersFiltres.length === 0 ? (
            <div className={`p-4 text-center border rounded-xl font-medium ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`}>Aucun enregistrement trouvé.</div>
          ) : (
            <div className={`overflow-x-auto border rounded-xl shadow-xs ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <table className="w-full text-left text-xs">
                <thead className={`border-b uppercase text-[9.5px] font-black select-none ${tableHeaderBg}`}>
                  <tr>
                    <th className="p-2.5 w-10 text-center">Avatar</th>
                    <th onClick={() => !enTrainDeSauvegarder && gererTri('id')} className="p-2.5 text-center font-mono cursor-pointer hover:opacity-80 whitespace-nowrap">
                      ID Unique {rendreFlecheTri('id')}
                    </th>
                    <th onClick={() => !enTrainDeSauvegarder && gererTri('nom_complet')} className="p-2.5 cursor-pointer hover:opacity-80">
                      Nom & Prénom {rendreFlecheTri('nom_complet')}
                    </th>
                    <th onClick={() => !enTrainDeSauvegarder && gererTri('role')} className="p-2.5 cursor-pointer hover:opacity-80">
                      Rôle {rendreFlecheTri('role')}
                    </th>
                    <th onClick={() => !enTrainDeSauvegarder && gererTri('acces')} className="p-2.5 text-center cursor-pointer hover:opacity-80">
                      Type d'accès {rendreFlecheTri('acces')}
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-[10.5px] ${isDarkMode ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {usersFiltres.map((u) => {
                    const roleTrouve = roles.find((r) => String(r.id) === String(u.id_role));
                    const libelleRole = (roleTrouve ? roleTrouve.nom_role : u.nom_role) || 'NON DÉFINI';
                    const aAcces = u.acces_application ?? true;

                    const idAffichageLisible = mapIdStables.get(u.id) || `${entrepriseId}-01`;

                    return (
                      <tr key={u.id} onClick={() => !enTrainDeSauvegarder && ouvrirEdition(u)} className={`cursor-pointer transition select-none ${rowHoverBg}`}>
                        <td className="p-2.5 text-center">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 mx-auto overflow-hidden flex items-center justify-center">
                            {u.photo ? (
                              <img src={u.photo} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              <span className="text-[9px] font-bold text-slate-300">👤</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-[9.5px] whitespace-nowrap" title={`ID Technique (Back-office) : ${u.id}`}>
                          <span className={`px-2 py-0.5 rounded border inline-block whitespace-nowrap ${isDarkMode ? 'bg-slate-800/80 text-cyan-400 border-slate-700/60' : 'bg-blue-50 text-blue-900 border-blue-200'}`}>
                            {idAffichageLisible}
                          </span>
                        </td>
                        <td className={`p-2.5 font-black uppercase ${isDarkMode ? 'text-slate-100' : 'text-[#0a1931]'}`}>
                          {u.nom_complet} {u.prenom ? u.prenom : ''}
                        </td>
                        <td className="p-2.5">
                          <span className={`inline-block border px-2 py-0.5 rounded font-black text-[9.5px] whitespace-nowrap ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-blue-50 text-[#0a1931] border-blue-200'}`}>
                            🛡️ {libelleRole}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded font-black text-[9.5px] border whitespace-nowrap ${aAcces ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' : 'bg-slate-800/60 text-slate-300 border-slate-700/60'}`}>
                            {aAcces ? '🟢 Utilisateur' : '👤 Terrain'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}