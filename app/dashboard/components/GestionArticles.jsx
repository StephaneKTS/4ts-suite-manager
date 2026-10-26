'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionArticles({ entrepriseId = '4TS-TEST' }) {
  const [articles, setArticles] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [ventesHistoriques, setVentesHistoriques] = useState([]);
  const [depots, setDepots] = useState([]); 
  const [emplacements, setEmplacements] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [commandesLivraison, setCommandesLivraison] = useState([]);
  const [entrepriseInfo, setInfosEntreprise] = useState(null);

  // Gestion des permissions de l'utilisateur connecté
  const [permissionsUser, setPermissionsUser] = useState(null);
  const [estSuperAdmin, setEstSuperAdmin] = useState(false);

  const [modeVue, setModeVue] = useState('catalogue');
  const [articleSelectionneStatId, setArticleSelectionneStatId] = useState('');
  const [depotStatFiltre, setDepotStatFiltre] = useState('TOUS');
  const [livreurStatFiltre, setLivreurStatFiltre] = useState('TOUS');

  const [depotRapportFiltre, setDepotRapportFiltre] = useState('TOUS');

  const designationInputRef = useRef(null);

  const obtenirDateDuJour = () => {
    const d = new Date();
    const annee = d.getFullYear();
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    const jour = String(d.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  };

  const formaterDateFR = (dateStr) => {
    if (!dateStr) return '-';
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
      const [annee, mois, jour] = dateStr.split('-');
      return `${jour}/${mois}/${annee}`;
    }
    return dateStr;
  };

  const [dateDebutStat, setDateDebutStat] = useState(obtenirDateDuJour());
  const [dateFinStat, setDateFinStat] = useState(obtenirDateDuJour());

  const [dateDebutRapport, setDateDebutRapport] = useState(obtenirDateDuJour());
  const [dateFinRapport, setDateFinRapport] = useState(obtenirDateDuJour());

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

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  // Chargement des permissions utilisateur au montage
  useEffect(() => {
    async function chargerPermissions() {
      if (typeof window === 'undefined') return;
      const emailLocal = localStorage.getItem('emailConnecte') || '';
      const userLocal = localStorage.getItem('utilisateurConnecte') || '';

      const estAdmin = 
        emailLocal.toLowerCase().trim() === 'stephs7352@gmail.com' || 
        emailLocal.toLowerCase().trim() === 'bureauisma26@gmail.com' || 
        emailLocal.toLowerCase().trim() === 'stephanekts1312@gmail.com' ||
        userLocal.includes('STÉPHANE') || 
        userLocal.includes('KENMOE');

      setEstSuperAdmin(estAdmin);

      if (!estAdmin && (emailLocal || userLocal)) {
        try {
          const { data } = await supabase
            .from('utilisateurs')
            .select('permissions')
            .eq('id_entreprise', entrepriseId)
            .or(`email.eq.${emailLocal.toLowerCase()},nom_complet.ilike.${userLocal}`)
            .maybeSingle();

          if (data && data.permissions) {
            setPermissionsUser(data.permissions);
          }
        } catch (err) {
          console.error("Erreur permissions articles :", err);
        }
      }
    }
    chargerPermissions();
  }, [entrepriseId]);

  const verifierDroit = (action) => {
    if (estSuperAdmin) return true;
    if (!permissionsUser || !permissionsUser['articles_stock']) return true; 
    return permissionsUser['articles_stock'][action] === true;
  };

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
      if (listeDepots.length > 0 && depotRapportFiltre === 'TOUS') {
        setDepotRapportFiltre(String(listeDepots[0].id));
      }

      const { data: dataEmp } = await supabase
        .from('emplacements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setEmplacements(dataEmp || []);

      const { data: dataMvts } = await supabase.from('mouvements_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      setMouvements(dataMvts || []);

      const { data: dataApp } = await supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      setApprovisionnements(dataApp || []);

      const { data: dataVentes } = await supabase.from('ventes_historiques').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      setVentesHistoriques(dataVentes || []);

      const { data: dataCmd } = await supabase.from('commandes_livraison_en_tete').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      setCommandesLivraison(dataCmd || []);
    } catch (err) {
      console.error('Erreur chargement références :', err.message);
    }
  };

  const chargerArticles = async () => {
    setChargement(true);
    try {
      let { data, error } = await supabase
        .from('articles_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      let liste = data || [];
      if (liste.length === 0) {
        const { data: dataAll } = await supabase
          .from('articles_stock')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .order('created_at', { ascending: false });
        liste = dataAll || [];
      }

      setArticles(liste);
      
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

  const correspondAuDepot = (valeurDepotFlux, depotCibleId) => {
    if (!depotCibleId || depotCibleId === 'TOUS') return true;
    if (!valeurDepotFlux) return false;
    if (String(valeurDepotFlux) === String(depotCibleId)) return true;
    const depotObj = depots.find((d) => String(d.id) === String(depotCibleId));
    if (depotObj && depotObj.nom_depot && String(valeurDepotFlux).trim().toUpperCase() === String(depotObj.nom_depot).trim().toUpperCase()) return true;
    return false;
  };

  const correspondAuLivreur = (mvt, livreurCibleId) => {
    if (!livreurCibleId || livreurCibleId === 'TOUS') return true;
    const empCible = emplacements.find(e => String(e.id) === String(livreurCibleId));
    if (!empCible) return false;

    const empIdCible = String(empCible.id);
    const nomEmpCible = (empCible.nom_emplacement || empCible.responsable_emplacement || '').trim().toUpperCase();
    
    const srcId = String(mvt.id_emplacement_source || '');
    const destId = String(mvt.id_emplacement_destination || '');

    if (srcId === empIdCible || destId === empIdCible) {
      return true;
    }

    const remarque = (mvt.motif_remarque || '').toUpperCase();
    if (nomEmpCible && remarque.includes(nomEmpCible)) {
      return true;
    }

    return false;
  };

  const obtenirTousLesFluxArticle = (articleId, depotCibleId = 'TOUS', livreurCibleId = 'TOUS', avecFiltreDate = true) => {
    let flux = [];
    
    mouvements.filter((m) => String(m.id_article) === String(articleId)).forEach((m) => {
      let depotSourceFlux = m.id_depot_source;
      let depotDestFlux = m.id_depot_destination;

      let typeMvt = (m.type_mouvement || '').toUpperCase();
      let libelleRemarque = m.motif_remarque || '';

      if (typeMvt === 'SORTIE' && (libelleRemarque.includes('LIVRAISON EFFECTIVE') || libelleRemarque.includes('CMD-') || libelleRemarque.includes('VENTE'))) {
        const matchCmd = commandesLivraison.find(c => libelleRemarque.includes(c.numero_commande));
        if (matchCmd) {
          libelleRemarque = matchCmd.numero_commande;
          typeMvt = 'LIV';
          if (!depotSourceFlux && matchCmd.id_depot) depotSourceFlux = matchCmd.id_depot;
        } else {
          typeMvt = 'LIV';
        }
      } else if ((typeMvt === 'ENTREE' && libelleRemarque.includes('APPRO')) || typeMvt.includes('APPROVISIONNEMENT')) {
        typeMvt = 'AP';
      } else if (typeMvt === 'TRANSFERT') {
        typeMvt = 'TR';
      }

      const matchDepotSource = correspondAuDepot(depotSourceFlux, depotCibleId);
      const matchDepotDest = correspondAuDepot(depotDestFlux, depotCibleId);
      const matchDepot = depotCibleId === 'TOUS' || matchDepotSource || matchDepotDest;

      const matchLivreur = correspondAuLivreur(m, livreurCibleId);

      if (matchDepot && matchLivreur) {
        const dateMvtStr = m.created_at ? m.created_at.split('T')[0] : '';
        if (avecFiltreDate) {
          if (dateDebutStat && dateMvtStr && dateMvtStr < dateDebutStat) return;
          if (dateFinStat && dateMvtStr && dateMvtStr > dateFinStat) return;
        }

        flux.push({ 
          date: m.created_at || '', 
          depot_source: depotSourceFlux, 
          depot_destination: depotDestFlux,
          emplacement_source: m.id_emplacement_source,
          emplacement_destination: m.id_emplacement_destination,
          quantite: parseInt(m.quantite || 0), 
          type: typeMvt,
          remarque: libelleRemarque,
          referenceObjet: null
        });
      }
    });

    if (!livreurCibleId || livreurCibleId === 'TOUS') {
      approvisionnements.forEach((app) => {
        if (depotCibleId === 'TOUS' || correspondAuDepot(app.id_depot_destination, depotCibleId)) {
          let articlesAppro = [];
          if (app.details_articles) {
            if (typeof app.details_articles === 'string') { try { articlesAppro = JSON.parse(app.details_articles); } catch (e) {} }
            else if (Array.isArray(app.details_articles)) { articlesAppro = app.details_articles; }
          }
          articlesAppro.forEach((ligne) => {
            if (String(ligne.id_article || ligne.article_id) === String(articleId)) {
              const dateAppStr = app.created_at ? app.created_at.split('T')[0] : '';
              if (avecFiltreDate) {
                if (dateDebutStat && dateAppStr && dateAppStr < dateDebutStat) return;
                if (dateFinStat && dateAppStr && dateAppStr > dateFinStat) return;
              }

              flux.push({ 
                date: app.created_at || '', 
                depot_source: app.id_depot_destination, 
                depot_destination: null, 
                quantite: parseInt(ligne.quantite || 0), 
                type: 'AP',
                remarque: app.reference || `APP-${app.id || '01'}`,
                referenceObjet: app 
              });
            }
          });
        }
      });
    }

    flux.sort((a, b) => new Date(a.date) - new Date(b.date));
    return flux;
  };

  const calculerStockPourUnDepot = (articleId, depotId) => {
    let stockDepot = 0;
    const fluxArticle = obtenirTousLesFluxArticle(articleId, depotId, 'TOUS');
    
    fluxArticle.forEach((m) => {
      const matchDepotSource = correspondAuDepot(m.depot_source, depotId);
      const matchDepotDest = correspondAuDepot(m.depot_destination, depotId);
      const qte = m.quantite; 
      const typeMvt = m.type;

      if (typeMvt === 'INVENTAIRE' && matchDepotSource) { 
        stockDepot = qte; 
        return; 
      }
      if (typeMvt === 'TR' || typeMvt === 'TRANSFERT') { 
        return; 
      }
      if (typeMvt === 'ENTREE' || typeMvt === 'AP' || typeMvt.includes('ACHAT') || typeMvt.includes('APPROVISIONNEMENT') || typeMvt.includes('FACTURE')) {
        if (matchDepotSource || matchDepotDest) stockDepot += qte;
      } else if (typeMvt === 'SORTIE' || typeMvt === 'LIV' || typeMvt.includes('AVARIES')) {
        if (matchDepotSource) stockDepot -= qte;
      } else {
        if (matchDepotSource || matchDepotDest) stockDepot += qte;
      }
    });

    return Math.max(0, stockDepot);
  };

  const calculerStockPourEmplacement = (articleId, emplacementId, depotId = 'TOUS') => {
    let stockEmp = 0;
    const fluxArticle = obtenirTousLesFluxArticle(articleId, depotId, emplacementId);
    
    fluxArticle.forEach((m) => {
      const qte = m.quantite;
      const typeMvt = m.type;
      const matchSource = String(m.emplacement_source) === String(emplacementId);
      const matchDest = String(m.emplacement_destination) === String(emplacementId);

      if (typeMvt === 'INVENTAIRE' && matchSource) {
        stockEmp = qte;
        return;
      }
      if (typeMvt === 'TR' || typeMvt === 'TRANSFERT') {
        if (matchDest && !matchSource) stockEmp += qte;
        if (matchSource && !matchDest) stockEmp -= qte;
        return;
      }
      if (matchDest && !matchSource) stockEmp += qte;
      if (matchSource && !matchDest) stockEmp -= qte;
    });

    return Math.max(0, stockEmp);
  };

  const aEteMouvementeParDepot = (articleId, depotId) => {
    if (!depotId || depotId === 'TOUS') return true;
    const fluxArticle = obtenirTousLesFluxArticle(articleId);
    return fluxArticle.some(m => correspondAuDepot(m.depot_source, depotId) || correspondAuDepot(m.depot_destination, depotId));
  };

  const calculerStockParFiltre = (articleId) => {
    if (emplacementFiltre !== 'TOUS') {
      return calculerStockPourEmplacement(articleId, emplacementFiltre, depotFiltre);
    } else if (depotFiltre !== 'TOUS') {
      return calculerStockPourUnDepot(articleId, depotFiltre);
    } else {
      let totalGlobal = 0;
      depots.forEach(dep => {
        totalGlobal += calculerStockPourUnDepot(articleId, dep.id);
      });
      if (depots.length === 0) {
        const artObj = articles.find(a => String(a.id_article || a.id) === String(articleId));
        totalGlobal = parseInt(artObj?.Quantite_Stock || 0);
      }
      return totalGlobal;
    }
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

    if (articleEnEdition && !verifierDroit('modification')) {
      alert("⛔ Accès refusé : Vous n'avez pas les droits de modification sur les articles.");
      return;
    }
    if (!articleEnEdition && !verifierDroit('creation')) {
      alert("⛔ Accès refusé : Vous n'avez pas les droits de création sur les articles.");
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const payloadArticle = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        Designation: (nouveauArticle.Designation || '').trim().toUpperCase(),
        Code_Barre: (nouveauArticle.Code_Barre || '').trim().toUpperCase(),
        Famille: nouveauArticle.Famille,
        Prix_Achat: parseFloat(nouveauArticle.Prix_Achat) || 0,
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
        alert(`Article mis à jour avec succès dans le module ${moduleActuel} !`);
      } else {
        payloadArticle.Quantite_Stock = 0;
        const { error } = await supabase.from('articles_stock').insert([payloadArticle]);
        if (error) throw error;
        alert(`Article créé avec succès dans le module ${moduleActuel} !`);
      }

      annulerForm();
      await chargerArticles();
      await chargerDonneesReference();
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = (article) => {
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
    if (!articleEnEdition) return;

    if (!verifierDroit('suppression')) {
      alert("⛔ Accès refusé : Vous n'avez pas les droits de suppression sur les articles.");
      return;
    }

    const artId = articleEnEdition.id_article || articleEnEdition.id;
    const stockGlobalActuel = calculerStockParFiltre(artId);

    if (stockGlobalActuel > 0) {
      alert(`⛔ Impossible de supprimer ! L'article possède encore un stock de ${stockGlobalActuel} unité(s).`);
      return;
    }

    if (!confirm(`Supprimer définitivement cet article ?`)) return;

    try {
      const { error } = await supabase
        .from('articles_stock')
        .delete()
        .eq(articleEnEdition.id_article ? 'id_article' : 'id', artId)
        .eq('id_entreprise', entrepriseId);

      if (error) throw error;
      alert('Article supprimé.');
      annulerForm();
      chargerArticles();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  // Correction stricte : Ne garder l'article que s'il a un stock réel > 0 ET qu'il a effectivement connu un mouvement sur le dépôt/emplacement filtré
  const articlesFiltres = articles.filter((art) => {
    const artId = art.id_article || art.id;
    const matchFamille = familleFiltre === 'TOUTES' || String(art.Famille || art.famille) === String(familleFiltre);
    if (!matchFamille) return false;

    if (emplacementFiltre !== 'TOUS') {
      const stockEmp = calculerStockPourEmplacement(artId, emplacementFiltre, depotFiltre);
      const fluxEmp = obtenirTousLesFluxArticle(artId, depotFiltre, emplacementFiltre);
      if (stockEmp <= 0 || fluxEmp.length === 0) return false;
    } else if (depotFiltre !== 'TOUS') {
      const stockDep = calculerStockPourUnDepot(artId, depotFiltre);
      const dejaMvt = aEteMouvementeParDepot(artId, depotFiltre);
      if (stockDep <= 0 || !dejaMvt) return false;
    } else {
      const stockGlobal = calculerStockParFiltre(artId);
      if (stockGlobal <= 0) return false;
    }

    return true;
  });

  const gererTri = (colonne) => {
    if (colonneTri === colonne) {
      setOrdreTri(ordreTri === 'asc' ? 'desc' : 'asc');
    } else {
      setColonneTri(colonne);
      setOrdreTri('asc');
    }
  };

  const articlesAffiches = [...articlesFiltres].sort((a, b) => {
    let valA, valB;
    const aId = a.id_article || a.id;
    const bId = b.id_article || b.id;

    if (colonneTri === 'Designation') {
      valA = String(a.Designation || a.designation || '').toLowerCase();
      valB = String(b.Designation || b.designation || '').toLowerCase();
    } else if (colonneTri === 'Stock') {
      valA = calculerStockParFiltre(aId);
      valB = calculerStockParFiltre(bId);
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

  const emplacementsDisponibles = depotFiltre === 'TOUS' 
    ? emplacements 
    : emplacements.filter(emp => correspondAuDepot(emp.id_depot, depotFiltre));

  const articlesModalFiltres = articles.filter(art => {
    const nom = (art.Designation || art.designation || '').toLowerCase();
    return nom.includes(rechercheModalArticle.toLowerCase());
  });

  const articleStatObjet = articles.find(a => String(a.id_article || a.id) === String(articleSelectionneStatId));

  const colSpanTotal = 2 + emplacements.length + (moduleActuel !== 'LIVRAISON' ? 2 : 1);

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
    } else if (modeVue === 'statistiques') {
      const depObj = depots.find(d => String(d.id) === String(depotStatFiltre));
      const empObj = emplacements.find(e => String(e.id) === String(livreurStatFiltre));
      infosFiltresHtml = `
        <div class="meta-info">
          <span><strong>Période :</strong> du ${formaterDateFR(dateDebutStat)} au ${formaterDateFR(dateFinStat)}</span>
          <span><strong>Partenaire / Dépôt :</strong> ${depObj ? (depObj.nom_depot || depObj.Nom_Depot) : 'Tous'}</span>
          <span><strong>Livreur :</strong> ${empObj ? (empObj.nom_emplacement || empObj.responsable_emplacement) : 'Tous'}</span>
          <span><strong>Article :</strong> ${articleStatObjet ? (articleStatObjet.Designation || articleStatObjet.designation) : '-'}</span>
        </div>
      `;
    } else if (modeVue === 'rapport_stock') {
      const depObj = depots.find(d => String(d.id) === String(depotRapportFiltre));
      infosFiltresHtml = `
        <div class="meta-info">
          <span><strong>Période :</strong> du ${formaterDateFR(dateDebutRapport)} au ${formaterDateFR(dateFinRapport)}</span>
          <span><strong>Partenaire :</strong> ${depObj ? (depObj.nom_depot || depObj.Nom_Depot) : 'Tous'}</span>
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
            .text-center { text-align: center; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <h1 class="company-title">📦 ${nomEntreprise}</h1>
              <div class="doc-subtitle">${titreDocument}</div>
            </div>
            <div class="print-date">
              Édité le : ${dateImpression}
            </div>
          </div>

          ${infosFiltresHtml}

          <div>
            ${contenuActuel.innerHTML}
          </div>
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
      
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5 flex-nowrap whitespace-nowrap overflow-hidden text-ellipsis">
          <span>📦</span> GESTION DES ARTICLES
          {isGestionPerissablesActive() && <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">Mode Périssables</span>}
        </h3>
        
        {(estSuperAdmin || verifierDroit('creation')) && (
          <button
            type="button"
            onClick={() => {
              if (afficherForm) {
                annulerForm();
              } else {
                setModeVue('catalogue');
                annulerForm();
                setAfficherForm(true);
              }
            }}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs shrink-0"
          >
            {afficherForm ? '✖' : 'Nouveau'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 w-full">
        <button
          type="button"
          onClick={() => {
            setModeVue('catalogue');
            annulerForm();
          }}
          className={`px-1 py-2 rounded-lg font-black text-[9.5px] transition text-center border shadow-2xs whitespace-nowrap overflow-hidden text-ellipsis ${
            modeVue === 'catalogue' && !afficherForm 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Stock ({articles.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setModeVue('statistiques');
            annulerForm();
          }}
          className={`px-1 py-2 rounded-lg font-black text-[9.5px] transition text-center border shadow-2xs whitespace-nowrap overflow-hidden text-ellipsis ${
            modeVue === 'statistiques' 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Stats Article
        </button>

        <button
          type="button"
          onClick={() => {
            setModeVue('rapport_stock');
            annulerForm();
          }}
          className={`px-1 py-2 rounded-lg font-black text-[9.5px] transition text-center border shadow-2xs whitespace-nowrap overflow-hidden text-ellipsis ${
            modeVue === 'rapport_stock' 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          Rapport Stock
        </button>
      </div>

      {modeVue === 'catalogue' && (
        <div className="space-y-2">
          {afficherForm ? (
            <form onSubmit={enregistrerArticle} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl shadow-md space-y-2.5">
              
              <div className="flex justify-end pb-0">
                <button type="button" onClick={annulerForm} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1">✖</button>
              </div>

              <div className="grid grid-cols-[4fr_7fr] gap-2">
                <div>
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5 truncate">Famille *</label>
                  <select
                    required
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
                    value={nouveauArticle.Designation}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Designation: e.target.value.toUpperCase() })}
                    placeholder="EX: JUS 250ML"
                    style={{ textTransform: 'uppercase' }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-[10.5px] font-black text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block font-black text-[8.5px] text-slate-700 uppercase mb-0.5 truncate">P.V *</label>
                  <input
                    type="number"
                    required
                    value={nouveauArticle.Prix_Vente}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Vente: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-black text-emerald-700 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block font-black text-[8.5px] text-slate-700 uppercase mb-0.5 truncate">S.ALERTE</label>
                  <input
                    type="number"
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
                          disabled={uploadingPhoto}
                        />
                      </label>
                      <button
                        type="button"
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
                        disabled={uploadingPhoto}
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
                {articleEnEdition && (estSuperAdmin || verifierDroit('suppression')) ? (
                  <button 
                    type="button" 
                    onClick={supprimerArticleDepuisFormulaire} 
                    className="bg-red-600 hover:bg-red-700 text-white font-black px-3 py-1.5 rounded-lg text-xs shadow-xs"
                  >
                    🗑️ Supprimer
                  </button>
                ) : <div />}

                <div className="flex gap-1.5">
                  <button type="button" onClick={annulerForm} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-3 py-1.5 rounded-lg text-xs">Annuler</button>
                  
                  {(estSuperAdmin || (articleEnEdition ? verifierDroit('modification') : verifierDroit('creation'))) && (
                    <button 
                      type="submit" 
                      disabled={enTrainDeSauvegarder}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black px-4 py-1.5 rounded-lg shadow-xs text-xs transition flex items-center gap-1"
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
                <h4 className="font-black uppercase text-[9.5px]">📦 Stock des Articles</h4>
                <button
                  type="button"
                  onClick={() => imprimerOngletActif('STOCK DES ARTICLES')}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-black px-2 py-0.5 rounded-lg text-[9.5px] border border-slate-700 flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <span>🖨️ Imprimer</span>
                </button>
              </div>

              <div id="section-impression-catalogue" className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black tracking-wider">
                      <th 
                        onClick={() => gererTri('Designation')} 
                        className="p-2.5 cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap"
                      >
                        Désignation {colonneTri === 'Designation' && (ordreTri === 'asc' ? '▲' : '▼')}
                      </th>
                      <th 
                        onClick={() => gererTri('Stock')} 
                        className="p-2.5 text-center cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap"
                      >
                        STOCK {colonneTri === 'Stock' && (ordreTri === 'asc' ? '▲' : '▼')}
                      </th>

                      {emplacements.map((emp) => (
                        <th key={emp.id} className="p-2.5 text-center text-blue-700 whitespace-nowrap">
                          📍 {emp.nom_emplacement || emp.code_emplacement}
                        </th>
                      ))}

                      {moduleActuel !== 'LIVRAISON' && (
                        <th 
                          onClick={() => gererTri('Prix_Achat')} 
                          className="p-2.5 text-right cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap"
                        >
                          P.A {colonneTri === 'Prix_Achat' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                      )}

                      <th 
                        onClick={() => gererTri('Prix_Vente')} 
                        className="p-2.5 text-right cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap"
                      >
                        P.V {colonneTri === 'Prix_Vente' && (ordreTri === 'asc' ? '▲' : '▼')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chargement ? (
                      <tr>
                        <td colSpan={colSpanTotal} className="p-4 text-center text-slate-500 font-bold">Chargement...</td>
                      </tr>
                    ) : articlesAffiches.length === 0 ? (
                      <tr>
                        <td colSpan={colSpanTotal} className="p-4 text-center text-slate-500 font-bold">Aucun article enregistré pour le module {moduleActuel}.</td>
                      </tr>
                    ) : (
                      articlesAffiches.map((art) => {
                        const artId = art.id_article || art.id;
                        const stockVal = depotFiltre !== 'TOUS' 
                          ? calculerStockPourUnDepot(artId, depotFiltre)
                          : calculerStockParFiltre(artId);
                        const estEpuise = stockVal <= 0;

                        return (
                          <tr 
                            key={artId} 
                            onClick={() => ouvrirEdition(art)}
                            className="hover:bg-orange-50/70 cursor-pointer transition select-none"
                          >
                            <td className="p-2.5 font-black text-[10px] whitespace-nowrap uppercase text-slate-900">
                              {art.Designation || art.designation}
                            </td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {stockVal}
                              </span>
                            </td>

                            {emplacements.map((emp) => {
                              const stockEmp = calculerStockPourEmplacement(artId, emp.id, depotFiltre);
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
                                {art.Prix_Achat || art.prix_achat || 0}
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
            </>
          )}
        </div>
      )}

      {modeVue === 'statistiques' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className="block font-black uppercase text-[8.5px] text-slate-700 mb-0.5 truncate">Date début</label>
                <input
                  type="date"
                  value={dateDebutStat}
                  onChange={(e) => setDateDebutStat(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-mono font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-black uppercase text-[8.5px] text-slate-700 mb-0.5 truncate">Date fin</label>
                <input
                  type="date"
                  value={dateFinStat}
                  onChange={(e) => setDateFinStat(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-mono font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-black uppercase text-[8.5px] text-slate-700 mb-0.5 truncate">Dépôt / Partenaire</label>
                <select
                  value={depotStatFiltre}
                  onChange={(e) => setDepotStatFiltre(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-black text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-black uppercase text-[9px] text-slate-700 mb-0.5">Livreur</label>
                <select
                  value={livreurStatFiltre}
                  onChange={(e) => setLivreurStatFiltre(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-black text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase"
                >
                  <option value="TOUS">Tous</option>
                  {emplacements.map((emp) => {
                    const nomEmp = emp.nom_emplacement || emp.responsable_emplacement || '';
                    if (!nomEmp) return null;
                    return <option key={emp.id} value={emp.id}>{nomEmp.toUpperCase()}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="block font-black uppercase text-[9px] text-slate-700 mb-0.5">Article</label>
                <div
                  onClick={() => {
                    setRechercheModalArticle('');
                    setAfficherModalSelectionArticle(true);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-black text-slate-900 shadow-xs cursor-pointer flex justify-between items-center"
                >
                  <span className="truncate uppercase">
                    {articleStatObjet ? (articleStatObjet.Designation || articleStatObjet.designation) : '-- Sélectionner --'}
                  </span>
                  <span className="text-[10px] text-slate-400">🔍</span>
                </div>
              </div>
            </div>
          </div>

          {articleStatObjet ? (() => {
            const artId = String(articleStatObjet.id_article || articleStatObjet.id);
            const fluxArt = obtenirTousLesFluxArticle(artId, depotStatFiltre, livreurStatFiltre);

            let stockCourant = 0;
            const fluxAvecStockProgressif = fluxArt.map((f) => {
              const baseQte = f.quantite;
              let qteDelta = 0;

              if (f.type === 'INVENTAIRE') {
                stockCourant = baseQte;
                qteDelta = baseQte;
              } else if (f.type === 'TR' || f.type === 'TRANSFERT') {
                if (livreurStatFiltre !== 'TOUS') {
                  const matchDest = String(f.emplacement_destination) === String(livreurStatFiltre);
                  const matchSource = String(f.emplacement_source) === String(livreurStatFiltre);
                  if (matchDest && !matchSource) {
                    qteDelta = baseQte;
                  } else if (matchSource && !matchDest) {
                    qteDelta = -baseQte;
                  } else {
                    qteDelta = 0;
                  }
                } else {
                  qteDelta = 0;
                }
                stockCourant += qteDelta;
              } else if (f.type === 'LIV' || f.type.includes('SORTIE') || f.type.includes('AVARIES')) {
                qteDelta = -baseQte;
                stockCourant += qteDelta;
              } else {
                qteDelta = baseQte;
                stockCourant += qteDelta;
              }

              return {
                ...f,
                qteDelta,
                stockProgressif: Math.max(0, stockCourant)
              };
            });

            return (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center bg-slate-900 text-white px-2.5 py-1.5 rounded-xl shadow-xs">
                    <h4 className="font-black uppercase text-[9.5px]">📈 Statistique Article : {articleStatObjet.Designation || articleStatObjet.designation}</h4>
                    <button
                      type="button"
                      onClick={() => imprimerOngletActif(`STATISTIQUE ARTICLE - ${articleStatObjet.Designation || articleStatObjet.designation}`)}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-black px-2 py-0.5 rounded-lg text-[9.5px] border border-slate-700 flex items-center gap-1 shadow-2xs shrink-0"
                    >
                      <span>🖨️ Imprimer</span>
                    </button>
                  </div>

                  <div id="section-impression-statistiques" className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black">
                          <th className="p-2.5 w-[22%]">Date</th>
                          <th className="p-2.5 w-[36%]">Mouvement</th>
                          <th className="p-2.5 w-[22%] text-right">QTÉ</th>
                          <th className="p-2.5 w-[20%] text-right">STOCK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[10.5px]">
                        {fluxAvecStockProgressif.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="p-4 text-center text-slate-500 font-bold">Aucun mouvement enregistré pour cet article avec ces filtres.</td>
                          </tr>
                        ) : (
                          fluxAvecStockProgressif.map((f, i) => {
                            const estNegatif = f.qteDelta < 0;
                            const libelleAffichage = f.type;

                            let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-300';
                            if (f.type === 'AP') badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                            if (f.type === 'TR') badgeStyle = 'bg-blue-100 text-blue-800 border-blue-300';
                            if (f.type === 'LIV') badgeStyle = 'bg-orange-100 text-orange-800 border-orange-300';

                            return (
                              <tr key={i} className="hover:bg-slate-50 transition">
                                <td className="p-2.5 font-mono text-slate-600 font-bold whitespace-nowrap">
                                  {f.date ? formaterDateFR(f.date.split('T')[0]) : '-'}
                                </td>
                                <td className="p-2.5 font-bold text-slate-900">
                                  <span className={`px-2 py-0.5 rounded font-black text-[9.5px] border inline-block ${badgeStyle}`}>
                                    {libelleAffichage}
                                  </span>
                                </td>
                                <td className={`p-2.5 text-right font-black font-mono whitespace-nowrap ${estNegatif ? 'text-red-600' : (f.qteDelta > 0 ? 'text-emerald-700' : 'text-slate-500')}`}>
                                  {estNegatif ? f.qteDelta : (f.qteDelta > 0 ? `+${f.qteDelta}` : f.qteDelta)}
                                </td>
                                <td className="p-2.5 text-right font-black font-mono text-slate-900 whitespace-nowrap">
                                  {f.stockProgressif}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="p-6 text-center text-slate-500 font-bold">Veuillez sélectionner un article.</div>
          )}

        </div>
      )}

      {modeVue === 'rapport_stock' && (
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
          
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-2">
            <div className="grid grid-cols-3 gap-1.5 items-end">
              <div>
                <label className="block font-black uppercase text-[8.5px] text-slate-700 mb-0.5 truncate">Date début</label>
                <input
                  type="date"
                  value={dateDebutRapport}
                  onChange={(e) => setDateDebutRapport(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-mono font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-black uppercase text-[8.5px] text-slate-700 mb-0.5 truncate">Date fin</label>
                <input
                  type="date"
                  value={dateFinRapport}
                  onChange={(e) => setDateFinRapport(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-mono font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-black uppercase text-[8.5px] text-slate-700 mb-0.5 truncate">Partenaire</label>
                <select
                  value={depotRapportFiltre}
                  onChange={(e) => setDepotRapportFiltre(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-black text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {depots.length === 0 ? (
                    <option value="TOUS">Aucun dépôt</option>
                  ) : (
                    depots.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.nom_depot || dep.Nom_Depot}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center bg-slate-900 text-white px-2.5 py-1.5 rounded-xl shadow-xs">
              <h4 className="font-black uppercase text-[9.5px]">📋 RAPPORT DE STOCK</h4>
              <button
                type="button"
                onClick={() => imprimerOngletActif('RAPPORT DE STOCK')}
                className="bg-slate-800 hover:bg-slate-700 text-white font-black px-2 py-0.5 rounded-lg text-[9.5px] border border-slate-700 flex items-center gap-1 shadow-2xs shrink-0"
              >
                <span>🖨️ Imprimer</span>
              </button>
            </div>

            <div id="section-impression-rapport_stock" className="border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[8px] font-black">
                    <th className="py-2 px-1">Désignation</th>
                    <th className="py-2 px-1 text-center whitespace-nowrap">Stock I.</th>
                    <th className="py-2 px-1 text-center whitespace-nowrap">Entrée</th>
                    <th className="py-2 px-1 text-center whitespace-nowrap">Total</th>
                    <th className="py-2 px-1 text-center whitespace-nowrap">Sortie</th>
                    <th className="py-2 px-1 text-center whitespace-nowrap">Stock Réel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articles.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-4 text-center text-slate-500 font-bold">Aucun article disponible.</td>
                    </tr>
                  ) : depotRapportFiltre === 'TOUS' ? (
                    <tr>
                      <td colSpan="6" className="p-4 text-center text-orange-600 font-bold">Veuillez sélectionner un dépôt partenaire ci-dessus.</td>
                    </tr>
                  ) : (() => {
                    const articlesFiltresPartenaire = articles.filter((art) => {
                      const artId = art.id_article || art.id;
                      const rapport = calculerLigneRapportStock(artId, depotRapportFiltre, dateDebutRapport, dateFinRapport);
                      return rapport.stockInitial > 0 || rapport.totalEntrees > 0 || rapport.totalSorties > 0;
                    });

                    if (articlesFiltresPartenaire.length === 0) {
                      return (
                        <tr>
                          <td colSpan="6" className="p-4 text-center text-slate-500 font-bold">Aucun article n'a encore transité par ce dépôt.</td>
                        </tr>
                      );
                    }

                    return articlesFiltresPartenaire.map((art) => {
                      const artId = art.id_article || art.id;
                      const rapport = calculerLigneRapportStock(artId, depotRapportFiltre, dateDebutRapport, dateFinRapport);

                      return (
                        <tr key={artId} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-1 font-black uppercase text-slate-900 text-[9.5px] max-w-[90px] truncate">
                            {art.Designation || art.designation}
                          </td>
                          <td className="py-2 px-1 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                            {rapport.stockInitial}
                          </td>
                          <td className="py-2 px-1 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">
                            <span className="bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 inline-block">
                              +{rapport.totalEntrees}
                            </span>
                          </td>
                          <td className="py-2 px-1 text-center font-mono font-extrabold text-blue-800 whitespace-nowrap">
                            {rapport.totalDisponible}
                          </td>
                          <td className="py-2 px-1 text-center font-mono font-bold text-rose-700 whitespace-nowrap">
                            <span className="bg-rose-50 px-1 py-0.5 rounded border border-rose-200 inline-block">
                              -{rapport.totalSorties}
                            </span>
                          </td>
                          <td className="py-2 px-1 text-center font-mono font-black text-slate-900 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9.5px] ${rapport.stockReel > 0 ? 'bg-orange-100 text-orange-900 border border-orange-200' : 'bg-slate-100 text-slate-500'}`}>
                              {rapport.stockReel}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {afficherModalSelectionArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-3 bg-slate-900 text-white flex justify-between items-center">
              <span className="font-black text-xs uppercase">SÉLECTIONNER UN ARTICLE [{moduleActuel}]</span>
              <button
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
                value={rechercheModalArticle}
                onChange={(e) => setRechercheModalArticle(e.target.value.toUpperCase())}
                placeholder="Rechercher..."
                style={{ textTransform: 'uppercase' }}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-black text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase"
              />

              <div className="space-y-1.5 pt-1">
                {articlesModalFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-xs font-bold">Aucun article trouvé pour le module {moduleActuel}.</p>
                ) : (
                  articlesModalFiltres.map((art) => {
                    const idA = String(art.id_article || art.id);
                    const nomArt = art.Designation || art.designation || '';
                    const stockArt = depotStatFiltre === 'TOUS' ? calculerStockParFiltre(idA) : calculerStockPourUnDepot(idA, depotStatFiltre);

                    return (
                      <div
                        key={idA}
                        onClick={() => {
                          setArticleSelectionneStatId(idA);
                          setAfficherModalSelectionArticle(false);
                        }}
                        className="bg-white hover:bg-orange-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center cursor-pointer transition shadow-2xs"
                      >
                        <span className="font-black text-slate-900 text-xs truncate mr-2 uppercase">{nomArt}</span>
                        <span className="font-bold text-emerald-700 font-mono text-xs shrink-0">Stock : {stockArt}</span>
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