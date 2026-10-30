'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { localSync } from '../../lib/localSync';

export default function GestionRoles({ entrepriseId = '4TS-TEST' }) {
  const [roles, setRoles] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [roleEnEdition, setRoleEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  const [limiteRoles, setLimiteRoles] = useState(20);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  const [triCol, setTriCol] = useState('nom_role');
  const [triOrdre, setTriOrdre] = useState('asc');

  const [roleNomConnecte, setRoleNomConnecte] = useState('');
  
  // Droits globaux de l'utilisateur connecté sur le module des rôles
  const [permissionsUser, setPermissionsUser] = useState({
    lecture: true,
    creation: true,
    modification: true,
    suppression: true,
  });

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

  const [nouveauRole, setNouveauRole] = useState({
    nom_role: '',
    description: '',
    permissions: initialiserPermissionsDefaut(),
  });

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const cleCacheRoles = `roles_${entrepriseId}_${moduleActuel}`;

  const chargerRolesEtPermissions = async () => {
    // 1. Chargement instantané depuis le cache local (Zéro attente)
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

      // 2. Chargement Supabase filtré strictement par entreprise et module
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const listRoles = data || [];
      setRoles(listRoles);

      // Mise à jour du cache local propre
      localSync.sauvegarderDonneesLocales(cleCacheRoles, listRoles);
    } catch (err) {
      console.error('Erreur chargement rôles :', err.message);
      if (!rolesLocaux || rolesLocaux.length === 0) {
        setRoles([]);
      }
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerRolesEtPermissions();
    localSync.synchroniserVersCloud(supabase);
  }, [entrepriseId, moduleActuel]);

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

  const enregistrerRole = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    const nomSaisi = nouveauRole.nom_role.trim().toUpperCase();
    if (!nomSaisi) {
      alert('⚠️ Veuillez renseigner le nom du rôle.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        nom_role: nomSaisi,
        description: nouveauRole.description || '',
        permissions: nouveauRole.permissions,
      };

      if (roleEnEdition) {
        const { error } = await supabase
          .from('roles')
          .update(payload)
          .eq('id', roleEnEdition.id);

        if (error) throw error;

        setRoles(prev => prev.map(r => r.id === roleEnEdition.id ? { ...r, ...payload } : r));
        alert('Rôle et permissions mis à jour avec succès !');
      } else {
        const existeDeja = roles.some(r => (r.nom_role || '').trim().toUpperCase() === nomSaisi);
        if (existeDeja) {
          alert('⚠️ Ce rôle existe déjà.');
          setEnTrainDeSauvegarder(false);
          return;
        }

        // Insertion sans ID temporaire pour éviter les erreurs de type bigint/UUID sur Supabase
        const { error, data } = await supabase.from('roles').insert([payload]).select().single();
        if (error) throw error;

        if (data) {
          setRoles(prev => [data, ...prev.filter(r => r.id !== data.id)]);
        }
        alert('Rôle créé avec succès !');
      }

      // Suppression et nettoyage de l'ancien cache local
      localStorage.removeItem(cleCacheRoles);

      annulerForm();
      await chargerRolesEtPermissions();
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = (role) => {
    if (enTrainDeSauvegarder) return;
    setRoleEnEdition(role);
    setNouveauRole({
      nom_role: role.nom_role || '',
      description: role.description || '',
      permissions: { ...initialiserPermissionsDefaut(), ...(role.permissions || {}) },
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    if (enTrainDeSauvegarder) return;
    setRoleEnEdition(null);
    setNouveauRole({
      nom_role: '',
      description: '',
      permissions: initialiserPermissionsDefaut(),
    });
    setAfficherForm(false);
  };

  const supprimerRole = async () => {
    if (enTrainDeSauvegarder || !roleEnEdition) return;

    setEnTrainDeSauvegarder(true);
    try {
      const { data: tousLesUsers, error: errUsers } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      if (errUsers) throw errUsers;

      const idRoleStr = String(roleEnEdition.id);
      const nomRoleStr = String(roleEnEdition.nom_role || '').trim().toUpperCase();

      const usersRattaches = (tousLesUsers || []).filter((u) => {
        const valIdRole = String(u.id_role || u.role_id || '');
        const valNomRole = String(u.nom_role || u.role || '').trim().toUpperCase();
        return valIdRole === idRoleStr || valNomRole === nomRoleStr;
      });

      if (usersRattaches.length > 0) {
        alert(`❌ SUPPRESSION BLOQUÉE : Ce rôle ("${roleEnEdition.nom_role}") est affecté à ${usersRattaches.length} utilisateur(s).`);
        setEnTrainDeSauvegarder(false);
        return;
      }

      if (!confirm(`Voulez-vous vraiment supprimer le rôle "${roleEnEdition.nom_role}" ?`)) {
        setEnTrainDeSauvegarder(false);
        return;
      }

      const { error } = await supabase.from('roles').delete().eq('id', roleEnEdition.id);
      if (error) throw error;

      setRoles(prev => prev.filter(r => r.id !== roleEnEdition.id));
      localStorage.removeItem(cleCacheRoles);

      alert('Rôle supprimé avec succès.');
      annulerForm();
      await chargerRolesEtPermissions();
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

  return (
    <div className="space-y-2.5 text-[11px] font-sans w-full max-w-full overflow-hidden">
      
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <h3 className="font-extrabold text-slate-900 uppercase text-xs truncate flex items-center gap-1.5">
            <span>🛡️</span> RÔLES [{moduleActuel}] ({rolesAffiches.length} / {rolesFiltres.length})
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
            if (afficherForm) {
              annulerForm();
            } else {
              setNouveauRole({ nom_role: '', description: '', permissions: initialiserPermissionsDefaut() });
              setRoleEnEdition(null);
              setAfficherForm(true);
            }
          }}
          className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs shrink-0"
        >
          {afficherForm ? '✖' : '＋ Nouveau Rôle'}
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
          📋 Liste ({roles.length})
        </button>
      </div>

      {afficherForm && (
        <form onSubmit={enregistrerRole} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl space-y-3 shadow-md max-h-[75vh] overflow-y-auto w-full">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
            <h4 className="font-black text-orange-600 uppercase text-[11px]">
              {roleEnEdition ? '✏️ Modifier le Rôle & ses Permissions' : '➕ Nouveau Rôle & Permissions'}
            </h4>
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={annulerForm}
              className="text-slate-400 hover:text-slate-700 font-bold text-xs p-0.5"
            >
              ✖
            </button>
          </div>

          {/* Ligne unique pour le Nom du Rôle et la Description */}
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <div className="w-full sm:w-1/3">
              <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Nom du Rôle *</label>
              <input
                type="text"
                required
                disabled={enTrainDeSauvegarder}
                value={nouveauRole.nom_role}
                onChange={(e) => setNouveauRole({ ...nouveauRole, nom_role: e.target.value.toUpperCase() })}
                placeholder="EX: MANAGER..."
                className="w-full border border-slate-300 rounded p-1.5 font-extrabold uppercase text-xs shadow-xs bg-white text-slate-900"
              />
            </div>
            <div className="w-full sm:w-2/3">
              <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Description</label>
              <input
                type="text"
                disabled={enTrainDeSauvegarder}
                value={nouveauRole.description}
                onChange={(e) => setNouveauRole({ ...nouveauRole, description: e.target.value })}
                placeholder="Description détaillée des attributions de ce rôle..."
                className="w-full border border-slate-300 rounded p-1.5 text-xs shadow-xs bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h5 className="font-black text-slate-900 text-[10px] uppercase">🔐 Matrice des Droits par Module :</h5>
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs max-h-56">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 text-[10px] uppercase font-black sticky top-0">
                  <tr>
                    <th className="p-2">Module</th>
                    <th className="p-2 text-center">👁️ Lecture</th>
                    <th className="p-2 text-center">➕ Création</th>
                    <th className="p-2 text-center">✏️ Modif.</th>
                    <th className="p-2 text-center">🗑️ Suppr.</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {modulesApp.map((m) => {
                    const p = nouveauRole.permissions[m.id] || { lecture: false, creation: false, modification: false, suppression: false };
                    const estToutAccorde = p.lecture && p.creation && p.modification && p.suppression;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-2 font-black text-slate-950 truncate max-w-[120px]">{m.nom}</td>
                        <td className="p-2 text-center"><input type="checkbox" disabled={enTrainDeSauvegarder} checked={p.lecture} onChange={() => togglePermissionRole(m.id, 'lecture')} className="w-4 h-4 accent-orange-600 rounded cursor-pointer" /></td>
                        <td className="p-2 text-center"><input type="checkbox" disabled={enTrainDeSauvegarder} checked={p.creation} onChange={() => togglePermissionRole(m.id, 'creation')} className="w-4 h-4 accent-emerald-600 rounded cursor-pointer" /></td>
                        <td className="p-2 text-center"><input type="checkbox" disabled={enTrainDeSauvegarder} checked={p.modification} onChange={() => togglePermissionRole(m.id, 'modification')} className="w-4 h-4 accent-blue-600 rounded cursor-pointer" /></td>
                        <td className="p-2 text-center"><input type="checkbox" disabled={enTrainDeSauvegarder} checked={p.suppression} onChange={() => togglePermissionRole(m.id, 'suppression')} className="w-4 h-4 accent-red-600 rounded cursor-pointer" /></td>
                        <td className="p-2 text-center">
                          <button type="button" disabled={enTrainDeSauvegarder} onClick={() => accorderToutModuleRole(m.id, !estToutAccorde)} className={`px-1.5 py-1 rounded text-[9px] font-black ${estToutAccorde ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
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

          <div className="pt-2 border-t border-slate-200 flex justify-between items-center gap-2">
            {roleEnEdition ? (
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={supprimerRole}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black px-3 py-1.5 rounded text-[10px] shadow-xs shrink-0"
              >
                {enTrainDeSauvegarder ? 'Patientez...' : '🗑️ Supprimer'}
              </button>
            ) : <div />}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={annulerForm}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded text-[10px]"
              >
                Annuler
              </button>
              <button type="submit" disabled={enTrainDeSauvegarder} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black px-4 py-1.5 rounded text-[10px] shadow-xs">
                {enTrainDeSauvegarder ? 'Enregistrement...' : (roleEnEdition ? 'Mettre à jour' : 'Enregistrer')}
              </button>
            </div>
          </div>
        </form>
      )}

      {!afficherForm && (
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
                      const nbModulesActifs = Object.values(r.permissions || {}).filter(p => p.lecture).length;
                      return (
                        <tr
                          key={r.id}
                          onClick={() => !enTrainDeSauvegarder && ouvrirEdition(r)}
                          className="hover:bg-orange-50/70 cursor-pointer transition select-none"
                          title="Cliquer pour modifier"
                        >
                          <td className="p-2.5 font-extrabold uppercase text-slate-900 w-1/3 truncate">
                            <span className="bg-orange-100 text-orange-900 border border-orange-200 px-2 py-0.5 rounded font-black text-[9.5px] inline-block truncate max-w-full">
                              🛡️ {r.nom_role}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600 font-medium w-1/2 truncate max-w-[150px] sm:max-w-xs">
                            {r.description || 'Aucune description'}
                          </td>
                          <td className="p-2.5 text-center w-1/6">
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-black text-[9px]">
                              {nbModulesActifs}
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
                    className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-xs border border-slate-300 w-full"
                  >
                    📥 Charger plus ({rolesFiltres.length - limiteRoles} restants)
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}