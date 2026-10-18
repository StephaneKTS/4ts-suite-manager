'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionFamilles({ entrepriseId = '4TS-TEST' }) {
  const [familles, setFamilles] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [familleEnEdition, setFamilleEnEdition] = useState(null);
  const [nomFamilleInput, setNomFamilleInput] = useState('');

  // 1. Charger uniquement les familles liées à l'entreprise (id_entreprise)
  const chargerFamilles = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('familles_articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFamilles(data || []);
    } catch (err) {
      console.error('Erreur chargement familles :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerFamilles();
  }, []);

  // 2. Enregistrer / Mettre à jour avec les noms de colonnes exacts
  const enregistrerFamille = async (e) => {
    e.preventDefault();
    try {
      if (familleEnEdition) {
        // Modification (clé primaire = id)
        const { error } = await supabase
          .from('familles_articles')
          .update({ nom_famille: nomFamilleInput })
          .eq('id', familleEnEdition.id);

        if (error) throw error;
        alert('Catégorie mise à jour avec succès !');
      } else {
        // Enregistrement (champs nom_famille et id_entreprise en minuscules)
        const { error } = await supabase.from('familles_articles').insert([
          {
            nom_famille: nomFamilleInput,
            id_entreprise: entrepriseId,
          },
        ]);

        if (error) throw error;
        alert('Catégorie / Famille créée avec succès dans Supabase !');
      }

      annulerForm();
      chargerFamilles();
    } catch (err) {
      alert('Erreur lors de l’enregistrement : ' + err.message);
    }
  };

  const ouvrirEdition = (famille) => {
    setFamilleEnEdition(famille);
    setNomFamilleInput(famille.nom_famille || '');
    setAfficherForm(true);
  };

  const annulerForm = () => {
    setFamilleEnEdition(null);
    setNomFamilleInput('');
    setAfficherForm(false);
  };

  // 3. Supprimer (sur la colonne id)
  const supprimerFamille = async (famille) => {
    if (!confirm(`Supprimer la catégorie "${famille.nom_famille}" ?`)) return;
    try {
      const { error } = await supabase
        .from('familles_articles')
        .delete()
        .eq('id', famille.id);

      if (error) throw error;
      alert('Catégorie supprimée avec succès.');
      chargerFamilles();
    } catch (err) {
      alert('Erreur de suppression : ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500">Organisez vos articles par familles ou catégories de produits.</p>
        <button
          onClick={() => (afficherForm ? annulerForm() : setAfficherForm(true))}
          className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow"
        >
          {afficherForm ? '✖ Fermer' : '➕ Nouvelle Famille'}
        </button>
      </div>

      {afficherForm && (
        <form onSubmit={enregistrerFamille} className="bg-slate-50 border-2 border-orange-500/40 p-4 rounded-2xl space-y-3">
          <h4 className="font-bold text-xs text-orange-600 uppercase">
            {familleEnEdition ? `✏️ Modifier : ${familleEnEdition.nom_famille}` : 'Nouvelle Catégorie'}
          </h4>
          <div className="text-xs">
            <label className="block font-semibold mb-1">Nom de la Famille / Catégorie *</label>
            <input
              type="text"
              required
              value={nomFamilleInput}
              onChange={(e) => setNomFamilleInput(e.target.value)}
              placeholder="Ex: PATISSERIE, BOULANGERIE, BOISSONS"
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={annulerForm} className="bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl">Annuler</button>
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow">
              {familleEnEdition ? 'Mettre à jour' : 'Enregistrer dans Supabase'}
            </button>
          </div>
        </form>
      )}

      {chargement ? (
        <div className="p-8 text-center text-slate-400 text-xs">Chargement...</div>
      ) : familles.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs space-y-2">
          <p className="text-2xl">🏷️</p>
          <p className="font-bold">Aucune catégorie enregistrée.</p>
          <p>Cliquez sur "Nouvelle Famille" pour commencer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {familles.map((fam) => (
            <div key={fam.id} className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm flex justify-between items-center">
              <span className="font-bold text-xs text-slate-800">🏷️ {fam.nom_famille}</span>
              <div className="flex gap-1">
                <button onClick={() => ouvrirEdition(fam)} className="p-1.5 border rounded-lg text-xs hover:bg-orange-100 transition">✏️</button>
                <button onClick={() => supprimerFamille(fam)} className="p-1.5 border rounded-lg text-xs hover:bg-red-100 transition">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}