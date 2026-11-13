'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PageTontine({ entrepriseId = '4TS-290136' }) {
  const moduleActuel = 'TONTINE';

  const cleCacheCycles = `tontine_cycles_${entrepriseId}`;
  const cleCacheParticipants = `tontine_participants_${entrepriseId}`;

  const [cycles, setCycles] = useState([]);
  const [participants, setParticipants] = useState([]);
  
  const [modeVue, setModeVue] = useState('cycles'); // 'cycles' ou 'participants'
  const [chargement, setChargement] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  // Formulaire Cycle
  const [afficherFormCycle, setAfficherFormCycle] = useState(false);
  const [nouveauCycle, setNouveauCycle] = useState({
    nom_cycle: '',
    montant_mise: 0,
    periodicite: 'MENSUELLE',
    nombre_tours: 12,
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: '',
  });

  // Formulaire Participant
  const [afficherFormParticipant, setAfficherFormParticipant] = useState(false);
  const [cycleSelectionneId, setCycleSelectionneId] = useState('');
  const [nouveauParticipant, setNouveauParticipant] = useState({
    nom_participant: '',
    telephone: '',
    nombre_parts: 1,
  });

  const chargerDonneesTontine = async () => {
    setChargement(true);
    try {
      const { data: dataCycles, error: errC } = await supabase
        .from('tontine_cycles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (errC) throw errC;
      if (dataCycles) {
        setCycles(dataCycles);
        if (dataCycles.length > 0 && !cycleSelectionneId) {
          setCycleSelectionneId(dataCycles[0].id);
        }
      }

      const { data: dataParts, error: errP } = await supabase
        .from('tontine_participants')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (errP) throw errP;
      if (dataParts) {
        setParticipants(dataParts);
      }
    } catch (err) {
      console.warn('Mode hors-ligne ou erreur chargement tontine :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonneesTontine();
  }, [entrepriseId]);

  const enregistrerCycle = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (!nouveauCycle.nom_cycle.trim()) {
      alert('⚠️ Veuillez renseigner le nom du cycle de tontine.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        nom_cycle: nouveauCycle.nom_cycle.trim().toUpperCase(),
        montant_mise: parseFloat(nouveauCycle.montant_mise) || 0,
        periodicite: nouveauCycle.periodicite,
        nombre_tours: parseInt(nouveauCycle.nombre_tours) || 1,
        date_debut: nouveauCycle.date_debut || null,
        date_fin: nouveauCycle.date_fin || null,
        statut: 'EN_COURS',
      };

      const { data, error } = await supabase.from('tontine_cycles').insert([payload]).select();
      if (error) throw error;

      alert('Cycle de tontine créé avec succès !');
      setAfficherFormCycle(false);
      setNouveauCycle({
        nom_cycle: '',
        montant_mise: 0,
        periodicite: 'MENSUELLE',
        nombre_tours: 12,
        date_debut: new Date().toISOString().split('T')[0],
        date_fin: '',
      });
      await chargerDonneesTontine();
    } catch (err) {
      alert('Erreur lors de la création du cycle : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const enregistrerParticipant = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (!cycleSelectionneId) {
      alert('⚠️ Veuillez sélectionner un cycle de tontine.');
      return;
    }
    if (!nouveauParticipant.nom_participant.trim()) {
      alert('⚠️ Veuillez renseigner le nom du participant.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        id_cycle: parseInt(cycleSelectionneId),
        nom_participant: nouveauParticipant.nom_participant.trim().toUpperCase(),
        telephone: nouveauParticipant.telephone.trim(),
        nombre_parts: parseInt(nouveauParticipant.nombre_parts) || 1,
      };

      const { error } = await supabase.from('tontine_participants').insert([payload]);
      if (error) throw error;

      alert('Participant ajouté avec succès !');
      setAfficherFormParticipant(false);
      setNouveauParticipant({ nom_participant: '', telephone: '', nombre_parts: 1 });
      await chargerDonneesTontine();
    } catch (err) {
      alert("Erreur lors de l'ajout du participant : " + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const participantsFiltres = participants.filter(
    (p) => String(p.id_cycle) === String(cycleSelectionneId)
  );

  return (
    <div className="space-y-3 font-sans text-xs p-2 max-w-4xl mx-auto">
      {/* En-tête du module */}
      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-2xs gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤝</span>
          <div>
            <h3 className="font-extrabold text-slate-900 uppercase text-xs">
              MODULE GESTION TONTINE
            </h3>
            <p className="text-[9px] text-slate-500 font-bold">
              Cycles, cotisations et attributions de parts
            </p>
          </div>
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setModeVue('cycles')}
            className={`px-3 py-1.5 rounded-lg font-black text-[10px] transition border ${
              modeVue === 'cycles'
                ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Cycles ({cycles.length})
          </button>
          <button
            type="button"
            onClick={() => setModeVue('participants')}
            className={`px-3 py-1.5 rounded-lg font-black text-[10px] transition border ${
              modeVue === 'participants'
                ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Participants ({participants.length})
          </button>
        </div>
      </div>

      {/* VUE CYCLES */}
      {modeVue === 'cycles' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xs">
            <h4 className="font-black uppercase text-[10px]">Liste des Cycles de Tontine</h4>
            <button
              type="button"
              onClick={() => setAfficherFormCycle(!afficherFormCycle)}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition shadow-2xs"
            >
              {afficherFormCycle ? 'Fermer' : '+ Nouveau Cycle'}
            </button>
          </div>

          {afficherFormCycle && (
            <form onSubmit={enregistrerCycle} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl shadow-md space-y-2.5">
              <h5 className="font-black text-[10px] text-orange-600 uppercase pb-1 border-b border-slate-100">
                Créer un nouveau cycle de tontine
              </h5>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Nom du Cycle *</label>
                  <input
                    type="text"
                    required
                    value={nouveauCycle.nom_cycle}
                    onChange={(e) => setNouveauCycle({ ...nouveauCycle, nom_cycle: e.target.value })}
                    placeholder="EX: TONTINE ESPOIR 2026"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-black text-slate-900 uppercase text-xs"
                  />
                </div>
                <div>
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Montant de la Mise (FCFA) *</label>
                  <input
                    type="number"
                    required
                    value={nouveauCycle.montant_mise}
                    onChange={(e) => setNouveauCycle({ ...nouveauCycle, montant_mise: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-black text-emerald-700 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Périodicité</label>
                  <select
                    value={nouveauCycle.periodicite}
                    onChange={(e) => setNouveauCycle({ ...nouveauCycle, periodicite: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-xs"
                  >
                    <option value="HEBDOMADAIRE">Hebdomadaire</option>
                    <option value="MENSUELLE">Mensuelle</option>
                    <option value="JOURNALIERE">Journalière</option>
                  </select>
                </div>
                <div>
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Nombre de Tours *</label>
                  <input
                    type="number"
                    required
                    value={nouveauCycle.nombre_tours}
                    onChange={(e) => setNouveauCycle({ ...nouveauCycle, nombre_tours: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Date Début</label>
                  <input
                    type="date"
                    value={nouveauCycle.date_debut}
                    onChange={(e) => setNouveauCycle({ ...nouveauCycle, date_debut: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAfficherFormCycle(false)}
                  className="bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={enTrainDeSauvegarder}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded-lg text-xs shadow-xs"
                >
                  {enTrainDeSauvegarder ? 'Enregistrement...' : 'Enregistrer le Cycle'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black">
                  <th className="p-2.5">Nom du Cycle</th>
                  <th className="p-2.5 text-center">Mise (FCFA)</th>
                  <th className="p-2.5 text-center">Périodicité</th>
                  <th className="p-2.5 text-center">Tours</th>
                  <th className="p-2.5 text-center">Date Début</th>
                  <th className="p-2.5 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cycles.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-slate-500 font-bold">
                      Aucun cycle de tontine créé pour le moment.
                    </td>
                  </tr>
                ) : (
                  cycles.map((c) => (
                    <tr key={c.id} className="hover:bg-orange-50/50 transition">
                      <td className="p-2.5 font-black uppercase text-slate-900">{c.nom_cycle}</td>
                      <td className="p-2.5 text-center font-black text-emerald-700">{c.montant_mise}</td>
                      <td className="p-2.5 text-center font-bold text-slate-700">{c.periodicite}</td>
                      <td className="p-2.5 text-center font-bold text-slate-800">{c.nombre_tours}</td>
                      <td className="p-2.5 text-center font-mono text-slate-600">{c.date_debut || '-'}</td>
                      <td className="p-2.5 text-center">
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded border border-emerald-200">
                          {c.statut}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VUE PARTICIPANTS */}
      {modeVue === 'participants' && (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
            <label className="block font-black text-[9px] text-slate-700 uppercase">Sélectionner le Cycle Actif</label>
            <select
              value={cycleSelectionneId}
              onChange={(e) => setCycleSelectionneId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-black text-orange-700 text-xs"
            >
              <option value="">-- Choisir un cycle --</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  🏷️ {c.nom_cycle} (Mise : {c.montant_mise} FCFA)
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xs">
            <h4 className="font-black uppercase text-[10px]">
              Participants inscrits ({participantsFiltres.length})
            </h4>
            <button
              type="button"
              disabled={!cycleSelectionneId}
              onClick={() => setAfficherFormParticipant(!afficherFormParticipant)}
              className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition shadow-2xs"
            >
              {afficherFormParticipant ? 'Fermer' : '+ Ajouter un Participant'}
            </button>
          </div>

          {afficherFormParticipant && (
            <form onSubmit={enregistrerParticipant} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl shadow-md space-y-2.5">
              <h5 className="font-black text-[10px] text-orange-600 uppercase pb-1 border-b border-slate-100">
                Inscrire un participant au cycle sélectionné
              </h5>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Nom & Prénom *</label>
                  <input
                    type="text"
                    required
                    value={nouveauParticipant.nom_participant}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, nom_participant: e.target.value })}
                    placeholder="EX: JEAN TIENTA"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-black text-slate-900 uppercase text-xs"
                  />
                </div>
                <div>
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Téléphone</label>
                  <input
                    type="text"
                    value={nouveauParticipant.telephone}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, telephone: e.target.value })}
                    placeholder="699000000"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Nombre de Parts</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={nouveauParticipant.nombre_parts}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, nombre_parts: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-black text-blue-700 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAfficherFormParticipant(false)}
                  className="bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={enTrainDeSauvegarder}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded-lg text-xs shadow-xs"
                >
                  {enTrainDeSauvegarder ? 'Ajout...' : 'Inscrire le Participant'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black">
                  <th className="p-2.5">Nom du Participant</th>
                  <th className="p-2.5">Téléphone</th>
                  <th className="p-2.5 text-center">Parts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participantsFiltres.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-4 text-center text-slate-500 font-bold">
                      Aucun participant inscrit dans ce cycle.
                    </td>
                  </tr>
                ) : (
                  participantsFiltres.map((p) => (
                    <tr key={p.id} className="hover:bg-orange-50/50 transition">
                      <td className="p-2.5 font-black uppercase text-slate-900">{p.nom_participant}</td>
                      <td className="p-2.5 font-mono text-slate-700">{p.telephone || '-'}</td>
                      <td className="p-2.5 text-center font-black text-blue-700">{p.nombre_parts} part(s)</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}