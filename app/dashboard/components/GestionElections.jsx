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
  const [candidatSelectionne, setCandidatSelectionne] = useState({ id_poste: '', id_participant: '' });

  // Urne / Vote Global
  const [electeurId, setElecteurId] = useState('');
  const [nomElecteurConnecte, setNomElecteurConnecte] = useState('');
  const [bulletinVote, setBulletinVote] = useState({});
  const [resultatsDetails, setResultatsDetails] = useState([]);

  const [chargement, setChargement] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [estAdmin, setEstAdmin] = useState(false);

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
      const emailLocal = typeof window !== 'undefined' ? localStorage.getItem('emailConnecte') || '' : '';
      const userLocal = typeof window !== 'undefined' ? localStorage.getItem('utilisateurConnecte') || '' : '';
      const isSuper = emailLocal.toLowerCase().trim() === 'stephs7352@gmail.com';

      // 1. Charger les participants
      const { data: dataPart } = await supabase
        .from('tontine_participants')
        .select('*')
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
    if (!estAdmin) return;
    const confirmation = window.confirm(`⚠️ Voulez-vous vraiment supprimer l'élection "${el.titre_election}" ? Cette action est irréversible.`);
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
      await chargerDetailsElection(electionActive);
    } catch (err) {
      alert('❌ Erreur : ' + err.message);
    } finally {
      setActionEnCours(false);
    }
  };

  const ajouterCandidat = async (e) => {
    e.preventDefault();
    if (!estAdmin) {
      alert('⛔ Action réservée aux administrateurs.');
      return;
    }
    if (!candidatSelectionne.id_poste || !candidatSelectionne.id_participant || actionEnCours || electionActive.statut === 'VALIDE') {
      alert('⚠️ Veuillez sélectionner un poste et un membre.');
      return;
    }

    const idPartNum = Number(candidatSelectionne.id_participant);
    const dejaCandidat = candidats.find(c => c.id_participant === idPartNum);
    if (dejaCandidat) {
      const posteConcerne = postes.find(p => p.id === dejaCandidat.id_poste)?.libelle_poste || 'un autre poste';
      alert(`❌ Ce membre est déjà enregistré comme candidat pour le poste "${posteConcerne}". Un membre ne peut pas se présenter à deux postes distincts.`);
      return;
    }

    setActionEnCours(true);
    try {
      const { error } = await supabase
        .from('tontine_candidatures')
        .insert([{
          id_election: electionActive.id,
          id_poste: candidatSelectionne.id_poste,
          id_participant: idPartNum,
          statut_candidat: 'VALIDE'
        }]);

      if (error) throw error;
      alert('✅ Candidature enregistrée !');
      setCandidatSelectionne({ id_poste: '', id_participant: '' });
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

      alert('🗳️ Votre bulletin global a été enregistré avec succès dans l’urne !');
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
                  <div key={el.id} className={`${cardBg} p-4 rounded-xl shadow-md border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] space-y-3 w-full`}>
                    
                    {/* LIGNE 1 : Titre, Statut et Date sur une seule ligne */}
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className={`font-black text-sm uppercase ${titleColor}`}>📌 {el.titre_election}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          estElectionValidee ? 'bg-emerald-500/20 text-emerald-300' :
                          el.statut === 'EN_COURS' ? 'bg-orange-500/20 text-orange-300' :
                          isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {el.statut === 'EN_COURS' ? 'OUVERT AUX VOTES' : el.statut}
                        </span>
                        <span className={`text-[10px] ${textMuted}`}>📅 {el.date_scrutin}</span>
                      </div>
                    </div>

                    {/* LIGNE 2 : Boutons d'action principaux (Candidature, Ouvrir l'Urne, Résultats & PV) */}
                    <div className="flex items-center gap-2 justify-center flex-wrap pt-1 border-t border-slate-800/40">
                      {estAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            chargerDetailsElection(el);
                            setVue('gestion');
                          }}
                          className="bg-slate-300 hover:bg-slate-400 text-slate-950 font-black px-3 py-2 rounded-lg text-[10px] uppercase transition shadow-xs cursor-pointer"
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
                        className={`font-black px-3 py-2 rounded-lg text-[10px] uppercase transition shadow-xs cursor-pointer ${
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
                        className="bg-slate-300 hover:bg-slate-400 text-slate-950 font-black px-3 py-2 rounded-lg text-[10px] uppercase transition shadow-xs cursor-pointer"
                      >
                        📊 Résultats & PV
                      </button>
                    </div>

                    {/* LIGNE 3 : Supprimer à l'extrême gauche, Modifier à l'extrême droite (Si admin et non validé) */}
                    {estAdmin && !estElectionValidee && (
                      <div className="flex justify-between items-center pt-2 border-t border-slate-800/40">
                        <button
                          type="button"
                          onClick={() => supprimerElection(el)}
                          className="bg-rose-600 hover:bg-rose-500 text-white font-black px-3 py-1.5 rounded-lg text-[10px] uppercase transition shadow-xs cursor-pointer"
                        >
                          🗑️ Supprimer
                        </button>
                        <button
                          type="button"
                          onClick={() => modifierElection(el)}
                          className="bg-amber-600 hover:bg-amber-500 text-white font-black px-3 py-1.5 rounded-lg text-[10px] uppercase transition shadow-xs cursor-pointer"
                        >
                          ✏️ Modifier
                        </button>
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
                <button
                  type="button"
                  disabled={actionEnCours}
                  onClick={gererOuvertureScrutin}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase disabled:opacity-50 cursor-pointer transition shadow-xs ${
                    estOuvert ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {estOuvert ? '🔒 Scrutin Ouvert (Cliquer pour bloquer)' : '🚀 Ouvrir le Scrutin & Valider les Candidatures'}
                </button>
              )}

              {estValide && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                  🔒 Scrutin Clôturé et Validé
                </span>
              )}
            </div>

            {estValide && (
              <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-300 font-bold text-center">
                ✅ Cette élection a été officiellement validée et clôturée. Mode consultation uniquement.
              </div>
            )}

            {!estValide && estAdmin && (
              <form onSubmit={ajouterPoste} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className={`block text-[10px] font-bold uppercase mb-1 ${textMuted}`}>Ajouter un poste à pourvoir :</label>
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
                <button type="submit" disabled={actionEnCours} className="bg-orange-600 hover:bg-orange-500 text-white font-black px-4 py-2.5 rounded-lg text-[10px] uppercase shadow disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                  {actionEnCours && <span className="animate-spin">⏳</span>}
                  ➕ Ajouter Poste
                </button>
              </form>
            )}
          </div>

          {!estValide && estAdmin && (
            <div className={`${cardBg} p-4 rounded-2xl space-y-3 shadow-lg w-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]`}>
              <h5 className={`font-black text-xs uppercase ${subTitleColor} border-b ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'} pb-2`}>👥 Enregistrement des Candidatures</h5>
              
              {postes.length === 0 ? (
                <p className={`text-xs py-2 ${textMuted}`}>Veuillez d'abord créer au moins un poste ci-dessus.</p>
              ) : (
                <form onSubmit={ajouterCandidat} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-1 ${textMuted}`}>Poste :</label>
                    <select
                      value={candidatSelectionne.id_poste}
                      disabled={actionEnCours}
                      onChange={(e) => setCandidatSelectionne({ ...candidatSelectionne, id_poste: e.target.value })}
                      className={`w-full p-2.5 rounded-lg border font-bold text-xs disabled:opacity-50 ${inputBg}`}
                    >
                      <option value="">-- Choisir un poste --</option>
                      {postes.map(p => <option key={p.id} value={p.id}>{p.libelle_poste}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-1 ${textMuted}`}>Membre candidat :</label>
                    <select
                      value={candidatSelectionne.id_participant}
                      disabled={actionEnCours}
                      onChange={(e) => setCandidatSelectionne({ ...candidatSelectionne, id_participant: e.target.value })}
                      className={`w-full p-2.5 rounded-lg border font-bold text-xs disabled:opacity-50 ${inputBg}`}
                    >
                      <option value="">-- Choisir un membre --</option>
                      {participants.map(part => (
                        <option key={part.id} value={part.id}>
                          {part.nom_participant} {part.prenom || ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" disabled={actionEnCours} className="bg-orange-600 hover:bg-orange-500 text-white font-black px-4 py-2.5 rounded-lg text-[10px] uppercase shadow disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer">
                    {actionEnCours && <span className="animate-spin">⏳</span>}
                    ✅ Valider Candidature
                  </button>
                </form>
              )}
            </div>
          )}

          <div className={`${cardBg} p-4 rounded-2xl space-y-3 shadow-lg w-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]`}>
            <h6 className={`font-bold text-[10px] uppercase ${textMuted}`}>Candidats validés :</h6>
            <div className="space-y-2">
              {postes.map(poste => {
                const candsDuPoste = candidats.filter(c => c.id_poste === poste.id);
                return (
                  <div key={poste.id} className={`${innerCardBg} p-3 rounded-xl space-y-1.5 w-full`}>
                    <span className={`font-black uppercase text-[11px] ${titleColor}`}>👑 {poste.libelle_poste}</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {candsDuPoste.length === 0 ? (
                        <span className={`text-[10px] italic ${textMuted}`}>Aucun candidat enregistré pour ce poste.</span>
                      ) : (
                        candsDuPoste.map(c => (
                          <span key={c.id} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 shadow-xs'}`}>
                            {c.tontine_participants?.nom_participant} {c.tontine_participants?.prenom || ''}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
            <form onSubmit={soumettreBulletinGlobal} className="space-y-4">
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
                  📋 Bulletin de Vote (Faites vos choix pour chaque poste) :
                </h5>

                {postes.length === 0 ? (
                  <p className={`text-xs italic ${textMuted}`}>Aucun poste à pourvoir dans cette élection.</p>
                ) : (
                  postes.map(poste => {
                    const candsDuPoste = candidats.filter(c => c.id_poste === poste.id);
                    return (
                      <div key={poste.id} className={`${innerCardBg} p-3 rounded-xl space-y-1.5 w-full`}>
                        <span className={`font-black uppercase text-xs ${titleColor}`}>👑 {poste.libelle_poste}</span>
                        <select
                          value={bulletinVote[poste.id] || ''}
                          disabled={actionEnCours}
                          onChange={(e) => setBulletinVote({ ...bulletinVote, [poste.id]: e.target.value })}
                          className={`w-full p-2.5 rounded-lg border font-bold text-xs disabled:opacity-50 ${inputBg}`}
                        >
                          <option value="">-- Abstention / Ne pas voter pour ce poste --</option>
                          {candsDuPoste.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.tontine_participants?.nom_participant} {c.tontine_participants?.prenom || ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })
                )}
              </div>

              <button type="submit" disabled={actionEnCours} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-xl text-xs uppercase shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                {actionEnCours && <span className="animate-spin">⏳</span>}
                📥 Soumettre mon bulletin global dans l'urne
              </button>
            </form>
          )}
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