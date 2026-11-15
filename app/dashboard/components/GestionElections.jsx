'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionElections({ entrepriseId = '4TS-290136', isDarkMode = false }) {
  const [elections, setElections] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [electionActive, setElectionActive] = useState(null);
  
  // Vues du module : 'liste' | 'creation' | 'gestion' | 'vote' | 'resultats'
  const [vue, setVue] = useState('liste');

  // États pour une nouvelle élection
  const [nouveauTitre, setNouveauTitre] = useState('');
  const [dateScrutin, setDateScrutin] = useState(new Date().toISOString().split('T')[0]);
  
  // Postes et candidats pour l'élection active
  const [postes, setPostes] = useState([]);
  const [nouveauPoste, setNouveauPoste] = useState('');
  const [candidats, setCandidats] = useState([]);

  // États de sélection multiple pour les candidatures
  const [posteCandidatureId, setPosteCandidatureId] = useState('');
  const [participantsCoches, setParticipantsCoches] = useState({}); // { id_participant: true/false }

  // États des modales d'ajout
  const [modalPosteOuverte, setModalPosteOuverte] = useState(false);
  const [modalCandidatOuverte, setModalCandidatOuverte] = useState(false);

  // Urne / Vote Global & Modales de vote
  const [electeurId, setElecteurId] = useState('');
  const [nomElecteurConnecte, setNomElecteurConnecte] = useState('');
  const [bulletinVote, setBulletinVote] = useState({});
  const [posteVoteModal, setPosteVoteModal] = useState(null); // Poste actuellement ouvert dans la modal de vote
  const [modalConfirmationSoumissionOuverte, setModalConfirmationSoumissionOuverte] = useState(false); // Modale de confirmation finale
  const [resultatsDetails, setResultatsDetails] = useState([]);

  const [chargement, setChargement] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [estAdmin, setEstAdmin] = useState(false);
  const [emailConnecte, setEmailConnecte] = useState('');

  // Styles dynamiques Jour / Nuit épurés (Orange & Gris)
  const cardBg = isDarkMode ? 'bg-slate-900/90 text-slate-100' : 'bg-white text-slate-900 shadow-sm';
  const innerCardBg = isDarkMode ? 'bg-slate-950/70 text-slate-100' : 'bg-slate-50 text-slate-900';
  const inputBg = isDarkMode ? 'bg-slate-950 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-300';
  const titleColor = isDarkMode ? 'text-orange-400' : 'text-orange-600';
  const subTitleColor = isDarkMode ? 'text-orange-400' : 'text-orange-600';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-600';

  const chargerDonneesInitiales = async () => {
    setChargement(true);
    try {
      const emailLocal = typeof window !== 'undefined' ? localStorage.getItem('emailConnecte') || 'stephs7352@gmail.com' : 'stephs7352@gmail.com';
      setEmailConnecte(emailLocal);
      const userLocal = typeof window !== 'undefined' ? localStorage.getItem('utilisateurConnecte') || '' : '';
      const isSuper = emailLocal.toLowerCase().trim() === 'stephs7352@gmail.com';

      // 1. Charger les participants
      const { data: dataPart } = await supabase
        .from('tontine_participants')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('nom_participant', { ascending: true });
      
      const listeParticipants = dataPart || [];
      setParticipants(listeParticipants);

      // Identifier le participant connecté par son nom ou email
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

      // 2. Charger les élections
      const { data: dataElec, error } = await supabase
        .from('tontine_elections')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setElections(dataElec || []);
    } catch (err) {
      console.error('Erreur chargement élections :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonneesInitiales();
  }, [entrepriseId]);

  // DÉDUPLICATION ET FILTRAGE STRICT : Uniquement les membres dotés d'un identifiant unique valide
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
    setChargement(true);
    try {
      const { data: dataPostes } = await supabase
        .from('tontine_postes_electoraux')
        .select('*')
        .eq('id_election', election.id)
        .order('ordre_priorite', { ascending: true });
      
      setPostes(dataPostes || []);

      const { data: dataCands } = await supabase
        .from('tontine_candidatures')
        .select('*, tontine_participants(*)')
        .eq('id_election', election.id);
      
      setCandidats(dataCands || []);
      await chargerResultats(election.id);
    } catch (err) {
      console.error('Erreur détails élection :', err.message);
    } finally {
      setChargement(false);
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
      const { error } = await supabase
        .from('tontine_elections')
        .insert([{
          id_entreprise: entrepriseId,
          titre_election: nouveauTitre.toUpperCase(),
          date_scrutin: dateScrutin,
          statut: 'BROUILLON'
        }]);

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
      const { error } = await supabase
        .from('tontine_elections')
        .update({
          titre_election: nouveauTitreSaisi.toUpperCase(),
          date_scrutin: nouvelleDateSaisie || el.date_scrutin
        })
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
      const { error } = await supabase
        .from('tontine_postes_electoraux')
        .insert([{
          id_election: electionActive.id,
          libelle_poste: nouveauPoste.toUpperCase(),
          ordre_priorite: postes.length + 1
        }]);

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

  // SUPPRIMER / RETIRER UNE CANDIDATURE
  const supprimerCandidature = async (candidatId) => {
    if (electionActive.statut === 'EN_COURS' || electionActive.statut === 'VALIDE') {
      alert("⚠️ Impossible de modifier les candidatures une fois le scrutin ouvert ou validé.");
      return;
    }
    if (!confirm("Voulez-vous vraiment retirer cette candidature ?")) return;

    setActionEnCours(true);
    try {
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
        const { error } = await supabase
          .from('tontine_votes')
          .insert([{
            id_election: electionActive.id,
            id_poste: posteId,
            id_electeur: Number(electeurId),
            id_candidat_vote: candidatId
          }]);

        if (error) {
          if (error.code === '23505') {
            console.warn(`Déjà voté pour le poste ${posteId}`);
          } else {
            throw error;
          }
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
      alert("⚠️ Impossible d'ouvrir le scrutin : aucune candidature n'a été créée pour cette élection. Veuillez d'abord ajouter des candidats.");
      return;
    }

    const confirmation = window.confirm(
      "Voulez-vous valider la liste des candidatures et ouvrir officiellement le scrutin pour permettre aux membres de voter ?\n\nCliquez sur [OK] pour VALIDER et OUVRIR, ou sur [Annuler] si vous souhaitez faire des modifications."
    );

    if (confirmation) {
      await changerStatutElection('EN_COURS');
    }
  };

  const changerStatutElection = async (nouveauStatut) => {
    setActionEnCours(true);
    try {
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
    <div className={`w-full h-full space-y-3 font-sans text-xs relative ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* BARRE D'EN-TÊTE DU MODULE */}
      <div className={`flex justify-between items-center px-3 py-2 rounded-xl gap-2 ${isDarkMode ? 'bg-slate-900/40 text-slate-100' : 'bg-white text-slate-900 shadow-xs'}`}>
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
              ⬅️ Retour aux Élections
            </button>
          )}
          {vue === 'liste' && estAdmin && (
            <button
              type="button"
              onClick={() => setVue('creation')}
              className="bg-orange-600 hover:bg-orange-500 text-white font-black px-3 py-1.5 rounded-lg text-[10px] uppercase transition shadow cursor-pointer"
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
            <div className={`${cardBg} p-8 rounded-2xl text-center space-y-2 w-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]`}>
              <p className="font-bold">Aucune élection enregistrée pour le moment.</p>
              <p className={`text-[10px] ${textMuted}`}>Seul un administrateur peut organiser une élection.</p>
            </div>
          ) : (
            <div className="space-y-3 w-full">
              {elections.map((el) => {
                const estElectionValidee = el.statut === 'VALIDE';
                return (
                  <div key={el.id} className={`${cardBg} p-3.5 rounded-xl shadow-md border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] space-y-2.5 w-full`}>
                    
                    {/* LIGNE 1 : Titre, Statut et Date sur une seule ligne */}
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className={`font-black text-xs uppercase ${titleColor}`}>📌 {el.titre_election}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          estElectionValidee ? 'bg-emerald-500/20 text-emerald-300' :
                          el.statut === 'EN_COURS' ? 'bg-orange-500/20 text-orange-300' :
                          isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {el.statut === 'EN_COURS' ? 'OUVERT AUX VOTES' : el.statut}
                        </span>
                        <span className={`text-[9px] ${textMuted}`}>📅 {el.date_scrutin}</span>
                      </div>
                    </div>

                    {/* LIGNE 2 : Boutons d'action principaux (Candidature, Ouvrir l'Urne, Résultats & PV) alignés et réduits */}
                    <div className="flex items-center gap-1.5 justify-center pt-1 border-t border-slate-800/40">
                      {estAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            chargerDetailsElection(el);
                            setVue('gestion');
                          }}
                          className="bg-slate-300 hover:bg-slate-400 text-slate-950 font-black px-2 py-1 rounded-md text-[9px] uppercase transition shadow-xs cursor-pointer"
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
                        className={`font-black px-2 py-1 rounded-md text-[9px] uppercase transition shadow-xs cursor-pointer ${
                          el.statut === 'EN_COURS' ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-slate-300 hover:bg-slate-400 text-slate-950'
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
                        className="bg-slate-300 hover:bg-slate-400 text-slate-950 font-black px-2 py-1 rounded-md text-[9px] uppercase transition shadow-xs cursor-pointer"
                      >
                        📊 Résultats & PV
                      </button>
                    </div>

                    {/* LIGNE 3 : Supprimer (Super Admin stephs7352@gmail.com), Modifier à droite (Si admin) - Boutons réduits */}
                    {estAdmin && (
                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/40">
                        {isSuperAdminUser ? (
                          <button
                            type="button"
                            onClick={() => supprimerElection(el)}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-black px-2 py-1 rounded-md text-[9px] uppercase transition shadow-xs cursor-pointer"
                            title="Suppression réservée au Super Admin (stephs7352@gmail.com)"
                          >
                            🗑️ Supprimer
                          </button>
                        ) : <div />}
                        
                        {!estElectionValidee && (
                          <button
                            type="button"
                            onClick={() => modifierElection(el)}
                            className="bg-amber-600 hover:bg-amber-500 text-white font-black px-2 py-1 rounded-md text-[9px] uppercase transition shadow-xs cursor-pointer"
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
        <div className={`max-w-xl mx-auto ${cardBg} p-5 rounded-2xl shadow-xl space-y-4 w-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]`}>
          <h4 className={`font-black text-xs uppercase ${titleColor} border-b ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'} pb-2`}>➕ Nouvelle Élection de Bureau</h4>
          <form onSubmit={creerElection} className="space-y-3">
            <div>
              <label className={`block text-[10px] font-bold uppercase mb-1 ${textMuted}`}>Titre de l'élection :</label>
              <input
                type="text"
                required
                disabled={actionEnCours}
                value={nouveauTitre}
                onChange={(e) => setNouveauTitre(e.target.value)}
                placeholder="EX: ÉLECTION DU BUREAU EXÉCUTIF 2026-2028"
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
            <div className={`flex justify-end gap-2 pt-2 border-t ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
              <button type="button" disabled={actionEnCours} onClick={() => setVue('liste')} className={`${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'} font-bold px-4 py-2 rounded-xl text-[10px] disabled:opacity-50 cursor-pointer`}>
                Annuler
              </button>
              <button type="submit" disabled={actionEnCours} className="bg-orange-600 hover:bg-orange-500 text-white font-black px-5 py-2 rounded-xl text-[10px] uppercase shadow disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                {actionEnCours && <span className="animate-spin">⏳</span>}
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VUE 3 : GESTION DES POSTES ET DES CANDIDATS (CANDIDATURE) */}
      {vue === 'gestion' && electionActive && (
        <div className="space-y-4 w-full">
          <div className={`${cardBg} p-4 rounded-2xl space-y-3 shadow-lg w-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]`}>
            <div className={`flex justify-between items-center border-b ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'} pb-2 flex-wrap gap-2`}>
              <h4 className={`font-black text-xs uppercase ${titleColor}`}>⚙️ Candidature : {electionActive.titre_election}</h4>
              
              {estAdmin && !estValide && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setModalPosteOuverte(true)}
                    className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition shadow-xs cursor-pointer"
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
                    className="bg-cyan-700 hover:bg-cyan-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition shadow-xs cursor-pointer"
                  >
                    👥 Enregistrer Candidat
                  </button>

                  <button
                    type="button"
                    disabled={actionEnCours || ( aucuneCandidature && !estOuvert )}
                    onClick={gererOuvertureScrutin}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition shadow-xs ${
                      aucuneCandidature && !estOuvert
                        ? 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
                        : estOuvert 
                          ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer' 
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                    }`}
                    title={aucuneCandidature && !estOuvert ? "Veuillez d'abord enregistrer au moins une candidature pour ouvrir le scrutin." : ""}
                  >
                    {estOuvert ? '🔒 Scrutin Ouvert (Bloquer)' : '🚀 Ouvrir le Scrutin'}
                  </button>
                </div>
              )}

              {estValide && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                  🔒 Scrutin Clôturé et Validé
                </span>
              )}
            </div>

            {aucuneCandidature && !estValide && !estOuvert && (
              <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-300 font-bold text-center text-[10px]">
                ⚠️ Le bouton d'ouverture du scrutin est désactivé car aucune candidature n'a encore été enregistrée.
              </div>
            )}

            {estValide && (
              <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-300 font-bold text-center">
                ✅ Cette élection a été officiellement validée et clôturée. Mode consultation uniquement.
              </div>
            )}
          </div>

          {/* LISTE DES CANDIDATS VALIDÉS PAR POSTE AVEC BOUTON DE SUPPRESSION UNIQUEMENT */}
          <div className={`${cardBg} p-4 rounded-2xl space-y-3 shadow-lg w-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]`}>
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
                              
                              {/* BOUTON SUPPRIMER LA CANDIDATURE (AVANT OUVERTURE DU SCRUTIN) */}
                              {!estOuvert && !estValide && estAdmin && (
                                <button
                                  type="button"
                                  onClick={() => supprimerCandidature(c.id)}
                                  className="text-rose-400 hover:text-rose-300 transition cursor-pointer font-black text-xs ml-1 pl-1.5 border-l border-slate-600/30"
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
          <div className={`w-full max-w-lg rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.4)] border border-cyan-400 p-5 space-y-4 ${isDarkMode ? 'bg-[#0b1329] text-white' : 'bg-white text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-2 border-cyan-400/40">
              <h4 className="font-black text-cyan-400 uppercase text-xs">➕ Ajouter un Poste à Pourvoir</h4>
              <button type="button" onClick={() => setModalPosteOuverte(false)} className="text-cyan-300 hover:text-white font-bold text-sm cursor-pointer">✖</button>
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
                  placeholder="EX: SECRÉTAIRE GÉNÉRAL"
                  className={`w-full p-2.5 rounded-lg border font-bold text-xs uppercase disabled:opacity-50 ${inputBg}`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cyan-400/40">
                <button type="button" onClick={() => setModalPosteOuverte(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-xl text-[10px] cursor-pointer">
                  Annuler
                </button>
                <button type="submit" disabled={actionEnCours} className="bg-orange-600 hover:bg-orange-500 text-white font-black px-5 py-2 rounded-xl text-[10px] uppercase shadow flex items-center gap-2 cursor-pointer">
                  {actionEnCours && <span className="animate-spin">⏳</span>}
                  Enregistrer le poste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE 2 : ENREGISTREMENT DES CANDIDATURES MULTIPLES PAR POSTE */}
      {modalCandidatOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.4)] border border-cyan-400 p-5 space-y-4 ${isDarkMode ? 'bg-[#0b1329] text-white' : 'bg-white text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-2 border-cyan-400/40">
              <h4 className="font-black text-cyan-400 uppercase text-xs">👥 Enregistrement des Candidatures</h4>
              <button type="button" onClick={() => setModalCandidatOuverte(false)} className="text-cyan-300 hover:text-white font-bold text-sm cursor-pointer">✖</button>
            </div>

            {postes.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs font-bold text-amber-400">⚠️ Aucun poste n'a été créé. Veuillez d'abord ajouter au moins un poste.</p>
                <button type="button" onClick={() => { setModalCandidatOuverte(false); setModalPosteOuverte(true); }} className="bg-orange-600 hover:bg-orange-500 text-white font-black px-3 py-1.5 rounded-lg text-[10px] uppercase cursor-pointer">
                  ➕ Créer un poste maintenant
                </button>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                
                {/* 1. SÉLECTION DU POSTE */}
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
                              ? 'bg-orange-600 text-white border-orange-400 shadow-md' 
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

                {/* 2. SÉLECTION DES MEMBRES CANDIDATS (Uniques avec ID) */}
                <div className="space-y-1.5">
                  <label className={`block text-[10px] font-bold uppercase ${textMuted}`}>
                    2. Cocher les membres candidats pour ce poste {!posteCandidatureId && <span className="text-amber-400">(Veuillez d'abord choisir un poste ci-dessus)</span>} :
                  </label>
                  
                  <div className="max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-950/40 rounded-xl border border-slate-800">
                    {participantsUniques.length === 0 ? (
                      <p className="col-span-full text-center text-xs py-4 text-slate-400">Aucun membre avec identifiant unique enregistré.</p>
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
                                  ? 'bg-cyan-600/30 text-cyan-200 border-cyan-400 font-bold shadow-md cursor-pointer' 
                                  : isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 cursor-pointer' : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            <div className="min-w-0 pr-2 flex items-center gap-2">
                              <input
                                type="checkbox"
                                disabled={!posteCandidatureId || estDejaCandidatAilleurs}
                                checked={estCoche}
                                onChange={() => {}}
                                className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <p className="font-black uppercase truncate text-xs">{nomComplet}</p>
                                <p className="text-[9px] font-mono text-cyan-400">
                                  {estDejaCandidatAilleurs ? <span className="text-rose-400 font-bold">⚠️ Déjà candidat ({posteExistantLibelle})</span> : part.identifiant_unique}
                                </p>
                              </div>
                            </div>
                            {estCoche && <span className="shrink-0 font-bold text-cyan-300 text-xs">✓ Coché</span>}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-cyan-400/40">
                  <button type="button" onClick={() => setModalCandidatOuverte(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-xl text-[10px] cursor-pointer">
                    Annuler
                  </button>
                  <button 
                    type="button" 
                    onClick={enregistrerCandidaturesMultiples} 
                    disabled={actionEnCours || !posteCandidatureId || Object.values(participantsCoches).filter(Boolean).length === 0} 
                    className="bg-orange-600 hover:bg-orange-500 text-white font-black px-5 py-2 rounded-xl text-[10px] uppercase shadow disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
        <div className={`max-w-2xl mx-auto ${cardBg} p-5 rounded-2xl shadow-xl space-y-4 w-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]`}>
          <div className={`text-center border-b ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'} pb-3 space-y-1`}>
            <h4 className={`font-black text-xs uppercase ${titleColor}`}>🗳️ Isoloir Électronique Global</h4>
            <p className={`text-[10px] ${textMuted}`}>{electionActive.titre_election}</p>
          </div>

          {!estOuvert ? (
            <div className="bg-amber-500/10 p-4 rounded-xl text-amber-300 font-bold text-center space-y-2">
              <p>⚠️ Le scrutin n'est pas ouvert par l'administrateur.</p>
              <p className={`text-[10px] ${textMuted}`}>Veuillez patienter jusqu'à l'ouverture officielle des votes.</p>
            </div>
          ) : estValide ? (
            <div className="bg-emerald-500/10 p-4 rounded-xl text-emerald-300 font-bold text-center space-y-2">
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
                <h5 className={`font-black text-xs uppercase border-b ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'} pb-1 ${subTitleColor}`}>
                  📋 Bulletin de Vote (Cliquez sur chaque poste pour choisir votre candidat) :
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
                        className={`${innerCardBg} p-3.5 rounded-xl space-y-1 w-full border border-cyan-400/40 hover:border-cyan-400 transition cursor-pointer flex items-center justify-between shadow-xs`}
                      >
                        <div>
                          <span className={`block font-black uppercase text-xs ${titleColor}`}>👑 {poste.libelle_poste}</span>
                          <span className={`text-[10px] font-bold ${candidatChoisi ? 'text-emerald-400' : textMuted}`}>
                            {nomCandidatChoisi}
                          </span>
                        </div>
                        <span className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase shadow-xs">
                          {candidatChoisi ? 'Modifier le choix' : 'Voter ➔'}
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
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-xl text-xs uppercase shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {actionEnCours && <span className="animate-spin">⏳</span>}
                  📥 Soumettre mon bulletin
                </button>
                <p className="text-[10px] text-center text-amber-400 font-bold italic pt-1">
                  ⚠️ Attention : Après soumission de votre bulletin, vous ne pourrez plus modifier vos choix. Vous pouvez modifier vos sélections autant de fois que nécessaire avant de soumettre.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALE DE VOTE ÉPURÉE ET ÉTIRÉE POUR UN POSTE SPÉCIFIQUE */}
      {posteVoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-xl rounded-2xl shadow-[0_0_25px_rgba(34,211,238,0.4)] border border-cyan-400 p-5 space-y-4 ${isDarkMode ? 'bg-[#0b1329] text-white' : 'bg-white text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-2 border-cyan-400/40">
              <h4 className="font-black text-cyan-400 uppercase text-xs">🗳️ VOTE POUR : {posteVoteModal.libelle_poste}</h4>
              <button type="button" onClick={() => setPosteVoteModal(null)} className="text-cyan-300 hover:text-white font-bold text-sm cursor-pointer">✖</button>
            </div>

            <div className="space-y-2 py-1">
              <p className={`text-[10px] font-bold uppercase ${textMuted}`}>Sélectionnez votre candidat ou optez pour l'abstention :</p>
              
              <div className="grid grid-cols-1 gap-2">
                {/* Option Abstention */}
                <div
                  onClick={() => {
                    setBulletinVote(prev => ({ ...prev, [posteVoteModal.id]: '' }));
                    setPosteVoteModal(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                    !bulletinVote[posteVoteModal.id] 
                      ? 'bg-amber-600/30 text-amber-200 border-amber-400 font-bold shadow-md' 
                      : isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold text-xs uppercase">-- Abstention / Ne pas voter pour ce poste --</span>
                  {!bulletinVote[posteVoteModal.id] && <span className="text-amber-400 font-bold">✓ Choisi</span>}
                </div>

                {/* Liste des candidats */}
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
                            ? 'bg-orange-600 text-white border-orange-400 font-bold shadow-md' 
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

            <div className="flex justify-end pt-2 border-t border-cyan-400/40">
              <button type="button" onClick={() => setPosteVoteModal(null)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-xl text-[10px] cursor-pointer">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION DE SOUMISSION DU BULLETIN */}
      {modalConfirmationSoumissionOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl shadow-[0_0_25px_rgba(34,211,238,0.4)] border border-cyan-400 p-5 space-y-4 ${isDarkMode ? 'bg-[#0b1329] text-white' : 'bg-white text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-2 border-cyan-400/40">
              <h4 className="font-black text-cyan-400 uppercase text-xs">⚠️ Confirmation de soumission</h4>
              <button type="button" onClick={() => setModalConfirmationSoumissionOuverte(false)} className="text-cyan-300 hover:text-white font-bold text-sm cursor-pointer">✖</button>
            </div>

            <div className="space-y-3 py-2 text-center">
              <p className="font-bold text-xs uppercase">Êtes-vous sûr de vouloir soumettre votre vote ?</p>
              <p className={`text-[10px] text-amber-400 font-bold`}>
                Cette action est définitive. Une fois soumis, il ne sera plus possible de modifier vos choix.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-cyan-400/40">
              <button 
                type="button" 
                onClick={() => setModalConfirmationSoumissionOuverte(false)} 
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-xl text-[10px] cursor-pointer"
              >
                Annuler / Modifier encore
              </button>
              <button 
                type="button" 
                disabled={actionEnCours} 
                onClick={async (e) => {
                  setModalConfirmationSoumissionOuverte(false);
                  await soumettreBulletinGlobal(e);
                }} 
                className="bg-orange-600 hover:bg-orange-500 text-white font-black px-5 py-2 rounded-xl text-[10px] uppercase shadow flex items-center gap-2 cursor-pointer"
              >
                {actionEnCours && <span className="animate-spin">⏳</span>}
                Oui, soumettre définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VUE 5 : RÉSULTATS & PROCÈS-VERBAL (PV) GLOBAL */}
      {vue === 'resultats' && electionActive && (
        <div className="space-y-4 w-full">
          <div className={`${cardBg} p-4 rounded-2xl shadow-xl space-y-4 w-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]`}>
            
            {/* EN-TÊTE DU PV OFFICIEL AVEC BOUTON IMPRIMER */}
            <div className={`text-center border-b ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'} pb-3 space-y-2`}>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${estValide ? 'bg-emerald-500/20 text-emerald-300' : estOuvert ? 'bg-orange-500/20 text-orange-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {estValide ? '✅ Procès-Verbal Officiel Clôturé et Validé' : estOuvert ? '📊 Scrutin Ouvert (Votes en cours)' : '📊 Rapport Provisoire (Scrutin fermé)'}
                </span>
                
                <button
                  type="button"
                  onClick={imprimerPV}
                  className="bg-slate-300 hover:bg-slate-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-[10px] uppercase transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  🖨️ Imprimer le PV
                </button>
              </div>

              <h4 className="font-black text-sm uppercase pt-1">{electionActive.titre_election}</h4>
              <p className={`text-[10px] ${textMuted}`}>Scrutin du : {electionActive.date_scrutin}</p>
            </div>

            {/* TABLEAUX DES SCORES PAR POSTE (PLEINE LARGEUR) */}
            <div className="space-y-4 w-full">
              {postes.map((poste) => {
                const scores = calculerScoresPourPoste(poste.id);
                const gagnant = scores[0];

                return (
                  <div key={poste.id} className={`${innerCardBg} p-3.5 rounded-xl space-y-2 w-full`}>
                    <div className={`flex justify-between items-center border-b ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'} pb-1.5 flex-wrap gap-1`}>
                      <span className={`font-black text-xs uppercase ${titleColor}`}>👑 {poste.libelle_poste}</span>
                      {gagnant && gagnant.voix > 0 && (
                        <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded text-[9px] font-black uppercase">
                          🏆 Élu(e) : {gagnant.tontine_participants?.nom_participant} ({gagnant.voix} voix)
                        </span>
                      )}
                    </div>

                    <div className="overflow-x-auto rounded-lg w-full">
                      <table className="w-full text-left text-xs">
                        <thead className={`${isDarkMode ? 'bg-slate-900/80 text-slate-300' : 'bg-slate-100 text-slate-700'} uppercase text-[9px] font-black`}>
                          <tr>
                            <th className="p-2">Candidat</th>
                            <th className="p-2 text-center">Voix Obtenues</th>
                            <th className="p-2 text-right">Pourcentage</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y text-[10px] ${isDarkMode ? 'divide-slate-900/60' : 'divide-slate-100'}`}>
                          {scores.length === 0 ? (
                            <tr><td colSpan="3" className={`p-3 text-center ${textMuted}`}>Aucun candidat pour ce poste.</td></tr>
                          ) : (
                            scores.map((s, idx) => (
                              <tr key={s.id} className={idx === 0 && s.voix > 0 ? (isDarkMode ? 'bg-orange-500/10 font-bold' : 'bg-orange-50 font-bold') : ''}>
                                <td className="p-2 uppercase font-extrabold">
                                  {idx === 0 && s.voix > 0 ? '🥇 ' : ''}
                                  {s.tontine_participants?.nom_participant} {s.tontine_participants?.prenom || ''}
                                </td>
                                <td className={`p-2 text-center font-mono font-black ${titleColor}`}>{s.voix} voix</td>
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

            {/* BOUTON VALIDATION FINALE & CLÔTURE (RÉSERVÉ AUX ADMINS) */}
            <div className={`pt-3 border-t ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
              {estValide ? (
                <div className={`w-full font-black py-3 rounded-xl text-xs uppercase text-center flex items-center justify-center gap-2 ${isDarkMode ? 'bg-slate-800/80 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                  <span>🔒</span> Élection officiellement clôturée et validée (Mode Consultation)
                </div>
              ) : estAdmin ? (
                <button
                  type="button"
                  disabled={actionEnCours}
                  onClick={() => changerStatutElection('VALIDE')}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs uppercase shadow transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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