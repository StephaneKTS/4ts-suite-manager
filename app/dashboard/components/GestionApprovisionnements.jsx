'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { localSync } from '../../lib/localSync';

export default function GestionApprovisionnements({ entrepriseId = '4TS-234321' }) {
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const estModeLivraison = moduleActuel === 'LIVRAISON';

  const cleCacheAppro = `approvisionnements_${entrepriseId}_${moduleActuel}`;
  const cleCacheCommandes = `commandes_${entrepriseId}_${moduleActuel}`;
  const cleCacheMouvements = `mouvements_stock_${entrepriseId}_${moduleActuel}`;
  const cleCacheArticles = `articles_${entrepriseId}_${moduleActuel}`;

  // --- FILTRE INTELLIGENT : MOIS EN COURS PAR DÉFAUT ---
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

  // --- INITIALISATION INSTANTANÉE DEPUIS LE CACHE LOCAL ---
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
  const [chargement, setChargement] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  // --- GESTION DES DROITS ET AUTORISATIONS DES EMPLOYÉS ---
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

  // --- PAGINATION / LIMITES D'AFFICHAGE MOBILES ---
  const [limiteAppro, setLimiteAppro] = useState(20);
  const [limiteCommandes, setLimiteCommandes] = useState(20);
  const [limiteArticlesModal, setLimiteArticlesModal] = useState(20);

  const [numeroDoc, setNumeroDoc] = useState('');
  const [referenceFournisseur, setReferenceFournisseur] = useState('');
  const [dateDoc, setDateDoc] = useState(new Date().toISOString().split('T')[0]);
  const [idFournisseur, setIdFournisseur] = useState('');
  const [idDepotDestination, setIdDepotDestination] = useState('');
  const [delaiLivraison, setDelaiLivraison] = useState('7 JOURS');
  const [statutPaiement, setStatutPaiement] = useState('SOLDE');
  const [montantPaye, setMontantPaye] = useState(0);

  const [modalArticleOuverte, setModalArticleOuverte] = useState(false);
  const [rechercheArticle, setRechercheArticle] = useState('');
  const [articleCourant, setArticleCourant] = useState({ id_article: '', designation: '', quantite: '1', prix_achat: '0' });
  const [indexEnCoursModif, setIndexEnCoursModif] = useState(null);

  const [lignesValidees, setLignesValidees] = useState([]);
  const [modalPartageOuverte, setModalPartageOuverte] = useState(false);
  const [formatPartage, setFormatPartage] = useState('PDF');

  const [triCol, setTriCol] = useState('date');
  const [triOrdre, setTriOrdre] = useState('desc');

  const inputQuantiteRef = useRef(null);
  const selectArticleRef = useRef(null);

  const genererNumeroDoc = (type, listeDocs) => {
    const prefix = type === 'APPRO' ? 'APP-' : 'BC-';
    const docsFiltres = (listeDocs || []).filter(d => ((d.numero_bon || d.numero_commande) || '').startsWith(prefix));
    const seq = String(docsFiltres.length + 1).padStart(2, '0');
    return `${prefix}${seq}`;
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
        .order('created_at', { ascending: false });

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
        .order('created_at', { ascending: false });
      
      if (dataBC) {
        setBonsCommandes(dataBC);
        localSync.sauvegarderDonneesLocales(cleCacheCommandes, dataBC);
      }

      if (!approEnEditionId && !numeroDoc) {
        setNumeroDoc(genererNumeroDoc('APPRO', dataAppro || approvisionnements));
      }
    } catch (err) {
      console.error('Erreur chargement (mode hors-ligne actif) :', err.message);
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

  const gererChangementPartenaire = (e) => {
    if (enTrainDeSauvegarder) return;
    const partenaireId = e.target.value;
    setIdFournisseur(partenaireId);

    if (partenaireId) {
      const frsTrouve = fournisseurs.find(f => String(f.id) === String(partenaireId));
      if (frsTrouve) {
        if (estStatutSansStockage(frsTrouve.statut_stockage)) {
          setIdDepotDestination('');
        } else if (estModeLivraison && frsTrouve.id_depot) {
          setIdDepotDestination(frsTrouve.id_depot);
        } else {
          setIdDepotDestination('');
        }
      }
    } else {
      setIdDepotDestination('');
    }
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

  const obtenirTousLesFluxArticle = (articleId) => {
    let flux = [];
    mouvements.filter((m) => String(m.id_article) === String(articleId)).forEach((m) => {
      flux.push({ date: m.created_at || '', depot_source: m.id_depot_source, depot_destination: m.id_depot_destination, quantite: parseInt(m.quantite || 0), type: (m.type_mouvement || '').toUpperCase() });
    });
    
    approvisionnements.forEach((app) => {
      let articlesAppro = [];
      if (app.details_articles) {
        if (typeof app.details_articles === 'string') { try { articlesAppro = JSON.parse(app.details_articles); } catch (e) {} }
        else if (Array.isArray(app.details_articles)) { articlesAppro = app.details_articles; }
      }
      articlesAppro.forEach((ligne) => {
        if (String(ligne.id_article || ligne.article_id) === String(articleId)) {
          flux.push({ date: app.created_at || '', depot_source: app.id_depot_destination, depot_destination: null, quantite: parseInt(ligne.quantite || 0), type: 'APPROVISIONNEMENT' });
        }
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

  const montantTotalGlobal = lignesValidees.reduce((sum, item) => sum + (Number(item.quantite || 0) * Number(item.prix_achat || 0)), 0);
  const soldeRestant = statutPaiement === 'SOLDE' ? 0 : statutPaiement === 'CREDIT' ? montantTotalGlobal : Math.max(0, montantTotalGlobal - (parseFloat(montantPaye) || 0));

  const verifierEnTeteAvantSaisie = () => {
    if (!dateDoc) { alert('⚠️ Veuillez renseigner la date.'); return false; }
    if (!idFournisseur) { alert('⚠️ Veuillez sélectionner un partenaire.'); return false; }
    if (!estModeLivraison && (!referenceFournisseur || !referenceFournisseur.trim())) { alert('⚠️ Veuillez renseigner la référence.'); return false; }
    if (!estPartenaireSansStockage && !idDepotDestination) { alert('⚠️ Veuillez sélectionner un dépôt.'); return false; }
    return true;
  };

  const preparerNouveauDoc = (type) => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.peut_creer) {
      alert('⛔ Accès refusé : Votre profil ne dispose pas des droits de création.');
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
    setStatutPaiement('SOLDE');
    setMontantPaye(0);
    setIndexEnCoursModif(null);
    setVueActive(type === 'APPRO' ? 'formulaire_facture' : 'formulaire_commande');
  };

  const ajouterArticleCourant = () => {
    if (enTrainDeSauvegarder) return;
    if (!verifierEnTeteAvantSaisie()) return;
    if (!articleCourant.id_article) { alert('Veuillez sélectionner un article.'); return; }
    const qte = parseInt(articleCourant.quantite);
    const pxAchat = estModeLivraison ? 0 : parseFloat(articleCourant.prix_achat);
    if (isNaN(qte) || qte <= 0) { alert('Quantité invalide.'); return; }
    if (!estModeLivraison && (isNaN(pxAchat) || pxAchat < 0)) { alert('Prix invalide.'); return; }

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
    if (enTrainDeSauvegarder) return;
    const ligne = lignesValidees[index];
    setArticleCourant({ id_article: ligne.id_article, designation: ligne.designation, quantite: ligne.quantite, prix_achat: ligne.prix_achat });
    setIndexEnCoursModif(index);
  };

  const enregistrerFacture = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;
    if (approEnEditionId && !permissions.peut_modifier) {
      alert('⛔ Accès refusé : Votre profil ne dispose pas des droits de modification.');
      return;
    }
    if (!approEnEditionId && !permissions.peut_creer) {
      alert('⛔ Accès refusé : Votre profil ne dispose pas des droits de création.');
      return;
    }
    if (!verifierEnTeteAvantSaisie() || lignesValidees.length === 0) { 
      if (lignesValidees.length === 0) alert('Ajoutez au moins un article.'); 
      return; 
    }

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        numero_bon: numeroDoc,
        id_fournisseur: idFournisseur,
        numero_commande: (referenceFournisseur || '').trim().toUpperCase(),
        id_depot_destination: estPartenaireSansStockage ? null : idDepotDestination,
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
      };

      if (approEnEditionId) { 
        payload.id = approEnEditionId;
        const { error } = await supabase.from('approvisionnements').update(payload).eq('id', approEnEditionId);
        if (error) {
          localSync.ajouterFileAttente('UPDATE', 'approvisionnements', payload);
        }

        const listeMaj = approvisionnements.map(a => a.id === approEnEditionId ? { ...a, ...payload } : a);
        setApprovisionnements(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheAppro, listeMaj);
      } else { 
        const idTemp = 'temp_' + Date.now();
        const nouvelObjet = { ...payload, id: idTemp, created_at: new Date().toISOString() };
        const { error } = await supabase.from('approvisionnements').insert([payload]); 
        if (error) {
          localSync.ajouterFileAttente('INSERT', 'approvisionnements', payload);
        }

        const listeMaj = [nouvelObjet, ...approvisionnements];
        setApprovisionnements(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheAppro, listeMaj);
      }

      localStorage.removeItem(cleCacheAppro);
      alert(`Approvisionnement ${numeroDoc} enregistré avec succès !`);
      setVueActive('liste');
      await chargerDonnees(true);
    } catch (err) { 
      alert('Erreur : ' + err.message); 
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const enregistrerCommande = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;
    if (approEnEditionId && !permissions.peut_modifier) {
      alert('⛔ Accès refusé : Votre profil ne dispose pas des droits de modification.');
      return;
    }
    if (!approEnEditionId && !permissions.peut_creer) {
      alert('⛔ Accès refusé : Votre profil ne dispose pas des droits de création.');
      return;
    }
    if (!verifierEnTeteAvantSaisie() || lignesValidees.length === 0) { 
      if (lignesValidees.length === 0) alert('Ajoutez au moins un article.'); 
      return; 
    }

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        numero_commande: numeroDoc,
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
      };

      if (approEnEditionId) { 
        payload.id = approEnEditionId;
        const { error } = await supabase.from('bons_commande_fournisseurs').update(payload).eq('id', approEnEditionId);
        if (error) {
          localSync.ajouterFileAttente('UPDATE', 'bons_commande_fournisseurs', payload);
        }

        const listeMaj = bonsCommandes.map(c => c.id === approEnEditionId ? { ...c, ...payload } : c);
        setBonsCommandes(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheCommandes, listeMaj);
      } else { 
        const idTemp = 'temp_' + Date.now();
        const nouvelObjet = { ...payload, id: idTemp, created_at: new Date().toISOString() };
        const { error } = await supabase.from('bons_commande_fournisseurs').insert([payload]); 
        if (error) {
          localSync.ajouterFileAttente('INSERT', 'bons_commande_fournisseurs', payload);
        }

        const listeMaj = [nouvelObjet, ...bonsCommandes];
        setBonsCommandes(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheCommandes, listeMaj);
      }

      localStorage.removeItem(cleCacheCommandes);
      alert(`Bon de commande ${numeroDoc} enregistré avec succès !`);
      setVueActive('liste');
      await chargerDonnees(true);
    } catch (err) { 
      alert('Erreur : ' + err.message); 
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const transformerEnFacture = async (doc) => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.peut_valider) {
      alert('⛔ Accès refusé : Votre profil ne dispose pas des droits de validation/transformation.');
      return;
    }
    if (!doc) return;
    if (!confirm('Voulez-vous transformer ce bon de commande en approvisionnement (ce qui va incrémenter le stock) ?')) return;

    setEnTrainDeSauvegarder(true);
    try {
      const nouveauNumAppro = genererNumeroDoc('APPRO', approvisionnements);
      
      const payloadFacture = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        numero_bon: nouveauNumAppro,
        id_fournisseur: doc.id_fournisseur || idFournisseur,
        numero_commande: (doc.numero_commande || referenceFournisseur || '').trim().toUpperCase(),
        id_depot_destination: estPartenaireSansStockage ? null : (doc.id_depot_destination || idDepotDestination),
        montant_total: estModeLivraison ? 0 : (doc.montant_total || montantTotalGlobal),
        montant_paye: estModeLivraison ? 0 : (doc.montant_total || montantTotalGlobal),
        statut_paiement: 'SOLDE',
        details_articles: doc.details_articles || lignesValidees.map(l => ({ 
          id_article: l.id_article, 
          designation: (l.designation || '').toUpperCase(), 
          quantite: Number(l.quantite), 
          prix_achat: estModeLivraison ? 0 : Number(l.prix_achat), 
          sous_total: estModeLivraison ? 0 : Number(l.quantite) * Number(l.prix_achat) 
        }))
      };

      const { error: rpcError } = await supabase.rpc('transformer_commande_en_appro', {
        p_entreprise_id: entrepriseId,
        p_module: moduleActuel,
        p_commande_id: doc.id,
        p_nouveau_num_bon: nouveauNumAppro,
        p_payload_facture: payloadFacture
      });

      if (rpcError) {
        const { error: errInsert } = await supabase.from('approvisionnements').insert([payloadFacture]);
        if (errInsert) {
          localSync.ajouterFileAttente('INSERT', 'approvisionnements', payloadFacture);
        }

        if (doc.id) {
          const { error: errDel } = await supabase.from('bons_commande_fournisseurs').delete().eq('id', doc.id);
          if (errDel) {
            localSync.ajouterFileAttente('DELETE', 'bons_commande_fournisseurs', { id: doc.id });
          }
        }
      }

      localStorage.removeItem(cleCacheAppro);
      localStorage.removeItem(cleCacheCommandes);
      alert(`Succès ! Le bon a été transformé en approvisionnement : ${nouveauNumAppro}`);
      setVueActive('liste');
      setOngletActif('APPRO');
      await chargerDonnees(true);
    } catch (err) {
      alert('Erreur lors de la transformation : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirDocModification = (doc, type) => {
    if (enTrainDeSauvegarder) return;
    setApproEnEditionId(doc.id);
    setDocEnEditionObjet(doc);
    setNumeroDoc(doc.numero_bon || doc.numero_commande || '');
    setReferenceFournisseur(doc.numero_commande || doc.reference || '');
    setDateDoc(doc.created_at ? doc.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
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
    setLignesValidees(articlesDetails.map(l => ({ id_article: l.id_article, designation: (l.designation || '').toUpperCase(), quantite: String(l.quantite), prix_achat: String(l.prix_achat || l.prix_estime || '0') })));
    setIndexEnCoursModif(null);
    setVueActive(type === 'APPRO' ? 'formulaire_facture' : 'formulaire_commande');
  };

  const supprimerDoc = async (id, type) => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.peut_supprimer) {
      alert('⛔ Accès refusé : Votre profil ne dispose pas des droits de suppression.');
      return;
    }
    if (!confirm('Supprimer ce document ?')) return;
    
    setEnTrainDeSauvegarder(true);
    try {
      const table = type === 'APPRO' ? 'approvisionnements' : 'bons_commande_fournisseurs';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        localSync.ajouterFileAttente('DELETE', table, { id });
      }

      if (type === 'APPRO') {
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

      alert('Supprimé.');
      await chargerDonnees(true);
    } catch (err) { 
      alert('Erreur : ' + err.message); 
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
      else if (triCol === 'statut') { valA = a.statut_paiement || a.statut_commande || ''; valB = b.statut_paiement || b.statut_commande || ''; }
      if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const documentsHistorique = trierListe(approvisionnements);
  const commandesHistorique = trierListe(bonsCommandes);

  const documentsHistoriqueAffiches = documentsHistorique.slice(0, limiteAppro);
  const commandesHistoriqueAffiches = commandesHistorique.slice(0, limiteCommandes);
  
  const enTeteVerrouille = lignesValidees.length > 0 || enTrainDeSauvegarder;
  const rendreFlecheTri = (colonne) => triCol !== colonne ? <span className="text-slate-300 ml-0.5">↕</span> : <span className="text-orange-600 ml-0.5">{triOrdre === 'asc' ? '↑' : '↓'}</span>;

  return (
    <div className="space-y-2.5 font-sans text-xs">
      
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
            <span>📦</span> APPROVISIONNEMENTS
          </h3>
          {roleUtilisateur && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
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
              className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
            >
              Nouveau
            </button>
          )
        ) : (
          <button
            type="button"
            disabled={enTrainDeSauvegarder}
            onClick={() => setVueActive('liste')}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
          >
            ✖ Fermer
          </button>
        )}
      </div>

      {vueActive === 'liste' && (
        <div className="space-y-2">
          {/* FILTRE DE PÉRIODE SUR LE MOIS EN COURS */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
            <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-600">
              <span>📅 Période (Mois en cours)</span>
              {(dateDebutFiltre !== obtenirPremierJourDuMois() || dateFinFiltre !== obtenirDernierJourDuMois()) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateDebutFiltre(obtenirPremierJourDuMois());
                    setDateFinFiltre(obtenirDernierJourDuMois());
                  }}
                  className="text-orange-600 hover:underline font-bold"
                >
                  Réinitialiser
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Du</label>
                <input
                  type="date"
                  value={dateDebutFiltre}
                  onChange={(e) => setDateDebutFiltre(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px] font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Au</label>
                <input
                  type="date"
                  value={dateFinFiltre}
                  onChange={(e) => setDateFinFiltre(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px] font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center gap-1.5">
            <button 
              type="button" 
              disabled={enTrainDeSauvegarder}
              onClick={() => { setOngletActif('APPRO'); setVueActive('liste'); }} 
              className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition whitespace-nowrap border shadow-2xs ${ongletActif === 'APPRO' ? 'bg-orange-600 text-white border-orange-600 shadow-xs' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'}`}
            >
              📥 Appro ({documentsHistoriqueAffiches.length} / {documentsHistorique.length})
            </button>
            <button 
              type="button" 
              disabled={enTrainDeSauvegarder}
              onClick={() => { setOngletActif('COMMANDE'); setVueActive('liste'); }} 
              className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition whitespace-nowrap border shadow-2xs ${ongletActif === 'COMMANDE' ? 'bg-orange-600 text-white border-orange-600 shadow-xs' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'}`}
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
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black tracking-tight select-none">
                      <th onClick={() => gererTri('date')} className="p-2 w-[18%] cursor-pointer hover:bg-slate-200 whitespace-nowrap">DATE {rendreFlecheTri('date')}</th>
                      <th onClick={() => gererTri('numero')} className="p-2 w-[22%] font-mono cursor-pointer hover:bg-slate-200 whitespace-nowrap">N° APPRO {rendreFlecheTri('numero')}</th>
                      <th onClick={() => gererTri('fournisseur')} className="p-2 w-[42%] cursor-pointer hover:bg-slate-200 whitespace-nowrap">PARTENAIRE {rendreFlecheTri('fournisseur')}</th>
                      {!estModeLivraison && <th onClick={() => gererTri('statut')} className="p-2 w-[18%] text-right cursor-pointer hover:bg-slate-200 whitespace-nowrap">STATUT {rendreFlecheTri('statut')}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10px]">
                    {documentsHistoriqueAffiches.length === 0 ? (<tr><td colSpan={estModeLivraison ? 3 : 4} className="p-4 text-center text-slate-500 font-bold">Aucun approvisionnement enregistré.</td></tr>) : (
                      documentsHistoriqueAffiches.map((doc) => (
                        <tr key={doc.id} onClick={() => ouvrirDocModification(doc, 'APPRO')} className="hover:bg-orange-50/70 cursor-pointer transition select-none">
                          <td className="p-2 text-slate-700 font-bold whitespace-nowrap">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</td>
                          <td className="p-2 font-mono font-black text-orange-600 whitespace-nowrap">{doc.numero_bon}</td>
                          <td className="p-2 font-extrabold uppercase text-slate-900 truncate">{obtenirNomFournisseur(doc.id_fournisseur) || 'PARTENAIRE'}</td>
                          {!estModeLivraison && (
                            <td className="p-2 text-right whitespace-nowrap">
                              <span className={`inline-block px-1.5 py-0.5 rounded font-black text-[9px] ${doc.statut_paiement === 'SOLDE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-orange-100 text-orange-800 border border-orange-200'}`}>
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
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold px-3 py-1.5 rounded-xl text-[10px] transition shadow-xs border border-slate-300"
                  >
                    📥 Charger 20 appros de plus ({documentsHistorique.length - limiteAppro} restants)
                  </button>
                </div>
              )}
            </div>
          )}

          {ongletActif === 'COMMANDE' && (
            <div className="space-y-2">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black tracking-tight select-none">
                      <th onClick={() => gererTri('date')} className="p-2 w-[20%] cursor-pointer hover:bg-slate-200 whitespace-nowrap">DATE {rendreFlecheTri('date')}</th>
                      <th onClick={() => gererTri('numero')} className="p-2 w-[35%] font-mono cursor-pointer hover:bg-slate-200 whitespace-nowrap">N° CMD {rendreFlecheTri('numero')}</th>
                      <th onClick={() => gererTri('fournisseur')} className="p-2 w-[45%] cursor-pointer hover:bg-slate-200 whitespace-nowrap">PARTENAIRE {rendreFlecheTri('fournisseur')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10px]">
                    {commandesHistoriqueAffiches.length === 0 ? (<tr><td colSpan="3" className="p-4 text-center text-slate-500 font-bold">Aucun bon de commande enregistré.</td></tr>) : (
                      commandesHistoriqueAffiches.map((cmd) => (
                        <tr key={cmd.id} onClick={() => ouvrirDocModification(cmd, 'COMMANDE')} className="hover:bg-orange-50/70 cursor-pointer transition select-none">
                          <td className="p-2 text-slate-700 font-bold whitespace-nowrap">{new Date(cmd.created_at).toLocaleDateString('fr-FR')}</td>
                          <td className="p-2 font-mono font-black text-blue-600 whitespace-nowrap">{cmd.numero_commande}</td>
                          <td className="p-2 font-extrabold uppercase text-slate-900 truncate">{obtenirNomFournisseur(cmd.id_fournisseur) || 'PARTENAIRE'}</td>
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
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold px-3 py-1.5 rounded-xl text-[10px] transition shadow-xs border border-slate-300"
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
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-md space-y-3 max-w-sm mx-auto text-center">
          <div className="border-b border-slate-200 pb-2 flex justify-between items-center">
            <span className="font-black text-slate-900 text-xs uppercase">CHOISIR LE TYPE DE DOCUMENT</span>
            <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setVueActive('liste')} className="text-slate-400 hover:text-slate-700 font-black text-xs">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" disabled={enTrainDeSauvegarder || !permissions.peut_creer} onClick={() => preparerNouveauDoc('COMMANDE')} className="bg-slate-50 hover:bg-blue-50 border border-slate-300 p-3 rounded-xl flex flex-col items-center gap-1.5 transition shadow-xs">
              <span className="text-2xl">📋</span>
              <span className="font-black text-[11px] text-slate-900">Bon de Commande</span>
            </button>
            <button type="button" disabled={enTrainDeSauvegarder || !permissions.peut_creer} onClick={() => preparerNouveauDoc('APPRO')} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 p-3 rounded-xl flex flex-col items-center gap-1.5 transition shadow-xs">
              <span className="text-2xl">📥</span>
              <span className="font-black text-[11px] text-emerald-900">Approvisionnement</span>
            </button>
          </div>
        </div>
      )}

      {vueActive === 'formulaire_facture' && (
        <form onSubmit={enregistrerFacture} onKeyDown={gererKeyDown} className="bg-white p-3 rounded-xl border border-slate-200 shadow-md space-y-2.5">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-xs uppercase">📥 APPROVISIONNEMENT {enTeteVerrouille && '🔒'}</span>
              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setVueActive('liste')} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-2.5 py-1 rounded text-[10px]">⬅️ Retour</button>
            </div>
            <span className="bg-emerald-600 text-white font-mono px-2.5 py-1 rounded text-xs font-black shadow-xs">{numeroDoc}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div>
              <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Date *</label>
              <input type="date" disabled={enTeteVerrouille} required value={dateDoc} onChange={(e) => setDateDoc(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" />
            </div>
            <div>
              <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Partenaire *</label>
              <select disabled={enTeteVerrouille} required value={idFournisseur} onChange={gererChangementPartenaire} className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-xs text-slate-900 shadow-xs">
                <option value="">-- Choisir --</option>
                {fournisseursAvecStockage.map((f) => (<option key={f.id} value={f.id} className="text-slate-900">{(f.nom_fournisseur || f.nom || f.raison_sociale || '').toUpperCase()}</option>))}
              </select>
            </div>
            <div>
              <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Réf. Doc {!estModeLivraison && '*'}</label>
              <input type="text" disabled={enTeteVerrouille} required={!estModeLivraison} value={referenceFournisseur} onChange={(e) => setReferenceFournisseur(e.target.value.toUpperCase())} placeholder="RÉF" className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-extrabold uppercase text-slate-900 shadow-xs" />
            </div>
            <div>
              <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">
                {estPartenaireSansStockage ? 'DÉPÔT (SANS STOCK)' : (estModeLivraison ? 'DÉPÔT * (AUTO)' : 'DÉPÔT * (CHOIX)')}
              </label>
              {estPartenaireSansStockage ? (
                <input type="text" disabled value="-- SANS STOCK / AUCUN DÉPÔT --" className="w-full bg-amber-50 border border-amber-300 rounded p-1.5 font-extrabold text-xs text-amber-800 shadow-xs cursor-not-allowed" />
              ) : estModeLivraison ? (
                <select disabled required value={idDepotDestination} className="w-full bg-slate-100 border border-slate-300 rounded p-1.5 font-extrabold text-xs text-slate-900 shadow-xs cursor-not-allowed">
                  <option value="">-- Automatique --</option>
                  {depots.map((d) => (<option key={d.id} value={d.id} className="text-slate-900">{(d.nom_depot || d.nom || d.libelle || '').toUpperCase()}</option>))}
                </select>
              ) : (
                <select disabled={enTeteVerrouille} required value={idDepotDestination} onChange={(e) => setIdDepotDestination(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-xs text-slate-900 shadow-xs">
                  <option value="">-- Choisir le dépôt --</option>
                  {depots.map((d) => (<option key={d.id} value={d.id} className="text-slate-900">{(d.nom_depot || d.nom || d.libelle || '').toUpperCase()}</option>))}
                </select>
              )}
            </div>
          </div>
          <div className="space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="font-black uppercase text-slate-800 text-[9px] block">SAISIE DES ARTICLES</span>
            <div className={`grid ${estModeLivraison ? 'grid-cols-9' : 'grid-cols-12'} gap-1.5 items-end`}>
              <div className={estModeLivraison ? 'col-span-6' : 'col-span-5'}>
                <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Article *</label>
                <div ref={selectArticleRef} tabIndex={0} onClick={() => { if (enTrainDeSauvegarder || !verifierEnTeteAvantSaisie()) return; setModalArticleOuverte(true); }} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-extrabold uppercase text-slate-900 cursor-pointer truncate shadow-xs">
                  {articleCourant.designation ? articleCourant.designation : '-- ARTICLE --'}
                </div>
              </div>
              <div className={estModeLivraison ? 'col-span-2' : 'col-span-3'}>
                <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Qté *</label>
                <input ref={inputQuantiteRef} type="number" min="1" disabled={enTrainDeSauvegarder} value={articleCourant.quantite} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, quantite: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" />
              </div>
              {!estModeLivraison && (
                <div className="col-span-3">
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">P.A (F) *</label>
                  <input type="number" min="0" disabled={enTrainDeSauvegarder} value={articleCourant.prix_achat} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, prix_achat: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" />
                </div>
              )}
              <div className="col-span-1 text-center">
                <button type="button" disabled={enTrainDeSauvegarder} onClick={ajouterArticleCourant} className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">OK</button>
              </div>
            </div>
          </div>
          {lignesValidees.length > 0 && (
            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 uppercase text-[9px] font-black text-slate-800">
                    <th className={estModeLivraison ? 'p-2 w-[75%]' : 'p-2 w-[45%]'}>Article</th>
                    <th className={estModeLivraison ? 'p-2 w-[20%] text-center' : 'p-2 w-[15%] text-center'}>Qté</th>
                    {!estModeLivraison && <th className="p-2 w-[20%] text-right">P.A</th>}
                    {!estModeLivraison && <th className="p-2 w-[15%] text-right">Total</th>}
                    <th className="p-2 w-[5%] text-center">⚙️</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px]">
                  {lignesValidees.map((l, index) => (
                    <tr key={index} onClick={() => chargerLignePourModification(index)} className="hover:bg-orange-50/70 cursor-pointer transition select-none">
                      <td className="p-2 font-extrabold uppercase text-slate-900 truncate">{l.designation}</td>
                      <td className="p-2 text-center font-black text-orange-600">{l.quantite}</td>
                      {!estModeLivraison && (
                        <>
                          <td className="p-2 text-right text-slate-800 font-extrabold">{Number(l.prix_achat).toLocaleString('fr-FR')}</td>
                          <td className="p-2 text-right font-black text-emerald-700">{(Number(l.quantite) * Number(l.prix_achat)).toLocaleString('fr-FR')}</td>
                        </>
                      )}
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setLignesValidees(lignesValidees.filter((_, i) => i !== index))} className="p-1 bg-slate-200 hover:bg-red-100 text-red-600 rounded text-xs font-bold">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!estModeLivraison && (
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1.5">
              <div className="grid grid-cols-3 gap-2 text-[9px] uppercase text-slate-700 font-black">
                <div>STATUT PAIEMENT</div><div>MONTANT RÉGLÉ</div><div>RESTE À PAYER</div>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div>
                  <select value={statutPaiement} disabled={enTrainDeSauvegarder} onChange={(e) => setStatutPaiement(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs">
                    <option value="SOLDE">Soldé</option>
                    <option value="PARTIEL">Avance</option>
                    <option value="CREDIT">Crédit</option>
                  </select>
                </div>
                <div>
                  <input 
                    type="number" 
                    disabled={statutPaiement === 'SOLDE' || statutPaiement === 'CREDIT' || enTrainDeSauvegarder} 
                    value={montantPaye} 
                    onFocus={(e) => e.target.select()} 
                    onChange={(e) => setMontantPaye(e.target.value)} 
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" 
                  />
                </div>
                <div className="bg-white px-3 py-1.5 rounded border border-slate-300 text-right shadow-xs"><span className="text-xs font-black text-orange-600">{soldeRestant.toLocaleString('fr-FR')} F</span></div>
              </div>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            {approEnEditionId ? (
              permissions.peut_supprimer ? (
                <button type="button" disabled={enTrainDeSauvegarder} onClick={() => { supprimerDoc(approEnEditionId, 'APPRO'); setVueActive('liste'); }} className="bg-red-600 hover:bg-red-700 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">🗑️ Supprimer</button>
              ) : <div/>
            ) : (!estModeLivraison ? (<div className="bg-emerald-600 text-white px-3 py-1 rounded-lg shadow-xs"><span className="text-[8px] block font-black uppercase">TOTAL</span><span className="text-xs font-black">{montantTotalGlobal.toLocaleString('fr-FR')} F</span></div>) : <div/>)}
            
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">🖨️ Imprimer</button>
              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setModalPartageOuverte(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">📤 Partager</button>
              {((approEnEditionId && permissions.peut_modifier) || (!approEnEditionId && permissions.peut_creer)) && (
                <button type="submit" disabled={enTrainDeSauvegarder} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black px-4 py-1.5 rounded text-xs shadow-xs flex items-center gap-1">
                  {enTrainDeSauvegarder ? 'Enregistrement...' : (approEnEditionId ? 'Mettre à jour' : 'Valider')}
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {vueActive === 'formulaire_commande' && (
        <form onSubmit={enregistrerCommande} onKeyDown={gererKeyDown} className="bg-white p-3 rounded-xl border border-slate-200 shadow-md space-y-2.5">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-xs uppercase">📋 BON DE COMMANDE {enTeteVerrouille && '🔒'}</span>
              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setVueActive('liste')} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-2.5 py-1 rounded text-[10px]">⬅️ Retour</button>
            </div>
            <span className="bg-blue-600 text-white font-mono px-2.5 py-1 rounded text-xs font-black shadow-xs">{numeroDoc}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div><label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Date *</label><input type="date" disabled={enTeteVerrouille} required value={dateDoc} onChange={(e) => setDateDoc(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" /></div>
            <div>
              <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Partenaire *</label>
              <select disabled={enTeteVerrouille} required value={idFournisseur} onChange={gererChangementPartenaire} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs">
                <option value="">-- Choisir --</option>
                {fournisseursAvecStockage.map((f) => (<option key={f.id} value={f.id} className="text-slate-900">{(f.nom_fournisseur || f.nom || f.raison_sociale || '').toUpperCase()}</option>))}
              </select>
            </div>
            <div>
              <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Réf. Doc {!estModeLivraison && '*'}</label>
              <input type="text" disabled={enTeteVerrouille} required={!estModeLivraison} value={referenceFournisseur} onChange={(e) => setReferenceFournisseur(e.target.value.toUpperCase())} placeholder="RÉF" className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-extrabold uppercase shadow-xs" />
            </div>
            <div>
              <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">
                {estPartenaireSansStockage ? 'DÉPÔT (SANS STOCK)' : (estModeLivraison ? 'DÉPÔT * (AUTO)' : 'DÉPÔT * (CHOIX)')}
              </label>
              {estPartenaireSansStockage ? (
                <input type="text" disabled value="-- SANS STOCK / AUCUN DÉPÔT --" className="w-full bg-amber-50 border border-amber-300 rounded p-1.5 text-xs text-amber-800 font-extrabold shadow-xs cursor-not-allowed" />
              ) : estModeLivraison ? (
                <select disabled required value={idDepotDestination} className="w-full bg-slate-100 border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs cursor-not-allowed">
                  <option value="">-- Automatique --</option>
                  {depots.map((d) => (<option key={d.id} value={d.id} className="text-slate-900">{(d.nom_depot || d.nom || d.libelle || '').toUpperCase()}</option>))}
                </select>
              ) : (
                <select disabled={enTeteVerrouille} required value={idDepotDestination} onChange={(e) => setIdDepotDestination(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs">
                  <option value="">-- Choisir le dépôt --</option>
                  {depots.map((d) => (<option key={d.id} value={d.id} className="text-slate-900">{(d.nom_depot || d.nom || d.libelle || '').toUpperCase()}</option>))}
                </select>
              )}
            </div>
            <div><label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Délai</label><input type="text" disabled={enTrainDeSauvegarder} value={delaiLivraison} onChange={(e) => setDelaiLivraison(e.target.value.toUpperCase())} placeholder="7 JOURS" className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold uppercase shadow-xs" /></div>
          </div>
          <div className="space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="font-black uppercase text-slate-800 text-[9px] block">ARTICLES À COMMANDER</span>
            <div className={`grid ${estModeLivraison ? 'grid-cols-9' : 'grid-cols-12'} gap-1.5 items-end`}>
              <div className={estModeLivraison ? 'col-span-6' : 'col-span-5'}><label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Article *</label><div ref={selectArticleRef} tabIndex={0} onClick={() => { if (enTrainDeSauvegarder || !verifierEnTeteAvantSaisie()) return; setModalArticleOuverte(true); }} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-extrabold uppercase text-slate-900 cursor-pointer truncate shadow-xs">{articleCourant.designation ? articleCourant.designation : '-- ARTICLE --'}</div></div>
              <div className={estModeLivraison ? 'col-span-2' : 'col-span-3'}><label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Qté *</label><input ref={inputQuantiteRef} type="number" min="1" disabled={enTrainDeSauvegarder} value={articleCourant.quantite} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, quantite: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" /></div>
              {!estModeLivraison && <div className="col-span-3"><label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">P. Estimé *</label><input type="number" min="0" disabled={enTrainDeSauvegarder} value={articleCourant.prix_achat} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, prix_achat: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" /></div>}
              <div className="col-span-1 text-center"><button type="button" disabled={enTrainDeSauvegarder} onClick={ajouterArticleCourant} className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">OK</button></div>
            </div>
          </div>
          {lignesValidees.length > 0 && (
            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 uppercase text-[9px] font-black text-slate-800">
                    <th className={estModeLivraison ? 'p-2 w-[75%]' : 'p-2 w-[45%]'}>Article</th>
                    <th className={estModeLivraison ? 'p-2 w-[20%] text-center' : 'p-2 w-[15%] text-center'}>Qté</th>
                    {!estModeLivraison && <th className="p-2 w-[20%] text-right">P. Estimé</th>}
                    {!estModeLivraison && <th className="p-2 w-[15%] text-right">Total</th>}
                    <th className="p-2 w-[5%] text-center">⚙️</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px]">
                  {lignesValidees.map((l, index) => (
                    <tr key={index} onClick={() => chargerLignePourModification(index)} className="hover:bg-orange-50/70 cursor-pointer transition select-none">
                      <td className="p-2 font-extrabold uppercase text-slate-900 truncate">{l.designation}</td>
                      <td className="p-2 text-center font-black text-orange-600">{l.quantite}</td>
                      {!estModeLivraison && (
                        <>
                          <td className="p-2 text-right text-slate-800 font-extrabold">{Number(l.prix_achat).toLocaleString('fr-FR')}</td>
                          <td className="p-2 text-right font-black text-slate-900">{(Number(l.quantite) * Number(l.prix_achat)).toLocaleString('fr-FR')}</td>
                        </>
                      )}
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}><button type="button" disabled={enTrainDeSauvegarder} onClick={() => setLignesValidees(lignesValidees.filter((_, i) => i !== index))} className="p-1 bg-slate-200 hover:bg-red-100 text-red-600 rounded text-xs font-bold">🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            {approEnEditionId ? (
              <div className="flex gap-1.5">
                {permissions.peut_supprimer && (
                  <button type="button" disabled={enTrainDeSauvegarder} onClick={() => { supprimerDoc(approEnEditionId, 'COMMANDE'); setVueActive('liste'); }} className="bg-red-600 hover:bg-red-700 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">🗑️ Supprimer</button>
                )}
                {permissions.peut_valider && (
                  <button type="button" disabled={enTrainDeSauvegarder} onClick={() => transformerEnFacture(docEnEditionObjet)} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs flex items-center gap-1">🔄 Transformer en Appro</button>
                )}
              </div>
            ) : (!estModeLivraison ? (
              <div className="bg-emerald-600 text-white px-3 py-1 rounded-lg shadow-xs"><span className="text-[8px] block font-black uppercase">TOTAL</span><span className="text-xs font-black">{montantTotalGlobal.toLocaleString('fr-FR')} F</span></div>
            ) : <div/>)}
            
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">🖨️ Imprimer</button>
              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setModalPartageOuverte(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">📤 Partager</button>
              {((approEnEditionId && permissions.peut_modifier) || (!approEnEditionId && permissions.peut_creer)) && (
                <button type="submit" disabled={enTrainDeSauvegarder} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black px-4 py-1.5 rounded text-xs shadow-xs flex items-center gap-1">
                  {enTrainDeSauvegarder ? 'Enregistrement...' : (approEnEditionId ? 'Mettre à jour' : 'Enregistrer')}
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {modalArticleOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-3 space-y-2.5 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="font-black text-xs uppercase text-slate-900">SÉLECTIONNER UN ARTICLE ({articlesFiltresModalAffiches.length} / {articlesFiltresModal.length})</span>
              <button type="button" onClick={() => setModalArticleOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black">✕</button>
            </div>
            <input type="text" autoFocus placeholder="RECHERCHER..." value={rechercheArticle} onChange={(e) => setRechercheArticle(e.target.value.toUpperCase())} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-extrabold uppercase text-slate-900 shadow-xs" />
            
            <div className="overflow-y-auto space-y-1.5 flex-1 max-h-60">
              {articlesFiltresModalAffiches.map((art) => {
                const estGrise = art.estGrise;
                return (
                  <div key={art.idArticleFormate} onClick={() => { if (estGrise) return; setArticleCourant({ id_article: art.idArticleFormate, designation: (art.Designation || 'ARTICLE').toUpperCase(), quantite: '1', prix_achat: art.prixAchatDefaut || '0' }); setModalArticleOuverte(false); setRechercheArticle(''); setTimeout(() => { if (inputQuantiteRef.current) { inputQuantiteRef.current.focus(); inputQuantiteRef.current.select(); } }, 50); }} className={`p-2.5 border rounded-xl flex justify-between items-center transition ${estGrise ? 'bg-slate-100 opacity-50 cursor-not-allowed border-slate-200' : 'bg-slate-50 hover:bg-orange-50 cursor-pointer border-slate-200'}`}>
                    <div><span className={`font-extrabold uppercase block text-[11px] ${estGrise ? 'text-slate-500' : 'text-slate-900'}`}>{art.Designation}</span>{estGrise && <span className="bg-slate-200 text-slate-700 text-[8.5px] px-1.5 py-0.5 rounded font-black">Déjà ajouté</span>}<span className="text-[9.5px] text-slate-600 font-bold">Stock : <strong>{art.stockDepot}</strong></span></div>
                    {!estModeLivraison && <span className="font-black text-[11px] text-orange-600">{art.prixAchatDefaut ? `${Number(art.prixAchatDefaut).toLocaleString('fr-FR')} F` : ''}</span>}
                  </div>
                );
              })}
            </div>

            {limiteArticlesModal < articlesFiltresModal.length && (
              <div className="text-center pt-1 pb-1">
                <button
                  type="button"
                  onClick={() => setLimiteArticlesModal(prev => prev + 20)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold px-3 py-1.5 rounded-xl text-[10px] transition shadow-xs border border-slate-300 w-full"
                >
                  📥 Charger 20 articles de plus ({articlesFiltresModal.length - limiteArticlesModal} restants)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {modalPartageOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2"><span className="font-black text-xs uppercase text-slate-900">OPTIONS DE PARTAGE</span><button type="button" onClick={() => setModalPartageOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black">✕</button></div>
            <div className="space-y-1.5"><label className="block font-black text-slate-800 text-[10px] uppercase">Format :</label><div className="grid grid-cols-3 gap-1">{['PDF', 'PNG', 'JPG'].map(fmt => (<button key={fmt} type="button" onClick={() => setFormatPartage(fmt)} className={`py-1.5 rounded-lg font-black text-[10px] border shadow-xs ${formatPartage === fmt ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-800 border-slate-300'}`}>{fmt}</button>))}</div></div>
            <div className="space-y-1.5 pt-1"><label className="block font-black text-slate-800 text-[10px] uppercase">Canal :</label><div className="grid grid-cols-1 gap-1 text-[11px]"><button type="button" onClick={() => { alert('Partagé !'); setModalPartageOuverte(false); }} className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-black p-2 rounded-xl text-center border border-emerald-200 shadow-xs">💚 WhatsApp</button><button type="button" onClick={() => { alert('Partagé !'); setModalPartageOuverte(false); }} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-900 font-black p-2 rounded-xl text-center border border-blue-200 shadow-xs">📧 Mail</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}