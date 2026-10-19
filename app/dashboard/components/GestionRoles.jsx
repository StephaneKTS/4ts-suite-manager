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

  // États pour le tri
  const [triCol, setTriCol] = useState('nom_role');
  const [triOrdre, setTriOrdre] = useState('asc');

  const [nouveauRole, setNouveauRole] = useState({
    nom_role: '',
    description: '',
  });

  const chargerRoles = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
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
  }, [entrepriseId]);

  const enregistrerRole = async (e) => {
    e.preventDefault();
    try {
      if (roleEnEdition) {
        const { error } = await supabase
          .from('roles')
          .update({
            nom_role: nouveauRole.nom_role,
            description: nouveauRole.description,
          })
          .eq('id', roleEnEdition.id);

        if (error) throw error;
        alert('Rôle mis à jour avec succès !');
      } else {
        const { error } = await supabase.from('roles').insert([
          {
            ...nouveauRole,
            id_entreprise: entrepriseId,
          },
        ]);

        if (error) throw error;
        alert('Rôle créé avec succès !');
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
      description: role.description || '',
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    setRoleEnEdition(null);
    setNouveauRole({
      nom_role: '',
      description: '',
    });
    setAfficherForm(false);
  };

  const supprimerRole = async (id) => {
    if (!confirm('Voulez-vous vraiment supprimer ce rôle ?')) return;

    try {
      const { error } = await supabase.from('roles').delete().eq('id', id);
      if (error) throw error;
      alert('Rôle supprimé.');
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
    if (triCol !== colonne) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-orange-600 ml-1">{triOrdre === 'asc' ? '↑' : '↓'}</span>;
  };

  const rolesFiltres = roles
    .filter((r) => {
      const nom = (r.nom_role || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();
      const query = recherche.toLowerCase();
      return nom.includes(query) || desc.includes(query);
    })
    .sort((a, b) => {
      let valA = '';
      let valB = '';

      if (triCol === 'nom_role') {
        valA = a.nom_role || '';
        valB = b.nom_role || '';
      } else if (triCol === 'description') {
        valA = a.description || '';
        valB = b.description || '';
      }

      if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-2.5 text-[11px] font-sans">
      {/* En-tête avec bouton Nouveau */}
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-800 uppercase text-xs">🛡️ GESTION DES RÔLES</h3>
        <button
          onClick={() => {
            if (afficherForm) {
              annulerForm();
            } else {
              setNouveauRole({ nom_role: '', description: '' });
              setRoleEnEdition(null);
              setAfficherForm(true);
            }
          }}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs"
        >
          {afficherForm ? '✖' : 'Nouveau'}
        </button>
      </div>

      {/* Formulaire de création / modification */}
      {afficherForm && (
        <form onSubmit={enregistrerRole} className="bg-slate-50 border border-orange-500/40 p-2.5 rounded-xl space-y-2 shadow-2xs">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
            <h4 className="font-bold text-orange-600 uppercase text-[10px]">
              {roleEnEdition ? '✏️ Fiche du rôle' : '➕ Nouveau rôle'}
            </h4>
            <button
              type="button"
              onClick={annulerForm}
              className="text-slate-400 hover:text-slate-600 font-bold text-xs p-0.5"
            >
              ✖
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <div>
              <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Nom du Rôle / Fonction *</label>
              <input
                type="text"
                required
                value={nouveauRole.nom_role}
                onChange={(e) => setNouveauRole({ ...nouveauRole, nom_role: e.target.value })}
                placeholder="Ex: Caissier, Livreur..."
                className="w-full bg-white border border-slate-200 rounded p-1 font-bold text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Description / Notes</label>
              <input
                type="text"
                value={nouveauRole.description}
                onChange={(e) => setNouveauRole({ ...nouveauRole, description: e.target.value })}
                placeholder="Ex: Responsable des encaissements"
                className="w-full bg-white border border-slate-200 rounded p-1 font-medium text-xs"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
            {roleEnEdition ? (
              <button
                type="button"
                onClick={() => supprimerRole(roleEnEdition.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded text-[10px]"
              >
                🗑️ Supprimer
              </button>
            ) : <div />}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={annulerForm}
                className="bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded text-[10px]"
              >
                Annuler
              </button>
              <button type="submit" className="bg-emerald-600 text-white font-bold px-3 py-1 rounded text-[10px] shadow-2xs">
                {roleEnEdition ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tableau de la liste */}
      {!afficherForm && (
        <>
          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher par nom de rôle..."
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
            <span>Répertoire : <strong>{rolesFiltres.length}</strong> rôle(s)</span>
          </div>

          {chargement ? (
            <div className="p-4 text-center text-slate-400">Chargement...</div>
          ) : rolesFiltres.length === 0 ? (
            <div className="p-4 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">
              Aucun rôle enregistré.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs table-fixed">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[9px] font-extrabold select-none">
                  <tr>
                    <th onClick={() => gererTri('nom_role')} className="p-2 w-[40%] cursor-pointer hover:bg-slate-100 transition">
                      Intitulé du Rôle {rendreFlecheTri('nom_role')}
                    </th>
                    <th onClick={() => gererTri('description')} className="p-2 w-[60%] cursor-pointer hover:bg-slate-100 transition">
                      Description {rendreFlecheTri('description')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px]">
                  {rolesFiltres.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => ouvrirEdition(r)}
                      className="hover:bg-orange-50/70 cursor-pointer transition"
                      title="Cliquer pour modifier"
                    >
                      <td className="p-2 font-extrabold text-slate-800 truncate">
                        <span className="bg-slate-100 text-slate-800 border border-slate-300 px-1.5 py-0.5 rounded font-bold text-[9px]">
                          🛡️ {r.nom_role}
                        </span>
                      </td>
                      <td className="p-2 text-slate-600 truncate">{r.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}