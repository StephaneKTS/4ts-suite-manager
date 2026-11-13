'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionTontineAttributions({ entrepriseId, isDarkMode }) {
  const [participants, setParticipants] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [participantId, setParticipantId] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [montantTotal, setMontantTotal] = useState('');
  const [attributions, setAttributions] = useState([]);

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId]);

  const chargerDonnees = async () => {
    const idEnt = entrepriseId || '4TS-234321';
    const { data: part } = await supabase.from('tontine_participants').select('*').eq('id_entreprise', idEnt);
    const { data: cyc } = await supabase.from('tontine_cycles').select('*').eq('id_entreprise', idEnt);
    const { data: att } = await supabase.from('tontine_attributions').select('*, tontine_participants(nom_complet), tontine_cycles(libelle)').eq('id_entreprise', idEnt);

    if (part) setParticipants(part);
    if (cyc) setCycles(cyc);
    if (att) setAttributions(att);
  };

  const attribuerCagnotte = async (e) => {
    e.preventDefault();
    if (!participantId || !cycleId || !montantTotal) return;

    const { error } = await supabase.from('tontine_attributions').insert([{
      id_entreprise: entrepriseId || '4TS-234321',
      participant_id: participantId,
      cycle_id: cycleId,
      montant_attribue: parseFloat(montantTotal),
      date_attribution: new Date().toISOString(),
      statut: 'VERSE'
    }]);

    if (error) {
      alert('Erreur : ' + error.message);
    } else {
      setMontantTotal('');
      chargerDonnees();
      alert('🏆 Cagnotte attribuée avec succès !');
    }
  };

  const containerBg = isDarkMode ? 'bg-[#0b1329] text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200';
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-300';

  return (
    <div className={`max-w-4xl mx-auto p-4 rounded-2xl border shadow-lg space-y-4 text-xs font-sans ${containerBg}`}>
      <h3 className="font-black uppercase text-sm text-orange-500 flex items-center gap-2">
        <span>🏆</span> Attributions & Ramassages de Cagnotte
      </h3>

      <form onSubmit={attribuerCagnotte} className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <select value={participantId} onChange={(e) => setParticipantId(e.target.value)} className={`p-2 rounded-xl border ${inputBg}`} required>
          <option value="">-- Bénéficiaire --</option>
          {participants.map(p => <option key={p.id} value={p.id}>{p.nom_complet}</option>)}
        </select>
        <select value={cycleId} onChange={(e) => setCycleId(e.target.value)} className={`p-2 rounded-xl border ${inputBg}`} required>
          <option value="">-- Cycle concerné --</option>
          {cycles.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
        </select>
        <input
          type="number"
          placeholder="Montant total de la cagnotte"
          value={montantTotal}
          onChange={(e) => setMontantTotal(e.target.value)}
          className={`p-2 rounded-xl border ${inputBg}`}
          required
        />
        <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-black py-2 rounded-xl uppercase transition shadow">
          🚀 Valider l'attribution
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
              <th className="p-2">Bénéficiaire</th>
              <th className="p-2">Cycle</th>
              <th className="p-2">Montant Attribué</th>
              <th className="p-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {attributions.length === 0 ? (
              <tr><td colSpan="4" className="p-4 text-center text-slate-500">Aucune attribution enregistrée.</td></tr>
            ) : (
              attributions.map((a) => (
                <tr key={a.id} className={`border-b ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
                  <td className="p-2 font-bold">{a.tontine_participants?.nom_complet || 'Membre'}</td>
                  <td className="p-2">{a.tontine_cycles?.libelle || 'Cycle'}</td>
                  <td className="p-2 font-black text-emerald-400 font-mono">{a.montant_attribue?.toLocaleString()} FCFA</td>
                  <td className="p-2">{new Date(a.date_attribution).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}