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
  const [cyclesDisponibles, setCyclesDisponibles] = useState([]);
  const [rolesDisponibles, setRolesDisponibles] = useState([]);
  const [listeRolesComplet, setListeRolesComplet] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [vueActuelle, setVueActuelle] = useState('liste'); // 'liste' | 'roue'
  const [sousVueRoue, setSousVueRoue] = useState('nouveau'); // 'nouveau' | 'historique'
  const [tirageSelectionneDetail, setTirageSelectionneDetail] = useState(null);
  
  const [afficherModal, setAfficherModal] = useState(false);
  const [modalRoleOuverte, setModalRoleOuverte] = useState(false);
  const [modalCycleOuverte, setModalCycleOuverte] = useState(false);
  const [cycleFiltreSelectionne, setCycleFiltreSelectionne] = useState(null);

  // États pour le choix de la tontine au tirage
  const [cycleTirageSelectionne, setCycleTirageSelectionne] = useState(null);
  const [modalChoixCycleTirageOuverte, setModalChoixCycleTirageOuverte] = useState(false);

  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [participantEnEdition, setParticipantEnEdition] = useState(null);
  const [aDejaCotise, setADejaCotise] = useState(false);
  const [donneesInitialesModal, setDonneesInitialesModal] = useState(null);

  // États pour le tri
  const [triPar, setTriPar] = useState('nom'); // 'nom' | 'role' | 'statut' | 'cycle'
  const [ordreAsc, setOrdreAsc] = useState(true);

  // États pour la roue et le tirage
  const [titreTirage, setTitreTirage] = useState(`TIRAGE DU ${new Date().toLocaleDateString()}`);
  const [classementProvisoire, setClassementProvisoire] = useState([]);
  const [tirageEstValide, setTirageEstValide] = useState(false);
  const [rotationRoue, setRotationRoue] = useState(0);
  const [enTrainDeTourner, setEnTrainDeTourner] = useState(false);
  const [historiqueTirages, setHistoriqueTirages] = useState([]);

  const fileInputRef = useRef(null);

  // État du formulaire
  const [nouveauParticipant, setNouveauParticipant] = useState({
    nom_participant: '',
    prenom: '',
    pays: 'cmr',
    telephone: '',
    lieu_residence: '',
    numero_cni: '',
    libelle_role: 'ADHERANT',
    statut: 'ACTIF',
    date_adhesion: new Date().toISOString().split('T')[0],
    photo: '',
    cyclesSelectionnes: {},
  });

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      const { data: dataPart, error: errPart } = await supabase
        .from('tontine_participants')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (errPart) throw errPart;
      setParticipants(dataPart || []);

      const { data: dataCycles } = await supabase
        .from('tontine_cycles')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      
      if (dataCycles) {
        setCyclesDisponibles(dataCycles);
      }

      const historiqueLocal = localStorage.getItem(`historique_tirages_${entrepriseId}`);
      if (historiqueLocal) {
        setHistoriqueTirages(JSON.parse(historiqueLocal));
      }

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
        const rolesDefaut = [
          { nom_role: 'ADHERANT', description: 'Membre standard de l’association.' },
          { nom_role: 'MEMBRE DU BUREAU', description: 'Membre actif du bureau exécutif.' },
          { nom_role: 'PRESIDENT', description: 'Dirigeant principal de la tontine.' }
        ];
        setListeRolesComplet(rolesDefaut);
        setRolesDisponibles(['ADHERANT', 'MEMBRE DU BUREAU', 'PRESIDENT']);
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

  const basculerCycleSelection = (idCycle) => {
    setNouveauParticipant(prev => {
      const cycles = { ...prev.cyclesSelectionnes };
      if (cycles[idCycle]) {
        delete cycles[idCycle];
      } else {
        cycles[idCycle] = 1;
      }
      return { ...prev, cyclesSelectionnes: cycles };
    });
  };

  const toutCocherOuDecocherCycles = () => {
    const tousCoches = cyclesDisponibles.length > 0 && cyclesDisponibles.every(c => nouveauParticipant.cyclesSelectionnes[c.id] !== undefined);
    if (tousCoches) {
      setNouveauParticipant(prev => ({ ...prev, cyclesSelectionnes: {} }));
    } else {
      const tous = {};
      cyclesDisponibles.forEach(c => {
        tous[c.id] = nouveauParticipant.cyclesSelectionnes[c.id] || 1;
      });
      setNouveauParticipant(prev => ({ ...prev, cyclesSelectionnes: tous }));
    }
  };

  const modifierPartsCycle = (idCycle, nbParts) => {
    setNouveauParticipant(prev => ({
      ...prev,
      cyclesSelectionnes: {
        ...prev.cyclesSelectionnes,
        [idCycle]: Math.max(1, parseInt(nbParts) || 1)
      }
    }));
  };

  const aDesModifications = () => {
    if (!participantEnEdition) return true;
    if (!donneesInitialesModal) return false;

    const etatActuel = JSON.stringify({
      nom: nouveauParticipant.nom_participant.trim(),
      prenom: nouveauParticipant.prenom.trim(),
      pays: nouveauParticipant.pays,
      tel: nouveauParticipant.telephone,
      res: nouveauParticipant.lieu_residence.trim(),
      cni: nouveauParticipant.numero_cni.trim(),
      role: nouveauParticipant.libelle_role,
      statut: nouveauParticipant.statut,
      date: nouveauParticipant.date_adhesion,
      photo: nouveauParticipant.photo,
      cycles: nouveauParticipant.cyclesSelectionnes
    });

    return etatActuel !== donneesInitialesModal;
  };

  const enregistrerParticipant = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (!nouveauParticipant.nom_participant.trim()) {
      alert('⚠️ Veuillez renseigner le nom du participant.');
      return;
    }

    const cyclesCoches = Object.keys(nouveauParticipant.cyclesSelectionnes);
    if (cyclesCoches.length === 0) {
      alert('⚠️ Veuillez sélectionner au moins un cycle (antenne) pour ce membre.');
      return;
    }

    if (participantEnEdition && !aDesModifications()) {
      alert('⚠️ Aucune modification n’a été effectuée.');
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
      const basePayload = {
        id_entreprise: entrepriseId || '4TS-290136',
        nom_participant: nouveauParticipant.nom_participant.trim().toUpperCase(),
        nom_complet: nouveauParticipant.nom_participant.trim().toUpperCase(),
        prenom: (nouveauParticipant.prenom || '').trim().toUpperCase(),
        telephone: telephoneComplet,
        lieu_residence: (nouveauParticipant.lieu_residence || '').trim().toUpperCase(),
        numero_cni: (nouveauParticipant.numero_cni || '').trim().toUpperCase(),
        libelle_role: nouveauParticipant.libelle_role || 'ADHERANT',
        statut: nouveauParticipant.statut || 'ACTIF',
        date_adhesion: nouveauParticipant.date_adhesion || new Date().toISOString().split('T')[0],
        photo: nouveauParticipant.photo || null,
      };

      if (participantEnEdition) {
        let deleteQuery = supabase
          .from('tontine_participants')
          .delete()
          .eq('id_entreprise', entrepriseId)
          .eq('nom_participant', participantEnEdition.nom_participant);

        if (participantEnEdition.telephone && participantEnEdition.telephone !== 'N/A') {
          deleteQuery = deleteQuery.eq('telephone', participantEnEdition.telephone);
        } else {
          deleteQuery = deleteQuery.or('telephone.is.null,telephone.eq.N/A');
        }

        const { error: errDel } = await deleteQuery;
        if (errDel) throw errDel;

        const payloadsInsertion = cyclesCoches.map(idCycle => ({
          ...basePayload,
          id_cycle: parseInt(idCycle),
          nombre_parts: parseInt(nouveauParticipant.cyclesSelectionnes[idCycle]) || 1,
        }));

        const { error } = await supabase.from('tontine_participants').insert(payloadsInsertion);
        if (error) throw error;
        alert('✅ Membre et ses cycles mis à jour avec succès !');
      } else {
        const payloadsInsertion = cyclesCoches.map(idCycle => ({
          ...basePayload,
          id_cycle: parseInt(idCycle),
          nombre_parts: parseInt(nouveauParticipant.cyclesSelectionnes[idCycle]) || 1,
        }));

        const { error } = await supabase.from('tontine_participants').insert(payloadsInsertion);
        if (error) throw error;
        alert('✅ Membre inscrit aux cycles sélectionnés avec succès !');
      }

      fermerModal();
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur lors de l\'enregistrement : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const supprimerParticipant = async (p) => {
    if (aDejaCotise) {
      alert('❌ Suppression impossible : ce membre a déjà effectué des cotisations dans un ou plusieurs cycles.');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre de tous ses cycles ?')) return;
    try {
      let query = supabase
        .from('tontine_participants')
        .delete()
        .eq('id_entreprise', entrepriseId)
        .eq('nom_participant', p.nom_participant || p.nom_complet);

      if (p.telephone && p.telephone !== 'N/A') {
        query = query.eq('telephone', p.telephone);
      } else {
        query = query.or('telephone.is.null,telephone.eq.N/A');
      }

      const { error } = await query;
      if (error) throw error;

      alert('🗑️ Membre supprimé avec succès !');
      fermerModal();
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur lors de la suppression : ' + err.message);
    }
  };

  const ouvrirEdition = async (p) => {
    setParticipantEnEdition(p);
    const paysTrouve = LISTE_PAYS.find(item => p.telephone && p.telephone.startsWith(item.indicatif)) || LISTE_PAYS[0];
    let telLocal = p.telephone && p.telephone !== 'N/A' ? p.telephone : '';
    if (p.telephone && p.telephone.startsWith(paysTrouve.indicatif)) {
      telLocal = p.telephone.replace(paysTrouve.indicatif, '');
    }

    const participationsMembre = participants.filter(
      item => (item.nom_participant === p.nom_participant || item.nom_complet === p.nom_complet) && 
              ((!item.telephone && (!p.telephone || p.telephone === 'N/A')) || item.telephone === p.telephone)
    );

    const cyclesMap = {};
    const idsParticipant = participationsMembre.map(item => item.id);

    participationsMembre.forEach(part => {
      if (part.id_cycle) {
        cyclesMap[part.id_cycle] = part.nombre_parts || 1;
      }
    });

    let cotiseEffectuee = false;
    if (idsParticipant.length > 0) {
      try {
        const { count, error } = await supabase
          .from('tontine_cotisations')
          .select('*', { count: 'exact', head: true })
          .in('id_participant', idsParticipant);

        if (!error && count && count > 0) {
          cotiseEffectuee = true;
        }
      } catch (e) {
        console.warn('Vérification cotisations :', e);
      }
    }
    setADejaCotise(cotiseEffectuee);

    const formulaireData = {
      nom_participant: p.nom_participant || p.nom_complet || '',
      prenom: p.prenom || '',
      pays: p.pays || paysTrouve.code,
      telephone: telLocal.replace(/[^0-9]/g, ''),
      lieu_residence: p.lieu_residence || '',
      numero_cni: p.numero_cni || '',
      libelle_role: p.libelle_role || 'ADHERANT',
      statut: p.statut || 'ACTIF',
      date_adhesion: p.date_adhesion ? p.date_adhesion.split('T')[0] : new Date().toISOString().split('T')[0],
      photo: p.photo || '',
      cyclesSelectionnes: cyclesMap,
    };

    setNouveauParticipant(formulaireData);
    setDonneesInitialesModal(JSON.stringify({
      nom: formulaireData.nom_participant.trim(),
      prenom: formulaireData.prenom.trim(),
      pays: formulaireData.pays,
      tel: formulaireData.telephone,
      res: formulaireData.lieu_residence.trim(),
      cni: formulaireData.numero_cni.trim(),
      role: formulaireData.libelle_role,
      statut: formulaireData.statut,
      date: formulaireData.date_adhesion,
      photo: formulaireData.photo,
      cycles: formulaireData.cyclesSelectionnes
    }));

    setAfficherModal(true);
  };

  const fermerModal = () => {
    setAfficherModal(false);
    setParticipantEnEdition(null);
    setADejaCotise(false);
    setDonneesInitialesModal(null);
    setNouveauParticipant({
      nom_participant: '', prenom: '', pays: 'cmr', telephone: '', lieu_residence: '', numero_cni: '',
      libelle_role: 'ADHERANT', statut: 'ACTIF', date_adhesion: new Date().toISOString().split('T')[0], photo: '',
      cyclesSelectionnes: {}
    });
  };

  const mapMembres = new Map();
  participants.forEach(p => {
    const cle = `${(p.nom_participant || p.nom_complet || '').trim().toUpperCase()}_${(p.prenom || '').trim().toUpperCase()}_${(p.telephone || 'N/A').trim()}`;
    if (!mapMembres.has(cle)) {
      mapMembres.set(cle, {
        ...p,
        cyclesMap: {}
      });
    }
    const membreObj = mapMembres.get(cle);
    if (p.id_cycle) {
      membreObj.cyclesMap[p.id_cycle] = p.nombre_parts || 1;
    }
  });

  const listeMembresUniques = Array.from(mapMembres.values()).map(m => {
    const cyclesParticipations = Object.entries(m.cyclesMap).map(([id_cycle, nombre_parts]) => ({
      id_cycle: parseInt(id_cycle),
      nombre_parts
    }));
    return {
      ...m,
      cyclesParticipations
    };
  });

  const membresFiltres = listeMembresUniques.filter(m => {
    if (cycleFiltreSelectionne) {
      const participeAuCycle = m.cyclesParticipations?.some(cp => cp.id_cycle === cycleFiltreSelectionne);
      if (!participeAuCycle) return false;
    }

    const nomP = m.nom_participant || m.nom_complet || '';
    const texte = `${nomP} ${m.prenom || ''} ${m.telephone || ''} ${m.libelle_role || ''}`.toLowerCase();
    return texte.includes(recherche.toLowerCase());
  }).sort((a, b) => {
    let valA = '', valB = '';
    if (triPar === 'nom') {
      valA = (a.nom_participant || a.nom_complet || '').trim();
      valB = (b.nom_participant || b.nom_complet || '').trim();
    } else if (triPar === 'role') {
      valA = (a.libelle_role || '').trim();
      valB = (b.libelle_role || '').trim();
    } else if (triPar === 'statut') {
      valA = (a.statut || 'ACTIF').trim();
      valB = (b.statut || 'ACTIF').trim();
    } else if (triPar === 'cycle') {
      valA = a.cyclesParticipations?.[0]?.id_cycle?.toString() || '0';
      valB = b.cyclesParticipations?.[0]?.id_cycle?.toString() || '0';
    }
    if (valA < valB) return ordreAsc ? -1 : 1;
    if (valA > valB) return ordreAsc ? 1 : -1;
    return 0;
  });

  // Filtrage strict des membres éligibles au tirage pour le cycle sélectionné
  const participantsActifsUniques = listeMembresUniques.filter(p => {
    if (p.statut === 'INACTIF') return false;
    if (cycleTirageSelectionne) {
      const participeAuCycle = p.cyclesParticipations?.some(cp => cp.id_cycle === cycleTirageSelectionne.id);
      if (!participeAuCycle) return false;
    }
    return true;
  });

  const gererTri = (colonne) => {
    if (triPar === colonne) {
      setOrdreAsc(!ordreAsc);
    } else {
      setTriPar(colonne);
      setOrdreAsc(true);
    }
  };

  const lancerRoueCollectif = () => {
    if (participantsActifsUniques.length === 0) {
      alert('⚠️ Aucun participant actif et souscrit à ce cycle n’est disponible pour effectuer le tirage.');
      return;
    }
    if (enTrainDeTourner) return;

    setEnTrainDeTourner(true);
    setTirageEstValide(false);
    setClassementProvisoire([]);

    const nbMembres = participantsActifsUniques.length;
    const angleParSecteur = 360 / nbMembres;
    const indexGagnant = Math.floor(Math.random() * nbMembres);

    const toursSupplementaires = 6 * 360;
    const angleCible = (360 - (indexGagnant * angleParSecteur)) % 360;
    const rotationActuelleMod = rotationRoue % 360;
    const deltaRotation = (angleCible - rotationActuelleMod + 360) % 360;
    const nouvelleRotation = rotationRoue + toursSupplementaires + deltaRotation;

    setRotationRoue(nouvelleRotation);

    setTimeout(() => {
      const gagnant = participantsActifsUniques[indexGagnant];
      const autres = participantsActifsUniques.filter((_, idx) => idx !== indexGagnant);
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
      resultats: classementProvisoire,
      id_cycle: cycleTirageSelectionne ? cycleTirageSelectionne.id : null,
      nom_cycle: cycleTirageSelectionne ? (cycleTirageSelectionne.nom_cycle || cycleTirageSelectionne.libelle) : null
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
    setCycleTirageSelectionne(null);
    setTitreTirage(`TIRAGE DU ${new Date().toLocaleDateString()}`);
    setSousVueRoue('nouveau');
  };

  const supprimerTirage = (e, id) => {
    e.stopPropagation();
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce tirage validé de l’historique ?')) return;
    const misAJour = historiqueTirages.filter(t => t.id !== id);
    setHistoriqueTirages(misAJour);
    localStorage.setItem(`historique_tirages_${entrepriseId}`, JSON.stringify(misAJour));
    if (tirageSelectionneDetail && tirageSelectionneDetail.id === id) {
      setTirageSelectionneDetail(null);
    }
  };

  const paysActuelObj = LISTE_PAYS.find(p => p.code === nouveauParticipant.pays) || LISTE_PAYS[0];
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-cyan-500/50' : 'bg-white text-slate-900 border-cyan-400';
  const labelColor = isDarkMode ? 'text-cyan-200' : 'text-slate-800';
  const tousCochesGlobal = cyclesDisponibles.length > 0 && cyclesDisponibles.every(c => nouveauParticipant.cyclesSelectionnes[c.id] !== undefined);

  return (
    <div className="w-full h-full space-y-2.5 font-sans text-xs relative">
      
      {vueActuelle === 'liste' && (
        <div className="space-y-2.5 w-full">
          
          {/* ZONE DU HAUT ÉPURÉE (DEUX BOUTONS CÔTE À CÔTE SANS DÉFILEMENT) */}
          <div className="flex items-center bg-white/5 px-2 py-1.5 rounded-xl border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.2)] gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                setParticipantEnEdition(null);
                setADejaCotise(false);
                setDonneesInitialesModal(null);
                setNouveauParticipant({
                  nom_participant: '', prenom: '', pays: 'cmr', telephone: '', lieu_residence: '', numero_cni: '',
                  libelle_role: 'ADHERANT', statut: 'ACTIF', date_adhesion: new Date().toISOString().split('T')[0], photo: '',
                  cyclesSelectionnes: {}
                });
                setAfficherModal(true);
              }}
              className="bg-orange-600 hover:bg-orange-500 text-white font-black px-2.5 py-1.5 rounded-lg transition shadow text-[10px] uppercase flex items-center justify-center gap-1 flex-1 cursor-pointer border border-orange-400/60"
            >
              ➕ Nouveau membre
            </button>

            <button
              type="button"
              onClick={() => {
                setVueActuelle('roue');
                setSousVueRoue('nouveau');
              }}
              className="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-black px-2.5 py-1.5 rounded-lg transition shadow text-[10px] uppercase flex items-center justify-center gap-1 flex-1 cursor-pointer border border-cyan-400/60"
            >
              🎡 Roue de tirage
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-between bg-white p-2 rounded-xl border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="🔍 Rechercher un participant..."
              className="flex-1 min-w-[180px] bg-white border border-cyan-400/60 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 text-xs focus:outline-none"
            />
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setModalCycleOuverte(true)}
                className={`px-2.5 py-1.5 rounded-lg font-black text-[10px] uppercase flex items-center gap-1.5 cursor-pointer transition shadow-2xs border ${
                  cycleFiltreSelectionne 
                    ? 'bg-cyan-100 text-slate-900 border-cyan-500' 
                    : 'bg-slate-100 text-slate-700 border-cyan-300 hover:bg-cyan-50'
                }`}
              >
                🎯 {cycleFiltreSelectionne ? `CYCLE : ${(cyclesDisponibles.find(c => c.id === cycleFiltreSelectionne)?.nom_cycle || cyclesDisponibles.find(c => c.id === cycleFiltreSelectionne)?.libelle || 'FILTRÉ')}` : 'FILTRER PAR CYCLE'}
              </button>

              {cycleFiltreSelectionne && (
                <button
                  type="button"
                  onClick={() => setCycleFiltreSelectionne(null)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition border border-red-300"
                  title="Effacer le filtre cycle"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* TABLEAU SIMPLIFIÉ ENCADRÉ EN BLEU NÉON */}
          <div className="overflow-x-auto border border-cyan-400 rounded-xl bg-white shadow-[0_0_12px_rgba(34,211,238,0.3)] w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-800 border-b border-cyan-300 uppercase text-[9px] font-black select-none">
                <tr>
                  <th onClick={() => gererTri('nom')} className="p-2.5 cursor-pointer hover:bg-slate-200 transition">
                    {triPar === 'nom' ? (ordreAsc ? '🔼 ' : '🔽 ') : ''}NOM & PRÉNOM
                  </th>
                  <th onClick={() => gererTri('cycle')} className="p-2.5 text-center cursor-pointer hover:bg-slate-200 transition">
                    {triPar === 'cycle' ? (ordreAsc ? '🔼 ' : '🔽 ') : ''}CYCLE
                  </th>
                  <th className="p-2.5 text-center">PARTS</th>
                  <th className="p-2.5">TÉLÉPHONE</th>
                  <th onClick={() => gererTri('statut')} className="p-2.5 text-center cursor-pointer hover:bg-slate-200 transition">
                    {triPar === 'statut' ? (ordreAsc ? '🔼 ' : '🔽 ') : ''}STATUT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-100 text-[10px]">
                {chargement ? (
                  <tr><td colSpan="5" className="p-4 text-center animate-pulse text-slate-500">Chargement...</td></tr>
                ) : membresFiltres.length === 0 ? (
                  <tr><td colSpan="5" className="p-4 text-center text-slate-500 font-bold">Aucun participant trouvé pour ce filtre.</td></tr>
                ) : (
                  membresFiltres.map((p) => {
                    const nomAffiche = p.nom_participant || p.nom_complet || 'Membre';
                    const estInactif = p.statut === 'INACTIF';
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => ouvrirEdition(p)} 
                        className={`cursor-pointer transition select-none ${estInactif ? 'bg-slate-200/60 text-slate-400 opacity-60 grayscale' : 'hover:bg-cyan-50 text-slate-900'}`}
                        title="Cliquez pour ouvrir et modifier le membre"
                      >
                        <td className="p-2.5 font-black uppercase">{nomAffiche} {p.prenom || ''}</td>
                        <td className="p-2.5 text-center font-bold text-slate-800 uppercase">
                          {p.cyclesParticipations && p.cyclesParticipations.length > 0 ? (
                            <div className="flex flex-col gap-0.5 items-center">
                              {p.cyclesParticipations.map((cp, idx) => {
                                const cycleConcerne = cyclesDisponibles.find(c => c.id === cp.id_cycle);
                                const nomCycle = cycleConcerne ? (cycleConcerne.nom_cycle || cycleConcerne.libelle) : `Cycle #${cp.id_cycle || 'N/A'}`;
                                return (
                                  <span key={idx} className="bg-slate-100 text-slate-800 border border-cyan-300 px-1.5 py-0.5 rounded text-[8px] font-bold">
                                    {nomCycle}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400">Aucun cycle</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-black text-slate-900 font-mono">
                          {p.cyclesParticipations && p.cyclesParticipations.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {p.cyclesParticipations.map((cp, idx) => (
                                <span key={idx} className="py-0.5">
                                  {cp.nombre_parts || 1}
                                </span>
                              ))}
                            </div>
                          ) : (
                            1
                          )}
                        </td>
                        <td className="p-2.5 font-mono font-bold">{p.telephone && p.telephone !== 'N/A' ? p.telephone : 'N/A'}</td>
                        <td className="p-2.5 text-center">
                          <span className={`font-black px-2 py-0.5 rounded text-[8px] uppercase border ${estInactif ? 'bg-red-100 text-red-700 border-red-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
                            {p.statut || 'ACTIF'}
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
      )}

      {vueActuelle === 'roue' && (
        <div className="w-full space-y-2.5 text-center border border-cyan-400/60 p-3 rounded-xl shadow-[0_0_12px_rgba(34,211,238,0.2)] bg-slate-950/60">
          
          <div className="flex justify-between items-center pb-2 border-b border-cyan-400/40">
            <button
              type="button"
              onClick={() => {
                setVueActuelle('liste');
                setTirageSelectionneDetail(null);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white font-black px-3 py-1.5 rounded-lg text-[10px] uppercase transition flex items-center gap-1 shadow cursor-pointer border border-cyan-400/50"
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
                className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition cursor-pointer ${sousVueRoue === 'nouveau' && !tirageSelectionneDetail ? 'bg-orange-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:text-white border border-cyan-400/40'}`}
              >
                🎰 Lancer un nouveau tirage
              </button>
              <button
                type="button"
                onClick={() => setSousVueRoue('historique')}
                className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition cursor-pointer ${sousVueRoue === 'historique' || tirageSelectionneDetail ? 'bg-slate-800 text-white shadow border border-cyan-400' : 'bg-slate-900 text-slate-300 hover:text-white border border-cyan-400/40'}`}
              >
                📚 Liste des tirages validés ({historiqueTirages.length})
              </button>
            </div>
          </div>

          {sousVueRoue === 'nouveau' && !tirageSelectionneDetail && (
            <div className="space-y-2.5 animate-fadeIn w-full">
              <div className="w-full space-y-2 text-left bg-slate-900/60 p-2.5 rounded-lg border border-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.15)]">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <label className="block text-[10px] font-black text-cyan-400 uppercase">📌 Titre / Nom du Tirage :</label>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setModalChoixCycleTirageOuverte(true)}
                      disabled={tirageEstValide || enTrainDeTourner}
                      className="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-black px-2.5 py-1 rounded-lg text-[9px] uppercase border border-cyan-400/50 flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                    >
                      🎯 {cycleTirageSelectionne ? `TONTINE : ${(cycleTirageSelectionne.nom_cycle || cycleTirageSelectionne.libelle)}` : 'SÉLECTIONNER UNE TONTINE BÉNÉFICIAIRE'}
                    </button>
                    {cycleTirageSelectionne && !tirageEstValide && !enTrainDeTourner && (
                      <button
                        type="button"
                        onClick={() => {
                          setCycleTirageSelectionne(null);
                          setTirageEstValide(false);
                          setTitreTirage(`TIRAGE DU ${new Date().toLocaleDateString()}`);
                        }}
                        className="bg-red-900/40 hover:bg-red-900/60 text-red-300 px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition border border-red-700/50"
                        title="Détacher de la tontine"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  value={titreTirage}
                  disabled={tirageEstValide || enTrainDeTourner}
                  onChange={(e) => setTitreTirage(e.target.value.toUpperCase())}
                  placeholder="EX: TIRAGE SESSION JANVIER..."
                  className="w-full p-2 rounded-lg border border-cyan-400/50 bg-slate-950 text-white font-bold text-xs uppercase disabled:opacity-60"
                />
                
                {cycleTirageSelectionne && (
                  <p className="text-[10px] text-cyan-300 font-bold">
                    💡 Seuls les membres inscrits à <strong>{cycleTirageSelectionne.nom_cycle || cycleTirageSelectionne.libelle}</strong> ({participantsActifsUniques.length} éligibles) participeront à ce tirage.
                  </p>
                )}
              </div>

              {participantsActifsUniques.length === 0 ? (
                <div className="py-6 bg-slate-900/30 rounded-lg border border-cyan-400/40 w-full">
                  <p className="text-cyan-300 font-bold">⚠️ Aucun membre actif n'est inscrit à cette tontine (ou aucun cycle sélectionné).</p>
                  <p className="text-slate-400 text-[10px] mt-1">Veuillez sélectionner un cycle valide ou vous assurer que des membres y sont inscrits.</p>
                </div>
              ) : (
                <>
                  <div className="relative w-40 h-40 mx-auto flex items-center justify-center my-2">
                    <div 
                      className="w-full h-full rounded-full border-4 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] relative overflow-hidden transition-transform ease-out duration-4000 flex items-center justify-center bg-slate-900"
                      style={{ transform: `rotate(${rotationRoue}deg)` }}
                    >
                      {participantsActifsUniques.map((p, index, arr) => {
                        const angle = (index / arr.length) * 360;
                        return (
                          <div
                            key={p.id}
                            className="absolute w-full h-full text-center font-black text-[9px] text-white pt-2"
                            style={{ transform: `rotate(${angle}deg)`, transformOrigin: 'center' }}
                          >
                            <span className="bg-black/70 px-1.5 py-0.5 rounded text-cyan-200">{index + 1}. {p.nom_participant || p.nom_complet}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="absolute -top-3 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-[18px] border-t-cyan-400 z-10 drop-shadow-lg"></div>
                    <div className="absolute w-6 h-6 rounded-full bg-white border-2 border-cyan-500 shadow-md z-20"></div>
                  </div>

                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={lancerRoueCollectif}
                      disabled={enTrainDeTourner || tirageEstValide}
                      className="bg-gradient-to-r from-orange-600 to-cyan-700 hover:from-orange-500 hover:to-cyan-600 disabled:opacity-50 text-white font-black px-5 py-2 rounded-xl text-xs shadow-lg uppercase transition transform active:scale-95 cursor-pointer border border-cyan-400/50"
                    >
                      {enTrainDeTourner ? '🌀 La roue tourne...' : (classementProvisoire.length > 0 ? '🔄 Relancer la Roue' : '🎰 Lancer le Tirage')}
                    </button>
                  </div>
                </>
              )}

              {classementProvisoire.length > 0 && !enTrainDeTourner && (
                <div className="space-y-2.5 pt-1 text-left w-full bg-slate-900/80 p-3 rounded-lg border border-cyan-400/60 shadow-[0_0_10px_rgba(34,211,238,0.3)] animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-cyan-400/30 pb-2">
                    <div>
                      <h5 className="font-black text-xs uppercase text-cyan-400">{titreTirage}</h5>
                      <p className="text-[9px] text-slate-400">
                        {tirageEstValide ? '🔒 Tirage verrouillé et enregistré' : '⚠️ Liste Provisoire (Non validée)'}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${tirageEstValide ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                      {tirageEstValide ? 'Validé' : 'En attente'}
                    </span>
                  </div>
                  
                  <div className="overflow-x-auto rounded-lg border border-cyan-400/40 bg-slate-950 w-full">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-cyan-300 uppercase text-[9px] font-black border-b border-cyan-400/30">
                        <tr>
                          <th className="p-2 text-center w-16">Ordre</th>
                          <th className="p-2">Nom des Membres</th>
                          <th className="p-2 text-right">Rôle / Poste</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-[10px]">
                        {classementProvisoire.map((membre, idx) => (
                          <tr key={membre.id} className={idx === 0 ? 'bg-cyan-500/20 font-bold' : 'hover:bg-slate-900'}>
                            <td className="p-2 text-center font-mono font-black text-cyan-300">
                              {idx === 0 ? '🥇 1er' : `${idx + 1}`}
                            </td>
                            <td className="p-2 uppercase text-white font-extrabold">
                              {membre.nom_participant || membre.nom_complet} {membre.prenom || ''}
                            </td>
                            <td className="p-2 text-right">
                              <span className="bg-slate-800 text-cyan-300 border border-cyan-400/40 px-1.5 py-0.5 rounded text-[8px] uppercase">
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
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 rounded-xl text-xs uppercase shadow transition flex items-center justify-center gap-1 cursor-pointer border border-emerald-400/50"
                      >
                        ✅ Valider et Verrouiller le Tirage
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={lancerNouveauTirage}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2 rounded-xl text-xs uppercase shadow transition flex items-center justify-center gap-1 cursor-pointer border border-blue-400/50"
                      >
                        ➕ Lancer un Nouveau Tirage
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {(sousVueRoue === 'historique' || tirageSelectionneDetail) && (
            <div className="space-y-3 w-full text-left animate-fadeIn">
              {tirageSelectionneDetail ? (
                <div className="space-y-3 bg-slate-900/80 p-3 rounded-lg border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.2)] w-full">
                  <div className="flex justify-between items-center border-b border-cyan-400/30 pb-2">
                    <div>
                      <h5 className="font-black text-xs uppercase text-cyan-300">{tirageSelectionneDetail.titre}</h5>
                      <p className="text-[9px] text-slate-400">Enregistré le : {tirageSelectionneDetail.date}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTirageSelectionneDetail(null)}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-[9px] font-bold cursor-pointer border border-cyan-400/40"
                    >
                      ⬅️ Retour à la liste
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-cyan-400/40 bg-slate-950 w-full">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-cyan-300 uppercase text-[9px] font-black border-b border-cyan-400/30">
                        <tr>
                          <th className="p-2 text-center w-16">Ordre</th>
                          <th className="p-2">Nom des Membres</th>
                          <th className="p-2 text-right">Rôle / Poste</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-[10px]">
                        {tirageSelectionneDetail.resultats.map((membre, idx) => (
                          <tr key={membre.id || idx} className={idx === 0 ? 'bg-cyan-500/20 font-bold' : 'hover:bg-slate-900'}>
                            <td className="p-2 text-center font-mono font-black text-cyan-300">
                              {idx === 0 ? '🥇 1er' : `${idx + 1}`}
                            </td>
                            <td className="p-2 uppercase text-white font-extrabold">
                              {membre.nom_participant || membre.nom_complet} {membre.prenom || ''}
                            </td>
                            <td className="p-2 text-right">
                              <span className="bg-slate-800 text-cyan-300 border border-cyan-400/40 px-1.5 py-0.5 rounded text-[8px] uppercase">
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
                <div className="space-y-3 w-full">
                  <h5 className="font-black text-xs uppercase text-cyan-300">
                    📚 Liste des Tirages Validés ({historiqueTirages.length})
                  </h5>
                  
                  {historiqueTirages.length === 0 ? (
                    <p className="text-slate-400 text-center py-8 text-xs">Aucun tirage validé pour le moment.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1 w-full">
                      {historiqueTirages.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setTirageSelectionneDetail(t)}
                          className="bg-slate-900/80 hover:bg-slate-800 border border-cyan-400/40 hover:border-cyan-400 p-2.5 rounded-lg space-y-1 cursor-pointer transition shadow w-full"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-black text-cyan-200 text-xs uppercase">📌 {t.titre}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] bg-slate-800 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-400/40">Consulter ➡️</span>
                              <button
                                type="button"
                                onClick={(e) => supprimerTirage(e, t.id)}
                                className="bg-red-600/80 hover:bg-red-600 text-white px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer border border-red-400"
                                title="Supprimer ce tirage"
                              >
                                🗑️ Supprimer
                              </button>
                            </div>
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

      {/* MODALE DE SÉLECTION DE LA TONTINE BÉNÉFICIAIRE POUR LE TIRAGE */}
      {modalChoixCycleTirageOuverte && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.4)] border border-cyan-400 p-4 space-y-3 bg-slate-900 text-white">
            <div className="flex justify-between items-center border-b pb-2 border-cyan-400/40">
              <h5 className="font-black text-xs uppercase text-cyan-400">🎯 CHOISIR UNE TONTINE BÉNÉFICIAIRE</h5>
              <button type="button" onClick={() => setModalChoixCycleTirageOuverte(false)} className="text-cyan-300 hover:text-white font-bold text-sm cursor-pointer">✖</button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div
                onClick={() => {
                  setCycleTirageSelectionne(null);
                  setTirageEstValide(false);
                  setTitreTirage(`TIRAGE DU ${new Date().toLocaleDateString()}`);
                  setModalChoixCycleTirageOuverte(false);
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                  !cycleTirageSelectionne ? 'bg-cyan-950 text-cyan-200 font-bold border-cyan-400' : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span className="uppercase text-xs">🌟 AUCUN CYCLE / TIRAGE LIBRE</span>
                {!cycleTirageSelectionne && <span className="text-cyan-400 font-bold text-xs">✓ Actif</span>}
              </div>

              {cyclesDisponibles.filter(c => (c.type_cycle || 'BOUFFER') === 'BOUFFER').length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Aucune tontine bénéficiaire enregistrée.</p>
              ) : (
                cyclesDisponibles.filter(c => (c.type_cycle || 'BOUFFER') === 'BOUFFER').map((cycle) => {
                  const estActif = cycleTirageSelectionne?.id === cycle.id;
                  const nomC = cycle.nom_cycle || cycle.libelle || `Cycle #${cycle.id}`;
                  return (
                    <div
                      key={cycle.id}
                      onClick={() => {
                        setCycleTirageSelectionne(cycle);
                        setTirageEstValide(false);
                        setTitreTirage(`TIRAGE DU ${new Date().toLocaleDateString()}-${nomC}`);
                        setModalChoixCycleTirageOuverte(false);
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col gap-0.5 ${
                        estActif ? 'bg-cyan-950 text-cyan-200 font-bold border-cyan-400' : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs uppercase text-cyan-300">🎯 {nomC}</span>
                        {estActif && <span className="text-cyan-400 font-bold text-xs">✓ Sélectionné</span>}
                      </div>
                      {cycle.montant_cotisation > 0 && (
                        <span className="text-[10px] text-slate-400">Montant : {cycle.montant_cotisation.toLocaleString()} FCFA ({cycle.frequence})</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-cyan-400/40">
              <button type="button" onClick={() => setModalChoixCycleTirageOuverte(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-1.5 rounded-lg text-[10px] cursor-pointer border border-cyan-400/50">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE D'OUVERTURE / ÉDITION DU MEMBRE (AVEC PHOTO ET RÔLE RESTAURÉS) ENCADRÉE EN BLEU NÉON */}
      {afficherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-xl rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.4)] border border-cyan-400 p-4 space-y-3 max-h-[95vh] overflow-y-auto ${isDarkMode ? 'bg-[#0b1329] text-white' : 'bg-white text-slate-900'}`}>
            
            <div className="flex justify-between items-center border-b pb-2 border-cyan-400/40">
              <h4 className="font-black text-cyan-400 uppercase text-xs">
                {participantEnEdition ? '✏️ Détails et modification du membre' : '➕ Ajouter un membre & lier aux cycles'}
              </h4>
              <button type="button" onClick={fermerModal} className="text-cyan-300 hover:text-white font-bold text-sm cursor-pointer">✖</button>
            </div>

            <form onSubmit={enregistrerParticipant} className="space-y-2.5 w-full">
              
              <input type="file" ref={fileInputRef} onChange={gererSelectionImage} accept="image/*" className="hidden" />
              
              {/* SECTION PHOTO & NOMS */}
              <div className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl border border-cyan-400/40 bg-cyan-950/20">
                <div className="col-span-2 flex items-center justify-center">
                  <div 
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="w-12 h-12 rounded-full bg-slate-800 border-2 border-cyan-400 flex items-center justify-center overflow-hidden cursor-pointer relative shadow-[0_0_8px_rgba(34,211,238,0.4)] shrink-0"
                    title="Changer la photo"
                  >
                    {nouveauParticipant.photo ? (
                      <img src={nouveauParticipant.photo} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-cyan-300 text-sm">📷</span>
                    )}
                  </div>
                </div>
                <div className="col-span-5">
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Nom *</label>
                  <input
                    type="text"
                    required
                    value={nouveauParticipant.nom_participant}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, nom_participant: e.target.value.toUpperCase() })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                  />
                </div>
                <div className="col-span-5">
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Prénom</label>
                  <input
                    type="text"
                    value={nouveauParticipant.prenom}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, prenom: e.target.value.toUpperCase() })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                  />
                </div>
              </div>

              {/* SECTION RÔLE & STATUT */}
              <div className="grid grid-cols-2 gap-2 p-2 rounded-xl border border-cyan-400/40 bg-cyan-950/20">
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Rôle / Poste</label>
                  <button
                    type="button"
                    onClick={() => setModalRoleOuverte(true)}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold flex justify-between items-center cursor-pointer ${inputBg}`}
                  >
                    <span className="truncate uppercase font-black text-cyan-400">👑 {nouveauParticipant.libelle_role || 'SÉLECTIONNER'}</span>
                    <span className="text-[10px] text-cyan-400 font-bold">▼</span>
                  </button>
                </div>
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Statut</label>
                  <select
                    value={nouveauParticipant.statut}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, statut: e.target.value })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                  >
                    <option value="ACTIF">🟢 Actif</option>
                    <option value="INACTIF">🔴 Inactif</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-3">
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Pays</label>
                  <select
                    value={nouveauParticipant.pays}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, pays: e.target.value })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold ${inputBg}`}
                  >
                    {LISTE_PAYS.map(p => <option key={p.code} value={p.code}>{p.code.toUpperCase()} ({p.indicatif})</option>)}
                  </select>
                </div>
                <div className="col-span-4">
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Téléphone</label>
                  <div className="flex items-center border border-cyan-400 rounded-lg overflow-hidden bg-white">
                    <span className="bg-slate-200 px-1.5 py-1.5 text-[9px] font-black text-slate-900 border-r">{paysActuelObj.indicatif}</span>
                    <input
                      type="text"
                      maxLength={paysActuelObj.longueur}
                      value={nouveauParticipant.telephone}
                      onChange={gererSaisieTelephone}
                      className="w-full p-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="col-span-5">
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Numéro CNI</label>
                  <input
                    type="text"
                    value={nouveauParticipant.numero_cni}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, numero_cni: e.target.value.toUpperCase() })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                  />
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

              <div className="space-y-1.5 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                <div className="flex justify-between items-center">
                  <label className="block font-black text-[10px] uppercase text-cyan-300">
                    🎯 Participation aux Cycles & Nombre de parts *
                  </label>
                  <button
                    type="button"
                    onClick={toutCocherOuDecocherCycles}
                    className="bg-cyan-700 hover:bg-cyan-600 text-white font-black px-2 py-0.5 rounded text-[9px] uppercase shadow transition cursor-pointer border border-cyan-400"
                  >
                    {tousCochesGlobal ? '🔄 Tout décocher' : '✅ Tout cocher'}
                  </button>
                </div>
                
                <div className="space-y-1 bg-slate-900/80 p-2 rounded-lg border border-cyan-400/40">
                  {cyclesDisponibles.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-2">Aucun cycle créé.</p>
                  ) : (
                    cyclesDisponibles.map((cycle) => {
                      const estCoche = nouveauParticipant.cyclesSelectionnes[cycle.id] !== undefined;
                      const nbParts = nouveauParticipant.cyclesSelectionnes[cycle.id] || 1;
                      return (
                        <div key={cycle.id} className="flex items-center justify-between p-1.5 rounded bg-white/5 border border-cyan-400/30 hover:bg-white/10 transition">
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={estCoche}
                              onChange={() => basculerCycleSelection(cycle.id)}
                              className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="font-black text-xs uppercase text-white truncate">
                              {cycle.nom_cycle || cycle.libelle} <span className="text-[9px] text-cyan-300 font-normal">({cycle.frequence})</span>
                            </span>
                          </label>

                          {estCoche && (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[9px] text-cyan-200 font-bold">Parts :</span>
                              <input
                                type="number"
                                min="1"
                                value={nbParts}
                                onChange={(e) => modifierPartsCycle(cycle.id, e.target.value)}
                                className="w-14 p-1 rounded bg-slate-950 text-white font-mono font-bold text-center border border-cyan-400 text-xs"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-cyan-400/40">
                <div>
                  {participantEnEdition && (
                    <button 
                      type="button" 
                      onClick={() => supprimerParticipant(participantEnEdition)}
                      disabled={aDejaCotise}
                      title={aDejaCotise ? 'Suppression impossible : ce membre a déjà effectué des cotisations.' : 'Supprimer le membre'}
                      className={`font-black px-2.5 py-1 rounded text-[10px] shadow transition ${aDejaCotise ? 'bg-slate-600 text-slate-300 opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white cursor-pointer border border-red-400'}`}
                    >
                      {aDejaCotise ? '🔒 Cotisations existantes (Bloqué)' : '🗑️ Supprimer'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={fermerModal} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-1 rounded text-[10px] cursor-pointer border border-cyan-400/40">
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    disabled={enTrainDeSauvegarder || (participantEnEdition && !aDesModifications())} 
                    className={`font-black px-4 py-1 rounded text-[10px] shadow transition ${
                      (participantEnEdition && !aDesModifications()) || enTrainDeSauvegarder
                        ? 'bg-slate-600 text-slate-300 opacity-50 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer border border-emerald-400'
                    }`}
                  >
                    {enTrainDeSauvegarder ? 'Enregistrement...' : (participantEnEdition ? 'Mettre à jour' : 'Enregistrer')}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {modalRoleOuverte && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.4)] border border-cyan-400 p-4 space-y-3 ${isDarkMode ? 'bg-[#0f1d3e] text-white' : 'bg-white text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-2 border-cyan-400/40">
              <h5 className="font-black text-xs uppercase text-cyan-400">🛡️ Sélectionner un Rôle</h5>
              <button type="button" onClick={() => setModalRoleOuverte(false)} className="text-cyan-300 hover:text-white font-bold text-sm cursor-pointer">✖</button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {listeRolesComplet.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Aucun rôle enregistré dans ce module.</p>
              ) : (
                listeRolesComplet.map((r, index) => {
                  const nomR = r.nom_role || r;
                  const descR = r.description || 'Rôle standard de la tontine.';
                  const estActif = nouveauParticipant.libelle_role === nomR;
                  return (
                    <div 
                      key={r.id || index}
                      onClick={() => {
                        setNouveauParticipant({ ...nouveauParticipant, libelle_role: nomR });
                        setModalRoleOuverte(false);
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col gap-0.5 ${
                        estActif ? 'bg-cyan-600/30 border-cyan-400 text-white' : 'bg-slate-900/60 border-cyan-400/30 hover:bg-cyan-500/10'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs uppercase text-cyan-300">👑 {nomR}</span>
                        {estActif && <span className="text-cyan-400 font-bold text-xs">✓ Sélectionné</span>}
                      </div>
                      <span className="text-[10px] text-slate-300">{descR}</span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-cyan-400/40">
              <button type="button" onClick={() => setModalRoleOuverte(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-1.5 rounded-lg text-[10px] cursor-pointer border border-cyan-400/40">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCycleOuverte && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.4)] border border-cyan-400 p-4 space-y-3 ${isDarkMode ? 'bg-[#0f1d3e] text-white' : 'bg-white text-slate-900'}`}>
            <div className="flex justify-between items-center border-b pb-2 border-cyan-400/40">
              <h5 className="font-black text-xs uppercase text-cyan-300">🎯 CHOISIR UN CYCLE</h5>
              <button type="button" onClick={() => setModalCycleOuverte(false)} className="text-cyan-300 hover:text-white font-bold text-sm cursor-pointer">✖</button>
            </div>
            <div className="space-y-2 pr-1">
              <div
                onClick={() => {
                  setCycleFiltreSelectionne(null);
                  setModalCycleOuverte(false);
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                  !cycleFiltreSelectionne ? 'bg-cyan-950 text-cyan-200 font-bold border-cyan-400' : 'bg-slate-900/60 border-cyan-400/30 hover:bg-cyan-500/10'
                }`}
              >
                <span className="uppercase text-xs">🌟 TOUS LES CYCLES (AFFICHER TOUT)</span>
                {!cycleFiltreSelectionne && <span className="text-cyan-400 font-bold text-xs">✓ Actif</span>}
              </div>

              {cyclesDisponibles.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Aucun cycle enregistré.</p>
              ) : (
                cyclesDisponibles.map((cycle) => {
                  const estActif = cycleFiltreSelectionne === cycle.id;
                  const nomC = cycle.nom_cycle || cycle.libelle || `Cycle #${cycle.id}`;
                  return (
                    <div
                      key={cycle.id}
                      onClick={() => {
                        setCycleFiltreSelectionne(cycle.id);
                        setModalCycleOuverte(false);
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col gap-0.5 ${
                        estActif ? 'bg-cyan-950 text-cyan-200 font-bold border-cyan-400' : 'bg-slate-900/60 border-cyan-400/30 hover:bg-cyan-500/10'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs uppercase text-cyan-300">🎯 {nomC}</span>
                        {estActif && <span className="text-cyan-400 font-bold text-xs">✓ Sélectionné</span>}
                      </div>
                      {cycle.frequence && <span className="text-[10px] text-slate-400">Fréquence : {cycle.frequence}</span>}
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-cyan-400/40">
              <button type="button" onClick={() => setModalCycleOuverte(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-1.5 rounded-lg text-[10px] cursor-pointer border border-cyan-400/40">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}