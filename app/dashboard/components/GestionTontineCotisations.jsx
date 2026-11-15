'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionTontineCotisations({ entrepriseId = '4TS-234321', isDarkMode = false }) {
  const [participants, setParticipants] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState('');
  const [numeroTour, setNumeroTour] = useState('1'); // Ajout du numéro de tour requis par la base
  const [cotisations, setCotisations] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [sousVue, setSousVue] = useState('saisie'); // 'saisie' | 'liste'
  const [modalCycleOuverte, setModalCycleOuverte] = useState(false);
  const [selectionMembres, setSelectionMembres] = useState({});

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId]);

  const chargerDonnees = async () => {
    setChargement(true);
    const idEnt = entrepriseId || '4TS-234321';
    try {
      const { data: part, error: errPart } = await supabase
        .from('tontine_participants')
        .select('*')
        .eq('id_entreprise', idEnt);
      if (errPart) throw errPart;

      const { data: cyc, error: errCyc } = await supabase
        .from('tontine_cycles')
        .select('*')
        .eq('id_entreprise', idEnt);
      if (errCyc) throw errCyc;

      const { data: cot, error: errCot } = await supabase
        .from('tontine_cotisations')
        .select(`
          *,
          tontine_participants (id, nom_participant, nom_complet, prenom, libelle_role, nombre_parts),
          tontine_cycles (id, nom_cycle, libelle, montant_cotisation, montant_mise)
        `)
        .eq('id_entreprise', idEnt)
        .order('created_at', { ascending: false });

      if (errCot) throw errCot;

      if (part) setParticipants(part);
      if (cyc) setCycles(cyc);
      if (cot) setCotisations(cot);
    } catch (err) {
      console.error('Erreur chargement :', err.message);
    } finally {
      setChargement(false);
    }
  };

  const selectionnerCycleModal = (idC) => {
    setCycleId(idC);
    setModalCycleOuverte(false);
    if (!idC) {
      setSelectionMembres({});
      return;
    }

    const cycleTrouve = cycles.find(c => c.id.toString() === idC.toString());
    const montantBaseCycle = cycleTrouve ? (parseFloat(cycleTrouve.montant_cotisation || cycleTrouve.montant_mise || 0)) : 0;

    const membresDuCycle = participants.filter(p => p.id_cycle?.toString() === idC.toString());
    const nouveauMap = {};

    membresDuCycle.forEach(m => {
      const parts = m.nombre_parts || 1;
      nouveauMap[m.id] = {
        coche: false,
        montant: montantBaseCycle * parts
      };
    });

    setSelectionMembres(nouveauMap);
  };

  const toggleMembreCoche = (idMembre) => {
    setSelectionMembres(prev => ({
      ...prev,
      [idMembre]: {
        ...prev[idMembre],
        coche: !prev[idMembre]?.coche
      }
    }));
  };

  const modifierMontantMembre = (idMembre, valeur) => {
    setSelectionMembres(prev => ({
      ...prev,
      [idMembre]: {
        ...prev[idMembre],
        montant: parseFloat(valeur) || 0
      }
    }));
  };

  const validerCotisation = async (e) => {
    e.preventDefault();
    if (!cycleId) {
      alert('⚠️ Veuillez d’abord sélectionner un cycle.');
      return;
    }

    const membresCoches = Object.entries(selectionMembres).filter(([_, data]) => data.coche);
    if (membresCoches.length === 0) {
      alert('⚠️ Veuillez cocher au moins un membre ayant honoré sa cotisation.');
      return;
    }

    const idEnt = entrepriseId || '4TS-234321';
    setChargement(true);

    try {
      const payloadInsertions = membresCoches.map(([idMembre, data]) => ({
        id_entreprise: idEnt,
        id_participant: parseInt(idMembre),
        id_cycle: parseInt(cycleId),
        numero_tour: parseInt(numeroTour) || 1, // Inclusion du numéro de tour requis
        montant_verse: parseFloat(data.montant),
        date_versement: new Date().toISOString()
      }));

      const { error } = await supabase.from('tontine_cotisations').insert(payloadInsertions);
      if (error) throw error;

      alert(`✅ ${membresCoches.length} cotisation(s) validée(s) avec succès !`);
      setCycleId('');
      setSelectionMembres({});
      setSousVue('liste');
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur lors de la validation : ' + err.message);
    } finally {
      setChargement(false);
    }
  };

  const cycleActuelObj = cycles.find(c => c.id.toString() === cycleId?.toString());
  const membresDuCycleSelectionne = participants.filter(p => p.id_cycle?.toString() === cycleId?.toString());

  const membresAvecStatut = membresDuCycleSelectionne.map(m => {
    const cotisationTrouvee = cotisations.find(c => c.id_cycle?.toString() === cycleId?.toString() && (c.id_participant?.toString() === m.id?.toString() || c.participant_id?.toString() === m.id?.toString()) && c.numero_tour?.toString() === numeroTour?.toString());
    return {
      ...m,
      aCotise: !!cotisationTrouvee,
      cotisationDetails: cotisationTrouvee
    };
  });

  const containerBg = isDarkMode ? 'bg-[#0b1329] text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200';

  return (
    <div className={`max-w-4xl mx-auto p-4 rounded-2xl border shadow-lg space-y-4 text-xs font-sans ${containerBg}`}>
      
      {/* EN-TÊTE AVEC LES DEUX BOUTONS PRINCIPAUX */}
      <div className="flex justify-between items-center border-b pb-3 border-slate-700/30">
        <h3 className="font-black uppercase text-sm text-orange-500 flex items-center gap-2">
          <span>💰</span> SUIVI DES COTISATIONS & VERSEMENTS
        </h3>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSousVue('saisie')}
            className={`px-3 py-2 rounded-xl font-black text-xs uppercase transition shadow cursor-pointer ${
              sousVue === 'saisie' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-black hover:bg-gray-300'
            }`}
          >
            ✍️ Saisir des cotisations
          </button>
          <button
            type="button"
            onClick={() => setSousVue('liste')}
            className={`px-3 py-2 rounded-xl font-black text-xs uppercase transition shadow cursor-pointer ${
              sousVue === 'liste' ? 'bg-gray-200 text-black border border-gray-400' : 'bg-gray-200 text-black hover:bg-gray-300'
            }`}
          >
            📋 Liste des cotisations
          </button>
        </div>
      </div>

      {/* SÉLECTION DU CYCLE ET DU NUMÉRO DE TOUR */}
      <div className="p-3 rounded-xl border border-gray-300 bg-gray-100 text-black flex flex-wrap justify-between items-center gap-2 shadow-2xs">
        <div className="flex-1 min-w-[200px]">
          <span className="block font-black text-[9px] uppercase text-gray-600 mb-0.5">🎯 Cycle / Antenne Actif :</span>
          <span className="font-black text-xs uppercase text-black">
            {cycleActuelObj ? (cycleActuelObj.nom_cycle || cycleActuelObj.libelle) : '⚠️ Aucun cycle sélectionné'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <label className="font-black text-[9px] uppercase text-gray-600 mb-0.5">N° Tour / Séance :</label>
            <input
              type="number"
              min="1"
              value={numeroTour}
              onChange={(e) => setNumeroTour(e.target.value)}
              className="w-20 p-1.5 rounded-lg bg-white text-black font-mono font-bold text-center border border-gray-400 text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => setModalCycleOuverte(true)}
            className="bg-gray-200 hover:bg-gray-300 text-black font-black px-4 py-2 rounded-xl uppercase text-xs transition border border-gray-400 shadow cursor-pointer flex items-center gap-1.5 mt-4"
          >
            <span>🎯</span> {cycleActuelObj ? 'Changer de cycle' : 'Choisir un cycle'}
          </button>
        </div>
      </div>

      {/* VUE 1 : SAISIE DES COTISATIONS */}
      {sousVue === 'saisie' && (
        <div className="space-y-3">
          {!cycleId ? (
            <div className="p-8 text-center text-gray-700 bg-gray-100 rounded-xl border border-gray-300">
              <p className="font-bold text-sm">Veuillez d'abord choisir un cycle en cliquant sur le bouton ci-dessus.</p>
            </div>
          ) : (
            <form onSubmit={validerCotisation} className="space-y-3 animate-fadeIn">
              <div className="flex justify-between items-center px-1">
                <h4 className="font-black uppercase text-black text-xs">
                  Membres inscrits : {cycleActuelObj?.nom_cycle || cycleActuelObj?.libelle} (Tour n° {numeroTour}) - {membresDuCycleSelectionne.length} participant(s)
                </h4>
                <span className="text-[10px] text-gray-600 font-bold">Cochez les membres ayant honoré leur cotisation</span>
              </div>

              <div className="overflow-x-auto border border-gray-300 rounded-xl bg-white shadow-2xs max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 uppercase text-[9px] font-black bg-gray-200 text-black z-10 border-b border-gray-300">
                    <tr>
                      <th className="p-2.5 text-center w-12">Actif</th>
                      <th className="p-2.5">Nom & Prénom du Membre</th>
                      <th className="p-2.5 text-center">Rôle</th>
                      <th className="p-2.5 text-center">Parts</th>
                      <th className="p-2.5 text-right">Montant à Verser (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-[10px]">
                    {membresDuCycleSelectionne.length === 0 ? (
                      <tr><td colSpan="5" className="p-6 text-center text-gray-600 font-bold">Aucun membre n'est inscrit à ce cycle.</td></tr>
                    ) : (
                      membresDuCycleSelectionne.map((m) => {
                        const estCoche = selectionMembres[m.id]?.coche || false;
                        const montantMembre = selectionMembres[m.id]?.montant ?? 0;
                        const nomComplet = `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}`;

                        return (
                          <tr key={m.id} className={`transition ${estCoche ? 'bg-orange-50 font-bold text-black' : 'hover:bg-gray-50 text-black'}`}>
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={estCoche}
                                onChange={() => toggleMembreCoche(m.id)}
                                className="w-4 h-4 accent-orange-600 cursor-pointer rounded"
                              />
                            </td>
                            <td className="p-2.5 uppercase font-black text-black">{nomComplet}</td>
                            <td className="p-2.5 text-center">
                              <span className="bg-gray-200 text-black font-black px-1.5 py-0.5 rounded text-[8px] uppercase border border-gray-300">
                                {m.libelle_role || 'ADHERANT'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-black">{m.nombre_parts || 1}</td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                value={montantMembre}
                                disabled={!estCoche}
                                onChange={(e) => modifierMontantMembre(m.id, e.target.value)}
                                className="w-28 p-1.5 rounded-lg bg-gray-100 text-black font-mono font-bold text-right border border-gray-400 text-xs disabled:opacity-40"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={chargement || membresDuCycleSelectionne.length === 0}
                  className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black px-6 py-2.5 rounded-xl uppercase transition shadow cursor-pointer text-xs flex items-center gap-2"
                >
                  <span>💾</span> Valider la cotisation
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* VUE 2 : LISTE DES COTISATIONS AVEC STATUTS OK / ÉCHEC */}
      {sousVue === 'liste' && (
        <div className="space-y-3 animate-fadeIn">
          {!cycleId ? (
            <div className="p-8 text-center text-gray-700 bg-gray-100 rounded-xl border border-gray-300">
              <p className="font-bold text-sm">Veuillez choisir un cycle pour afficher la liste des cotisations et les statuts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h4 className="font-black uppercase text-black text-xs">
                  État des versements : {cycleActuelObj?.nom_cycle || cycleActuelObj?.libelle} (Tour n° {numeroTour})
                </h4>
                <span className="text-[10px] text-gray-600 font-bold">Total inscrits : {membresDuCycleSelectionne.length} | Ayant cotisé : {membresAvecStatut.filter(m => m.aCotise).length}</span>
              </div>

              <div className="overflow-x-auto border border-gray-300 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead className="uppercase text-[9px] font-black bg-gray-200 text-black border-b border-gray-300">
                    <tr>
                      <th className="p-2.5">Nom & Prénom du Membre</th>
                      <th className="p-2.5 text-center">Rôle</th>
                      <th className="p-2.5 text-center">Parts</th>
                      <th className="p-2.5 text-center">Statut / Notification</th>
                      <th className="p-2.5 text-right">Montant Versé</th>
                      <th className="p-2.5 text-center">Date & Heure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-[10px]">
                    {membresAvecStatut.length === 0 ? (
                      <tr><td colSpan="6" className="p-6 text-center text-gray-600 font-bold">Aucun membre inscrit à ce cycle.</td></tr>
                    ) : (
                      membresAvecStatut.map((m) => {
                        const nomComplet = `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}`;
                        return (
                          <tr key={m.id} className={`transition ${m.aCotise ? 'bg-emerald-50' : 'bg-red-50'}`}>
                            <td className="p-2.5 font-black uppercase text-black">{nomComplet}</td>
                            <td className="p-2.5 text-center">
                              <span className="bg-gray-200 text-black font-black px-1.5 py-0.5 rounded text-[8px] uppercase border border-gray-300">
                                {m.libelle_role || 'ADHERANT'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-black">{m.nombre_parts || 1}</td>
                            <td className="p-2.5 text-center">
                              {m.aCotise ? (
                                <span className="bg-emerald-600 text-white font-black px-2.5 py-1 rounded-full text-[9px] uppercase shadow-2xs inline-flex items-center gap-1">
                                  <span>✅</span> OK
                                </span>
                              ) : (
                                <span className="bg-red-600 text-white font-black px-2.5 py-1 rounded-full text-[9px] uppercase shadow-2xs inline-flex items-center gap-1">
                                  <span>❌</span> ÉCHEC
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-black font-mono text-black">
                              {m.cotisationDetails ? `${m.cotisationDetails.montant_verse?.toLocaleString()} FCFA` : '-'}
                            </td>
                            <td className="p-2.5 text-center font-mono text-gray-700">
                              {m.cotisationDetails ? new Date(m.cotisationDetails.date_versement).toLocaleString() : 'Non versé'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALE DE SÉLECTION DU CYCLE */}
      {modalCycleOuverte && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl shadow-2xl border border-gray-300 bg-white text-black p-4 space-y-3">
            <div className="flex justify-between items-center border-b pb-2 border-gray-300">
              <h5 className="font-black text-xs uppercase text-black">🎯 CHOISIR UN CYCLE</h5>
              <button type="button" onClick={() => setModalCycleOuverte(false)} className="text-gray-600 hover:text-black font-bold text-sm cursor-pointer">✖</button>
            </div>
            
            <div className="space-y-2">
              {cycles.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">Aucun cycle enregistré.</p>
              ) : (
                cycles.map((cycle) => {
                  const estActif = cycleId?.toString() === cycle.id?.toString();
                  const nomC = cycle.nom_cycle || cycle.libelle || `Cycle #${cycle.id}`;
                  const montantRef = cycle.montant_cotisation || cycle.montant_mise || 0;
                  return (
                    <div
                      key={cycle.id}
                      onClick={() => selectionnerCycleModal(cycle.id)}
                      className={`p-2 rounded-xl border cursor-pointer transition flex flex-col gap-0.5 ${
                        estActif ? 'bg-gray-300 border-black text-black font-bold' : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-black'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs uppercase text-black">🎯 {nomC}</span>
                        {estActif && <span className="text-black font-bold text-xs">✓ Sélectionné</span>}
                      </div>
                      <span className="text-[10px] text-gray-700">
                        Montant : {montantRef > 0 ? `${montantRef.toLocaleString()}F` : 'Libre'} | Fréquence : {cycle.frequence || cycle.periodicite || 'N/A'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-300">
              <button type="button" onClick={() => setModalCycleOuverte(false)} className="bg-gray-200 hover:bg-gray-300 text-black font-bold px-4 py-1.5 rounded-lg text-[10px] cursor-pointer border border-gray-400">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}