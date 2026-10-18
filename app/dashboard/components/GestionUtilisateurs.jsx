'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionUtilisateurs({ entrepriseId = '4TS-TEST' }) {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [userEnEdition, setUserEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  // Liste des modules disponibles dans l'application
  const modulesApp = [
    { id: 'caisse', nom: '🛒 Caisse & Vente' },
    { id: 'articles_stock', nom: '📦 Articles & Stock' },
    { id: 'depots_stock', nom: '🏢 Dépôts & Magasins' },
    { id: 'familles_articles', nom: '🏷️ Familles & Catégories' },
    { id: 'mouvements_stock', nom: '🔄 Mouvements Stock' },
    { id: 'approvisionnements', nom: '📥 Approvisionnements' },
    { id: 'clients', nom: '👥 Fichier Clients' },
    { id: 'categories_clients', nom: '🏷️ Catégories Clients' },
    { id: 'fournisseurs', nom: '🤝 Fournisseurs' },
    { id: 'caisses', nom: '💵 Gestion Caisses' },
    { id: 'ventes_historiques', nom: '📊 Historique Ventes & Rapports' },
  ];

  // Structure par défaut des permissions pour chaque module
  const initialiserPermissionsDefaut = () => {
    const perms = {};
    modulesApp.forEach((m) => {
      perms[m.id] = { lecture: false, creation: false, modification: false, suppression: false };
    });
    return perms;
  };

  const [nouveauUser, setNouveauUser] = useState({
    nom_complet: '',
    email: '',
    telephone: '',
    mot_de_passe: '',
    id_role: '',
    statut: 'ACTIF',
    permissions: initialiserPermissionsDefaut(),
  });

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      const { data: dataRoles } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      setRoles(dataRoles || []);

      const { data: dataUsers, error } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUtilisateurs(dataUsers || []);
    } catch (err) {
      console.error('Erreur chargement utilisateurs :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId]);

  const togglePermission = (moduleId, action) => {
    setNouveauUser((prev) => {
      const permsModule = prev.permissions[moduleId] || { lecture: false, creation: false, modification: false, suppression: false };
      const nouvelleValeur = !permsModule[action];

      let majModule = { ...permsModule, [action]: nouvelleValeur };

      // Si création/modification/suppression est activé, accorder la lecture automatiquement
      if ((action === 'creation' || action === 'modification' || action === 'suppression') && nouvelleValeur) {
        majModule.lecture = true;
      }

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleId]: majModule,
        },
      };
    });
  };

  const accorderToutModule = (moduleId, toutAccorder) => {
    setNouveauUser((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: {
          lecture: toutAccorder,
          creation: toutAccorder,
          modification: toutAccorder,
          suppression: toutAccorder,
        },
      },
    }));
  };

  const enregistrerUtilisateur = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nom_complet: nouveauUser.nom_complet,
        email: nouveauUser.email,
        telephone: nouveauUser.telephone,
        mot_de_passe: nouveauUser.mot_de_passe,
        id_role: nouveauUser.id_role || null,
        statut: nouveauUser.statut,
        permissions: nouveauUser.permissions,
      };

      if (userEnEdition) {
        const { error } = await supabase
          .from('utilisateurs')
          .update(payload)
          .eq('id', userEnEdition.id);

        if (error) throw error;
        alert('Utilisateur mis à jour avec succès !');
      } else {
        const { error } = await supabase.from('utilisateurs').insert([
          {
            ...payload,
            id_entreprise: entrepriseId,
          },
        ]);

        if (error) throw error;
        alert('Utilisateur créé avec succès !');
      }

      annulerForm();
      chargerDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const ouvrirEdition = (user) => {
    setUserEnEdition(user);
    setNouveauUser({
      nom_complet: user.nom_complet || '',
      email: user.email || '',
      telephone: user.telephone || '',
      mot_de_passe: user.mot_de_passe || '',
      id_role: user.id_role || '',
      statut: user.statut || 'ACTIF',
      permissions: { ...initialiserPermissionsDefaut(), ...(user.permissions || {}) },
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    setUserEnEdition(null);
    setNouveauUser({
      nom_complet: '',
      email: '',
      telephone: '',
      mot_de_passe: '',
      id_role: '',
      statut: 'ACTIF',
      permissions: initialiserPermissionsDefaut(),
    });
    setAfficherForm(false);
  };

  const supprimerUtilisateur = async (id) => {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;

    try {
      const { error } = await supabase.from('utilisateurs').delete().eq('id', id);
      if (error) throw error;
      alert('Utilisateur supprimé.');
      chargerDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const usersFiltres = utilisateurs.filter((u) => {
    const nom = (u.nom_complet || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const query = recherche.toLowerCase();
    return nom.includes(query) || email.includes(query);
  });

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm uppercase">👥 Comptes Utilisateurs & Droits d'Accès</h3>
          <p className="text-slate-500">Création des accès, rôles et permissions fines par module.</p>
        </div>
        <button
          onClick={() => (afficherForm ? annulerForm() : setAfficherForm(true))}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl transition shadow"
        >
          {afficherForm ? '✖ Fermer' : '➕ Créer un Utilisateur'}
        </button>
      </div>

      {afficherForm && (
        <form onSubmit={enregistrerUtilisateur} className="bg-slate-50 border-2 border-orange-500/40 p-4 rounded-2xl space-y-4 shadow-sm">
          <h4 className="font-bold text-orange-600 uppercase">
            {userEnEdition ? `✏️ Modifier l'utilisateur` : '➕ Créer un nouveau compte utilisateur'}
          </h4>

          {/* Profil de l'utilisateur */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Nom Complet *</label>
              <input
                type="text"
                required
                value={nouveauUser.nom_complet}
                onChange={(e) => setNouveauUser({ ...nouveauUser, nom_complet: e.target.value })}
                placeholder="Ex: Paul BIYA"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Email / Identifiant *</label>
              <input
                type="email"
                required
                value={nouveauUser.email}
                onChange={(e) => setNouveauUser({ ...nouveauUser, email: e.target.value })}
                placeholder="Ex: paul@keita.cm"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Téléphone</label>
              <input
                type="text"
                value={nouveauUser.telephone}
                onChange={(e) => setNouveauUser({ ...nouveauUser, telephone: e.target.value })}
                placeholder="Ex: +237 600000000"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Mot de Passe *</label>
              <input
                type="password"
                required
                value={nouveauUser.mot_de_passe}
                onChange={(e) => setNouveauUser({ ...nouveauUser, mot_de_passe: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Rôle Attribué *</label>
              <select
                required
                value={nouveauUser.id_role}
                onChange={(e) => setNouveauUser({ ...nouveauUser, id_role: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-orange-700"
              >
                <option value="">-- Choisir un Rôle --</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    🛡️ {r.nom_role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Statut Compte</label>
              <select
                value={nouveauUser.statut}
                onChange={(e) => setNouveauUser({ ...nouveauUser, statut: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-700"
              >
                <option value="ACTIF">🟢 Actif</option>
                <option value="INACTIF">🔴 Inactif / Suspendu</option>
              </select>
            </div>
          </div>

          {/* MATRICE DE DROITS D'ACCÈS PAR MODULE */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <h5 className="font-extrabold text-slate-800 text-xs uppercase flex items-center justify-between">
              <span>🔐 Droits & Permissions d'Accès par Module :</span>
              <span className="text-[10px] text-slate-400 font-normal">Cochez les droits autorisés pour cet utilisateur</span>
            </h5>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Module</th>
                    <th className="p-2.5 text-center">👁️ Lecture (Voir)</th>
                    <th className="p-2.5 text-center">➕ Créer</th>
                    <th className="p-2.5 text-center">✏️ Modifier</th>
                    <th className="p-2.5 text-center">🗑️ Supprimer</th>
                    <th className="p-2.5 text-center">Action Rapide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modulesApp.map((m) => {
                    const p = nouveauUser.permissions[m.id] || { lecture: false, creation: false, modification: false, suppression: false };
                    const estToutAccorde = p.lecture && p.creation && p.modification && p.suppression;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">{m.nom}</td>
                        
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={p.lecture}
                            onChange={() => togglePermission(m.id, 'lecture')}
                            className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                          />
                        </td>

                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={p.creation}
                            onChange={() => togglePermission(m.id, 'creation')}
                            className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                          />
                        </td>

                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={p.modification}
                            onChange={() => togglePermission(m.id, 'modification')}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                          />
                        </td>

                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={p.suppression}
                            onChange={() => togglePermission(m.id, 'suppression')}
                            className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                          />
                        </td>

                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => accorderToutModule(m.id, !estToutAccorde)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              estToutAccorde ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {estToutAccorde ? 'Tout décocher' : 'Tout cocher'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={annulerForm} className="bg-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl">Annuler</button>
            <button type="submit" className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow">
              {userEnEdition ? 'Mettre à jour' : 'Créer le compte'}
            </button>
          </div>
        </form>
      )}

      {/* Barre de recherche */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
        <span>Comptes enregistrés : <strong>{usersFiltres.length}</strong> utilisateur(s)</span>
      </div>

      {/* Tableau des utilisateurs */}
      {chargement ? (
        <div className="p-8 text-center text-slate-400">Chargement des utilisateurs...</div>
      ) : usersFiltres.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
          Aucun utilisateur enregistré pour le moment.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3">Nom & Prénom</th>
                <th className="p-3">Rôle</th>
                <th className="p-3">Email</th>
                <th className="p-3">Téléphone</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersFiltres.map((u) => {
                const roleTrouve = roles.find((r) => String(r.id) === String(u.id_role));
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-slate-800">{u.nom_complet}</td>
                    <td className="p-3">
                      <span className="bg-orange-50 text-orange-800 border border-orange-200 px-2.5 py-1 rounded-lg font-bold text-[10px]">
                        🛡️ {roleTrouve ? roleTrouve.nom_role : 'Aucun rôle'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 font-medium">{u.email}</td>
                    <td className="p-3 text-slate-600 font-mono">{u.telephone || '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.statut === 'ACTIF' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {u.statut === 'ACTIF' ? '🟢 Actif' : '🔴 Inactif'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => ouvrirEdition(u)} className="p-1.5 border border-slate-300 rounded-lg hover:bg-orange-100 transition" title="Modifier / Permissions">✏️</button>
                        <button onClick={() => supprimerUtilisateur(u.id)} className="p-1.5 border border-slate-300 rounded-lg hover:bg-red-100 transition" title="Supprimer">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}