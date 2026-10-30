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

export default function GestionUtilisateurs({ entrepriseId = '4TS-TEST' }) {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [caisses, setCaisses] = useState([]);
  const [emplacements, setEmplacements] = useState([]);
  const [entrepriseInfo, setEntrepriseInfo] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [userEnEdition, setUserEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);

  // --- GESTION DES ÉTAPES DU FORMULAIRE ---
  const [etapeFormulaire, setEtapeFormulaire] = useState(1);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  const fileInputRef = useRef(null);

  const [triCol, setTriCol] = useState('nom_complet');
  const [triOrdre, setTriOrdre] = useState('asc');

  const modulesApp = [
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
    { id: 'commandes_livraison', nom: '📦 Commandes & Livraisons' },
    { id: 'grille_tarifaire', nom: '🗺️ Grille Tarifaire Livraison' },
    { id: 'challenges_commerciaux', nom: '🏆 Challenges Commerciaux' },
    { id: 'plan_comptable', nom: '📚 Plan Comptable & Journal' },
    { id: 'roles_utilisateurs', nom: '🔑 Rôles & Personnel' }
  ];

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
    id_caisse: '',
    id_emplacement: '',
    photo: '',
    statut: 'ACTIF',
    acces_application: true,
    permissions: initialiserPermissionsDefaut(),
  });

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const cleCacheUtilisateurs = `utilisateurs_${entrepriseId}_${moduleActuel}`;
  const cleCacheRoles = `roles_${entrepriseId}_${moduleActuel}`;
  const cleCacheCaisses = `caisses_${entrepriseId}_${moduleActuel}`;
  const estModeLivraison = moduleActuel === 'LIVRAISON';

  const roleActuelObj = roles.find((r) => String(r.id) === String(nouveauUser.id_role));
  const estRoleLivreurOuChauffeur = (roleActuelObj && (roleActuelObj.nom_role.toUpperCase().includes('LIVREUR') || roleActuelObj.nom_role.toUpperCase().includes('CHAUFFEUR'))) || nouveauUser.type_collaborateur === 'LIVREUR' || nouveauUser.type_collaborateur === 'CHAUFFEUR';

  const chargerDonnees = async () => {
    // 1. CHARGEMENT INSTANTANÉ DEPUIS LE CACHE LOCAL (Zéro attente)
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
      if (dataEnt) setEntrepriseInfo(dataEnt);

      const { data: dataRoles } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
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

      // 2. RÉCUPÉRATION SUPABASE STRICTE PAR ENTREPRISE ET MODULE
      const { data: dataUsers, error } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const listUsers = dataUsers || [];
      setUtilisateurs(listUsers);

      // Mise à jour du cache local propre
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

  const togglePermission = (moduleId, action) => {
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

  const accorderToutModule = (moduleId, toutAccorder) => {
    setNouveauUser((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: { lecture: toutAccorder, creation: toutAccorder, modification: toutAccorder, suppression: toutAccorder },
      },
    }));
  };

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

  const validerEtape1 = (e) => {
    e.preventDefault();
    if (!nouveauUser.nom_complet.trim()) {
      alert('⚠️ Veuillez renseigner le nom du collaborateur.');
      return;
    }
    if (!nouveauUser.id_role) {
      alert('⚠️ Veuillez sélectionner un rôle ou une fonction.');
      return;
    }

    const paysObj = LISTE_PAYS.find(p => p.code === nouveauUser.pays) || LISTE_PAYS[0];
    const chiffresPur = (nouveauUser.telephone || '').replace(/[^0-9]/g, '');

    if (chiffresPur.length > 0 && chiffresPur.length !== paysObj.longueur) {
      alert(`⚠️ Numéro invalide pour ${paysObj.code}. Le numéro doit comporter exactement ${paysObj.longueur} chiffres.`);
      return;
    }

    setEtapeFormulaire(2);
  };

  const enregistrerUtilisateurDefinitif = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (nouveauUser.acces_application) {
      const nbActuelsAccesApp = utilisateurs.filter(u => u.acces_application && (!userEnEdition || u.id !== userEnEdition.id)).length;
      const limiteLicence = entrepriseInfo?.limite_utilisateurs || 5;
      if (nbActuelsAccesApp >= limiteLicence) {
        alert(`❌ Limite de licence atteinte (${limiteLicence} utilisateurs avec accès application maximum).`);
        return;
      }
    }

    const paysObj = LISTE_PAYS.find(p => p.code === nouveauUser.pays) || LISTE_PAYS[0];
    const chiffresPur = (nouveauUser.telephone || '').replace(/[^0-9]/g, '');
    const numeroComplet = chiffresPur ? `${paysObj.indicatif}${chiffresPur}` : '';
    const emailSaisi = (nouveauUser.email || '').trim().toLowerCase();

    // --- FILTRAGE STRICT DE DUPLICATION SUR TOUT L'ÉCOSYSTÈME DE L'ENTREPRISE ET DU MODULE ---
    const doublonEmail = utilisateurs.find(u => 
      u.email && u.email.trim().toLowerCase() === emailSaisi && (!userEnEdition || u.id !== userEnEdition.id)
    );
    if (emailSaisi && doublonEmail) {
      alert(`❌ Doublon détecté : L'adresse e-mail "${emailSaisi}" est déjà utilisée par un autre collaborateur (${doublonEmail.nom_complet}).`);
      return;
    }

    const doublonTelephone = utilisateurs.find(u => 
      u.telephone && u.telephone.trim() === numeroComplet && (!userEnEdition || u.id !== userEnEdition.id)
    );
    if (numeroComplet && doublonTelephone) {
      alert(`❌ Doublon détecté : Le numéro de téléphone "${numeroComplet}" est déjà utilisé par un autre collaborateur (${doublonTelephone.nom_complet}).`);
      return;
    }
    // --------------------------------------------------------------------------

    setEnTrainDeSauvegarder(true);
    try {
      let emplacementIdFinal = nouveauUser.id_emplacement;
      const nomNomCollab = (nouveauUser.nom_complet || '').trim().toUpperCase();

      if (estRoleLivreurOuChauffeur) {
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

      let payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
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
        email: emailSaisi,
        pays: nouveauUser.pays,
        telephone: numeroComplet,
        mot_de_passe: nouveauUser.acces_application ? nouveauUser.mot_de_passe : null,
        id_role: nouveauUser.id_role || null,
        id_caisse: estModeLivraison ? null : (nouveauUser.id_caisse || null),
        id_emplacement: estRoleLivreurOuChauffeur ? (emplacementIdFinal || null) : null,
        photo: nouveauUser.photo || null,
        statut: nouveauUser.statut,
        acces_application: nouveauUser.acces_application,
        permissions: nouveauUser.acces_application ? nouveauUser.permissions : null,
      };

      if (userEnEdition) {
        const { error } = await supabase.from('utilisateurs').update(payload).eq('id', userEnEdition.id);
        if (error) throw error;

        setUtilisateurs(prev => prev.map(u => u.id === userEnEdition.id ? { ...u, ...payload } : u));
        alert('Collaborateur mis à jour avec succès !');
      } else {
        // Insertion sans ID temporaire pour éviter l'erreur de type bigint sur Supabase
        const { error, data } = await supabase.from('utilisateurs').insert([payload]).select().single();
        if (error) throw error;

        if (data) {
          setUtilisateurs(prev => [data, ...prev.filter(u => u.id !== data.id)]);
        }
        alert('Collaborateur enregistré avec succès !');
      }

      // Suppression et nettoyage de l'ancien cache local
      localStorage.removeItem(cleCacheUtilisateurs);

      annulerForm();
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur lors de l’enregistrement : ' + err.message);
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
      id_role: user.id_role || '',
      id_caisse: user.id_caisse || '',
      id_emplacement: user.id_emplacement || '',
      photo: user.photo || '',
      statut: user.statut || 'ACTIF',
      acces_application: user.acces_application ?? true,
      permissions: { ...initialiserPermissionsDefaut(), ...(user.permissions || {}) },
    });
    setEtapeFormulaire(1);
    setAfficherForm(true);
  };

  const annulerForm = () => {
    if (enTrainDeSauvegarder) return;
    setUserEnEdition(null);
    setEtapeFormulaire(1);
    setNouveauUser({
      nom_complet: '', prenom: '', date_naissance: '', lieu_naissance: '', statut_matrimonial: 'CELIBATAIRE',
      nombre_enfants: 0, lieu_residence: '', numero_cni: '', type_collaborateur: 'EMPLOYE', categorie_permis: '',
      numero_permis: '', email: '', pays: 'cmr', telephone: '', mot_de_passe: '', id_role: '', id_caisse: '',
      id_emplacement: '', photo: '', statut: 'ACTIF', acces_application: true, permissions: initialiserPermissionsDefaut()
    });
    setAfficherForm(false);
  };

  const supprimerUtilisateur = async () => {
    if (enTrainDeSauvegarder || !userEnEdition) return;

    if (!confirm(`Voulez-vous vraiment supprimer définitivement le collaborateur "${userEnEdition.nom_complet}" ?`)) return;

    setEnTrainDeSauvegarder(true);
    try {
      const { error } = await supabase.from('utilisateurs').delete().eq('id', userEnEdition.id);
      if (error) throw error;

      setUtilisateurs(prev => prev.filter(u => u.id !== userEnEdition.id));
      localStorage.removeItem(cleCacheUtilisateurs);

      alert('Collaborateur supprimé avec succès.');
      annulerForm();
      await chargerDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
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
      if (triCol === 'nom_complet') {
        valA = a.nom_complet || '';
        valB = b.nom_complet || '';
      } else if (triCol === 'role') {
        valA = roles.find((r) => String(r.id) === String(a.id_role))?.nom_role || '';
        valB = roles.find((r) => String(r.id) === String(b.id_role))?.nom_role || '';
      }
      if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
      return 0;
    });

  const paysActuelObj = LISTE_PAYS.find(p => p.code === nouveauUser.pays) || LISTE_PAYS[0];

  return (
    <div className="space-y-2.5 text-[11px] font-sans">
      
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
            <span>👥</span> GESTION DU PERSONNEL
          </h3>
          <p className="text-[9.5px] text-slate-600 font-bold mt-0.5">
            Licences app : <strong className={nbLicencesUtilisees > limiteLicenceMax ? 'text-red-600' : 'text-emerald-700'}>{nbLicencesUtilisees}</strong> / {limiteLicenceMax} utilisées
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
                numero_permis: '', email: '', pays: 'cmr', telephone: '', mot_de_passe: '', id_role: '', id_caisse: '',
                id_emplacement: '', photo: '', statut: 'ACTIF', acces_application: true, permissions: initialiserPermissionsDefaut()
              });
              setUserEnEdition(null);
              setEtapeFormulaire(1);
              setAfficherForm(true);
            }
          }}
          className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
        >
          {afficherForm ? '✖' : 'Nouveau'}
        </button>
      </div>

      <div className="flex justify-start items-center gap-1.5">
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => { if (!enTrainDeSauvegarder) annulerForm(); }}
          className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition whitespace-nowrap border shadow-2xs ${
            !afficherForm 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          📋 Liste du personnel ({utilisateurs.length})
        </button>
      </div>

      {afficherForm && (
        <div className="bg-white border-2 border-orange-500/50 p-3 rounded-xl space-y-2.5 shadow-md max-h-[75vh] overflow-y-auto pr-2 pb-24">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
            <h4 className="font-black text-orange-600 uppercase text-[11px]">
              {userEnEdition ? '✏️ Fiche du collaborateur' : '➕ Nouveau collaborateur'} — Étape {etapeFormulaire} / 2
            </h4>
            <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerForm} className="text-slate-400 hover:text-slate-700 font-bold text-xs p-0.5">✖</button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl text-center font-black text-[10px]">
            <div className={`py-1 rounded-lg ${etapeFormulaire === 1 ? 'bg-orange-600 text-white' : 'bg-white text-slate-700'}`}>
              1. Infos Personnelles & Paie
            </div>
            <div className={`py-1 rounded-lg ${etapeFormulaire === 2 ? 'bg-orange-600 text-white' : 'bg-white text-slate-700'}`}>
              2. Droits & Autorisations
            </div>
          </div>

          {etapeFormulaire === 1 && (
            <form onSubmit={validerEtape1} className="space-y-2.5">
              <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl space-y-1 shadow-2xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={enTrainDeSauvegarder}
                    checked={nouveauUser.acces_application}
                    onChange={(e) => setNouveauUser({ ...nouveauUser, acces_application: e.target.checked })}
                    className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                  />
                  <span className="font-black text-amber-950 text-[11px]">
                    Accès à l'application (Consomme une licence / Connexion active)
                  </span>
                </label>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={gererSelectionImage} 
                accept="image/*" 
                className="hidden" 
              />

              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div 
                  onClick={() => !enTrainDeSauvegarder && fileInputRef.current && fileInputRef.current.click()}
                  title="Cliquez pour choisir une photo"
                  className="w-14 h-14 rounded-full bg-slate-200 border-2 border-orange-500 flex items-center justify-center overflow-hidden shrink-0 shadow-xs cursor-pointer hover:opacity-80 transition relative group"
                >
                  {nouveauUser.photo ? (
                    <img src={nouveauUser.photo} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-600 text-lg font-black">📷</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold text-center p-0.5">
                    Modifier
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-black text-[10px] text-slate-800 uppercase">Photo de profil du collaborateur</p>
                  <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Cliquez sur l'icône pour ajouter une photo depuis votre appareil.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Nom *</label>
                  <input type="text" required disabled={enTrainDeSauvegarder} value={nouveauUser.nom_complet} onChange={(e) => setNouveauUser({ ...nouveauUser, nom_complet: e.target.value.toUpperCase() })} placeholder="EX: MBOA" className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold uppercase text-slate-900 text-xs shadow-xs" />
                </div>
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Prénom</label>
                  <input type="text" disabled={enTrainDeSauvegarder} value={nouveauUser.prenom} onChange={(e) => setNouveauUser({ ...nouveauUser, prenom: e.target.value.toUpperCase() })} placeholder="EX: JEAN" className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold uppercase text-slate-900 text-xs shadow-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Date de naissance</label>
                  <input type="date" disabled={enTrainDeSauvegarder} value={nouveauUser.date_naissance} onChange={(e) => setNouveauUser({ ...nouveauUser, date_naissance: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs" />
                </div>
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Lieu de naissance</label>
                  <input type="text" disabled={enTrainDeSauvegarder} value={nouveauUser.lieu_naissance} onChange={(e) => setNouveauUser({ ...nouveauUser, lieu_naissance: e.target.value.toUpperCase() })} placeholder="EX: YAOUNDÉ" className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold uppercase text-slate-900 text-xs shadow-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Statut Matrimonial</label>
                  <select disabled={enTrainDeSauvegarder} value={nouveauUser.statut_matrimonial} onChange={(e) => setNouveauUser({ ...nouveauUser, statut_matrimonial: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-xs shadow-xs">
                    <option value="CELIBATAIRE">Célibataire</option>
                    <option value="MARIE">Marié(e)</option>
                    <option value="DIVORCE">Divorcé(e)</option>
                    <option value="VEUF">Veuf(ve)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Nombre d'enfants</label>
                  <input type="number" min="0" disabled={enTrainDeSauvegarder} value={nouveauUser.nombre_enfants} onChange={(e) => setNouveauUser({ ...nouveauUser, nombre_enfants: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Lieu de résidence</label>
                  <input type="text" disabled={enTrainDeSauvegarder} value={nouveauUser.lieu_residence} onChange={(e) => setNouveauUser({ ...nouveauUser, lieu_residence: e.target.value.toUpperCase() })} placeholder="EX: BASTOS, YAOUNDÉ" className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold uppercase text-slate-900 text-xs shadow-xs" />
                </div>
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Numéro CNI</label>
                  <input type="text" disabled={enTrainDeSauvegarder} value={nouveauUser.numero_cni} onChange={(e) => setNouveauUser({ ...nouveauUser, numero_cni: e.target.value.toUpperCase() })} placeholder="EX: 112233445" className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold uppercase text-slate-900 text-xs shadow-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Rôle / Fonction *</label>
                  <select required disabled={enTrainDeSauvegarder} value={nouveauUser.id_role} onChange={(e) => setNouveauUser({ ...nouveauUser, id_role: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-orange-700 text-xs shadow-xs">
                    <option value="">-- Rôle --</option>
                    {roles.map((r) => (<option key={r.id} value={r.id}>{r.nom_role}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Type Collaborateur</label>
                  <select disabled={enTrainDeSauvegarder} value={nouveauUser.type_collaborateur} onChange={(e) => setNouveauUser({ ...nouveauUser, type_collaborateur: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-xs shadow-xs">
                    <option value="EMPLOYE">Employé standard</option>
                    <option value="LIVREUR">Livreur</option>
                    <option value="CHAUFFEUR">Chauffeur</option>
                  </select>
                </div>
              </div>

              {estRoleLivreurOuChauffeur && (
                <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-xl space-y-2">
                  <span className="font-black text-orange-900 text-[10px] uppercase block">🚚 Informations Transport / Permis</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Catégorie de permis</label>
                      <input type="text" disabled={enTrainDeSauvegarder} value={nouveauUser.categorie_permis} onChange={(e) => setNouveauUser({ ...nouveauUser, categorie_permis: e.target.value.toUpperCase() })} placeholder="EX: A ou B" className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold uppercase text-slate-900 text-xs shadow-xs" />
                    </div>
                    <div>
                      <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Numéro de permis</label>
                      <input type="text" disabled={enTrainDeSauvegarder} value={nouveauUser.numero_permis} onChange={(e) => setNouveauUser({ ...nouveauUser, numero_permis: e.target.value.toUpperCase() })} placeholder="EX: 123456789" className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold uppercase text-slate-900 text-xs shadow-xs" />
                    </div>
                  </div>
                </div>
              )}

              {!estModeLivraison && (
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Attribuer une Caisse</label>
                  <select disabled={enTrainDeSauvegarder} value={nouveauUser.id_caisse} onChange={(e) => setNouveauUser({ ...nouveauUser, id_caisse: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs truncate">
                    <option value="">-- Aucune caisse --</option>
                    {caisses.map((c) => (<option key={c.id} value={c.id}>💵 {c.nom_caisse}</option>))}
                  </select>
                </div>
              )}

              {nouveauUser.acces_application && (
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Mot de Passe de Connexion *</label>
                  <div className="relative flex items-center">
                    <input 
                      type={afficherMotDePasse ? "text" : "password"} 
                      disabled={enTrainDeSauvegarder}
                      required={nouveauUser.acces_application} 
                      value={nouveauUser.mot_de_passe} 
                      onChange={(e) => setNouveauUser({ ...nouveauUser, mot_de_passe: e.target.value })} 
                      placeholder="••••••••" 
                      autoComplete="new-password"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 pr-8 font-mono font-extrabold text-slate-900 text-xs shadow-xs" 
                    />
                    <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setAfficherMotDePasse(!afficherMotDePasse)} className="absolute right-2 text-slate-500 hover:text-slate-800 text-xs focus:outline-none">
                      {afficherMotDePasse ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Pays</label>
                  <select disabled={enTrainDeSauvegarder} value={nouveauUser.pays} onChange={(e) => setNouveauUser({ ...nouveauUser, pays: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-[11px] shadow-xs">
                    {LISTE_PAYS.map((p) => (<option key={p.code} value={p.code}>{p.code.toUpperCase()}</option>))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Téléphone ({paysActuelObj.longueur} chiffres)</label>
                  <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden shadow-xs">
                    <span className="bg-slate-100 px-2 py-1.5 text-[11px] font-black text-slate-800 border-r border-slate-300 shrink-0">{paysActuelObj.indicatif}</span>
                    <input type="text" disabled={enTrainDeSauvegarder} maxLength={paysActuelObj.longueur} value={nouveauUser.telephone} onChange={gererSaisieTelephone} placeholder="6XXXXXXXX" className="w-full p-1.5 font-mono text-[11px] font-extrabold text-slate-900 focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Email (minuscules)</label>
                  <input type="email" disabled={enTrainDeSauvegarder} value={nouveauUser.email} onChange={(e) => setNouveauUser({ ...nouveauUser, email: e.target.value.toLowerCase() })} placeholder="collaborateur@keita.cm" className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold lowercase text-slate-900 text-[11px] shadow-xs placeholder:text-slate-400" />
                </div>
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Statut</label>
                  <select disabled={enTrainDeSauvegarder} value={nouveauUser.statut} onChange={(e) => setNouveauUser({ ...nouveauUser, statut: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-[11px] shadow-xs">
                    <option value="ACTIF">🟢 Actif</option>
                    <option value="INACTIF">🔴 Inactif</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button type="submit" disabled={enTrainDeSauvegarder} className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-black px-5 py-2 rounded-lg text-xs shadow-xs transition">
                  Suivant : Droits & Autorisations ➡️
                </button>
              </div>
            </form>
          )}

          {etapeFormulaire === 2 && (
            <form onSubmit={enregistrerUtilisateurDefinitif} className="space-y-3">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <p className="font-black text-slate-900 text-xs">Collaborateur : {nouveauUser.nom_complet} {nouveauUser.prenom}</p>
                  <p className="text-[9.5px] text-slate-500 font-bold">Rôle : {roles.find(r => String(r.id) === String(nouveauUser.id_role))?.nom_role || 'Non défini'}</p>
                </div>
                <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setEtapeFormulaire(1)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-2.5 py-1 rounded text-[10px]">
                  ⬅️ Modifier les infos
                </button>
              </div>

              {nouveauUser.acces_application ? (
                <div className="space-y-2">
                  <h5 className="font-black text-slate-900 text-[10px] uppercase">🔐 Droits & Permissions par Module :</h5>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 text-[10px] uppercase font-black sticky top-0">
                        <tr>
                          <th className="p-2">Module</th>
                          <th className="p-2 text-center">👁️</th>
                          <th className="p-2 text-center">➕</th>
                          <th className="p-2 text-center">✏️</th>
                          <th className="p-2 text-center">🗑️</th>
                          <th className="p-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[10px]">
                        {modulesApp.map((m) => {
                          const p = nouveauUser.permissions[m.id] || { lecture: false, creation: false, modification: false, suppression: false };
                          const estToutAccorde = p.lecture && p.creation && p.modification && p.suppression;
                          return (
                            <tr key={m.id} className="hover:bg-slate-50">
                              <td className="p-2 font-black text-slate-950">{m.nom}</td>
                              <td className="p-2 text-center"><input type="checkbox" disabled={enTrainDeSauvegarder} checked={p.lecture} onChange={() => togglePermission(m.id, 'lecture')} className="w-4 h-4 accent-orange-600 rounded cursor-pointer" /></td>
                              <td className="p-2 text-center"><input type="checkbox" disabled={enTrainDeSauvegarder} checked={p.creation} onChange={() => togglePermission(m.id, 'creation')} className="w-4 h-4 accent-emerald-600 rounded cursor-pointer" /></td>
                              <td className="p-2 text-center"><input type="checkbox" disabled={enTrainDeSauvegarder} checked={p.modification} onChange={() => togglePermission(m.id, 'modification')} className="w-4 h-4 accent-blue-600 rounded cursor-pointer" /></td>
                              <td className="p-2 text-center"><input type="checkbox" disabled={enTrainDeSauvegarder} checked={p.suppression} onChange={() => togglePermission(m.id, 'suppression')} className="w-4 h-4 accent-red-600 rounded cursor-pointer" /></td>
                              <td className="p-2 text-center">
                                <button type="button" disabled={enTrainDeSauvegarder} onClick={() => accorderToutModule(m.id, !estToutAccorde)} className={`px-1.5 py-1 rounded text-[9px] font-black ${estToutAccorde ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                                  {estToutAccorde ? 'Aucun' : 'Tous'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-blue-900 font-bold text-center text-xs">
                  ℹ️ L'accès à l'application n'est pas coché pour ce collaborateur (Personnel de terrain / pas de consommation de licence).
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setEtapeFormulaire(1)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded text-[10px]">
                  ⬅️ Précédent
                </button>
                <div className="flex items-center gap-1.5">
                  {userEnEdition && (<button type="button" disabled={enTrainDeSauvegarder} onClick={supprimerUtilisateur} className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black px-3 py-1.5 rounded text-[10px] shadow-xs">🗑️ Supprimer</button>)}
                  <button type="submit" disabled={enTrainDeSauvegarder} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black px-4 py-1.5 rounded text-[10px] shadow-xs">
                    {enTrainDeSauvegarder ? 'Enregistrement...' : (userEnEdition ? 'Mettre à jour' : 'Valider & Enregistrer')}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {!afficherForm && (
        <>
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <input type="text" disabled={enTrainDeSauvegarder} value={recherche} onChange={(e) => setRecherche(e.target.value.toUpperCase())} placeholder="RECHERCHER PAR NOM OU EMAIL..." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-extrabold uppercase text-slate-900 text-xs focus:outline-none shadow-xs placeholder:text-slate-400" />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-700 px-1 font-black">
            <span>Total répertorié : <strong>{usersFiltres.length}</strong> personne(s)</span>
          </div>

          {chargement ? (
            <div className="p-4 text-center text-slate-500 font-bold">Chargement...</div>
          ) : usersFiltres.length === 0 ? (
            <div className="p-4 text-center text-slate-500 bg-white border border-slate-200 rounded-xl font-bold">Aucun enregistrement trouvé.</div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase text-[9px] font-black select-none">
                  <tr>
                    <th className="p-2.5 w-10 text-center">Avatar</th>
                    <th onClick={() => !enTrainDeSauvegarder && gererTri('nom_complet')} className="p-2.5 cursor-pointer hover:bg-slate-200">Nom & Prénom {rendreFlecheTri('nom_complet')}</th>
                    <th onClick={() => !enTrainDeSauvegarder && gererTri('role')} className="p-2.5 cursor-pointer hover:bg-slate-200">Rôle {rendreFlecheTri('role')}</th>
                    <th className="p-2.5 text-center">Type d'accès</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px]">
                  {usersFiltres.map((u) => {
                    const roleTrouve = roles.find((r) => String(r.id) === String(u.id_role));
                    const aAcces = u.acces_application ?? true;
                    return (
                      <tr key={u.id} onClick={() => !enTrainDeSauvegarder && ouvrirEdition(u)} className="hover:bg-orange-50/70 cursor-pointer transition select-none">
                        <td className="p-2.5 text-center">
                          <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 mx-auto overflow-hidden flex items-center justify-center">
                            {u.photo ? (
                              <img src={u.photo} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              <span className="text-[9px] font-bold text-slate-500">👤</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 font-black uppercase text-slate-900">
                          {u.nom_complet} {u.prenom ? u.prenom : ''}
                        </td>
                        <td className="p-2.5">
                          <span className="inline-block bg-orange-100 text-orange-900 border border-orange-200 px-2 py-0.5 rounded font-black text-[9.5px] whitespace-nowrap">
                            🛡️ {roleTrouve ? roleTrouve.nom_role : 'Aucun'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded font-black text-[9.5px] border whitespace-nowrap ${aAcces ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
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