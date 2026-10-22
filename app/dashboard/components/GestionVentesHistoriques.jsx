'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const [chargement, setChargement] = useState(false);
  
  const [recherche, setRecherche] = useState('');
  const [filtreModePaiement, setFiltreModePaiement] = useState('TOUS');
  const [ticketSelectionne, setTicketSelectionne] = useState(null);

  const [modeSaisie, setModeSaisie] = useState(true);

  // État pour le tri alphabétique ('ASC' pour A-Z, 'DESC' pour Z-A)
  const [ordreAlphabetique, setOrdreAlphabetique] = useState('ASC');

  // En-tête du ticket, caisse et dépôt
  const [caisseId, setCaisseId] = useState('');
  const [depotId, setDepotId] = useState('');
  const [codeCaisseActif, setCodeCaisseActif] = useState('C01');
  const [numeroTicket, setNumeroTicket] = useState('');
  const [dateJour, setDateJour] = useState('');
  const [modePaiementTicket, setModePaiementTicket] = useState('ESPECES');
  const [clientId, setClientId] = useState('');
  const [clientSelectionneObj, setClientSelectionneObj] = useState(null);
  const [clientNomSelectionne, setClientNomSelectionne] = useState('Clients Divers');
  const [nomClientLibre, setNomClientLibre] = useState('');

  const [afficherModalClient, setAfficherModalClient] = useState(false);
  const [rechercheClientInput, setRechercheClientInput] = useState('');
  
  const [afficherModalArticle, setAfficherModalArticle] = useState(false);
  const [rechercheArticleInput, setSearchArticleInput] = useState('');

  // 🕒 Gestion des tickets en attente
  const [ticketsEnAttente, setTicketsEnAttente] = useState([]);
  const [afficherModalAttente, setAfficherModalAttente] = useState(false);

  const [panier, setPanier] = useState([]);
  
  // Gestion de la Remise (% ou Montant) et de la TVA (Oui/Non)
  const [typeRemise, setTypeRemise] = useState('POURCENTAGE'); // 'POURCENTAGE' ou 'MONTANT'
  const [valeurRemise, setValeurRemise] = useState(0);
  const [appliquerTva, setAppliquerTva] = useState('NON'); // 'OUI' ou 'NON'

  // Récupération dynamique et robuste du module actif (Boutique, Livraison, Logistique, Tontine, etc.)
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  // Formatage propre du numéro de ticket (ex: C01-01, C01-02, etc.)
  const genererNumeroTicket = (code, totalVentes) => {
    return `${code || 'C01'}-${String(totalVentes + 1).padStart(2, '0')}`;
  };

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      // Isolation stricte par entreprise ET par module pour une étanchéité à long terme
      const [resVentes, resArticles, resClients, resCategories, resCaisses, resDepots, resMouvements, resAppro] = await Promise.all([
        supabase.from('ventes_historiques').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel).order('created_at', { ascending: false }),
        supabase.from('articles_stock').select('*').eq('ID_Entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('clients').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('categories_clients').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('caisses').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('depots_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('mouvements_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel)
      ]);

      if (resVentes.error) throw resVentes.error;
      if (resArticles.error) throw resArticles.error;
      if (resClients.error) throw resClients.error;
      if (resCaisses.error) throw resCaisses.error;
      if (resDepots.error) throw resDepots.error;

      const ventesData = resVentes.data || [];
      const clientsData = resClients.data || [];
      const categoriesData = resCategories.data || [];
      const caissesData = resCaisses.data || [];
      const depotsData = resDepots.data || [];
      
      setVentes(ventesData);
      setVentesHistoriques(ventesData);
      setArticlesStock(resArticles.data || []);
      setClientsList(clientsData);
      setCategoriesList(categoriesData);
      setCaissesList(caissesData);
      setDepotsList(depotsData);
      setMouvements(resMouvements.data || []);
      setApprovisionnements(resAppro.data || []);

      setDateJour(new Date().toISOString().split('T')[0]);

      let codeCaisseCourant = 'C01';
      if (caissesData.length > 0) {
        setCaisseId(caissesData[0].id);
        codeCaisseCourant = caissesData[0].code_caisse || 'C01';
        setCodeCaisseActif(codeCaisseCourant);
      }

      setNumeroTicket(genererNumeroTicket(codeCaisseCourant, ventesData.length));

      if (depotsData.length > 0) {
        setDepotId(depotsData[0].id);
      }

      const clientDivers = clientsData.find(c => (c.nom_client || '').toLowerCase().includes('divers'));
      if (clientDivers) {
        setClientId(clientDivers.id);
        setClientSelectionneObj(clientDivers);
        setClientNomSelectionne(clientDivers.nom_client);
      } else if (clientsData.length > 0) {
        setClientId(clientsData[0].id);
        setClientSelectionneObj(clientsData[0]);
        setClientNomSelectionne(clientsData[0].nom_client || 'Client');
      }

    } catch (err) {
      console.error('Erreur chargement :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId, moduleActuel]);

  const changerCaisseSelectionnee = (idCaisseSel) => {
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
    if (confirm('Voulez-vous vraiment annuler cette vente en cours ? Le panier sera vidé.')) {
      setPanier([]);
      setNomClientLibre('');
      setValeurRemise(0);
      setAppliquerTva('NON');
      setNumeroTicket(genererNumeroTicket(codeCaisseActif, ventes.length));
    }
  };

  const mettreTicketEnAttente = () => {
    if (panier.length === 0) {
      alert('⚠️ Le panier est vide, impossible de mettre en attente.');
      return;
    }
    const clientNomActuel = nomClientLibre.trim() || clientNomSelectionne || 'Client Divers';
    const nouveauTicketAttente = {
      idAttente: Date.now(),
      numeroTicket,
      client: clientNomActuel,
      caisseId,
      depotId,
      panier: [...panier],
      typeRemise,
      valeurRemise,
      appliquerTva,
      modePaiementTicket,
      date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setTicketsEnAttente([...ticketsEnAttente, nouveauTicketAttente]);
    alert(`⏳ Ticket ${numeroTicket} (${clientNomActuel}) mis en attente avec succès !`);
    
    setPanier([]);
    setNomClientLibre('');
    setValeurRemise(0);
    setAppliquerTva('NON');
    setNumeroTicket(genererNumeroTicket(codeCaisseActif, ventes.length));
  };

  const rappelerTicket = (ticketAttente) => {
    setPanier(ticketAttente.panier);
    setNumeroTicket(ticketAttente.numeroTicket);
    setClientNomSelectionne(ticketAttente.client);
    setTypeRemise(ticketAttente.typeRemise);
    setValeurRemise(ticketAttente.valeurRemise);
    setAppliquerTva(ticketAttente.appliquerTva);
    setModePaiementTicket(ticketAttente.modePaiementTicket);
    setCaisseId(ticketAttente.caisseId);
    setDepotId(ticketAttente.depotId);

    setTicketsEnAttente(ticketsEnAttente.filter(t => t.idAttente !== ticketAttente.idAttente));
    setAfficherModalAttente(false);
    alert(`✅ Ticket ${ticketAttente.numeroTicket} rappelé dans le panier.`);
  };

  const selectionnerClient = (client) => {
    setClientId(client.id);
    setClientSelectionneObj(client);
    setClientNomSelectionne(client.nom_client || 'Client');
    setAfficherModalClient(false);
    setTimeout(() => {
      setAfficherModalArticle(true);
    }, 100);
  };

  const ajouterAuPanier = (article) => {
    const articleId = article.id_article || article.id;
    const designation = article.Designation || article.designation || article.nom;
    const prixU = Number(article.Prix_Vente || article.prix_vente || article.prix || 0);
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
      setPanier([...panier, { id: articleId, designation, prix_unitaire: prixU, quantite: 1, stockMax: stockDispo }]);
    }
    setAfficherModalArticle(false);
  };

  const modifierQuantite = (id, qte) => {
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

  const validerEtEnregistrerVente = async () => {
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

    let nomClientFacture = nomClientLibre.trim() || clientNomSelectionne || 'Clients Divers';

    const payloadVente = {
      id_entreprise: entrepriseId,
      module: moduleActuel, // Injection automatique du module actif
      numero_ticket: numeroTicket,
      mode_paiement: modePaiementTicket,
      total_montant: totalFinal,
      montant_regle: totalFinal,
      details_articles: panier,
      id_caisse: caisseId || null,
      id_depot: depotId || null,
      nom_client: nomClientFacture,
      id_client: clientId ? parseInt(clientId) : null
    };

    try {
      let { error: errVente } = await supabase.from('ventes_historiques').insert([payloadVente]);

      if (errVente && errVente.message.includes('column')) {
        console.warn("Retrait dynamique des colonnes client absentes de la table :", errVente.message);
        delete payloadVente.nom_client;
        delete payloadVente.id_client;

        const resFallback = await supabase.from('ventes_historiques').insert([payloadVente]);
        if (resFallback.error) throw resFallback.error;
      } else if (errVente) {
        throw errVente;
      }

      for (const item of panier) {
        const payloadMouvement = {
          id_entreprise: entrepriseId,
          module: moduleActuel, // Injection automatique du module actif
          type_mouvement: 'SORTIE',
          id_depot_source: depotId,
          id_depot_destination: null,
          id_article: parseInt(item.id),
          quantite: item.quantite,
          motif_remarque: `Vente Ticket ${numeroTicket} (${nomClientFacture})`
        };

        const { error: errMvt } = await supabase.from('mouvements_stock').insert([payloadMouvement]);
        if (errMvt) {
          console.error("Erreur enregistrement mouvement stock associé à la vente:", errMvt.message);
        }
      }

      alert(`✅ Ticket ${numeroTicket} (${nomClientFacture}) enregistré et stock mis à jour avec succès dans le module ${moduleActuel} !`);
      setPanier([]);
      setNomClientLibre('');
      setValeurRemise(0);
      setAppliquerTva('NON');
      await chargerDonnees();
      setModeSaisie(false);
    } catch (err) {
      alert('Erreur enregistrement : ' + err.message);
    }
  };

  const supprimerTicket = async (id) => {
    if (!confirm('Voulez-vous vraiment supprimer ce ticket ?')) return;
    try {
      const { error } = await supabase.from('ventes_historiques').delete().eq('id', id);
      if (error) throw error;
      setTicketSelectionne(null);
      await chargerDonnees();
    } catch (err) {
      alert('Erreur suppression : ' + err.message);
    }
  };

  const ventesFiltrees = ventes.filter((v) => {
    const numTicket = (v.numero_ticket || '').toLowerCase();
    const nomClientVente = (v.nom_client || '').toLowerCase();
    const query = recherche.toLowerCase();
    const matchQuery = numTicket.includes(query) || nomClientVente.includes(query);
    const matchPaiement = filtreModePaiement === 'TOUS' || (v.mode_paiement || '').toUpperCase() === filtreModePaiement.toUpperCase();
    return matchQuery && matchPaiement;
  });

  const clientsFiltres = clientsList.filter(c => (c.nom_client || '').toLowerCase().includes(rechercheClientInput.toLowerCase()));

  // Tri alphabétique dynamique appliqué sur les articles
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
      
      {/* BARRE DE NAVIGATION INTERNE */}
      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
        <button
          onClick={() => setModeSaisie(true)}
          className={`flex-1 py-1 text-center font-bold rounded-md transition text-[10px] ${
            modeSaisie ? 'bg-orange-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          🛒 Caisse
        </button>
        <button
          onClick={() => setModeSaisie(false)}
          className={`flex-1 py-1 text-center font-bold rounded-md transition text-[10px] ${
            !modeSaisie ? 'bg-orange-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          📋 Tickets ({ventes.length})
        </button>
      </div>

      {/* MODE 1 : SAISIE DE CAISSE */}
      {modeSaisie ? (
        <div className="space-y-2">
          
          {/* EN-TÊTE : 2 LIGNES SÉPARÉES */}
          <div className="bg-white border border-slate-200 rounded-lg p-2 space-y-1.5">
            
            {/* LIGNE 1 : Caisse, Date, N° Ticket */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">CAISSE</label>
                <select
                  value={caisseId}
                  onChange={(e) => changerCaisseSelectionnee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-bold text-[10px] text-slate-900"
                >
                  {caissesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code_caisse || 'C01'} - {c.nom_caisse}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">DATE</label>
                <input
                  type="date"
                  value={dateJour}
                  onChange={(e) => setDateJour(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-mono font-bold text-[10px] text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">N° TICKET</label>
                <input
                  type="text"
                  readOnly
                  value={numeroTicket}
                  className="w-full bg-slate-100 border border-slate-200 rounded px-1 py-0.5 font-mono font-black text-orange-600 text-[10px]"
                />
              </div>
            </div>

            {/* LIGNE 2 : Dépôt, Client / Livreur, Client Libre */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">DÉPÔT</label>
                <select
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
                  onClick={() => setAfficherModalClient(true)}
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
                  value={nomClientLibre}
                  onChange={(e) => setNomClientLibre(e.target.value)}
                  placeholder={moduleActuel === 'LIVRAISON' ? 'Livreur libre...' : 'Nom libre...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] font-bold text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

          </div>

          {/* ZONE PRINCIPALE : PANIER ET ARTICLES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            
            {/* COLONNE GAUCHE : RECHERCHE ARTICLE AVEC BOUTON DE TRI ALPHABÉTIQUE */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col h-[380px]">
              <div className="flex justify-between items-center mb-2 gap-1">
                <span className="font-extrabold text-slate-700 text-[11px] uppercase">Articles</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setOrdreAlphabetique(ordreAlphabetique === 'ASC' ? 'DESC' : 'ASC')}
                    title={ordreAlphabetique === 'ASC' ? 'Tri alphabétique A-Z (cliquer pour inverser)' : 'Tri alphabétique Z-A (cliquer pour inverser)'}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded text-[10px] transition border border-slate-200 shadow-2xs flex items-center gap-0.5"
                  >
                    <span>{ordreAlphabetique === 'ASC' ? 'A-Z' : 'Z-A'}</span>
                    <span>{ordreAlphabetique === 'ASC' ? '▲' : '▼'}</span>
                  </button>
                  <button
                    onClick={() => setAfficherModalArticle(true)}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-2.5 py-1 rounded text-[10px] shadow-2xs whitespace-nowrap"
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
                    const artDes = art.Designation || art.nom;
                    const artPrix = Number(art.Prix_Vente || art.prix_vente || 0);
                    const artStock = getStockReelArticle(art);
                    const estEpuise = artStock <= 0;

                    return (
                      <div
                        key={artId}
                        onClick={() => !estEpuise && ajouterAuPanier(art)}
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

            {/* COLONNE DROITE : PANIER & FINANCES */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between h-[380px]">
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                  <span className="font-extrabold text-slate-800 uppercase text-[10px]">Panier & Règlements</span>
                  <select
                    value={modePaiementTicket}
                    onChange={(e) => setModePaiementTicket(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-900"
                  >
                    <option value="ESPECES">Espèces</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="CARTE">Carte Bancaire</option>
                    <option value="CREDIT">Crédit</option>
                  </select>
                </div>

                <div className="overflow-y-auto h-[150px] space-y-1 divide-y divide-slate-100">
                  {panier.length === 0 ? (
                    <p className="text-center text-slate-400 py-10 text-[10px]">Le panier est vide.</p>
                  ) : (
                    panier.map((item) => (
                      <div key={item.id} className="pt-1 flex justify-between items-center text-[10px]">
                        <div>
                          <p className="font-bold text-slate-900">{item.designation}</p>
                          <p className="text-[9px] text-slate-600 font-mono font-bold">
                            {Number(item.prix_unitaire).toLocaleString('fr-FR')} F x {item.quantite}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => modifierQuantite(item.id, item.quantite - 1)} className="w-4 h-4 bg-slate-100 rounded font-bold text-slate-900">-</button>
                          <input
                            type="number"
                            value={item.quantite}
                            onChange={(e) => modifierQuantite(item.id, Number(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={handleKeyDownQuantite}
                            className="w-10 bg-slate-50 border border-slate-200 rounded text-center font-bold font-mono text-[10px] text-slate-900"
                          />
                          <button onClick={() => modifierQuantite(item.id, item.quantite + 1)} className="w-4 h-4 bg-slate-100 rounded font-bold text-slate-900">+</button>
                          <span className="font-black text-emerald-700 font-mono ml-1 w-14 text-right">
                            {Number(item.quantite * item.prix_unitaire).toLocaleString('fr-FR')} F
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* PIED DE PAGE EN LIGNES STRUCTURÉES AVEC MISE EN ATTENTE & RAPPEL */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                
                {/* LIGNE 1 : REMISE & TVA */}
                <div className="flex gap-2 items-center justify-between">
                  <div className="flex items-center gap-1">
                    <select
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
                      value={valeurRemise}
                      onChange={(e) => setValeurRemise(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-14 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center text-[10px] font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-700">TVA :</span>
                    <select
                      value={appliquerTva}
                      onChange={(e) => setAppliquerTva(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[9px] font-bold text-slate-900"
                    >
                      <option value="NON">Non</option>
                      <option value="OUI">Oui ({tauxTvaClient}%)</option>
                    </select>
                  </div>
                </div>

                {/* LIGNE 2 : BOUTONS MISE EN ATTENTE ET RAPPEL TICKET */}
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={mettreTicketEnAttente}
                    disabled={panier.length === 0}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2 py-1 rounded text-[9px] transition shadow-2xs flex items-center justify-center gap-1"
                  >
                    ⏳ Mettre en attente
                  </button>
                  <button
                    onClick={() => setAfficherModalAttente(true)}
                    className="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold px-2 py-1 rounded text-[9px] transition shadow-2xs flex items-center justify-center gap-1"
                  >
                    📂 Rappel ticket ({ticketsEnAttente.length})
                  </button>
                </div>

                {/* LIGNE 3 : NAP, CFA & BOUTONS ANNULER / VALIDER */}
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">NAP :</span>
                    <span className="font-black text-emerald-700 font-mono text-xs">
                      {totalFinal.toLocaleString('fr-FR')} CFA
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={annulerVenteEnCours}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2 py-1.5 rounded text-[10px] transition shadow-2xs"
                    >
                      ❌ Annuler
                    </button>

                    <button
                      onClick={validerEtEnregistrerVente}
                      disabled={panier.length === 0}
                      className={`font-bold px-3 py-1.5 rounded text-[10px] transition shadow-2xs ${
                        panier.length > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      Valider
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODE 2 : HISTORIQUE DES TICKETS */
        <div className="space-y-2">
          <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder={moduleActuel === 'LIVRAISON' ? "Rechercher ticket ou livreur..." : "Rechercher ticket ou client..."}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] w-full focus:outline-none font-bold text-slate-900 placeholder:text-slate-400"
            />
            <select
              value={filtreModePaiement}
              onChange={(e) => setFiltreModePaiement(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-slate-900"
            >
              <option value="TOUS">Tous modes</option>
              <option value="ESPECES">Espèces</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="CARTE">Carte</option>
            </select>
          </div>

          {chargement ? (
            <div className="p-4 text-center text-slate-400 text-[10px]">Chargement...</div>
          ) : ventesFiltrees.length === 0 ? (
            <div className="p-4 text-center text-slate-400 bg-white border border-slate-200 rounded-lg text-[10px]">
              Aucun ticket enregistré.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-2xs">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[8px] font-black select-none">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">N° Ticket</th>
                    <th className="p-2">{moduleActuel === 'LIVRAISON' ? 'Livreur' : 'Client'}</th>
                    <th className="p-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {ventesFiltrees.map((v) => {
                    const nomClientVente = v.nom_client || (moduleActuel === 'LIVRAISON' ? 'Livreurs Divers' : 'Clients Divers');
                    return (
                      <tr
                        key={v.id}
                        onClick={() => setTicketSelectionne(v)}
                        className="hover:bg-slate-50/80 cursor-pointer transition"
                      >
                        <td className="p-2 text-slate-600 font-mono text-[9px] font-bold">
                          {v.created_at ? new Date(v.created_at).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="p-2 font-mono font-bold text-orange-600">{v.numero_ticket || '-'}</td>
                        <td className="p-2 font-bold text-slate-900 truncate">{nomClientVente}</td>
                        <td className="p-2 text-right font-black text-emerald-700 font-mono">
                          {Number(v.montant_regle || v.total_montant || 0).toLocaleString('fr-FR')} CFA
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL RAPPEL DES TICKETS EN ATTENTE */}
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
                      <p className="font-bold text-slate-900 text-[10px]">{t.numeroTicket} - {t.client}</p>
                      <p className="text-[9px] text-slate-600 font-mono font-bold">{t.panier.length} article(s) • Heure : {t.date}</p>
                    </div>
                    <button
                      onClick={() => rappelerTicket(t)}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-2.5 py-1 rounded text-[9px] shadow-2xs"
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

      {/* MODAL RECHERCHE CLIENT / LIVREUR */}
      {afficherModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-2.5 bg-slate-900 text-white flex justify-between items-center text-[11px] font-bold">
              <span>{moduleActuel === 'LIVRAISON' ? 'SÉLECTIONNER UN LIVREUR' : 'SÉLECTIONNER UN CLIENT'}</span>
              <button onClick={() => setAfficherModalClient(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto">
              <input
                type="text"
                autoFocus
                value={rechercheClientInput}
                onChange={(e) => setRechercheClientInput(e.target.value)}
                placeholder={moduleActuel === 'LIVRAISON' ? "Rechercher un livreur..." : "Rechercher un client..."}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] focus:outline-none font-bold text-slate-900 placeholder:text-slate-400"
              />
              <div className="space-y-1 pt-1">
                {clientsFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-[10px]">{moduleActuel === 'LIVRAISON' ? 'Aucun livreur trouvé.' : 'Aucun client trouvé.'}</p>
                ) : (
                  clientsFiltres.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => selectionnerClient(c)}
                      className="p-2 bg-slate-50 hover:bg-orange-50 border border-slate-200 rounded flex justify-between items-center cursor-pointer transition"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-[10px]">{c.nom_client}</p>
                        <p className="text-[9px] text-slate-600 font-mono font-bold">{c.telephone || 'Sans téléphone'}</p>
                      </div>
                      <span className="font-bold text-orange-600 text-[10px]">Sélectionner</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECHERCHE ARTICLE */}
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
                value={rechercheArticleInput}
                onChange={(e) => setSearchArticleInput(e.target.value)}
                placeholder="Rechercher un article..."
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] focus:outline-none font-bold text-slate-900 placeholder:text-slate-400"
              />
              <div className="space-y-1 pt-1">
                {articlesFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-[10px]">Aucun article trouvé.</p>
                ) : (
                  articlesFiltres.map((art) => {
                    const artId = art.id_article || art.id;
                    const artDes = art.Designation || art.nom;
                    const artPrix = Number(art.Prix_Vente || art.prix_vente || 0);
                    const artStock = getStockReelArticle(art);
                    const estEpuise = artStock <= 0;

                    return (
                      <div
                        key={artId}
                        onClick={() => !estEpuise && ajouterAuPanier(art)}
                        className={`p-2 border rounded flex justify-between items-center transition ${
                          estEpuise ? 'bg-slate-100 opacity-60 cursor-not-allowed border-slate-200' : 'bg-slate-50 hover:bg-orange-50 border-slate-200 cursor-pointer'
                        }`}
                      >
                        <div>
                          <p className={`font-bold text-[10px] ${estEpuise ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{artDes}</p>
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

      {/* MODAL FICHE TICKET EXISTANT */}
      {ticketSelectionne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-2.5 bg-slate-900 text-white flex justify-between items-center text-[11px]">
              <span className="font-bold font-mono">Ticket #{ticketSelectionne.numero_ticket}</span>
              <button onClick={() => setTicketSelectionne(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
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
                              <td className="p-1.5 font-bold text-slate-900 truncate">{item.designation}</td>
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

            <div className="p-2 bg-white border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => supprimerTicket(ticketSelectionne.id)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded text-[10px] transition"
              >
                🗑️ Supprimer
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() => window.print()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2 py-1 rounded text-[10px] transition"
                >
                  🖨️ Imprimer
                </button>
                <button
                  onClick={() => setTicketSelectionne(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-2 py-1 rounded text-[10px] transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}