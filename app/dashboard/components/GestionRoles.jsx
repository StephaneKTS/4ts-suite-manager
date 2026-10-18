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
      chargerRoles();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm uppercase">🛡️ Gestion des Rôles Utilisateurs</h3>
          <p className="text-slate-500">Définition des titres et fonctions personnalisés au sein de l'entreprise.</p>
        </div>
        <button
          onClick={() => (afficherForm ? annulerForm() : setAfficherForm(true))}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl transition shadow"
        >
          {afficherForm ? '✖ Fermer' : '➕ Créer un Rôle'}
        </button>
      </div>

      {afficherForm && (
        <form onSubmit={enregistrerRole} className="bg-slate-50 border-2 border-orange-500/40 p-4 rounded-2xl space-y-3 shadow-sm">
          <h4 className="font-bold text-orange-600 uppercase">
            {roleEnEdition ? `✏️ Modifier le rôle` : '➕ Créer un nouveau rôle'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Nom du Rôle / Fonction *</label>
              <input
                type="text"
                required
                value={nouveauRole.nom_role}
                onChange={(e) => setNouveauRole({ ...nouveauRole, nom_role: e.target.value })}
                placeholder="Ex: Caissier, Livreur, Chauffeur, Superviseur, Comptable..."
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Description / Notes</label>
              <input
                type="text"
                value={nouveauRole.description}
                onChange={(e) => setNouveauRole({ ...nouveauRole, description: e.target.value })}
                placeholder="Ex: Responsable des encaissements et tickets de la caisse principale"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={annulerForm} className="bg-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl">Annuler</button>
            <button type="submit" className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow">
              {roleEnEdition ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {/* Tableau des rôles */}
      {chargement ? (
        <div className="p-8 text-center text-slate-400">Chargement des rôles...</div>
      ) : roles.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
          Aucun rôle défini pour le moment.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3">Intitulé du Rôle</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-3 font-extrabold text-slate-800">
                    <span className="bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-1 rounded-lg">
                      🛡️ {r.nom_role}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 font-medium">{r.description || '-'}</td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => ouvrirEdition(r)} className="p-1.5 border border-slate-300 rounded-lg hover:bg-orange-100 transition" title="Modifier">✏️</button>
                      <button onClick={() => supprimerRole(r.id)} className="p-1.5 border border-slate-300 rounded-lg hover:bg-red-100 transition" title="Supprimer">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}