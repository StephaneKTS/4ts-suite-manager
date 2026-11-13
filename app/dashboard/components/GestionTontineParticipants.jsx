'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionTontineParticipants({ entrepriseId, isDarkMode }) {
  const [participants, setParticipants] = useState([]);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    chargerParticipants();
  }, [entrepriseId]);

  const chargerParticipants = async () => {
    setChargement(true);
    const { data, error } = await supabase
      .from('tontine_participants')
      .select('*')
      .eq('id_entreprise', entrepriseId || '4TS-234321');

    if (!error && data) {
      setParticipants(data);
    }
    setChargement(false);
  };

  const ajouterParticipant = async (e) => {
    e.preventDefault();
    if (!nom.trim()) return;

    const { error } = await supabase.from('tontine_participants').insert([{
      id_entreprise: entrepriseId || '4TS-234321',
      nom_complet: nom.trim(),
      telephone: telephone.trim(),
      date_adhesion: new Date().toISOString()
    }]);

    if (error) {
      alert('Erreur : ' + error.message);
    } else {
      setNom('');
      setTelephone('');
      chargerParticipants();
      alert('✅ Participant enregistré avec succès !');
    }
  };

  const containerBg = isDarkMode ? 'bg-[#0b1329] text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200';
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-300';

  return (
    <div className={`w-full max-w-full overflow-hidden p-3 sm:p-4 rounded-2xl border shadow-lg space-y-3 font-sans text-xs ${containerBg}`}>
      <h3 className="font-black uppercase text-xs sm:text-sm text-orange-500 flex items-center gap-2 truncate">
        <span>👥</span> <span className="truncate">Gestion des Participants (Tontine)</span>
      </h3>

      <form onSubmit={ajouterParticipant} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          placeholder="Nom et Prénom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className={`p-2 rounded-xl border text-xs truncate ${inputBg}`}
          required
        />
        <input
          type="text"
          placeholder="Téléphone"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          className={`p-2 rounded-xl border text-xs truncate ${inputBg}`}
        />
        <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-black py-2 px-3 rounded-xl uppercase transition shadow text-[10px] truncate">
          ➕ Enregistrer
        </button>
      </form>

      <div className="w-full overflow-x-auto max-h-[50vh]">
        <table className="w-full text-left border-collapse min-w-[300px]">
          <thead>
            <tr className={`border-b text-[10px] uppercase ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
              <th className="p-2">Nom complet</th>
              <th className="p-2">Téléphone</th>
              <th className="p-2">Adhésion</th>
            </tr>
          </thead>
          <tbody>
            {chargement ? (
              <tr><td colSpan="3" className="p-4 text-center animate-pulse">Chargement...</td></tr>
            ) : participants.length === 0 ? (
              <tr><td colSpan="3" className="p-4 text-center text-slate-500">Aucun participant enregistré.</td></tr>
            ) : (
              participants.map((p) => (
                <tr key={p.id} className={`border-b text-xs ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
                  <td className="p-2 font-bold truncate max-w-[150px]">{p.nom_complet}</td>
                  <td className="p-2 font-mono truncate">{p.telephone || 'N/A'}</td>
                  <td className="p-2 whitespace-nowrap">{new Date(p.date_adhesion).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}