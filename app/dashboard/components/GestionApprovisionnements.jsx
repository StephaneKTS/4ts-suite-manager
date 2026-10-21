'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function GestionApprovisionnements({ entrepriseId = '4TS-TEST' }) {
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [bonsCommandes, setBonsCommandes] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [depots, setDepots] = useState([]);
  const [articles, setArticles] = useState([]);
  const [chargement, setChargement] = useState(false);

  const [ongletActif, setOngletActif] = useState('FACTURE');
  const [vueActive, setVueActive] = useState('liste');
  const [approEnEditionId, setApproEnEditionId] = useState(null);
  const [docEnEditionObjet, setDocEnEditionObjet] = useState(null);

  const [numeroDoc, setNumeroDoc] = useState('');
  const [referenceFournisseur, setReferenceFournisseur] = useState('');
  const [dateDoc, setDateDoc] = useState(new Date().toISOString().split('T')[0]);
  const [idFournisseur, setIdFournisseur] = useState('');
  const [idDepotDestination, setIdDepotDestination] = useState('');
  const [delaiLivraison, setDelaiLivraison] = useState('7 jours');
  const [statutPaiement, setStatutPaiement] = useState('SOLDE');
  const [montantPaye, setMontantPaye] = useState(0);

  const [modalArticleOuverte, setModalArticleOuverte] = useState(false);
  const [rechercheArticle, setRechercheArticle] = useState('');
  const [articleCourant, setArticleCourant] = useState({ id_article: '', designation: '', quantite: '1', prix_achat: '' });
  const [indexEnCoursModif, setIndexEnCoursModif] = useState(null);

  const [lignesValidees, setLignesValidees] = useState([]);
  const [modalPartageOuverte, setModalPartageOuverte] = useState(false);
  const [formatPartage, setFormatPartage] = useState('PDF');

  const [triCol, setTriCol] = useState('date');
  const [triOrdre, setTriOrdre] = useState('desc');

  const inputQuantiteRef = useRef(null);
  const selectArticleRef = useRef(null);

  const genererNumeroDoc = (type, listeDocs) => {
    const prefix = type === 'FACTURE' ? 'APP-' : 'BC-';
    const docsFiltres = (listeDocs || []).filter(d => ((d.numero_bon || d.numero_commande) || '').startsWith(prefix));
    const seq = String(docsFiltres.length + 1).padStart(2, '0');
    return `${prefix}${seq}`;
  };

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      const { data: dataDepots } = await supabase.from('depots_stock').select('*');
      const listDepots = dataDepots || [];
      setDepots(listDepots);
      if (listDepots.length > 0 && !idDepotDestination) {
        setIdDepotDestination(listDepots[0].id);
      }

      const { data: dataFourn } = await supabase.from('fournisseurs').select('*');
      setFournisseurs(dataFourn || []);

      const { data: dataArticles } = await supabase.from('articles_stock').select('*');
      setArticles(dataArticles || []);

      const { data: dataMouvements } = await supabase.from('mouvements_stock').select('*').eq('id_entreprise', entrepriseId);
      setMouvements(dataMouvements || []);

      const { data: dataAppro } = await supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId).order('created_at', { ascending: false });
      setApprovisionnements(dataAppro || []);

      const { data: dataBC } = await supabase.from('bons_commande_fournisseurs').select('*').eq('id_entreprise', entrepriseId).order('created_at', { ascending: false });
      setBonsCommandes(dataBC || []);

      if (!approEnEditionId && !numeroDoc) {
        setNumeroDoc(genererNumeroDoc('FACTURE', dataAppro || []));
      }
    } catch (err) {
      console.error('Erreur :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId]);

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

  const montantTotalGlobal = lignesValidees.reduce((sum, item) => sum + (Number(item.quantite || 0) * Number(item.prix_achat || 0)), 0);
  const soldeRestant = statutPaiement === 'SOLDE' ? 0 : statutPaiement === 'CREDIT' ? montantTotalGlobal : Math.max(0, montantTotalGlobal - (parseFloat(montantPaye) || 0));

  const verifierEnTeteAvantSaisie = () => {
    if (!dateDoc) { alert('⚠️ Veuillez renseigner la date.'); return false; }
    if (!idFournisseur) { alert('⚠️ Veuillez sélectionner un fournisseur.'); return false; }
    if (!referenceFournisseur || !referenceFournisseur.trim()) { alert('⚠️ Veuillez renseigner la référence.'); return false; }
    if (!idDepotDestination) { alert('⚠️ Veuillez sélectionner un dépôt.'); return false; }
    return true;
  };

  const preparerNouveauDoc = (type) => {
    if (type === 'FACTURE') {
      setNumeroDoc(genererNumeroDoc('FACTURE', approvisionnements));
    } else {
      setNumeroDoc(genererNumeroDoc('COMMANDE', bonsCommandes));
    }
    setReferenceFournisseur('');
    setDateDoc(new Date().toISOString().split('T')[0]);
    setIdFournisseur('');
    setLignesValidees([]);
    setApproEnEditionId(null);
    setDocEnEditionObjet(null);
    setStatutPaiement('SOLDE');
    setMontantPaye(0);
    setIndexEnCoursModif(null);
    setVueActive(type === 'FACTURE' ? 'formulaire_facture' : 'formulaire_commande');
  };

  const ajouterArticleCourant = () => {
    if (!verifierEnTeteAvantSaisie()) return;
    if (!articleCourant.id_article) { alert('Veuillez sélectionner un article.'); return; }
    const qte = parseInt(articleCourant.quantite);
    const pxAchat = parseFloat(articleCourant.prix_achat);
    if (isNaN(qte) || qte <= 0) { alert('Quantité invalide.'); return; }
    if (isNaN(pxAchat) || pxAchat < 0) { alert('Prix invalide.'); return; }

    if (indexEnCoursModif !== null) {
      const maj = [...lignesValidees];
      maj[indexEnCoursModif] = { ...articleCourant };
      setLignesValidees(maj);
      setIndexEnCoursModif(null);
    } else {
      setLignesValidees([...lignesValidees, { ...articleCourant }]);
    }
    setArticleCourant({ id_article: '', designation: '', quantite: '1', prix_achat: '' });
    setTimeout(() => { if (selectArticleRef.current) selectArticleRef.current.focus(); }, 50);
  };

  const gererKeyDown = (e) => {
    if (e.key === 'Enter' && articleCourant.id_article) {
      e.preventDefault();
      ajouterArticleCourant();
    }
  };

  const chargerLignePourModification = (index) => {
    const ligne = lignesValidees[index];
    setArticleCourant({ id_article: ligne.id_article, designation: ligne.designation, quantite: ligne.quantite, prix_achat: ligne.prix_achat });
    setIndexEnCoursModif(index);
  };

  const enregistrerFacture = async (e) => {
    e.preventDefault();
    if (!verifierEnTeteAvantSaisie() || lignesValidees.length === 0) { 
      if (lignesValidees.length === 0) alert('Ajoutez au moins un article.'); 
      return; 
    }
    try {
      const payload = {
        id_entreprise: entrepriseId,
        numero_bon: numeroDoc,
        id_fournisseur: idFournisseur,
        numero_commande: referenceFournisseur,
        id_depot_destination: idDepotDestination,
        montant_total: montantTotalGlobal,
        montant_paye: statutPaiement === 'SOLDE' ? montantTotalGlobal : statutPaiement === 'CREDIT' ? 0 : parseFloat(montantPaye) || 0,
        statut_paiement: statutPaiement,
        details_articles: lignesValidees.map(l => ({ 
          id_article: l.id_article, 
          designation: l.designation, 
          quantite: Number(l.quantite), 
          prix_achat: Number(l.prix_achat), 
          sous_total: Number(l.quantite) * Number(l.prix_achat) 
        })),
      };

      let error;
      if (approEnEditionId) { 
        const res = await supabase.from('approvisionnements').update(payload).eq('id', approEnEditionId);
        error = res.error;
      } else { 
        const res = await supabase.from('approvisionnements').insert([payload]); 
        error = res.error;
      }

      if (error) { alert(`Erreur Supabase : ${error.message}`); return; }

      alert(`Facture ${numeroDoc} enregistrée !`);
      setVueActive('liste');
      chargerDonnees();
    } catch (err) { alert('Erreur : ' + err.message); }
  };

  const enregistrerCommande = async (e) => {
    e.preventDefault();
    if (!verifierEnTeteAvantSaisie() || lignesValidees.length === 0) { 
      if (lignesValidees.length === 0) alert('Ajoutez au moins un article.'); 
      return; 
    }
    try {
      const payload = {
        id_entreprise: entrepriseId,
        numero_commande: numeroDoc,
        id_fournisseur: idFournisseur,
        id_depot_destination: idDepotDestination,
        montant_total: montantTotalGlobal,
        statut_commande: 'EN_ATTENTE',
        delai_livraison: delaiLivraison,
        details_articles: lignesValidees.map(l => ({ 
          id_article: l.id_article, 
          designation: l.designation, 
          quantite: Number(l.quantite), 
          prix_achat: Number(l.prix_achat), 
          sous_total: Number(l.quantite) * Number(l.prix_achat) 
        })),
      };

      let error;
      if (approEnEditionId) { 
        const res = await supabase.from('bons_commande_fournisseurs').update(payload).eq('id', approEnEditionId);
        error = res.error;
      } else { 
        const res = await supabase.from('bons_commande_fournisseurs').insert([payload]); 
        error = res.error;
      }

      if (error) { alert(`Erreur Supabase : ${error.message}`); return; }

      alert(`Bon de commande ${numeroDoc} enregistré !`);
      setVueActive('liste');
      chargerDonnees();
    } catch (err) { alert('Erreur : ' + err.message); }
  };

  const transformerEnFacture = async (doc) => {
    if (!doc) return;
    if (!confirm('Voulez-vous transformer ce bon de commande en facture (ce qui va incrémenter le stock) ?')) return;
    try {
      const nouveauNumFacture = genererNumeroDoc('FACTURE', approvisionnements);
      
      const payloadFacture = {
        id_entreprise: entrepriseId,
        numero_bon: nouveauNumFacture,
        id_fournisseur: doc.id_fournisseur || idFournisseur,
        numero_commande: doc.numero_commande || referenceFournisseur,
        id_depot_destination: doc.id_depot_destination || idDepotDestination,
        montant_total: doc.montant_total || montantTotalGlobal,
        montant_paye: doc.montant_total || montantTotalGlobal,
        statut_paiement: 'SOLDE',
        details_articles: doc.details_articles || lignesValidees.map(l => ({ 
          id_article: l.id_article, 
          designation: l.designation, 
          quantite: Number(l.quantite), 
          prix_achat: Number(l.prix_achat), 
          sous_total: Number(l.quantite) * Number(l.prix_achat) 
        }))
      };

      const { error: errInsert } = await supabase.from('approvisionnements').insert([payloadFacture]);
      if (errInsert) throw errInsert;

      if (doc.id) {
        const { error: errDel } = await supabase.from('bons_commande_fournisseurs').delete().eq('id', doc.id);
        if (errDel) throw errDel;
      }

      alert(`Succès ! Le bon a été transformé en facture : ${nouveauNumFacture}`);
      setVueActive('liste');
      setOngletActif('FACTURE');
      chargerDonnees();
    } catch (err) {
      alert('Erreur lors de la transformation : ' + err.message);
    }
  };

  const ouvrirDocModification = (doc, type) => {
    setApproEnEditionId(doc.id);
    setDocEnEditionObjet(doc);
    setNumeroDoc(doc.numero_bon || doc.numero_commande || '');
    setReferenceFournisseur(doc.numero_commande || doc.reference || '');
    setDateDoc(doc.created_at ? doc.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
    setIdFournisseur(doc.id_fournisseur || '');
    setIdDepotDestination(doc.id_depot_destination || '');
    setDelaiLivraison(doc.delai_livraison || '7 jours');
    setStatutPaiement(doc.statut_paiement || 'SOLDE');
    setMontantPaye(doc.montant_paye || 0);

    let articlesDetails = [];
    if (doc.details_articles) {
      if (typeof doc.details_articles === 'string') { try { articlesDetails = JSON.parse(doc.details_articles); } catch (e) {} }
      else if (Array.isArray(doc.details_articles)) { articlesDetails = doc.details_articles; }
    }
    setLignesValidees(articlesDetails.map(l => ({ id_article: l.id_article, designation: l.designation, quantite: String(l.quantite), prix_achat: String(l.prix_achat || l.prix_estime || '') })));
    setIndexEnCoursModif(null);
    setVueActive(type === 'FACTURE' ? 'formulaire_facture' : 'formulaire_commande');
  };

  const supprimerDoc = async (id, type) => {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      const table = type === 'FACTURE' ? 'approvisionnements' : 'bons_commande_fournisseurs';
      await supabase.from(table).delete().eq('id', id);
      alert('Supprimé.');
      chargerDonnees();
    } catch (err) { alert('Erreur : ' + err.message); }
  };

  const gererTri = (colonne) => {
    if (triCol === colonne) setTriOrdre(triOrdre === 'asc' ? 'desc' : 'asc');
    else { setTriCol(colonne); setTriOrdre('asc'); }
  };

  const obtenirNomFournisseur = (idFourn) => {
    const f = fournisseurs.find(item => String(item.id) === String(idFourn));
    return f ? (f.nom_fournisseur || f.nom || f.raison_sociale || '') : '';
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
  
  const enTeteVerrouille = lignesValidees.length > 0;
  const rendreFlecheTri = (colonne) => triCol !== colonne ? <span className="text-slate-300 ml-1">↕</span> : <span className="text-orange-600 ml-1">{triOrdre === 'asc' ? '↑' : '↓'}</span>;

  return (
    <div className="space-y-2.5 font-sans text-xs">
      
      {/* EN-TÊTE EXPLICITE DE LA TABLE (HARMONISÉ) */}
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
          <span>📦</span> GESTION DES APPROVISIONNEMENTS
        </h3>
        {vueActive === 'liste' ? (
          <button
            type="button"
            onClick={() => setVueActive('choix_creation')}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
          >
            Nouveau
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setVueActive('liste')}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
          >
            ✖ Fermer
          </button>
        )}
      </div>

      {/* BARRE DE NAVIGATION (BOUTONS DE VUE LISTE) */}
      {vueActive === 'liste' && (
        <div className="flex justify-start items-center gap-1.5">
          <button 
            type="button" 
            onClick={() => { setOngletActif('FACTURE'); setVueActive('liste'); }} 
            className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition whitespace-nowrap border shadow-2xs ${ongletActif === 'FACTURE' ? 'bg-orange-600 text-white border-orange-600 shadow-xs' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'}`}
          >
            📥 Factures Achat ({documentsHistorique.length})
          </button>
          <button 
            type="button" 
            onClick={() => { setOngletActif('COMMANDE'); setVueActive('liste'); }} 
            className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition whitespace-nowrap border shadow-2xs ${ongletActif === 'COMMANDE' ? 'bg-orange-600 text-white border-orange-600 shadow-xs' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'}`}
          >
            📋 Bons de Commande ({commandesHistorique.length})
          </button>
        </div>
      )}

      {vueActive === 'liste' && (
        <div className="space-y-2.5">
          {ongletActif === 'FACTURE' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black tracking-wider select-none">
                    <th onClick={() => gererTri('date')} className="p-2.5 w-[25%] cursor-pointer hover:bg-slate-200">Date {rendreFlecheTri('date')}</th>
                    <th onClick={() => gererTri('numero')} className="p-2.5 w-[30%] font-mono cursor-pointer hover:bg-slate-200">N° Facture {rendreFlecheTri('numero')}</th>
                    <th onClick={() => gererTri('fournisseur')} className="p-2.5 w-[35%] cursor-pointer hover:bg-slate-200">Fournisseur {rendreFlecheTri('fournisseur')}</th>
                    <th onClick={() => gererTri('statut')} className="p-2.5 w-[10%] text-center cursor-pointer hover:bg-slate-200">Statut {rendreFlecheTri('statut')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px]">
                  {documentsHistorique.length === 0 ? (<tr><td colSpan="4" className="p-4 text-center text-slate-500 font-bold">Aucune facture enregistrée.</td></tr>) : (
                    documentsHistorique.map((doc) => (
                      <tr key={doc.id} onClick={() => ouvrirDocModification(doc, 'FACTURE')} className="hover:bg-orange-50/70 cursor-pointer transition select-none">
                        <td className="p-2.5 text-slate-700 font-bold">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</td>
                        <td className="p-2.5 font-mono font-black text-orange-600">{doc.numero_bon}</td>
                        <td className="p-2.5 font-black text-slate-900 truncate">{obtenirNomFournisseur(doc.id_fournisseur) || 'Fournisseur'}</td>
                        <td className="p-2.5 text-center"><span className={`px-2 py-0.5 rounded font-black text-[9.5px] ${doc.statut_paiement === 'SOLDE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-orange-100 text-orange-800 border border-orange-200'}`}>{doc.statut_paiement === 'PARTIEL' ? 'AVANCE' : (doc.statut_paiement || 'SOLDE')}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {ongletActif === 'COMMANDE' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black tracking-wider select-none">
                    <th onClick={() => gererTri('date')} className="p-2.5 w-[25%] cursor-pointer hover:bg-slate-200">Date {rendreFlecheTri('date')}</th>
                    <th onClick={() => gererTri('numero')} className="p-2.5 w-[35%] font-mono cursor-pointer hover:bg-slate-200">N° Cmd {rendreFlecheTri('numero')}</th>
                    <th onClick={() => gererTri('fournisseur')} className="p-2.5 w-[40%] cursor-pointer hover:bg-slate-200">Fournisseur {rendreFlecheTri('fournisseur')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px]">
                  {commandesHistorique.length === 0 ? (<tr><td colSpan="3" className="p-4 text-center text-slate-500 font-bold">Aucun bon de commande.</td></tr>) : (
                    commandesHistorique.map((cmd) => (
                      <tr key={cmd.id} onClick={() => ouvrirDocModification(cmd, 'COMMANDE')} className="hover:bg-orange-50/70 cursor-pointer transition select-none">
                        <td className="p-2.5 text-slate-700 font-bold">{new Date(cmd.created_at).toLocaleDateString('fr-FR')}</td>
                        <td className="p-2.5 font-mono font-black text-blue-600">{cmd.numero_commande}</td>
                        <td className="p-2.5 font-black text-slate-900 truncate">{obtenirNomFournisseur(cmd.id_fournisseur) || 'Fournisseur'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {vueActive === 'choix_creation' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-md space-y-3 max-w-sm mx-auto text-center">
          <div className="border-b border-slate-200 pb-2 flex justify-between items-center">
            <span className="font-black text-slate-900 text-xs uppercase">CHOISIR LE TYPE DE DOCUMENT</span>
            <button type="button" onClick={() => setVueActive('liste')} className="text-slate-400 hover:text-slate-700 font-black text-xs">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={() => preparerNouveauDoc('COMMANDE')} className="bg-slate-50 hover:bg-blue-50 border border-slate-300 p-3 rounded-xl flex flex-col items-center gap-1.5 transition shadow-xs">
              <span className="text-2xl">📋</span>
              <span className="font-black text-[11px] text-slate-900">Bon de Commande</span>
            </button>
            <button type="button" onClick={() => preparerNouveauDoc('FACTURE')} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 p-3 rounded-xl flex flex-col items-center gap-1.5 transition shadow-xs">
              <span className="text-2xl">📥</span>
              <span className="font-black text-[11px] text-emerald-900">Facture Achat</span>
            </button>
          </div>
        </div>
      )}

      {vueActive === 'formulaire_facture' && (
        <form onSubmit={enregistrerFacture} onKeyDown={gererKeyDown} className="bg-white p-3 rounded-xl border border-slate-200 shadow-md space-y-2.5">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-xs uppercase">📥 FACTURE FOURNISSEUR {enTeteVerrouille && '🔒'}</span>
              <button type="button" onClick={() => setVueActive('liste')} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-2.5 py-1 rounded text-[10px]">⬅️ Retour</button>
            </div>
            <span className="bg-emerald-600 text-white font-mono px-2.5 py-1 rounded text-xs font-black shadow-xs">{numeroDoc}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div>
              <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Date *</label>
              <input type="date" disabled={enTeteVerrouille} required value={dateDoc} onChange={(e) => setDateDoc(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" />
            </div>
            <div>
              <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Fournisseur *</label>
              <select disabled={enTeteVerrouille} required value={idFournisseur} onChange={(e) => setIdFournisseur(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-xs text-slate-900 shadow-xs">
                <option value="">-- Choisir --</option>
                {fournisseurs.map((f) => (<option key={f.id} value={f.id} className="text-slate-900">{f.nom_fournisseur || f.nom || f.raison_sociale}</option>))}
              </select>
            </div>
            <div>
              <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Réf. Frs *</label>
              <input type="text" disabled={enTeteVerrouille} required value={referenceFournisseur} onChange={(e) => setReferenceFournisseur(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" />
            </div>
            <div>
              <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Dépôt *</label>
              <select disabled={enTeteVerrouille} required value={idDepotDestination} onChange={(e) => setIdDepotDestination(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-xs text-slate-900 shadow-xs">
                <option value="">-- Choisir --</option>
                {depots.map((d) => (<option key={d.id} value={d.id} className="text-slate-900">{d.nom_depot || d.nom || d.libelle}</option>))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="font-black uppercase text-slate-800 text-[9px] block">SAISIE DES ARTICLES</span>
            <div className="grid grid-cols-12 gap-1.5 items-end">
              <div className="col-span-5">
                <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Article *</label>
                <div ref={selectArticleRef} tabIndex={0} onClick={() => { if (!verifierEnTeteAvantSaisie()) return; setModalArticleOuverte(true); }} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-extrabold text-slate-900 cursor-pointer truncate shadow-xs">
                  {articleCourant.designation ? articleCourant.designation : '-- Article --'}
                </div>
              </div>
              <div className="col-span-3">
                <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Qté *</label>
                <input ref={inputQuantiteRef} type="number" min="1" value={articleCourant.quantite} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, quantite: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" />
              </div>
              <div className="col-span-3">
                <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">P.A (F) *</label>
                <input type="number" min="0" value={articleCourant.prix_achat} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, prix_achat: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" />
              </div>
              <div className="col-span-1 text-center">
                <button type="button" onClick={ajouterArticleCourant} className="bg-orange-600 hover:bg-orange-700 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">OK</button>
              </div>
            </div>
          </div>
          {lignesValidees.length > 0 && (
            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs table-fixed">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 uppercase text-[9px] font-black text-slate-800">
                    <th className="p-2 w-[45%]">Article</th>
                    <th className="p-2 w-[15%] text-center">Qté</th>
                    <th className="p-2 w-[20%] text-right">P.A</th>
                    <th className="p-2 w-[15%] text-right">Total</th>
                    <th className="p-2 w-[5%] text-center">⚙️</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px]">
                  {lignesValidees.map((l, index) => (
                    <tr key={index} onClick={() => chargerLignePourModification(index)} className="hover:bg-orange-50/70 cursor-pointer transition select-none">
                      <td className="p-2 font-black text-slate-900 truncate">{l.designation}</td>
                      <td className="p-2 text-center font-black text-orange-600">{l.quantite}</td>
                      <td className="p-2 text-right text-slate-800 font-extrabold">{Number(l.prix_achat).toLocaleString('fr-FR')}</td>
                      <td className="p-2 text-right font-black text-emerald-700">{(Number(l.quantite) * Number(l.prix_achat)).toLocaleString('fr-FR')}</td>
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => setLignesValidees(lignesValidees.filter((_, i) => i !== index))} className="p-1 bg-slate-200 hover:bg-red-100 text-red-600 rounded text-xs font-bold">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1.5">
            <div className="grid grid-cols-3 gap-2 text-[9px] uppercase text-slate-700 font-black">
              <div>STATUT PAIEMENT</div><div>MONTANT RÉGLÉ</div><div>RESTE À PAYER</div>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <div>
                <select value={statutPaiement} onChange={(e) => setStatutPaiement(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs">
                  <option value="SOLDE">Soldé</option>
                  <option value="PARTIEL">Avance</option>
                  <option value="CREDIT">Crédit</option>
                </select>
              </div>
              <div>
                <input 
                  type="number" 
                  disabled={statutPaiement === 'SOLDE' || statutPaiement === 'CREDIT'} 
                  value={montantPaye} 
                  onFocus={(e) => e.target.select()} 
                  onChange={(e) => setMontantPaye(e.target.value)} 
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" 
                />
              </div>
              <div className="bg-white px-3 py-1.5 rounded border border-slate-300 text-right shadow-xs"><span className="text-xs font-black text-orange-600">{soldeRestant.toLocaleString('fr-FR')} F</span></div>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            {approEnEditionId ? (<button type="button" onClick={() => { supprimerDoc(approEnEditionId, 'FACTURE'); setVueActive('liste'); }} className="bg-red-600 hover:bg-red-700 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">🗑️ Supprimer</button>) : (<div className="bg-emerald-600 text-white px-3 py-1 rounded-lg shadow-xs"><span className="text-[8px] block font-black uppercase">TOTAL</span><span className="text-xs font-black">{montantTotalGlobal.toLocaleString('fr-FR')} F</span></div>)}
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">🖨️ Imprimer</button>
              <button type="button" onClick={() => setModalPartageOuverte(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">📤 Partager</button>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded text-xs shadow-xs">{approEnEditionId ? 'Mettre à jour' : 'Valider'}</button>
            </div>
          </div>
        </form>
      )}

      {vueActive === 'formulaire_commande' && (
        <form onSubmit={enregistrerCommande} onKeyDown={gererKeyDown} className="bg-white p-3 rounded-xl border border-slate-200 shadow-md space-y-2.5">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-xs uppercase">📋 BON DE COMMANDE {enTeteVerrouille && '🔒'}</span>
              <button type="button" onClick={() => setVueActive('liste')} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-2.5 py-1 rounded text-[10px]">⬅️ Retour</button>
            </div>
            <span className="bg-blue-600 text-white font-mono px-2.5 py-1 rounded text-xs font-black shadow-xs">{numeroDoc}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div><label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Date *</label><input type="date" disabled={enTeteVerrouille} required value={dateDoc} onChange={(e) => setDateDoc(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" /></div>
            <div>
              <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Fournisseur *</label>
              <select disabled={enTeteVerrouille} required value={idFournisseur} onChange={(e) => setIdFournisseur(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs">
                <option value="">-- Choisir --</option>
                {fournisseurs.map((f) => (<option key={f.id} value={f.id} className="text-slate-900">{f.nom_fournisseur || f.nom || f.raison_sociale}</option>))}
              </select>
            </div>
            <div><label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Réf. Frs *</label><input type="text" disabled={enTeteVerrouille} required value={referenceFournisseur} onChange={(e) => setReferenceFournisseur(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" /></div>
            <div>
              <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Dépôt *</label>
              <select disabled={enTeteVerrouille} required value={idDepotDestination} onChange={(e) => setIdDepotDestination(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs">
                <option value="">-- Choisir --</option>
                {depots.map((d) => (<option key={d.id} value={d.id} className="text-slate-900">{d.nom_depot || d.nom || d.libelle}</option>))}
              </select>
            </div>
            <div><label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Délai</label><input type="text" value={delaiLivraison} onChange={(e) => setDelaiLivraison(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" /></div>
          </div>
          <div className="space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="font-black uppercase text-slate-800 text-[9px] block">ARTICLES À COMMANDER</span>
            <div className="grid grid-cols-12 gap-1.5 items-end">
              <div className="col-span-5"><label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Article *</label><div ref={selectArticleRef} tabIndex={0} onClick={() => { if (!verifierEnTeteAvantSaisie()) return; setModalArticleOuverte(true); }} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-extrabold text-slate-900 cursor-pointer truncate shadow-xs">{articleCourant.designation ? articleCourant.designation : '-- Article --'}</div></div>
              <div className="col-span-3"><label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Qté *</label><input ref={inputQuantiteRef} type="number" min="1" value={articleCourant.quantite} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, quantite: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" /></div>
              <div className="col-span-3"><label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">P. Estimé *</label><input type="number" min="0" value={articleCourant.prix_achat} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, prix_achat: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-extrabold shadow-xs" /></div>
              <div className="col-span-1 text-center"><button type="button" onClick={ajouterArticleCourant} className="bg-orange-600 hover:bg-orange-700 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">OK</button></div>
            </div>
          </div>
          {lignesValidees.length > 0 && (
            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs table-fixed">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 uppercase text-[9px] font-black text-slate-800">
                    <th className="p-2 w-[45%]">Article</th><th className="p-2 w-[15%] text-center">Qté</th><th className="p-2 w-[20%] text-right">P. Estimé</th><th className="p-2 w-[15%] text-right">Total</th><th className="p-2 w-[5%] text-center">⚙️</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px]">
                  {lignesValidees.map((l, index) => (
                    <tr key={index} onClick={() => chargerLignePourModification(index)} className="hover:bg-orange-50/70 cursor-pointer transition select-none">
                      <td className="p-2 font-black text-slate-900 truncate">{l.designation}</td><td className="p-2 text-center font-black text-orange-600">{l.quantite}</td><td className="p-2 text-right text-slate-800 font-extrabold">{Number(l.prix_achat).toLocaleString('fr-FR')}</td><td className="p-2 text-right font-black text-slate-900">{(Number(l.quantite) * Number(l.prix_achat)).toLocaleString('fr-FR')}</td>
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}><button type="button" onClick={() => setLignesValidees(lignesValidees.filter((_, i) => i !== index))} className="p-1 bg-slate-200 hover:bg-red-100 text-red-600 rounded text-xs font-bold">🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            {approEnEditionId ? (
              <div className="flex gap-1.5">
                <button type="button" onClick={() => { supprimerDoc(approEnEditionId, 'COMMANDE'); setVueActive('liste'); }} className="bg-red-600 hover:bg-red-700 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">🗑️ Supprimer</button>
                <button type="button" onClick={() => transformerEnFacture(docEnEditionObjet)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs flex items-center gap-1">🔄 Transformer en Facture</button>
              </div>
            ) : (
              <div className="bg-emerald-600 text-white px-3 py-1 rounded-lg shadow-xs"><span className="text-[8px] block font-black uppercase">TOTAL</span><span className="text-xs font-black">{montantTotalGlobal.toLocaleString('fr-FR')} F</span></div>
            )}
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">🖨️ Imprimer</button>
              <button type="button" onClick={() => setModalPartageOuverte(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-1.5 rounded text-xs shadow-xs">📤 Partager</button>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded text-xs shadow-xs">{approEnEditionId ? 'Mettre à jour' : 'Enregistrer'}</button>
            </div>
          </div>
        </form>
      )}

      {modalArticleOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-3 space-y-2.5 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2"><span className="font-black text-xs uppercase text-slate-900">SÉLECTIONNER UN ARTICLE</span><button type="button" onClick={() => setModalArticleOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black">✕</button></div>
            <input type="text" autoFocus placeholder="Rechercher..." value={rechercheArticle} onChange={(e) => setRechercheArticle(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-900 shadow-xs" />
            <div className="overflow-y-auto space-y-1.5 flex-1 max-h-60">
              {articlesFiltresModal.map((art) => {
                const estGrise = art.estGrise;
                return (
                  <div key={art.idArticleFormate} onClick={() => { if (estGrise) return; setArticleCourant({ id_article: art.idArticleFormate, designation: art.Designation || 'Article', quantite: '1', prix_achat: art.prixAchatDefaut || '' }); setModalArticleOuverte(false); setRechercheArticle(''); setTimeout(() => { if (inputQuantiteRef.current) { inputQuantiteRef.current.focus(); inputQuantiteRef.current.select(); } }, 50); }} className={`p-2.5 border rounded-xl flex justify-between items-center transition ${estGrise ? 'bg-slate-100 opacity-50 cursor-not-allowed border-slate-200' : 'bg-slate-50 hover:bg-orange-50 cursor-pointer border-slate-200'}`}>
                    <div><span className={`font-black block text-[11px] ${estGrise ? 'text-slate-500' : 'text-slate-900'}`}>{art.Designation}</span>{estGrise && <span className="bg-slate-200 text-slate-700 text-[8.5px] px-1.5 py-0.5 rounded font-black">Déjà ajouté</span>}<span className="text-[9.5px] text-slate-600 font-bold">Stock : <strong>{art.stockDepot}</strong></span></div>
                    <span className="font-black text-[11px] text-orange-600">{art.prixAchatDefaut ? `${Number(art.prixAchatDefaut).toLocaleString('fr-FR')} F` : ''}</span>
                  </div>
                );
              })}
            </div>
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