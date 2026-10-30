'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionVentesHistoriques({ entrepriseId = '4TS-TEST' }) {
  const [ventes, setVentes] = useState([]);
  const [articlesStock, setArticlesStock] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [caissesList, setCaissesList] = useState([]);
  const [depotsList, setDepotsList] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [ventesHistoriques, setVentesHistoriques] = useState([]);
  const [utilisateursList, setUtilisateursList] = useState([]);
  const [cloturesList, setCloturesList] = useState([]);
  const [chargement, setChargement] = useState(false);
  
  // --- GESTION DES DROITS ET AUTORISATIONS ---
  const [roleNom, setRoleNom] = useState('');
  const [caissierNomActuel, setCaissierNomActuel] = useState('Administrateur');
  const [permissions, setPermissions] = useState({
    lecture: true,
    creation: true,
    modification: false,
    suppression: false,
  });

  // --- MODAL DE VALIDATION SUPERVISEUR / ADMIN POUR SUPPRESSION ---
  const [afficherModalAuthSuppression, setAfficherModalAuthSuppression] = useState(false);
  const [adminEmailAuth, setAdminEmailAuth] = useState('');
  const [adminPasswordAuth, setAdminPasswordAuth] = useState('');
  const [ticketEnCoursDeSuppression, setTicketEnCoursDeSuppression] = useState(null);

  // --- MODAL DE VERSEMENT CLÔTURE CAISSE & HISTORIQUE DÉTAIL ---
  const [afficherModalVersementCloture, setAfficherModalVersementCloture] = useState(false);
  const [caisseDestinationVersementId, setCaisseDestinationVersementId] = useState('');
  const [clotureDetailSelectionnee, setClotureDetailSelectionnee] = useState(null);

  // --- DÉSACTIVATION TEMPORAIRE ---
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  
  const [recherche, setRecherche] = useState('');
  const [filtreModePaiement, setFiltreModePaiement] = useState('TOUS');
  const [ticketSelectionne, setTicketSelectionne] = useState(null);

  // --- ONGLETS : 'vente', 'tickets', 'journal', 'cloture' ---
  const [ongletActif, setOngletActif] = useState('vente');

  const [ordreAlphabetique, setOrdreAlphabetique] = useState('ASC');
  const [limiteVentes, setLimiteVentes] = useState(20);

  // --- TRI DES TICKETS ---
  const [triTicketCol, setTriTicketCol] = useState('created_at');
  const [triTicketOrdre, setTriTicketOrdre] = useState('desc');

  // --- TRI DU JOURNAL ---
  const [triJournalCol, setTriJournalCol] = useState('date');
  const [triJournalOrdre, setTriJournalOrdre] = useState('desc');

  // --- FILTRES DU JOURNAL DES VENTES (PRÉREMPLIS À LA DATE DU JOUR) ---
  const dateDuJourStr = new Date().toISOString().split('T')[0];
  const [journalDateDebut, setJournalDateDebut] = useState(dateDuJourStr);
  const [journalDateFin, setJournalDateFin] = useState(dateDuJourStr);
  const [journalCaisseId, setJournalCaisseId] = useState('TOUTES');
  const [journalCaissierId, setJournalCaissierId] = useState('TOUS');

  // --- FILTRES DE LA CLÔTURE CAISSE (PRÉREMPLIS À LA DATE DU JOUR) ---
  const [clotureDateDebut, setClotureDateDebut] = useState(dateDuJourStr);
  const [clotureDateFin, setClotureDateFin] = useState(dateDuJourStr);
  const [clotureCaisseId, setClotureCaisseId] = useState('TOUTES');
  const [clotureCaissierId, setClotureCaissierId] = useState('TOUS');
  const [montantReelVerseCloture, setMontantReelVerseCloture] = useState('');

  const premierJourMoisStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const dernierJourMoisStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}`;

  const [filtreDateDebut, setFiltreDateDebut] = useState(premierJourMoisStr);
  const [filtreDateFin, setFiltreDateFin] = useState(dernierJourMoisStr);

  const [caisseId, setCaisseId] = useState('');
  const [depotId, setDepotId] = useState('');
  const [codeCaisseActif, setCodeCaisseActif] = useState('C01');
  const [numeroTicket, setNumeroTicket] = useState('');
  const [dateJour, setDateJour] = useState(dateDuJourStr);
  const [modePaiementTicket, setModePaiementTicket] = useState('ESPECES');
  
  // --- GESTION COMPTANT / CRÉDIT / AVANCE ---
  const [typeReglementVente, setTypeReglementVente] = useState('COMPTANT');
  const [montantAvance, setMontantAvance] = useState(0);

  const [clientId, setClientId] = useState('');
  const [clientSelectionneObj, setClientSelectionneObj] = useState(null);
  const [clientNomSelectionne, setClientNomSelectionne] = useState('CLIENTS DIVERS');
  const [nomClientLibre, setNomClientLibre] = useState('');

  const [afficherModalClient, setAfficherModalClient] = useState(false);
  const [rechercheClientInput, setRechercheClientInput] = useState('');
  
  const [afficherModalArticle, setAfficherModalArticle] = useState(false);
  const [rechercheArticleInput, setSearchArticleInput] = useState('');

  const [ticketsEnAttente, setTicketsEnAttente] = useState([]);
  const [afficherModalAttente, setAfficherModalAttente] = useState(false);

  const [panier, setPanier] = useState([]);
  
  const [typeRemise, setTypeRemise] = useState('POURCENTAGE');
  const [valeurRemise, setValeurRemise] = useState(0);
  const [appliquerTva, setAppliquerTva] = useState('NON');

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  // Clé de cache locale isolée par entreprise et par module
  const cacheKey = `4ts_cache_ventes_historiques_${entrepriseId}_${moduleActuel}`;

  const genererNumeroTicket = (code, totalVentes) => {
    return `${code || 'C01'}-${String(totalVentes + 1).padStart(2, '0')}`;
  };

  // --- CHARGEMENT DU CACHE LOCAL INSTANTANÉ ---
  const chargerCacheLocal = () => {
    if (typeof window === 'undefined') return false;
    try {
      const cacheBrut = localStorage.getItem(cacheKey);
      if (cacheBrut) {
        const dataCache = JSON.parse(cacheBrut);
        if (dataCache && dataCache.entrepriseId === entrepriseId && dataCache.module === moduleActuel) {
          setVentes(dataCache.ventes || []);
          setVentesHistoriques(dataCache.ventes || []);
          setArticlesStock(dataCache.articlesStock || []);
          setClientsList(dataCache.clientsList || []);
          setCategoriesList(dataCache.categoriesList || []);
          setCaissesList(dataCache.caissesList || []);
          setDepotsList(dataCache.depotsList || []);
          setMouvements(dataCache.mouvements || []);
          setApprovisionnements(dataCache.approvisionnements || []);
          setUtilisateursList(dataCache.utilisateursList || []);
          setCloturesList(dataCache.cloturesList || []);
          return true;
        }
      }
    } catch (e) {
      console.error('Erreur lecture cache local :', e);
    }
    return false;
  };

  // --- MISE À JOUR ET PURGE DE L'ANCIEN CACHE LOCAL ---
  const sauvegarderCacheLocal = (donnees) => {
    if (typeof window === 'undefined') return;
    try {
      // Nettoyage de l'ancien cache ou des clés obsolètes pour cette entité
      localStorage.removeItem(cacheKey);
      
      const payloadCache = {
        entrepriseId,
        module: moduleActuel,
        timestamp: Date.now(),
        ...donnees
      };
      localStorage.setItem(cacheKey, JSON.stringify(payloadCache));
    } catch (e) {
      console.error('Erreur écriture cache local :', e);
    }
  };

  const chargerDonneesEtPermissions = async () => {
    // Affichage instantané depuis le cache local si disponible
    const cacheExiste = chargerCacheLocal();
    if (!cacheExiste) {
      setChargement(true);
    }

    try {
      const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
      if (utilisateurConnecteStr) {
        try {
          const userObj = JSON.parse(utilisateurConnecteStr);
          const nomRoleUser = (userObj.nom_role || userObj.role || '').trim().toUpperCase();
          setRoleNom(nomRoleUser);
          setCaissierNomActuel(userObj.nom_complet || userObj.nom || userObj.email || 'Administrateur');
          
          if (userObj.permissions) {
            const pHist = userObj.permissions['ventes_historiques'] || userObj.permissions['caisse'] || userObj.permissions['ventes'];
            if (pHist) {
              setPermissions({
                lecture: pHist.lecture ?? true,
                creation: pHist.creation ?? true,
                modification: pHist.modification ?? false,
                suppression: pHist.suppression ?? false,
              });
            }
          }
        } catch (e) {
          setCaissierNomActuel(utilisateurConnecteStr);
        }
      }

      let ventesData = [];
      const { data: ventesRpc, error: rpcError } = await supabase.rpc('recuperer_ventes_historiques', {
        p_entreprise_id: entrepriseId,
        p_module: moduleActuel
      });

      if (rpcError) {
        const resVentes = await supabase
          .from('ventes_historiques')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel)
          .order('created_at', { ascending: false });
        ventesData = resVentes.data || [];
      } else {
        ventesData = ventesRpc || [];
      }

      const [resArticles, resClients, resCategories, resCaisses, resDepots, resMouvements, resAppro, resUsers, resClotures] = await Promise.all([
        supabase.from('articles_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('clients').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('categories_clients').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('caisses').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('depots_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('mouvements_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('utilisateurs').select('*').eq('id_entreprise', entrepriseId),
        supabase.from('clotures_caisses').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel).order('created_at', { ascending: false })
      ]);

      const dataArticles = resArticles.data || [];
      const dataClients = resClients.data || [];
      const dataCategories = resCategories.data || [];
      const dataCaisses = resCaisses.data || [];
      const dataDepots = resDepots.data || [];
      const dataMouvements = resMouvements.data || [];
      const dataAppro = resAppro.data || [];
      const dataUsers = resUsers.data || [];
      const dataClotures = resClotures.data || [];

      // Mise à jour des états
      setVentes(ventesData);
      setVentesHistoriques(ventesData);
      setArticlesStock(dataArticles);
      setClientsList(dataClients);
      setCategoriesList(dataCategories);
      setCaissesList(dataCaisses);

      const caissePrincipale = dataCaisses.find(c => 
        (c.nom_caisse || '').toUpperCase().includes('PRINCIPALE') || 
        (c.code_caisse || '').toUpperCase().includes('CP') ||
        (c.nom_caisse || '').toUpperCase().includes('CP')
      ) || dataCaisses[0];

      if (caissePrincipale) {
        setCaisseDestinationVersementId(caissePrincipale.id);
      }

      setDepotsList(dataDepots);
      setMouvements(dataMouvements);
      setApprovisionnements(dataAppro);
      setUtilisateursList(dataUsers);
      setCloturesList(dataClotures);

      setDateJour(dateDuJourStr);

      let codeCaisseCourant = 'C01';
      if (dataCaisses.length > 0) {
        setCaisseId(dataCaisses[0].id);
        codeCaisseCourant = dataCaisses[0].code_caisse || 'C01';
        setCodeCaisseActif(codeCaisseCourant);
      }

      setNumeroTicket(genererNumeroTicket(codeCaisseCourant, ventesData.length));

      if (dataDepots.length > 0) {
        setDepotId(dataDepots[0].id);
      }

      const clientDivers = dataClients.find(c => c.est_par_defaut || (c.nom_client || c.nom || '').toLowerCase().includes('divers'));
      if (clientDivers && !clientId) {
        setClientId(clientDivers.id);
        setClientSelectionneObj(clientDivers);
        setClientNomSelectionne((clientDivers.nom_client || clientDivers.nom || clientDivers.libelle || 'CLIENTS DIVERS').toUpperCase());
      } else if (dataClients.length > 0 && !clientId) {
        setClientId(dataClients[0].id);
        setClientSelectionneObj(dataClients[0]);
        setClientNomSelectionne((dataClients[0].nom_client || dataClients[0].nom || dataClients[0].libelle || 'CLIENTS DIVERS').toUpperCase());
      }

      // Sauvegarde instantanée dans le nouveau cache local propre et isolé
      sauvegarderCacheLocal({
        ventes: ventesData,
        articlesStock: dataArticles,
        clientsList: dataClients,
        categoriesList: dataCategories,
        caissesList: dataCaisses,
        depotsList: dataDepots,
        mouvements: dataMouvements,
        approvisionnements: dataAppro,
        utilisateursList: dataUsers,
        cloturesList: dataClotures
      });

    } catch (err) {
      console.error('Erreur chargement :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonneesEtPermissions();
  }, [entrepriseId, moduleActuel]);

  useEffect(() => {
    if (clientSelectionneObj) {
      const nom = (clientSelectionneObj.nom_client || clientSelectionneObj.nom || clientSelectionneObj.libelle || clientSelectionneObj.raison_sociale || '').toUpperCase();
      if (nom) {
        setClientNomSelectionne(nom);
      }
    }
  }, [clientSelectionneObj]);

  // --- IDENTIFIER LES TICKETS DÉJÀ CLÔTURÉS POUR LES EXCLURE DES NOUVELLES CLÔTURES ---
  const idsTicketsClotures = new Set();
  cloturesList.forEach(cl => {
    if (cl.ids_tickets && Array.isArray(cl.ids_tickets)) {
      cl.ids_tickets.forEach(id => idsTicketsClotures.add(id));
    }
  });

  const ventesNonCloturees = ventes.filter(v => !idsTicketsClotures.has(v.id));

  const changerCaisseSelectionnee = (idCaisseSel) => {
    if (enTrainDeSauvegarder) return;
    setCaisseId(idCaisseSel);
    const trouve = caissesList.find(c => c.id === idCaisseSel);
    if (trouve) {
      const code = trouve.code_caisse || 'C01';
      setCodeCaisseActif(code);
      setNumeroTicket(genererNumeroTicket(code, ventes.length));
    }
  };

  const correspondAuDepot = (valeurDepotFlux, depotCibleId) => {
    if (!valeurDepotFlux || !depotCibleId) return false;
    if (String(valeurDepotFlux) === String(depotCibleId)) return true;
    const depotObj = depotsList.find((d) => String(d.id) === String(depotCibleId));
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
    ventesHistoriques.forEach((v) => {
      let articlesVente = [];
      if (v.details_articles) {
        if (typeof v.details_articles === 'string') { try { articlesVente = JSON.parse(v.details_articles); } catch (e) {} }
        else if (Array.isArray(v.details_articles)) { articlesVente = v.details_articles; }
      }
      articlesVente.forEach((ligne) => {
        if (String(ligne.id || ligne.id_article) === String(articleId)) {
          flux.push({ date: v.created_at || '', depot_source: v.id_depot, depot_destination: null, quantite: parseInt(ligne.quantite || 0), type: 'SORTIE' });
        }
      });
    });
    flux.sort((a, b) => new Date(a.date) - new Date(b.date));
    return flux;
  };

  const getStockReelArticle = (article) => {
    const articleId = String(article.id_article || article.id);
    const depotCibleId = depotId;
    if (!depotCibleId) {
      return Number(article.Quantite_Stock ?? article.stock_actuel ?? 0);
    }
    let stockDepot = 0;
    const fluxArticle = obtenirTousLesFluxArticle(articleId);
    fluxArticle.forEach((m) => {
      const matchDepotSource = correspondAuDepot(m.depot_source, depotCibleId);
      const matchDepotDest = correspondAuDepot(m.depot_destination, depotCibleId);
      const qte = m.quantite;
      const typeMvt = m.type;
      if (typeMvt === 'INVENTAIRE' && matchDepotSource) { stockDepot = qte; return; }
      if (typeMvt === 'TRANSFERT') { if (matchDepotDest) stockDepot += qte; if (matchDepotSource) stockDepot -= qte; return; }
      if (typeMvt.includes('ENTREE') || typeMvt.includes('ACHAT') || typeMvt.includes('APPROVISIONNEMENT') || typeMvt.includes('FACTURE')) {
        if (matchDepotSource || matchDepotDest) stockDepot += qte;
      } else if (typeMvt.includes('SORTIE') || typeMvt.includes('VENTE') || typeMvt.includes('AVARIES')) {
        if (matchDepotSource) stockDepot -= qte;
      } else {
        if (matchDepotSource || matchDepotDest) stockDepot += qte;
      }
    });
    return Math.max(0, stockDepot);
  };

  const annulerVenteEnCours = () => {
    if (enTrainDeSauvegarder) return;
    if (confirm('Voulez-vous vraiment annuler cette vente en cours ? Le panier sera vidé.')) {
      setPanier([]);
      setNomClientLibre('');
      setValeurRemise(0);
      setAppliquerTva('NON');
      setTypeReglementVente('COMPTANT');
      setMontantAvance(0);
      
      const clientDivers = clientsList.find(c => c.est_par_defaut || (c.nom_client || c.nom || '').toLowerCase().includes('divers'));
      if (clientDivers) {
        setClientId(clientDivers.id);
        setClientSelectionneObj(clientDivers);
        setClientNomSelectionne((clientDivers.nom_client || clientDivers.nom || clientDivers.libelle || 'CLIENTS DIVERS').toUpperCase());
      }
      setNumeroTicket(genererNumeroTicket(codeCaisseActif, ventes.length));
    }
  };

  const mettreTicketEnAttente = () => {
    if (enTrainDeSauvegarder) return;
    if (panier.length === 0) {
      alert('⚠️ Le panier est vide, impossible de mettre en attente.');
      return;
    }
    const clientNomActuel = nomClientLibre.trim().toUpperCase() || clientSelectionneObj?.nom_client || clientSelectionneObj?.nom || clientSelectionneObj?.libelle || clientNomSelectionne || 'CLIENTS DIVERS';
    const nouveauTicketAttente = {
      idAttente: Date.now(),
      numeroTicket,
      client: clientNomActuel,
      clientId: clientId || null,
      caisseId,
      depotId,
      panier: [...panier],
      typeRemise,
      valeurRemise,
      appliquerTva,
      modePaiementTicket,
      typeReglementVente,
      montantAvance,
      date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setTicketsEnAttente([...ticketsEnAttente, nouveauTicketAttente]);
    alert(`⏳ Ticket ${numeroTicket} (${clientNomActuel}) mis en attente avec succès !`);
    
    setPanier([]);
    setNomClientLibre('');
    setValeurRemise(0);
    setAppliquerTva('NON');
    setTypeReglementVente('COMPTANT');
    setMontantAvance(0);

    const clientDivers = clientsList.find(c => c.est_par_defaut || (c.nom_client || c.nom || '').toLowerCase().includes('divers'));
    if (clientDivers) {
      setClientId(clientDivers.id);
      setClientSelectionneObj(clientDivers);
      setClientNomSelectionne((clientDivers.nom_client || clientDivers.nom || clientDivers.libelle || 'CLIENTS DIVERS').toUpperCase());
    }
    setNumeroTicket(genererNumeroTicket(codeCaisseActif, ventes.length));
  };

  const rappelerTicket = (ticketAttente) => {
    if (enTrainDeSauvegarder) return;
    setPanier(ticketAttente.panier);
    setNumeroTicket(ticketAttente.numeroTicket);
    setClientNomSelectionne(ticketAttente.client);
    setClientId(ticketAttente.clientId || '');
    if (ticketAttente.clientId) {
      const cliTrouve = clientsList.find(c => String(c.id) === String(ticketAttente.clientId));
      if (cliTrouve) setClientSelectionneObj(cliTrouve);
    }
    setTypeRemise(ticketAttente.typeRemise);
    setValeurRemise(ticketAttente.valeurRemise);
    setAppliquerTva(ticketAttente.appliquerTva);
    setModePaiementTicket(ticketAttente.modePaiementTicket);
    setTypeReglementVente(ticketAttente.typeReglementVente || 'COMPTANT');
    setMontantAvance(ticketAttente.montantAvance || 0);
    setCaisseId(ticketAttente.caisseId);
    setDepotId(ticketAttente.depotId);

    setTicketsEnAttente(ticketsEnAttente.filter(t => t.idAttente !== ticketAttente.idAttente));
    setAfficherModalAttente(false);
    alert(`✅ Ticket ${ticketAttente.numeroTicket} rappelé dans le panier.`);
  };

  const selectionnerClient = (client) => {
    if (enTrainDeSauvegarder) return;
    const nomExact = (client.nom_client || client.nom || client.libelle || client.raison_sociale || 'CLIENTS DIVERS').toUpperCase();
    setClientId(client.id);
    setClientSelectionneObj(client);
    setClientNomSelectionne(nomExact);
    setAfficherModalClient(false);
    setTimeout(() => {
      setAfficherModalArticle(true);
    }, 100);
  };

  const ajouterAuPanier = (article) => {
    if (enTrainDeSauvegarder) return;
    const articleId = article.id_article || article.id;
    const designation = (article.Designation || article.nom || '').toUpperCase();
    const prixU = Number(article.Prix_Vente || article.prix_vente || article.prix || 0);
    const prixAchatU = Number(article.Prix_Achat || article.prix_achat || article.prix_revient || 0);
    const stockDispo = getStockReelArticle(article);

    const existant = panier.find((item) => item.id === articleId);
    const quantiteActuelleDansPanier = existant ? existant.quantite : 0;

    if (quantiteActuelleDansPanier + 1 > stockDispo) {
      alert(`❌ Stock insuffisant dans ce dépôt pour "${designation}" ! Stock réel : ${stockDispo}`);
      return;
    }

    if (existant) {
      setPanier(panier.map((item) => (item.id === articleId ? { ...item, quantite: item.quantite + 1 } : item)));
    } else {
      setPanier([...panier, { id: articleId, designation, prix_unitaire: prixU, prix_achat: prixAchatU, quantite: 1, stockMax: stockDispo }]);
    }
    setAfficherModalArticle(false);
  };

  const modifierQuantite = (id, qte) => {
    if (enTrainDeSauvegarder) return;
    if (qte <= 0) {
      setPanier(panier.filter((item) => item.id !== id));
      return;
    }

    const articleAssocie = articlesStock.find(a => (a.id_article || a.id) === id);
    const stockDispo = articleAssocie ? getStockReelArticle(articleAssocie) : 999999;

    if (qte > stockDispo) {
      alert(`❌ Quantité demandée supérieure au stock réel de ce dépôt (${stockDispo}) !`);
      return;
    }

    setPanier(panier.map((item) => (item.id === id ? { ...item, quantite: qte } : item)));
  };

  const handleKeyDownQuantite = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setAfficherModalArticle(true);
    }
  };

  const sousTotalPanier = panier.reduce((acc, item) => acc + item.quantite * Number(item.prix_unitaire || 0), 0);
  
  const montantRemise = typeRemise === 'POURCENTAGE' 
    ? (sousTotalPanier * Number(valeurRemise || 0)) / 100 
    : Number(valeurRemise || 0);

  const baseImposable = Math.max(0, sousTotalPanier - montantRemise);

  const categorieClientAssociee = clientSelectionneObj
    ? categoriesList.find(c => String(c.id) === String(clientSelectionneObj.id_categorie) || String(c.nom_categorie).toLowerCase() === String(clientSelectionneObj.categorie_client || '').toLowerCase())
    : null;

  const tauxTvaClient = (appliquerTva === 'OUI' && categorieClientAssociee && categorieClientAssociee.applique_tva)
    ? Number(categorieClientAssociee.taux_tva_defaut || 19.25)
    : (appliquerTva === 'OUI' ? 19.25 : 0);

  const montantTva = (baseImposable * tauxTvaClient) / 100;
  const totalFinal = baseImposable + montantTva;

  let montantRegleEffectif = totalFinal;
  let montantCreditRestant = 0;

  if (typeReglementVente === 'CREDIT') {
    montantRegleEffectif = 0;
    montantCreditRestant = totalFinal;
  } else if (typeReglementVente === 'AVANCE') {
    montantRegleEffectif = Math.min(totalFinal, Math.max(0, Number(montantAvance || 0)));
    montantCreditRestant = Math.max(0, totalFinal - montantRegleEffectif);
  }

  const validerEtEnregistrerVente = async () => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.creation) {
      alert('⛔ Action non autorisée : Vous n’avez pas le droit de créer des ventes.');
      return;
    }

    if (panier.length === 0) {
      alert('⚠️ Le panier est vide.');
      return;
    }

    if (!depotId) {
      alert('⚠️ Veuillez sélectionner un dépôt pour facturer.');
      return;
    }

    for (const item of panier) {
      const artRef = articlesStock.find(a => (a.id_article || a.id) === item.id);
      const stockActuelReel = artRef ? getStockReelArticle(artRef) : 0;
      if (item.quantite > stockActuelReel) {
        alert(`❌ Vente bloquée : L'article "${item.designation}" dépasse le stock réel du dépôt (${stockActuelReel}).`);
        return;
      }
    }

    let nomClientFacture = (
      nomClientLibre.trim() || 
      clientSelectionneObj?.nom_client || 
      clientSelectionneObj?.nom || 
      clientSelectionneObj?.libelle || 
      clientSelectionneObj?.raison_sociale || 
      clientNomSelectionne || 
      'CLIENTS DIVERS'
    ).toUpperCase();

    let clientIdFinal = clientId ? parseInt(clientId) : null;

    setEnTrainDeSauvegarder(true);
    try {
      const payloadVente = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        numero_ticket: numeroTicket,
        mode_paiement: modePaiementTicket,
        total_montant: totalFinal,
        montant_regle: montantRegleEffectif,
        montant_credit: montantCreditRestant,
        type_reglement: typeReglementVente,
        details_articles: panier,
        id_caisse: caisseId || null,
        id_depot: depotId || null,
        nom_client: nomClientFacture,
        id_client: clientIdFinal,
        created_at: dateJour ? `${dateJour}T${new Date().toTimeString().split(' ')[0]}` : new Date().toISOString()
      };

      const { error: errVente } = await supabase.from('ventes_historiques').insert([payloadVente]);

      if (errVente) {
        if (errVente.code === '23505') {
          alert('⛔ Erreur : Ce numéro de ticket existe déjà.');
        } else {
          throw errVente;
        }
        setEnTrainDeSauvegarder(false);
        return;
      }

      if (montantCreditRestant > 0 && clientIdFinal) {
        const clientRef = clientsList.find(c => String(c.id) === String(clientIdFinal));
        if (clientRef) {
          const creditActuel = Number(clientRef.solde_credit || clientRef.credit || 0);
          const nouveauCredit = creditActuel + montantCreditRestant;
          await supabase.from('clients').update({ solde_credit: nouveauCredit }).eq('id', clientIdFinal);
        }
      }

      for (const item of panier) {
        const payloadMouvement = {
          id_entreprise: entrepriseId,
          module: moduleActuel,
          type_mouvement: 'SORTIE',
          id_depot_source: depotId,
          id_depot_destination: null,
          id_article: parseInt(item.id),
          quantite: item.quantite,
          motif_remarque: `VENTE TICKET ${numeroTicket} (${nomClientFacture}) - ${typeReglementVente}`
        };

        const { error: errMvt } = await supabase.from('mouvements_stock').insert([payloadMouvement]);
        if (errMvt) {
          console.error("Erreur enregistrement mouvement stock associé à la vente:", errMvt.message);
        }
      }

      alert(`✅ Ticket ${numeroTicket} (${nomClientFacture}) enregistré avec succès (${typeReglementVente}) !`);
      
      setPanier([]);
      setNomClientLibre('');
      setValeurRemise(0);
      setAppliquerTva('NON');
      setTypeReglementVente('COMPTANT');
      setMontantAvance(0);

      const clientDefaut = clientsList.find(c => c.est_par_defaut || (c.nom_client || c.nom || '').toLowerCase().includes('divers'));
      if (clientDefaut) {
        setClientId(clientDefaut.id);
        setClientSelectionneObj(clientDefaut);
        setClientNomSelectionne((clientDefaut.nom_client || clientDefaut.nom || clientDefaut.libelle || 'CLIENTS DIVERS').toUpperCase());
      } else {
        setClientNomSelectionne('CLIENTS DIVERS');
      }

      await chargerDonneesEtPermissions();
    } catch (err) {
      alert('Erreur enregistrement : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const declencherSuppressionTicket = (ticket) => {
    if (enTrainDeSauvegarder) return;
    setTicketEnCoursDeSuppression(ticket);
    setAdminEmailAuth('');
    setAdminPasswordAuth('');
    setAfficherModalAuthSuppression(true);
  };

  const verifierEtExecuterSuppressionAdmin = async (e) => {
    e.preventDefault();
    if (!ticketEnCoursDeSuppression) return;

    const emailSaisi = (adminEmailAuth || '').trim().toLowerCase();
    const mdpSaisi = (adminPasswordAuth || '').trim();

    if (!emailSaisi || !mdpSaisi) {
      alert('⚠️ Veuillez renseigner l’email et le mot de passe de l’administrateur/superviseur.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const adminTrouve = utilisateursList.find(u => 
        (u.email || '').toLowerCase() === emailSaisi && 
        (u.mot_de_passe || '') === mdpSaisi &&
        (u.statut === 'ACTIF' || !u.statut)
      );

      if (!adminTrouve) {
        alert('❌ Identifiants superviseur / administrateur incorrects ou utilisateur inactif.');
        setEnTrainDeSauvegarder(false);
        return;
      }

      let aDroitSuppression = false;
      const nomRoleAdmin = (adminTrouve.nom_role || '').toUpperCase();
      if (nomRoleAdmin.includes('ADMIN') || nomRoleAdmin.includes('SUPERVISEUR') || nomRoleAdmin.includes('SUPER_ADMIN')) {
        aDroitSuppression = true;
      } else if (adminTrouve.permissions) {
        const pAdmin = adminTrouve.permissions['ventes_historiques'] || adminTrouve.permissions['caisse'] || adminTrouve.permissions['ventes'];
        if (pAdmin && pAdmin.suppression) {
          aDroitSuppression = true;
        }
      }

      if (!aDroitSuppression) {
        alert('⛔ Ce compte superviseur n’a pas l’autorisation de suppression dans ses droits et autorisations.');
        setEnTrainDeSauvegarder(false);
        return;
      }

      const { error } = await supabase.from('ventes_historiques').delete().eq('id', ticketEnCoursDeSuppression.id);
      if (error) throw error;

      alert(`✅ Ticket #${ticketEnCoursDeSuppression.numero_ticket} supprimé avec succès par l'administrateur.`);
      setAfficherModalAuthSuppression(false);
      setTicketSelectionne(null);
      setTicketEnCoursDeSuppression(null);
      await chargerDonneesEtPermissions();
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const gererTriTicket = (colonne) => {
    if (triTicketCol === colonne) {
      setTriTicketOrdre(triTicketOrdre === 'asc' ? 'desc' : 'asc');
    } else {
      setTriTicketCol(colonne);
      setTriTicketOrdre('asc');
    }
  };

  const rendreFlecheTriTicket = (colonne) => {
    if (triTicketCol !== colonne) return <span className="text-slate-400 ml-0.5">↕</span>;
    return <span className="text-orange-600 ml-0.5 font-bold">{triTicketOrdre === 'asc' ? '↑' : '↓'}</span>;
  };

  const ventesFiltrees = ventes.filter((v) => {
    const numTicket = (v.numero_ticket || '').toLowerCase();
    const nomClientVente = (v.nom_client || '').toLowerCase();
    const query = recherche.toLowerCase();
    const matchQuery = numTicket.includes(query) || nomClientVente.includes(query);
    const matchPaiement = filtreModePaiement === 'TOUS' || (v.mode_paiement || '').toUpperCase() === filtreModePaiement.toUpperCase();
    
    let matchDate = true;
    if (v.created_at) {
      const dateVente = v.created_at.split('T')[0];
      if (filtreDateDebut && filtreDateFin) {
        matchDate = dateVente >= filtreDateDebut && dateVente <= filtreDateFin;
      } else if (filtreDateDebut) {
        matchDate = dateVente >= filtreDateDebut;
      } else if (filtreDateFin) {
        matchDate = dateVente <= filtreDateFin;
      }
    }

    return matchQuery && matchPaiement && matchDate;
  }).sort((a, b) => {
    let valA = '';
    let valB = '';

    if (triTicketCol === 'created_at') {
      valA = a.created_at || '';
      valB = b.created_at || '';
    } else if (triTicketCol === 'numero_ticket') {
      valA = a.numero_ticket || '';
      valB = b.numero_ticket || '';
    } else if (triTicketCol === 'nom_client') {
      valA = a.nom_client || '';
      valB = b.nom_client || '';
    } else if (triTicketCol === 'total_montant') {
      valA = Number(a.montant_regle || a.total_montant || 0);
      valB = Number(b.montant_regle || b.total_montant || 0);
    }

    if (valA < valB) return triTicketOrdre === 'asc' ? -1 : 1;
    if (valA > valB) return triTicketOrdre === 'asc' ? 1 : -1;
    return 0;
  });

  const ventesAffichees = ventesFiltrees.slice(0, limiteVentes);

  const gererTriJournal = (colonne) => {
    if (triJournalCol === colonne) {
      setTriJournalOrdre(triJournalOrdre === 'asc' ? 'desc' : 'asc');
    } else {
      setTriJournalCol(colonne);
      setTriJournalOrdre('asc');
    }
  };

  const rendreFlecheTriJournal = (colonne) => {
    if (triJournalCol !== colonne) return <span className="text-slate-400 ml-0.5">↕</span>;
    return <span className="text-orange-600 ml-0.5 font-bold">{triJournalOrdre === 'asc' ? '↑' : '↓'}</span>;
  };

  const ventesJournalFiltrees = ventes.filter((v) => {
    let matchDate = true;
    if (v.created_at) {
      const dateVente = v.created_at.split('T')[0];
      if (journalDateDebut && journalDateFin) {
        matchDate = dateVente >= journalDateDebut && dateVente <= journalDateFin;
      } else if (journalDateDebut) {
        matchDate = dateVente >= journalDateDebut;
      } else if (journalDateFin) {
        matchDate = dateVente <= journalDateFin;
      }
    }

    let matchCaisse = journalCaisseId === 'TOUTES' || !journalCaisseId || String(v.id_caisse) === String(journalCaisseId);
    let matchCaissier = journalCaissierId === 'TOUS' || !journalCaissierId || String(v.caissier || v.caissier_email || '') === String(journalCaissierId);

    return matchDate && matchCaisse && matchCaissier;
  });

  let lignesJournalDetails = [];
  let totalVentesJournalGlobal = 0;
  let totalMargeJournalGlobal = 0;

  ventesJournalFiltrees.forEach((v) => {
    let articlesVente = [];
    if (v.details_articles) {
      if (typeof v.details_articles === 'string') { try { articlesVente = JSON.parse(v.details_articles); } catch (e) {} }
      else if (Array.isArray(v.details_articles)) { articlesVente = v.details_articles; }
    }

    articlesVente.forEach((item) => {
      const qte = Number(item.quantite || 1);
      const prixVenteU = Number(item.prix_unitaire || item.prix_vente || 0);
      const artObj = articlesStock.find(a => String(a.id_article || a.id) === String(item.id || item.id_article));
      const prixAchatU = Number(item.prix_achat || item.prix_revient || artObj?.Prix_Achat || artObj?.prix_achat || 0);
      
      const montantTotalVente = qte * prixVenteU;
      const montantTotalAchat = qte * prixAchatU;
      const margeLigne = montantTotalVente - montantTotalAchat;

      totalVentesJournalGlobal += montantTotalVente;
      totalMargeJournalGlobal += margeLigne;

      lignesJournalDetails.push({
        idTicket: v.id,
        numeroTicket: v.numero_ticket || '-',
        date: v.created_at ? new Date(v.created_at).toLocaleDateString('fr-FR') : '-',
        designation: (item.designation || artObj?.Designation || artObj?.nom || 'ARTICLE').toUpperCase(),
        quantite: qte,
        prixAchat: prixAchatU,
        prixVente: prixVenteU,
        montantTotal: montantTotalVente,
        marge: margeLigne,
        caissier: v.caissier || 'Administrateur',
        rawDate: v.created_at || ''
      });
    });
  });

  lignesJournalDetails.sort((a, b) => {
    let valA = '';
    let valB = '';

    if (triJournalCol === 'date') {
      valA = a.rawDate;
      valB = b.rawDate;
    } else if (triJournalCol === 'numeroTicket') {
      valA = a.numeroTicket;
      valB = b.numeroTicket;
    } else if (triJournalCol === 'designation') {
      valA = a.designation;
      valB = b.designation;
    }

    if (valA < valB) return triJournalOrdre === 'asc' ? -1 : 1;
    if (valA > valB) return triJournalOrdre === 'asc' ? 1 : -1;
    return 0;
  });

  // --- CALCULS CLÔTURE CAISSE (UNIQUEMENT SUR LES VENTES NON CLÔTURÉES) ---
  const ventesClotureFiltrees = ventesNonCloturees.filter((v) => {
    let matchDate = true;
    if (v.created_at) {
      const dateVente = v.created_at.split('T')[0];
      if (clotureDateDebut && clotureDateFin) {
        matchDate = dateVente >= clotureDateDebut && dateVente <= clotureDateFin;
      } else if (clotureDateDebut) {
        matchDate = dateVente >= clotureDateDebut;
      } else if (clotureDateFin) {
        matchDate = dateVente <= clotureDateFin;
      }
    }
    let matchCaisse = clotureCaisseId === 'TOUTES' || !clotureCaisseId || String(v.id_caisse) === String(clotureCaisseId);
    let matchCaissier = clotureCaissierId === 'TOUS' || !clotureCaissierId || String(v.caissier || v.caissier_email || '') === String(clotureCaissierId);

    return matchDate && matchCaisse && matchCaissier;
  });

  const totalFactureCloture = ventesClotureFiltrees.reduce((acc, v) => acc + Number(v.total_montant || 0), 0);
  const totalEncaisseCloture = ventesClotureFiltrees.reduce((acc, v) => acc + Number(v.montant_regle ?? v.total_montant ?? 0), 0);
  const montantAttenduCloture = totalEncaisseCloture;
  const montantReelClotureNum = Number(montantReelVerseCloture || 0);
  const ecartCaisseCloture = montantReelClotureNum - montantAttenduCloture;

  // --- FILTRAGE DE L'HISTORIQUE DES CAISSES CLÔTURÉES SELON LES PARAMÈTRES DE CLÔTURE ---
  const cloturesHistoriqueFiltrees = cloturesList.filter((cl) => {
    let matchDate = true;
    if (cl.date_debut && cl.date_fin) {
      if (clotureDateDebut && clotureDateFin) {
        matchDate = cl.date_debut >= clotureDateDebut && cl.date_fin <= clotureDateFin;
      }
    }
    let matchCaisse = clotureCaisseId === 'TOUTES' || !clotureCaisseId || String(cl.id_caisse_destination) === String(clotureCaisseId) || String(cl.id_caisse) === String(clotureCaisseId);
    let matchCaissier = clotureCaissierId === 'TOUS' || !clotureCaissierId || String(cl.caissier || '') === String(clotureCaissierId);

    return matchDate && matchCaisse && matchCaissier;
  });

  const ouvrirModalCloture = () => {
    if (montantAttenduCloture <= 0) {
      alert('⚠️ Aucun montant encaissé à verser pour cette période/caisse.');
      return;
    }

    const caissePrincipale = caissesList.find(c => 
      (c.nom_caisse || '').toUpperCase().includes('PRINCIPALE') || 
      (c.code_caisse || '').toUpperCase().includes('CP') ||
      (c.nom_caisse || '').toUpperCase().includes('CP')
    ) || caissesList[0];

    if (caissePrincipale) {
      setCaisseDestinationVersementId(caissePrincipale.id);
    }

    setAfficherModalVersementCloture(true);
  };

  const validerClotureCaisseEtVerser = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;
    if (!caisseDestinationVersementId) {
      alert('⚠️ Veuillez sélectionner la caisse de destination pour le versement.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const caisseDestObj = caissesList.find(c => String(c.id) === String(caisseDestinationVersementId));
      const nomCaisseDest = caisseDestObj ? (caisseDestObj.nom_caisse || caisseDestObj.code_caisse || 'Caisse Principale') : 'Caisse Principale';

      const idsTicketsInclus = ventesClotureFiltrees.map(v => v.id);
      const codeClotureRef = `CLOTURE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

      // 1. Enregistrer dans la table des clôtures de caisse
      const payloadCloture = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        code_cloture: codeClotureRef,
        date_debut: clotureDateDebut,
        date_fin: clotureDateFin,
        montant_total_facture: totalFactureCloture,
        montant_total_encaisse: totalEncaisseCloture,
        montant_attendu: montantAttenduCloture,
        montant_reel_verse: montantReelClotureNum,
        ecart_caisse: ecartCaisseCloture,
        id_caisse_destination: parseInt(caisseDestinationVersementId),
        ids_tickets: idsTicketsInclus,
        details_tickets: ventesClotureFiltrees,
        caissier: caissierNomActuel,
        created_at: new Date().toISOString()
      };

      const { error: errClotureTable } = await supabase.from('clotures_caisses').insert([payloadCloture]);
      if (errClotureTable) {
        console.error("Erreur enregistrement clotures_caisses:", errClotureTable.message);
        alert("Erreur lors de l'enregistrement de la clôture : " + errClotureTable.message);
        setEnTrainDeSauvegarder(false);
        return;
      }

      // 2. Insertion dans le journal des caisses / mouvements de caisse
      const payloadJournalCaisse = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        id_caisse: parseInt(caisseDestinationVersementId),
        type_mouvement: 'ENTREE',
        type_flux: 'ENTREE',
        montant: montantAttenduCloture,
        libelle: 'VERSEMENT',
        motif: `CLÔTURE CAISSE [${codeClotureRef}] (${clotureDateDebut} au ${clotureDateFin}) - Écart: ${ecartCaisseCloture} F`,
        caissier: caissierNomActuel,
        created_at: new Date().toISOString()
      };

      await supabase.from('mouvements_caisse').insert([payloadJournalCaisse]);
      await supabase.from('journal_caisses').insert([payloadJournalCaisse]);

      alert(`✅ Clôture de caisse validée avec succès ! Montant de ${montantAttenduCloture.toLocaleString('fr-FR')} CFA versé dans la caisse "${nomCaisseDest}".`);
      
      setAfficherModalVersementCloture(false);
      setMontantReelVerseCloture('');
      setClotureDateDebut(dateDuJourStr);
      setClotureDateFin(dateDuJourStr);
      setClotureCaisseId('TOUTES');
      setClotureCaissierId('TOUS');

      await chargerDonneesEtPermissions();
    } catch (err) {
      alert('Erreur lors de la clôture de caisse : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const clientsFiltres = clientsList.filter(c => (c.nom_client || c.nom || c.libelle || '').toLowerCase().includes(rechercheClientInput.toLowerCase()));

  const articlesTries = [...articlesStock].sort((a, b) => {
    const nomA = (a.Designation || a.nom || '').toLowerCase();
    const nomB = (b.Designation || b.nom || '').toLowerCase();
    if (ordreAlphabetique === 'ASC') {
      return nomA.localeCompare(nomB);
    } else {
      return nomB.localeCompare(nomA);
    }
  });

  const articlesFiltres = articlesTries.filter(a => (a.Designation || a.nom || '').toLowerCase().includes(rechercheArticleInput.toLowerCase()));

  return (
    <div className="space-y-2 text-[10px] font-sans">
      
      <div className="flex justify-between items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
        <div className="flex flex-1 gap-1">
          <button
            disabled={enTrainDeSauvegarder}
            onClick={() => setOngletActif('vente')}
            className={`flex-1 py-1 text-center font-bold rounded-md transition text-[10px] ${
              ongletActif === 'vente' ? 'bg-orange-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Vente
          </button>
          <button
            disabled={enTrainDeSauvegarder}
            onClick={() => setOngletActif('tickets')}
            className={`flex-1 py-1 text-center font-bold rounded-md transition text-[10px] ${
              ongletActif === 'tickets' ? 'bg-orange-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tickets ({ventesAffichees.length} / {ventesFiltrees.length})
          </button>
          <button
            disabled={enTrainDeSauvegarder}
            onClick={() => setOngletActif('journal')}
            className={`flex-1 py-1 text-center font-bold rounded-md transition text-[10px] ${
              ongletActif === 'journal' ? 'bg-orange-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Journal des ventes
          </button>
          <button
            disabled={enTrainDeSauvegarder}
            onClick={() => setOngletActif('cloture')}
            className={`flex-1 py-1 text-center font-bold rounded-md transition text-[10px] ${
              ongletActif === 'cloture' ? 'bg-orange-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Clôture caisse
          </button>
        </div>
        {roleNom && (
          <span className="ml-2 text-[9px] bg-white text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-200 shrink-0">
            Rôle : {roleNom}
          </span>
        )}
      </div>

      {ongletActif === 'vente' && (
        <div className="space-y-2">
          <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2 relative shadow-2xs">
            <div className="absolute top-2 right-2 text-right">
              <span className="text-[7.5px] font-extrabold text-slate-400 uppercase block tracking-tighter">N° TICKET</span>
              <span className="font-mono font-black text-orange-600 text-[9.5px]">{numeroTicket}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pr-12">
              <div>
                <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">DATE</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={dateJour}
                  onChange={(e) => setDateJour(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-mono font-bold text-[10px] text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">CAISSE</label>
                <select
                  disabled={enTrainDeSauvegarder}
                  value={caisseId}
                  onChange={(e) => changerCaisseSelectionnee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-[10px] text-slate-900"
                >
                  {caissesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code_caisse || 'C01'} - {c.nom_caisse}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">CAISSIER</label>
                <input
                  type="text"
                  readOnly
                  value={caissierNomActuel}
                  className="w-full bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-extrabold uppercase text-slate-800 text-[10px] truncate"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">DÉPÔT</label>
                <select
                  disabled={enTrainDeSauvegarder}
                  value={depotId}
                  onChange={(e) => setDepotId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-bold text-[10px] text-slate-900"
                >
                  {depotsList.length === 0 ? (
                    <option value="">Aucun dépôt</option>
                  ) : (
                    depotsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nom_depot || d.designation || 'Dépôt'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">
                  {moduleActuel === 'LIVRAISON' ? 'LIVREUR' : 'CLIENT'}
                </label>
                <div
                  onClick={() => !enTrainDeSauvegarder && setAfficherModalClient(true)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-[10px] text-slate-900 cursor-pointer flex justify-between items-center h-[24px]"
                >
                  <span className="truncate">{clientNomSelectionne}</span>
                  <span className="text-[9px] text-slate-400">🔍</span>
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">
                  {moduleActuel === 'LIVRAISON' ? 'LIVREUR LIBRE' : 'CLT LIBRE'}
                </label>
                <input
                  type="text"
                  disabled={enTrainDeSauvegarder}
                  value={nomClientLibre}
                  onChange={(e) => setNomClientLibre(e.target.value.toUpperCase())}
                  placeholder={moduleActuel === 'LIVRAISON' ? 'LIVREUR LIBRE...' : 'NOM LIBRE...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] font-extrabold uppercase text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col h-[380px]">
              <div className="flex justify-between items-center mb-2 gap-1">
                <span className="font-extrabold text-slate-700 text-[11px] uppercase">Articles</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={enTrainDeSauvegarder}
                    onClick={() => setOrdreAlphabetique(ordreAlphabetique === 'ASC' ? 'DESC' : 'ASC')}
                    title={ordreAlphabetique === 'ASC' ? 'Tri alphabétique A-Z' : 'Tri alphabétique Z-A'}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded text-[10px] transition border border-slate-200 shadow-2xs flex items-center gap-0.5"
                  >
                    <span>{ordreAlphabetique === 'ASC' ? 'A-Z' : 'Z-A'}</span>
                    <span>{ordreAlphabetique === 'ASC' ? '▲' : '▼'}</span>
                  </button>
                  <button
                    disabled={enTrainDeSauvegarder}
                    onClick={() => setAfficherModalArticle(true)}
                    className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-bold px-2.5 py-1 rounded text-[10px] shadow-2xs whitespace-nowrap"
                  >
                    🔍 recherche
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {articlesFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-16 text-[10px]">Aucun article disponible.</p>
                ) : (
                  articlesFiltres.map((art) => {
                    const artId = art.id_article || art.id;
                    const artDes = (art.Designation || art.nom || '').toUpperCase();
                    const artPrix = Number(art.Prix_Vente || art.prix_vente || 0);
                    const artStock = getStockReelArticle(art);
                    const estEpuise = artStock <= 0;

                    return (
                      <div
                        key={artId}
                        onClick={() => !enTrainDeSauvegarder && !estEpuise && ajouterAuPanier(art)}
                        className={`p-2.5 border rounded-lg flex justify-between items-center transition gap-2 shadow-2xs ${
                          estEpuise ? 'bg-slate-100 opacity-60 cursor-not-allowed border-slate-200' : 'bg-slate-50 hover:bg-orange-50 border-slate-200 cursor-pointer'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`font-black text-xs truncate ${estEpuise ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{artDes}</p>
                          <p className={`text-[10px] font-mono mt-0.5 ${estEpuise ? 'text-rose-500 font-bold' : 'text-slate-600 font-bold'}`}>
                            Stock : {artStock} {estEpuise ? '(Épuisé)' : ''}
                          </p>
                        </div>
                        <span className={`font-black font-mono text-sm whitespace-nowrap ${estEpuise ? 'text-slate-400' : 'text-emerald-700'}`}>
                          {artPrix.toLocaleString('fr-FR')}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between h-[380px]">
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                  <span className="font-extrabold text-slate-800 uppercase text-[10px]">Panier & Règlements</span>
                  <select
                    disabled={enTrainDeSauvegarder}
                    value={modePaiementTicket}
                    onChange={(e) => setModePaiementTicket(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-900"
                  >
                    <option value="ESPECES">ESPECES</option>
                    <option value="MOBILE_MONEY">MOBILE MONEY</option>
                    <option value="CARTE">CARTE BANCAIRE</option>
                  </select>
                </div>

                <div className="overflow-y-auto h-[120px] space-y-1 divide-y divide-slate-100">
                  {panier.length === 0 ? (
                    <p className="text-center text-slate-400 py-8 text-[10px]">Le panier est vide.</p>
                  ) : (
                    panier.map((item) => (
                      <div key={item.id} className="pt-1 flex justify-between items-center text-[10px]">
                        <div>
                          <p className="font-extrabold uppercase text-slate-900">{item.designation}</p>
                          <p className="text-[9px] text-slate-600 font-mono font-bold">
                            {Number(item.prix_unitaire).toLocaleString('fr-FR')} F x {item.quantite}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button disabled={enTrainDeSauvegarder} onClick={() => modifierQuantite(item.id, item.quantite - 1)} className="w-4 h-4 bg-slate-100 rounded font-bold text-slate-900">-</button>
                          <input
                            type="number"
                            disabled={enTrainDeSauvegarder}
                            value={item.quantite}
                            onChange={(e) => modifierQuantite(item.id, Number(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={handleKeyDownQuantite}
                            className="w-10 bg-slate-50 border border-slate-200 rounded text-center font-bold font-mono text-[10px] text-slate-900"
                          />
                          <button disabled={enTrainDeSauvegarder} onClick={() => modifierQuantite(item.id, item.quantite + 1)} className="w-4 h-4 bg-slate-100 rounded font-bold text-slate-900">+</button>
                          <span className="font-black text-emerald-700 font-mono ml-1 w-14 text-right">
                            {Number(item.quantite * item.prix_unitaire).toLocaleString('fr-FR')} F
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[8px] font-extrabold uppercase text-slate-600">Type de règlement :</span>
                    <select
                      disabled={enTrainDeSauvegarder}
                      value={typeReglementVente}
                      onChange={(e) => setTypeReglementVente(e.target.value)}
                      className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[9px] font-extrabold text-orange-600"
                    >
                      <option value="COMPTANT">Paiement Comptant</option>
                      <option value="CREDIT">Vente 100% Crédit</option>
                      <option value="AVANCE">Vente avec Avance</option>
                    </select>
                  </div>

                  {typeReglementVente === 'AVANCE' && (
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <span className="text-[8px] font-bold text-slate-600">Montant de l'avance (CFA) :</span>
                      <input
                        type="number"
                        min="0"
                        disabled={enTrainDeSauvegarder}
                        value={montantAvance}
                        onChange={(e) => setMontantAvance(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-24 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-right font-mono font-bold text-[10px] text-slate-900"
                      />
                    </div>
                  )}

                  {typeReglementVente !== 'COMPTANT' && (
                    <div className="flex justify-between items-center text-[8.5px] font-mono pt-0.5 border-t border-slate-200">
                      <span className="text-rose-600 font-bold">Reste à crédit :</span>
                      <span className="font-black text-rose-600">{montantCreditRestant.toLocaleString('fr-FR')} CFA</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 items-center justify-between">
                  <div className="flex items-center gap-1">
                    <select
                      disabled={enTrainDeSauvegarder}
                      value={typeRemise}
                      onChange={(e) => setTypeRemise(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[8px] font-bold text-slate-800"
                    >
                      <option value="POURCENTAGE">Remise % :</option>
                      <option value="MONTANT">Remise (F) :</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      disabled={enTrainDeSauvegarder}
                      value={valeurRemise}
                      onChange={(e) => setValeurRemise(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-14 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center text-[10px] font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-700">TVA :</span>
                    <select
                      disabled={enTrainDeSauvegarder}
                      value={appliquerTva}
                      onChange={(e) => setAppliquerTva(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[9px] font-bold text-slate-900"
                    >
                      <option value="NON">Non</option>
                      <option value="OUI">Oui ({tauxTvaClient}%)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <button
                    disabled={enTrainDeSauvegarder || panier.length === 0}
                    onClick={mettreTicketEnAttente}
                    className="bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-800 border border-amber-200 font-bold px-2 py-1 rounded text-[9px] transition shadow-2xs flex items-center justify-center gap-1"
                  >
                    ⏳ Mettre en attente
                  </button>
                  <button
                    disabled={enTrainDeSauvegarder}
                    onClick={() => setAfficherModalAttente(true)}
                    className="bg-sky-50 hover:bg-sky-100 disabled:opacity-50 text-sky-800 border border-sky-200 font-bold px-2 py-1 rounded text-[9px] transition shadow-2xs flex items-center justify-center gap-1"
                  >
                    📂 Rappel ticket ({ticketsEnAttente.length})
                  </button>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">NAP :</span>
                    <span className="font-black text-emerald-700 font-mono text-xs">
                      {totalFinal.toLocaleString('fr-FR')} CFA
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      disabled={enTrainDeSauvegarder}
                      onClick={annulerVenteEnCours}
                      className="bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 font-bold px-2 py-1.5 rounded text-[10px] transition shadow-2xs"
                    >
                      ❌ Annuler
                    </button>

                    {permissions.creation && (
                      <button
                        onClick={validerEtEnregistrerVente}
                        disabled={panier.length === 0 || enTrainDeSauvegarder}
                        className={`font-bold px-3 py-1.5 rounded text-[10px] transition shadow-2xs ${
                          panier.length > 0 && !enTrainDeSauvegarder ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {enTrainDeSauvegarder ? 'Validation...' : 'Valider'}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {ongletActif === 'tickets' && (
        <div className="space-y-2">
          <div className="bg-white p-2 rounded-lg border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1">
              <span className="font-extrabold text-slate-700 uppercase text-[9px]">🔍 FILTRER LES TICKETS</span>
              {(filtreDateDebut !== premierJourMoisStr || filtreDateFin !== dernierJourMoisStr || filtreModePaiement !== 'TOUS' || recherche) && (
                <button
                  type="button"
                  disabled={enTrainDeSauvegarder}
                  onClick={() => {
                    setFiltreDateDebut(premierJourMoisStr);
                    setFiltreDateFin(dernierJourMoisStr);
                    setFiltreModePaiement('TOUS');
                    setRecherche('');
                  }}
                  className="text-orange-600 hover:text-orange-700 font-bold text-[9px] underline"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Date Début</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={filtreDateDebut}
                  onChange={(e) => setFiltreDateDebut(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Date Fin</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={filtreDateFin}
                  onChange={(e) => setFiltreDateFin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                disabled={enTrainDeSauvegarder}
                value={recherche}
                onChange={(e) => setRecherche(e.target.value.toUpperCase())}
                placeholder={moduleActuel === 'LIVRAISON' ? "RECHERCHER TICKET OU LIVREUR..." : "RECHERCHER TICKET OU CLIENT..."}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] w-full focus:outline-none font-extrabold uppercase text-slate-900 placeholder:text-slate-400"
              />
              <select
                disabled={enTrainDeSauvegarder}
                value={filtreModePaiement}
                onChange={(e) => setFiltreModePaiement(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-slate-900 shrink-0"
              >
                <option value="TOUS">Tous modes</option>
                <option value="ESPECES">Espèces</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CARTE">Carte</option>
              </select>
            </div>
          </div>

          {chargement ? (
            <div className="p-4 text-center text-slate-400 text-[10px]">Chargement...</div>
          ) : ventesFiltrees.length === 0 ? (
            <div className="p-4 text-center text-slate-400 bg-white border border-slate-200 rounded-lg text-[10px]">
              Aucun ticket enregistré pour cette période.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-2xs">
                <table className="w-full text-left text-[9.5px] whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[8px] font-black select-none">
                    <tr>
                      <th onClick={() => gererTriTicket('created_at')} className="p-2 cursor-pointer hover:bg-slate-100 transition">
                        Date {rendreFlecheTriTicket('created_at')}
                      </th>
                      <th onClick={() => gererTriTicket('numero_ticket')} className="p-2 cursor-pointer hover:bg-slate-100 transition">
                        N° Ticket {rendreFlecheTriTicket('numero_ticket')}
                      </th>
                      <th onClick={() => gererTriTicket('nom_client')} className="p-2 cursor-pointer hover:bg-slate-100 transition">
                        {moduleActuel === 'LIVRAISON' ? 'Livreur' : 'Client'} {rendreFlecheTriTicket('nom_client')}
                      </th>
                      <th onClick={() => gererTriTicket('total_montant')} className="p-2 text-right cursor-pointer hover:bg-slate-100 transition">
                        Total {rendreFlecheTriTicket('total_montant')}
                      </th>
                      <th className="p-2 text-right">Avancé</th>
                      <th className="p-2 text-right">Reste dû</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ventesAffichees.map((v) => {
                      const nomClientVente = (v.nom_client || (moduleActuel === 'LIVRAISON' ? 'LIVREURS DIVERS' : 'CLIENTS DIVERS')).toUpperCase();
                      const totalMontant = Number(v.total_montant || 0);
                      const montantRegle = Number(v.montant_regle || totalMontant);
                      const resteDu = Math.max(0, totalMontant - montantRegle);

                      return (
                        <tr
                          key={v.id}
                          onClick={() => !enTrainDeSauvegarder && setTicketSelectionne(v)}
                          className="hover:bg-slate-50/80 cursor-pointer transition"
                        >
                          <td className="p-2 text-slate-600 font-mono text-[9px] font-bold">
                            {v.created_at ? new Date(v.created_at).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td className="p-2 font-mono font-bold text-orange-600">{v.numero_ticket || '-'}</td>
                          <td className="p-2 font-extrabold uppercase text-slate-900 max-w-[120px] truncate" title={nomClientVente}>{nomClientVente}</td>
                          <td className="p-2 text-right font-black text-emerald-700 font-mono">
                            {totalMontant.toLocaleString('fr-FR')}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-700">
                            {montantRegle.toLocaleString('fr-FR')}
                          </td>
                          <td className="p-2 text-right font-mono font-black text-rose-600">
                            {resteDu > 0 ? resteDu.toLocaleString('fr-FR') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {limiteVentes < ventesFiltrees.length && (
                <div className="text-center pt-1 pb-2">
                  <button
                    type="button"
                    disabled={enTrainDeSauvegarder}
                    onClick={() => setLimiteVentes(prev => prev + 20)}
                    className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-3 py-1.5 rounded-xl text-[10px] transition shadow-xs border border-slate-300 w-full"
                  >
                    📥 Charger 20 tickets de plus ({ventesFiltrees.length - limiteVentes} restants)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {ongletActif === 'journal' && (
        <div className="space-y-2">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2 shadow-2xs">
            <span className="font-extrabold text-slate-700 uppercase text-[9px] block border-b border-slate-100 pb-1">
              📊 PARAMÈTRES DU JOURNAL DES VENTES
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Date Début</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={journalDateDebut}
                  onChange={(e) => setJournalDateDebut(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Date Fin</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={journalDateFin}
                  onChange={(e) => setJournalDateFin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Caisse</label>
                <select
                  disabled={enTrainDeSauvegarder}
                  value={journalCaisseId}
                  onChange={(e) => setJournalCaisseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-900"
                >
                  <option value="TOUTES">Toutes les caisses</option>
                  {caissesList.map(c => (
                    <option key={c.id} value={c.id}>{c.code_caisse || 'C01'} - {c.nom_caisse}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Caissier</label>
                <select
                  disabled={enTrainDeSauvegarder}
                  value={journalCaissierId}
                  onChange={(e) => setJournalCaissierId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-900"
                >
                  <option value="TOUS">Tous les caissiers</option>
                  {utilisateursList.map(u => (
                    <option key={u.id} value={u.nom_complet || u.email}>{u.nom_complet || u.email}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-2xs">
            <table className="w-full text-left text-[9.5px] whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase text-[8px] font-black select-none">
                <tr>
                  <th onClick={() => gererTriJournal('date')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition">
                    Date {rendreFlecheTriJournal('date')}
                  </th>
                  <th onClick={() => gererTriJournal('numeroTicket')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition">
                    N° Ticket {rendreFlecheTriJournal('numeroTicket')}
                  </th>
                  <th onClick={() => gererTriJournal('designation')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition">
                    Articles {rendreFlecheTriJournal('designation')}
                  </th>
                  <th className="p-1.5 text-center">Qté</th>
                  <th className="p-1.5 text-right">P.Achat</th>
                  <th className="p-1.5 text-right">P.Vente</th>
                  <th className="p-1.5 text-right">Marge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lignesJournalDetails.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-slate-400">Aucune vente enregistrée pour ces critères.</td>
                  </tr>
                ) : (
                  lignesJournalDetails.map((ligne, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-1.5 font-mono text-[9px] text-slate-600">{ligne.date}</td>
                      <td className="p-1.5 font-mono font-bold text-orange-600">{ligne.numeroTicket}</td>
                      <td className="p-1.5 font-extrabold uppercase text-slate-900 max-w-[120px] truncate" title={ligne.designation}>{ligne.designation}</td>
                      <td className="p-1.5 text-center font-bold text-slate-800">{ligne.quantite}</td>
                      <td className="p-1.5 text-right font-mono text-slate-600">{ligne.prixAchat.toLocaleString('fr-FR')}</td>
                      <td className="p-1.5 text-right font-mono font-bold text-slate-900">{ligne.prixVente.toLocaleString('fr-FR')}</td>
                      <td className="p-1.5 text-right font-mono font-black text-emerald-700">{ligne.marge.toLocaleString('fr-FR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-900 text-white p-2.5 rounded-lg flex justify-between items-center shadow-xs">
            <div className="space-y-0.5">
              <span className="text-[8.5px] text-slate-400 uppercase font-bold block">TOTAL DES VENTES :</span>
              <span className="text-xs font-black font-mono text-white">
                {totalVentesJournalGlobal.toLocaleString('fr-FR')} CFA
              </span>
            </div>
            <div className="space-y-0.5 text-right">
              <span className="text-[8.5px] text-emerald-400 uppercase font-bold block">MARGE DÉGAGÉE :</span>
              <span className="text-xs font-black font-mono text-emerald-400">
                {totalMargeJournalGlobal.toLocaleString('fr-FR')} CFA
              </span>
            </div>
          </div>
        </div>
      )}

      {ongletActif === 'cloture' && (
        <div className="space-y-2.5">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1">
              <span className="font-extrabold text-slate-700 uppercase text-[9px]">
                🔐 PARAMÈTRES DE CLÔTURE DE CAISSE (RECETTES NON CLÔTURÉES)
              </span>
              <span className="text-[9px] font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                Caisses clôturées ({cloturesList.length})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Date Début</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={clotureDateDebut}
                  onChange={(e) => setClotureDateDebut(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Date Fin</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={clotureDateFin}
                  onChange={(e) => setClotureDateFin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Caisse</label>
                <select
                  disabled={enTrainDeSauvegarder}
                  value={clotureCaisseId}
                  onChange={(e) => setClotureCaisseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-900"
                >
                  <option value="TOUTES">Toutes les caisses</option>
                  {caissesList.map(c => (
                    <option key={c.id} value={c.id}>{c.code_caisse || 'C01'} - {c.nom_caisse}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Caissier</label>
                <select
                  disabled={enTrainDeSauvegarder}
                  value={clotureCaissierId}
                  onChange={(e) => setClotureCaissierId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-bold text-slate-900"
                >
                  <option value="TOUS">Tous les caissiers</option>
                  {utilisateursList.map(u => (
                    <option key={u.id} value={u.nom_complet || u.email}>{u.nom_complet || u.email}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[8.5px] text-slate-500 uppercase font-bold block">MONTANT TOTAL FACTURÉ :</span>
              <span className="text-sm font-black font-mono text-slate-900 block">
                {totalFactureCloture.toLocaleString('fr-FR')} CFA
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[8.5px] text-slate-500 uppercase font-bold block">MONTANT TOTAL ENCAISSÉ :</span>
              <span className="text-sm font-black font-mono text-emerald-700 block">
                {totalEncaisseCloture.toLocaleString('fr-FR')} CFA
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[8.5px] text-slate-500 uppercase font-bold block">MONTANT ATTENDU :</span>
              <span className="text-sm font-black font-mono text-blue-700 block">
                {montantAttenduCloture.toLocaleString('fr-FR')} CFA
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[8.5px] text-slate-500 uppercase font-bold block">ÉCART DE CAISSE :</span>
              <span className={`text-sm font-black font-mono block ${ecartCaisseCloture < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {ecartCaisseCloture.toLocaleString('fr-FR')} CFA
              </span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="w-full sm:w-auto flex-1">
                <label className="block text-[9px] font-black text-slate-700 uppercase mb-1">Montant réellement versé (Comptage physique) :</label>
                <input
                  type="number"
                  min="0"
                  disabled={enTrainDeSauvegarder}
                  value={montantReelVerseCloture}
                  onChange={(e) => setMontantReelVerseCloture(e.target.value)}
                  placeholder="EX: 50000"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900"
                />
              </div>
              <div className="w-full sm:w-auto pt-4">
                <button
                  type="button"
                  disabled={enTrainDeSauvegarder || montantAttenduCloture <= 0}
                  onClick={ouvrirModalCloture}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black px-5 py-2 rounded-lg text-xs transition shadow-2xs"
                >
                  🔒 Valider la clôture & Verser
                </button>
              </div>
            </div>
          </div>

          {/* LISTE INTÉGRÉE DES CAISSES CLÔTURÉES */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1">
              <span className="font-extrabold text-slate-700 uppercase text-[9px]">
                📁 HISTORIQUE DES CAISSES CLÔTURÉES ({cloturesHistoriqueFiltrees.length})
              </span>
              <div className="text-[8.5px] font-bold text-slate-500">
                Filtre actif : {clotureDateDebut} au {clotureDateFin} | Caisse: {clotureCaisseId === 'TOUTES' ? 'Toutes' : caissesList.find(c => String(c.id) === String(clotureCaisseId))?.nom_caisse || ''} | Caissier: {clotureCaissierId}
              </div>
            </div>
            
            {cloturesHistoriqueFiltrees.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-[10px]">Aucune caisse clôturée pour ces critères.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[9.5px]">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase text-[8px] font-black">
                    <tr>
                      <th className="p-2">Période</th>
                      <th className="p-2 text-right">Montant Attendu</th>
                      <th className="p-2 text-right">Montant Versé</th>
                      <th className="p-2 text-right">Écart</th>
                      <th className="p-2 text-center">Tickets inclus</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cloturesHistoriqueFiltrees.map((cl) => {
                      const mttAttendu = Number(cl.montant_attendu || 0);
                      const mttVerse = Number(cl.montant_reel_verse || cl.montant_attendu || 0);
                      const ecartVal = Number(cl.ecart_caisse || (mttVerse - mttAttendu));

                      return (
                        <tr key={cl.id} className="hover:bg-slate-50 transition">
                          <td className="p-2 text-slate-900 font-bold">{cl.date_debut} au {cl.date_fin}</td>
                          <td className="p-2 text-right font-mono font-bold text-blue-700">{mttAttendu.toLocaleString('fr-FR')} CFA</td>
                          <td className="p-2 text-right font-mono font-black text-emerald-700">{mttVerse.toLocaleString('fr-FR')} CFA</td>
                          <td className={`p-2 text-right font-mono font-bold ${ecartVal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {ecartVal.toLocaleString('fr-FR')} CFA
                          </td>
                          <td className="p-2 text-center font-bold text-slate-900">{cl.ids_tickets?.length || 0} ticket(s)</td>
                          <td className="p-2 text-center">
                            <button onClick={() => setClotureDetailSelectionnee(cl)} className="bg-slate-900 text-white px-2.5 py-1 rounded font-bold hover:bg-slate-800 transition">
                              🔍 Voir détails
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {afficherModalClient && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-3">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200">
            <div className="p-2.5 bg-slate-900 text-white flex justify-between items-center text-[11px] font-bold">
              <span>{moduleActuel === 'LIVRAISON' ? 'SÉLECTIONNER UN LIVREUR' : 'SÉLECTIONNER UN CLIENT'}</span>
              <button onClick={() => setAfficherModalClient(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto">
              <input
                type="text"
                autoFocus
                disabled={enTrainDeSauvegarder}
                value={rechercheClientInput}
                onChange={(e) => setRechercheClientInput(e.target.value.toUpperCase())}
                placeholder={moduleActuel === 'LIVRAISON' ? "RECHERCHER UN LIVREUR..." : "RECHERCHER UN CLIENT..."}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-[11px] focus:outline-none font-extrabold uppercase text-slate-900 placeholder:text-slate-400 shadow-2xs"
              />
              <div className="space-y-1 pt-1">
                {clientsFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-[10px]">Aucun résultat trouvé.</p>
                ) : (
                  clientsFiltres.map((c) => {
                    const nomC = c.nom_client || c.nom || c.libelle || 'CLIENT';
                    return (
                      <div
                        key={c.id}
                        onClick={() => !enTrainDeSauvegarder && selectionnerClient(c)}
                        className="p-2.5 bg-slate-50 hover:bg-orange-50 border border-slate-200 rounded-lg flex justify-between items-center cursor-pointer transition shadow-2xs"
                      >
                        <div>
                          <p className="font-extrabold uppercase text-slate-900 text-[11px]">{nomC}</p>
                          <p className="text-[9.5px] text-slate-600 font-mono font-bold">{c.telephone || 'SANS TÉLÉPHONE'}</p>
                        </div>
                        <span className="font-bold text-orange-600 text-[10px] bg-orange-100 px-2 py-0.5 rounded">Sélectionner</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {afficherModalVersementCloture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="p-3 bg-slate-900 text-white flex justify-between items-center text-[11px] font-black">
              <span>🏦 CHOISIR LA CAISSE DE VERSEMENT</span>
              <button onClick={() => setAfficherModalVersementCloture(false)} className="text-slate-300 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={validerClotureCaisseEtVerser} className="p-4 space-y-3">
              <p className="text-[10px] text-slate-600 font-bold">
                Indiquez la caisse dans laquelle vous souhaitez verser la recette de clôture d'un montant de <strong className="text-emerald-700 font-mono">{montantAttenduCloture.toLocaleString('fr-FR')} CFA</strong>.
              </p>

              <div>
                <label className="block font-black mb-1 text-[9px] text-slate-700 uppercase">Caisse de Destination *</label>
                <select
                  required
                  disabled={enTrainDeSauvegarder}
                  value={caisseDestinationVersementId}
                  onChange={(e) => setCaisseDestinationVersementId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 font-bold text-slate-900 text-[11px] shadow-2xs"
                >
                  <option value="">-- Sélectionner une caisse --</option>
                  {caissesList.map(c => (
                    <option key={c.id} value={c.id}>{c.code_caisse || 'C01'} - {c.nom_caisse}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={enTrainDeSauvegarder}
                  onClick={() => setAfficherModalVersementCloture(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded text-[10px]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={enTrainDeSauvegarder}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black px-4 py-1.5 rounded text-[10px] shadow-xs"
                >
                  {enTrainDeSauvegarder ? 'Validation...' : 'Confirmer le versement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAILS DE LA CAISSE CLÔTURÉE */}
      {clotureDetailSelectionnee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-3 bg-slate-900 text-white flex justify-between items-center text-[11px]">
              <span className="font-bold">Détails Clôture : {clotureDetailSelectionnee.code_cloture}</span>
              <button onClick={() => setClotureDetailSelectionnee(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="p-3 overflow-y-auto space-y-2.5 text-[10px]">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <p className="font-bold text-slate-700">Période : <span className="text-slate-900">{clotureDetailSelectionnee.date_debut} au {clotureDetailSelectionnee.date_fin}</span></p>
                <p className="font-bold text-slate-700">Montant Attendu : <span className="font-mono text-blue-700 font-black">{Number(clotureDetailSelectionnee.montant_attendu || 0).toLocaleString('fr-FR')} CFA</span></p>
                <p className="font-bold text-slate-700">Montant Versé : <span className="font-mono text-emerald-700 font-black">{Number(clotureDetailSelectionnee.montant_reel_verse || clotureDetailSelectionnee.montant_attendu || 0).toLocaleString('fr-FR')} CFA</span></p>
                <p className="font-bold text-slate-700">Écart de Caisse : <span className={`font-mono font-black ${(clotureDetailSelectionnee.ecart_caisse || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{Number(clotureDetailSelectionnee.ecart_caisse || 0).toLocaleString('fr-FR')} CFA</span></p>
              </div>
              
              <span className="font-extrabold uppercase text-slate-500 block pt-1 border-t">Liste des tickets inclus dans cette clôture :</span>
              <div className="border rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[8px] font-black uppercase text-slate-700">
                    <tr>
                      <th className="p-1.5">N° Ticket</th>
                      <th className="p-1.5">Client</th>
                      <th className="p-1.5 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-900 font-bold">
                    {clotureDetailSelectionnee.details_tickets?.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-1.5 font-mono text-orange-600">{t.numero_ticket}</td>
                        <td className="p-1.5 uppercase text-slate-900">{t.nom_client || 'CLIENTS DIVERS'}</td>
                        <td className="p-1.5 text-right font-mono text-slate-900">{Number(t.total_montant || t.montant_regle).toLocaleString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-2 bg-slate-100 text-right">
              <button onClick={() => setClotureDetailSelectionnee(null)} className="bg-slate-900 text-white px-3 py-1 rounded font-bold">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {afficherModalArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-2.5 bg-slate-900 text-white flex justify-between items-center text-[11px] font-bold">
              <span>SÉLECTIONNER UN ARTICLE</span>
              <button onClick={() => setAfficherModalArticle(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto">
              <input
                type="text"
                autoFocus
                disabled={enTrainDeSauvegarder}
                value={rechercheArticleInput}
                onChange={(e) => setSearchArticleInput(e.target.value.toUpperCase())}
                placeholder="RECHERCHER UN ARTICLE..."
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] focus:outline-none font-extrabold uppercase text-slate-900 placeholder:text-slate-400"
              />
              <div className="space-y-1 pt-1">
                {articlesFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-[10px]">Aucun article trouvé.</p>
                ) : (
                  articlesFiltres.map((art) => {
                    const artId = art.id_article || art.id;
                    const artDes = (art.Designation || art.nom || '').toUpperCase();
                    const artPrix = Number(art.Prix_Vente || art.prix_vente || 0);
                    const artStock = getStockReelArticle(art);
                    const estEpuise = artStock <= 0;

                    return (
                      <div
                        key={artId}
                        onClick={() => !enTrainDeSauvegarder && !estEpuise && ajouterAuPanier(art)}
                        className={`p-2 border rounded flex justify-between items-center transition ${
                          estEpuise ? 'bg-slate-100 opacity-60 cursor-not-allowed border-slate-200' : 'bg-slate-50 hover:bg-orange-50 border-slate-200 cursor-pointer'
                        }`}
                      >
                        <div>
                          <p className={`font-extrabold uppercase text-[10px] ${estEpuise ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{artDes}</p>
                          <p className={`text-[9px] font-mono ${estEpuise ? 'text-rose-500 font-bold' : 'text-slate-600 font-bold'}`}>
                            Stock : {artStock} {estEpuise ? '(Épuisé)' : ''}
                          </p>
                        </div>
                        <span className={`font-black font-mono text-[10px] ${estEpuise ? 'text-slate-400' : 'text-orange-600'}`}>
                          {artPrix.toLocaleString('fr-FR')}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {afficherModalAttente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-2.5 bg-slate-900 text-white flex justify-between items-center text-[11px] font-bold">
              <span>⏳ TICKETS EN ATTENTE ({ticketsEnAttente.length})</span>
              <button onClick={() => setAfficherModalAttente(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto">
              {ticketsEnAttente.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-[10px]">Aucun ticket en attente.</p>
              ) : (
                ticketsEnAttente.map((t) => (
                  <div
                    key={t.idAttente}
                    className="p-2 bg-slate-50 hover:bg-amber-50 border border-slate-200 rounded flex justify-between items-center transition"
                  >
                    <div>
                      <p className="font-extrabold uppercase text-slate-900 text-[10px]">{t.numeroTicket} - {t.client}</p>
                      <p className="text-[9px] text-slate-600 font-mono font-bold">{t.panier.length} article(s) • Heure : {t.date}</p>
                    </div>
                    <button
                      disabled={enTrainDeSauvegarder}
                      onClick={() => rappelerTicket(t)}
                      className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold px-2.5 py-1 rounded text-[9px] shadow-2xs"
                    >
                      Rappeler
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {ticketSelectionne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-2.5 bg-slate-900 text-white flex justify-between items-center text-[11px]">
              <div className="flex flex-col">
                <span className="font-bold font-mono text-orange-400">Ticket #{ticketSelectionne.numero_ticket} — {ticketSelectionne.nom_client || 'CLIENTS DIVERS'}</span>
                <span className="text-[8.5px] text-slate-300">Date : {ticketSelectionne.created_at ? new Date(ticketSelectionne.created_at).toLocaleDateString('fr-FR') : '-'}</span>
              </div>
              <button disabled={enTrainDeSauvegarder} onClick={() => setTicketSelectionne(null)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <div className="p-3 overflow-y-auto space-y-2 font-mono text-[10px] bg-slate-50">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Détails des articles :</span>
                {Array.isArray(ticketSelectionne.details_articles) && ticketSelectionne.details_articles.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 uppercase text-[8px] font-black border-b border-slate-200">
                          <th className="p-1.5 w-[12%] text-center">QTE</th>
                          <th className="p-1.5 w-[48%]">ARTICLE</th>
                          <th className="p-1.5 w-[20%] text-right">P.V</th>
                          <th className="p-1.5 w-[20%] text-right">P.T</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[9.5px]">
                        {ticketSelectionne.details_articles.map((item, idx) => {
                          const qte = Number(item.quantite || 1);
                          const pv = Number(item.prix_unitaire || item.prix_vente || 0);
                          const pt = qte * pv;

                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                              <td className="p-1.5 text-center font-bold text-slate-900">{qte}x</td>
                              <td className="p-1.5 font-extrabold uppercase text-slate-900 truncate">{item.designation}</td>
                              <td className="p-1.5 text-right text-slate-600 font-bold whitespace-nowrap">
                                {pv.toLocaleString('fr-FR')}
                              </td>
                              <td className="p-1.5 text-right font-black text-emerald-700 whitespace-nowrap">
                                {pt.toLocaleString('fr-FR')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[10px]">Aucun détail d'article.</p>
                )}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between font-black text-[11px] text-slate-900">
                <span>TOTAL :</span>
                <span className="text-emerald-700 font-mono">
                  {Number(ticketSelectionne.total_montant || 0).toLocaleString('fr-FR')} CFA
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="w-full sm:w-auto text-center sm:text-left">
                <button
                  disabled={enTrainDeSauvegarder}
                  onClick={() => declencherSuppressionTicket(ticketSelectionne)}
                  className="w-full sm:w-auto bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 font-bold px-3 py-1.5 rounded text-[10px] transition shadow-2xs flex items-center justify-center gap-1"
                >
                  🗑️ Supprimer (Admin requis)
                </button>
              </div>
              
              <div className="flex gap-1.5 w-full sm:w-auto justify-end">
                <button
                  disabled={enTrainDeSauvegarder}
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded text-[10px] transition text-center disabled:opacity-50"
                >
                  🖨️ Imprimer
                </button>
                <button
                  disabled={enTrainDeSauvegarder}
                  onClick={() => setTicketSelectionne(null)}
                  className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded text-[10px] transition text-center disabled:opacity-50"
                >
                  Fermer
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {afficherModalAuthSuppression && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="p-3 bg-red-600 text-white flex justify-between items-center text-[11px] font-black">
              <span>🔐 AUTORISATION ADMINISTRATEUR REQUISE</span>
              <button onClick={() => setAfficherModalAuthSuppression(false)} className="text-white hover:text-slate-200">✕</button>
            </div>
            
            <form onSubmit={verifierEtExecuterSuppressionAdmin} className="p-4 space-y-3">
              <p className="text-[10px] text-slate-600 font-bold">
                La suppression du ticket <strong>#{ticketEnCoursDeSuppression?.numero_ticket}</strong> nécessite les identifiants d'un superviseur ou administrateur ayant le droit de suppression.
              </p>

              <div>
                <label className="block font-black mb-1 text-[9px] text-slate-700 uppercase">Email Administrateur / Superviseur</label>
                <input 
                  type="email" 
                  required 
                  disabled={enTrainDeSauvegarder}
                  value={adminEmailAuth} 
                  onChange={(e) => setAdminEmailAuth(e.target.value)} 
                  placeholder="admin@entreprise.cm" 
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 font-bold text-slate-900 text-[11px] shadow-2xs" 
                />
              </div>

              <div>
                <label className="block font-black mb-1 text-[9px] text-slate-700 uppercase">Mot de passe</label>
                <input 
                  type="password" 
                  required 
                  disabled={enTrainDeSauvegarder}
                  value={adminPasswordAuth} 
                  onChange={(e) => setAdminPasswordAuth(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 font-mono font-bold text-slate-900 text-[11px] shadow-2xs" 
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  disabled={enTrainDeSauvegarder}
                  onClick={() => setAfficherModalAuthSuppression(false)} 
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded text-[10px]"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={enTrainDeSauvegarder}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black px-4 py-1.5 rounded text-[10px] shadow-xs"
                >
                  {enTrainDeSauvegarder ? 'Vérification...' : 'Confirmer la suppression'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}