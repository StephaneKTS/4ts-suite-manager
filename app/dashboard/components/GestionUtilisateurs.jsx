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
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('moduleActif') || localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const estTontine = moduleActuel === 'TONTINE';
  const cleCacheUtilisateurs = `utilisateurs_${entrepriseId}_${moduleActuel}`;
  const cleCacheRoles = `roles_${entrepriseId}_${moduleActuel}`;
  const cleCacheCaisses = `caisses_${entrepriseId}_${moduleActuel}`;

  // ⚡ INITIALISATION INSTANTANÉE DEPUIS LE CACHE LOCAL POUR ZÉRO LATENCE
  const [utilisateurs, setUtilisateurs] = useState(() => localSync.recupererDonneesLocales(cleCacheUtilisateurs) || []);
  const [utilisateursBruts, setUtilisateursBruts] = useState(() => localSync.recupererDonneesLocales(cleCacheUtilisateurs) || []);
  const [roles, setRoles] = useState(() => localSync.recupererDonneesLocales(cleCacheRoles) || []);
  const [caisses, setCaisses] = useState(() => localSync.recupererDonneesLocales(cleCacheCaisses) || []);
  
  const [emplacements, setEmplacements] = useState([]);
  const [entrepriseInfo, setEntrepriseInfo] = useState(null);
  const [modulesSouscrits, setModulesSouscrits] = useState(['BOUTIQUE']);
  const [chargement, setChargement] = useState(() => {
    const cached = localSync.recupererDonneesLocales(cleCacheUtilisateurs);
    return !cached || cached.length === 0;
  });
  
  const [afficherForm, setAfficherForm] = useState(false);
  const [userEnEdition, setUserEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  // 🗂️ État pour gérer l'onglet actif dans la fiche utilisateur ('infos', 'modules', 'permissions')
  const [ongletFicheActif, setOngletFicheActif] = useState('infos');

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

  const modulesBoutique = [
    { id: 'commandes_clients_qr', nom: '📱 Commandes QR Code' },
    { id: 'caisse', nom: '🛒 Caisse & Vente' },
    { id: 'articles_stock', nom: '📦 Articles & Stock' },
    { id: 'gestion_tables', nom: '🪑 Gestion des Tables' },
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

  const modulesApp = estTontine ? modulesTontine : modulesBoutique;
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
          modules_cibles: [moduleActuel],
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

      setUtilisateursBruts(rawUsers);

      const mapUniques = new Map();
      rawUsers.forEach((u) => {
        const cleUnique = u.id ? String(u.id) : ((u.nom_complet || '').trim().toUpperCase() + '_' + (u.prenom || '').trim().toUpperCase());
        if (!mapUniques.has(cleUnique) || (u.module || '').toUpperCase() === moduleActuel) {
          mapUniques.set(cleUnique, u);
        }
      });
      const listUsers = Array.from(mapUniques.values());

      setUtilisateurs(listUsers);
      localSync.sauvegarderDonneesLocales(cleCacheUtilisateurs, listUsers);
    } catch (err) {
      console.error('Erreur chargement utilisateurs :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
    localSync.synchroniserVersCloud(supabase);
  }, [entrepriseId, moduleActuel]);

  useEffect(() => {
    const channelId = `sync-roles-${entrepriseId}-${moduleActuel}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channelRoles = supabase
      .channel(channelId)
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

    const modulesPayload = Array.isArray(nouveauUser.modules_cibles) && nouveauUser.modules_cibles.length > 0 
      ? [...new Set(nouveauUser.modules_cibles.map(m => m.toUpperCase()))]
      : [moduleActuel];

    const numeroComplet = chiffresPur ? `${paysObj.indicatif}${chiffresPur}` : null;
    const emailFinal = emailNettoye ? emailNettoye : null;

    const selectedRoleObj = roles.find(r => String(r.id) === String(nouveauUser.id_role));
    const nomRoleFinal = selectedRoleObj ? selectedRoleObj.nom_role.trim().toUpperCase() : (nouveauUser.nom_role || 'EMPLOYE').trim().toUpperCase();
    const isRoleAdmin = nomRoleFinal === 'ADMINISTRATEUR';

    const permissionsEffectives = isRoleAdmin 
      ? { _plein_acces: true } 
      : construirePermissionsFusionnees(selectedRoleObj, nouveauUser.permissions);

    setEnTrainDeSauvegarder(true);
    try {
      let emplacementIdFinal = nouveauUser.id_emplacement;
      const nomNomCollab = (nouveauUser.nom_complet || '').trim().toUpperCase();
      const prenomCollab = (nouveauUser.prenom || '').trim().toUpperCase();

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
        prenom: prenomCollab,
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
        permissions: permissionsEffectives,
        modules_cibles: modulesPayload
      };

      if (userEnEdition && userEnEdition.id) {
        // --- MISE À JOUR EXACTE PAR ID (CORRECTION PRINCIPALE) ---
        const { error: errUpd } = await supabase
          .from('utilisateurs')
          .update(basePayload)
          .eq('id', userEnEdition.id);

        if (errUpd) throw errUpd;
      } else {
        // --- CRÉATION DE NOUVEAUX ENREGISTREMENTS PAR MODULE ---
        for (const modCible of modulesPayload) {
          await supabase.from('utilisateurs').insert([{ ...basePayload, module: modCible }]);
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
    setOngletFicheActif('infos');
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

    let modulesDetectes = [];
    if (Array.isArray(user.modules_cibles) && user.modules_cibles.length > 0) {
      user.modules_cibles.forEach(m => modulesDetectes.push(String(m).toUpperCase()));
    }

    const lignesGlobalesUser = utilisateursBruts.filter(
      u => u.id === user.id || (u.nom_complet || '').trim().toUpperCase() === (user.nom_complet || '').trim().toUpperCase()
    );
    
    lignesGlobalesUser.forEach(l => {
      if (l.module) modulesDetectes.push(l.module.toUpperCase());
      if (Array.isArray(l.modules_cibles)) {
        l.modules_cibles.forEach(m => modulesDetectes.push(String(m).toUpperCase()));
      }
    });

    modulesDetectes = [...new Set(modulesDetectes)];
    if (modulesDetectes.length === 0) {
      modulesDetectes = [user.module ? user.module.toUpperCase() : moduleActuel];
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
      modules_cibles: modulesDetectes,
      permissions: construirePermissionsFusionnees(roleObjMatch, user.permissions || {}),
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    if (enTrainDeSauvegarder) return;
    setUserEnEdition(null);
    setOngletFicheActif('infos');
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
          const { error } = await supabase.from('utilisateurs').delete().eq('id', userEnEdition.id);
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

  const cardStyle = 'bg-white rounded-xl border border-slate-200 shadow-2xs';
  const inputStyle = 'w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-900 text-[10px] focus:ring-1 focus:ring-orange-500 focus:outline-none uppercase';
  const tableHeaderStyle = 'bg-slate-50 text-slate-700 uppercase text-[8.5px] font-extrabold border-b border-slate-200';

  return (
    <div className="space-y-2 font-sans text-[10px]">
      
      {/* EN-TÊTE PRINCIPAL */}
      <div className={`flex justify-between items-center p-2 gap-2 flex-wrap ${cardStyle}`}>
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <span className="font-extrabold uppercase text-slate-900 text-[10.5px] truncate">
            👥 GESTION DU PERSONNEL & PERMISSIONS ({moduleActuel})
          </span>
          <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200 shrink-0">
            Licences : <strong className={nbLicencesUtilisees > limiteLicenceMax ? 'text-red-600' : 'text-emerald-700 font-black'}>{nbLicencesUtilisees}</strong> / {limiteLicenceMax}
          </span>
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
              setOngletFicheActif('infos');
              setAfficherForm(true);
            }
          }}
          className="py-1.5 px-3 rounded-lg font-black transition text-center text-[10px] uppercase flex items-center justify-center gap-1 border bg-orange-600 hover:bg-orange-700 text-white border-orange-700 shadow-xs cursor-pointer"
        >
          <span>{afficherForm ? '✖' : '＋'}</span> {afficherForm ? 'Fermer' : 'Nouveau'}
        </button>
      </div>

      <div className="flex justify-start items-center gap-1.5">
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => { if (!enTrainDeSauvegarder) annulerForm(); }}
          className={`py-1.5 px-3 rounded-xl font-black transition text-center text-[9.5px] uppercase border cursor-pointer truncate ${
            !afficherForm 
              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          📋 Liste du personnel ({utilisateurs.length})
        </button>
      </div>

      {/* FORMULAIRE D'EDITION / CREATION */}
      {afficherForm && (
        <div className={`p-3 space-y-3 shadow-md max-h-[85vh] overflow-y-auto ${cardStyle}`}>
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div>
              <h4 className="font-black uppercase text-xs text-slate-900 flex items-center gap-1.5">
                <span>{userEnEdition ? '✏️' : '➕'}</span> {userEnEdition ? 'Fiche du collaborateur' : 'Nouveau collaborateur'}
              </h4>
              {userEnEdition && userEnEdition.id && (
                <p className="text-[9px] font-mono font-bold text-orange-600 mt-0.5">
                  ID Unique : {userEnEdition.id}
                </p>
              )}
            </div>
            <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerForm} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition cursor-pointer">✕</button>
          </div>

          {/* BARRE DE NAVIGATION DES ONGLETS DE LA FICHE */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setOngletFicheActif('infos')}
              className={`py-1.5 px-2 rounded-lg font-black text-[9.5px] transition text-center cursor-pointer uppercase ${
                ongletFicheActif === 'infos'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              👤 Infos
            </button>
            <button
              type="button"
              onClick={() => setOngletFicheActif('modules')}
              className={`py-1.5 px-2 rounded-lg font-black text-[9.5px] transition text-center cursor-pointer uppercase ${
                ongletFicheActif === 'modules'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              💳 Modules ({nouveauUser.modules_cibles.length})
            </button>
            <button
              type="button"
              onClick={() => setOngletFicheActif('permissions')}
              className={`py-1.5 px-2 rounded-lg font-black text-[9.5px] transition text-center cursor-pointer uppercase ${
                ongletFicheActif === 'permissions'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              🔑 Droits
            </button>
          </div>

          <form onSubmit={preparerEnregistrement} className="space-y-3">
            
            {/* ONGLET 1 : INFORMATIONS */}
            {ongletFicheActif === 'infos' && (
              <div className="space-y-2.5 animate-fadeIn">
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="font-black text-[9.5px] uppercase text-slate-900">
                    Accès application (Licence / Connexion)
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={enTrainDeSauvegarder}
                      checked={nouveauUser.acces_application}
                      onChange={(e) => setNouveauUser({ ...nouveauUser, acces_application: e.target.checked })}
                      className="sr-only peer cursor-pointer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                <input type="file" ref={fileInputRef} onChange={gererSelectionImage} accept="image/*" className="hidden" />

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div 
                    onClick={() => !enTrainDeSauvegarder && fileInputRef.current && fileInputRef.current.click()}
                    className="w-12 h-12 rounded-full bg-slate-800 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs cursor-pointer hover:opacity-80 transition"
                  >
                    {nouveauUser.photo ? (
                      <img src={nouveauUser.photo} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-black">📷</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-[9px] uppercase text-slate-900">Photo de profil</p>
                    <p className="text-[8.5px] font-semibold text-slate-500">Cliquez pour ajouter.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[7.5px] text-slate-600 uppercase mb-0.5">Nom *</label>
                    <input type="text" required disabled={enTrainDeSauvegarder} value={nouveauUser.nom_complet} onChange={(e) => setNouveauUser({ ...nouveauUser, nom_complet: e.target.value.toUpperCase() })} placeholder="EX: MBOA" className={inputStyle} />
                  </div>
                  <div>
                    <label className="block font-bold text-[7.5px] text-slate-600 uppercase mb-0.5">Prénom</label>
                    <input type="text" disabled={enTrainDeSauvegarder} value={nouveauUser.prenom} onChange={(e) => setNouveauUser({ ...nouveauUser, prenom: e.target.value.toUpperCase() })} placeholder="EX: JEAN" className={inputStyle} />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[7.5px] text-slate-600 uppercase mb-0.5">Rôle / Fonction ({moduleActuel}) *</label>
                  <select required disabled={enTrainDeSauvegarder} value={nouveauUser.id_role} onChange={changerRoleUtilisateur} className={inputStyle}>
                    <option value="">-- Sélectionner un Rôle --</option>
                    {roles.map((r) => (<option key={r.id} value={String(r.id)}>{r.nom_role}</option>))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[7.5px] text-slate-600 uppercase mb-0.5">Type Collaborateur</label>
                  <select disabled={enTrainDeSauvegarder} value={nouveauUser.type_collaborateur} onChange={(e) => setNouveauUser({ ...nouveauUser, type_collaborateur: e.target.value })} className={inputStyle}>
                    <option value="EMPLOYE">Employé standard</option>
                    <option value="LIVREUR">Livreur</option>
                    <option value="CHAUFFEUR">Chauffeur</option>
                  </select>
                </div>

                {nouveauUser.acces_application && (
                  <div>
                    <label className="block font-bold text-[7.5px] text-slate-600 uppercase mb-0.5">Mot de Passe de Connexion *</label>
                    <div className="relative flex items-center">
                      <input 
                        type={afficherMotDePasse ? "text" : "password"} 
                        disabled={enTrainDeSauvegarder}
                        required={nouveauUser.acces_application} 
                        value={nouveauUser.mot_de_passe} 
                        onChange={(e) => setNouveauUser({ ...nouveauUser, mot_de_passe: e.target.value })} 
                        placeholder="••••••••" 
                        className={`${inputStyle} font-mono pr-7`} 
                      />
                      <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setAfficherMotDePasse(!afficherMotDePasse)} className="absolute right-2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer">
                        {afficherMotDePasse ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block font-bold text-[7.5px] text-slate-600 uppercase mb-0.5">Pays</label>
                    <select disabled={enTrainDeSauvegarder} value={nouveauUser.pays} onChange={(e) => setNouveauUser({ ...nouveauUser, pays: e.target.value })} className={inputStyle}>
                      {LISTE_PAYS.map((p) => (<option key={p.code} value={p.code}>{p.code.toUpperCase()}</option>))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block font-bold text-[7.5px] text-slate-600 uppercase mb-0.5">Téléphone ({paysActuelObj.longueur} chiffres)</label>
                    <div className="flex items-center rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                      <span className="px-2 py-1.5 text-[9.5px] font-extrabold border-r border-slate-200 bg-slate-100 text-slate-700 shrink-0">{paysActuelObj.indicatif}</span>
                      <input type="text" disabled={enTrainDeSauvegarder} maxLength={paysActuelObj.longueur} value={nouveauUser.telephone} onChange={gererSaisieTelephone} placeholder="6XXXXXXXX" className="w-full p-1.5 font-mono text-[10px] font-bold bg-slate-50 text-slate-900 focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[7.5px] text-slate-600 uppercase mb-0.5">Email</label>
                  <input type="email" disabled={enTrainDeSauvegarder} value={nouveauUser.email} onChange={(e) => setNouveauUser({ ...nouveauUser, email: e.target.value.toLowerCase() })} placeholder="collaborateur@keita.cm" className={inputStyle} />
                </div>
              </div>
            )}

            {/* ONGLET 2 : MODULES */}
            {ongletFicheActif === 'modules' && (
              <div className="space-y-2 animate-fadeIn">
                <div className="p-2.5 rounded-xl space-y-1.5 border border-slate-200 bg-slate-50">
                  <span className="font-black text-[9.5px] uppercase block text-slate-900">
                    💳 Modules autorisés :
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    {MODULES_DISPONIBLES.map((mod) => {
                      const estSouscrit = modulesSouscrits.includes(mod.id);
                      const estCoche = nouveauUser.modules_cibles.includes(mod.id);

                      return (
                        <div 
                          key={mod.id} 
                          onClick={() => estSouscrit && basculerModuleCible(mod.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border transition select-none ${
                            !estSouscrit 
                              ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed' 
                              : estCoche 
                                ? 'bg-orange-50 border-orange-300 text-slate-900 font-black cursor-pointer shadow-2xs' 
                                : 'bg-white border-slate-200 text-slate-800 cursor-pointer hover:bg-slate-50 font-bold'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              disabled={!estSouscrit}
                              checked={estCoche}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 accent-orange-600 rounded cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className="text-[9.5px] truncate">{mod.label}</span>
                          </div>
                          {!estSouscrit && <span className="text-[8px] px-1.5 py-0.5 rounded font-bold bg-slate-200 text-slate-600 shrink-0">Non souscrit</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET 3 : PERMISSIONS */}
            {ongletFicheActif === 'permissions' && (
              <div className="space-y-2 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <span className="font-black text-[9.5px] uppercase text-slate-900">
                    🔑 Droits & Permissions ({moduleActuel})
                  </span>
                  <button
                    type="button"
                    onClick={() => setAfficherModalePermissions(true)}
                    className="px-2.5 py-1 rounded-lg text-[9px] font-black transition cursor-pointer border bg-slate-800 hover:bg-slate-700 text-white border-slate-800"
                  >
                    🛠️ Matrice complète
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[40vh] bg-white">
                  <table className="w-full text-left text-[9.5px]">
                    <thead className={tableHeaderStyle}>
                      <tr>
                        <th className="p-2">Module / Table</th>
                        <th className="p-2 text-center">Lecture</th>
                        <th className="p-2 text-center">Création</th>
                        <th className="p-2 text-center">Modif.</th>
                        <th className="p-2 text-center">Suppr.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[9.5px] text-slate-900 bg-white">
                      {modulesApp.map((m) => {
                        const p = nouveauUser.permissions[m.id] || { lecture: false, creation: false, modification: false, suppression: false };
                        return (
                          <tr key={m.id} className="hover:bg-orange-50/70 transition">
                            <td className="p-2 font-extrabold text-slate-900">{m.nom}</td>
                            <td className="p-2 text-center"><input type="checkbox" checked={p.lecture} onChange={() => togglePermissionUser(m.id, 'lecture')} className="w-3.5 h-3.5 accent-orange-600 rounded cursor-pointer" /></td>
                            <td className="p-2 text-center"><input type="checkbox" checked={p.creation} onChange={() => togglePermissionUser(m.id, 'creation')} className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer" /></td>
                            <td className="p-2 text-center"><input type="checkbox" checked={p.modification} onChange={() => togglePermissionUser(m.id, 'modification')} className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer" /></td>
                            <td className="p-2 text-center"><input type="checkbox" checked={p.suppression} onChange={() => togglePermissionUser(m.id, 'suppression')} className="w-3.5 h-3.5 accent-rose-600 rounded cursor-pointer" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              {userEnEdition ? (
                <button type="button" disabled={enTrainDeSauvegarder} onClick={supprimerUtilisateur} className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] shadow-2xs transition cursor-pointer">
                  🗑️ Supprimer
                </button>
              ) : <div />}
              <div className="flex items-center gap-1.5 ml-auto">
                <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerForm} className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold px-3.5 py-1.5 rounded-lg text-[10px] transition cursor-pointer">
                  Annuler
                </button>
                <button type="submit" disabled={enTrainDeSauvegarder} className="font-black px-4 py-1.5 rounded-lg text-[10px] shadow-2xs transition cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white">
                  {enTrainDeSauvegarder ? 'Enregistrement...' : (userEnEdition ? 'Mettre à jour' : '✅ Enregistrer')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODALE DE CONFIGURATION DES PERMISSIONS EN PLEIN ÉCRAN */}
      {afficherModalePermissions && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] p-4 flex flex-col space-y-3">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 shrink-0">
              <h4 className="font-black uppercase text-xs text-slate-900 flex items-center gap-1.5">
                <span>🔑</span> Matrice complète des Droits ({moduleActuel})
              </h4>
              <button
                type="button"
                onClick={() => setAfficherModalePermissions(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white">
              <table className="w-full text-left text-[9.5px]">
                <thead className={tableHeaderStyle}>
                  <tr>
                    <th className="p-2">Module / Table</th>
                    <th className="p-2 text-center">Lecture</th>
                    <th className="p-2 text-center">Création</th>
                    <th className="p-2 text-center">Modif.</th>
                    <th className="p-2 text-center">Suppr.</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[9.5px] text-slate-900 bg-white">
                  {modulesApp.map((m) => {
                    const p = nouveauUser.permissions[m.id] || { lecture: false, creation: false, modification: false, suppression: false };
                    const estToutAccorde = p.lecture && p.creation && p.modification && p.suppression;
                    return (
                      <tr key={m.id} className="hover:bg-orange-50/70 transition">
                        <td className="p-2 font-extrabold text-slate-900">{m.nom}</td>
                        <td className="p-2 text-center"><input type="checkbox" checked={p.lecture} onChange={() => togglePermissionUser(m.id, 'lecture')} className="w-3.5 h-3.5 accent-orange-600 rounded cursor-pointer" /></td>
                        <td className="p-2 text-center"><input type="checkbox" checked={p.creation} onChange={() => togglePermissionUser(m.id, 'creation')} className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer" /></td>
                        <td className="p-2 text-center"><input type="checkbox" checked={p.modification} onChange={() => togglePermissionUser(m.id, 'modification')} className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer" /></td>
                        <td className="p-2 text-center"><input type="checkbox" checked={p.suppression} onChange={() => togglePermissionUser(m.id, 'suppression')} className="w-3.5 h-3.5 accent-rose-600 rounded cursor-pointer" /></td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={() => accorderToutModuleUser(m.id, !estToutAccorde)} className={`px-2 py-0.5 rounded font-black text-[8.5px] cursor-pointer ${estToutAccorde ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                            {estToutAccorde ? 'Retirer tout' : 'Tout accorder'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end shrink-0 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAfficherModalePermissions(false)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-black px-4 py-1.5 rounded-lg text-[10px] shadow-2xs transition cursor-pointer"
              >
                Valider 👍
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🔔 MODALE UNIFIÉE DE CONFIRMATION / SUCCÈS / ERREUR */}
      {etatModale.ouverte && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 space-y-4 text-center shadow-2xl text-slate-900">
            
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black border ${
              etatModale.type === 'confirmation' ? 'bg-orange-50 text-orange-600 border-orange-200' :
              etatModale.type === 'succes' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
              {etatModale.type === 'confirmation' ? '❓' :
               etatModale.type === 'succes' ? '✓' : '⚠️'}
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                {etatModale.titre}
              </h4>
              <p className="text-[11px] font-semibold leading-relaxed text-slate-600">
                {etatModale.message}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              {etatModale.type === 'confirmation' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold py-2 rounded-xl text-[10px] transition cursor-pointer"
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
                    className="flex-1 font-black py-2 rounded-xl text-[10px] shadow-2xs transition cursor-pointer bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Confirmer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                  className="w-full font-black py-2 rounded-xl text-[10px] transition shadow-2xs cursor-pointer bg-orange-600 hover:bg-orange-700 text-white"
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
          <div className={`p-2 ${cardStyle}`}>
            <input type="text" disabled={enTrainDeSauvegarder} value={recherche} onChange={(e) => setRecherche(e.target.value.toUpperCase())} placeholder="RECHERCHER PAR NOM OU EMAIL..." className={inputStyle} />
          </div>

          <div className="flex justify-between items-center text-[9.5px] px-1 font-bold text-slate-600">
            <span>Total répertorié : <strong>{usersFiltres.length}</strong> personne(s)</span>
          </div>

          {chargement && utilisateurs.length === 0 ? (
            <div className="p-4 text-center text-slate-400 font-bold">Chargement...</div>
          ) : usersFiltres.length === 0 ? (
            <div className={`p-4 text-center font-bold text-slate-500 ${cardStyle}`}>Aucun enregistrement trouvé.</div>
          ) : (
            <div className={`overflow-x-auto ${cardStyle}`}>
              <table className="w-full text-left text-[9.5px]">
                <thead className={tableHeaderStyle}>
                  <tr>
                    <th className="p-2 w-8 text-center">Avatar</th>
                    <th onClick={() => !enTrainDeSauvegarder && gererTri('id')} className="p-2 text-center font-mono cursor-pointer hover:text-orange-600 whitespace-nowrap">
                      ID Unique {rendreFlecheTri('id')}
                    </th>
                    <th onClick={() => !enTrainDeSauvegarder && gererTri('nom_complet')} className="p-2 cursor-pointer hover:text-orange-600">
                      Nom & Prénom {rendreFlecheTri('nom_complet')}
                    </th>
                    <th onClick={() => !enTrainDeSauvegarder && gererTri('role')} className="p-2 cursor-pointer hover:text-orange-600">
                      Rôle {rendreFlecheTri('role')}
                    </th>
                    <th onClick={() => !enTrainDeSauvegarder && gererTri('acces')} className="p-2 text-center cursor-pointer hover:text-orange-600">
                      Type d'accès {rendreFlecheTri('acces')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[9.5px] text-slate-900 bg-white">
                  {usersFiltres.map((u) => {
                    const roleTrouve = roles.find((r) => String(r.id) === String(u.id_role));
                    const libelleRole = (roleTrouve ? roleTrouve.nom_role : u.nom_role) || 'NON DÉFINI';
                    const aAcces = u.acces_application ?? true;
                    const idAffichageLisible = mapIdStables.get(u.id) || `${entrepriseId}-01`;

                    return (
                      <tr key={u.id} onClick={() => !enTrainDeSauvegarder && ouvrirEdition(u)} className="cursor-pointer transition select-none hover:bg-orange-50/70">
                        <td className="p-2 text-center">
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-200 mx-auto overflow-hidden flex items-center justify-center">
                            {u.photo ? (
                              <img src={u.photo} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              <span className="text-[8px] font-bold text-white">👤</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-[9px] whitespace-nowrap" title={`ID Technique : ${u.id}`}>
                          <span className="px-1.5 py-0.5 rounded border inline-block whitespace-nowrap bg-slate-100 text-slate-800 border-slate-200">
                            {idAffichageLisible}
                          </span>
                        </td>
                        <td className="p-2 font-black uppercase text-slate-900">
                          {u.nom_complet} {u.prenom ? u.prenom : ''}
                        </td>
                        <td className="p-2">
                          <span className="inline-block border px-1.5 py-0.5 rounded font-black text-[9px] whitespace-nowrap bg-slate-100 text-slate-800 border-slate-200">
                            🛡️ {libelleRole}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded font-black text-[9px] border whitespace-nowrap ${aAcces ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
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