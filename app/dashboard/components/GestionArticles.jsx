'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions';
import { localSync } from '../../lib/localSync';

export default function GestionArticles({ entrepriseId = '4TS-TEST' }) {
  const [articles, setArticles] = useState([]);
  const [depots, setDepots] = useState([]); 
  const [emplacements, setEmplacements] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [entrepriseInfo, setInfosEntreprise] = useState(null);

  const [limiteArticles, setLimiteArticles] = useState(20);

  // États initialisés vides pour éviter les faux droits par défaut au démarrage
  const [utilisateurConnecte, setUtilisateurConnecte] = useState('');
  const [emailConnecte, setEmailConnecte] = useState('');

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const cleCacheArticles = `articles_${entrepriseId}_${moduleActuel}`;

  // Récupération propre de la session locale au montage
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

  // Utilisation du hook centralisé unifié pour des permissions exactes et instantanées
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
  const [depotRapportFiltre, setDepotRapportFiltre] = useState('TOUS');

  const designationInputRef = useRef(null);

  const obtenirDateDuJour = () => {
    const d = new Date();
    const annee = d.getFullYear();
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    const jour = String(d.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  };

  const [dateDebutRapport, setDateDebutRapport] = useState(obtenirDateDuJour());
  const [dateFinRapport, setDateFinRapport] = useState(obtenirDateDuJour());

  const [dateDebutStat, setDateDebutStat] = useState(obtenirDateDuJour());
  const [dateFinStat, setDateFinStat] = useState(obtenirDateDuJour());

  const [afficherModalSelectionArticle, setAfficherModalSelectionArticle] = useState(false);
  const [rechercheModalArticle, setRechercheModalArticle] = useState('');

  const [chargement, setChargement] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  
  const [afficherForm, setAfficherForm] = useState(false);
  const [articleEnEdition, setArticleEnEdition] = useState(null);

  const [familleFiltre, setFamilleFiltre] = useState('TOUTES');
  const [depotFiltre, setDepotFiltre] = useState('TOUS');
  const [emplacementFiltre, setEmplacementFiltre] = useState('TOUS');

  const [colonneTri, setColonneTri] = useState('Designation');
  const [ordreTri, setOrdreTri] = useState('asc');

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
  });

  const toutesLesSuggestionsArticles = Array.from(
    new Set(articles.map(art => (art.Designation || art.designation || '').trim().toUpperCase()))
  ).sort();

  const chargerDonneesReference = async () => {
    try {
      const { data: dataEnt } = await supabase
        .from('entreprises')
        .select('*')
        .or(`id.eq.${entrepriseId},id_entreprise.eq.${entrepriseId},code_entreprise.eq.${entrepriseId}`)
        .single();
      
      if (dataEnt) setInfosEntreprise(dataEnt);

      const { data: dataFam } = await supabase
        .from('familles_articles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('nom_famille', { ascending: true });
      setFamilles(dataFam || []);

      const { data: dataDep } = await supabase
        .from('depots_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const listeDepots = dataDep || [];
      setDepots(listeDepots);
      if (listeDepots.length > 0) {
        if (depotRapportFiltre === 'TOUS') setDepotRapportFiltre(String(listeDepots[0].id));
      }

      const { data: dataEmp } = await supabase
        .from('emplacements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setEmplacements(dataEmp || []);

      const { data: dataMouv } = await supabase
        .from('mouvements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setMouvements(dataMouv || []);

      const { data: dataAppro } = await supabase
        .from('approvisionnements')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setApprovisionnements(dataAppro || []);

    } catch (err) {
      console.error('Erreur chargement références :', err.message);
    }
  };

  const chargerArticles = async () => {
    setChargement(true);
    const articlesLocaux = localSync.recupererDonneesLocales(cleCacheArticles);
    if (articlesLocaux && articlesLocaux.length > 0) {
      setArticles(articlesLocaux);
      setArticleSelectionneStatId(String(articlesLocaux[0].id_article || articlesLocaux[0].id));
      setChargement(false);
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
      
      if (liste.length > 0) {
        if (!articleSelectionneStatId || !liste.some(a => String(a.id_article || a.id) === String(articleSelectionneStatId))) {
          setArticleSelectionneStatId(String(liste[0].id_article || liste[0].id));
        }
      } else {
        setArticleSelectionneStatId('');
      }
    } catch (err) {
      console.error('Erreur chargement articles :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonneesReference();
    chargerArticles();
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

  const calculerStockReelDirect = (articleId, depotCible = 'TOUS', emplacementCible = 'TOUS') => {
    if (emplacementCible !== 'TOUS') {
      let stockEmp = 0;
      mouvements.forEach(m => {
        if (String(m.id_article) !== String(articleId)) return;
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

    if (depotCible !== 'TOUS') {
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

  const formaterTypeMouvementAffichage = (mvt) => {
    const typeMvt = (mvt.type_mouvement || '').toUpperCase();
    const motif = (mvt.motif_remarque || '').toUpperCase();

    const matchTicket = motif.match(/(C\d+-\d+)/i);
    if (matchTicket) {
      return matchTicket[1];
    }

    if (typeMvt === 'ENTREE') return 'ME';
    if (typeMvt === 'SORTIE') return 'MS';
    if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') return 'TR';
    if (typeMvt === 'APPROVISIONNEMENT') return 'APP';

    if (motif.includes('VENTE') || motif.includes('TICKET')) {
      const parts = motif.split(' ');
      for (const p of parts) {
        if (/C\d+-\d+/i.test(p)) return p;
      }
    }

    return typeMvt.substring(0, 3) || 'MVT';
  };

  const obtenirHistoriqueChronologiqueStat = (articleId) => {
    if (!articleId) return { lignes: [], stockFinal: 0 };

    let evenements = [];
    const dCible = depotStatFiltre;

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
          evenements.push({
            date: app.created_at || '',
            typeAbr: 'APP',
            quantiteMouvementee: parseInt(item.quantite || 0),
            impactStock: parseInt(item.quantite || 0)
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

      const typeAbr = formaterTypeMouvementAffichage(m);
      let impact = 0;

      if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') {
        impact = qte;
      } else if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
        impact = -qte;
      } else if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
        const memeDepot = m.id_depot_source && m.id_depot_destination && String(m.id_depot_source) === String(m.id_depot_destination);
        if (memeDepot) {
          impact = 0;
        } else {
          if (dCible === 'TOUS') {
            impact = 0;
          } else {
            if (estSource) impact = -qte;
            if (estDestination) impact = qte;
          }
        }
      } else {
        impact = qte;
      }

      evenements.push({
        date: m.created_at || '',
        typeAbr: typeAbr,
        quantiteMouvementee: qte,
        impactStock: impact
      });
    });

    evenements.sort((a, b) => new Date(a.date) - new Date(b.date));

    let stockCourant = 0;
    let lignesResultat = [];

    evenements.forEach(ev => {
      const dateEv = ev.date.split('T')[0];
      const estAvantPeriode = dateDebutStat && dateEv < dateDebutStat;

      if (estAvantPeriode) {
        stockCourant += ev.impactStock;
      } else if ((!dateDebutStat || dateEv >= dateDebutStat) && (!dateFinStat || dateEv <= dateFinStat)) {
        stockCourant += ev.impactStock;
        lignesResultat.push({
          ...ev,
          stockProgressif: Math.max(0, stockCourant)
        });
      } else {
        stockCourant += ev.impactStock;
      }
    });

    return { lignes: lignesResultat, stockFinal: Math.max(0, stockCourant) };
  };

  const gererUploadImage = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      setUploadingPhoto(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `articles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('articles-photos')
        .upload(filePath, file);

      if (uploadError) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNouveauArticle(prev => ({ ...prev, Photo: reader.result }));
          setUploadingPhoto(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('articles-photos')
        .getPublicUrl(filePath);

      setNouveauArticle(prev => ({ ...prev, Photo: urlData.publicUrl }));
    } catch (err) {
      alert('Erreur chargement photo : ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const enregistrerArticle = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (articleEnEdition && !permissions.modification) {
      alert("⛔ Action non autorisée : Modification interdite par votre profil.");
      return;
    }
    if (!articleEnEdition && !permissions.creation) {
      alert("⛔ Action non autorisée : Création interdite par votre profil.");
      return;
    }

    const designationClean = (nouveauArticle.Designation || '').trim().replace(/\s+/g, ' ').toUpperCase();
    if (!designationClean) {
      alert("⚠️ Veuillez renseigner la désignation de l'article.");
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const payloadArticle = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        Designation: designationClean,
        Code_Barre: (nouveauArticle.Code_Barre || '').trim().toUpperCase(),
        Famille: nouveauArticle.Famille,
        Prix_Achat: moduleActuel !== 'LIVRAISON' ? (parseFloat(nouveauArticle.Prix_Achat) || 0) : 0,
        Prix_Vente: parseFloat(nouveauArticle.Prix_Vente) || 0,
        Seuil_Alerte: parseInt(nouveauArticle.Seuil_Alerte) || 5,
        Photo: nouveauArticle.Photo,
        Disponible_Menu_QR: nouveauArticle.Disponible_Menu_QR,
        date_peremption: isGestionPerissablesActive() && nouveauArticle.date_peremption ? nouveauArticle.date_peremption : null
      };

      if (articleEnEdition) {
        const targetId = articleEnEdition.id_article || articleEnEdition.id;
        const { error } = await supabase
          .from('articles_stock')
          .update(payloadArticle)
          .eq(articleEnEdition.id_article ? 'id_article' : 'id', targetId)
          .eq('id_entreprise', entrepriseId);

        if (error) throw error;
      } else {
        payloadArticle.Quantite_Stock = 0;
        const { error } = await supabase.from('articles_stock').insert([payloadArticle]);
        if (error) throw error;
      }

      localStorage.removeItem(cleCacheArticles);

      alert(`Article enregistré avec succès !`);
      annulerForm();
      await chargerArticles();
    } catch (err) {
      alert('⚠️ Erreur lors de l’enregistrement dans la base de données : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = (article) => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.modification) {
      alert("⛔ Action non autorisée : Vous n’avez pas le droit de modifier les articles.");
      return;
    }
    setArticleEnEdition(article);
    setNouveauArticle({
      Code_Barre: article.Code_Barre || article.code_barre || '',
      Designation: article.Designation || article.designation || '',
      Famille: article.Famille || article.famille || '',
      Prix_Achat: article.Prix_Achat || article.prix_achat || 0,
      Prix_Vente: article.Prix_Vente || article.prix_vente || 0,
      Seuil_Alerte: article.Seuil_Alerte || article.seuil_alerte || 5,
      Photo: article.Photo || article.photo || '',
      Disponible_Menu_QR: article.Disponible_Menu_QR ?? true,
      date_peremption: article.date_peremption || '',
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    if (enTrainDeSauvegarder) return;
    setArticleEnEdition(null);
    setNouveauArticle({
      Code_Barre: '',
      Designation: '',
      Famille: '',
      Prix_Achat: 0,
      Prix_Vente: 0,
      Seuil_Alerte: 5,
      Photo: '',
      Disponible_Menu_QR: true,
      date_peremption: '',
    });
    setAfficherForm(false);
  };

  const supprimerArticleDepuisFormulaire = async () => {
    if (enTrainDeSauvegarder || !articleEnEdition) return;

    if (!permissions.suppression) {
      alert("⛔ Action non autorisée : Suppression interdite par votre profil.");
      return;
    }

    const artId = articleEnEdition.id_article || articleEnEdition.id;
    setEnTrainDeSauvegarder(true);
    try {
      const stockGlobalActuel = calculerStockReelDirect(artId, depotFiltre, emplacementFiltre);

      if (stockGlobalActuel > 0) {
        alert(`⛔ Impossible de supprimer ! L'article possède encore un stock de ${stockGlobalActuel} unité(s).`);
        setEnTrainDeSauvegarder(false);
        return;
      }

      if (!confirm(`Supprimer définitivement cet article ?`)) {
        setEnTrainDeSauvegarder(false);
        return;
      }

      const { error } = await supabase
        .from('articles_stock')
        .delete()
        .eq(articleEnEdition.id_article ? 'id_article' : 'id', artId)
        .eq('id_entreprise', entrepriseId);

      if (error) throw error;

      localStorage.removeItem(cleCacheArticles);
      alert('Article supprimé.');
      annulerForm();
      chargerArticles();
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const articlesFiltres = articles.filter((art) => {
    const artId = art.id_article || art.id;

    const matchFamille = familleFiltre === 'TOUTES' || String(art.Famille || art.famille) === String(familleFiltre);
    if (!matchFamille) return false;

    const matchDepotMouvement = articleAeuMouvementChezPartenaire(artId, depotFiltre);
    if (!matchDepotMouvement) return false;

    return true;
  });

  const articlesRapportFiltres = articles.filter((art) => {
    const artId = art.id_article || art.id;
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

  const articlesTries = [...articlesFiltres].sort((a, b) => {
    let valA, valB;

    if (colonneTri === 'Designation') {
      valA = String(a.Designation || a.designation || '').toLowerCase();
      valB = String(b.Designation || b.designation || '').toLowerCase();
    } else if (colonneTri === 'Prix_Achat') {
      valA = parseFloat(a.Prix_Achat || a.prix_achat || 0);
      valB = parseFloat(a.Prix_Achat || a.prix_vente || 0);
    } else if (colonneTri === 'Prix_Vente') {
      valA = parseFloat(a.Prix_Vente || a.prix_vente || 0);
      valB = parseFloat(b.Prix_Vente || b.prix_vente || 0);
    }

    if (valA < valB) return ordreTri === 'asc' ? -1 : 1;
    if (valA > valB) return ordreTri === 'asc' ? 1 : -1;
    return 0;
  });

  const articlesAffiches = articlesTries.slice(0, limiteArticles);

  const emplacementsDisponibles = depotFiltre === 'TOUS' 
    ? emplacements 
    : emplacements.filter(emp => String(emp.id_depot || emp.depot_id || '') === String(depotFiltre));

  const emplacementsTableau = depotFiltre === 'TOUS'
    ? emplacements
    : emplacements.filter(emp => String(emp.id_depot || emp.depot_id || '') === String(depotFiltre));

  const articlesModalFiltres = articles.filter(art => {
    const nom = (art.Designation || art.designation || '').toLowerCase();
    return nom.includes(rechercheModalArticle.toLowerCase());
  });

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

      const estSource = String(m.id_depot_source) === String(dCible);
      const estDestination = String(m.id_depot_destination) === String(dCible);

      if (dCible !== 'TOUS' && !estSource && !estDestination) return;

      if (dateMvt < dateDebutRapport) {
        if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') {
          stockInitial += qte;
        } else if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
          if (dCible === 'TOUS' || estSource) stockInitial -= qte;
        } else if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          const memeDepot = m.id_depot_source && m.id_depot_destination && String(m.id_depot_source) === String(m.id_depot_destination);
          if (!memeDepot && dCible !== 'TOUS') {
            if (estSource) stockInitial -= qte;
            if (estDestination) stockInitial += qte;
          }
        }
      } else if (dateMvt >= dateDebutRapport && dateMvt <= dateFinRapport) {
        if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') {
          entrees += qte;
        } else if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
          if (dCible === 'TOUS' || estSource) sorties += qte;
        } else if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          const memeDepot = m.id_depot_source && m.id_depot_destination && String(m.id_depot_source) === String(m.id_depot_destination);
          if (!memeDepot && dCible !== 'TOUS') {
            if (estSource) sorties += qte;
            if (estDestination) entrees += qte;
          }
        }
      }
    });

    approvisionnements.forEach(app => {
      const dateApp = (app.created_at || '').split('T')[0];
      const matchDepot = dCible === 'TOUS' || String(app.id_depot_destination || app.id_depot) === String(dCible);
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
        if (dateApp < dateDebutRapport) stockInitial += qte;
        else if (dateApp >= dateDebutRapport && dateApp <= dateFinRapport) entrees += qte;
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

    const nomEntreprise = entrepriseInfo?.nom_entreprise || entrepriseInfo?.nom || '4TS : ISMA LOGISTIQUE';
    const dateImpression = new Date().toLocaleDateString('fr-FR');
    
    let infosFiltresHtml = '';
    if (modeVue === 'catalogue') {
      const famObj = familles.find(f => String(f.id) === String(familleFiltre));
      const depObj = depots.find(d => String(d.id) === String(depotFiltre));
      const empObj = emplacements.find(e => String(e.id) === String(emplacementFiltre));
      infosFiltresHtml = `
        <div class="meta-info">
          <span><strong>Famille :</strong> ${famObj ? (famObj.nom_famille || famObj.Nom_Famille) : 'Toutes'}</span>
          <span><strong>Dépôt :</strong> ${depObj ? (depObj.nom_depot || depObj.Nom_Depot) : 'Tous'}</span>
          <span><strong>Emplacement :</strong> ${empObj ? empObj.nom_emplacement : 'Tous'}</span>
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
            .header-box { border-bottom: 3px solid #f97316; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .company-title { font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; }
            .doc-subtitle { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-top: 4px; }
            .print-date { font-size: 11px; font-weight: bold; color: #475569; text-align: right; }
            .meta-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 20px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
            th { background-color: #f1f5f9; text-transform: uppercase; font-weight: 900; font-size: 10px; color: #334155; }
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

  return (
    <div className="space-y-2 font-sans text-xs">
      
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs gap-2">
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          <span className="text-sm shrink-0">📦</span>
          <h3 className="font-extrabold text-slate-900 uppercase text-[11px] truncate">
            GESTION DES ARTICLES [{moduleActuel}] ({articlesAffiches.length} / {articlesFiltres.length})
          </h3>
          {isGestionPerissablesActive() && <span className="text-[8px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded border border-amber-200 shrink-0">Périssables</span>}
        </div>
        
        {permissions.creation && (
          <button
            type="button"
            disabled={enTrainDeSauvegarder}
            onClick={() => {
              if (afficherForm) {
                annulerForm();
              } else {
                setModeVue('catalogue');
                annulerForm();
                setAfficherForm(true);
              }
            }}
            className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-bold px-2.5 py-1.5 rounded-lg transition shadow-2xs text-[10px] shrink-0"
          >
            {afficherForm ? '✖' : '+ Nouveau'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 w-full">
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => {
            setModeVue('catalogue');
            annulerForm();
          }}
          className={`px-1 py-2 rounded-lg font-black text-[10px] transition text-center border shadow-2xs whitespace-nowrap overflow-hidden text-ellipsis ${
            modeVue === 'catalogue' && !afficherForm 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
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
          className={`px-1 py-2 rounded-lg font-black text-[10px] transition text-center border shadow-2xs whitespace-nowrap overflow-hidden text-ellipsis ${
            modeVue === 'statistiques' 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
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
          className={`px-1 py-2 rounded-lg font-black text-[10px] transition text-center border shadow-2xs whitespace-nowrap overflow-hidden text-ellipsis ${
            modeVue === 'rapport' 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Rapport Stock
        </button>
      </div>

      {modeVue === 'catalogue' && (
        <div className="space-y-2">
          {afficherForm && permissions.creation ? (
            <form onSubmit={enregistrerArticle} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl shadow-md space-y-2.5">
              
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="font-black text-[10px] text-orange-600 uppercase">
                  {articleEnEdition ? `Modifier un article [${moduleActuel}]` : `Créer un article [${moduleActuel}]`}
                </span>
                <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerForm} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1">✖</button>
              </div>

              <div className="grid grid-cols-[4fr_7fr] gap-2">
                <div>
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5 truncate">Famille *</label>
                  <select
                    required
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.Famille}
                    onChange={(e) => {
                      setNouveauArticle({ ...nouveauArticle, Famille: e.target.value });
                      setTimeout(() => {
                        if (designationInputRef.current) {
                          designationInputRef.current.focus();
                        }
                      }, 50);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-[10.5px] font-black text-orange-700 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
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
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5 truncate">Désignation *</label>
                  <input
                    ref={designationInputRef}
                    type="text"
                    required
                    disabled={enTrainDeSauvegarder}
                    list="liste-suggestions-articles"
                    value={nouveauArticle.Designation}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Designation: e.target.value.toUpperCase() })}
                    placeholder="EX: JUS 250ML"
                    style={{ textTransform: 'uppercase' }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-[10.5px] font-black text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase"
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
                    <label className="block font-black text-[8.5px] text-slate-700 uppercase mb-0.5 truncate">PA</label>
                    <input
                      type="number"
                      disabled={enTrainDeSauvegarder}
                      value={nouveauArticle.Prix_Achat}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Achat: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-black text-slate-800 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-black text-[8.5px] text-slate-700 uppercase mb-0.5 truncate">PV *</label>
                    <input
                      type="number"
                      required
                      disabled={enTrainDeSauvegarder}
                      value={nouveauArticle.Prix_Vente}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Vente: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-black text-emerald-700 shadow-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1">
                  <div>
                    <label className="block font-black text-[8.5px] text-slate-700 uppercase mb-0.5 truncate">PV *</label>
                    <input
                      type="number"
                      required
                      disabled={enTrainDeSauvegarder}
                      value={nouveauArticle.Prix_Vente}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Vente: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-black text-emerald-700 shadow-xs"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black text-[8.5px] text-slate-700 uppercase mb-0.5 truncate">S.ALERTE</label>
                  <input
                    type="number"
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.Seuil_Alerte}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Seuil_Alerte: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-black text-slate-900 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block font-black text-[8.5px] text-slate-700 uppercase mb-0.5 truncate">CODE-BARRES</label>
                  <input
                    type="text"
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.Code_Barre}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Code_Barre: e.target.value.toUpperCase() })}
                    placeholder="600123"
                    style={{ textTransform: 'uppercase' }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-bold text-slate-900 font-mono shadow-xs uppercase"
                  />
                </div>
              </div>

              {isGestionPerissablesActive() && (
                <div>
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Date Péremption</label>
                  <input
                    type="date"
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.date_peremption}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, date_peremption: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 space-y-1">
                <label className="block font-black text-[10px] text-slate-700 uppercase">Photo de l'article</label>
                
                {nouveauArticle.Photo ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-3">
                    <div className="shrink-0">
                      <img
                        src={nouveauArticle.Photo}
                        alt="Photo de l'article"
                        className="w-20 h-20 object-cover rounded-xl border-2 border-orange-500 shadow-xs"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <label className="bg-white hover:bg-orange-50 text-orange-600 border border-orange-300 px-3.5 py-1.5 rounded-lg font-black text-xs cursor-pointer flex items-center justify-center gap-1 transition shadow-xs">
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
                        className="text-red-600 hover:text-red-800 font-extrabold text-[10px] text-center underline"
                      >
                        Retirer la photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1.5 items-center flex-wrap">
                    <input
                      type="text"
                      disabled={enTrainDeSauvegarder}
                      value={nouveauArticle.Photo}
                      onChange={(e) => setNouveauArticle({ ...nouveauArticle, Photo: e.target.value })}
                      placeholder="https://lien-image.com/photo.jpg"
                      className="flex-1 min-w-[150px] bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none truncate"
                    />

                    <label 
                      className="bg-slate-100 hover:bg-orange-100 text-slate-800 border border-slate-300 px-3 py-1.5 rounded-lg font-black text-xs cursor-pointer flex items-center justify-center transition shrink-0 shadow-xs"
                      title="Ouvrir l'appareil photo"
                    >
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

              <div className="pt-1.5 border-t border-slate-100">
                <div className="bg-orange-50/70 border border-orange-200/80 rounded-xl p-2 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="qrCheck"
                    disabled={enTrainDeSauvegarder}
                    checked={nouveauArticle.Disponible_Menu_QR}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Disponible_Menu_QR: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                  />
                  <label htmlFor="qrCheck" className="text-[11px] font-black text-slate-900 cursor-pointer select-none leading-tight">
                    📱 Visible au Scan Code QR par les clients
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-200">
                {articleEnEdition && permissions.suppression ? (
                  <button 
                    type="button" 
                    disabled={enTrainDeSauvegarder}
                    onClick={supprimerArticleDepuisFormulaire} 
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black px-3 py-1.5 rounded-lg text-xs shadow-xs"
                  >
                    {enTrainDeSauvegarder ? 'Patientez...' : '🗑️ Supprimer'}
                  </button>
                ) : <div />}

                <div className="flex gap-1.5">
                  <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerForm} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-3 py-1.5 rounded-lg text-xs">Annuler</button>
                  
                  {permissions.modification && (
                    <button 
                      type="submit" 
                      disabled={enTrainDeSauvegarder}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black px-4 py-1.5 rounded-lg shadow-xs text-xs transition"
                    >
                      {enTrainDeSauvegarder ? 'Enregistrement...' : (articleEnEdition ? 'Mettre à jour' : 'Enregistrer')}
                    </button>
                  )}
                </div>
              </div>
            </form>
          ) : (
            <>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                <div className="grid grid-cols-3 gap-1">
                  <div>
                    <label className="block font-black text-[8.5px] uppercase text-slate-700 mb-0.5 truncate">Famille</label>
                    <select
                      disabled={enTrainDeSauvegarder}
                      value={familleFiltre}
                      onChange={(e) => setFamilleFiltre(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-extrabold text-slate-900 text-[10px] shadow-xs"
                    >
                      <option value="TOUTES">Toutes</option>
                      {familles.map((fam) => (
                        <option key={fam.id} value={fam.id}>
                          {fam.nom_famille || fam.Nom_Famille}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-black text-[8.5px] uppercase text-slate-700 mb-0.5 truncate">Dépôt</label>
                    <select
                      disabled={enTrainDeSauvegarder}
                      value={depotFiltre}
                      onChange={(e) => { setDepotFiltre(e.target.value); setEmplacementFiltre('TOUS'); }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-extrabold text-slate-900 text-[10px] shadow-xs"
                    >
                      <option value="TOUS">Tous</option>
                      {depots.map((dep) => (
                        <option key={dep.id} value={dep.id}>
                          {dep.nom_depot || dep.Nom_Depot}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-black text-[8.5px] uppercase text-slate-700 mb-0.5 truncate">Emplacement</label>
                    <select
                      disabled={enTrainDeSauvegarder}
                      value={emplacementFiltre}
                      onChange={(e) => setEmplacementFiltre(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-extrabold text-slate-900 text-[10px] shadow-xs"
                    >
                      <option value="TOUS">Tous</option>
                      {emplacementsDisponibles.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nom_emplacement}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-900 text-white px-2.5 py-1.5 rounded-xl shadow-xs">
                <h4 className="font-black uppercase text-[9.5px]">📦 Stock des Articles [{moduleActuel}] ({articlesAffiches.length} / {articlesFiltres.length})</h4>
                <button
                  type="button"
                  disabled={enTrainDeSauvegarder}
                  onClick={() => imprimerOngletActif('STOCK DES ARTICLES')}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-black px-2 py-0.5 rounded-lg text-[9.5px] border border-slate-700 flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <span>🖨️ Imprimer</span>
                </button>
              </div>

              <div id="section-impression-catalogue" className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black tracking-wider">
                      <th 
                        onClick={() => !enTrainDeSauvegarder && gererTri('Designation')} 
                        className="p-2.5 cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap"
                      >
                        Désignation {colonneTri === 'Designation' && (ordreTri === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="p-2.5 text-center whitespace-nowrap">STOCK</th>

                      {emplacementsTableau.map((emp) => (
                        <th key={emp.id} className="p-2.5 text-center text-blue-700 whitespace-nowrap">
                          📍 {emp.nom_emplacement || emp.code_emplacement}
                        </th>
                      ))}

                      {moduleActuel !== 'LIVRAISON' && (
                        <th 
                          onClick={() => !enTrainDeSauvegarder && gererTri('Prix_Achat')} 
                          className="p-2.5 text-right cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap"
                        >
                          PA {colonneTri === 'Prix_Achat' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                      )}

                      <th 
                        onClick={() => !enTrainDeSauvegarder && gererTri('Prix_Vente')} 
                        className="p-2.5 text-right cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap"
                      >
                        PV {colonneTri === 'Prix_Vente' && (ordreTri === 'asc' ? '▲' : '▼')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chargement && articles.length === 0 ? (
                      <tr>
                        <td colSpan={colSpanTotal} className="p-4 text-center text-slate-500 font-bold">Chargement instantané...</td>
                      </tr>
                    ) : articlesAffiches.length === 0 ? (
                      <tr>
                        <td colSpan={colSpanTotal} className="p-4 text-center text-slate-500 font-bold">Aucun article enregistré pour le module {moduleActuel}.</td>
                      </tr>
                    ) : (
                      articlesAffiches.map((art) => {
                        const artId = art.id_article || art.id;
                        const stockCalculé = calculerStockReelDirect(artId, depotFiltre, emplacementFiltre);
                        const prixAchatValeur = art.Prix_Achat || art.prix_achat || 0;

                        return (
                          <tr 
                            key={artId}
                            onClick={() => {
                              if (enTrainDeSauvegarder) return;
                              if (!permissions.modification) {
                                alert("⛔ Action non autorisée : Vous n’avez pas le droit de modifier les articles.");
                                return;
                              }
                              ouvrirEdition(art);
                            }}
                            className={`transition select-none ${permissions.modification ? 'hover:bg-orange-50/70 cursor-pointer' : 'cursor-default'}`}
                          >
                            <td className="p-2.5 font-black text-[10px] whitespace-nowrap uppercase text-slate-900">
                              {art.Designation || art.designation}
                            </td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {stockCalculé}
                              </span>
                            </td>

                            {emplacementsTableau.map((emp) => {
                              const stockEmp = calculerStockReelDirect(artId, depotFiltre, emp.id);
                              return (
                                <td key={emp.id} className="p-2.5 text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${stockEmp > 0 ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'text-slate-400 font-bold'}`}>
                                    {stockEmp}
                                  </span>
                                </td>
                              );
                            })}

                            {moduleActuel !== 'LIVRAISON' && (
                              <td className="p-2.5 text-right font-extrabold text-slate-800 text-[10px] whitespace-nowrap">
                                {prixAchatValeur}
                              </td>
                            )}
                            <td className="p-2.5 text-right font-black text-emerald-700 text-[10px] whitespace-nowrap">
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
                <div className="text-center pt-2 pb-2">
                  <button
                    type="button"
                    disabled={enTrainDeSauvegarder}
                    onClick={() => setLimiteArticles(prev => prev + 20)}
                    className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-xs border border-slate-300 w-full"
                  >
                    📥 Charger 20 articles de plus ({articlesFiltres.length - limiteArticles} restants)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {modeVue === 'statistiques' && (() => {
        const artObj = articleStatObjet;
        const nomArticle = artObj ? (artObj.Designation || artObj.designation || '') : '';
        const stats = artObj ? obtenirHistoriqueChronologiqueStat(artObj.id_article || artObj.id) : { lignes: [], stockFinal: 0 };

        return (
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black uppercase text-[8.5px] text-slate-700 mb-0.5 truncate">Date début</label>
                  <input
                    type="date"
                    disabled={enTrainDeSauvegarder}
                    value={dateDebutStat}
                    onChange={(e) => setDateDebutStat(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-mono font-bold text-slate-900 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block font-black uppercase text-[8.5px] text-slate-700 mb-0.5 truncate">Date fin</label>
                  <input
                    type="date"
                    disabled={enTrainDeSauvegarder}
                    value={dateFinStat}
                    onChange={(e) => setDateFinStat(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-mono font-bold text-slate-900 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black uppercase text-[8.5px] text-slate-700 mb-0.5 truncate">Dépôt</label>
                  <select
                    disabled={enTrainDeSauvegarder}
                    value={depotStatFiltre}
                    onChange={(e) => setDepotStatFiltre(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-black text-slate-900 shadow-xs"
                  >
                    <option value="TOUS">Tous les dépôts</option>
                    {depots.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.nom_depot || dep.Nom_Depot}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-black uppercase text-[8.5px] text-slate-700 mb-0.5 truncate">Article</label>
                  <div
                    onClick={() => {
                      if (enTrainDeSauvegarder) return;
                      setRechercheModalArticle('');
                      setAfficherModalSelectionArticle(true);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-black text-slate-900 shadow-xs cursor-pointer flex justify-between items-center"
                  >
                    <span className="truncate uppercase">
                      {artObj ? nomArticle : '-- Sélectionner --'}
                    </span>
                    <span className="text-[10px] text-slate-400">🔍</span>
                  </div>
                </div>
              </div>
            </div>

            {artObj ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-900 text-white px-2.5 py-1.5 rounded-xl shadow-xs">
                  <h4 className="font-black uppercase text-[9.5px]">📈 STATISTIQUES & MOUVEMENTS : {nomArticle}</h4>
                  <button
                    type="button"
                    disabled={enTrainDeSauvegarder}
                    onClick={() => imprimerOngletActif('STATISTIQUES ARTICLE')}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-black px-2 py-0.5 rounded-lg text-[9.5px] border border-slate-700 flex items-center gap-1 shadow-2xs"
                  >
                    <span>🖨️ Imprimer</span>
                  </button>
                </div>

                <div id="section-impression-statistiques" className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black">
                        <th className="p-2.5">Nom de l'article</th>
                        <th className="p-2.5 text-center">Type Mvt</th>
                        <th className="p-2.5 text-center">Quantité</th>
                        <th className="p-2.5 text-center text-blue-700">Stock Progressif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[10.5px]">
                      {stats.lignes.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-4 text-center text-slate-500 font-bold">Aucun mouvement enregistré sur cette période.</td>
                        </tr>
                      ) : (
                        stats.lignes.map((ligne, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="p-2.5 font-black uppercase text-slate-900">{nomArticle}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded font-black text-[9.5px] ${
                                ligne.typeAbr === 'APP' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                ligne.typeAbr === 'ME' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                ligne.typeAbr === 'MS' ? 'bg-red-100 text-red-800 border border-red-200' :
                                ligne.typeAbr === 'TR' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {ligne.typeAbr}
                              </span>
                            </td>
                            <td className={`p-2.5 text-center font-black ${ligne.impactStock < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                              {ligne.impactStock > 0 ? `+${ligne.quantiteMouvementee}` : ligne.impactStock < 0 ? `-${ligne.quantiteMouvementee}` : ligne.quantiteMouvementee}
                            </td>
                            <td className="p-2.5 text-center font-black text-blue-700 bg-blue-50/50">
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
              <div className="p-6 text-center text-slate-500 font-bold">Veuillez sélectionner un article.</div>
            )}
          </div>
        );
      })()}

      {modeVue === 'rapport' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className="block font-black uppercase text-[8.5px] text-slate-700 mb-0.5">Du</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={dateDebutRapport}
                  onChange={(e) => setDateDebutRapport(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-mono font-bold text-slate-900 shadow-xs"
                />
              </div>

              <div>
                <label className="block font-black uppercase text-[8.5px] text-slate-700 mb-0.5">Au</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={dateFinRapport}
                  onChange={(e) => setDateFinRapport(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-mono font-bold text-slate-900 shadow-xs"
                />
              </div>

              <div>
                <label className="block font-black uppercase text-[8.5px] text-slate-700 mb-0.5">Dépôt / Partenaire</label>
                <select
                  disabled={enTrainDeSauvegarder}
                  value={depotRapportFiltre}
                  onChange={(e) => setDepotRapportFiltre(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-black text-slate-900 shadow-xs"
                >
                  <option value="TOUS">Tous les dépôts</option>
                  {depots.map((dep) => (
                    <option key={dep.id} value={dep.id}>
                      {dep.nom_depot || dep.Nom_Depot}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-900 text-white px-2.5 py-1.5 rounded-xl shadow-xs">
            <h4 className="font-black uppercase text-[9.5px]">📊 RAPPORT DE STOCK PAR ARTICLE [{moduleActuel}]</h4>
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={() => imprimerOngletActif('RAPPORT DE STOCK')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-black px-2 py-0.5 rounded-lg text-[9.5px] border border-slate-700 flex items-center gap-1 shadow-2xs"
            >
              <span>🖨️ Imprimer</span>
            </button>
          </div>

          <div id="section-impression-rapport" className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black">
                  <th className="p-2.5">Désignation</th>
                  <th className="p-2.5 text-center">Stock Initial</th>
                  <th className="p-2.5 text-center text-emerald-700">Entrées</th>
                  <th className="p-2.5 text-center">Stock Total</th>
                  <th className="p-2.5 text-center text-red-600">Sorties</th>
                  <th className="p-2.5 text-center text-blue-700">Stock Réel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10.5px]">
                {articlesRapportFiltres.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-slate-500 font-bold">Aucun article n'a fait de mouvement pour ce partenaire.</td>
                  </tr>
                ) : (
                  articlesRapportFiltres.map((art) => {
                    const artId = art.id_article || art.id;
                    const rep = calculerLigneRapportStock(artId);

                    return (
                      <tr key={artId} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 font-black uppercase text-slate-900">{art.Designation || art.designation}</td>
                        <td className="p-2.5 text-center font-bold text-slate-700">{rep.stockInitial}</td>
                        <td className="p-2.5 text-center font-black text-emerald-700">+{rep.entrees}</td>
                        <td className="p-2.5 text-center font-bold text-slate-800">{rep.stockTotal}</td>
                        <td className="p-2.5 text-center font-black text-red-600">-{rep.sorties}</td>
                        <td className="p-2.5 text-center font-black text-blue-700 bg-blue-50/50">{rep.stockReel}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {afficherModalSelectionArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-3 bg-slate-900 text-white flex justify-between items-center">
              <span className="font-black text-xs uppercase">SÉLECTIONNER UN ARTICLE [{moduleActuel}]</span>
              <button
                disabled={enTrainDeSauvegarder}
                onClick={() => setAfficherModalSelectionArticle(false)}
                className="text-slate-300 hover:text-white font-black text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto bg-slate-50">
              <input
                type="text"
                autoFocus
                disabled={enTrainDeSauvegarder}
                value={rechercheModalArticle}
                onChange={(e) => setRechercheModalArticle(e.target.value.toUpperCase())}
                placeholder="Rechercher..."
                style={{ textTransform: 'uppercase' }}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-black text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase"
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
                        className="bg-white hover:bg-orange-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center cursor-pointer transition shadow-2xs"
                      >
                        <span className="font-black text-slate-900 text-xs truncate mr-2 uppercase">{nomArt}</span>
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