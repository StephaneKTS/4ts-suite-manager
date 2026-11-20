'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionElections({ entrepriseId = '4TS-290136', isDarkMode = false }) {
  const [elections, setElections] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [electionActive, setElectionActive] = useState(null);
  
  // Vues du module : 'liste' | 'creation' | 'gestion' | 'vote' | 'resultats'
  const [vue, setVue] = useState('liste');

  // États pour le mode hors ligne & synchronisation
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  // États pour une nouvelle élection
  const [nouveauTitre, setNouveauTitre] = useState('');
  const [dateScrutin, setDateScrutin] = useState(new Date().toISOString().split('T')[0]);
  
  // Postes et candidats pour l'élection active
  const [postes, setPostes] = useState([]);
  const [nouveauPoste, setNouveauPoste] = useState('');
  const [candidats, setCandidats] = useState([]);

  // États de sélection multiple pour les candidatures
  const [posteCandidatureId, setPosteCandidatureId] = useState('');
  const [participantsCoches, setParticipantsCoches] = useState({});

  // États des modales d'ajout
  const [modalPosteOuverte, setModalPosteOuverte] = useState(false);
  const [modalCandidatOuverte, setModalCandidatOuverte] = useState(false);

  // Urne / Vote Global & Modales de vote
  const [electeurId, setElecteurId] = useState('');
  const [nomElecteurConnecte, setNomElecteurConnecte] = useState('');
  const [bulletinVote, setBulletinVote] = useState({});
  const [posteVoteModal, setPosteVoteModal] = useState(null);
  const [modalConfirmationSoumissionOuverte, setModalConfirmationSoumissionOuverte] = useState(false);
  const [resultatsDetails, setResultatsDetails] = useState([]);

  const [chargement, setChargement] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [estAdmin, setEstAdmin] = useState(false);
  const [emailConnecte, setEmailConnecte] = useState('');

  // Styles dynamiques Jour / Nuit
  const cardBg = isDarkMode ? 'bg-[#0b1329] text-slate-100 border border-slate-800' : 'bg-white text-slate-900 border border-slate-200 shadow-sm';
  const innerCardBg = isDarkMode ? 'bg-slate-950/70 text-slate-100 border border-slate-800' : 'bg-slate-50 text-slate-900 border border-slate-200';
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-white text-slate-900 border-slate-300';
  const titleColor = isDarkMode ? 'text-slate-200' : 'text-slate-900';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-600';

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
    chargerDonneesInitiales();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [entrepriseId]);

  const mettreAJourCompteurFileAttente = () => {
    try {
      const queue = JSON.parse(localStorage.getItem(`4ts_elections_queue_${entrepriseId}`) || '[]');
      setPendingActionsCount(queue.length);
    } catch (e) {
      setPendingActionsCount(0);
    }
  };

  const ajouterActionHorsLigne = (typeAction, payload) => {
    try {
      const queue = JSON.parse(localStorage.getItem(`4ts_elections_queue_${entrepriseId}`) || '[]');
      queue.push({ id: Date.now(), type: typeAction, payload, timestamp: new Date().toISOString() });
      localStorage.setItem(`4ts_elections_queue_${entrepriseId}`, JSON.stringify(queue));
      mettreAJourCompteurFileAttente();
    } catch (err) {
      console.error('Erreur mise en cache hors ligne élections :', err);
    }
  };

  const verifierEtSynchroniserFileAttente = async () => {
    if (!navigator.onLine) return;
    try {
      const queue = JSON.parse(localStorage.getItem(`4ts_elections_queue_${entrepriseId}`) || '[]');
      if (queue.length === 0) return;

      const resteQueue = [];

      for (const action of queue) {
        try {
          if (action.type === 'INSERT_ELECTION') {
            const payloadPropre = { ...action.payload };
            if (payloadPropre.id && payloadPropre.id.toString().startsWith('local_')) {
              delete payloadPropre.id;
            }
            const { error } = await supabase.from('tontine_elections').insert([payloadPropre]);
            if (error) throw error;
          } else if (action.type === 'UPDATE_ELECTION') {
            const { error } = await supabase.from('tontine_elections').update(action.payload.data).eq('id', action.payload.id);
            if (error) throw error;
          } else if (action.type === 'DELETE_ELECTION') {
            await supabase.from('tontine_votes').delete().eq('id_election', action.payload.id);
            await supabase.from('tontine_candidatures').delete().eq('id_election', action.payload.id);
            await supabase.from('tontine_postes_electoraux').delete().eq('id_election', action.payload.id);
            const { error } = await supabase.from('tontine_elections').delete().eq('id', action.payload.id);
            if (error) throw error;
          } else if (action.type === 'INSERT_POSTE') {
            const payloadPropre = { ...action.payload };
            if (payloadPropre.id && payloadPropre.id.toString().startsWith('local_')) {
              delete payloadPropre.id;
            }
            const { error } = await supabase.from('tontine_postes_electoraux').insert([payloadPropre]);
            if (error) throw error;
          } else if (action.type === 'INSERT_CANDIDATURES') {
            const payloadsPropres = action.payload.map(item => {
              const copie = { ...item };
              if (copie.id && copie.id.toString().startsWith('local_')) {
                delete copie.id;
              }
              return copie;
            });
            const { error } = await supabase.from('tontine_candidatures').insert(payloadsPropres);
            if (error) throw error;
          } else if (action.type === 'DELETE_CANDIDATURE') {
            const { error } = await supabase.from('tontine_candidatures').delete().eq('id', action.payload.id);
            if (error) throw error;
          } else if (action.type === 'INSERT_VOTE') {
            const payloadPropre = { ...action.payload };
            if (payloadPropre.id && payloadPropre.id.toString().startsWith('local_')) {
              delete payloadPropre.id;
            }
            const { error } = await supabase.from('tontine_votes').insert([payloadPropre]);
            if (error && error.code !== '23505') throw error;
          }
        } catch (err) {
          resteQueue.push(action);
        }
      }

      localStorage.setItem(`4ts_elections_queue_${entrepriseId}`, JSON.stringify(resteQueue));
      mettreAJourCompteurFileAttente();
      if (resteQueue.length === 0) {
        alert('✅ Synchronisation des élections effectuée avec succès !');
        chargerDonneesInitiales();
      }
    } catch (err) {
      console.error('Erreur globale synchronisation élections :', err);
    }
  };

  const chargerDonneesInitiales = async () => {
    const idEnt = entrepriseId || '4TS-290136';

    try {
      const cachePart = localStorage.getItem(`4ts_cache_participants_list_${idEnt}`);
      const cacheElec = localStorage.getItem(`4ts_cache_elections_list_${idEnt}`);
      if (cachePart) setParticipants(JSON.parse(cachePart));
      if (cacheElec) setElections(JSON.parse(cacheElec));

      const emailLocal = typeof window !== 'undefined' ? localStorage.getItem('emailConnecte') || 'stephs7352@gmail.com' : 'stephs7352@gmail.com';
      setEmailConnecte(emailLocal);
      const userLocal = typeof window !== 'undefined' ? localStorage.getItem('utilisateurConnecte') || '' : '';
      const isSuper = emailLocal.toLowerCase().trim() === 'stephs7352@gmail.com';
      setEstAdmin(isSuper || userLocal.toUpperCase().includes('STEPHANE'));
    } catch (e) {
      console.warn('Erreur lecture cache local élections :', e);
    }

    if (!navigator.onLine) return;

    try {
      const emailLocal = typeof window !== 'undefined' ? localStorage.getItem('emailConnecte') || 'stephs7352@gmail.com' : 'stephs7352@gmail.com';
      setEmailConnecte(emailLocal);
      const userLocal = typeof window !== 'undefined' ? localStorage.getItem('utilisateurConnecte') || '' : '';
      const isSuper = emailLocal.toLowerCase().trim() === 'stephs7352@gmail.com';

      const { data: dataPart } = await supabase
        .from('tontine_participants')
        .select('*')
        .eq('id_entreprise', idEnt)
        .order('nom_participant', { ascending: true });
      
      const listeParticipants = dataPart || [];
      setParticipants(listeParticipants);
      localStorage.setItem(`4ts_cache_participants_list_${idEnt}`, JSON.stringify(listeParticipants));

      const participantConnecte = listeParticipants.find(p => 
        p.nom_participant?.toUpperCase() === userLocal.toUpperCase() ||
        p.nom_participant?.toUpperCase().includes(userLocal.toUpperCase())
      );

      if (participantConnecte) {
        setElecteurId(participantConnecte.id);
        setNomElecteurConnecte(`${participantConnecte.nom_participant} ${participantConnecte.prenom || ''}`.trim());
      } else if (listeParticipants.length > 0) {
        setElecteurId(listeParticipants[0].id);
        setNomElecteurConnecte(`${listeParticipants[0].nom_participant} ${listeParticipants[0].prenom || ''}`.trim());
      }

      const roleParticipant = participantConnecte?.libelle_role?.toUpperCase() || '';
      const isUserAdmin = isSuper || 
        roleParticipant.includes('ADMIN') || 
        roleParticipant.includes('PRESIDENT') || 
        roleParticipant.includes('SUPERVISEUR') ||
        userLocal.toUpperCase().includes('STEPHANE');

      setEstAdmin(Boolean(isUserAdmin));

      const { data: dataElec, error } = await supabase
        .from('tontine_elections')
        .select('*')
        .eq('id_entreprise', idEnt)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setElections(dataElec || []);
      localStorage.setItem(`4ts_cache_elections_list_${idEnt}`, JSON.stringify(dataElec || []));
    } catch (err) {
      console.error('Erreur chargement élections Supabase :', err.message);
    }
  };

  useEffect(() => {
    chargerDonneesInitiales();
  }, [entrepriseId]);

  const mapMembresUniques = new Map();
  const participantstries = [...participants].sort((a, b) => {
    const hasA = Boolean(a.identifiant_unique && a.identifiant_unique.trim() !== '');
    const hasB = Boolean(b.identifiant_unique && b.identifiant_unique.trim() !== '');
    return hasB - hasA;
  });

  participantstries.forEach(p => {
    const nomCle = `${(p.nom_participant || p.nom_complet || '').trim().toUpperCase()}_${(p.prenom || '').trim().toUpperCase()}`;
    if (!mapMembresUniques.has(nomCle)) {
      if (p.identifiant_unique && p.identifiant_unique.trim() !== '') {
        mapMembresUniques.set(nomCle, p);
      }
    }
  });
  const participantsUniques = Array.from(mapMembresUniques.values());

  const chargerDetailsElection = async (election) => {
    setElectionActive(election);
    const idElec = election.id;

    try {
      const cachePostes = localStorage.getItem(`4ts_cache_postes_${idElec}`);
      const cacheCands = localStorage.getItem(`4ts_cache_candidats_${idElec}`);
      if (cachePostes) setPostes(JSON.parse(cachePostes));
      if (cacheCands) setCandidats(JSON.parse(cacheCands));
    } catch (e) {
      console.warn(e);
    }

    if (!navigator.onLine) return;

    try {
      const { data: dataPostes } = await supabase
        .from('tontine_postes_electoraux')
        .select('*')
        .eq('id_election', idElec)
        .order('ordre_priorite', { ascending: true });
      
      setPostes(dataPostes || []);
      localStorage.setItem(`4ts_cache_postes_${idElec}`, JSON.stringify(dataPostes || []));

      const { data: dataCands } = await supabase
        .from('tontine_candidatures')
        .select('*, tontine_participants(*)')
        .eq('id_election', idElec);
      
      setCandidats(dataCands || []);
      localStorage.setItem(`4ts_cache_candidats_${idElec}`, JSON.stringify(dataCands || []));
      await chargerResultats(idElec);
    } catch (err) {
      console.error('Erreur détails élection Supabase :', err.message);
    }
  };

  const creerElection = async (e) => {
    e.preventDefault();
    if (!estAdmin) {
      alert('⛔ Action réservée aux administrateurs.');
      return;
    }
    if (!nouveauTitre.trim() || actionEnCours) return;

    setActionEnCours(true);
    try {
      const payload = {
        id_entreprise: entrepriseId,
        titre_election: nouveauTitre.toUpperCase(),
        date_scrutin: dateScrutin,
        statut: 'BROUILLON'
      };

      if (!navigator.onLine) {
        const fakeId = 'local_' + Date.now();
        const electionLocal = { ...payload, id: fakeId, created_at: new Date().toISOString() };
        ajouterActionHorsLigne('INSERT_ELECTION', electionLocal);

        const majElecs = [electionLocal, ...elections];
        setElections(majElecs);
        localStorage.setItem(`4ts_cache_elections_list_${entrepriseId}`, JSON.stringify(majElecs));

        alert('📴 Mode Hors Ligne : Élection enregistrée localement.');
        setNouveauTitre('');
        setActionEnCours(false);
        setVue('liste');
        return;
      }

      const { error } = await supabase
        .from('tontine_elections')
        .insert([payload]);

      if (error) throw error;
      alert('✅ Élection créée avec succès !');
      setNouveauTitre('');
      await chargerDonneesInitiales();
      setVue('liste');
    } catch (err) {
      alert('❌ Erreur : ' + err.message);
    } finally {
      setActionEnCours(false);
    }
  };

  const modifierElection = async (el) => {
    if (!estAdmin) return;
    const nouveauTitreSaisi = window.prompt("Modifier le titre de l'élection :", el.titre_election);
    if (nouveauTitreSaisi === null) return;
    if (!nouveauTitreSaisi.trim()) {
      alert("Le titre ne peut pas être vide.");
      return;
    }

    const nouvelleDateSaisie = window.prompt("Modifier la date du scrutin (AAAA-MM-JJ) :", el.date_scrutin);
    if (nouvelleDateSaisie === null) return;

    setActionEnCours(true);
    try {
      const dataUpdate = {
        titre_election: nouveauTitreSaisi.toUpperCase(),
        date_scrutin: nouvelleDateSaisie || el.date_scrutin
      };

      if (!navigator.onLine) {
        ajouterActionHorsLigne('UPDATE_ELECTION', { id: el.id, data: dataUpdate });
        const majElecs = elections.map(e => e.id === el.id ? { ...e, ...dataUpdate } : e);
        setElections(majElecs);
        localStorage.setItem(`4ts_cache_elections_list_${entrepriseId}`, JSON.stringify(majElecs));
        alert('📴 Mode Hors Ligne : Modification enregistrée localement.');
        setActionEnCours(false);
        return;
      }

      const { error } = await supabase
        .from('tontine_elections')
        .update(dataUpdate)
        .eq('id', el.id);

      if (error) throw error;
      alert('✅ Élection modifiée avec succès !');
      await chargerDonneesInitiales();
    } catch (err) {
      alert('❌ Erreur lors de la modification : ' + err.message);
    } finally {
      setActionEnCours(false);
    }
  };

  const supprimerElection = async (el) => {
    const isSuperAdmin = (emailConnecte || '').trim().toLowerCase() === 'stephs7352@gmail.com';
    if (!isSuperAdmin) {
      alert("❌ Action non autorisée : Réservé uniquement au super administrateur (stephs7352@gmail.com).");
      return;
    }

    const confirmation = window.confirm(`⚠️ Voulez-vous vraiment supprimer définitivement l'élection "${el.titre_election}" ? Cette action est irréversible.`);
    if (!confirmation) return;

    setActionEnCours(true);
    try {
      if (!navigator.onLine) {
        alert('⚠️ Impossible de supprimer une élection en mode hors ligne.');
        setActionEnCours(false);
        return;
      }

      await supabase.from('tontine_votes').delete().eq('id_election', el.id);
      await supabase.from('tontine_candidatures').delete().eq('id_election', el.id);
      await supabase.from('tontine_postes_electoraux').delete().eq('id_election', el.id);

      const { error } = await supabase
        .from('tontine_elections')
        .delete()
        .eq('id', el.id);

      if (error) throw error;
      alert('✅ Élection supprimée avec succès !');
      await chargerDonneesInitiales();
    } catch (err) {
      alert('❌ Erreur lors de la suppression : ' + err.message);
    } finally {
      setActionEnCours(false);
    }
  };

  const ajouterPoste = async (e) => {
    e.preventDefault();
    if (!estAdmin) {
      alert('⛔ Action réservée aux administrateurs.');
      return;
    }
    if (!nouveauPoste.trim() || !electionActive || actionEnCours || electionActive.statut === 'VALIDE') return;

    setActionEnCours(true);
    try {
      const payload = {
        id_election: electionActive.id,
        libelle_poste: nouveauPoste.toUpperCase(),
        ordre_priorite: postes.length + 1
      };

      if (!navigator.onLine) {
        const fakeId = 'local_' + Date.now();
        const posteLocal = { ...payload, id: fakeId };
        ajouterActionHorsLigne('INSERT_POSTE', posteLocal);

        const majPostes = [...postes, posteLocal];
        setPostes(majPostes);
        localStorage.setItem(`4ts_cache_postes_${electionActive.id}`, JSON.stringify(majPostes));

        alert('📴 Mode Hors Ligne : Poste enregistré localement.');
        setNouveauPoste('');
        setModalPosteOuverte(false);
        setActionEnCours(false);
        return;
      }

      const { error } = await supabase
        .from('tontine_postes_electoraux')
        .insert([payload]);

      if (error) throw error;
      setNouveauPoste('');
      setModalPosteOuverte(false);
      await chargerDetailsElection(electionActive);
    } catch (err) {
      alert('❌ Erreur : ' + err.message);
    } finally {
      setActionEnCours(false);
    }
  };

  const enregistrerCandidaturesMultiples = async () => {
    if (!estAdmin) {
      alert('⛔ Action réservée aux administrateurs.');
      return;
    }
    if (!posteCandidatureId || actionEnCours || electionActive.statut === 'VALIDE') {
      alert('⚠️ Veuillez sélectionner un poste à pourvoir.');
      return;
    }

    const idsCoched = Object.keys(participantsCoches).filter(id => participantsCoches[id]);
    if (idsCoched.length === 0) {
      alert('⚠️ Veuillez cocher au moins un membre candidat.');
      return;
    }

    setActionEnCours(true);
    try {
      const inserts = idsCoched.map(idPart => ({
        id_election: electionActive.id,
        id_poste: posteCandidatureId,
        id_participant: Number(idPart),
        statut_candidat: 'VALIDE'
      }));

      if (!navigator.onLine) {
        const candsLocaux = inserts.map((ins, idx) => ({ ...ins, id: 'local_' + Date.now() + '_' + idx }));
        ajouterActionHorsLigne('INSERT_CANDIDATURES', inserts);

        const majCands = [...candidats, ...candsLocaux];
        setCandidats(majCands);
        localStorage.setItem(`4ts_cache_candidats_${electionActive.id}`, JSON.stringify(majCands));

        alert('📴 Mode Hors Ligne : Candidatures enregistrées localement.');
        setParticipantsCoches({});
        setPosteCandidatureId('');
        setModalCandidatOuverte(false);
        setActionEnCours(false);
        return;
      }

      const { error } = await supabase
        .from('tontine_candidatures')
        .insert(inserts);

      if (error) throw error;
      alert('✅ Candidatures enregistrées avec succès !');
      setParticipantsCoches({});
      setPosteCandidatureId('');
      setModalCandidatOuverte(false);
      await chargerDetailsElection(electionActive);
    } catch (err) {
      alert('❌ Erreur : ' + err.message);
    } finally {
      setActionEnCours(false);
    }
  };

  const supprimerCandidature = async (candidatId) => {
    if (electionActive.statut === 'EN_COURS' || electionActive.statut === 'VALIDE') {
      alert("⚠️ Impossible de modifier les candidatures une fois le scrutin ouvert ou validé.");
      return;
    }
    if (!confirm("Voulez-vous vraiment retirer cette candidature ?")) return;

    setActionEnCours(true);
    try {
      if (!navigator.onLine) {
        ajouterActionHorsLigne('DELETE_CANDIDATURE', { id: candidatId });
        const majCands = candidats.filter(c => c.id !== candidatId);
        setCandidats(majCands);
        localStorage.setItem(`4ts_cache_candidats_${electionActive.id}`, JSON.stringify(majCands));
        alert('📴 Mode Hors Ligne : Candidature retirée localement.');
        setActionEnCours(false);
        return;
      }

      const { error } = await supabase
        .from('tontine_candidatures')
        .delete()
        .eq('id', candidatId);

      if (error) throw error;
      alert('✅ Candidature retirée avec succès !');
      await chargerDetailsElection(electionActive);
    } catch (err) {
      alert('❌ Erreur : ' + err.message);
    } finally {
      setActionEnCours(false);
    }
  };

  const soumettreBulletinGlobal = async (e) => {
    e.preventDefault();
    if (electionActive.statut !== 'EN_COURS') {
      alert("⚠️ Le scrutin n'est pas ouvert par l'administrateur.");
      return;
    }
    if (!electeurId || actionEnCours) {
      alert('⚠️ Action impossible.');
      return;
    }

    const choixPostes = Object.entries(bulletinVote);
    if (choixPostes.length === 0) {
      alert('⚠️ Veuillez sélectionner au moins un candidat pour voter.');
      return;
    }

    setActionEnCours(true);
    try {
      for (const [posteId, candidatId] of choixPostes) {
        if (!candidatId) continue;
        const payloadVote = {
          id_election: electionActive.id,
          id_poste: posteId,
          id_electeur: Number(electeurId),
          id_candidat_vote: candidatId
        };

        if (!navigator.onLine) {
          ajouterActionHorsLigne('INSERT_VOTE', payloadVote);
        } else {
          const { error } = await supabase
            .from('tontine_votes')
            .insert([payloadVote]);

          if (error && error.code !== '23505') throw error;
        }
      }

      alert('🗳️ Votre bulletin a été soumis avec succès dans l’urne !');
      setBulletinVote({});
      await chargerResultats(electionActive.id);
      setVue('resultats');
    } catch (err) {
      alert('❌ Erreur lors de l’enregistrement du vote : ' + err.message);
    } finally {
      setActionEnCours(false);
    }
  };

  const chargerResultats = async (electionId) => {
    if (!navigator.onLine) return;
    try {
      const { data, error } = await supabase
        .from('tontine_votes')
        .select('*, tontine_candidatures(*, tontine_participants(*)), tontine_postes_electoraux(*)')
        .eq('id_election', electionId);

      if (error) throw error;
      setResultatsDetails(data || []);
    } catch (err) {
      console.error('Erreur résultats :', err.message);
    }
  };

  const gererOuvertureScrutin = async () => {
    if (!estAdmin) {
      alert('⛔ Action réservée aux administrateurs.');
      return;
    }

    if (electionActive.statut === 'EN_COURS') {
      const confirmationFermeture = window.confirm("Voulez-vous bloquer/suspendre le scrutin en cours ?");
      if (confirmationFermeture) {
        await changerStatutElection('BROUILLON');
      }
      return;
    }

    if (candidats.length === 0) {
      alert("⚠️ Impossible d'ouvrir le scrutin : aucune candidature n'a été créée pour cette élection.");
      return;
    }

    const confirmation = window.confirm(
      "Voulez-vous valider la liste des candidatures et ouvrir officiellement le scrutin pour permettre aux membres de voter?\n\nCliquez sur [OK] pour VALIDER et OUVRIR."
    );

    if (confirmation) {
      await changerStatutElection('EN_COURS');
    }
  };

  const changerStatutElection = async (nouveauStatut) => {
    setActionEnCours(true);
    try {
      if (!navigator.onLine) {
        ajouterActionHorsLigne('UPDATE_ELECTION', { id: electionActive.id, data: { statut: nouveauStatut } });
        setElectionActive({ ...electionActive, statut: nouveauStatut });
        alert(`📴 Mode Hors Ligne : Statut mis à jour localement : ${nouveauStatut}`);
        setActionEnCours(false);
        return;
      }

      const { error } = await supabase
        .from('tontine_elections')
        .update({ statut: nouveauStatut })
        .eq('id', electionActive.id);

      if (error) throw error;
      setElectionActive({ ...electionActive, statut: nouveauStatut });
      alert(`✅ Statut mis à jour : ${nouveauStatut === 'EN_COURS' ? 'SCRUTIN OUVERT AUX VOTES' : nouveauStatut}`);
      await chargerDonneesInitiales();
    } catch (err) {
      alert('❌ Erreur : ' + err.message);
    } finally {
      setActionEnCours(false);
    }
  };

  const calculerScoresPourPoste = (posteId) => {
    const votesPoste = resultatsDetails.filter(v => v.id_poste === posteId);
    const candidatsPoste = candidats.filter(c => c.id_poste === posteId);

    const scores = candidatsPoste.map(candidat => {
      const totalVoix = votesPoste.filter(v => v.id_candidat_vote === candidat.id).length;
      return {
        ...candidat,
        voix: totalVoix,
        pourcentage: votesPoste.length > 0 ? ((totalVoix / votesPoste.length) * 100).toFixed(1) : 0
      };
    });

    return scores.sort((a, b) => b.voix - a.voix);
  };

  const imprimerPV = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Veuillez autoriser les pop-ups pour imprimer le PV.");
      return;
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Procès-Verbal - ${electionActive.titre_election}</title>
        <style>
          @page { size: A4; margin: 8mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; padding: 5px; line-height: 1.25; background: #fff; font-size: 10px; }
          .header { text-align: center; border-bottom: 1.5px solid #222; padding-bottom: 5px; margin-bottom: 8px; }
          .header h1 { font-size: 13px; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .header h2 { font-size: 11px; margin: 0; color: #444; text-transform: uppercase; }
          .badge { display: inline-block; padding: 2px 6px; font-size: 8px; font-weight: bold; border: 1px solid #222; border-radius: 3px; margin-top: 3px; text-transform: uppercase; }
          .section { margin-bottom: 8px; page-break-inside: avoid; }
          .post-title { font-size: 10px; font-weight: bold; background: #f3f4f6; padding: 4px 6px; border: 1px solid #d1d5db; text-transform: uppercase; margin-bottom: 3px; display: flex; justify-content: space-between; align-items: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 2px; font-size: 9px; }
          th, td { border: 1px solid #d1d5db; padding: 3px 6px; text-align: left; }
          th { background: #f9fafb; font-weight: bold; text-transform: uppercase; font-size: 8px; color: #374151; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .winner { font-weight: bold; background: #fff7ed; }
          .signatures { margin-top: 15px; display: flex; justify-content: space-between; page-break-inside: avoid; }
          .signature-box { width: 30%; text-align: center; font-size: 9px; }
          .signature-line { margin-top: 25px; border-top: 1px dashed #6b7280; padding-top: 2px; color: #4b5563; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>4TS : ISMA LOGISTIQUE</h1>
          <h2>Procès-Verbal des Élections — ${electionActive.titre_election}</h2>
          <p style="margin: 2px 0 0 0; font-size: 9px; color: #555;">Date officielle du scrutin : ${electionActive.date_scrutin}</p>
          <div class="badge">${electionActive.statut === 'VALIDE' ? 'DOCUMENT OFFICIEL — CLÔTURÉ ET VALIDÉ' : 'RAPPORT PROVISOIRE DE DÉPOUILLEMENT'}</div>
        </div>
    `;

    postes.forEach(poste => {
      const scores = calculerScoresPourPoste(poste.id);
      const gagnant = scores[0];

      htmlContent += `
        <div class="section">
          <div class="post-title">
            <span>👑 ${poste.libelle_poste}</span>
            <span>${gagnant && gagnant.voix > 0 ? `🏆 ÉLU(E) : ${gagnant.tontine_participants?.nom_participant} ${gagnant.tontine_participants?.prenom || ''} (${gagnant.voix} voix)` : ''}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Candidat</th>
                <th class="text-center">Voix Obtenues</th>
                <th class="text-right">Pourcentage</th>
              </tr>
            </thead>
            <tbody>
      `;

      if (scores.length === 0) {
        htmlContent += `<tr><td colspan="3" class="text-center" style="color: #6b7280; font-style: italic;">Aucun candidat enregistré pour ce poste.</td></tr>`;
      } else {
        scores.forEach((s, idx) => {
          const isWinner = idx === 0 && s.voix > 0;
          htmlContent += `
            <tr class="${isWinner ? 'winner' : ''}">
              <td>${isWinner ? '🥇 ' : ''}${s.tontine_participants?.nom_participant || ''} ${s.tontine_participants?.prenom || ''}</td>
              <td class="text-center" style="font-weight: bold;">${s.voix} voix</td>
              <td class="text-right">${s.pourcentage} %</td>
            </tr>
          `;
        });
      }

      htmlContent += `
            </tbody>
          </table>
        </div>
      `;
    });

    htmlContent += `
        <div class="signatures">
          <div class="signature-box">
            <strong>Le Président de Séance</strong>
            <div class="signature-line">Signature & Cachet</div>
          </div>
          <div class="signature-box">
            <strong>Le Secrétaire de Séance</strong>
            <div class="signature-line">Signature</div>
          </div>
          <div class="signature-box">
            <strong>Les Scrutateurs</strong>
            <div class="signature-line">Signatures</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 600);
  };

  const estValide = electionActive?.statut === 'VALIDE';
  const estOuvert = electionActive?.statut === 'EN_COURS';
  const isSuperAdminUser = (emailConnecte || '').trim().toLowerCase() === 'stephs7352@gmail.com';
  const aucuneCandidature = candidats.length === 0;

  return (
    <div className={`w-full max-w-3xl mx-auto p-2.5 rounded-xl border shadow-md space-y-2.5 text-xs font-sans ${cardBg}`}>
      
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

      {/* BARRE D'EN-TÊTE DU MODULE */}
      <div className={`flex justify-between items-center px-3 py-2 rounded-xl gap-2 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
        <div className="flex items-center gap-2">
          <span className={`font-black uppercase text-xs ${titleColor}`}>🏛️ Élections & Renouvellement du Bureau</span>
        </div>
        <div className="flex gap-1.5">
          {vue !== 'liste' && (
            <button
              type="button"
              onClick={() => setVue('liste')}
              className="bg-slate-700 hover:bg-slate-600 text-white font-black px-3 py-1.5 rounded-lg text-[10px] uppercase transition cursor-pointer"
            >
              ⬅️ Retour
            </button>
          )}
          {vue === 'liste' && estAdmin && (
            <button
              type="button"
              onClick={() => setVue('creation')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-black px-3 py-1.5 rounded-lg text-[10px] uppercase transition shadow cursor-pointer border border-slate-600"
            >
              ➕ Organiser une Élection
            </button>
          )}
        </div>
      </div>

      {/* VUE 1 : LISTE DES ÉLECTIONS */}
      {vue === 'liste' && (
        <div className="space-y-3 w-full">
          {chargement ? (
            <p className={`text-center py-6 animate-pulse ${textMuted}`}>Chargement des scrutins...</p>
          ) : elections.length === 0 ? (
            <div className={`${cardBg} p-8 rounded-2xl text-center space-y-2 w-full border border-slate-700`}>
              <p className="font-bold">Aucune élection enregistrée pour le moment.</p>
              <p className={`text-[10px] ${textMuted}`}>Seul un administrateur peut organiser une élection.</p>
            </div>
          ) : (
            <div className="space-y-3 w-full">
              {elections.map((el) => {
                const estElectionValidee = el.statut === 'VALIDE';
                return (
                  <div key={el.id} className={`${cardBg} p-3.5 rounded-xl shadow-md border space-y-2.5 w-full`}>
                    
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className={`font-black text-xs uppercase ${titleColor}`}>📌 {el.titre_election}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          estElectionValidee ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                          el.statut === 'EN_COURS' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                          isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {el.statut === 'EN_COURS' ? 'OUVERT AUX VOTES' : el.statut}
                        </span>
                        <span className={`text-[9px] ${textMuted}`}>📅 {el.date_scrutin}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 justify-center pt-1 border-t border-slate-700/40">
                      {estAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            chargerDetailsElection(el);
                            setVue('gestion');
                          }}
                          className={`font-black px-2 py-1 rounded-md text-[9px] uppercase transition shadow-xs cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'}`}
                        >
                          ⚙️ Candidature
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => {
                          chargerDetailsElection(el);
                          if (el.statut !== 'EN_COURS') {
                            alert("⚠️ Le scrutin n'est pas ouvert par l'administrateur.");
                          } else {
                            setVue('vote');
                          }
                        }}
                        className={`font-black px-2 py-1 rounded-md text-[9px] uppercase transition shadow-xs cursor-pointer border ${
                          el.statut === 'EN_COURS' 
                            ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' 
                            : isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'
                        }`}
                      >
                        🗳️ Ouvrir l'Urne
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          chargerDetailsElection(el);
                          setVue('resultats');
                        }}
                        className={`font-black px-2 py-1 rounded-md text-[9px] uppercase transition shadow-xs cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'}`}
                      >
                        📊 Résultats & PV
                      </button>
                    </div>

                    {estAdmin && (
                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-700/40">
                        {isSuperAdminUser ? (
                          <button
                            type="button"
                            onClick={() => supprimerElection(el)}
                            className="bg-red-600 hover:bg-red-500 text-white font-black px-2 py-1 rounded-md text-[9px] uppercase transition shadow-xs cursor-pointer border border-red-500"
                            title="Suppression réservée au Super Admin"
                          >
                            🗑️ Supprimer
                          </button>
                        ) : <div />}
                        
                        {!estElectionValidee && (
                          <button
                            type="button"
                            onClick={() => modifierElection(el)}
                            className={`font-black px-2 py-1 rounded-md text-[9px] uppercase transition shadow-xs cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'}`}
                          >
                            ✏️ Modifier
                          </button>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VUE 2 : CRÉATION D'UNE ÉLECTION */}
      {vue === 'creation' && estAdmin && (
        <div className={`max-w-xl mx-auto ${cardBg} p-4 rounded-2xl shadow-xl space-y-3 w-full border`}>
          <h4 className={`font-black text-xs uppercase ${titleColor} border-b pb-1.5`}>➕ Nouvelle Élection de Bureau</h4>
          <form onSubmit={creerElection} className="space-y-3">
            <div>
              <label className={`block text-[10px] font-bold uppercase mb-1 ${textMuted}`}>Titre de l'élection :</label>
              <input
                type="text"
                required
                disabled={actionEnCours}
                value={nouveauTitre}
                onChange={(e) => setNouveauTitre(e.target.value)}
                className={`w-full p-2.5 rounded-lg border font-bold text-xs uppercase disabled:opacity-50 ${inputBg}`}
              />
            </div>
            <div>
              <label className={`block text-[10px] font-bold uppercase mb-1 ${textMuted}`}>Date du scrutin :</label>
              <input
                type="date"
                required
                disabled={actionEnCours}
                value={dateScrutin}
                onChange={(e) => setDateScrutin(e.target.value)}
                className={`w-full p-2.5 rounded-lg border font-bold text-xs disabled:opacity-50 ${inputBg}`}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
              <button type="button" disabled={actionEnCours} onClick={() => setVue('liste')} className="border font-bold px-4 py-2 rounded-xl text-[10px] disabled:opacity-50 cursor-pointer">
                Annuler
              </button>
              <button type="submit" disabled={actionEnCours} className="bg-slate-800 hover:bg-slate-700 text-white font-black px-5 py-2 rounded-xl text-[10px] uppercase shadow disabled:opacity-50 flex items-center gap-2 cursor-pointer border border-slate-600">
                {actionEnCours && <span className="animate-spin">⏳</span>}
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VUE 3 : GESTION DES POSTES ET DES CANDIDATS */}
      {vue === 'gestion' && electionActive && (
        <div className="space-y-4 w-full">
          <div className={`${cardBg} p-4 rounded-2xl space-y-3 shadow-lg w-full border`}>
            <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2">
              <h4 className={`font-black text-xs uppercase ${titleColor}`}>⚙️ Candidature : {electionActive.titre_election}</h4>
              
              {estAdmin && !estValide && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setModalPosteOuverte(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition shadow-xs cursor-pointer border border-slate-600"
                  >
                    ➕ Ajouter un Poste
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPosteCandidatureId('');
                      setParticipantsCoches({});
                      setModalCandidatOuverte(true);
                    }}
                    className={`font-black px-3 py-1.5 rounded-lg text-[10px] uppercase transition shadow-xs cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'}`}
                  >
                    👥 Enregistrer Candidat
                  </button>

                  <button
                    type="button"
                    disabled={actionEnCours || ( aucuneCandidature && !estOuvert )}
                    onClick={gererOuvertureScrutin}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition shadow-xs border ${
                      aucuneCandidature && !estOuvert
                        ? 'bg-slate-700 text-slate-400 border-slate-600 opacity-50 cursor-not-allowed'
                        : estOuvert 
                          ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 cursor-pointer' 
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 cursor-pointer'
                    }`}
                  >
                    {estOuvert ? '🔒 Scrutin Ouvert (Bloquer)' : '🚀 Ouvrir le Scrutin'}
                  </button>
                </div>
              )}

              {estValide && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  🔒 Scrutin Clôturé et Validé
                </span>
              )}
            </div>

            {aucuneCandidature && !estValide && !estOuvert && (
              <div className="p-2.5 rounded-xl font-bold text-center text-[10px] border bg-amber-950/60 text-amber-300 border-amber-800">
                ⚠️ Le bouton d'ouverture du scrutin est désactivé car aucune candidature n'a encore été enregistrée.
              </div>
            )}
          </div>

          <div className={`${cardBg} p-4 rounded-2xl space-y-3 shadow-lg w-full border`}>
            <h6 className={`font-bold text-[10px] uppercase ${textMuted}`}>Candidats validés :</h6>
            <div className="space-y-2">
              {postes.length === 0 ? (
                <p className={`text-xs italic ${textMuted}`}>Aucun poste n'a été créé pour le moment.</p>
              ) : (
                postes.map(poste => {
                  const candsDuPoste = candidats.filter(c => c.id_poste === poste.id);
                  return (
                    <div key={poste.id} className={`${innerCardBg} p-3 rounded-xl space-y-1.5 w-full`}>
                      <span className={`font-black uppercase text-[11px] ${titleColor}`}>👑 {poste.libelle_poste}</span>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {candsDuPoste.length === 0 ? (
                          <span className={`text-[10px] italic ${textMuted}`}>Aucun candidat enregistré pour ce poste.</span>
                        ) : (
                          candsDuPoste.map(c => (
                            <div 
                              key={c.id} 
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${isDarkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-800 border-slate-300 shadow-xs'}`}
                            >
                              <span>{c.tontine_participants?.nom_participant} {c.tontine_participants?.prenom || ''}</span>
                              
                              {!estOuvert && !estValide && estAdmin && (
                                <button
                                  type="button"
                                  onClick={() => supprimerCandidature(c.id)}
                                  className="text-red-400 hover:text-red-300 transition cursor-pointer font-black text-xs ml-1 pl-1.5 border-l border-slate-600/30"
                                  title="Retirer cette candidature"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE 1 : AJOUT DE POSTE */}
      {modalPosteOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-5 space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-2 border-slate-700">
              <h4 className="font-black uppercase text-xs">➕ Ajouter un Poste à Pourvoir</h4>
              <button type="button" onClick={() => setModalPosteOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
            </div>

            <form onSubmit={ajouterPoste} className="space-y-3 w-full">
              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 ${textMuted}`}>Libellé du poste :</label>
                <input
                  type="text"
                  required
                  disabled={actionEnCours}
                  value={nouveauPoste}
                  onChange={(e) => setNouveauPoste(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border font-bold text-xs uppercase disabled:opacity-50 ${inputBg}`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
                <button type="button" onClick={() => setModalPosteOuverte(false)} className="border font-bold px-4 py-2 rounded-xl text-[10px] cursor-pointer">
                  Annuler
                </button>
                <button type="submit" disabled={actionEnCours} className="bg-slate-800 hover:bg-slate-700 text-white font-black px-5 py-2 rounded-xl text-[10px] uppercase shadow flex items-center gap-2 cursor-pointer border border-slate-600">
                  {actionEnCours && <span className="animate-spin">⏳</span>}
                  Enregistrer le poste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE 2 : ENREGISTREMENT DES CANDIDATURES MULTIPLES */}
      {modalCandidatOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border p-5 space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-2 border-slate-700">
              <h4 className="font-black uppercase text-xs">👥 Enregistrement des Candidatures</h4>
              <button type="button" onClick={() => setModalCandidatOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
            </div>

            {postes.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs font-bold text-amber-400">⚠️ Aucun poste n'a été créé. Veuillez d'abord ajouter au moins un poste.</p>
                <button type="button" onClick={() => { setModalCandidatOuverte(false); setModalPosteOuverte(true); }} className="bg-slate-800 text-white font-black px-3 py-1.5 rounded-lg text-[10px] uppercase cursor-pointer border border-slate-600">
                  ➕ Créer un poste maintenant
                </button>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                
                <div className="space-y-1.5">
                  <label className={`block text-[10px] font-bold uppercase ${textMuted}`}>1. Choisir le poste à pourvoir :</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {postes.map(p => {
                      const estSelectionne = posteCandidatureId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPosteCandidatureId(p.id);
                            setParticipantsCoches({});
                          }}
                          className={`p-2.5 rounded-xl border text-left font-black text-xs uppercase transition cursor-pointer flex items-center justify-between ${
                            estSelectionne 
                              ? 'bg-slate-800 text-white border-slate-600 shadow-md' 
                              : isDarkMode ? 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">👑 {p.libelle_poste}</span>
                          {estSelectionne && <span>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={`block text-[10px] font-bold uppercase ${textMuted}`}>
                    2. Cocher les membres candidats pour ce poste {!posteCandidatureId && <span className="text-amber-400 font-bold">(Veuillez d'abord choisir un poste ci-dessus)</span>} :
                  </label>
                  
                  <div className="max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-950/40 rounded-xl border border-slate-800">
                    {participantsUniques.length === 0 ? (
                      <p className="col-span-full text-center text-xs py-4 text-slate-400">Aucun membre enregistré.</p>
                    ) : (
                      participantsUniques.map(part => {
                        const candExistant = candidats.find(c => c.id_participant === part.id);
                        const estDejaCandidatAilleurs = Boolean(candExistant);
                        const posteExistantLibelle = estDejaCandidatAilleurs 
                          ? postes.find(p => p.id === candExistant.id_poste)?.libelle_poste || 'un autre poste'
                          : '';

                        const estCoche = Boolean(participantsCoches[part.id]);
                        const nomComplet = `${part.nom_participant || part.nom_complet || ''} ${part.prenom || ''}`.trim();

                        return (
                          <div
                            key={part.id}
                            onClick={() => {
                              if (!posteCandidatureId || estDejaCandidatAilleurs) return;
                              setParticipantsCoches(prev => ({
                                ...prev,
                                [part.id]: !prev[part.id]
                              }));
                            }}
                            className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                              !posteCandidatureId || estDejaCandidatAilleurs
                                ? 'opacity-50 cursor-not-allowed bg-slate-900/40 border-slate-800 text-slate-500'
                                : estCoche 
                                  ? 'bg-slate-800 text-white border-slate-600 font-bold shadow-md cursor-pointer' 
                                  : isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 cursor-pointer' : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            <div className="min-w-0 pr-2 flex items-center gap-2">
                              <input
                                type="checkbox"
                                disabled={!posteCandidatureId || estDejaCandidatAilleurs}
                                checked={estCoche}
                                onChange={() => {}}
                                className="w-4 h-4 rounded accent-slate-600 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <p className="font-black uppercase truncate text-xs">{nomComplet}</p>
                                <p className="text-[9px] font-mono text-slate-400">
                                  {estDejaCandidatAilleurs ? <span className="text-amber-400 font-bold">⚠️ Déjà candidat ({posteExistantLibelle})</span> : part.identifiant_unique}
                                </p>
                              </div>
                            </div>
                            {estCoche && <span className="shrink-0 font-bold text-xs">✓ Coché</span>}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
                  <button type="button" onClick={() => setModalCandidatOuverte(false)} className="border font-bold px-4 py-2 rounded-xl text-[10px] cursor-pointer">
                    Annuler
                  </button>
                  <button 
                    type="button" 
                    onClick={enregistrerCandidaturesMultiples} 
                    disabled={actionEnCours || !posteCandidatureId || Object.values(participantsCoches).filter(Boolean).length === 0} 
                    className="bg-slate-800 hover:bg-slate-700 text-white font-black px-5 py-2 rounded-xl text-[10px] uppercase shadow disabled:opacity-50 flex items-center gap-2 cursor-pointer border border-slate-600"
                  >
                    {actionEnCours && <span className="animate-spin">⏳</span>}
                    Valider les candidatures
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VUE 4 : L'ISLOIR GLOBAL */}
      {vue === 'vote' && electionActive && (
        <div className={`max-w-2xl mx-auto ${cardBg} p-5 rounded-2xl shadow-xl space-y-4 w-full border`}>
          <div className="text-center border-b pb-3 space-y-1 border-slate-700">
            <h4 className={`font-black text-xs uppercase ${titleColor}`}>🗳️ Isoloir Électronique Global</h4>
            <p className={`text-[10px] ${textMuted}`}>{electionActive.titre_election}</p>
          </div>

          {!estOuvert ? (
            <div className="p-4 rounded-xl font-bold text-center space-y-2 border bg-amber-950/60 text-amber-300 border-amber-800">
              <p>⚠️ Le scrutin n'est pas ouvert par l'administrateur.</p>
              <p className={`text-[10px] ${textMuted}`}>Veuillez patienter jusqu'à l'ouverture officielle des votes.</p>
            </div>
          ) : estValide ? (
            <div className="p-4 rounded-xl font-bold text-center space-y-2 border bg-emerald-950/60 text-emerald-300 border-emerald-800">
              <p>🔒 Le scrutin est officiellement clôturé et validé.</p>
              <p className={`text-[10px] ${textMuted}`}>Les votes ne sont plus autorisés.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 ${textMuted}`}>Identité de l'électeur (Connecté) :</label>
                <input
                  type="text"
                  disabled
                  value={nomElecteurConnecte || 'UTILISATEUR CONNECTÉ'}
                  className={`w-full p-2.5 rounded-lg border font-black text-xs uppercase opacity-90 ${inputBg}`}
                />
              </div>

              <div className="space-y-3 pt-2">
                <h5 className="font-black text-xs uppercase border-b border-slate-700 pb-1">
                  📋 Bulletin de Vote :
                </h5>

                {postes.length === 0 ? (
                  <p className={`text-xs italic ${textMuted}`}>Aucun poste à pourvoir dans cette élection.</p>
                ) : (
                  postes.map(poste => {
                    const candidatVoteId = bulletinVote[poste.id];
                    const candidatChoisi = candidats.find(c => String(c.id) === String(candidatVoteId));
                    const nomCandidatChoisi = candidatChoisi 
                      ? `${candidatChoisi.tontine_participants?.nom_participant} ${candidatChoisi.tontine_participants?.prenom || ''}`
                      : '-- Abstention / Ne pas voter --';

                    return (
                      <div 
                        key={poste.id} 
                        onClick={() => setPosteVoteModal(poste)}
                        className={`${innerCardBg} p-3.5 rounded-xl space-y-1 w-full border hover:border-slate-500 transition cursor-pointer flex items-center justify-between shadow-xs`}
                      >
                        <div>
                          <span className={`block font-black uppercase text-xs ${titleColor}`}>👑 {poste.libelle_poste}</span>
                          <span className={`text-[10px] font-bold ${candidatChoisi ? 'text-emerald-400' : textMuted}`}>
                            {nomCandidatChoisi}
                          </span>
                        </div>
                        <span className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase shadow-xs border border-slate-600">
                          {candidatChoisi ? 'Modifier' : 'Voter ➔'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-1 pt-2">
                <button
                  type="button"
                  disabled={actionEnCours}
                  onClick={() => setModalConfirmationSoumissionOuverte(true)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl text-xs uppercase shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border border-slate-600"
                >
                  {actionEnCours && <span className="animate-spin">⏳</span>}
                  📥 Soumettre mon bulletin
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALE DE VOTE */}
      {posteVoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl border p-5 space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-2 border-slate-700">
              <h4 className="font-black uppercase text-xs">🗳️ VOTE POUR : {posteVoteModal.libelle_poste}</h4>
              <button type="button" onClick={() => setPosteVoteModal(null)} className="font-bold text-sm cursor-pointer">✖</button>
            </div>

            <div className="space-y-2 py-1">
              <p className={`text-[10px] font-bold uppercase ${textMuted}`}>Sélectionnez votre candidat ou optez pour l'abstention :</p>
              
              <div className="grid grid-cols-1 gap-2">
                <div
                  onClick={() => {
                    setBulletinVote(prev => ({ ...prev, [posteVoteModal.id]: '' }));
                    setPosteVoteModal(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                    !bulletinVote[posteVoteModal.id] 
                      ? (isDarkMode ? 'bg-slate-800 text-amber-300 border-amber-600 font-bold shadow-md' : 'bg-amber-100 text-amber-900 border-amber-400 font-bold shadow-md')
                      : isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold text-xs uppercase">-- Abstention / Ne pas voter pour ce poste --</span>
                  {!bulletinVote[posteVoteModal.id] && <span className="font-bold">✓ Choisi</span>}
                </div>

                {candidats.filter(c => c.id_poste === posteVoteModal.id).length === 0 ? (
                  <p className="text-center text-xs py-4 text-slate-400 italic">Aucun candidat enregistré pour ce poste.</p>
                ) : (
                  candidats.filter(c => c.id_poste === posteVoteModal.id).map(c => {
                    const estSelectionne = String(bulletinVote[posteVoteModal.id]) === String(c.id);
                    const nomCandidat = `${c.tontine_participants?.nom_participant} ${c.tontine_participants?.prenom || ''}`.trim();
                    const identifiant = c.tontine_participants?.identifiant_unique || '';

                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setBulletinVote(prev => ({ ...prev, [posteVoteModal.id]: c.id }));
                          setPosteVoteModal(null);
                        }}
                        className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                          estSelectionne 
                            ? 'bg-slate-800 text-white border-slate-600 font-bold shadow-md' 
                            : isDarkMode ? 'bg-slate-900 text-slate-200 border-slate-800 hover:bg-slate-800' : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="font-black uppercase text-xs">👑 {nomCandidat}</p>
                          {identifiant && <p className="text-[9px] font-mono opacity-80">{identifiant}</p>}
                        </div>
                        {estSelectionne && <span className="font-bold text-xs">✓ Sélectionné</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-700">
              <button type="button" onClick={() => setPosteVoteModal(null)} className="border font-bold px-4 py-2 rounded-xl text-[10px] cursor-pointer">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION DE SOUMISSION */}
      {modalConfirmationSoumissionOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-5 space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-2 border-slate-700">
              <h4 className="font-black uppercase text-xs">⚠️ Confirmation de soumission</h4>
              <button type="button" onClick={() => setModalConfirmationSoumissionOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
            </div>

            <div className="space-y-3 py-2 text-center">
              <p className="font-bold text-xs uppercase">Êtes-vous sûr de vouloir soumettre votre vote ?</p>
              <p className={`text-[10px] font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                Cette action est définitive. Une fois soumis, il ne sera plus possible de modifier vos choix.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
              <button 
                type="button" 
                onClick={() => setModalConfirmationSoumissionOuverte(false)} 
                className="border font-bold px-4 py-2 rounded-xl text-[10px] cursor-pointer"
              >
                Annuler
              </button>
              <button 
                type="button" 
                disabled={actionEnCours} 
                onClick={async (e) => {
                  setModalConfirmationSoumissionOuverte(false);
                  await soumettreBulletinGlobal(e);
                }} 
                className="bg-slate-800 hover:bg-slate-700 text-white font-black px-5 py-2 rounded-xl text-[10px] uppercase shadow flex items-center gap-2 cursor-pointer border border-slate-600"
              >
                {actionEnCours && <span className="animate-spin">⏳</span>}
                Oui, soumettre définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VUE 5 : RÉSULTATS & PROCÈS-VERBAL */}
      {vue === 'resultats' && electionActive && (
        <div className="space-y-4 w-full">
          <div className={`${cardBg} p-4 rounded-2xl shadow-xl space-y-4 w-full border`}>
            
            <div className="text-center border-b pb-3 space-y-2 border-slate-700">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${estValide ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : estOuvert ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                  {estValide ? '✅ Procès-Verbal Officiel Clôturé et Validé' : estOuvert ? '📊 Scrutin Ouvert (Votes en cours)' : '📊 Rapport Provisoire (Scrutin fermé)'}
                </span>
                
                <button
                  type="button"
                  onClick={imprimerPV}
                  className={`font-black px-3 py-1.5 rounded-lg text-[10px] uppercase transition shadow-xs flex items-center gap-1.5 cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'}`}
                >
                  🖨️ Imprimer le PV
                </button>
              </div>

              <h4 className="font-black text-sm uppercase pt-1">{electionActive.titre_election}</h4>
              <p className={`text-[10px] ${textMuted}`}>Scrutin du : {electionActive.date_scrutin}</p>
            </div>

            <div className="space-y-4 w-full">
              {postes.map((poste) => {
                const scores = calculerScoresPourPoste(poste.id);
                const gagnant = scores[0];

                return (
                  <div key={poste.id} className={`${innerCardBg} p-3.5 rounded-xl space-y-2 w-full`}>
                    <div className="flex justify-between items-center border-b pb-1.5 flex-wrap gap-1 border-slate-700">
                      <span className={`font-black text-xs uppercase ${titleColor}`}>👑 {poste.libelle_poste}</span>
                      {gagnant && gagnant.voix > 0 && (
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded text-[9px] font-black uppercase">
                          🏆 Élu(e) : {gagnant.tontine_participants?.nom_participant} ({gagnant.voix} voix)
                        </span>
                      )}
                    </div>

                    <div className="overflow-x-auto rounded-lg w-full">
                      <table className="w-full text-left text-xs">
                        <thead className={`${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'} uppercase text-[9px] font-black`}>
                          <tr>
                            <th className="p-2">Candidat</th>
                            <th className="p-2 text-center">Voix Obtenues</th>
                            <th className="p-2 text-right">Pourcentage</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y text-[10px] ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                          {scores.length === 0 ? (
                            <tr><td colSpan="3" className={`p-3 text-center ${textMuted}`}>Aucun candidat pour ce poste.</td></tr>
                          ) : (
                            scores.map((s, idx) => (
                              <tr key={s.id} className={idx === 0 && s.voix > 0 ? (isDarkMode ? 'bg-slate-800 font-bold' : 'bg-gray-100 font-bold') : ''}>
                                <td className="p-2 uppercase font-extrabold">
                                  {idx === 0 && s.voix > 0 ? '🥇 ' : ''}
                                  {s.tontine_participants?.nom_participant} {s.tontine_participants?.prenom || ''}
                                </td>
                                <td className="p-2 text-center font-mono font-black text-emerald-500">{s.voix} voix</td>
                                <td className={`p-2 text-right font-mono ${textMuted}`}>{s.pourcentage} %</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-700">
              {estValide ? (
                <div className={`w-full font-black py-3 rounded-xl text-xs uppercase text-center flex items-center justify-center gap-2 border ${isDarkMode ? 'bg-slate-800 text-emerald-400 border-slate-700' : 'bg-emerald-50 text-emerald-700 border-emerald-300'}`}>
                  <span>🔒</span> Élection officiellement clôturée et validée (Mode Consultation)
                </div>
              ) : estAdmin ? (
                <button
                  type="button"
                  disabled={actionEnCours}
                  onClick={() => changerStatutElection('VALIDE')}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl text-xs uppercase shadow transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border border-slate-600"
                >
                  {actionEnCours && <span className="animate-spin">⏳</span>}
                  🔒 Valider et Clôturer officiellement l'Élection
                </button>
              ) : (
                <div className="w-full bg-slate-800 text-slate-300 font-bold py-3 rounded-xl text-xs uppercase text-center border border-slate-700">
                  🔒 Seul un administrateur peut valider et clôturer officiellement cette élection.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}