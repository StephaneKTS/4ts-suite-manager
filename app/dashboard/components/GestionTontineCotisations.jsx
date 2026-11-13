'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionTontineCotisations({ entrepriseId, isDarkMode }) {
  const [participants, setParticipants] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [participantId, setParticipantId] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [montant, setMontant] = useState('');
  const [cotisations, setCotisations] = useState([]);

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId]);

  const chargerDonnees = async () => {
    const idEnt = entrepriseId || '4TS-234321';
    const { data: part } = await supabase.from('tontine_participants').select('*').eq('id_entreprise', idEnt);
    const { data: cyc } = await supabase.from('tontine_cycles').select('*').eq('id_entreprise', idEnt);
    const { data: cot } = await supabase.from('tontine_cotisations').select('*, tontine_participants(nom_complet)').eq('id_entreprise', idEnt);

    if (part) setParticipants(part);
    if (cyc) setCycles(cyc);
    if (cot) setCotisations(cot);
  };

  const enregistrerCotisation = async (e) => {
    e.preventDefault();
    if (!participantId || !cycleId || !montant) return;

    const { error } = await supabase.from('tontine_cotisations').insert([{
      id_entreprise: entrepriseId || '4TS-234321',
      participant_id: participantId,
      cycle_id: cycleId,
      montant_verse: parseFloat(montant),
      date_versement: new Date().toISOString()
    }]);

    if (error) {
      alert('Erreur : ' + error.message);
    } else {
      setMontant('');
      chargerDonnees();
      alert('✅ Cotisation enregistrée avec succès !');
    }
  };

  const containerBg = isDarkMode ? 'bg-[#0b1329] text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200';
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-300';

  return (
    <div className={`max-w-4xl mx-auto p-4 rounded-2xl border shadow-lg space-y-4 text-xs font-sans ${containerBg}`}>
      <h3 className="font-black uppercase text-sm text-orange-500 flex items-center gap-2">
        <span>💰</span> Suivi des Cotisations & Versements
      </h3>

      <form onSubmit={enregistrerCotisation} className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <select value={participantId} onChange={(e) => setParticipantId(e.target.value)} className={`p-2 rounded-xl border ${inputBg}`} required>
          <option value="">-- Choisir un participant --</option>
          {participants.map(p => <option key={p.id} value={p.id}>{p.nom_complet}</option>)}
        </select>
        <select value={cycleId} onChange={(e) => setCycleId(e.target.value)} className={`p-2 rounded-xl border ${inputBg}`} required>
          <option value="">-- Choisir un cycle --</option>
          {cycles.map(c => <option key={c.id} value={c.id}>{c.libelle} ({c.montant_cotisation}F)</option>)}
        </select>
        <input
          type="number"
          placeholder="Montant versé (FCFA)"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          className={`p-2 rounded-xl border ${inputBg}`}
          required
        />
        <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-black py-2 rounded-xl uppercase transition shadow">
          💾 Encaisser
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
              <th className="p-2">Participant</th>
              <th className="p-2">Montant Versé</th>
              <th className="p-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {cotisations.length === 0 ? (
              <tr><td colSpan="3" className="p-4 text-center text-slate-500">Aucune cotisation enregistrée.</td></tr>
            ) : (
              cotisations.map((c) => (
                <tr key={c.id} className={`border-b ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
                  <td className="p-2 font-bold">{c.tontine_participants?.nom_complet || 'Membre'}</td>
                  <td className="p-2 font-black text-orange-500 font-mono">{c.montant_verse?.toLocaleString()} FCFA</td>
                  <td className="p-2">{new Date(c.date_versement).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}