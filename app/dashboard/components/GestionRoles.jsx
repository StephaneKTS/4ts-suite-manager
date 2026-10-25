'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionRoles({ entrepriseId = '4TS-TEST' }) {
  const [roles, setRoles] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [roleEnEdition, setRoleEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  const [triCol, setTriCol] = useState('nom_role');
  const [triOrdre, setTriOrdre] = useState('asc');

  const [nouveauRole, setNouveauRole] = useState({
    nom_role: '',
  });

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  // Rôles par défaut prédéfinis par module (avec COMMERCIAUX ajouté en livraison)
  const rolesParModuleParDefaut = {
    BOUTIQUE: [
      'COMMERCIAUX',
      'CAISSIER(E)',
      'COMPTABLE',
      'CHAUFFEUR',
      'MAGASINIER',
      'VENDEUR(SE)',
      'PERSONNEL',
      'DIRECTEUR'
    ],
    LIVRAISON: [
      'LIVREUR',
      'SUPERVISEUR',
      'DIRECTEUR',
      'CHAUFFEUR MOTO',
      'CHAUFFEUR TAXI',
      'CAISSIER(E)',
      'COMMERCIAUX'
    ]
  };

  const rolesDefinis = rolesParModuleParDefaut[moduleActuel] || [];

  // Fonction pour initialiser automatiquement les rôles par défaut pour l'entreprise connectée
  const verifierEtCreerRolesParDefaut = async () => {
    try {
      const { data: existingRoles, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      if (error) throw error;

      const existingNames = (existingRoles || []).map(r => (r.nom_role || '').trim().toUpperCase());
      const missingRoles = rolesDefinis.filter(nom => !existingNames.includes(nom));

      if (missingRoles.length > 0) {
        const rowsToInsert = missingRoles.map(nom => ({
          id_entreprise: entrepriseId,
          module: moduleActuel,
          nom_role: nom,
        }));

        await supabase.from('roles').insert(rowsToInsert);
      }
    } catch (err) {
      console.error('Erreur initialisation rôles par défaut :', err.message);
    }
  };

  const chargerRoles = async () => {
    setChargement(true);
    try {
      await verifierEtCreerRolesParDefaut();

      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoles(data || []);
    } catch (err) {
      console.error('Erreur chargement rôles :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerRoles();
  }, [entrepriseId, moduleActuel]);

  const estRoleSysteme = (nomRole) => {
    return rolesDefinis.includes((nomRole || '').trim().toUpperCase());
  };

  const enregistrerRole = async (e) => {
    e.preventDefault();
    const nomSaisi = nouveauRole.nom_role.trim().toUpperCase();

    if (!nomSaisi) {
      alert('⚠️ Veuillez renseigner le nom du rôle.');
      return;
    }

    try {
      if (roleEnEdition) {
        if (estRoleSysteme(roleEnEdition.nom_role)) {
          alert(`❌ Impossible de modifier ce rôle système ("${roleEnEdition.nom_role}"). Seuls les rôles personnalisés peuvent être modifiés.`);
          return;
        }

        const { error } = await supabase
          .from('roles')
          .update({ nom_role: nomSaisi })
          .eq('id', roleEnEdition.id);

        if (error) throw error;
        alert(`Rôle mis à jour avec succès dans le module ${moduleActuel} !`);
      } else {
        const existeDeja = roles.some(r => (r.nom_role || '').trim().toUpperCase() === nomSaisi);
        if (existeDeja) {
          alert(`⚠️ Ce rôle existe déjà dans le module ${moduleActuel}.`);
          return;
        }

        const payload = {
          id_entreprise: entrepriseId,
          module: moduleActuel,
          nom_role: nomSaisi,
        };

        const { error } = await supabase.from('roles').insert([payload]);
        if (error) throw error;
        alert(`Rôle créé avec succès dans le module ${moduleActuel} !`);
      }

      annulerForm();
      chargerRoles();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const ouvrirEdition = (role) => {
    setRoleEnEdition(role);
    setNouveauRole({
      nom_role: role.nom_role || '',
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    setRoleEnEdition(null);
    setNouveauRole({
      nom_role: '',
    });
    setAfficherForm(false);
  };

  const supprimerRole = async () => {
    if (!roleEnEdition) return;

    if (estRoleSysteme(roleEnEdition.nom_role)) {
      alert(`❌ SUPPRESSION INTERDITE : "${roleEnEdition.nom_role}" est un rôle système prédéterminé de l'application. Il ne peut pas être supprimé.`);
      return;
    }

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
        const exempleUser = usersRattaches[0].nom_complet || 'COLLABORATEUR';
        alert(`❌ SUPPRESSION BLOQUÉE : Ce rôle ("${roleEnEdition.nom_role}") est actuellement affecté à ${usersRattaches.length} utilisateur(s) (ex: "${exempleUser}"). Vous devez d'abord réaffecter ces utilisateurs à un autre rôle avant de pouvoir supprimer celui-ci.`);
        return;
      }

      if (!confirm(`Voulez-vous vraiment supprimer définitivement le rôle "${roleEnEdition.nom_role}" ?`)) return;

      const { error } = await supabase.from('roles').delete().eq('id', roleEnEdition.id);
      if (error) throw error;

      alert('Rôle supprimé avec succès.');
      annulerForm();
      chargerRoles();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const gererTri = (colonne) => {
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

  const estSystemeEnEdition = roleEnEdition ? estRoleSysteme(roleEnEdition.nom_role) : false;

  return (
    <div className="space-y-2.5 text-[11px] font-sans">
      
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
          <span>🛡️</span> GESTION DES RÔLES [{moduleActuel}]
        </h3>
        <button
          type="button"
          onClick={() => {
            if (afficherForm) {
              annulerForm();
            } else {
              setNouveauRole({ nom_role: '' });
              setRoleEnEdition(null);
              setAfficherForm(true);
            }
          }}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
        >
          {afficherForm ? '✖' : '＋ Nouveau Rôle'}
        </button>
      </div>

      <div className="flex justify-start items-center gap-1.5">
        <button
          type="button"
          onClick={() => annulerForm()}
          className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition whitespace-nowrap border shadow-2xs ${
            !afficherForm 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          📋 Liste [{moduleActuel}] ({roles.length})
        </button>
      </div>

      {afficherForm && (
        <form onSubmit={enregistrerRole} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl space-y-2.5 shadow-md">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
            <h4 className="font-black text-orange-600 uppercase text-[11px]">
              {roleEnEdition ? (estSystemeEnEdition ? `🔒 Fiche du Rôle Système (${moduleActuel})` : `✏️ Fiche du Rôle Personnalisé (${moduleActuel})`) : `➕ Nouveau Rôle Personnalisé (${moduleActuel})`}
            </h4>
            <button
              type="button"
              onClick={annulerForm}
              className="text-slate-400 hover:text-slate-700 font-bold text-xs p-0.5"
            >
              ✖
            </button>
          </div>

          {estSystemeEnEdition && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-2 rounded-lg text-[10px] font-bold">
              ⚠️ Ce rôle est un standard système de l'application. Vous pouvez le consulter mais son nom ne peut pas être modifié ni supprimé.
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Nom du Rôle / Fonction *</label>
              <input
                type="text"
                required
                disabled={estSystemeEnEdition}
                value={nouveauRole.nom_role}
                onChange={(e) => setNouveauRole({ ...nouveauRole, nom_role: e.target.value.toUpperCase() })}
                placeholder="EX: SUPERVISEUR, COMMERCIAL..."
                className={`w-full border rounded p-1.5 font-extrabold uppercase text-xs shadow-xs ${
                  estSystemeEnEdition ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed' : 'bg-white text-slate-900 border-slate-300'
                }`}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
            {roleEnEdition && !estSystemeEnEdition ? (
              <button
                type="button"
                onClick={supprimerRole}
                className="bg-red-600 hover:bg-red-700 text-white font-black px-3 py-1.5 rounded text-[10px] shadow-xs"
              >
                🗑️ Supprimer
              </button>
            ) : <div />}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={annulerForm}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded text-[10px]"
              >
                {estSystemeEnEdition ? 'Fermer' : 'Annuler'}
              </button>
              {!estSystemeEnEdition && (
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded text-[10px] shadow-xs">
                  {roleEnEdition ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {!afficherForm && (
        <>
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value.toUpperCase())}
              placeholder={`RECHERCHER PAR NOM DE RÔLE [${moduleActuel}]...`}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-extrabold uppercase text-slate-900 text-xs focus:outline-none shadow-xs placeholder:text-slate-400"
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-700 px-1 font-black">
            <span>Répertoire : <strong>{rolesFiltres.length}</strong> rôle(s)</span>
          </div>

          {chargement ? (
            <div className="p-4 text-center text-slate-500 font-bold">Chargement...</div>
          ) : rolesFiltres.length === 0 ? (
            <div className="p-4 text-center text-slate-500 bg-white border border-slate-200 rounded-xl font-bold">
              Aucun rôle enregistré pour le module {moduleActuel}.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs table-fixed">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase text-[9px] font-black select-none">
                  <tr>
                    <th onClick={() => gererTri('nom_role')} className="p-2.5 w-full cursor-pointer hover:bg-slate-200 transition">
                      Intitulé du Rôle {rendreFlecheTri('nom_role')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px]">
                  {rolesFiltres.map((r) => {
                    const isSystem = estRoleSysteme(r.nom_role);
                    return (
                      <tr
                        key={r.id}
                        onClick={() => ouvrirEdition(r)}
                        className="hover:bg-orange-50/70 cursor-pointer transition select-none"
                        title="Cliquer pour consulter / modifier"
                      >
                        <td className="p-2.5 font-extrabold uppercase text-slate-900 truncate flex items-center justify-between">
                          <span className="bg-orange-100 text-orange-900 border border-orange-200 px-2 py-0.5 rounded font-black text-[9.5px]">
                            🛡️ {r.nom_role}
                          </span>
                          {isSystem && (
                            <span className="bg-blue-100 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded text-[8px] font-black">
                              🔒 Système
                            </span>
                          )}
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