'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionTontineCotisations({ entrepriseId = '4TS-234321', isDarkMode = false, userEmail = 'stephs7352@gmail.com' }) {
  const [participants, setParticipants] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [attributions, setAttributions] = useState([]);
  const [caisseRecords, setCaisseRecords] = useState([]);
  const [cycleId, setCycleId] = useState('');
  const [numeroTour, setNumeroTour] = useState(1);
  const [tourEnCours, setTourEnCours] = useState(1);
  const [cotisations, setCotisations] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [sousVue, setSousVue] = useState('saisie'); // 'saisie' | 'liste' | 'detail' | 'etat_membre' | 'caisse' | 'caisse_detail'
  const [sessionDetail, setSessionDetail] = useState(null);
  const [caisseDetailSession, setCaisseDetailSession] = useState(null);
  const [filtreCycleId, setFiltreCycleId] = useState('');
  
  // États pour le mode hors ligne & synchronisation
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  // États pour la date de saisie, l'état membre et la caisse
  const [dateSaisie, setDateSaisie] = useState(new Date().toISOString().split('T')[0]);
  const [etatCycleId, setEtatCycleId] = useState('');
  const [caisseCycleId, setCaisseCycleId] = useState(''); // '' signifie TOUTES les caisses
  const [caisseFiltreDate, setCaisseFiltreDate] = useState('');
  const [caisseFiltreMembre, setCaisseFiltreMembre] = useState('');
  
  const [modalEtatCycleOuverte, setModalEtatCycleOuverte] = useState(false);
  const [modalCaisseCycleOuverte, setModalCaisseCycleOuverte] = useState(false);
  const [modalCaisseMembreOuverte, setModalCaisseMembreOuverte] = useState(false);
  
  // États des modales
  const [modalCycleOuverte, setModalCycleOuverte] = useState(false);
  const [modalAttributionOuverte, setModalAttributionOuverte] = useState(false);
  const [modalBeneficiaireOuverte, setModalBeneficiaireOuverte] = useState(false);
  const [modalFiltreCycleOuverte, setModalFiltreCycleOuverte] = useState(false);

  const [selectionMembres, setSelectionMembres] = useState({});

  // États pour la modale de remise de cagnotte
  const [beneficiaireSelection, setBeneficiaireSelection] = useState({ participantId: '', numeroPart: 1 });
  const [montantCagnotteGlobal, setMontantCagnotteGlobal] = useState(0);

  const estSuperAdmin = (userEmail || '').trim().toLowerCase() === 'stephs7352@gmail.com';
  const cleCacheQueue = `4ts_offline_queue_${entrepriseId}`;

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
    chargerDonnees();

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
      console.error('Erreur mise en cache hors ligne cotisations :', err);
    }
  };

  const verifierEtSynchroniserFileAttente = async () => {
    if (!navigator.onLine) return;
    try {
      const queue = JSON.parse(localStorage.getItem(cleCacheQueue) || '[]');
      if (queue.length === 0) return;

      console.log(`🔄 Synchronisation de ${queue.length} actions cotisations en attente...`);
      const resteQueue = [];

      for (const action of queue) {
        try {
          if (action.type === 'COTISATION') {
            const payloadPropre = Array.isArray(action.payload)
              ? action.payload.map(item => {
                  const copy = { ...item };
                  if (copy.id && copy.id.toString().startsWith('local_')) {
                    delete copy.id;
                  }
                  return copy;
                })
              : action.payload;

            const { error } = await supabase.from('tontine_cotisations').insert(payloadPropre);
            if (error) throw error;
          } else if (action.type === 'ATTRIBUTION') {
            const payloadPropre = { ...action.payload };
            if (payloadPropre.id && payloadPropre.id.toString().startsWith('local_')) {
              delete payloadPropre.id;
            }
            const { error } = await supabase.from('tontine_attributions').insert([payloadPropre]);
            if (error) throw error;
          }
        } catch (err) {
          console.error(`Échec synchro action cotisation ${action.id}:`, err.message);
          resteQueue.push(action);
        }
      }

      localStorage.setItem(cleCacheQueue, JSON.stringify(resteQueue));
      mettreAJourCompteurFileAttente();
      if (resteQueue.length === 0) {
        alert('✅ Synchronisation des cotisations et attributions effectuée avec succès !');
        chargerDonnees();
      }
    } catch (err) {
      console.error('Erreur globale de synchronisation :', err);
    }
  };

  const chargerDonnees = async () => {
    const idEnt = entrepriseId || '4TS-234321';
    
    // ⚡ Chargement instantané depuis le cache local (zéro latence perçue)
    try {
      const cachePart = localStorage.getItem(`4ts_cache_participants_${idEnt}`);
      const cacheCyc = localStorage.getItem(`4ts_cache_cycles_${idEnt}`);
      const cacheCot = localStorage.getItem(`4ts_cache_cotisations_${idEnt}`);
      const cacheAtt = localStorage.getItem(`4ts_cache_attributions_${idEnt}`);
      const cacheCai = localStorage.getItem(`4ts_cache_caisse_${idEnt}`);

      if (cachePart) setParticipants(JSON.parse(cachePart));
      if (cacheCyc) setCycles(JSON.parse(cacheCyc));
      if (cacheCot) setCotisations(JSON.parse(cacheCot));
      if (cacheAtt) setAttributions(JSON.parse(cacheAtt));
      if (cacheCai) setCaisseRecords(JSON.parse(cacheCai));
    } catch (e) {
      console.warn('Erreur lecture cache local :', e);
    }

    if (!navigator.onLine) return;

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
          tontine_participants (id, nom_participant, nom_complet, prenom, nombre_parts),
          tontine_cycles (id, nom_cycle, libelle, montant_cotisation, montant_mise, delai_paiement_mois, date_fin)
        `)
        .eq('id_entreprise', idEnt)
        .order('created_at', { ascending: false });
      if (errCot) throw errCot;

      const { data: att, error: errAtt } = await supabase
        .from('tontine_attributions')
        .select('*')
        .eq('id_entreprise', idEnt);
      if (errAtt) throw errAtt;

      const { data: cai, error: errCai } = await supabase
        .from('tontine_caisse')
        .select('*')
        .eq('id_entreprise', idEnt)
        .order('created_at', { ascending: false });
      if (errCai && errCai.code !== '42P01') console.warn('Table tontine_caisse :', errCai.message);

      if (part) {
        setParticipants(part);
        localStorage.setItem(`4ts_cache_participants_${idEnt}`, JSON.stringify(part));
      }
      if (cyc) {
        setCycles(cyc);
        localStorage.setItem(`4ts_cache_cycles_${idEnt}`, JSON.stringify(cyc));
      }
      if (cot) {
        setCotisations(cot);
        localStorage.setItem(`4ts_cache_cotisations_${idEnt}`, JSON.stringify(cot));
      }
      if (att) {
        setAttributions(att);
        localStorage.setItem(`4ts_cache_attributions_${idEnt}`, JSON.stringify(att));
      }
      if (cai) {
        setCaisseRecords(cai);
        localStorage.setItem(`4ts_cache_caisse_${idEnt}`, JSON.stringify(cai));
      }

      if (cycleId) {
        calculerTourAutomatique(cycleId, part, cot, att);
      }
    } catch (err) {
      console.error('Erreur chargement Supabase :', err.message);
    }
  };

  const estCycleEpargne = (cycle) => {
    if (!cycle) return false;
    const nom = (cycle.nom_cycle || cycle.libelle || '').toLowerCase();
    const type = (cycle.type_cycle || cycle.type || '').toLowerCase();
    return nom.includes('banque') || nom.includes('epargne') || nom.includes('projet') || type.includes('epargne') || type.includes('banque');
  };

  const calculerTourAutomatique = (idC, listeParticipants, listeCotisations, listeAttributions) => {
    const cycleObj = cycles.find(c => c.id?.toString() === idC?.toString());
    if (estCycleEpargne(cycleObj)) {
      setNumeroTour(1);
      return;
    }

    const cotisCycle = listeCotisations.filter(c => c.id_cycle?.toString() === idC.toString());
    if (cotisCycle.length === 0) {
      setNumeroTour(1);
      return;
    }

    const toursCotises = [...new Set(cotisCycle.map(c => parseInt(c.numero_tour || 1)))];
    const maxTour = Math.max(...toursCotises);
    
    const attMaxTour = listeAttributions.find(a => {
      const aCyc = a.id_cycle?.toString() || a.cycle_id?.toString();
      const aTour = parseInt(a.numero_tour || a.tour || 1);
      return aCyc === idC.toString() && aTour === maxTour;
    });

    if (attMaxTour) {
      setNumeroTour(maxTour + 1);
    } else {
      setNumeroTour(maxTour);
    }
  };

  const obtenirMembresOrdreTirage = (idC) => {
    const membresBruts = participants.filter(p => p.id_cycle?.toString() === idC?.toString());
    if (!idC) return membresBruts;

    try {
      const historiqueLocal = localStorage.getItem(`historique_tirages_${entrepriseId}`);
      if (historiqueLocal) {
        const tirages = JSON.parse(historiqueLocal);
        const tirageCycle = tirages.find(t => t.id_cycle?.toString() === idC.toString());
        if (tirageCycle && tirageCycle.resultats && tirageCycle.resultats.length > 0) {
          const membresordonnes = [];
          const membresRestants = [...membresBruts];

          tirageCycle.resultats.forEach(resMembre => {
            const idx = membresRestants.findIndex(m => 
              (m.id && resMembre.id && m.id.toString() === resMembre.id.toString()) ||
              ((m.nom_participant || m.nom_complet || '').trim().toUpperCase() === (resMembre.nom_participant || resMembre.nom_complet || '').trim().toUpperCase())
            );
            if (idx !== -1) {
              membresordonnes.push(membresRestants[idx]);
              membresRestants.splice(idx, 1);
            }
          });

          return [...membresordonnes, ...membresRestants];
        }
      }
    } catch (e) {
      console.warn('Erreur lecture tirages localStorage :', e);
    }

    return membresBruts;
  };

  const obtenirListePartsCycle = (idC) => {
    if (!idC) return [];
    const cycleObj = cycles.find(c => c.id?.toString() === idC?.toString());
    const membresCycle = obtenirMembresOrdreTirage(idC);
    let listeParts = [];

    if (estCycleEpargne(cycleObj)) {
      membresCycle.forEach(m => {
        listeParts.push({
          ...m,
          numeroPart: 1,
          dejaServie: false,
          affichageNom: `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}`
        });
      });
    } else {
      membresCycle.forEach(m => {
        const nbParts = parseInt(m.nombre_parts || 1);
        for (let i = 1; i <= nbParts; i++) {
          const attributionTrouvee = attributions.find(a => {
            const aCyc = a.id_cycle?.toString() || a.cycle_id?.toString();
            const aPart = (a.id_participant?.toString() || a.participant_id?.toString()) === m.id?.toString();
            const aNumPart = parseInt(a.numero_part || a.part_index || 1);
            return aCyc === idC.toString() && aPart && aNumPart === i;
          });

          const dejaServie = !!attributionTrouvee;
          const tourServi = attributionTrouvee ? (attributionTrouvee.numero_tour || attributionTrouvee.tour || 1) : null;

          listeParts.push({
            ...m,
            numeroPart: i,
            dejaServie,
            tourServi,
            affichageNom: nbParts > 1 
              ? `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''} (Part ${i}/${nbParts})` 
              : `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}`
          });
        }
      });
    }
    return listeParts;
  };

  const detecterBeneficiaireTour = (idC) => {
    const cycleObj = cycles.find(c => c.id?.toString() === idC?.toString());
    if (estCycleEpargne(cycleObj)) return null;

    try {
      const historiqueLocal = localStorage.getItem(`historique_tirages_${entrepriseId}`);
      if (historiqueLocal) {
        const tirages = JSON.parse(historiqueLocal);
        const tirageCycle = tirages.find(t => t.id_cycle?.toString() === idC.toString());
        if (tirageCycle && tirageCycle.resultats && tirageCycle.resultats.length > 0) {
          const indexBenef = (parseInt(numeroTour) - 1) % tirageCycle.resultats.length;
          const gagnantTirage = tirageCycle.resultats[indexBenef];
          
          const participantTrouve = participants.find(p => 
            p.id_cycle?.toString() === idC.toString() && 
            ((p.id && gagnantTirage.id && p.id.toString() === gagnantTirage.id.toString()) ||
             ((p.nom_participant || p.nom_complet || '').trim().toUpperCase() === (gagnantTirage.nom_participant || gagnantTirage.nom_complet || '').trim().toUpperCase()))
          );

          if (participantTrouve) {
            return {
              ...participantTrouve,
              numeroPart: 1,
              dejaServie: false,
              affichageNom: `${participantTrouve.nom_participant || participantTrouve.nom_complet || ''} ${participantTrouve.prenom || ''}`
            };
          }
        }
      }
    } catch (e) {
      console.warn('Erreur détection bénéficiaire tirage :', e);
    }

    const listeParts = obtenirListePartsCycle(idC);
    const partsDisponibles = listeParts.filter(p => !p.dejaServie);
    if (partsDisponibles.length > 0) return partsDisponibles[0];
    return listeParts[0] || null;
  };

  const selectionnerCycleModal = (idC) => {
    setCycleId(idC);
    setDateSaisie(new Date().toISOString().split('T')[0]);
    setModalCycleOuverte(false);
    if (!idC) {
      setSelectionMembres({});
      setNumeroTour(1);
      setBeneficiaireSelection({ participantId: '', numeroPart: 1 });
      return;
    }

    const cycleTrouve = cycles.find(c => c.id.toString() === idC.toString());
    const montantBaseCycle = cycleTrouve ? (parseFloat(cycleTrouve.montant_cotisation || cycleTrouve.montant_mise || 0)) : 0;
    const estEp = estCycleEpargne(cycleTrouve);
    const aDelai = cycleTrouve?.delai_paiement_mois > 0 || !!cycleTrouve?.date_fin;

    const membresDuCycle = obtenirMembresOrdreTirage(idC);
    
    calculerTourAutomatique(idC, participants, cotisations, attributions);

    if (!estEp && !aDelai) {
      const benefObj = detecterBeneficiaireTour(idC);
      setBeneficiaireSelection({ participantId: benefObj?.id || '', numeroPart: benefObj?.numeroPart || 1 });
    }

    const nouveauMap = {};
    membresDuCycle.forEach(m => {
      const parts = estEp ? 1 : (m.nombre_parts || 1);
      const montantPrevu = montantBaseCycle * parts;

      const cotisMembreCycle = cotisations.filter(c => 
        c.id_cycle?.toString() === idC?.toString() && 
        (c.id_participant?.toString() === m.id?.toString() || c.participant_id?.toString() === m.id?.toString())
      );
      const dejaCotise = cotisMembreCycle.reduce((acc, c) => acc + (parseFloat(c.montant_verse) || 0), 0);
      const soldeRestant = Math.max(0, montantPrevu - dejaCotise);

      nouveauMap[m.id] = {
        coche: false,
        montant: aDelai ? soldeRestant : montantPrevu
      };
    });

    setSelectionMembres(nouveauMap);
  };

  const toggleMembreCoche = (idMembre) => {
    const estActuellementCoche = selectionMembres[idMembre]?.coche || false;
    const cycleTrouve = cycles.find(c => c.id.toString() === cycleId?.toString());
    const montantBaseCycle = cycleTrouve ? (parseFloat(cycleTrouve.montant_cotisation || cycleTrouve.montant_mise || 0)) : 0;
    const m = participants.find(part => part.id?.toString() === idMembre?.toString());
    const parts = estCycleEpargne(cycleTrouve) ? 1 : (m?.nombre_parts || 1);
    const montantPrevu = montantBaseCycle * parts;
    const cotisMembreCycle = cotisations.filter(c => 
      c.id_cycle?.toString() === cycleId?.toString() && 
      (c.id_participant?.toString() === idMembre?.toString() || c.participant_id?.toString() === idMembre?.toString())
    );
    const dejaCotise = cotisMembreCycle.reduce((acc, c) => acc + (parseFloat(c.montant_verse) || 0), 0);
    const soldeRestant = Math.max(0, montantPrevu - dejaCotise);
    const aDelai = cycleTrouve?.delai_paiement_mois > 0 || !!cycleTrouve?.date_fin;

    setSelectionMembres(prev => ({
      ...prev,
      [idMembre]: {
        ...prev[idMembre],
        coche: !estActuellementCoche,
        montant: !estActuellementCoche ? (aDelai ? soldeRestant : montantPrevu) : prev[idMembre]?.montant
      }
    }));
  };

  const toutCocherOuDecocherSaisie = () => {
    const tousCoches = membresDuCycleSelectionne.length > 0 && membresDuCycleSelectionne.every(m => selectionMembres[m.id]?.coche);
    const cycleTrouve = cycles.find(c => c.id.toString() === cycleId?.toString());
    const montantBaseCycle = cycleTrouve ? (parseFloat(cycleTrouve.montant_cotisation || cycleTrouve.montant_mise || 0)) : 0;
    const aDelai = cycleTrouve?.delai_paiement_mois > 0 || !!cycleTrouve?.date_fin;

    const nouveauMap = {};
    membresDuCycleSelectionne.forEach(m => {
      const parts = estActuelEpargne ? 1 : (m.nombre_parts || 1);
      const montantPrevu = montantBaseCycle * parts;
      const cotisMembreCycle = cotisations.filter(c => 
        c.id_cycle?.toString() === cycleId?.toString() && 
        (c.id_participant?.toString() === m.id?.toString() || c.participant_id?.toString() === m.id?.toString())
      );
      const dejaCotise = cotisMembreCycle.reduce((acc, c) => acc + (parseFloat(c.montant_verse) || 0), 0);
      const soldeRestant = Math.max(0, montantPrevu - dejaCotise);

      nouveauMap[m.id] = {
        coche: !tousCoches,
        montant: !tousCoches ? (aDelai ? soldeRestant : montantPrevu) : 0
      };
    });
    setSelectionMembres(nouveauMap);
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
    const cycleObj = cycles.find(c => c.id.toString() === cycleId.toString());
    const estEp = estCycleEpargne(cycleObj);
    const dateHeureVersement = new Date(dateSaisie + 'T' + new Date().toTimeString().split(' ')[0]).toISOString();

    try {
      const tourActuel = numeroTour;
      setTourEnCours(tourActuel);

      const payloadInsertions = membresCoches.map(([idMembre, data]) => ({
        id_entreprise: idEnt,
        id_participant: parseInt(idMembre),
        id_cycle: parseInt(cycleId),
        numero_tour: parseInt(tourActuel),
        montant_verse: parseFloat(data.montant),
        date_versement: dateHeureVersement
      }));

      if (!navigator.onLine) {
        ajouterActionHorsLigne('COTISATION', payloadInsertions);
        
        const nouvellesCotisLocales = [...payloadInsertions.map(p => ({ ...p, id: 'local_' + Math.random() })), ...cotisations];
        setCotisations(nouvellesCotisLocales);
        localStorage.setItem(`4ts_cache_cotisations_${idEnt}`, JSON.stringify(nouvellesCotisLocales));

        alert('📴 Mode Hors Ligne : Cotisations enregistrées localement et mises en file d’attente pour synchronisation ultérieure !');
        setSelectionMembres({});
        setSousVue(estEp ? 'caisse' : 'liste');
        if (estEp) setCaisseCycleId(cycleId);
        setChargement(false);
        return;
      }

      const { error } = await supabase.from('tontine_cotisations').insert(payloadInsertions);
      if (error) throw error;

      const totalVersement = membresCoches.reduce((acc, [_, data]) => acc + (parseFloat(data.montant) || 0), 0);

      if (estEp) {
        const payloadCaisse = {
          id_entreprise: idEnt,
          id_cycle: parseInt(cycleId),
          montant_total: parseFloat(totalVersement),
          numero_tour: parseInt(tourActuel),
          date_versement: dateHeureVersement
        };

        const { error: errCai } = await supabase.from('tontine_caisse').insert([payloadCaisse]);
        if (errCai) {
          console.warn('Insertion table tontine_caisse :', errCai.message);
        }

        alert('🏦 Cotisation d’épargne enregistrée et versée dans la caisse avec succès !');
        setSelectionMembres({});
        setSousVue('caisse');
        setCaisseCycleId(cycleId);
        await chargerDonnees();
      } else {
        setMontantCagnotteGlobal(totalVersement);
        const benefObj = detecterBeneficiaireTour(cycleId);
        if (benefObj) {
          setBeneficiaireSelection({ participantId: benefObj.id, numeroPart: benefObj.numeroPart });
        }
        setModalAttributionOuverte(true);
        await chargerDonnees();
      }
    } catch (err) {
      alert('❌ Erreur lors de la validation : ' + err.message);
    } finally {
      setChargement(false);
    }
  };

  const confirmerRemiseCagnotte = async () => {
    if (!beneficiaireSelection.participantId) {
      alert('⚠️ Veuillez sélectionner un bénéficiaire.');
      return;
    }

    const idEnt = entrepriseId || '4TS-234321';
    try {
      const attributionExistante = attributions.find(a => {
        const aCyc = a.id_cycle?.toString() || a.cycle_id?.toString();
        const aTour = parseInt(a.numero_tour || a.tour || 1);
        return aCyc === cycleId?.toString() && aTour === parseInt(tourEnCours);
      });

      const payloadAttribution = {
        id_entreprise: idEnt,
        id_participant: parseInt(beneficiaireSelection.participantId),
        participant_id: parseInt(beneficiaireSelection.participantId),
        id_cycle: parseInt(cycleId),
        cycle_id: parseInt(cycleId),
        numero_tour: parseInt(tourEnCours),
        numero_part: parseInt(beneficiaireSelection.numeroPart || 1),
        montant_attribue: parseFloat(montantCagnotteGlobal),
        montant: parseFloat(montantCagnotteGlobal),
        date_attribution: new Date().toISOString(),
        statut: 'VERSE'
      };

      if (!navigator.onLine) {
        ajouterActionHorsLigne('ATTRIBUTION', payloadAttribution);
        alert('📴 Mode Hors Ligne : Attribution enregistrée localement en attente de synchronisation.');
        setModalAttributionOuverte(false);
        setSelectionMembres({});
        setNumeroTour(prev => prev + 1);
        setSousVue('liste');
        return;
      }

      let error;
      if (attributionExistante) {
        const { error: errUpd } = await supabase
          .from('tontine_attributions')
          .update(payloadAttribution)
          .eq('id', attributionExistante.id);
        error = errUpd;
      } else {
        const { error: errIns } = await supabase
          .from('tontine_attributions')
          .insert([payloadAttribution]);
        error = errIns;
      }

      if (error) throw error;

      alert('🏆 Cagnotte attribuée et remise au bénéficiaire avec succès !');
      setModalAttributionOuverte(false);
      setSelectionMembres({});
      setNumeroTour(prev => prev + 1);
      setSousVue('liste');
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur lors de l\'attribution : ' + err.message);
    }
  };

  const passerAttributionCagnotte = () => {
    setModalAttributionOuverte(false);
    setSelectionMembres({});
    setNumeroTour(prev => prev + 1);
    setSousVue('liste');
  };

  const attribuerDepuisDetail = (session) => {
    setCycleId(session.id_cycle);
    setTourEnCours(session.numero_tour);
    setMontantCagnotteGlobal(session.total_verse);
    const benefAuto = detecterBeneficiaireTour(session.id_cycle);
    setBeneficiaireSelection({ participantId: benefAuto?.id || '', numeroPart: benefAuto?.numeroPart || 1 });
    setModalAttributionOuverte(true);
  };

  const supprimerSession = async (session) => {
    if (!estSuperAdmin) {
      alert("❌ Action non autorisée : Réservé uniquement au super administrateur (stephs7352@gmail.com).");
      return;
    }
    if (!confirm(`⚠️ Êtes-vous sûr de vouloir supprimer définitivement cette session (Cycle: ${session.nom_cycle}, Tour: ${session.numero_tour}) ?`)) return;

    try {
      setChargement(true);
      const idEnt = entrepriseId || '4TS-234321';

      if (!navigator.onLine) {
        alert('⚠️ Impossible de supprimer une session en mode hors ligne. Veuillez vous reconnecter.');
        setChargement(false);
        return;
      }

      const { error: errCotis } = await supabase
        .from('tontine_cotisations')
        .delete()
        .eq('id_entreprise', idEnt)
        .eq('id_cycle', session.id_cycle)
        .eq('numero_tour', session.numero_tour);

      if (errCotis) throw errCotis;

      if (session.estEpargne) {
        await supabase
          .from('tontine_caisse')
          .delete()
          .eq('id_entreprise', idEnt)
          .eq('id_cycle', session.id_cycle)
          .eq('numero_tour', session.numero_tour);
      } else {
        await supabase
          .from('tontine_attributions')
          .delete()
          .eq('id_entreprise', idEnt)
          .eq('id_cycle', session.id_cycle)
          .eq('numero_tour', session.numero_tour);
      }

      alert('✅ Session supprimée avec succès !');
      setSessionDetail(null);
      setSousVue('liste');
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur lors de la suppression : ' + err.message);
    } finally {
      setChargement(false);
    }
  };

  const imprimerDetailsSession = () => {
    window.print();
  };

  const uniqueCotisationsMap = new Map();
  cotisations.forEach(c => {
    const tour = c.numero_tour || 1;
    const cycId = c.id_cycle;
    const partId = c.id_participant || c.participant_id;
    const uniqueKey = `${cycId}_${tour}_${partId}`;
    if (!uniqueCotisationsMap.has(uniqueKey)) {
      uniqueCotisationsMap.set(uniqueKey, c);
    }
  });
  const cotisationsUniques = Array.from(uniqueCotisationsMap.values());

  const sessionsMap = {};
  cotisationsUniques.forEach(c => {
    const tour = c.numero_tour || 1;
    const cycId = c.id_cycle;
    const key = `${cycId}_${tour}`;
    if (!sessionsMap[key]) {
      const cycObj = cycles.find(cy => cy.id?.toString() === cycId?.toString()) || c.tontine_cycles;
      const estEp = estCycleEpargne(cycObj);
      
      const attObj = attributions.find(a => {
        const aCyc = a.id_cycle?.toString() || a.cycle_id?.toString();
        const aTour = parseInt(a.numero_tour || a.tour || 1);
        return aCyc === cycId?.toString() && aTour === parseInt(tour);
      });

      let partObj = null;
      let infoPartTexte = '';
      if (attObj) {
        const pId = attObj.id_participant || attObj.participant_id;
        partObj = participants.find(p => p.id?.toString() === pId?.toString());
        const numPart = attObj.numero_part || 1;
        if (partObj && parseInt(partObj.nombre_parts || 1) > 1) {
          infoPartTexte = ` (Part ${numPart})`;
        }
      }

      sessionsMap[key] = {
        key,
        id_cycle: cycId,
        numero_tour: tour,
        nom_cycle: cycObj?.nom_cycle || cycObj?.libelle || `Cycle #${cycId}`,
        date_versement: c.date_versement,
        total_verse: 0,
        nb_cotisants: 0,
        estEpargne: estEp,
        beneficiaireNom: partObj ? `${partObj.nom_participant || partObj.nom_complet || ''} ${partObj.prenom || ''}${infoPartTexte}` : null
      };
    }
    sessionsMap[key].total_verse += parseFloat(c.montant_verse || 0);
    sessionsMap[key].nb_cotisants += 1;
    if (new Date(c.date_versement) > new Date(sessionsMap[key].date_versement)) {
      sessionsMap[key].date_versement = c.date_versement;
    }
  });
  const listeSessions = Object.values(sessionsMap);

  const listeSessionsFiltrees = listeSessions.filter(session => {
    if (!filtreCycleId) return true;
    return session.id_cycle?.toString() === filtreCycleId.toString();
  });

  const cycleActuelObj = cycles.find(c => c.id.toString() === cycleId?.toString());
  const cycleFiltreObj = cycles.find(c => c.id.toString() === filtreCycleId?.toString());
  const cycleEtatObj = cycles.find(c => c.id.toString() === etatCycleId?.toString());
  const cycleCaisseObj = cycles.find(c => c.id.toString() === caisseCycleId?.toString());
  const estActuelEpargne = estCycleEpargne(cycleActuelObj);
  const aDelaiActuel = cycleActuelObj ? (cycleActuelObj.delai_paiement_mois > 0 || !!cycleActuelObj.date_fin) : false;
  const aDelaiEtat = cycleEtatObj ? (cycleEtatObj.delai_paiement_mois > 0 || !!cycleEtatObj.date_fin) : false;

  const membresDuCycleSelectionne = obtenirMembresOrdreTirage(cycleId);
  const membresEtatCycle = obtenirMembresOrdreTirage(etatCycleId);
  const listePartsEtat = obtenirListePartsCycle(etatCycleId);
  
  const sourceMembresCaisse = caisseCycleId 
    ? obtenirMembresOrdreTirage(caisseCycleId) 
    : participants;

  const mapMembresUniquesCaisse = new Map();
  sourceMembresCaisse.forEach(m => {
    const nomClean = (m.nom_participant || m.nom_complet || '').trim().toLowerCase();
    const prenomClean = (m.prenom || '').trim().toLowerCase();
    const cleNom = `${nomClean}_${prenomClean}` || m.id?.toString();
    if (!mapMembresUniquesCaisse.has(cleNom)) {
      mapMembresUniquesCaisse.set(cleNom, m);
    }
  });
  const membresDuCaisseCycle = Array.from(mapMembresUniquesCaisse.values());
  
  const listePartsCycleActuel = obtenirListePartsCycle(cycleId);

  const beneficiaireActuelObj = listePartsCycleActuel.find(p => p.id?.toString() === beneficiaireSelection.participantId?.toString() && p.numeroPart === beneficiaireSelection.numeroPart);
  const beneficiaireAutoTour = detecterBeneficiaireTour(cycleId);

  const montantTotalSaisieEnCours = Object.entries(selectionMembres).reduce((acc, [_, data]) => {
    if (data.coche) {
      return acc + (parseFloat(data.montant) || 0);
    }
    return acc;
  }, 0);

  const caisseSessionsMap = {};
  cotisationsUniques.forEach(c => {
    const cyc = cycles.find(cy => cy.id?.toString() === c.id_cycle?.toString());
    if (!estCycleEpargne(cyc)) return;

    if (caisseCycleId && c.id_cycle?.toString() !== caisseCycleId.toString()) return;

    if (caisseFiltreDate) {
      const dateCotis = new Date(c.date_versement).toISOString().split('T')[0];
      if (dateCotis !== caisseFiltreDate) return;
    }

    if (caisseFiltreMembre) {
      const partId = c.id_participant || c.participant_id;
      const pCourant = participants.find(pt => pt.id?.toString() === partId?.toString());
      const pFiltre = participants.find(pt => pt.id?.toString() === caisseFiltreMembre?.toString());
      if (pCourant && pFiltre) {
        const nomC = (pCourant.nom_participant || pCourant.nom_complet || '').trim().toLowerCase();
        const preC = (pCourant.prenom || '').trim().toLowerCase();
        const nomF = (pFiltre.nom_participant || pFiltre.nom_complet || '').trim().toLowerCase();
        const preF = (pFiltre.prenom || '').trim().toLowerCase();
        if (`${nomC}_${preC}` !== `${nomF}_${preF}` && partId?.toString() !== caisseFiltreMembre?.toString()) {
          return;
        }
      } else if (partId?.toString() !== caisseFiltreMembre?.toString()) {
        return;
      }
    }

    const tour = c.numero_tour || 1;
    const cycId = c.id_cycle;
    const key = `${cycId}_${tour}_${new Date(c.date_versement).toISOString().split('T')[0]}`;

    if (!caisseSessionsMap[key]) {
      caisseSessionsMap[key] = {
        key,
        id_cycle: cycId,
        nom_cycle: cyc?.nom_cycle || cyc?.libelle || `Caisse #${cycId}`,
        numero_tour: tour,
        date_versement: c.date_versement,
        total_verse: 0,
        nb_cotisants: 0,
        lignesCotisations: []
      };
    }
    caisseSessionsMap[key].total_verse += parseFloat(c.montant_verse || 0);
    caisseSessionsMap[key].nb_cotisants += 1;
    caisseSessionsMap[key].lignesCotisations.push(c);
    if (new Date(c.date_versement) > new Date(caisseSessionsMap[key].date_versement)) {
      caisseSessionsMap[key].date_versement = c.date_versement;
    }
  });

  const listeCaisseSessionsFiltrees = Object.values(caisseSessionsMap).sort((a, b) => new Date(b.date_versement) - new Date(a.date_versement));
  const totalCaisseActuel = listeCaisseSessionsFiltrees.reduce((acc, curr) => acc + curr.total_verse, 0);

  const containerBg = isDarkMode ? 'bg-[#0b1329] text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200';
  const headerBarBg = isDarkMode ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-gray-100 text-black border-gray-300';
  const labelColor = isDarkMode ? 'text-slate-400' : 'text-gray-600';
  const titleColor = isDarkMode ? 'text-slate-200' : 'text-slate-800';
  const subtitleColor = isDarkMode ? 'text-slate-300' : 'text-gray-700 font-bold';
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-gray-100 text-black border-gray-300';

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
            margin: 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-session-detail, #printable-session-detail * {
            visibility: visible !important;
          }
          #printable-session-detail {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 10px !important;
            margin: 0 !important;
            box-sizing: border-box;
            font-size: 11px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* CONTENEUR PRINCIPAL ÉPURÉ AVEC STATUT HORS LIGNE */}
      <div className={`w-full max-w-3xl mx-auto p-2 sm:p-3 rounded-xl border shadow-md space-y-2.5 text-xs font-sans ${containerBg}`}>
        
        {/* BANDEAU DE STATUT CONNEXION MIS À JOUR */}
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

        {/* EN-TÊTE DE NAVIGATION MOBILE-FRIENDLY */}
        <div className="flex justify-between items-center gap-1 border-b pb-2 border-slate-700/30 overflow-x-auto text-[9px] sm:text-[10px]">
          <button
            type="button"
            onClick={() => { 
              setSousVue('saisie'); 
              setSessionDetail(null); 
              setCaisseDetailSession(null);
              setCycleId(''); 
              setDateSaisie(new Date().toISOString().split('T')[0]);
              setSelectionMembres({});
              setModalCycleOuverte(true); 
            }}
            className={`px-2 py-1.5 rounded-lg font-black uppercase transition shadow cursor-pointer whitespace-nowrap ${
              sousVue === 'saisie' ? 'bg-slate-800 text-white border border-slate-600' : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-gray-200 text-black hover:bg-gray-300')
            }`}
          >
            ✍️ Saisir
          </button>

          <span className={`font-black text-[9px] sm:text-xs uppercase truncate text-center ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
            💰 TONTINES
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setSousVue('liste'); setSessionDetail(null); setCaisseDetailSession(null); }}
              className={`px-2 py-1.5 rounded-lg font-black uppercase transition shadow cursor-pointer whitespace-nowrap ${
                sousVue === 'liste' || sousVue === 'detail' ? 'bg-slate-800 text-white border border-slate-600' : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-gray-200 text-black hover:bg-gray-300')
              }`}
            >
              📋 Liste ({listeSessions.length})
            </button>

            <button
              type="button"
              onClick={() => { 
                setSousVue('etat_membre'); 
                setSessionDetail(null); 
                setCaisseDetailSession(null);
                if (!etatCycleId && cycles.length > 0) {
                  setEtatCycleId(cycles[0].id);
                }
              }}
              className={`px-2 py-1.5 rounded-lg font-black uppercase transition shadow cursor-pointer whitespace-nowrap ${
                sousVue === 'etat_membre' ? 'bg-slate-800 text-white border border-slate-600' : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-gray-200 text-black hover:bg-gray-300')
              }`}
            >
              📊 État Membre
            </button>

            <button
              type="button"
              onClick={() => { 
                setSousVue('caisse'); 
                setSessionDetail(null); 
                setCaisseDetailSession(null);
              }}
              className={`px-2 py-1.5 rounded-lg font-black uppercase transition shadow cursor-pointer whitespace-nowrap ${
                sousVue === 'caisse' || sousVue === 'caisse_detail' ? 'bg-slate-800 text-white border border-slate-600' : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-gray-200 text-black hover:bg-gray-300')
              }`}
            >
              🏦 Caisse
            </button>
          </div>
        </div>

        {/* VUE 1 : SAISIE DES COTISATIONS */}
        {sousVue === 'saisie' && (
          <div className="space-y-2.5">
            <div className={`p-2.5 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-2xs ${headerBarBg}`}>
              <div className="flex-1 min-w-[150px]">
                <span className={`block font-black text-[9px] uppercase mb-0.5 ${labelColor}`}>🎯 Cycle Actif :</span>
                <span className="font-black text-xs uppercase">
                  {cycleActuelObj ? (cycleActuelObj.nom_cycle || cycleActuelObj.libelle) : '⚠️ Aucun cycle sélectionné'}
                </span>
                {cycleActuelObj && !estActuelEpargne && !aDelaiActuel && (
                  <div className="text-[10px] text-slate-300 font-bold mt-0.5">
                    🏆 Bénéficiaire du Tour {numeroTour} : <b>{beneficiaireAutoTour?.affichageNom || 'Tous les tours servis'}</b>
                  </div>
                )}
                {aDelaiActuel && (
                  <div className="text-[10px] text-orange-600 font-bold mt-0.5">
                    ⏳ Cycle avec délai de paiement — Échéance : {cycleActuelObj.date_fin ? new Date(cycleActuelObj.date_fin).toLocaleDateString() : 'Non définie'}
                  </div>
                )}
                {estActuelEpargne && (
                  <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                    🏦 Type : Épargne / Banque (Versement direct en caisse)
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex flex-col">
                  <label className={`font-black text-[9px] uppercase mb-0.5 ${labelColor}`}>Date :</label>
                  <input
                    type="date"
                    value={dateSaisie}
                    onChange={(e) => setDateSaisie(e.target.value)}
                    className={`p-1 rounded-md font-mono font-bold text-center border text-xs ${inputBg}`}
                  />
                </div>

                {!estActuelEpargne && !aDelaiActuel && (
                  <div className="flex flex-col">
                    <label className={`font-black text-[9px] uppercase mb-0.5 ${labelColor}`}>Tour :</label>
                    <input
                      type="number"
                      value={numeroTour}
                      disabled
                      className={`w-12 p-1 rounded-md font-mono font-bold text-center border text-xs cursor-not-allowed opacity-80 ${isDarkMode ? 'bg-slate-950 text-slate-300 border-slate-700' : 'bg-gray-200 text-gray-800 border-gray-400'}`}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setModalCycleOuverte(true)}
                  className={`font-black px-2.5 py-1.5 rounded-lg uppercase text-[10px] transition border shadow cursor-pointer flex items-center gap-1 sm:mt-3.5 ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' : 'bg-gray-200 hover:bg-gray-300 text-black border-gray-400'
                  }`}
                >
                  <span>🎯</span> {cycleActuelObj ? 'Changer' : 'Choisir'}
                </button>
              </div>
            </div>

            {!cycleId ? (
              <div className={`p-6 text-center rounded-xl border ${isDarkMode ? 'bg-slate-900/60 text-slate-300 border-slate-700' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                <p className="font-bold text-xs mb-2">Veuillez d'abord choisir un cycle pour afficher la saisie.</p>
                <button
                  type="button"
                  onClick={() => setModalCycleOuverte(true)}
                  className="px-3 py-1.5 rounded-lg font-black text-xs bg-slate-800 hover:bg-slate-700 text-white uppercase shadow cursor-pointer border border-slate-600"
                >
                  🎯 Choisir un cycle
                </button>
              </div>
            ) : (
              <form onSubmit={validerCotisation} className="space-y-2 animate-fadeIn">
                <div className="flex justify-between items-center px-1">
                  <h4 className={`font-black uppercase text-[11px] ${titleColor}`}>
                    Membres : {cycleActuelObj?.nom_cycle || cycleActuelObj?.libelle} {estActuelEpargne ? '(Épargne)' : aDelaiActuel ? '(Avec Délai / Échéancier)' : `(Tour n° ${numeroTour})`}
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toutCocherOuDecocherSaisie}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-black px-2.5 py-1 rounded-lg text-[9px] uppercase shadow transition cursor-pointer border border-slate-600"
                    >
                      {membresDuCycleSelectionne.length > 0 && membresDuCycleSelectionne.every(m => selectionMembres[m.id]?.coche) ? '🔄 Tout décocher' : '✅ Tout cocher'}
                    </button>
                    <span className={`text-[10px] ${subtitleColor}`}>{membresDuCycleSelectionne.length} part.</span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-300 rounded-xl bg-white shadow-2xs max-h-[60vh] sm:max-h-[68vh] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 uppercase text-[9px] font-black bg-gray-100 text-black z-10 border-b border-gray-300">
                      <tr>
                        <th className="p-2 text-center w-10">Actif</th>
                        <th className="p-2">Nom & Prénom</th>
                        {aDelaiActuel ? (
                          <>
                            <th className="p-2 text-right">Prévu (F)</th>
                            <th className="p-2 text-right">Cotisé (F)</th>
                            <th className="p-2 text-right">Solde (F)</th>
                            <th className="p-2 text-center">Échéance</th>
                          </>
                        ) : (
                          !estActuelEpargne && <th className="p-2 text-center">Parts</th>
                        )}
                        <th className="p-2 text-right">Versement (F)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-[10px] text-black">
                      {membresDuCycleSelectionne.length === 0 ? (
                        <tr><td colSpan={aDelaiActuel ? 7 : (estActuelEpargne ? 3 : 4)} className="p-4 text-center font-bold text-gray-600">Aucun membre inscrit à ce cycle.</td></tr>
                      ) : (
                        membresDuCycleSelectionne.map((m) => {
                          const estCoche = selectionMembres[m.id]?.coche || false;
                          const montantMembre = selectionMembres[m.id]?.montant ?? 0;
                          const nomComplet = `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}`;

                          const montantBaseCycle = cycleActuelObj ? (parseFloat(cycleActuelObj.montant_cotisation || cycleActuelObj.montant_mise || 0)) : 0;
                          const parts = estActuelEpargne ? 1 : (m.nombre_parts || 1);
                          const montantPrevu = montantBaseCycle * parts;

                          const cotisMembreCycle = cotisations.filter(c => 
                            c.id_cycle?.toString() === cycleId?.toString() && 
                            (c.id_participant?.toString() === m.id?.toString() || c.participant_id?.toString() === m.id?.toString())
                          );
                          const dejaCotise = cotisMembreCycle.reduce((acc, c) => acc + (parseFloat(c.montant_verse) || 0), 0);
                          const soldeRestant = Math.max(0, montantPrevu - dejaCotise);
                          const dateEcheance = cycleActuelObj?.date_fin ? new Date(cycleActuelObj.date_fin).toLocaleDateString() : '-';

                          return (
                            <tr key={m.id} className={`transition ${estCoche ? 'bg-slate-100 font-bold text-black' : 'hover:bg-gray-50 text-black'}`}>
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={estCoche}
                                  onChange={() => toggleMembreCoche(m.id)}
                                  className="w-3.5 h-3.5 accent-slate-700 cursor-pointer rounded"
                                />
                              </td>
                              <td className="p-2 uppercase font-black text-black">{nomComplet}</td>
                              {aDelaiActuel ? (
                                <>
                                  <td className="p-2 text-right font-mono font-bold text-black">{montantPrevu.toLocaleString()}</td>
                                  <td className="p-2 text-right font-mono font-bold text-blue-700">{dejaCotise.toLocaleString()}</td>
                                  <td className="p-2 text-right font-mono font-black text-orange-600">{soldeRestant.toLocaleString()}</td>
                                  <td className="p-2 text-center font-mono text-[9px] text-gray-700">{dateEcheance}</td>
                                </>
                              ) : (
                                !estActuelEpargne && (
                                  <td className="p-2 text-center font-mono font-bold text-black">{m.nombre_parts || 1}</td>
                                )
                              )}
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  value={montantMembre}
                                  disabled={!estCoche}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => modifierMontantMembre(m.id, e.target.value)}
                                  className="w-20 sm:w-24 p-1 rounded-md font-mono font-bold text-right border border-gray-400 text-xs bg-white text-black disabled:opacity-40"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-gray-300">Total Encaissé :</span>
                    <span className="font-mono font-black text-sm text-emerald-400">
                      {montantTotalSaisieEnCours.toLocaleString()} FCFA
                    </span>
                  </div>

                  <button 
                    type="submit" 
                    disabled={chargement || membresDuCycleSelectionne.length === 0}
                    className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-black px-5 py-2.5 rounded-xl uppercase transition shadow cursor-pointer text-xs flex items-center justify-center gap-1.5 border border-slate-600"
                  >
                    <span>💾</span> Valider
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* VUE 2 : LISTE DES COTISATIONS ENREGISTRÉES */}
        {sousVue === 'liste' && (
          <div className="space-y-2.5 animate-fadeIn w-full">
            <div className="flex justify-between items-center px-1">
              <h4 className={`font-black uppercase text-[11px] ${titleColor}`}>
                📋 Liste ({listeSessionsFiltrees.length}/{listeSessions.length})
              </h4>
              
              <button
                type="button"
                onClick={() => setModalFiltreCycleOuverte(true)}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                  filtreCycleId 
                    ? 'bg-slate-800 text-white border-slate-600' 
                    : (isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-gray-100 text-black border-gray-300 hover:bg-gray-200')
                }`}
              >
                <span>🎯</span>
                <span className="truncate max-w-[120px]">{filtreCycleId ? (cycleFiltreObj?.nom_cycle || cycleFiltreObj?.libelle || 'Cycle filtré') : 'Tous les cycles'}</span>
                <span>▼</span>
              </button>
            </div>

            {listeSessionsFiltrees.length === 0 ? (
              <div className={`p-8 text-center rounded-xl border ${isDarkMode ? 'bg-slate-900/60 text-slate-300 border-slate-700' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                <p className="font-bold text-xs">Aucune session enregistrée pour ce filtre.</p>
              </div>
            ) : (
              <div className="space-y-2 w-full">
                {listeSessionsFiltrees.map((session) => (
                  <div
                    key={session.key}
                    onClick={() => { setSessionDetail(session); setSousVue('detail'); }}
                    className="p-3 rounded-xl border bg-white hover:bg-gray-50 border-gray-300 text-black cursor-pointer transition flex justify-between items-center shadow-2xs w-full gap-2"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="font-black text-xs uppercase flex items-center gap-1.5 text-slate-800 flex-wrap">
                        <span>🎯</span> 
                        <span className="truncate">{session.nom_cycle} — Tour n° {session.numero_tour}</span>
                        {session.estEpargne ? (
                          <span className="text-[9px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300">
                            🏦 Épargne
                          </span>
                        ) : session.beneficiaireNom ? (
                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 truncate max-w-[150px]">
                            🏆 {session.beneficiaireNom}
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                            ⏳ En attente d'attribution
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] flex gap-2 text-gray-600 flex-wrap">
                        <span>📅 {new Date(session.date_versement).toLocaleDateString()}</span>
                        <span>👥 <b>{session.nb_cotisants}</b> cotisants</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <span className="font-black font-mono text-xs text-emerald-600 block">
                          {session.total_verse.toLocaleString()} F
                        </span>
                        <span className="text-[9px] underline text-gray-500">
                          Détails ➔
                        </span>
                      </div>

                      {estSuperAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            supprimerSession(session);
                          }}
                          className="bg-red-600 hover:bg-red-500 text-white font-black px-2 py-1.5 rounded-lg text-[10px] uppercase transition cursor-pointer shadow-2xs border border-red-500"
                          title="Supprimer cette session"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VUE 3 : DÉTAILS D'UNE COTISATION SÉLECTIONNÉE */}
        {sousVue === 'detail' && sessionDetail && (
          <div id="printable-session-detail" className="space-y-2.5 animate-fadeIn bg-white text-black p-2 sm:p-3 rounded-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-1 border-b pb-2 border-gray-300 gap-2">
              <div>
                <h4 className="font-black uppercase text-sm text-slate-900">
                  🔍 DÉTAILS : {sessionDetail.nom_cycle} (TOUR N° {sessionDetail.numero_tour})
                </h4>
                <span className="text-xs text-gray-700">
                  Total : <b className="text-emerald-600">{sessionDetail.total_verse.toLocaleString()} FCFA</b>
                  {sessionDetail.estEpargne ? (
                    <span className="ml-1 text-blue-700 font-bold">| Type : Épargne (Caisse)</span>
                  ) : sessionDetail.beneficiaireNom ? (
                    <span className="ml-1 text-emerald-700 font-bold">| Gagnant : {sessionDetail.beneficiaireNom}</span>
                  ) : (
                    <span className="ml-1 text-amber-700 font-bold">| Statut : En attente d'attribution</span>
                  )}
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap w-full sm:w-auto justify-end no-print">
                <button
                  type="button"
                  onClick={imprimerDetailsSession}
                  className="px-3 py-1.5 rounded-lg font-black text-xs bg-slate-800 hover:bg-slate-700 text-white uppercase shadow cursor-pointer whitespace-nowrap border border-slate-600 flex items-center gap-1"
                >
                  <span>🖨️</span> Imprimer
                </button>

                {!sessionDetail.estEpargne && !sessionDetail.beneficiaireNom && (
                  <button
                    type="button"
                    onClick={() => attribuerDepuisDetail(sessionDetail)}
                    className="px-3 py-1.5 rounded-lg font-black text-xs bg-slate-800 hover:bg-slate-700 text-white uppercase shadow cursor-pointer whitespace-nowrap border border-slate-600"
                  >
                    🏆 Attribuer
                  </button>
                )}

                {estSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => supprimerSession(sessionDetail)}
                    className="px-3 py-1.5 rounded-lg font-black text-xs bg-red-600 hover:bg-red-500 text-white uppercase shadow cursor-pointer whitespace-nowrap border border-red-500 flex items-center gap-1"
                    title="Supprimer cette session"
                  >
                    <span>🗑️</span> Supprimer
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => { setSousVue('liste'); setSessionDetail(null); }}
                  className="px-3 py-1.5 rounded-lg font-bold text-xs border bg-gray-200 hover:bg-gray-300 text-black border-gray-400 cursor-pointer"
                >
                  ⬅ Retour
                </button>
              </div>
            </div>

            <div className="bg-white text-black p-3 rounded-xl border border-gray-300 space-y-3">
              <div className="overflow-x-auto border border-gray-300 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 uppercase text-[10px] font-black bg-gray-100 text-black z-10 border-b border-gray-300">
                    <tr>
                      <th className="p-2.5">Nom & Prénom</th>
                      <th className="p-2.5 text-center">Statut</th>
                      <th className="p-2.5 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs text-black">
                    {obtenirMembresOrdreTirage(sessionDetail.id_cycle)
                      .map((m) => {
                        const cotisMembre = cotisationsUniques.find(c => 
                          c.id_cycle?.toString() === sessionDetail.id_cycle?.toString() && 
                          parseInt(c.numero_tour || 1) === parseInt(sessionDetail.numero_tour) &&
                          (c.id_participant?.toString() === m.id?.toString() || c.participant_id?.toString() === m.id?.toString())
                        );
                        const aCotise = !!cotisMembre;
                        const nomComplet = `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}`;

                        return (
                          <tr key={m.id} className={`transition ${aCotise ? 'bg-emerald-50 text-black' : 'bg-red-50 text-black'}`}>
                            <td className="p-2.5 font-black uppercase text-black">{nomComplet}</td>
                            <td className="p-2.5 text-center">
                              {aCotise ? (
                                <span className="bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full text-[9px] uppercase">OK</span>
                              ) : (
                                <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded-full text-[9px] uppercase">ÉCHEC</span>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-black font-mono text-emerald-600">
                              {aCotise ? `${cotisMembre.montant_verse?.toLocaleString()}F` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VUE 4 : ÉTAT MEMBRE */}
        {sousVue === 'etat_membre' && (
          <div className="space-y-2.5 animate-fadeIn w-full">
            <div className={`p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-2xs ${headerBarBg}`}>
              <div>
                <span className={`block font-black text-[9px] uppercase mb-0.5 ${labelColor}`}>📊 Cycle Sélectionné (État Membre) :</span>
                <span className="font-black text-xs uppercase">
                  {cycleEtatObj ? (cycleEtatObj.nom_cycle || cycleEtatObj.libelle) : '⚠️ Aucun cycle sélectionné'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setModalEtatCycleOuverte(true)}
                className={`font-black px-3 py-1.5 rounded-lg uppercase text-[10px] transition border shadow cursor-pointer flex items-center gap-1.5 ${
                  isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' : 'bg-gray-200 hover:bg-gray-300 text-black border-gray-400'
                }`}
              >
                <span>🎯</span> Choisir un cycle <span>▼</span>
              </button>
            </div>

            {!etatCycleId ? (
              <div className={`p-8 text-center rounded-xl border ${isDarkMode ? 'bg-slate-900/60 text-slate-300 border-slate-700' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                <p className="font-bold text-xs mb-2">Veuillez choisir un cycle pour afficher l'état des membres.</p>
                <button
                  type="button"
                  onClick={() => setModalEtatCycleOuverte(true)}
                  className="px-3 py-1.5 rounded-lg font-black text-xs bg-slate-800 hover:bg-slate-700 text-white uppercase shadow cursor-pointer border border-slate-600"
                >
                  🎯 Choisir un cycle
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h4 className={`font-black uppercase text-[11px] ${titleColor}`}>
                    Situation des membres : {cycleEtatObj?.nom_cycle || cycleEtatObj?.libelle} {aDelaiEtat ? '(Avec Échéance)' : '(Rotation / Standard)'}
                  </h4>
                  <span className={`text-[10px] ${subtitleColor}`}>
                    {aDelaiEtat ? `${membresEtatCycle.length} membres` : `${listePartsEtat.length} parts`}
                  </span>
                </div>

                <div className="overflow-x-auto border border-gray-300 rounded-xl bg-white shadow-2xs max-h-[65vh] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 uppercase text-[9px] font-black bg-gray-100 text-black z-10 border-b border-gray-300">
                      <tr>
                        <th className="p-2.5">Nom & Prénom</th>
                        {aDelaiEtat ? (
                          <>
                            <th className="p-2.5 text-right">Montant Attendu</th>
                            <th className="p-2.5 text-right">Déjà Cotisé</th>
                            <th className="p-2.5 text-right">Reste à Cotiser</th>
                            <th className="p-2.5 text-center">Échéance</th>
                          </>
                        ) : (
                          <th className="p-2.5 text-right">Montant</th>
                        )}
                        <th className="p-2.5 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-[10px] text-black">
                      {aDelaiEtat ? (
                        membresEtatCycle.length === 0 ? (
                          <tr><td colSpan="6" className="p-4 text-center font-bold text-gray-600">Aucun membre inscrit dans ce cycle.</td></tr>
                        ) : (
                          membresEtatCycle.map((m, idx) => {
                            const nomComplet = `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}`;
                            const montantBaseCycle = cycleEtatObj ? (parseFloat(cycleEtatObj.montant_cotisation || cycleEtatObj.montant_mise || 0)) : 0;
                            const parts = m.nombre_parts || 1;
                            const montantAttendu = montantBaseCycle * parts;
                            
                            const cotisMembre = cotisations.filter(c => 
                              c.id_cycle?.toString() === etatCycleId?.toString() && 
                              (c.id_participant?.toString() === m.id?.toString() || c.participant_id?.toString() === m.id?.toString())
                            );
                            const dejaCotise = cotisMembre.reduce((acc, c) => acc + (parseFloat(c.montant_verse) || 0), 0);
                            const resteACotiser = Math.max(0, montantAttendu - dejaCotise);
                            const dateEcheance = cycleEtatObj?.date_fin ? new Date(cycleEtatObj.date_fin).toLocaleDateString() : '-';
                            const estSolde = montantAttendu > 0 ? dejaCotise >= montantAttendu : dejaCotise > 0;

                            return (
                              <tr key={`${m.id}_${idx}`} className={`transition ${estSolde ? 'bg-emerald-50/70 font-bold text-black' : 'hover:bg-gray-50 text-black'}`}>
                                <td className="p-2.5 uppercase font-black text-black">{nomComplet}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-black">{montantAttendu.toLocaleString()} F</td>
                                <td className="p-2.5 text-right font-mono font-bold text-blue-700">{dejaCotise.toLocaleString()} F</td>
                                <td className="p-2.5 text-right font-mono font-black text-orange-600">{resteACotiser.toLocaleString()} F</td>
                                <td className="p-2.5 text-center font-mono text-[9px] text-gray-700">{dateEcheance}</td>
                                <td className="p-2.5 text-center">
                                  {estSolde ? (
                                    <span className="bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full text-[9px] uppercase">Soldé</span>
                                  ) : dejaCotise > 0 ? (
                                    <span className="bg-amber-500 text-white font-black px-2 py-0.5 rounded-full text-[9px] uppercase">Partiel</span>
                                  ) : (
                                    <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded-full text-[9px] uppercase">En attente</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )
                      ) : (
                        listePartsEtat.length === 0 ? (
                          <tr><td colSpan="3" className="p-4 text-center font-bold text-gray-600">Aucun membre inscrit dans ce cycle.</td></tr>
                        ) : (
                          listePartsEtat.map((partie, idx) => {
                            const montantBaseCycle = cycleEtatObj ? (parseFloat(cycleEtatObj.montant_cotisation || cycleEtatObj.montant_mise || 0)) : 0;
                            const estEp = estCycleEpargne(cycleEtatObj);

                            return (
                              <tr key={`${partie.id}_${partie.numeroPart}_${idx}`} className={`transition ${partie.dejaServie ? 'bg-emerald-50/60 font-bold text-black' : 'hover:bg-gray-50 text-black'}`}>
                                <td className="p-2.5 uppercase font-black text-black">{partie.affichageNom}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-black">{montantBaseCycle.toLocaleString()} F</td>
                                <td className="p-2.5 text-center">
                                  {estEp ? (
                                    <span className="bg-blue-100 text-blue-900 font-black px-2.5 py-1 rounded-full text-[9px] uppercase border border-blue-300 inline-flex items-center gap-1">
                                      <span>🏦</span> Épargnant actif
                                    </span>
                                  ) : partie.dejaServie ? (
                                    <span className="bg-emerald-800 text-white font-black px-2.5 py-1 rounded-full text-[9px] uppercase shadow-2xs inline-flex items-center gap-1">
                                      <span>🏆</span> Servi (Tour n° {partie.tourServi})
                                    </span>
                                  ) : (
                                    <span className="bg-amber-100 text-amber-900 font-black px-2.5 py-1 rounded-full text-[9px] uppercase border border-amber-300 inline-flex items-center gap-1">
                                      <span>⏳</span> En attente
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VUE 5 : CAISSE DES ÉPARGNES */}
        {sousVue === 'caisse' && (
          <div className="space-y-2.5 animate-fadeIn w-full">
            <div className={`p-3 rounded-xl border flex flex-col gap-2 shadow-2xs ${headerBarBg}`}>
              <div className="flex justify-between items-center">
                <div>
                  <span className={`block font-black text-[9px] uppercase mb-0.5 ${labelColor}`}>🏦 Caisse Sélectionnée :</span>
                  <span className="font-black text-xs uppercase">
                    {caisseCycleId ? (cycleCaisseObj?.nom_cycle || cycleCaisseObj?.libelle) : '🌟 TOUTES LES CAISSES (CUMUL)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalCaisseCycleOuverte(true)}
                  className={`font-black px-3 py-1.5 rounded-lg uppercase text-[10px] transition border shadow cursor-pointer flex items-center gap-1.5 ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' : 'bg-gray-200 hover:bg-gray-300 text-black border-gray-400'
                  }`}
                >
                  <span>🎯</span> Changer Caisse <span>▼</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-700/20">
                <div className="flex flex-col">
                  <label className={`font-black text-[9px] uppercase mb-0.5 ${labelColor}`}>Filtrer par membre :</label>
                  <button
                    type="button"
                    onClick={() => setModalCaisseMembreOuverte(true)}
                    className={`font-black p-2 rounded-lg uppercase text-[10px] transition border shadow cursor-pointer flex justify-between items-center ${inputBg}`}
                  >
                    <span className="truncate">👤 {caisseFiltreMembre ? (() => {
                      const m = participants.find(mem => mem.id?.toString() === caisseFiltreMembre?.toString());
                      return m ? `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}` : 'Membre filtré';
                    })() : 'Tous les membres'}</span>
                    <span>▼</span>
                  </button>
                  {caisseFiltreMembre && (
                    <button 
                      type="button" 
                      onClick={() => setCaisseFiltreMembre('')} 
                      className="text-[9px] text-red-400 underline mt-0.5 text-right cursor-pointer"
                    >
                      Effacer membre
                    </button>
                  )}
                </div>

                <div className="flex flex-col">
                  <label className={`font-black text-[9px] uppercase mb-0.5 ${labelColor}`}>Filtrer par date :</label>
                  <div className="flex gap-1">
                    <input
                      type="date"
                      value={caisseFiltreDate}
                      onChange={(e) => setCaisseFiltreDate(e.target.value)}
                      className={`w-full p-1.5 rounded-lg font-mono font-bold text-center border text-xs ${inputBg}`}
                    />
                    {caisseFiltreDate && (
                      <button 
                        type="button" 
                        onClick={() => setCaisseFiltreDate('')} 
                        className="px-2 py-1 rounded bg-red-800 text-white font-bold text-[10px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white border border-emerald-700 flex justify-between items-center shadow-md">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-emerald-300">
                    {caisseCycleId ? 'Solde Total de cette Caisse' : 'Solde Cumulé (Toutes Caisses)'}
                  </span>
                  <span className="text-lg sm:text-xl font-black font-mono text-emerald-400">
                    {totalCaisseActuel.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] uppercase font-bold text-slate-300">Sessions</span>
                  <span className="text-sm font-bold font-mono">
                    {listeCaisseSessionsFiltrees.length}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center px-1 pt-1">
                <h4 className={`font-black uppercase text-[11px] ${titleColor}`}>
                  Sessions de cotisations (Cliquer pour voir les détails)
                </h4>
              </div>

              <div className="overflow-x-auto border border-gray-300 rounded-xl bg-white shadow-2xs max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 uppercase text-[9px] font-black bg-gray-100 text-black z-10 border-b border-gray-300">
                    <tr>
                      <th className="p-2.5">Date & Tour</th>
                      <th className="p-2.5">Caisse / Cycle</th>
                      <th className="p-2.5 text-center">Cotisants</th>
                      <th className="p-2.5 text-right">Total Session</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-[10px] text-black">
                    {listeCaisseSessionsFiltrees.length === 0 ? (
                      <tr><td colSpan="4" className="p-4 text-center font-bold text-gray-600">Aucune session trouvée pour ces filtres.</td></tr>
                    ) : (
                      listeCaisseSessionsFiltrees.map((session) => (
                        <tr 
                          key={session.key} 
                          onClick={() => { setCaisseDetailSession(session); setSousVue('caisse_detail'); }}
                          className="hover:bg-emerald-50 transition cursor-pointer font-bold"
                        >
                          <td className="p-2.5 font-mono text-gray-700">
                            {new Date(session.date_versement).toLocaleDateString()} (Tour n° {session.numero_tour})
                          </td>
                          <td className="p-2.5 uppercase font-black text-slate-900 truncate max-w-[120px]">
                            {session.nom_cycle}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            {session.nb_cotisants}
                          </td>
                          <td className="p-2.5 text-right font-mono font-black text-emerald-600">
                            {session.total_verse.toLocaleString()} F ➔
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VUE 5-BIS : DÉTAILS D'UNE SESSION DE CAISSE */}
        {sousVue === 'caisse_detail' && caisseDetailSession && (
          <div className="space-y-2.5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-1 border-b pb-2 border-slate-700/30 gap-2">
              <div>
                <h4 className={`font-black uppercase text-[11px] ${titleColor}`}>
                  🔍 DÉTAILS CAISSE : {caisseDetailSession.nom_cycle} (TOUR N° {caisseDetailSession.numero_tour})
                </h4>
                <span className={`text-[10px] ${labelColor}`}>
                  Date : {new Date(caisseDetailSession.date_versement).toLocaleDateString()} | Total : <b className="text-emerald-600">{caisseDetailSession.total_verse.toLocaleString()} FCFA</b>
                </span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => { setSousVue('caisse'); setCaisseDetailSession(null); }}
                  className={`w-full sm:w-auto px-3 py-1.5 rounded-lg font-bold text-[10px] border cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' : 'bg-gray-200 hover:bg-gray-300 text-black border-gray-400'
                  }`}
                >
                  ⬅ Retour à la caisse
                </button>
              </div>
            </div>

            <div className="bg-white text-black p-3 rounded-xl border border-gray-300 space-y-3">
              <div className="overflow-x-auto border border-gray-300 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 uppercase text-[9px] font-black bg-gray-100 text-black z-10 border-b border-gray-300">
                    <tr>
                      <th className="p-2.5">Nom & Prénom du Membre</th>
                      <th className="p-2.5 text-center">Date & Heure</th>
                      <th className="p-2.5 text-right">Montant Versé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-[10px] text-black">
                    {caisseDetailSession.lignesCotisations.map((c, idx) => {
                      const p = participants.find(part => part.id?.toString() === (c.id_participant || c.participant_id)?.toString());
                      const nomMembre = p ? `${p.nom_participant || p.nom_complet || ''} ${p.prenom || ''}` : `Membre #${c.id_participant}`;
                      return (
                        <tr key={c.id || idx} className="hover:bg-gray-50 transition">
                          <td className="p-2.5 font-black uppercase text-black">{nomMembre}</td>
                          <td className="p-2.5 text-center font-mono text-gray-600">
                            {new Date(c.date_versement).toLocaleString()}
                          </td>
                          <td className="p-2.5 text-right font-black font-mono text-emerald-600">
                            {(parseFloat(c.montant_verse) || 0).toLocaleString()} FCFA
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODALE DE SÉLECTION DU CYCLE (POUR SAISIE) */}
        {modalCycleOuverte && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
            <div className={`w-[95%] sm:w-full max-w-md rounded-2xl shadow-2xl border p-4 space-y-3 max-h-[85vh] overflow-y-auto ${isDarkMode ? 'bg-[#0b1329] border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
              <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                <h5 className="font-black text-sm uppercase">🎯 CHOISIR UN CYCLE</h5>
                <button type="button" onClick={() => setModalCycleOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
              </div>
              
              <div className="space-y-2">
                {cycles.length === 0 ? (
                  <p className="text-xs text-center py-4 text-gray-500">Aucun cycle enregistré.</p>
                ) : (
                  cycles.map((cycle) => {
                    const estActif = cycleId?.toString() === cycle.id?.toString();
                    const nomC = cycle.nom_cycle || cycle.libelle || `Cycle #${cycle.id}`;
                    const montantRef = cycle.montant_cotisation || cycle.montant_mise || 0;
                    const estEp = estCycleEpargne(cycle);
                    const aDel = cycle.delai_paiement_mois > 0 || !!cycle.date_fin;
                    return (
                      <div
                        key={cycle.id}
                        onClick={() => selectionnerCycleModal(cycle.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col gap-0.5 ${
                          estActif 
                            ? 'bg-slate-800 text-white font-bold border-slate-600' 
                            : (isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200' : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-black')
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-black text-xs uppercase">🎯 {nomC} {estEp && '🏦 (Épargne)'} {aDel && '⏳ (Avec délai)'}</span>
                          {estActif && <span className="text-[10px]">✓ Sélectionné</span>}
                        </div>
                        <span className="text-[10px] opacity-80">
                          Montant : {montantRef > 0 ? `${montantRef.toLocaleString()}F` : 'Libre'} {aDel && `| Échéance: ${cycle.date_fin || '-'}`}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                <button type="button" onClick={() => setModalCycleOuverte(false)} className={`font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' : 'bg-gray-200 hover:bg-gray-300 text-black border-gray-400'}`}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE DE SÉLECTION DU CYCLE (POUR ÉTAT MEMBRE) */}
        {modalEtatCycleOuverte && (
          <div className="fixed inset-0 z-65 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
            <div className={`w-[95%] sm:w-full max-w-md rounded-2xl shadow-2xl border p-4 space-y-3 max-h-[85vh] overflow-y-auto ${isDarkMode ? 'bg-[#0b1329] border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
              <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                <h5 className="font-black text-sm uppercase">📊 CHOISIR UN CYCLE ( ÉTAT MEMBRE )</h5>
                <button type="button" onClick={() => setModalEtatCycleOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
              </div>
              
              <div className="space-y-2">
                {cycles.length === 0 ? (
                  <p className="text-xs text-center py-4 text-gray-500">Aucun cycle enregistré.</p>
                ) : (
                  cycles.map((cycle) => {
                    const estActif = etatCycleId?.toString() === cycle.id?.toString();
                    const nomC = cycle.nom_cycle || cycle.libelle || `Cycle #${cycle.id}`;
                    return (
                      <div
                        key={cycle.id}
                        onClick={() => {
                          setEtatCycleId(cycle.id);
                          setModalEtatCycleOuverte(false);
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                          estActif 
                            ? 'bg-slate-800 text-white font-bold border-slate-600' 
                            : (isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200' : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-black')
                        }`}
                      >
                        <span className="font-black text-xs uppercase">🎯 {nomC}</span>
                        {estActif && <span className="text-[10px]">✓ Sélectionné</span>}
                      </div>
                    );
                  })
                )}
              </div>

              <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                <button type="button" onClick={() => setModalEtatCycleOuverte(false)} className={`font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' : 'bg-gray-200 hover:bg-gray-300 text-black border-gray-400'}`}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE DE SÉLECTION DE LA CAISSE */}
        {modalCaisseCycleOuverte && (
          <div className="fixed inset-0 z-65 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
            <div className={`w-[95%] sm:w-full max-w-md rounded-2xl shadow-2xl border p-4 space-y-3 max-h-[85vh] overflow-y-auto ${isDarkMode ? 'bg-[#0b1329] border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
              <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                <h5 className="font-black text-sm uppercase">🏦 CHOISIR UNE CAISSE ( ÉPARGNE )</h5>
                <button type="button" onClick={() => setModalCaisseCycleOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
              </div>
              
              <div className="space-y-2">
                <div
                  onClick={() => {
                    setCaisseCycleId('');
                    setCaisseFiltreMembre('');
                    setModalCaisseCycleOuverte(false);
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                    !caisseCycleId 
                      ? 'bg-slate-800 text-white font-bold border-slate-600' 
                      : (isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200' : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-black')
                  }`}
                >
                  <span className="font-black text-xs uppercase">🌟 TOUTES LES CAISSES (CUMUL GLOBAL)</span>
                  {!caisseCycleId && <span className="text-[10px]">✓ Sélectionné</span>}
                </div>

                {cycles.filter(c => estCycleEpargne(c)).map((cycle) => {
                  const estActif = caisseCycleId?.toString() === cycle.id?.toString();
                  const nomC = cycle.nom_cycle || cycle.libelle || `Cycle #${cycle.id}`;
                  return (
                    <div
                      key={cycle.id}
                      onClick={() => {
                        setCaisseCycleId(cycle.id);
                        setCaisseFiltreMembre('');
                        setModalCaisseCycleOuverte(false);
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                        estActif 
                          ? 'bg-slate-800 text-white font-bold border-slate-600' 
                          : (isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200' : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-black')
                      }`}
                    >
                      <span className="font-black text-xs uppercase">🏦 {nomC}</span>
                      {estActif && <span className="text-[10px]">✓ Sélectionné</span>}
                    </div>
                  );
                })}
              </div>

              <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                <button type="button" onClick={() => setModalCaisseCycleOuverte(false)} className={`font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' : 'bg-gray-200 hover:bg-gray-300 text-black border-gray-400'}`}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE DE SÉLECTION DU MEMBRE (POUR CAISSE) */}
        {modalCaisseMembreOuverte && (
          <div className="fixed inset-0 z-65 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
            <div className={`w-[95%] sm:w-full max-w-md rounded-2xl shadow-2xl border p-4 space-y-3 max-h-[85vh] overflow-y-auto ${isDarkMode ? 'bg-[#0b1329] border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
              <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                <h5 className="font-black text-sm uppercase">👤 FILTRER PAR MEMBRE (CAISSE)</h5>
                <button type="button" onClick={() => setModalCaisseMembreOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
              </div>
              
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                <div
                  onClick={() => {
                    setCaisseFiltreMembre('');
                    setModalCaisseMembreOuverte(false);
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                    !caisseFiltreMembre 
                      ? 'bg-slate-800 text-white font-bold border-slate-600' 
                      : (isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200' : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-black')
                  }`}
                >
                  <span className="font-black text-xs uppercase">👤 Tous les membres</span>
                  {!caisseFiltreMembre && <span className="text-[10px]">✓ Actif</span>}
                </div>

                {membresDuCaisseCycle.length === 0 ? (
                  <p className="text-xs text-center py-4 text-gray-500">Aucun membre trouvé.</p>
                ) : (
                  membresDuCaisseCycle.map((m) => {
                    const estActif = caisseFiltreMembre?.toString() === m.id?.toString();
                    const nom = `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}`;
                    return (
                      <div
                        key={m.id || nom}
                        onClick={() => {
                          setCaisseFiltreMembre(m.id);
                          setModalCaisseMembreOuverte(false);
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                          estActif 
                            ? 'bg-slate-800 text-white font-bold border-slate-600' 
                            : (isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200' : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-black')
                        }`}
                      >
                        <span className="font-black text-xs uppercase">{nom}</span>
                        {estActif && <span className="text-[10px]">✓ Sélectionné</span>}
                      </div>
                    );
                  })
                )}
              </div>

              <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                <button type="button" onClick={() => setModalCaisseMembreOuverte(false)} className={`font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' : 'bg-gray-200 hover:bg-gray-300 text-black border-gray-400'}`}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE DE FILTRE PAR CYCLE (POUR LA LISTE) */}
        {modalFiltreCycleOuverte && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
            <div className={`w-[95%] sm:w-full max-w-md rounded-2xl shadow-2xl border p-4 space-y-3 max-h-[85vh] overflow-y-auto ${isDarkMode ? 'bg-[#0b1329] border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
              <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                <h5 className="font-black text-sm uppercase text-slate-200">🎯 FILTRER PAR TYPE DE CYCLE</h5>
                <button type="button" onClick={() => setModalFiltreCycleOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
              </div>
              
              <div className="space-y-2">
                <div
                  onClick={() => { setFiltreCycleId(''); setModalFiltreCycleOuverte(false); }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                    !filtreCycleId 
                      ? 'bg-slate-800 text-white font-bold border-slate-600' 
                      : (isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200' : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-black')
                  }`}
                >
                  <span className="font-black text-xs uppercase">🎯 Tous les cycles</span>
                  {!filtreCycleId && <span className="text-[10px]">✓ Actif</span>}
                </div>

                {cycles.map((cycle) => {
                  const estActif = filtreCycleId?.toString() === cycle.id?.toString();
                  const nomC = cycle.nom_cycle || cycle.libelle || `Cycle #${cycle.id}`;
                  return (
                    <div
                      key={cycle.id}
                      onClick={() => { setFiltreCycleId(cycle.id); setModalFiltreCycleOuverte(false); }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                        estActif 
                          ? 'bg-slate-800 text-white font-bold border-slate-600' 
                          : (isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200' : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-black')
                      }`}
                    >
                      <span className="font-black text-xs uppercase">🎯 {nomC}</span>
                      {estActif && <span className="text-[10px]">✓ Actif</span>}
                    </div>
                  );
                })}
              </div>

              <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                <button type="button" onClick={() => setModalFiltreCycleOuverte(false)} className={`font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' : 'bg-gray-200 hover:bg-gray-300 text-black border-gray-400'}`}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE DE SÉLECTION DU BÉNÉFICIAIRE */}
        {modalBeneficiaireOuverte && (
          <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
            <div className={`w-[95%] sm:w-full max-w-md rounded-2xl shadow-2xl border p-4 space-y-3 max-h-[85vh] overflow-y-auto ${isDarkMode ? 'bg-[#0b1329] border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
              <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                <h5 className="font-black text-sm uppercase text-slate-200">👤 SÉLECTIONNER LE BÉNÉFICIAIRE</h5>
                <button type="button" onClick={() => setModalBeneficiaireOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
              </div>
              
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {listePartsCycleActuel.length === 0 ? (
                  <p className="text-xs text-center py-4 text-gray-500">Aucun membre dans ce cycle.</p>
                ) : (
                  listePartsCycleActuel.map((partie, idx) => {
                    const estActif = beneficiaireSelection.participantId?.toString() === partie.id?.toString() && beneficiaireSelection.numeroPart === partie.numeroPart;
                    const dejaServie = partie.dejaServie;

                    return (
                      <div
                        key={`${partie.id}_${partie.numeroPart}_${idx}`}
                        onClick={() => {
                          if (dejaServie) return;
                          setBeneficiaireSelection({ participantId: partie.id, numeroPart: partie.numeroPart });
                          setModalBeneficiaireOuverte(false);
                        }}
                        className={`p-2.5 rounded-xl border transition flex justify-between items-center ${
                          dejaServie
                            ? 'bg-slate-900/90 border-slate-700 text-slate-300 cursor-not-allowed shadow-inner'
                            : estActif 
                              ? 'bg-slate-800 text-white font-bold border-slate-600 cursor-pointer' 
                              : (isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-200 cursor-pointer' : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-black cursor-pointer')
                        }`}
                      >
                        <span className={`font-black text-xs uppercase ${dejaServie ? 'text-slate-300' : ''}`}>
                          {partie.affichageNom}
                        </span>
                        {dejaServie ? (
                          <span className="text-[9px] font-bold bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-800">❌ Déjà servi</span>
                        ) : estActif ? (
                          <span className="text-[10px] text-emerald-400">✓ Sélectionné</span>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                <button type="button" onClick={() => setModalBeneficiaireOuverte(false)} className={`font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' : 'bg-gray-200 hover:bg-gray-300 text-black border-gray-400'}`}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE DE REMISE DE CAGNOTTE */}
        {modalAttributionOuverte && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
            <div className={`w-[95%] sm:w-full max-w-md rounded-2xl shadow-2xl border p-4 space-y-3 max-h-[85vh] overflow-y-auto ${isDarkMode ? 'bg-[#0b1329] border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
              <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                <h5 className="font-black text-sm uppercase text-slate-200">🏆 REMISE DE LA CAGNOTTE</h5>
                <button type="button" onClick={passerAttributionCagnotte} className="font-bold text-sm cursor-pointer">✖</button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700">
                  <span className="block font-bold text-gray-400 text-[10px] uppercase">Cycle & Tour :</span>
                  <span className="font-black uppercase">{cycleActuelObj?.nom_cycle || cycleActuelObj?.libelle} — Tour n° {tourEnCours}</span>
                </div>

                <div>
                  <label className="block font-black text-[10px] uppercase mb-1">Bénéficiaire de ce tour :</label>
                  <button
                    type="button"
                    onClick={() => setModalBeneficiaireOuverte(true)}
                    className={`w-full p-2 rounded-lg border font-bold text-xs flex justify-between items-center cursor-pointer ${inputBg}`}
                  >
                    <span className="truncate">
                      {beneficiaireActuelObj ? `${beneficiaireActuelObj.affichageNom}` : '-- Cliquer pour choisir --'}
                    </span>
                    <span className="text-slate-400 font-black">▼</span>
                  </button>
                </div>

                <div>
                  <label className="block font-black text-[10px] uppercase mb-1">Montant total (FCFA) :</label>
                  <input
                    type="number"
                    value={montantCagnotteGlobal}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setMontantCagnotteGlobal(parseFloat(e.target.value) || 0)}
                    className={`w-full p-2 rounded-lg border font-mono font-bold text-emerald-600 text-sm ${inputBg}`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={passerAttributionCagnotte}
                  className="px-3 py-2 rounded-lg font-bold text-xs bg-slate-700 hover:bg-slate-600 text-white cursor-pointer"
                >
                  Passer
                </button>
                <button
                  type="button"
                  onClick={confirmerRemiseCagnotte}
                  className="px-4 py-2 rounded-lg font-black text-xs bg-slate-800 hover:bg-slate-700 text-white uppercase shadow cursor-pointer border border-slate-600"
                >
                  Valider & Remettre
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}