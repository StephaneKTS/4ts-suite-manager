'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { localSync } from '../../lib/localSync';

export default function GestionApprovisionnements({ entrepriseId = '4TS-234321', isDarkMode = false }) {
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const estModeLivraison = moduleActuel === 'LIVRAISON';
  const libelleTiers = estModeLivraison ? 'PARTENAIRE' : 'FOURNISSEUR';

  const cleCacheAppro = `approvisionnements_${entrepriseId}_${moduleActuel}`;
  const cleCacheCommandes = `commandes_${entrepriseId}_${moduleActuel}`;
  const cleCacheMouvements = `mouvements_stock_${entrepriseId}_${moduleActuel}`;
  const cleCacheArticles = `articles_${entrepriseId}_${moduleActuel}`;

  const obtenirNomOperateurConnecte = () => {
    if (typeof window === 'undefined') return 'STÉPHANE KTS';
    try {
      const strVal = localStorage.getItem('utilisateur_connecte') || localStorage.getItem('utilisateurConnecte');
      if (strVal) {
        const userObj = JSON.parse(strVal);
        const nom = userObj.nom_complet || userObj.nom_utilisateur || userObj.nom || userObj.prenom || userObj.name;
        if (nom && String(nom).trim()) return String(nom).trim().toUpperCase();
      }
      const direct = localStorage.getItem('nom_complet') || localStorage.getItem('nom_utilisateur');
      if (direct && direct.trim()) return direct.trim().toUpperCase();
    } catch (e) {}
    return 'STÉPHANE KTS';
  };

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

  const [dateDebutFiltre, setDateDebutFiltre] = useState(obtenirPremierJourDuMois());
  const [dateFinFiltre, setDateFinFiltre] = useState(obtenirDernierJourDuMois());

  const [approvisionnements, setApprovisionnements] = useState(() => {
    if (typeof window !== 'undefined') {
      return localSync.recupererDonneesLocales(cleCacheAppro) || [];
    }
    return [];
  });

  const [bonsCommandes, setBonsCommandes] = useState(() => {
    if (typeof window !== 'undefined') {
      return localSync.recupererDonneesLocales(cleCacheCommandes) || [];
    }
    return [];
  });

  const [mouvements, setMouvements] = useState(() => {
    if (typeof window !== 'undefined') {
      return localSync.recupererDonneesLocales(cleCacheMouvements) || [];
    }
    return [];
  });

  const [articles, setArticles] = useState(() => {
    if (typeof window !== 'undefined') {
      return localSync.recupererDonneesLocales(cleCacheArticles) || [];
    }
    return [];
  });

  const [fournisseurs, setFournisseurs] = useState([]);
  const [depots, setDepots] = useState([]);
  const [entrepriseInfo, setInfosEntreprise] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  // 🔔 État pour la modale unifiée de confirmation et de succès
  const [etatModale, setEtatModale] = useState({
    ouverte: false,
    titre: '',
    message: '',
    type: 'info', // 'confirmation', 'succes', 'erreur'
    onConfirmer: null
  });

  const [utilisateurConnecte, setUtilisateurConnecte] = useState(null);
  const [roleUtilisateur, setRoleUtilisateur] = useState(null);
  const [permissions, setPermissions] = useState({
    peut_creer: true,
    peut_modifier: true,
    peut_supprimer: true,
    peut_valider: true
  });

  const [ongletActif, setOngletActif] = useState('APPRO');
  const [vueActive, setVueActive] = useState('liste');
  const [approEnEditionId, setApproEnEditionId] = useState(null);
  const [docEnEditionObjet, setDocEnEditionObjet] = useState(null);
  const [documentEnLectureSeule, setDocumentEnLectureSeule] = useState(false);
  const [etatInitialEdition, setEtatInitialEdition] = useState(null);

  const [limiteAppro, setLimiteAppro] = useState(20);
  const [limiteCommandes, setLimiteCommandes] = useState(20);
  const [limiteArticlesModal, setLimiteArticlesModal] = useState(20);
  const [limiteFournisseursModal, setLimiteFournisseursModal] = useState(20);
  const [limiteDepotsModal, setLimiteDepotsModal] = useState(20);

  const [numeroDoc, setNumeroDoc] = useState('');
  const [referenceFournisseur, setReferenceFournisseur] = useState('');
  const [dateDoc, setDateDoc] = useState(new Date().toISOString().split('T')[0]);
  const [idFournisseur, setIdFournisseur] = useState('');
  const [idDepotDestination, setIdDepotDestination] = useState('');
  const [delaiLivraison, setDelaiLivraison] = useState('7 JOURS');
  const [statutPaiement, setStatutPaiement] = useState('SOLDE');
  const [montantPaye, setMontantPaye] = useState(0);

  const [modalArticleOuverte, setModalArticleOuverte] = useState(false);
  const [modalFournisseurOuverte, setModalFournisseurOuverte] = useState(false);
  const [modalDepotOuverte, setModalDepotOuverte] = useState(false);

  const [rechercheArticle, setRechercheArticle] = useState('');
  const [rechercheFournisseur, setRechercheFournisseur] = useState('');
  const [rechercheDepot, setRechercheDepot] = useState('');

  const [articleCourant, setArticleCourant] = useState({ id_article: '', designation: '', quantite: '1', prix_achat: '0' });
  const [indexEnCoursModif, setIndexEnCoursModif] = useState(null);

  const [lignesValidees, setLignesValidees] = useState([]);

  const [triCol, setTriCol] = useState('date');
  const [triOrdre, setTriOrdre] = useState('desc');

  const inputQuantiteRef = useRef(null);
  const selectArticleRef = useRef(null);

  const genererNumeroDoc = (type, listeDocs) => {
    const prefix = type === 'APPRO' ? 'APP-' : 'BC-';
    const seq = String((listeDocs || []).length + 1).padStart(3, '0');
    return `${prefix}${seq}`;
  };

  const formaterNumeroAffichageIndex = (index, type) => {
    const prefix = type === 'APPRO' ? 'APP-' : 'BC-';
    return `${prefix}${String(index + 1).padStart(3, '0')}`;
  };

  // 🛡️ Synchronisation atomique blindée anti-doublon absolu (Version corrigée et sécurisée)
  const synchroniserMouvementsStockAppro = async ({
    numeroBonArrierePlan,
    ancienNumeroBonArrierePlan = null,
    depotId,
    lignes,
    refFournisseur,
    dateDocument,
    estSuppression = false
  }) => {
    const clesASupprimer = [numeroBonArrierePlan];
    if (ancienNumeroBonArrierePlan && ancienNumeroBonArrierePlan !== numeroBonArrierePlan) {
      clesASupprimer.push(ancienNumeroBonArrierePlan);
    }

    // 1. Nettoyage radical et préalable de tous les mouvements existants pour ce bon
    for (const cle of clesASupprimer) {
      if (!cle) continue;
      await supabase
        .from('mouvements_stock')
        .delete()
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .eq('motif_remarque', cle);
    }

    if (estSuppression || !depotId || !Array.isArray(lignes) || lignes.length === 0) {
      const mouvementsNettoyes = mouvements.filter((m) => !clesASupprimer.includes(String(m.motif_remarque)));
      setMouvements(mouvementsNettoyes);
      localSync.sauvegarderDonneesLocales(cleCacheMouvements, mouvementsNettoyes);
      return;
    }

    // 2. Regroupement unique par article (bloque le multi-compte d'une même ligne)
    const lignesUniquesMap = {};
    for (const ligne of lignes) {
      const artId = String(ligne.id_article);
      const qte = Number(ligne.quantite || 0);
      if (qte <= 0) continue;
      
      if (!lignesUniquesMap[artId]) {
        lignesUniquesMap[artId] = 0;
      }
      lignesUniquesMap[artId] += qte;
    }

    const operateurActuel = obtenirNomOperateurConnecte();
    const refTexte = `APPRO - ${(refFournisseur || numeroDoc || 'ACHAT').trim().toUpperCase()}`;
    const nouveauxMouvements = [];

    // 3. Double vérification en base : s'assure qu'aucun mouvement résiduel ne subsiste
    const { data: mvtExistants } = await supabase
      .from('mouvements_stock')
      .select('id')
      .eq('id_entreprise', entrepriseId)
      .eq('module', moduleActuel)
      .eq('motif_remarque', numeroBonArrierePlan);

    if (mvtExistants && mvtExistants.length > 0) {
      await supabase
        .from('mouvements_stock')
        .delete()
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .eq('motif_remarque', numeroBonArrierePlan);
    }

    // 4. Insertion unique, propre et consolidée
    for (const [artId, qteTotale] of Object.entries(lignesUniquesMap)) {
      const payloadMvt = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        type_mouvement: 'ENTREE',
        id_depot_source: depotId,
        id_emplacement_source: null,
        id_depot_destination: depotId,
        id_emplacement_destination: null,
        id_article: parseInt(artId),
        quantite: qteTotale,
        motif_remarque: numeroBonArrierePlan,
        reference: refTexte,
        operateur: operateurActuel,
        created_at: `${dateDocument}T12:00:00`
      };

      const { error: errIns } = await supabase.from('mouvements_stock').insert([payloadMvt]);
      if (!errIns) {
        nouveauxMouvements.push({
          ...payloadMvt,
          id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        });
      }
    }

    const mouvementsNettoyes = mouvements.filter((m) => !clesASupprimer.includes(String(m.motif_remarque)));
    const mouvementsFinaux = [...nouveauxMouvements, ...mouvementsNettoyes];
    setMouvements(mouvementsFinaux);
    localSync.sauvegarderDonneesLocales(cleCacheMouvements, mouvementsFinaux);
  };

  const chargerDroitsUtilisateur = async () => {
    try {
      const emailConnecte = localStorage.getItem('utilisateur_email') || '';
      if (!emailConnecte) return;

      const { data: userRecord } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('email', emailConnecte)
        .single();

      if (userRecord) {
        setUtilisateurConnecte(userRecord);
        if (userRecord.id_role) {
          const { data: roleRecord } = await supabase
            .from('roles')
            .select('*')
            .eq('id', userRecord.id_role)
            .single();

          if (roleRecord) {
            setRoleUtilisateur(roleRecord);
            setPermissions({
              peut_creer: roleRecord.peut_creer ?? true,
              peut_modifier: roleRecord.peut_modifier ?? true,
              peut_supprimer: roleRecord.peut_supprimer ?? true,
              peut_valider: roleRecord.peut_valider ?? true
            });
          }
        }
      }
    } catch (err) {
      console.error('Erreur chargement des droits :', err.message);
    }
  };

  const chargerDonnees = async (silencieux = false) => {
    if (!silencieux && approvisionnements.length === 0) setChargement(true);
    try {
      await chargerDroitsUtilisateur();

      const { data: dataEnt } = await supabase
        .from('entreprises')
        .select('*')
        .or(`id.eq.${entrepriseId},id_entreprise.eq.${entrepriseId},code_entreprise.eq.${entrepriseId}`)
        .single();
      if (dataEnt) setInfosEntreprise(dataEnt);

      const { data: dataDepots } = await supabase.from('depots_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      setDepots(dataDepots || []);

      const { data: dataFourn } = await supabase.from('fournisseurs').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      setFournisseurs(dataFourn || []);

      const { data: dataArticles } = await supabase.from('articles_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      if (dataArticles) {
        setArticles(dataArticles);
        localSync.sauvegarderDonneesLocales(cleCacheArticles, dataArticles);
      }

      const { data: dataMouvements } = await supabase.from('mouvements_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      if (dataMouvements) {
        setMouvements(dataMouvements);
        localSync.sauvegarderDonneesLocales(cleCacheMouvements, dataMouvements);
      }

      const { data: dataAppro } = await supabase
        .from('approvisionnements')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .gte('created_at', `${dateDebutFiltre}T00:00:00`)
        .lte('created_at', `${dateFinFiltre}T23:59:59`)
        .order('created_at', { ascending: true });

      if (dataAppro) {
        setApprovisionnements(dataAppro);
        localSync.sauvegarderDonneesLocales(cleCacheAppro, dataAppro);
      }

      const { data: dataBC } = await supabase
        .from('bons_commande_fournisseurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .gte('created_at', `${dateDebutFiltre}T00:00:00`)
        .lte('created_at', `${dateFinFiltre}T23:59:59`)
        .order('created_at', { ascending: true });
      
      if (dataBC) {
        setBonsCommandes(dataBC);
        localSync.sauvegarderDonneesLocales(cleCacheCommandes, dataBC);
      }

      if (!approEnEditionId && !numeroDoc) {
        setNumeroDoc(genererNumeroDoc('APPRO', dataAppro || approvisionnements));
      }
    } catch (err) {
      console.error('Erreur chargement :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
    localSync.synchroniserVersCloud(supabase);
  }, [entrepriseId, moduleActuel, dateDebutFiltre, dateFinFiltre]);

  const estStatutSansStockage = (statut) => {
    if (!statut) return false;
    const s = String(statut).trim().toUpperCase();
    return s.includes('SANS') || s.includes('AUCUN');
  };

  const fournisseursAvecStockage = fournisseurs.filter(f => !estStatutSansStockage(f.statut_stockage));

  const selectionnerPartenaire = (frs) => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;
    const partenaireId = frs.id;
    setIdFournisseur(partenaireId);

    if (estStatutSansStockage(frs.statut_stockage)) {
      setIdDepotDestination('');
    } else if (estModeLivraison && frs.id_depot) {
      setIdDepotDestination(frs.id_depot);
    } else {
      setIdDepotDestination('');
    }
    setModalFournisseurOuverte(false);
    setRechercheFournisseur('');
  };

  const partenaireActuelObj = fournisseurs.find(f => String(f.id) === String(idFournisseur));
  const estPartenaireSansStockage = partenaireActuelObj && estStatutSansStockage(partenaireActuelObj.statut_stockage);

  const correspondAuDepot = (valeurDepotFlux, depotCibleId) => {
    if (!valeurDepotFlux || !depotCibleId) return false;
    if (String(valeurDepotFlux) === String(depotCibleId)) return true;
    const depotObj = depots.find((d) => String(d.id) === String(depotCibleId));
    if (depotObj && (depotObj.nom_depot || depotObj.nom || depotObj.libelle)) {
      const nomDepotCible = depotObj.nom_depot || depotObj.nom || depotObj.libelle;
      if (String(valeurDepotFlux).trim().toUpperCase() === String(nomDepotCible).trim().toUpperCase()) return true;
    }
    return false;
  };

  // 🛡️ Lecture unique et exclusive depuis mouvements_stock pour éviter le double comptage
  const obtenirTousLesFluxArticle = (articleId) => {
    let flux = [];
    mouvements
      .filter((m) => String(m.id_article) === String(articleId))
      .forEach((m) => {
        flux.push({
          date: m.created_at || '',
          depot_source: m.id_depot_source,
          depot_destination: m.id_depot_destination,
          quantite: parseInt(m.quantite || 0),
          type: (m.type_mouvement || '').toUpperCase()
        });
      });
    flux.sort((a, b) => new Date(a.date) - new Date(b.date));
    return flux;
  };

  const calculerStockPourDepotActuel = (articleId) => {
    const depotCibleId = idDepotDestination;
    let stockDepot = 0;
    if (!depotCibleId) {
      const artObj = articles.find(a => String(a.id_article || a.id) === String(articleId));
      stockDepot = parseInt(artObj?.Quantite_Stock || artObj?.quantite_stock || 0);
    }
    const fluxArticle = obtenirTousLesFluxArticle(articleId);
    fluxArticle.forEach((m) => {
      const matchDepotSource = correspondAuDepot(m.depot_source, depotCibleId);
      const matchDepotDest = correspondAuDepot(m.depot_destination, depotCibleId);
      const qte = m.quantite;
      const typeMvt = m.type;
      if (!depotCibleId) {
        if (typeMvt.includes('ENTREE') || typeMvt.includes('ACHAT') || typeMvt.includes('APPROVISIONNEMENT') || typeMvt.includes('FACTURE')) {
          stockDepot += qte;
        } else if (typeMvt.includes('SORTIE') || typeMvt.includes('VENTE') || typeMvt.includes('AVARIES')) {
          stockDepot -= qte;
        }
      } else {
        if (typeMvt === 'INVENTAIRE' && matchDepotSource) { stockDepot = qte; return; }
        if (typeMvt === 'TRANSFERT') { if (matchDepotDest) stockDepot += qte; if (matchDepotSource) stockDepot -= qte; return; }
        if (typeMvt.includes('ENTREE') || typeMvt.includes('ACHAT') || typeMvt.includes('APPROVISIONNEMENT') || typeMvt.includes('FACTURE')) {
          if (matchDepotSource || matchDepotDest) stockDepot += qte;
        } else if (typeMvt.includes('SORTIE') || typeMvt.includes('VENTE') || typeMvt.includes('AVARIES')) {
          if (matchDepotSource) stockDepot -= qte;
        } else {
          if (matchDepotSource || matchDepotDest) stockDepot += qte;
        }
      }
    });
    return Math.max(0, stockDepot);
  };

  const idsArticlesPresents = lignesValidees.map(l => String(l.id_article));
  const articlesFiltresModal = articles
    .filter(art => (art.Designation || '').toLowerCase().includes((rechercheArticle || '').toLowerCase()))
    .map(art => {
      const artId = String(art.id_article || art.id);
      const estDejaAjoute = idsArticlesPresents.includes(artId);
      const estEnCoursDeModif = indexEnCoursModif !== null && String(lignesValidees[indexEnCoursModif]?.id_article) === artId;
      return {
        ...art,
        idArticleFormate: artId,
        stockDepot: calculerStockPourDepotActuel(artId),
        prixAchatDefaut: art.Prix_Achat || art.prix_achat || '',
        estGrise: estDejaAjoute && !estEnCoursDeModif
      };
    });

  const articlesFiltresModalAffiches = articlesFiltresModal.slice(0, limiteArticlesModal);

  const fournisseursFiltresModal = fournisseursAvecStockage.filter(f => 
    (f.nom_fournisseur || f.nom || f.raison_sociale || '').toLowerCase().includes((rechercheFournisseur || '').toLowerCase())
  );
  const fournisseursFiltresModalAffiches = fournisseursFiltresModal.slice(0, limiteFournisseursModal);

  const depotsFiltresModal = depots.filter(d => 
    (d.nom_depot || d.nom || d.libelle || '').toLowerCase().includes((rechercheDepot || '').toLowerCase())
  );
  const depotsFiltresModalAffiches = depotsFiltresModal.slice(0, limiteDepotsModal);

  const montantTotalGlobal = lignesValidees.reduce((sum, item) => sum + (Number(item.quantite || 0) * Number(item.prix_achat || 0)), 0);
  const soldeRestant = statutPaiement === 'SOLDE' ? 0 : statutPaiement === 'CREDIT' ? montantTotalGlobal : Math.max(0, montantTotalGlobal - (parseFloat(montantPaye) || 0));

  const documentModifie = useMemo(() => {
    if (!approEnEditionId || !etatInitialEdition) return false;

    const norm = (val) => (val === null || val === undefined ? '' : String(val).trim());

    const init = etatInitialEdition;
    const enteteModifie = 
      norm(dateDoc) !== norm(init.dateDoc) ||
      norm(idFournisseur) !== norm(init.idFournisseur) ||
      norm(referenceFournisseur) !== norm(init.referenceFournisseur) ||
      norm(idDepotDestination) !== norm(init.idDepotDestination) ||
      norm(delaiLivraison) !== norm(init.delaiLivraison) ||
      norm(statutPaiement) !== norm(init.statutPaiement) ||
      Number(montantPaye || 0) !== Number(init.montantPaye || 0);

    const initLignes = init.lignes || [];
    let lignesModifiees = lignesValidees.length !== initLignes.length;
    if (!lignesModifiees) {
      for (let i = 0; i < lignesValidees.length; i++) {
        const cur = lignesValidees[i];
        const ini = initLignes[i];
        if (
          norm(cur.id_article) !== norm(ini.id_article) ||
          Number(cur.quantite) !== Number(ini.quantite) ||
          Number(cur.prix_achat) !== Number(ini.prix_achat)
        ) {
          lignesModifiees = true;
          break;
        }
      }
    }

    return enteteModifie || lignesModifiees;
  }, [approEnEditionId, etatInitialEdition, dateDoc, idFournisseur, referenceFournisseur, idDepotDestination, delaiLivraison, statutPaiement, montantPaye, lignesValidees]);

  const verifierEnTeteAvantSaisie = () => {
    if (documentEnLectureSeule) {
      setEtatModale({ ouverte: true, titre: 'Document verrouillé', message: 'Ce document est en lecture seule (journée clôturée).', type: 'erreur', onConfirmer: null });
      return false;
    }
    const dateDuJour = new Date().toISOString().split('T')[0];
    if (dateDoc < dateDuJour) {
      setEtatModale({ ouverte: true, titre: 'Modification interdite', message: `Le document est daté du ${dateDoc} (journée clôturée et verrouillée).`, type: 'erreur', onConfirmer: null });
      return false;
    }
    if (!dateDoc) { setEtatModale({ ouverte: true, titre: 'Champ requis', message: 'Veuillez renseigner la date.', type: 'erreur', onConfirmer: null }); return false; }
    if (!idFournisseur) { setEtatModale({ ouverte: true, titre: 'Champ requis', message: `Veuillez sélectionner un ${libelleTiers.toLowerCase()}.`, type: 'erreur', onConfirmer: null }); return false; }
    if (!estModeLivraison && (!referenceFournisseur || !referenceFournisseur.trim())) { setEtatModale({ ouverte: true, titre: 'Champ requis', message: 'Veuillez renseigner la référence.', type: 'erreur', onConfirmer: null }); return false; }
    if (!estPartenaireSansStockage && !idDepotDestination) { setEtatModale({ ouverte: true, titre: 'Champ requis', message: 'Veuillez sélectionner un dépôt.', type: 'erreur', onConfirmer: null }); return false; }
    return true;
  };

  const preparerNouveauDoc = (type) => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.peut_creer) {
      setEtatModale({ ouverte: true, titre: 'Accès refusé', message: 'Votre profil ne dispose pas des droits de création.', type: 'erreur', onConfirmer: null });
      return;
    }
    if (type === 'APPRO') {
      setNumeroDoc(genererNumeroDoc('APPRO', approvisionnements));
    } else {
      setNumeroDoc(genererNumeroDoc('COMMANDE', bonsCommandes));
    }
    setReferenceFournisseur('');
    setDateDoc(new Date().toISOString().split('T')[0]);
    setIdFournisseur('');
    setIdDepotDestination('');
    setLignesValidees([]);
    setApproEnEditionId(null);
    setDocEnEditionObjet(null);
    setDocumentEnLectureSeule(false);
    setEtatInitialEdition(null);
    setStatutPaiement('SOLDE');
    setMontantPaye(0);
    setIndexEnCoursModif(null);
    setVueActive(type === 'APPRO' ? 'formulaire_facture' : 'formulaire_commande');
  };

  const ajouterArticleCourant = () => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;
    if (!verifierEnTeteAvantSaisie()) return;
    if (!articleCourant.id_article) { setEtatModale({ ouverte: true, titre: 'Article requis', message: 'Veuillez sélectionner un article.', type: 'erreur', onConfirmer: null }); return; }
    const qte = parseInt(articleCourant.quantite);
    const pxAchat = estModeLivraison ? 0 : parseFloat(articleCourant.prix_achat);
    if (isNaN(qte) || qte <= 0) { setEtatModale({ ouverte: true, titre: 'Quantité invalide', message: 'Veuillez entrer une quantité valide.', type: 'erreur', onConfirmer: null }); return; }
    if (!estModeLivraison && (isNaN(pxAchat) || pxAchat < 0)) { setEtatModale({ ouverte: true, titre: 'Prix invalide', message: 'Veuillez entrer un prix valide.', type: 'erreur', onConfirmer: null }); return; }

    const designationMaj = (articleCourant.designation || '').toUpperCase();
    const articleModifie = { ...articleCourant, designation: designationMaj, prix_achat: estModeLivraison ? 0 : pxAchat };

    if (indexEnCoursModif !== null) {
      const maj = [...lignesValidees];
      maj[indexEnCoursModif] = articleModifie;
      setLignesValidees(maj);
      setIndexEnCoursModif(null);
    } else {
      setLignesValidees([...lignesValidees, articleModifie]);
    }
    setArticleCourant({ id_article: '', designation: '', quantite: '1', prix_achat: '0' });
    setTimeout(() => { if (selectArticleRef.current) selectArticleRef.current.focus(); }, 50);
  };

  const gererKeyDown = (e) => {
    if (e.key === 'Enter' && articleCourant.id_article) {
      e.preventDefault();
      ajouterArticleCourant();
    }
  };

  const chargerLignePourModification = (index) => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;
    const dateDuJour = new Date().toISOString().split('T')[0];
    if (dateDoc < dateDuJour) {
      setEtatModale({ ouverte: true, titre: 'Modification interdite', message: `Ce document appartient à une journée clôturée (${dateDoc}).`, type: 'erreur', onConfirmer: null });
      return;
    }
    const ligne = lignesValidees[index];
    setArticleCourant({ id_article: ligne.id_article, designation: ligne.designation, quantite: ligne.quantite, prix_achat: ligne.prix_achat });
    setIndexEnCoursModif(index);
  };

  const preparerEnregistrementFacture = (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;

    const dateDuJour = new Date().toISOString().split('T')[0];
    if (dateDoc < dateDuJour) {
      setEtatModale({ ouverte: true, titre: 'Modification interdite', message: `Impossible d'enregistrer sur la date du ${dateDoc} car cette journée est clôturée.`, type: 'erreur', onConfirmer: null });
      return;
    }

    if (approEnEditionId && !permissions.peut_modifier) {
      setEtatModale({ ouverte: true, titre: 'Accès refusé', message: 'Votre profil ne dispose pas des droits de modification.', type: 'erreur', onConfirmer: null });
      return;
    }
    if (!approEnEditionId && !permissions.peut_creer) {
      setEtatModale({ ouverte: true, titre: 'Accès refusé', message: 'Votre profil ne dispose pas des droits de création.', type: 'erreur', onConfirmer: null });
      return;
    }
    if (!verifierEnTeteAvantSaisie() || lignesValidees.length === 0) { 
      if (lignesValidees.length === 0) {
        setEtatModale({ ouverte: true, titre: 'Articles requis', message: 'Ajoutez au moins un article.', type: 'erreur', onConfirmer: null });
      }
      return; 
    }

    setEtatModale({
      ouverte: true,
      titre: 'Confirmation requise',
      message: `Voulez-vous véritablement valider cet approvisionnement (${numeroDoc}) ?`,
      type: 'confirmation',
      onConfirmer: executerEnregistrementFacture
    });
  };

  const executerEnregistrementFacture = async () => {
    setEnTrainDeSauvegarder(true);
    try {
      const timestampUnique = Date.now().toString().slice(-6);
      const ancienNumeroBon = docEnEditionObjet?.numero_bon || null;
      const numeroUniqueArrierePlan = (approEnEditionId && ancienNumeroBon)
        ? ancienNumeroBon
        : `APP-${entrepriseId}-${timestampUnique}-${String(approvisionnements.length + 1).padStart(3, '0')}`;
      const numeroAffichageFinal = numeroDoc;
      const depotCibleEffectif = estPartenaireSansStockage ? null : idDepotDestination;

      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        numero_bon: numeroUniqueArrierePlan,
        id_fournisseur: idFournisseur,
        numero_commande: (referenceFournisseur || '').trim().toUpperCase(),
        id_depot_destination: depotCibleEffectif,
        montant_total: estModeLivraison ? 0 : montantTotalGlobal,
        montant_paye: estModeLivraison ? 0 : (statutPaiement === 'SOLDE' ? montantTotalGlobal : statutPaiement === 'CREDIT' ? 0 : parseFloat(montantPaye) || 0),
        statut_paiement: estModeLivraison ? 'SOLDE' : statutPaiement,
        details_articles: lignesValidees.map(l => ({ 
          id_article: l.id_article, 
          designation: (l.designation || '').toUpperCase(), 
          quantite: Number(l.quantite), 
          prix_achat: estModeLivraison ? 0 : Number(l.prix_achat), 
          sous_total: estModeLivraison ? 0 : Number(l.quantite) * Number(l.prix_achat) 
        })),
        created_at: `${dateDoc}T12:00:00`
      };

      if (approEnEditionId) { 
        payload.id = approEnEditionId;
        const { error } = await supabase.from('approvisionnements').update(payload).eq('id', approEnEditionId).eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
        if (error) {
          localSync.ajouterFileAttente('UPDATE', 'approvisionnements', payload);
        }

        const listeMaj = approvisionnements.map(a => a.id === approEnEditionId ? { ...a, ...payload } : a);
        setApprovisionnements(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheAppro, listeMaj);
      } else { 
        const idTemp = 'temp_' + Date.now();
        const nouvelObjet = { ...payload, id: idTemp };
        const { error } = await supabase.from('approvisionnements').insert([payload]); 
        if (error) {
          localSync.ajouterFileAttente('INSERT', 'approvisionnements', payload);
        }

        const listeMaj = [...approvisionnements, nouvelObjet];
        setApprovisionnements(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheAppro, listeMaj);
      }

      // ✅ Synchronisation atomique et sans doublon dans mouvements_stock
      await synchroniserMouvementsStockAppro({
        numeroBonArrierePlan: numeroUniqueArrierePlan,
        ancienNumeroBonArrierePlan: ancienNumeroBon,
        depotId: depotCibleEffectif,
        lignes: lignesValidees,
        refFournisseur: referenceFournisseur,
        dateDocument: dateDoc,
        estSuppression: false
      });

      localStorage.removeItem(cleCacheAppro);
      setEtatInitialEdition(null);
      
      setEtatModale({
        ouverte: true,
        titre: 'Opération réussie',
        message: `Approvisionnement ${numeroAffichageFinal} enregistré avec succès !`,
        type: 'succes',
        onConfirmer: null
      });

      setVueActive('liste');
      await chargerDonnees(true);
    } catch (err) { 
      setEtatModale({ ouverte: true, titre: 'Erreur', message: 'Erreur : ' + err.message, type: 'erreur', onConfirmer: null });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const preparerEnregistrementCommande = (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;

    const dateDuJour = new Date().toISOString().split('T')[0];
    if (dateDoc < dateDuJour) {
      setEtatModale({ ouverte: true, titre: 'Modification interdite', message: `Impossible d'enregistrer sur la date du ${dateDoc} car cette journée est clôturée.`, type: 'erreur', onConfirmer: null });
      return;
    }

    if (approEnEditionId && !permissions.peut_modifier) {
      setEtatModale({ ouverte: true, titre: 'Accès refusé', message: 'Votre profil ne dispose pas des droits de modification.', type: 'erreur', onConfirmer: null });
      return;
    }
    if (!approEnEditionId && !permissions.peut_creer) {
      setEtatModale({ ouverte: true, titre: 'Accès refusé', message: 'Votre profil ne dispose pas des droits de création.', type: 'erreur', onConfirmer: null });
      return;
    }
    if (!verifierEnTeteAvantSaisie() || lignesValidees.length === 0) { 
      if (lignesValidees.length === 0) {
        setEtatModale({ ouverte: true, titre: 'Articles requis', message: 'Ajoutez au moins un article.', type: 'erreur', onConfirmer: null });
      }
      return; 
    }

    setEtatModale({
      ouverte: true,
      titre: 'Confirmation requise',
      message: `Voulez-vous véritablement valider ce bon de commande (${numeroDoc}) ?`,
      type: 'confirmation',
      onConfirmer: executerEnregistrementCommande
    });
  };

  const executerEnregistrementCommande = async () => {
    setEnTrainDeSauvegarder(true);
    try {
      const timestampUnique = Date.now().toString().slice(-6);
      const numeroUniqueArrierePlan = `BC-${entrepriseId}-${timestampUnique}-${String(bonsCommandes.length + 1).padStart(3, '0')}`;
      const numeroAffichageFinal = numeroDoc;

      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        numero_commande: numeroUniqueArrierePlan,
        id_fournisseur: idFournisseur,
        id_depot_destination: estPartenaireSansStockage ? null : idDepotDestination,
        montant_total: estModeLivraison ? 0 : montantTotalGlobal,
        statut_commande: 'EN_ATTENTE',
        delai_livraison: delaiLivraison.trim().toUpperCase(),
        details_articles: lignesValidees.map(l => ({ 
          id_article: l.id_article, 
          designation: (l.designation || '').toUpperCase(), 
          quantite: Number(l.quantite), 
          prix_achat: estModeLivraison ? 0 : Number(l.prix_achat), 
          sous_total: estModeLivraison ? 0 : Number(l.quantite) * Number(l.prix_achat) 
        })),
        created_at: `${dateDoc}T12:00:00`
      };

      if (approEnEditionId) { 
        payload.id = approEnEditionId;
        const { error } = await supabase.from('bons_commande_fournisseurs').update(payload).eq('id', approEnEditionId).eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
        if (error) {
          localSync.ajouterFileAttente('UPDATE', 'bons_commande_fournisseurs', payload);
        }

        const listeMaj = bonsCommandes.map(c => c.id === approEnEditionId ? { ...c, ...payload } : c);
        setBonsCommandes(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheCommandes, listeMaj);
      } else { 
        const idTemp = 'temp_' + Date.now();
        const nouvelObjet = { ...payload, id: idTemp };
        const { error } = await supabase.from('bons_commande_fournisseurs').insert([payload]); 
        if (error) {
          localSync.ajouterFileAttente('INSERT', 'bons_commande_fournisseurs', payload);
        }

        const listeMaj = [...bonsCommandes, nouvelObjet];
        setBonsCommandes(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheCommandes, listeMaj);
      }

      localStorage.removeItem(cleCacheCommandes);
      setEtatInitialEdition(null);

      setEtatModale({
        ouverte: true,
        titre: 'Opération réussie',
        message: `Bon de commande ${numeroAffichageFinal} enregistré avec succès !`,
        type: 'succes',
        onConfirmer: null
      });

      setVueActive('liste');
      await chargerDonnees(true);
    } catch (err) { 
      setEtatModale({ ouverte: true, titre: 'Erreur', message: 'Erreur : ' + err.message, type: 'erreur', onConfirmer: null });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const transformerEnFacture = async (doc) => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;

    const dateDuJour = new Date().toISOString().split('T')[0];
    const docDateStr = doc?.created_at ? doc.created_at.split('T')[0] : dateDuJour;
    if (docDateStr < dateDuJour) {
      setEtatModale({ ouverte: true, titre: 'Action interdite', message: `Ce bon appartient à une journée clôturée (${docDateStr}).`, type: 'erreur', onConfirmer: null });
      return;
    }

    if (!permissions.peut_valider) {
      setEtatModale({ ouverte: true, titre: 'Accès refusé', message: 'Votre profil ne dispose pas des droits de validation/transformation.', type: 'erreur', onConfirmer: null });
      return;
    }
    if (!doc) return;

    setEtatModale({
      ouverte: true,
      titre: 'Confirmation de transformation',
      message: 'Voulez-vous transformer ce bon de commande en approvisionnement (ce qui va incrémenter le stock) ?',
      type: 'confirmation',
      onConfirmer: () => executerTransformationEnFacture(doc)
    });
  };

  const executerTransformationEnFacture = async (doc) => {
    setEnTrainDeSauvegarder(true);
    try {
      const timestampUnique = Date.now().toString().slice(-6);
      const nouveauNumApproArrierePlan = `APP-${entrepriseId}-${timestampUnique}-${String(approvisionnements.length + 1).padStart(3, '0')}`;
      const nouveauNumAffichage = genererNumeroDoc('APPRO', approvisionnements);
      const depotCibleEffectif = estPartenaireSansStockage ? null : (doc.id_depot_destination || idDepotDestination);
      const lignesNormalisees = (Array.isArray(doc.details_articles) ? doc.details_articles : lignesValidees).map(l => ({ 
        id_article: l.id_article, 
        designation: (l.designation || '').toUpperCase(), 
        quantite: Number(l.quantite), 
        prix_achat: estModeLivraison ? 0 : Number(l.prix_achat), 
        sous_total: estModeLivraison ? 0 : Number(l.quantite) * Number(l.prix_achat) 
      }));
      const dateDocEffectif = doc.created_at ? doc.created_at.split('T')[0] : dateDoc;
      
      const payloadFacture = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        numero_bon: nouveauNumApproArrierePlan,
        id_fournisseur: doc.id_fournisseur || idFournisseur,
        numero_commande: (doc.numero_commande || referenceFournisseur || '').trim().toUpperCase(),
        id_depot_destination: depotCibleEffectif,
        montant_total: estModeLivraison ? 0 : (doc.montant_total || montantTotalGlobal),
        montant_paye: estModeLivraison ? 0 : (doc.montant_total || montantTotalGlobal),
        statut_paiement: 'SOLDE',
        details_articles: lignesNormalisees,
        created_at: doc.created_at || `${dateDoc}T12:00:00`
      };

      const { error: rpcError } = await supabase.rpc('transformer_commande_en_appro', {
        p_entreprise_id: entrepriseId,
        p_module: moduleActuel,
        p_commande_id: doc.id,
        p_nouveau_num_bon: nouveauNumApproArrierePlan,
        p_payload_facture: payloadFacture
      });

      if (rpcError) {
        const { error: errInsert } = await supabase.from('approvisionnements').insert([payloadFacture]);
        if (errInsert) {
          localSync.ajouterFileAttente('INSERT', 'approvisionnements', payloadFacture);
        }

        if (doc.id) {
          const { error: errDel } = await supabase.from('bons_commande_fournisseurs').delete().eq('id', doc.id).eq('id_entreprise', entrepriseId);
          if (errDel) {
            localSync.ajouterFileAttente('DELETE', 'bons_commande_fournisseurs', { id: doc.id });
          }
        }
      }

      // ✅ Écriture propre et sans doublon dans mouvements_stock lors de la transformation
      await synchroniserMouvementsStockAppro({
        numeroBonArrierePlan: nouveauNumApproArrierePlan,
        depotId: depotCibleEffectif,
        lignes: lignesNormalisees,
        refFournisseur: doc.numero_commande || referenceFournisseur,
        dateDocument: dateDocEffectif,
        estSuppression: false
      });

      localStorage.removeItem(cleCacheAppro);
      localStorage.removeItem(cleCacheCommandes);
      setEtatInitialEdition(null);

      setEtatModale({
        ouverte: true,
        titre: 'Transformation réussie',
        message: `Le bon a été transformé en approvisionnement : ${nouveauNumAffichage}`,
        type: 'succes',
        onConfirmer: null
      });

      setVueActive('liste');
      setOngletActif('APPRO');
      await chargerDonnees(true);
    } catch (err) {
      setEtatModale({ ouverte: true, titre: 'Erreur', message: 'Erreur lors de la transformation : ' + err.message, type: 'erreur', onConfirmer: null });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirDocModification = (doc, type, indexReel) => {
    if (enTrainDeSauvegarder) return;

    const dateDocStr = doc.created_at ? doc.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    const dateDuJour = new Date().toISOString().split('T')[0];
    const estVerrouille = dateDocStr < dateDuJour;

    setDocumentEnLectureSeule(estVerrouille);
    setApproEnEditionId(doc.id);
    setDocEnEditionObjet(doc);
    setNumeroDoc(formaterNumeroAffichageIndex(indexReel, type));
    setReferenceFournisseur(doc.numero_commande || doc.reference || '');
    setDateDoc(dateDocStr);
    setIdFournisseur(doc.id_fournisseur || '');
    setIdDepotDestination(doc.id_depot_destination || '');
    setDelaiLivraison(doc.delai_livraison || '7 JOURS');
    setStatutPaiement(doc.statut_paiement || 'SOLDE');
    setMontantPaye(doc.montant_paye || 0);

    let articlesDetails = [];
    if (doc.details_articles) {
      if (typeof doc.details_articles === 'string') { try { articlesDetails = JSON.parse(doc.details_articles); } catch (e) {} }
      else if (Array.isArray(doc.details_articles)) { articlesDetails = doc.details_articles; }
    }
    const lignesInitiales = articlesDetails.map(l => ({ 
      id_article: String(l.id_article || l.article_id || ''), 
      designation: (l.designation || l.Designation || l.libelle || '').toUpperCase(), 
      quantite: String(l.quantite || l.Quantite || 1), 
      prix_achat: String(l.prix_achat || l.Prix_Achat || l.prix_estime || '0') 
    }));
    setLignesValidees(lignesInitiales);
    setIndexEnCoursModif(null);
    setVueActive(type === 'APPRO' ? 'formulaire_facture' : 'formulaire_commande');

    setEtatInitialEdition({
      dateDoc: dateDocStr,
      idFournisseur: String(doc.id_fournisseur || ''),
      referenceFournisseur: String(doc.numero_commande || doc.reference || ''),
      idDepotDestination: String(doc.id_depot_destination || ''),
      delaiLivraison: String(doc.delai_livraison || '7 JOURS'),
      statutPaiement: String(doc.statut_paiement || 'SOLDE'),
      montantPaye: Number(doc.montant_paye || 0),
      lignes: JSON.parse(JSON.stringify(lignesInitiales)),
      typeDoc: type
    });
  };

  const supprimerDoc = async (id, type) => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;

    const dateDuJour = new Date().toISOString().split('T')[0];
    if (dateDoc < dateDuJour) {
      setEtatModale({ ouverte: true, titre: 'Suppression interdite', message: `Ce document appartient à une journée clôturée (${dateDoc}).`, type: 'erreur', onConfirmer: null });
      return;
    }

    if (!permissions.peut_supprimer) {
      setEtatModale({ ouverte: true, titre: 'Accès refusé', message: 'Votre profil ne dispose pas des droits de suppression.', type: 'erreur', onConfirmer: null });
      return;
    }

    setEtatModale({
      ouverte: true,
      titre: 'Confirmation de suppression',
      message: 'Voulez-vous véritablement supprimer ce document ?',
      type: 'confirmation',
      onConfirmer: () => executerSuppressionDoc(id, type)
    });
  };

  const executerSuppressionDoc = async (id, type) => {
    setEnTrainDeSauvegarder(true);
    try {
      const table = type === 'APPRO' ? 'approvisionnements' : 'bons_commande_fournisseurs';
      const docASupprimer = type === 'APPRO' ? approvisionnements.find(a => a.id === id) : null;

      const { error } = await supabase.from(table).delete().eq('id', id).eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      if (error) {
        localSync.ajouterFileAttente('DELETE', table, { id });
      }

      if (type === 'APPRO') {
        if (docASupprimer?.numero_bon) {
          await synchroniserMouvementsStockAppro({
            numeroBonArrierePlan: docASupprimer.numero_bon,
            estSuppression: true
          });
        }
        const listeMaj = approvisionnements.filter(a => a.id !== id);
        setApprovisionnements(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheAppro, listeMaj);
        localStorage.removeItem(cleCacheAppro);
      } else {
        const listeMaj = bonsCommandes.filter(c => c.id !== id);
        setBonsCommandes(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheCommandes, listeMaj);
        localStorage.removeItem(cleCacheCommandes);
      }

      setEtatInitialEdition(null);
      setEtatModale({ ouverte: true, titre: 'Supprimé', message: 'Le document a été supprimé avec succès.', type: 'succes', onConfirmer: null });
      setDocumentEnLectureSeule(false);
      setVueActive('liste');
      await chargerDonnees(true);
    } catch (err) { 
      setEtatModale({ ouverte: true, titre: 'Erreur', message: 'Erreur : ' + err.message, type: 'erreur', onConfirmer: null });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const gererTri = (colonne) => {
    if (triCol === colonne) setTriOrdre(triOrdre === 'asc' ? 'desc' : 'asc');
    else { setTriCol(colonne); setTriOrdre('asc'); }
  };

  const obtenirNomFournisseur = (idFourn) => {
    const f = fournisseurs.find(item => String(item.id) === String(idFourn));
    return f ? (f.nom_fournisseur || f.nom || f.raison_sociale || '').toUpperCase() : '';
  };

  const trierListe = (liste) => {
    return [...liste].sort((a, b) => {
      let valA = ''; let valB = '';
      if (triCol === 'date') { valA = a.created_at || ''; valB = b.created_at || ''; }
      else if (triCol === 'numero') { valA = a.numero_bon || a.numero_commande || ''; valB = b.numero_bon || b.numero_commande || ''; }
      else if (triCol === 'fournisseur') { valA = obtenirNomFournisseur(a.id_fournisseur); valB = obtenirNomFournisseur(b.id_fournisseur); }
      else if (triCol === 'statut') { valA = a.statut_paiement || a.statut_commande || ''; valB = b.statut_commande || ''; }
      if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const documentsHistorique = trierListe(approvisionnements);
  const commandesHistorique = trierListe(bonsCommandes);

  const documentsHistoriqueAffiches = documentsHistorique.slice(0, limiteAppro);
  const commandesHistoriqueAffiches = commandesHistorique.slice(0, limiteCommandes);
  
  const enTeteVerrouille = lignesValidees.length > 0 || enTrainDeSauvegarder || documentEnLectureSeule;
  const rendreFlecheTri = (colonne) => triCol !== colonne ? <span className="text-slate-400 ml-0.5">↕</span> : <span className="text-orange-500 ml-0.5">{triOrdre === 'asc' ? '↑' : '↓'}</span>;

  const fournisseurIdEffectif = idFournisseur || docEnEditionObjet?.id_fournisseur || '';
  const nomFournisseurImpression = obtenirNomFournisseur(fournisseurIdEffectif) || '-';

  const depotIdEffectif = idDepotDestination || docEnEditionObjet?.id_depot_destination || '';
  const nomDepotObjEffectif = depots.find(d => String(d.id) === String(depotIdEffectif));
  const depotTexteImpression = estPartenaireSansStockage ? 'SANS STOCK' : (nomDepotObjEffectif ? (nomDepotObjEffectif.nom_depot || nomDepotObjEffectif.nom || nomDepotObjEffectif.libelle || '') : '-');

  let articlesImpression = lignesValidees.length > 0 ? lignesValidees : [];
  if (articlesImpression.length === 0 && docEnEditionObjet?.details_articles) {
    let details = docEnEditionObjet.details_articles;
    if (typeof details === 'string') { try { details = JSON.parse(details); } catch(e) {} }
    if (Array.isArray(details)) {
      articlesImpression = details.map(l => ({
        designation: l.designation || l.Designation || l.libelle || '',
        quantite: l.quantite || l.Quantite || 1,
        prix_achat: l.prix_achat || l.Prix_Achat || l.prix_estime || 0
      }));
    }
  }

  const montantTotalImpression = articlesImpression.reduce((sum, item) => sum + (Number(item.quantite || 0) * Number(item.prix_achat || 0)), 0);
  const statutPaiementEffectif = statutPaiement || docEnEditionObjet?.statut_paiement || 'SOLDE';
  const montantPayeEffectif = montantPaye || docEnEditionObjet?.montant_paye || 0;
  const soldeRestantImpression = statutPaiementEffectif === 'SOLDE' ? 0 : statutPaiementEffectif === 'CREDIT' ? montantTotalImpression : Math.max(0, montantTotalImpression - (parseFloat(montantPayeEffectif) || 0));

  const nomEntrepriseImpression = entrepriseInfo?.nom_entreprise || entrepriseInfo?.nom || '4TS Suite manager';
  const libelleDepotImpression = moduleActuel === 'LIVRAISON' ? 'Partenaire' : 'Dépôt';

  const nomPartenaireCourant = obtenirNomFournisseur(idFournisseur);
  const nomDepotCourant = estPartenaireSansStockage ? '-- SANS STOCK / AUCUN DÉPÔT --' : (nomDepotObjEffectif ? (nomDepotObjEffectif.nom_depot || nomDepotObjEffectif.nom || nomDepotObjEffectif.libelle || '') : '');

  const containerBg = isDarkMode ? 'bg-[#050b18] text-slate-100' : 'bg-slate-100 text-[#0a1931]';
  const cardBg = isDarkMode ? 'bg-[#0b1329] border-2 border-slate-700 text-slate-100 shadow-md' : 'bg-white border-2 border-[#0a1931]/60 text-[#0a1931] shadow-md';
  const inputBg = isDarkMode ? 'bg-slate-900 border-2 border-slate-600 text-slate-100 placeholder:text-slate-500' : 'bg-white border-2 border-slate-400 text-black font-semibold placeholder:text-slate-400';
  const tableHeaderBg = isDarkMode ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-[#0a1931] text-white border-blue-900';

  return (
    <div className={`space-y-2.5 font-sans text-xs ${containerBg} p-2 rounded-xl transition-colors`}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { 
            position: fixed; 
            left: 0; 
            top: 0; 
            width: 100vw; 
            height: 100vh;
            max-height: 275mm;
            margin: 0; 
            padding: 15px; 
            background: white; 
            box-sizing: border-box;
            page-break-after: avoid;
            page-break-before: avoid;
            page-break-inside: avoid;
            overflow: hidden;
            font-family: Arial, sans-serif;
            color: #0f172a;
          }
          @page { size: A4 portrait; margin: 0; }
        }
      ` }} />

      <div className="print-container hidden print:block bg-white text-slate-900 p-3 space-y-2.5 font-sans text-xs">
        <div style={{ borderBottom: '3px solid #f97316', paddingBottom: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', margin: 0 }}>📦 {nomEntrepriseImpression}</h1>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginTop: '3px' }}>
              {vueActive === 'formulaire_facture' ? "BON D'APPROVISIONNEMENT" : vueActive === 'formulaire_commande' ? "BON DE COMMANDE" : "BON D'APPROVISIONNEMENT"}
            </div>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', textAlign: 'right' }}>
            Édité le : {new Date().toLocaleDateString('fr-FR')}
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '15px', fontSize: '10.5px' }}>
          <span><strong>{libelleTiers} :</strong> <span className="uppercase">{nomFournisseurImpression}</span></span>
          <span><strong>{libelleDepotImpression} :</strong> <span className="uppercase">{depotTexteImpression}</span></span>
          <span><strong>Date :</strong> {dateDoc ? new Date(dateDoc).toLocaleDateString('fr-FR') : '-'}</span>
          <span><strong>Réf :</strong> {referenceFournisseur || docEnEditionObjet?.numero_commande || '-'}</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'left', textTransform: 'uppercase', fontWeight: 900, fontSize: '9px', color: '#334155' }}>Désignation</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', textTransform: 'uppercase', fontWeight: 900, fontSize: '9px', color: '#334155', width: '50px' }}>Qté</th>
              {!estModeLivraison && (
                <>
                  <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', textTransform: 'uppercase', fontWeight: 900, fontSize: '9px', color: '#334155', width: '80px' }}>P. Unitaire</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', textTransform: 'uppercase', fontWeight: 900, fontSize: '9px', color: '#334155', width: '90px' }}>Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {articlesImpression.length === 0 ? (
              <tr><td colSpan={estModeLivraison ? 2 : 4} style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>Aucun article dans ce document.</td></tr>
            ) : (
              articlesImpression.map((l, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', fontWeight: 'bold', textTransform: 'uppercase' }}>{l.designation}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', fontWeight: 900 }}>{l.quantite}</td>
                  {!estModeLivraison && (
                    <>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'right' }}>{Number(l.prix_achat || 0).toLocaleString('fr-FR')} F</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'right', fontWeight: 900 }}>{(Number(l.quantite || 0) * Number(l.prix_achat || 0)).toLocaleString('fr-FR')} F</td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!estModeLivraison && articlesImpression.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <div style={{ width: '220px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', textAlign: 'right', fontSize: '10px' }}>
              <p style={{ margin: '2px 0', fontWeight: 'bold' }}>Montant Total : <span style={{ fontWeight: 900, color: '#047857', fontSize: '11px' }}>{montantTotalImpression.toLocaleString('fr-FR')} F</span></p>
              {statutPaiementEffectif !== 'SOLDE' && (
                <>
                  <p style={{ margin: '2px 0', fontWeight: 'bold' }}>Montant Réglé : <span>{Number(montantPayeEffectif || 0).toLocaleString('fr-FR')} F</span></p>
                  <p style={{ margin: '2px 0', fontWeight: 'bold' }}>Reste à payer : <span style={{ color: '#ea580c', fontWeight: 900 }}>{soldeRestantImpression.toLocaleString('fr-FR')} F</span></p>
                </>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 'bold', color: '#334155' }}>
          <div><p>Signature & Cachet {libelleTiers} :</p></div>
          <div style={{ textAlign: 'right' }}><p>Signature & Cachet Entreprise :</p></div>
        </div>
      </div>

      <div className="print:hidden space-y-2.5">
        <div className={`flex justify-between items-center p-3 rounded-xl ${cardBg}`}>
          <div className="flex items-center gap-2">
            <h3 className={`font-black uppercase text-xs flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-[#0a1931]'}`}>
              <span>📦</span> APPROVISIONNEMENTS
            </h3>
            {roleUtilisateur && (
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                Rôle : {roleUtilisateur.nom_role || roleUtilisateur.nom || 'Employé'}
              </span>
            )}
          </div>
          {vueActive === 'liste' ? (
            permissions.peut_creer && (
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => setVueActive('choix_creation')}
                className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-black px-3 py-1.5 rounded-lg transition shadow-xs text-xs cursor-pointer border border-orange-500"
              >
                + Nouveau
              </button>
            )
          ) : (
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={() => {
                setVueActive('liste');
                setDocumentEnLectureSeule(false);
                setEtatInitialEdition(null);
              }}
              className={`font-black px-3 py-1.5 rounded-lg transition shadow-xs text-xs cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'}`}
            >
              ✕ Fermer
            </button>
          )}
        </div>

        {vueActive === 'liste' && (
          <div className="space-y-2">
            <div className={`p-3 rounded-xl border-2 shadow-md space-y-2 ${cardBg}`}>
              <div className={`flex justify-between items-center text-[9px] font-black uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <span>📅 Période (Mois en cours)</span>
                {(dateDebutFiltre !== obtenirPremierJourDuMois() || dateFinFiltre !== obtenirDernierJourDuMois()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateDebutFiltre(obtenirPremierJourDuMois());
                      setDateFinFiltre(obtenirDernierJourDuMois());
                    }}
                    className="text-orange-500 hover:underline font-black"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-[8px] font-black uppercase mb-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Du</label>
                  <input
                    type="date"
                    value={dateDebutFiltre}
                    onChange={(e) => setDateDebutFiltre(e.target.value)}
                    className={`w-full rounded-lg p-1.5 text-xs font-mono font-bold shadow-xs ${inputBg}`}
                  />
                </div>
                <div>
                  <label className={`block text-[8px] font-black uppercase mb-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Au</label>
                  <input
                    type="date"
                    value={dateFinFiltre}
                    onChange={(e) => setDateFinFiltre(e.target.value)}
                    className={`w-full rounded-lg p-1.5 text-xs font-mono font-bold shadow-xs ${inputBg}`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button" 
                disabled={enTrainDeSauvegarder}
                onClick={() => { setOngletActif('APPRO'); setVueActive('liste'); }} 
                className={`px-3 py-2 rounded-xl font-black text-xs transition text-center border-2 shadow-xs cursor-pointer ${
                  ongletActif === 'APPRO' 
                    ? (isDarkMode ? 'bg-slate-800 text-white border-slate-500' : 'bg-[#0a1931] text-white border-[#0a1931]')
                    : (isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-white text-slate-800 border-slate-300')
                }`}
              >
                📥 Appro ({documentsHistoriqueAffiches.length} / {documentsHistorique.length})
              </button>
              <button 
                type="button" 
                disabled={enTrainDeSauvegarder}
                onClick={() => { setOngletActif('COMMANDE'); setVueActive('liste'); }} 
                className={`px-3 py-2 rounded-xl font-black text-xs transition text-center border-2 shadow-xs cursor-pointer ${
                  ongletActif === 'COMMANDE' 
                    ? (isDarkMode ? 'bg-slate-800 text-white border-slate-500' : 'bg-[#0a1931] text-white border-[#0a1931]')
                    : (isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-white text-slate-800 border-slate-300')
                }`}
              >
                📋 Commandes ({commandesHistoriqueAffiches.length} / {commandesHistorique.length})
              </button>
            </div>
          </div>
        )}

        {vueActive === 'liste' && (
          <div className="space-y-2.5">
            {ongletActif === 'APPRO' && (
              <div className="space-y-2">
                <div className={`rounded-xl border-2 overflow-hidden shadow-md ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-400'}`}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b-2 uppercase text-[9.5px] font-black ${tableHeaderBg}`}>
                        <th onClick={() => gererTri('date')} className="p-2.5 w-[18%] cursor-pointer hover:bg-slate-800 select-none whitespace-nowrap">DATE {rendreFlecheTri('date')}</th>
                        <th onClick={() => gererTri('numero')} className="p-2.5 w-[22%] font-mono cursor-pointer hover:bg-slate-800 select-none whitespace-nowrap">N° APPRO {rendreFlecheTri('numero')}</th>
                        <th onClick={() => gererTri('fournisseur')} className="p-2.5 w-[42%] cursor-pointer hover:bg-slate-800 select-none whitespace-nowrap">{libelleTiers} {rendreFlecheTri('fournisseur')}</th>
                        {!estModeLivraison && <th onClick={() => gererTri('statut')} className="p-2.5 w-[18%] text-right cursor-pointer hover:bg-slate-800 select-none whitespace-nowrap">STATUT {rendreFlecheTri('statut')}</th>}
                      </tr>
                    </thead>
                    <tbody className={`divide-y-2 text-xs ${isDarkMode ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-900'}`}>
                      {documentsHistoriqueAffiches.length === 0 ? (
                        <tr><td colSpan={estModeLivraison ? 3 : 4} className={`p-6 text-center font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Aucun approvisionnement enregistré.</td></tr>
                      ) : (
                        documentsHistoriqueAffiches.map((doc, idx) => (
                          <tr key={doc.id} onClick={() => ouvrirDocModification(doc, 'APPRO', idx)} className={`cursor-pointer transition select-none ${isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-orange-50/70'}`}>
                            <td className={`p-2.5 font-bold whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{new Date(doc.created_at).toLocaleDateString('fr-FR')}</td>
                            <td className="p-2.5 font-mono font-black text-orange-500 whitespace-nowrap">{formaterNumeroAffichageIndex(idx, 'APPRO')}</td>
                            <td className={`p-2.5 font-extrabold uppercase truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{obtenirNomFournisseur(doc.id_fournisseur) || libelleTiers}</td>
                            {!estModeLivraison && (
                              <td className="p-2.5 text-right whitespace-nowrap">
                                <span className={`inline-block px-2 py-0.5 rounded font-black text-[9px] border ${doc.statut_paiement === 'SOLDE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-orange-500/20 text-orange-400 border-orange-500/40'}`}>
                                  {doc.statut_paiement === 'PARTIEL' ? 'AVANCE' : (doc.statut_paiement || 'SOLDE')}
                                </span>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {limiteAppro < documentsHistorique.length && (
                  <div className="text-center pt-1 pb-1">
                    <button
                      type="button"
                      onClick={() => setLimiteAppro(prev => prev + 20)}
                      className={`font-black px-4 py-2 rounded-xl text-xs transition shadow-xs border-2 cursor-pointer ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700' : 'bg-slate-200 text-slate-900 border-slate-400 hover:bg-slate-300'}`}
                    >
                      📥 Charger 20 appros de plus ({documentsHistorique.length - limiteAppro} restants)
                    </button>
                  </div>
                )}
              </div>
            )}

            {ongletActif === 'COMMANDE' && (
              <div className="space-y-2">
                <div className={`rounded-xl border-2 overflow-hidden shadow-md ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-400'}`}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b-2 uppercase text-[9.5px] font-black ${tableHeaderBg}`}>
                        <th onClick={() => gererTri('date')} className="p-2.5 w-[20%] cursor-pointer hover:bg-slate-800 select-none whitespace-nowrap">DATE {rendreFlecheTri('date')}</th>
                        <th onClick={() => gererTri('numero')} className="p-2.5 w-[35%] font-mono cursor-pointer hover:bg-slate-800 select-none whitespace-nowrap">N° CMD {rendreFlecheTri('numero')}</th>
                        <th onClick={() => gererTri('fournisseur')} className="p-2.5 w-[45%] cursor-pointer hover:bg-slate-800 select-none whitespace-nowrap">{libelleTiers} {rendreFlecheTri('fournisseur')}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y-2 text-xs ${isDarkMode ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-900'}`}>
                      {commandesHistoriqueAffiches.length === 0 ? (
                        <tr><td colSpan="3" className={`p-6 text-center font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Aucun bon de commande enregistré.</td></tr>
                      ) : (
                        commandesHistoriqueAffiches.map((cmd, idx) => (
                          <tr key={cmd.id} onClick={() => ouvrirDocModification(cmd, 'COMMANDE', idx)} className={`cursor-pointer transition select-none ${isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-orange-50/70'}`}>
                            <td className={`p-2.5 font-bold whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{new Date(cmd.created_at).toLocaleDateString('fr-FR')}</td>
                            <td className="p-2.5 font-mono font-black text-blue-500 whitespace-nowrap">{formaterNumeroAffichageIndex(idx, 'COMMANDE')}</td>
                            <td className={`p-2.5 font-extrabold uppercase truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{obtenirNomFournisseur(cmd.id_fournisseur) || libelleTiers}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {limiteCommandes < commandesHistorique.length && (
                  <div className="text-center pt-1 pb-1">
                    <button
                      type="button"
                      onClick={() => setLimiteCommandes(prev => prev + 20)}
                      className={`font-black px-4 py-2 rounded-xl text-xs transition shadow-xs border-2 cursor-pointer ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700' : 'bg-slate-200 text-slate-900 border-slate-400 hover:bg-slate-300'}`}
                    >
                      📥 Charger 20 commandes de plus ({commandesHistorique.length - limiteCommandes} restantes)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {vueActive === 'choix_creation' && (
          <div className={`p-4 rounded-2xl border-2 shadow-xl space-y-3 max-w-sm mx-auto text-center ${cardBg}`}>
            <div className={`border-b-2 pb-2 flex justify-between items-center ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
              <span className={`font-black text-xs uppercase ${isDarkMode ? 'text-white' : 'text-[#0a1931]'}`}>CHOISIR LE TYPE DE DOCUMENT</span>
              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setVueActive('liste')} className="text-slate-400 hover:text-slate-200 font-black text-xs cursor-pointer">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" disabled={enTrainDeSauvegarder || !permissions.peut_creer} onClick={() => preparerNouveauDoc('COMMANDE')} className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition shadow-md border-2 cursor-pointer ${isDarkMode ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-white' : 'bg-white hover:bg-blue-50 border-slate-300 text-slate-900'}`}>
                <span className="text-2xl">📋</span>
                <span className="font-black text-[11px]">Bon de Commande</span>
              </button>
              <button type="button" disabled={enTrainDeSauvegarder || !permissions.peut_creer} onClick={() => preparerNouveauDoc('APPRO')} className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition shadow-md border-2 cursor-pointer ${isDarkMode ? 'bg-slate-900 hover:bg-slate-800 border-emerald-500/40 text-white' : 'bg-white hover:bg-emerald-50 border-emerald-500/40 text-emerald-900'}`}>
                <span className="text-2xl">📥</span>
                <span className="font-black text-[11px]">Approvisionnement</span>
              </button>
            </div>
          </div>
        )}

        {vueActive === 'formulaire_facture' && (
          <form onSubmit={preparerEnregistrementFacture} onKeyDown={gererKeyDown} className={`p-4 rounded-2xl border-2 shadow-md space-y-3 ${cardBg}`}>
            {documentEnLectureSeule && (
              <div className="bg-amber-500/20 border-2 border-amber-500/50 text-amber-300 p-2.5 rounded-xl text-center font-black text-[10px] uppercase shadow-xs">
                🔒 DOCUMENT EN CONSULTATION SEULE (Journée clôturée et verrouillée)
              </div>
            )}
            <div className={`flex justify-between items-center border-b-2 pb-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
              <div className="flex items-center gap-2">
                <span className={`font-black text-xs uppercase ${isDarkMode ? 'text-white' : 'text-[#0a1931]'}`}>📥 APPROVISIONNEMENT {enTeteVerrouille && '🔒'}</span>
                <button type="button" disabled={enTrainDeSauvegarder} onClick={() => { setVueActive('liste'); setDocumentEnLectureSeule(false); setEtatInitialEdition(null); }} className={`font-black px-2.5 py-1 rounded-lg text-[10px] cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-400'}`}>⬅️ Retour</button>
              </div>
              <span className="bg-emerald-600 text-white font-mono px-3 py-1 rounded-lg text-xs font-black shadow-xs border border-emerald-500">{numeroDoc}</span>
            </div>
            
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl border-2 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
              <div>
                <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Date *</label>
                <input type="date" disabled={documentEnLectureSeule} required value={dateDoc} onChange={(e) => setDateDoc(e.target.value)} className={`w-full rounded-lg p-2 text-xs font-extrabold shadow-xs ${inputBg} disabled:opacity-70`} />
              </div>
              <div>
                <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{libelleTiers} *</label>
                <div 
                  onClick={() => { if (enTeteVerrouille) return; setModalFournisseurOuverte(true); }}
                  className={`w-full rounded-lg p-2 font-extrabold text-xs cursor-pointer truncate shadow-xs min-h-[32px] flex items-center ${inputBg}`}
                >
                  {nomPartenaireCourant || 'Sélectionner...'}
                </div>
              </div>
              <div>
                <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Réf. Doc {!estModeLivraison && '*'}</label>
                <input type="text" disabled={documentEnLectureSeule} required={!estModeLivraison} value={referenceFournisseur} onChange={(e) => setReferenceFournisseur(e.target.value.toUpperCase())} className={`w-full rounded-lg p-2 text-xs font-extrabold uppercase shadow-xs ${inputBg} disabled:opacity-70`} />
              </div>
              <div>
                <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {estPartenaireSansStockage ? 'DÉPÔT (SANS STOCK)' : (estModeLivraison ? 'DÉPÔT * (AUTO)' : 'DÉPÔT * (CHOIX)')}
                </label>
                {estPartenaireSansStockage ? (
                  <input type="text" disabled value="-- SANS STOCK --" className={`w-full rounded-lg p-2 font-extrabold text-xs shadow-xs cursor-not-allowed ${inputBg}`} />
                ) : estModeLivraison ? (
                  <input type="text" disabled value={nomDepotCourant} className={`w-full rounded-lg p-2 font-extrabold text-xs shadow-xs cursor-not-allowed ${inputBg}`} />
                ) : (
                  <div 
                    onClick={() => { if (enTeteVerrouille) return; setModalDepotOuverte(true); }}
                    className={`w-full rounded-lg p-2 font-extrabold text-xs cursor-pointer truncate shadow-xs min-h-[32px] flex items-center ${inputBg}`}
                  >
                    {nomDepotCourant || 'Sélectionner...'}
                  </div>
                )}
              </div>
            </div>

            {!documentEnLectureSeule && (
              <div className={`p-3 rounded-xl border-2 space-y-2 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                <div className={`grid ${estModeLivraison ? 'grid-cols-9' : 'grid-cols-12'} gap-2 items-end`}>
                  <div className={estModeLivraison ? 'col-span-6' : 'col-span-5'}>
                    <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Article *</label>
                    <div ref={selectArticleRef} tabIndex={0} onClick={() => { if (enTrainDeSauvegarder || !verifierEnTeteAvantSaisie()) return; setModalArticleOuverte(true); }} className={`w-full rounded-lg p-2 text-xs font-extrabold uppercase cursor-pointer truncate shadow-xs min-h-[32px] flex items-center ${inputBg}`}>
                      {articleCourant.designation || 'Sélectionner un article...'}
                    </div>
                  </div>
                  <div className={estModeLivraison ? 'col-span-2' : 'col-span-3'}>
                    <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Qté *</label>
                    <input ref={inputQuantiteRef} type="number" min="1" disabled={enTrainDeSauvegarder} value={articleCourant.quantite} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, quantite: e.target.value })} className={`w-full rounded-lg p-2 text-xs font-extrabold shadow-xs ${inputBg}`} />
                  </div>
                  {!estModeLivraison && (
                    <div className="col-span-3">
                      <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>P.A (F) *</label>
                      <input type="number" min="0" disabled={enTrainDeSauvegarder} value={articleCourant.prix_achat} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, prix_achat: e.target.value })} className={`w-full rounded-lg p-2 text-xs font-extrabold shadow-xs ${inputBg}`} />
                    </div>
                  )}
                  <div className="col-span-1 text-center">
                    <button type="button" disabled={enTrainDeSauvegarder} onClick={ajouterArticleCourant} className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-black px-3 py-2 rounded-lg text-xs shadow-md cursor-pointer border border-orange-500">OK</button>
                  </div>
                </div>
              </div>
            )}

            {lignesValidees.length > 0 && (
              <div className={`rounded-xl border-2 overflow-hidden shadow-md ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-400'}`}>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`border-b-2 uppercase text-[9.5px] font-black ${tableHeaderBg}`}>
                      <th className={estModeLivraison ? 'p-2.5 w-[75%]' : 'p-2.5 w-[45%]'}>Article</th>
                      <th className={estModeLivraison ? 'p-2.5 w-[20%] text-center' : 'p-2.5 w-[15%] text-center'}>Qté</th>
                      {!estModeLivraison && <th className="p-2.5 w-[20%] text-right">P.A</th>}
                      {!estModeLivraison && <th className="p-2.5 w-[15%] text-right">Total</th>}
                      {!documentEnLectureSeule && <th className="p-2.5 w-[5%] text-center">⚙️</th>}
                    </tr>
                  </thead>
                  <tbody className={`divide-y-2 text-xs ${isDarkMode ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-900'}`}>
                    {lignesValidees.map((l, index) => (
                      <tr key={index} onClick={() => chargerLignePourModification(index)} className={!documentEnLectureSeule ? (isDarkMode ? "hover:bg-slate-800/60 cursor-pointer transition select-none" : "hover:bg-orange-50/70 cursor-pointer transition select-none") : "select-none"}>
                        <td className={`p-2.5 font-extrabold uppercase truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{l.designation}</td>
                        <td className="p-2.5 text-center font-black text-orange-500">{l.quantite}</td>
                        {!estModeLivraison && (
                          <>
                            <td className={`p-2.5 text-right font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{Number(l.prix_achat).toLocaleString('fr-FR')}</td>
                            <td className="p-2.5 text-right font-black text-emerald-500">{(Number(l.quantite) * Number(l.prix_achat)).toLocaleString('fr-FR')}</td>
                          </>
                        )}
                        {!documentEnLectureSeule && (
                          <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setLignesValidees(lignesValidees.filter((_, i) => i !== index))} className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-rose-950 text-rose-400 border-slate-700' : 'bg-slate-200 hover:bg-red-100 text-red-600 border-slate-300'}`}>🗑️</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!estModeLivraison && (
              <div className={`p-3 rounded-xl border-2 space-y-2 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                <div className={`grid grid-cols-3 gap-2 text-[9px] uppercase font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <div>STATUT PAIEMENT</div><div>MONTANT RÉGLÉ</div><div>RESTE À PAYER</div>
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div>
                    <select value={statutPaiement} disabled={documentEnLectureSeule || enTrainDeSauvegarder} onChange={(e) => setStatutPaiement(e.target.value)} className={`w-full rounded-lg p-2 text-xs font-extrabold shadow-xs ${inputBg} disabled:opacity-70`}>
                      <option value="SOLDE">Soldé</option>
                      <option value="PARTIEL">Avance</option>
                      <option value="CREDIT">Crédit</option>
                    </select>
                  </div>
                  <div>
                    <input 
                      type="number" 
                      disabled={documentEnLectureSeule || statutPaiement === 'SOLDE' || statutPaiement === 'CREDIT' || enTrainDeSauvegarder} 
                      value={montantPaye} 
                      onFocus={(e) => e.target.select()} 
                      onChange={(e) => setMontantPaye(e.target.value)} 
                      className={`w-full rounded-lg p-2 text-xs font-extrabold shadow-xs ${inputBg} disabled:opacity-70`} 
                    />
                  </div>
                  <div className={`p-2 rounded-lg border-2 text-right shadow-xs ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                    <span className="text-xs font-black text-orange-500">{soldeRestant.toLocaleString('fr-FR')} F</span>
                  </div>
                </div>
              </div>
            )}

            <div className={`flex justify-between items-center pt-3 border-t-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
              {approEnEditionId && !documentEnLectureSeule ? (
                permissions.peut_supprimer ? (
                  <button type="button" disabled={enTrainDeSauvegarder} onClick={() => supprimerDoc(approEnEditionId, 'APPRO')} className="bg-rose-600 hover:bg-rose-500 text-white font-black px-3.5 py-2 rounded-xl text-xs shadow-md cursor-pointer border border-rose-500">🗑️ Supprimer</button>
                ) : <div/>
              ) : (!estModeLivraison ? (
                <div className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl shadow-md border border-emerald-500">
                  <span className="text-[8px] block font-black uppercase text-emerald-200">TOTAL</span>
                  <span className="text-xs font-black">{montantTotalGlobal.toLocaleString('fr-FR')} F</span>
                </div>
              ) : <div/>)}
              
              <div className="flex items-center gap-2">
                <button type="button" disabled={enTrainDeSauvegarder} onClick={() => window.print()} className={`font-black px-3.5 py-2 rounded-xl text-xs shadow-md cursor-pointer border-2 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600' : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-700'}`}>🖨️ Imprimer</button>
                {!documentEnLectureSeule && ((approEnEditionId && permissions.peut_modifier) || (!approEnEditionId && permissions.peut_creer)) && (
                  <button 
                    type="submit" 
                    disabled={enTrainDeSauvegarder || (approEnEditionId && !documentModifie)} 
                    className={`font-black px-4 py-2 rounded-xl text-xs shadow-md cursor-pointer border-2 flex items-center gap-1 ${
                      !enTrainDeSauvegarder && (!approEnEditionId || documentModifie)
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {enTrainDeSauvegarder ? 'Enregistrement...' : (approEnEditionId ? (documentModifie ? 'Mettre à jour' : '🔒 Aucun changement') : 'Valider')}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {vueActive === 'formulaire_commande' && (
          <form onSubmit={preparerEnregistrementCommande} onKeyDown={gererKeyDown} className={`p-4 rounded-2xl border-2 shadow-md space-y-3 ${cardBg}`}>
            {documentEnLectureSeule && (
              <div className="bg-amber-500/20 border-2 border-amber-500/50 text-amber-300 p-2.5 rounded-xl text-center font-black text-[10px] uppercase shadow-xs">
                🔒 DOCUMENT EN CONSULTATION SEULE (Journée clôturée et verrouillée)
              </div>
            )}
            <div className={`flex justify-between items-center border-b-2 pb-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
              <div className="flex items-center gap-2">
                <span className={`font-black text-xs uppercase ${isDarkMode ? 'text-white' : 'text-[#0a1931]'}`}>📋 BON DE COMMANDE {enTeteVerrouille && '🔒'}</span>
                <button type="button" disabled={enTrainDeSauvegarder} onClick={() => { setVueActive('liste'); setDocumentEnLectureSeule(false); setEtatInitialEdition(null); }} className={`font-black px-2.5 py-1 rounded-lg text-[10px] cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-400'}`}>⬅️ Retour</button>
              </div>
              <span className="bg-blue-600 text-white font-mono px-3 py-1 rounded-lg text-xs font-black shadow-xs border border-blue-500">{numeroDoc}</span>
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl border-2 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
              <div>
                <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Date *</label>
                <input type="date" disabled={documentEnLectureSeule} required value={dateDoc} onChange={(e) => setDateDoc(e.target.value)} className={`w-full rounded-lg p-2 text-xs font-extrabold shadow-xs ${inputBg} disabled:opacity-70`} />
              </div>
              <div>
                <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{libelleTiers} *</label>
                <div 
                  onClick={() => { if (enTeteVerrouille) return; setModalFournisseurOuverte(true); }}
                  className={`w-full rounded-lg p-2 text-xs font-extrabold cursor-pointer truncate shadow-xs min-h-[32px] flex items-center ${inputBg}`}
                >
                  {nomPartenaireCourant || 'Sélectionner...'}
                </div>
              </div>
              <div>
                <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Réf. Doc {!estModeLivraison && '*'}</label>
                <input type="text" disabled={documentEnLectureSeule} required={!estModeLivraison} value={referenceFournisseur} onChange={(e) => setReferenceFournisseur(e.target.value.toUpperCase())} className={`w-full rounded-lg p-2 text-xs font-extrabold uppercase shadow-xs ${inputBg} disabled:opacity-70`} />
              </div>
              <div>
                <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {estPartenaireSansStockage ? 'DÉPÔT (SANS STOCK)' : (estModeLivraison ? 'DÉPÔT * (AUTO)' : 'DÉPÔT * (CHOIX)')}
                </label>
                {estPartenaireSansStockage ? (
                  <input type="text" disabled value="-- SANS STOCK --" className={`w-full rounded-lg p-2 text-xs font-extrabold shadow-xs cursor-not-allowed ${inputBg}`} />
                ) : estModeLivraison ? (
                  <input type="text" disabled value={nomDepotCourant} className={`w-full rounded-lg p-2 text-xs font-extrabold shadow-xs cursor-not-allowed ${inputBg}`} />
                ) : (
                  <div 
                    onClick={() => { if (enTeteVerrouille) return; setModalDepotOuverte(true); }}
                    className={`w-full rounded-lg p-2 text-xs font-extrabold cursor-pointer truncate shadow-xs min-h-[32px] flex items-center ${inputBg}`}
                  >
                    {nomDepotCourant || 'Sélectionner...'}
                  </div>
                )}
              </div>
              <div>
                <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Délai</label>
                <input type="text" disabled={documentEnLectureSeule || enTrainDeSauvegarder} value={delaiLivraison} onChange={(e) => setDelaiLivraison(e.target.value.toUpperCase())} className={`w-full rounded-lg p-2 text-xs font-extrabold uppercase shadow-xs ${inputBg} disabled:opacity-70`} />
              </div>
            </div>

            {!documentEnLectureSeule && (
              <div className={`p-3 rounded-xl border-2 space-y-2 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                <div className={`grid ${estModeLivraison ? 'grid-cols-9' : 'grid-cols-12'} gap-2 items-end`}>
                  <div className={estModeLivraison ? 'col-span-6' : 'col-span-5'}>
                    <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Article *</label>
                    <div ref={selectArticleRef} tabIndex={0} onClick={() => { if (enTrainDeSauvegarder || !verifierEnTeteAvantSaisie()) return; setModalArticleOuverte(true); }} className={`w-full rounded-lg p-2 text-xs font-extrabold uppercase cursor-pointer truncate shadow-xs min-h-[32px] flex items-center ${inputBg}`}>
                      {articleCourant.designation || 'Sélectionner un article...'}
                    </div>
                  </div>
                  <div className={estModeLivraison ? 'col-span-2' : 'col-span-3'}>
                    <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Qté *</label>
                    <input ref={inputQuantiteRef} type="number" min="1" disabled={enTrainDeSauvegarder} value={articleCourant.quantite} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, quantite: e.target.value })} className={`w-full rounded-lg p-2 text-xs font-extrabold shadow-xs ${inputBg}`} />
                  </div>
                  {!estModeLivraison && (
                    <div className="col-span-3">
                      <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>P. Estimé *</label>
                      <input type="number" min="0" disabled={enTrainDeSauvegarder} value={articleCourant.prix_achat} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, prix_achat: e.target.value })} className={`w-full rounded-lg p-2 text-xs font-extrabold shadow-xs ${inputBg}`} />
                    </div>
                  )}
                  <div className="col-span-1 text-center">
                    <button type="button" disabled={enTrainDeSauvegarder} onClick={ajouterArticleCourant} className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-black px-3 py-2 rounded-lg text-xs shadow-md cursor-pointer border border-orange-500">OK</button>
                  </div>
                </div>
              </div>
            )}

            {lignesValidees.length > 0 && (
              <div className={`rounded-xl border-2 overflow-hidden shadow-md ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-400'}`}>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`border-b-2 uppercase text-[9.5px] font-black ${tableHeaderBg}`}>
                      <th className={estModeLivraison ? 'p-2.5 w-[75%]' : 'p-2.5 w-[45%]'}>Article</th>
                      <th className={estModeLivraison ? 'p-2.5 w-[20%] text-center' : 'p-2.5 w-[15%] text-center'}>Qté</th>
                      {!estModeLivraison && <th className="p-2.5 w-[20%] text-right">P. Estimé</th>}
                      {!estModeLivraison && <th className="p-2.5 w-[15%] text-right">Total</th>}
                      {!documentEnLectureSeule && <th className="p-2.5 w-[5%] text-center">⚙️</th>}
                    </tr>
                  </thead>
                  <tbody className={`divide-y-2 text-xs ${isDarkMode ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-900'}`}>
                    {lignesValidees.map((l, index) => (
                      <tr key={index} onClick={() => chargerLignePourModification(index)} className={!documentEnLectureSeule ? (isDarkMode ? "hover:bg-slate-800/60 cursor-pointer transition select-none" : "hover:bg-orange-50/70 cursor-pointer transition select-none") : "select-none"}>
                        <td className={`p-2.5 font-extrabold uppercase truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{l.designation}</td>
                        <td className="p-2.5 text-center font-black text-orange-500">{l.quantite}</td>
                        {!estModeLivraison && (
                          <>
                            <td className={`p-2.5 text-right font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{Number(l.prix_achat).toLocaleString('fr-FR')}</td>
                            <td className={`p-2.5 text-right font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{(Number(l.quantite) * Number(l.prix_achat)).toLocaleString('fr-FR')}</td>
                          </>
                        )}
                        {!documentEnLectureSeule && (
                          <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setLignesValidees(lignesValidees.filter((_, i) => i !== index))} className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${isDarkMode ? 'bg-slate-800 hover:bg-rose-950 text-rose-400 border-slate-700' : 'bg-slate-200 hover:bg-red-100 text-red-600 border-slate-300'}`}>🗑️</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className={`flex justify-between items-center pt-3 border-t-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
              {approEnEditionId && !documentEnLectureSeule ? (
                <div className="flex gap-2">
                  {permissions.peut_supprimer && (
                    <button type="button" disabled={enTrainDeSauvegarder} onClick={() => supprimerDoc(approEnEditionId, 'COMMANDE')} className="bg-rose-600 hover:bg-rose-500 text-white font-black px-3.5 py-2 rounded-xl text-xs shadow-md cursor-pointer border border-rose-500">🗑️ Supprimer</button>
                  )}
                  {permissions.peut_valider && (
                    <button type="button" disabled={enTrainDeSauvegarder} onClick={() => transformerEnFacture(docEnEditionObjet)} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white font-black px-3.5 py-2 rounded-xl text-xs shadow-md cursor-pointer border border-emerald-500 flex items-center gap-1">🔄 Transformer en Appro</button>
                  )}
                </div>
              ) : (!estModeLivraison ? (
                <div className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl shadow-md border border-emerald-500">
                  <span className="text-[8px] block font-black uppercase text-emerald-200">TOTAL</span>
                  <span className="text-xs font-black">{montantTotalGlobal.toLocaleString('fr-FR')} F</span>
                </div>
              ) : <div/>)}
              
              <div className="flex items-center gap-2">
                <button type="button" disabled={enTrainDeSauvegarder} onClick={() => window.print()} className={`font-black px-3.5 py-2 rounded-xl text-xs shadow-md cursor-pointer border-2 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600' : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-700'}`}>🖨️ Imprimer</button>
                {!documentEnLectureSeule && ((approEnEditionId && permissions.peut_modifier) || (!approEnEditionId && permissions.peut_creer)) && (
                  <button 
                    type="submit" 
                    disabled={enTrainDeSauvegarder || (approEnEditionId && !documentModifie)} 
                    className={`font-black px-4 py-2 rounded-xl text-xs shadow-md cursor-pointer border-2 flex items-center gap-1 ${
                      !enTrainDeSauvegarder && (!approEnEditionId || documentModifie)
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {enTrainDeSauvegarder ? 'Enregistrement...' : (approEnEditionId ? (documentModifie ? 'Mettre à jour' : '🔒 Aucun changement') : 'Enregistrer')}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {/* MODAL ARTICLE */}
        {modalArticleOuverte && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
            <div className={`rounded-2xl shadow-2xl border-2 w-full max-w-lg overflow-hidden space-y-3 p-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-400 text-slate-900'}`}>
              <div className={`flex justify-between items-center border-b-2 pb-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <h4 className="font-black uppercase text-xs flex items-center gap-1.5">
                  <span>🔍</span> SÉLECTIONNER UN ARTICLE ({articlesFiltresModalAffiches.length} / {articlesFiltresModal.length})
                </h4>
                <button type="button" onClick={() => setModalArticleOuverte(false)} className="text-slate-400 hover:text-white font-black text-sm px-2 py-0.5 rounded-lg hover:bg-slate-800 transition cursor-pointer">✕</button>
              </div>
              <div>
                <input
                  type="text"
                  value={rechercheArticle}
                  onChange={(e) => setRechercheArticle(e.target.value.toUpperCase())}
                  placeholder="RECHERCHER UN ARTICLE..."
                  autoFocus
                  className={`w-full rounded-xl p-2.5 font-black uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputBg}`}
                />
              </div>
              <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                {articlesFiltresModalAffiches.length === 0 ? (
                  <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun article trouvé.</div>
                ) : (
                  articlesFiltresModalAffiches.map((art) => {
                    const estGrise = art.estGrise;
                    return (
                      <div 
                        key={art.idArticleFormate} 
                        onClick={() => { 
                          if (estGrise) return; 
                          setArticleCourant({ id_article: art.idArticleFormate, designation: (art.Designation || 'ARTICLE').toUpperCase(), quantite: '1', prix_achat: art.prixAchatDefaut || '0' }); 
                          setModalArticleOuverte(false); 
                          setRechercheArticle(''); 
                          setTimeout(() => { if (inputQuantiteRef.current) { inputQuantiteRef.current.focus(); inputQuantiteRef.current.select(); } }, 50); 
                        }} 
                        className={`p-3 rounded-xl border-2 transition flex flex-col justify-between shadow-xs ${
                          estGrise 
                            ? (isDarkMode ? 'bg-slate-950/50 border-slate-800 opacity-40 cursor-not-allowed' : 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed')
                            : (isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:border-orange-500 hover:bg-slate-800 cursor-pointer' : 'bg-white border-slate-300 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer')
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className={`font-black text-xs uppercase truncate ${estGrise ? 'text-slate-500' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>{art.Designation}</span>
                          {!estModeLivraison && (
                            <span className="font-black text-[10px] text-orange-500 shrink-0">{art.prixAchatDefaut ? `${Number(art.prixAchatDefaut).toLocaleString('fr-FR')} F` : ''}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          {estGrise ? (
                            <span className="bg-slate-700 text-slate-300 text-[8.5px] px-1.5 py-0.5 rounded font-black">Déjà ajouté</span>
                          ) : <span/>}
                          <span className={`font-black text-[10px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            Stock : <strong className="text-emerald-500">{art.stockDepot}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {limiteArticlesModal < articlesFiltresModal.length && (
                <div className="text-center pt-1 pb-1">
                  <button
                    type="button"
                    onClick={() => setLimiteArticlesModal(prev => prev + 20)}
                    className={`font-extrabold px-3 py-2.5 rounded-xl text-[10px] transition shadow-xs border-2 w-full cursor-pointer ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-slate-200 text-slate-900 border-slate-400 hover:bg-slate-300'}`}
                  >
                    📥 Charger 20 articles de plus ({articlesFiltresModal.length - limiteArticlesModal} restants)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL FOURNISSEUR / PARTENAIRE */}
        {modalFournisseurOuverte && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
            <div className={`rounded-2xl shadow-2xl border-2 w-full max-w-lg overflow-hidden space-y-3 p-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-400 text-slate-900'}`}>
              <div className={`flex justify-between items-center border-b-2 pb-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <h4 className="font-black uppercase text-xs flex items-center gap-1.5">
                  <span>🏢</span> SÉLECTIONNER UN {libelleTiers} ({fournisseursFiltresModalAffiches.length} / {fournisseursFiltresModal.length})
                </h4>
                <button type="button" onClick={() => setModalFournisseurOuverte(false)} className="text-slate-400 hover:text-white font-black text-sm px-2 py-0.5 rounded-lg hover:bg-slate-800 transition cursor-pointer">✕</button>
              </div>
              <div>
                <input
                  type="text"
                  value={rechercheFournisseur}
                  onChange={(e) => setRechercheFournisseur(e.target.value.toUpperCase())}
                  placeholder={`RECHERCHER UN ${libelleTiers}...`}
                  autoFocus
                  className={`w-full rounded-xl p-2.5 font-black uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputBg}`}
                />
              </div>
              <div className="max-h-[350px] overflow-y-auto grid grid-cols-1 gap-2 pr-1">
                {fournisseursFiltresModalAffiches.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 font-bold italic text-xs">Aucun {libelleTiers.toLowerCase()} trouvé.</div>
                ) : (
                  fournisseursFiltresModalAffiches.map((frs) => {
                    const nomFrs = (frs.nom_fournisseur || frs.nom || frs.raison_sociale || '').toUpperCase();
                    return (
                      <div 
                        key={frs.id} 
                        onClick={() => selectionnerPartenaire(frs)} 
                        className={`p-3 rounded-xl border-2 transition cursor-pointer flex justify-between items-center shadow-xs ${isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:border-orange-500 hover:bg-slate-800 text-white' : 'bg-white border-slate-300 hover:border-orange-500 hover:bg-orange-50/50 text-slate-900'}`}
                      >
                        <span className="font-black text-xs uppercase">{nomFrs}</span>
                        {frs.statut_stockage && (
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold border ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {frs.statut_stockage}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {limiteFournisseursModal < fournisseursFiltresModal.length && (
                <div className="text-center pt-1 pb-1">
                  <button
                    type="button"
                    onClick={() => setLimiteFournisseursModal(prev => prev + 20)}
                    className={`font-extrabold px-3 py-2.5 rounded-xl text-[10px] transition shadow-xs border-2 w-full cursor-pointer ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-slate-200 text-slate-900 border-slate-400 hover:bg-slate-300'}`}
                  >
                    📥 Charger 20 {libelleTiers.toLowerCase()}s de plus ({fournisseursFiltresModal.length - limiteFournisseursModal} restants)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL DÉPÔT */}
        {modalDepotOuverte && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
            <div className={`rounded-2xl shadow-2xl border-2 w-full max-w-lg overflow-hidden space-y-3 p-4 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-400 text-slate-900'}`}>
              <div className={`flex justify-between items-center border-b-2 pb-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <h4 className="font-black uppercase text-xs flex items-center gap-1.5">
                  <span>🏭</span> SÉLECTIONNER UN DÉPÔT ({depotsFiltresModalAffiches.length} / {depotsFiltresModal.length})
                </h4>
                <button type="button" onClick={() => setModalDepotOuverte(false)} className="text-slate-400 hover:text-white font-black text-sm px-2 py-0.5 rounded-lg hover:bg-slate-800 transition cursor-pointer">✕</button>
              </div>
              <div>
                <input
                  type="text"
                  value={rechercheDepot}
                  onChange={(e) => setRechercheDepot(e.target.value.toUpperCase())}
                  placeholder="RECHERCHER UN DÉPÔT..."
                  autoFocus
                  className={`w-full rounded-xl p-2.5 font-black uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputBg}`}
                />
              </div>
              <div className="max-h-[350px] overflow-y-auto grid grid-cols-1 gap-2 pr-1">
                {depotsFiltresModalAffiches.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 font-bold italic text-xs">Aucun dépôt trouvé.</div>
                ) : (
                  depotsFiltresModalAffiches.map((dep) => {
                    const nomDep = (dep.nom_depot || dep.nom || dep.libelle || '').toUpperCase();
                    return (
                      <div 
                        key={dep.id} 
                        onClick={() => {
                          setIdDepotDestination(dep.id);
                          setModalDepotOuverte(false);
                          setRechercheDepot('');
                        }} 
                        className={`p-3 rounded-xl border-2 transition cursor-pointer flex justify-between items-center shadow-xs ${isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:border-orange-500 hover:bg-slate-800 text-white' : 'bg-white border-slate-300 hover:border-orange-500 hover:bg-orange-50/50 text-slate-900'}`}
                      >
                        <span className="font-black text-xs uppercase">{nomDep}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {limiteDepotsModal < depotsFiltresModal.length && (
                <div className="text-center pt-1 pb-1">
                  <button
                    type="button"
                    onClick={() => setLimiteDepotsModal(prev => prev + 20)}
                    className={`font-extrabold px-3 py-2.5 rounded-xl text-[10px] transition shadow-xs border-2 w-full cursor-pointer ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-slate-200 text-slate-900 border-slate-400 hover:bg-slate-300'}`}
                  >
                    📥 Charger 20 dépôts de plus ({depotsFiltresModal.length - limiteDepotsModal} restants)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🔔 MODALE UNIFIÉE DE CONFIRMATION / SUCCÈS / ERREUR */}
        {etatModale.ouverte && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className={`border-2 rounded-2xl max-w-sm w-full p-5 space-y-4 text-center shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-[#0a1931] text-[#0a1931]'}`}>
              
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black ${
                etatModale.type === 'confirmation' ? 'bg-amber-500/20 text-amber-400 border-2 border-amber-500/40' :
                etatModale.type === 'succes' ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-2 border-rose-500/40'
              }`}>
                {etatModale.type === 'confirmation' ? '❓' :
                 etatModale.type === 'succes' ? '✓' : '⚠️'}
              </div>

              <div className="space-y-1">
                <h4 className={`font-black text-sm uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-[#0a1931]'}`}>
                  {etatModale.titre}
                </h4>
                <p className={`text-xs font-semibold leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {etatModale.message}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                {etatModale.type === 'confirmation' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                      className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer border-2 ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700' : 'bg-slate-200 text-slate-900 border-slate-400 hover:bg-slate-300'}`}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const action = etatModale.onConfirmer;
                        setEtatModale({ ...etatModale, ouverte: false });
                        if (action) action();
                      }}
                      className={`flex-1 font-black py-2.5 rounded-xl text-xs shadow-md transition cursor-pointer border-2 ${isDarkMode ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500' : 'bg-[#0a1931] hover:bg-[#132d5c] text-white border-[#0a1931]'}`}
                    >
                      Confirmer
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                    className={`w-full font-black py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer border-2 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-600' : 'bg-[#0a1931] hover:bg-[#132d5c] text-white border-[#0a1931]'}`}
                  >
                    Compris 👍
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}