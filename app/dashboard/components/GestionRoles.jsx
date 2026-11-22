'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { localSync } from '../../lib/localSync';

export default function GestionRoles({ entrepriseId = '4TS-TEST', isDarkMode = false }) {
  const [roles, setRoles] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [roleEnEdition, setRoleEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  // États pour le mode hors ligne & synchronisation
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  const [limiteRoles, setLimiteRoles] = useState(20);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  const [triCol, setTriCol] = useState('nom_role');
  const [triOrdre, setTriOrdre] = useState('asc');

  const [roleNomConnecte, setRoleNomConnecte] = useState('');

  // 🔒 État pour suivre le nombre d'utilisateurs rattachés au rôle en cours d'édition
  const [nbUtilisateursRattaches, setNbUtilisateursRattaches] = useState(0);

  // 🔔 ÉTAT UNIFIÉ POUR LES MODALES DE CONFIRMATION ET NOTIFICATION
  const [etatModale, setEtatModale] = useState({
    ouverte: false,
    titre: '',
    message: '',
    type: 'info', // 'confirmation', 'succes', 'erreur', 'info'
    onConfirmer: null
  });
  
  // 🏪 Tables exclusives au module Boutique / Ventes (avec Gestion des Tables)
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
    { id: 'plan_comptable', nom: '📚 Plan Comptable' },
    { id: 'taxes_ristournes', nom: '🏷️ Taxes & Promos' },
    { id: 'roles_utilisateurs', nom: '🔑 Rôles & Personnel' }
  ];

  // 🚚 Tables exclusives au module Livraison / Transport
  const modulesLivraison = [
    { id: 'commandes_livraison', nom: '📦 Commandes & Livraisons' },
    { id: 'grille_tarifaire', nom: '🗺️ Grille Tarifaire Livraison' },
    { id: 'emplacements_stock', nom: '📍 Emplacements Livreurs' },
    { id: 'depots_stock', nom: '🏢 Dépôts & Magasins' },
    { id: 'articles_stock', nom: '📦 Stock Articles' },
    { id: 'familles_articles', nom: '🗂️ Familles d\'Articles' },
    { id: 'challenges_commerciaux', nom: '🏆 Challenges Commerciaux' },
    { id: 'mouvements_stock', nom: '🔄 Mouvement Stock' },
    { id: 'approvisionnements', nom: '📥 Achats & Approvisionnement' },
    { id: 'fournisseurs', nom: '🤝 Gestion Partenaire' },
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
  const estLivraison = moduleActuel === 'LIVRAISON';
  
  const modulesApp = estTontine ? modulesTontine : (estLivraison ? modulesLivraison : modulesBoutique);
  const cleCacheRoles = `roles_${entrepriseId}_${moduleActuel}`;

  const initialiserPermissionsDefaut = () => {
    const perms = {};
    modulesApp.forEach((m) => {
      perms[m.id] = { lecture: false, creation: false, modification: false, suppression: false };
    });
    return perms;
  };

  const [nouveauRole, setNouveauRole] = useState({
    nom_role: '',
    description: '',
    permissions: initialiserPermissionsDefaut(),
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      verifierEtSynchroniserFileAttente();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    mettreAJourCompteurFileAttente();
    chargerRolesEtPermissions();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [entrepriseId, moduleActuel]);

  const mettreAJourCompteurFileAttente = () => {
    try {
      const queue = JSON.parse(localStorage.getItem(`4ts_roles_queue_${entrepriseId}_${moduleActuel}`) || '[]');
      setPendingActionsCount(queue.length);
    } catch (e) {
      setPendingActionsCount(0);
    }
  };

  const ajouterActionHorsLigne = (typeAction, payload) => {
    try {
      const queue = JSON.parse(localStorage.getItem(`4ts_roles_queue_${entrepriseId}_${moduleActuel}`) || '[]');
      queue.push({ id: Date.now(), type: typeAction, payload, timestamp: new Date().toISOString() });
      localStorage.setItem(`4ts_roles_queue_${entrepriseId}_${moduleActuel}`, JSON.stringify(queue));
      mettreAJourCompteurFileAttente();
    } catch (err) {
      console.error('Erreur mise en cache hors ligne rôles :', err);
    }
  };

  const verifierEtSynchroniserFileAttente = async () => {
    if (!navigator.onLine) return;
    try {
      const queue = JSON.parse(localStorage.getItem(`4ts_roles_queue_${entrepriseId}_${moduleActuel}`) || '[]');
      if (queue.length === 0) return;

      const resteQueue = [];

      for (const action of queue) {
        try {
          if (action.type === 'INSERT_ROLE') {
            const { error } = await supabase.from('roles').insert([action.payload]);
            if (error) throw error;
          } else if (action.type === 'UPDATE_ROLE') {
            const { error } = await supabase.from('roles').update(action.payload.data).eq('id', action.payload.id);
            if (error) throw error;
          } else if (action.type === 'DELETE_ROLE') {
            const { error } = await supabase.from('roles').delete().eq('id', action.payload.id);
            if (error) throw error;
          }
        } catch (err) {
          resteQueue.push(action);
        }
      }

      localStorage.setItem(`4ts_roles_queue_${entrepriseId}_${moduleActuel}`, JSON.stringify(resteQueue));
      mettreAJourCompteurFileAttente();
      if (resteQueue.length === 0) {
        chargerRolesEtPermissions();
      }
    } catch (err) {
      console.error('Erreur globale synchronisation rôles :', err);
    }
  };

  const chargerRolesEtPermissions = async () => {
    const rolesLocaux = localSync.recupererDonneesLocales(cleCacheRoles);
    if (rolesLocaux && rolesLocaux.length > 0) {
      setRoles(rolesLocaux);
      setChargement(false);
    } else {
      setChargement(true);
    }

    try {
      const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
      if (utilisateurConnecteStr) {
        const userObj = JSON.parse(utilisateurConnecteStr);
        const nomRoleUser = (userObj.nom_role || userObj.role || '').trim().toUpperCase();
        setRoleNomConnecte(nomRoleUser);
      }

      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (error) throw error;
      let listRoles = data || [];

      const adminExiste = listRoles.some(r => (r.nom_role || '').trim().toUpperCase() === 'ADMINISTRATEUR');

      if (!adminExiste) {
        const payloadAdmin = {
          id_entreprise: entrepriseId,
          module: moduleActuel,
          nom_role: 'ADMINISTRATEUR',
          description: 'Rôle système administrateur avec tous les droits par défaut.',
          permissions: { _plein_acces: true }
        };

        if (navigator.onLine) {
          const { data: newAdmin, error: errAdmin } = await supabase
            .from('roles')
            .insert([payloadAdmin])
            .select()
            .single();

          if (!errAdmin && newAdmin) {
            listRoles = [newAdmin, ...listRoles];
          }
        }
      }

      setRoles(listRoles);
      localSync.sauvegarderDonneesLocales(cleCacheRoles, listRoles);
    } catch (err) {
      console.error('Erreur chargement rôles Supabase :', err.message);
      if (!rolesLocaux || rolesLocaux.length === 0) {
        setRoles([]);
      }
    } finally {
      setChargement(false);
    }
  };

  const togglePermissionRole = (moduleId, action) => {
    setNouveauRole((prev) => {
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

  const accorderToutModuleRole = (moduleId, toutAccorder) => {
    setNouveauRole((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: { lecture: toutAccorder, creation: toutAccorder, modification: toutAccorder, suppression: toutAccorder },
      },
    }));
  };

  const aSubiDesModifications = () => {
    if (!roleEnEdition) return true;
    
    const nomActuel = (nouveauRole.nom_role || '').trim();
    const nomOrigine = (roleEnEdition.nom_role || '').trim();
    const descActuelle = (nouveauRole.description || '').trim();
    const descOrigine = (roleEnEdition.description || '').trim();

    if (nomActuel !== nomOrigine || descActuelle !== descOrigine) return true;

    const permOrigine = roleEnEdition.permissions || {};
    const permActuelle = nouveauRole.permissions || {};

    const tousModulesIds = modulesApp.map(m => m.id);
    for (const modId of tousModulesIds) {
      const po = permOrigine[modId] || { lecture: false, creation: false, modification: false, suppression: false };
      const pa = permActuelle[modId] || { lecture: false, creation: false, modification: false, suppression: false };

      if (po.lecture !== pa.lecture || po.creation !== pa.creation || po.modification !== pa.modification || po.suppression !== pa.suppression) {
        return true;
      }
    }

    return false;
  };

  const enregistrerRole = (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    const nomSaisi = nouveauRole.nom_role.trim().toUpperCase();
    if (!nomSaisi) {
      setEtatModale({
        ouverte: true,
        titre: '⚠️ Champ requis',
        message: 'Veuillez renseigner le nom du rôle.',
        type: 'erreur',
        onConfirmer: null
      });
      return;
    }

    setEtatModale({
      ouverte: true,
      titre: 'Confirmation requise',
      message: `Voulez-vous vraiment ${roleEnEdition ? 'mettre à jour' : 'créer'} le rôle "${nomSaisi}" ?`,
      type: 'confirmation',
      onConfirmer: () => executerEnregistrementRole(nomSaisi)
    });
  };

  const executerEnregistrementRole = async (nomSaisi) => {
    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        nom_role: nomSaisi,
        description: nouveauRole.description || '',
        permissions: nouveauRole.permissions,
      };

      const rolesSystemeInterditsModification = ['ADMINISTRATEUR'];

      if (roleEnEdition) {
        const nomRoleAncien = (roleEnEdition.nom_role || '').trim().toUpperCase();
        if (rolesSystemeInterditsModification.includes(nomRoleAncien) && nomSaisi !== nomRoleAncien) {
          setEtatModale({
            ouverte: true,
            titre: '❌ Action interdite',
            message: `Impossible de renommer le rôle système ${nomRoleAncien}.`,
            type: 'erreur',
            onConfirmer: null
          });
          setEnTrainDeSauvegarder(false);
          return;
        }

        if (!navigator.onLine) {
          ajouterActionHorsLigne('UPDATE_ROLE', { id: roleEnEdition.id, data: payload });
          const majRoles = roles.map(r => r.id === roleEnEdition.id ? { ...r, ...payload } : r);
          setRoles(majRoles);
          localSync.sauvegarderDonneesLocales(cleCacheRoles, majRoles);
          setEtatModale({
            ouverte: true,
            titre: '📴 Mode Hors Ligne',
            message: 'Rôle mis à jour localement avec succès.',
            type: 'succes',
            onConfirmer: null
          });
          annulerForm();
          setEnTrainDeSauvegarder(false);
          return;
        }

        const { error } = await supabase
          .from('roles')
          .update(payload)
          .eq('id', roleEnEdition.id);

        if (error) throw error;

        setRoles(prev => prev.map(r => r.id === roleEnEdition.id ? { ...r, ...payload } : r));
        setEtatModale({
          ouverte: true,
          titre: '✅ Succès',
          message: 'Rôle et permissions mis à jour avec succès !',
          type: 'succes',
          onConfirmer: null
        });
      } else {
        const existeDeja = roles.some(r => (r.nom_role || '').trim().toUpperCase() === nomSaisi);
        if (existeDeja) {
          setEtatModale({
            ouverte: true,
            titre: '⚠️ Doublon',
            message: 'Ce rôle existe déjà.',
            type: 'erreur',
            onConfirmer: null
          });
          setEnTrainDeSauvegarder(false);
          return;
        }

        if (!navigator.onLine) {
          const fakeId = 'local_' + Date.now();
          const roleLocal = { ...payload, id: fakeId, created_at: new Date().toISOString() };
          ajouterActionHorsLigne('INSERT_ROLE', roleLocal);
          const majRoles = [roleLocal, ...roles];
          setRoles(majRoles);
          localSync.sauvegarderDonneesLocales(cleCacheRoles, majRoles);
          setEtatModale({
            ouverte: true,
            titre: '📴 Mode Hors Ligne',
            message: 'Rôle créé localement avec succès.',
            type: 'succes',
            onConfirmer: null
          });
          annulerForm();
          setEnTrainDeSauvegarder(false);
          return;
        }

        const { error, data } = await supabase.from('roles').insert([payload]).select().single();
        if (error) throw error;

        if (data) {
          setRoles(prev => [data, ...prev.filter(r => r.id !== data.id)]);
        }
        setEtatModale({
          ouverte: true,
          titre: '✅ Succès',
          message: 'Rôle créé avec succès !',
          type: 'succes',
          onConfirmer: null
        });
      }

      localStorage.removeItem(cleCacheRoles);
      annulerForm();
      await chargerRolesEtPermissions();
    } catch (err) {
      setEtatModale({
        ouverte: true,
        titre: '❌ Erreur',
        message: err.message,
        type: 'erreur',
        onConfirmer: null
      });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = async (role) => {
    if (enTrainDeSauvegarder) return;
    setRoleEnEdition(role);
    setNouveauRole({
      nom_role: role.nom_role || '',
      description: role.description || '',
      permissions: { ...initialiserPermissionsDefaut(), ...(role.permissions || {}) },
    });
    setNbUtilisateursRattaches(0);
    setAfficherForm(true);

    try {
      const { data: tousLesUsers, error } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      if (!error && tousLesUsers) {
        const idRoleStr = String(role.id);
        const nomRoleStr = String(role.nom_role || '').trim().toUpperCase();

        const count = tousLesUsers.filter((u) => {
          const valIdRole = String(u.id_role || u.role_id || '');
          const valNomRole = String(u.nom_role || u.role || '').trim().toUpperCase();
          return valIdRole === idRoleStr || valNomRole === nomRoleStr;
        }).length;

        setNbUtilisateursRattaches(count);
      }
    } catch (err) {
      console.error('Erreur vérification utilisateurs rattachés :', err);
    }
  };

  const annulerForm = () => {
    if (enTrainDeSauvegarder) return;
    setRoleEnEdition(null);
    setNouveauRole({
      nom_role: '',
      description: '',
      permissions: initialiserPermissionsDefaut(),
    });
    setNbUtilisateursRattaches(0);
    setAfficherForm(false);
  };

  const demanderSuppressionRole = () => {
    if (enTrainDeSauvegarder || !roleEnEdition) return;

    const nomRoleCible = (roleEnEdition.nom_role || '').trim().toUpperCase();
    const rolesSystemeInterditsSuppression = ['ADMINISTRATEUR'];

    if (rolesSystemeInterditsSuppression.includes(nomRoleCible)) {
      setEtatModale({
        ouverte: true,
        titre: '❌ Suppression interdite',
        message: `Le rôle système ${nomRoleCible} ne peut pas être supprimé.`,
        type: 'erreur',
        onConfirmer: null
      });
      return;
    }

    if (nbUtilisateursRattaches > 0) {
      setEtatModale({
        ouverte: true,
        titre: '❌ Suppression bloquée',
        message: `Ce rôle est rattaché à ${nbUtilisateursRattaches} utilisateur(s). Il ne peut pas être supprimé.`,
        type: 'erreur',
        onConfirmer: null
      });
      return;
    }

    if (!navigator.onLine) {
      setEtatModale({
        ouverte: true,
        titre: '⚠️ Action impossible',
        message: 'Impossible de supprimer un rôle en mode hors ligne.',
        type: 'erreur',
        onConfirmer: null
      });
      return;
    }

    setEtatModale({
      ouverte: true,
      titre: '🗑️ Confirmer la suppression',
      message: `Voulez-vous vraiment supprimer définitivement le rôle "${roleEnEdition.nom_role}" ?`,
      type: 'confirmation',
      onConfirmer: executerSuppressionRole
    });
  };

  const executerSuppressionRole = async () => {
    setEnTrainDeSauvegarder(true);
    try {
      const { error } = await supabase.from('roles').delete().eq('id', roleEnEdition.id);
      if (error) throw error;

      setRoles(prev => prev.filter(r => r.id !== roleEnEdition.id));
      localStorage.removeItem(cleCacheRoles);

      setEtatModale({
        ouverte: true,
        titre: '✅ Succès',
        message: 'Rôle supprimé avec succès.',
        type: 'succes',
        onConfirmer: null
      });
      annulerForm();
      await chargerRolesEtPermissions();
    } catch (err) {
      setEtatModale({
        ouverte: true,
        titre: '❌ Erreur',
        message: err.message,
        type: 'erreur',
        onConfirmer: null
      });
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

  const rolesFiltres = roles
    .filter((r) => {
      const nom = (r.nom_role || '').toLowerCase();
      const query = recherche.toLowerCase();
      return nom.includes(query);
    })
    .sort((a, b) => {
      let valA = a.nom_role || '';
      let valB = b.nom_role || '';
      if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
      return 0;
    });

  const rolesAffiches = rolesFiltres.slice(0, limiteRoles);
  const rolesSystemeInterditsModification = ['ADMINISTRATEUR'];

  const modalBg = isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-2xl' : 'bg-white border-[#0d2347]/30 text-[#0d2347] shadow-2xl';
  const modalTitleColor = isDarkMode ? 'text-slate-100' : 'text-[#0d2347]';
  const modalMessageColor = isDarkMode ? 'text-slate-300' : 'text-slate-700';

  const modificationsApportees = aSubiDesModifications();
  const suppressionBloquee = nbUtilisateursRattaches > 0;

  return (
    <div className="space-y-2.5 text-[11px] font-sans w-full max-w-full overflow-hidden relative">
      
      <div className={`flex justify-between items-center px-3 py-1 rounded-lg text-[10px] font-bold ${isOnline ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
        <div className="flex items-center gap-1.5">
          <span>{isOnline ? '🟢' : '🔴'}</span>
          <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>
        </div>
        {pendingActionsCount > 0 && (
          <button 
            type="button" 
            onClick={verifierEtSynchroniserFileAttente}
            className="bg-amber-600 hover:bg-amber-500 text-white px-2 py-0.5 rounded font-black uppercase text-[9px] cursor-pointer flex items-center gap-1"
          >
            <span>🔄</span> <span>({pendingActionsCount})</span>
          </button>
        )}
      </div>

      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <h3 className="font-extrabold text-slate-900 uppercase text-xs truncate flex items-center gap-1.5">
            <span>🛡️</span> RÔLES ({rolesAffiches.length} / {rolesFiltres.length})
          </h3>
          {roleNomConnecte && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200 shrink-0 hidden sm:inline">
              Rôle : {roleNomConnecte}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => {
            if (enTrainDeSauvegarder) return;
            setNouveauRole({ nom_role: '', description: '', permissions: initialiserPermissionsDefaut() });
            setRoleEnEdition(null);
            setNbUtilisateursRattaches(0);
            setAfficherForm(true);
          }}
          className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs shrink-0 cursor-pointer"
        >
          ＋ Nouveau Rôle
        </button>
      </div>

      {afficherForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white border-2 border-orange-500/70 p-4 sm:p-6 rounded-2xl space-y-4 shadow-2xl max-h-[96vh] w-full max-w-4xl overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h4 className="font-black text-orange-600 uppercase text-xs sm:text-sm">
                {roleEnEdition ? '✏️ MODIFIER LE RÔLE & SES PERMISSIONS' : '➕ CRÉER UN NOUVEAU RÔLE & PERMISSIONS'}
              </h4>
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={annulerForm}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1 cursor-pointer"
              >
                ✖
              </button>
            </div>

            <form onSubmit={enregistrerRole} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="w-full sm:w-1/3">
                  <label className="block font-black mb-1 text-[10px] text-slate-700 uppercase">Nom du Rôle *</label>
                  <input
                    type="text"
                    required
                    disabled={enTrainDeSauvegarder || (roleEnEdition && rolesSystemeInterditsModification.includes((roleEnEdition.nom_role || '').trim().toUpperCase()))}
                    value={nouveauRole.nom_role}
                    onChange={(e) => setNouveauRole({ ...nouveauRole, nom_role: e.target.value.toUpperCase() })}
                    placeholder="EX: GESTIONNAIRE..."
                    className="w-full border border-slate-300 rounded-lg p-2 font-extrabold uppercase text-xs shadow-xs bg-white text-slate-900 disabled:bg-slate-100"
                  />
                </div>
                <div className="w-full sm:w-2/3">
                  <label className="block font-black mb-1 text-[10px] text-slate-700 uppercase">Description</label>
                  <input
                    type="text"
                    disabled={enTrainDeSauvegarder}
                    value={nouveauRole.description}
                    onChange={(e) => setNouveauRole({ ...nouveauRole, description: e.target.value })}
                    placeholder="Description détaillée des attributions de ce rôle..."
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs shadow-xs bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h5 className="font-black text-[#0d2347] text-xs uppercase flex items-center gap-1.5">
                  <span>🔒</span> Matrice des Droits par Module ({moduleActuel}) :
                </h5>
                
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs max-h-[55vh]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0d2347] text-white border-b border-slate-300 text-[10px] uppercase font-black sticky top-0 z-10">
                      <tr>
                        <th className="p-3">Module / Table</th>
                        <th className="p-3 text-center">👁️ Lecture</th>
                        <th className="p-3 text-center">➕ Création</th>
                        <th className="p-3 text-center">✏️ Modif.</th>
                        <th className="p-3 text-center">🗑️ Suppr.</th>
                        <th className="p-3 text-center">Action Rapide</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {modulesApp.map((m) => {
                        const p = nouveauRole.permissions[m.id] || { lecture: false, creation: false, modification: false, suppression: false };
                        const estToutAccorde = p.lecture && p.creation && p.modification && p.suppression;
                        return (
                          <tr key={m.id} className="hover:bg-slate-50 transition">
                            <td className="p-2.5 font-extrabold text-slate-950">{m.nom}</td>
                            <td className="p-2.5 text-center"><input type="checkbox" disabled={enTrainDeSauvegarder} checked={p.lecture} onChange={() => togglePermissionRole(m.id, 'lecture')} className="w-4 h-4 accent-orange-600 rounded cursor-pointer" /></td>
                            <td className="p-2.5 text-center"><input type="checkbox" disabled={enTrainDeSauvegarder} checked={p.creation} onChange={() => togglePermissionRole(m.id, 'creation')} className="w-4 h-4 accent-emerald-600 rounded cursor-pointer" /></td>
                            <td className="p-2.5 text-center"><input type="checkbox" disabled={enTrainDeSauvegarder} checked={p.modification} onChange={() => togglePermissionRole(m.id, 'modification')} className="w-4 h-4 accent-blue-600 rounded cursor-pointer" /></td>
                            <td className="p-2.5 text-center"><input type="checkbox" disabled={enTrainDeSauvegarder} checked={p.suppression} onChange={() => togglePermissionRole(m.id, 'suppression')} className="w-4 h-4 accent-red-600 rounded cursor-pointer" /></td>
                            <td className="p-2.5 text-center">
                              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => accorderToutModuleRole(m.id, !estToutAccorde)} className={`px-2 py-1 rounded text-[9.5px] font-black cursor-pointer shadow-2xs ${estToutAccorde ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
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

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center gap-3">
                {roleEnEdition && !rolesSystemeInterditsModification.includes((roleEnEdition.nom_role || '').trim().toUpperCase()) ? (
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={enTrainDeSauvegarder || suppressionBloquee}
                      onClick={demanderSuppressionRole}
                      title={suppressionBloquee ? `Impossible : ${nbUtilisateursRattaches} utilisateur(s) rattaché(s)` : 'Supprimer le rôle'}
                      className={`font-black px-4 py-2 rounded-xl text-xs shadow-md transition ${
                        suppressionBloquee 
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-400' 
                          : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                      }`}
                    >
                      {enTrainDeSauvegarder ? 'Patientez...' : '🗑️ Supprimer le rôle'}
                    </button>
                    {suppressionBloquee && (
                      <span className="text-[9px] text-rose-600 font-bold">
                        ⚠️ Rattaché à {nbUtilisateursRattaches} utilisateur(s)
                      </span>
                    )}
                  </div>
                ) : <div />}
                
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    disabled={enTrainDeSauvegarder}
                    onClick={annulerForm}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    disabled={enTrainDeSauvegarder || !modificationsApportees} 
                    className={`font-black px-5 py-2 rounded-xl text-xs shadow-md transition ${
                      !modificationsApportees 
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-400' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    }`}
                  >
                    {enTrainDeSauvegarder ? 'Enregistrement...' : (roleEnEdition ? 'Mettre à jour' : 'Enregistrer')}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* LISTE DES RÔLES ENREGISTRÉS */}
      <>
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
          <input
            type="text"
            disabled={enTrainDeSauvegarder}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value.toUpperCase())}
            placeholder="RECHERCHER UN RÔLE..."
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-extrabold uppercase text-slate-900 text-xs focus:outline-none shadow-xs placeholder:text-slate-400"
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-700 px-1 font-black">
          <span>Répertoire : <strong>{rolesAffiches.length} / {rolesFiltres.length}</strong> rôle(s)</span>
        </div>

        {chargement ? (
          <div className="p-4 text-center text-slate-500 font-bold">Chargement...</div>
        ) : rolesAffiches.length === 0 ? (
          <div className="p-4 text-center text-slate-500 bg-white border border-slate-200 rounded-xl font-bold">
            Aucun rôle personnalisé enregistré. Cliquez sur "＋ Nouveau Rôle".
          </div>
        ) : (
          <div className="space-y-2">
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs w-full">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase text-[9px] font-black select-none">
                  <tr>
                    <th onClick={() => !enTrainDeSauvegarder && gererTri('nom_role')} className="p-2.5 cursor-pointer hover:bg-slate-200 transition w-1/3">
                      Intitulé {rendreFlecheTri('nom_role')}
                    </th>
                    <th className="p-2.5 w-1/2">Description</th>
                    <th className="p-2.5 text-center w-1/6">Modules</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px]">
                  {rolesAffiches.map((r) => {
                    const nomRoleUpper = (r.nom_role || '').trim().toUpperCase();
                    const estAdmin = nomRoleUpper === 'ADMINISTRATEUR';
                    const nbModulesActifs = estAdmin ? modulesApp.length : Object.values(r.permissions || {}).filter(p => p.lecture).length;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => !enTrainDeSauvegarder && ouvrirEdition(r)}
                        className="hover:bg-orange-50/70 cursor-pointer transition select-none"
                        title="Cliquer pour modifier"
                      >
                        <td className="p-2.5 font-extrabold uppercase text-slate-900 w-1/3 truncate">
                          <span className={`${estAdmin ? 'bg-indigo-100 text-indigo-900 border-indigo-200' : 'bg-slate-100 text-slate-900 border-slate-200'} border px-2 py-0.5 rounded font-black text-[9.5px] inline-block truncate max-w-full`}>
                            {estAdmin ? '👑' : '🛡️'} {r.nom_role}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 font-medium w-1/2 truncate max-w-[150px] sm:max-w-xs">
                          {r.description || 'Aucune description'}
                        </td>
                        <td className="p-2.5 text-center w-1/6">
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-black text-[9px]">
                            {estAdmin ? 'Tous' : nbModulesActifs}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {limiteRoles < rolesFiltres.length && (
              <div className="text-center pt-2 pb-2">
                <button
                  type="button"
                  disabled={enTrainDeSauvegarder}
                  onClick={() => setLimiteRoles(prev => prev + 20)}
                  className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-xs border border-slate-300 w-full cursor-pointer"
                >
                  📥 Charger plus ({rolesFiltres.length - limiteRoles} restants)
                </button>
              </div>
            )}
          </div>
        )}
      </>

      {etatModale.ouverte && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`${modalBg} rounded-2xl border max-w-sm w-full p-5 space-y-4 text-center transition-colors`}>
            
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black ${
              etatModale.type === 'confirmation' ? 'bg-amber-100 text-amber-600' :
              etatModale.type === 'succes' ? 'bg-emerald-100 text-emerald-600' :
              etatModale.type === 'erreur' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {etatModale.type === 'confirmation' ? '❓' :
               etatModale.type === 'succes' ? '✓' :
               etatModale.type === 'erreur' ? '⚠️' : 'ℹ️'}
            </div>

            <div className="space-y-1">
              <h4 className={`font-black text-sm uppercase tracking-wider ${modalTitleColor}`}>
                {etatModale.titre}
              </h4>
              <p className={`text-xs font-medium leading-relaxed ${modalMessageColor}`}>
                {etatModale.message}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              {etatModale.type === 'confirmation' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                    className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer ${
                      isDarkMode 
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' 
                        : 'bg-slate-200 hover:bg-slate-300 text-[#0d2347]'
                    }`}
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
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black py-2.5 rounded-xl text-xs shadow-md transition cursor-pointer"
                  >
                    Confirmer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                  className={`w-full font-black py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer ${
                    isDarkMode 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700' 
                      : 'bg-[#0d2347] hover:bg-[#133265] text-white'
                  }`}
                >
                  Compris 👍
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}