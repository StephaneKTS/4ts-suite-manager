'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const LISTE_FREQUENCES = [
  { id: 'JOURNALIER', label: 'Journalier' },
  { id: 'HEBDOMADAIRE', label: 'Hebdomadaire' },
  { id: 'BIMENSUEL', label: 'Bimensuel (2x par mois)' },
  { id: 'MENSUEL', label: 'Mensuel' },
  { id: 'TRIMESTRIEL', label: 'Trimestriel' },
  { id: 'SEMESTRIEL', label: 'Semestriel' },
  { id: 'ANNUEL', label: 'Annuel' },
];

const LISTE_STATUTS = [
  { id: 'ACTIF', label: 'Actif', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'EN_COURS', label: 'En cours', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'CLÔTURÉ', label: 'Clôturé', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
];

export default function GestionTontineCycles({ entrepriseId = '4TS-290136', isDarkMode = false }) {
  const [cycles, setCycles] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [cycleEnEdition, setCycleEnEdition] = useState(null);

  // États pour les modales
  const [modalCreationOuverte, setModalCreationOuverte] = useState(false);
  const [modalFrequenceOuverte, setModalFrequenceOuverte] = useState(false);
  const [modalStatutOuverte, setModalStatutOuverte] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  const [nouveauCycle, setNouveauCycle] = useState({
    nom_cycle: '',
    montant_cotisation: '',
    montant_libre: false,
    frequence: 'MENSUEL',
    regle_reunion: '',
    nombre_tours: 12,
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: '',
    statut: 'ACTIF',
  });

  const chargerCycles = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('tontine_cycles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCycles(data || []);
    } catch (err) {
      console.error('Erreur chargement cycles :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerCycles();
  }, [entrepriseId]);

  const enregistrerCycle = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (!nouveauCycle.nom_cycle.trim()) {
      alert('⚠️ Veuillez renseigner le nom du cycle.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        id_entreprise: entrepriseId,
        nom_cycle: nouveauCycle.nom_cycle.trim().toUpperCase(),
        montant_cotisation: nouveauCycle.montant_libre ? 0 : (parseFloat(nouveauCycle.montant_cotisation) || 0),
        montant_libre: nouveauCycle.montant_libre,
        frequence: nouveauCycle.frequence,
        regle_reunion: (nouveauCycle.regle_reunion || '').trim().toUpperCase(),
        nombre_tours: parseInt(nouveauCycle.nombre_tours) || 12,
        date_debut: nouveauCycle.date_debut || null,
        date_fin: nouveauCycle.date_fin || null,
        statut: nouveauCycle.statut || 'ACTIF',
      };

      if (cycleEnEdition) {
        const { error } = await supabase
          .from('tontine_cycles')
          .update(payload)
          .eq('id', cycleEnEdition.id);
        if (error) throw error;
        alert('✅ Cycle mis à jour avec succès !');
      } else {
        const { error } = await supabase
          .from('tontine_cycles')
          .insert([payload]);
        if (error) throw error;
        alert('✅ Cycle créé avec succès !');
      }

      setCycleEnEdition(null);
      setNouveauCycle({
        nom_cycle: '',
        montant_cotisation: '',
        montant_libre: false,
        frequence: 'MENSUEL',
        regle_reunion: '',
        nombre_tours: 12,
        date_debut: new Date().toISOString().split('T')[0],
        date_fin: '',
        statut: 'ACTIF',
      });

      setModalCreationOuverte(false);
      await chargerCycles();
    } catch (err) {
      alert('❌ Erreur lors de l\'enregistrement : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const supprimerCycle = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce cycle de tontine ?')) return;
    try {
      const { error } = await supabase
        .from('tontine_cycles')
        .delete()
        .eq('id', id);
      if (error) throw error;
      alert('🗑️ Cycle supprimé avec succès !');
      setCycleEnEdition(null);
      setModalCreationOuverte(false);
      await chargerCycles();
    } catch (err) {
      alert('❌ Erreur lors de la suppression : ' + err.message);
    }
  };

  const ouvrirEdition = (c) => {
    setCycleEnEdition(c);
    setNouveauCycle({
      nom_cycle: c.nom_cycle || c.libelle || '',
      montant_cotisation: c.montant_cotisation || '',
      montant_libre: c.montant_libre || false,
      frequence: c.frequence || 'MENSUEL',
      regle_reunion: c.regle_reunion || '',
      nombre_tours: c.nombre_tours || 12,
      date_debut: c.date_debut ? c.date_debut.split('T')[0] : new Date().toISOString().split('T')[0],
      date_fin: c.date_fin ? c.date_fin.split('T')[0] : '',
      statut: c.statut || 'ACTIF',
    });
    setModalCreationOuverte(true);
  };

  const cyclesFiltres = cycles.filter(c => {
    const nomC = c.nom_cycle || c.libelle || '';
    const texte = `${nomC} ${c.frequence || ''} ${c.statut || ''} ${c.regle_reunion || ''}`.toLowerCase();
    return texte.includes(recherche.toLowerCase());
  });

  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-white text-slate-900 border-slate-300';
  const labelColor = isDarkMode ? 'text-slate-200' : 'text-slate-800';

  return (
    <div className="w-full h-full space-y-2 font-sans text-xs">
      
      {/* BARRE D'EN-TÊTE UNIQUE */}
      <div className="flex justify-between items-center bg-white/5 px-2 py-1.5 rounded border border-slate-700/20 gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={chargerCycles}
          className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
          title="Rafraîchir"
        >
          🔄 Actualiser
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setCycleEnEdition(null);
              setNouveauCycle({
                nom_cycle: '',
                montant_cotisation: '',
                montant_libre: false,
                frequence: 'MENSUEL',
                regle_reunion: '',
                nombre_tours: 12,
                date_debut: new Date().toISOString().split('T')[0],
                date_fin: '',
                statut: 'ACTIF',
              });
              setModalCreationOuverte(true);
            }}
            className="bg-orange-600 hover:bg-orange-600 text-white font-black px-2 py-1 rounded transition shadow text-[10px] uppercase cursor-pointer"
          >
            ➕ Créer
          </button>

          <div className="bg-slate-800 text-white px-2 py-1 rounded font-black text-[10px] uppercase border border-slate-600">
            📋 Cycles ({cycles.length})
          </div>
        </div>
      </div>

      {/* MODALE DE CRÉATION / MODIFICATION DE CYCLE */}
      {modalCreationOuverte && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 w-full max-w-lg space-y-2 shadow-2xl text-white my-auto">
            <div className="flex justify-between items-center border-b pb-1.5 border-slate-800">
              <h4 className="font-black text-orange-500 uppercase text-xs">
                {cycleEnEdition ? '✏️ Modifier le cycle' : '➕ Configurer un nouveau cycle'}
              </h4>
              <button
                type="button"
                onClick={() => setModalCreationOuverte(false)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-1.5 py-0.5 rounded text-xs transition cursor-pointer"
                title="Fermer"
              >
                ✖
              </button>
            </div>

            <form onSubmit={enregistrerCycle} className="space-y-2 w-full">
              
              {/* LIGNE 1 : Nom du cycle */}
              <div>
                <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Nom du Cycle / Type de Tontine *</label>
                <input
                  type="text"
                  required
                  value={nouveauCycle.nom_cycle}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNouveauCycle({ ...nouveauCycle, nom_cycle: e.target.value.toUpperCase() })}
                  className={`w-full p-1.5 rounded border text-xs font-bold uppercase ${inputBg}`}
                />
              </div>

              {/* LIGNE 2 : Montant & Option Montant Libre */}
              <div className="space-y-1 p-1.5 rounded bg-white/5 border border-slate-700/20">
                <div className="flex justify-between items-center">
                  <label className={`font-black text-[9px] uppercase ${labelColor}`}>Montant de la Cotisation</label>
                  <label className="flex items-center gap-1 cursor-pointer text-[9px] font-bold text-orange-400">
                    <input
                      type="checkbox"
                      checked={nouveauCycle.montant_libre}
                      onChange={(e) => setNouveauCycle({ ...nouveauCycle, montant_libre: e.target.checked })}
                      className="rounded accent-orange-600 cursor-pointer"
                    />
                    Montant libre / Au choix
                  </label>
                </div>
                {!nouveauCycle.montant_libre && (
                  <input
                    type="number"
                    required={!nouveauCycle.montant_libre}
                    value={nouveauCycle.montant_cotisation}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauCycle({ ...nouveauCycle, montant_cotisation: e.target.value })}
                    className={`w-full p-1.5 rounded border text-xs font-bold font-mono text-emerald-600 ${inputBg}`}
                  />
                )}
              </div>

              {/* LIGNE 3 : Choix de la Fréquence & du Statut en Modale */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Fréquence</label>
                  <button
                    type="button"
                    onClick={() => setModalFrequenceOuverte(true)}
                    className={`w-full p-1.5 rounded border text-xs font-bold flex justify-between items-center cursor-pointer ${inputBg}`}
                  >
                    <span className="truncate">{LISTE_FREQUENCES.find(f => f.id === nouveauCycle.frequence)?.label || nouveauCycle.frequence}</span>
                    <span className="text-orange-500 font-black">▼</span>
                  </button>
                </div>

                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Statut</label>
                  <button
                    type="button"
                    onClick={() => setModalStatutOuverte(true)}
                    className={`w-full p-1.5 rounded border text-xs font-bold flex justify-between items-center cursor-pointer ${inputBg}`}
                  >
                    <span className="truncate">{LISTE_STATUTS.find(s => s.id === nouveauCycle.statut)?.label || nouveauCycle.statut}</span>
                    <span className="text-orange-500 font-black">▼</span>
                  </button>
                </div>
              </div>

              {/* LIGNE 4 : Règle ou Date précise des réunions */}
              <div>
                <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Date / Règle des réunions</label>
                <input
                  type="text"
                  value={nouveauCycle.regle_reunion}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNouveauCycle({ ...nouveauCycle, regle_reunion: e.target.value.toUpperCase() })}
                  className={`w-full p-1.5 rounded border text-xs font-bold uppercase ${inputBg}`}
                />
              </div>

              {/* LIGNE 5 : Nombre de tours & Date de début */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Nombre de Tours</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={nouveauCycle.nombre_tours}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauCycle({ ...nouveauCycle, nombre_tours: e.target.value })}
                    className={`w-full p-1.5 rounded border text-xs font-bold ${inputBg}`}
                  />
                </div>
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Date de début</label>
                  <input
                    type="date"
                    value={nouveauCycle.date_debut}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauCycle({ ...nouveauCycle, date_debut: e.target.value })}
                    className={`w-full p-1.5 rounded border text-xs font-bold ${inputBg}`}
                  />
                </div>
              </div>

              {/* BOUTONS D'ACTION COMPACTS */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <div>
                  {cycleEnEdition && (
                    <button
                      type="button"
                      onClick={() => supprimerCycle(cycleEnEdition.id)}
                      className="bg-red-600 hover:bg-red-500 text-white font-black px-2 py-1 rounded text-[10px] shadow transition cursor-pointer"
                    >
                      🗑️ Supprimer
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModalCreationOuverte(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-2 py-1 rounded text-[10px] cursor-pointer">
                    Annuler
                  </button>
                  <button type="submit" disabled={enTrainDeSauvegarder} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-1 rounded text-[10px] shadow cursor-pointer">
                    {enTrainDeSauvegarder ? 'Enregistrement...' : (cycleEnEdition ? 'Mettre à jour' : 'Enregistrer')}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION DE LA FRÉQUENCE */}
      {modalFrequenceOuverte && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-8 p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 w-full max-w-sm space-y-2 shadow-2xl text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1">
              <h5 className="font-black uppercase text-[10px] text-orange-500">Sélectionner la Fréquence</h5>
              <button type="button" onClick={() => setModalFrequenceOuverte(false)} className="bg-red-600 hover:bg-red-500 text-white font-bold px-1.5 py-0.5 rounded text-xs transition cursor-pointer">✖</button>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {LISTE_FREQUENCES.map((freq) => (
                <button
                  key={freq.id}
                  type="button"
                  onClick={() => {
                    setNouveauCycle({ ...nouveauCycle, frequence: freq.id });
                    setModalFrequenceOuverte(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded font-bold text-xs transition flex justify-between items-center cursor-pointer ${
                    nouveauCycle.frequence === freq.id ? 'bg-orange-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <span>{freq.label}</span>
                  {nouveauCycle.frequence === freq.id && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION DU STATUT */}
      {modalStatutOuverte && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-8 p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 w-full max-w-sm space-y-2 shadow-2xl text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1">
              <h5 className="font-black uppercase text-[10px] text-orange-500">Sélectionner le Statut</h5>
              <button type="button" onClick={() => setModalStatutOuverte(false)} className="bg-red-600 hover:bg-red-500 text-white font-bold px-1.5 py-0.5 rounded text-xs transition cursor-pointer">✖</button>
            </div>
            <div className="space-y-1">
              {LISTE_STATUTS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setNouveauCycle({ ...nouveauCycle, statut: st.id });
                    setModalStatutOuverte(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded font-bold text-xs transition flex justify-between items-center cursor-pointer ${
                    nouveauCycle.statut === st.id ? 'bg-orange-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <span>{st.label}</span>
                  {nouveauCycle.statut === st.id && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VUE DE LA LISTE DES CYCLES */}
      <div className="space-y-2 w-full">
        <div className="bg-white p-1 rounded border border-slate-200 shadow-2xs">
          <input
            type="text"
            value={recherche}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 text-xs focus:outline-none"
            placeholder="Rechercher un cycle..."
          />
        </div>

        <div className="overflow-x-auto border border-slate-700/20 rounded bg-white shadow-2xs w-full">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-800 border-b uppercase text-[9px] font-black select-none">
              <tr>
                <th className="p-2">Nom du Cycle</th>
                <th className="p-2 text-center">Montant</th>
                <th className="p-2 text-center">Fréquence</th>
                <th className="p-2 text-center">Tours</th>
                <th className="p-2 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[10px]">
              {chargement ? (
                <tr><td colSpan="5" className="p-4 text-center animate-pulse text-slate-500">Chargement...</td></tr>
              ) : cyclesFiltres.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center text-slate-500 font-bold">Aucun cycle configuré. Cliquez sur "Créer".</td></tr>
              ) : (
                cyclesFiltres.map((c) => {
                  const nomAffiche = c.nom_cycle || c.libelle || 'CYCLE';
                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => ouvrirEdition(c)} 
                      className="hover:bg-orange-50/70 cursor-pointer transition select-none text-slate-900"
                      title="Cliquez pour modifier ou supprimer ce cycle"
                    >
                      <td className="p-2 font-black uppercase text-slate-900">
                        {nomAffiche}
                        {c.regle_reunion && <div className="text-[8px] text-slate-500 font-normal">🗓️ {c.regle_reunion}</div>}
                      </td>
                      <td className="p-2 text-center font-black font-mono text-emerald-700 whitespace-nowrap">
                        {c.montant_libre ? <span className="text-purple-600 font-bold">Au choix</span> : `${c.montant_cotisation?.toLocaleString()} F`}
                      </td>
                      <td className="p-2 text-center font-bold text-slate-700 uppercase">{c.frequence}</td>
                      <td className="p-2 text-center font-black text-blue-600">{c.nombre_tours}</td>
                      <td className="p-2 text-center">
                        <span className="bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded text-[8px] uppercase border border-emerald-200">
                          {c.statut}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}