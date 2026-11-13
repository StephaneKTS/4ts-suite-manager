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
      } else if (!entrepriseId && propEntrepriseId) {
        setEntrepriseId(propEntrepriseId);
      }
    }
  }, [propEntrepriseId]);

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

  const [menuStatutOuvertId, setMenuStatutOuvertId] = useState(null);

  const [vueActive, setVueActive] = useState('LISTE');
  const [sousOngletCloture, setSousOngletCloture] = useState('nouveau');
  const [commandeEnEdition, setCommandeEnEdition] = useState(null);
  const [snapshotCommandeInitiale, setSnapshotCommandeInitiale] = useState(null);
  const [documentEnLectureSeule, setDocumentEnLectureSeule] = useState(false);

  const [numeroCommande, setNumeroCommande] = useState('1');
  const [dateCommande, setDateCommande] = useState(new Date().toISOString().split('T')[0]);
  const [idPartenaire, setIdPartenaire] = useState('');
  const [depotId, setDepotId] = useState('AUCUN_DEPOT');
  const [montantSaisi, setMontantSaisi] = useState('');
  
  const inputNumeroClientRef = useRef(null);
  const inputAdresseRef = useRef(null);
  const inputMontantRef = useRef(null);
  const inputNumeroCmdRef = useRef(null);

  const [pointADepart, setPointADepart] = useState('');
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [numeroClient, setNumeroClient] = useState('');
  const [natureColis, setNatureColis] = useState('');
  const [zoneGrilleSelectionnee, setZoneGrilleSelectionnee] = useState('');
  const [fraisLivraisonSaisi, setFraisLivraisonSaisi] = useState('');
  const [livreurAssigne, setLivreurAssigne] = useState('');
  const [statutCommandeSaisi, setStatutCommandeSaisi] = useState('LIVRÉ');

  const [modalPartenaireOuverte, setModalPartenaireOuverte] = useState(false);
  const [recherchePartenaireInput, setRecherchePartenaireInput] = useState('');

  const [modalLivreurOuverte, setModalLivreurOuverte] = useState(false);
  const [rechercheLivreurInput, setRechercheLivreurInput] = useState('');

  const [modalArticleOuverte, setModalArticleOuverte] = useState(false);
  const [rechercheArticleInput, setRechercheArticleInput] = useState('');

  const [partenaireSansStockage, setPartenaireSansStockage] = useState(false);

  const [totalVerseRecetteGlobal, setTotalVerseRecetteGlobal] = useState('');
  const [totalVerseFraisLivraison, setTotalVerseFraisLivraison] = useState('');
  const [modalCaisseClotureOuverte, setModalCaisseClotureOuverte] = useState(false);
  const [caisseSelectionneeCloture, setCaisseSelectionneeCloture] = useState('');

  const dateDuJourStr = new Date().toISOString().split('T')[0];

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

  const [filtreZone, setFiltreZone] = useState('');
  const [modalFiltreZoneOuverte, setModalFiltreZoneOuverte] = useState(false);
  const [rechercheFiltreZoneInput, setRechercheFiltreZoneInput] = useState('');

  const [filtreDateDebut, setFiltreDateDebut] = useState(dateDuJourStr);
  const [filtreDateFin, setFiltreDateFin] = useState(dateDuJourStr);
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

  const [colonneTri, setColonneTri] = useState('numero');
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
      const currentEntId = entrepriseId || propEntrepriseId || '4TS-234321';
      const emailConnecte = localStorage.getItem('utilisateur_email') || '';
      if (!emailConnecte) return;

      const { data: userRecord } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', currentEntId)
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
    const currentEntId = entrepriseId || propEntrepriseId || '4TS-234321';
    if (!entrepriseId && currentEntId) {
      setEntrepriseId(currentEntId);
    }

    setChargement(true);
    
    const commandesLocales = localSync.recupererDonneesLocales(`commandes_livraison_${currentEntId}`);
    const lignesLocales = localSync.recupererDonneesLocales(`lignes_commandes_${currentEntId}`);
    const partenairesLocaux = localSync.recupererDonneesLocales(`partenaires_livraison_${currentEntId}`);
    const articlesLocaux = localSync.recupererDonneesLocales(`articles_livraison_${currentEntId}`) || localSync.recupererDonneesLocales(`4ts_local_cache_articles_livraison_${currentEntId}`);
    const depotsLocaux = localSync.recupererDonneesLocales(`depots_livraison_${currentEntId}`);
    const emplacementsLocaux = localSync.recupererDonneesLocales(`emplacements_livraison_${currentEntId}`);
    const grilleLocale = localSync.recupererDonneesLocales(`grille_tarifaire_${currentEntId}`);
    const mouvementsLocaux = localSync.recupererDonneesLocales(`mouvements_stock_${currentEntId}`);
    const approLocaux = localSync.recupererDonneesLocales(`approvisionnements_${currentEntId}`);
    const caissesLocales = localSync.recupererDonneesLocales(`caisses_${currentEntId}_${moduleActuel}`);
    const cloturesLocales = localSync.recupererDonneesLocales(`clotures_livraison_${currentEntId}`);

    if (commandesLocales && commandesLocales.length > 0) setCommandes(commandesLocales);
    if (lignesLocales) setLignesCommandesMap(lignesLocales);
    if (partenairesLocaux && partenairesLocaux.length > 0) setPartenaires(partenairesLocaux);
    if (articlesLocaux && articlesLocaux.length > 0) setArticles(articlesLocaux);
    if (depotsLocaux && depotsLocaux.length > 0) setDepots(depotsLocaux);
    if (emplacementsLocaux && emplacementsLocaux.length > 0) setEmplacements(emplacementsLocaux);
    if (grilleLocale && grilleLocale.length > 0) setGrilleTarifaire(grilleLocale);
    if (mouvementsLocaux) setMouvements(mouvementsLocaux);
    if (approLocaux) setApprovisionnements(approLocaux);
    if (caissesLocales && caissesLocales.length > 0) setCaisses(caissesLocales);
    if (cloturesLocales && cloturesLocales.length > 0) setCloturesEffectuees(cloturesLocales);

    try {
      await chargerDroitsUtilisateur();

      const [resCmd, resLignesAll, resPart, resArt, resDep, resEmp, resUser, resTarif, resMouv, resAppro, resCaisses, resClotures] = await Promise.all([
        supabase.from('commandes_livraison_en_tete').select('*').eq('id_entreprise', currentEntId).eq('module', moduleActuel).order('created_at', { ascending: false }),
        supabase.from('commandes_livraison_lignes').select('*'),
        supabase.from('fournisseurs').select('*').eq('id_entreprise', currentEntId).eq('module', moduleActuel),
        supabase.from('articles_stock').select('*').eq('id_entreprise', currentEntId).eq('module', moduleActuel).order('created_at', { ascending: false }),
        supabase.from('depots_stock').select('*').eq('id_entreprise', currentEntId),
        supabase.from('emplacements_stock').select('*').eq('id_entreprise', currentEntId),
        supabase.from('utilisateurs').select('*').eq('id_entreprise', currentEntId),
        supabase.from('grille_tarifaire_livraison').select('*').eq('id_entreprise', currentEntId).eq('module', moduleActuel),
        supabase.from('mouvements_stock').select('*').eq('id_entreprise', currentEntId),
        supabase.from('approvisionnements').select('*').eq('id_entreprise', currentEntId),
        supabase.from('caisses').select('*').eq('id_entreprise', currentEntId),
        supabase.from('clotures_caisses').select('*').eq('id_entreprise', currentEntId).eq('module', moduleActuel).order('created_at', { ascending: false })
      ]);

      const commandesData = resCmd.data || [];
      if (commandesData.length > 0) {
        setCommandes(commandesData);
        localSync.sauvegarderDonneesLocales(`commandes_livraison_${currentEntId}`, commandesData);
      }

      const mapLignes = {};
      if (resLignesAll.data) {
        resLignesAll.data.forEach(l => {
          if (!mapLignes[l.id_commande]) {
            mapLignes[l.id_commande] = [];
          }
          mapLignes[l.id_commande].push(l);
        });
        setLignesCommandesMap(mapLignes);
        localSync.sauvegarderDonneesLocales(`lignes_commandes_${currentEntId}`, mapLignes);
      }

      if (resPart.data && resPart.data.length > 0) {
        setPartenaires(resPart.data);
        localSync.sauvegarderDonneesLocales(`partenaires_livraison_${currentEntId}`, resPart.data);
      }
      if (resArt.data && resArt.data.length > 0) {
        setArticles(resArt.data);
        localSync.sauvegarderDonneesLocales(`articles_livraison_${currentEntId}`, resArt.data);
      }
      if (resDep.data && resDep.data.length > 0) {
        setDepots(resDep.data);
        localSync.sauvegarderDonneesLocales(`depots_livraison_${currentEntId}`, resDep.data);
      }
      if (resEmp.data && resEmp.data.length > 0) {
        setEmplacements(resEmp.data);
        localSync.sauvegarderDonneesLocales(`emplacements_livraison_${currentEntId}`, resEmp.data);
      }
      if (resUser.data) setUtilisateurs(resUser.data);
      if (resTarif.data && resTarif.data.length > 0) {
        setGrilleTarifaire(resTarif.data);
        localSync.sauvegarderDonneesLocales(`grille_tarifaire_${currentEntId}`, resTarif.data);
      }
      if (resMouv.data) {
        setMouvements(resMouv.data);
        localSync.sauvegarderDonneesLocales(`mouvements_stock_${currentEntId}`, resMouv.data);
      }
      if (resAppro.data) {
        setApprovisionnements(resAppro.data);
        localSync.sauvegarderDonneesLocales(`approvisionnements_${currentEntId}`, resAppro.data);
      }
      if (resCaisses.data) {
        setCaisses(resCaisses.data);
        localSync.sauvegarderDonneesLocales(`caisses_${currentEntId}_${moduleActuel}`, resCaisses.data);
      }
      if (resClotures.data) {
        setCloturesEffectuees(resClotures.data);
        localSync.sauvegarderDonneesLocales(`clotures_livraison_${currentEntId}`, resClotures.data);
      }

      setStocksArticlesCache({});
      calculerNumeroAutomatique(commandesData, idPartenaire, dateCommande);

    } catch (err) {
      console.error('Mode hors-ligne actif ou erreur réseau :', err.message);
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
    const currentEntId = entrepriseId || propEntrepriseId || '4TS-234321';
    if (currentEntId) {
      if (!entrepriseId) setEntrepriseId(currentEntId);
      chargerDonnees();
      localSync.synchroniserVersCloud(supabase);
    }
  }, [entrepriseId, propEntrepriseId]);

  const listeZonesUniques = () => {
    const setZones = new Set();
    commandes.forEach(c => {
      const zone = (c.zone_effective_livraison || c.adresse_livraison || '').trim().toUpperCase();
      if (zone) setZones.add(zone);
    });
    grilleTarifaire.forEach(t => {
      const nomZ = (t.nom_zone || '').trim().toUpperCase();
      if (nomZ) setZones.add(nomZ);
    });
    return Array.from(setZones).sort();
  };

  const zonesFiltresFiltrees = listeZonesUniques().filter(z => z.toLowerCase().includes(rechercheFiltreZoneInput.toLowerCase()));

  const trouverIdEmplacementLivreur = (nomLivreur) => {
    if (!nomLivreur) return null;
    const currentEntId = entrepriseId || propEntrepriseId || '4TS-234321';
    const nomLivreurNorm = nomLivreur.trim().toUpperCase();
    const empObj = emplacements.find(e => {
      if (String(e.id_entreprise || '').trim() !== String(currentEntId || '').trim()) return false;
      const nomEmp = (e.nom_emplacement || e.libelle || e.nom || '').trim().toUpperCase();
      const respEmp = (e.responsable_emplacement || '').trim().toUpperCase();
      return nomEmp === nomLivreurNorm || respEmp === nomLivreurNorm || nomEmp.includes(nomLivreurNorm) || nomLivreurNorm.includes(nomEmp);
    });
    return empObj ? empObj.id : null;
  };

  const calculerStockStrictLivreurMagasin = (articleId, depotCible = 'TOUS', emplacementCible = null) => {
    const artObj = articles.find(a => String(a.id_article) === String(articleId));
    let stockBaseDirect = 0;
    if (artObj && !emplacementCible) {
      stockBaseDirect = Number(artObj.Quantite_Stock ?? artObj.quantite_stock ?? artObj.stock_actuel ?? artObj.stock ?? 0);
    }

    let totalEntrees = stockBaseDirect;
    let totalSorties = 0;

    mouvements.forEach(m => {
      if (String(m.id_article) !== String(articleId)) return;
      
      const qte = parseInt(m.quantite || 0);
      const typeMvt = (m.type_mouvement || '').toUpperCase();
      const mDepotSrc = String(m.id_depot_source || '');
      const mDepotDest = String(m.id_depot_destination || '');
      const mEmpSrc = String(m.id_emplacement_source || '');
      const mEmpDest = String(m.id_emplacement_destination || '');

      if (depotCible && depotCible !== 'TOUS' && depotCible !== 'AUCUN_DEPOT') {
        const matchDepotDest = mDepotDest === String(depotCible);
        const matchDepotSrc = mDepotSrc === String(depotCible);
        if (!matchDepotDest && !matchDepotSrc) return;
      }

      if (emplacementCible) {
        const matchEmpDest = mEmpDest === String(emplacementCible);
        const matchEmpSrc = mEmpSrc === String(emplacementCible);
        
        if (!matchEmpDest && !matchEmpSrc) return;

        if (typeMvt === 'INVENTAIRE' && matchEmpSrc) {
          totalEntrees = qte;
          totalSorties = 0;
          return;
        }
        if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          if (matchEmpDest) totalEntrees += qte;
          if (matchEmpSrc) totalSorties += qte;
          return;
        }
        if (matchEmpDest) totalEntrees += qte;
        if (matchEmpSrc) totalSorties += qte;
      } else {
        if (typeMvt === 'INVENTAIRE' && mDepotSrc === String(depotCible)) {
          totalEntrees = qte;
          totalSorties = 0;
          return;
        }
        if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          if (mDepotDest === String(depotCible)) totalEntrees += qte;
          if (mDepotSrc === String(depotCible)) totalSorties += qte;
          return;
        }
        if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') {
          if (mDepotDest === String(depotCible) || !depotCible || depotCible === 'TOUS') totalEntrees += qte;
        } else if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
          if (mDepotSrc === String(depotCible) || !depotCible || depotCible === 'TOUS') totalSorties += qte;
        }
      }
    });

    if (!emplacementCible) {
      approvisionnements.forEach(app => {
        if (depotCible && depotCible !== 'TOUS' && depotCible !== 'AUCUN_DEPOT' && String(app.id_depot_destination || app.id_depot || '') !== String(depotCible)) {
          return;
        }
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
    }

    return Math.max(0, totalEntrees - totalSorties);
  };

  const recupererStockReelRPC = async (articleId, livreurNomParam = '') => {
    const empIdCible = trouverIdEmplacementLivreur(livreurNomParam || livreurAssigne);
    const stockLocal = calculerStockStrictLivreurMagasin(articleId, depotId, empIdCible);

    if (typeof window !== 'undefined' && !navigator.onLine) {
      return stockLocal;
    }

    try {
      const currentEntId = entrepriseId || propEntrepriseId || '4TS-234321';
      const { data, error } = await supabase.rpc('calculer_stock_reel', {
        p_article_id: parseInt(articleId),
        p_entreprise_id: currentEntId,
        p_depot_id: depotId && depotId !== 'AUCUN_DEPOT' ? depotId : null,
        p_emplacement_id: empIdCible
      });

      if (!error && data !== null) {
        return parseInt(data, 10);
      }
    } catch (err) {}

    return stockLocal;
  };

  const changerStatutRapide = async (cmd, nouveauStatut) => {
    setMenuStatutOuvertId(null);

    const dateCmdStr = cmd.date_commande || dateDuJourStr;
    if (dateCmdStr < dateDuJourStr) {
      alert(`❌ Action interdite : ce document appartient à une journée clôturée (${dateCmdStr}).`);
      return;
    }

    const currentEntId = entrepriseId || propEntrepriseId || '4TS-234321';
    const statutActuelBrut = cmd.statut || cmd.statut_commande || 'EN ATTENTE';
    const statutActuelNorm = statutActuelBrut.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nouveauStatutNorm = nouveauStatut.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (statutActuelNorm === nouveauStatutNorm) return;

    if (!permissions.peut_modifier) {
      alert('⛔ Accès refusé : Votre profil ne dispose pas des droits de modification.');
      return;
    }

    setSauvegardeEnCours(true);
    try {
      const estLivreVerif = nouveauStatutNorm === 'LIVRE' || nouveauStatutNorm === 'LIVRÉ';
      const etaitDejaLivre = statutActuelNorm === 'LIVRE' || statutActuelNorm === 'LIVRÉ';

      const lignesCmd = lignesCommandesMap[cmd.id] || [];
      const partObj = partenaires.find(p => String(p.id) === String(cmd.id_partenaire));
      const estSansStockage = !partObj || (partObj.statut_stockage || partObj.statut || '').toString().trim().toUpperCase() === 'SANS_STOCKAGE';

      if (!estSansStockage && estLivreVerif && !etaitDejaLivre) {
        for (const item of lignesCmd) {
          const articleConcerne = articles.find(a => String(a.id_article) === String(item.id_article));
          const estSuiviArticle = articleConcerne ? (articleConcerne.suivi_stock ?? articleConcerne.Suivi_Stock ?? true) : true;

          if (estSuiviArticle !== false && estSuiviArticle !== 0) {
            const stockEmp = await recupererStockReelRPC(item.id_article, cmd.vendeur_livreur);
            if (stockEmp < item.quantite) {
              alert(
                `🚫 ACTION BLOQUÉE (RUPTURE DE STOCK) :\n\nStock insuffisant pour l'article "${item.designation}".\n(Stock disponible : ${stockEmp} | Quantité commandée : ${item.quantite})`
              );
              setSauvegardeEnCours(false);
              return;
            }
          }
        }
      }

      const { error: errUp } = await supabase
        .from('commandes_livraison_en_tete')
        .update({
          statut: nouveauStatut,
          statut_commande: nouveauStatut
        })
        .eq('id', cmd.id);

      if (errUp) {
        localSync.ajouterFileAttente('UPDATE', 'commandes_livraison_en_tete', { id: cmd.id, id_entreprise: currentEntId, statut: nouveauStatut, statut_commande: nouveauStatut });
      }

      const commandesMaj = commandes.map(c => c.id === cmd.id ? { ...c, statut: nouveauStatut, statut_commande: nouveauStatut } : c);
      setCommandes(commandesMaj);
      localSync.sauvegarderDonneesLocales(`commandes_livraison_${currentEntId}`, commandesMaj);

      if (!estSansStockage && etaitDejaLivre && !estLivreVerif) {
        const empIdTrouve = trouverIdEmplacementLivreur(cmd.vendeur_livreur);
        const depotRestitution = cmd.id_depot || (depotId !== 'AUCUN_DEPOT' ? depotId : (partObj?.id_depot || null));

        for (const item of lignesCmd) {
          const articleConcerne = articles.find(a => String(a.id_article) === String(item.id_article));
          const estSuiviArticle = articleConcerne ? (articleConcerne.suivi_stock ?? articleConcerne.Suivi_Stock ?? true) : true;

          if (estSuiviArticle !== false && estSuiviArticle !== 0) {
            const payloadRestitution = {
              id_entreprise: currentEntId,
              module: moduleActuel,
              type_mouvement: 'ENTREE',
              id_depot_source: null,
              id_emplacement_source: null,
              id_depot_destination: depotRestitution,
              id_emplacement_destination: empIdTrouve,
              id_article: parseInt(item.id_article),
              quantite: item.quantite,
              motif_remarque: `RESTITUTION STOCK CHANGEMENT STATUT ${cmd.numero_commande}`,
              created_at: `${cmd.date_commande || new Date().toISOString().split('T')[0]}T12:00:00`,
            };
            const { error: errRestit } = await supabase.from('mouvements_stock').insert([payloadRestitution]);
            if (errRestit) {
              localSync.ajouterFileAttente('INSERT', 'mouvements_stock', payloadRestitution);
            }
          }
        }
      }

      if (!estSansStockage && estLivreVerif && !etaitDejaLivre) {
        const empIdTrouve = trouverIdEmplacementLivreur(cmd.vendeur_livreur);
        const depotSourceMvt = cmd.id_depot || (depotId !== 'AUCUN_DEPOT' ? depotId : (partObj?.id_depot || (depots[0]?.id || null)));

        for (const item of lignesCmd) {
          const articleConcerne = articles.find(a => String(a.id_article) === String(item.id_article));
          const estSuiviArticle = articleConcerne ? (articleConcerne.suivi_stock ?? articleConcerne.Suivi_Stock ?? true) : true;

          if (estSuiviArticle !== false && estSuiviArticle !== 0) {
            const payloadMouvement = {
              id_entreprise: currentEntId,
              module: moduleActuel,
              type_mouvement: 'SORTIE',
              id_depot_source: depotSourceMvt,
              id_emplacement_source: empIdTrouve,
              id_depot_destination: null,
              id_article: parseInt(item.id_article),
              quantite: item.quantite,
              motif_remarque: `LIVRAISON EFFECTIVE ${cmd.numero_commande} (${partObj ? (partObj.nom_fournisseur || partObj.nom) : ''})`,
              created_at: `${cmd.date_commande || new Date().toISOString().split('T')[0]}T12:00:00`,
            };
            const { error: errMvt } = await supabase.from('mouvements_stock').insert([payloadMouvement]);
            if (errMvt) {
              localSync.ajouterFileAttente('INSERT', 'mouvements_stock', payloadMouvement);
            }
          }
        }
      }

      await chargerDonnees();
    } catch (err) {
      alert('Erreur lors du changement de statut : ' + err.message);
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const handleChangementPartenaire = (partenaireId, conserverNumero = false) => {
    if (documentEnLectureSeule) return;
    setIdPartenaire(partenaireId);
    if (!commandeEnEdition) setLignesSaisies([]);
    setStocksArticlesCache({});

    if (!conserverNumero) {
      calculerNumeroAutomatique(commandes, partenaireId, dateCommande);
    }

    if (!partenaireId) {
      setPartenaireSansStockage(false);
      setDepotId('AUCUN_DEPOT');
      return;
    }

    const partObj = partenaires.find(p => String(p.id) === String(partenaireId));
    if (partObj) {
      const statutStock = (partObj.statut_stockage || partObj.statut || '').toString().trim().toUpperCase();
      const sansStock = statutStock === 'SANS_STOCKAGE';
      
      setPartenaireSansStockage(Boolean(sansStock));

      if (sansStock && partObj.adresse && !conserverNumero) {
        setPointADepart(partObj.adresse);
      }

      const nomPartenaireClean = (partObj.nom_fournisseur || partObj.nom || '').trim().toUpperCase();
      const depotAssocie = depots.find(d => {
        const nomDep = (d.nom_depot || d.Nom_Depot || d.nom || '').trim().toUpperCase();
        return nomDep === nomPartenaireClean || String(d.id) === String(partObj.id_depot);
      });

      if (depotAssocie && !conserverNumero) {
        setDepotId(depotAssocie.id || depotAssocie.ID);
      } else if (!conserverNumero) {
        setDepotId(partObj.id_depot || 'AUCUN_DEPOT');
      }
    } else {
      setPartenaireSansStockage(false);
      setDepotId('AUCUN_DEPOT');
    }

    if (!conserverNumero) {
      setTimeout(() => {
        if (inputNumeroCmdRef.current) {
          inputNumeroCmdRef.current.focus();
          inputNumeroCmdRef.current.select();
        }
      }, 50);
    }
  };

  const handleChangementDate = (nouvelleDate) => {
    if (documentEnLectureSeule) return;
    setDateCommande(nouvelleDate);
    calculerNumeroAutomatique(commandes, idPartenaire, nouvelleDate);
  };

  const handleChangementAdresse = (valeur) => {
    if (documentEnLectureSeule) return;
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
    const currentEntId = entrepriseId || propEntrepriseId || '4TS-234321';
    
    utilisateurs
      .filter(u => String(u.id_entreprise || '').trim() === String(currentEntId || '').trim())
      .forEach(u => {
        let nom = (u.nom_complet || u.nom_utilisateur || u.nom || u.prenom || u.name || '').trim().toUpperCase();
        if (!nom && u.email) nom = u.email.split('@')[0].toUpperCase();
        if (nom) setLivreurs.add(nom);
      });

    emplacements
      .filter(e => String(e.id_entreprise || '').trim() === String(currentEntId || '').trim())
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
    ? (idPartenaire && numeroClient.trim().length === 9 && numeroCommande.trim() !== '' && montantSaisi !== '' && pointADepart.trim() !== '' && adresseLivraison.trim() !== '' && (depotId && depotId !== 'AUCUN_DEPOT'))
    : (idPartenaire && numeroClient.trim().length === 9 && numeroCommande.trim() !== '' && montantSaisi !== '' && adresseLivraison.trim() !== '' && (depotId && depotId !== 'AUCUN_DEPOT'));

  // Détection si des modifications ont été apportées en mode édition
  const aEteModifie = (() => {
    if (!commandeEnEdition || !snapshotCommandeInitiale) return true;
    if (dateCommande !== snapshotCommandeInitiale.dateCommande) return true;
    if (String(idPartenaire) !== String(snapshotCommandeInitiale.idPartenaire)) return true;
    if (numeroCommande.trim() !== snapshotCommandeInitiale.numeroCommande.trim()) return true;
    if (numeroClient.trim() !== snapshotCommandeInitiale.numeroClient.trim()) return true;
    if (adresseLivraison.trim().toUpperCase() !== snapshotCommandeInitiale.adresseLivraison.trim().toUpperCase()) return true;
    if (parseFloat(montantSaisi || 0) !== parseFloat(snapshotCommandeInitiale.montantSaisi || 0)) return true;
    if (pointADepart.trim().toUpperCase() !== snapshotCommandeInitiale.pointADepart.trim().toUpperCase()) return true;
    if (natureColis.trim().toUpperCase() !== snapshotCommandeInitiale.natureColis.trim().toUpperCase()) return true;
    if (parseFloat(fraisLivraisonSaisi || 0) !== parseFloat(snapshotCommandeInitiale.fraisLivraisonSaisi || 0)) return true;
    if ((livreurAssigne || '').trim().toUpperCase() !== (snapshotCommandeInitiale.livreurAssigne || '').trim().toUpperCase()) return true;
    if ((statutCommandeSaisi || '').trim().toUpperCase() !== (snapshotCommandeInitiale.statutCommandeSaisi || '').trim().toUpperCase()) return true;

    const lignesActuelles = lignesSaisies || [];
    const lignesInit = snapshotCommandeInitiale.lignes || [];
    if (lignesActuelles.length !== lignesInit.length) return true;

    const mapInit = {};
    lignesInit.forEach(l => { mapInit[l.id_article] = l.quantite; });
    for (const l of lignesActuelles) {
      if (mapInit[l.id_article] === undefined) return true;
      if (Number(mapInit[l.id_article]) !== Number(l.quantite)) return true;
    }

    return false;
  })();

  const ajouterArticleAuPanier = async (artObj) => {
    if (documentEnLectureSeule) return;
    if (!numeroClient.trim() || numeroClient.trim().length !== 9) {
      alert('⚠️ Veuillez saisir un numéro de client valide à exactement 9 chiffres.');
      if (inputNumeroClientRef.current) {
        inputNumeroClientRef.current.focus();
        inputNumeroClientRef.current.select();
      }
      return;
    }

    if (!enteteValide) {
      alert('⚠️ Veuillez d\'abord remplir tous les champs obligatoires avant d\'ajouter des articles.');
      return;
    }

    const idArt = artObj.id_article;
    const estSuivi = artObj.suivi_stock ?? artObj.Suivi_Stock ?? true;
    let stockDisp = 999999;

    if (estSuivi !== false && estSuivi !== 0) {
      stockDisp = await recupererStockReelRPC(idArt, livreurAssigne);
      if (stockDisp <= 0) {
        alert(`❌ Cet article est épuisé ou indisponible pour ce dépôt/livreur.`);
        return;
      }
    }

    const designation = (artObj.Designation || artObj.designation || artObj.nom || '').toUpperCase();
    const prixVente = Number(artObj.Prix_Vente || artObj.prix_vente || artObj.p_v || artObj.prix_unitaire || 0);

    const ligneExistante = lignesSaisies.find(l => String(l.id_article) === String(idArt));
    if (ligneExistante) {
      if (estSuivi !== false && estSuivi !== 0 && (ligneExistante.quantite + 1 > stockDisp)) {
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
    if (documentEnLectureSeule) return;
    const nouvellesLignes = [...lignesSaisies];
    const nouvelleQte = nouvellesLignes[index].quantite + delta;
    if (nouvelleQte <= 0) {
      setLignesSaisies(nouvellesLignes.filter((_, i) => i !== index));
    } else {
      const artId = nouvellesLignes[index].id_article;
      const articleConcerne = articles.find(a => String(a.id_article) === String(artId));
      const estSuivi = articleConcerne ? (articleConcerne.suivi_stock ?? articleConcerne.Suivi_Stock ?? true) : true;

      if (estSuivi !== false && estSuivi !== 0) {
        const stockDisp = await recupererStockReelRPC(artId, livreurAssigne);
        if (nouvelleQte > stockDisp) {
          alert(`❌ Quantité supérieure au stock disponible (${stockDisp}) !`);
          return;
        }
      }

      nouvellesLignes[index].quantite = nouvelleQte;
      setLignesSaisies(nouvellesLignes);
    }
  };

  const supprimerLignePanier = (index) => {
    if (documentEnLectureSeule) return;
    setLignesSaisies(lignesSaisies.filter((_, i) => i !== index));
  };

  const napGlobal = parseFloat(montantSaisi) || 0;

  const ouvrirCommandePourModification = async (cmd) => {
    const dateCmdStr = cmd.date_commande || dateDuJourStr;
    const estVerrouille = dateCmdStr < dateDuJourStr;

    setDocumentEnLectureSeule(estVerrouille);
    setCommandeEnEdition(cmd);
    setNumeroCommande(cmd.numero_commande ? cmd.numero_commande.replace('CMD-', '') : '1');
    setDateCommande(dateCmdStr);
    setIdPartenaire(cmd.id_partenaire || '');
    setDepotId(cmd.id_depot || 'AUCUN_DEPOT');
    setMontantSaisi(cmd.montant_commande !== undefined && cmd.montant_commande !== null ? String(cmd.montant_commande) : '0');
    setPointADepart(cmd.point_a || '');
    setAdresseLivraison(cmd.adresse_livraison || '');
    setNumeroClient(cmd.numero_client || '');
    setNatureColis(cmd.nature_colis || '');
    setZoneGrilleSelectionnee(cmd.zone_effective_livraison || cmd.adresse_livraison || '');
    setFraisLivraisonSaisi(cmd.frais_livraison !== undefined && cmd.frais_livraison !== null ? String(cmd.frais_livraison) : '');
    setLivreurAssigne(cmd.vendeur_livreur || '');
    setStatutCommandeSaisi(cmd.statut || cmd.statut_commande || 'LIVRÉ');
    setStocksArticlesCache({});
    
    if (cmd.id_partenaire) {
      handleChangementPartenaire(cmd.id_partenaire, true);
      if (cmd.id_depot) setDepotId(cmd.id_depot);
    }

    let lignesInit = [];
    try {
      const { data: lignesData, error } = await supabase
        .from('commandes_livraison_lignes')
        .select('*')
        .eq('id_commande', cmd.id);

      if (!error && lignesData) {
        lignesInit = lignesData.map(l => ({
          id_article: l.id_article,
          designation: l.designation,
          quantite: l.quantite,
          prix_unitaire: l.prix_unitaire
        }));
      } else {
        lignesInit = lignesCommandesMap[cmd.id] || [];
      }
    } catch (err) {
      lignesInit = lignesCommandesMap[cmd.id] || [];
    }

    setLignesSaisies(lignesInit);

    const numClean = cmd.numero_commande ? cmd.numero_commande.replace('CMD-', '') : '1';
    setSnapshotCommandeInitiale({
      dateCommande: dateCmdStr,
      idPartenaire: cmd.id_partenaire || '',
      numeroCommande: numClean,
      numeroClient: cmd.numero_client || '',
      adresseLivraison: cmd.adresse_livraison || '',
      montantSaisi: cmd.montant_commande !== undefined && cmd.montant_commande !== null ? String(cmd.montant_commande) : '0',
      pointADepart: cmd.point_a || '',
      natureColis: cmd.nature_colis || '',
      fraisLivraisonSaisi: cmd.frais_livraison !== undefined && cmd.frais_livraison !== null ? String(cmd.frais_livraison) : '',
      livreurAssigne: cmd.vendeur_livreur || '',
      statutCommandeSaisi: cmd.statut || cmd.statut_commande || 'LIVRÉ',
      lignes: lignesInit
    });

    setVueActive('CREATION');
  };

  const supprimerCommandeActuelle = async () => {
    if (!commandeEnEdition || sauvegardeEnCours || documentEnLectureSeule) return;

    const dateCmdStr = commandeEnEdition.date_commande || dateDuJourStr;
    if (dateCmdStr < dateDuJourStr) {
      alert(`❌ Suppression interdite : ce document appartient à une journée clôturée (${dateCmdStr}).`);
      return;
    }

    const currentEntId = entrepriseId || propEntrepriseId || '4TS-234321';
    if (!permissions.peut_supprimer) {
      alert('⛔ Accès refusé : Votre profil ne dispose pas des droits de suppression.');
      return;
    }
    if (!confirm(`Voulez-vous vraiment supprimer la commande ${commandeEnEdition.numero_commande} ?`)) return;

    setSauvegardeEnCours(true);
    try {
      const statutPrecBrut = commandeEnEdition.statut || commandeEnEdition.statut_commande || 'LIVRÉ';
      const statutPrecedentNorm = (statutPrecBrut || '').trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const etaitLivre = statutPrecedentNorm === 'LIVRE' || statutPrecedentNorm === 'LIVRÉ';
      const partObj = partenaires.find(p => String(p.id) === String(commandeEnEdition.id_partenaire));
      const estSansStockage = !partObj || (partObj.statut_stockage || partObj.statut || '').toString().trim().toUpperCase() === 'SANS_STOCKAGE';

      if (!estSansStockage && etaitLivre) {
        const empIdTrouve = trouverIdEmplacementLivreur(commandeEnEdition.vendeur_livreur);
        const lignesCmd = lignesCommandesMap[commandeEnEdition.id] || [];
        
        const depotRestitution = commandeEnEdition.id_depot || (depotId !== 'AUCUN_DEPOT' ? depotId : (partObj?.id_depot || null));

        for (const item of lignesCmd) {
          const articleConcerne = articles.find(a => String(a.id_article) === String(item.id_article));
          const estSuiviArticle = articleConcerne ? (articleConcerne.suivi_stock ?? articleConcerne.Suivi_Stock ?? true) : true;

          if (estSuiviArticle !== false && estSuiviArticle !== 0) {
            const payloadRestitution = {
              id_entreprise: currentEntId,
              module: moduleActuel,
              type_mouvement: 'ENTREE',
              id_depot_source: null,
              id_emplacement_source: null,
              id_depot_destination: depotRestitution,
              id_emplacement_destination: empIdTrouve,
              id_article: parseInt(item.id_article),
              quantite: item.quantite,
              motif_remarque: `RESTITUTION STOCK SUPPRESSION ${commandeEnEdition.numero_commande}`,
              created_at: `${commandeEnEdition.date_commande || new Date().toISOString().split('T')[0]}T12:00:00`,
            };
            const { error: errRestit } = await supabase.from('mouvements_stock').insert([payloadRestitution]);
            if (errRestit) {
              localSync.ajouterFileAttente('INSERT', 'mouvements_stock', payloadRestitution);
            }
          }
        }
      }

      const { error: errLignes } = await supabase.from('commandes_livraison_lignes').delete().eq('id_commande', commandeEnEdition.id);
      if (errLignes) {
        localSync.ajouterFileAttente('DELETE', 'commandes_livraison_lignes', { id_commande: commandeEnEdition.id });
      }
      
      const { error } = await supabase.from('commandes_livraison_en_tete').delete().eq('id', commandeEnEdition.id);
      if (error) {
        localSync.ajouterFileAttente('DELETE', 'commandes_livraison_en_tete', { id: commandeEnEdition.id });
      }

      const commandesMaj = commandes.filter(c => c.id !== commandeEnEdition.id);
      setCommandes(commandesMaj);
      localSync.sauvegarderDonneesLocales(`commandes_livraison_${currentEntId}`, commandesMaj);

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
      setStatutCommandeSaisi('LIVRÉ');
      setCommandeEnEdition(null);
      setSnapshotCommandeInitiale(null);
      setDocumentEnLectureSeule(false);
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
    if (sauvegardeEnCours || documentEnLectureSeule) return;
    
    const currentEntId = entrepriseId || propEntrepriseId || '4TS-234321';

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

    if (dateNormalisee < dateDuJourStr) {
      alert(`❌ Modification interdite : impossible d'enregistrer sur la date du ${dateNormalisee} car cette journée est clôturée.`);
      return;
    }

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
      alert('⚠️ Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (!partenaireSansStockage && (!depotId || depotId === 'AUCUN_DEPOT')) {
      alert('🚫 ACTION BLOQUÉE : Veuillez sélectionner obligatoirement un dépôt d’origine.');
      setSauvegardeEnCours(false);
      return;
    }

    if (partenaireSansStockage && !pointADepart.trim()) {
      alert('⚠️ Pour un partenaire sans stockage, veuillez préciser le Point A.');
      return;
    }
    
    if (!partenaireSansStockage && lignesSaisies.length === 0) {
      alert('⚠️ Le panier est vide. Veuillez ajouter au moins un article.');
      return;
    }

    setSauvegardeEnCours(true);
    try {
      const numeroComplet = `CMD-${numeroCommande.trim().toUpperCase()}`;

      if (!commandeEnEdition) {
        const doublonTrouve = commandes.find(c => 
          c.numero_commande === numeroComplet &&
          c.date_commande === dateNormalisee &&
          String(c.id_partenaire) === String(idPartenaire)
        );

        if (doublonTrouve) {
          alert(`❌ Cette commande (${numeroComplet}) a déjà été créée pour ce partenaire à la date du ${formaterDateEnFrancais(dateNormalisee)}.`);
          setSauvegardeEnCours(false);
          return;
        }
      }

      const empIdTrouve = trouverIdEmplacementLivreur(livreurAssigne);

      const statutNormVerif = (statutCommandeSaisi || '').trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const estLivreVerif = statutNormVerif === 'LIVRE' || statutNormVerif === 'LIVRÉ';

      if (!partenaireSansStockage && estLivreVerif) {
        for (const item of lignesSaisies) {
          const articleConcerne = articles.find(a => String(a.id_article) === String(item.id_article));
          const estSuiviArticle = articleConcerne ? (articleConcerne.suivi_stock ?? articleConcerne.Suivi_Stock ?? true) : true;

          if (estSuiviArticle !== false && estSuiviArticle !== 0) {
            const stockEmp = await recupererStockReelRPC(item.id_article, livreurAssigne);
            if (stockEmp < item.quantite) {
              alert(
                `🚫 ACTION BLOQUÉE (RUPTURE DE STOCK) :\n\nStock insuffisant pour l'article "${item.designation}".\n(Stock disponible : ${stockEmp} | Quantité commandée : ${item.quantite})`
              );
              setSauvegardeEnCours(false);
              return;
            }
          }
        }
      }

      const partObj = partenaires.find(p => String(p.id) === String(idPartenaire));
      const depotSourceMvt = depotId !== 'AUCUN_DEPOT' ? depotId : null;

      let payload = {
        id_entreprise: currentEntId,
        module: moduleActuel,
        numero_commande: numeroComplet,
        date_commande: dateNormalisee,
        id_partenaire: idPartenaire,
        nom_partenaire: partObj ? (partObj.nom_fournisseur || partObj.nom) : '',
        id_depot: depotSourceMvt,
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
        const statutPrecBrut = commandeEnEdition.statut || commandeEnEdition.statut_commande || 'LIVRÉ';
        const statutPrecedentNorm = (statutPrecBrut || '').trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const etaitDejaLivre = statutPrecedentNorm === 'LIVRE' || statutPrecedentNorm === 'LIVRÉ';
        idCmdCourante = commandeEnEdition.id;

        const { error: errUp } = await supabase
          .from('commandes_livraison_en_tete')
          .update(payload)
          .eq('id', commandeEnEdition.id);

        if (errUp) {
          localSync.ajouterFileAttente('UPDATE', 'commandes_livraison_en_tete', { ...payload, id: commandeEnEdition.id });
        }

        const { error: errDel } = await supabase.from('commandes_livraison_lignes').delete().eq('id_commande', commandeEnEdition.id);
        if (errDel) {
          localSync.ajouterFileAttente('DELETE', 'commandes_livraison_lignes', { id_commande: commandeEnEdition.id });
        }

        if (!partenaireSansStockage && etaitDejaLivre && !estLivreVerif) {
          const lignesCmdPrecedentes = lignesCommandesMap[commandeEnEdition.id] || [];
          const depotRestitution = depotSourceMvt;

          for (const item of lignesCmdPrecedentes) {
            const articleConcerne = articles.find(a => String(a.id_article) === String(item.id_article));
            const estSuiviArticle = articleConcerne ? (articleConcerne.suivi_stock ?? articleConcerne.Suivi_Stock ?? true) : true;

            if (estSuiviArticle !== false && estSuiviArticle !== 0) {
              const payloadRestitution = {
                id_entreprise: currentEntId,
                module: moduleActuel,
                type_mouvement: 'ENTREE',
                id_depot_source: null,
                id_emplacement_source: null,
                id_depot_destination: depotRestitution,
                id_emplacement_destination: empIdTrouve,
                id_article: parseInt(item.id_article),
                quantite: item.quantite,
                motif_remarque: `RESTITUTION STOCK MODIFICATION ${numeroComplet}`,
                created_at: `${dateNormalisee}T12:00:00`,
              };
              const { error: errRestit } = await supabase.from('mouvements_stock').insert([payloadRestitution]);
              if (errRestit) {
                localSync.ajouterFileAttente('INSERT', 'mouvements_stock', payloadRestitution);
              }
            }
          }
        }

        if (!partenaireSansStockage && estLivreVerif && !etaitDejaLivre) {
          for (const item of lignesSaisies) {
            const articleConcerne = articles.find(a => String(a.id_article) === String(item.id_article));
            const estSuiviArticle = articleConcerne ? (articleConcerne.suivi_stock ?? articleConcerne.Suivi_Stock ?? true) : true;

            if (estSuiviArticle !== false && estSuiviArticle !== 0) {
              const payloadMouvement = {
                id_entreprise: currentEntId,
                module: moduleActuel,
                type_mouvement: 'SORTIE',
                id_depot_source: depotSourceMvt,
                id_emplacement_source: empIdTrouve,
                id_depot_destination: null,
                id_article: parseInt(item.id_article),
                quantite: item.quantite,
                motif_remarque: `LIVRAISON EFFECTIVE ${numeroComplet} (${partObj ? (partObj.nom_fournisseur || partObj.nom) : ''})`,
                created_at: `${dateNormalisee}T12:00:00`,
              };
              const { error: errMvt } = await supabase.from('mouvements_stock').insert([payloadMouvement]);
              if (errMvt) {
                localSync.ajouterFileAttente('INSERT', 'mouvements_stock', payloadMouvement);
              }
            }
          }
        }

      } else {
        const idLocal = `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const { data: cmdInseree, error: errCmd } = await supabase
          .from('commandes_livraison_en_tete')
          .insert([payload])
          .select()
          .single();

        if (errCmd) {
          idCmdCourante = idLocal;
          const cmdLocale = { ...payload, id: idLocal, created_at: new Date().toISOString() };
          const nouvelleListeCmd = [cmdLocale, ...commandes];
          setCommandes(nouvelleListeCmd);
          localSync.sauvegarderDonneesLocales(`commandes_livraison_${currentEntId}`, nouvelleListeCmd);
          localSync.ajouterFileAttente('INSERT', 'commandes_livraison_en_tete', payload);
        } else if (cmdInseree) {
          idCmdCourante = cmdInseree.id;
        }

        if (!partenaireSansStockage && estLivreVerif) {
          for (const item of lignesSaisies) {
            const articleConcerne = articles.find(a => String(a.id_article) === String(item.id_article));
            const estSuiviArticle = articleConcerne ? (articleConcerne.suivi_stock ?? articleConcerne.Suivi_Stock ?? true) : true;

            if (estSuiviArticle !== false && estSuiviArticle !== 0) {
              const payloadMouvement = {
                id_entreprise: currentEntId,
                module: moduleActuel,
                type_mouvement: 'SORTIE',
                id_depot_source: depotSourceMvt,
                id_emplacement_source: empIdTrouve,
                id_depot_destination: null,
                id_article: parseInt(item.id_article),
                quantite: item.quantite,
                motif_remarque: `LIVRAISON EFFECTIVE ${numeroComplet} (${partObj ? (partObj.nom_fournisseur || partObj.nom) : ''})`,
                created_at: `${dateNormalisee}T12:00:00`,
              };
              const { error: errMvt } = await supabase.from('mouvements_stock').insert([payloadMouvement]);
              if (errMvt) {
                localSync.ajouterFileAttente('INSERT', 'mouvements_stock', payloadMouvement);
              }
            }
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

        if (errLignes) {
          localSync.ajouterFileAttente('INSERT', 'commandes_livraison_lignes', payloadLignes);
        }

        const mapLignesMaj = { ...lignesCommandesMap, [idCmdCourante]: lignesSaisies };
        setLignesCommandesMap(mapLignesMaj);
        localSync.sauvegarderDonneesLocales(`lignes_commandes_${currentEntId}`, mapLignesMaj);
      }

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
      setStatutCommandeSaisi('LIVRÉ');
      setCommandeEnEdition(null);
      setSnapshotCommandeInitiale(null);
      setDocumentEnLectureSeule(false);
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
    let matchZone = true;
    let matchDate = true;
    let matchStatut = true;

    if (filtrePartenaire) {
      matchPartenaire = String(cmd.id_partenaire) === String(filtrePartenaire);
    }
    if (filtreLivreur) {
      matchLivreur = (cmd.vendeur_livreur || '').trim().toUpperCase() === filtreLivreur.trim().toUpperCase();
    }
    if (filtreZone) {
      const zoneCmd = (cmd.zone_effective_livraison || cmd.adresse_livraison || '').trim().toUpperCase();
      matchZone = zoneCmd === filtreZone.trim().toUpperCase() || zoneCmd.includes(filtreZone.trim().toUpperCase());
    }
    if (filtreDateDebut && filtreDateFin) {
      matchDate = cmd.date_commande >= filtreDateDebut && cmd.date_commande <= filtreDateFin;
    } else if (filtreDateDebut) {
      matchDate = cmd.date_commande >= filtreDateDebut;
    } else if (filtreDateFin) {
      matchDate = cmd.date_commande <= filtreDateFin;
    }
    if (filtreStatut) {
      const statutCMDReel = (cmd.statut || cmd.statut_commande || 'LIVRÉ').trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const filtreStatutNorm = filtreStatut.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      matchStatut = statutCMDReel === filtreStatutNorm;
    }

    return matchPartenaire && matchLivreur && matchZone && matchDate && matchStatut;
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
  
  const numericVerseRecette = parseFloat(totalVerseRecetteGlobal) || 0;
  const numericVerseFrais = parseFloat(totalVerseFraisLivraison) || 0;

  const ecartRecetteGlobale = numericVerseRecette - totalEncaisseGlobalCloture;
  const ecartFraisLivraison = numericVerseFrais - totalFraisLivraisonGlobalCloture;

  const validerEtVerserCloture = async (caisseId, nomCaisse) => {
    if (sauvegardeEnCours) return;
    const currentEntId = entrepriseId || propEntrepriseId || '4TS-234321';
    const montantFraisVerséNum = parseFloat(totalVerseFraisLivraison) || 0;
    if (montantFraisVerséNum <= 0 && totalVerseRecetteGlobal === '') {
      alert('⚠️ Veuillez renseigner au moins un montant versé.');
      return;
    }
    if (!caisseId) {
      alert('⚠️ Veuillez sélectionner une caisse de destination.');
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

      const libelleCloture = `VERS. CLÔTURE LIVRAISON ${clotureLivreur ? `- ${clotureLivreur}` : ''} (${clotureDateDebut === clotureDateFin ? clotureDateDebut : `Du ${clotureDateDebut} au ${clotureDateFin}`})`;

      const payloadCloture = {
        id_entreprise: currentEntId,
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
      if (errCloture) {
        localSync.ajouterFileAttente('INSERT', 'clotures_caisses', payloadCloture);
      }

      const payloadMvt = {
        id_entreprise: currentEntId,
        module: moduleActuel,
        id_caisse: finalCaisseId,
        type_mouvement: 'ENTREE',
        montant: montantFraisVerséNum,
        libelle: libelleCloture.trim().toUpperCase(),
        piece_physique: codePieceCloture,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('mouvements_caisse').insert([payloadMvt]);
      if (error) {
        localSync.ajouterFileAttente('INSERT', 'mouvements_caisse', payloadMvt);
      }

      alert(`✅ Clôture enregistrée sous le numéro ${codePieceCloture}.`);
      
      setCaisseSelectionneeCloture(caisseId);
      setModalCaisseClotureOuverte(false);
      setTotalVerseRecetteGlobal('');
      setTotalVerseFraisLivraison('');
      await chargerDonnees();
    } catch (err) {
      alert('Erreur lors du versement : ' + err.message);
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

  const extraireNumero = (numStr) => {
    if (!numStr) return 0;
    const match = numStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const commandesRapportTriees = [...commandesRapport].sort((a, b) => {
    let valA, valB;

    if (colonneTri === 'numero') {
      const numA = extraireNumero(a.numero_commande);
      const numB = extraireNumero(b.numero_commande);
      return ordreTri === 'asc' ? numA - numB : numB - numA;
    } else if (colonneTri === 'date') {
      valA = a.date_commande || '';
      valB = b.date_commande || '';
      if (valA !== valB) return ordreTri === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return extraireNumero(a.numero_commande) - extraireNumero(b.numero_commande);
    } else if (colonneTri === 'partenaire') {
      valA = (a.nom_partenaire || '').toUpperCase();
      valB = (b.nom_partenaire || '').toUpperCase();
      if (valA !== valB) return ordreTri === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return extraireNumero(a.numero_commande) - extraireNumero(b.numero_commande);
    } else if (colonneTri === 'article') {
      const lignesA = lignesCommandesMap[a.id] || [];
      valA = lignesA.length > 0 ? lignesA.map(l => `${l.designation} x${l.quantite}`).join(', ') : '';
      const lignesB = lignesCommandesMap[b.id] || [];
      valB = lignesB.length > 0 ? lignesB.map(l => `${l.designation} x${l.quantite}`).join(', ') : '';
      if (valA !== valB) return ordreTri === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return extraireNumero(a.numero_commande) - extraireNumero(b.numero_commande);
    } else if (colonneTri === 'montant') {
      valA = Number(a.montant_commande || 0);
      valB = Number(b.montant_commande || 0);
      if (valA !== valB) return ordreTri === 'asc' ? valA - valB : valB - valA;
      return extraireNumero(a.numero_commande) - extraireNumero(b.numero_commande);
    } else if (colonneTri === 'frais') {
      valA = Number(a.frais_livraison || 0);
      valB = Number(b.frais_livraison || 0);
      if (valA !== valB) return ordreTri === 'asc' ? valA - valB : valB - valA;
      return extraireNumero(a.numero_commande) - extraireNumero(b.numero_commande);
    } else {
      return extraireNumero(a.numero_commande) - extraireNumero(b.numero_commande);
    }
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
                  <span class="label">Total Commandes</span>
                  <span class="valeur">${commandesRapport.length}</span>
                </div>
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
    <div className="space-y-2 text-[10px] font-sans px-0.5 max-w-full overflow-x-hidden">
      
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

      {/* Barre de navigation supérieure */}
      <div className="bg-white px-2 py-1.5 rounded-xl border border-slate-200 shadow-2xs flex flex-row justify-between items-center gap-1 overflow-hidden">
        <div className="flex items-center gap-1 min-w-0 shrink-0">
          <h3 className="font-extrabold text-slate-900 uppercase text-[9px] flex items-center gap-0.5 shrink-0">
            <span>📦</span> LIVRAISON
          </h3>
          {roleUtilisateur && (
            <span className="text-[7px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded-full font-bold border border-slate-200 truncate max-w-[60px]">
              {roleUtilisateur.nom_role || roleUtilisateur.nom || 'Employé'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setVueActive('LISTE');
              setDocumentEnLectureSeule(false);
            }}
            className={`font-bold px-2 py-1 rounded-lg transition shadow-2xs text-[8.5px] border whitespace-nowrap ${
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
                setSnapshotCommandeInitiale(null);
                setDocumentEnLectureSeule(false);
                setNumeroCommande('1');
                setIdPartenaire('');
                setDepotId('AUCUN_DEPOT');
                setPartenaireSansStockage(false);
                setPointADepart('');
                setNumeroClient('');
                setNatureColis('');
                setMontantSaisi('');
                setAdresseLivraison('');
                setZoneGrilleSelectionnee('');
                setFraisLivraisonSaisi('');
                setLivreurAssigne('');
                setStatutCommandeSaisi('LIVRÉ');
                setLignesSaisies([]);
                setStocksArticlesCache({});
                setVueActive('CREATION');
              }}
              className={`font-bold px-2 py-1 rounded-lg transition shadow-2xs text-[8.5px] border whitespace-nowrap ${
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
            onClick={() => {
              setVueActive('RAPPORT');
              setDocumentEnLectureSeule(false);
            }}
            className={`font-bold px-2 py-1 rounded-lg transition shadow-2xs text-[8.5px] border whitespace-nowrap ${
              vueActive === 'RAPPORT' 
                ? 'bg-blue-900 text-white border-blue-900' 
                : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
            }`}
          >
            Rapport
          </button>

          <button
            type="button"
            onClick={() => {
              setVueActive('CLOTURE');
              setDocumentEnLectureSeule(false);
            }}
            className={`font-bold px-2 py-1 rounded-lg transition shadow-2xs text-[8.5px] border whitespace-nowrap ${
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
        <div className="space-y-2">
          <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setSousOngletCloture('nouveau')}
              className={`flex-1 py-1 px-1 rounded font-black text-[8.5px] uppercase transition shadow-2xs whitespace-nowrap text-center ${
                sousOngletCloture === 'nouveau' ? 'bg-emerald-900 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              Nouvelle Clôture
            </button>
            <button
              type="button"
              onClick={() => setSousOngletCloture('liste')}
              className={`flex-1 py-1 px-1 rounded font-black text-[8.5px] uppercase transition shadow-2xs whitespace-nowrap text-center ${
                sousOngletCloture === 'liste' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              Liste Clôture ({cloturesEffectuees.length})
            </button>
          </div>

          {sousOngletCloture === 'nouveau' && (
            <div className="space-y-2">
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                  <span className="font-black text-emerald-900 uppercase text-[8.5px] flex items-center gap-1">
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
                      className="text-emerald-600 hover:text-emerald-700 font-bold text-[8px] underline"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1 items-end">
                  <div>
                    <label className="block font-black mb-0.5 text-[7.5px] text-slate-700 uppercase truncate">Début</label>
                    <input
                      type="date"
                      value={clotureDateDebut}
                      onChange={(e) => setClotureDateDebut(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[9px]"
                    />
                  </div>

                  <div>
                    <label className="block font-black mb-0.5 text-[7.5px] text-slate-700 uppercase truncate">Fin</label>
                    <input
                      type="date"
                      value={clotureDateFin}
                      onChange={(e) => setClotureDateFin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[9px]"
                    />
                  </div>

                  <div>
                    <label className="block font-black mb-0.5 text-[7.5px] text-slate-700 uppercase truncate">Livreur</label>
                    <button
                      type="button"
                      onClick={() => { setRechercheClotureLivreurInput(''); setModalClotureLivreurOuverte(true); }}
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[8.5px] uppercase text-left flex justify-between items-center truncate"
                    >
                      <span className="truncate">{clotureLivreur || 'TOUS'}</span>
                      <span className="text-slate-400 shrink-0 text-[7px]">🔍</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                <div className="min-w-0 pr-1">
                  <h4 className="font-black text-[9px] uppercase tracking-wider text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                    EN ATTENTE DE CLOTURE
                  </h4>
                  <p className="text-[8px] text-slate-600 font-bold mt-0.5 truncate">
                    Période : <span className="text-slate-900">{clotureDateDebut === clotureDateFin ? formaterDateJJMMAAAA(clotureDateDebut) : `Du ${formaterDateJJMMAAAA(clotureDateDebut)} au ${formaterDateJJMMAAAA(clotureDateFin)}`}</span>
                  </p>
                </div>
                <div className="bg-white px-1.5 py-0.5 rounded-lg border border-slate-200 text-[8px] font-bold text-slate-800 shrink-0 whitespace-nowrap shadow-2xs">
                  Livreurs : <strong className="text-emerald-700">{listeResumeCloture.length}</strong>
                </div>
              </div>

              {listeResumeCloture.length === 0 ? (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-center text-slate-400 font-bold italic text-[9px]">
                  Aucune commande livrée en attente de clôture pour cette période.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {listeResumeCloture.map((item, index) => {
                    const resteAVerser = item.montantTotalEncaisse - item.totalFraisLivraison;
                    return (
                      <div key={index} className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm space-y-1.5 text-slate-900">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                          <span className="font-black text-[10px] uppercase text-blue-700 flex items-center gap-1 truncate">
                            🛵 {item.nom}
                          </span>
                          <span className="bg-orange-100 text-orange-800 font-extrabold px-1.5 py-0.2 rounded-full text-[8px] shrink-0">
                            {item.nombreCommandes} cmd(s)
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center pt-0.5">
                          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="block text-[7.5px] text-slate-500 uppercase font-bold">Encaissé</span>
                            <span className="font-mono font-black text-emerald-700 text-[10px]">{item.montantTotalEncaisse.toLocaleString('fr-FR')} F</span>
                          </div>
                          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="block text-[7.5px] text-slate-500 uppercase font-bold">Frais</span>
                            <span className="font-mono font-bold text-slate-700 text-[10px]">{item.totalFraisLivraison.toLocaleString('fr-FR')} F</span>
                          </div>
                          <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                            <span className="block text-[7.5px] text-emerald-800 uppercase font-bold">Total / Net</span>
                            <span className="font-mono font-black text-emerald-900 text-[10px]">{resteAVerser.toLocaleString('fr-FR')} F</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="bg-slate-100 text-slate-900 p-2.5 rounded-xl border border-slate-300 space-y-1.5 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                      <span className="font-black text-[9px] uppercase tracking-wider text-slate-900 flex items-center gap-1 truncate">
                        📋 CLÔTURE & VERSEMENT GLOBAL
                      </span>
                      {caisseSelectionneeCloture && (
                        <span className="bg-white text-slate-800 px-1.5 py-0.2 rounded text-[7.5px] font-bold border border-slate-300 truncate max-w-[90px]">
                          {caisses.find(c => String(c.id) === String(caisseSelectionneeCloture))?.nom_caisse || caisseSelectionneeCloture}
                        </span>
                      )}
                    </div>

                    <div className="bg-white p-1.5 rounded-lg border border-slate-200 flex items-center justify-between gap-1.5">
                      <div className="min-w-0 pr-1">
                        <span className="block font-black text-[8px] text-slate-800 uppercase truncate">1. Recette Globale (Partenaire)</span>
                        <span className="font-mono text-[8px] text-slate-500 font-bold">Attendu: {totalEncaisseGlobalCloture.toLocaleString('fr-FR')} F</span>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="w-20">
                          <input
                            type="number"
                            value={totalVerseRecetteGlobal}
                            onChange={(e) => setTotalVerseRecetteGlobal(e.target.value)}
                            placeholder=""
                            className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono text-[10px] font-black text-slate-900 focus:outline-none focus:border-slate-500"
                          />
                        </div>
                        <div className="text-right min-w-[55px]">
                          <span className="block text-[7px] text-slate-500 uppercase font-bold">Écart</span>
                          <span className="font-mono text-[9px] font-black text-slate-900">{ecartRecetteGlobale.toLocaleString('fr-FR')} F</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-1.5 rounded-lg border border-slate-200 flex items-center justify-between gap-1.5">
                      <div className="min-w-0 pr-1">
                        <span className="block font-black text-[8px] text-slate-800 uppercase truncate">2. Frais de Livraison (Entreprise)</span>
                        <span className="font-mono text-[8px] text-slate-500 font-bold">Attendu: {totalFraisLivraisonGlobalCloture.toLocaleString('fr-FR')} F</span>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="w-20">
                          <input
                            type="number"
                            value={totalVerseFraisLivraison}
                            onChange={(e) => setTotalVerseFraisLivraison(e.target.value)}
                            placeholder=""
                            className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono text-[10px] font-black text-slate-900 focus:outline-none focus:border-slate-500"
                          />
                        </div>
                        <div className="text-right min-w-[55px]">
                          <span className="block text-[7px] text-slate-500 uppercase font-bold">Écart</span>
                          <span className="font-mono text-[9px] font-black text-slate-900">{ecartFraisLivraison.toLocaleString('fr-FR')} F</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        disabled={sauvegardeEnCours}
                        onClick={() => setModalCaisseClotureOuverte(true)}
                        className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-black py-1.5 rounded-lg text-[9px] uppercase tracking-wider transition shadow-sm border border-slate-900 truncate px-1"
                      >
                        {sauvegardeEnCours ? 'Enregistrement...' : (caisseSelectionneeCloture 
                          ? `Valider vers : ${caisses.find(c => String(c.id) === String(caisseSelectionneeCloture))?.nom_caisse || 'Caisse'}` 
                          : 'Valider et clôturer (Choisir caisse) ➔')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {sousOngletCloture === 'liste' && (
            <div className="space-y-2">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                <h4 className="font-black text-slate-900 uppercase text-[9px]">
                  📋 HISTORIQUE DES CLÔTURES ({cloturesEffectuees.length})
                </h4>
              </div>

              {cloturesEffectuees.length === 0 ? (
                <div className="bg-white p-6 text-center text-slate-400 font-bold italic rounded-xl border border-slate-200 text-[9px]">
                  Aucune clôture de caisse enregistrée.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 uppercase text-[8px] font-black border-b border-slate-200">
                          <th className="p-1.5">Date</th>
                          <th className="p-1.5 font-mono">N° Pièce</th>
                          <th className="p-1.5 text-right">Attendu</th>
                          <th className="p-1.5 text-right">Versé</th>
                          <th className="p-1.5 text-right">Écart</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[9px]">
                        {cloturesEffectuees.map((cl) => {
                          const dateObj = new Date(cl.created_at || cl.date_debut);
                          const dateFormatee = !isNaN(dateObj) ? dateObj.toLocaleDateString('fr-FR') : '-';
                          const atten = Number(cl.montant_total_encaisse || cl.montant_attendu || 0);
                          const verse = Number(cl.montant_reel_verse || cl.montant_verse || 0);
                          const ecart = Number(cl.ecart_caisse || cl.ecart || 0);

                          return (
                            <tr key={cl.id} className="hover:bg-slate-50 transition">
                              <td className="p-1.5 font-bold text-slate-700 whitespace-nowrap">{dateFormatee}</td>
                              <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{cl.code_cloture || 'LIVR-00'}</td>
                              <td className="p-1.5 text-right font-mono font-bold text-slate-700">{atten.toLocaleString('fr-FR')}</td>
                              <td className="p-1.5 text-right font-mono font-black text-emerald-700">{verse.toLocaleString('fr-FR')}</td>
                              <td className={`p-1.5 text-right font-mono font-bold ${ecart === 0 ? 'text-slate-600' : 'text-slate-900'}`}>
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
        <div className="space-y-2">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1">
              <span className="font-black text-blue-900 uppercase text-[9px] flex items-center gap-1">
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
                  className="text-blue-600 hover:text-blue-700 font-bold text-[8.5px] underline"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase">Début</label>
                  <input
                    type="date"
                    value={rapportDateDebut}
                    onChange={(e) => setRapportDateDebut(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[10px]"
                  />
                </div>

                <div>
                  <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase">Fin</label>
                  <input
                    type="date"
                    value={rapportDateFin}
                    onChange={(e) => setRapportDateFin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[10px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase">Livreur</label>
                  <button
                    type="button"
                    onClick={() => { setRechercheRapportLivreurInput(''); setModalRapportLivreurOuverte(true); }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[9px] uppercase text-left flex justify-between items-center truncate"
                  >
                    <span className="truncate">{rapportLivreur || 'TOUS'}</span>
                    <span className="text-slate-400 shrink-0 text-[7px]">🔍</span>
                  </button>
                </div>

                <div>
                  <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase">Partenaire</label>
                  <button
                    type="button"
                    onClick={() => { setRechercheRapportPartenaireInput(''); setModalRapportPartenaireOuverte(true); }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[9px] text-left flex justify-between items-center truncate"
                  >
                    <span className="truncate">
                      {rapportPartenaire ? (partenaires.find(p => String(p.id) === String(rapportPartenaire))?.nom_fournisseur || partenaires.find(p => String(p.id) === String(rapportPartenaire))?.nom || 'TOUS') : 'TOUS'}
                    </span>
                    <span className="text-slate-400 shrink-0 text-[7px]">🔍</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div ref={rapportRef} className="space-y-1.5">
            <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-xl border border-slate-800 shadow-sm flex flex-col gap-1">
              <div className="flex flex-row justify-between items-center gap-1">
                <h4 className="titre-rapport-principal font-black text-[9px] uppercase tracking-wider text-orange-400 truncate">
                  RAPPORT DE LIVRAISON
                </h4>
                
                <div className="flex items-center gap-1 shrink-0">
                  <div className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-[8px] font-bold whitespace-nowrap">
                    Total: <strong className="text-emerald-400">{commandesRapport.length}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={imprimerRapport}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black px-1.5 py-0.5 rounded text-[8px] transition flex items-center gap-0.5 shadow-2xs print-hide whitespace-nowrap"
                  >
                    🖨️ Imprimer
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-0.5 flex items-center text-[8.5px] text-slate-300 font-extrabold truncate">
                Livreur : <span className="text-blue-400 uppercase ml-1">{nomLivreurRapport}</span>
              </div>
            </div>

            {chargement && commandes.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-bold bg-white rounded-xl border border-slate-200">Chargement...</div>
            ) : commandesRapport.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-bold italic bg-white rounded-xl border border-slate-200 text-[9px]">
                Aucune livraison validée ne correspond à vos critères.
              </div>
            ) : (
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase text-[8px] font-black border-b border-slate-200">
                        <th className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('date')}>
                          Date {colonneTri === 'date' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('numero')}>
                          N° Cmd {colonneTri === 'numero' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                        {!rapportPartenaire && (
                          <th className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('partenaire')}>
                            Partenaire {colonneTri === 'partenaire' && (ordreTri === 'asc' ? '▲' : '▼')}
                          </th>
                        )}
                        <th className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('article')}>
                          Article {colonneTri === 'article' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                        {!rapportLivreur && <th className="p-1.5">Livreur</th>}
                        <th className="p-1.5 text-right cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('montant')}>
                          Montant {colonneTri === 'montant' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="p-1.5 text-right cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('frais')}>
                          Frais {colonneTri === 'frais' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[9px]">
                      {commandesRapportTriees.map((cmd) => {
                        const lignesCmd = lignesCommandesMap[cmd.id] || [];
                        return (
                          <tr key={cmd.id} className="hover:bg-slate-50 transition">
                            <td className="p-1.5 font-bold text-slate-600 whitespace-nowrap">{formaterDateJJMMAAAA(cmd.date_commande)}</td>
                            <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{cmd.numero_commande}</td>
                            {!rapportPartenaire && <td className="p-1.5 font-extrabold text-slate-900 truncate max-w-[80px]">{cmd.nom_partenaire}</td>}
                            <td className="p-1.5">
                              {lignesCmd.length > 0 ? (
                                <div className="flex flex-wrap gap-0.5">
                                  {lignesCmd.map((l, idx) => (
                                    <span key={idx} className="bg-slate-100 text-slate-800 font-bold px-1 py-0.2 rounded text-[8px]">
                                      {l.designation} <span className="text-orange-600 font-black">x{l.quantite}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : cmd.point_a ? (
                                <span className="text-slate-800 font-bold text-[8px]">
                                  📍 <strong className="text-slate-900">{cmd.point_a}</strong> ➔ <strong className="text-orange-600">{cmd.adresse_livraison}</strong>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Sans stockage</span>
                              )}
                            </td>
                            {!rapportLivreur && <td className="p-1.5 font-bold text-blue-700 uppercase truncate max-w-[70px]">{cmd.vendeur_livreur || '-'}</td>}
                            <td className="p-1.5 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                              {Number(cmd.montant_commande || 0).toLocaleString('fr-FR')}
                            </td>
                            <td className="p-1.5 text-right font-mono font-bold text-slate-600 whitespace-nowrap">
                              {Number(cmd.frais_livraison || 0).toLocaleString('fr-FR')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-emerald-900 text-white p-2 border-t border-emerald-800 grid grid-cols-4 gap-1 text-[9px] font-black text-center">
                  <div>
                    <span className="block text-[7px] text-emerald-200 uppercase">Total Cmds</span>
                    <span className="text-emerald-300 font-mono">{commandesRapport.length}</span>
                  </div>
                  <div className="border-x border-emerald-700 px-0.5">
                    <span className="block text-[7px] text-emerald-200 uppercase">Montant</span>
                    <span className="text-emerald-300 font-mono">{totalMontantRapport.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="border-r border-emerald-700 pr-0.5">
                    <span className="block text-[7px] text-emerald-200 uppercase">Frais</span>
                    <span className="text-emerald-300 font-mono">{totalFraisRapport.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div>
                    <span className="block text-[7px] text-emerald-200 uppercase">À verser</span>
                    <span className="text-orange-300 font-mono">{resteAVerserRapport.toLocaleString('fr-FR')} F</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {vueActive === 'CREATION' && (
        <div className="space-y-2">
          {documentEnLectureSeule && (
            <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 p-2 rounded-xl text-center font-black text-[9px] uppercase shadow-xs">
              🔒 DOCUMENT EN CONSULTATION SEULE (Journée clôturée et verrouillée)
            </div>
          )}

          <div className="bg-white p-2.5 rounded-xl shadow-md border border-slate-200 space-y-2">
            <div className="grid grid-cols-12 gap-1.5">
              <div className="col-span-3">
                <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase">Date *</label>
                <input
                  type="date"
                  required
                  disabled={documentEnLectureSeule}
                  value={dateCommande}
                  onChange={(e) => handleChangementDate(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-white border border-slate-300 rounded p-1 font-bold text-slate-900 text-[10px] shadow-xs disabled:opacity-70"
                />
              </div>

              <div className="col-span-6">
                <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase">Partenaire *</label>
                <button
                  type="button"
                  disabled={documentEnLectureSeule}
                  onClick={() => { if (documentEnLectureSeule) return; setRecherchePartenaireInput(''); setModalPartenaireOuverte(true); }}
                  className="w-full bg-white border border-slate-300 rounded p-1 font-extrabold text-slate-900 text-[10px] shadow-xs text-left flex justify-between items-center truncate disabled:opacity-70"
                >
                  <span className="truncate">
                    {idPartenaire ? (partenaires.find(p => String(p.id) === String(idPartenaire))?.nom_fournisseur || partenaires.find(p => String(p.id) === String(idPartenaire))?.nom || '') : ''}
                  </span>
                  <span className="text-slate-400 shrink-0 text-[8px]">🔍</span>
                </button>
              </div>

              <div className="col-span-3">
                <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase">N° CMD *</label>
                <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden shadow-xs">
                  <span className="bg-slate-100 px-1 py-1 text-[8px] font-black text-orange-600 border-r border-slate-300 shrink-0">
                    CMD-
                  </span>
                  <input
                    ref={inputNumeroCmdRef}
                    type="text"
                    disabled={documentEnLectureSeule}
                    value={numeroCommande}
                    onChange={(e) => setNumeroCommande(e.target.value.replace(/[^0-9]/g, ''))}
                    onFocus={(e) => e.target.select()}
                    placeholder=""
                    className="w-full p-1 font-mono text-[9px] font-black text-slate-900 bg-white focus:outline-none disabled:opacity-70 text-center"
                  />
                </div>
              </div>
            </div>

            <div className="hidden">
              <select
                disabled
                value={depotId}
                className="w-full bg-slate-100 border border-slate-300 rounded p-1 font-extrabold text-orange-700 text-xs shadow-xs cursor-not-allowed"
              >
                <option value="AUCUN_DEPOT"></option>
                {depots.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom_depot || d.nom || d.libelle}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase truncate">
                  N° Client * <span className={`text-[7px] font-bold ${numeroClient.trim().length === 9 ? 'text-emerald-600' : 'text-rose-600'}`}>({numeroClient.trim().length}/9)</span>
                </label>
                <input
                  ref={inputNumeroClientRef}
                  type="text"
                  required
                  maxLength={9}
                  disabled={documentEnLectureSeule}
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
                  placeholder=""
                  className={`w-full bg-white border rounded p-1 font-bold text-slate-900 text-[10px] shadow-xs font-mono disabled:opacity-70 ${
                    numeroClient.trim().length === 9 ? 'border-emerald-500' : 'border-rose-300 focus:border-rose-500'
                  }`}
                />
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase truncate">Adresse *</label>
                <input
                  ref={inputAdresseRef}
                  type="text"
                  required
                  list="liste-zones-commandes"
                  disabled={documentEnLectureSeule}
                  value={adresseLivraison}
                  onChange={(e) => handleChangementAdresse(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder=""
                  className="w-full bg-white border border-slate-300 rounded p-1 font-bold text-slate-900 text-[10px] shadow-xs uppercase disabled:opacity-70"
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
                <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase truncate">Montant *</label>
                <input
                  ref={inputMontantRef}
                  type="number"
                  step="0.01"
                  required
                  disabled={documentEnLectureSeule}
                  value={montantSaisi}
                  onChange={(e) => setMontantSaisi(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder=""
                  className="w-full bg-white border border-slate-300 rounded p-1 font-bold text-slate-900 text-[10px] shadow-xs disabled:opacity-70"
                />
              </div>
            </div>

            {partenaireSansStockage && (
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <div>
                  <label className="block font-black mb-0.5 text-[8px] text-orange-700 uppercase">Point A (Départ) *</label>
                  <input
                    type="text"
                    required
                    disabled={documentEnLectureSeule}
                    value={pointADepart}
                    onChange={(e) => setPointADepart(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder=""
                    className="w-full bg-orange-50/50 border border-orange-300 rounded p-1 font-bold text-slate-900 text-[10px] shadow-xs uppercase disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="block font-black mb-0.5 text-[8px] text-slate-700 uppercase">Nature colis</label>
                  <input
                    type="text"
                    disabled={documentEnLectureSeule}
                    value={natureColis}
                    onChange={(e) => setNatureColis(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder=""
                    className="w-full bg-white border border-slate-300 rounded p-1 font-bold text-slate-900 text-[10px] shadow-xs uppercase disabled:opacity-70"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50/70 border-2 border-blue-200 p-2.5 rounded-xl shadow-md space-y-1.5">
            <div className="flex items-center justify-between border-b border-blue-200 pb-1">
              <span className="font-black text-blue-900 text-[9px] uppercase flex items-center gap-1">
                🔒 ZONE RÉSERVÉE AU SUPERVISEUR
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className="block font-black mb-0.5 text-[8px] text-blue-900 uppercase truncate">Frais</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={documentEnLectureSeule}
                  value={fraisLivraisonSaisi}
                  onChange={(e) => setFraisLivraisonSaisi(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder=""
                  className="w-full bg-white border border-blue-300 rounded p-1 font-bold text-blue-900 text-[10px] shadow-xs disabled:opacity-70"
                />
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[8px] text-blue-900 uppercase truncate">Livreur</label>
                <button
                  type="button"
                  disabled={documentEnLectureSeule}
                  onClick={() => { if (documentEnLectureSeule) return; setRechercheLivreurInput(''); setModalLivreurOuverte(true); }}
                  className="w-full bg-white border border-blue-300 rounded p-1 font-extrabold text-blue-900 text-[9px] shadow-xs uppercase text-left flex justify-between items-center truncate disabled:opacity-70"
                >
                  <span className="truncate">{livreurAssigne || ''}</span>
                  <span className="text-slate-400 shrink-0 text-[7px]">🔍</span>
                </button>
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[8px] text-blue-900 uppercase truncate">Statut *</label>
                <select
                  value={statutCommandeSaisi}
                  disabled={documentEnLectureSeule}
                  onChange={(e) => setStatutCommandeSaisi(e.target.value)}
                  className="w-full bg-white border border-blue-300 rounded p-1 font-extrabold text-blue-900 text-[9px] shadow-xs cursor-pointer disabled:opacity-70"
                >
                  <option value="EN ATTENTE">EN ATTENTE</option>
                  <option value="LIVRÉ">LIVRÉ</option>
                  <option value="REPORTÉ">REPORTÉ</option>
                  <option value="ANNULÉ">ANNULÉ</option>
                </select>
              </div>
            </div>
          </div>

          {!partenaireSansStockage ? (
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white p-2 rounded-xl shadow-md flex flex-col space-y-1.5">
                <div className="flex justify-between items-center gap-1">
                  <span className="font-black text-slate-900 uppercase text-[9.5px] truncate">
                    ARTICLE
                  </span>
                  {!documentEnLectureSeule && (
                    <button
                      type="button"
                      onClick={() => setModalArticleOuverte(true)}
                      disabled={!enteteValide}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold px-1.5 py-1 rounded-md text-[9px] flex items-center justify-center gap-0.5 shadow-2xs transition disabled:opacity-50 truncate"
                    >
                      <span>🔍</span> Rechercher
                    </button>
                  )}
                </div>

                {!enteteValide ? (
                  <div className="p-1.5 text-center text-amber-700 font-bold text-[9px] bg-amber-50 rounded-lg border border-amber-200">
                    ⚠️ Remplir l'en-tête et client 9 chiffres.
                  </div>
                ) : articlesFiltres.length === 0 ? (
                  <div className="p-1.5 text-center text-slate-500 font-bold text-[9px] bg-slate-50 rounded-lg border border-slate-200">
                    Aucun article.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1 overflow-y-auto max-h-[180px] pr-0.5">
                    {articlesFiltres.map((art) => {
                      const idArt = art.id_article;

                      return (
                        <ArticleItemStockCard 
                          key={`${idArt}_${livreurAssigne}_${depotId}`} 
                          art={art} 
                          onSelect={() => { if (!documentEnLectureSeule) ajouterArticleAuPanier(art); }} 
                          chargerStock={async () => await recupererStockReelRPC(idArt, livreurAssigne)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white p-2 rounded-xl shadow-md flex flex-col justify-between space-y-1.5">
                <div className="space-y-1">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-0.5">
                    <span className="font-black text-slate-900 uppercase text-[9.5px]">Panier</span>
                  </div>

                  {lignesSaisies.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 font-bold text-[9px] italic">
                      Panier vide.
                    </div>
                  ) : (
                    <div className="space-y-1 overflow-y-auto max-h-[120px] pr-0.5">
                      {lignesSaisies.map((l, index) => (
                        <div key={index} className="flex justify-between items-center bg-slate-50 border border-slate-200 p-1 rounded-md text-[9px]">
                          <div className="flex-1 truncate pr-1">
                            <p className="font-black uppercase text-slate-900 truncate text-[8.5px]">{l.designation}</p>
                          </div>
                          
                          <div className="flex items-center gap-0.5 shrink-0">
                            {!documentEnLectureSeule && (
                              <button
                                type="button"
                                onClick={() => modifierQuantiteLigne(index, -1)}
                                className="bg-slate-200 text-slate-800 font-black w-3 h-3 rounded flex items-center justify-center text-[8px]"
                              >
                                -
                              </button>
                            )}
                            <span className="font-black text-orange-600 w-3.5 text-center text-[8.5px]">{l.quantite}</span>
                            {!documentEnLectureSeule && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => modifierQuantiteLigne(index, 1)}
                                  className="bg-slate-200 text-slate-800 font-black w-3 h-3 rounded flex items-center justify-center text-[8px]"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => supprimerLignePanier(index)}
                                  className="text-red-600 font-bold ml-0.5 text-[8px] px-0.5"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-200">
                  <div className="w-full bg-slate-100 px-1.5 py-1 rounded-md border border-slate-200 flex flex-col items-center justify-center text-center">
                    <span className="font-black text-slate-900 text-[8px] uppercase">Net à payer</span>
                    <span className="font-black text-emerald-700 text-[9.5px] font-mono">{napGlobal.toLocaleString('fr-FR')} CFA</span>
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
                        setSnapshotCommandeInitiale(null);
                        setDocumentEnLectureSeule(false);
                      }}
                      className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black py-1 px-0.5 rounded text-[8.5px] transition text-center disabled:opacity-50 truncate"
                    >
                      Fermer
                    </button>

                    {commandeEnEdition && !documentEnLectureSeule && permissions.peut_supprimer && (
                      <button
                        type="button"
                        disabled={sauvegardeEnCours}
                        onClick={supprimerCommandeActuelle}
                        className="bg-red-600 hover:bg-red-700 text-white font-black p-1 rounded text-[8.5px] transition shrink-0 disabled:opacity-50"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    )}

                    {!documentEnLectureSeule && ((commandeEnEdition && permissions.peut_modifier) || (!commandeEnEdition && permissions.peut_creer)) && (
                      <button
                        type="button"
                        disabled={sauvegardeEnCours || (commandeEnEdition ? !aEteModifie : !enteteValide)}
                        onClick={sauvegarderCommande}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-1 px-0.5 rounded text-[8.5px] transition text-center shadow-xs truncate"
                      >
                        {sauvegardeEnCours ? '...' : (commandeEnEdition ? 'Mettre à jour' : 'Valider')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-2.5 rounded-xl shadow-md space-y-2">
              <div className="bg-orange-50 border border-orange-200 p-2 rounded-lg text-[9.5px] space-y-0.5">
                <span className="block font-black text-orange-900 uppercase">Résumé du Trajet :</span>
                <p className="font-bold text-slate-800 truncate">
                  📍 Départ : <strong className="text-slate-900">{pointADepart || 'Non défini'}</strong>
                </p>
                <p className="font-bold text-slate-800 truncate">
                  🎯 Arrivée : <strong className="text-orange-600">{adresseLivraison || 'Non défini'}</strong>
                </p>
                {numeroClient && (
                  <p className="font-bold text-slate-800 truncate">
                    📞 Client : <strong className="text-blue-700 font-mono">{numeroClient}</strong>
                  </p>
                )}
                {natureColis && (
                  <p className="font-bold text-slate-800 truncate">
                    📦 Colis : <strong className="text-blue-700">{natureColis}</strong>
                  </p>
                )}
                <p className="font-bold text-slate-800 truncate">
                  🛵 Livreur : <strong className="text-blue-600 uppercase">{livreurAssigne || 'Non assigné'}</strong>
                </p>
              </div>

              <div className="w-full bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between text-[10px]">
                <span className="font-black text-slate-900 uppercase">Net à payer :</span>
                <span className="font-black text-emerald-700 font-mono">{napGlobal.toLocaleString('fr-FR')} CFA</span>
              </div>

              <div className="flex gap-1 w-full pt-0.5">
                <button
                  type="button"
                  disabled={sauvegardeEnCours}
                  onClick={() => {
                    setLignesSaisies([]);
                    setStocksArticlesCache({});
                    setVueActive('LISTE');
                    setCommandeEnEdition(null);
                    setSnapshotCommandeInitiale(null);
                    setDocumentEnLectureSeule(false);
                  }}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black py-1.5 px-1 rounded-lg text-[9px] transition text-center disabled:opacity-50"
                >
                  Fermer
                </button>

                {commandeEnEdition && !documentEnLectureSeule && permissions.peut_supprimer && (
                  <button
                    type="button"
                    disabled={sauvegardeEnCours}
                    onClick={supprimerCommandeActuelle}
                    className="bg-red-600 hover:bg-red-700 text-white font-black px-2 py-1.5 rounded-lg text-[9px] transition shadow-xs disabled:opacity-50"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                )}

                {!documentEnLectureSeule && ((commandeEnEdition && permissions.peut_modifier) || (!commandeEnEdition && permissions.peut_creer)) && (
                  <button
                    type="button"
                    disabled={sauvegardeEnCours || (commandeEnEdition ? !aEteModifie : !enteteValide)}
                    onClick={sauvegarderCommande}
                    className="flex-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-1.5 px-3 rounded-lg text-[9px] transition shadow-xs text-center truncate"
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
                    placeholder=""
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
                    placeholder=""
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
                    placeholder=""
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  {articlesFiltres.length === 0 ? (
                    <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun article trouvé.</div>
                  ) : (
                    articlesFiltres.map((art) => {
                      const idArt = art.id_article;

                      return (
                        <ArticleModalItemCard 
                          key={`${idArt}_${livreurAssigne}_${depotId}`} 
                          art={art} 
                          onSelect={() => { ajouterArticleAuPanier(art); setModalArticleOuverte(false); }} 
                          chargerStock={async () => await recupererStockReelRPC(idArt, livreurAssigne)}
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
        <div className="space-y-2">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1">
              <span className="font-black text-slate-900 uppercase text-[9px] flex items-center gap-1">
                🔍 FILTRER LES COMMANDES
              </span>
              {(filtrePartenaire || filtreLivreur || filtreZone || filtreDateDebut !== dateDuJourStr || filtreDateFin !== dateDuJourStr || filtreStatut) && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltrePartenaire('');
                    setFiltreLivreur('');
                    setFiltreZone('');
                    setFiltreDateDebut(dateDuJourStr);
                    setFiltreDateFin(dateDuJourStr);
                    setFiltreStatut('');
                  }}
                  className="text-orange-600 hover:text-orange-700 font-bold text-[8.5px] underline"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <label className="block font-black mb-0.5 text-[7.5px] text-slate-700 uppercase truncate">Début</label>
                  <input
                    type="date"
                    value={filtreDateDebut}
                    onChange={(e) => setFiltreDateDebut(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[9px]"
                  />
                </div>

                <div>
                  <label className="block font-black mb-0.5 text-[7.5px] text-slate-700 uppercase truncate">Fin</label>
                  <input
                    type="date"
                    value={filtreDateFin}
                    onChange={(e) => setFiltreDateFin(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[9px]"
                  />
                </div>

                <div>
                  <label className="block font-black mb-0.5 text-[7.5px] text-slate-700 uppercase truncate">Partenaire</label>
                  <button
                    type="button"
                    onClick={() => { setRechercheFiltrePartenaireInput(''); setModalFiltrePartenaireOuverte(true); }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[9px] text-left flex justify-between items-center truncate"
                  >
                    <span className="truncate">
                      {filtrePartenaire ? (partenaires.find(p => String(p.id) === String(filtrePartenaire))?.nom_fournisseur || partenaires.find(p => String(p.id) === String(filtrePartenaire))?.nom || 'Tous') : 'Tous'}
                    </span>
                    <span className="text-slate-400 shrink-0 text-[7px]">🔍</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="block font-black mb-0.5 text-[7.5px] text-slate-700 uppercase truncate">Livreur</label>
                  <button
                    type="button"
                    onClick={() => { setRechercheFiltreLivreurInput(''); setModalFiltreLivreurOuverte(true); }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[9px] uppercase text-left flex justify-between items-center truncate"
                  >
                    <span className="truncate">{filtreLivreur || 'Tous'}</span>
                    <span className="text-slate-400 shrink-0 text-[7px]">🔍</span>
                  </button>
                </div>

                <div>
                  <label className="block font-black mb-0.5 text-[7.5px] text-slate-700 uppercase truncate">Zone / Quartier</label>
                  <button
                    type="button"
                    onClick={() => { setRechercheFiltreZoneInput(''); setModalFiltreZoneOuverte(true); }}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-bold text-slate-900 text-[9px] uppercase text-left flex justify-between items-center truncate"
                  >
                    <span className="truncate">{filtreZone || 'Toutes zones'}</span>
                    <span className="text-slate-400 shrink-0 text-[7px]">🔍</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[7.5px] text-slate-700 uppercase truncate">Statut</label>
                <div className="grid grid-cols-5 gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFiltreStatut('')}
                    className={`py-1 px-0.5 rounded font-extrabold text-[7.5px] uppercase transition shadow-2xs truncate text-center ${
                      filtreStatut === '' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Tous
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltreStatut('EN ATTENTE')}
                    className={`py-1 px-0.5 rounded font-extrabold text-[7.5px] uppercase transition shadow-2xs truncate text-center ${
                      filtreStatut === 'EN ATTENTE' ? 'bg-amber-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Attente
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltreStatut('LIVRÉ')}
                    className={`py-1 px-0.5 rounded font-extrabold text-[7.5px] uppercase transition shadow-2xs truncate text-center ${
                      filtreStatut === 'LIVRÉ' ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Livré
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltreStatut('REPORTÉ')}
                    className={`py-1 px-0.5 rounded font-extrabold text-[7.5px] uppercase transition shadow-2xs truncate text-center ${
                      filtreStatut === 'REPORTÉ' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltreStatut('ANNULÉ')}
                    className={`py-1 px-0.5 rounded font-extrabold text-[7.5px] uppercase transition shadow-2xs truncate text-center ${
                      filtreStatut === 'ANNULÉ' ? 'bg-rose-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Annulé
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white px-2 py-1.5 rounded-xl border border-slate-800 shadow-2xs flex justify-between items-center text-[9px] font-black">
            <span>Commandes affichées ({commandesAffichees.length} / {commandesFiltrees.length})</span>
          </div>

          {chargement && commandes.length === 0 ? (
            <div className="p-4 text-center text-slate-500 font-bold">Chargement...</div>
          ) : commandesFiltrees.length === 0 ? (
            <div className="p-4 text-center text-slate-500 bg-white border border-slate-200 rounded-xl font-bold text-[9.5px]">
              Aucune commande ne correspond aux filtres.
            </div>
          ) : (
            <div className="space-y-1.5">
              {commandesAffichees.map((cmd) => {
                const statut = cmd.statut || cmd.statut_commande || 'LIVRÉ';
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
                    className="bg-white border border-slate-200 p-2 rounded-xl shadow-2xs hover:border-orange-500 cursor-pointer transition flex flex-col space-y-1"
                  >
                    <div className="flex justify-between items-center gap-1">
                      <div className="flex items-center gap-1 min-w-0 shrink-0">
                        <span className="font-mono font-black text-orange-600 text-[9.5px] shrink-0">{cmd.numero_commande}</span>
                        <span className="text-slate-300 text-[8px]">•</span>
                        <span className="font-extrabold text-slate-900 text-[8.5px] uppercase truncate max-w-[75px]">{cmd.nom_partenaire}</span>
                        <span className="text-slate-300 text-[8px]">•</span>
                        <span className="text-slate-600 text-[8.5px] font-bold whitespace-nowrap">{formaterDateCourte(cmd.date_commande)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-extrabold text-blue-700 uppercase text-[8.5px] truncate max-w-[75px]" title={cmd.vendeur_livreur || 'NON ASSIGNÉ'}>
                          🛵 {cmd.vendeur_livreur || 'NON ASSIGNÉ'}
                        </span>

                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              const dateCmdStr = cmd.date_commande || dateDuJourStr;
                              if (dateCmdStr < dateDuJourStr) {
                                alert(`❌ Modification interdite : ce document appartient à une journée clôturée (${dateCmdStr}).`);
                                return;
                              }
                              setMenuStatutOuvertId(menuStatutOuvertId === cmd.id ? null : cmd.id);
                            }}
                            className={`text-[7px] font-black px-1.5 py-0.2 rounded-full border truncate whitespace-nowrap flex items-center gap-0.5 shadow-2xs cursor-pointer hover:opacity-80 transition ${badgeColor}`}
                            title="Changer le statut"
                          >
                            <span>{statut}</span>
                            <span className="text-[5px]">▼</span>
                          </button>

                          {menuStatutOuvertId === cmd.id && (
                            <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden py-1 text-[8.5px]">
                              <div className="px-2 py-1 text-[7.5px] font-bold text-slate-400 uppercase border-b border-slate-100">
                                Changer le statut
                              </div>
                              {['EN ATTENTE', 'LIVRÉ', 'REPORTÉ', 'ANNULÉ'].map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => changerStatutRapide(cmd, st)}
                                  className={`w-full text-left px-3 py-1 font-black uppercase hover:bg-slate-100 transition flex items-center justify-between ${
                                    (statut === st || (statut === 'LIVRE' && st === 'LIVRÉ')) ? 'text-orange-600 bg-orange-50/50' : 'text-slate-700'
                                  }`}
                                >
                                  <span>{st}</span>
                                  {(statut === st || (statut === 'LIVRE' && st === 'LIVRÉ')) && <span>✓</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-1 flex justify-between items-center gap-1.5 text-[9px]">
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

                      <div className="text-right shrink-0 flex items-baseline gap-1">
                        {Number(cmd.frais_livraison || 0) > 0 && (
                          <span className="font-bold text-slate-400 text-[8px] font-mono">
                            Frais:{Number(cmd.frais_livraison || 0).toLocaleString('fr-FR')}F
                          </span>
                        )}
                        <span className="font-black text-emerald-700 text-[9.5px] font-mono">
                          {Number(cmd.montant_commande || 0).toLocaleString('fr-FR')}F
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center gap-1.5 pt-0.5 text-[8.5px]">
                      <div className="text-slate-600 font-medium truncate">
                        {lignesCmd.length > 0 ? (
                          <div className="flex flex-wrap gap-0.5 truncate">
                            {lignesCmd.map((l, idx) => (
                              <span key={idx} className="bg-slate-100 text-slate-800 font-bold px-1 py-0.2 rounded text-[8px] truncate max-w-[120px]">
                                {l.designation} <span className="text-orange-600 font-black">x{l.quantite}</span>
                              </span>
                            ))}
                          </div>
                        ) : cmd.nature_colis ? (
                          <span className="text-blue-700 font-bold truncate">📦 {cmd.nature_colis}</span>
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
                            className="bg-green-100 hover:bg-green-200 text-green-700 border border-green-300 px-1 py-0.2 rounded text-[8px] font-black transition flex items-center gap-0.5 shadow-2xs"
                            title={`WhatsApp ${cmd.numero_client}`}
                          >
                            <span>💬</span>
                            <span>WA</span>
                          </a>
                          <a
                            href={`tel:${cmd.numero_client}`}
                            onClick={() => {
                              setCommandesAppelees(prev => ({ ...prev, [cmd.id]: true }));
                            }}
                            className={`font-mono px-1 py-0.2 rounded border flex items-center gap-0.5 transition shadow-sm text-[8.5px] font-black ${styleNumero} ${
                              estEnAttente 
                                ? (!dejaAppele ? 'bg-rose-50 border-rose-300 hover:bg-rose-100' : 'bg-blue-50 border-blue-300 hover:bg-blue-100')
                                : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={`Appeler ${cmd.numero_client}`}
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
                <div className="text-center pt-1.5 pb-3">
                  <button
                    type="button"
                    onClick={() => setLimiteCommandes(prev => prev + 20)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold px-3 py-1.5 rounded-xl text-[9px] transition shadow-xs border border-slate-300 w-full"
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
            
            <div className={`max-h-[350px] overflow-y-auto grid grid-cols-1 gap-2 pr-1 ${sauvegardeEnCours ? 'pointer-events-none opacity-50' : ''}`}>
              {caisses.filter(c => !c.module || c.module.toUpperCase() === moduleActuel).length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-bold text-xs">Aucune caisse enregistrée.</div>
              ) : (
                caisses
                  .filter(c => !c.module || c.module.toUpperCase() === moduleActuel)
                  .map((c) => (
                    <div 
                      key={c.id} 
                      onClick={() => {
                        if (!sauvegardeEnCours) {
                          validerEtVerserCloture(c.id, c.nom_caisse);
                        }
                      }} 
                      className="p-3 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 cursor-pointer flex justify-between items-center shadow-2xs transition"
                    >
                      <div>
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
            <input type="text" value={rechercheFiltrePartenaireInput} onChange={(e) => setRechercheFiltrePartenaireInput(e.target.value)} placeholder="" autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
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
            <input type="text" value={rechercheFiltreLivreurInput} onChange={(e) => setRechercheFiltreLivreurInput(e.target.value)} placeholder="" autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              <div onClick={() => { setFiltreLivreur(''); setModalFiltreLivreurOuverte(false); }} className="col-span-2 p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-bold text-slate-500 text-xs text-center">Tous</div>
              {filtreLivreursFiltres.map((nom, idx) => (
                <div key={idx} onClick={() => { setFiltreLivreur(nom); setModalFiltreLivreurOuverte(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-black text-xs text-slate-900 uppercase truncate">{nom}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalFiltreZoneOuverte && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs">ZONE / QUARTIER DE LIVRAISON</h4>
              <button type="button" onClick={() => setModalFiltreZoneOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100">✕</button>
            </div>
            <input type="text" value={rechercheFiltreZoneInput} onChange={(e) => setRechercheFiltreZoneInput(e.target.value)} placeholder="" autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              <div onClick={() => { setFiltreZone(''); setModalFiltreZoneOuverte(false); }} className="col-span-2 p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-bold text-slate-500 text-xs text-center">-- Toutes les zones --</div>
              {zonesFiltresFiltrees.map((zone, idx) => (
                <div key={idx} onClick={() => { setFiltreZone(zone); setModalFiltreZoneOuverte(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer font-black text-xs text-slate-900 uppercase truncate">{zone}</div>
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
            <input type="text" value={rechercheRapportLivreurInput} onChange={(e) => setRechercheRapportLivreurInput(e.target.value)} placeholder="" autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
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
            <input type="text" value={rechercheRapportPartenaireInput} onChange={(e) => setRechercheRapportPartenaireInput(e.target.value)} placeholder="" autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
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
            <input type="text" value={rechercheClotureLivreurInput} onChange={(e) => setRechercheClotureLivreurInput(e.target.value)} placeholder="" autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
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
  const estSuivi = art.suivi_stock ?? art.Suivi_Stock ?? true;
  const estEpuise = estSuivi !== false && estSuivi !== 0 && !chargementStock && stock <= 0;

  return (
    <div
      onClick={onSelect}
      className={`p-1.5 rounded-lg border transition cursor-pointer flex flex-col justify-between shadow-2xs ${
        estEpuise 
          ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' 
          : 'bg-white border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer'
      }`}
    >
      <h5 className={`font-black uppercase text-[9px] truncate ${estEpuise ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{designation}</h5>
      <span className={`font-black text-[8px] mt-0.5 ${estEpuise ? 'text-rose-600' : 'text-emerald-700'}`}>
        {estSuivi === false || estSuivi === 0 ? 'Stock : Illimité' : `Stock : ${chargementStock ? '...' : stock}`}
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
  const estSuivi = art.suivi_stock ?? art.Suivi_Stock ?? true;
  const estEpuise = estSuivi !== false && estSuivi !== 0 && !chargementStock && stock <= 0;

  return (
    <div 
      onClick={onSelect} 
      className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between shadow-2xs ${
        estEpuise ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-orange-500 hover:bg-orange-50/50'
      }`}
    >
      <span className="font-black text-xs text-slate-900 uppercase truncate">{designation}</span>
      <span className="font-black text-[10px] mt-1 text-slate-700">
        {estSuivi === false || estSuivi === 0 ? 'Stock : Illimité (Service)' : `Stock : ${chargementStock ? '...' : stock}`}
      </span>
    </div>
  );
}