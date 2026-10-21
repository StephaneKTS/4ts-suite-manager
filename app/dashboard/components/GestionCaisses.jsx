'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function GestionCaisses({ entrepriseId = '4TS-TEST' }) {
  const [caisses, setCaisses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [afficherForm, setAfficherForm] = useState(false);
  const [codeCaisse, setCodeCaisse] = useState('');
  const [nomCaisse, setNomCaisse] = useState('');
  const [natureCaisse, setNatureCaisse] = useState('FACTURATION');
  const [caisseEnEdition, setCaisseEnEdition] = useState(null);

  useEffect(() => {
    chargerCaisses();
  }, [entrepriseId]);

  const chargerCaisses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('caisses')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCaisses(data || []);
    } catch (err) {
      console.error('Erreur chargement caisses :', err.message);
    } finally {
      setLoading(false);
    }
  };

  const ouvrirFormulaireNouveau = () => {
    setCaisseEnEdition(null);
    setCodeCaisse('');
    setNomCaisse('');
    setNatureCaisse('FACTURATION');
    setAfficherForm(true);
    setMsg({ type: '', text: '' });
  };

  const ouvrirEdition = (caisse) => {
    setCaisseEnEdition(caisse);
    setCodeCaisse(caisse.code_caisse || '');
    setNomCaisse(caisse.nom_caisse || '');
    setNatureCaisse(caisse.nature || 'FACTURATION');
    setAfficherForm(true);
    setMsg({ type: '', text: '' });
  };

  const annulerForm = () => {
    setCaisseEnEdition(null);
    setCodeCaisse('');
    setNomCaisse('');
    setNatureCaisse('FACTURATION');
    setAfficherForm(false);
  };

  const enregistrerCaisse = async (e) => {
    e.preventDefault();
    if (!codeCaisse.trim() || !nomCaisse.trim()) {
      setMsg({ type: 'error', text: '⚠️ Veuillez remplir le code et le nom de la caisse.' });
      return;
    }

    try {
      const payload = {
        id_entreprise: entrepriseId,
        code_caisse: codeCaisse.trim().toUpperCase(),
        nom_caisse: nomCaisse.trim(),
        nature: natureCaisse,
      };

      if (caisseEnEdition) {
        const { error } = await supabase
          .from('caisses')
          .update(payload)
          .eq('id', caisseEnEdition.id);
        if (error) throw error;
        setMsg({ type: 'success', text: '✅ Caisse mise à jour avec succès !' });
      } else {
        const { error } = await supabase.from('caisses').insert([payload]);
        if (error) throw error;
        setMsg({ type: 'success', text: '✅ Nouvelle caisse créée avec succès !' });
      }

      annulerForm();
      chargerCaisses();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur : ' + err.message });
    }
  };

  const supprimerCaisse = async () => {
    if (!caisseEnEdition) return;
    if (!confirm(`Voulez-vous vraiment supprimer la caisse "${caisseEnEdition.nom_caisse}" ?`)) return;

    try {
      const { error } = await supabase.from('caisses').delete().eq('id', caisseEnEdition.id);
      if (error) throw error;
      setMsg({ type: 'success', text: 'Caisse supprimée avec succès.' });
      annulerForm();
      chargerCaisses();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur suppression : ' + err.message });
    }
  };

  return (
    <div className="space-y-3 font-sans text-xs">
      
      {/* BARRE HAUTE : TITRE ET BOUTONS DE NAVIGATION (NOUVEAU / LISTE) */}
      <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
          🏧 Gestion des Caisses ({caisses.length})
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={ouvrirFormulaireNouveau}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition shadow-xs ${
              afficherForm 
                ? 'bg-orange-600 text-white' 
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
          >
            ＋ Nouveau
          </button>
          <button
            type="button"
            onClick={() => { setAfficherForm(false); setCaisseEnEdition(null); }}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition border shadow-xs ${
              !afficherForm 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
          >
            📋 Liste
          </button>
        </div>
      </div>

      {msg.text && (
        <div className={`p-2.5 rounded-xl font-bold border text-xs ${
          msg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
            : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          {msg.text}
        </div>
      )}

      {/* FORMULAIRE D'AJOUT / MODIFICATION */}
      {afficherForm ? (
        <form onSubmit={enregistrerCaisse} className="bg-white p-4 rounded-2xl border-2 border-orange-500/50 shadow-md space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm uppercase">
              {caisseEnEdition ? '✏️ Modifier la Caisse' : '🏧 Déclarer une Nouvelle Caisse'}
            </h3>
            <button
              type="button"
              onClick={annulerForm}
              className="text-slate-400 hover:text-slate-700 font-black text-base px-1"
            >
              ✖
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Code Caisse (ex: C01)</label>
              <input
                type="text"
                value={codeCaisse}
                onChange={(e) => setCodeCaisse(e.target.value)}
                placeholder="C01"
                required
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Nom de la Caisse</label>
              <input
                type="text"
                value={nomCaisse}
                onChange={(e) => setNomCaisse(e.target.value)}
                placeholder="Caisse Principale"
                required
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Nature de la Caisse</label>
              <select
                value={natureCaisse}
                onChange={(e) => setNatureCaisse(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="FACTURATION">FACTURATION</option>
                <option value="PRINCIPALE">PRINCIPALE</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            {caisseEnEdition ? (
              <button
                type="button"
                onClick={supprimerCaisse}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-extrabold px-3 py-1.5 rounded-lg text-xs transition"
              >
                🗑️ Supprimer
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={annulerForm}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-1.5 rounded-lg text-xs shadow-xs transition"
              >
                {caisseEnEdition ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* LISTE DES CAISSES (BADGE AU-DESSUS DU CODE DANS LE CADRE) */
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          {loading ? (
            <p className="text-slate-400 text-center py-6">Chargement des caisses...</p>
          ) : caisses.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-slate-400 font-bold">Aucune caisse enregistrée pour le moment.</p>
              <button
                type="button"
                onClick={ouvrirFormulaireNouveau}
                className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg text-xs"
              >
                ＋ Déclarer une caisse
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {caisses.map((c) => (
                <div
                  key={c.id}
                  onClick={() => ouvrirEdition(c)}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-orange-50/60 hover:border-orange-300 cursor-pointer transition flex flex-col justify-between shadow-2xs group"
                >
                  <div className="space-y-1.5">
                    {/* NATURE AU-DESSUS DU CODE CAISSE (ALIGNÉ À GAUCHE SANS DÉPASSEMENT) */}
                    <div>
                      <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-black border mb-1 ${
                        c.nature === 'PRINCIPALE'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {c.nature}
                      </span>
                    </div>

                    <span className="font-mono font-black text-orange-600 text-sm group-hover:underline block">
                      {c.code_caisse}
                    </span>
                    
                    <p className="font-extrabold text-xs text-slate-900 leading-snug truncate">
                      {c.nom_caisse}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/80 flex justify-end">
                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-orange-600 flex items-center gap-1">
                      ✏️ Ouvrir / Modifier
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}