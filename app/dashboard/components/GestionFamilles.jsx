'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function GestionFamilles({ entrepriseId = '4TS-TEST' }) {
  const [familles, setFamilles] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [familleEnEdition, setFamilleEnEdition] = useState(null);
  const [nomFamilleInput, setNomFamilleInput] = useState('');

  const chargerFamilles = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase.from('familles_articles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setFamilles(data || []);
    } catch (err) { console.error('Erreur :', err.message); } finally { setChargement(false); }
  };

  useEffect(() => { chargerFamilles(); }, []);

  const enregistrerFamille = async (e) => {
    e.preventDefault();
    try {
      if (familleEnEdition) {
        await supabase.from('familles_articles').update({ nom_famille: nomFamilleInput }).eq('id', familleEnEdition.id);
        alert('Mis à jour !');
      } else {
        await supabase.from('familles_articles').insert([{ nom_famille: nomFamilleInput, id_entreprise: entrepriseId }]);
        alert('Créé !');
      }
      annulerForm();
      chargerFamilles();
    } catch (err) { alert('Erreur : ' + err.message); }
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

  const supprimerFamille = async (famille) => {
    if (!confirm(`Supprimer "${famille.nom_famille}" ?`)) return;
    try {
      await supabase.from('familles_articles').delete().eq('id', famille.id);
      alert('Supprimé.');
      chargerFamilles();
    } catch (err) { alert('Erreur : ' + err.message); }
  };

  return (
    <div className="space-y-2.5 font-sans text-xs">
      <div className="flex justify-between items-center bg-white p-1.5 rounded-xl border border-slate-200 gap-1.5 shadow-2xs">
        <span className="text-[10px] text-slate-500 font-medium px-1">Gestion des familles.</span>
        <button onClick={() => (afficherForm ? annulerForm() : setAfficherForm(true))} className="bg-orange-600 text-white font-bold px-3 py-1.5 rounded-lg text-[11px]">{afficherForm ? '✖ Fermer' : '➕ Nouveau'}</button>
      </div>

      {afficherForm && (
        <form onSubmit={enregistrerFamille} className="bg-white border-2 border-orange-500/50 p-2.5 rounded-xl space-y-2">
          <div className="flex justify-between items-center pb-1 border-b"><span className="font-extrabold text-[11px] text-orange-600 uppercase">{familleEnEdition ? 'Édition' : 'Nouvelle'}</span><button type="button" onClick={annulerForm} className="text-slate-400">✖</button></div>
          <div><label className="block font-bold text-[8px] uppercase text-slate-400 mb-0.5">Famille</label><input type="text" required value={nomFamilleInput} onChange={(e) => setNomFamilleInput(e.target.value)} className="w-full bg-slate-50 border rounded-lg p-1 text-[10px] font-bold" /></div>
          <div className="pt-1 flex justify-end gap-1.5"><button type="button" onClick={annulerForm} className="bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded text-[10px]">Annuler</button><button type="submit" className="bg-emerald-600 text-white font-bold px-4 py-1 rounded text-[10px]">{familleEnEdition ? 'Mettre à jour' : 'Enregistrer'}</button></div>
        </form>
      )}

      {chargement ? (<div className="p-4 text-center text-slate-400">Chargement...</div>) : familles.length === 0 ? (<div className="p-4 text-center text-slate-400 bg-white rounded-xl border">Aucune catégorie.</div>) : (
        <div className="space-y-1.5">
          {familles.map((fam) => (
            <div key={fam.id} className="bg-white border p-2 rounded-xl shadow-2xs flex justify-between items-center">
              <span className="font-extrabold text-[11px] text-slate-800">🏷️ {fam.nom_famille}</span>
              <div className="flex gap-1.5"><button onClick={() => ouvrirEdition(fam)} className="p-1 bg-slate-100 rounded">✏️</button><button onClick={() => supprimerFamille(fam)} className="p-1 bg-slate-100 rounded">🗑️</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}