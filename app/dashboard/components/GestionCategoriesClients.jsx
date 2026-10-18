'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionCategoriesClients({ entrepriseId = '4TS-TEST' }) {
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [categorieEnEdition, setCategorieEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  const [nouvelleCategorie, setNouvelleCategorie] = useState({
    nom_categorie: '',
    taux_remise_defaut: 0,
    applique_tva: true,
    taux_tva_defaut: 19.25,
    mode_ristourne: 'POURCENTAGE',
    valeur_ristourne: 0,
  });

  const chargerCategories = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('categories_clients')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Erreur chargement catégories clients :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerCategories();
  }, [entrepriseId]);

  const enregistrerCategorie = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nom_categorie: nouvelleCategorie.nom_categorie,
        taux_remise_defaut: parseFloat(nouvelleCategorie.taux_remise_defaut) || 0,
        applique_tva: Boolean(nouvelleCategorie.applique_tva),
        taux_tva_defaut: parseFloat(nouvelleCategorie.taux_tva_defaut) || 0,
        mode_ristourne: nouvelleCategorie.mode_ristourne,
        valeur_ristourne: parseFloat(nouvelleCategorie.valeur_ristourne) || 0,
      };

      if (categorieEnEdition) {
        const { error } = await supabase
          .from('categories_clients')
          .update(payload)
          .eq('id', categorieEnEdition.id);

        if (error) throw error;
        alert('Catégorie mise à jour avec succès !');
      } else {
        const { error } = await supabase.from('categories_clients').insert([
          {
            ...payload,
            id_entreprise: entrepriseId,
          },
        ]);

        if (error) throw error;
        alert('Catégorie créée avec succès !');
      }

      annulerForm();
      chargerCategories();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const ouvrirEdition = (cat) => {
    setCategorieEnEdition(cat);
    setNouvelleCategorie({
      nom_categorie: cat.nom_categorie || '',
      taux_remise_defaut: cat.taux_remise_defaut ?? 0,
      applique_tva: cat.applique_tva ?? true,
      taux_tva_defaut: cat.taux_tva_defaut ?? 19.25,
      mode_ristourne: cat.mode_ristourne || 'POURCENTAGE',
      valeur_ristourne: cat.valeur_ristourne ?? 0,
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    setCategorieEnEdition(null);
    setNouvelleCategorie({
      nom_categorie: '',
      taux_remise_defaut: 0,
      applique_tva: true,
      taux_tva_defaut: 19.25,
      mode_ristourne: 'POURCENTAGE',
      valeur_ristourne: 0,
    });
    setAfficherForm(false);
  };

  const supprimerCategorie = async (id) => {
    if (!confirm('Voulez-vous vraiment supprimer cette catégorie client ?')) return;

    try {
      const { error } = await supabase.from('categories_clients').delete().eq('id', id);
      if (error) throw error;
      alert('Catégorie supprimée.');
      chargerCategories();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const categoriesFiltrees = categories.filter((c) =>
    (c.nom_categorie || '').toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm uppercase">🏷️ Catégories Clients</h3>
          <p className="text-slate-500">Grilles tarifaires, remises, TVA et règles de ristournes applicables par catégorie.</p>
        </div>
        <button
          onClick={() => (afficherForm ? annulerForm() : setAfficherForm(true))}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl transition shadow"
        >
          {afficherForm ? '✖ Fermer' : '➕ Nouvelle Catégorie'}
        </button>
      </div>

      {afficherForm && (
        <form onSubmit={enregistrerCategorie} className="bg-slate-50 border-2 border-orange-500/40 p-4 rounded-2xl space-y-3 shadow-sm">
          <h4 className="font-bold text-orange-600 uppercase">
            {categorieEnEdition ? `✏️ Modifier la catégorie` : '➕ Enregistrer une nouvelle catégorie'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Nom de la Catégorie *</label>
              <input
                type="text"
                required
                value={nouvelleCategorie.nom_categorie}
                onChange={(e) => setNouvelleCategorie({ ...nouvelleCategorie, nom_categorie: e.target.value })}
                placeholder="Ex: Grossiste / Super Grossiste"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Taux Remise par Défaut (%)</label>
              <input
                type="number"
                step="0.01"
                value={nouvelleCategorie.taux_remise_defaut}
                onChange={(e) => setNouvelleCategorie({ ...nouvelleCategorie, taux_remise_defaut: e.target.value })}
                placeholder="Ex: 5.0"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Facturation avec TVA ?</label>
              <select
                value={nouvelleCategorie.applique_tva ? 'OUI' : 'NON'}
                onChange={(e) => setNouvelleCategorie({ ...nouvelleCategorie, applique_tva: e.target.value === 'OUI' })}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-700"
              >
                <option value="OUI">Oui (Facture avec TVA)</option>
                <option value="NON">Non (Exonéré de TVA)</option>
              </select>
            </div>

            {nouvelleCategorie.applique_tva && (
              <div>
                <label className="block font-semibold mb-1">Taux TVA (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={nouvelleCategorie.taux_tva_defaut}
                  onChange={(e) => setNouvelleCategorie({ ...nouvelleCategorie, taux_tva_defaut: e.target.value })}
                  placeholder="Ex: 19.25"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-blue-600"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1">Mode Ristourne</label>
              <select
                value={nouvelleCategorie.mode_ristourne}
                onChange={(e) => setNouvelleCategorie({ ...nouvelleCategorie, mode_ristourne: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-purple-700"
              >
                <option value="POURCENTAGE">Pourcentage (%)</option>
                <option value="CHIFFRE">Montant Fixe / Chiffre (F CFA)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Valeur Ristourne ({nouvelleCategorie.mode_ristourne === 'POURCENTAGE' ? '%' : 'F CFA'})
              </label>
              <input
                type="number"
                step="0.01"
                value={nouvelleCategorie.valeur_ristourne}
                onChange={(e) => setNouvelleCategorie({ ...nouvelleCategorie, valeur_ristourne: e.target.value })}
                placeholder="Ex: 2 ou 5000"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-purple-600"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={annulerForm} className="bg-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl">Annuler</button>
            <button type="submit" className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow">
              {categorieEnEdition ? 'Mettre à jour' : 'Enregistrer'}
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
          placeholder="Rechercher une catégorie..."
          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
        <span>Catégories : <strong>{categoriesFiltrees.length}</strong> enregistrée(s)</span>
      </div>

      {/* Tableau des catégories */}
      {chargement ? (
        <div className="p-8 text-center text-slate-400">Chargement des catégories...</div>
      ) : categoriesFiltrees.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
          Aucune catégorie enregistrée pour le moment.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3">Nom Catégorie</th>
                <th className="p-3">Remise Défaut</th>
                <th className="p-3">TVA Applicable</th>
                <th className="p-3">Ristourne</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoriesFiltrees.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50">
                  <td className="p-3 font-extrabold text-slate-800">{cat.nom_categorie}</td>
                  <td className="p-3 font-bold text-emerald-600">{cat.taux_remise_defaut || 0} %</td>
                  <td className="p-3">
                    {cat.applique_tva ? (
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg font-bold text-[10px]">
                        TVA : {cat.taux_tva_defaut}%
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-lg font-bold text-[10px]">
                        Exonéré
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-bold text-purple-700">
                    {cat.valeur_ristourne || 0} {cat.mode_ristourne === 'POURCENTAGE' ? '%' : 'F CFA'}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => ouvrirEdition(cat)} className="p-1.5 border border-slate-300 rounded-lg hover:bg-orange-100 transition" title="Modifier">✏️</button>
                      <button onClick={() => supprimerCategorie(cat.id)} className="p-1.5 border border-slate-300 rounded-lg hover:bg-red-100 transition" title="Supprimer">🗑️</button>
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