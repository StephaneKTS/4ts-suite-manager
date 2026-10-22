'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionPlanComptable({ entrepriseId = '4TS-TEST' }) {
  const [comptes, setComptes] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [compteEnEdition, setCompteEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtreType, setFiltreType] = useState('TOUS');

  // États pour le tri des colonnes
  const [triCol, setTriCol] = useState('code_compte');
  const [triOrdre, setTriOrdre] = useState('asc');

  const [nouveauCompte, setNouveauCompte] = useState({
    code_compte: '',
    intitule_compte: '',
    type_compte: 'CHARGE',
  });

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  const chargerComptes = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('comptes_comptables')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      if (error) throw error;
      setComptes(data || []);
    } catch (err) {
      console.error('Erreur chargement plan comptable :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerComptes();
  }, [entrepriseId, moduleActuel]);

  const enregistrerCompte = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        code_compte: (nouveauCompte.code_compte || '').trim(),
        intitule_compte: (nouveauCompte.intitule_compte || '').trim().toUpperCase(),
        type_compte: nouveauCompte.type_compte,
      };

      if (compteEnEdition) {
        const { error } = await supabase
          .from('comptes_comptables')
          .update(payload)
          .eq('id', compteEnEdition.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('comptes_comptables').insert([payload]);
        if (error) throw error;
      }

      annulerForm();
      chargerComptes();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const ouvrirEdition = (compte) => {
    setCompteEnEdition(compte);
    setNouveauCompte({
      code_compte: compte.code_compte || '',
      intitule_compte: compte.intitule_compte || '',
      type_compte: compte.type_compte || 'CHARGE',
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    setCompteEnEdition(null);
    setNouveauCompte({
      code_compte: '',
      intitule_compte: '',
      type_compte: 'CHARGE',
    });
    setAfficherForm(false);
  };

  const supprimerCompte = async () => {
    if (!compteEnEdition) return;
    if (!confirm('Voulez-vous vraiment supprimer ce compte comptable ?')) return;
    try {
      const { error } = await supabase.from('comptes_comptables').delete().eq('id', compteEnEdition.id);
      if (error) throw error;
      annulerForm();
      chargerComptes();
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

  const comptesFiltres = comptes
    .filter((c) => {
      const code = (c.code_compte || '').toLowerCase();
      const intitule = (c.intitule_compte || '').toLowerCase();
      const query = recherche.toLowerCase();
      const matchTexte = code.includes(query) || intitule.includes(query);
      const matchType = filtreType === 'TOUS' || c.type_compte === filtreType;
      return matchTexte && matchType;
    })
    .sort((a, b) => {
      let valA = a[triCol] || '';
      let valB = b[triCol] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-2 text-[10px] font-sans">
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-900 uppercase text-[11px] flex items-center gap-1">
          <span>📚</span> PLAN COMPTABLE [{moduleActuel}]
        </h3>
        <button
          type="button"
          onClick={() => {
            if (afficherForm) annulerForm();
            else setAfficherForm(true);
          }}
          className="bg-orange-600 hover:bg-orange-500 text-white font-black px-3 py-1 rounded-lg transition shadow-2xs text-[10px]"
        >
          {afficherForm ? '✖' : 'Nouveau'}
        </button>
      </div>

      {/* Formulaire d'ajout / modification affiché seul */}
      {afficherForm ? (
        <form onSubmit={enregistrerCompte} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl space-y-2 shadow-md">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
            <h4 className="font-black text-orange-600 uppercase text-[10px]">
              {compteEnEdition ? 'Modifier le Compte' : 'Nouveau Compte'}
            </h4>
            <button type="button" onClick={annulerForm} className="text-slate-500 font-black text-xs">✖</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block font-black text-slate-800 mb-0.5 text-[9px]">N° Code *</label>
              <input
                type="text"
                required
                value={nouveauCompte.code_compte}
                onChange={(e) => setNouveauCompte({ ...nouveauCompte, code_compte: e.target.value })}
                placeholder="613"
                className="w-full bg-white border border-slate-300 rounded p-1 font-black text-slate-900 text-[10px] shadow-2xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Intitulé *</label>
              <input
                type="text"
                required
                value={nouveauCompte.intitule_compte}
                onChange={(e) => setNouveauCompte({ ...nouveauCompte, intitule_compte: e.target.value.toUpperCase() })}
                placeholder="Loyer et charges"
                className="w-full bg-white border border-slate-300 rounded p-1 font-extrabold uppercase text-slate-900 text-[10px] shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Nature *</label>
            <select
              required
              value={nouveauCompte.type_compte}
              onChange={(e) => setNouveauCompte({ ...nouveauCompte, type_compte: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded p-1 font-black text-slate-900 text-[10px] shadow-2xs"
            >
              <option value="CHARGE">🔴 CHARGE</option>
              <option value="PRODUIT">🟢 PRODUIT</option>
            </select>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            {compteEnEdition ? (
              <button
                type="button"
                onClick={supprimerCompte}
                className="bg-red-600 hover:bg-red-700 text-white font-black px-3 py-1 rounded text-[10px] shadow-xs"
              >
                Supprimer
              </button>
            ) : <div />}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={annulerForm}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black px-3 py-1 rounded text-[10px]"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1 rounded text-[10px] shadow"
              >
                {compteEnEdition ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <>
          {/* Barre de recherche et filtres */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs items-center">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value.toUpperCase())}
                placeholder="RECHERCHER..."
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-extrabold uppercase text-slate-900 text-[10px] shadow-2xs placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setFiltreType('TOUS')}
                className={`flex-1 py-1 rounded font-black text-[9px] border transition ${filtreType === 'TOUS' ? 'bg-orange-600 text-white border-orange-600' : 'bg-slate-50 text-slate-800 border-slate-300'}`}
              >
                Tous ({comptes.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltreType('CHARGE')}
                className={`flex-1 py-1 rounded font-black text-[9px] border transition ${filtreType === 'CHARGE' ? 'bg-red-600 text-white border-red-600' : 'bg-slate-50 text-slate-800 border-slate-300'}`}
              >
                Charges
              </button>
              <button
                type="button"
                onClick={() => setFiltreType('PRODUIT')}
                className={`flex-1 py-1 rounded font-black text-[9px] border transition ${filtreType === 'PRODUIT' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-800 border-slate-300'}`}
              >
                Produits
              </button>
            </div>
          </div>

          {/* Tableau de la liste */}
          {chargement ? (
            <div className="p-4 text-center text-slate-600 font-bold text-[10px]">Chargement...</div>
          ) : comptesFiltres.length === 0 ? (
            <div className="p-4 text-center text-slate-600 bg-white border border-slate-200 rounded-xl font-bold text-[10px]">
              Aucun compte trouvé.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-100 text-slate-900 border-b border-slate-200 uppercase font-black select-none">
                  <tr>
                    <th onClick={() => gererTri('code_compte')} className="p-2 cursor-pointer hover:bg-slate-200 w-24">
                      N° Compte {rendreFlecheTri('code_compte')}
                    </th>
                    <th onClick={() => gererTri('intitule_compte')} className="p-2 cursor-pointer hover:bg-slate-200">
                      Intitulé du Compte {rendreFlecheTri('intitule_compte')}
                    </th>
                    <th onClick={() => gererTri('type_compte')} className="p-2 cursor-pointer hover:bg-slate-200 text-center w-24">
                      Nature {rendreFlecheTri('type_compte')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
                  {comptesFiltres.map((c) => {
                    const estCharge = c.type_compte === 'CHARGE';
                    return (
                      <tr
                        key={c.id}
                        onClick={() => ouvrirEdition(c)}
                        className="hover:bg-orange-50/70 cursor-pointer transition select-none"
                      >
                        <td className="p-2 font-mono font-black text-orange-600 whitespace-nowrap">{c.code_compte}</td>
                        <td className="p-2 font-black uppercase text-slate-950 truncate max-w-[200px]">{c.intitule_compte}</td>
                        <td className="p-2 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded font-black text-[9px] border ${estCharge ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                            {estCharge ? 'CHARGE' : 'PRODUIT'}
                          </span>
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