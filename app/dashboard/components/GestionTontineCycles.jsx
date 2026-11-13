'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionTontineCycles({ entrepriseId, isDarkMode }) {
  const [cycles, setCycles] = useState([]);
  const [libelle, setLibelle] = useState('');
  const [montantCotisation, setMontantCotisation] = useState('');
  const [frequence, setFrequence] = useState('MENSUEL');

  useEffect(() => {
    chargerCycles();
  }, [entrepriseId]);

  const chargerCycles = async () => {
    const { data, error } = await supabase
      .from('tontine_cycles')
      .select('*')
      .eq('id_entreprise', entrepriseId || '4TS-234321');

    if (!error && data) setCycles(data);
  };

  const creerCycle = async (e) => {
    e.preventDefault();
    if (!libelle.trim() || !montantCotisation) return;

    const { error } = await supabase.from('tontine_cycles').insert([{
      id_entreprise: entrepriseId || '4TS-234321',
      libelle: libelle.trim(),
      montant_cotisation: parseFloat(montantCotisation),
      frequence: frequence,
      statut: 'ACTIF'
    }]);

    if (error) {
      alert('Erreur : ' + error.message);
    } else {
      setLibelle('');
      setMontantCotisation('');
      chargerCycles();
      alert('✅ Cycle de tontine créé avec succès !');
    }
  };

  const containerBg = isDarkMode ? 'bg-[#0b1329] text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200';
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-300';

  return (
    <div className={`max-w-4xl mx-auto p-4 rounded-2xl border shadow-lg space-y-4 text-xs font-sans ${containerBg}`}>
      <h3 className="font-black uppercase text-sm text-orange-500 flex items-center gap-2">
        <span>🔄</span> Gestion des Cycles & Sessions (Tontine)
      </h3>

      <form onSubmit={creerCycle} className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input
          type="text"
          placeholder="Nom du cycle (ex: Tour 2026)"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          className={`p-2 rounded-xl border ${inputBg}`}
          required
        />
        <input
          type="number"
          placeholder="Montant par part (FCFA)"
          value={montantCotisation}
          onChange={(e) => setMontantCotisation(e.target.value)}
          className={`p-2 rounded-xl border ${inputBg}`}
          required
        />
        <select
          value={frequence}
          onChange={(e) => setFrequence(e.target.value)}
          className={`p-2 rounded-xl border ${inputBg}`}
        >
          <option value="JOURNALIER">Journalier</option>
          <option value="HEBDOMADAIRE">Hebdomadaire</option>
          <option value="MENSUEL">Mensuel</option>
        </select>
        <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-black py-2 rounded-xl uppercase transition shadow">
          ➕ Créer le cycle
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cycles.map((c) => (
          <div key={c.id} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#0f1c3f] border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-1`}>
            <div className="flex justify-between items-center">
              <span className="font-black uppercase text-orange-500">{c.libelle}</span>
              <span className="text-[9px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-bold">{c.statut}</span>
            </div>
            <p className="text-sm font-black font-mono">{c.montant_cotisation?.toLocaleString()} FCFA <span className="text-[9px] font-normal">({c.frequence})</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}