'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const LISTE_PAYS = [
  { code: 'cmr', indicatif: '+237', longueur: 9 },
  { code: 'fra', indicatif: '+33', longueur: 9 },
  { code: 'civ', indicatif: '+225', longueur: 10 },
  { code: 'sen', indicatif: '+221', longueur: 9 },
  { code: 'gab', indicatif: '+241', longueur: 7 },
  { code: 'cog', indicatif: '+242', longueur: 9 },
  { code: 'rdc', indicatif: '+243', longueur: 9 },
  { code: 'mli', indicatif: '+223', longueur: 8 },
  { code: 'bfa', indicatif: '+226', longueur: 8 },
  { code: 'tgo', indicatif: '+228', longueur: 8 },
  { code: 'ben', indicatif: '+229', longueur: 8 },
  { code: 'nga', indicatif: '+234', longueur: 10 },
];

export default function GestionTontineParticipants({ entrepriseId = '4TS-290136', isDarkMode = false }) {
  const [participants, setParticipants] = useState([]);
  const [rolesDisponibles, setRolesDisponibles] = useState([]);
  const [listeRolesComplet, setListeRolesComplet] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [vueActuelle, setVueActuelle] = useState('liste'); // 'liste' | 'roue'
  const [sousVueRoue, setSousVueRoue] = useState('nouveau'); // 'nouveau' | 'historique' | 'detail_historique'
  const [tirageSelectionneDetail, setTirageSelectionneDetail] = useState(null);
  
  const [afficherModal, setAfficherModal] = useState(false);
  const [afficherModalRoles, setAfficherModalRoles] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [participantEnEdition, setParticipantEnEdition] = useState(null);

  // États pour la roue et le tirage
  const [titreTirage, setTitreTirage] = useState(`TIRAGE DU ${new Date().toLocaleDateString()}`);
  const [classementProvisoire, setClassementProvisoire] = useState([]);
  const [tirageEstValide, setTirageEstValide] = useState(false);
  const [rotationRoue, setRotationRoue] = useState(0);
  const [enTrainDeTourner, setEnTrainDeTourner] = useState(false);
  const [historiqueTirages, setHistoriqueTirages] = useState([]);

  const fileInputRef = useRef(null);

  const [nouveauParticipant, setNouveauParticipant] = useState({
    nom_participant: '',
    prenom: '',
    pays: 'cmr',
    telephone: '',
    lieu_residence: '',
    numero_cni: '',
    libelle_role: '',
    date_adhesion: new Date().toISOString().split('T')[0],
    photo: '',
  });

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      const { data: dataPart, error: errPart } = await supabase
        .from('tontine_participants')
        .select('*')
        .order('created_at', { ascending: false });

      if (errPart) throw errPart;
      setParticipants(dataPart || []);

      // Chargement de l'historique des tirages depuis le localStorage
      const historiqueLocal = localStorage.getItem(`historique_tirages_${entrepriseId}`);
      if (historiqueLocal) {
        setHistoriqueTirages(JSON.parse(historiqueLocal));
      }

      // Récupération des rôles tontine (hors rôles logistiques)
      const { data: dataRoles, error: errRoles } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', 'TONTINE');

      if (!errRoles && dataRoles && dataRoles.length > 0) {
        const rolesFiltres = dataRoles.filter(r => !['LIVREUR', 'SUPERVISEUR'].includes((r.nom_role || '').trim().toUpperCase()));
        setListeRolesComplet(rolesFiltres);
        const nomsRoles = rolesFiltres.map(r => r.nom_role);
        setRolesDisponibles(nomsRoles);
        if (nomsRoles.length > 0 && (!nouveauParticipant.libelle_role || !nomsRoles.includes(nouveauParticipant.libelle_role))) {
          setNouveauParticipant(prev => ({ ...prev, libelle_role: nomsRoles[0] }));
        }
      } else {
        const { data: dataTRoles } = await supabase
          .from('tontine_roles')
          .select('*')
          .eq('id_entreprise', entrepriseId);
        
        if (dataTRoles && dataTRoles.length > 0) {
          setListeRolesComplet(dataTRoles);
          const nomsT = dataTRoles.map(r => r.nom_role);
          setRolesDisponibles(nomsT);
          if (nomsT.length > 0 && (!nouveauParticipant.libelle_role || !nomsT.includes(nouveauParticipant.libelle_role))) {
            setNouveauParticipant(prev => ({ ...prev, libelle_role: nomsT[0] }));
          }
        } else {
          setListeRolesComplet([
            { nom_role: 'ADHERANT', description: 'Membre standard de l’association.' },
            { nom_role: 'MEMBRE DU BUREAU', description: 'Membre actif du bureau exécutif.' },
            { nom_role: 'PRESIDENT', description: 'Dirigeant principal de la tontine.' }
          ]);
          setRolesDisponibles(['ADHERANT', 'MEMBRE DU BUREAU', 'PRESIDENT']);
        }
      }
    } catch (err) {
      console.error('Erreur chargement :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId]);

  const gererSelectionImage = (e) => {
    const fichier = e.target.files[0];
    if (fichier) {
      const lecteur = new FileReader();
      lecteur.onloadend = () => {
        setNouveauParticipant(prev => ({ ...prev, photo: lecteur.result }));
      };
      lecteur.readAsDataURL(fichier);
    }
  };

  const gererSaisieTelephone = (e) => {
    const chiffres = e.target.value.replace(/[^0-9]/g, '');
    setNouveauParticipant(prev => ({ ...prev, telephone: chiffres }));
  };

  const enregistrerParticipant = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (!nouveauParticipant.nom_participant.trim()) {
      alert('⚠️ Veuillez renseigner le nom du participant.');
      return;
    }

    const paysObj = LISTE_PAYS.find(p => p.code === nouveauParticipant.pays) || LISTE_PAYS[0];
    const chiffresPur = (nouveauParticipant.telephone || '').replace(/[^0-9]/g, '');

    if (chiffresPur.length > 0 && chiffresPur.length !== paysObj.longueur) {
      alert(`⚠️ Numéro invalide pour ${paysObj.code}. Le numéro doit comporter exactement ${paysObj.longueur} chiffres.`);
      return;
    }

    const telephoneComplet = chiffresPur ? `${paysObj.indicatif}${chiffresPur}` : null;

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        id_entreprise: entrepriseId || '4TS-290136',
        nom_participant: nouveauParticipant.nom_participant.trim().toUpperCase(),
        nom_complet: nouveauParticipant.nom_participant.trim().toUpperCase(),
        prenom: (nouveauParticipant.prenom || '').trim().toUpperCase(),
        telephone: telephoneComplet,
        lieu_residence: (nouveauParticipant.lieu_residence || '').trim().toUpperCase(),
        numero_cni: (nouveauParticipant.numero_cni || '').trim().toUpperCase(),
        libelle_role: nouveauParticipant.libelle_role || (rolesDisponibles[0] || 'ADHERANT'),
        date_adhesion: nouveauParticipant.date_adhesion || new Date().toISOString().split('T')[0],
        photo: nouveauParticipant.photo || null,
      };

      if (participantEnEdition) {
        const { error } = await supabase
          .from('tontine_participants')
          .update(payload)
          .eq('id', participantEnEdition.id);
        if (error) throw error;
        alert('✅ Participant mis à jour avec succès !');
      } else {
        const { error } = await supabase
          .from('tontine_participants')
          .insert([payload]);
        if (error) throw error;
        alert('✅ Participant enregistré avec succès !');
      }

      fermerModal();
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur lors de l\'enregistrement : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const supprimerParticipant = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) return;
    try {
      const { error } = await supabase
        .from('tontine_participants')
        .delete()
        .eq('id', id);
      if (error) throw error;
      alert('🗑️ Membre supprimé avec succès !');
      fermerModal();
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur lors de la suppression : ' + err.message);
    }
  };

  const ouvrirEdition = (p) => {
    setParticipantEnEdition(p);
    const paysTrouve = LISTE_PAYS.find(item => p.telephone && p.telephone.startsWith(item.indicatif)) || LISTE_PAYS[0];
    let telLocal = p.telephone || '';
    if (p.telephone && p.telephone.startsWith(paysTrouve.indicatif)) {
      telLocal = p.telephone.replace(paysTrouve.indicatif, '');
    }

    setNouveauParticipant({
      nom_participant: p.nom_participant || p.nom_complet || '',
      prenom: p.prenom || '',
      pays: p.pays || paysTrouve.code,
      telephone: telLocal.replace(/[^0-9]/g, ''),
      lieu_residence: p.lieu_residence || '',
      numero_cni: p.numero_cni || '',
      libelle_role: p.libelle_role || rolesDisponibles[0] || 'ADHERANT',
      date_adhesion: p.date_adhesion ? p.date_adhesion.split('T')[0] : new Date().toISOString().split('T')[0],
      photo: p.photo || '',
    });
    setAfficherModal(true);
  };

  const fermerModal = () => {
    setAfficherModal(false);
    setParticipantEnEdition(null);
    setNouveauParticipant({
      nom_participant: '', prenom: '', pays: 'cmr', telephone: '', lieu_residence: '', numero_cni: '',
      libelle_role: rolesDisponibles[0] || 'ADHERANT', date_adhesion: new Date().toISOString().split('T')[0], photo: ''
    });
  };

  // 🌟 LOGIQUE DE TIRAGE COLLECTIF SYNCHRONISÉ
  const lancerRoueCollectif = () => {
    if (participants.length === 0) {
      alert('⚠️ Aucun participant enregistré pour effectuer le tirage.');
      return;
    }
    if (enTrainDeTourner) return;

    setEnTrainDeTourner(true);
    setTirageEstValide(false);
    setClassementProvisoire([]);

    const nbMembres = participants.length;
    const angleParSecteur = 360 / nbMembres;

    const indexGagnant = Math.floor(Math.random() * nbMembres);

    const toursSupplementaires = 6 * 360;
    const angleCible = (360 - (indexGagnant * angleParSecteur)) % 360;
    const rotationActuelleMod = rotationRoue % 360;
    const deltaRotation = (angleCible - rotationActuelleMod + 360) % 360;
    const nouvelleRotation = rotationRoue + toursSupplementaires + deltaRotation;

    setRotationRoue(nouvelleRotation);

    setTimeout(() => {
      const gagnant = participants[indexGagnant];
      const autres = participants.filter((_, idx) => idx !== indexGagnant);
      for (let i = autres.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [autres[i], autres[j]] = [autres[j], autres[i]];
      }

      setClassementProvisoire([gagnant, ...autres]);
      setEnTrainDeTourner(false);
    }, 4000);
  };

  const validerEtVerrouillerTirage = () => {
    if (classementProvisoire.length === 0) return;

    const nouveauTirageValide = {
      id: Date.now(),
      titre: titreTirage || `TIRAGE DU ${new Date().toLocaleDateString()}`,
      date: new Date().toLocaleString(),
      resultats: classementProvisoire
    };

    const misAJourHistorique = [nouveauTirageValide, ...historiqueTirages];
    setHistoriqueTirages(misAJourHistorique);
    localStorage.setItem(`historique_tirages_${entrepriseId}`, JSON.stringify(misAJourHistorique));

    setTirageEstValide(true);
    alert('✅ Tirage validé et verrouillé avec succès dans l’historique !');
  };

  const lancerNouveauTirage = () => {
    setClassementProvisoire([]);
    setTirageEstValide(false);
    setTitreTirage(`TIRAGE DU ${new Date().toLocaleDateString()}`);
    setSousVueRoue('nouveau');
  };

  const participantsFiltres = participants.filter(p => {
    const nomP = p.nom_participant || p.nom_complet || '';
    const texte = `${nomP} ${p.prenom || ''} ${p.telephone || ''} ${p.libelle_role || ''}`.toLowerCase();
    return texte.includes(recherche.toLowerCase());
  });

  const paysActuelObj = LISTE_PAYS.find(p => p.code === nouveauParticipant.pays) || LISTE_PAYS[0];
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-white text-slate-900 border-slate-300';
  const labelColor = isDarkMode ? 'text-slate-200' : 'text-slate-800';

  return (
    <div className="w-full h-full space-y-3 font-sans text-xs relative">
      
      {/* VUE PRINCIPALE : LISTE DES MEMBRES */}
      {vueActuelle === 'liste' && (
        <div className="space-y-3 w-full">
          
          {/* BARRE D'EN-TÊTE : Bouton AJOUTER NOUVEAU MEMBRE à gauche, ROUE DE TIRAGE à droite */}
          <div className="flex justify-between items-center bg-white/5 px-2.5 py-2 rounded-xl border border-slate-700/30 gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setParticipantEnEdition(null);
                setNouveauParticipant({
                  nom_participant: '', prenom: '', pays: 'cmr', telephone: '', lieu_residence: '', numero_cni: '',
                  libelle_role: rolesDisponibles[0] || 'ADHERANT', date_adhesion: new Date().toISOString().split('T')[0], photo: ''
                });
                setAfficherModal(true);
              }}
              className="bg-orange-600 hover:bg-orange-500 text-white font-black px-3 py-2 rounded-lg transition shadow text-[10px] uppercase flex items-center gap-1 shrink-0"
            >
              ➕ Ajouter nouveau membre
            </button>

            <button
              type="button"
              onClick={() => {
                setVueActuelle('roue');
                setSousVueRoue('nouveau');
              }}
              className="bg-purple-700 hover:bg-purple-600 text-white font-black px-3 py-2 rounded-lg transition shadow text-[10px] uppercase flex items-center gap-1 shrink-0"
            >
              🎡 Roue de Tirage
            </button>
          </div>

          <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="🔍 Rechercher un participant par nom, rôle ou téléphone..."
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 text-xs focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto border border-slate-700/40 rounded-xl bg-white shadow-2xs w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-800 border-b uppercase text-[9px] font-black select-none">
                <tr>
                  <th className="p-2 w-10 text-center">Avatar</th>
                  <th className="p-2">Nom & Prénom</th>
                  <th className="p-2">Rôle / Poste</th>
                  <th className="p-2">Téléphone</th>
                  <th className="p-2">Résidence</th>
                  <th className="p-2">CNI</th>
                  <th className="p-2">Adhésion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10px]">
                {chargement ? (
                  <tr><td colSpan="7" className="p-4 text-center animate-pulse text-slate-500">Chargement...</td></tr>
                ) : participantsFiltres.length === 0 ? (
                  <tr><td colSpan="7" className="p-4 text-center text-slate-500 font-bold">Aucun participant trouvé.</td></tr>
                ) : (
                  participantsFiltres.map((p) => {
                    const nomAffiche = p.nom_participant || p.nom_complet || 'Membre';
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => ouvrirEdition(p)} 
                        className="hover:bg-orange-50/70 cursor-pointer transition select-none text-slate-900"
                        title="Cliquez pour modifier"
                      >
                        <td className="p-2 text-center">
                          <div className="w-6 h-6 rounded-full bg-slate-200 border mx-auto overflow-hidden flex items-center justify-center">
                            {p.photo ? (
                              <img src={p.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[8px] font-bold text-slate-500">👤</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 font-black uppercase">{nomAffiche} {p.prenom || ''}</td>
                        <td className="p-2">
                          <span className="bg-orange-100 text-orange-800 font-black px-1.5 py-0.5 rounded text-[8px] uppercase border border-orange-200">
                            {p.libelle_role || 'ADHERANT'}
                          </span>
                        </td>
                        <td className="p-2 font-mono text-orange-600 font-bold">{p.telephone || 'N/A'}</td>
                        <td className="p-2 uppercase font-semibold text-slate-700">{p.lieu_residence || 'N/A'}</td>
                        <td className="p-2 font-mono text-slate-600">{p.numero_cni || 'N/A'}</td>
                        <td className="p-2 text-slate-500">{p.date_adhesion ? new Date(p.date_adhesion).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VUE INDÉPENDANTE : ROUE DE TIRAGE ET HISTORIQUE */}
      {vueActuelle === 'roue' && (
        <div className="bg-black/40 p-4 rounded-xl border border-purple-500/40 space-y-4 text-center">
          
          {/* BARRE DE NAVIGATION DE LA PAGE ROUE (BOUTON RETOUR & ONGLETS) */}
          <div className="flex justify-between items-center border-b pb-2.5 border-slate-700">
            <button
              type="button"
              onClick={() => {
                setVueActuelle('liste');
                setTirageSelectionneDetail(null);
              }}
              className="bg-slate-700 hover:bg-slate-600 text-white font-black px-3 py-1.5 rounded-lg text-[10px] uppercase transition flex items-center gap-1 shadow"
            >
              ⬅️ Retour
            </button>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSousVueRoue('nouveau');
                  setTirageSelectionneDetail(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition ${sousVueRoue === 'nouveau' && !tirageSelectionneDetail ? 'bg-orange-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
              >
                🎰 Lancer un nouveau tirage
              </button>
              <button
                type="button"
                onClick={() => setSousVueRoue('historique')}
                className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition ${sousVueRoue === 'historique' || tirageSelectionneDetail ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
              >
                📚 Liste des tirages validés ({historiqueTirages.length})
              </button>
            </div>
          </div>

          {/* SOUS-VUE 1 : LANCER UN NOUVEAU TIRAGE */}
          {sousVueRoue === 'nouveau' && !tirageSelectionneDetail && (
            <div className="space-y-4 animate-fadeIn">
              
              {participants.length === 0 ? (
                <p className="text-slate-400 py-6">Aucun membre disponible pour le tirage.</p>
              ) : (
                <div className="space-y-4">
                  <div className="max-w-md mx-auto space-y-1 text-left bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                    <label className="block text-[10px] font-black text-orange-400 uppercase">📌 Titre / Nom du Tirage :</label>
                    <input
                      type="text"
                      value={titreTirage}
                      disabled={tirageEstValide || enTrainDeTourner}
                      onChange={(e) => setTitreTirage(e.target.value.toUpperCase())}
                      placeholder="EX: TIRAGE SESSION JANVIER..."
                      className="w-full p-2 rounded-lg border border-slate-600 bg-slate-950 text-white font-bold text-xs uppercase disabled:opacity-60"
                    />
                  </div>

                  <div className="relative w-52 h-52 mx-auto flex items-center justify-center">
                    <div 
                      className="w-full h-full rounded-full border-4 border-orange-500 shadow-2xl relative overflow-hidden transition-transform ease-out duration-4000 flex items-center justify-center bg-slate-900"
                      style={{ transform: `rotate(${rotationRoue}deg)` }}
                    >
                      {participants.map((p, index) => {
                        const angle = (index / participants.length) * 360;
                        return (
                          <div
                            key={p.id}
                            className="absolute w-full h-full text-center font-black text-[9px] text-white pt-2"
                            style={{ transform: `rotate(${angle}deg)`, transformOrigin: 'center' }}
                          >
                            <span className="bg-black/60 px-1.5 py-0.5 rounded">{index + 1}. {p.nom_participant || p.nom_complet}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="absolute -top-3 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-[18px] border-t-orange-500 z-10 drop-shadow-lg"></div>
                    <div className="absolute w-6 h-6 rounded-full bg-white border-2 border-orange-600 shadow-md z-20"></div>
                  </div>

                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={lancerRoueCollectif}
                      disabled={enTrainDeTourner || tirageEstValide}
                      className="bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-500 hover:to-purple-500 disabled:opacity-50 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-lg uppercase transition transform active:scale-95"
                    >
                      {enTrainDeTourner ? '🌀 La roue tourne...' : (classementProvisoire.length > 0 ? '🔄 Relancer la Roue' : '🎰 Lancer le Tirage')}
                    </button>
                  </div>

                  {classementProvisoire.length > 0 && !enTrainDeTourner && (
                    <div className="space-y-3 pt-2 text-left max-w-md mx-auto bg-slate-900/90 p-3.5 rounded-xl border border-orange-500/50 shadow-xl animate-fadeIn">
                      <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                        <div>
                          <h5 className="font-black text-xs uppercase text-orange-400">{titreTirage}</h5>
                          <p className="text-[9px] text-slate-400">
                            {tirageEstValide ? '🔒 Tirage verrouillé et enregistré' : '⚠️ Liste Provisoire (Non validée)'}
                          </p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${tirageEstValide ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                          {tirageEstValide ? 'Validé' : 'En attente'}
                        </span>
                      </div>
                      
                      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900 text-slate-300 uppercase text-[9px] font-black border-b border-slate-700">
                            <tr>
                              <th className="p-2 text-center w-16">Ordre</th>
                              <th className="p-2">Nom des Membres</th>
                              <th className="p-2 text-right">Rôle / Poste</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-[10px]">
                            {classementProvisoire.map((membre, idx) => (
                              <tr key={membre.id} className={idx === 0 ? 'bg-orange-500/15 font-bold' : 'hover:bg-slate-900'}>
                                <td className="p-2 text-center font-mono font-black text-orange-400">
                                  {idx === 0 ? '🥇 1er' : `${idx + 1}`}
                                </td>
                                <td className="p-2 uppercase text-white font-extrabold">
                                  {membre.nom_participant || membre.nom_complet} {membre.prenom || ''}
                                </td>
                                <td className="p-2 text-right">
                                  <span className="bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded text-[8px] uppercase">
                                    {membre.libelle_role || 'ADHERANT'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        {!tirageEstValide ? (
                          <button
                            type="button"
                            onClick={validerEtVerrouillerTirage}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 rounded-xl text-xs uppercase shadow transition flex items-center justify-center gap-1"
                          >
                            ✅ Valider et Verrouiller le Tirage
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={lancerNouveauTirage}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2 rounded-xl text-xs uppercase shadow transition flex items-center justify-center gap-1"
                          >
                            ➕ Lancer un Nouveau Tirage
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SOUS-VUE 2 : LISTE DES TIRAGES VALIDÉS (HISTORIQUE) OU DÉTAIL D'UN TIRAGE */}
          {(sousVueRoue === 'historique' || tirageSelectionneDetail) && (
            <div className="space-y-3 max-w-md mx-auto text-left animate-fadeIn">
              
              {tirageSelectionneDetail ? (
                /* CONSULTATION DU DÉTAIL D'UN TIRAGE SÉLECTIONNÉ */
                <div className="space-y-3 bg-slate-900/90 p-4 rounded-xl border border-purple-500/50 shadow-xl">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                    <div>
                      <h5 className="font-black text-xs uppercase text-purple-400">{tirageSelectionneDetail.titre}</h5>
                      <p className="text-[9px] text-slate-400">Enregistré le : {tirageSelectionneDetail.date}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTirageSelectionneDetail(null)}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-[9px] font-bold"
                    >
                      ⬅️ Retour à la liste
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-300 uppercase text-[9px] font-black border-b border-slate-700">
                        <tr>
                          <th className="p-2 text-center w-16">Ordre</th>
                          <th className="p-2">Nom des Membres</th>
                          <th className="p-2 text-right">Rôle / Poste</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-[10px]">
                        {tirageSelectionneDetail.resultats.map((membre, idx) => (
                          <tr key={membre.id || idx} className={idx === 0 ? 'bg-purple-500/15 font-bold' : 'hover:bg-slate-900'}>
                            <td className="p-2 text-center font-mono font-black text-purple-400">
                              {idx === 0 ? '🥇 1er' : `${idx + 1}`}
                            </td>
                            <td className="p-2 uppercase text-white font-extrabold">
                              {membre.nom_participant || membre.nom_complet} {membre.prenom || ''}
                            </td>
                            <td className="p-2 text-right">
                              <span className="bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded text-[8px] uppercase">
                                {membre.libelle_role || 'ADHERANT'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* LISTE DE TOUS LES TIRAGES VALIDÉS (CLIQUABLES) */
                <div className="space-y-3">
                  <h5 className="font-black text-xs uppercase text-slate-300">
                    📚 Liste des Tirages Validés ({historiqueTirages.length})
                  </h5>
                  
                  {historiqueTirages.length === 0 ? (
                    <p className="text-slate-400 text-center py-8 text-xs">Aucun tirage validé pour le moment.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {historiqueTirages.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setTirageSelectionneDetail(t)}
                          className="bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-purple-500 p-3 rounded-xl space-y-1 cursor-pointer transition shadow"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-black text-purple-400 text-xs uppercase">📌 {t.titre}</span>
                            <span className="text-[9px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full">Consulter ➡️</span>
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400">
                            <span>📅 {t.date}</span>
                            <span className="font-mono">🥇 Gagnant : <strong className="text-white uppercase">{t.resultats[0]?.nom_participant || t.resultats[0]?.nom_complet}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* FENÊTRE MODALE DE CRÉATION / MODIFICATION DE MEMBRE */}
      {afficherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-4 space-y-3 max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-[#0b1329] border-cyan-900 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
            
            <div className="flex justify-between items-center border-b pb-2 border-slate-700/40">
              <h4 className="font-black text-orange-500 uppercase text-xs">
                {participantEnEdition ? '✏️ Modifier le membre' : '➕ Ajouter nouveau membre'}
              </h4>
              <button type="button" onClick={fermerModal} className="text-slate-400 hover:text-white font-bold text-sm">✖</button>
            </div>

            <form onSubmit={enregistrerParticipant} className="space-y-2.5 w-full">
              
              <input type="file" ref={fileInputRef} onChange={gererSelectionImage} accept="image/*" className="hidden" />
              
              <div className="flex flex-row items-center gap-2 w-full">
                <div 
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="w-10 h-10 rounded-full bg-slate-800 border border-orange-500 flex items-center justify-center overflow-hidden cursor-pointer relative group shadow-sm shrink-0"
                  title="Choisir une photo"
                >
                  {nouveauParticipant.photo ? (
                    <img src={nouveauParticipant.photo} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-300 text-sm">📷</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Nom *</label>
                  <input
                    type="text"
                    required
                    value={nouveauParticipant.nom_participant}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, nom_participant: e.target.value.toUpperCase() })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Prénom</label>
                  <input
                    type="text"
                    value={nouveauParticipant.prenom}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, prenom: e.target.value.toUpperCase() })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <label className={`font-black text-[9px] uppercase ${labelColor}`}>Rôle / Poste</label>
                    <button type="button" onClick={() => setAfficherModalRoles(true)} className="text-[9px] font-bold text-orange-500 hover:text-orange-600 underline">
                      🛡️ Voir les rôles
                    </button>
                  </div>
                  <select
                    value={nouveauParticipant.libelle_role}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, libelle_role: e.target.value })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold ${inputBg}`}
                  >
                    {rolesDisponibles.length === 0 ? (
                      <option value="ADHERANT">ADHERANT</option>
                    ) : (
                      rolesDisponibles.map((role, idx) => (
                        <option key={idx} value={role}>{role}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Pays</label>
                  <select
                    value={nouveauParticipant.pays}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, pays: e.target.value })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold ${inputBg}`}
                  >
                    {LISTE_PAYS.map(p => <option key={p.code} value={p.code}>{p.code.toUpperCase()} ({p.indicatif})</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Téléphone ({paysActuelObj.longueur} chiffres)</label>
                  <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                    <span className="bg-slate-200 px-2 py-1.5 text-[10px] font-black text-slate-900 border-r">{paysActuelObj.indicatif}</span>
                    <input
                      type="text"
                      maxLength={paysActuelObj.longueur}
                      value={nouveauParticipant.telephone}
                      onChange={gererSaisieTelephone}
                      className="w-full p-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Date d'adhésion</label>
                  <input
                    type="date"
                    value={nouveauParticipant.date_adhesion}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, date_adhesion: e.target.value })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold ${inputBg}`}
                  />
                </div>
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Lieu de résidence</label>
                  <input
                    type="text"
                    value={nouveauParticipant.lieu_residence}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, lieu_residence: e.target.value.toUpperCase() })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Numéro CNI</label>
                <input
                  type="text"
                  value={nouveauParticipant.numero_cni}
                  onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, numero_cni: e.target.value.toUpperCase() })}
                  className={`w-full p-1.5 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-700/40">
                <div>
                  {participantEnEdition && (
                    <button type="button" onClick={() => supprimerParticipant(participantEnEdition.id)} className="bg-red-600 hover:bg-red-500 text-white font-black px-2.5 py-1 rounded text-[10px] shadow transition">
                      🗑️ Supprimer
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={fermerModal} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-1 rounded text-[10px]">
                    Annuler
                  </button>
                  <button type="submit" disabled={enTrainDeSauvegarder} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-1 rounded text-[10px] shadow">
                    {enTrainDeSauvegarder ? 'Enregistrement...' : (participantEnEdition ? 'Mettre à jour' : 'Enregistrer')}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODALE LISTE DES RÔLES */}
      {afficherModalRoles && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-4 space-y-3 ${isDarkMode ? 'bg-[#0f1d3e] border-cyan-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-2 border-slate-700/40">
              <h5 className="font-black text-xs uppercase text-orange-500">🛡️ Liste des Rôles (Tontine)</h5>
              <button type="button" onClick={() => setAfficherModalRoles(false)} className="text-slate-400 hover:text-white font-bold text-sm">✖</button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {listeRolesComplet.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Aucun rôle enregistré dans ce module.</p>
              ) : (
                listeRolesComplet.map((r, index) => (
                  <div key={r.id || index} className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 flex flex-col gap-0.5">
                    <span className="font-black text-xs uppercase text-orange-600 dark:text-orange-400">👑 {r.nom_role}</span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-300">{r.description || 'Aucune description détaillée.'}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-700/40">
              <button type="button" onClick={() => setAfficherModalRoles(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-1.5 rounded-lg text-[10px]">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}