'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions';
import { localSync } from '../../lib/localSync';

export default function GestionArticles({ entrepriseId = '4TS-234321', isDarkMode = false }) {
  const [articles, setArticles] = useState([]);
  const [depots, setDepots] = useState([]); 
  const [emplacements, setEmplacements] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [entrepriseInfo, setInfosEntreprise] = useState(null);

  const [limiteArticles, setLimiteArticles] = useState(20);

  const [utilisateurConnecte, setUtilisateurConnecte] = useState('Stephane KTS');
  const [emailConnecte, setEmailConnecte] = useState('');

  // 🔔 État pour la modale unifiée de confirmation et de succès
  const [etatModale, setEtatModale] = useState({
    ouverte: false,
    titre: '',
    message: '',
    type: 'info', // 'confirmation', 'succes', 'erreur'
    onConfirmer: null
  });

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const estModeBoutique = moduleActuel === 'BOUTIQUE';
  const libelleLivreurOuEmplacement = estModeBoutique ? 'Emplacement' : 'Livreur';
  const libelleDepotPartenaire = moduleActuel === 'LIVRAISON' ? 'Partenaire' : 'Dépôt';

  const cleCacheArticles = `articles_${entrepriseId}_${moduleActuel}`;

  const [rechercheArticleInput, setRechercheArticleInput] = useState('');
  const [rechercheRapportInput, setRechercheRapportInput] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userLocal = localStorage.getItem('utilisateurConnecte') || localStorage.getItem('utilisateur_connecte');
      const emailLocal = localStorage.getItem('emailConnecte') || localStorage.getItem('email_connecte');
      if (userLocal) {
        try {
          const parsed = JSON.parse(userLocal);
          setUtilisateurConnecte((parsed.nom_complet || parsed.nom || userLocal).toUpperCase());
          if (parsed.email) setEmailConnecte(parsed.email);
        } catch {
          setUtilisateurConnecte(userLocal.toUpperCase());
        }
      }
      if (emailLocal) setEmailConnecte(emailLocal);
    }
  }, []);

  const emailActuel = emailConnecte || '';
  const estSuperAdmin = emailActuel.toLowerCase().trim() === 'stephs7352@gmail.com';

  const { verifierPermission, verifierCreation, verifierModification, verifierSuppression } = usePermissions(
    entrepriseId,
    utilisateurConnecte,
    emailConnecte,
    moduleActuel
  );

  const permissions = {
    lecture: verifierPermission('articles_stock', estSuperAdmin),
    creation: verifierCreation('articles_stock', estSuperAdmin),
    modification: verifierModification('articles_stock', estSuperAdmin),
    suppression: verifierSuppression('articles_stock', estSuperAdmin),
  };

  const [modeVue, setModeVue] = useState('catalogue');
  const [articleSelectionneStatId, setArticleSelectionneStatId] = useState('');
  
  const [depotStatFiltre, setDepotStatFiltre] = useState('TOUS');
  const [emplacementStatFiltre, setEmplacementStatFiltre] = useState('TOUS');
  
  const [afficherModalSelectionArticle, setAfficherModalSelectionArticle] = useState(false);
  const [rechercheModalArticle, setRechercheModalArticle] = useState('');

  const [afficherModalSelectionDepot, setAfficherModalSelectionDepot] = useState(false);
  const [rechercheModalDepot, setRechercheModalDepot] = useState('');

  const [afficherModalSelectionEmp, setAfficherModalSelectionEmp] = useState(false);
  const [rechercheModalEmp, setRechercheModalEmp] = useState('');

  const [afficherModalFamilleCat, setAfficherModalFamilleCat] = useState(false);
  const [rechercheModalFamilleCat, setRechercheModalFamilleCat] = useState('');

  const [afficherModalDepotCat, setAfficherModalDepotCat] = useState(false);
  const [rechercheModalDepotCat, setRechercheModalDepotCat] = useState('');

  const [afficherModalEmpCat, setAfficherModalEmpCat] = useState(false);
  const [rechercheModalEmpCat, setRechercheModalEmpCat] = useState('');

  const [depotRapportFiltre, setDepotRapportFiltre] = useState('TOUS');

  const designationInputRef = useRef(null);

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

  const [dateDebutRapport, setDateDebutRapport] = useState(obtenirPremierJourDuMois());
  const [dateFinRapport, setDateFinRapport] = useState(obtenirDernierJourDuMois());

  const [dateDebutStat, setDateDebutStat] = useState(obtenirPremierJourDuMois());
  const [dateFinStat, setDateFinStat] = useState(obtenirDernierJourDuMois());

  const [chargement, setChargement] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  
  const [afficherModalForm, setAfficherModalForm] = useState(false);
  const [articleEnEdition, setArticleEnEdition] = useState(null);

  const [familleFiltre, setFamilleFiltre] = useState('TOUTES');
  const [depotFiltre, setDepotFiltre] = useState('TOUS');
  const [emplacementFiltre, setEmplacementFiltre] = useState('TOUS');

  const [colonneTri, setColonneTri] = useState('Designation');
  const [ordreTri, setOrdreTri] = useState('asc');

  const [colonneTriRapport, setColonneTriRapport] = useState('Designation');
  const [ordreTriRapport, setOrdreTriRapport] = useState('asc');

  const [nouveauArticle, setNouveauArticle] = useState({
    Code_Barre: '',
    Designation: '',
    Famille: '',
    Prix_Achat: 0,
    Prix_Vente: 0,
    Seuil_Alerte: 5,
    Photo: '',
    Disponible_Menu_QR: true,
    date_peremption: '',
    suivi_stock: true,
  });

  const toutesLesSuggestionsArticles = Array.from(
    new Set(articles.map(art => (art.Designation || art.designation || '').trim().toUpperCase()))
  ).sort();

  const obtenirNomEmplacementParId = (empId) => {
    if (!empId || empId === 'TOUS') return moduleActuel === 'LIVRAISON' ? 'Tous les livreurs' : 'Tous les emplacements';
    const emp = emplacements.find(e => String(e.id || e.id_emplacement) === String(empId));
    if (emp) {
      return emp.nom_emplacement || emp.code_emplacement || emp.responsable_emplacement || '-';
    }
    return '-';
  };

  const obtenirNomDepotParId = (depotId) => {
    if (!depotId || depotId === 'TOUS') return moduleActuel === 'LIVRAISON' ? 'Tous les partenaires' : 'Tous les dépôts';
    const depotTrouve = depots.find(d => String(d.id) === String(depotId));
    if (depotTrouve) return depotTrouve.nom_depot || depotTrouve.Nom_Depot || depotId;
    return depotId;
  };

  const obtenirNomFamilleParId = (famId) => {
    if (!famId || famId === 'TOUTES') return 'Toutes';
    const fam = familles.find(f => String(f.id) === String(famId));
    if (fam) return fam.nom_famille || fam.Nom_Famille || famId;
    return famId;
  };

  const obtenirNomDestinationParMvt = (mvt) => {
    if (!mvt) return '-';
    if (mvt.id_emplacement_destination) {
      return obtenirNomEmplacementParId(mvt.id_emplacement_destination);
    }
    if (mvt.id_depot_destination) {
      return obtenirNomDepotParId(mvt.id_depot_destination);
    }
    if (mvt.id_emplacement_source) {
      return obtenirNomEmplacementParId(mvt.id_emplacement_source);
    }
    return '-';
  };

  const chargerDonneesReference = async () => {
    const familleLocale = localSync.recupererDonneesLocales(`familles_articles_${entrepriseId}_${moduleActuel}`);
    const depotsLocaux = localSync.recupererDonneesLocales(`depots_stock_${entrepriseId}_${moduleActuel}`);
    const emplacementsLocaux = localSync.recupererDonneesLocales(`emplacements_stock_${entrepriseId}_${moduleActuel}`);
    const mouvementsLocaux = localSync.recupererDonneesLocales(`mouvements_stock_${entrepriseId}_${moduleActuel}`);
    const approvisionnementsLocaux = localSync.recupererDonneesLocales(`approvisionnements_${entrepriseId}_${moduleActuel}`);
    const entrepriseLocale = localSync.recupererDonneesLocales(`entreprise_info_${entrepriseId}`);

    if (familleLocale && familleLocale.length > 0) {
      setFamilles(familleLocale);
      setNouveauArticle(prev => ({ 
        ...prev, 
        Famille: prev.Famille || familleLocale[0].id,
        suivi_stock: prev.Famille ? prev.suivi_stock : (familleLocale[0].suivi_stock ?? true) 
      }));
    }
    if (depotsLocaux && depotsLocaux.length > 0) {
      setDepots(depotsLocaux);
    }
    if (emplacementsLocaux) setEmplacements(emplacementsLocaux);
    if (mouvementsLocaux) setMouvements(mouvementsLocaux);
    if (approvisionnementsLocaux) setApprovisionnements(approvisionnementsLocaux);
    if (entrepriseLocale) setInfosEntreprise(entrepriseLocale);

    if (typeof window !== 'undefined' && !navigator.onLine) {
      return;
    }

    try {
      const { data: dataEnt } = await supabase
        .from('entreprises')
        .select('*')
        .or(`id.eq.${entrepriseId},id_entreprise.eq.${entrepriseId},code_entreprise.eq.${entrepriseId}`)
        .single();
      
      if (dataEnt) {
        setInfosEntreprise(dataEnt);
        localSync.sauvegarderDonneesLocales(`entreprise_info_${entrepriseId}`, dataEnt);
      }

      const { data: dataFam } = await supabase
        .from('familles_articles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: true });
      
      const listeFam = dataFam || [];
      setFamilles(listeFam);
      localSync.sauvegarderDonneesLocales(`familles_articles_${entrepriseId}_${moduleActuel}`, listeFam);

      if (listeFam.length > 0) {
        setNouveauArticle(prev => ({ 
          ...prev, 
          Famille: prev.Famille || listeFam[0].id,
          suivi_stock: prev.Famille ? prev.suivi_stock : (listeFam[0].suivi_stock ?? true) 
        }));
      }

      const { data: dataDep } = await supabase
        .from('depots_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const listeDepots = dataDep || [];
      setDepots(listeDepots);
      localSync.sauvegarderDonneesLocales(`depots_stock_${entrepriseId}_${moduleActuel}`, listeDepots);

      const { data: dataEmp } = await supabase
        .from('emplacements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const listeEmp = dataEmp || [];
      setEmplacements(listeEmp);
      localSync.sauvegarderDonneesLocales(`emplacements_stock_${entrepriseId}_${moduleActuel}`, listeEmp);

      const { data: dataMouv } = await supabase
        .from('mouvements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const listeMouv = dataMouv || [];
      setMouvements(listeMouv);
      localSync.sauvegarderDonneesLocales(`mouvements_stock_${entrepriseId}_${moduleActuel}`, listeMouv);

      const { data: dataAppro } = await supabase
        .from('approvisionnements')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const listeAppro = dataAppro || [];
      setApprovisionnements(listeAppro);
      localSync.sauvegarderDonneesLocales(`approvisionnements_${entrepriseId}_${moduleActuel}`, listeAppro);

    } catch (err) {
      console.warn('Mode hors-ligne ou échec réseau sur les références :', err.message);
    }
  };

  const chargerArticles = async () => {
    setChargement(true);
    const articlesLocaux = localSync.recupererDonneesLocales(cleCacheArticles);
    if (articlesLocaux && articlesLocaux.length > 0) {
      setArticles(articlesLocaux);
    }

    try {
      let { data, error } = await supabase
        .from('articles_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const liste = data || [];
      
      setArticles(liste);
      localSync.sauvegarderDonneesLocales(cleCacheArticles, liste);
    } catch (err) {
      console.warn('Mode hors-ligne ou échec réseau :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonneesReference();
    chargerArticles();
    if (typeof window !== 'undefined') {
      localSync.synchroniserVersCloud(supabase);
    }
  }, [entrepriseId, moduleActuel]);

  const isGestionPerissablesActive = () => {
    if (!entrepriseInfo) return false;
    if (entrepriseInfo.gestion_perissables === true) return true;
    if (entrepriseInfo.options_config && entrepriseInfo.options_config.gestion_perissables === true) return true;
    return false;
  };

  const articleAeuMouvementChezPartenaire = (articleId, depotId) => {
    if (!depotId || depotId === 'TOUS') return true;

    const aMouvement = mouvements.some(m => {
      if (String(m.id_article) !== String(articleId)) return false;
      const matchSource = String(m.id_depot_source || '') === String(depotId);
      const matchDest = String(m.id_depot_destination || '') === String(depotId);
      return matchSource || matchDest;
    });

    if (aMouvement) return true;

    const aAppro = approvisionnements.some(app => {
      const depApp = String(app.id_depot_destination || app.id_depot || '');
      if (depApp !== String(depotId)) return false;

      let listArt = [];
      if (typeof app.details_articles === 'string') {
        try { listArt = JSON.parse(app.details_articles); } catch (e) {}
      } else if (Array.isArray(app.details_articles)) {
        listArt = app.details_articles;
      }

      return listArt.some(item => String(item.id_article || item.article_id) === String(articleId));
    });

    return aAppro;
  };

  const calculerLigneRapportStockPourDepot = (articleId, dCible) => {
    let stockInitial = 0;
    let entrees = 0;
    let sorties = 0;

    mouvements.forEach(m => {
      if (String(m.id_article) !== String(articleId)) return;
      const qte = parseInt(m.quantite || 0);
      const typeMvt = (m.type_mouvement || '').toUpperCase();

      const estSource = String(m.id_depot_source || '') === String(dCible);
      const estDestination = String(m.id_depot_destination || '') === String(dCible);
      const memeDepotInterne = m.id_depot_source && m.id_depot_destination && String(m.id_depot_source) === String(m.id_depot_destination);

      if (dCible !== 'TOUS' && !estSource && !estDestination) return;

      if (typeMvt === 'INVENTAIRE') {
        stockInitial = qte;
      } else {
        if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
          if (dCible === 'TOUS' || estSource) sorties += qte;
        } else if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') {
          entrees += qte;
        } else if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          if (memeDepotInterne) {
            // Neutre
          } else if (dCible !== 'TOUS') {
            if (estSource) sorties += qte;
            if (estDestination) entrees += qte;
          }
        } else {
          entrees += qte;
        }
      }
    });

    approvisionnements.forEach(app => {
      const matchDepot = dCible === 'TOUS' || String(app.id_depot_destination || app.id_depot || '') === String(dCible);
      if (!matchDepot) return;

      let listArt = [];
      if (typeof app.details_articles === 'string') {
        try { listArt = JSON.parse(app.details_articles); } catch (e) {}
      } else if (Array.isArray(app.details_articles)) {
        listArt = app.details_articles;
      }

      listArt.forEach(item => {
        if (String(item.id_article || item.article_id) !== String(articleId)) return;
        const qte = parseInt(item.quantite || 0);
        entrees += qte;
      });
    });

    stockInitial = Math.max(0, stockInitial);
    const stockTotal = stockInitial + entrees;
    const stockReel = Math.max(0, stockTotal - sorties);

    return stockReel;
  };

  const calculerStockReelDirect = (articleId, depotCible = 'TOUS', emplacementCible = 'TOUS') => {
    if (emplacementCible !== 'TOUS') {
      let stockEmp = 0;
      mouvements.forEach(m => {
        if (String(m.id_article) !== String(articleId)) return;
        
        if (depotCible !== 'TOUS') {
          const matchDepSource = String(m.id_depot_source || '') === String(depotCible);
          const matchDepDest = String(m.id_depot_destination || '') === String(depotCible);
          if (!matchDepSource && !matchDepDest) return;
        }

        const qte = parseInt(m.quantite || 0);
        const typeMvt = (m.type_mouvement || '').toUpperCase();
        
        const empSource = String(m.id_emplacement_source || '');
        const empDest = String(m.id_emplacement_destination || '');

        const matchSource = empSource === String(emplacementCible);
        const matchDest = empDest === String(emplacementCible);

        if (typeMvt === 'INVENTAIRE' && matchSource) {
          stockEmp = qte;
          return;
        }
        if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          if (matchDest) stockEmp += qte;
          if (matchSource) stockEmp -= qte;
          return;
        }
        if (matchDest) stockEmp += qte;
        if (matchSource) stockEmp -= qte;
      });
      return Math.max(0, stockEmp);
    }

    return calculerLigneRapportStockPourDepot(articleId, depotCible);
  };

  const obtenirNumeroDocVisuelPourMouvement = (mvtCible) => {
    if (!mvtCible) return 'MVT';
    const motifMvt = (mvtCible.motif_remarque || '').trim().toUpperCase();
    
    const documentsBruts = Object.values(
      mouvements
        .filter((mvt) => {
          const motif = (mvt.motif_remarque || '').trim().toUpperCase();
          return (
            !motif.includes('CMD-') && 
            !motif.includes('LIVRAISON') && 
            !motif.includes('RESTITUTION') &&
            !motif.includes('VENTE') &&
            !motif.includes('VENTE TICKET')
          );
        })
        .reduce((acc, mvt) => {
          const numDocBrut = mvt.motif_remarque || 'SANS-REF';
          if (!acc[numDocBrut]) {
            acc[numDocBrut] = {
              numeroDocBrut: numDocBrut,
              date: mvt.created_at || '',
              type: (mvt.type_mouvement || 'TRANSFERT').toUpperCase(),
            };
          }
          return acc;
        }, {})
    );

    documentsBruts.sort((a, b) => new Date(a.date) - new Date(b.date));

    const compteursParType = {};
    for (const doc of documentsBruts) {
      const typeMvt = doc.type;
      const prefixes = { ENTREE: 'ME', SORTIE: 'MS', AVARIES: 'AV', TRANSFERT: 'TR', INVENTAIRE: 'INV' };
      const prefix = prefixes[typeMvt] || 'TR';

      if (!compteursParType[prefix]) {
        compteursParType[prefix] = 0;
      }
      compteursParType[prefix] += 1;
      const numeroSequentiel = `${prefix}-${String(compteursParType[prefix]).padStart(2, '0')}`;

      if (doc.numeroDocBrut === motifMvt) {
        return numeroSequentiel;
      }
    }

    const typeMvt = (mvtCible.type_mouvement || '').toUpperCase();
    if (typeMvt === 'ENTREE') return 'ME';
    if (typeMvt === 'SORTIE') return 'MS';
    if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') return 'TR';
    if (typeMvt === 'AVARIES') return 'AV';
    if (typeMvt === 'INVENTAIRE') return 'INV';
    return typeMvt.substring(0, 3) || 'TR';
  };

  const obtenirHistoriqueChronologiqueStat = (articleId) => {
    if (!articleId) return { lignes: [], stockFinal: 0 };

    let evenements = [];
    const dCible = depotStatFiltre;
    const eCible = emplacementStatFiltre;

    if (eCible === 'TOUS') {
      approvisionnements.forEach(app => {
        const matchDepot = dCible === 'TOUS' || String(app.id_depot_destination || app.id_depot) === String(dCible);
        if (!matchDepot) return;

        let listArt = [];
        if (typeof app.details_articles === 'string') {
          try { listArt = JSON.parse(app.details_articles); } catch (e) {}
        } else if (Array.isArray(app.details_articles)) {
          listArt = app.details_articles;
        }

        listArt.forEach(item => {
          if (String(item.id_article || item.article_id) === String(articleId)) {
            const motifRef = (app.reference || app.motif || app.motif_remarque || '').trim();
            const estLivraison = (app.type_mouvement || '').toUpperCase() === 'LIVRAISON' || motifRef.toUpperCase().includes('LIVRAISON');
            const motifAffichage = estLivraison ? 'LIVRAISON' : (motifRef !== '' ? motifRef : 'APPROVISIONNEMENT');

            evenements.push({
              date: app.created_at || '',
              typeAbr: 'APP',
              motifLigne: motifAffichage,
              emplacementDest: obtenirNomDestinationParMvt(app),
              quantiteMouvementee: parseInt(item.quantite || 0),
              impactStock: parseInt(item.quantite || 0),
              prioriteOrdre: 0,
              estTypeInventaire: false,
              valeurInventaire: 0
            });
          }
        });
      });

      mouvements.forEach(m => {
        if (String(m.id_article) !== String(articleId)) return;
        
        const qte = parseInt(m.quantite || 0);
        const typeMvt = (m.type_mouvement || '').toUpperCase();
        const estSource = String(m.id_depot_source) === String(dCible);
        const estDestination = String(m.id_depot_destination) === String(dCible);

        if (dCible !== 'TOUS' && !estSource && !estDestination) return;

        const typeAbr = obtenirNumeroDocVisuelPourMouvement(m);
        const emplacementDestNom = obtenirNomDestinationParMvt(m);

        const motifRemarque = (m.motif_remarque || '').trim();
        const referenceMvt = (m.reference || '').trim();
        
        const estLivraison = typeMvt === 'LIVRAISON' || motifRemarque.toUpperCase().includes('LIVRAISON') || referenceMvt.toUpperCase().includes('LIVRAISON');
        const motifAffichage = estLivraison ? 'LIVRAISON' : (referenceMvt !== '' ? referenceMvt : (motifRemarque !== '' ? motifRemarque : typeMvt));

        let impact = 0;
        let prioriteOrdre = 1;
        let estTypeInventaire = false;

        if (typeMvt === 'INVENTAIRE') {
          impact = qte;
          estTypeInventaire = true;
          prioriteOrdre = 0;
        } else if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') {
          impact = qte;
          prioriteOrdre = 0;
        } else if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
          impact = -qte;
          prioriteOrdre = 2;
        } else if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          const memeDepot = m.id_depot_source && m.id_depot_destination && String(m.id_depot_source) === String(m.id_depot_destination);
          if (memeDepot) {
            impact = 0;
            prioriteOrdre = 1;
          } else {
            if (dCible === 'TOUS') {
              impact = 0;
              prioriteOrdre = 1;
            } else {
              if (estSource) {
                impact = -qte;
                prioriteOrdre = 2;
              }
              if (estDestination) {
                impact = qte;
                prioriteOrdre = 0;
              }
            }
          }
        } else {
          impact = qte;
          prioriteOrdre = 1;
        }

        evenements.push({
          date: m.created_at || '',
          typeAbr: typeAbr,
          motifLigne: motifAffichage,
          emplacementDest: emplacementDestNom,
          quantiteMouvementee: qte,
          impactStock: impact,
          prioriteOrdre: prioriteOrdre,
          estTypeInventaire: estTypeInventaire,
          valeurInventaire: qte
        });
      });

    } else {
      approvisionnements.forEach(app => {
        const matchDepot = dCible === 'TOUS' || String(app.id_depot_destination || app.id_depot) === String(dCible);
        if (!matchDepot) return;

        const matchEmpApp = String(app.id_emplacement_destination || app.id_emplacement || '') === String(eCible);
        if (!matchEmpApp) return;

        let listArt = [];
        if (typeof app.details_articles === 'string') {
          try { listArt = JSON.parse(app.details_articles); } catch (e) {}
        } else if (Array.isArray(app.details_articles)) {
          listArt = app.details_articles;
        }

        listArt.forEach(item => {
          if (String(item.id_article || item.article_id) === String(articleId)) {
            const motifRef = (app.reference || app.motif || app.motif_remarque || '').trim();
            const estLivraison = (app.type_mouvement || '').toUpperCase() === 'LIVRAISON' || motifRef.toUpperCase().includes('LIVRAISON');
            const motifAffichage = estLivraison ? 'LIVRAISON' : (motifRef !== '' ? motifRef : 'APPROVISIONNEMENT');

            evenements.push({
              date: app.created_at || '',
              typeAbr: 'APP',
              motifLigne: motifAffichage,
              emplacementDest: obtenirNomDestinationParMvt(app),
              quantiteMouvementee: parseInt(item.quantite || 0),
              impactStock: parseInt(item.quantite || 0),
              prioriteOrdre: 0,
              estTypeInventaire: false,
              valeurInventaire: 0
            });
          }
        });
      });

      mouvements.forEach(m => {
        if (String(m.id_article) !== String(articleId)) return;

        if (dCible !== 'TOUS') {
          const matchDepSource = String(m.id_depot_source || '') === String(dCible);
          const matchDepDest = String(m.id_depot_destination || '') === String(dCible);
          if (!matchDepSource && !matchDepDest) return;
        }

        const qte = parseInt(m.quantite || 0);
        const typeMvt = (m.type_mouvement || '').toUpperCase();
        
        const empSource = String(m.id_emplacement_source || '');
        const empDest = String(m.id_emplacement_destination || '');

        const matchSource = empSource === String(eCible);
        const matchDest = empDest === String(eCible);

        if (!matchSource && !matchDest) return;

        const typeAbr = obtenirNumeroDocVisuelPourMouvement(m);
        const emplacementDestNom = obtenirNomDestinationParMvt(m);

        const motifRemarque = (m.motif_remarque || '').trim();
        const referenceMvt = (m.reference || '').trim();
        
        const estLivraison = typeMvt === 'LIVRAISON' || motifRemarque.toUpperCase().includes('LIVRAISON') || referenceMvt.toUpperCase().includes('LIVRAISON');
        const motifAffichage = estLivraison ? 'LIVRAISON' : (referenceMvt !== '' ? referenceMvt : (motifRemarque !== '' ? motifRemarque : typeMvt));

        let impact = 0;
        let prioriteOrdre = 1;
        let estTypeInventaire = false;

        if (typeMvt === 'INVENTAIRE' && matchSource) {
          estTypeInventaire = true;
          prioriteOrdre = 0;
        } else if (matchDest && !matchSource) {
          impact = qte; 
          prioriteOrdre = 0; 
        } else if (matchSource && !matchDest) {
          impact = -qte; 
          prioriteOrdre = 2; 
        } else if (matchSource && matchDest) {
          impact = 0;
          prioriteOrdre = 1;
        }

        evenements.push({
          date: m.created_at || '',
          typeAbr: typeAbr,
          motifLigne: motifAffichage,
          emplacementDest: emplacementDestNom,
          quantiteMouvementee: qte,
          impactStock: impact,
          prioriteOrdre: prioriteOrdre,
          estTypeInventaire: estTypeInventaire,
          valeurInventaire: qte
        });
      });
    }

    evenements.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      const jourA = (a.date || '').split('T')[0];
      const jourB = (b.date || '').split('T')[0];

      if (jourA === jourB) {
        if (a.prioriteOrdre !== b.prioriteOrdre) {
          return a.prioriteOrdre - b.prioriteOrdre;
        }
      }
      return dateA - dateB;
    });

    let stockCourant = 0;
    let lignesResultat = [];

    evenements.forEach(ev => {
      const dateEv = (ev.date || '').split('T')[0];
      const estAvantPeriode = dateDebutStat && dateEv && dateEv < dateDebutStat;

      if (ev.estTypeInventaire) {
        stockCourant = ev.valeurInventaire;
        if (!estAvantPeriode && ((!dateDebutStat || !dateEv || dateEv >= dateDebutStat) && (!dateFinStat || !dateEv || dateEv <= dateFinStat))) {
          lignesResultat.push({
            ...ev,
            stockProgressif: Math.max(0, stockCourant)
          });
        }
      } else {
        stockCourant += ev.impactStock;
        if (!estAvantPeriode && ((!dateDebutStat || !dateEv || dateEv >= dateDebutStat) && (!dateFinStat || !dateEv || dateEv <= dateFinStat))) {
          lignesResultat.push({
            ...ev,
            stockProgressif: Math.max(0, stockCourant)
          });
        }
      }
    });

    return { lignes: lignesResultat, stockFinal: Math.max(0, stockCourant) };
  };

  const compresserImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Erreur de compression de l'image"));
                return;
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const gererUploadImage = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      setUploadingPhoto(true);
      const fichierCompresse = await compresserImage(file, 800, 0.7);

      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `articles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('articles-images')
        .upload(filePath, fichierCompresse);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage
        .from('articles-images')
        .getPublicUrl(filePath);

      setNouveauArticle(prev => ({ ...prev, Photo: urlData.publicUrl }));
    } catch (err) {
      setEtatModale({ ouverte: true, titre: 'Erreur', message: 'Erreur chargement photo : ' + err.message, type: 'erreur', onConfirmer: null });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const preparerEnregistrementArticle = (e) => {
    if (e) e.preventDefault();

    if (articleEnEdition && !permissions.modification) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Modification interdite par votre profil.', type: 'erreur', onConfirmer: null });
      return;
    }
    if (!articleEnEdition && !permissions.creation) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Création interdite par votre profil.', type: 'erreur', onConfirmer: null });
      return;
    }

    const designationClean = (nouveauArticle.Designation || '').trim().replace(/\s+/g, ' ').toUpperCase();
    if (!designationClean) {
      setEtatModale({ ouverte: true, titre: 'Champ requis', message: 'Veuillez renseigner la désignation de l\'article.', type: 'erreur', onConfirmer: null });
      return;
    }

    setEtatModale({
      ouverte: true,
      titre: 'Confirmation requise',
      message: `Voulez-vous véritablement valider et enregistrer l'article "${designationClean}" ?`,
      type: 'confirmation',
      onConfirmer: executerEnregistrementArticle
    });
  };

  const executerEnregistrementArticle = async () => {
    if (enTrainDeSauvegarder) return;

    let familleIdFinale = nouveauArticle.Famille;
    if (!familleIdFinale && familles.length > 0) {
      familleIdFinale = familles[0].id;
    }

    const designationClean = (nouveauArticle.Designation || '').trim().replace(/\s+/g, ' ').toUpperCase();

    setEnTrainDeSauvegarder(true);
    try {
      const payloadArticle = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        Designation: designationClean,
        Code_Barre: (nouveauArticle.Code_Barre || '').trim().toUpperCase(),
        Famille: familleIdFinale,
        Prix_Achat: moduleActuel !== 'LIVRAISON' ? (parseFloat(nouveauArticle.Prix_Achat) || 0) : 0,
        Prix_Vente: parseFloat(nouveauArticle.Prix_Vente) || 0,
        Seuil_Alerte: parseInt(nouveauArticle.Seuil_Alerte) || 5,
        Photo: nouveauArticle.Photo,
        Disponible_Menu_QR: nouveauArticle.Disponible_Menu_QR,
        date_peremption: isGestionPerissablesActive() && nouveauArticle.date_peremption ? nouveauArticle.date_peremption : null,
        suivi_stock: nouveauArticle.suivi_stock ?? true
      };

      if (articleEnEdition) {
        const targetId = articleEnEdition.id_article || articleEnEdition.id;
        const { error } = await supabase
          .from('articles_stock')
          .update(payloadArticle)
          .eq(articleEnEdition.id_article ? 'id_article' : 'id', targetId)
          .eq('id_entreprise', entrepriseId);

        if (error) {
          localSync.ajouterFileAttente('UPDATE', 'articles_stock', { ...payloadArticle, id: targetId });
        }
      } else {
        payloadArticle.Quantite_Stock = 0;
        const { error } = await supabase.from('articles_stock').insert([payloadArticle]);
        if (error) {
          localSync.ajouterFileAttente('INSERT', 'articles_stock', payloadArticle);
        }
      }

      const artIdFinal = articleEnEdition ? (articleEnEdition.id_article || articleEnEdition.id) : ('local_' + Date.now());
      const articleMajItem = { ...payloadArticle, id: artIdFinal, id_article: artIdFinal };
      const articlesMaj = articleEnEdition
        ? articles.map(a => String(a.id_article || a.id) === String(artIdFinal) ? articleMajItem : a)
        : [articleMajItem, ...articles];

      setArticles(articlesMaj);
      localSync.sauvegarderDonneesLocales(cleCacheArticles, articlesMaj);

      annulerForm();
      setAfficherModalForm(false);
      await chargerArticles();

      setEtatModale({
        ouverte: true,
        titre: 'Opération réussie',
        message: 'Article enregistré avec succès !',
        type: 'succes',
        onConfirmer: null
      });

    } catch (err) {
      setEtatModale({
        ouverte: true,
        titre: 'Erreur',
        message: 'Erreur lors de l’enregistrement : ' + err.message,
        type: 'erreur',
        onConfirmer: null
      });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = (article) => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.modification) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Vous n’avez pas le droit de modifier les articles.', type: 'erreur', onConfirmer: null });
      return;
    }
    setArticleEnEdition(article);
    setNouveauArticle({
      Code_Barre: article.Code_Barre || article.code_barre || '',
      Designation: article.Designation || article.designation || '',
      Famille: article.Famille || article.famille || (familles.length > 0 ? familles[0].id : ''),
      Prix_Achat: article.Prix_Achat || article.prix_achat || 0,
      Prix_Vente: article.Prix_Vente || article.prix_vente || 0,
      Seuil_Alerte: article.Seuil_Alerte || article.seuil_alerte || 5,
      Photo: article.Photo || article.photo || '',
      Disponible_Menu_QR: article.Disponible_Menu_QR ?? true,
      date_peremption: article.date_peremption || '',
      suivi_stock: article.suivi_stock ?? true,
    });
    setAfficherModalForm(true);
    setTimeout(() => {
      if (designationInputRef.current) {
        designationInputRef.current.focus();
        designationInputRef.current.select();
      }
    }, 50);
  };

  const annulerForm = () => {
    if (enTrainDeSauvegarder) return;
    setArticleEnEdition(null);
    const premiereFamille = familles.length > 0 ? familles[0] : null;
    setNouveauArticle({
      Code_Barre: '',
      Designation: '',
      Famille: premiereFamille ? premiereFamille.id : '',
      Prix_Achat: 0,
      Prix_Vente: 0,
      Seuil_Alerte: 5,
      Photo: '',
      Disponible_Menu_QR: true,
      date_peremption: '',
      suivi_stock: premiereFamille ? (premiereFamille.suivi_stock ?? true) : true,
    });
  };

  const supprimerArticleDepuisFormulaire = async () => {
    if (enTrainDeSauvegarder || !articleEnEdition) return;

    if (!permissions.suppression) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Suppression interdite par votre profil.', type: 'erreur', onConfirmer: null });
      return;
    }

    const artId = articleEnEdition.id_article || articleEnEdition.id;
    const stockGlobalActuel = calculerStockReelDirect(artId, depotFiltre, emplacementFiltre);

    if (stockGlobalActuel > 0) {
      setEtatModale({ ouverte: true, titre: 'Suppression bloquée', message: `Impossible de supprimer ! L'article possède encore un stock de ${stockGlobalActuel} unité(s).`, type: 'erreur', onConfirmer: null });
      return;
    }

    setEtatModale({
      ouverte: true,
      titre: 'Confirmer la suppression',
      message: `Voulez-vous vraiment supprimer définitivement cet article ?`,
      type: 'confirmation',
      onConfirmer: async () => {
        setEnTrainDeSauvegarder(true);
        try {
          const { error } = await supabase
            .from('articles_stock')
            .delete()
            .eq(articleEnEdition.id_article ? 'id_article' : 'id', artId)
            .eq('id_entreprise', entrepriseId);

          if (error) {
            localSync.ajouterFileAttente('DELETE', 'articles_stock', { id: artId });
          }

          const articlesMaj = articles.filter(a => String(a.id_article || a.id) !== String(artId));
          setArticles(articlesMaj);
          localSync.sauvegarderDonneesLocales(cleCacheArticles, articlesMaj);

          annulerForm();
          setAfficherModalForm(false);
          chargerArticles();

          setEtatModale({
            ouverte: true,
            titre: 'Succès',
            message: 'Article supprimé avec succès.',
            type: 'succes',
            onConfirmer: null
          });
        } catch (err) {
          setEtatModale({ ouverte: true, titre: 'Erreur', message: 'Erreur : ' + err.message, type: 'erreur', onConfirmer: null });
        } finally {
          setEnTrainDeSauvegarder(false);
        }
      }
    });
  };

  const articlesFiltres = articles.filter((art) => {
    const artId = art.id_article || art.id;

    const designationArt = (art.Designation || art.designation || '').toLowerCase();
    if (rechercheArticleInput.trim() !== '' && !designationArt.includes(rechercheArticleInput.trim().toLowerCase())) {
      return false;
    }

    const matchFamille = familleFiltre === 'TOUTES' || !familleFiltre || String(art.Famille || art.famille) === String(familleFiltre);
    if (!matchFamille) return false;

    const matchDepotMouvement = articleAeuMouvementChezPartenaire(artId, depotFiltre);
    if (!matchDepotMouvement) return false;

    return true;
  });

  const articlesRapportFiltres = articles.filter((art) => {
    const artId = art.id_article || art.id;

    const designationArt = (art.Designation || art.designation || '').toLowerCase();
    if (rechercheRapportInput.trim() !== '' && !designationArt.includes(rechercheRapportInput.trim().toLowerCase())) {
      return false;
    }

    return articleAeuMouvementChezPartenaire(artId, depotRapportFiltre);
  });

  const gererTri = (colonne) => {
    if (enTrainDeSauvegarder) return;
    if (colonneTri === colonne) {
      setOrdreTri(ordreTri === 'asc' ? 'desc' : 'asc');
    } else {
      setColonneTri(colonne);
      setOrdreTri('asc');
    }
  };

  const gererTriRapport = (colonne) => {
    if (enTrainDeSauvegarder) return;
    if (colonneTriRapport === colonne) {
      setOrdreTriRapport(ordreTriRapport === 'asc' ? 'desc' : 'asc');
    } else {
      setColonneTriRapport(colonne);
      setOrdreTriRapport('asc');
    }
  };

  const articlesTries = [...articlesFiltres].sort((a, b) => {
    let valA, valB;

    if (colonneTri === 'Designation') {
      valA = String(a.Designation || a.designation || '').toLowerCase();
      valB = String(b.Designation || b.designation || '').toLowerCase();
    } else if (colonneTri === 'Prix_Achat') {
      valA = parseFloat(a.Prix_Achat || a.prix_achat || 0);
      valB = parseFloat(b.Prix_Achat || b.prix_vente || 0);
    } else if (colonneTri === 'Prix_Vente') {
      valA = parseFloat(a.Prix_Vente || a.prix_vente || 0);
      valB = parseFloat(b.Prix_Vente || b.prix_vente || 0);
    }

    if (valA < valB) return ordreTri === 'asc' ? -1 : 1;
    if (valA > valB) return ordreTri === 'asc' ? 1 : -1;
    return 0;
  });

  const articlesRapportTries = [...articlesRapportFiltres].sort((a, b) => {
    let valA, valB;
    if (colonneTriRapport === 'Designation') {
      valA = String(a.Designation || a.designation || '').toLowerCase();
      valB = String(b.Designation || b.designation || '').toLowerCase();
    }
    if (valA < valB) return ordreTriRapport === 'asc' ? -1 : 1;
    if (valA > valB) return ordreTriRapport === 'asc' ? 1 : -1;
    return 0;
  });

  const articlesAffiches = articlesTries.slice(0, limiteArticles);

  const emplacementsStatDisponibles = depotStatFiltre === 'TOUS'
    ? emplacements
    : emplacements.filter(emp => {
        const empId = String(emp.id || '');
        return mouvements.some(m => {
          const matchDepot = String(m.id_depot_source || '') === String(depotStatFiltre) || String(m.id_depot_destination || '') === String(depotStatFiltre);
          const matchEmplacement = String(m.id_emplacement_source || '') === empId || String(m.id_emplacement_destination || '') === empId;
          return matchDepot && matchEmplacement;
        });
      });

  const emplacementsCatDisponibles = depotFiltre === 'TOUS'
    ? emplacements
    : emplacements.filter(emp => {
        const empId = String(emp.id || '');
        return mouvements.some(m => {
          const matchDepot = String(m.id_depot_source || '') === String(depotFiltre) || String(m.id_depot_destination || '') === String(depotFiltre);
          const matchEmplacement = String(m.id_emplacement_source || '') === empId || String(m.id_emplacement_destination || '') === empId;
          return matchDepot && matchEmplacement;
        });
      });

  const emplacementsTableau = emplacementFiltre !== 'TOUS'
    ? emplacements.filter(emp => String(emp.id || emp.id_emplacement || '') === String(emplacementFiltre))
    : emplacementsCatDisponibles;

  const articlesModalFiltres = articles.filter(art => {
    const nom = (art.Designation || art.designation || '').toLowerCase();
    return nom.includes(rechercheModalArticle.toLowerCase());
  });

  const depotsModalFiltres = [
    { id: 'TOUS', nom_depot: moduleActuel === 'LIVRAISON' ? 'Tous les partenaires' : 'Tous les dépôts' },
    ...depots.filter(d => (d.nom_depot || d.Nom_Depot || '').toLowerCase().includes(rechercheModalDepot.toLowerCase()))
  ];

  const emplacementsModalFiltres = [
    { id: 'TOUS', nom_emplacement: moduleActuel === 'LIVRAISON' ? 'Tous les livreurs' : 'Tous les emplacements' },
    ...emplacementsStatDisponibles.filter(e => (e.nom_emplacement || '').toLowerCase().includes(rechercheModalEmp.toLowerCase()))
  ];

  const famillesCatModalFiltres = [
    { id: 'TOUTES', nom_famille: 'Toutes' },
    ...familles.filter(f => (f.nom_famille || f.Nom_Famille || '').toLowerCase().includes(rechercheModalFamilleCat.toLowerCase()))
  ];

  const depotsCatModalFiltres = [
    { id: 'TOUS', nom_depot: moduleActuel === 'LIVRAISON' ? 'Tous les partenaires' : 'Tous les dépôts' },
    ...depots.filter(d => (d.nom_depot || d.Nom_Depot || '').toLowerCase().includes(rechercheModalDepotCat.toLowerCase()))
  ];

  const emplacementsCatModalFiltres = [
    { id: 'TOUS', nom_emplacement: moduleActuel === 'LIVRAISON' ? 'Tous les livreurs' : 'Tous les emplacements' },
    ...emplacementsCatDisponibles.filter(e => (e.nom_emplacement || '').toLowerCase().includes(rechercheModalEmpCat.toLowerCase()))
  ];

  const articleStatObjet = articles.find(a => String(a.id_article || a.id) === String(articleSelectionneStatId));

  const colSpanTotal = 2 + emplacementsTableau.length + (moduleActuel !== 'LIVRAISON' ? 2 : 1);

  const calculerLigneRapportStock = (articleId) => {
    const dCible = depotRapportFiltre;
    
    let stockInitial = 0;
    let entrees = 0;
    let sorties = 0;

    mouvements.forEach(m => {
      if (String(m.id_article) !== String(articleId)) return;
      const dateMvt = (m.created_at || '').split('T')[0];
      const qte = parseInt(m.quantite || 0);
      const typeMvt = (m.type_mouvement || '').toUpperCase();

      const estSource = String(m.id_depot_source || '') === String(dCible);
      const estDestination = String(m.id_depot_destination || '') === String(dCible);
      const memeDepotInterne = m.id_depot_source && m.id_depot_destination && String(m.id_depot_source) === String(m.id_depot_destination);

      if (dCible !== 'TOUS' && !estSource && !estDestination) return;

      if (dateDebutRapport && dateMvt && dateMvt < dateDebutRapport) {
        if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
          if (dCible === 'TOUS' || estSource) stockInitial -= qte;
        } else if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') {
          stockInitial += qte;
        } else if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          if (!memeDepotInterne && dCible !== 'TOUS') {
            if (estSource) stockInitial -= qte;
            if (estDestination) stockInitial += qte;
          }
        } else {
          stockInitial += qte;
        }
      } else if ((!dateDebutRapport || !dateMvt || dateMvt >= dateDebutRapport) && (!dateFinRapport || !dateMvt || dateMvt <= dateFinRapport)) {
        if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
          if (dCible === 'TOUS' || estSource) sorties += qte;
        } else if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') {
          entrees += qte;
        } else if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          if (memeDepotInterne) {
            // Neutre
          } else if (dCible !== 'TOUS') {
            if (estSource) sorties += qte;
            if (estDestination) entrees += qte;
          }
        } else {
          entrees += qte;
        }
      }
    });

    approvisionnements.forEach(app => {
      const dateApp = (app.created_at || '').split('T')[0];
      const matchDepot = dCible === 'TOUS' || String(app.id_depot_destination || app.id_depot || '') === String(dCible);
      if (!matchDepot) return;

      let listArt = [];
      if (typeof app.details_articles === 'string') {
        try { listArt = JSON.parse(app.details_articles); } catch (e) {}
      } else if (Array.isArray(app.details_articles)) {
        listArt = app.details_articles;
      }

      listArt.forEach(item => {
        if (String(item.id_article || item.article_id) !== String(articleId)) return;
        const qte = parseInt(item.quantite || 0);

        if (dateDebutRapport && dateApp && dateApp < dateDebutRapport) {
          stockInitial += qte;
        } else if ((!dateDebutRapport || !dateApp || dateApp >= dateDebutRapport) && (!dateFinRapport || !dateApp || dateApp <= dateFinRapport)) {
          entrees += qte;
        }
      });
    });

    stockInitial = Math.max(0, stockInitial);
    const stockTotal = stockInitial + entrees;
    const stockReel = Math.max(0, stockTotal - sorties);

    return { stockInitial, entrees, stockTotal, sorties, stockReel };
  };

  const imprimerOngletActif = (titreDocument) => {
    const contenuActuel = document.getElementById(`section-impression-${modeVue}`);
    if (!contenuActuel) {
      window.print();
      return;
    }

    const nomEntreprise = entrepriseInfo?.nom_entreprise || entrepriseInfo?.nom || '4TS Suite manager';
    const dateImpression = new Date().toLocaleDateString('fr-FR');
    
    const formatIsoDateFr = (isoStr) => {
      if (!isoStr) return '';
      const parts = isoStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return isoStr;
    };

    let infosFiltresHtml = '';
    const libelleDepotRapport = moduleActuel === 'LIVRAISON' ? 'Partenaire' : 'Dépôt';

    if (modeVue === 'catalogue') {
      const famObj = familles.find(f => String(f.id) === String(familleFiltre));
      const depObj = depots.find(d => String(d.id) === String(depotFiltre));
      const empObj = emplacements.find(e => String(e.id) === String(emplacementFiltre));
      
      const nomDepotPartenaire = depObj ? (depObj.nom_depot || depObj.Nom_Depot) : 'Tous';

      infosFiltresHtml = `
        <div class="meta-info">
          <span><strong>Famille :</strong> ${famObj ? (famObj.nom_famille || famObj.Nom_Famille) : 'Toutes'}</span>
          <span><strong>${libelleDepotRapport} :</strong> ${nomDepotPartenaire}</span>
          <span><strong>${libelleLivreurOuEmplacement} :</strong> ${empObj ? empObj.nom_emplacement : 'Tous'}</span>
        </div>
      `;
    } else if (modeVue === 'statistiques') {
      const depObj = depots.find(d => String(d.id) === String(depotStatFiltre));
      const empObj = emplacements.find(e => String(e.id) === String(emplacementStatFiltre));
      const nomDepotPartenaire = depObj ? (depObj.nom_depot || depObj.Nom_Depot) : (moduleActuel === 'LIVRAISON' ? 'Tous les partenaires' : 'Tous les dépôts');
      const nomLivreurEmplacement = empObj ? empObj.nom_emplacement : 'Tous';
      
      const periodeTexte = (dateDebutStat && dateFinStat)
        ? `Du ${formatIsoDateFr(dateDebutStat)} au ${formatIsoDateFr(dateFinStat)}`
        : 'Période globale';

      infosFiltresHtml = `
        <div class="meta-info">
          <span><strong>${libelleDepotRapport} :</strong> ${nomDepotPartenaire}</span>
          <span><strong>${libelleLivreurOuEmplacement} :</strong> ${nomLivreurEmplacement}</span>
          <span><strong>Période :</strong> ${periodeTexte}</span>
        </div>
      `;
    } else if (modeVue === 'rapport') {
      const depObj = depots.find(d => String(d.id) === String(depotRapportFiltre));
      const nomDepotPartenaire = depObj ? (depObj.nom_depot || depObj.Nom_Depot) : (moduleActuel === 'LIVRAISON' ? 'Tous les partenaires' : 'Tous les dépôts');
      
      const periodeTexte = (dateDebutRapport && dateFinRapport)
        ? `Du ${formatIsoDateFr(dateDebutRapport)} au ${formatIsoDateFr(dateFinRapport)}`
        : 'Période globale';

      infosFiltresHtml = `
        <div class="meta-info">
          <span><strong>${libelleDepotRapport} :</strong> ${nomDepotPartenaire}</span>
          <span><strong>Période :</strong> ${periodeTexte}</span>
        </div>
      `;
    }

    const fenetreImpression = window.open('', '_blank', 'width=950,height=700');
    fenetreImpression.document.write(`
      <html>
        <head>
          <title>${titreDocument}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #0f172a; background: #fff; }
            .header-box { border-bottom: 3px solid #64748b; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .company-title { font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; }
            .doc-subtitle { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-top: 4px; }
            .print-date { font-size: 11px; font-weight: bold; color: #475569; text-align: right; }
            .meta-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 20px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
            th { background-color: #334155; text-transform: uppercase; font-weight: 900; font-size: 10px; color: #ffffff; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <h1 class="company-title">📦 ${nomEntreprise}</h1>
              <div class="doc-subtitle">${titreDocument}</div>
            </div>
            <div class="print-date">Édité le : ${dateImpression}</div>
          </div>
          ${infosFiltresHtml}
          <div>${contenuActuel.innerHTML}</div>
        </body>
      </html>
    `);
    fenetreImpression.document.close();
    fenetreImpression.focus();
    setTimeout(() => {
      fenetreImpression.print();
      fenetreImpression.close();
    }, 500);
  };

  // 🎨 CONFIGURATION GRIS SOURIS ET ORANGE VIF
  const containerBg = isDarkMode ? 'bg-[#050b18] text-slate-100' : 'bg-slate-100 text-slate-900';
  const headerCardBg = isDarkMode ? 'bg-[#0b1329] border-2 border-slate-600 text-slate-100 shadow-md' : 'bg-white border-2 border-slate-400 text-slate-900 shadow-md';
  const inputBg = isDarkMode ? 'bg-slate-800 border-2 border-slate-600 text-slate-100 placeholder:text-slate-400 [color-scheme:dark]' : 'bg-white border-2 border-slate-400 text-slate-900 font-semibold placeholder:text-slate-400 [color-scheme:light]';
  
  // En-têtes de tableaux en fond gris, texte noir en mode jour et blanc en mode nuit
  const tableHeaderBg = isDarkMode ? 'bg-slate-700 text-white font-black border-slate-600' : 'bg-slate-300 text-black font-black border-slate-400';
  const rowHoverBg = isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100';

  return (
    <div className={`space-y-2.5 font-sans text-xs ${containerBg} p-2 rounded-xl transition-colors`}>
      
      <div className={`flex justify-between items-center p-3 rounded-xl ${headerCardBg} gap-2`}>
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          <span className="text-sm shrink-0">📦</span>
          <h3 className={`font-black uppercase text-[11px] truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            GESTION DES ARTICLES ({articlesAffiches.length} / {articlesFiltres.length})
          </h3>
          {isGestionPerissablesActive() && <span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300 shrink-0 font-bold">Périssables</span>}
        </div>
        
        {permissions.creation && (
          <button
            type="button"
            disabled={enTrainDeSauvegarder}
            onClick={() => {
              setModeVue('catalogue');
              annulerForm();
              if (familles.length > 0) {
                const premiereFam = familles[0];
                setNouveauArticle(prev => ({ 
                  ...prev, 
                  Famille: premiereFam.id,
                  suivi_stock: premiereFam.suivi_stock ?? true 
                }));
              }
              setAfficherModalForm(true);
              setTimeout(() => {
                if (designationInputRef.current) {
                  designationInputRef.current.focus();
                  designationInputRef.current.select();
                }
              }, 50);
            }}
            className="font-black px-3 py-1.5 rounded-lg transition shadow-md text-xs cursor-pointer bg-orange-600 hover:bg-orange-700 text-white border-2 border-orange-700"
          >
            ＋ Nouveau
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 w-full">
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => {
            setModeVue('catalogue');
            annulerForm();
          }}
          className={`px-1 py-2 rounded-lg font-black text-[10px] transition text-center border-2 shadow-xs whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer ${
            modeVue === 'catalogue' 
              ? 'bg-orange-600 text-white border-orange-700 shadow-sm'
              : (isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50')
          }`}
        >
          Article ({articles.length})
        </button>

        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => {
            setModeVue('statistiques');
            annulerForm();
          }}
          className={`px-1 py-2 rounded-lg font-black text-[10px] transition text-center border-2 shadow-xs whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer ${
            modeVue === 'statistiques' 
              ? 'bg-orange-600 text-white border-orange-700 shadow-sm'
              : (isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50')
          }`}
        >
          Stat
        </button>

        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => {
            setModeVue('rapport');
            annulerForm();
          }}
          className={`px-1 py-2 rounded-lg font-black text-[10px] transition text-center border-2 shadow-xs whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer ${
            modeVue === 'rapport' 
              ? 'bg-orange-600 text-white border-orange-700 shadow-sm'
              : (isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50')
          }`}
        >
          Rapport Stock
        </button>
      </div>

      {modeVue === 'catalogue' && (
        <div className="space-y-2.5">
          <div className={`p-3 rounded-xl border-2 space-y-2 shadow-md ${isDarkMode ? 'bg-[#0b1329] border-slate-600' : 'bg-white border-slate-400'}`}>
            <div>
              <label className={`block font-black text-[9px] uppercase mb-0.5 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Rechercher un article</label>
              <div className="relative">
                <input
                  type="text"
                  disabled={enTrainDeSauvegarder}
                  value={rechercheArticleInput}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setRechercheArticleInput(e.target.value)}
                  placeholder=""
                  style={{ textTransform: 'uppercase' }}
                  className={`w-full rounded-lg p-2 pl-7 font-extrabold text-xs shadow-xs uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                />
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                {rechercheArticleInput && (
                  <button
                    type="button"
                    onClick={() => setRechercheArticleInput('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 font-black text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className={`block font-black text-[9px] uppercase mb-0.5 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Famille</label>
                <div
                  onClick={() => {
                    if (enTrainDeSauvegarder) return;
                    setRechercheModalFamilleCat('');
                    setAfficherModalFamilleCat(true);
                  }}
                  className={`w-full rounded-lg p-2 text-xs font-black shadow-xs cursor-pointer flex justify-between items-center border-2 ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-white border-slate-400 text-slate-900'}`}
                >
                  <span className="truncate uppercase">{obtenirNomFamilleParId(familleFiltre)}</span>
                  <span className="text-xs text-slate-400">🔍</span>
                </div>
              </div>

              <div>
                <label className={`block font-black text-[9px] uppercase mb-0.5 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                  {libelleDepotPartenaire}
                </label>
                <div
                  onClick={() => {
                    if (enTrainDeSauvegarder) return;
                    setRechercheModalDepotCat('');
                    setAfficherModalDepotCat(true);
                  }}
                  className={`w-full rounded-lg p-2 text-xs font-black shadow-xs cursor-pointer flex justify-between items-center border-2 ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-white border-slate-400 text-slate-900'}`}
                >
                  <span className="truncate uppercase">{obtenirNomDepotParId(depotFiltre)}</span>
                  <span className="text-xs text-slate-400">🔍</span>
                </div>
              </div>

              <div>
                <label className={`block font-black text-[9px] uppercase mb-0.5 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                  {libelleLivreurOuEmplacement}
                </label>
                <div
                  onClick={() => {
                    if (enTrainDeSauvegarder) return;
                    setRechercheModalEmpCat('');
                    setAfficherModalEmpCat(true);
                  }}
                  className={`w-full rounded-lg p-2 text-xs font-black shadow-xs cursor-pointer flex justify-between items-center border-2 ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-white border-slate-400 text-slate-900'}`}
                >
                  <span className="truncate uppercase">{obtenirNomEmplacementParId(emplacementFiltre)}</span>
                  <span className="text-xs text-slate-400">🔍</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-600 text-white px-3 py-2 rounded-xl shadow-md border-2 border-slate-500">
            <h4 className="font-black uppercase text-[10px]">📦 Stock des Articles [{moduleActuel}] ({articlesAffiches.length} / {articlesFiltres.length})</h4>
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={() => imprimerOngletActif('STOCK DES ARTICLES')}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black px-2.5 py-1 rounded-lg text-[10px] border border-orange-700 flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span>🖨️ Imprimer</span>
            </button>
          </div>

          <div id="section-impression-catalogue" className={`rounded-xl border-2 overflow-x-auto shadow-md ${isDarkMode ? 'bg-slate-100 border-slate-600' : 'bg-slate-50 border-slate-400'}`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b-2 uppercase text-[9.5px] font-black tracking-wider ${tableHeaderBg}`}>
                  <th 
                    onClick={() => !enTrainDeSauvegarder && gererTri('Designation')} 
                    className={`p-3 cursor-pointer hover:bg-slate-400/40 select-none whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'}`}
                  >
                    Désignation {colonneTri === 'Designation' && (ordreTri === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className={`p-3 text-center whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'}`}>STOCK</th>

                  {emplacementsTableau.map((emp) => (
                    <th key={emp.id} className={`p-3 text-center whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      📍 {emp.nom_emplacement || emp.code_emplacement}
                    </th>
                  ))}

                  {moduleActuel !== 'LIVRAISON' && (
                    <th 
                      onClick={() => !enTrainDeSauvegarder && gererTri('Prix_Achat')} 
                      className={`p-3 text-right cursor-pointer hover:bg-slate-400/40 select-none whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'}`}
                    >
                      PA {colonneTri === 'Prix_Achat' && (ordreTri === 'asc' ? '▲' : '▼')}
                    </th>
                  )}

                  <th 
                    onClick={() => !enTrainDeSauvegarder && gererTri('Prix_Vente')} 
                    className={`p-3 text-right cursor-pointer hover:bg-slate-400/40 select-none whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'}`}
                  >
                    PV {colonneTri === 'Prix_Vente' && (ordreTri === 'asc' ? '▲' : '▼')}
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-900 bg-white">
                {chargement && articles.length === 0 ? (
                  <tr>
                    <td colSpan={colSpanTotal} className="p-6 text-center text-slate-500 font-bold">Chargement instantané...</td>
                  </tr>
                ) : articlesAffiches.length === 0 ? (
                  <tr>
                    <td colSpan={colSpanTotal} className="p-6 text-center font-bold text-slate-600">Aucun article enregistré pour le module {moduleActuel}.</td>
                  </tr>
                ) : (
                  articlesAffiches.map((art) => {
                    const artId = art.id_article || art.id;
                    const stockCalculé = calculerStockReelDirect(artId, depotFiltre, emplacementFiltre);
                    const prixAchatValeur = art.Prix_Achat || art.prix_achat || 0;
                    const suiviStockActif = art.suivi_stock ?? true;

                    return (
                      <tr 
                        key={artId}
                        onClick={() => {
                          if (enTrainDeSauvegarder) return;
                          if (!permissions.modification) {
                            setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Vous n’avez pas le droit de modifier les articles.', type: 'erreur', onConfirmer: null });
                            return;
                          }
                          ouvrirEdition(art);
                        }}
                        className={`transition select-none ${permissions.modification ? 'hover:bg-slate-100 cursor-pointer' : 'cursor-default'}`}
                      >
                        <td className="p-3 font-black text-xs whitespace-nowrap uppercase flex items-center gap-1.5 text-slate-900">
                          <span>{art.Designation || art.designation}</span>
                          {!suiviStockActif && (
                            <span className="bg-slate-200 text-slate-700 text-[8.5px] font-bold px-1.5 py-0.5 rounded border border-slate-300">
                              Non suivi
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {suiviStockActif ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {stockCalculé}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-slate-200 text-slate-600 italic">
                              Libre
                            </span>
                          )}
                        </td>

                        {emplacementsTableau.map((emp) => {
                          const stockEmp = calculerStockReelDirect(artId, depotFiltre, emp.id);
                          return (
                            <td key={emp.id} className="p-3 text-center whitespace-nowrap">
                              {suiviStockActif ? (
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${stockEmp > 0 ? 'bg-slate-100 text-slate-900 border border-slate-300' : 'text-slate-500 font-bold'}`}>
                                  {stockEmp}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[9.5px]">-</span>
                              )}
                            </td>
                          );
                        })}

                        {moduleActuel !== 'LIVRAISON' && (
                          <td className="p-3 text-right font-black text-xs whitespace-nowrap text-slate-900">
                            {prixAchatValeur}
                          </td>
                        )}
                        <td className="p-3 text-right font-black text-emerald-700 text-xs whitespace-nowrap">
                          {art.Prix_Vente || art.prix_vente || 0}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {limiteArticles < articlesFiltres.length && (
            <div className="text-center pt-1 pb-2">
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => setLimiteArticles(prev => prev + 20)}
                className={`font-black px-4 py-2 rounded-xl text-xs transition shadow-md border-2 w-full cursor-pointer ${
                  isDarkMode 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600' 
                    : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-400'
                }`}
              >
                📥 Charger 20 articles de plus ({articlesFiltres.length - limiteArticles} restants)
              </button>
            </div>
          )}
        </div>
      )}

      {modeVue === 'statistiques' && (() => {
        const artObj = articleStatObjet;
        const nomArticle = artObj ? (artObj.Designation || artObj.designation || '') : '';
        const stats = artObj ? obtenirHistoriqueChronologiqueStat(artObj.id_article || artObj.id) : { lignes: [], stockFinal: 0 };

        const nomDepotActuel = obtenirNomDepotParId(depotStatFiltre);
        const nomEmpActuel = obtenirNomEmplacementParId(emplacementStatFiltre);

        return (
          <div className={`p-3 rounded-xl border-2 shadow-md space-y-3 ${isDarkMode ? 'bg-[#0b1329] border-slate-600' : 'bg-white border-slate-400'}`}>
            <div className={`p-3 rounded-xl border-2 space-y-2.5 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block font-black uppercase text-[9px] mb-0.5 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Date début</label>
                  <input
                    type="date"
                    disabled={enTrainDeSauvegarder}
                    value={dateDebutStat}
                    onChange={(e) => setDateDebutStat(e.target.value)}
                    className={`w-full rounded-lg p-2 text-xs font-mono font-bold shadow-xs ${inputBg}`}
                  />
                </div>

                <div>
                  <label className={`block font-black uppercase text-[9px] mb-0.5 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Date fin</label>
                  <input
                    type="date"
                    disabled={enTrainDeSauvegarder}
                    value={dateFinStat}
                    onChange={(e) => setDateFinStat(e.target.value)}
                    className={`w-full rounded-lg p-2 text-xs font-mono font-bold shadow-xs ${inputBg}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={`block font-black uppercase text-[9px] mb-0.5 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{libelleDepotPartenaire}</label>
                  <div
                    onClick={() => {
                      if (enTrainDeSauvegarder) return;
                      setRechercheModalDepot('');
                      setAfficherModalSelectionDepot(true);
                    }}
                    className={`w-full rounded-lg p-2 text-xs font-black shadow-xs cursor-pointer flex justify-between items-center border-2 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-slate-400 text-slate-900'}`}
                  >
                    <span className="truncate uppercase">{nomDepotActuel}</span>
                    <span className="text-xs text-slate-400">🔍</span>
                  </div>
                </div>

                <div>
                  <label className={`block font-black uppercase text-[9px] mb-0.5 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{libelleLivreurOuEmplacement}</label>
                  <div
                    onClick={() => {
                      if (enTrainDeSauvegarder) return;
                      setRechercheModalEmp('');
                      setAfficherModalSelectionEmp(true);
                    }}
                    className={`w-full rounded-lg p-2 text-xs font-black shadow-xs cursor-pointer flex justify-between items-center border-2 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-slate-400 text-slate-900'}`}
                  >
                    <span className="truncate uppercase">{nomEmpActuel}</span>
                    <span className="text-xs text-slate-400">🔍</span>
                  </div>
                </div>

                <div>
                  <label className={`block font-black uppercase text-[9px] mb-0.5 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Article</label>
                  <div
                    onClick={() => {
                      if (enTrainDeSauvegarder) return;
                      setRechercheModalArticle('');
                      setAfficherModalSelectionArticle(true);
                    }}
                    className={`w-full rounded-lg p-2 text-xs font-black shadow-xs cursor-pointer flex justify-between items-center border-2 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-slate-400 text-slate-900'}`}
                  >
                    <span className="truncate uppercase">
                      {artObj ? nomArticle : '-- Choisir --'}
                    </span>
                    <span className="text-xs text-slate-400">🔍</span>
                  </div>
                </div>
              </div>
            </div>

            {artObj ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-600 text-white px-3 py-2 rounded-xl shadow-md border-2 border-slate-500">
                  <h4 className="font-black uppercase text-[10px]">📈 STATISTIQUES & MOUVEMENTS : {nomArticle}</h4>
                  <button
                    type="button"
                    disabled={enTrainDeSauvegarder}
                    onClick={() => imprimerOngletActif('STATISTIQUES ARTICLE')}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-black px-2.5 py-1 rounded-lg text-[10px] border border-orange-700 flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span>🖨️ Imprimer</span>
                  </button>
                </div>

                <div id="section-impression-statistiques" className={`rounded-xl border-2 overflow-x-auto shadow-md ${isDarkMode ? 'bg-slate-100 border-slate-600 text-slate-900' : 'bg-slate-50 border-slate-400 text-slate-900'}`}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b-2 uppercase text-[9.5px] font-black ${tableHeaderBg}`}>
                        <th className={`p-3 ${isDarkMode ? 'text-white' : 'text-black'}`}>Date</th>
                        <th className={`p-3 ${isDarkMode ? 'text-white' : 'text-black'}`}>Motif</th>
                        <th className={`p-3 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>Type Mvt</th>
                        <th className={`p-3 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>Livreur</th>
                        <th className={`p-3 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>Quantité</th>
                        <th className={`p-3 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>Cumul</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-slate-900 bg-white">
                      {stats.lignes.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-6 text-center font-bold text-slate-500">Aucun mouvement enregistré sur cette période.</td>
                        </tr>
                      ) : (
                        stats.lignes.map((ligne, idx) => (
                          <tr key={idx} className="transition hover:bg-slate-100">
                            <td className="p-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                              {ligne.date ? new Date(ligne.date).toLocaleDateString('fr-FR') : '-'}
                            </td>
                            <td className="p-3 font-black uppercase text-slate-900">{ligne.motifLigne || '-'}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-black text-[9.5px] border ${
                                ligne.typeAbr === 'APP' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                ligne.typeAbr.startsWith('ME') ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                ligne.typeAbr.startsWith('MS') ? 'bg-rose-100 text-rose-800 border-rose-300' :
                                ligne.typeAbr.startsWith('TR') ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                'bg-blue-100 text-blue-800 border-blue-300'
                              }`}>
                                {ligne.typeAbr}
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-700 uppercase">{ligne.emplacementDest || '-'}</td>
                            <td className={`p-3 text-center font-black ${ligne.impactStock < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {ligne.impactStock > 0 ? `+${ligne.quantiteMouvementee}` : ligne.impactStock < 0 ? `-${ligne.quantiteMouvementee}` : ligne.quantiteMouvementee}
                            </td>
                            <td className="p-3 text-center font-black text-slate-900 bg-slate-200">
                              {ligne.stockProgressif}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 font-bold italic text-xs">
                👆 Veuillez cliquer sur le champ "Article" ci-dessus pour sélectionner un article et afficher ses statistiques.
              </div>
            )}
          </div>
        );
      })()}

      {modeVue === 'rapport' && (
        <div className={`p-3 rounded-xl border-2 shadow-md space-y-3 ${isDarkMode ? 'bg-[#0b1329] border-slate-600' : 'bg-white border-slate-400'}`}>
          <div className={`p-3 rounded-xl border-2 space-y-2.5 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={`block font-black uppercase text-[9px] mb-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Du</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={dateDebutRapport}
                  onChange={(e) => setDateDebutRapport(e.target.value)}
                  className={`w-full rounded-lg p-2 text-xs font-mono font-bold shadow-xs ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block font-black uppercase text-[9px] mb-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Au</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={dateFinRapport}
                  onChange={(e) => setDateFinRapport(e.target.value)}
                  className={`w-full rounded-lg p-2 text-xs font-mono font-bold shadow-xs ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block font-black uppercase text-[9px] mb-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                  {libelleDepotPartenaire}
                </label>
                <select
                  disabled={enTrainDeSauvegarder}
                  value={depotRapportFiltre}
                  onChange={(e) => setDepotRapportFiltre(e.target.value)}
                  className={`w-full rounded-lg p-2 text-xs font-black shadow-xs ${inputBg}`}
                >
                  <option value="TOUS">{moduleActuel === 'LIVRAISON' ? 'Tous les partenaires' : 'Tous les dépôts'}</option>
                  {depots.map((dep) => (
                    <option key={dep.id} value={dep.id}>
                      {dep.nom_depot || dep.Nom_Depot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={`block font-black uppercase text-[9px] mb-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Rechercher un article</label>
              <div className="relative">
                <input
                  type="text"
                  disabled={enTrainDeSauvegarder}
                  value={rechercheRapportInput}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setRechercheRapportInput(e.target.value)}
                  placeholder=""
                  style={{ textTransform: 'uppercase' }}
                  className={`w-full rounded-lg p-2 pl-7 font-extrabold text-xs shadow-xs uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                />
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                {rechercheRapportInput && (
                  <button
                    type="button"
                    onClick={() => setRechercheRapportInput('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 font-black text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-600 text-white px-3 py-2 rounded-xl shadow-md border-2 border-slate-500">
            <h4 className="font-black uppercase text-[10px]">📊 RAPPORT DE STOCK PAR ARTICLE</h4>
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={() => imprimerOngletActif('RAPPORT DE STOCK')}
              className="bg-orange-600 hover:bg-orange-700 text-white font-black px-2.5 py-1 rounded-lg text-[10px] border border-orange-700 flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span>🖨️ Imprimer</span>
            </button>
          </div>

          <div id="section-impression-rapport" className={`rounded-xl border-2 overflow-x-auto shadow-md ${isDarkMode ? 'bg-slate-100 border-slate-600 text-slate-900' : 'bg-slate-50 border-slate-400 text-slate-900'}`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b-2 uppercase text-[9.5px] font-black ${tableHeaderBg}`}>
                  <th 
                    onClick={() => !enTrainDeSauvegarder && gererTriRapport('Designation')}
                    className={`p-3 cursor-pointer hover:bg-slate-400/40 select-none whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'}`}
                  >
                    Désignation {colonneTriRapport === 'Designation' && (ordreTriRapport === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className={`p-3 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>Stock Initial</th>
                  <th className="p-3 text-center text-emerald-700">Entrées</th>
                  <th className={`p-3 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>Stock Total</th>
                  <th className="p-3 text-center text-rose-700">Sorties</th>
                  <th className={`p-3 text-center ${isDarkMode ? 'text-white' : 'text-black'}`}>Stock Réel</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-900 bg-white">
                {articlesRapportTries.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center font-bold text-slate-500">Aucun article ne correspond à votre recherche.</td>
                  </tr>
                ) : (
                  articlesRapportTries.map((art) => {
                    const artId = art.id_article || art.id;
                    const rep = calculerLigneRapportStock(artId);

                    return (
                      <tr key={artId} className="transition hover:bg-slate-100">
                        <td className="p-3 font-black uppercase text-slate-900">{art.Designation || art.designation}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{rep.stockInitial}</td>
                        <td className="p-3 text-center font-black text-emerald-700">+{rep.entrees}</td>
                        <td className="p-3 text-center font-bold text-slate-900">{rep.stockTotal}</td>
                        <td className="p-3 text-center font-black text-rose-700">-{rep.sorties}</td>
                        <td className="p-3 text-center font-black text-slate-900 bg-slate-200">{rep.stockReel}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🪟 MODALE DE SAISIE / CRÉATION / MODIFICATION D'ARTICLE */}
      {afficherModalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border-3 overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-[#0b1329] border-slate-500 text-slate-100' : 'bg-white border-2 border-slate-700 text-slate-900'}`}>
            
            <div className="p-3.5 flex justify-between items-center text-xs font-black border-b-2 bg-slate-600 text-white border-slate-500">
              <span>{articleEnEdition ? `MODIFIER UN ARTICLE [${moduleActuel}]` : `CRÉER UN ARTICLE [${moduleActuel}]`}</span>
              <button disabled={enTrainDeSauvegarder} onClick={() => { annulerForm(); setAfficherModalForm(false); }} className="text-slate-200 hover:text-white font-black text-sm cursor-pointer p-1">✕</button>
            </div>

            <form onSubmit={preparerEnregistrementArticle} className="p-4 space-y-3.5 overflow-y-auto">
              <div className="grid grid-cols-[4fr_7fr] gap-2">
                <div>
                  <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Famille *</label>
                  <select
                    required
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.Famille || (familles.length > 0 ? familles[0].id : '')}
                    onChange={(e) => {
                      const famIdChoisie = e.target.value;
                      const famObjTrouvee = familles.find(f => String(f.id) === String(famIdChoisie));
                      setNouveauArticle({ 
                        ...nouveauArticle, 
                        Famille: famIdChoisie,
                        suivi_stock: articleEnEdition ? nouveauArticle.suivi_stock : (famObjTrouvee ? (famObjTrouvee.suivi_stock ?? true) : true)
                      });
                      setTimeout(() => {
                        if (designationInputRef.current) {
                          designationInputRef.current.focus();
                          designationInputRef.current.select();
                        }
                      }, 50);
                    }}
                    className={`w-full rounded-lg p-2 text-xs font-black shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                  >
                    <option value="">-- Choisir --</option>
                    {familles.map((fam) => (
                      <option key={fam.id} value={fam.id}>
                        🏷️ {fam.nom_famille || fam.Nom_Famille}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Désignation *</label>
                  <input
                    ref={designationInputRef}
                    autoFocus
                    type="text"
                    required
                    disabled={enTrainDeSauvegarder}
                    list="liste-suggestions-articles"
                    value={nouveauArticle.Designation}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Designation: e.target.value.toUpperCase() })}
                    placeholder="EX: JUS 250ML"
                    style={{ textTransform: 'uppercase' }}
                    className={`w-full rounded-lg p-2 text-xs font-black shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase ${inputBg}`}
                  />
                  <datalist id="liste-suggestions-articles">
                    {toutesLesSuggestionsArticles.map((nomArt, index) => (
                      <option key={index} value={nomArt} />
                    ))}
                  </datalist>
                </div>
              </div>

              {moduleActuel !== 'LIVRAISON' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>PA</label>
                    <input
                      type="number"
                      disabled={enTrainDeSauvegarder}
                      value={nouveauArticle.Prix_Achat}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Achat: e.target.value })}
                      className={`w-full rounded-lg p-2 text-xs font-black shadow-xs ${inputBg}`}
                    />
                  </div>

                  <div>
                    <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>PV *</label>
                    <input
                      type="number"
                      required
                      disabled={enTrainDeSauvegarder}
                      value={nouveauArticle.Prix_Vente}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Vente: e.target.value })}
                      className={`w-full rounded-lg p-2 text-xs font-black text-emerald-700 shadow-xs ${inputBg}`}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>PV *</label>
                  <input
                    type="number"
                    required
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.Prix_Vente}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Vente: e.target.value })}
                    className={`w-full rounded-lg p-2 text-xs font-black text-emerald-700 shadow-xs ${inputBg}`}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>S.ALERTE</label>
                  <input
                    type="number"
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.Seuil_Alerte}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Seuil_Alerte: e.target.value })}
                    className={`w-full rounded-lg p-2 text-xs font-black shadow-xs ${inputBg}`}
                  />
                </div>

                <div>
                  <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>CODE-BARRES</label>
                  <input
                    type="text"
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.Code_Barre}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Code_Barre: e.target.value.toUpperCase() })}
                    placeholder="600123"
                    style={{ textTransform: 'uppercase' }}
                    className={`w-full rounded-lg p-2 text-xs font-bold font-mono shadow-xs uppercase ${inputBg}`}
                  />
                </div>
              </div>

              {isGestionPerissablesActive() && (
                <div>
                  <label className={`block font-black text-[9px] uppercase mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Date Péremption</label>
                  <input
                    type="date"
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.date_peremption}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, date_peremption: e.target.value })}
                    className={`w-full rounded-lg p-2 text-xs font-mono font-bold shadow-xs ${inputBg}`}
                  />
                </div>
              )}

              <div className={`p-3 rounded-xl border-2 flex items-center justify-between ${isDarkMode ? 'bg-slate-900 border-slate-600' : 'bg-slate-50 border-slate-400'}`}>
                <div>
                  <span className={`block font-black text-[10px] uppercase ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>Suivi de stock (Article)</span>
                  <span className={`text-[9px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Hérité de la famille, modifiable pour cet article.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={enTrainDeSauvegarder}
                    checked={nouveauArticle.suivi_stock}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, suivi_stock: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              <div className="space-y-1 pt-1">
                <label className={`block font-black text-[9px] uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>Photo de l'article</label>
                
                {nouveauArticle.Photo ? (
                  <div className={`p-3 rounded-xl border-2 flex items-center justify-between gap-3 ${isDarkMode ? 'bg-slate-900 border-slate-600' : 'bg-slate-50 border-slate-400'}`}>
                    <div className="shrink-0">
                      <img
                        src={nouveauArticle.Photo}
                        alt="Photo de l'article"
                        className="w-16 h-16 object-cover rounded-xl border-2 border-slate-500 shadow-xs"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <label className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-500 px-3 py-1.5 rounded-lg font-black text-xs cursor-pointer flex items-center justify-center gap-1 transition shadow-xs">
                        <span>📷 {uploadingPhoto ? 'Envoi...' : 'Modifier'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={gererUploadImage}
                          className="hidden"
                          disabled={uploadingPhoto || enTrainDeSauvegarder}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={enTrainDeSauvegarder}
                        onClick={() => setNouveauArticle({ ...nouveauArticle, Photo: '' })}
                        className="text-rose-600 hover:text-rose-700 font-bold text-[10px] text-center underline cursor-pointer"
                      >
                        Retirer la photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      disabled={enTrainDeSauvegarder}
                      value={nouveauArticle.Photo}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNouveauArticle({ ...nouveauArticle, Photo: e.target.value })}
                      placeholder="https://lien-image.com/photo.jpg"
                      className={`flex-1 rounded-lg p-2 text-xs font-bold shadow-xs truncate ${inputBg}`}
                    />

                    <label className="bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-500 px-3 py-2 rounded-lg font-black text-xs cursor-pointer flex items-center justify-center transition shrink-0 shadow-xs">
                      <span>📷 Filmer</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={gererUploadImage}
                        className="hidden"
                        disabled={uploadingPhoto || enTrainDeSauvegarder}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className={`p-2.5 rounded-xl border-2 flex items-center space-x-2 ${isDarkMode ? 'bg-slate-900 border-slate-600' : 'bg-slate-100 border-slate-300'}`}>
                <input
                  type="checkbox"
                  id="qrCheck"
                  disabled={enTrainDeSauvegarder}
                  checked={nouveauArticle.Disponible_Menu_QR}
                  onChange={(e) => setNouveauArticle({ ...nouveauArticle, Disponible_Menu_QR: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded border-slate-500 focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="qrCheck" className={`text-xs font-black cursor-pointer select-none leading-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                  📱 Visible au Scan Code QR par les clients
                </label>
              </div>

              <div className="pt-2 border-t-2 border-slate-400/40 flex justify-between items-center">
                {articleEnEdition && permissions.suppression ? (
                  <button 
                    type="button" 
                    disabled={enTrainDeSauvegarder}
                    onClick={supprimerArticleDepuisFormulaire} 
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black px-3.5 py-2 rounded-lg text-xs shadow-md cursor-pointer transition"
                  >
                    {enTrainDeSauvegarder ? 'Patientez...' : '🗑️ Supprimer'}
                  </button>
                ) : <div />}

                <div className="flex gap-2 ml-auto">
                  <button 
                    type="button" 
                    disabled={enTrainDeSauvegarder} 
                    onClick={() => { annulerForm(); setAfficherModalForm(false); }} 
                    className={`font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer border-2 ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700' : 'bg-slate-200 text-slate-900 border-slate-400 hover:bg-slate-300'}`}
                  >
                    Annuler
                  </button>
                  
                  {permissions.modification && (
                    <button 
                      type="submit" 
                      disabled={enTrainDeSauvegarder}
                      className="font-black px-5 py-2 rounded-lg text-xs shadow-md transition cursor-pointer border-2 bg-orange-600 hover:bg-orange-700 text-white border-orange-700"
                    >
                      {enTrainDeSauvegarder ? 'Enregistrement...' : '✅ Enregistrer'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔔 MODALE UNIFIÉE (CONFIRMATION -> SUCCÈS -> ERREUR) */}
      {etatModale.ouverte && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`border-3 rounded-2xl max-w-sm w-full p-5 space-y-4 text-center shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-500 text-slate-100' : 'bg-white border-2 border-slate-700 text-slate-900'}`}>
            
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black ${
              etatModale.type === 'confirmation' ? 'bg-amber-500/20 text-amber-400 border-2 border-amber-500/40' :
              etatModale.type === 'succes' ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-2 border-rose-500/40'
            }`}>
              {etatModale.type === 'confirmation' ? '❓' :
               etatModale.type === 'succes' ? '✓' : '⚠️'}
            </div>

            <div className="space-y-1">
              <h4 className={`font-black text-sm uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {etatModale.titre}
              </h4>
              <p className={`text-xs font-semibold leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
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
                    className="flex-1 font-black py-2.5 rounded-xl text-xs shadow-md transition cursor-pointer border-2 bg-orange-600 hover:bg-orange-700 text-white border-orange-700"
                  >
                    Confirmer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                  className="w-full font-black py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer border-2 bg-orange-600 hover:bg-orange-700 text-white border-orange-700"
                >
                  Compris 👍
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION D'ARTICLE */}
      {afficherModalSelectionArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-3 ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-slate-400 text-slate-900'}`}>
            <div className="p-3 bg-slate-600 text-white flex justify-between items-center">
              <span className="font-black text-xs uppercase">SÉLECTIONNER UN ARTICLE [{moduleActuel}]</span>
              <button disabled={enTrainDeSauvegarder} onClick={() => setAfficherModalSelectionArticle(false)} className="text-slate-200 hover:text-white font-black text-xs p-1">✕</button>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto">
              <input
                type="text"
                autoFocus
                disabled={enTrainDeSauvegarder}
                value={rechercheModalArticle}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setRechercheModalArticle(e.target.value.toUpperCase())}
                placeholder="RECHERCHER..."
                style={{ textTransform: 'uppercase' }}
                className={`w-full rounded-lg p-2.5 text-xs font-black shadow-xs uppercase ${inputBg}`}
              />

              <div className="space-y-1.5 pt-1">
                {articlesModalFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-xs font-bold">Aucun article trouvé.</p>
                ) : (
                  articlesModalFiltres.map((art) => {
                    const idA = String(art.id_article || art.id);
                    const nomArt = art.Designation || art.designation || '';

                    return (
                      <div
                        key={idA}
                        onClick={() => {
                          if (enTrainDeSauvegarder) return;
                          setArticleSelectionneStatId(idA);
                          setAfficherModalSelectionArticle(false);
                        }}
                        className={`border-2 rounded-xl p-3 flex justify-between items-center cursor-pointer transition shadow-xs ${isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-300 hover:bg-slate-100'}`}
                      >
                        <span className="font-black text-xs truncate uppercase">{nomArt}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION DE PARTENAIRE / DÉPÔT */}
      {afficherModalSelectionDepot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-3 ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-slate-400 text-slate-900'}`}>
            <div className="p-3 bg-slate-600 text-white flex justify-between items-center">
              <span className="font-black text-xs uppercase">SÉLECTIONNER UN {libelleDepotPartenaire}</span>
              <button disabled={enTrainDeSauvegarder} onClick={() => setAfficherModalSelectionDepot(false)} className="text-slate-200 hover:text-white font-black text-xs p-1">✕</button>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto">
              <input
                type="text"
                autoFocus
                disabled={enTrainDeSauvegarder}
                value={rechercheModalDepot}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setRechercheModalDepot(e.target.value.toUpperCase())}
                placeholder="RECHERCHER..."
                style={{ textTransform: 'uppercase' }}
                className={`w-full rounded-lg p-2.5 text-xs font-black shadow-xs uppercase ${inputBg}`}
              />

              <div className="space-y-1.5 pt-1">
                {depotsModalFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-xs font-bold">Aucun résultat.</p>
                ) : (
                  depotsModalFiltres.map((dep) => {
                    const idD = String(dep.id);
                    const nomD = dep.nom_depot || dep.Nom_Depot || '';

                    return (
                      <div
                        key={idD}
                        onClick={() => {
                          if (enTrainDeSauvegarder) return;
                          setDepotStatFiltre(idD);
                          setEmplacementStatFiltre('TOUS');
                          setAfficherModalSelectionDepot(false);
                        }}
                        className={`border-2 rounded-xl p-3 flex justify-between items-center cursor-pointer transition shadow-xs ${isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-300 hover:bg-slate-100'}`}
                      >
                        <span className="font-black text-xs truncate uppercase">{nomD}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION D'EMPLACEMENT / LIVREUR */}
      {afficherModalSelectionEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-3 ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-slate-400 text-slate-900'}`}>
            <div className="p-3 bg-slate-600 text-white flex justify-between items-center">
              <span className="font-black text-xs uppercase">SÉLECTIONNER UN {libelleLivreurOuEmplacement}</span>
              <button disabled={enTrainDeSauvegarder} onClick={() => setAfficherModalSelectionEmp(false)} className="text-slate-200 hover:text-white font-black text-xs p-1">✕</button>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto">
              <input
                type="text"
                autoFocus
                disabled={enTrainDeSauvegarder}
                value={rechercheModalEmp}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setRechercheModalEmp(e.target.value.toUpperCase())}
                placeholder="RECHERCHER..."
                style={{ textTransform: 'uppercase' }}
                className={`w-full rounded-lg p-2.5 text-xs font-black shadow-xs uppercase ${inputBg}`}
              />

              <div className="space-y-1.5 pt-1">
                {emplacementsModalFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-xs font-bold">Aucun résultat.</p>
                ) : (
                  emplacementsModalFiltres.map((emp) => {
                    const idE = String(emp.id);
                    const nomE = emp.nom_emplacement || '';

                    return (
                      <div
                        key={idE}
                        onClick={() => {
                          if (enTrainDeSauvegarder) return;
                          setEmplacementStatFiltre(idE);
                          setAfficherModalSelectionEmp(false);
                        }}
                        className={`border-2 rounded-xl p-3 flex justify-between items-center cursor-pointer transition shadow-xs ${isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-300 hover:bg-slate-100'}`}
                      >
                        <span className="font-black text-xs truncate uppercase">{nomE}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION DE FAMILLE (CATALOGUE) */}
      {afficherModalFamilleCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-3 ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-slate-400 text-slate-900'}`}>
            <div className="p-3 bg-slate-600 text-white flex justify-between items-center">
              <span className="font-black text-xs uppercase">SÉLECTIONNER UNE FAMILLE</span>
              <button disabled={enTrainDeSauvegarder} onClick={() => setAfficherModalFamilleCat(false)} className="text-slate-200 hover:text-white font-black text-xs p-1">✕</button>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto">
              <input
                type="text"
                autoFocus
                disabled={enTrainDeSauvegarder}
                value={rechercheModalFamilleCat}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setRechercheModalFamilleCat(e.target.value.toUpperCase())}
                placeholder="RECHERCHER..."
                style={{ textTransform: 'uppercase' }}
                className={`w-full rounded-lg p-2.5 text-xs font-black shadow-xs uppercase ${inputBg}`}
              />

              <div className="space-y-1.5 pt-1">
                {famillesCatModalFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-xs font-bold">Aucun résultat.</p>
                ) : (
                  famillesCatModalFiltres.map((fam) => {
                    const idF = String(fam.id);
                    const nomF = fam.nom_famille || fam.Nom_Famille || 'Toutes';

                    return (
                      <div
                        key={idF}
                        onClick={() => {
                          if (enTrainDeSauvegarder) return;
                          setFamilleFiltre(idF);
                          setAfficherModalFamilleCat(false);
                        }}
                        className={`border-2 rounded-xl p-3 flex justify-between items-center cursor-pointer transition shadow-xs ${isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-300 hover:bg-slate-100'}`}
                      >
                        <span className="font-black text-xs truncate uppercase">{nomF}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION DE DÉPÔT / PARTENAIRE (CATALOGUE) */}
      {afficherModalDepotCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-3 ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-slate-400 text-slate-900'}`}>
            <div className="p-3 bg-slate-600 text-white flex justify-between items-center">
              <span className="font-black text-xs uppercase">SÉLECTIONNER UN {libelleDepotPartenaire}</span>
              <button disabled={enTrainDeSauvegarder} onClick={() => setAfficherModalDepotCat(false)} className="text-slate-200 hover:text-white font-black text-xs p-1">✕</button>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto">
              <input
                type="text"
                autoFocus
                disabled={enTrainDeSauvegarder}
                value={rechercheModalDepotCat}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setRechercheModalDepotCat(e.target.value.toUpperCase())}
                placeholder="RECHERCHER..."
                style={{ textTransform: 'uppercase' }}
                className={`w-full rounded-lg p-2.5 text-xs font-black shadow-xs uppercase ${inputBg}`}
              />

              <div className="space-y-1.5 pt-1">
                {depotsCatModalFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-xs font-bold">Aucun résultat.</p>
                ) : (
                  depotsCatModalFiltres.map((dep) => {
                    const idD = String(dep.id);
                    const nomD = dep.nom_depot || dep.Nom_Depot || '';

                    return (
                      <div
                        key={idD}
                        onClick={() => {
                          if (enTrainDeSauvegarder) return;
                          setDepotFiltre(idD);
                          setEmplacementFiltre('TOUS');
                          setAfficherModalDepotCat(false);
                        }}
                        className={`border-2 rounded-xl p-3 flex justify-between items-center cursor-pointer transition shadow-xs ${isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-300 hover:bg-slate-100'}`}
                      >
                        <span className="font-black text-xs truncate uppercase">{nomD}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION D'EMPLACEMENT / LIVREUR (CATALOGUE) */}
      {afficherModalEmpCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-3 ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-slate-400 text-slate-900'}`}>
            <div className="p-3 bg-slate-600 text-white flex justify-between items-center">
              <span className="font-black text-xs uppercase">SÉLECTIONNER UN {libelleLivreurOuEmplacement}</span>
              <button disabled={enTrainDeSauvegarder} onClick={() => setAfficherModalEmpCat(false)} className="text-slate-200 hover:text-white font-black text-xs p-1">✕</button>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto">
              <input
                type="text"
                autoFocus
                disabled={enTrainDeSauvegarder}
                value={rechercheModalEmpCat}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setRechercheModalEmpCat(e.target.value.toUpperCase())}
                placeholder="RECHERCHER..."
                style={{ textTransform: 'uppercase' }}
                className={`w-full rounded-lg p-2.5 text-xs font-black shadow-xs uppercase ${inputBg}`}
              />

              <div className="space-y-1.5 pt-1">
                {emplacementsCatModalFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-xs font-bold">Aucun résultat.</p>
                ) : (
                  emplacementsCatModalFiltres.map((emp) => {
                    const idE = String(emp.id);
                    const nomE = emp.nom_emplacement || '';

                    return (
                      <div
                        key={idE}
                        onClick={() => {
                          if (enTrainDeSauvegarder) return;
                          setEmplacementFiltre(idE);
                          setAfficherModalEmpCat(false);
                        }}
                        className={`border-2 rounded-xl p-3 flex justify-between items-center cursor-pointer transition shadow-xs ${isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-300 hover:bg-slate-100'}`}
                      >
                        <span className="font-black text-xs truncate uppercase">{nomE}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}