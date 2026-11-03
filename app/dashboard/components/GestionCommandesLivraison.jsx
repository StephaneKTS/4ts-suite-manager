'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { localSync } from '../../lib/localSync';

export default function GestionCommandesLivraison({ entrepriseId: propEntrepriseId = '4TS-234321' }) {
  const [entrepriseId, setEntrepriseId] = useState(propEntrepriseId);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const entParam = params.get('entreprise');
      if (entParam) {
        setEntrepriseId(entParam);
      }
    }
  }, []);

  const [commandes, setCommandes] = useState([]);
  const [lignesCommandesMap, setLignesCommandesMap] = useState({});
  const [partenaires, setPartenaires] = useState([]);
  const [articles, setArticles] = useState([]);
  const [depots, setDepots] = useState([]);
  const [emplacements, setEmplacements] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [grilleTarifaire, setGrilleTarifaire] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [caisses, setCaisses] = useState([]);
  const [cloturesEffectuees, setCloturesEffectuees] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);

  const [roleUtilisateur, setRoleUtilisateur] = useState(null);
  const [permissions, setPermissions] = useState({
    peut_creer: true,
    peut_modifier: true,
    peut_supprimer: true,
    peut_valider: true
  });

  const [stocksArticlesCache, setStocksArticlesCache] = useState({});
  const [limiteCommandes, setLimiteCommandes] = useState(20);
  const [commandesAppelees, setCommandesAppelees] = useState({});

  const [vueActive, setVueActive] = useState('LISTE');
  const [sousOngletCloture, setSousOngletCloture] = useState('nouveau');
  const [commandeEnEdition, setCommandeEnEdition] = useState(null);

  const [numeroCommande, setNumeroCommande] = useState('1');
  const [dateCommande, setDateCommande] = useState(new Date().toISOString().split('T')[0]);
  const [idPartenaire, setIdPartenaire] = useState('');
  const [depotId, setDepotId] = useState('AUCUN_DEPOT');
  const [montantSaisi, setMontantSaisi] = useState('');
  
  const inputNumeroClientRef = useRef(null);
  const inputAdresseRef = useRef(null);
  const inputMontantRef = useRef(null);

  const [pointADepart, setPointADepart] = useState('');
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [numeroClient, setNumeroClient] = useState('');
  const [natureColis, setNatureColis] = useState('');
  const [zoneGrilleSelectionnee, setZoneGrilleSelectionnee] = useState('');
  const [fraisLivraisonSaisi, setFraisLivraisonSaisi] = useState('');
  const [livreurAssigne, setLivreurAssigne] = useState('');
  const [statutCommandeSaisi, setStatutCommandeSaisi] = useState('EN ATTENTE');

  const [modalPartenaireOuverte, setModalPartenaireOuverte] = useState(false);
  const [recherchePartenaireInput, setRecherchePartenaireInput] = useState('');

  const [modalLivreurOuverte, setModalLivreurOuverte] = useState(false);
  const [rechercheLivreurInput, setRechercheLivreurInput] = useState('');

  const [modalArticleOuverte, setModalArticleOuverte] = useState(false);
  const [rechercheArticleInput, setRechercheArticleInput] = useState('');

  const [partenaireSansStockage, setPartenaireSansStockage] = useState(false);

  // --- NOUVEAUX ÉTATS POUR LA SEGMENTATION DU DOUBLE VERSEMENT ---
  const [totalVerseRecetteGlobal, setTotalVerseRecetteGlobal] = useState('');
  const [totalVerseFraisLivraison, setTotalVerseFraisLivraison] = useState('');
  const [modalCaisseClotureOuverte, setModalCaisseClotureOuverte] = useState(false);
  const [caisseSelectionneeCloture, setCaisseSelectionneeCloture] = useState('');

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

  const [filtrePartenaire, setFiltrePartenaire] = useState('');
  const [modalFiltrePartenaireOuverte, setModalFiltrePartenaireOuverte] = useState(false);
  const [rechercheFiltrePartenaireInput, setRechercheFiltrePartenaireInput] = useState('');

  const [filtreLivreur, setFiltreLivreur] = useState('');
  const [modalFiltreLivreurOuverte, setModalFiltreLivreurOuverte] = useState(false);
  const [rechercheFiltreLivreurInput, setRechercheFiltreLivreurInput] = useState('');

  const [filtreDateDebut, setFiltreDateDebut] = useState(premierJourMoisStr);
  const [filtreDateFin, setFiltreDateFin] = useState(dernierJourMoisStr);
  const [filtreStatut, setFiltreStatut] = useState('');

  const [rapportDateDebut, setRapportDateDebut] = useState(premierJourMoisStr);
  const [rapportDateFin, setRapportDateFin] = useState(dernierJourMoisStr);
  
  const [rapportLivreur, setRapportLivreur] = useState('');
  const [modalRapportLivreurOuverte, setModalRapportLivreurOuverte] = useState(false);
  const [rechercheRapportLivreurInput, setRechercheRapportLivreurInput] = useState('');

  const [rapportPartenaire, setRapportPartenaire] = useState('');
  const [modalRapportPartenaireOuverte, setModalRapportPartenaireOuverte] = useState(false);
  const [rechercheRapportPartenaireInput, setRechercheRapportPartenaireInput] = useState('');

  const [clotureDateDebut, setClotureDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [clotureDateFin, setClotureDateFin] = useState(new Date().toISOString().split('T')[0]);
  const [clotureLivreur, setClotureLivreur] = useState('');
  const [modalClotureLivreurOuverte, setModalClotureLivreurOuverte] = useState(false);
  const [rechercheClotureLivreurInput, setRechercheClotureLivreurInput] = useState('');

  const [colonneTri, setColonneTri] = useState('date');
  const [ordreTri, setOrdreTri] = useState('asc');

  const rapportRef = useRef(null);
  const [lignesSaisies, setLignesSaisies] = useState([]);
  const moduleActuel = 'LIVRAISON';

  const formaterDateCourte = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [annee, mois, jour] = dateStr.split('-');
      const dateObj = new Date(parseInt(annee), parseInt(mois) - 1, parseInt(jour));
      const options = { weekday: 'short' };
      let nomJour = dateObj.toLocaleDateString('fr-FR', options).replace('.', '').toUpperCase();
      return `${nomJour} ${jour}/${mois}/${annee}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formaterDateEnFrancais = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [annee, mois, jour] = dateStr.split('-');
      const dateObj = new Date(parseInt(annee), parseInt(mois) - 1, parseInt(jour));
      const options = { weekday: 'long' };
      let nomJour = dateObj.toLocaleDateString('fr-FR', options);
      nomJour = nomJour.charAt(0).toUpperCase() + nomJour.slice(1);
      return `${nomJour} ${jour}/${mois}/${annee}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formaterDateJJMMAAAA = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [annee, mois, jour] = dateStr.split('-');
      if (!annee || !mois || !jour) return dateStr;
      return `${jour}-${mois}-${annee}`;
    } catch (e) {
      return dateStr;
    }
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

      if (userRecord && userRecord.id_role) {
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
    } catch (err) {
      console.error('Erreur chargement des droits :', err.message);
    }
  };

  const chargerDonnees = async () => {
    setChargement(true);
    const commandesLocales = localSync.recupererDonneesLocales(`commandes_livraison_${entrepriseId}`);
    const lignesLocales = localSync.recupererDonneesLocales(`lignes_commandes_${entrepriseId}`);
    const partenairesLocaux = localSync.recupererDonneesLocales(`partenaires_livraison_${entrepriseId}`);
    const articlesLocaux = localSync.recupererDonneesLocales(`articles_livraison_${entrepriseId}`);
    const depotsLocaux = localSync.recupererDonneesLocales(`depots_livraison_${entrepriseId}`);
    const emplacementsLocaux = localSync.recupererDonneesLocales(`emplacements_livraison_${entrepriseId}`);
    const grilleLocale = localSync.recupererDonneesLocales(`grille_tarifaire_${entrepriseId}`);
    const caissesLocales = localSync.recupererDonneesLocales(`caisses_${entrepriseId}_${moduleActuel}`);
    const cloturesLocales = localSync.recupererDonneesLocales(`clotures_livraison_${entrepriseId}`);

    if (commandesLocales && commandesLocales.length > 0) setCommandes(commandesLocales);
    if (lignesLocales) setLignesCommandesMap(lignesLocales);
    if (partenairesLocaux && partenairesLocaux.length > 0) setPartenaires(partenairesLocaux);
    if (articlesLocaux && articlesLocaux.length > 0) setArticles(articlesLocaux);
    if (depotsLocaux && depotsLocaux.length > 0) setDepots(depotsLocaux);
    if (emplacementsLocaux && emplacementsLocaux.length > 0) setEmplacements(emplacementsLocaux);
    if (grilleLocale && grilleLocale.length > 0) setGrilleTarifaire(grilleLocale);
    if (caissesLocales && caissesLocales.length > 0) setCaisses(caissesLocales);
    if (cloturesLocales && cloturesLocales.length > 0) setCloturesEffectuees(cloturesLocales);

    try {
      await chargerDroitsUtilisateur();

      const [resCmd, resLignesAll, resPart, resArt, resDep, resEmp, resUser, resTarif, resMouv, resAppro, resCaisses, resClotures] = await Promise.all([
        supabase.from('commandes_livraison_en_tete').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel).order('created_at', { ascending: false }),
        supabase.from('commandes_livraison_lignes').select('*'),
        supabase.from('fournisseurs').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('articles_stock').select('*').eq('id_entreprise', entrepriseId).order('created_at', { ascending: false }),
        supabase.from('depots_stock').select('*').eq('id_entreprise', entrepriseId),
        supabase.from('emplacements_stock').select('*').eq('id_entreprise', entrepriseId),
        supabase.from('utilisateurs').select('*').eq('id_entreprise', entrepriseId),
        supabase.from('grille_tarifaire_livraison').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('mouvements_stock').select('*').eq('id_entreprise', entrepriseId),
        supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId),
        supabase.from('caisses').select('*').eq('id_entreprise', entrepriseId),
        supabase.from('clotures_caisses').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel).order('created_at', { ascending: false })
      ]);

      const commandesData = resCmd.data || [];
      setCommandes(commandesData);
      localSync.sauvegarderDonneesLocales(`commandes_livraison_${entrepriseId}`, commandesData);

      const mapLignes = {};
      if (resLignesAll.data) {
        resLignesAll.data.forEach(l => {
          if (!mapLignes[l.id_commande]) {
            mapLignes[l.id_commande] = [];
          }
          mapLignes[l.id_commande].push(l);
        });
      }
      setLignesCommandesMap(mapLignes);
      localSync.sauvegarderDonneesLocales(`lignes_commandes_${entrepriseId}`, mapLignes);

      if (resPart.data) {
        setPartenaires(resPart.data);
        localSync.sauvegarderDonneesLocales(`partenaires_livraison_${entrepriseId}`, resPart.data);
      }
      if (resArt.data) {
        setArticles(resArt.data);
        localSync.sauvegarderDonneesLocales(`articles_livraison_${entrepriseId}`, resArt.data);
      }
      if (resDep.data) {
        setDepots(resDep.data);
        localSync.sauvegarderDonneesLocales(`depots_livraison_${entrepriseId}`, resDep.data);
      }
      if (resEmp.data) {
        setEmplacements(resEmp.data);
        localSync.sauvegarderDonneesLocales(`emplacements_livraison_${entrepriseId}`, resEmp.data);
      }
      if (resUser.data) setUtilisateurs(resUser.data);
      if (resTarif.data) {
        setGrilleTarifaire(resTarif.data);
        localSync.sauvegarderDonneesLocales(`grille_tarifaire_${entrepriseId}`, resTarif.data);
      }
      if (resMouv.data) setMouvements(resMouv.data);
      if (resAppro.data) setApprovisionnements(resAppro.data);
      if (resCaisses.data) {
        setCaisses(resCaisses.data);
        localSync.sauvegarderDonneesLocales(`caisses_${entrepriseId}_${moduleActuel}`, resCaisses.data);
      }
      if (resClotures.data) {
        setCloturesEffectuees(resClotures.data);
        localSync.sauvegarderDonneesLocales(`clotures_livraison_${entrepriseId}`, resClotures.data);
      }

      setStocksArticlesCache({});
      calculerNumeroAutomatique(commandesData, idPartenaire, dateCommande);

    } catch (err) {
      console.error('Erreur chargement données livraison :', err.message);
    } finally {
      setChargement(false);
    }
  };

  const calculerNumeroAutomatique = (listeCmds, partId, dateCible) => {
    if (!partId) {
      setNumeroCommande('1');
      return;
    }
    const cmdsJourPart = listeCmds.filter(c => 
      String(c.id_partenaire) === String(partId) && 
      c.date_commande === dateCible &&
      (!commandeEnEdition || c.id !== commandeEnEdition.id)
    );

    let maxNum = 0;
    cmdsJourPart.forEach(c => {
      if (c.numero_commande) {
        const netNum = c.numero_commande.replace('CMD-', '');
        const parsed = parseInt(netNum, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    });

    setNumeroCommande(String(maxNum + 1));
  };

  useEffect(() => {
    if (entrepriseId) {
      chargerDonnees();
      localSync.synchroniserVersCloud(supabase);
    }
  }, [entrepriseId]);

  const calculerStockReelDirect = (articleId, depotCible = 'TOUS', emplacementCible = 'TOUS') => {
    if (emplacementCible && emplacementCible !== 'TOUS') {
      let stockEmp = 0;
      mouvements.forEach(m => {
        if (String(m.id_article) !== String(articleId)) return;

        if (depotCible && depotCible !== 'TOUS' && depotCible !== 'AUCUN_DEPOT') {
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

    if (depotCible && depotCible !== 'TOUS' && depotCible !== 'AUCUN_DEPOT') {
      let stockDepot = 0;
      mouvements.forEach(m => {
        if (String(m.id_article) !== String(articleId)) return;
        const qte = parseInt(m.quantite || 0);
        const typeMvt = (m.type_mouvement || '').toUpperCase();

        const depSource = String(m.id_depot_source || '');
        const depDest = String(m.id_depot_destination || '');

        const matchSource = depSource === String(depotCible);
        const matchDest = depDest === String(depotCible);

        if (matchSource && matchDest) return;

        if (typeMvt === 'INVENTAIRE' && matchSource) {
          stockDepot = qte;
          return;
        }
        if (matchDest) stockDepot += qte;
        if (matchSource) stockDepot -= qte;
      });

      approvisionnements.forEach(app => {
        const depApp = String(app.id_depot_destination || app.id_depot || '');
        if (depApp !== String(depotCible)) return;

        let listArt = [];
        if (typeof app.details_articles === 'string') {
          try { listArt = JSON.parse(app.details_articles); } catch (e) {}
        } else if (Array.isArray(app.details_articles)) {
          listArt = app.details_articles;
        }
        listArt.forEach(item => {
          if (String(item.id_article || item.article_id) === String(articleId)) {
            stockDepot += parseInt(item.quantite || 0);
          }
        });
      });

      return Math.max(0, stockDepot);
    }

    let totalEntrees = 0;
    let totalSorties = 0;

    mouvements.forEach(m => {
      if (String(m.id_article) !== String(articleId)) return;
      const qte = parseInt(m.quantite || 0);
      const typeMvt = (m.type_mouvement || '').toUpperCase();

      if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') totalEntrees += qte;
      else if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') totalSorties += qte;
    });

    approvisionnements.forEach(app => {
      let listArt = [];
      if (typeof app.details_articles === 'string') {
        try { listArt = JSON.parse(app.details_articles); } catch (e) {}
      } else if (Array.isArray(app.details_articles)) {
        listArt = app.details_articles;
      }
      listArt.forEach(item => {
        if (String(item.id_article || item.article_id) === String(articleId)) {
          totalEntrees += parseInt(item.quantite || 0);
        }
      });
    });

    return Math.max(0, totalEntrees - totalSorties);
  };

  const recupererStockReelRPC = async (articleId) => {
    let emplacementCible = null;

    if (livreurAssigne.trim() !== '') {
      const nomLivreurSaisi = livreurAssigne.trim().toUpperCase();

      let empTrouve = emplacements.find(e => {
        if (String(e.id_entreprise || '').trim() !== String(entrepriseId || '').trim()) return false;
        const nomEmp = (e.nom_emplacement || e.libelle || e.nom || '').trim().toUpperCase();
        const respEmp = (e.responsable_emplacement || '').trim().toUpperCase();
        return nomEmp === nomLivreurSaisi || respEmp === nomLivreurSaisi || nomEmp.includes(nomLivreurSaisi) || livreurAssigne.includes(nomEmp);
      });

      if (!empTrouve) {
        const userTrouve = utilisateurs.find(u => {
          if (String(u.id_entreprise || '').trim() !== String(entrepriseId || '').trim()) return false;
          let nomU = (u.nom_complet || u.nom_utilisateur || u.nom || u.prenom || u.name || '').trim().toUpperCase();
          if (!nomU && u.email) nomU = u.email.split('@')[0].toUpperCase();
          return nomU === nomLivreurSaisi || nomU.includes(nomLivreurSaisi);
        });

        if (userTrouve) {
          empTrouve = emplacements.find(e => 
            String(e.id_entreprise || '').trim() === String(entrepriseId || '').trim() &&
            (String(e.responsable_id || '') === String(userTrouve.id) ||
             String(e.id_utilisateur || '') === String(userTrouve.id) ||
             String(e.utilisateur_id || '') === String(userTrouve.id))
          );
        }
      }

      if (empTrouve) {
        emplacementCible = empTrouve.id;
      } else {
        emplacementCible = 'AUCUN_EMPLACEMENT';
      }
    }

    const cacheKey = `${articleId}_${depotId}_${emplacementCible || 'none'}`;
    if (stocksArticlesCache[cacheKey] !== undefined) {
      return stocksArticlesCache[cacheKey];
    }

    const stockLocal = calculerStockReelDirect(articleId, depotId, emplacementCible === 'AUCUN_EMPLACEMENT' ? null : emplacementCible);
    if (stockLocal > 0 || emplacementCible === 'AUCUN_EMPLACEMENT') {
      setStocksArticlesCache(prev => ({ ...prev, [cacheKey]: stockLocal }));
      return stockLocal;
    }

    try {
      const { data, error } = await supabase.rpc('calculer_stock_reel', {
        p_article_id: parseInt(articleId),
        p_entreprise_id: entrepriseId,
        p_depot_id: depotId || 'AUCUN_DEPOT',
        p_emplacement_id: emplacementCible === 'AUCUN_EMPLACEMENT' ? null : emplacementCible
      });

      if (!error && data !== null) {
        const stockVal = parseInt(data, 10);
        setStocksArticlesCache(prev => ({ ...prev, [cacheKey]: stockVal }));
        return stockVal;
      }
    } catch (err) {
      console.error('Erreur RPC stock :', err.message);
    }

    return stockLocal;
  };

  const handleChangementPartenaire = (partenaireId) => {
    setIdPartenaire(partenaireId);
    if (!commandeEnEdition) setLignesSaisies([]);
    setStocksArticlesCache({});

    calculerNumeroAutomatique(commandes, partenaireId, dateCommande);

    if (!partenaireId) {
      setDepotId('AUCUN_DEPOT');
      setPartenaireSansStockage(false);
      return;
    }

    const partObj = partenaires.find(p => String(p.id) === String(partenaireId));
    if (partObj) {
      const statutStock = (partObj.statut_stockage || partObj.statut || '').toString().trim().toUpperCase();
      const sansStock = statutStock === 'SANS_STOCKAGE';
      
      setPartenaireSansStockage(Boolean(sansStock));

      if (sansStock && partObj.adresse) {
        setPointADepart(partObj.adresse);
      }

      if (partObj.id_depot) {
        setDepotId(partObj.id_depot);
      } else {
        const nomPart = (partObj.nom_fournisseur || partObj.nom || '').trim().toUpperCase();
        const depotTrouve = depots.find(d => {
          const nomDepot = (d.nom_depot || d.nom || d.libelle || '').trim().toUpperCase();
          return nomDepot === nomPart || nomDepot.includes(nomPart) || nomPart.includes(nomDepot);
        });

        if (depotTrouve) {
          setDepotId(depotTrouve.id);
        } else if (depots.length === 1) {
          setDepotId(depots[0].id);
        } else {
          setDepotId('AUCUN_DEPOT');
        }
      }
    } else {
      setDepotId('AUCUN_DEPOT');
      setPartenaireSansStockage(false);
    }

    setTimeout(() => {
      if (inputNumeroClientRef.current) {
        inputNumeroClientRef.current.focus();
        inputNumeroClientRef.current.select();
      }
    }, 50);
  };

  const handleChangementDate = (nouvelleDate) => {
    setDateCommande(nouvelleDate);
    calculerNumeroAutomatique(commandes, idPartenaire, nouvelleDate);
  };

  const handleChangementAdresse = (valeur) => {
    setAdresseLivraison(valeur);
    const zoneCorrespondante = grilleTarifaire.find(
      t => (t.nom_zone || '').trim().toUpperCase() === valeur.trim().toUpperCase()
    );
    if (zoneCorrespondante) {
      setZoneGrilleSelectionnee(zoneCorrespondante.nom_zone);
      setFraisLivraisonSaisi(String(zoneCorrespondante.frais));
    }
  };

  const listeLivreursUniques = () => {
    const setLivreurs = new Set();
    
    utilisateurs
      .filter(u => String(u.id_entreprise || '').trim() === String(entrepriseId || '').trim())
      .forEach(u => {
        let nom = (u.nom_complet || u.nom_utilisateur || u.nom || u.prenom || u.name || '').trim().toUpperCase();
        if (!nom && u.email) nom = u.email.split('@')[0].toUpperCase();
        if (nom) setLivreurs.add(nom);
      });

    emplacements
      .filter(e => String(e.id_entreprise || '').trim() === String(entrepriseId || '').trim())
      .forEach(e => {
        let nomEmp = (e.nom_emplacement || e.responsable_emplacement || '').trim().toUpperCase();
        if (nomEmp) setLivreurs.add(nomEmp);
      });

    return Array.from(setLivreurs).sort();
  };

  const partenairesFiltres = partenaires.filter(p => {
    const nom = (p.nom_fournisseur || p.nom || '').toLowerCase();
    return nom.includes(recherchePartenaireInput.toLowerCase());
  });

  const filtrePartenairesFiltres = partenaires.filter(p => {
    const nom = (p.nom_fournisseur || p.nom || '').toLowerCase();
    return nom.includes(rechercheFiltrePartenaireInput.toLowerCase());
  });

  const rapportPartenairesFiltres = partenaires.filter(p => {
    const nom = (p.nom_fournisseur || p.nom || '').toLowerCase();
    return nom.includes(rechercheRapportPartenaireInput.toLowerCase());
  });

  const livreursFiltres = listeLivreursUniques().filter(l => l.toLowerCase().includes(rechercheLivreurInput.toLowerCase()));
  const filtreLivreursFiltres = listeLivreursUniques().filter(l => l.toLowerCase().includes(rechercheFiltreLivreurInput.toLowerCase()));
  const rapportLivreursFiltres = listeLivreursUniques().filter(l => l.toLowerCase().includes(rechercheRapportLivreurInput.toLowerCase()));
  const clotureLivreursFiltres = listeLivreursUniques().filter(l => l.toLowerCase().includes(rechercheClotureLivreurInput.toLowerCase()));

  const articlesFiltres = articles.filter((a) => {
    const designation = (a.Designation || a.designation || a.nom || '').toUpperCase();
    return designation.includes(rechercheArticleInput.toUpperCase());
  });

  const enteteValide = partenaireSansStockage 
    ? (idPartenaire && numeroClient.trim().length === 9 && numeroCommande.trim() !== '' && montantSaisi !== '' && pointADepart.trim() !== '' && adresseLivraison.trim() !== '')
    : (idPartenaire && numeroClient.trim().length === 9 && numeroCommande.trim() !== '' && montantSaisi !== '' && adresseLivraison.trim() !== '');

  const ajouterArticleAuPanier = async (artObj) => {
    if (!numeroClient.trim() || numeroClient.trim().length !== 9) {
      alert('⚠️ Veuillez saisir un numéro de client valide à exactement 9 chiffres.');
      if (inputNumeroClientRef.current) {
        inputNumeroClientRef.current.focus();
        inputNumeroClientRef.current.select();
      }
      return;
    }

    if (!enteteValide) {
      alert('⚠️ Veuillez d\'abord remplir tous les champs obligatoires (Partenaire, N° Client à 9 chiffres, N° CMD, Montant, Point A et Point B) avant d\'ajouter des articles.');
      return;
    }

    const idArt = artObj.id_article || artObj.id;
    const stockDisp = await recupererStockReelRPC(idArt);

    if (stockDisp <= 0) {
      alert(`❌ Cet article est épuisé ou indisponible.`);
      return;
    }

    const designation = (artObj.Designation || artObj.designation || artObj.nom || '').toUpperCase();
    const prixVente = Number(artObj.P_V || artObj.prix_vente || artObj.prix_unitaire || artObj.prix || 0);

    const ligneExistante = lignesSaisies.find(l => String(l.id_article) === String(idArt));
    if (ligneExistante) {
      if (ligneExistante.quantite + 1 > stockDisp) {
        alert(`❌ Quantité supérieure au stock disponible (${stockDisp}) !`);
        return;
      }
      setLignesSaisies(lignesSaisies.map(l => 
        String(l.id_article) === String(idArt) 
          ? { ...l, quantite: l.quantite + 1 }
          : l
      ));
    } else {
      setLignesSaisies([
        ...lignesSaisies,
        {
          id_article: idArt,
          designation,
          quantite: 1,
          prix_unitaire: prixVente,
          stock_dispo: stockDisp
        }
      ]);
    }
  };

  const modifierQuantiteLigne = async (index, delta) => {
    const nouvellesLignes = [...lignesSaisies];
    const nouvelleQte = nouvellesLignes[index].quantite + delta;
    if (nouvelleQte <= 0) {
      setLignesSaisies(nouvellesLignes.filter((_, i) => i !== index));
    } else {
      const artId = nouvellesLignes[index].id_article;
      const stockDisp = await recupererStockReelRPC(artId);
      if (nouvelleQte > stockDisp) {
        alert(`❌ Quantité supérieure au stock disponible (${stockDisp}) !`);
        return;
      }
      nouvellesLignes[index].quantite = nouvelleQte;
      setLignesSaisies(nouvellesLignes);
    }
  };

  const supprimerLignePanier = (index) => {
    setLignesSaisies(lignesSaisies.filter((_, i) => i !== index));
  };

  const napGlobal = parseFloat(montantSaisi) || 0;

  const ouvrirCommandePourModification = async (cmd) => {
    setCommandeEnEdition(cmd);
    setNumeroCommande(cmd.numero_commande ? cmd.numero_commande.replace('CMD-', '') : '1');
    setDateCommande(cmd.date_commande || new Date().toISOString().split('T')[0]);
    setIdPartenaire(cmd.id_partenaire || '');
    setMontantSaisi(cmd.montant_commande !== undefined && cmd.montant_commande !== null ? String(cmd.montant_commande) : '0');
    setPointADepart(cmd.point_a || '');
    setAdresseLivraison(cmd.adresse_livraison || '');
    setNumeroClient(cmd.numero_client || '');
    setNatureColis(cmd.nature_colis || '');
    setZoneGrilleSelectionnee(cmd.zone_effective_livraison || cmd.adresse_livraison || '');
    setFraisLivraisonSaisi(cmd.frais_livraison !== undefined && cmd.frais_livraison !== null ? String(cmd.frais_livraison) : '');
    setLivreurAssigne(cmd.vendeur_livreur || '');
    setStatutCommandeSaisi(cmd.statut || cmd.statut_commande || 'EN ATTENTE');
    setStocksArticlesCache({});
    
    if (cmd.id_partenaire) {
      handleChangementPartenaire(cmd.id_partenaire);
    }

    try {
      const { data: lignesData, error } = await supabase
        .from('commandes_livraison_lignes')
        .select('*')
        .eq('id_commande', cmd.id);

      if (!error && lignesData) {
        setLignesSaisies(lignesData.map(l => ({
          id_article: l.id_article,
          designation: l.designation,
          quantite: l.quantite,
          prix_unitaire: l.prix_unitaire
        })));
      } else {
        setLignesSaisies([]);
      }
    } catch (err) {
      console.error('Erreur chargement lignes commande :', err);
      setLignesSaisies([]);
    }

    setVueActive('CREATION');
  };

  const supprimerCommandeActuelle = async () => {
    if (!commandeEnEdition || sauvegardeEnCours) return;
    if (!permissions.peut_supprimer) {
      alert('⛔ Accès refusé : Votre profil ne dispose pas des droits de suppression.');
      return;
    }
    if (!confirm(`Voulez-vous vraiment supprimer la commande ${commandeEnEdition.numero_commande} ?`)) return;

    setSauvegardeEnCours(true);
    try {
      const { error: errLignes } = await supabase.from('commandes_livraison_lignes').delete().eq('id_commande', commandeEnEdition.id);
      if (errLignes) {
        localSync.ajouterFileAttente('DELETE', 'commandes_livraison_lignes', { id_commande: commandeEnEdition.id });
      }
      
      const { error } = await supabase.from('commandes_livraison_en_tete').delete().eq('id', commandeEnEdition.id);
      if (error) {
        localSync.ajouterFileAttente('DELETE', 'commandes_livraison_en_tete', { id: commandeEnEdition.id });
      }

      alert('Commande supprimée avec succès.');
      setNumeroCommande('1');
      setIdPartenaire('');
      setDepotId('AUCUN_DEPOT');
      setPartenaireSansStockage(false);
      setPointADepart('');
      setNumeroClient('');
      setNatureColis('');
      setLignesSaisies([]);
      setMontantSaisi('');
      setAdresseLivraison('');
      setZoneGrilleSelectionnee('');
      setFraisLivraisonSaisi('');
      setLivreurAssigne('');
      setStatutCommandeSaisi('EN ATTENTE');
      setCommandeEnEdition(null);
      setStocksArticlesCache({});
      setVueActive('LISTE');
      chargerDonnees();
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const sauvegarderCommande = async (e) => {
    if (e) e.preventDefault();
    if (sauvegardeEnCours) return;
    
    if (commandeEnEdition && !permissions.peut_modifier) {
      alert('⛔ Accès refusé : Votre profil ne dispose pas des droits de modification.');
      return;
    }
    if (!commandeEnEdition && !permissions.peut_creer) {
      alert('⛔ Accès refusé : Votre profil ne dispose pas des droits de création.');
      return;
    }

    if (!numeroClient.trim() || numeroClient.trim().length !== 9) {
      alert('⚠️ Le numéro du client est obligatoire et doit comporter exactement 9 caractères.');
      if (inputNumeroClientRef.current) {
        inputNumeroClientRef.current.focus();
        inputNumeroClientRef.current.select();
      }
      return;
    }

    if (!numeroCommande.trim() || !idPartenaire || montantSaisi === '' || !adresseLivraison.trim()) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires (Partenaire, N° Client, N° CMD, Montant et Adresse).');
      return;
    }

    if (partenaireSansStockage && !pointADepart.trim()) {
      alert('⚠️ Pour un partenaire sans stockage, veuillez préciser le Point A (point de départ).');
      return;
    }
    
    if (!partenaireSansStockage && lignesSaisies.length === 0) {
      alert('⚠️ Le panier est vide. Veuillez ajouter au moins un article.');
      return;
    }

    setSauvegardeEnCours(true);
    try {
      const numeroComplet = `CMD-${numeroCommande.trim().toUpperCase()}`;

      let dateNormalisee = dateCommande;
      if (dateNormalisee.includes('/')) {
        const parts = dateNormalisee.split('/');
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            dateNormalisee = `${parts[2]}-${parts[1]}-${parts[0]}`;
          } else if (parts[0].length === 4) {
            dateNormalisee = `${parts[0]}-${parts[1]}-${parts[2]}`;
          }
        }
      }

      if (!commandeEnEdition) {
        const doublonTrouve = commandes.find(c => 
          c.numero_commande === numeroComplet &&
          c.date_commande === dateNormalisee &&
          String(c.id_partenaire) === String(idPartenaire)
        );

        if (doublonTrouve) {
          alert(`❌ Cette commande (${numeroComplet}) a déjà été créée pour ce partenaire à la date du ${formaterDateEnFrancais(dateNormalisee)}. Impossible de la dupliquer.`);
          setSauvegardeEnCours(false);
          return;
        }
      }

      let empIdTrouve = null;
      if (livreurAssigne.trim() !== '') {
        const nomLivreurSaisi = livreurAssigne.trim().toUpperCase();
        let empObj = emplacements.find(e => {
          if (String(e.id_entreprise || '').trim() !== String(entrepriseId || '').trim()) return false;
          const nomEmp = (e.nom_emplacement || e.libelle || e.nom || '').trim().toUpperCase();
          const respEmp = (e.responsable_emplacement || '').trim().toUpperCase();
          return nomEmp === nomLivreurSaisi || respEmp === nomLivreurSaisi || nomEmp.includes(nomLivreurSaisi) || livreurAssigne.includes(nomEmp);
        });

        if (!empObj) {
          const userObj = utilisateurs.find(u => {
            if (String(u.id_entreprise || '').trim() !== String(entrepriseId || '').trim()) return false;
            let nomU = (u.nom_complet || u.nom_utilisateur || u.nom || u.prenom || u.name || '').trim().toUpperCase();
            if (!nomU && u.email) nomU = u.email.split('@')[0].toUpperCase();
            return nomU === nomLivreurSaisi || nomU.includes(nomLivreurSaisi);
          });
          if (userObj) {
            empObj = emplacements.find(e => 
              String(e.id_entreprise || '').trim() === String(entrepriseId || '').trim() &&
              (String(e.responsable_id || '') === String(userObj.id) || 
               String(e.id_utilisateur || '') === String(userObj.id) ||
               String(e.utilisateur_id || '') === String(userObj.id))
            );
          }
        }
        if (empObj) empIdTrouve = empObj.id;
      }

      const statutNormVerif = (statutCommandeSaisi || '').trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const estLivreVerif = statutNormVerif === 'LIVRE' || statutNormVerif === 'LIVRÉ';

      if (!partenaireSansStockage && estLivreVerif) {
        for (const item of lignesSaisies) {
          const stockEmp = await recupererStockReelRPC(item.id_article);
          if (stockEmp < item.quantite) {
            alert(
              `🚫 ACTION BLOQUÉE (RUPTURE DE STOCK) :\n\nStock insuffisant pour l'article "${item.designation}".\n(Stock disponible : ${stockEmp} | Quantité commandée : ${item.quantite})`
            );
            setSauvegardeEnCours(false);
            return;
          }
        }
      }

      const partObj = partenaires.find(p => String(p.id) === String(idPartenaire));

      let payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        numero_commande: numeroComplet,
        date_commande: dateNormalisee,
        id_partenaire: idPartenaire,
        nom_partenaire: partObj ? (partObj.nom_fournisseur || partObj.nom) : '',
        montant_commande: napGlobal,
        point_a: partenaireSansStockage ? pointADepart : null,
        adresse_livraison: adresseLivraison,
        numero_client: numeroClient.trim(),
        nature_colis: partenaireSansStockage ? natureColis : null,
        zone_effective_livraison: zoneGrilleSelectionnee || adresseLivraison,
        frais_livraison: parseFloat(fraisLivraisonSaisi) || 0,
        vendeur_livreur: livreurAssigne,
        statut: statutCommandeSaisi,
        statut_commande: statutCommandeSaisi,
      };

      let idCmdCourante = null;

      if (commandeEnEdition) {
        const statutPrecBrut = commandeEnEdition.statut || commandeEnEdition.statut_commande || 'EN ATTENTE';
        const statutPrecedentNorm = (statutPrecBrut || '').trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const etaitDejaLivre = statutPrecedentNorm === 'LIVRE' || statutPrecedentNorm === 'LIVRÉ';
        idCmdCourante = commandeEnEdition.id;

        const { error: errUp } = await supabase
          .from('commandes_livraison_en_tete')
          .update(payload)
          .eq('id', commandeEnEdition.id);

        if (errUp) throw errUp;

        const { error: errDel } = await supabase.from('commandes_livraison_lignes').delete().eq('id_commande', commandeEnEdition.id);
        if (errDel) throw errDel;

        if (!partenaireSansStockage && estLivreVerif && !etaitDejaLivre) {
          for (const item of lignesSaisies) {
            const payloadMouvement = {
              id_entreprise: entrepriseId,
              module: moduleActuel,
              type_mouvement: 'SORTIE',
              id_depot_source: depotId !== 'AUCUN_DEPOT' ? depotId : null,
              id_emplacement_source: empIdTrouve,
              id_depot_destination: null,
              id_article: parseInt(item.id_article),
              quantite: item.quantite,
              motif_remarque: `LIVRAISON EFFECTIVE ${numeroComplet} (${partObj ? (partObj.nom_fournisseur || partObj.nom) : ''})`,
            };
            const { error: errMvt } = await supabase.from('mouvements_stock').insert([payloadMouvement]);
            if (errMvt) console.error("Erreur mouvement:", errMvt.message);
          }
        }

      } else {
        const { data: cmdInseree, error: errCmd } = await supabase
          .from('commandes_livraison_en_tete')
          .insert([payload])
          .select()
          .single();

        if (errCmd) throw errCmd;
        if (cmdInseree) {
          idCmdCourante = cmdInseree.id;
        }

        if (!partenaireSansStockage && estLivreVerif) {
          for (const item of lignesSaisies) {
            const payloadMouvement = {
              id_entreprise: entrepriseId,
              module: moduleActuel,
              type_mouvement: 'SORTIE',
              id_depot_source: depotId !== 'AUCUN_DEPOT' ? depotId : null,
              id_emplacement_source: empIdTrouve,
              id_depot_destination: null,
              id_article: parseInt(item.id_article),
              quantite: item.quantite,
              motif_remarque: `LIVRAISON EFFECTIVE ${numeroComplet} (${partObj ? (partObj.nom_fournisseur || partObj.nom) : ''})`,
            };
            const { error: errMvt } = await supabase.from('mouvements_stock').insert([payloadMouvement]);
            if (errMvt) console.error("Erreur mouvement:", errMvt.message);
          }
        }
      }

      if (!partenaireSansStockage && lignesSaisies.length > 0 && idCmdCourante) {
        const payloadLignes = lignesSaisies.map(l => ({
          id_commande: idCmdCourante,
          id_article: l.id_article,
          designation: l.designation,
          quantite: l.quantite,
          prix_unitaire: l.prix_unitaire,
        }));

        const { error: errLignes } = await supabase
          .from('commandes_livraison_lignes')
          .insert(payloadLignes);

        if (errLignes) throw errLignes;
      }

      const [anneeCmd, moisCmd] = dateNormalisee.split('-');
      const premierJourCmd = `${anneeCmd}-${moisCmd}-01`;
      const dernierJourCmd = new Date(parseInt(anneeCmd), parseInt(moisCmd), 0).toISOString().split('T')[0];
      
      setFiltreDateDebut(premierJourCmd);
      setFiltreDateFin(dernierJourCmd);
      setFiltreStatut('');

      alert(commandeEnEdition ? 'Commande mise à jour avec succès !' : 'Commande enregistrée avec succès !');
      setNumeroCommande('1');
      setIdPartenaire('');
      setDepotId('AUCUN_DEPOT');
      setPartenaireSansStockage(false);
      setPointADepart('');
      setNumeroClient('');
      setNatureColis('');
      setLignesSaisies([]);
      setMontantSaisi('');
      setAdresseLivraison('');
      setZoneGrilleSelectionnee('');
      setFraisLivraisonSaisi('');
      setLivreurAssigne('');
      setStatutCommandeSaisi('EN ATTENTE');
      setCommandeEnEdition(null);
      setStocksArticlesCache({});
      setVueActive('LISTE');
      await chargerDonnees();
    } catch (err) {
      alert('Erreur technique : ' + (err.message || err));
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const commandesFiltrees = commandes.filter((cmd) => {
    let matchPartenaire = true;
    let matchLivreur = true;
    let matchDate = true;
    let matchStatut = true;

    if (filtrePartenaire) {
      matchPartenaire = String(cmd.id_partenaire) === String(filtrePartenaire);
    }
    if (filtreLivreur) {
      matchLivreur = (cmd.vendeur_livreur || '').trim().toUpperCase() === filtreLivreur.trim().toUpperCase();
    }
    if (filtreDateDebut && filtreDateFin) {
      matchDate = cmd.date_commande >= filtreDateDebut && cmd.date_commande <= filtreDateFin;
    } else if (filtreDateDebut) {
      matchDate = cmd.date_commande >= filtreDateDebut;
    } else if (filtreDateFin) {
      matchDate = cmd.date_commande <= filtreDateFin;
    }
    if (filtreStatut) {
      const statutCMDReel = (cmd.statut || cmd.statut_commande || 'EN ATTENTE').trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const filtreStatutNorm = filtreStatut.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      matchStatut = statutCMDReel === filtreStatutNorm;
    }

    return matchPartenaire && matchLivreur && matchDate && matchStatut;
  }).sort((a, b) => {
    const partA = (a.nom_partenaire || '').toUpperCase();
    const partB = (b.nom_partenaire || '').toUpperCase();
    if (partA !== partB) {
      return partA.localeCompare(partB);
    }

    const extraireNumero = (numStr) => {
      if (!numStr) return 0;
      const match = numStr.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const numA = extraireNumero(a.numero_commande);
    const numB = extraireNumero(b.numero_commande);
    return numA - numB;
  });

  const commandesAffichees = commandesFiltrees.slice(0, limiteCommandes);

  const commandesRapport = commandes.filter((cmd) => {
    const statutBrut = cmd.statut || cmd.statut_commande || '';
    const statutCmd = (statutBrut).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (statutCmd !== 'LIVRE') return false;

    let matchIntervalle = true;
    let matchLivreur = true;
    let matchPartenaire = true;

    if (rapportDateDebut && rapportDateFin) {
      matchIntervalle = cmd.date_commande >= rapportDateDebut && cmd.date_commande <= rapportDateFin;
    } else if (rapportDateDebut) {
      matchIntervalle = cmd.date_commande >= rapportDateDebut;
    } else if (rapportDateFin) {
      matchIntervalle = cmd.date_commande <= rapportDateFin;
    }

    if (rapportLivreur) {
      matchLivreur = (cmd.vendeur_livreur || '').trim().toUpperCase() === rapportLivreur.trim().toUpperCase();
    }
    if (rapportPartenaire) {
      matchPartenaire = String(cmd.id_partenaire) === String(rapportPartenaire);
    }

    return matchIntervalle && matchLivreur && matchPartenaire;
  });

  const commandesCloture = commandes.filter((cmd) => {
    const statutBrut = cmd.statut || cmd.statut_commande || '';
    const statutCmd = (statutBrut).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (statutCmd !== 'LIVRE') return false;

    let matchIntervalle = true;
    let matchLivreur = true;

    let dateCmdStr = (cmd.date_commande || '').split('T')[0];
    if (dateCmdStr.includes('/')) {
      const p = dateCmdStr.split('/');
      if (p.length === 3) dateCmdStr = `${p[2]}-${p[1]}-${p[0]}`;
    }

    if (clotureDateDebut && clotureDateFin) {
      matchIntervalle = dateCmdStr >= clotureDateDebut && dateCmdStr <= clotureDateFin;
    } else if (clotureDateDebut) {
      matchIntervalle = dateCmdStr >= clotureDateDebut;
    } else if (clotureDateFin) {
      matchIntervalle = dateCmdStr <= clotureDateFin;
    }

    if (clotureLivreur) {
      const livreurCmd = (cmd.vendeur_livreur || '').trim().toUpperCase();
      const livreurFiltre = clotureLivreur.trim().toUpperCase();
      matchLivreur = livreurCmd === livreurFiltre || livreurCmd.includes(livreurFiltre) || livreurFiltre.includes(livreurCmd);
    }

    if (!matchIntervalle || !matchLivreur) return false;

    const dejaCloturee = cloturesEffectuees.some(cl => {
      const livCloture = (cl.caissier || '').trim().toUpperCase();
      const cmdLivreur = (cmd.vendeur_livreur || '').trim().toUpperCase();
      
      if (livCloture && cmdLivreur && livCloture !== 'TOUS' && livCloture !== cmdLivreur) return false;

      const dateDebutCl = cl.date_debut || cl.created_at?.split('T')[0];
      const dateFinCl = cl.date_fin || dateDebutCl;
      if (dateDebutCl && dateFinCl) {
        const dansIntervalle = dateCmdStr >= dateDebutCl && dateCmdStr <= dateFinCl;
        if (!dansIntervalle) return false;

        if (cmd.created_at && cl.created_at) {
          return new Date(cmd.created_at) <= new Date(cl.created_at);
        }
        return true;
      }
      return false;
    });

    return !dejaCloturee;
  });

  const resumeClotureParLivreur = {};
  commandesCloture.forEach(cmd => {
    const livreurNom = (cmd.vendeur_livreur || 'NON ASSIGNÉ').trim().toUpperCase();
    if (!resumeClotureParLivreur[livreurNom]) {
      resumeClotureParLivreur[livreurNom] = {
        nom: livreurNom,
        nombreCommandes: 0,
        montantTotalEncaisse: 0,
        totalFraisLivraison: 0,
      };
    }
    resumeClotureParLivreur[livreurNom].nombreCommandes += 1;
    resumeClotureParLivreur[livreurNom].montantTotalEncaisse += Number(cmd.montant_commande || 0);
    resumeClotureParLivreur[livreurNom].totalFraisLivraison += Number(cmd.frais_livraison || 0);
  });

  const listeResumeCloture = Object.values(resumeClotureParLivreur);
  const totalEncaisseGlobalCloture = listeResumeCloture.reduce((acc, item) => acc + item.montantTotalEncaisse, 0);
  const totalFraisLivraisonGlobalCloture = listeResumeCloture.reduce((acc, item) => acc + item.totalFraisLivraison, 0);
  
  // Calculs séparés pour les deux versements et leurs écarts
  const numericVerseRecette = parseFloat(totalVerseRecetteGlobal) || 0;
  const numericVerseFrais = parseFloat(totalVerseFraisLivraison) || 0;

  const ecartRecetteGlobale = numericVerseRecette - totalEncaisseGlobalCloture;
  const ecartFraisLivraison = numericVerseFrais - totalFraisLivraisonGlobalCloture;

  // --- VALIDATION ET VERSEMENT AVEC INJECTION UNIQUE DES FRAIS DE LIVRAISON DANS LE JOURNAL DE CAISSE ---
  const validerEtVerserCloture = async (caisseId, nomCaisse) => {
    const montantFraisVerséNum = parseFloat(totalVerseFraisLivraison) || 0;
    if (montantFraisVerséNum <= 0 && totalVerseRecetteGlobal === '') {
      alert('⚠️ Veuillez renseigner au moins un montant versé.');
      return;
    }
    if (!caisseId) {
      alert('⚠️ Veuillez sélectionner une caisse de destination pour les frais de livraison.');
      return;
    }

    const parsedBigInt = parseInt(caisseId, 10);
    const finalCaisseId = isNaN(parsedBigInt) ? caisseId : parsedBigInt;

    setSauvegardeEnCours(true);
    try {
      let maxNum = 0;
      cloturesEffectuees.forEach(cl => {
        const code = cl.code_cloture || '';
        const matchNum = code.match(/LIVR-(\d+)/);
        if (matchNum) {
          const numPart = parseInt(matchNum[1], 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      });
      const prochainNum = maxNum + 1;
      const baseCodePiece = `LIVR-${String(prochainNum).padStart(2, '0')}`;
      const prefixLivreur = clotureLivreur ? `${clotureLivreur.trim().toUpperCase()} - ` : '';
      const codePieceCloture = `${prefixLivreur}${baseCodePiece}`;

      // Seuls les frais de livraison entrent dans le journal de caisse
      const libelleCloture = `VERS. CLÔTURE LIVRAISON ${clotureLivreur ? `- ${clotureLivreur}` : ''} (${clotureDateDebut === clotureDateFin ? clotureDateDebut : `Du ${clotureDateDebut} au ${clotureDateFin}`})`;

      const payloadCloture = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        code_cloture: codePieceCloture,
        date_debut: clotureDateDebut,
        date_fin: clotureDateFin,
        caissier: clotureLivreur || 'TOUS',
        montant_total_encaisse: totalEncaisseGlobalCloture,
        montant_reel_verse: montantFraisVerséNum,
        ecart_caisse: ecartFraisLivraison,
        id_caisse_destination: finalCaisseId,
        created_at: new Date().toISOString()
      };

      const { error: errCloture } = await supabase.from('clotures_caisses').insert([payloadCloture]);
      if (errCloture) throw errCloture;

      // Injection dans le journal de caisse (uniquement des frais de livraison de l'entreprise)
      const payloadMvt = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        id_caisse: finalCaisseId,
        type_mouvement: 'ENTREE',
        montant: montantFraisVerséNum,
        libelle: libelleCloture.trim().toUpperCase(),
        piece_physique: codePieceCloture,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('mouvements_caisse').insert([payloadMvt]);
      if (error) throw error;

      alert(`✅ Clôture enregistrée sous le numéro ${codePieceCloture}. Versement des frais de livraison de ${montantFraisVerséNum.toLocaleString('fr-FR')} CFA injecté dans le journal de caisse "${nomCaisse}" !`);
      
      setCaisseSelectionneeCloture(caisseId);
      setModalCaisseClotureOuverte(false);
      setTotalVerseRecetteGlobal('');
      setTotalVerseFraisLivraison('');
      await chargerDonnees();
    } catch (err) {
      alert('Erreur lors du versement dans le journal de caisse : ' + err.message);
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const gererTri = (colonne) => {
    if (colonneTri === colonne) {
      setOrdreTri(ordreTri === 'asc' ? 'desc' : 'asc');
    } else {
      setColonneTri(colonne);
      setOrdreTri('asc');
    }
  };

  const commandesRapportTriees = [...commandesRapport].sort((a, b) => {
    let valA, valB;

    if (colonneTri === 'date') {
      valA = a.date_commande || '';
      valB = b.date_commande || '';
    } else if (colonneTri === 'numero') {
      valA = a.numero_commande || '';
      valB = b.numero_commande || '';
    } else if (colonneTri === 'partenaire') {
      valA = a.nom_partenaire || '';
      valB = b.nom_partenaire || '';
    } else if (colonneTri === 'article') {
      const lignesA = lignesCommandesMap[a.id] || [];
      valA = lignesA.length > 0 ? lignesA.map(l => `${l.designation} x${l.quantite}`).join(', ') : '';
      const lignesB = lignesCommandesMap[b.id] || [];
      valB = lignesB.length > 0 ? lignesB.map(l => `${l.designation} x${l.quantite}`).join(', ') : '';
    } else if (colonneTri === 'montant') {
      valA = Number(a.montant_commande || 0);
      valB = Number(b.montant_commande || 0);
    } else if (colonneTri === 'frais') {
      valA = Number(a.frais_livraison || 0);
      valB = Number(b.frais_livraison || 0);
    } else {
      return 0;
    }

    if (valA < valB) return ordreTri === 'asc' ? -1 : 1;
    if (valA > valB) return ordreTri === 'asc' ? 1 : -1;
    return 0;
  });

  const totalMontantRapport = commandesRapport.reduce((acc, cmd) => acc + Number(cmd.montant_commande || 0), 0);
  const totalFraisRapport = commandesRapport.reduce((acc, cmd) => acc + Number(cmd.frais_livraison || 0), 0);
  const resteAVerserRapport = totalMontantRapport - totalFraisRapport;

  const nomPartenaireRapport = rapportPartenaire ? (partenaires.find(p => String(p.id) === String(rapportPartenaire))?.nom_fournisseur || partenaires.find(p => String(p.id) === String(rapportPartenaire))?.nom || 'TOUS LES PARTENAIRES') : 'TOUS LES PARTENAIRES';
  const nomLivreurRapport = rapportLivreur || 'TOUS LES LIVREURS';

  const libellePeriode = rapportDateDebut === rapportDateFin 
    ? formaterDateJJMMAAAA(rapportDateDebut) 
    : `Du ${formaterDateJJMMAAAA(rapportDateDebut)} au ${formaterDateJJMMAAAA(rapportDateFin)}`;

  const titrePrincipalRapport = `RAPPORT DE LIVRAISON - ${nomPartenaireRapport.toUpperCase()} - ${libellePeriode}`;

  const imprimerRapport = () => {
    setTimeout(() => {
      if (!rapportRef.current) return;
      const fenetreImpression = window.open('', '_blank', 'width=900,height=700');
      if (fenetreImpression) {
        fenetreImpression.document.write(`
          <html>
            <head>
              <title>${titrePrincipalRapport}</title>
              <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 25px; background: white; color: #111827; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .print-header { border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 20px; }
                .print-header h1 { font-size: 18px; font-weight: 900; color: #ea580c; text-transform: uppercase; margin: 0 0 5px 0; }
                .print-header p { font-size: 12px; font-weight: bold; color: #334155; margin: 2px 0; text-transform: uppercase; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; background: white; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11px; text-align: left; }
                th { background-color: #f1f5f9 !important; color: #334155; font-weight: bold; text-transform: uppercase; }
                .print-footer { 
                  background-color: #064e3b !important; 
                  color: white !important; 
                  padding: 15px !important; 
                  margin-top: 20px !important; 
                  border-radius: 8px !important; 
                  display: flex !important;
                  justify-content: space-between !important;
                  align-items: center !important;
                }
                .print-footer > div { text-align: center; flex: 1; border-right: 1px solid #047857; }
                .print-footer > div:last-child { border-right: none; }
                .print-footer .label { color: #a7f3d0 !important; font-size: 9px; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 4px; }
                .print-footer .valeur { color: #6ee7b7 !important; font-family: monospace; font-size: 14px; font-weight: 900; }
                .print-footer .valeur-orange { color: #fde047 !important; font-family: monospace; font-size: 14px; font-weight: 900; }
                button, .print-hide { display: none !important; }
              </style>
            </head>
            <body>
              <div class="print-header">
                <h1>RAPPORT DE LIVRAISON (COMMANDES LIVRÉES)</h1>
                <p>Partenaire : ${nomPartenaireRapport}</p>
                <p>Livreur : ${nomLivreurRapport}</p>
                <p>Période : ${libellePeriode}</p>
              </div>

              ${rapportRef.current.querySelector('.overflow-x-auto') ? rapportRef.current.querySelector('.overflow-x-auto').innerHTML : ''}

              <div class="print-footer">
                <div>
                  <span class="label">Montant Total</span>
                  <span class="valeur">${totalMontantRapport.toLocaleString('fr-FR')} CFA</span>
                </div>
                <div>
                  <span class="label">Total Frais</span>
                  <span class="valeur">${totalFraisRapport.toLocaleString('fr-FR')} CFA</span>
                </div>
                <div>
                  <span class="label">Reste à verser</span>
                  <span class="valeur-orange">${resteAVerserRapport.toLocaleString('fr-FR')} CFA</span>
                </div>
              </div>

              <script>
                window.onload = function() {
                  setTimeout(() => {
                    window.print();
                    window.close();
                  }, 400);
                };
              </script>
            </body>
          </html>
        `);
        fenetreImpression.document.close();
      }
    }, 150);
  };

  return (
    <div className="space-y-3 text-[11px] font-sans">
      
      <style jsx global>{`
        @keyframes clignoteRouge {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.03); }
        }
        @keyframes clignoteBleu {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.03); }
        }
        .animate-clignote-rouge {
          animation: clignoteRouge 1s infinite ease-in-out;
        }
        .animate-clignote-bleu {
          animation: clignoteBleu 1.4s infinite ease-in-out;
        }
      `}</style>

      <div className="bg-white px-2 py-1.5 rounded-xl border border-slate-200 shadow-2xs flex flex-row justify-between items-center gap-1 overflow-hidden">
        <div className="flex items-center gap-1 min-w-0 shrink-0">
          <h3 className="font-extrabold text-slate-900 uppercase text-[9px] flex items-center gap-0.5 shrink-0">
            <span>📦</span> LIVRAISON
          </h3>
          {roleUtilisateur && (
            <span className="text-[7px] bg-slate-100 text-slate-700 px-1 py-0.5 rounded-full font-bold border border-slate-200 truncate max-w-[70px]">
              {roleUtilisateur.nom_role || roleUtilisateur.nom || 'Employé'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setVueActive('LISTE')}
            className={`font-bold px-1.5 py-0.5 rounded transition shadow-2xs text-[8px] border whitespace-nowrap ${
              vueActive === 'LISTE' 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
          >
            Liste
          </button>

          {permissions.peut_creer && (
            <button
              type="button"
              onClick={() => {
                setCommandeEnEdition(null);
                setNumeroCommande('1');
                setIdPartenaire('');
                setPartenaireSansStockage(false);
                setPointADepart('');
                setNumeroClient('');
                setNatureColis('');
                setMontantSaisi('');
                setAdresseLivraison('');
                setZoneGrilleSelectionnee('');
                setFraisLivraisonSaisi('');
                setLivreurAssigne('');
                setStatutCommandeSaisi('EN ATTENTE');
                setLignesSaisies([]);
                setStocksArticlesCache({});
                setVueActive('CREATION');
              }}
              className={`font-bold px-1.5 py-0.5 rounded transition shadow-2xs text-[8px] border whitespace-nowrap ${
                vueActive === 'CREATION' 
                  ? 'bg-orange-600 text-white border-orange-600' 
                  : 'bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300'
              }`}
            >
              Créer
            </button>
          )}

          <button
            type="button"
            onClick={() => setVueActive('RAPPORT')}
            className={`font-bold px-1.5 py-0.5 rounded transition shadow-2xs text-[8px] border whitespace-nowrap ${
              vueActive === 'RAPPORT' 
                ? 'bg-blue-900 text-white border-blue-900' 
                : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
            }`}
          >
            Rapport
          </button>

          <button
            type="button"
            onClick={() => setVueActive('CLOTURE')}
            className={`font-bold px-1.5 py-0.5 rounded transition shadow-2xs text-[8px] border whitespace-nowrap ${
              vueActive === 'CLOTURE' 
                ? 'bg-emerald-900 text-white border-emerald-900' 
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
            }`}
          >
            Clôture
          </button>
        </div>
      </div>

      {vueActive === 'CLOTURE' && (
        <div className="space-y-3">
          <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setSousOngletCloture('nouveau')}
              className={`flex-1 py-1 px-1 rounded font-black text-[9px] uppercase transition shadow-2xs whitespace-nowrap text-center ${
                sousOngletCloture === 'nouveau' ? 'bg-emerald-900 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              Nouvelle Clôture
            </button>
            <button
              type="button"
              onClick={() => setSousOngletCloture('liste')}
              className={`flex-1 py-1 px-1 rounded font-black text-[9px] uppercase transition shadow-2xs whitespace-nowrap text-center ${
                sousOngletCloture === 'liste' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              Liste Clôture ({cloturesEffectuees.length})
            </button>
          </div>

          {sousOngletCloture === 'nouveau' && (
            <div className="space-y-3">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                  <span className="font-black text-emerald-900 uppercase text-[9px] flex items-center gap-1">
                    🔐 CLÔTURE DE CAISSE DES LIVREURS
                  </span>
                  {(clotureDateDebut !== new Date().toISOString().split('T')[0] || clotureDateFin !== new Date().toISOString().split('T')[0] || clotureLivreur) && (
                    <button
                      type="button"
                      onClick={() => {
                        const ajd = new Date().toISOString().split('T')[0];
                        setClotureDateDebut(ajd);
                        setClotureDateFin(ajd);
                        setClotureLivreur('');
                      }}
                      className="text-emerald-600 hover:text-emerald-700 font-bold text-[9px] underline"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5 items-end">
                  <div>
                    <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase truncate">Début</label>
                    <input
                      type="date"
                      value={clotureDateDebut}
                      onChange={(e) => setClotureDateDebut(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[10px]"
                    />
                  </div>

                  <div>
                    <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase truncate">Fin</label>
                    <input
                      type="date"
                      value={clotureDateFin}
                      onChange={(e) => setClotureDateFin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[10px]"
                    />
                  </div>

                  <div>
                    <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase truncate">Livreur</label>
                    <button
                      type="button"
                      onClick={() => { setRechercheClotureLivreurInput(''); setModalClotureLivreurOuverte(true); }}
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[9px] uppercase text-left flex justify-between items-center truncate"
                    >
                      <span className="truncate">{clotureLivreur || 'TOUS'}</span>
                      <span className="text-slate-400 shrink-0 text-[8px]">🔍</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-100 p-2 rounded-lg border border-slate-200">
                <div className="min-w-0 pr-1">
                  <h4 className="font-black text-[10px] uppercase tracking-wider text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                    EN ATTENTE DE CLOTURE
                  </h4>
                  <p className="text-[9px] text-slate-600 font-bold mt-0.5 truncate">
                    Période : <span className="text-slate-900">{clotureDateDebut === clotureDateFin ? formaterDateJJMMAAAA(clotureDateDebut) : `Du ${formaterDateJJMMAAAA(clotureDateDebut)} au ${formaterDateJJMMAAAA(clotureDateFin)}`}</span>
                  </p>
                </div>
                <div className="bg-white px-2 py-1 rounded-lg border border-slate-200 text-[9px] font-bold text-slate-800 shrink-0 whitespace-nowrap shadow-2xs">
                  Livreurs : <strong className="text-emerald-700">{listeResumeCloture.length}</strong>
                </div>
              </div>

              {listeResumeCloture.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs text-center text-slate-400 font-bold italic text-[10px]">
                  Aucune commande livrée en attente de clôture pour cette période.
                </div>
              ) : (
                <div className="space-y-2">
                  {listeResumeCloture.map((item, index) => {
                    const resteAVerser = item.montantTotalEncaisse - item.totalFraisLivraison;
                    return (
                      <div key={index} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm space-y-2 text-slate-900">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                          <span className="font-black text-xs uppercase text-blue-700 flex items-center gap-1">
                            🛵 {item.nom}
                          </span>
                          <span className="bg-orange-100 text-orange-800 font-extrabold px-2 py-0.5 rounded-full text-[9px]">
                            {item.nombreCommandes} commande(s) livrée(s)
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="block text-[8px] text-slate-500 uppercase font-bold">Montant Encaissé</span>
                            <span className="font-mono font-black text-emerald-700 text-xs">{item.montantTotalEncaisse.toLocaleString('fr-FR')} F</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="block text-[8px] text-slate-500 uppercase font-bold">Frais (Indicatif)</span>
                            <span className="font-mono font-bold text-slate-700 text-xs">{item.totalFraisLivraison.toLocaleString('fr-FR')} F</span>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                            <span className="block text-[8px] text-emerald-800 uppercase font-bold">Total / Net</span>
                            <span className="font-mono font-black text-emerald-900 text-xs">{resteAVerser.toLocaleString('fr-FR')} F</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* --- BLOC CLÔTURE & VERSEMENT GLOBAL ÉPURÉ (UNE SEULE LIGNE PAR SECTION) --- */}
                  <div className="bg-slate-100 text-slate-900 p-3 rounded-xl border border-slate-300 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                      <span className="font-black text-[10px] uppercase tracking-wider text-slate-900 flex items-center gap-1">
                        📋 CLÔTURE & VERSEMENT GLOBAL
                      </span>
                      {caisseSelectionneeCloture && (
                        <span className="bg-white text-slate-800 px-2 py-0.5 rounded text-[8px] font-bold border border-slate-300">
                          Caisse : <strong className="text-slate-900">{caisses.find(c => String(c.id) === String(caisseSelectionneeCloture))?.nom_caisse || caisseSelectionneeCloture}</strong>
                        </span>
                      )}
                    </div>

                    {/* LIGNE 1 : RECETTE GLOBALE (PARTENAIRE) SUR UNE SEULE LIGNE */}
                    <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block font-black text-[9px] text-slate-800 uppercase truncate">1. Recette Globale (Partenaire)</span>
                        <span className="font-mono text-[9px] text-slate-500 font-bold">Attendu : {totalEncaisseGlobalCloture.toLocaleString('fr-FR')} F</span>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-24">
                          <input
                            type="number"
                            value={totalVerseRecetteGlobal}
                            onChange={(e) => setTotalVerseRecetteGlobal(e.target.value)}
                            placeholder="Versé..."
                            className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono text-[11px] font-black text-slate-900 focus:outline-none focus:border-slate-500"
                          />
                        </div>
                        <div className="text-right min-w-[70px]">
                          <span className="block text-[8px] text-slate-500 uppercase font-bold">Écart</span>
                          <span className="font-mono text-[10px] font-black text-slate-900">{ecartRecetteGlobale.toLocaleString('fr-FR')} F</span>
                        </div>
                      </div>
                    </div>

                    {/* LIGNE 2 : FRAIS DE LIVRAISON (ENTREPRISE) SUR UNE SEULE LIGNE */}
                    <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block font-black text-[9px] text-slate-800 uppercase truncate">2. Frais de Livraison (Entreprise)</span>
                        <span className="font-mono text-[9px] text-slate-500 font-bold">Attendu : {totalFraisLivraisonGlobalCloture.toLocaleString('fr-FR')} F</span>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-24">
                          <input
                            type="number"
                            value={totalVerseFraisLivraison}
                            onChange={(e) => setTotalVerseFraisLivraison(e.target.value)}
                            placeholder="Versé..."
                            className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono text-[11px] font-black text-slate-900 focus:outline-none focus:border-slate-500"
                          />
                        </div>
                        <div className="text-right min-w-[70px]">
                          <span className="block text-[8px] text-slate-500 uppercase font-bold">Écart</span>
                          <span className="font-mono text-[10px] font-black text-slate-900">{ecartFraisLivraison.toLocaleString('fr-FR')} F</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => setModalCaisseClotureOuverte(true)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-2 rounded-lg text-[10px] uppercase tracking-wider transition shadow-sm border border-slate-900"
                      >
                        {caisseSelectionneeCloture 
                          ? `Valider et clôturer vers : ${caisses.find(c => String(c.id) === String(caisseSelectionneeCloture))?.nom_caisse || 'Caisse sélectionnée'}` 
                          : 'Valider et clôturer (Choisir la caisse) ➔'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {sousOngletCloture === 'liste' && (
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <h4 className="font-black text-slate-900 uppercase text-[10px]">
                  📋 HISTORIQUE DES CLÔTURES EFFECTUÉES ({cloturesEffectuees.length})
                </h4>
              </div>

              {cloturesEffectuees.length === 0 ? (
                <div className="bg-white p-8 text-center text-slate-400 font-bold italic rounded-xl border border-slate-200 text-[10px]">
                  Aucune clôture de caisse enregistrée pour le moment.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 uppercase text-[9px] font-black border-b border-slate-200">
                          <th className="p-2">Date Clôture</th>
                          <th className="p-2 font-mono">N° Clôture</th>
                          <th className="p-2 text-right">Attendu</th>
                          <th className="p-2 text-right">Versé</th>
                          <th className="p-2 text-right">Écart</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[10px]">
                        {cloturesEffectuees.map((cl) => {
                          const dateObj = new Date(cl.created_at || cl.date_debut);
                          const dateFormatee = !isNaN(dateObj) ? dateObj.toLocaleDateString('fr-FR') : '-';
                          const atten = Number(cl.montant_total_encaisse || cl.montant_attendu || 0);
                          const verse = Number(cl.montant_reel_verse || cl.montant_verse || 0);
                          const ecart = Number(cl.ecart_caisse || cl.ecart || 0);

                          return (
                            <tr key={cl.id} className="hover:bg-slate-50 transition">
                              <td className="p-2 font-bold text-slate-700 whitespace-nowrap">{dateFormatee}</td>
                              <td className="p-2 font-mono font-black text-orange-600 whitespace-nowrap">{cl.code_cloture || 'LIVR-00'}</td>
                              <td className="p-2 text-right font-mono font-bold text-slate-700">{atten.toLocaleString('fr-FR')}</td>
                              <td className="p-2 text-right font-mono font-black text-emerald-700">{verse.toLocaleString('fr-FR')}</td>
                              <td className={`p-2 text-right font-mono font-bold ${ecart === 0 ? 'text-slate-600' : 'text-slate-900'}`}>
                                {ecart.toLocaleString('fr-FR')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {vueActive === 'RAPPORT' && (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
              <span className="font-black text-blue-900 uppercase text-[10px] flex items-center gap-1">
                📊 RAPPORT DE LIVRAISON : COMMANDES LIVRÉES
              </span>
              {(rapportDateDebut !== premierJourMoisStr || rapportDateFin !== dernierJourMoisStr || rapportLivreur || rapportPartenaire) && (
                <button
                  type="button"
                  onClick={() => {
                    setRapportDateDebut(premierJourMoisStr);
                    setRapportDateFin(dernierJourMoisStr);
                    setRapportLivreur('');
                    setRapportPartenaire('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-bold text-[10px] underline"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Date Début</label>
                  <input
                    type="date"
                    value={rapportDateDebut}
                    onChange={(e) => setRapportDateDebut(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Date Fin</label>
                  <input
                    type="date"
                    value={rapportDateFin}
                    onChange={(e) => setRapportDateFin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Livreur</label>
                  <button
                    type="button"
                    onClick={() => { setRechercheRapportLivreurInput(''); setModalRapportLivreurOuverte(true); }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-[10px] uppercase text-left flex justify-between items-center truncate"
                  >
                    <span className="truncate">{rapportLivreur || 'TOUS'}</span>
                    <span className="text-slate-400 shrink-0">🔍</span>
                  </button>
                </div>

                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Partenaire</label>
                  <button
                    type="button"
                    onClick={() => { setRechercheRapportPartenaireInput(''); setModalRapportPartenaireOuverte(true); }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-[10px] text-left flex justify-between items-center truncate"
                  >
                    <span className="truncate">
                      {rapportPartenaire ? (partenaires.find(p => String(p.id) === String(rapportPartenaire))?.nom_fournisseur || partenaires.find(p => String(p.id) === String(rapportPartenaire))?.nom || 'TOUS') : 'TOUS'}
                    </span>
                    <span className="text-slate-400 shrink-0">🔍</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div ref={rapportRef} className="space-y-2">
            <div className="bg-slate-900 text-white px-3 py-2 rounded-xl border border-slate-800 shadow-sm flex flex-col gap-1.5">
              <div className="flex flex-row justify-between items-center gap-2">
                <h4 className="titre-rapport-principal font-black text-[10px] uppercase tracking-wider text-orange-400 truncate">
                  RAPPORT DE LIVRAISON
                </h4>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 text-[9px] font-bold whitespace-nowrap">
                    Total livré : <strong className="text-emerald-400">{commandesRapport.length}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={imprimerRapport}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black px-2 py-0.5 rounded-lg text-[9px] transition flex items-center gap-1 shadow-2xs print-hide whitespace-nowrap"
                  >
                    🖨️ Imprimer
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-1 flex items-center text-[10px] text-slate-300 font-extrabold truncate">
                Livreur : <span className="text-blue-400 uppercase ml-1">{nomLivreurRapport}</span>
              </div>
            </div>

            {chargement && commandes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold bg-white rounded-xl border border-slate-200">Chargement...</div>
            ) : commandesRapport.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold italic bg-white rounded-xl border border-slate-200 text-[10px]">
                Aucune livraison validée ne correspond à vos critères.
              </div>
            ) : (
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase text-[9px] font-black border-b border-slate-200">
                        <th className="p-2 cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('date')}>
                          Date {colonneTri === 'date' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="p-2 cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('numero')}>
                          N° Cmd {colonneTri === 'numero' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                        {!rapportPartenaire && (
                          <th className="p-2 cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('partenaire')}>
                            Partenaire {colonneTri === 'partenaire' && (ordreTri === 'asc' ? '▲' : '▼')}
                          </th>
                        )}
                        <th className="p-2 cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('article')}>
                          Article {colonneTri === 'article' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                        {!rapportLivreur && <th className="p-2">Livreur</th>}
                        <th className="p-2 text-right cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('montant')}>
                          Montant {colonneTri === 'montant' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="p-2 text-right cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('frais')}>
                          Frais {colonneTri === 'frais' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[10px]">
                      {commandesRapportTriees.map((cmd) => {
                        const lignesCmd = lignesCommandesMap[cmd.id] || [];
                        return (
                          <tr key={cmd.id} className="hover:bg-slate-50 transition">
                            <td className="p-2 font-bold text-slate-600 whitespace-nowrap">{formaterDateJJMMAAAA(cmd.date_commande)}</td>
                            <td className="p-2 font-mono font-black text-orange-600 whitespace-nowrap">{cmd.numero_commande}</td>
                            {!rapportPartenaire && <td className="p-2 font-extrabold text-slate-900">{cmd.nom_partenaire}</td>}
                            <td className="p-2">
                              {lignesCmd.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {lignesCmd.map((l, idx) => (
                                    <span key={idx} className="bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[9px]">
                                      {l.designation} <span className="text-orange-600 font-black">x{l.quantite}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : cmd.point_a ? (
                                <span className="text-slate-800 font-bold text-[9px]">
                                  📍 <strong className="text-slate-900">{cmd.point_a}</strong> ➔ <strong className="text-orange-600">{cmd.adresse_livraison}</strong>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Sans stockage</span>
                              )}
                            </td>
                            {!rapportLivreur && <td className="p-2 font-bold text-blue-700 uppercase">{cmd.vendeur_livreur || '-'}</td>}
                            <td className="p-2 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                              {Number(cmd.montant_commande || 0).toLocaleString('fr-FR')}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-600 whitespace-nowrap">
                              {Number(cmd.frais_livraison || 0).toLocaleString('fr-FR')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-emerald-900 text-white p-2.5 border-t border-emerald-800 grid grid-cols-3 gap-2 text-[10px] font-black text-center">
                  <div>
                    <span className="block text-[8px] text-emerald-200 uppercase">Montant total</span>
                    <span className="text-emerald-300 font-mono">{totalMontantRapport.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="border-x border-emerald-700 px-1">
                    <span className="block text-[8px] text-emerald-200 uppercase">Frais</span>
                    <span className="text-emerald-300 font-mono">{totalFraisRapport.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-emerald-200 uppercase">À verser</span>
                    <span className="text-orange-300 font-mono">{resteAVerserRapport.toLocaleString('fr-FR')} F</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {vueActive === 'CREATION' && (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200 space-y-2.5">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Date *</label>
                <input
                  type="date"
                  required
                  value={dateCommande}
                  onChange={(e) => handleChangementDate(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs"
                />
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Partenaire *</label>
                <button
                  type="button"
                  onClick={() => { setRecherchePartenaireInput(''); setModalPartenaireOuverte(true); }}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-xs shadow-xs text-left flex justify-between items-center truncate"
                >
                  <span className="truncate">
                    {idPartenaire ? (partenaires.find(p => String(p.id) === String(idPartenaire))?.nom_fournisseur || partenaires.find(p => String(p.id) === String(idPartenaire))?.nom || '-- Choisir --') : '-- Choisir --'}
                  </span>
                  <span className="text-slate-400 shrink-0">🔍</span>
                </button>
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">N° CMD (Auto) *</label>
                <div className="flex items-center bg-slate-100 border border-slate-300 rounded overflow-hidden shadow-xs">
                  <span className="bg-slate-200 px-1 py-1.5 text-[9px] font-black text-orange-600 border-r border-slate-300 shrink-0">
                    CMD-
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={numeroCommande}
                    className="w-full p-1.5 font-mono text-[10px] font-black text-slate-900 bg-slate-100 focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">
                  N° Client * <span className={`text-[8px] font-bold ${numeroClient.trim().length === 9 ? 'text-emerald-600' : 'text-rose-600'}`}>({numeroClient.trim().length}/9)</span>
                </label>
                <input
                  ref={inputNumeroClientRef}
                  type="text"
                  required
                  maxLength={9}
                  value={numeroClient}
                  onChange={(e) => setNumeroClient(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (numeroClient.trim().length !== 9) {
                        alert('⚠️ Le numéro du client doit comporter exactement 9 chiffres.');
                        return;
                      }
                      if (inputAdresseRef.current) {
                        inputAdresseRef.current.focus();
                        inputAdresseRef.current.select();
                      }
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="6XXXXXXXX..."
                  className={`w-full bg-white border rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs font-mono ${
                    numeroClient.trim().length === 9 ? 'border-emerald-500' : 'border-rose-300 focus:border-rose-500'
                  }`}
                />
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Adresse *</label>
                <input
                  ref={inputAdresseRef}
                  type="text"
                  required
                  list="liste-zones-commandes"
                  value={adresseLivraison}
                  onChange={(e) => handleChangementAdresse(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="Quartier..."
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs uppercase"
                />
                <datalist id="liste-zones-commandes">
                  {grilleTarifaire.map((tarif) => (
                    <option key={tarif.id} value={tarif.nom_zone}>
                      {tarif.nom_zone} ({Number(tarif.frais).toLocaleString('fr-FR')} F)
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Montant *</label>
                <input
                  ref={inputMontantRef}
                  type="number"
                  step="0.01"
                  required
                  value={montantSaisi}
                  onChange={(e) => setMontantSaisi(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Statut *</label>
              <select
                value={statutCommandeSaisi}
                onChange={(e) => setStatutCommandeSaisi(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-[10px] shadow-xs cursor-pointer"
              >
                <option value="EN ATTENTE">EN ATTENTE</option>
                <option value="LIVRÉ">LIVRÉ</option>
                <option value="REPORTÉ">REPORTÉ</option>
                <option value="ANNULÉ">ANNULÉ</option>
              </select>
            </div>

            {partenaireSansStockage && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-orange-700 uppercase">Point A (Départ) *</label>
                  <input
                    type="text"
                    required
                    value={pointADepart}
                    onChange={(e) => setPointADepart(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="Ex: Hippodrome..."
                    className="w-full bg-orange-50/50 border border-orange-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs uppercase"
                  />
                </div>

                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Nature colis</label>
                  <input
                    type="text"
                    value={natureColis}
                    onChange={(e) => setNatureColis(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="Colis fragile..."
                    className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs uppercase"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50/70 border-2 border-blue-200 p-3 rounded-xl shadow-md space-y-2">
            <div className="flex items-center justify-between border-b border-blue-200 pb-1">
              <span className="font-black text-blue-900 text-[10px] uppercase flex items-center gap-1">
                🔒 ZONE RÉSERVÉE AU SUPERVISEUR
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-black mb-0.5 text-[9px] text-blue-900 uppercase">Frais</label>
                <input
                  type="number"
                  step="0.01"
                  value={fraisLivraisonSaisi}
                  onChange={(e) => setFraisLivraisonSaisi(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="w-full bg-white border border-blue-300 rounded p-1.5 font-bold text-blue-900 text-xs shadow-xs"
                />
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-blue-900 uppercase">Livreur</label>
                <button
                  type="button"
                  onClick={() => { setRechercheLivreurInput(''); setModalLivreurOuverte(true); }}
                  className="w-full bg-white border border-blue-300 rounded p-1.5 font-extrabold text-blue-900 text-xs shadow-xs uppercase text-left flex justify-between items-center truncate"
                >
                  <span className="truncate">{livreurAssigne || '-- Choisir --'}</span>
                  <span className="text-slate-400 shrink-0">🔍</span>
                </button>
              </div>
            </div>
          </div>

          {!partenaireSansStockage ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2.5 rounded-xl shadow-md flex flex-col space-y-2">
                <div className="flex justify-between items-center gap-1">
                  <span className="font-black text-slate-900 uppercase text-[11px] truncate">
                    ARTICLE
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalArticleOuverte(true)}
                    disabled={!enteteValide}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold px-1.5 py-1 rounded-md text-[9px] flex items-center gap-0.5 shadow-2xs transition disabled:opacity-50 shrink-0"
                  >
                    <span>🔍</span> Rechercher
                  </button>
                </div>

                {!enteteValide ? (
                  <div className="p-2 text-center text-amber-700 font-bold text-[10px] bg-amber-50 rounded-lg border border-amber-200">
                    ⚠️ Remplir l'en-tête et un N° client à 9 chiffres d'abord.
                  </div>
                ) : articlesFiltres.length === 0 ? (
                  <div className="p-2 text-center text-slate-500 font-bold text-[10px] bg-slate-50 rounded-lg border border-slate-200">
                    Aucun article disponible.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 overflow-y-auto max-h-[220px] pr-0.5">
                    {articlesFiltres.map((art) => {
                      const idArt = art.id_article || art.id;

                      return (
                        <ArticleItemStockCard 
                          key={`${idArt}_${livreurAssigne}`} 
                          art={art} 
                          onSelect={() => ajouterArticleAuPanier(art)} 
                          chargerStock={async () => await recupererStockReelRPC(idArt)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white p-2.5 rounded-xl shadow-md flex flex-col justify-between space-y-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                    <span className="font-black text-slate-900 uppercase text-[11px]">Panier</span>
                  </div>

                  {lignesSaisies.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 font-bold text-[10px] italic">
                      Panier vide. Cliquez sur un article.
                    </div>
                  ) : (
                    <div className="space-y-1 overflow-y-auto max-h-[140px] pr-0.5">
                      {lignesSaisies.map((l, index) => (
                        <div key={index} className="flex justify-between items-center bg-slate-50 border border-slate-200 p-1 rounded-md text-[10px]">
                          <div className="flex-1 truncate pr-1">
                            <p className="font-black uppercase text-slate-900 truncate text-[9px]">{l.designation}</p>
                          </div>
                          
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => modifierQuantiteLigne(index, -1)}
                              className="bg-slate-200 text-slate-800 font-black w-3.5 h-3.5 rounded flex items-center justify-center text-[9px]"
                            >
                              -
                            </button>
                            <span className="font-black text-orange-600 w-4 text-center text-[9px]">{l.quantite}</span>
                            <button
                              type="button"
                              onClick={() => modifierQuantiteLigne(index, 1)}
                              className="bg-slate-200 text-slate-800 font-black w-3.5 h-3.5 rounded flex items-center justify-center text-[9px]"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => supprimerLignePanier(index)}
                              className="text-red-600 font-bold ml-0.5 text-[9px] px-0.5"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 pt-1.5 border-t border-slate-200">
                  <div className="w-full bg-slate-100 px-2 py-1.5 rounded-md border border-slate-200 flex flex-col items-center justify-center text-center">
                    <span className="font-black text-slate-900 text-[9px] uppercase">Net à payer</span>
                    <span className="font-black text-emerald-700 text-[10px] font-mono">{napGlobal.toLocaleString('fr-FR')} CFA</span>
                  </div>

                  <div className="flex items-center gap-1 w-full">
                    <button
                      type="button"
                      disabled={sauvegardeEnCours}
                      onClick={() => {
                        setLignesSaisies([]);
                        setStocksArticlesCache({});
                        setVueActive('LISTE');
                        setCommandeEnEdition(null);
                      }}
                      className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-black py-1.5 px-1 rounded-md text-[9px] transition text-center disabled:opacity-50"
                    >
                      Annuler
                    </button>

                    {commandeEnEdition && permissions.peut_supprimer && (
                      <button
                        type="button"
                        disabled={sauvegardeEnCours}
                        onClick={supprimerCommandeActuelle}
                        className="bg-red-600 hover:bg-red-700 text-white font-black p-1.5 rounded-md text-[9px] transition shrink-0"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    )}

                    {((commandeEnEdition && permissions.peut_modifier) || (!commandeEnEdition && permissions.peut_creer)) && (
                      <button
                        type="button"
                        disabled={sauvegardeEnCours}
                        onClick={sauvegarderCommande}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-1.5 px-1 rounded-md text-[9px] transition text-center shadow-xs"
                      >
                        {sauvegardeEnCours ? '...' : (commandeEnEdition ? 'Mettre à jour' : 'Valider')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-3 rounded-xl shadow-md space-y-2.5">
              <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-lg text-xs space-y-1">
                <span className="block font-black text-orange-900 uppercase">Résumé du Trajet :</span>
                <p className="font-bold text-slate-800">
                  📍 Départ : <strong className="text-slate-900">{pointADepart || 'Non défini'}</strong>
                </p>
                <p className="font-bold text-slate-800">
                  🎯 Arrivée : <strong className="text-orange-600">{adresseLivraison || 'Non défini'}</strong>
                </p>
                {numeroClient && (
                  <p className="font-bold text-slate-800">
                    📞 Client : <strong className="text-blue-700 font-mono">{numeroClient}</strong>
                  </p>
                )}
                {natureColis && (
                  <p className="font-bold text-slate-800">
                    📦 Colis : <strong className="text-blue-700">{natureColis}</strong>
                  </p>
                )}
                <p className="font-bold text-slate-800">
                  🛵 Livreur : <strong className="text-blue-600 uppercase">{livreurAssigne || 'Non assigné'}</strong>
                </p>
              </div>

              <div className="w-full bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="font-black text-slate-900 text-xs uppercase">Net à payer :</span>
                <span className="font-black text-emerald-700 text-sm font-mono">{napGlobal.toLocaleString('fr-FR')} CFA</span>
              </div>

              <div className="flex gap-2 w-full pt-1">
                <button
                  type="button"
                  disabled={sauvegardeEnCours}
                  onClick={() => {
                    setLignesSaisies([]);
                    setStocksArticlesCache({});
                    setVueActive('LISTE');
                    setCommandeEnEdition(null);
                  }}
                  className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-black py-2 px-2 rounded-lg text-xs transition text-center disabled:opacity-50"
                >
                  Annuler
                </button>

                {commandeEnEdition && permissions.peut_supprimer && (
                  <button
                    type="button"
                    disabled={sauvegardeEnCours}
                    onClick={supprimerCommandeActuelle}
                    className="bg-red-600 hover:bg-red-700 text-white font-black px-3 py-2 rounded-lg text-xs transition shadow-xs disabled:opacity-50"
                    title="Supprimer"
                  >
                    🗑️ Supprimer
                  </button>
                )}

                {((commandeEnEdition && permissions.peut_modifier) || (!commandeEnEdition && permissions.peut_creer)) && (
                  <button
                    type="button"
                    disabled={sauvegardeEnCours}
                    onClick={sauvegarderCommande}
                    className="flex-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-2 px-4 rounded-lg text-xs transition shadow-xs text-center"
                  >
                    {sauvegardeEnCours ? 'Enregistrement...' : (commandeEnEdition ? 'Mettre à jour ➔' : 'Valider la commande ➔')}
                  </button>
                )}
              </div>
            </div>
          )}

          {modalPartenaireOuverte && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                    <span>🔍</span> PARTENAIRE
                  </h4>
                  <button type="button" onClick={() => setModalPartenaireOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition">✕</button>
                </div>
                <div>
                  <input
                    type="text"
                    value={recherchePartenaireInput}
                    onChange={(e) => setRecherchePartenaireInput(e.target.value)}
                    placeholder="RECHERCHER..."
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  <div onClick={() => { handleChangementPartenaire(''); setModalPartenaireOuverte(false); }} className="col-span-2 p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-bold text-slate-500 text-xs text-center">
                    -- Réinitialiser --
                  </div>
                  {partenairesFiltres.map((p) => (
                    <div key={p.id} onClick={() => { handleChangementPartenaire(p.id); setModalPartenaireOuverte(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer flex items-center gap-2 shadow-2xs">
                      <span className="font-black text-xs text-slate-900 uppercase truncate">{p.nom_fournisseur || p.nom}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {modalLivreurOuverte && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                    <span>🔍</span> LIVREUR
                  </h4>
                  <button type="button" onClick={() => setModalLivreurOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition">✕</button>
                </div>
                <div>
                  <input
                    type="text"
                    value={rechercheLivreurInput}
                    onChange={(e) => setRechercheLivreurInput(e.target.value)}
                    placeholder="RECHERCHER..."
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  <div onClick={() => { setLivreurAssigne(''); setStocksArticlesCache({}); setModalLivreurOuverte(false); }} className="col-span-2 p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-bold text-slate-500 text-xs text-center">
                    -- Non assigné --
                  </div>
                  {livreursFiltres.map((nomEmp, idx) => (
                    <div key={idx} onClick={() => { setLivreurAssigne(nomEmp); setStocksArticlesCache({}); setModalLivreurOuverte(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer flex items-center gap-2 shadow-2xs">
                      <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center shrink-0 text-slate-500 font-bold text-[10px]">
                        {nomEmp.charAt(0)}
                      </div>
                      <span className="font-black text-xs text-slate-900 uppercase truncate">{nomEmp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {modalArticleOuverte && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                    <span>🔍</span> ARTICLE
                  </h4>
                  <button type="button" onClick={() => setModalArticleOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition">✕</button>
                </div>
                <div>
                  <input
                    type="text"
                    value={rechercheArticleInput}
                    onChange={(e) => setRechercheArticleInput(e.target.value)}
                    placeholder="RECHERCHER..."
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  {articlesFiltres.length === 0 ? (
                    <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun article trouvé.</div>
                  ) : (
                    articlesFiltres.map((art) => {
                      const idArt = art.id_article || art.id;

                      return (
                        <ArticleModalItemCard 
                          key={`${idArt}_${livreurAssigne}`} 
                          art={art} 
                          onSelect={() => { ajouterArticleAuPanier(art); setModalArticleOuverte(false); }} 
                          chargerStock={async () => await recupererStockReelRPC(idArt)}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {vueActive === 'LISTE' && (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
              <span className="font-black text-slate-900 uppercase text-[10px] flex items-center gap-1">
                🔍 FILTRER LES COMMANDES
              </span>
              {(filtrePartenaire || filtreLivreur || filtreDateDebut !== premierJourMoisStr || filtreDateFin !== dernierJourMoisStr || filtreStatut) && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltrePartenaire('');
                    setFiltreLivreur('');
                    setFiltreDateDebut(premierJourMoisStr);
                    setFiltreDateFin(dernierJourMoisStr);
                    setFiltreStatut('');
                  }}
                  className="text-orange-600 hover:text-orange-700 font-bold text-[10px] underline"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase truncate">Date Début</label>
                  <input
                    type="date"
                    value={filtreDateDebut}
                    onChange={(e) => setFiltreDateDebut(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[10px]"
                  />
                </div>

                <div>
                  <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase truncate">Date Fin</label>
                  <input
                    type="date"
                    value={filtreDateFin}
                    onChange={(e) => setFiltreDateFin(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[10px]"
                  />
                </div>

                <div>
                  <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase truncate">Partenaire</label>
                  <button
                    type="button"
                    onClick={() => { setRechercheFiltrePartenaireInput(''); setModalFiltrePartenaireOuverte(true); }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[10px] text-left flex justify-between items-center truncate"
                  >
                    <span className="truncate">
                      {filtrePartenaire ? (partenaires.find(p => String(p.id) === String(filtrePartenaire))?.nom_fournisseur || partenaires.find(p => String(p.id) === String(filtrePartenaire))?.nom || 'Tous') : 'Tous'}
                    </span>
                    <span className="text-slate-400 shrink-0 text-[8px]">🔍</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase truncate">Livreur</label>
                <button
                  type="button"
                  onClick={() => { setRechercheFiltreLivreurInput(''); setModalFiltreLivreurOuverte(true); }}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[10px] uppercase text-left flex justify-between items-center truncate"
                >
                  <span className="truncate">{filtreLivreur || 'Tous'}</span>
                  <span className="text-slate-400 shrink-0 text-[8px]">🔍</span>
                </button>
              </div>

              <div>
                <label className="block font-black mb-1 text-[8px] text-slate-700 uppercase truncate">Statut</label>
                <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFiltreStatut('')}
                    className={`py-1 px-1 rounded font-extrabold text-[8px] uppercase transition shadow-2xs truncate text-center ${
                      filtreStatut === '' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Tous
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltreStatut('EN ATTENTE')}
                    className={`py-1 px-1 rounded font-extrabold text-[8px] uppercase transition shadow-2xs truncate text-center ${
                      filtreStatut === 'EN ATTENTE' ? 'bg-amber-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    En attente
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltreStatut('LIVRÉ')}
                    className={`py-1 px-1 rounded font-extrabold text-[8px] uppercase transition shadow-2xs truncate text-center ${
                      filtreStatut === 'LIVRÉ' ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Livré
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltreStatut('REPORTÉ')}
                    className={`py-1 px-1 rounded font-extrabold text-[8px] uppercase transition shadow-2xs truncate text-center ${
                      filtreStatut === 'REPORTÉ' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Reporté
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltreStatut('ANNULÉ')}
                    className={`py-1 px-1 rounded font-extrabold text-[8px] uppercase transition shadow-2xs truncate text-center ${
                      filtreStatut === 'ANNULÉ' ? 'bg-rose-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Annulé
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-2.5 rounded-xl border border-slate-800 shadow-2xs flex justify-between items-center text-[10px] font-black">
            <span>Commandes affichées ({commandesAffichees.length} / {commandesFiltrees.length})</span>
          </div>

          {chargement && commandes.length === 0 ? (
            <div className="p-4 text-center text-slate-500 font-bold">Chargement...</div>
          ) : commandesFiltrees.length === 0 ? (
            <div className="p-6 text-center text-slate-500 bg-white border border-slate-200 rounded-xl font-bold">
              Aucune commande ne correspond aux filtres.
            </div>
          ) : (
            <div className="space-y-2">
              {commandesAffichees.map((cmd) => {
                const statut = cmd.statut || cmd.statut_commande || 'EN ATTENTE';
                let badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                if (statut === 'LIVRÉ' || statut === 'LIVRE') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                if (statut === 'REPORTÉ') badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
                if (statut === 'ANNULÉ') badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';

                const lignesCmd = lignesCommandesMap[cmd.id] || [];

                const estEnAttente = statut === 'EN ATTENTE';
                const dejaAppele = Boolean(commandesAppelees[cmd.id]);
                
                let styleNumero = '';
                if (estEnAttente) {
                  if (!dejaAppele) {
                    styleNumero = 'text-rose-600 font-black animate-clignote-rouge';
                  } else {
                    styleNumero = 'text-blue-600 font-black animate-clignote-bleu';
                  }
                } else {
                  styleNumero = 'text-slate-700 font-bold';
                }

                return (
                  <div
                    key={cmd.id}
                    onClick={() => ouvrirCommandePourModification(cmd)}
                    className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs hover:border-orange-500 cursor-pointer transition flex flex-col space-y-1.5"
                  >
                    <div className="flex justify-between items-center gap-1.5">
                      <div className="flex items-center gap-1 min-w-0 shrink-0">
                        <span className="font-mono font-black text-orange-600 text-[10px] shrink-0">{cmd.numero_commande}</span>
                        <span className="text-slate-300 text-[9px]">•</span>
                        <span className="font-extrabold text-slate-900 text-[9px] uppercase truncate max-w-[85px]">{cmd.nom_partenaire}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-extrabold text-blue-700 uppercase text-[9px] truncate max-w-[90px]" title={cmd.vendeur_livreur || 'NON ASSIGNÉ'}>
                          🛵 {cmd.vendeur_livreur || 'NON ASSIGNÉ'}
                        </span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border truncate ${badgeColor}`}>
                          {statut}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-1.5 flex justify-between items-center gap-2 text-[10px]">
                      <div className="text-slate-800 font-bold truncate">
                        {cmd.point_a ? (
                          <span className="truncate">
                            📍 <strong className="text-slate-900">{cmd.point_a}</strong> ➔ <strong className="text-orange-600">{cmd.adresse_livraison}</strong>
                          </span>
                        ) : (
                          <span className="truncate">
                            📍 <strong className="text-slate-900">{cmd.adresse_livraison}</strong>
                          </span>
                        )}

                        {cmd.zone_effective_livraison && cmd.zone_effective_livraison !== cmd.adresse_livraison && (
                          <span className="text-orange-600 font-extrabold ml-1">🚀 {cmd.zone_effective_livraison}</span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="bg-slate-100 text-slate-700 text-[8px] font-bold px-1 py-0.5 rounded border">
                          📅 {formaterDateCourte(cmd.date_commande)}
                        </span>
                        <div className="font-black text-emerald-700 text-[10px] font-mono mt-0.5">
                          {Number(cmd.montant_commande || 0).toLocaleString('fr-FR')} F
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center gap-2 pt-0.5 text-[9px]">
                      <div className="text-slate-600 font-medium truncate">
                        {lignesCmd.length > 0 ? (
                          <div className="flex flex-wrap gap-1 truncate">
                            {lignesCmd.map((l, idx) => (
                              <span key={idx} className="bg-slate-100 text-slate-800 font-bold px-1 py-0.5 rounded text-[8px]">
                                {l.designation} <span className="text-orange-600 font-black">x{l.quantite}</span>
                              </span>
                            ))}
                          </div>
                        ) : cmd.nature_colis ? (
                          <span className="text-blue-700 font-bold">📦 {cmd.nature_colis}</span>
                        ) : (
                          <span className="text-slate-400 italic">Aucun article</span>
                        )}
                      </div>

                      {cmd.numero_client && (
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={`https://wa.me/${cmd.numero_client.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-100 hover:bg-green-200 text-green-800 border border-green-300 p-0.5 rounded text-[9px] font-black transition flex items-center justify-center shadow-2xs"
                            title={`Message WhatsApp ${cmd.numero_client}`}
                          >
                            💬
                          </a>
                          <a
                            href={`tel:${cmd.numero_client}`}
                            onClick={() => {
                              setCommandesAppelees(prev => ({ ...prev, [cmd.id]: true }));
                            }}
                            className={`font-mono px-1.5 py-0.5 rounded border flex items-center gap-0.5 transition shadow-sm text-[9px] font-black ${styleNumero} ${
                              estEnAttente 
                                ? (!dejaAppele ? 'bg-rose-50 border-rose-300 hover:bg-rose-100' : 'bg-blue-50 border-blue-300 hover:bg-blue-100')
                                : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={`Appeler le client ${cmd.numero_client}`}
                          >
                            <span>📞</span> 
                            <span className="tracking-wide">{cmd.numero_client}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {limiteCommandes < commandesFiltrees.length && (
                <div className="text-center pt-2 pb-4">
                  <button
                    type="button"
                    onClick={() => setLimiteCommandes(prev => prev + 20)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-xs border border-slate-300"
                  >
                    📥 Charger 20 commandes de plus ({commandesFiltrees.length - limiteCommandes} restantes)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {modalCaisseClotureOuverte && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>🏧</span> CHOISIR LA CAISSE DE VERSEMENT DES FRAIS
              </h4>
              <button type="button" onClick={() => setModalCaisseClotureOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition">✕</button>
            </div>
            
            <div className="max-h-[350px] overflow-y-auto grid grid-cols-1 gap-2 pr-1">
              {caisses.filter(c => !c.module || c.module.toUpperCase() === moduleActuel).length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-bold text-xs">Aucune caisse enregistrée pour le module livraison. Veuillez en créer une.</div>
              ) : (
                caisses
                  .filter(c => !c.module || c.module.toUpperCase() === moduleActuel)
                  .map((c) => (
                    <div 
                      key={c.id} 
                      onClick={() => validerEtVerserCloture(c.id, c.nom_caisse)} 
                      className="p-3 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 cursor-pointer flex justify-between items-center shadow-2xs transition"
                    >
                      <div>
                        <span className="font-mono font-black text-slate-700 text-xs block">{c.code_caisse}</span>
                        <span className="font-black text-slate-900 text-xs uppercase">{c.nom_caisse}</span>
                      </div>
                      <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded border">{c.nature || 'CAISSE'}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {modalFiltrePartenaireOuverte && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs">PARTENAIRE</h4>
              <button type="button" onClick={() => setModalFiltrePartenaireOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100">✕</button>
            </div>
            <input type="text" value={rechercheFiltrePartenaireInput} onChange={(e) => setRechercheFiltrePartenaireInput(e.target.value)} placeholder="RECHERCHER..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              <div onClick={() => { setFiltrePartenaire(''); setModalFiltrePartenaireOuverte(false); }} className="col-span-2 p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-bold text-slate-500 text-xs text-center">Tous</div>
              {filtrePartenairesFiltres.map(p => (
                <div key={p.id} onClick={() => { setFiltrePartenaire(p.id); setModalFiltrePartenaireOuverte(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-black text-xs text-slate-900 uppercase truncate">{p.nom_fournisseur || p.nom}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalFiltreLivreurOuverte && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs">LIVREUR</h4>
              <button type="button" onClick={() => setModalFiltreLivreurOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100">✕</button>
            </div>
            <input type="text" value={rechercheFiltreLivreurInput} onChange={(e) => setRechercheFiltreLivreurInput(e.target.value)} placeholder="RECHERCHER..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              <div onClick={() => { setFiltreLivreur(''); setModalFiltreLivreurOuverte(false); }} className="col-span-2 p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-bold text-slate-500 text-xs text-center">Tous</div>
              {filtreLivreursFiltres.map((nom, idx) => (
                <div key={idx} onClick={() => { setFiltreLivreur(nom); setModalFiltreLivreurOuverte(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-black text-xs text-slate-900 uppercase truncate">{nom}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalRapportLivreurOuverte && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs">LIVREUR (RAPPORT)</h4>
              <button type="button" onClick={() => setModalRapportLivreurOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100">✕</button>
            </div>
            <input type="text" value={rechercheRapportLivreurInput} onChange={(e) => setRechercheRapportLivreurInput(e.target.value)} placeholder="RECHERCHER..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              <div onClick={() => { setRapportLivreur(''); setModalRapportLivreurOuverte(false); }} className="col-span-2 p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-bold text-slate-500 text-xs text-center">-- Tous --</div>
              {rapportLivreursFiltres.map((nom, idx) => (
                <div key={idx} onClick={() => { setRapportLivreur(nom); setModalRapportLivreurOuverte(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-black text-xs text-slate-900 uppercase truncate">{nom}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalRapportPartenaireOuverte && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs">PARTENAIRE (RAPPORT)</h4>
              <button type="button" onClick={() => setModalRapportPartenaireOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100">✕</button>
            </div>
            <input type="text" value={rechercheRapportPartenaireInput} onChange={(e) => setRechercheRapportPartenaireInput(e.target.value)} placeholder="RECHERCHER..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              <div onClick={() => { setRapportPartenaire(''); setModalRapportPartenaireOuverte(false); }} className="col-span-2 p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-bold text-slate-500 text-xs text-center">-- Tous --</div>
              {rapportPartenairesFiltres.map(p => (
                <div key={p.id} onClick={() => { setRapportPartenaire(p.id); setModalRapportPartenaireOuverte(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-black text-xs text-slate-900 uppercase truncate">{p.nom_fournisseur || p.nom}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalClotureLivreurOuverte && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs">LIVREUR (CLÔTURE)</h4>
              <button type="button" onClick={() => setModalClotureLivreurOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100">✕</button>
            </div>
            <input type="text" value={rechercheClotureLivreurInput} onChange={(e) => setRechercheClotureLivreurInput(e.target.value)} placeholder="RECHERCHER..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              <div onClick={() => { setClotureLivreur(''); setModalClotureLivreurOuverte(false); }} className="col-span-2 p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-bold text-slate-500 text-xs text-center">-- Tous les livreurs --</div>
              {clotureLivreursFiltres.map((nom, idx) => (
                <div key={idx} onClick={() => { setClotureLivreur(nom); setModalClotureLivreurOuverte(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-black text-xs text-slate-900 uppercase truncate">{nom}</div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ArticleItemStockCard({ art, onSelect, chargerStock }) {
  const [stock, setStock] = useState(0);
  const [chargementStock, setChargementStock] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setChargementStock(true);
    chargerStock().then((val) => {
      if (isMounted) {
        setStock(val);
        setChargementStock(false);
      }
    });
    return () => { isMounted = false; };
  }, [chargerStock]);

  const designation = art.Designation || art.designation || art.nom;
  const estEpuise = !chargementStock && stock <= 0;

  return (
    <div
      onClick={onSelect}
      className={`p-2 rounded-lg border transition cursor-pointer flex flex-col justify-between shadow-2xs ${
        estEpuise 
          ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' 
          : 'bg-white border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer'
      }`}
    >
      <h5 className={`font-black uppercase text-[10px] truncate ${estEpuise ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{designation}</h5>
      <span className={`font-black text-[9px] mt-1 ${estEpuise ? 'text-rose-600' : 'text-emerald-700'}`}>
        Stock : {chargementStock ? '...' : stock}
      </span>
    </div>
  );
}

function ArticleModalItemCard({ art, onSelect, chargerStock }) {
  const [stock, setStock] = useState(0);
  const [chargementStock, setChargementStock] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setChargementStock(true);
    chargerStock().then((val) => {
      if (isMounted) {
        setStock(val);
        setChargementStock(false);
      }
    });
    return () => { isMounted = false; };
  }, [chargerStock]);

  const designation = art.Designation || art.designation || art.nom;
  const estEpuise = !chargementStock && stock <= 0;

  return (
    <div 
      onClick={onSelect} 
      className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between shadow-2xs ${
        estEpuise ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-orange-500 hover:bg-orange-50/50'
      }`}
    >
      <span className="font-black text-xs text-slate-900 uppercase truncate">{designation}</span>
      <span className="font-black text-[10px] mt-1 text-slate-700">
        Stock : <strong className={estEpuise ? 'text-rose-600' : 'text-emerald-700'}>{chargementStock ? '...' : stock}</strong>
      </span>
    </div>
  );
}