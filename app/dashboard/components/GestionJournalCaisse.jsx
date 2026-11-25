'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { localSync } from '../../lib/localSync';

export default function GestionJournalCaisse({ entrepriseId = '4TS-234321', vueInitiale = 'saisie_operations', utilisateurActif = '' }) {
  const [modeSaisie, setModeSaisie] = useState('nouveau');
  const [sousOngletControle, setSousOngletControle] = useState('nouveau_controle');

  // --- RÉSOLUTION DYNAMIQUE DE L'UTILISATEUR CONNECTÉ (COHÉRENCE EN-TÊTE & TABLE) ---
  const [utilisateurConnecte, setUtilisateurConnecte] = useState(() => {
    if (utilisateurActif) return utilisateurActif.toUpperCase();
    if (typeof window !== 'undefined') {
      const userStored =
        localStorage.getItem('utilisateur_actif') ||
        localStorage.getItem('nom_utilisateur') ||
        localStorage.getItem('user_name') ||
        sessionStorage.getItem('utilisateur_actif') ||
        '';
      if (userStored) return userStored.toUpperCase();

      // Vérification du profil complet en cache ou de l'objet utilisateur connecté
      try {
        const profilCache = localStorage.getItem(`4ts_cache_profil_complet_${entrepriseId}`);
        if (profilCache) {
          const parsed = JSON.parse(profilCache);
          if (parsed?.nom) return String(parsed.nom).toUpperCase();
        }
        const sessionRaw = localStorage.getItem('utilisateur_connecte') || localStorage.getItem('utilisateurConnecte') || localStorage.getItem('user');
        if (sessionRaw) {
          if (sessionRaw.trim().startsWith('{')) {
            const parsed = JSON.parse(sessionRaw);
            const nomComplet = `${parsed?.nom_complet || parsed?.nom || ''} ${parsed?.prenom || ''}`.trim();
            if (nomComplet) return nomComplet.toUpperCase();
          } else {
            return sessionRaw.trim().toUpperCase();
          }
        }
      } catch (e) {}
    }
    return 'UTILISATEUR';
  });

  useEffect(() => {
    if (utilisateurActif) {
      setUtilisateurConnecte(utilisateurActif.toUpperCase());
    }
  }, [utilisateurActif]);

  // --- ÉTAT GLOBAL POUR LES MODALES DE NOTIFICATION ---
  const [modalNotification, setModalNotification] = useState(null);

  const afficherNotification = (titre, texte, type = 'info', onConfirm = null) => {
    setModalNotification({ titre, texte, type, onConfirm });
  };

  // --- LIMITES D'AFFICHAGE ---
  const [limiteHistorique, setLimiteHistorique] = useState(20);
  const [limiteGrandLivre, setLimiteGrandLivre] = useState(20);
  const [limiteJournal, setLimiteJournal] = useState(20);
  const [limiteEtatsCaisse, setLimiteEtatsCaisse] = useState(20);

  // --- MODALES DE SÉLECTION (CAISSE, COMPTE, TIERS, MOTIFS) ---
  const [modaleSelection, setModaleSelection] = useState(null); 
  const [rechercheModale, setRechercheModale] = useState('');
  const [nouveauMotifInput, setNouveauMotifInput] = useState('');
  const [motifsSauvegardes, setMotifsSauvegardes] = useState([]);
  
  // --- ÉTATS POUR LA CRÉATION AVANCÉE D'UN COMPTE (PLAN COMPTABLE) ---
  const [afficherFormulaireNouveauCompte, setAfficherFormulaireNouveauCompte] = useState(false);
  const [formNouveauCompte, setFormNouveauCompte] = useState({
    type_compte: 'CHARGE',
    code_compte: '605007',
    intitule: ''
  });

  // --- FILTRE CAISSE POUR L'HISTORIQUE ---
  const [caisseHistoriqueId, setCaisseHistoriqueId] = useState('');

  const ouvrirModaleSelection = (type) => {
    setRechercheModale('');
    setNouveauMotifInput('');
    setAfficherFormulaireNouveauCompte(false);
    setModaleSelection(type);
  };

  const fermerModaleSelection = () => {
    setModaleSelection(null);
    setRechercheModale('');
    setNouveauMotifInput('');
    setAfficherFormulaireNouveauCompte(false);
  };

  // --- CRÉATION COMPLÈTE D'UN COMPTE DEPUIS LA MODALE (ALIGNÉ AVEC TYPE_COMPTE) ---
  const enregistrerNouveauCompteComptable = async (e) => {
    if (e) e.preventDefault();
    const intituleClean = (formNouveauCompte.intitule || '').trim().toUpperCase();
    const codeClean = (formNouveauCompte.code_compte || '').trim().toUpperCase();
    const typeCompteClean = (formNouveauCompte.type_compte || 'CHARGE').trim().toUpperCase();

    if (!intituleClean) {
      afficherNotification('Champ requis', "Veuillez saisir l'intitulé du compte.", 'erreur');
      return;
    }
    if (!codeClean) {
      afficherNotification('Champ requis', "Veuillez saisir le numéro de code du compte.", 'erreur');
      return;
    }

    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        intitule_compte: intituleClean,
        code_compte: codeClean,
        type_compte: typeCompteClean
      };

      const { data, error } = await supabase.from('comptes_comptables').insert([payload]).select().single();
      if (error) throw error;

      if (data) {
        setComptes(prev => [...prev, data]);
        selectionnerCompteSaisie(data.id);
        afficherNotification('Succès', `Compte [${codeClean} - ${intituleClean}] créé et sélectionné avec succès !`, 'succes');
        setAfficherFormulaireNouveauCompte(false);
      }
    } catch (err) {
      afficherNotification('Erreur', 'Impossible de créer le compte : ' + err.message, 'erreur');
    }
  };

  // --- DATE DU JOUR PAR DÉFAUT ---
  const obtenirDateDuJour = () => {
    const d = new Date();
    const annee = d.getFullYear();
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    const jour = String(d.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  };

  const dateDuJourStr = obtenirDateDuJour();

  const obtenirPremierJourDuMois = () => {
    const d = new Date();
    const annee = d.getFullYear();
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    return `${annee}-${mois}-01`;
  };

  const obtenirDernierJourDuMois = () => {
    const d = new Date();
    const annee = d.getFullYear();
    const mois = d.getMonth() + 1;
    const dernierJour = new Date(annee, mois, 0).getDate();
    return `${annee}-${String(mois).padStart(2, '0')}-${String(dernierJour).padStart(2, '0')}`;
  };

  const premierJourMoisStr = obtenirPremierJourDuMois();
  const dernierJourMoisStr = obtenirDernierJourDuMois();

  const [dateDebutJournal, setDateDebutJournal] = useState(dateDuJourStr);
  const [dateFinJournal, setDateFinJournal] = useState(dateDuJourStr);
  const [caisseSelectionneeJournal, setCaisseSelectionneeJournal] = useState('');

  const [colonneTriJournal, setColonneTriJournal] = useState('created_at');
  const [ordreTriJournal, setOrdreTriJournal] = useState('asc');

  const [colonneTriGrandLivre, setColonneTriGrandLivre] = useState('created_at');
  const [ordreTriGrandLivre, setOrdreTriGrandLivre] = useState('asc');

  const [caisses, setCaisses] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [ventes, setVentes] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [commandesLivraison, setCommandesLivraison] = useState([]);
  const [emplacementsStock, setEmplacementsStock] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [etatsCaisseList, setEtatsCaisseList] = useState([]);
  const [cloturesCaissesList, setCloturesCaissesList] = useState([]);
  const [chargement, setChargement] = useState(false);

  const [filtreDateDebut, setFiltreDateDebut] = useState(premierJourMoisStr);
  const [filtreDateFin, setFiltreDateFin] = useState(dernierJourMoisStr);
  const [filtreCaisseId, setFiltreCaisseId] = useState('');
  const [filtreCaissierId, setFiltreCaissierId] = useState('');

  const [colonneTri, setColonneTri] = useState('date_debut');
  const [ordreTri, setOrdreTri] = useState('desc');

  const [dateControle, setDateControle] = useState(new Date().toISOString().split('T')[0]);
  const [caisseControleId, setCaisseControleId] = useState('');
  const [caissierFiltre, setCaissierFiltre] = useState('');
  const [livreurControle, setLivreurControle] = useState('');
  const [montantVerse, setMontantVerse] = useState('');

  const [dernierEtatIdValidé, setDernierEtatIdValidé] = useState(null);
  const [numeroPieceCloture, setNumeroPieceCloture] = useState('');

  // --- MODALE DE CHOIX DE CAISSE DE VERSEMENT ---
  const [afficherModaleVersement, setAfficherModaleVersement] = useState(false);
  const [caisseDestinationVersement, setCaisseDestinationVersement] = useState('');
  const [etatEnCoursDeVersement, setEtatEnCoursDeVersement] = useState(null);

  const [idOperationEnCoursModif, setIdOperationEnCoursModif] = useState(null);
  const [numeroPieceEnCoursModif, setNumeroPieceEnCoursModif] = useState('');
  const [enteteSaisie, setEnteteSaisie] = useState({
    date: new Date().toISOString().split('T')[0],
    id_caisse: '',
    type_mouvement: 'SORTIE',
  });
  const [ligneUnique, setLigneUnique] = useState({
    id_compte: '',
    montant: '',
    piece_physique: '',
    id_utilisateur_tiers: ''
  });
  const [utilisateurMotif, setUtilisateurMotif] = useState('');

  const [dateDebutLivre, setDateDebutLivre] = useState(premierJourMoisStr);
  const [dateFinLivre, setDateFinLivre] = useState(dernierJourMoisStr);
  const [compteLivreId, setCompteLivreId] = useState('');
  const [tiersLivreFiltre, setTiersLivreFiltre] = useState('');

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || localStorage.getItem('moduleActif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const cleCacheMouvements = `mouvements_caisse_${entrepriseId}_${moduleActuel}`;
  const cleCacheEtatsCaisse = `etats_caisse_${entrepriseId}_${moduleActuel}`;
  const cleCacheClotures = `clotures_caisses_${entrepriseId}_${moduleActuel}`;
  const cleCacheMotifs = `motifs_caisse_${entrepriseId}_${moduleActuel}`;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem(cleCacheMotifs) || '[]');
        if (Array.isArray(saved)) setMotifsSauvegardes(saved);
      } catch (e) {
        setMotifsSauvegardes([]);
      }
    }
  }, [cleCacheMotifs]);

  const ajouterMotifPersonnalise = (motifText) => {
    const clean = (motifText || '').trim().toUpperCase();
    if (!clean) return;
    setMotifsSauvegardes((prev) => {
      const maj = Array.from(new Set([clean, ...prev]));
      if (typeof window !== 'undefined') {
        localStorage.setItem(cleCacheMotifs, JSON.stringify(maj));
      }
      return maj;
    });
  };

  const extraireAuteurEtMotif = (libelleRaw) => {
    const str = (libelleRaw || '').trim();
    if (str.startsWith('[')) {
      const idxFermet = str.indexOf(']');
      if (idxFermet !== -1) {
        const auteur = str.substring(1, idxFermet).trim();
        const motif = str.substring(idxFermet + 1).trim();
        return { auteur: auteur || utilisateurConnecte, motif: motif || '-' };
      }
    }
    return { auteur: utilisateurConnecte, motif: str || '-' };
  };

  const fusionnerParId = (liste1 = [], liste2 = []) => {
    const map = new Map();
    [...liste2, ...liste1].forEach(item => {
      if (item && item.id) {
        map.set(String(item.id), item);
      }
    });
    return Array.from(map.values());
  };

  const genererCodePieceSequentiel = (dateStr, listeEtats, listeClotures) => {
    const dClean = (dateStr || new Date().toISOString().split('T')[0]).replace(/-/g, '');
    const elementsMemeDate = [
      ...listeEtats.filter(e => (e.date_debut || '').replace(/-/g, '') === dClean),
      ...listeClotures.filter(cl => (cl.date_debut || cl.created_at || '').split('T')[0].replace(/-/g, '') === dClean)
    ];

    let maxNum = 0;
    elementsMemeDate.forEach(item => {
      const piece = item.code_piece || item.code_cloture || '';
      const parts = piece.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const prochainIndex = maxNum + 1;
    return `CL-${dClean}-${prochainIndex}`;
  };

  const chargerDonneesGlobales = async () => {
    const mouvementsLocaux = localSync.recupererDonneesLocales(cleCacheMouvements) || [];
    const etatsLocaux = localSync.recupererDonneesLocales(cleCacheEtatsCaisse) || [];
    const cloturesLocales = localSync.recupererDonneesLocales(cleCacheClotures) || [];

    if (mouvementsLocaux.length > 0) {
      setMouvements(mouvementsLocaux);
      setChargement(false);
    } else {
      setChargement(true);
    }

    if (etatsLocaux.length > 0) setEtatsCaisseList(etatsLocaux);
    if (cloturesLocales.length > 0) setCloturesCaissesList(cloturesLocales);

    try {
      const { data: dataCaisses } = await supabase
        .from('caisses')
        .select('*')
        .eq('id_entreprise', entrepriseId);

      const caissesModule = (dataCaisses || []).filter(
        c => !c.module || String(c.module).toUpperCase() === moduleActuel
      );
      setCaisses(caissesModule);

      const caisseEntrepriseObj = caissesModule.find(c => (c.nature || '').toUpperCase() === 'CAISSE ENTREPRISE' || (c.nom_caisse || '').toUpperCase().includes('PRINCIPALE')) ||
                                  caissesModule.find(c => (c.nature || '').toUpperCase() === 'PRINCIPALE') ||
                                  caissesModule[0];

      if (caisseEntrepriseObj && !caisseSelectionneeJournal) {
        setCaisseSelectionneeJournal(caisseEntrepriseObj.id);
      }

      if (caisseEntrepriseObj && !enteteSaisie.id_caisse) {
        setEnteteSaisie(prev => ({ ...prev, id_caisse: caisseEntrepriseObj.id }));
      }

      const caissesPrincipales = caissesModule.filter(c => (c.nature || '').toUpperCase() === 'PRINCIPALE' || (c.nature || '').toUpperCase() === 'CAISSE ENTREPRISE' || (c.nom_caisse || '').toUpperCase().includes('PRINCIPALE'));
      if (caissesPrincipales.length > 0 && !caisseDestinationVersement) {
        setCaisseDestinationVersement(caissesPrincipales[0].id);
      }

      const { data: dataComptes } = await supabase
        .from('comptes_comptables')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setComptes(dataComptes || []);

      const { data: dataRoles } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setRoles(dataRoles || []);

      const { data: dataMvts } = await supabase
        .from('mouvements_caisse')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: true });

      const listMvtsCloud = dataMvts || [];
      const listMvtsFinal = fusionnerParId(listMvtsCloud, mouvementsLocaux);
      setMouvements(listMvtsFinal);
      localSync.sauvegarderDonneesLocales(cleCacheMouvements, listMvtsFinal);

      const { data: dataVentes } = await supabase
        .from('ventes_historiques')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setVentes(dataVentes || []);

      const { data: dataAppros } = await supabase
        .from('approvisionnements')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setApprovisionnements(dataAppros || []);

      const { data: dataCmdLivr } = await supabase
        .from('commandes_livraison_en_tete')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setCommandesLivraison(dataCmdLivr || []);

      const { data: dataEmp } = await supabase
        .from('emplacements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setEmplacementsStock(dataEmp || []);

      // Récupération stricte de la table des utilisateurs
      const { data: dataUsers } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      setUtilisateurs(dataUsers || []);

      if (!utilisateurConnecte && !utilisateurActif) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const emailAuth = authData.user.email;
          const userMatch = (dataUsers || []).find(u => u.email === emailAuth || u.id === authData.user.id);
          if (userMatch) {
            const nomTrouve = (userMatch.nom_complet || userMatch.nom || userMatch.email || '').toUpperCase();
            setUtilisateurConnecte(nomTrouve);
          } else if (authData.user.user_metadata?.nom_complet || authData.user.user_metadata?.name) {
            setUtilisateurConnecte((authData.user.user_metadata.nom_complet || authData.user.user_metadata.name).toUpperCase());
          }
        }
      }

      const { data: dataEtats } = await supabase
        .from('etats_caisse')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      const listEtatsCloud = dataEtats || [];
      const listEtatsFinal = fusionnerParId(listEtatsCloud, etatsLocaux);
      setEtatsCaisseList(listEtatsFinal);
      localSync.sauvegarderDonneesLocales(cleCacheEtatsCaisse, listEtatsFinal);

      const { data: dataCloturesCaisses } = await supabase
        .from('clotures_caisses')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      const listCloturesCloud = dataCloturesCaisses || [];
      const listCloturesFinal = fusionnerParId(listCloturesCloud, cloturesLocales);
      setCloturesCaissesList(listCloturesFinal);
      localSync.sauvegarderDonneesLocales(cleCacheClotures, listCloturesFinal);

      const prochainNum = genererCodePieceSequentiel(dateControle, listEtatsFinal, listCloturesFinal);
      setNumeroPieceCloture(prochainNum);

    } catch (err) {
      console.error('Erreur chargement :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonneesGlobales();
    localSync.synchroniserVersCloud(supabase);
  }, [entrepriseId, moduleActuel]);

  useEffect(() => {
    const prochainNum = genererCodePieceSequentiel(dateControle, etatsCaisseList, cloturesCaissesList);
    setNumeroPieceCloture(prochainNum);
  }, [dateControle, etatsCaisseList, cloturesCaissesList]);

  useEffect(() => {
    if (moduleActuel === 'LIVRAISON' && livreurControle) {
      const totalFraisLivraisonLivreur = commandesLivraison
        .filter(cmd => {
          if ((cmd.statut_commande || 'EN ATTENTE') !== 'LIVRÉ') return false;
          if (dateControle && cmd.date_commande !== dateControle) return false;
          if (livreurControle && (cmd.vendeur_livreur || '').trim().toUpperCase() !== livreurControle.trim().toUpperCase()) return false;
          return true;
        })
        .reduce((sum, cmd) => sum + (Number(cmd.frais_livraison) || 0), 0);

      setMontantVerse(totalFraisLivraisonLivreur > 0 ? String(totalFraisLivraisonLivreur) : '');
    }
  }, [moduleActuel, livreurControle, dateControle, commandesLivraison]);

  const preparerNouvelleCloture = () => {
    setCaisseControleId('');
    setCaissierFiltre('');
    setLivreurControle('');
    setMontantVerse('');
    setDernierEtatIdValidé(null);
    const prochainNum = genererCodePieceSequentiel(dateControle, etatsCaisseList, cloturesCaissesList);
    setNumeroPieceCloture(prochainNum);
  };

  const estCaissePrincipale = (caisseObj) => {
    if (!caisseObj) return false;
    const nat = (caisseObj.nature || '').toUpperCase();
    const nom = (caisseObj.nom_caisse || '').toUpperCase();
    return nat === 'PRINCIPALE' || nat === 'CAISSE ENTREPRISE' || nom.includes('PRINCIPALE');
  };

  const mouvementCorrespondCaisse = (mvt, caisseIdCible) => {
    if (!caisseIdCible) return true;
    const cibleStr = String(caisseIdCible).trim();
    const mvtCaisseStr = mvt.id_caisse !== null && mvt.id_caisse !== undefined ? String(mvt.id_caisse).trim() : '';

    if (mvtCaisseStr === cibleStr) return true;

    const caisseCibleObj = caisses.find(c => String(c.id).trim() === cibleStr);
    if (estCaissePrincipale(caisseCibleObj)) {
      const lib = (mvt.libelle || '').toUpperCase();
      const piece = (mvt.piece_physique || '').toUpperCase();
      const estVersementLivraison =
        lib.includes('CLÔTURE LIVRAISON') ||
        lib.includes('VERS. CLÔTURE') ||
        lib.includes('FRAIS LIVR') ||
        piece.includes('LIVR-');
      if (estVersementLivraison && (!mvtCaisseStr || !caisses.some(c => String(c.id).trim() === mvtCaisseStr))) {
        return true;
      }
    }

    return false;
  };

  const calculerSoldeCaisse = (caisseId) => {
    if (!caisseId) return 0;

    const caisseObj = caisses.find(c => String(c.id).trim() === String(caisseId).trim());
    const estCaissePrin = estCaissePrincipale(caisseObj);

    let totalMvts = mouvements
      .filter(m => mouvementCorrespondCaisse(m, caisseId))
      .reduce((acc, m) => {
        return m.type_mouvement === 'ENTREE' ? acc + Number(m.montant) : acc - Number(m.montant);
      }, 0);

    if (estCaissePrin) {
      const totalVersementsEtats = etatsCaisseList
        .filter(e => e.statut_versement === 'VERSE')
        .reduce((acc, e) => acc + Number(e.montant_verse || 0), 0);

      const piecesDejaDansMvts = new Set(
        mouvements
          .filter(m => mouvementCorrespondCaisse(m, caisseId) && m.piece_physique)
          .map(m => String(m.piece_physique).trim().toUpperCase())
      );

      const totalVersementsCloturesNonDoublonnes = cloturesCaissesList
        .filter(cl => {
          const destOk = !cl.id_caisse_destination || String(cl.id_caisse_destination).trim() === String(caisseId).trim();
          const codeCl = String(cl.code_cloture || '').trim().toUpperCase();
          return destOk && (!codeCl || !piecesDejaDansMvts.has(codeCl));
        })
        .reduce((acc, cl) => acc + Number((cl.montant_reel_verse ?? cl.montant_attendu ?? cl.montant_total_encaisse) || 0), 0);

      totalMvts += (totalVersementsEtats + totalVersementsCloturesNonDoublonnes);
    } else {
      const totalVentesCaisse = ventes
        .filter(v => String(v.id_caisse).trim() === String(caisseId).trim())
        .reduce((acc, v) => acc + Number(v.montant_regle ?? v.total_montant ?? 0), 0);
      totalMvts += totalVentesCaisse;
    }

    return totalMvts;
  };

  const auteurEffectif = (utilisateurConnecte || 'KEITA SHOP').toUpperCase();

  const enregistrerOperationUnique = async (e) => {
    if (e) e.preventDefault();
    if (!enteteSaisie.id_caisse) {
      afficherNotification('Champ requis', 'Veuillez obligatoirement sélectionner une caisse pour effectuer une saisie.', 'erreur');
      return;
    }
    if (!ligneUnique.id_compte) {
      afficherNotification('Champ requis', 'Veuillez obligatoirement sélectionner un compte.', 'erreur');
      return;
    }

    try {
      const motifBrut = utilisateurMotif ? utilisateurMotif.trim().toUpperCase() : 'MOUV. INT.';
      if (utilisateurMotif && motifBrut !== 'MOUV. INT.') {
        ajouterMotifPersonnalise(motifBrut);
      }

      // CORRECTION CLÉ : On injecte explicitement le nom réel de l'opérateur connecté entre crochets
      let libelleFinal = `[${auteurEffectif}] ${motifBrut}`;

      let nomTiersAssocie = '';
      if (ligneUnique.id_utilisateur_tiers) {
        const tiersObj = utilisateurs.find(u => String(u.id) === String(ligneUnique.id_utilisateur_tiers));
        if (tiersObj) {
          nomTiersAssocie = tiersObj.nom_complet || tiersObj.email || '';
          if (nomTiersAssocie && !libelleFinal.includes(nomTiersAssocie.toUpperCase())) {
            libelleFinal = `[${auteurEffectif}] ${motifBrut} - ${nomTiersAssocie.toUpperCase()}`;
          }
        }
      }

      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        id_caisse: enteteSaisie.id_caisse,
        type_mouvement: enteteSaisie.type_mouvement,
        montant: Number(ligneUnique.montant),
        libelle: libelleFinal,
        id_compte: ligneUnique.id_compte || null,
        piece_physique: ligneUnique.piece_physique || null,
        id_utilisateur_tiers: ligneUnique.id_utilisateur_tiers || null,
        created_at: new Date(enteteSaisie.date).toISOString()
      };

      if (idOperationEnCoursModif) {
        const { error } = await supabase
          .from('mouvements_caisse')
          .update(payload)
          .eq('id', idOperationEnCoursModif);
        if (error) throw error;

        setMouvements(prev => prev.map(m => m.id === idOperationEnCoursModif ? { ...m, ...payload } : m));
        afficherNotification('Succès', 'Opération modifiée avec succès !', 'succes');
        setIdOperationEnCoursModif(null);
        setNumeroPieceEnCoursModif('');
      } else {
        const { error, data } = await supabase.from('mouvements_caisse').insert([payload]).select().single();

        if (error) {
          throw new Error("Erreur Supabase : " + error.message);
        } else if (data) {
          setMouvements(prev => {
            const listeMaj = fusionnerParId(prev, [data]);
            localSync.sauvegarderDonneesLocales(cleCacheMouvements, listeMaj);
            return listeMaj;
          });
          afficherNotification('Succès', `Opération enregistrée par ${auteurEffectif}.`, 'succes');
        }
      }

      setLigneUnique({ id_compte: '', montant: '', piece_physique: '', id_utilisateur_tiers: '' });
      setUtilisateurMotif('');
      await chargerDonneesGlobales();
      setModeSaisie('historique');
    } catch (err) {
      afficherNotification('Erreur d\'enregistrement', err.message, 'erreur');
    }
  };

  const gererKeyDownFormulaire = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      enregistrerOperationUnique();
    }
  };

  const selectionnerCompteSaisie = (compteId) => {
    setLigneUnique(prev => ({ ...prev, id_compte: compteId }));
    if (compteId) {
      const compteObj = comptes.find(c => String(c.id) === String(compteId));
      if (compteObj) {
        const natureCompte = (compteObj.nature || compteObj.type_compte || compteObj.classe || '').toUpperCase();
        if (natureCompte.includes('PRODUIT') || natureCompte.includes('RECETTE') || natureCompte.includes('VENTE')) {
          setEnteteSaisie(prev => ({ ...prev, type_mouvement: 'ENTREE' }));
        } else if (natureCompte.includes('CHARGE') || natureCompte.includes('DEPENSE') || natureCompte.includes('ACHAT')) {
          setEnteteSaisie(prev => ({ ...prev, type_mouvement: 'SORTIE' }));
        }
      }
    }
    fermerModaleSelection();
  };

  const selectionnerTiersSaisie = (tiersId) => {
    setLigneUnique(prev => ({ ...prev, id_utilisateur_tiers: tiersId }));
    fermerModaleSelection();
  };

  const preparerModificationOperation = (mvt, indexMvt) => {
    setIdOperationEnCoursModif(mvt.id);
    let pieceCalc = mvt.piece_physique || `PC-${String(indexMvt + 1).padStart(2, '0')}`;
    setNumeroPieceEnCoursModif(pieceCalc);

    setEnteteSaisie({
      date: mvt.created_at ? mvt.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      id_caisse: mvt.id_caisse || '',
      type_mouvement: mvt.type_mouvement || 'SORTIE',
    });
    setLigneUnique({
      id_compte: mvt.id_compte || '',
      montant: mvt.montant || '',
      piece_physique: mvt.piece_physique || '',
      id_utilisateur_tiers: mvt.id_utilisateur_tiers || mvt.id_tiers || ''
    });
    const { motif } = extraireAuteurEtMotif(mvt.libelle);
    setUtilisateurMotif(motif && !['MOUVEMENT INTERNE', 'MOUV. INT.', 'DEPENSE INTERNE', 'CHARGE INTERNE', '-'].includes(motif) ? motif : '');
    setModeSaisie('nouveau');
  };

  const supprimerOperation = async (id) => {
    afficherNotification(
      'Confirmation de suppression',
      'Êtes-vous sûr de vouloir supprimer cette opération ?',
      'info',
      async () => {
        try {
          const { error } = await supabase
            .from('mouvements_caisse')
            .delete()
            .eq('id', id);
          if (error) throw error;

          setMouvements(prev => {
            const listeMaj = prev.filter(m => m.id !== id);
            localSync.sauvegarderDonneesLocales(cleCacheMouvements, listeMaj);
            return listeMaj;
          });

          afficherNotification('Succès', 'Opération supprimée avec succès !', 'succes');
          setIdOperationEnCoursModif(null);
          setNumeroPieceEnCoursModif('');
          setLigneUnique({ id_compte: '', montant: '', piece_physique: '', id_utilisateur_tiers: '' });
          setUtilisateurMotif('');
          await chargerDonneesGlobales();
          setModeSaisie('historique');
        } catch (err) {
          afficherNotification('Erreur', 'Erreur lors de la suppression : ' + err.message, 'erreur');
        }
      }
    );
  };

  const caissesFacturationPourControle = caisses.filter(c => (c.nature || '').toUpperCase() === 'FACTURATION' || !(c.nom_caisse || '').toUpperCase().includes('PRINCIPALE'));

  const listeLivreurs = Array.from(new Set([
    ...(commandesLivraison.map(c => c.vendeur_livreur).filter(Boolean)),
    ...(emplacementsStock.map(e => e.nom_emplacement || e.responsable_emplacement).filter(Boolean))
  ])).map(l => l.toUpperCase());

  const listeMotifsUniques = (() => {
    const setMotifs = new Set(motifsSauvegardes);
    mouvements.forEach(m => {
      const { motif } = extraireAuteurEtMotif(m.libelle);
      if (motif && motif !== '-' && !motif.startsWith('VERS. CLÔTURE')) {
        const baseMotif = motif.split(' - ')[0].trim().toUpperCase();
        if (baseMotif && baseMotif !== 'MOUV. INT.') {
          setMotifs.add(baseMotif);
        }
      }
    });
    return Array.from(setMotifs);
  })();

  const obtenirCaissiersFiltres = (caisseIdSelectionnee = '') => {
    return utilisateurs.filter(u => {
      const roleObj = roles.find(r => String(r.id) === String(u.id_role));
      const nomRole = (roleObj?.nom_role || '').toLowerCase();
      const estCaissierRole = nomRole.includes('caissier') || nomRole.includes('caissière');
      const aUneCaisseAttribuee = Boolean(u.id_caisse);

      if (caisseIdSelectionnee) {
        const correspondCaisse = String(u.id_caisse) === String(caisseIdSelectionnee);
        return (estCaissierRole || aUneCaisseAttribuee) && (correspondCaisse || !u.id_caisse);
      }

      return estCaissierRole || aUneCaisseAttribuee;
    });
  };

  const caissiersFiltresControle = obtenirCaissiersFiltres(caisseControleId);

  const obtenirNomCaissier = (idOuNom) => {
    if (!idOuNom) return '-';
    const utilisateurTrouve = utilisateurs.find(u => String(u.id) === String(idOuNom) || String(u.email) === String(idOuNom));
    if (utilisateurTrouve) {
      return utilisateurTrouve.nom_complet || utilisateurTrouve.email || idOuNom;
    }
    return idOuNom;
  };

  const formaterLibelleMouvement = (libelleRaw) => {
    let libelleAffichage = libelleRaw || 'MOUV. CAISSE';
    if (moduleActuel === 'LIVRAISON' && (libelleAffichage.toUpperCase().includes('CLÔTURE LIVRAISON') || libelleAffichage.toUpperCase().includes('VERS. CLÔTURE'))) {
      libelleAffichage = 'Frais Livr.';
    }
    return libelleAffichage;
  };

  const mouvementsMvtsGrandLivre = mouvements.map(m => {
    const { auteur, motif } = extraireAuteurEtMotif(m.libelle);
    return {
      id: `mvt-${m.id}`,
      created_at: m.created_at,
      piece_physique: m.piece_physique || '-',
      id_compte: m.id_compte,
      id_utilisateur_tiers: m.id_utilisateur_tiers || m.id_tiers || null,
      libelle: formaterLibelleMouvement(motif),
      auteur: auteur || utilisateurConnecte,
      type_mouvement: m.type_mouvement,
      montant: Number(m.montant || 0)
    };
  });

  const ventesGrandLivre = ventes.map(v => ({
    id: `vente-${v.id}`,
    created_at: v.created_at,
    piece_physique: v.numero_ticket || `TICK-${v.id}`,
    id_compte: v.id_compte || null,
    id_utilisateur_tiers: v.id_utilisateur || null,
    libelle: `VT #${v.numero_ticket || '-'} (${v.nom_client || 'DIVERS'})`,
    auteur: v.id_utilisateur ? obtenirNomCaissier(v.id_utilisateur) : utilisateurConnecte,
    type_mouvement: 'ENTREE',
    montant: Number(v.montant_regle ?? v.total_montant ?? 0)
  }));

  const approsGrandLivre = approvisionnements.map(a => ({
    id: `appro-${a.id}`,
    created_at: a.created_at || a.date_approvisionnement || new Date().toISOString(),
    piece_physique: a.reference || `APRO-${a.id}`,
    id_compte: a.id_compte || null,
    id_utilisateur_tiers: null,
    libelle: `APPRO. (${a.nom_fournisseur || 'FOURN.'})`,
    auteur: utilisateurConnecte,
    type_mouvement: 'SORTIE',
    montant: Number(a.montant_total || a.montant || 0)
  }));

  const tousLesMouvementsGrandLivre = [...mouvementsMvtsGrandLivre, ...ventesGrandLivre, ...approsGrandLivre];

  const resultatGrandLivre = tousLesMouvementsGrandLivre.filter(m => {
    if (compteLivreId && String(m.id_compte) !== String(compteLivreId)) return false;
    if (tiersLivreFiltre) {
      const matchTiersId = String(m.id_utilisateur_tiers) === String(tiersLivreFiltre);
      const utilisateurObj = utilisateurs.find(u => String(u.id) === String(tiersLivreFiltre));
      const nomTiers = utilisateurObj ? (utilisateurObj.nom_complet || utilisateurObj.email || '').toUpperCase() : '';
      const libMvt = (m.libelle || '').toUpperCase();
      const auteurMvt = (m.auteur || '').toUpperCase();
      const matchNom = nomTiers && (libMvt.includes(nomTiers) || auteurMvt.includes(nomTiers) || libMvt.includes(tiersLivreFiltre.toUpperCase()));
      if (!matchTiersId && !matchNom) return false;
    }
    const dateMvt = m.created_at ? m.created_at.split('T')[0] : '';
    if (dateDebutLivre && dateMvt < dateDebutLivre) return false;
    if (dateFinLivre && dateMvt > dateFinLivre) return false;
    return true;
  });

  const gererTriGrandLivre = (colonne) => {
    if (colonneTriGrandLivre === colonne) {
      setOrdreTriGrandLivre(ordreTriGrandLivre === 'asc' ? 'desc' : 'asc');
    } else {
      setColonneTriGrandLivre(colonne);
      setOrdreTriGrandLivre('asc');
    }
  };

  const resultatGrandLivreTries = [...resultatGrandLivre].sort((a, b) => {
    let valA, valB;
    if (colonneTriGrandLivre === 'created_at') {
      valA = a.created_at || '';
      valB = b.created_at || '';
    } else if (colonneTriGrandLivre === 'piece') {
      valA = a.piece_physique || '';
      valB = b.piece_physique || '';
    } else if (colonneTriGrandLivre === 'compte') {
      const cA = comptes.find(c => String(c.id) === String(a.id_compte));
      valA = cA ? cA.intitule_compte : '';
      const cB = comptes.find(c => String(c.id) === String(b.id_compte));
      valB = cB ? cB.intitule_compte : '';
    } else if (colonneTriGrandLivre === 'libelle') {
      valA = a.libelle || '';
      valB = b.libelle || '';
    } else if (colonneTriGrandLivre === 'montant') {
      valA = (a.type_mouvement === 'ENTREE' ? 1 : -1) * Number(a.montant || 0);
      valB = (b.type_mouvement === 'ENTREE' ? 1 : -1) * Number(b.montant || 0);
    }
    if (valA < valB) return ordreTriGrandLivre === 'asc' ? -1 : 1;
    if (valA > valB) return ordreTriGrandLivre === 'asc' ? 1 : -1;
    return 0;
  });

  const resultatGrandLivreAffiches = resultatGrandLivreTries.slice(0, limiteGrandLivre);

  const totalEntreesGrandLivre = resultatGrandLivreTries
    .filter(m => m.type_mouvement === 'ENTREE')
    .reduce((acc, m) => acc + Number(m.montant || 0), 0);

  const totalSortiesGrandLivre = resultatGrandLivreTries
    .filter(m => m.type_mouvement === 'SORTIE')
    .reduce((acc, m) => acc + Number(m.montant || 0), 0);

  const resultatNetGrandLivre = totalEntreesGrandLivre - totalSortiesGrandLivre;

  const idsCaissesModuleActuel = new Set(caisses.map(c => String(c.id).trim()));

  const mouvementsDeCaisseFiltres = mouvements.filter(m => {
    if (!mouvementCorrespondCaisse(m, caisseSelectionneeJournal)) return false;

    const dateMvt = m.created_at ? m.created_at.split('T')[0] : '';
    if (dateDebutJournal && dateMvt < dateDebutJournal) return false;
    if (dateFinJournal && dateMvt > dateFinJournal) return false;
    return true;
  }).map(m => {
    const { auteur, motif } = extraireAuteurEtMotif(m.libelle);
    return {
      ...m,
      libelle: formaterLibelleMouvement(motif),
      auteur: auteur || utilisateurConnecte
    };
  });

  const piecesDejaPresentesDansJournal = new Set(
    mouvementsDeCaisseFiltres
      .filter(m => m.piece_physique)
      .map(m => String(m.piece_physique).trim().toUpperCase())
  );

  const cloturesLivraisonSupplementairesJournal = (moduleActuel === 'LIVRAISON' ? cloturesCaissesList : [])
    .filter(cl => {
      const codeCl = String(cl.code_cloture || '').trim().toUpperCase();
      if (codeCl && piecesDejaPresentesDansJournal.has(codeCl)) return false;

      if (caisseSelectionneeJournal) {
        const destStr = cl.id_caisse_destination !== null && cl.id_caisse_destination !== undefined ? String(cl.id_caisse_destination).trim() : '';
        const cibleStr = String(caisseSelectionneeJournal).trim();
        const caisseCibleObj = caisses.find(c => String(c.id).trim() === cibleStr);
        if (destStr && destStr !== cibleStr && !(estCaissePrincipale(caisseCibleObj) && !idsCaissesModuleActuel.has(destStr))) {
          return false;
        }
        if (!destStr && !estCaissePrincipale(caisseCibleObj)) {
          return false;
        }
      }

      const dateCl = (cl.created_at || cl.date_debut || '').split('T')[0];
      if (dateDebutJournal && dateCl < dateDebutJournal) return false;
      if (dateFinJournal && dateCl > dateFinJournal) return false;
      return Number(cl.montant_reel_verse || 0) > 0;
    })
    .map(cl => ({
      id: `cloture-jnl-${cl.id}`,
      id_entreprise: cl.id_entreprise,
      module: cl.module,
      id_caisse: cl.id_caisse_destination || caisseSelectionneeJournal,
      type_mouvement: 'ENTREE',
      montant: Number(cl.montant_reel_verse || 0),
      libelle: 'Frais Livr.',
      auteur: cl.responsable || utilisateurConnecte,
      id_compte: null,
      piece_physique: cl.code_cloture || `LIVR-${cl.id}`,
      created_at: cl.created_at || `${cl.date_debut}T12:00:00`
    }));

  const ventesTransformeesEnMouvements = ventes
    .filter(v => {
      if (v.id_caisse && !idsCaissesModuleActuel.has(String(v.id_caisse).trim())) return false;

      if (caisseSelectionneeJournal) {
        if (String(v.id_caisse).trim() !== String(caisseSelectionneeJournal).trim()) return false;
      }
      const dateVente = v.created_at ? v.created_at.split('T')[0] : '';
      if (dateDebutJournal && dateVente < dateDebutJournal) return false;
      if (dateFinJournal && dateVente > dateFinJournal) return false;
      return true;
    })
    .map(v => ({
      id: `vente-${v.id}`,
      id_entreprise: v.id_entreprise,
      module: v.module,
      id_caisse: v.id_caisse,
      type_mouvement: 'ENTREE',
      montant: Number(v.montant_regle ?? v.total_montant ?? 0),
      libelle: `VT #${v.numero_ticket || '-'} (${v.nom_client || 'DIVERS'})`,
      auteur: v.id_utilisateur ? obtenirNomCaissier(v.id_utilisateur) : utilisateurConnecte,
      id_compte: v.id_compte || null,
      piece_physique: v.numero_ticket || `TICK-${v.id}`,
      created_at: v.created_at
    }));

  const mouvementsJournalTries = [
    ...mouvementsDeCaisseFiltres,
    ...cloturesLivraisonSupplementairesJournal,
    ...ventesTransformeesEnMouvements
  ].sort((a, b) => {
    let valA, valB;
    if (colonneTriJournal === 'created_at') {
      valA = a.created_at || '';
      valB = b.created_at || '';
    } else if (colonneTriJournal === 'piece') {
      valA = a.piece_physique || '';
      valB = b.piece_physique || '';
    } else if (colonneTriJournal === 'compte') {
      const cA = comptes.find(c => String(c.id) === String(a.id_compte));
      valA = cA ? cA.intitule_compte : '';
      const cB = comptes.find(c => String(c.id) === String(b.id_compte));
      valB = cB ? cB.intitule_compte : '';
    } else if (colonneTriJournal === 'libelle') {
      valA = a.libelle || '';
      valB = b.libelle || '';
    }
    if (valA < valB) return ordreTriJournal === 'asc' ? -1 : 1;
    if (valA > valB) return ordreTriJournal === 'asc' ? 1 : -1;
    return 0;
  });

  const mouvementsJournalAffiches = mouvementsJournalTries.slice(0, limiteJournal);

  const reportAnterieurMouvements = mouvements.filter(m => {
    if (!mouvementCorrespondCaisse(m, caisseSelectionneeJournal)) return false;
    const dateMvt = m.created_at ? m.created_at.split('T')[0] : '';
    return dateDebutJournal && dateMvt < dateDebutJournal;
  }).reduce((acc, m) => {
    return m.type_mouvement === 'ENTREE' ? acc + Number(m.montant) : acc - Number(m.montant);
  }, 0);

  const reportAnterieurVentes = ventes.filter(v => {
    if (v.id_caisse && !idsCaissesModuleActuel.has(String(v.id_caisse).trim())) return false;
    if (caisseSelectionneeJournal && String(v.id_caisse).trim() !== String(caisseSelectionneeJournal).trim()) return false;
    const dateVente = v.created_at ? v.created_at.split('T')[0] : '';
    return dateDebutJournal && dateVente < dateDebutJournal;
  }).reduce((acc, v) => {
    return acc + Number(v.montant_regle ?? v.total_montant ?? 0);
  }, 0);

  const reportAntérieur = reportAnterieurMouvements + reportAnterieurVentes;

  const totalEntreesJournal = mouvementsJournalTries
    .filter(m => m.type_mouvement === 'ENTREE')
    .reduce((acc, m) => acc + Number(m.montant || 0), 0);

  const totalSortiesJournal = mouvementsJournalTries
    .filter(m => m.type_mouvement === 'SORTIE')
    .reduce((acc, m) => acc + Number(m.montant || 0), 0);

  const soldeJournal = reportAntérieur + totalEntreesJournal - totalSortiesJournal;

  const mouvementsManuelsFiltres = mouvements.filter(m => {
    if (caisseHistoriqueId) {
      if (!mouvementCorrespondCaisse(m, caisseHistoriqueId)) return false;
    }
    const lib = (m.libelle || '').toUpperCase();
    if (lib === 'VERSEMENT' || lib.includes('VERSEMENT ÉTAT') || lib.includes('CLÔTURE')) return false;
    return true;
  }).map(m => {
    const { auteur, motif } = extraireAuteurEtMotif(m.libelle);
    return {
      ...m,
      libelle: formaterLibelleMouvement(motif),
      auteur: auteur || utilisateurConnecte
    };
  });

  const mouvementsManuelsAffiches = mouvementsManuelsFiltres.slice(0, limiteHistorique);

  const montantTotalFacture = moduleActuel === 'LIVRAISON'
    ? (livreurControle
        ? commandesLivraison
            .filter(cmd => {
              if (dateControle && cmd.date_commande !== dateControle) return false;
              if (livreurControle && (cmd.vendeur_livreur || '').trim().toUpperCase() !== livreurControle.trim().toUpperCase()) return false;
              return true;
            })
            .reduce((sum, cmd) => sum + (Number(cmd.montant_commande) || 0), 0)
        : 0)
    : (caisseControleId
        ? ventes
            .filter(v => {
              if (String(v.id_caisse) !== String(caisseControleId)) return false;
              const dateVente = v.created_at ? v.created_at.split('T')[0] : '';
              if (dateControle && dateVente !== dateControle) return false;
              if (caissierFiltre && String(v.id_utilisateur || v.vender) !== String(caissierFiltre)) return false;
              return true;
            })
            .reduce((sum, v) => sum + (Number(v.montant_regle ?? v.total_montant) || 0), 0)
        : 0);

  const montantTotalEncaisse = moduleActuel === 'LIVRAISON'
    ? (livreurControle
        ? commandesLivraison
            .filter(cmd => {
              if ((cmd.statut_commande || 'EN ATTENTE') !== 'LIVRÉ') return false;
              if (dateControle && cmd.date_commande !== dateControle) return false;
              if (livreurControle && (cmd.vendeur_livreur || '').trim().toUpperCase() !== livreurControle.trim().toUpperCase()) return false;
              return true;
            })
            .reduce((sum, cmd) => sum + (Number(cmd.frais_livraison) || 0), 0)
        : 0)
    : montantTotalFacture;

  const montantAttenduCaisse = montantTotalEncaisse;
  const ecartCaisse = montantVerse !== '' ? Number(montantVerse) - montantAttenduCaisse : 0;

  const validerFormulaireControle = () => {
    if (moduleActuel === 'LIVRAISON') {
      if (!livreurControle) {
        afficherNotification('Champ requis', 'Veuillez obligatoirement sélectionner un livreur.', 'erreur');
        return false;
      }
    } else {
      if (!caisseControleId) {
        afficherNotification('Champ requis', 'Veuillez obligatoirement sélectionner une caisse.', 'erreur');
        return false;
      }
      if (!caissierFiltre) {
        afficherNotification('Champ requis', 'Veuillez obligatoirement sélectionner un caissier.', 'erreur');
        return false;
      }
    }
    if (montantVerse === '' || isNaN(Number(montantVerse))) {
      afficherNotification('Champ requis', 'Veuillez obligatoirement renseigner le montant versé.', 'erreur');
      return false;
    }
    return true;
  };

  const validerClotureCaisse = async () => {
    if (!validerFormulaireControle()) return;
    try {
      const montantV = Number(montantVerse);
      const codePieceActuel = genererCodePieceSequentiel(dateControle, etatsCaisseList, cloturesCaissesList);

      const caissePrincipaleObj = caisses.find(c =>
        (c.nature || '').toUpperCase() === 'PRINCIPALE' ||
        (c.nature || '').toUpperCase() === 'CAISSE ENTREPRISE' ||
        (c.nom_caisse || '').toUpperCase().includes('PRINCIPALE')
      ) || caisses[0];

      const payloadEtat = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        id_caisse: moduleActuel === 'LIVRAISON' ? null : caisseControleId,
        date_debut: dateControle,
        date_fin: dateControle,
        caissier: moduleActuel === 'LIVRAISON' ? livreurControle : caissierFiltre,
        montant_attendu: montantAttenduCaisse,
        montant_verse: montantV,
        ecart: ecartCaisse,
        statut_versement: 'VERSE',
        responsable: auteurEffectif,
        code_piece: codePieceActuel,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('etats_caisse').insert([payloadEtat]).select().single();
      if (error) throw error;

      if (caissePrincipaleObj) {
        const payloadMvt = {
          id_entreprise: entrepriseId,
          module: moduleActuel,
          id_caisse: caissePrincipaleObj.id,
          type_mouvement: 'ENTREE',
          montant: montantV,
          libelle: moduleActuel === 'LIVRAISON' ? `[${auteurEffectif}] Frais Livr. - ${codePieceActuel}` : `[${auteurEffectif}] VERS. CLÔTURE ${codePieceActuel}`,
          piece_physique: codePieceActuel,
          created_at: new Date().toISOString()
        };

        const { error: errMvt } = await supabase.from('mouvements_caisse').insert([payloadMvt]);
        if (errMvt) {
          console.error("Erreur lors de l'alimentation automatique de la caisse principale :", errMvt);
        }
      }

      if (data) {
        setEtatsCaisseList(prev => {
          const listeMaj = fusionnerParId(prev, [data]);
          localSync.sauvegarderDonneesLocales(cleCacheEtatsCaisse, listeMaj);
          return listeMaj;
        });
        setDernierEtatIdValidé(data.id);
      }

      afficherNotification('Clôture validée', `Clôture [${codePieceActuel}] validée avec succès ! Montant de ${montantV.toLocaleString('fr-FR')} CFA versé automatiquement dans la caisse principale.`, 'succes');
      await chargerDonneesGlobales();
    } catch (err) {
      afficherNotification('Erreur de clôture', err.message, 'erreur');
    }
  };

  const declencherOuvertureModalVersement = (etat) => {
    setEtatEnCoursDeVersement(etat);
    const caissePrin = caisses.find(c => (c.nature || '').toUpperCase() === 'PRINCIPALE' || (c.nature || '').toUpperCase() === 'CAISSE ENTREPRISE' || (c.nom_caisse || '').toUpperCase().includes('PRINCIPALE')) || caisses[0];
    if (caissePrin) {
      setCaisseDestinationVersement(caissePrin.id);
    }
    setAfficherModaleVersement(true);
  };

  const executerVersementModale = async () => {
    if (!etatEnCoursDeVersement || !caisseDestinationVersement) {
      afficherNotification('Champ requis', 'Veuillez sélectionner une caisse de destination valide.', 'erreur');
      return;
    }
    try {
      const etat = etatEnCoursDeVersement;
      const numClotureAssocie = etat.code_piece || `CL-${(etat.date_debut || '').replace(/-/g, '')}-1`;

      const libelleMouvement = moduleActuel === 'LIVRAISON' ? `[${auteurEffectif}] Frais Livr.` : `[${auteurEffectif}] VERS`;

      const payloadMvt = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        id_caisse: caisseDestinationVersement,
        type_mouvement: 'ENTREE',
        montant: Number(etat.montant_verse),
        libelle: libelleMouvement,
        piece_physique: numClotureAssocie,
        created_at: new Date().toISOString()
      };

      const { error: errMvt } = await supabase.from('mouvements_caisse').insert([payloadMvt]);
      if (errMvt) throw errMvt;

      const { error: errUpdate } = await supabase
        .from('etats_caisse')
        .update({ statut_versement: 'VERSE' })
        .eq('id', etat.id);

      if (errUpdate) throw errUpdate;

      afficherNotification('Versement réussi', `Versement de la clôture [${numClotureAssocie}] effectué avec succès !`, 'succes');
      setAfficherModaleVersement(false);
      setEtatEnCoursDeVersement(null);
      await chargerDonneesGlobales();
    } catch (err) {
      afficherNotification('Erreur', 'Erreur : ' + err.message, 'erreur');
    }
  };

  const executerVersementActif = async () => {
    if (!dernierEtatIdValidé) return;
    const etatConcerne = etatsCaisseList.find(e => String(e.id) === String(dernierEtatIdValidé)) || {
      id: dernierEtatIdValidé,
      montant_verse: Number(montantVerse),
      caissier: moduleActuel === 'LIVRAISON' ? livreurControle : caissierFiltre,
      code_piece: numeroPieceCloture
    };
    declencherOuvertureModalVersement(etatConcerne);
  };

  const verserEtatCaisse = async (etat) => {
    declencherOuvertureModalVersement(etat);
  };

  const gererTri = (colonne) => {
    if (colonneTri === colonne) {
      setOrdreTri(ordreTri === 'asc' ? 'desc' : 'asc');
    } else {
      setColonneTri(colonne);
      setOrdreTri('asc');
    }
  };

  const etatsCaisseFiltres = etatsCaisseList.filter(etat => {
    if (etat.id_caisse && !idsCaissesModuleActuel.has(String(etat.id_caisse).trim())) return false;
    const dateEtat = etat.date_debut || '';
    if (filtreDateDebut && dateEtat < filtreDateDebut) return false;
    if (filtreDateFin && dateEtat > filtreDateFin) return false;
    if (filtreCaisseId && String(etat.id_caisse) !== String(filtreCaisseId)) return false;
    if (filtreCaissierId && String(etat.caissier) !== String(filtreCaissierId)) return false;
    return true;
  });

  const etatsCaisseTries = [...etatsCaisseFiltres].sort((a, b) => {
    let valeurA, valeurB;
    if (colonneTri === 'date_debut') {
      valeurA = a.date_debut || '';
      valeurB = b.date_debut || '';
    } else if (colonneTri === 'code_piece') {
      valeurA = a.code_piece || '';
      valeurB = b.code_piece || '';
    } else if (colonneTri === 'caissier') {
      valeurA = obtenirNomCaissier(a.caissier).toLowerCase();
      valeurB = obtenirNomCaissier(b.caissier).toLowerCase();
    } else if (colonneTri === 'montant_attendu') {
      valeurA = Number(a.montant_attendu) || 0;
      valeurB = Number(b.montant_attendu) || 0;
    } else if (colonneTri === 'ecart') {
      valeurA = Number(a.ecart) || 0;
      valeurB = Number(b.ecart) || 0;
    } else if (colonneTri === 'montant_verse') {
      valeurA = Number(a.montant_verse) || 0;
      valeurB = Number(b.montant_verse) || 0;
    } else if (colonneTri === 'statut_versement') {
      valeurA = a.statut_versement || '';
      valeurB = b.statut_versement || '';
    }
    if (valeurA < valeurB) return ordreTri === 'asc' ? -1 : 1;
    if (valeurA > valeurB) return ordreTri === 'asc' ? 1 : -1;
    return 0;
  });

  const etatsCaisseAffiches = etatsCaisseTries.slice(0, limiteEtatsCaisse);

  const caisseSaisieObj = caisses.find(c => String(c.id) === String(enteteSaisie.id_caisse));
  const compteSaisieObj = comptes.find(c => String(c.id) === String(ligneUnique.id_compte));
  const tiersSaisieObj = utilisateurs.find(u => String(u.id) === String(ligneUnique.id_utilisateur_tiers));
  const compteLivreObj = comptes.find(c => String(c.id) === String(compteLivreId));
  const tiersLivreObj = utilisateurs.find(u => String(u.id) === String(tiersLivreFiltre));

  return (
    <div className="space-y-2 text-[11px] font-sans max-w-full overflow-hidden px-0.5 sm:px-0 relative">

      {/* 1. VUE : SAISIE DES OPÉRATIONS */}
      {vueInitiale === 'saisie_operations' && (
        <div className="space-y-2">

          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase leading-tight">
              Saisie & Comptabilité
            </h4>
            <div className="grid grid-cols-2 sm:flex gap-1.5 w-full pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIdOperationEnCoursModif(null);
                  setNumeroPieceEnCoursModif('');
                  setLigneUnique({ id_compte: '', montant: '', piece_physique: '', id_utilisateur_tiers: '' });
                  setUtilisateurMotif('');
                  setModeSaisie('nouveau');
                }}
                className={`py-1.5 px-3 rounded-xl font-black text-[10px] transition shadow-2xs text-center flex-1 sm:flex-none ${
                  modeSaisie === 'nouveau' ? 'bg-orange-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ＋ Nouveau
              </button>
              <button
                type="button"
                onClick={() => setModeSaisie('historique')}
                className={`py-1.5 px-3 rounded-xl font-black text-[10px] transition shadow-2xs text-center flex-1 sm:flex-none ${
                  modeSaisie === 'historique' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                📋 Historique
              </button>
              <button
                type="button"
                onClick={() => setModeSaisie('grand_livre')}
                className={`py-1.5 px-3 rounded-xl font-black text-[10px] transition shadow-2xs text-center flex-1 sm:flex-none ${
                  modeSaisie === 'grand_livre' ? 'bg-orange-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                📖 Grand Livre
              </button>
              <button
                type="button"
                onClick={() => setModeSaisie('journal_caisse')}
                className={`py-1.5 px-3 rounded-xl font-black text-[10px] transition shadow-2xs text-center flex-1 sm:flex-none ${
                  modeSaisie === 'journal_caisse' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                📋 Journal de Caisse
              </button>
            </div>
          </div>

          {/* CONTENU : FORMULAIRE NOUVEAU */}
          {modeSaisie === 'nouveau' && (
            <form onSubmit={enregistrerOperationUnique} onKeyDown={gererKeyDownFormulaire} className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-2 gap-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    required
                    value={enteteSaisie.date}
                    onChange={(e) => setEnteteSaisie({ ...enteteSaisie, date: e.target.value })}
                    className="bg-slate-100 border border-slate-300 rounded-lg px-2 py-1 font-black text-slate-900 text-[10px] shadow-2xs"
                  />
                  <span className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wide">
                    {idOperationEnCoursModif ? 'Modifier' : 'Formulaire'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {idOperationEnCoursModif && numeroPieceEnCoursModif && (
                    <div className="bg-orange-50 text-orange-800 px-2 py-1 rounded-xl text-right border border-orange-200 shadow-2xs">
                      <span className="text-[9px] font-mono font-black text-orange-700">{numeroPieceEnCoursModif}</span>
                    </div>
                  )}
                  {enteteSaisie.id_caisse && (
                    <div className={`px-2.5 py-1 rounded-xl text-right border shadow-2xs flex items-center gap-1.5 ${
                      calculerSoldeCaisse(enteteSaisie.id_caisse) < 0
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      <span className="text-[8px] uppercase font-black">SOLDE</span>
                      <span className="text-[11px] font-black">
                        {calculerSoldeCaisse(enteteSaisie.id_caisse).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Caisse *</label>
                    <button
                      type="button"
                      onClick={() => ouvrirModaleSelection('caisse_saisie')}
                      className="w-full bg-white hover:bg-orange-50/40 border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] shadow-2xs flex items-center justify-between gap-1 text-left"
                    >
                      <span className="truncate uppercase">
                        {caisseSaisieObj ? `💵 ${caisseSaisieObj.nom_caisse || caisseSaisieObj.code_caisse}` : '-- CAISSE --'}
                      </span>
                      <span className="text-slate-400 text-[9px] shrink-0">▼</span>
                    </button>
                  </div>

                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Compte *</label>
                    <button
                      type="button"
                      onClick={() => ouvrirModaleSelection('compte_saisie')}
                      className="w-full bg-white hover:bg-orange-50/40 border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] shadow-2xs flex items-center justify-between gap-1 text-left"
                    >
                      <span className="truncate uppercase">
                        {compteSaisieObj ? compteSaisieObj.intitule_compte : '-- COMPTE --'}
                      </span>
                      <span className="text-slate-400 text-[9px] shrink-0">▼</span>
                    </button>
                  </div>

                  <div>
                    <label className="block font-black text-slate-700 mb-0.5 text-[9px]">Tiers (Utilisateur)</label>
                    <button
                      type="button"
                      onClick={() => ouvrirModaleSelection('tiers_saisie')}
                      className="w-full bg-white hover:bg-orange-50/40 border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] shadow-2xs flex items-center justify-between gap-1 text-left"
                    >
                      <span className="truncate uppercase">
                        {tiersSaisieObj ? (tiersSaisieObj.nom_complet || tiersSaisieObj.email) : '-- AUCUN --'}
                      </span>
                      <span className="text-slate-400 text-[9px] shrink-0">▼</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-700 text-[9px] mb-0.5">N° pièce</label>
                    <input
                      type="text"
                      placeholder="OPTIONNEL"
                      value={ligneUnique.piece_physique}
                      onChange={(e) => setLigneUnique({ ...ligneUnique, piece_physique: e.target.value.toUpperCase() })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-mono font-bold text-slate-900 uppercase shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-black text-slate-700 text-[9px] mb-0.5">Motif *</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="MOUV. INT."
                        value={utilisateurMotif}
                        onChange={(e) => setUtilisateurMotif(e.target.value.toUpperCase())}
                        onBlur={() => {
                          if (utilisateurMotif.trim()) {
                            ajouterMotifPersonnalise(utilisateurMotif.trim());
                          }
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-black text-slate-900 uppercase shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => ouvrirModaleSelection('motif_saisie')}
                        className="bg-slate-100 hover:bg-orange-50 border border-slate-300 rounded-lg px-2 text-[10px] text-slate-700 font-bold cursor-pointer shrink-0"
                        title="Choisir dans la liste ou créer un motif"
                      >
                        🔍
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-black text-slate-700 text-[9px] mb-0.5">Montant *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="0"
                      value={ligneUnique.montant}
                      onChange={(e) => setLigneUnique({ ...ligneUnique, montant: e.target.value })}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-black text-orange-600 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center pt-1.5 border-t border-slate-100 gap-1.5">
                <div className="flex gap-1.5 w-full sm:w-auto">
                  {idOperationEnCoursModif && (
                    <>
                      <button
                        type="button"
                        onClick={() => supprimerOperation(idOperationEnCoursModif)}
                        className="bg-red-600 hover:bg-red-500 text-white font-black px-3 py-1.5 rounded-xl text-[11px]"
                      >
                        🗑️ Suppr
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIdOperationEnCoursModif(null);
                          setNumeroPieceEnCoursModif('');
                          setLigneUnique({ id_compte: '', montant: '', piece_physique: '', id_utilisateur_tiers: '' });
                          setUtilisateurMotif('');
                          setModeSaisie('historique');
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-black px-3 py-1.5 rounded-xl text-[11px]"
                      >
                        Annuler
                      </button>
                    </>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-1.5 rounded-xl shadow-2xs transition text-[11px] text-center"
                >
                  {idOperationEnCoursModif ? '💾 Mettre à jour' : '💾 Valider'}
                </button>
              </div>
            </form>
          )}

          {/* CONTENU : HISTORIQUE */}
          {modeSaisie === 'historique' && (
            <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-2 gap-2">
                <h5 className="font-extrabold text-slate-900 text-[11px] uppercase">
                  Historique ({mouvementsManuelsAffiches.length} / {mouvementsManuelsFiltres.length})
                </h5>
                <button
                  type="button"
                  onClick={() => ouvrirModaleSelection('caisse_historique')}
                  className="bg-slate-100 hover:bg-orange-50 border border-slate-300 rounded-xl px-2.5 py-1 font-black text-slate-900 text-[10px] flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="uppercase">
                    💵 {caisseHistoriqueId ? (caisses.find(c => String(c.id) === String(caisseHistoriqueId))?.nom_caisse || 'CAISSE') : 'Toutes les caisses'}
                  </span>
                  <span className="text-orange-600 text-[9px]">▼</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-900 border-b border-slate-200 font-black uppercase text-[9px]">
                    <tr>
                      <th className="p-1.5">Date</th>
                      <th className="p-1.5 font-mono">N° Pièce</th>
                      <th className="p-1.5">Compte</th>
                      <th className="p-1.5">Motif</th>
                      <th className="p-1.5 text-right">Montant</th>
                      <th className="p-1.5">Utilisateur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                    {mouvementsManuelsAffiches.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-3 text-center text-slate-500 font-bold text-[10px]">Aucune opération.</td>
                      </tr>
                    ) : (
                      mouvementsManuelsAffiches.map((m, indexMvt) => {
                        const compteAssocie = comptes.find(c => String(c.id) === String(m.id_compte));
                        const estEntree = m.type_mouvement === 'ENTREE';
                        let numeroPieceSequence = m.piece_physique || `PC-${String(indexMvt + 1).padStart(2, '0')}`;
                        let nomCompteAffichage = compteAssocie ? compteAssocie.intitule_compte : '-';
                        const { auteur, motif } = extraireAuteurEtMotif(m.libelle);

                        return (
                          <tr
                            key={m.id}
                            onClick={() => preparerModificationOperation(m, indexMvt)}
                            className="transition cursor-pointer hover:bg-orange-50"
                            title="Cliquer pour modifier ou supprimer"
                          >
                            <td className="p-1.5 font-bold text-slate-800 whitespace-nowrap">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
                            <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{numeroPieceSequence}</td>
                            <td className="p-1.5 font-bold text-slate-900 truncate uppercase">{nomCompteAffichage}</td>
                            <td className="p-1.5 font-extrabold uppercase truncate">{motif}</td>
                            <td className={`p-1.5 font-black text-right whitespace-nowrap ${estEntree ? 'text-emerald-600' : 'text-red-600'}`}>
                              {estEntree ? `+ ${Number(m.montant).toLocaleString('fr-FR')}` : `- ${Number(m.montant).toLocaleString('fr-FR')}`}
                            </td>
                            <td className="p-1.5 font-bold text-slate-600 uppercase whitespace-nowrap">{auteur || utilisateurConnecte}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTENU : GRAND LIVRE TRANSVERSAL */}
          {modeSaisie === 'grand_livre' && (
            <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                <h4 className="font-extrabold text-slate-900 text-[10px] sm:text-[11px] uppercase">📖 GRAND LIVRE TRANSVERSAL ({resultatGrandLivreAffiches.length} / {resultatGrandLivreTries.length})</h4>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded-xl transition shadow-2xs text-[9px] shrink-0"
                >
                  🖨️ Imprimer
                </button>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Du :</label>
                    <input
                      type="date"
                      value={dateDebutLivre}
                      onChange={(e) => setDateDebutLivre(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Au :</label>
                    <input
                      type="date"
                      value={dateFinLivre}
                      onChange={(e) => setDateFinLivre(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 text-[10px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Compte :</label>
                    <button
                      type="button"
                      onClick={() => ouvrirModaleSelection('compte_gl')}
                      className="w-full bg-white hover:bg-orange-50/40 border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] cursor-pointer truncate shadow-2xs flex justify-between items-center text-left"
                    >
                      <span className="uppercase truncate">
                        {compteLivreObj
                          ? `${compteLivreObj.code_compte ? `${compteLivreObj.code_compte} - ` : ''}${compteLivreObj.intitule_compte}`
                          : '-- TOUS LES COMPTES --'}
                      </span>
                      <span className="text-slate-400 shrink-0 ml-1">🔍</span>
                    </button>
                  </div>

                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Tiers :</label>
                    <button
                      type="button"
                      onClick={() => ouvrirModaleSelection('tiers_gl')}
                      className="w-full bg-white hover:bg-orange-50/40 border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] cursor-pointer truncate shadow-2xs flex justify-between items-center text-left"
                    >
                      <span className="uppercase truncate">
                        {tiersLivreObj ? (tiersLivreObj.nom_complet || tiersLivreObj.email) : (tiersLivreFiltre || '-- TOUS --')}
                      </span>
                      <span className="text-slate-400 shrink-0 ml-1">🔍</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 font-black text-[9px] uppercase">
                    <tr>
                      <th onClick={() => gererTriGrandLivre('created_at')} className="p-1.5 cursor-pointer">Date ↕</th>
                      <th onClick={() => gererTriGrandLivre('piece')} className="p-1.5 cursor-pointer font-mono">N° Pièce ↕</th>
                      <th onClick={() => gererTriGrandLivre('compte')} className="p-1.5 cursor-pointer">Compte ↕</th>
                      <th onClick={() => gererTriGrandLivre('libelle')} className="p-1.5 cursor-pointer">Libellé / Source ↕</th>
                      <th onClick={() => gererTriGrandLivre('montant')} className="p-1.5 text-right cursor-pointer">Montant ↕</th>
                      <th className="p-1.5">Utilisateur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {resultatGrandLivreAffiches.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-3 text-center text-slate-500 font-bold text-[10px]">Aucun mouvement trouvé dans le grand livre.</td>
                      </tr>
                    ) : (
                      resultatGrandLivreAffiches.map((m) => {
                        const estEntree = m.type_mouvement === 'ENTREE';
                        const compteAssocie = comptes.find(c => String(c.id) === String(m.id_compte));
                        return (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="p-1.5 text-slate-800 font-bold whitespace-nowrap">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
                            <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{m.piece_physique}</td>
                            <td className="p-1.5 font-bold text-slate-900 truncate uppercase">{compteAssocie ? compteAssocie.intitule_compte : 'NON LIÉ'}</td>
                            <td className="p-1.5 font-black text-slate-900 uppercase truncate">{m.libelle}</td>
                            <td className={`p-1.5 font-black text-right whitespace-nowrap ${estEntree ? 'text-emerald-700' : 'text-red-600'}`}>
                              {estEntree ? `+ ${Number(m.montant).toLocaleString('fr-FR')}` : `- ${Number(m.montant).toLocaleString('fr-FR')}`}
                            </td>
                            {/* CORRECTION DE L'AFFICHAGE DE L'UTILISATEUR DANS LE GRAND LIVRE */}
                            <td className="p-1.5 font-bold text-slate-600 uppercase whitespace-nowrap">{m.auteur || utilisateurConnecte}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTENU : JOURNAL DE CAISSE */}
          {modeSaisie === 'journal_caisse' && (
            <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                <h4 className="font-extrabold text-slate-900 text-[10px] sm:text-[11px] uppercase whitespace-nowrap">📋 JOURNAL DE CAISSE ({mouvementsJournalAffiches.length})</h4>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded-xl transition shadow-2xs text-[9px]"
                >
                  🖨️ Imprimer
                </button>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Date Début :</label>
                    <input
                      type="date"
                      value={dateDebutJournal}
                      onChange={(e) => setDateDebutJournal(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Date Fin :</label>
                    <input
                      type="date"
                      value={dateFinJournal}
                      onChange={(e) => setDateFinJournal(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Caisse * :</label>
                    <button
                      type="button"
                      onClick={() => ouvrirModaleSelection('caisse_journal')}
                      className="w-full bg-white hover:bg-orange-50/40 border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] shadow-2xs flex items-center justify-between gap-1 text-left"
                    >
                      <span className="truncate uppercase">
                        {caisseSelectionneeJournal ? (caisses.find(c => String(c.id) === String(caisseSelectionneeJournal))?.nom_caisse || 'CAISSE') : '-- TOUTES --'}
                      </span>
                      <span className="text-slate-400 text-[9px] shrink-0">▼</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-900 border-b border-slate-200 font-black text-[9px] uppercase">
                    <tr>
                      <th className="p-1.5">Date</th>
                      <th className="p-1.5 font-mono">N° Pièce</th>
                      <th className="p-1.5">Compte</th>
                      <th className="p-1.5">Motif</th>
                      <th className="p-1.5 text-right">Entrée</th>
                      <th className="p-1.5 text-right">Sortie</th>
                      <th className="p-1.5">Utilisateur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                    {reportAntérieur !== 0 && (
                      <tr className="bg-slate-50 italic text-[10px]">
                        <td className="p-1.5 font-bold text-slate-600">-</td>
                        <td className="p-1.5 font-mono font-bold text-slate-600">REPORT</td>
                        <td className="p-1.5 font-bold text-slate-600">Report Antérieur</td>
                        <td className="p-1.5 font-bold text-slate-600">Solde avant {dateDebutJournal}</td>
                        <td className={`p-1.5 font-black text-right ${reportAntérieur >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {reportAntérieur >= 0 ? `${reportAntérieur.toLocaleString('fr-FR')}` : '-'}
                        </td>
                        <td className={`p-1.5 font-black text-right ${reportAntérieur >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {reportAntérieur < 0 ? `${Math.abs(reportAntérieur).toLocaleString('fr-FR')}` : '-'}
                        </td>
                        <td className="p-1.5 font-bold text-slate-600">-</td>
                      </tr>
                    )}
                    {mouvementsJournalAffiches.length === 0 && reportAntérieur === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-3 text-center text-slate-500 font-bold">Aucun mouvement de caisse.</td>
                      </tr>
                    ) : (
                      mouvementsJournalAffiches.map((m, idx) => {
                        const compteObj = comptes.find(c => String(c.id) === String(m.id_compte));
                        const estEntree = m.type_mouvement === 'ENTREE';
                        const montantNum = Number(m.montant) || 0;

                        let pieceAffichee = m.piece_physique || `PC-${idx + 1}`;
                        let nomLivreurAssocie = '';
                        if (moduleActuel === 'LIVRAISON' && !pieceAffichee.includes('LIVR-')) {
                          const cmdAssociee = commandesLivraison.find(cmd => (cmd.frais_livraison && Number(cmd.frais_livraison) === montantNum) || (m.piece_physique && m.piece_physique.includes(cmd.id)));
                          if (cmdAssociee && cmdAssociee.vendeur_livreur) {
                            nomLivreurAssocie = cmdAssociee.vendeur_livreur;
                          }
                        }
                        const pieceFinale = nomLivreurAssocie ? `${pieceAffichee} - ${nomLivreurAssocie}` : pieceAffichee;

                        return (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="p-1.5 font-bold text-slate-800 whitespace-nowrap">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
                            <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{pieceFinale}</td>
                            <td className="p-1.5 font-bold text-slate-900 truncate max-w-[80px] uppercase">{compteObj ? compteObj.intitule_compte : 'NON LIÉ'}</td>
                            <td className="p-1.5 font-black text-slate-900 uppercase truncate max-w-[140px]">{m.libelle}</td>
                            <td className="p-1.5 font-black text-emerald-700 text-right whitespace-nowrap">
                              {estEntree ? `${montantNum.toLocaleString('fr-FR')}` : '-'}
                            </td>
                            <td className="p-1.5 font-black text-red-600 text-right whitespace-nowrap">
                              {!estEntree ? `${montantNum.toLocaleString('fr-FR')}` : '-'}
                            </td>
                            <td className="p-1.5 font-bold text-slate-600 uppercase whitespace-nowrap">{m.auteur || utilisateurConnecte}</td>
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

      {/* 2. VUE : CONTRÔLE & CLÔTURE & ÉTATS DE CAISSE */}
      {vueInitiale === 'controle_cloture' && (
        <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex gap-1.5 border-b border-slate-200 pb-1.5">
            <button
              onClick={() => setSousOngletControle('nouveau_controle')}
              className={`px-2.5 py-1 rounded-xl font-black text-[10px] transition ${
                sousOngletControle === 'nouveau_controle' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🛡️ Contrôle & Clôture
            </button>
            <button
              onClick={() => setSousOngletControle('etats_caisse')}
              className={`px-2.5 py-1 rounded-xl font-black text-[10px] transition ${
                sousOngletControle === 'etats_caisse' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📋 États ({etatsCaisseList.length + cloturesCaissesList.length})
            </button>
          </div>

          {sousOngletControle === 'nouveau_controle' ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1 min-w-0">
                  <h4 className="font-extrabold text-slate-900 text-[10px] sm:text-[11px] uppercase whitespace-nowrap">CLÔTURE</h4>
                  <span className="bg-orange-100 text-orange-800 font-mono font-black text-[9px] px-1.5 py-0.5 rounded-md border border-orange-200 whitespace-nowrap">
                    {numeroPieceCloture}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={preparerNouvelleCloture}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-black px-2 py-1 rounded-xl transition shadow-2xs text-[9px] whitespace-nowrap uppercase"
                  >
                    <span>＋</span> Nouvelle
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded-xl transition shadow-2xs text-[9px] whitespace-nowrap"
                  >
                    🖨️ Imprimer
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                <div>
                  <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Date de clôture * :</label>
                  <input
                    type="date"
                    required
                    disabled={Boolean(dernierEtatIdValidé)}
                    value={dateControle}
                    onChange={(e) => setDateControle(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 text-[10px] shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                {moduleActuel === 'LIVRAISON' ? (
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Livreur * :</label>
                    <select
                      required
                      disabled={Boolean(dernierEtatIdValidé)}
                      value={livreurControle}
                      onChange={(e) => setLivreurControle(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] truncate shadow-2xs disabled:bg-slate-100 uppercase"
                    >
                      <option value="">-- Sélectionnez --</option>
                      {listeLivreurs.map((l, idx) => (
                        <option key={idx} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Caisse * :</label>
                      <select
                        required
                        disabled={Boolean(dernierEtatIdValidé)}
                        value={caisseControleId}
                        onChange={(e) => setCaisseControleId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] truncate shadow-2xs disabled:bg-slate-100"
                      >
                        <option value="">-- Sélectionnez --</option>
                        {caissesFacturationPourControle.map((c) => (
                          <option key={c.id} value={c.id}>💵 {c.nom_caisse}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Caissier * :</label>
                      <select
                        required
                        disabled={Boolean(dernierEtatIdValidé)}
                        value={caissierFiltre}
                        onChange={(e) => setCaissierFiltre(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] truncate shadow-2xs disabled:bg-slate-100"
                      >
                        <option value="">-- Sélectionnez --</option>
                        {caissiersFiltresControle.map((u) => (
                          <option key={u.id} value={u.id}>{u.nom_complet || u.email}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs max-h-[340px]">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead className="bg-slate-100 text-slate-900 border-b border-slate-200 font-black text-[9px] uppercase sticky top-0 z-10">
                    <tr>
                      <th onClick={() => gererTri('date_debut')} className="p-1.5 cursor-pointer">Date ↕</th>
                      <th onClick={() => gererTri('code_piece')} className="p-1.5 cursor-pointer font-mono">N° ↕</th>
                      <th onClick={() => gererTri('caissier')} className="p-1.5 cursor-pointer">Caissier ↕</th>
                      <th onClick={() => gererTri('montant_attendu')} className="p-1.5 text-right cursor-pointer">Attendu ↕</th>
                      <th onClick={() => gererTri('montant_verse')} className="p-1.5 text-right cursor-pointer">Versé ↕</th>
                      <th onClick={() => gererTri('ecart')} className="p-1.5 text-right cursor-pointer">Écart ↕</th>
                      <th onClick={() => gererTri('statut_versement')} className="p-1.5 text-center cursor-pointer">Statut ↕</th>
                      <th className="p-1.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {etatsCaisseAffiches.length === 0 && cloturesCaissesList.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-3 text-center text-slate-500 font-bold">Aucun état.</td>
                      </tr>
                    ) : (
                      etatsCaisseAffiches.map((etat) => {
                        const estVerse = etat.statut_versement === 'VERSE';
                        return (
                          <tr key={etat.id} className="hover:bg-slate-50">
                            <td className="p-1.5 font-bold text-slate-800 whitespace-nowrap">{etat.date_debut}</td>
                            <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{etat.code_piece}</td>
                            <td className="p-1.5 uppercase font-bold text-slate-900 truncate">{obtenirNomCaissier(etat.caissier)}</td>
                            <td className="p-1.5 text-right font-bold text-slate-700">{Number(etat.montant_attendu || 0).toLocaleString('fr-FR')}</td>
                            <td className="p-1.5 text-right font-black text-emerald-700">{Number(etat.montant_verse || 0).toLocaleString('fr-FR')}</td>
                            <td className="p-1.5 text-right font-black text-slate-600">{Number(etat.ecart || 0).toLocaleString('fr-FR')}</td>
                            <td className="p-1.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${estVerse ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                                {estVerse ? 'VERSÉ' : 'NON'}
                              </span>
                            </td>
                            <td className="p-1.5 text-center">
                              {!estVerse && (
                                <button
                                  onClick={() => verserEtatCaisse(etat)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-2 py-0.5 rounded-lg text-[9px]"
                                >
                                  Verser 🚀
                                </button>
                              )}
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

      {/* --- MODALE UNIVERSELLE DE SÉLECTION --- */}
      {modaleSelection && (
        <div
          onClick={fermerModaleSelection}
          className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-12 bg-slate-950/70 backdrop-blur-2xs p-3"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-slate-900 w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between p-3.5 border-b border-slate-200 bg-slate-900 text-white">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-orange-400">
                {(modaleSelection === 'caisse_saisie' || modaleSelection === 'caisse_journal' || modaleSelection === 'caisse_historique') && '💵 SÉLECTIONNER UNE CAISSE'}
                {(modaleSelection === 'compte_saisie' || modaleSelection === 'compte_gl') && '📒 SÉLECTIONNER UN COMPTE'}
                {modaleSelection === 'tiers_saisie' && '👤 SÉLECTIONNER UN TIERS (UTILISATEUR)'}
                {modaleSelection === 'tiers_gl' && '🔍 SÉLECTIONNER UN TIERS'}
                {modaleSelection === 'motif_saisie' && '📝 CHOISIR OU CRÉER UN MOTIF'}
              </h3>
              <button
                type="button"
                onClick={fermerModaleSelection}
                className="text-slate-400 hover:text-white font-bold p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 space-y-2.5 max-h-[75vh] overflow-y-auto">

              {/* CRÉATION COMPLÈTE D'UN COMPTE (PLAN COMPTABLE) */}
              {modaleSelection === 'compte_saisie' && afficherFormulaireNouveauCompte ? (
                <form onSubmit={enregistrerNouveauCompteComptable} className="bg-orange-50/70 p-3.5 rounded-xl border border-orange-200 space-y-3">
                  <div className="flex justify-between items-center border-b border-orange-200 pb-2">
                    <h4 className="font-extrabold text-orange-900 text-[11px] uppercase">
                      📂 NOUVEAU COMPTE (PLAN COMPTABLE)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setAfficherFormulaireNouveauCompte(false)}
                      className="text-slate-500 hover:text-slate-900 font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div>
                    <label className="block font-black text-slate-800 text-[9px] uppercase mb-1">Nature *</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const currentCode = formNouveauCompte.code_compte || '605007';
                          const newCode = '6' + currentCode.substring(1);
                          setFormNouveauCompte({ ...formNouveauCompte, type_compte: 'CHARGE', code_compte: newCode });
                        }}
                        className={`py-2 px-2 rounded-lg font-black text-[10px] uppercase transition border ${
                          formNouveauCompte.type_compte === 'CHARGE'
                            ? 'bg-red-600 text-white border-red-700 shadow-sm'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        🔴 Charge
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const currentCode = formNouveauCompte.code_compte || '705007';
                          const newCode = '7' + currentCode.substring(1);
                          setFormNouveauCompte({ ...formNouveauCompte, type_compte: 'PRODUIT', code_compte: newCode });
                        }}
                        className={`py-2 px-2 rounded-lg font-black text-[10px] uppercase transition border ${
                          formNouveauCompte.type_compte === 'PRODUIT'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        🟢 Produit
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-black text-slate-800 text-[9px] uppercase mb-1">N° Code *</label>
                      <input
                        type="text"
                        required
                        value={formNouveauCompte.code_compte}
                        onChange={(e) => setFormNouveauCompte({ ...formNouveauCompte, code_compte: e.target.value.toUpperCase() })}
                        className="w-full bg-white border border-orange-300 rounded-lg p-2 font-mono font-black text-orange-600 text-[10px] uppercase shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-slate-800 text-[9px] uppercase mb-1">Intitulé *</label>
                      <input
                        type="text"
                        required
                        placeholder="EX: DÉPANNAGE MOTO..."
                        value={formNouveauCompte.intitule}
                        onChange={(e) => setFormNouveauCompte({ ...formNouveauCompte, intitule: e.target.value.toUpperCase() })}
                        className="w-full bg-white border border-orange-300 rounded-lg p-2 font-black text-slate-900 text-[10px] uppercase shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-orange-200">
                    <button
                      type="button"
                      onClick={() => setAfficherFormulaireNouveauCompte(false)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-black px-3.5 py-1.5 rounded-lg text-[10px]"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-1.5 rounded-lg text-[10px] shadow-2xs"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <input
                    type="text"
                    autoFocus
                    placeholder="RECHERCHER..."
                    value={rechercheModale}
                    onChange={(e) => setRechercheModale(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-900 text-[11px] uppercase placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  />

                  {modaleSelection === 'compte_saisie' && (
                    <div className="bg-orange-50/70 p-2.5 rounded-xl border border-orange-200 flex items-center justify-between gap-2">
                      <span className="font-black text-orange-900 text-[9px] uppercase">
                        + CRÉER ET UTILISER UN NOUVEAU COMPTE :
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormNouveauCompte({
                            type_compte: 'CHARGE',
                            code_compte: `605${Math.floor(100 + Math.random() * 900)}`,
                            intitule: rechercheModale.trim().toUpperCase()
                          });
                          setAfficherFormulaireNouveauCompte(true);
                        }}
                        className="bg-orange-600 hover:bg-orange-500 text-white font-black px-3 py-1.5 rounded-lg text-[10px] uppercase shrink-0 shadow-2xs cursor-pointer"
                      >
                        CRÉER
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* LISTE DES COMPTES DANS LA MODALE (SAISIE OU GRAND LIVRE) */}
              {(!afficherFormulaireNouveauCompte && (modaleSelection === 'compte_saisie' || modaleSelection === 'compte_gl')) && (
                <div className="space-y-1.5">
                  {modaleSelection === 'compte_gl' && (
                    <div
                      onClick={() => {
                        setCompteLivreId('');
                        fermerModaleSelection();
                      }}
                      className="p-3 rounded-xl border cursor-pointer transition flex justify-between items-center bg-slate-50 hover:bg-slate-100 border-slate-200"
                    >
                      <span className="font-black text-slate-600 text-[11px] uppercase">-- TOUS LES COMPTES --</span>
                      <span className="text-[9px] text-slate-500 font-bold border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">TOUS</span>
                    </div>
                  )}
                  {comptes
                    .filter(c =>
                      (c.intitule_compte || '').toUpperCase().includes(rechercheModale.toUpperCase()) ||
                      (c.code_compte || '').toUpperCase().includes(rechercheModale.toUpperCase())
                    )
                    .map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          if (modaleSelection === 'compte_gl') {
                            setCompteLivreId(c.id);
                            fermerModaleSelection();
                          } else {
                            selectionnerCompteSaisie(c.id);
                          }
                        }}
                        className="p-3 rounded-xl border cursor-pointer transition flex justify-between items-center bg-white hover:bg-orange-50/60 border-slate-200"
                      >
                        <div className="truncate pr-2">
                          <span className="font-mono font-black text-orange-600 text-[10px] mr-1.5">{c.code_compte}</span>
                          <span className="font-black text-slate-900 text-[11px] uppercase">{c.intitule_compte}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">CHOISIR</span>
                      </div>
                    ))}
                </div>
              )}

              {/* LISTE DES MOTIFS DANS LA MODALE (AVEC CRÉATION INSTANTANÉE) */}
              {modaleSelection === 'motif_saisie' && (
                <div className="space-y-2">
                  {rechercheModale.trim() && !listeMotifsUniques.some(m => m.toUpperCase() === rechercheModale.trim().toUpperCase()) && (
                    <div className="bg-orange-50/70 p-2.5 rounded-xl border border-orange-200 flex items-center justify-between gap-2">
                      <span className="font-black text-orange-900 text-[9px] uppercase truncate">
                        + Créer "{rechercheModale.trim().toUpperCase()}" :
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nouveau = rechercheModale.trim().toUpperCase();
                          ajouterMotifPersonnalise(nouveau);
                          setUtilisateurMotif(nouveau);
                          fermerModaleSelection();
                        }}
                        className="bg-orange-600 hover:bg-orange-500 text-white font-black px-3 py-1.5 rounded-lg text-[10px] uppercase shrink-0 shadow-2xs cursor-pointer"
                      >
                        Créer & Utiliser
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                    {listeMotifsUniques
                      .filter(m => m.toUpperCase().includes(rechercheModale.toUpperCase()))
                      .map((motif, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setUtilisateurMotif(motif);
                            fermerModaleSelection();
                          }}
                          className="p-3 rounded-xl border cursor-pointer transition flex justify-between items-center bg-white hover:bg-orange-50/60 border-slate-200"
                        >
                          <span className="font-black text-slate-900 text-[11px] uppercase">📝 {motif}</span>
                          <span className="text-[9px] text-slate-500 font-bold border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">CHOISIR</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* LISTE DES TIERS DEPUIS LA TABLE UTILISATEURS (SAISIE OU GRAND LIVRE) */}
              {(modaleSelection === 'tiers_saisie' || modaleSelection === 'tiers_gl') && (
                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                  <div
                    onClick={() => {
                      if (modaleSelection === 'tiers_gl') {
                        setTiersLivreFiltre('');
                      } else {
                        selectionnerTiersSaisie('');
                      }
                      fermerModaleSelection();
                    }}
                    className="p-3 rounded-xl border cursor-pointer transition flex justify-between items-center bg-slate-50 hover:bg-slate-100 border-slate-200"
                  >
                    <span className="font-black text-slate-600 text-[11px] uppercase">-- TOUS / AUCUN TIERS --</span>
                    <span className="text-[9px] text-slate-500 font-bold border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">RÉINITIALISER</span>
                  </div>
                  {utilisateurs
                    .filter(u => {
                      const nom = `${u.nom_complet || ''} ${u.prenom || ''} ${u.email || ''}`.toUpperCase();
                      return nom.includes(rechercheModale.toUpperCase());
                    })
                    .map(u => (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (modaleSelection === 'tiers_gl') {
                            setTiersLivreFiltre(u.id);
                            fermerModaleSelection();
                          } else {
                            selectionnerTiersSaisie(u.id);
                          }
                        }}
                        className="p-3 rounded-xl border cursor-pointer transition flex justify-between items-center bg-white hover:bg-orange-50/60 border-slate-200"
                      >
                        <div className="truncate pr-2">
                          <span className="font-black text-slate-900 text-[11px] uppercase">{u.nom_complet || u.email}</span>
                          {u.nom_role && <span className="ml-2 text-[9px] text-orange-600 font-bold">({u.nom_role})</span>}
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">CHOISIR</span>
                      </div>
                    ))}
                </div>
              )}

              {/* LISTE DES CAISSES (SAISIE, JOURNAL OU HISTORIQUE) */}
              {(modaleSelection === 'caisse_saisie' || modaleSelection === 'caisse_journal' || modaleSelection === 'caisse_historique') && (
                <div className="space-y-1.5">
                  {modaleSelection === 'caisse_journal' && (
                    <div
                      onClick={() => {
                        setCaisseSelectionneeJournal('');
                        fermerModaleSelection();
                      }}
                      className="p-3 rounded-xl border cursor-pointer transition flex justify-between items-center bg-slate-50 hover:bg-slate-100 border-slate-200"
                    >
                      <span className="font-black text-slate-600 text-[11px] uppercase">-- TOUTES LES CAISSES --</span>
                      <span className="text-[9px] text-slate-500 font-bold border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">TOUTES</span>
                    </div>
                  )}
                  {modaleSelection === 'caisse_historique' && (
                    <div
                      onClick={() => {
                        setCaisseHistoriqueId('');
                        fermerModaleSelection();
                      }}
                      className="p-3 rounded-xl border cursor-pointer transition flex justify-between items-center bg-slate-50 hover:bg-slate-100 border-slate-200"
                    >
                      <span className="font-black text-slate-600 text-[11px] uppercase">-- TOUTES LES CAISSES --</span>
                      <span className="text-[9px] text-slate-500 font-bold border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">TOUTES</span>
                    </div>
                  )}
                  {caisses.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (modaleSelection === 'caisse_journal') {
                          setCaisseSelectionneeJournal(c.id);
                        } else if (modaleSelection === 'caisse_historique') {
                          setCaisseHistoriqueId(c.id);
                        } else {
                          setEnteteSaisie(prev => ({ ...prev, id_caisse: c.id }));
                        }
                        fermerModaleSelection();
                      }}
                      className="p-3 rounded-xl border cursor-pointer transition flex justify-between items-center bg-white hover:bg-orange-50/60 border-slate-200"
                    >
                      <span className="font-black text-slate-900 text-[11px] uppercase">💵 {c.nom_caisse || c.code_caisse}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- NOTIFICATIONS --- */}
      {modalNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-2xs p-4">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-5 space-y-4 text-center">
            <h3 className="font-black text-slate-900 text-sm uppercase">{modalNotification.titre}</h3>
            <p className="text-slate-600 font-medium text-xs leading-relaxed">{modalNotification.texte}</p>
            <button
              type="button"
              onClick={() => setModalNotification(null)}
              className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase rounded-xl transition shadow-md"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}