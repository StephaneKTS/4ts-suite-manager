'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionCommandesLivraison({ entrepriseId = '4TS-TEST' }) {
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
  const [ventesHistoriques, setVentesHistoriques] = useState([]);
  const [chargement, setChargement] = useState(false);

  const [vueActive, setVueActive] = useState('LISTE');
  const [commandeEnEdition, setCommandeEnEdition] = useState(null);

  const [numeroCommande, setNumeroCommande] = useState('');
  const [dateCommande, setDateCommande] = useState(new Date().toISOString().split('T')[0]);
  const [idPartenaire, setIdPartenaire] = useState('');
  const [depotId, setDepotId] = useState('AUCUN_DEPOT');
  const [montantSaisi, setMontantSaisi] = useState('');
  
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [zoneGrilleSelectionnee, setZoneGrilleSelectionnee] = useState('');
  const [fraisLivraisonSaisi, setFraisLivraisonSaisi] = useState('');
  const [livreurAssigne, setLivreurAssigne] = useState('');
  const [statutCommandeSaisi, setStatutCommandeSaisi] = useState('EN ATTENTE');

  const dateDuJourStr = new Date().toISOString().split('T')[0];

  const [filtrePartenaire, setFiltrePartenaire] = useState('');
  const [filtreLivreur, setFiltreLivreur] = useState('');
  const [filtreDate, setFiltreDate] = useState(dateDuJourStr);
  const [filtreStatut, setFiltreStatut] = useState('');

  const [rapportDateDebut, setRapportDateDebut] = useState(dateDuJourStr);
  const [rapportDateFin, setRapportDateFin] = useState(dateDuJourStr);
  const [rapportLivreur, setRapportLivreur] = useState('');
  const [rapportPartenaire, setRapportPartenaire] = useState('');

  const [colonneTri, setColonneTri] = useState('date');
  const [ordreTri, setOrdreTri] = useState('asc');

  const [menuPartageOuvert, setMenuPartageOuvert] = useState(false);

  const rapportRef = useRef(null);
  const menuRef = useRef(null);

  const [lignesSaisies, setLignesSaisies] = useState([]);
  const [rechercheArticleInput, setRechercheArticleInput] = useState('');

  const moduleActuel = 'LIVRAISON';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuPartageOuvert(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      const [resCmd, resLignesAll, resPart, resArt, resDep, resEmp, resUser, resTarif, resMvt, resApp, resVentes] = await Promise.all([
        supabase.from('commandes_livraison_en_tete').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel).order('created_at', { ascending: false }),
        supabase.from('commandes_livraison_lignes').select('*'),
        supabase.from('fournisseurs').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('articles_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('depots_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('emplacements_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('utilisateurs').select('*').eq('id_entreprise', entrepriseId),
        supabase.from('grille_tarifaire_livraison').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('mouvements_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('ventes_historiques').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel)
      ]);

      const commandesData = resCmd.data || [];
      setCommandes(commandesData);

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

      setPartenaires(resPart.data || []);
      setArticles(resArt.data || []);
      setDepots(resDep.data || []);
      setEmplacements(resEmp.data || []);
      setUtilisateurs(resUser.data || []);
      setGrilleTarifaire(resTarif.data || []);
      setMouvements(resMvt.data || []);
      setApprovisionnements(resApp.data || []);
      setVentesHistoriques(resVentes.data || []);

    } catch (err) {
      console.error('Erreur chargement données livraison :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId]);

  const handleChangementPartenaire = (partenaireId) => {
    setIdPartenaire(partenaireId);
    if (!commandeEnEdition) setLignesSaisies([]);

    if (!partenaireId) {
      setDepotId('AUCUN_DEPOT');
      return;
    }

    const partObj = partenaires.find(p => String(p.id) === String(partenaireId));
    if (partObj) {
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
    }
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

  const handleSelectionZoneEffective = (valeur) => {
    setZoneGrilleSelectionnee(valeur);
    const tarifTrouve = grilleTarifaire.find(
      t => (t.nom_zone || '').trim().toUpperCase() === valeur.trim().toUpperCase()
    );

    if (tarifTrouve) {
      setFraisLivraisonSaisi(String(tarifTrouve.frais));
    }
  };

  const correspondAuDepot = (valeurDepotFlux, depotCibleId) => {
    if (!valeurDepotFlux || !depotCibleId) return false;
    if (String(valeurDepotFlux) === String(depotCibleId)) return true;
    const depotObj = depots.find((d) => String(d.id) === String(depotCibleId));
    if (depotObj && depotObj.nom_depot && String(valeurDepotFlux).trim().toUpperCase() === String(depotObj.nom_depot).trim().toUpperCase()) return true;
    return false;
  };

  const obtenirTousLesFluxArticle = (articleId, depotCibleId = 'TOUS') => {
    let flux = [];
    
    mouvements.filter((m) => String(m.id_article) === String(articleId)).forEach((m) => {
      if (depotCibleId === 'TOUS' || correspondAuDepot(m.id_depot_source, depotCibleId) || correspondAuDepot(m.id_depot_destination, depotCibleId)) {
        flux.push({ 
          date: m.created_at || '', 
          depot_source: m.id_depot_source, 
          depot_destination: m.id_depot_destination,
          emplacement_source: m.id_emplacement_source,
          emplacement_destination: m.id_emplacement_destination,
          quantite: parseInt(m.quantite || 0), 
          type: (m.type_mouvement || '').toUpperCase(),
          remarque: m.motif_remarque || ''
        });
      }
    });

    approvisionnements.forEach((app) => {
      if (depotCibleId === 'TOUS' || correspondAuDepot(app.id_depot_destination, depotCibleId)) {
        let articlesAppro = [];
        if (app.details_articles) {
          if (typeof app.details_articles === 'string') { try { articlesAppro = JSON.parse(app.details_articles); } catch (e) {} }
          else if (Array.isArray(app.details_articles)) { articlesAppro = app.details_articles; }
        }
        articlesAppro.forEach((ligne) => {
          if (String(ligne.id_article || ligne.article_id) === String(articleId)) {
            flux.push({ 
              date: app.created_at || '', 
              depot_source: app.id_depot_destination, 
              depot_destination: null, 
              quantite: parseInt(ligne.quantite || 0), 
              type: 'APPROVISIONNEMENT',
              remarque: app.reference || `APP-${app.id || '01'}`
            });
          }
        });
      }
    });

    flux.sort((a, b) => new Date(a.date) - new Date(b.date));
    return flux;
  };

  const calculerStockPourUnDepot = (articleId, depotId) => {
    let stockDepot = 0;
    const fluxArticle = obtenirTousLesFluxArticle(articleId, depotId);
    
    fluxArticle.forEach((m) => {
      const matchDepotSource = correspondAuDepot(m.depot_source, depotId);
      const matchDepotDest = correspondAuDepot(m.depot_destination, depotId);
      const qte = m.quantite; 
      const typeMvt = m.type;

      if (typeMvt === 'INVENTAIRE' && matchDepotSource) { 
        stockDepot = qte; 
        return; 
      }
      if (typeMvt === 'TRANSFERT') { 
        return; 
      }
      if (typeMvt === 'ENTREE' || typeMvt.includes('ACHAT') || typeMvt.includes('APPROVISIONNEMENT') || typeMvt.includes('FACTURE')) {
        if (matchDepotSource || matchDepotDest) stockDepot += qte;
      } else if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
        if (matchDepotSource) stockDepot -= qte;
      } else {
        if (matchDepotSource || matchDepotDest) stockDepot += qte;
      }
    });

    return Math.max(0, stockDepot);
  };

  const calculerStockPourEmplacement = (articleId, emplacementId) => {
    let stockEmp = 0;
    const fluxArticle = obtenirTousLesFluxArticle(articleId);
    
    fluxArticle.forEach((m) => {
      const qte = m.quantite;
      const typeMvt = m.type;
      const matchSource = String(m.emplacement_source) === String(emplacementId);
      const matchDest = String(m.emplacement_destination) === String(emplacementId);

      if (typeMvt === 'INVENTAIRE' && matchSource) {
        stockEmp = qte;
        return;
      }
      if (typeMvt === 'TRANSFERT') {
        if (matchDest) stockEmp += qte;
        if (matchSource) stockEmp -= qte;
        return;
      }
      if (matchDest) stockEmp += qte;
      if (matchSource) stockEmp -= qte;
    });

    return Math.max(0, stockEmp);
  };

  const getStockReelArticle = (article) => {
    const articleId = String(article.id_article || article.id);

    if (livreurAssigne.trim() !== '') {
      const empTrouve = emplacements.find(e => 
        (e.nom_emplacement || '').trim().toUpperCase() === livreurAssigne.trim().toUpperCase() ||
        (e.responsable_emplacement || '').trim().toUpperCase() === livreurAssigne.trim().toUpperCase()
      );
      if (empTrouve) {
        return calculerStockPourEmplacement(articleId, empTrouve.id);
      }
    }

    if (!depotId || depotId === 'AUCUN_DEPOT') {
      let totalGlobal = 0;
      depots.forEach(dep => {
        totalGlobal += calculerStockPourUnDepot(articleId, dep.id);
      });
      if (depots.length === 0) {
        totalGlobal = parseInt(article.Quantite_Stock || article.quantite_stock || 0);
      }
      return totalGlobal;
    }
    return calculerStockPourUnDepot(articleId, depotId);
  };

  const getStockArticlePourLivreur = (articleId, nomLivreur) => {
    if (!nomLivreur || !nomLivreur.trim()) return 'N/A';
    const empTrouve = emplacements.find(e => 
      (e.nom_emplacement || '').trim().toUpperCase() === nomLivreur.trim().toUpperCase() ||
      (e.responsable_emplacement || '').trim().toUpperCase() === nomLivreur.trim().toUpperCase()
    );
    if (!empTrouve) return 0;
    return calculerStockPourEmplacement(articleId, empTrouve.id);
  };

  const articlesFiltres = articles.filter((a) => {
    if (!idPartenaire) return false;
    
    const stockDisp = getStockReelArticle(a);
    if (stockDisp <= 0) return false;

    const designation = (a.Designation || a.designation || a.nom || '').toUpperCase();
    const correspondRecherche = designation.includes(rechercheArticleInput.toUpperCase());
    return correspondRecherche;
  });

  const enteteValide = idPartenaire && numeroCommande.trim() !== '' && montantSaisi !== '' && adresseLivraison.trim() !== '';

  const ajouterArticleAuPanier = (artObj) => {
    if (!enteteValide) {
      alert('⚠️ Veuillez d\'abord remplir le Partenaire, le N° CMD, le Montant et l\'Adresse de livraison initiale avant d\'ajouter des articles.');
      return;
    }

    const stockDisp = getStockReelArticle(artObj);
    if (stockDisp <= 0) {
      alert(`❌ Cet article est épuisé ou indisponible pour ce livreur.`);
      return;
    }

    const idArt = artObj.id_article || artObj.id;
    const designation = (artObj.Designation || artObj.designation || artObj.nom || '').toUpperCase();
    const prixVente = Number(artObj.P_V || artObj.prix_vente || artObj.prix_unitaire || artObj.prix || 0);

    const ligneExistante = lignesSaisies.find(l => String(l.id_article) === String(idArt));
    if (ligneExistante) {
      if (ligneExistante.quantite + 1 > stockDisp) {
        alert(`❌ Quantité supérieure au stock disponible pour ce livreur (${stockDisp}) !`);
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

  const modifierQuantiteLigne = (index, delta) => {
    const nouvellesLignes = [...lignesSaisies];
    const nouvelleQte = nouvellesLignes[index].quantite + delta;
    if (nouvelleQte <= 0) {
      setLignesSaisies(nouvellesLignes.filter((_, i) => i !== index));
    } else {
      const artObj = articles.find(a => String(a.id_article || a.id) === String(nouvellesLignes[index].id_article));
      const stockDisp = artObj ? getStockReelArticle(artObj) : 0;
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
    setNumeroCommande(cmd.numero_commande ? cmd.numero_commande.replace('CMD-', '') : '');
    setDateCommande(cmd.date_commande || new Date().toISOString().split('T')[0]);
    setIdPartenaire(cmd.id_partenaire || '');
    setMontantSaisi(cmd.montant_commande !== undefined && cmd.montant_commande !== null ? String(cmd.montant_commande) : '0');
    setAdresseLivraison(cmd.adresse_livraison || '');
    setZoneGrilleSelectionnee(cmd.zone_effective_livraison || cmd.adresse_livraison || '');
    setFraisLivraisonSaisi(cmd.frais_livraison !== undefined && cmd.frais_livraison !== null ? String(cmd.frais_livraison) : '');
    setLivreurAssigne(cmd.vendeur_livreur || '');
    setStatutCommandeSaisi(cmd.statut_commande || 'EN ATTENTE');
    
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
    if (!commandeEnEdition) return;
    if (!confirm(`Voulez-vous vraiment supprimer la commande ${commandeEnEdition.numero_commande} ?`)) return;

    try {
      await supabase.from('commandes_livraison_lignes').delete().eq('id_commande', commandeEnEdition.id);
      
      const { error } = await supabase.from('commandes_livraison_en_tete').delete().eq('id', commandeEnEdition.id);
      if (error) throw error;

      alert('Commande supprimée avec succès.');
      setNumeroCommande('');
      setIdPartenaire('');
      setDepotId('AUCUN_DEPOT');
      setLignesSaisies([]);
      setMontantSaisi('');
      setAdresseLivraison('');
      setZoneGrilleSelectionnee('');
      setFraisLivraisonSaisi('');
      setLivreurAssigne('');
      setStatutCommandeSaisi('EN ATTENTE');
      setCommandeEnEdition(null);
      setVueActive('LISTE');
      chargerDonnees();
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
    }
  };

  const sauvegarderCommande = async (e) => {
    if (e) e.preventDefault();
    if (!numeroCommande.trim() || !idPartenaire || montantSaisi === '' || !adresseLivraison.trim()) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires (Partenaire, N° CMD, Montant et Adresse de livraison initiale).');
      return;
    }
    if (lignesSaisies.length === 0) {
      alert('⚠️ Le panier est vide. Veuillez ajouter au moins un article.');
      return;
    }

    try {
      const numeroComplet = `CMD-${numeroCommande.trim().toUpperCase()}`;

      if (!commandeEnEdition) {
        const doublonTrouve = commandes.find(c => 
          c.numero_commande === numeroComplet &&
          c.date_commande === dateCommande &&
          String(c.id_partenaire) === String(idPartenaire)
        );

        if (doublonTrouve) {
          alert(`❌ Cette commande (${numeroComplet}) a déjà été créée pour ce partenaire à la date du ${formaterDateEnFrancais(dateCommande)}. Impossible de la dupliquer.`);
          return;
        }
      }

      let empIdTrouve = null;
      if (livreurAssigne.trim() !== '') {
        const empObj = emplacements.find(e => 
          (e.nom_emplacement || '').trim().toUpperCase() === livreurAssigne.trim().toUpperCase() ||
          (e.responsable_emplacement || '').trim().toUpperCase() === livreurAssigne.trim().toUpperCase()
        );
        if (empObj) empIdTrouve = empObj.id;
      }

      if (statutCommandeSaisi === 'LIVRÉ') {
        if (!empIdTrouve) {
          alert(`❌ Impossible de passer la commande au statut LIVRÉ : Aucun livreur valide n'est assigné à cette commande.`);
          return;
        }

        for (const item of lignesSaisies) {
          const stockEmp = calculerStockPourEmplacement(item.id_article, empIdTrouve);
          if (stockEmp < item.quantite) {
            alert(
              `🚫 ACTION BLOQUÉE (RUPTURE DE STOCK) :\n\nLe livreur [${livreurAssigne}] ne possède pas le stock suffisant pour l'article "${item.designation}".\n(Stock disponible : ${stockEmp} | Quantité commandée : ${item.quantite})\n\n💡 Veuillez d'abord approvisionner le stock chez ce livreur avant de pouvoir passer la commande au statut LIVRÉ.`
            );
            return;
          }
        }
      }

      if (livreurAssigne.trim() !== '' && statutCommandeSaisi !== 'LIVRÉ') {
        if (empIdTrouve) {
          for (const item of lignesSaisies) {
            const stockEmp = calculerStockPourEmplacement(item.id_article, empIdTrouve);
            if (stockEmp < item.quantite) {
              const confirmationRupture = window.confirm(
                `⚠️ ALERTE RUPTURE DE STOCK :\nLe livreur [${livreurAssigne}] n'a que ${stockEmp} en stock pour l'article "${item.designation}" (quantité commandée : ${item.quantite}).\n\nVoulez-vous toujours confirmer l'assignation de la commande ${numeroComplet} ?`
              );
              if (!confirmationRupture) {
                return;
              }
            }
          }
        }
      }

      const partObj = partenaires.find(p => String(p.id) === String(idPartenaire));

      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        numero_commande: numeroComplet,
        date_commande: dateCommande,
        id_partenaire: idPartenaire,
        nom_partenaire: partObj ? (partObj.nom_fournisseur || partObj.nom) : '',
        montant_commande: napGlobal,
        adresse_livraison: adresseLivraison,
        zone_effective_livraison: zoneGrilleSelectionnee || adresseLivraison,
        frais_livraison: parseFloat(fraisLivraisonSaisi) || 0,
        vendeur_livreur: livreurAssigne,
        statut_commande: statutCommandeSaisi,
      };

      let idCmdCourante = commandeEnEdition ? commandeEnEdition.id : null;

      if (commandeEnEdition) {
        const statutPrecedent = commandeEnEdition.statut_commande || 'EN ATTENTE';

        const { error: errUp } = await supabase
          .from('commandes_livraison_en_tete')
          .update(payload)
          .eq('id', commandeEnEdition.id);

        if (errUp) throw errUp;

        await supabase.from('commandes_livraison_lignes').delete().eq('id_commande', commandeEnEdition.id);

        if (statutCommandeSaisi === 'LIVRÉ' && statutPrecedent !== 'LIVRÉ') {
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
              motif_remarque: `LIVRAISON EFFECTIVE ${numeroComplet} (${partObj ? (partObj.nom_fournisseur || partObj.nom) : ''})`
            };
            await supabase.from('mouvements_stock').insert([payloadMouvement]);
          }
        }

      } else {
        const { data: cmdInseree, error: errCmd } = await supabase
          .from('commandes_livraison_en_tete')
          .insert([payload])
          .select()
          .single();

        if (errCmd) throw errCmd;
        if (cmdInseree) idCmdCourante = cmdInseree.id;

        if (statutCommandeSaisi === 'LIVRÉ') {
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
              motif_remarque: `LIVRAISON EFFECTIVE ${numeroComplet} (${partObj ? (partObj.nom_fournisseur || partObj.nom) : ''})`
            };
            await supabase.from('mouvements_stock').insert([payloadMouvement]);
          }
        }
      }

      if (lignesSaisies.length > 0 && idCmdCourante) {
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

      alert(commandeEnEdition ? 'Commande mise à jour avec succès !' : 'Commande enregistrée en attente avec succès !');
      setNumeroCommande('');
      setIdPartenaire('');
      setDepotId('AUCUN_DEPOT');
      setLignesSaisies([]);
      setMontantSaisi('');
      setAdresseLivraison('');
      setZoneGrilleSelectionnee('');
      setFraisLivraisonSaisi('');
      setLivreurAssigne('');
      setStatutCommandeSaisi('EN ATTENTE');
      setCommandeEnEdition(null);
      setVueActive('LISTE');
      chargerDonnees();
    } catch (err) {
      alert('Erreur technique : ' + (err.message || err));
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
      matchLivreur = (cmd.vendeur_livreur || '').toUpperCase().includes(filtreLivreur.toUpperCase());
    }
    if (filtreDate) {
      matchDate = cmd.date_commande === filtreDate;
    }
    if (filtreStatut) {
      matchStatut = (cmd.statut_commande || 'EN ATTENTE') === filtreStatut;
    }

    return matchPartenaire && matchLivreur && matchDate && matchStatut;
  });

  const commandesRapport = commandes.filter((cmd) => {
    if ((cmd.statut_commande || 'EN ATTENTE') !== 'LIVRÉ') return false;

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

  const nomPartenaireRapport = rapportPartenaire ? (partenaires.find(p => String(p.id) === String(rapportPartenaire))?.nom_fournisseur || partenaires.find(p => String(p.id) === String(rapportPartenaire))?.nom || 'Tous les partenaires') : 'Tous les partenaires';
  const nomLivreurRapport = rapportLivreur || 'Tous les livreurs';

  const libellePeriode = rapportDateDebut === rapportDateFin 
    ? formaterDateJJMMAAAA(rapportDateDebut) 
    : `Du ${formaterDateJJMMAAAA(rapportDateDebut)} au ${formaterDateJJMMAAAA(rapportDateFin)}`;

  const titrePrincipalRapport = `RAPPORT DE LIVRAISON - ${nomPartenaireRapport.toUpperCase()} - ${libellePeriode}`;

  // Fonction d'impression / export PDF
  const imprimerRapport = () => {
    setMenuPartageOuvert(false);
    setTimeout(() => {
      if (!rapportRef.current) return;
      const contenuHTML = rapportRef.current.innerHTML;
      const fenetreImpression = window.open('', '_blank', 'width=900,height=700');
      if (fenetreImpression) {
        fenetreImpression.document.write(`
          <html>
            <head>
              <title>${titrePrincipalRapport}</title>
              <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; background: white; color: #111827; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .titre-rapport-principal { font-size: 16px !important; font-weight: 900 !important; color: #ea580c !important; text-transform: uppercase !important; margin-bottom: 4px !important; }
                .sous-titre-livreur { font-size: 12px !important; font-weight: bold !important; color: #1e293b !important; margin-bottom: 15px !important; text-transform: uppercase !important; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; background: white; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11px; text-align: left; }
                th { background-color: #f1f5f9 !important; color: #334155; font-weight: bold; text-transform: uppercase; }
                .bg-emerald-900 { 
                  background-color: #064e3b !important; 
                  color: white !important; 
                  padding: 14px 16px !important; 
                  margin-top: 15px !important; 
                  border-radius: 8px !important; 
                  display: grid !important;
                  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                  gap: 12px !important;
                  align-items: center !important;
                }
                .bg-emerald-900 > div { text-align: left; }
                .bg-emerald-900 > div:nth-child(2) { border-left: 1px solid #047857 !important; border-right: 1px solid #047857 !important; padding-left: 12px; padding-right: 12px; }
                .bg-emerald-900 > div:nth-child(3) { text-align: right; }
                .text-emerald-200 { color: #a7f3d0 !important; font-size: 9px; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 3px; }
                .text-emerald-300 { color: #6ee7b7 !important; font-family: monospace; font-size: 14px; font-weight: 900; }
                .text-orange-300 { color: #fde047 !important; font-family: monospace; font-size: 14px; font-weight: 900; }
                button, .print-hide { display: none !important; }
              </style>
            </head>
            <body>
              <div style="max-width: 800px; margin: 0 auto;">
                ${contenuHTML}
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

  // Nouvelle fonction pour WhatsApp (Image / PDF)
  const envoyerWhatsAppImage = () => {
    setMenuPartageOuvert(false);
    // 1. Ouvre la fenêtre d'impression/enregistrement PDF (qui sert de capture propre et fidèle)
    imprimerRapport();
    
    // 2. Ouvre simultanément WhatsApp Web/App avec un message d'accompagnement invitant à joindre le fichier
    setTimeout(() => {
      const message = encodeURIComponent(`Bonjour, voici le rapport de livraison (${libellePeriode}) - Partenaire : ${nomPartenaireRapport}. (Veuillez joindre le fichier PDF ou l'image enregistrée ci-joint).`);
      window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
    }, 600);
  };

  return (
    <div className="space-y-3 text-[11px] font-sans">
      
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5 shrink-0">
          <span>📦</span> SUIVI LIVRAISON
        </h3>
        
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setVueActive('LISTE')}
            className={`font-bold px-2 py-1.5 rounded-lg transition shadow-2xs text-[11px] border ${
              vueActive === 'LISTE' 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
          >
            📄 Liste
          </button>

          <button
            type="button"
            onClick={() => {
              setCommandeEnEdition(null);
              setNumeroCommande('');
              setIdPartenaire('');
              setMontantSaisi('');
              setAdresseLivraison('');
              setZoneGrilleSelectionnee('');
              setFraisLivraisonSaisi('');
              setLivreurAssigne('');
              setStatutCommandeSaisi('EN ATTENTE');
              setLignesSaisies([]);
              setVueActive('CREATION');
            }}
            className={`font-bold px-2 py-1.5 rounded-lg transition shadow-2xs text-[11px] border ${
              vueActive === 'CREATION' 
                ? 'bg-orange-600 text-white border-orange-600' 
                : 'bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300'
            }`}
          >
            + Créer Commande
          </button>

          <button
            type="button"
            onClick={() => setVueActive('RAPPORT')}
            className={`font-bold px-2 py-1.5 rounded-lg transition shadow-2xs text-[11px] border ${
              vueActive === 'RAPPORT' 
                ? 'bg-blue-900 text-white border-blue-900' 
                : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
            }`}
          >
            📊 Rapport
          </button>
        </div>
      </div>

      {vueActive === 'RAPPORT' && (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
              <span className="font-black text-blue-900 uppercase text-[10px] flex items-center gap-1">
                📊 RAPPORT SYNTHÉTIQUE DES LIVRAISONS (STATUT : LIVRÉ)
              </span>
              {(rapportDateDebut !== dateDuJourStr || rapportDateFin !== dateDuJourStr || rapportLivreur || rapportPartenaire) && (
                <button
                  type="button"
                  onClick={() => {
                    setRapportDateDebut(dateDuJourStr);
                    setRapportDateFin(dateDuJourStr);
                    setRapportLivreur('');
                    setRapportPartenaire('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-bold text-[10px] underline"
                >
                  Réinitialiser le rapport
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
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

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Livreur</label>
                <select
                  value={rapportLivreur}
                  onChange={(e) => setRapportLivreur(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-[11px] uppercase"
                >
                  <option value="">-- Tous les livreurs --</option>
                  {emplacements.map((emp) => {
                    const nomEmp = emp.nom_emplacement || emp.responsable_emplacement || '';
                    if (!nomEmp) return null;
                    return <option key={emp.id} value={nomEmp.toUpperCase()}>{nomEmp.toUpperCase()}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Partenaire</label>
                <select
                  value={rapportPartenaire}
                  onChange={(e) => setRapportPartenaire(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-[11px]"
                >
                  <option value="">-- Tous les partenaires --</option>
                  {partenaires.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom_fournisseur || p.nom}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div ref={rapportRef} className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg overflow-hidden space-y-0 p-3">
            
            <div className="bg-slate-900 text-white pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800">
              <div>
                <h4 className="titre-rapport-principal font-black text-sm uppercase tracking-wider text-orange-400">
                  RAPPORT DE LIVRAISON - {nomPartenaireRapport.toUpperCase()} - {libellePeriode}
                </h4>
                <p className="sous-titre-livreur text-[11px] text-slate-200 font-extrabold mt-1">
                  Livreur : <span className="text-blue-400 uppercase">{nomLivreurRapport}</span>
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-bold">
                  Total livraisons : <strong className="text-emerald-400">{commandesRapport.length}</strong>
                </div>

                <button
                  type="button"
                  onClick={imprimerRapport}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black px-2 py-1 rounded-lg text-[10px] transition flex items-center gap-1 shadow-2xs print-hide"
                >
                  🖨️ Imprimer
                </button>

                {/* BOUTON PARTAGER ET SON MENU MIS À JOUR */}
                <div className="relative print-hide" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuPartageOuvert(!menuPartageOuvert)}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-black px-2.5 py-1 rounded-lg text-[10px] transition flex items-center gap-1 shadow-2xs"
                  >
                    📤 Partager ▾
                  </button>

                  {menuPartageOuvert && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                      <button
                        type="button"
                        onClick={imprimerRapport}
                        className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-800 hover:bg-orange-50 hover:text-orange-600 transition border-b border-slate-100 flex items-center gap-1.5"
                      >
                        <span>📄</span> Exporter en PDF
                      </button>
                      <button
                        type="button"
                        onClick={envoyerWhatsAppImage}
                        className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-600 transition flex items-center gap-1.5"
                      >
                        <span>🟢</span> WhatsApp (Image / Fichier)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {chargement ? (
              <div className="p-8 text-center text-slate-400 font-bold bg-white">Chargement du rapport...</div>
            ) : commandesRapport.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold italic bg-white rounded-b-xl">
                Aucune livraison validée ne correspond à vos critères pour cette période.
              </div>
            ) : (
              <div className="bg-white rounded-xl overflow-hidden shadow-sm mt-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase text-[9px] font-black border-b border-slate-200">
                        <th className="p-2.5 cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('date')}>
                          Date {colonneTri === 'date' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="p-2.5 cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('numero')}>
                          N° Cmd {colonneTri === 'numero' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                        {!rapportPartenaire && (
                          <th className="p-2.5 cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('partenaire')}>
                            Partenaire {colonneTri === 'partenaire' && (ordreTri === 'asc' ? '▲' : '▼')}
                          </th>
                        )}
                        <th className="p-2.5 cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('article')}>
                          Article {colonneTri === 'article' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                        {!rapportLivreur && <th className="p-2.5">Livreur</th>}
                        <th className="p-2.5 text-right cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('montant')}>
                          Montant (F) {colonneTri === 'montant' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="p-2.5 text-right cursor-pointer hover:bg-slate-200 transition select-none" onClick={() => gererTri('frais')}>
                          Frais (F) {colonneTri === 'frais' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[10px]">
                      {commandesRapportTriees.map((cmd) => {
                        const lignesCmd = lignesCommandesMap[cmd.id] || [];
                        return (
                          <tr key={cmd.id} className="hover:bg-slate-50 transition">
                            <td className="p-2.5 font-bold text-slate-600 whitespace-nowrap">{formaterDateJJMMAAAA(cmd.date_commande)}</td>
                            <td className="p-2.5 font-mono font-black text-orange-600 whitespace-nowrap">{cmd.numero_commande}</td>
                            {!rapportPartenaire && <td className="p-2.5 font-extrabold text-slate-900">{cmd.nom_partenaire}</td>}
                            <td className="p-2.5">
                              {lignesCmd.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {lignesCmd.map((l, idx) => (
                                    <span key={idx} className="bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[9px]">
                                      {l.designation} <span className="text-orange-600 font-black">x{l.quantite}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Aucun article</span>
                              )}
                            </td>
                            {!rapportLivreur && <td className="p-2.5 font-bold text-blue-700 uppercase">{cmd.vendeur_livreur || '-'}</td>}
                            <td className="p-2.5 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                              {Number(cmd.montant_commande || 0).toLocaleString('fr-FR')}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-600 whitespace-nowrap">
                              {Number(cmd.frais_livraison || 0).toLocaleString('fr-FR')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-emerald-900 text-white p-3 border-t border-emerald-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-black text-center sm:text-left">
                  <div>
                    <span className="block text-[9px] text-emerald-200 uppercase">Montant total</span>
                    <span className="text-emerald-300 font-mono text-sm">{totalMontantRapport.toLocaleString('fr-FR')} CFA</span>
                  </div>
                  <div className="sm:border-x sm:border-emerald-700 sm:px-2">
                    <span className="block text-[9px] text-emerald-200 uppercase">Frais</span>
                    <span className="text-emerald-300 font-mono text-sm">{totalFraisRapport.toLocaleString('fr-FR')} CFA</span>
                  </div>
                  <div className="sm:text-right">
                    <span className="block text-[9px] text-emerald-200 uppercase">Reste à verser</span>
                    <span className="text-orange-300 font-mono text-sm">{resteAVerserRapport.toLocaleString('fr-FR')} CFA</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {vueActive === 'CREATION' && (
        <div className="bg-slate-900 border-2 border-orange-500 p-3 rounded-2xl space-y-3 shadow-xl">
          
          <div className="bg-white p-3 rounded-xl shadow-inner space-y-3">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Date *</label>
                <input
                  type="date"
                  required
                  value={dateCommande}
                  onChange={(e) => setDateCommande(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs"
                />
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Partenaire *</label>
                <select
                  required
                  value={idPartenaire}
                  onChange={(e) => handleChangementPartenaire(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-xs shadow-xs"
                >
                  <option value="">-- Choisir un partenaire --</option>
                  {partenaires.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom_fournisseur || p.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Adresse de Livraison (Initiale) *</label>
                <input
                  type="text"
                  required
                  list="liste-zones-commandes"
                  value={adresseLivraison}
                  onChange={(e) => handleChangementAdresse(e.target.value)}
                  placeholder="Tapez ou sélectionnez un quartier..."
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">N° CMD *</label>
                <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden shadow-xs">
                  <span className="bg-slate-100 px-2 py-1.5 text-[11px] font-black text-orange-600 border-r border-slate-300 shrink-0">
                    CMD-
                  </span>
                  <input
                    type="text"
                    required
                    value={numeroCommande}
                    onChange={(e) => setNumeroCommande(e.target.value.toUpperCase())}
                    placeholder="01-03"
                    className="w-full p-1.5 font-mono text-[11px] font-extrabold text-slate-900 uppercase focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Montant *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={montantSaisi}
                  onChange={(e) => setMontantSaisi(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs"
                />
              </div>

              {!commandeEnEdition && (
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Statut Commande *</label>
                  <select
                    value={statutCommandeSaisi}
                    onChange={(e) => setStatutCommandeSaisi(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-xs shadow-xs"
                  >
                    <option value="EN ATTENTE">EN ATTENTE</option>
                    <option value="LIVRÉ">LIVRÉ</option>
                    <option value="REPORTÉ">REPORTÉ</option>
                    <option value="ANNULÉ">ANNULÉ</option>
                  </select>
                </div>
              )}
            </div>

            <div className="bg-blue-50/70 border-2 border-blue-200 p-2.5 rounded-xl space-y-2 mt-2">
              <div className="flex items-center justify-between border-b border-blue-200 pb-1.5">
                <span className="font-black text-blue-900 text-[10px] uppercase flex items-center gap-1">
                  🔒 Zone réservée aux superviseurs
                </span>
                <span className="text-[9px] text-blue-600 font-bold italic">
                  (Grille tarifaire &amp; Livreur assigné)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-blue-900 uppercase">Zone Effective (Livraison)</label>
                  <input
                    type="text"
                    list="liste-zones-effective-grille"
                    value={zoneGrilleSelectionnee}
                    onChange={(e) => handleSelectionZoneEffective(e.target.value)}
                    placeholder="Tapez le quartier ou la zone..."
                    className="w-full bg-white border border-blue-300 rounded p-1.5 font-extrabold text-blue-900 text-xs shadow-xs uppercase"
                  />
                  <datalist id="liste-zones-effective-grille">
                    {grilleTarifaire.map((tarif) => (
                      <option key={tarif.id} value={tarif.nom_zone}>
                        {tarif.nom_zone} ({Number(tarif.frais).toLocaleString('fr-FR')} F)
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-blue-900 uppercase">Frais de Livraison</label>
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
                  <label className="block font-black mb-0.5 text-[9px] text-blue-900 uppercase">Livreur Assigné</label>
                  <input
                    type="text"
                    list="liste-utilisateurs-livreurs"
                    value={livreurAssigne}
                    onChange={(e) => setLivreurAssigne(e.target.value)}
                    placeholder="Tapez le nom ou les initiales..."
                    className="w-full bg-white border border-blue-300 rounded p-1.5 font-extrabold text-blue-900 text-xs shadow-xs uppercase"
                  />
                  <datalist id="liste-utilisateurs-livreurs">
                    {emplacements.map((emp) => {
                      const nomEmp = emp.nom_emplacement || emp.responsable_emplacement || '';
                      return <option key={emp.id} value={nomEmp.toUpperCase()} />;
                    })}
                    {utilisateurs.map((u) => {
                      let nomAffichage = u.nom_complet || u.nom_utilisateur || u.nom || u.prenom || u.name || '';
                      if (!nomAffichage && u.email) {
                        nomAffichage = u.email.split('@')[0];
                      }
                      nomAffichage = nomAffichage.toUpperCase();
                      return <option key={u.id} value={nomAffichage} />;
                    })}
                  </datalist>
                </div>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            
            <div className="bg-white p-3 rounded-xl shadow-md flex flex-col space-y-2.5">
              <div className="flex justify-between items-center gap-2">
                <span className="font-black text-slate-900 uppercase text-xs">
                  Article Disponible (Jomo) {livreurAssigne ? `(${livreurAssigne})` : ''}
                </span>
                <div className="relative flex-1 max-w-[160px]">
                  <input
                    type="text"
                    value={rechercheArticleInput}
                    onChange={(e) => setRechercheArticleInput(e.target.value)}
                    placeholder="🔍 RECHERCHER..."
                    disabled={!enteteValide}
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {!enteteValide ? (
                <div className="p-4 text-center text-amber-700 font-bold text-xs bg-amber-50 rounded-xl border border-amber-200">
                  ⚠️ Veuillez d'abord remplir le <strong>Partenaire</strong>, le <strong>N° CMD</strong>, le <strong>Montant</strong> et l'<strong>Adresse de livraison initiale</strong>.
                </div>
              ) : !idPartenaire ? (
                <div className="p-4 text-center text-amber-700 font-bold text-xs bg-amber-50 rounded-xl border border-amber-200">
                  ⚠️ Veuillez sélectionner un partenaire valide.
                </div>
              ) : articlesFiltres.length === 0 ? (
                <div className="p-4 text-center text-slate-500 font-bold text-xs bg-slate-50 rounded-xl border border-slate-200">
                  Aucun article trouvé avec du stock disponible.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[250px] pr-1">
                  {articlesFiltres.map((art) => {
                    const idArt = art.id_article || art.id;
                    const designation = art.Designation || art.designation || art.nom;
                    const prixVente = Number(art.P_V || art.prix_vente || art.prix_unitaire || art.prix || 0);
                    const stockDisp = getStockReelArticle(art);
                    const estEpuise = stockDisp <= 0;

                    return (
                      <div
                        key={idArt}
                        onClick={() => ajouterArticleAuPanier(art)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex justify-between items-center shadow-2xs ${
                          estEpuise 
                            ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' 
                            : 'bg-white border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer'
                        }`}
                      >
                        <div>
                          <h5 className={`font-black uppercase text-xs ${estEpuise ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{designation}</h5>
                          <p className={`text-[10px] font-black font-mono mt-0.5 ${estEpuise ? 'text-slate-400' : 'text-emerald-700'}`}>
                            {prixVente.toLocaleString('fr-FR')} F
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`font-black text-xs ${estEpuise ? 'text-rose-600' : 'text-slate-900'}`}>
                            Stock : {stockDisp}
                          </span>
                          {estEpuise && (
                            <p className="text-[8px] font-bold text-rose-600 uppercase">(Épuisé)</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white p-3 rounded-xl shadow-md flex flex-col justify-between space-y-2.5">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                  <span className="font-black text-slate-900 uppercase text-xs">Panier</span>
                </div>

                {lignesSaisies.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 font-bold text-xs italic">
                    Le panier est vide. Cliquez sur un article.
                  </div>
                ) : (
                  <div className="space-y-1 overflow-y-auto max-h-[160px] pr-1">
                    {lignesSaisies.map((l, index) => (
                      <div key={index} className="flex justify-between items-center bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs">
                        <div className="flex-1 truncate pr-1">
                          <p className="font-black uppercase text-slate-900 truncate text-[10px]">{l.designation}</p>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => modifierQuantiteLigne(index, -1)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black w-4 h-4 rounded flex items-center justify-center text-[10px]"
                          >
                            -
                          </button>
                          <span className="font-black text-orange-600 w-5 text-center text-[10px]">{l.quantite}</span>
                          <button
                            type="button"
                            onClick={() => modifierQuantiteLigne(index, 1)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black w-4 h-4 rounded flex items-center justify-center text-[10px]"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => supprimerLignePanier(index)}
                            className="text-red-600 font-bold ml-0.5 text-[10px] px-0.5 hover:underline"
                            title="Supprimer la ligne"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-200">

                <div className="flex justify-between items-center bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200">
                  <span className="font-black text-slate-900 text-[10px] uppercase">NAP :</span>
                  <span className="font-black text-emerald-700 text-xs font-mono">{napGlobal.toLocaleString('fr-FR')} CFA</span>
                </div>

                {commandeEnEdition && (
                  <div className="bg-slate-100 p-1.5 rounded-lg border border-slate-300 space-y-1">
                    <span className="block font-black text-slate-800 uppercase text-[8px]">
                      Statut (Superviseur) :
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        disabled={statutCommandeSaisi === 'ANNULÉ' || statutCommandeSaisi === 'LIVRÉ'}
                        onClick={() => setStatutCommandeSaisi('EN ATTENTE')}
                        className={`py-1 px-0.5 rounded font-black text-[9px] uppercase transition truncate border ${
                          statutCommandeSaisi === 'EN ATTENTE'
                            ? 'bg-amber-500 text-white border-amber-600 ring-1 ring-amber-300'
                            : 'bg-white text-slate-800 border-slate-300 hover:bg-amber-50'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        Attente
                      </button>

                      <button
                        type="button"
                        disabled={statutCommandeSaisi === 'ANNULÉ' || statutCommandeSaisi === 'LIVRÉ'}
                        onClick={() => setStatutCommandeSaisi('REPORTÉ')}
                        className={`py-1 px-0.5 rounded font-black text-[9px] uppercase transition truncate border ${
                          statutCommandeSaisi === 'REPORTÉ'
                            ? 'bg-blue-600 text-white border-blue-700 ring-1 ring-blue-300'
                            : 'bg-white text-slate-800 border-slate-300 hover:bg-blue-50'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        Reporté
                      </button>

                      <button
                        type="button"
                        disabled={statutCommandeSaisi === 'LIVRÉ'}
                        onClick={() => setStatutCommandeSaisi('ANNULÉ')}
                        className={`py-1 px-0.5 rounded font-black text-[9px] uppercase transition truncate border ${
                          statutCommandeSaisi === 'ANNULÉ'
                            ? 'bg-rose-600 text-white border-rose-700 ring-1 ring-rose-300'
                            : 'bg-white text-slate-800 border-slate-300 hover:bg-rose-50'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        Annulé
                      </button>

                      <button
                        type="button"
                        disabled={statutCommandeSaisi === 'ANNULÉ'}
                        onClick={() => setStatutCommandeSaisi('LIVRÉ')}
                        className={`py-1 px-0.5 rounded font-black text-[9px] uppercase transition truncate border ${
                          statutCommandeSaisi === 'LIVRÉ'
                            ? 'bg-emerald-600 text-white border-emerald-700 ring-1 ring-emerald-300'
                            : 'bg-white text-slate-800 border-slate-300 hover:bg-emerald-50'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        Livré
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLignesSaisies([]);
                      setVueActive('LISTE');
                      setCommandeEnEdition(null);
                    }}
                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-black py-1.5 px-1 rounded-lg text-[10px] transition text-center"
                  >
                    Annuler
                  </button>

                  {commandeEnEdition && (
                    <button
                      type="button"
                      onClick={supprimerCommandeActuelle}
                      className="bg-red-600 hover:bg-red-700 text-white font-black px-2 py-1.5 rounded-lg text-[10px] transition shadow-xs"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={sauvegarderCommande}
                    className="flex-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-1.5 px-2 rounded-lg text-[10px] transition shadow-xs text-center"
                  >
                    {commandeEnEdition ? 'Mettre à jour ➔' : 'Valider ➔'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {vueActive === 'LISTE' && (
        <div className="space-y-3">
          
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
              <span className="font-black text-slate-900 uppercase text-[10px] flex items-center gap-1">
                🔍 Filtrer les commandes
              </span>
              {(filtrePartenaire || filtreLivreur || filtreDate !== dateDuJourStr || filtreStatut) && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltrePartenaire('');
                    setFiltreLivreur('');
                    setFiltreDate(dateDuJourStr);
                    setFiltreStatut('');
                  }}
                  className="text-orange-600 hover:text-orange-700 font-bold text-[10px] underline"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Partenaire</label>
                <select
                  value={filtrePartenaire}
                  onChange={(e) => setFiltrePartenaire(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-[11px]"
                >
                  <option value="">Tous les partenaires</option>
                  {partenaires.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom_fournisseur || p.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Livreur</label>
                <input
                  type="text"
                  value={filtreLivreur}
                  onChange={(e) => setFiltreLivreur(e.target.value)}
                  placeholder="Livreur..."
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-[11px] uppercase"
                />
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Statut</label>
                <select
                  value={filtreStatut}
                  onChange={(e) => setFiltreStatut(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-[11px]"
                >
                  <option value="">Tous les statuts</option>
                  <option value="EN ATTENTE">EN ATTENTE</option>
                  <option value="LIVRÉ">LIVRÉ</option>
                  <option value="REPORTÉ">REPORTÉ</option>
                  <option value="ANNULÉ">ANNULÉ</option>
                </select>
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Date</label>
                <input
                  type="date"
                  value={filtreDate}
                  onChange={(e) => setFiltreDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-[11px]"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-2.5 rounded-xl border border-slate-800 shadow-2xs flex justify-between items-center text-[10px] font-black">
            <span>Commandes trouvées : <strong className="text-orange-400">{commandesFiltrees.length}</strong> / {commandes.length}</span>
          </div>

          {chargement ? (
            <div className="p-4 text-center text-slate-500 font-bold">Chargement...</div>
          ) : commandesFiltrees.length === 0 ? (
            <div className="p-6 text-center text-slate-500 bg-white border border-slate-200 rounded-xl font-bold">
              Aucune commande ne correspond aux filtres sélectionnés.
            </div>
          ) : (
            <div className="space-y-1.5">
              {commandesFiltrees.map((cmd) => {
                const statut = cmd.statut_commande || 'EN ATTENTE';
                let badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                if (statut === 'LIVRÉ') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                if (statut === 'REPORTÉ') badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
                if (statut === 'ANNULÉ') badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';

                const lignesCmd = lignesCommandesMap[cmd.id] || [];

                return (
                  <div
                    key={cmd.id}
                    onClick={() => ouvrirCommandePourModification(cmd)}
                    className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs hover:border-orange-500 cursor-pointer transition flex justify-between items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-orange-600 text-xs">{cmd.numero_commande}</span>
                        <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded border">
                          📅 {formaterDateEnFrancais(cmd.date_commande)}
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${badgeColor}`}>
                          {statut}
                        </span>
                      </div>
                      <p className="font-extrabold text-slate-900 text-[10px]">🏢 Partenaire : {cmd.nom_partenaire}</p>
                      
                      <div className="text-[9.5px] font-bold space-y-0.5">
                        <p className="text-slate-500">📍 Adresse Initiale : {cmd.adresse_livraison}</p>
                        {cmd.zone_effective_livraison && cmd.zone_effective_livraison !== cmd.adresse_livraison && (
                          <p className="text-orange-600 font-extrabold">🚀 Livré à : {cmd.zone_effective_livraison}</p>
                        )}
                      </div>

                      {cmd.vendeur_livreur && (
                        <p className="text-[9.5px] text-blue-600 font-extrabold">🛵 Livreur : {cmd.vendeur_livreur}</p>
                      )}

                      {lignesCmd.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {lignesCmd.map((l, idx) => {
                            const stockLivreur = getStockArticlePourLivreur(l.id_article, cmd.vendeur_livreur);
                            return (
                              <span key={idx} className="bg-orange-50 border border-orange-200 text-orange-900 text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <span>📦 Stock Livreur: {stockLivreur}</span>
                                <span className="text-slate-300">|</span>
                                <span>🛍️ {l.designation} <strong className="text-orange-600">x{l.quantite}</strong></span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="text-right space-y-0.5">
                      <p className="font-black text-emerald-700 text-xs">{Number(cmd.montant_commande || 0).toLocaleString('fr-FR')} F</p>
                      <p className="text-[9px] text-slate-500 font-bold">Frais : {Number(cmd.frais_livraison || 0).toLocaleString('fr-FR')} F</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}