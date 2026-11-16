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

export default function GestionTontineParticipants({ entrepriseId = '4TS-290136', entrepriseNom = 'ISMA LOGISTIQUE', isDarkMode = false }) {
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

  // États pour la modale de contact rapide (appel, whatsapp, sms)
  const [modalContactOuverte, setModalContactOuverte] = useState(false);
  const [contactSelectionne, setContactSelectionne] = useState(null);

  // États pour le choix de la tontine au tirage
  const [cycleTirageSelectionne, setCycleTirageSelectionne] = useState(null);
  const [modalChoixCycleTirageOuverte, setModalChoixCycleTirageOuverte] = useState(false);

  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [participantEnEdition, setParticipantEnEdition] = useState(null);
  const [aDejaCotise, setADejaCotise] = useState(false);
  const [donneesInitialesModal, setDonneesInitialesModal] = useState(null);

  // États pour le tri
  const [triPar, setTriPar] = useState('nom'); // 'nom' | 'role' | 'statut'
  const [ordreAsc, setOrdreAsc] = useState(true);

  // États pour la roue et le tirage
  const [titreTirage, setTitreTirage] = useState(`TIRAGE DU ${new Date().toLocaleDateString()}`);
  const [classementProvisoire, setClassementProvisoire] = useState([]);
  const [tirageEstValide, setTirageEstValide] = useState(false);
  const [rotationRoue, setRotationRoue] = useState(0);
  const [enTrainDeTourner, setEnTrainDeTourner] = useState(false);
  const [historiqueTirages, setHistoriqueTirages] = useState([]);

  const fileInputRef = useRef(null);

  // Génération automatique de l'identifiant unique basé sur l'entreprise (ex: ISMA-601938)
  const genererCodeMembreUnique = (nomEnt = entrepriseNom) => {
    const clean = (nomEnt || 'ISMA').replace(/[^a-zA-Z]/g, '').toUpperCase();
    const prefix = clean.length >= 4 ? clean.substring(0, 4) : clean.padEnd(4, 'X');
    const aleatoire = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${aleatoire}`;
  };

  const [nouveauParticipant, setNouveauParticipant] = useState({
    identifiant_unique: '',
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
      id_unique: nouveauParticipant.identifiant_unique,
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
    const identifiantFinal = nouveauParticipant.identifiant_unique;

    setEnTrainDeSauvegarder(true);
    try {
      const basePayload = {
        id_entreprise: entrepriseId || '4TS-290136',
        identifiant_unique: identifiantFinal,
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
          .eq('id_entreprise', entrepriseId);

        if (participantEnEdition.identifiant_unique) {
          deleteQuery = deleteQuery.eq('identifiant_unique', participantEnEdition.identifiant_unique);
        } else {
          deleteQuery = deleteQuery.eq('nom_participant', participantEnEdition.nom_participant);
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
        alert('✅ Membre et ses cycles mis à jour avec succès (Identifiant unique permanent préservé) !');
      } else {
        const payloadsInsertion = cyclesCoches.map(idCycle => ({
          ...basePayload,
          id_cycle: parseInt(idCycle),
          nombre_parts: parseInt(nouveauParticipant.cyclesSelectionnes[idCycle]) || 1,
        }));

        const { error } = await supabase.from('tontine_participants').insert(payloadsInsertion);
        if (error) throw error;
        alert(`✅ Membre inscrit aux cycles sélectionnés avec succès (Identifiant : ${identifiantFinal}) !`);
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
        .eq('id_entreprise', entrepriseId);

      if (p.identifiant_unique) {
        query = query.eq('identifiant_unique', p.identifiant_unique);
      } else {
        query = query.eq('nom_participant', p.nom_participant || p.nom_complet);
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
      item => (p.identifiant_unique && item.identifiant_unique === p.identifiant_unique) ||
              (item.nom_participant === p.nom_participant || item.nom_complet === p.nom_complet)
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
      identifiant_unique: p.identifiant_unique || genererCodeMembreUnique(entrepriseNom),
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
      id_unique: formulaireData.identifiant_unique,
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
      identifiant_unique: '',
      nom_participant: '', prenom: '', pays: 'cmr', telephone: '', lieu_residence: '', numero_cni: '',
      libelle_role: 'ADHERANT', statut: 'ACTIF', date_adhesion: new Date().toISOString().split('T')[0], photo: '',
      cyclesSelectionnes: {}
    });
  };

  const mapMembres = new Map();
  participants.forEach(p => {
    const cle = p.identifiant_unique || `${(p.nom_participant || p.nom_complet || '').trim().toUpperCase()}_${(p.prenom || '').trim().toUpperCase()}_${(p.telephone || 'N/A').trim()}`;
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
    const texte = `${m.identifiant_unique || ''} ${nomP} ${m.prenom || ''} ${m.telephone || ''} ${m.libelle_role || ''}`.toLowerCase();
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
    }
    if (valA < valB) return ordreAsc ? -1 : 1;
    if (valA > valB) return ordreAsc ? 1 : -1;
    return 0;
  });

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
  
  // Styles adaptatifs (Gris - Rouge - Noir)
  const bgPrincipal = isDarkMode ? 'bg-[#050b18] text-slate-100' : 'bg-slate-100 text-slate-900';
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-white text-slate-900 border-slate-300';
  const labelColor = isDarkMode ? 'text-slate-200' : 'text-slate-800';
  const cardBg = isDarkMode ? 'bg-[#0b1329] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const tousCochesGlobal = cyclesDisponibles.length > 0 && cyclesDisponibles.every(c => nouveauParticipant.cyclesSelectionnes[c.id] !== undefined);

  return (
    <div className={`w-full h-full space-y-2.5 font-sans text-xs relative ${bgPrincipal}`}>
      
      {vueActuelle === 'liste' && (
        <div className="space-y-2.5 w-full">
          
          <div className={`flex items-center px-2 py-1.5 rounded-xl border gap-2 w-full ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-300 shadow-2xs'}`}>
            <button
              type="button"
              onClick={() => {
                setParticipantEnEdition(null);
                setADejaCotise(false);
                setDonneesInitialesModal(null);
                setNouveauParticipant({
                  identifiant_unique: genererCodeMembreUnique(entrepriseNom),
                  nom_participant: '', prenom: '', pays: 'cmr', telephone: '', lieu_residence: '', numero_cni: '',
                  libelle_role: 'ADHERANT', statut: 'ACTIF', date_adhesion: new Date().toISOString().split('T')[0], photo: '',
                  cyclesSelectionnes: {}
                });
                setAfficherModal(true);
              }}
              className="bg-red-600 hover:bg-red-500 text-white font-black px-2.5 py-1.5 rounded-lg transition shadow text-[10px] uppercase flex items-center justify-center gap-1 flex-1 cursor-pointer border border-red-500"
            >
              ➕ Nouveau membre
            </button>

            <button
              type="button"
              onClick={() => {
                setVueActuelle('roue');
                setSousVueRoue('nouveau');
              }}
              className={`font-black px-2.5 py-1.5 rounded-lg transition shadow text-[10px] uppercase flex items-center justify-center gap-1 flex-1 cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'}`}
            >
              🎡 Roue de tirage
            </button>
          </div>

          <div className={`flex flex-wrap gap-2 items-center justify-between p-2 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-2xs'}`}>
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="🔍 Rechercher par ID, nom, téléphone..."
              className={`flex-1 min-w-[180px] border rounded-lg px-2.5 py-1.5 font-bold text-xs focus:outline-none ${inputBg}`}
            />
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setModalCycleOuverte(true)}
                className={`px-2.5 py-1.5 rounded-lg font-black text-[10px] uppercase flex items-center gap-1.5 cursor-pointer transition shadow-2xs border ${
                  cycleFiltreSelectionne 
                    ? (isDarkMode ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-200 text-slate-900 border-slate-400') 
                    : (isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100')
                }`}
              >
                🎯 {cycleFiltreSelectionne ? `CYCLE : ${(cyclesDisponibles.find(c => c.id === cycleFiltreSelectionne)?.nom_cycle || cyclesDisponibles.find(c => c.id === cycleFiltreSelectionne)?.libelle || 'FILTRÉ')}` : 'FILTRER PAR CYCLE'}
              </button>

              {cycleFiltreSelectionne && (
                <button
                  type="button"
                  onClick={() => setCycleFiltreSelectionne(null)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition border ${isDarkMode ? 'bg-red-950/60 hover:bg-red-900 text-red-300 border-red-800' : 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'}`}
                  title="Effacer le filtre cycle"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className={`overflow-x-auto border rounded-xl shadow-2xs w-full ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'}`}>
            <table className="w-full text-left text-xs">
              <thead className={`border-b uppercase text-[9px] font-black select-none ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                <tr>
                  <th className="p-2.5 text-center w-12">#</th>
                  <th className="p-2.5">ID UNIQUE</th>
                  <th onClick={() => gererTri('nom')} className="p-2.5 cursor-pointer hover:opacity-80 transition">
                    {triPar === 'nom' ? (ordreAsc ? '🔼 ' : '🔽 ') : ''}NOM & PRÉNOM
                  </th>
                  <th className="p-2.5">TÉLÉPHONE</th>
                  <th onClick={() => gererTri('statut')} className="p-2.5 text-center cursor-pointer hover:opacity-80 transition">
                    {triPar === 'statut' ? (ordreAsc ? '🔼 ' : '🔽 ') : ''}STATUT
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y text-[10px] ${isDarkMode ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-900'}`}>
                {chargement ? (
                  <tr><td colSpan="5" className="p-4 text-center animate-pulse text-slate-400">Chargement...</td></tr>
                ) : membresFiltres.length === 0 ? (
                  <tr><td colSpan="5" className="p-4 text-center text-slate-400 font-bold">Aucun participant trouvé pour ce filtre.</td></tr>
                ) : (
                  membresFiltres.map((p, index) => {
                    const nomAffiche = p.nom_participant || p.nom_complet || 'Membre';
                    const estInactif = p.statut === 'INACTIF';
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => ouvrirEdition(p)} 
                        className={`cursor-pointer transition select-none ${estInactif ? (isDarkMode ? 'bg-slate-950/60 text-slate-500 opacity-50' : 'bg-slate-200/60 text-slate-400 opacity-60') : (isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100')}`}
                        title="Cliquez pour ouvrir et modifier le membre"
                      >
                        <td className={`p-2.5 text-center font-mono font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{index + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-red-600">{p.identifiant_unique || 'N/A'}</td>
                        <td className="p-2.5 font-black uppercase">{nomAffiche} {p.prenom || ''}</td>
                        <td className="p-2.5 font-mono font-bold">
                          {p.telephone && p.telephone !== 'N/A' ? (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setContactSelectionne(p);
                                setModalContactOuverte(true);
                              }}
                              className={`underline cursor-pointer px-2 py-0.5 rounded border ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'}`}
                              title="Cliquer pour appeler, envoyer un WhatsApp ou un SMS"
                            >
                              {p.telephone}
                            </span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`font-black px-2 py-0.5 rounded text-[8px] uppercase border ${estInactif ? (isDarkMode ? 'bg-red-950 text-red-300 border-red-800' : 'bg-red-100 text-red-700 border-red-300') : (isDarkMode ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-300')}`}>
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
        <div className={`w-full space-y-2.5 text-center border p-3 rounded-xl shadow-2xs ${isDarkMode ? 'bg-[#0b1329] border-slate-800' : 'bg-white border-slate-300'}`}>
          
          <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={() => {
                setVueActuelle('liste');
                setTirageSelectionneDetail(null);
              }}
              className={`font-black px-3 py-1.5 rounded-lg text-[10px] uppercase transition flex items-center gap-1 shadow cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'}`}
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
                className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition cursor-pointer ${sousVueRoue === 'nouveau' && !tirageSelectionneDetail ? 'bg-red-600 text-white shadow border border-red-500' : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700' : 'bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300')}`}
              >
                🎰 Lancer un nouveau tirage
              </button>
              <button
                type="button"
                onClick={() => setSousVueRoue('historique')}
                className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition cursor-pointer ${sousVueRoue === 'historique' || tirageSelectionneDetail ? 'bg-slate-800 text-white shadow border border-slate-700' : (isDarkMode ? 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800' : 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300')}`}
              >
                📚 Liste des tirages validés ({historiqueTirages.length})
              </button>
            </div>
          </div>

          {sousVueRoue === 'nouveau' && !tirageSelectionneDetail && (
            <div className="space-y-2.5 animate-fadeIn w-full">
              <div className={`w-full space-y-2 text-left p-2.5 rounded-lg border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <label className={`block text-[10px] font-black uppercase ${labelColor}`}>📌 Titre / Nom du Tirage :</label>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setModalChoixCycleTirageOuverte(true)}
                      disabled={tirageEstValide || enTrainDeTourner}
                      className={`font-black px-2.5 py-1 rounded-lg text-[9px] uppercase border flex items-center gap-1 cursor-pointer transition disabled:opacity-50 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'}`}
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
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition border ${isDarkMode ? 'bg-red-950/60 hover:bg-red-900 text-red-300 border-red-800' : 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'}`}
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
                  className={`w-full p-2 rounded-lg border text-xs font-bold uppercase disabled:opacity-60 ${inputBg}`}
                />
                
                {cycleTirageSelectionne && (
                  <p className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    💡 Seuls les membres inscrits à <strong>{cycleTirageSelectionne.nom_cycle || cycleTirageSelectionne.libelle}</strong> ({participantsActifsUniques.length} éligibles) participeront à ce tirage.
                  </p>
                )}
              </div>

              {participantsActifsUniques.length === 0 ? (
                <div className={`py-6 rounded-lg border w-full ${isDarkMode ? 'bg-slate-900/40 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
                  <p className="font-bold">⚠️ Aucun membre actif n'est inscrit à cette tontine (ou aucun cycle sélectionné).</p>
                  <p className="text-[10px] mt-1 text-slate-500">Veuillez sélectionner un cycle valide ou vous assurer que des membres y sont inscrits.</p>
                </div>
              ) : (
                <>
                  <div className="relative w-40 h-40 mx-auto flex items-center justify-center my-2">
                    <div 
                      className={`w-full h-full rounded-full border-4 border-slate-400 relative overflow-hidden transition-transform ease-out duration-4000 flex items-center justify-center ${isDarkMode ? 'bg-slate-900' : 'bg-white shadow'}`}
                      style={{ transform: `rotate(${rotationRoue}deg)` }}
                    >
                      {participantsActifsUniques.map((p, index, arr) => {
                        const angle = (index / arr.length) * 360;
                        return (
                          <div
                            key={p.id}
                            className={`absolute w-full h-full text-center font-black text-[9px] pt-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                            style={{ transform: `rotate(${angle}deg)`, transformOrigin: 'center' }}
                          >
                            <span className={`px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-black/70 text-slate-200' : 'bg-slate-200 text-slate-800'}`}>{index + 1}. {p.nom_participant || p.nom_complet}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className={`absolute -top-3 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-[18px] z-10 drop-shadow-lg ${isDarkMode ? 'border-t-slate-300' : 'border-t-slate-800'}`}></div>
                    <div className={`absolute w-6 h-6 rounded-full border-2 shadow-md z-20 ${isDarkMode ? 'bg-slate-900 border-slate-400' : 'bg-white border-slate-600'}`}></div>
                  </div>

                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={lancerRoueCollectif}
                      disabled={enTrainDeTourner || tirageEstValide}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black px-5 py-2 rounded-xl text-xs shadow-lg uppercase transition transform active:scale-95 cursor-pointer border border-red-500"
                    >
                      {enTrainDeTourner ? '🌀 La roue tourne...' : (classementProvisoire.length > 0 ? '🔄 Relancer la Roue' : '🎰 Lancer le Tirage')}
                    </button>
                  </div>
                </>
              )}

              {classementProvisoire.length > 0 && !enTrainDeTourner && (
                <div className={`space-y-2.5 pt-1 text-left w-full p-3 rounded-lg border shadow-2xs animate-fadeIn ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div>
                      <h5 className={`font-black text-xs uppercase ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{titreTirage}</h5>
                      <p className={`text-[9px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {tirageEstValide ? '🔒 Tirage verrouillé et enregistré' : '⚠️ Liste Provisoire (Non validée)'}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${tirageEstValide ? (isDarkMode ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-300') : (isDarkMode ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-800 border-amber-300')}`}>
                      {tirageEstValide ? 'Validé' : 'En attente'}
                    </span>
                  </div>
                  
                  <div className={`overflow-x-auto rounded-lg border w-full ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'}`}>
                    <table className="w-full text-left text-xs">
                      <thead className={`uppercase text-[9px] font-black border-b ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-slate-200 text-slate-800 border-slate-300'}`}>
                        <tr>
                          <th className="p-2 text-center w-16">Ordre</th>
                          <th className="p-2">Nom des Membres</th>
                          <th className="p-2 text-right">Rôle / Poste</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y text-[10px] ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                        {classementProvisoire.map((membre, idx) => (
                          <tr key={membre.id} className={idx === 0 ? (isDarkMode ? 'bg-slate-800 font-bold' : 'bg-slate-200 font-bold') : (isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-100')}>
                            <td className="p-2 text-center font-mono font-black">
                              {idx === 0 ? '🥇 1er' : `${idx + 1}`}
                            </td>
                            <td className="p-2 uppercase font-extrabold">
                              {membre.nom_participant || membre.nom_complet} {membre.prenom || ''}
                            </td>
                            <td className="p-2 text-right">
                              <span className={`border px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-800 border-slate-300'}`}>
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
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 rounded-xl text-xs uppercase shadow transition flex items-center justify-center gap-1 cursor-pointer border border-emerald-500"
                      >
                        ✅ Valider et Verrouiller le Tirage
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={lancerNouveauTirage}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-2 rounded-xl text-xs uppercase shadow transition flex items-center justify-center gap-1 cursor-pointer border border-slate-700"
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
                <div className={`space-y-3 p-3 rounded-lg border shadow-2xs w-full ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div>
                      <h5 className={`font-black text-xs uppercase ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{tirageSelectionneDetail.titre}</h5>
                      <p className={`text-[9px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Enregistré le : {tirageSelectionneDetail.date}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTirageSelectionneDetail(null)}
                      className={`px-2 py-1 rounded text-[9px] font-bold cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'}`}
                    >
                      ⬅️ Retour à la liste
                    </button>
                  </div>

                  <div className={`overflow-x-auto rounded-lg border w-full ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'}`}>
                    <table className="w-full text-left text-xs">
                      <thead className={`uppercase text-[9px] font-black border-b ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-slate-200 text-slate-800 border-slate-300'}`}>
                        <tr>
                          <th className="p-2 text-center w-16">Ordre</th>
                          <th className="p-2">Nom des Membres</th>
                          <th className="p-2 text-right">Rôle / Poste</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y text-[10px] ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                        {tirageSelectionneDetail.resultats.map((membre, idx) => (
                          <tr key={membre.id || idx} className={idx === 0 ? (isDarkMode ? 'bg-slate-800 font-bold' : 'bg-slate-200 font-bold') : (isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-100')}>
                            <td className="p-2 text-center font-mono font-black">
                              {idx === 0 ? '🥇 1er' : `${idx + 1}`}
                            </td>
                            <td className="p-2 uppercase font-extrabold">
                              {membre.nom_participant || membre.nom_complet} {membre.prenom || ''}
                            </td>
                            <td className="p-2 text-right">
                              <span className={`border px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-800 border-slate-300'}`}>
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
                  <h5 className={`font-black text-xs uppercase ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    📚 Liste des Tirages Validés ({historiqueTirages.length})
                  </h5>
                  
                  {historiqueTirages.length === 0 ? (
                    <p className={`text-center py-8 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Aucun tirage validé pour le moment.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1 w-full">
                      {historiqueTirages.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setTirageSelectionneDetail(t)}
                          className={`p-2.5 rounded-lg space-y-1 cursor-pointer transition shadow w-full border ${isDarkMode ? 'bg-slate-900 hover:bg-slate-800 border-slate-800' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-black text-xs uppercase">📌 {t.titre}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-300'}`}>Consulter ➡️</span>
                              <button
                                type="button"
                                onClick={(e) => supprimerTirage(e, t.id)}
                                className="bg-red-600 hover:bg-red-500 text-white px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer border border-red-500"
                                title="Supprimer ce tirage"
                              >
                                🗑️ Supprimer
                              </button>
                            </div>
                          </div>
                          <div className={`flex justify-between text-[9px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            <span>📅 {t.date}</span>
                            <span className="font-mono">🥇 Gagnant : <strong className="uppercase">{t.resultats[0]?.nom_participant || t.resultats[0]?.nom_complet}</strong></span>
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
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-4 space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
            <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h5 className={`font-black text-xs uppercase ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>🎯 CHOISIR UNE TONTINE BÉNÉFICIAIRE</h5>
              <button type="button" onClick={() => setModalChoixCycleTirageOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
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
                  !cycleTirageSelectionne 
                    ? (isDarkMode ? 'bg-slate-800 text-white font-bold border-slate-600' : 'bg-slate-200 text-slate-900 font-bold border-slate-400') 
                    : (isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100')
                }`}
              >
                <span className="uppercase text-xs">🌟 AUCUN CYCLE / TIRAGE LIBRE</span>
                {!cycleTirageSelectionne && <span className="font-bold text-xs">✓ Actif</span>}
              </div>

              {cyclesDisponibles.filter(c => (c.type_cycle || 'BOUFFER') === 'BOUFFER').length === 0 ? (
                <p className={`text-xs text-center py-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Aucune tontine bénéficiaire enregistrée.</p>
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
                        estActif 
                          ? (isDarkMode ? 'bg-slate-800 text-white font-bold border-slate-600' : 'bg-slate-200 text-slate-900 font-bold border-slate-400') 
                          : (isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100')
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs uppercase">🎯 {nomC}</span>
                        {estActif && <span className="font-bold text-xs">✓ Sélectionné</span>}
                      </div>
                      {cycle.montant_cotisation > 0 && (
                        <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Montant : {cycle.montant_cotisation.toLocaleString()} FCFA ({cycle.frequence})</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setModalChoixCycleTirageOuverte(false)} className={`font-bold px-4 py-1.5 rounded-lg text-[10px] cursor-pointer border ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'}`}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONTACT (APPEL, WHATSAPP, SMS) */}
      {modalContactOuverte && contactSelectionne && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-4 space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
            <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h5 className={`font-black text-xs uppercase ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>📱 CONTACTER LE MEMBRE</h5>
              <button type="button" onClick={() => setModalContactOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
            </div>
            <div className="text-center py-2">
              <p className="font-black uppercase text-sm">{contactSelectionne.nom_participant || contactSelectionne.nom_complet} {contactSelectionne.prenom || ''}</p>
              <p className="text-xs font-mono font-bold mt-1">{contactSelectionne.telephone}</p>
            </div>
            <div className="space-y-2">
              <a
                href={`tel:${contactSelectionne.telephone}`}
                className="block w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs uppercase shadow transition cursor-pointer border border-emerald-500"
              >
                📞 Effectuer un appel direct
              </a>
              <a
                href={`https://wa.me/${contactSelectionne.telephone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-emerald-700 hover:bg-emerald-600 text-white font-black py-2.5 rounded-xl text-xs uppercase shadow transition cursor-pointer border border-emerald-600"
              >
                💬 Envoyer un message WhatsApp
              </a>
              <a
                href={`sms:${contactSelectionne.telephone}`}
                className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-white font-black py-2.5 rounded-xl text-xs uppercase shadow transition cursor-pointer border border-slate-700"
              >
                ✉️ Envoyer un SMS
              </a>
            </div>
            <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setModalContactOuverte(false)} className={`font-bold px-4 py-1.5 rounded-lg text-[10px] cursor-pointer border ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'}`}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE D'OUVERTURE / ÉDITION DU MEMBRE */}
      {afficherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl border p-4 space-y-3 max-h-[95vh] overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
            
            <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h4 className={`font-black uppercase text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                {participantEnEdition ? '✏️ Détails et modification du membre' : '➕ Ajouter un membre & lier aux cycles'}
              </h4>
              <button type="button" onClick={fermerModal} className="font-bold text-sm cursor-pointer">✖</button>
            </div>

            <form onSubmit={enregistrerParticipant} className="space-y-2.5 w-full">
              
              <input type="file" ref={fileInputRef} onChange={gererSelectionImage} accept="image/*" className="hidden" />
              
              {/* IDENTIFIANT UNIQUE PERMANENT */}
              <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'}`}>
                <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Identifiant Unique Permanent (Code Membre) *</label>
                <input
                  type="text"
                  disabled
                  value={nouveauParticipant.identifiant_unique}
                  className={`w-full p-2 rounded-lg border text-xs font-mono font-bold uppercase cursor-not-allowed opacity-90 tracking-wider ${isDarkMode ? 'bg-slate-900 text-red-400 border-slate-700' : 'bg-slate-200 text-red-600 border-slate-300'}`}
                />
                <span className="text-[8px] text-slate-500 mt-0.5 block">Cet identifiant unique est généré automatiquement à partir de l'entreprise ({entrepriseNom}) et reste inchangeable.</span>
              </div>

              {/* SECTION PHOTO & NOMS */}
              <div className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="col-span-2 flex items-center justify-center">
                  <div 
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center overflow-hidden cursor-pointer relative shrink-0 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-slate-200 border-slate-400 text-slate-700'}`}
                    title="Changer la photo"
                  >
                    {nouveauParticipant.photo ? (
                      <img src={nouveauParticipant.photo} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm">📷</span>
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
              <div className={`grid grid-cols-2 gap-2 p-2 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Rôle / Poste</label>
                  <button
                    type="button"
                    onClick={() => setModalRoleOuverte(true)}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold flex justify-between items-center cursor-pointer ${inputBg}`}
                  >
                    <span className="truncate uppercase font-black">👑 {nouveauParticipant.libelle_role || 'SÉLECTIONNER'}</span>
                    <span className="text-[10px] font-bold">▼</span>
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
                  <div className={`flex items-center border rounded-lg overflow-hidden ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white'}`}>
                    <span className={`px-1.5 py-1.5 text-[9px] font-black border-r ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-200 text-slate-900 border-slate-300'}`}>{paysActuelObj.indicatif}</span>
                    <input
                      type="text"
                      maxLength={paysActuelObj.longueur}
                      value={nouveauParticipant.telephone}
                      onChange={gererSaisieTelephone}
                      className={`w-full p-1.5 text-xs font-mono font-bold focus:outline-none ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}
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

              <div className={`space-y-1.5 p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                <div className="flex justify-between items-center">
                  <label className={`block font-black text-[10px] uppercase ${labelColor}`}>
                    🎯 Participation aux Cycles & Nombre de parts *
                  </label>
                  <button
                    type="button"
                    onClick={toutCocherOuDecocherCycles}
                    className={`font-black px-2 py-0.5 rounded text-[9px] uppercase shadow transition cursor-pointer border ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'}`}
                  >
                    {tousCochesGlobal ? '🔄 Tout décocher' : '✅ Tout cocher'}
                  </button>
                </div>
                
                <div className={`space-y-1 p-2 rounded-lg border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'}`}>
                  {cyclesDisponibles.length === 0 ? (
                    <p className={`text-[10px] text-center py-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Aucun cycle créé.</p>
                  ) : (
                    cyclesDisponibles.map((cycle) => {
                      const estCoche = nouveauParticipant.cyclesSelectionnes[cycle.id] !== undefined;
                      const nbParts = nouveauParticipant.cyclesSelectionnes[cycle.id] || 1;
                      return (
                        <div key={cycle.id} className={`flex items-center justify-between p-1.5 rounded border transition ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={estCoche}
                              onChange={() => basculerCycleSelection(cycle.id)}
                              className="rounded accent-red-600 w-4 h-4 cursor-pointer"
                            />
                            <span className="font-black text-xs uppercase truncate">
                              {cycle.nom_cycle || cycle.libelle} <span className="text-[9px] text-slate-500 font-normal">({cycle.frequence})</span>
                            </span>
                          </label>

                          {estCoche && (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-[9px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Parts :</span>
                              <input
                                type="number"
                                min="1"
                                value={nbParts}
                                onChange={(e) => modifierPartsCycle(cycle.id, e.target.value)}
                                className={`w-14 p-1 rounded font-mono font-bold text-center border text-xs ${inputBg}`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className={`flex justify-between items-center pt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <div>
                  {participantEnEdition && (
                    <button 
                      type="button" 
                      onClick={() => supprimerParticipant(participantEnEdition)}
                      disabled={aDejaCotise}
                      title={aDejaCotise ? 'Suppression impossible : ce membre a déjà effectué des cotisations.' : 'Supprimer le membre'}
                      className={`font-black px-2.5 py-1 rounded text-[10px] shadow transition ${aDejaCotise ? 'bg-slate-600 text-slate-300 opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white cursor-pointer border border-red-500'}`}
                    >
                      {aDejaCotise ? '🔒 Cotisations existantes (Bloqué)' : '🗑️ Supprimer'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={fermerModal} className={`font-bold px-3 py-1 rounded text-[10px] cursor-pointer border ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'}`}>
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    disabled={enTrainDeSauvegarder || (participantEnEdition && !aDesModifications())} 
                    className={`font-black px-4 py-1 rounded text-[10px] shadow transition ${
                      (participantEnEdition && !aDesModifications()) || enTrainDeSauvegarder
                        ? 'bg-slate-600 text-slate-300 opacity-50 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer border border-emerald-500'
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
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-4 space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
            <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h5 className={`font-black text-xs uppercase ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>🛡️ Sélectionner un Rôle</h5>
              <button type="button" onClick={() => setModalRoleOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {listeRolesComplet.length === 0 ? (
                <p className={`text-xs text-center py-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Aucun rôle enregistré dans ce module.</p>
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
                        estActif 
                          ? (isDarkMode ? 'bg-slate-800 border-slate-600 text-white font-bold' : 'bg-slate-200 border-slate-400 text-slate-900 font-bold') 
                          : (isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100')
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs uppercase">👑 {nomR}</span>
                        {estActif && <span className="font-bold text-xs">✓ Sélectionné</span>}
                      </div>
                      <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{descR}</span>
                    </div>
                  );
                })
              )}
            </div>
            <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setModalRoleOuverte(false)} className={`font-bold px-4 py-1.5 rounded-lg text-[10px] cursor-pointer border ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'}`}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCycleOuverte && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-4 space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
            <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h5 className={`font-black text-xs uppercase ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>🎯 CHOISIR UN CYCLE</h5>
              <button type="button" onClick={() => setModalCycleOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
            </div>
            <div className="space-y-2 pr-1">
              <div
                onClick={() => {
                  setCycleFiltreSelectionne(null);
                  setModalCycleOuverte(false);
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                  !cycleFiltreSelectionne 
                    ? (isDarkMode ? 'bg-slate-800 text-white font-bold border-slate-600' : 'bg-slate-200 text-slate-900 font-bold border-slate-400') 
                    : (isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100')
                }`}
              >
                <span className="uppercase text-xs">🌟 TOUS LES CYCLES (AFFICHER TOUT)</span>
                {!cycleFiltreSelectionne && <span className="font-bold text-xs">✓ Actif</span>}
              </div>

              {cyclesDisponibles.length === 0 ? (
                <p className={`text-xs text-center py-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Aucun cycle enregistré.</p>
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
                        estActif 
                          ? (isDarkMode ? 'bg-slate-800 text-white font-bold border-slate-600' : 'bg-slate-200 text-slate-900 font-bold border-slate-400') 
                          : (isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100')
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs uppercase">🎯 {nomC}</span>
                        {estActif && <span className="font-bold text-xs">✓ Sélectionné</span>}
                      </div>
                      {cycle.frequence && <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Fréquence : {cycle.frequence}</span>}
                    </div>
                  );
                })
              )}
            </div>
            <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setModalCycleOuverte(false)} className={`font-bold px-4 py-1.5 rounded-lg text-[10px] cursor-pointer border ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'}`}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}