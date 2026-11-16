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
  { id: 'ACTIF', label: 'Actif' },
  { id: 'EN_COURS', label: 'En cours' },
  { id: 'CLÔTURÉ', label: 'Clôturé' },
];

const LISTE_TYPES_CYCLE = [
  { id: 'BOUFFER', label: 'Tontine à bouffer' },
  { id: 'EPARGNE', label: 'Fonds de Caisse / Épargne' },
];

const calculerDateEcheance = (dateDebutStr, nbMois) => {
  if (!dateDebutStr) return '';
  const [annee, mois, jour] = dateDebutStr.split('-').map(Number);
  if (!annee || !mois || !jour) return '';
  
  const d = new Date(annee, mois - 1 + nbMois, jour);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function GestionTontineCycles({ entrepriseId = '4TS-290136', isDarkMode = false, onRetour = null }) {
  const [cycles, setCycles] = useState([]);
  const [tousLesMembresActifs, setTousLesMembresActifs] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [cycleEnEdition, setCycleEnEdition] = useState(null);

  // États pour le mode hors ligne & synchronisation
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  const [modalCreationOuverte, setModalCreationOuverte] = useState(false);
  const [modalFrequenceOuverte, setModalFrequenceOuverte] = useState(false);
  const [modalStatutOuverte, setModalStatutOuverte] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  const [nouveauCycle, setNouveauCycle] = useState({
    nom_cycle: '',
    type_cycle: 'BOUFFER',
    montant_cotisation: '',
    montant_libre: false,
    frequence: 'MENSUEL',
    regle_reunion: '',
    nombre_tours: 1,
    activer_delai: false,
    delai_paiement_mois: 6,
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: '',
    statut: 'ACTIF',
  });

  const [modeActivationMembres, setModeActivationMembres] = useState('tous');
  const [selectionMembresCycle, setSelectionMembresCycle] = useState({});

  const cleCacheQueue = `4ts_cycles_queue_${entrepriseId}`;

  // Gestion de la connectivité et synchronisation hors ligne
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      verifierEtSynchroniserFileAttente();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    mettreAJourCompteurFileAttente();
    chargerDonneesInitiale();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [entrepriseId]);

  const mettreAJourCompteurFileAttente = () => {
    try {
      const queue = JSON.parse(localStorage.getItem(cleCacheQueue) || '[]');
      setPendingActionsCount(queue.length);
    } catch (e) {
      setPendingActionsCount(0);
    }
  };

  const ajouterActionHorsLigne = (typeAction, payload) => {
    try {
      const queue = JSON.parse(localStorage.getItem(cleCacheQueue) || '[]');
      queue.push({ id: Date.now(), type: typeAction, payload, timestamp: new Date().toISOString() });
      localStorage.setItem(cleCacheQueue, JSON.stringify(queue));
      mettreAJourCompteurFileAttente();
    } catch (err) {
      console.error('Erreur mise en cache hors ligne cycles :', err);
    }
  };

  const verifierEtSynchroniserFileAttente = async () => {
    if (!navigator.onLine) return;
    try {
      const queue = JSON.parse(localStorage.getItem(cleCacheQueue) || '[]');
      if (queue.length === 0) return;

      console.log(`🔄 Synchronisation de ${queue.length} actions tontine cycles en attente...`);
      const resteQueue = [];

      for (const action of queue) {
        try {
          if (action.type === 'INSERT_CYCLE') {
            // Nettoyage de l'ID temporaire local pour laisser Supabase générer son UUID
            const payloadPropre = { ...action.payload };
            if (payloadPropre.id && payloadPropre.id.toString().startsWith('local_')) {
              delete payloadPropre.id;
            }
            const { error } = await supabase.from('tontine_cycles').insert([payloadPropre]);
            if (error) throw error;
          } else if (action.type === 'UPDATE_CYCLE') {
            const { error } = await supabase.from('tontine_cycles').update(action.payload.data).eq('id', action.payload.id);
            if (error) throw error;
          } else if (action.type === 'DELETE_CYCLE') {
            const { error } = await supabase.from('tontine_cycles').delete().eq('id', action.payload.id);
            if (error) throw error;
          }
        } catch (err) {
          console.error(`Échec synchro action cycle ${action.id}:`, err.message);
          resteQueue.push(action);
        }
      }

      localStorage.setItem(cleCacheQueue, JSON.stringify(resteQueue));
      mettreAJourCompteurFileAttente();
      if (resteQueue.length === 0) {
        alert('✅ Synchronisation des cycles effectuée avec succès !');
        chargerDonneesInitiale();
      }
    } catch (err) {
      console.error('Erreur globale synchronisation cycles :', err);
    }
  };

  const chargerDonneesInitiale = async () => {
    const idEnt = entrepriseId || '4TS-290136';

    // ⚡ Chargement instantané depuis le cache local (zéro latence perçue)
    try {
      const cacheCycles = localStorage.getItem(`4ts_cache_cycles_list_${idEnt}`);
      const cacheMembres = localStorage.getItem(`4ts_cache_participants_list_${idEnt}`);
      if (cacheCycles) setCycles(JSON.parse(cacheCycles));
      if (cacheMembres) setTousLesMembresActifs(JSON.parse(cacheMembres));
    } catch (e) {
      console.warn('Erreur lecture cache local cycles :', e);
    }

    if (!navigator.onLine) return;

    try {
      const { data: cyclesData, error } = await supabase
        .from('tontine_cycles')
        .select('*')
        .eq('id_entreprise', idEnt)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: membresData } = await supabase
        .from('tontine_participants')
        .select('*')
        .eq('id_entreprise', idEnt);

      const mapMembresUniques = new Map();
      (membresData || []).forEach(m => {
        const cle = `${(m.nom_participant || m.nom_complet || '').trim().toLowerCase()}_${(m.prenom || '').trim().toLowerCase()}`;
        if (!mapMembresUniques.has(cle)) {
          mapMembresUniques.set(cle, { ...m, nombre_parts: m.nombre_parts || 1 });
        }
      });
      const listeMembresRef = Array.from(mapMembresUniques.values());
      setTousLesMembresActifs(listeMembresRef);
      localStorage.setItem(`4ts_cache_participants_list_${idEnt}`, JSON.stringify(listeMembresRef));

      const cyclesAvecTours = await Promise.all((cyclesData || []).map(async (c) => {
        if (c.type_cycle === 'EPARGNE') {
          return { ...c, nombre_tours_reel: 1 };
        }
        const { data: partsData } = await supabase
          .from('tontine_participants')
          .select('nombre_parts')
          .eq('id_entreprise', idEnt)
          .eq('id_cycle', c.id);

        const totalParts = (partsData || []).reduce((acc, p) => acc + (parseInt(p.nombre_parts || 1) || 1), 0);
        return {
          ...c,
          nombre_tours_reel: totalParts > 0 ? totalParts : (c.nombre_tours || 1)
        };
      }));

      setCycles(cyclesAvecTours);
      localStorage.setItem(`4ts_cache_cycles_list_${idEnt}`, JSON.stringify(cyclesAvecTours));
    } catch (err) {
      console.error('Erreur chargement cycles :', err.message);
    }
  };

  useEffect(() => {
    chargerDonneesInitiale();
  }, [entrepriseId]);

  const initialiserSelectionMembres = (membresRef, cycleIdCible = null, participantsExistantsCycle = []) => {
    const mapSel = {};
    membresRef.forEach(m => {
      const dejaInscrit = participantsExistantsCycle.find(p => 
        (p.id?.toString() === m.id?.toString()) ||
        ((p.nom_participant || p.nom_complet || '').trim().toLowerCase() === (m.nom_participant || m.nom_complet || '').trim().toLowerCase())
      );

      mapSel[m.id || m.nom_participant] = {
        coche: cycleIdCible ? !!dejaInscrit : true,
        parts: dejaInscrit?.nombre_parts || m.nombre_parts || 1,
        idMembreOriginal: m.id
      };
    });
    setSelectionMembresCycle(mapSel);
  };

  const calculerToursAutomatiqueDepuisSelection = () => {
    if (modeActivationMembres === 'tous') {
      return tousLesMembresActifs.length;
    } else {
      let totalParts = 0;
      Object.values(selectionMembresCycle).forEach(item => {
        if (item.coche) {
          totalParts += parseInt(item.parts || 1);
        }
      });
      return Math.max(1, totalParts);
    }
  };

  useEffect(() => {
    if (modalCreationOuverte && nouveauCycle.type_cycle === 'BOUFFER' && !nouveauCycle.activer_delai) {
      const toursCalc = calculerToursAutomatiqueDepuisSelection();
      setNouveauCycle(prev => ({ ...prev, nombre_tours: toursCalc }));
    }
  }, [modalCreationOuverte, nouveauCycle.type_cycle, nouveauCycle.activer_delai, modeActivationMembres, selectionMembresCycle]);

  const enregistrerCycle = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (!nouveauCycle.nom_cycle.trim()) {
      alert('⚠️ Veuillez renseigner le nom du cycle.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const dateEcheanceCalc = nouveauCycle.activer_delai 
        ? calculerDateEcheance(nouveauCycle.date_debut, parseInt(nouveauCycle.delai_paiement_mois) || 6) 
        : null;

      const payloadCycle = {
        id_entreprise: entrepriseId,
        nom_cycle: nouveauCycle.nom_cycle.trim().toUpperCase(),
        type_cycle: nouveauCycle.type_cycle || 'BOUFFER',
        montant_cotisation: nouveauCycle.montant_libre ? 0 : (parseFloat(nouveauCycle.montant_cotisation) || 0),
        montant_libre: nouveauCycle.montant_libre,
        frequence: nouveauCycle.frequence,
        regle_reunion: (nouveauCycle.regle_reunion || '').trim().toUpperCase(),
        nombre_tours: (nouveauCycle.activer_delai || nouveauCycle.type_cycle === 'EPARGNE') ? 1 : (parseInt(nouveauCycle.nombre_tours) || 1),
        delai_paiement_mois: nouveauCycle.activer_delai ? (parseInt(nouveauCycle.delai_paiement_mois) || 0) : 0,
        date_debut: nouveauCycle.date_debut || null,
        date_fin: dateEcheanceCalc,
        statut: nouveauCycle.statut || 'ACTIF',
      };

      if (!navigator.onLine) {
        if (cycleEnEdition) {
          ajouterActionHorsLigne('UPDATE_CYCLE', { id: cycleEnEdition.id, data: payloadCycle });
          const majCycles = cycles.map(c => c.id === cycleEnEdition.id ? { ...c, ...payloadCycle } : c);
          setCycles(majCycles);
          localStorage.setItem(`4ts_cache_cycles_list_${entrepriseId}`, JSON.stringify(majCycles));
        } else {
          const fakeId = 'local_' + Date.now();
          const nouveauLocal = { ...payloadCycle, id: fakeId, created_at: new Date().toISOString() };
          ajouterActionHorsLigne('INSERT_CYCLE', nouveauLocal);
          const majCycles = [nouveauLocal, ...cycles];
          setCycles(majCycles);
          localStorage.setItem(`4ts_cache_cycles_list_${entrepriseId}`, JSON.stringify(majCycles));
        }

        alert('📴 Mode Hors Ligne : Cycle enregistré localement et mis en file d’attente.');
        setCycleEnEdition(null);
        setModalCreationOuverte(false);
        setEnTrainDeSauvegarder(false);
        return;
      }

      let idCycleEffectif = null;

      if (cycleEnEdition) {
        idCycleEffectif = cycleEnEdition.id;
        const { error } = await supabase
          .from('tontine_cycles')
          .update(payloadCycle)
          .eq('id', idCycleEffectif);
        if (error) throw error;
      } else {
        const { data: insertedCycle, error } = await supabase
          .from('tontine_cycles')
          .insert([payloadCycle])
          .select();
        if (error) throw error;
        if (insertedCycle && insertedCycle.length > 0) {
          idCycleEffectif = insertedCycle[0].id;
        }
      }

      if (idCycleEffectif) {
        if (cycleEnEdition) {
          await supabase
            .from('tontine_participants')
            .delete()
            .eq('id_entreprise', entrepriseId)
            .eq('id_cycle', idCycleEffectif);
        }

        const membresARattacher = [];
        tousLesMembresActifs.forEach(m => {
          const cle = m.id || m.nom_participant;
          const configMembre = selectionMembresCycle[cle];
          const estCoche = modeActivationMembres === 'tous' ? true : (configMembre?.coche || false);

          if (estCoche) {
            membresARattacher.push({
              id_entreprise: entrepriseId,
              id_cycle: idCycleEffectif,
              nom_participant: (m.nom_participant || m.nom_complet || '').trim().toUpperCase(),
              prenom: (m.prenom || '').trim().toUpperCase(),
              telephone: m.telephone || '',
              nombre_parts: configMembre?.parts || m.nombre_parts || 1,
              statut: 'ACTIF'
            });
          }
        });

        if (membresARattacher.length > 0) {
          await supabase
            .from('tontine_participants')
            .insert(membresARattacher);
        }
      }

      alert(cycleEnEdition ? '✅ Cycle mis à jour avec succès !' : '✅ Cycle créé et membres rattachés avec succès !');

      setCycleEnEdition(null);
      setModalCreationOuverte(false);
      await chargerDonneesInitiale();
    } catch (err) {
      alert('❌ Erreur lors de l\'enregistrement : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const supprimerCycle = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce cycle de tontine ?')) return;
    try {
      if (!navigator.onLine) {
        alert('⚠️ Impossible de supprimer un cycle en mode hors ligne.');
        return;
      }
      const { error } = await supabase
        .from('tontine_cycles')
        .delete()
        .eq('id', id);
      if (error) throw error;
      alert('🗑️ Cycle supprimé avec succès !');
      setCycleEnEdition(null);
      setModalCreationOuverte(false);
      await chargerDonneesInitiale();
    } catch (err) {
      alert('❌ Erreur lors de la suppression : ' + err.message);
    }
  };

  const ouvrirCreation = () => {
    setCycleEnEdition(null);
    setModeActivationMembres('tous');
    initialiserSelectionMembres(tousLesMembresActifs, null, []);

    setNouveauCycle({
      nom_cycle: '',
      type_cycle: 'BOUFFER',
      montant_cotisation: '',
      montant_libre: false,
      frequence: 'MENSUEL',
      regle_reunion: '',
      nombre_tours: Math.max(1, tousLesMembresActifs.length),
      activer_delai: false,
      delai_paiement_mois: 6,
      date_debut: new Date().toISOString().split('T')[0],
      date_fin: '',
      statut: 'ACTIF',
    });
    setModalCreationOuverte(true);
  };

  const ouvrirEdition = async (c) => {
    setCycleEnEdition(c);
    let participantsCycle = [];
    try {
      if (navigator.onLine) {
        const { data: partsData } = await supabase
          .from('tontine_participants')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('id_cycle', c.id);

        if (partsData) {
          participantsCycle = partsData;
        }
      }
    } catch (e) {
      console.warn(e);
    }

    setModeActivationMembres('personnalise');
    initialiserSelectionMembres(tousLesMembresActifs, c.id, participantsCycle);

    const hasDelai = (c.delai_paiement_mois !== undefined && c.delai_paiement_mois > 0) || !!c.date_fin;
    const toursReels = participantsCycle.reduce((acc, p) => acc + (parseInt(p.nombre_parts || 1) || 1), 0) || c.nombre_tours || 1;

    setNouveauCycle({
      nom_cycle: c.nom_cycle || c.libelle || '',
      type_cycle: c.type_cycle || 'BOUFFER',
      montant_cotisation: c.montant_cotisation || '',
      montant_libre: c.montant_libre || false,
      frequence: c.frequence || 'MENSUEL',
      regle_reunion: c.regle_reunion || '',
      nombre_tours: toursReels,
      activer_delai: hasDelai,
      delai_paiement_mois: c.delai_paiement_mois || 6,
      date_debut: c.date_debut ? c.date_debut.split('T')[0] : new Date().toISOString().split('T')[0],
      date_fin: c.date_fin ? c.date_fin.split('T')[0] : '',
      statut: c.statut || 'ACTIF',
    });
    setModalCreationOuverte(true);
  };

  const cyclesFiltres = cycles.filter(c => {
    const nomC = c.nom_cycle || c.libelle || '';
    const texte = `${nomC} ${c.frequence || ''} ${c.statut || ''} ${c.regle_reunion || ''} ${c.type_cycle || ''}`.toLowerCase();
    return texte.includes(recherche.toLowerCase());
  });

  const bgPrincipal = isDarkMode ? 'bg-[#050b18] text-slate-100' : 'bg-slate-100 text-slate-900';
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-white text-slate-900 border-slate-300';
  const labelColor = isDarkMode ? 'text-slate-200' : 'text-slate-800';

  return (
    <div className={`w-full h-full space-y-2 font-sans text-xs ${bgPrincipal}`}>
      
      {/* BANDEAU DE STATUT CONNEXION ÉPURÉ */}
      <div className={`flex justify-between items-center px-3 py-1 rounded-lg text-[10px] font-bold ${isOnline ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
        <div className="flex items-center gap-1.5">
          <span>{isOnline ? '🟢' : '🔴'}</span>
          <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>
        </div>
        {pendingActionsCount > 0 && (
          <button 
            type="button" 
            onClick={verifierEtSynchroniserFileAttente}
            className="bg-amber-600 hover:bg-amber-500 text-white px-2 py-0.5 rounded font-black uppercase text-[9px] cursor-pointer flex items-center gap-1"
          >
            <span>🔄</span> <span>({pendingActionsCount})</span>
          </button>
        )}
      </div>

      {/* BARRE D'EN-TÊTE */}
      <div className={`flex justify-end items-center px-2 py-1.5 rounded border gap-1 overflow-x-auto ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-300 shadow-2xs'}`}>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={ouvrirCreation}
            className="bg-red-600 hover:bg-red-500 text-white font-black px-2.5 py-1.5 rounded transition shadow text-[10px] uppercase cursor-pointer"
          >
            ➕ Créer
          </button>

          <div className={`px-2.5 py-1.5 rounded font-black text-[10px] uppercase border ${isDarkMode ? 'bg-slate-800 text-slate-100 border-slate-700' : 'bg-slate-200 text-slate-900 border-slate-300'}`}>
            📋 Cycles ({cycles.length})
          </div>
        </div>
      </div>

      {/* MODALE DE CRÉATION / MODIFICATION DE CYCLE */}
      {modalCreationOuverte && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className={`border rounded-lg p-3 w-full max-w-xl space-y-2.5 shadow-2xl my-auto max-h-[92vh] overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
            <div className={`flex justify-between items-center border-b pb-1.5 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h4 className={`font-black uppercase text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                {cycleEnEdition ? '✏️ Modifier le cycle' : '➕ Créer un nouveau cycle & Activer les membres'}
              </h4>
              <button
                type="button"
                onClick={() => setModalCreationOuverte(false)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-1.5 py-0.5 rounded text-xs transition cursor-pointer"
              >
                ✖
              </button>
            </div>

            <form onSubmit={enregistrerCycle} className="space-y-2.5 w-full">
              
              <div>
                <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Nom du Cycle / Fonds de Caisse *</label>
                <input
                  type="text"
                  required
                  value={nouveauCycle.nom_cycle}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNouveauCycle({ ...nouveauCycle, nom_cycle: e.target.value.toUpperCase() })}
                  placeholder="EX: FONDS DE CAISSE, GRANDE TONTINE..."
                  className={`w-full p-1.5 rounded border text-xs font-bold uppercase ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Nature du Cycle / Cotisation *</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {LISTE_TYPES_CYCLE.map((typeC) => {
                    const estCoche = nouveauCycle.type_cycle === typeC.id;
                    return (
                      <button
                        key={typeC.id}
                        type="button"
                        onClick={() => setNouveauCycle({ ...nouveauCycle, type_cycle: typeC.id })}
                        className={`p-1.5 rounded border font-bold text-[10px] transition cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                          estCoche
                            ? (isDarkMode ? 'bg-slate-800 text-white border-slate-600 shadow' : 'bg-slate-200 text-slate-900 border-slate-400 shadow')
                            : (isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100')
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={estCoche}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 accent-red-600 cursor-pointer rounded pointer-events-none"
                        />
                        <span>{typeC.id === 'BOUFFER' ? '🎯 Tontine à bouffer' : '🏦 Fonds de Caisse / Épargne'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`space-y-1 p-2 rounded border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center">
                  <label className={`font-black text-[9px] uppercase ${labelColor}`}>Montant de la Cotisation / Fonds</label>
                  <label className={`flex items-center gap-1 cursor-pointer text-[9px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <input
                      type="checkbox"
                      checked={nouveauCycle.montant_libre}
                      onChange={(e) => setNouveauCycle({ ...nouveauCycle, montant_libre: e.target.checked })}
                      className="rounded accent-red-600 cursor-pointer"
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
                    placeholder="Ex: 50000"
                    className={`w-full p-1.5 rounded border text-xs font-bold font-mono text-emerald-600 ${inputBg}`}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Fréquence</label>
                  <button
                    type="button"
                    onClick={() => setModalFrequenceOuverte(true)}
                    className={`w-full p-1.5 rounded border text-xs font-bold flex justify-between items-center cursor-pointer ${inputBg}`}
                  >
                    <span className="truncate">{LISTE_FREQUENCES.find(f => f.id === nouveauCycle.frequence)?.label || nouveauCycle.frequence}</span>
                    <span className={`font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>▼</span>
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
                    <span className={`font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>▼</span>
                  </button>
                </div>
              </div>

              <div>
                <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Date / Règle des réunions</label>
                <input
                  type="text"
                  value={nouveauCycle.regle_reunion}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNouveauCycle({ ...nouveauCycle, regle_reunion: e.target.value.toUpperCase() })}
                  placeholder="EX: CHAQUE 1ER DIMANCHE DU MOIS"
                  className={`w-full p-1.5 rounded border text-xs font-bold uppercase ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Date de Début</label>
                <input
                  type="date"
                  value={nouveauCycle.date_debut}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNouveauCycle({ ...nouveauCycle, date_debut: e.target.value })}
                  className={`w-full p-1.5 rounded border text-xs font-bold ${inputBg}`}
                />
              </div>

              {/* SECTION ACTIVATION ET RATTACHEMENT DES MEMBRES */}
              <div className={`space-y-2 p-2.5 rounded-lg border ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'}`}>
                <div className="flex justify-between items-center">
                  <label className={`font-black text-xs uppercase ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>👥 Activation & Rattachement des Membres</label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setModeActivationMembres('tous')}
                      className={`px-2 py-1 rounded text-[9px] font-black uppercase transition cursor-pointer ${
                        modeActivationMembres === 'tous' ? 'bg-red-600 text-white' : (isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700')
                      }`}
                    >
                      🚀 Activer tous ({tousLesMembresActifs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setModeActivationMembres('personnalise')}
                      className={`px-2 py-1 rounded text-[9px] font-black uppercase transition cursor-pointer ${
                        modeActivationMembres === 'personnalise' ? 'bg-red-600 text-white' : (isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700')
                      }`}
                    >
                      ☑️ Sélection précise
                    </button>
                  </div>
                </div>

                {modeActivationMembres === 'tous' ? (
                  <div className={`text-[10px] font-bold p-2 rounded border ${isDarkMode ? 'bg-emerald-950/40 text-slate-200 border-emerald-500/30' : 'bg-emerald-50 text-emerald-900 border-emerald-200'}`}>
                    ✅ Ce cycle sera automatiquement rattaché à <b>TOUS les {tousLesMembresActifs.length} membres</b> enregistrés dans l'entreprise.
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Cochez les membres concernés et leurs parts :</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const maj = {};
                            Object.keys(selectionMembresCycle).forEach(k => {
                              maj[k] = { ...selectionMembresCycle[k], coche: true };
                            });
                            setSelectionMembresCycle(maj);
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded font-bold cursor-pointer ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-300 hover:bg-slate-400 text-slate-800'}`}
                        >
                          Tout cocher
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const maj = {};
                            Object.keys(selectionMembresCycle).forEach(k => {
                              maj[k] = { ...selectionMembresCycle[k], coche: false };
                            });
                            setSelectionMembresCycle(maj);
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded font-bold cursor-pointer ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-300 hover:bg-slate-400 text-slate-800'}`}
                        >
                          Tout décocher
                        </button>
                      </div>
                    </div>

                    <div className={`max-h-44 overflow-y-auto space-y-1 p-2 rounded border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'}`}>
                      {tousLesMembresActifs.length === 0 ? (
                        <p className={`text-center py-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Aucun membre enregistré dans l'application.</p>
                      ) : (
                        tousLesMembresActifs.map((m) => {
                          const cle = m.id || m.nom_participant;
                          const donneesMembre = selectionMembresCycle[cle] || { coche: false, parts: m.nombre_parts || 1 };
                          const nomComplet = `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}`;

                          return (
                            <div key={cle} className={`flex items-center justify-between p-1.5 rounded transition ${donneesMembre.coche ? (isDarkMode ? 'bg-slate-800 font-bold text-white' : 'bg-slate-100 font-bold text-slate-900') : (isDarkMode ? 'bg-slate-900/50 opacity-60 text-slate-400' : 'bg-slate-50 opacity-60 text-slate-500')}`}>
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={donneesMembre.coche}
                                  onChange={(e) => {
                                    const actif = e.target.checked;
                                    setSelectionMembresCycle(prev => ({
                                      ...prev,
                                      [cle]: { ...prev[cle], coche: actif }
                                    }));
                                  }}
                                  className="w-3.5 h-3.5 accent-red-600 rounded cursor-pointer"
                                />
                                <span className="truncate uppercase text-[10px]">{nomComplet}</span>
                              </label>

                              {nouveauCycle.type_cycle === 'BOUFFER' && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className={`text-[9px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Parts:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    disabled={!donneesMembre.coche}
                                    value={donneesMembre.parts}
                                    onChange={(e) => {
                                      const pVal = parseInt(e.target.value) || 1;
                                      setSelectionMembresCycle(prev => ({
                                        ...prev,
                                        [cle]: { ...prev[cle], parts: pVal }
                                      }));
                                    }}
                                    className={`w-12 p-0.5 text-center border rounded font-mono text-xs font-bold text-emerald-600 ${isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'}`}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION AVEC DÉLAI DE PAIEMENT */}
              <div className={`space-y-2 p-2.5 rounded-lg border ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                <label className={`flex items-center gap-2 cursor-pointer font-black text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  <input
                    type="checkbox"
                    checked={nouveauCycle.activer_delai}
                    onChange={(e) => setNouveauCycle({ ...nouveauCycle, activer_delai: e.target.checked })}
                    className="w-4 h-4 rounded accent-red-600 cursor-pointer"
                  />
                  <span>⏳ Activer un délai de paiement</span>
                </label>

                {nouveauCycle.activer_delai && (
                  <div className={`grid grid-cols-2 gap-2 pt-2 border-t animate-fadeIn ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                    <div>
                      <label className={`block font-black mb-0.5 text-[9px] uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Délai (Mois)</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="36"
                          value={nouveauCycle.delai_paiement_mois}
                          onChange={(e) => setNouveauCycle({ ...nouveauCycle, delai_paiement_mois: Math.max(1, parseInt(e.target.value) || 1) })}
                          className={`w-full p-1.5 rounded border text-xs font-mono font-bold text-center ${inputBg}`}
                        />
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => setNouveauCycle(prev => ({ ...prev, delai_paiement_mois: Math.min(36, prev.delai_paiement_mois + 1) }))}
                            className={`font-black px-1.5 py-0.5 text-[9px] rounded-t border cursor-pointer ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'}`}
                            title="Augmenter"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => setNouveauCycle(prev => ({ ...prev, delai_paiement_mois: Math.max(1, prev.delai_paiement_mois - 1) }))}
                            className={`font-black px-1.5 py-0.5 text-[9px] rounded-b border cursor-pointer ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'}`}
                            title="Diminuer"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={`block font-black mb-0.5 text-[9px] uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Date d'échéance (Auto)</label>
                      <input
                        type="date"
                        disabled
                        value={calculerDateEcheance(nouveauCycle.date_debut, nouveauCycle.delai_paiement_mois)}
                        className={`w-full p-1.5 rounded border text-xs font-bold font-mono cursor-not-allowed opacity-90 ${isDarkMode ? 'bg-slate-950 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-800 border-slate-300'}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {nouveauCycle.type_cycle === 'BOUFFER' && !nouveauCycle.activer_delai && (
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Nombre de Tours (Calcul auto)</label>
                  <input
                    type="number"
                    disabled
                    value={calculerToursAutomatiqueDepuisSelection()}
                    className={`w-full p-1.5 rounded border text-xs font-bold font-mono cursor-not-allowed opacity-80 ${inputBg}`}
                  />
                </div>
              )}

              <div className={`flex justify-between items-center pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
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
                  <button type="button" onClick={() => setModalCreationOuverte(false)} className={`font-bold px-2.5 py-1 rounded text-[10px] cursor-pointer ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-300 hover:bg-slate-400 text-slate-800'}`}>
                    Annuler
                  </button>
                  <button type="submit" disabled={enTrainDeSauvegarder} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-1 rounded text-[10px] shadow cursor-pointer">
                    {enTrainDeSauvegarder ? 'Enregistrement...' : (cycleEnEdition ? 'Mettre à jour' : 'Enregistrer & Activer')}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODALES DE SÉLECTION */}
      {modalFrequenceOuverte && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-8 p-3">
          <div className={`border rounded-lg p-2.5 w-full max-w-sm space-y-2 shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
            <div className={`flex justify-between items-center border-b pb-1 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h5 className={`font-black uppercase text-[10px] ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Sélectionner la Fréquence</h5>
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
                    nouveauCycle.frequence === freq.id 
                      ? (isDarkMode ? 'bg-slate-800 text-white border border-slate-600' : 'bg-slate-200 text-slate-900 border border-slate-400') 
                      : (isDarkMode ? 'bg-slate-900 hover:bg-slate-800 text-slate-200' : 'bg-white hover:bg-slate-100 text-slate-800')
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

      {modalStatutOuverte && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-8 p-3">
          <div className={`border rounded-lg p-2.5 w-full max-w-sm space-y-2 shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
            <div className={`flex justify-between items-center border-b pb-1 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h5 className={`font-black uppercase text-[10px] ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Sélectionner le Statut</h5>
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
                    nouveauCycle.statut === st.id 
                      ? (isDarkMode ? 'bg-slate-800 text-white border border-slate-600' : 'bg-slate-200 text-slate-900 border border-slate-400') 
                      : (isDarkMode ? 'bg-slate-900 hover:bg-slate-800 text-slate-200' : 'bg-white hover:bg-slate-100 text-slate-800')
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

      {/* TABLEAU DES CYCLES */}
      <div className="space-y-2 w-full">
        <div className={`p-1 rounded border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'}`}>
          <input
            type="text"
            value={recherche}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setRecherche(e.target.value)}
            className={`w-full border rounded px-2.5 py-1.5 font-bold text-xs focus:outline-none ${inputBg}`}
            placeholder="🔍 Rechercher un cycle ou un fonds de caisse..."
          />
        </div>

        <div className={`overflow-x-auto border rounded shadow-2xs w-full ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'}`}>
          <table className="w-full text-left text-xs">
            <thead className={`border-b uppercase text-[9px] font-black select-none ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
              <tr>
                <th className="p-2.5">Nom du Cycle / Fonds</th>
                <th className="p-2.5 text-center">Montant</th>
                <th className="p-2.5 text-center">Délai / Échéance</th>
                <th className="p-2.5 text-center">Fréquence</th>
                <th className="p-2.5 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-[10px] ${isDarkMode ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-900'}`}>
              {chargement ? (
                <tr><td colSpan="5" className="p-4 text-center animate-pulse text-slate-400">Chargement...</td></tr>
              ) : cyclesFiltres.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center text-slate-400 font-bold">Aucun cycle configuré. Cliquez sur "Créer".</td></tr>
              ) : (
                cyclesFiltres.map((c) => {
                  const nomAffiche = c.nom_cycle || c.libelle || 'CYCLE';
                  const estEpargne = c.type_cycle === 'EPARGNE';
                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => ouvrirEdition(c)} 
                      className={`cursor-pointer transition select-none ${isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100'}`}
                      title="Cliquez pour modifier ou supprimer"
                    >
                      <td className="p-2.5 font-black uppercase">
                        <div className="flex items-center gap-1.5">
                          <span>{nomAffiche}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${estEpargne ? (isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-800 border-slate-300') : (isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-200 text-slate-800 border-slate-300')}`}>
                            {estEpargne ? '🏦 FONDS / ÉPARGNE' : '🎯 BÉNÉFICIÉ'}
                          </span>
                        </div>
                        {c.regle_reunion && <div className={`text-[8px] font-normal mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>🗓️ {c.regle_reunion}</div>}
                      </td>
                      <td className="p-2.5 text-center font-black font-mono text-emerald-600 whitespace-nowrap">
                        {c.montant_libre ? <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Au choix</span> : `${c.montant_cotisation?.toLocaleString()} F`}
                      </td>
                      <td className={`p-2.5 text-center font-bold font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {c.delai_paiement_mois && c.delai_paiement_mois > 0 ? (
                          <div>
                            <div>{c.delai_paiement_mois} mois</div>
                            {c.date_fin && <div className={`text-[8px] font-normal ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Éch: {c.date_fin}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-400">Aucun</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-bold uppercase">{c.frequence}</td>
                      <td className="p-2.5 text-center">
                        <span className={`font-black px-2 py-0.5 rounded text-[8px] uppercase border ${isDarkMode ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
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