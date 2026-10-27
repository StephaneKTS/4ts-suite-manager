'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionMouvements({ entrepriseId = '4TS-TEST' }) {
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [depots, setDepots] = useState([]);
  const [emplacements, setEmplacements] = useState([]);
  const [articles, setArticles] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  // --- GESTION DES DROITS ET AUTORISATIONS ---
  const [roleNom, setRoleNom] = useState('');
  const [permissions, setPermissions] = useState({
    peut_creer: true,
    peut_modifier: true,
    peut_supprimer: false,
    peut_valider: true
  });

  // --- RÈGLE 1 : PAGINATION / LIMITES D'AFFICHAGE MOBILES ---
  const [limiteDocuments, setLimiteDocuments] = useState(20);

  const [modeAffichage, setModeAffichage] = useState('SAISIE');
  const [typeOperation, setTypeOperation] = useState('TRANSFERT');

  const [enTeteDoc, setEnTeteDoc] = useState({
    numeroDoc: '',
    dateDoc: new Date().toISOString().split('T')[0],
    id_depot_source: '',
    id_emplacement_source: '',
    id_depot_destination: '',
    id_emplacement_destination: '',
    referenceDoc: '',
    motif: '',
    famille_filtre: 'TOUTES',
    operateur: 'THÉODORE STÉPHANE',
  });

  const [modalPartageOuverte, setModalPartageOuverte] = useState(false);
  const [formatPartage, setFormatPartage] = useState('PDF');
  const [modalArticleOuvert, setModalArticleOuvert] = useState(false);
  const [recherchePopup, setRecherchePopup] = useState('');
  const [articleSelectionneTemp, setArticleSelectionneTemp] = useState(null);

  const [quantiteSaisie, setQuantiteSaisie] = useState(1);
  const [lignesPanier, setLignesPanier] = useState([]);
  const [mouvementEnEditionId, setMouvementEnEditionId] = useState(null);

  const [colonneTri, setColonneTri] = useState('date');
  const [ordreTri, setOrdreTri] = useState('desc');

  const inputQuantiteRef = useRef(null);
  const boutonSelectionArticleRef = useRef(null);

  const libellesTypesMouvement = {
    TRANSFERT: 'TRANSFERT ENTRE DÉPÔTS (TR)',
    ENTREE: 'ENTRÉE DE STOCK (ME)',
    SORTIE: 'SORTIE DE STOCK (MS)',
    AVARIES: 'AVARIES & PERTES (AV)',
    INVENTAIRE: 'SAISIE D’INVENTAIRE (INV)',
  };

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  const genererNumeroDocIndependant = (type, mouvementsList) => {
    const prefixes = { ENTREE: 'ME', SORTIE: 'MS', AVARIES: 'AV', TRANSFERT: 'TR', INVENTAIRE: 'INV' };
    const prefix = prefixes[type] || 'TR';
    const numsUniques = [...new Set(mouvementsList.filter((m) => m.type_mouvement === type).map(m => m.motif_remarque))];
    return `${prefix}-${String(numsUniques.length + 1).padStart(2, '0')}`;
  };

  // --- RÈGLE 2 : FONCTION RPC SUPABASE AVEC FALLBACK ROBUSTE ---
  const chargerDonnees = async () => {
    setChargement(true);
    try {
      // 1. Charger et analyser rigoureusement les permissions de l'employé connecté
      const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
      if (utilisateurConnecteStr) {
        const userObj = JSON.parse(utilisateurConnecteStr);
        const nomRoleUser = (userObj.nom_role || userObj.role || '').trim().toUpperCase();
        setRoleNom(nomRoleUser);

        if (nomRoleUser && nomRoleUser !== 'ADMINISTRATEUR' && nomRoleUser !== 'SUPER_ADMIN') {
          const permMouv = userObj.permissions?.['mouvements_stock'] || userObj.permissions?.['mouvements'] || userObj.permissions?.['stock'];
          
          if (permMouv) {
            setPermissions({
              peut_creer: permMouv.creation ?? permMouv.creer ?? true,
              peut_modifier: permMouv.modification ?? permMouv.modifier ?? true,
              peut_supprimer: permMouv.suppression ?? false,
              peut_valider: permMouv.validation ?? permMouv.valider ?? true
            });
          } else {
            const { data: roleData } = await supabase
              .from('roles')
              .select('*')
              .eq('id_entreprise', entrepriseId)
              .eq('module', moduleActuel)
              .eq('nom_role', nomRoleUser)
              .maybeSingle();

            const rolePerm = roleData?.permissions?.['mouvements_stock'] || roleData?.permissions?.['mouvements'] || roleData?.permissions?.['stock'];
            if (rolePerm) {
              setPermissions({
                peut_creer: rolePerm.creation ?? rolePerm.creer ?? true,
                peut_modifier: rolePerm.modification ?? rolePerm.modifier ?? true,
                peut_supprimer: rolePerm.suppression ?? false,
                peut_valider: rolePerm.validation ?? rolePerm.valider ?? true
              });
            }
          }
        }
      }

      const { data: dataDepots } = await supabase
        .from('depots_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const depotsList = dataDepots || [];
      setDepots(depotsList);
      if (depotsList.length > 0 && !enTeteDoc.id_depot_source) {
        setEnTeteDoc((prev) => ({ 
          ...prev, 
          id_depot_source: depotsList[0].id,
          id_depot_destination: depotsList[0].id 
        }));
      }

      const { data: dataEmplacements } = await supabase
        .from('emplacements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setEmplacements(dataEmplacements || []);

      const { data: dataArticles } = await supabase
        .from('articles_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setArticles(dataArticles || []);

      const { data: dataFamilles } = await supabase
        .from('familles_articles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setFamilles(dataFamilles || []);

      let mouvementsList = [];
      const { data: mouvementsRpc, error: rpcError } = await supabase.rpc('recuperer_mouvements_stock', {
        p_entreprise_id: entrepriseId,
        p_module: moduleActuel
      });

      if (rpcError) {
        const { data: dataMouvements, error: errMouv } = await supabase
          .from('mouvements_stock')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel)
          .order('created_at', { ascending: false });

        if (errMouv) throw errMouv;
        mouvementsList = dataMouvements || [];
      } else {
        mouvementsList = mouvementsRpc || [];
      }

      setMouvements(mouvementsList);

      const { data: dataAppro } = await supabase
        .from('approvisionnements')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setApprovisionnements(dataAppro || []);

      if (!mouvementEnEditionId) {
        setEnTeteDoc((prev) => ({ ...prev, numeroDoc: genererNumeroDocIndependant(typeOperation, mouvementsList) }));
      }
    } catch (err) { 
      console.error('Erreur :', err.message); 
    } finally { 
      setChargement(false); 
    }
  };

  useEffect(() => { chargerDonnees(); }, [entrepriseId, typeOperation, moduleActuel]);

  const emplacementsSourceFiltres = emplacements;
  const emplacementsDestinationFiltres = emplacements;

  const correspondAuDepot = (valeurDepotFlux, depotCibleId) => {
    if (!valeurDepotFlux || !depotCibleId) return false;
    if (String(valeurDepotFlux) === String(depotCibleId)) return true;
    const depotObj = depots.find((d) => String(d.id) === String(depotCibleId));
    if (depotObj && depotObj.nom_depot && String(valeurDepotFlux).trim().toUpperCase() === String(depotObj.nom_depot).trim().toUpperCase()) return true;
    return false;
  };

  const obtenirTousLesFluxArticle = (articleId) => {
    let flux = [];
    mouvements.filter((m) => String(m.id_article) === String(articleId)).forEach((m) => {
      flux.push({ 
        date: m.created_at || '', 
        depot_source: m.id_depot_source, 
        depot_destination: m.id_depot_destination, 
        emplacement_source: m.id_emplacement_source,
        emplacement_destination: m.id_emplacement_destination,
        quantite: parseInt(m.quantite || 0), 
        type: (m.type_mouvement || '').toUpperCase() 
      });
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

  const calculerStockPourDepotActuel = (articleId) => {
    const emplacementCibleId = enTeteDoc.id_emplacement_source;
    if (emplacementCibleId) {
      return calculerStockPourEmplacement(articleId, emplacementCibleId);
    }

    const depotCibleId = enTeteDoc.id_depot_source;
    if (!depotCibleId) {
      const artObj = articles.find(a => String(a.id_article || a.id) === String(articleId));
      return parseInt(artObj?.Quantite_Stock || artObj?.quantite_stock || 0);
    }
    let stockDepot = 0;
    const fluxArticle = obtenirTousLesFluxArticle(articleId);
    fluxArticle.forEach((m) => {
      const matchDepotSource = correspondAuDepot(m.depot_source, depotCibleId);
      const matchDepotDest = correspondAuDepot(m.depot_destination, depotCibleId);
      const qte = m.quantite; 
      const typeMvt = m.type;

      if (typeMvt === 'INVENTAIRE' && matchDepotSource) { 
        stockDepot = qte; 
        return; 
      }
      if (typeMvt === 'TRANSFERT') { 
        if (matchDepotSource && matchDepotDest) {
          return;
        }
        if (matchDepotDest) stockDepot += qte; 
        if (matchDepotSource) stockDepot -= qte; 
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

  const articlesPopupFiltres = articles.filter((art) => {
    const designation = art.Designation || art.designation || '';
    return designation.toLowerCase().includes((recherchePopup || '').toLowerCase());
  });

  const verifierEnTeteAvantSaisie = () => {
    if (typeOperation === 'TRANSFERT') {
      if (!enTeteDoc.id_depot_source) { alert('⚠️ Sélectionnez le dépôt source.'); return false; }
      if (!enTeteDoc.id_depot_destination) { alert('⚠️ Sélectionnez le dépôt destination.'); return false; }

      const memeDepot = String(enTeteDoc.id_depot_source) === String(enTeteDoc.id_depot_destination);
      if (memeDepot && enTeteDoc.id_emplacement_source) {
        if (!enTeteDoc.id_emplacement_destination) { alert('⚠️ Veuillez sélectionner l’emplacement / livreur de destination.'); return false; }
      }
    } else {
      if (!enTeteDoc.id_depot_source) { alert('⚠️ Sélectionnez le dépôt.'); return false; }
    }
    return true;
  };

  const selectionnerArticleEtFocusQte = (art) => {
    if (enTrainDeSauvegarder) return;
    if (!verifierEnTeteAvantSaisie()) return;
    setArticleSelectionneTemp(art);
    setModalArticleOuvert(false);
    setRecherchePopup('');
    setTimeout(() => { if (inputQuantiteRef.current) { inputQuantiteRef.current.focus(); inputQuantiteRef.current.select(); } }, 50);
  };

  const modifierLignePanier = (ligne) => {
    if (enTrainDeSauvegarder) return;
    const artObj = articles.find(a => String(a.id_article || a.id) === String(ligne.id_article)) || { id_article: ligne.id_article, Designation: ligne.designation };
    setArticleSelectionneTemp(artObj);
    setQuantiteSaisie(ligne.quantite);
    setLignesPanier(lignesPanier.filter((l) => String(l.id_article) !== String(ligne.id_article)));
    setTimeout(() => { if (inputQuantiteRef.current) { inputQuantiteRef.current.focus(); inputQuantiteRef.current.select(); } }, 50);
  };

  const ajouterArticleAuPanier = () => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.peut_creer && !mouvementEnEditionId) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de créer des mouvements.');
      return;
    }
    if (!verifierEnTeteAvantSaisie() || !articleSelectionneTemp) { if (!articleSelectionneTemp) alert('Sélectionnez un article.'); return; }
    const qte = parseInt(quantiteSaisie);
    if (isNaN(qte) || (typeOperation === 'INVENTAIRE' ? qte < 0 : qte <= 0)) { alert('Quantité invalide.'); return; }

    const artId = articleSelectionneTemp.id_article || articleSelectionneTemp.id;
    const stockActuelDepot = calculerStockPourDepotActuel(artId);
    if ((typeOperation === 'SORTIE' || typeOperation === 'TRANSFERT' || typeOperation === 'AVARIES') && qte > stockActuelDepot) {
      alert(`⛔ Stock insuffisant (${stockActuelDepot} disp.).`);
      return;
    }

    let stockReelPrevisionnel = stockActuelDepot;
    if (typeOperation === 'ENTREE') stockReelPrevisionnel = stockActuelDepot + qte;
    else if (typeOperation === 'SORTIE' || typeOperation === 'AVARIES' || typeOperation === 'TRANSFERT') stockReelPrevisionnel = Math.max(0, stockActuelDepot - qte);
    else if (typeOperation === 'INVENTAIRE') stockReelPrevisionnel = qte;

    const dejaPresentIndex = lignesPanier.findIndex((l) => String(l.id_article) === String(artId));
    if (dejaPresentIndex !== -1) {
      const nouveauPanier = [...lignesPanier];
      const nouvelleQte = typeOperation === 'INVENTAIRE' ? qte : nouveauPanier[dejaPresentIndex].quantite + qte;
      nouveauPanier[dejaPresentIndex].quantite = nouvelleQte;
      nouveauPanier[dejaPresentIndex].stockReel = stockReelPrevisionnel;
      setLignesPanier(nouveauPanier);
    } else {
      setLignesPanier([...lignesPanier, { id_article: artId, designation: articleSelectionneTemp.Designation || articleSelectionneTemp.designation, quantite: qte, stockActuel: stockActuelDepot, stockReel: stockReelPrevisionnel }]);
    }
    setArticleSelectionneTemp(null);
    setQuantiteSaisie(1);
    setTimeout(() => { if (boutonSelectionArticleRef.current) boutonSelectionArticleRef.current.focus(); }, 50);
  };

  const gererKeyDownQuantite = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      ajouterArticleAuPanier();
    }
  };

  const annulerOperation = () => {
    if (enTrainDeSauvegarder) return;
    if (lignesPanier.length > 0 || enTeteDoc.referenceDoc) {
      if (!confirm('Voulez-vous vraiment annuler cette opération en cours ?')) return;
    }
    setLignesPanier([]);
    setMouvementEnEditionId(null);
    setArticleSelectionneTemp(null);
    setQuantiteSaisie(1);
    setEnTeteDoc(prev => ({
      ...prev,
      referenceDoc: '',
      numeroDoc: genererNumeroDocIndependant(typeOperation, mouvements)
    }));
  };

  const validerDocumentMouvement = async () => {
    if (enTrainDeSauvegarder) return;

    if (mouvementEnEditionId && !permissions.peut_modifier) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de modifier les mouvements.');
      return;
    }
    if (!mouvementEnEditionId && !permissions.peut_creer) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de créer des mouvements.');
      return;
    }
    if (!permissions.peut_valider) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de valider des documents.');
      return;
    }

    if (!verifierEnTeteAvantSaisie() || lignesPanier.length === 0) { if (lignesPanier.length === 0) alert('Ajoutez des articles.'); return; }

    setEnTrainDeSauvegarder(true);
    try {
      if (mouvementEnEditionId) {
        const { error: errDel } = await supabase.from('mouvements_stock').delete().eq('motif_remarque', enTeteDoc.numeroDoc);
        if (errDel) { alert('Erreur suppression : ' + errDel.message); setEnTrainDeSauvegarder(false); return; }
      }
      
      for (const ligne of lignesPanier) {
        const payload = {
          id_entreprise: entrepriseId,
          module: moduleActuel,
          type_mouvement: typeOperation,
          id_depot_source: enTeteDoc.id_depot_source || null,
          id_emplacement_source: enTeteDoc.id_emplacement_source || null,
          id_depot_destination: typeOperation === 'TRANSFERT' ? (enTeteDoc.id_depot_destination || null) : null,
          id_emplacement_destination: typeOperation === 'TRANSFERT' ? (enTeteDoc.id_emplacement_destination || null) : null,
          id_article: parseInt(ligne.id_article),
          quantite: ligne.quantite,
          motif_remarque: enTeteDoc.numeroDoc,
          operateur: enTeteDoc.operateur,
        };

        const { error } = await supabase.from('mouvements_stock').insert([payload]);
        if (error) {
          console.error("Erreur Supabase insertion mouvement:", error);
          alert(`Erreur Supabase : ${error.message}`);
          setEnTrainDeSauvegarder(false);
          return;
        }
      }

      alert(`Document validé avec succès dans le module ${moduleActuel} !`);
      setLignesPanier([]);
      setMouvementEnEditionId(null);
      setEnTeteDoc((prev) => ({ ...prev, referenceDoc: '' }));
      await chargerDonnees();
      setModeAffichage('LISTE_DOCS');
    } catch (err) { 
      alert('Erreur : ' + err.message); 
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirDocumentDepuisListe = (numeroDocUnique) => {
    if (enTrainDeSauvegarder) return;
    if (mouvementEnEditionId && !permissions.peut_modifier) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de modifier les mouvements.');
      return;
    }

    const lignesAssociees = mouvements.filter(m => m.motif_remarque === numeroDocUnique);
    if (lignesAssociees.length === 0) return;
    const premier = lignesAssociees[0];
    setTypeOperation(premier.type_mouvement || 'TRANSFERT');
    setEnTeteDoc({ 
      ...enTeteDoc, 
      numeroDoc: numeroDocUnique, 
      dateDoc: premier.created_at ? premier.created_at.split('T')[0] : new Date().toISOString().split('T')[0], 
      id_depot_source: premier.id_depot_source || '', 
      id_emplacement_source: premier.id_emplacement_source || '',
      id_depot_destination: premier.id_depot_destination || '', 
      id_emplacement_destination: premier.id_emplacement_destination || '',
      operateur: premier.operateur || 'THÉODORE STÉPHANE' 
    });
    setLignesPanier(lignesAssociees.map(mvt => {
      const art = articles.find((a) => String(a.id_article || a.id) === String(mvt.id_article));
      return { id_article: mvt.id_article, designation: art ? (art.Designation || art.designation) : `Article #${mvt.id_article}`, quantite: mvt.quantite, stockActuel: calculerStockPourDepotActuel(mvt.id_article), stockReel: mvt.quantite };
    }));
    setMouvementEnEditionId(premier.id);
    setModeAffichage('SAISIE');
  };

  const supprimerDocumentComplet = async (numeroDocUnique) => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.peut_supprimer) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de supprimer des mouvements.');
      return;
    }
    if (!confirm(`Supprimer le document ${numeroDocUnique} ?`)) return;

    setEnTrainDeSauvegarder(true);
    try {
      const { error } = await supabase.from('mouvements_stock').delete().eq('motif_remarque', numeroDocUnique);
      if (error) throw error;
      alert('Supprimé.');
      await chargerDonnees();
    } catch (err) { 
      alert('Erreur : ' + err.message); 
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const formaterNumeroDocAffichage = (motifBrut) => {
    if (!motifBrut) return 'SANS-REF';
    const matchCmd = motifBrut.match(/(CMD-\d+)/i);
    if (matchCmd) return matchCmd[1];
    const matchType = motifBrut.match(/([A-Z]+-\d+)/i);
    if (matchType) return matchType[1];
    return motifBrut;
  };

  const documentsGroupes = Object.values(mouvements.reduce((acc, mvt) => {
    const numDocBrut = mvt.motif_remarque || 'SANS-REF';
    const numDocCle = formaterNumeroDocAffichage(numDocBrut);
    
    if (!acc[numDocCle]) { 
      acc[numDocCle] = { numeroDoc: numDocCle, numeroDocBrut: numDocBrut, date: mvt.created_at || '', type: mvt.type_mouvement || '', operateur: mvt.operateur || 'THÉODORE STÉPHANE', lignesCount: 0 }; 
    }
    acc[numDocCle].lignesCount += 1;
    return acc;
  }, {}));

  const gererTri = (colonne) => {
    if (enTrainDeSauvegarder) return;
    if (colonneTri === colonne) setOrdreTri(ordreTri === 'asc' ? 'desc' : 'asc');
    else { setColonneTri(colonne); setOrdreTri('asc'); }
  };

  const documentsTries = [...documentsGroupes].sort((a, b) => {
    let valA = a[colonneTri]; let valB = b[colonneTri];
    if (colonneTri === 'date') { valA = new Date(valA); valB = new Date(valB); }
    else { valA = String(valA).toLowerCase(); valB = String(valB).toLowerCase(); }
    if (valA < valB) return ordreTri === 'asc' ? -1 : 1;
    if (valA > valB) return ordreTri === 'asc' ? 1 : -1;
    return 0;
  });

  const documentsAffiches = documentsTries.slice(0, limiteDocuments);
  const enTeteVerrouille = lignesPanier.length > 0 || enTrainDeSauvegarder;

  return (
    <div className="space-y-2 font-sans text-[10px]">
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="font-extrabold uppercase text-slate-900">MOUVEMENTS DE STOCK</span>
          {roleNom && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
              Rôle : {roleNom}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
        <button 
          type="button" 
          disabled={enTrainDeSauvegarder} 
          onClick={() => { 
            if (enTrainDeSauvegarder) return;
            setModeAffichage('SAISIE'); 
            setMouvementEnEditionId(null); 
            setLignesPanier([]); 
            setEnTeteDoc(prev => ({ ...prev, numeroDoc: genererNumeroDocIndependant(typeOperation, mouvements) })); 
          }} 
          className={`py-1 px-2 rounded-lg font-bold transition text-center text-[10px] ${modeAffichage === 'SAISIE' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-white text-slate-800'}`}
        >
          ✍️ {mouvementEnEditionId ? 'Modifier' : 'Saisie mouvement'}
        </button>
        <button 
          type="button" 
          disabled={enTrainDeSauvegarder} 
          onClick={() => { if (!enTrainDeSauvegarder) setModeAffichage('LISTE_DOCS'); }} 
          className={`py-1 px-2 rounded-lg font-bold transition text-center text-[10px] ${modeAffichage === 'LISTE_DOCS' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-white text-slate-800'}`}
        >
          📋 Liste mouvement ({documentsGroupes.length})
        </button>
      </div>

      {modeAffichage === 'SAISIE' && (
        <>
          <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center justify-between gap-1 shadow-2xs">
            <span className="font-extrabold text-[9px] text-slate-700 uppercase">Mouvement</span>
            <select 
              disabled={enTeteVerrouille} 
              value={typeOperation} 
              onChange={(e) => { 
                const nt = e.target.value; 
                setTypeOperation(nt); 
                if (!mouvementEnEditionId) setEnTeteDoc(prev => ({ ...prev, numeroDoc: genererNumeroDocIndependant(nt, mouvements) })); 
              }} 
              className="bg-slate-50 border rounded-lg px-2 py-0.5 font-extrabold text-orange-600 text-[10px]"
            >
              <option value="TRANSFERT">🔀 Transfert (TR)</option>
              <option value="ENTREE">📥 Entrée (ME)</option>
              <option value="SORTIE">📤 Sortie (MS)</option>
              <option value="AVARIES">⚠️ Avaries (AV)</option>
              <option value="INVENTAIRE">📊 Inventaire (INV)</option>
            </select>
          </div>

          <div className={`bg-white border-2 border-orange-500/50 p-2 rounded-xl shadow-2xs space-y-1.5 ${enTeteVerrouille ? 'bg-slate-50/80' : ''}`}>
            <div className="flex justify-between items-center pb-1 border-b">
              <span className="font-extrabold text-[10px] text-orange-600 uppercase">{libellesTypesMouvement[typeOperation]} {enTeteVerrouille && '🔒'}</span>
              <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-mono font-bold text-[9px]">{enTeteDoc.numeroDoc}</span>
            </div>
            
            <div className="space-y-1.5 text-[9.5px]">
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block font-bold text-[7.5px] text-slate-600 mb-0.5">Date *</label>
                  <input type="date" disabled={enTeteVerrouille} value={enTeteDoc.dateDoc} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, dateDoc: e.target.value })} className="w-full bg-slate-50 border rounded p-1 font-bold text-slate-900" />
                </div>
                <div>
                  <label className="block font-bold text-[7.5px] text-slate-600 mb-0.5">Réf. (Optionnel)</label>
                  <input type="text" disabled={enTeteVerrouille} value={enTeteDoc.referenceDoc} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, referenceDoc: e.target.value })} placeholder="EX: BL" className="w-full bg-slate-50 border rounded p-1 font-extrabold uppercase text-slate-900" />
                </div>
                <div>
                  <label className="block font-bold text-[7.5px] text-slate-600 mb-0.5">Opérateur</label>
                  <input type="text" disabled value={enTeteDoc.operateur} className="w-full bg-slate-100 text-slate-800 border rounded p-1 font-bold truncate" />
                </div>
              </div>

              {typeOperation === 'TRANSFERT' ? (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className="space-y-1 bg-orange-50/40 p-1.5 rounded-lg border border-orange-200">
                    <label className="block font-black text-[8px] text-orange-800 uppercase">🏢 Origine (Source)</label>
                    <select disabled={enTeteVerrouille} required value={enTeteDoc.id_depot_source} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, id_depot_source: e.target.value })} className="w-full bg-white border rounded p-1 font-extrabold text-orange-700 text-[9px]">
                      <option value="">-- Dépôt --</option>{depots.map((dep) => (<option key={dep.id} value={dep.id}>{dep.nom_depot}</option>))}
                    </select>
                    <select disabled={enTeteVerrouille} value={enTeteDoc.id_emplacement_source} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, id_emplacement_source: e.target.value })} className="w-full bg-white border rounded p-1 font-bold text-slate-800 text-[9px]">
                      <option value="">-- Emplacement --</option>
                      {emplacementsSourceFiltres.map((emp) => (<option key={emp.id} value={emp.id}>{emp.nom_emplacement || emp.code_emplacement}{emp.responsable_emplacement ? ` (${emp.responsable_emplacement})` : ''}</option>))}
                    </select>
                  </div>

                  <div className="space-y-1 bg-blue-50/40 p-1.5 rounded-lg border border-blue-200">
                    <label className="block font-black text-[8px] text-blue-800 uppercase">🎯 Destination</label>
                    <select disabled={enTeteVerrouille} required value={enTeteDoc.id_depot_destination} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, id_depot_destination: e.target.value })} className="w-full bg-white border rounded p-1 font-extrabold text-blue-700 text-[9px]">
                      <option value="">-- Dépôt --</option>{depots.map((dep) => (<option key={dep.id} value={dep.id}>{dep.nom_depot}</option>))}
                    </select>
                    <select disabled={enTeteVerrouille} value={enTeteDoc.id_emplacement_destination} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, id_emplacement_destination: e.target.value })} className="w-full bg-white border rounded p-1 font-bold text-slate-800 text-[9px]">
                      <option value="">-- Emplacement --</option>
                      {emplacementsDestinationFiltres.map((emp) => (<option key={emp.id} value={emp.id}>{emp.nom_emplacement || emp.code_emplacement}{emp.responsable_emplacement ? ` (${emp.responsable_emplacement})` : ''}</option>))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className="space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <label className="block font-black text-[8px] text-slate-700 uppercase">🏢 Dépôt</label>
                    <select disabled={enTeteVerrouille} required value={enTeteDoc.id_depot_source} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, id_depot_source: e.target.value })} className="w-full bg-white border rounded p-1 font-extrabold text-orange-600 text-[9px]">
                      <option value="">-- Dépôt --</option>{depots.map((dep) => (<option key={dep.id} value={dep.id}>{dep.nom_depot}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <label className="block font-black text-[8px] text-slate-700 uppercase">📍 Emplacement</label>
                    <select disabled={enTeteVerrouille} value={enTeteDoc.id_emplacement_source} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, id_emplacement_source: e.target.value })} className="w-full bg-white border rounded p-1 font-bold text-slate-800 text-[9px]">
                      <option value="">-- Aucun --</option>
                      {emplacementsSourceFiltres.map((emp) => (<option key={emp.id} value={emp.id}>{emp.nom_emplacement || emp.code_emplacement}{emp.responsable_emplacement ? ` (${emp.responsable_emplacement})` : ''}</option>))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border p-2 rounded-xl shadow-2xs space-y-1.5">
            <span className="font-extrabold text-slate-800 uppercase text-[8.5px]">Articles [{moduleActuel}]</span>
            
            <div className="grid grid-cols-12 gap-1 items-end bg-slate-50 p-1.5 rounded-lg border text-[9.5px]">
              <div className="col-span-8">
                <label className="block font-bold text-[7.5px] text-slate-600 mb-0.5">Article *</label>
                <button ref={boutonSelectionArticleRef} type="button" disabled={enTrainDeSauvegarder} onClick={() => { if (enTrainDeSauvegarder) return; if (!verifierEnTeteAvantSaisie()) return; setModalArticleOuvert(true); }} className="w-full bg-white border rounded p-1 text-left font-extrabold text-slate-900 flex justify-between items-center truncate">
                  <span className="truncate">{articleSelectionneTemp ? `${articleSelectionneTemp.Designation || articleSelectionneTemp.designation}` : '-- Sélectionner --'}</span>
                  <span className="text-orange-600 shrink-0 ml-1">🔍</span>
                </button>
              </div>
              
              <div className="col-span-3">
                <label className="block font-bold text-[7.5px] text-slate-600 mb-0.5">Qte *</label>
                <input 
                  ref={inputQuantiteRef} 
                  type="number" 
                  min="1" 
                  value={quantiteSaisie} 
                  disabled={enTrainDeSauvegarder}
                  onFocus={(e) => e.target.select()} 
                  onChange={(e) => setQuantiteSaisie(e.target.value)} 
                  onKeyDown={gererKeyDownQuantite}
                  className="w-full bg-white border rounded p-1 font-black text-emerald-600 text-center" 
                />
              </div>

              <div className="col-span-1">
                <button type="button" disabled={enTrainDeSauvegarder || (!permissions.peut_creer && !mouvementEnEditionId)} onClick={ajouterArticleAuPanier} className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-black p-1 rounded text-center text-[9px] shadow-2xs" title="Valider l'article (ou Entrée)">
                  OK
                </button>
              </div>
            </div>

            {modalArticleOuvert && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-3 space-y-2 max-h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center border-b pb-1.5"><span className="font-extrabold text-[10px] uppercase text-slate-800">SÉLECTIONNER UN ARTICLE [{moduleActuel}]</span><button type="button" disabled={enTrainDeSauvegarder} onClick={() => setModalArticleOuvert(false)} className="text-slate-500 font-bold">✕</button></div>
                  <input type="text" disabled={enTrainDeSauvegarder} value={recherchePopup} onChange={(e) => setRecherchePopup(e.target.value.toUpperCase())} placeholder="RECHERCHER..." className="w-full bg-slate-50 border rounded-xl px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-900 placeholder:text-slate-400" autoFocus />
                  <div className="overflow-y-auto space-y-1 flex-1 max-h-60">
                    {articlesPopupFiltres.length === 0 ? (
                      <p className="text-center text-slate-400 py-4 text-[10px] font-bold">Aucun article trouvé.</p>
                    ) : (
                      articlesPopupFiltres.map((art) => {
                        const artId = art.id_article || art.id;
                        return (
                          <div key={artId} onClick={() => !enTrainDeSauvegarder && selectionnerArticleEtFocusQte(art)} className="p-2 rounded-xl border bg-slate-50 hover:bg-orange-50 cursor-pointer flex justify-between items-center">
                            <span className="font-extrabold uppercase text-[10px] text-slate-900">{art.Designation || art.designation}</span>
                            <span className="text-[9.5px] font-bold text-emerald-600">Stock: {calculerStockPourDepotActuel(artId)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {lignesPanier.length === 0 ? (<p className="text-center text-slate-400 py-1.5 italic text-[9.5px]">Aucun article ajouté.</p>) : (
              <div className="overflow-x-auto border rounded-lg bg-white">
                <table className="w-full text-left text-[9.5px] table-fixed">
                  <thead className="bg-slate-50 text-slate-700 uppercase text-[7.5px] font-extrabold border-b">
                    <tr><th className="p-1 w-[60%]">ARTICLE</th><th className="p-1 w-[25%] text-center">QTE</th><th className="p-1 w-[15%] text-center">⚙️</th></tr>
                  </thead>
                  <tbody className="divide-y text-[9px]">
                    {lignesPanier.map((ligne, index) => (
                      <tr key={index} onClick={() => !enTrainDeSauvegarder && modifierLignePanier(ligne)} className="hover:bg-orange-50/70 cursor-pointer transition">
                        <td className="p-1.5 font-extrabold uppercase text-slate-900 truncate">{ligne.designation}</td>
                        <td className="p-1.5 text-center font-black text-emerald-600">{ligne.quantite}</td>
                        <td className="p-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setLignesPanier(lignesPanier.filter((_, i) => i !== index))} className="p-0.5 bg-slate-100 hover:bg-red-100 disabled:opacity-50 rounded text-[9px]" title="Supprimer">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-1.5 flex items-center justify-between gap-1 flex-wrap">
              {mouvementEnEditionId ? (
                permissions.peut_supprimer ? (
                  <button type="button" disabled={enTrainDeSauvegarder} onClick={() => supprimerDocumentComplet(enTeteDoc.numeroDoc)} className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold px-2 py-1 rounded text-[9px]">🗑️ Supprimer</button>
                ) : <div />
              ) : <div />}
              
              <div className="flex items-center gap-1 flex-wrap">
                <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerOperation} className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-2 py-1 rounded text-[9px]">❌ Annuler</button>
                <button type="button" disabled={enTrainDeSauvegarder} onClick={() => window.print()} className="bg-slate-800 text-white font-bold px-2 py-1 rounded text-[9px]">🖨️ Imprimer</button>
                <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setModalPartageOuverte(true)} className="bg-blue-600 text-white font-bold px-2 py-1 rounded text-[9px]">📤 Partager</button>
                {((mouvementEnEditionId && permissions.peut_modifier) || (!mouvementEnEditionId && permissions.peut_creer)) && permissions.peut_valider && (
                  <button type="button" onClick={validerDocumentMouvement} disabled={lignesPanier.length === 0 || enTrainDeSauvegarder} className={`font-bold px-2.5 py-1 rounded text-[9px] ${lignesPanier.length > 0 && !enTrainDeSauvegarder ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {enTrainDeSauvegarder ? 'Validation...' : '✅ Valider'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {modeAffichage === 'LISTE_DOCS' && (
        <div className="bg-white border rounded-xl overflow-hidden shadow-2xs space-y-2">
          <div className="p-2 bg-slate-50 border-b flex justify-between items-center text-[9.5px]">
            <span className="font-extrabold uppercase text-slate-800">Documents Enregistrés [{moduleActuel}] ({documentsAffiches.length} / {documentsTries.length})</span>
            <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold">{documentsTries.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[9.5px]">
              <thead className="bg-slate-50 text-slate-700 uppercase text-[7.5px] font-extrabold border-b">
                <tr>
                  <th onClick={() => !enTrainDeSauvegarder && gererTri('date')} className="p-1.5 cursor-pointer">Date</th>
                  <th onClick={() => !enTrainDeSauvegarder && gererTri('type')} className="p-1.5 cursor-pointer">Type</th>
                  <th onClick={() => !enTrainDeSauvegarder && gererTri('numeroDoc')} className="p-1.5 cursor-pointer">N° Doc</th>
                  <th onClick={() => !enTrainDeSauvegarder && gererTri('operateur')} className="p-1.5 cursor-pointer">Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y text-[9.5px]">
                {documentsAffiches.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-slate-400 font-bold">Aucun document pour le module {moduleActuel}.</td>
                  </tr>
                ) : (
                  documentsAffiches.map((doc, idx) => (
                    <tr key={idx} onClick={() => !enTrainDeSauvegarder && permissions.peut_modifier && ouvrirDocumentDepuisListe(doc.numeroDocBrut)} className="hover:bg-orange-50/70 cursor-pointer">
                      <td className="p-1.5 font-mono font-bold text-slate-800 text-[9px] whitespace-nowrap">{new Date(doc.date).toLocaleDateString('fr-FR')}</td>
                      <td className="p-1.5 font-bold whitespace-nowrap"><span className="px-1 py-0.5 bg-slate-100 text-slate-800 rounded text-[8.5px]">{doc.type}</span></td>
                      <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{doc.numeroDoc}</td>
                      <td className="p-1.5 font-extrabold uppercase text-slate-900 truncate max-w-[110px]" title={doc.operateur}>{doc.operateur}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {limiteDocuments < documentsTries.length && (
            <div className="text-center pt-2 pb-3 px-2">
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => setLimiteDocuments(prev => prev + 20)}
                className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-[10px] transition shadow-xs border border-slate-300 w-full"
              >
                📥 Charger 20 documents de plus ({documentsTries.length - limiteDocuments} restants)
              </button>
            </div>
          )}
        </div>
      )}

      {modalPartageOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-3 space-y-2">
            <div className="flex justify-between items-center border-b pb-1.5"><span className="font-extrabold text-[10px] uppercase text-slate-800">Partager</span><button type="button" disabled={enTrainDeSauvegarder} onClick={() => setModalPartageOuverte(false)} className="text-slate-500 font-bold">✕</button></div>
            <div className="space-y-1 text-[9.5px]"><label className="block font-bold text-slate-700">Format :</label><div className="grid grid-cols-3 gap-1">{['PDF', 'PNG', 'JPG'].map(fmt => (<button key={fmt} type="button" disabled={enTrainDeSauvegarder} onClick={() => setFormatPartage(fmt)} className={`py-1 rounded font-bold border ${formatPartage === fmt ? 'bg-orange-600 text-white' : 'bg-slate-50 text-slate-800'}`}>{fmt}</button>))}</div></div>
            <div className="space-y-1 pt-1 text-[9.5px]"><label className="block font-bold text-slate-700">Canal :</label><div className="space-y-1"><button type="button" disabled={enTrainDeSauvegarder} onClick={() => { alert('Partagé !'); setModalPartageOuverte(false); }} className="w-full bg-emerald-50 text-emerald-900 font-bold p-1.5 rounded-xl text-left">💚 WhatsApp</button><button type="button" disabled={enTrainDeSauvegarder} onClick={() => { alert('Partagé !'); setModalPartageOuverte(false); }} className="w-full bg-blue-50 text-blue-900 font-bold p-1.5 rounded-xl text-left">📧 Mail</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}