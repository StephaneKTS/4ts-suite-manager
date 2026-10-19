'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function GestionCategoriesClients({ entrepriseId = '4TS-TEST' }) {
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [categorieEnEdition, setCategorieEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  const [triCol, setTriCol] = useState('nom_categorie');
  const [triOrdre, setTriOrdre] = useState('asc');

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
      const { data, error } = await supabase.from('categories_clients').select('*').eq('id_entreprise', entrepriseId).order('created_at', { ascending: false });
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Erreur :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { chargerCategories(); }, [entrepriseId]);

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
        await supabase.from('categories_clients').update(payload).eq('id', categorieEnEdition.id);
        alert('Mise à jour réussie !');
      } else {
        await supabase.from('categories_clients').insert([{ ...payload, id_entreprise: entrepriseId }]);
        alert('Création réussie !');
      }
      annulerForm();
      chargerCategories();
    } catch (err) { alert('Erreur : ' + err.message); }
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
    setNouvelleCategorie({ nom_categorie: '', taux_remise_defaut: 0, applique_tva: true, taux_tva_defaut: 19.25, mode_ristourne: 'POURCENTAGE', valeur_ristourne: 0 });
    setAfficherForm(false);
  };

  const supprimerCategorie = async (id) => {
    if (!confirm('Supprimer cette catégorie ?')) return;
    try {
      await supabase.from('categories_clients').delete().eq('id', id);
      alert('Supprimé.');
      annulerForm();
      chargerCategories();
    } catch (err) { alert('Erreur : ' + err.message); }
  };

  const gererTri = (colonne) => {
    if (triCol === colonne) setTriOrdre(triOrdre === 'asc' ? 'desc' : 'asc');
    else { setTriCol(colonne); setTriOrdre('asc'); }
  };

  const rendreFlecheTri = (colonne) => triCol !== colonne ? <span className="text-slate-300 ml-1">↕</span> : <span className="text-orange-600 ml-1">{triOrdre === 'asc' ? '↑' : '↓'}</span>;

  const categoriesFiltrees = categories.filter((c) => (c.nom_categorie || '').toLowerCase().includes(recherche.toLowerCase())).sort((a, b) => {
    let valA = a[triCol] || ''; let valB = b[triCol] || '';
    if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
    if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-2.5 text-[11px] font-sans">
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-800 uppercase text-xs">🏷️ CATÉGORIES CLIENTS</h3>
        <button onClick={() => (afficherForm ? annulerForm() : setAfficherForm(true))} className="bg-orange-600 text-white font-bold px-3 py-1.5 rounded-lg">{afficherForm ? '✖' : 'Nouveau'}</button>
      </div>

      {afficherForm && (
        <form onSubmit={enregistrerCategorie} className="bg-slate-50 border border-orange-500/40 p-2.5 rounded-xl space-y-2 shadow-2xs">
          <div className="flex justify-between items-center border-b pb-1">
            <h4 className="font-bold text-orange-600 uppercase text-[10px]">{categorieEnEdition ? '✏️ Édition' : '➕ Nouvelle'}</h4>
            <button type="button" onClick={annulerForm} className="text-slate-400 font-bold text-xs">✖</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            <div><label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Nom *</label><input type="text" required value={nouvelleCategorie.nom_categorie} onChange={(e) => setNouvelleCategorie({ ...nouvelleCategorie, nom_categorie: e.target.value })} className="w-full bg-white border rounded p-1 font-bold text-xs" /></div>
            <div><label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Remise (%)</label><input type="number" step="0.01" value={nouvelleCategorie.taux_remise_defaut} onChange={(e) => setNouvelleCategorie({ ...nouvelleCategorie, taux_remise_defaut: e.target.value })} className="w-full bg-white border rounded p-1 font-bold text-xs" /></div>
            <div><label className="block font-semibold mb-0.5 text-[9px] text-slate-500">TVA</label><select value={nouvelleCategorie.applique_tva ? 'OUI' : 'NON'} onChange={(e) => setNouvelleCategorie({ ...nouvelleCategorie, applique_tva: e.target.value === 'OUI' })} className="w-full bg-white border rounded p-1 font-bold text-xs"><option value="OUI">Oui</option><option value="NON">Non</option></select></div>
          </div>
          <div className="pt-1.5 border-t flex justify-between items-center">
            {categorieEnEdition ? (<button type="button" onClick={() => supprimerCategorie(categorieEnEdition.id)} className="bg-red-600 text-white font-bold px-2.5 py-1 rounded text-[10px]">Supprimer</button>) : <div />}
            <button type="submit" className="bg-emerald-600 text-white font-bold px-3 py-1 rounded text-[10px]">{categorieEnEdition ? 'Mettre à jour' : 'Enregistrer'}</button>
          </div>
        </form>
      )}

      {!afficherForm && (
        <>
          <div className="bg-slate-50 p-1.5 rounded-xl border"><input type="text" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher..." className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs outline-none" /></div>
          {chargement ? (<div className="p-4 text-center text-slate-400">Chargement...</div>) : categoriesFiltrees.length === 0 ? (<div className="p-4 text-center text-slate-400 bg-white border rounded-xl">Aucune catégorie.</div>) : (
            <div className="overflow-x-auto border rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs table-fixed">
                <thead className="bg-slate-50 text-slate-600 border-b uppercase text-[9px] font-extrabold select-none">
                  <tr>
                    <th onClick={() => gererTri('nom_categorie')} className="p-2 w-[35%] cursor-pointer">Catégorie {rendreFlecheTri('nom_categorie')}</th>
                    <th onClick={() => gererTri('taux_remise_defaut')} className="p-2 w-[20%] cursor-pointer">Remise {rendreFlecheTri('taux_remise_defaut')}</th>
                    <th onClick={() => gererTri('applique_tva')} className="p-2 w-[25%] cursor-pointer">TVA {rendreFlecheTri('applique_tva')}</th>
                    <th className="p-2 w-[20%] text-right">Ristourne</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[10.5px]">
                  {categoriesFiltrees.map((cat) => (
                    <tr key={cat.id} onClick={() => ouvrirEdition(cat)} className="hover:bg-orange-50/70 cursor-pointer">
                      <td className="p-2 font-extrabold text-slate-800 truncate">{cat.nom_categorie}</td>
                      <td className="p-2 font-bold text-emerald-600">{cat.taux_remise_defaut || 0} %</td>
                      <td className="p-2">{cat.applique_tva ? `Oui (${cat.taux_tva_defaut}%)` : 'Exonéré'}</td>
                      <td className="p-2 text-right font-bold text-purple-700">{cat.valeur_ristourne || 0}</td>
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