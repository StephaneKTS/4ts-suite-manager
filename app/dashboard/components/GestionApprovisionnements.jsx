'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function GestionApprovisionnements({ entrepriseId = '4TS-TEST' }) {
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [depots, setDepots] = useState([]);
  const [articles, setArticles] = useState([]);
  const [chargement, setChargement] = useState(false);

  const [ongletActif, setOngletActif] = useState('FACTURE');
  const [vueActive, setVueActive] = useState('liste');
  const [approEnEditionId, setApproEnEditionId] = useState(null);

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
    const seq = String((listeDocs || []).length + 1).padStart(2, '0');
    return type === 'FACTURE' ? `APP-${seq}` : `BC-${seq}`;
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
      const listAppro = dataAppro || [];
      setApprovisionnements(listAppro);

      if (!approEnEditionId && !numeroDoc) {
        setNumeroDoc(genererNumeroDoc('FACTURE', listAppro));
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
    if (!referenceFournisseur || !referenceFournisseur.trim()) { alert('⚠️ Veuillez renseigner la référence de la facture fournisseur.'); return false; }
    if (!idDepotDestination) { alert('⚠️ Veuillez sélectionner un dépôt.'); return false; }
    return true;
  };

  const preparerNouveauDoc = (type) => {
    setNumeroDoc(genererNumeroDoc(type, approvisionnements));
    setReferenceFournisseur('');
    setDateDoc(new Date().toISOString().split('T')[0]);
    setIdFournisseur('');
    setLignesValidees([]);
    setApproEnEditionId(null);
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
    if (isNaN(pxAchat) || pxAchat < 0) { alert('Prix d’achat invalide.'); return; }

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
    if (!verifierEnTeteAvantSaisie() || lignesValidees.length === 0) { if (lignesValidees.length === 0) alert('Ajoutez au moins un article.'); return; }
    try {
      const payload = {
        id_entreprise: entrepriseId,
        numero_bon: numeroDoc,
        reference: referenceFournisseur,
        id_fournisseur: idFournisseur,
        id_depot_destination: idDepotDestination,
        montant_total: montantTotalGlobal,
        montant_paye: statutPaiement === 'SOLDE' ? montantTotalGlobal : statutPaiement === 'CREDIT' ? 0 : parseFloat(montantPaye) || 0,
        statut_paiement: statutPaiement,
        details_articles: lignesValidees.map(l => ({ id_article: l.id_article, designation: l.designation, quantite: Number(l.quantite), prix_achat: Number(l.prix_achat), sous_total: Number(l.quantite) * Number(l.prix_achat) })),
      };
      if (approEnEditionId) { await supabase.from('approvisionnements').update(payload).eq('id', approEnEditionId); }
      else { await supabase.from('approvisionnements').insert([payload]); }
      alert(`Facture ${numeroDoc} enregistrée !`);
      setVueActive('liste');
      chargerDonnees();
    } catch (err) { alert('Erreur : ' + err.message); }
  };

  const enregistrerCommande = async (e) => {
    e.preventDefault();
    if (!verifierEnTeteAvantSaisie() || lignesValidees.length === 0) { if (lignesValidees.length === 0) alert('Ajoutez au moins un article.'); return; }
    try {
      const payload = {
        id_entreprise: entrepriseId,
        numero_commande: numeroDoc,
        reference: referenceFournisseur,
        id_fournisseur: idFournisseur,
        id_depot_destination: idDepotDestination,
        delai_livraison: delaiLivraison,
        montant_total: montantTotalGlobal,
        statut_commande: 'EN_ATTENTE',
        details_articles: lignesValidees.map(l => ({ id_article: l.id_article, designation: l.designation, quantite: Number(l.quantite), prix_achat: Number(l.prix_achat), sous_total: Number(l.quantite) * Number(l.prix_achat) })),
      };
      if (approEnEditionId) { await supabase.from('commandes_fournisseurs').update(payload).eq('id', approEnEditionId); }
      else { await supabase.from('approvisionnements').insert([{ ...payload, numero_bon: numeroDoc }]); }
      alert(`Bon de commande ${numeroDoc} enregistré !`);
      setVueActive('liste');
      chargerDonnees();
    } catch (err) { alert('Erreur : ' + err.message); }
  };

  const ouvrirDocModification = (doc, type) => {
    setApproEnEditionId(doc.id);
    setNumeroDoc(doc.numero_bon || doc.numero_commande);
    setReferenceFournisseur(doc.reference || '');
    setDateDoc(doc.created_at ? doc.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
    setIdFournisseur(doc.id_fournisseur || '');
    setIdDepotDestination(doc.id_depot_destination || '');
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
      const tableCible = type === 'FACTURE' ? 'approvisionnements' : 'commandes_fournisseurs';
      await supabase.from(tableCible).delete().eq('id', id);
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

  const documentsHistorique = trierListe(approvisionnements.filter(a => !a.numero_commande));
  const commandesHistorique = trierListe(approvisionnements.filter(a => a.numero_commande));
  const enTeteVerrouille = lignesValidees.length > 0;
  const rendreFlecheTri = (colonne) => triCol !== colonne ? <span className="text-slate-300 ml-1">↕</span> : <span className="text-orange-600 ml-1">{triOrdre === 'asc' ? '↑' : '↓'}</span>;

  return (
    <div className="space-y-2.5 font-sans text-xs">
      {vueActive === 'liste' && (
        <div className="flex justify-between items-center bg-white p-1.5 rounded-xl border border-slate-200 gap-1.5 shadow-2xs">
          <div className="flex gap-1.5 flex-1">
            <button type="button" onClick={() => setVueActive('choix_creation')} className="bg-orange-600 text-white font-bold px-3 py-1.5 rounded-lg text-[11px]">＋ Nouveau</button>
            <button type="button" onClick={() => { setOngletActif('FACTURE'); setVueActive('liste'); }} className={`px-3 py-1.5 rounded-lg font-bold text-[11px] border ${ongletActif === 'FACTURE' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}>📥 Factures ({documentsHistorique.length})</button>
            <button type="button" onClick={() => { setOngletActif('COMMANDE'); setVueActive('liste'); }} className={`px-3 py-1.5 rounded-lg font-bold text-[11px] border ${ongletActif === 'COMMANDE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'}`}>📋 Commandes ({commandesHistorique.length})</button>
          </div>
        </div>
      )}

      {vueActive === 'liste' && (
        <div className="space-y-2.5">
          {ongletActif === 'FACTURE' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[9px] font-extrabold select-none">
                    <th onClick={() => gererTri('date')} className="p-2 w-[25%] cursor-pointer">Date {rendreFlecheTri('date')}</th>
                    <th onClick={() => gererTri('numero')} className="p-2 w-[30%] font-mono cursor-pointer">N° Facture {rendreFlecheTri('numero')}</th>
                    <th onClick={() => gererTri('fournisseur')} className="p-2 w-[35%] cursor-pointer">Fournisseur {rendreFlecheTri('fournisseur')}</th>
                    <th onClick={() => gererTri('statut')} className="p-2 w-[10%] text-center cursor-pointer">Statut {rendreFlecheTri('statut')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documentsHistorique.length === 0 ? (<tr><td colSpan="4" className="p-4 text-center text-slate-400">Aucune facture enregistrée.</td></tr>) : (
                    documentsHistorique.map((doc) => (
                      <tr key={doc.id} onClick={() => ouvrirDocModification(doc, 'FACTURE')} className="hover:bg-orange-50/70 cursor-pointer">
                        <td className="p-2 text-slate-500 text-[9.5px]">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</td>
                        <td className="p-2 font-mono font-bold text-orange-600 text-[9.5px]">{doc.numero_bon}</td>
                        <td className="p-2 font-black text-slate-800 text-[9.5px] truncate">{obtenirNomFournisseur(doc.id_fournisseur) || 'Fournisseur'}</td>
                        <td className="p-2 text-center"><span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${doc.statut_paiement === 'SOLDE' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>{doc.statut_paiement}</span></td>
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
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[9px] font-extrabold select-none">
                    <th onClick={() => gererTri('date')} className="p-2 w-[25%] cursor-pointer">Date {rendreFlecheTri('date')}</th>
                    <th onClick={() => gererTri('numero')} className="p-2 w-[30%] font-mono cursor-pointer">N° Cmd {rendreFlecheTri('numero')}</th>
                    <th onClick={() => gererTri('fournisseur')} className="p-2 w-[35%] cursor-pointer">Fournisseur {rendreFlecheTri('fournisseur')}</th>
                    <th onClick={() => gererTri('statut')} className="p-2 w-[10%] text-center cursor-pointer">Statut {rendreFlecheTri('statut')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {commandesHistorique.length === 0 ? (<tr><td colSpan="4" className="p-4 text-center text-slate-400">Aucun bon de commande.</td></tr>) : (
                    commandesHistorique.map((cmd) => (
                      <tr key={cmd.id} onClick={() => ouvrirDocModification(cmd, 'COMMANDE')} className="hover:bg-orange-50/70 cursor-pointer">
                        <td className="p-2 text-slate-500 text-[9.5px]">{new Date(cmd.created_at).toLocaleDateString('fr-FR')}</td>
                        <td className="p-2 font-mono font-bold text-blue-600 text-[9.5px]">{cmd.numero_commande}</td>
                        <td className="p-2 font-black text-slate-800 text-[9.5px] truncate">{obtenirNomFournisseur(cmd.id_fournisseur) || 'Fournisseur'}</td>
                        <td className="p-2 text-center"><span className="px-1.5 py-0.5 rounded font-bold text-[9px] bg-blue-100 text-blue-800">{cmd.statut_commande || 'EN_ATTENTE'}</span></td>
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
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 max-w-sm mx-auto text-center">
          <div className="border-b border-slate-100 pb-1.5 flex justify-between items-center">
            <span className="font-extrabold text-slate-800 text-xs uppercase">Type de document</span>
            <button type="button" onClick={() => setVueActive('liste')} className="text-slate-400 font-black text-xs">✖</button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button type="button" onClick={() => preparerNouveauDoc('COMMANDE')} className="bg-slate-50 hover:bg-blue-50 border border-slate-200 p-2.5 rounded-xl flex flex-col items-center gap-1">
              <span className="text-xl">📋</span>
              <span className="font-extrabold text-[10px] text-slate-800">Bon de Commande</span>
            </button>
            <button type="button" onClick={() => preparerNouveauDoc('FACTURE')} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 p-2.5 rounded-xl flex flex-col items-center gap-1">
              <span className="text-xl">📥</span>
              <span className="font-extrabold text-[10px] text-emerald-900">Facture Achat</span>
            </button>
          </div>
        </div>
      )}

      {vueActive === 'formulaire_facture' && (
        <form onSubmit={enregistrerFacture} onKeyDown={gererKeyDown} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center border-b border-slate-100 pb-1">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-800 text-[11px] uppercase">📥 FACTURE FOURNISSEUR {enTeteVerrouille && '🔒'}</span>
              <button type="button" onClick={() => setVueActive('liste')} className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[9.5px]">⬅️ Retour</button>
            </div>
            <span className="bg-emerald-600 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold">{numeroDoc}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <div>
              <label className="block font-bold text-[8px] text-slate-400 mb-0.5">Date *</label>
              <input type="date" disabled={enTeteVerrouille} required value={dateDoc} onChange={(e) => setDateDoc(e.target.value)} className="w-full bg-white border border-slate-200 rounded p-1 text-[10px]" />
            </div>
            <div>
              <label className="block font-bold text-[8px] text-slate-400 mb-0.5">Fournisseur *</label>
              <select disabled={enTeteVerrouille} required value={idFournisseur} onChange={(e) => setIdFournisseur(e.target.value)} className="w-full bg-white border border-slate-200 rounded p-1 font-bold text-[10px]">
                <option value="">-- Choisir --</option>
                {fournisseurs.map((f) => (<option key={f.id} value={f.id}>{f.nom_fournisseur || f.nom || f.raison_sociale}</option>))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-[8px] text-slate-400 mb-0.5">Réf. Frs *</label>
              <input type="text" disabled={enTeteVerrouille} required value={referenceFournisseur} onChange={(e) => setReferenceFournisseur(e.target.value)} className="w-full bg-white border border-slate-200 rounded p-1 text-[10px]" />
            </div>
            <div>
              <label className="block font-bold text-[8px] text-slate-400 mb-0.5">Dépôt *</label>
              <select disabled={enTeteVerrouille} required value={idDepotDestination} onChange={(e) => setIdDepotDestination(e.target.value)} className="w-full bg-white border border-slate-200 rounded p-1 font-bold text-[10px]">
                <option value="">-- Choisir --</option>
                {depots.map((d) => (<option key={d.id} value={d.id}>{d.nom_depot || d.nom || d.libelle}</option>))}
              </select>
            </div>
          </div>
          <div className="space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <span className="font-extrabold uppercase text-slate-500 text-[8px] block">SAISIE DES ARTICLES</span>
            <div className="grid grid-cols-12 gap-1 items-end">
              <div className="col-span-5">
                <label className="block text-[8px] text-slate-400 mb-0.5">Article *</label>
                <div ref={selectArticleRef} tabIndex={0} onClick={() => { if (!verifierEnTeteAvantSaisie()) return; setModalArticleOuverte(true); }} className="w-full bg-white border border-slate-200 rounded p-1 text-[10px] font-bold cursor-pointer truncate">
                  {articleCourant.designation ? articleCourant.designation : '-- Article --'}
                </div>
              </div>
              <div className="col-span-3">
                <label className="block text-[8px] text-slate-400 mb-0.5">Qté *</label>
                <input ref={inputQuantiteRef} type="number" min="1" value={articleCourant.quantite} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, quantite: e.target.value })} className="w-full bg-white border border-slate-200 rounded p-1 text-[10px]" />
              </div>
              <div className="col-span-3">
                <label className="block text-[8px] text-slate-400 mb-0.5">P.A (F) *</label>
                <input type="number" min="0" value={articleCourant.prix_achat} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, prix_achat: e.target.value })} className="w-full bg-white border border-slate-200 rounded p-1 text-[10px]" />
              </div>
              <div className="col-span-1 text-center">
                <button type="button" onClick={ajouterArticleCourant} className="bg-orange-600 text-white font-bold p-1 rounded text-[10px]">➕</button>
              </div>
            </div>
          </div>
          {lignesValidees.length > 0 && (
            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
              <table className="w-full text-left text-xs table-fixed">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 uppercase text-[8px] font-extrabold text-slate-500">
                    <th className="p-1.5 w-[45%]">Article</th>
                    <th className="p-1.5 w-[15%] text-center">Qté</th>
                    <th className="p-1.5 w-[20%] text-right">P.A</th>
                    <th className="p-1.5 w-[15%] text-right">Total</th>
                    <th className="p-1.5 w-[5%] text-center">⚙️</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {lignesValidees.map((l, index) => (
                    <tr key={index} onClick={() => chargerLignePourModification(index)} className="hover:bg-slate-50 cursor-pointer">
                      <td className="p-1.5 font-bold truncate">{l.designation}</td>
                      <td className="p-1.5 text-center font-black text-orange-600">{l.quantite}</td>
                      <td className="p-1.5 text-right">{Number(l.prix_achat).toLocaleString('fr-FR')}</td>
                      <td className="p-1.5 text-right font-black text-emerald-600">{(Number(l.quantite) * Number(l.prix_achat)).toLocaleString('fr-FR')}</td>
                      <td className="p-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => setLignesValidees(lignesValidees.filter((_, i) => i !== index))} className="p-0.5 bg-slate-100 rounded text-[9px]">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 space-y-1">
            <div className="grid grid-cols-3 gap-1.5 text-[8px] uppercase text-slate-400 font-bold">
              <div>STATUT</div><div>RÉGLÉ</div><div>RESTE</div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 items-center">
              <div><select value={statutPaiement} onChange={(e) => setStatutPaiement(e.target.value)} className="w-full bg-white border rounded p-1 text-[10px]"><option value="SOLDE">Soldé</option><option value="PARTIEL">Partiel</option><option value="CREDIT">Crédit</option></select></div>
              <div><input type="number" disabled={statutPaiement === 'SOLDE' || statutPaiement === 'CREDIT'} value={montantPaye} onChange={(e) => setMontantPaye(e.target.value)} className="w-full bg-white border rounded p-1 text-[10px]" /></div>
              <div className="bg-white px-2 py-1 rounded border text-right"><span className="text-[10px] font-black text-orange-600">{soldeRestant.toLocaleString('fr-FR')} F</span></div>
            </div>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
            {approEnEditionId ? (<button type="button" onClick={() => { supprimerDoc(approEnEditionId, 'FACTURE'); setVueActive('liste'); }} className="bg-red-600 text-white font-bold px-2.5 py-1 rounded text-[10px]">🗑️ Supprimer</button>) : (<div className="bg-emerald-600 text-white px-2.5 py-1 rounded"><span className="text-[7px] block font-bold">TOTAL</span><span className="text-[11px] font-black">{montantTotalGlobal.toLocaleString('fr-FR')} F</span></div>)}
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => window.print()} className="bg-slate-800 text-white font-bold px-2.5 py-1 rounded text-[10px]">🖨️ Imprimer</button>
              <button type="button" onClick={() => setModalPartageOuverte(true)} className="bg-blue-600 text-white font-bold px-2.5 py-1 rounded text-[10px]">📤 Partager</button>
              <button type="submit" className="bg-emerald-600 text-white font-bold px-3 py-1 rounded text-[10px]">{approEnEditionId ? 'Mettre à jour' : 'Valider'}</button>
            </div>
          </div>
        </form>
      )}

      {vueActive === 'formulaire_commande' && (
        <form onSubmit={enregistrerCommande} onKeyDown={gererKeyDown} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center border-b border-slate-100 pb-1">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-800 text-[11px] uppercase">📋 BON DE COMMANDE {enTeteVerrouille && '🔒'}</span>
              <button type="button" onClick={() => setVueActive('liste')} className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[9.5px]">⬅️ Retour</button>
            </div>
            <span className="bg-emerald-600 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold">{numeroDoc}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <div><label className="block font-bold text-[8px] text-slate-400 mb-0.5">Date *</label><input type="date" disabled={enTeteVerrouille} required value={dateDoc} onChange={(e) => setDateDoc(e.target.value)} className="w-full bg-white border rounded p-1 text-[10px]" /></div>
            <div><label className="block font-bold text-[8px] text-slate-400 mb-0.5">Fournisseur *</label><select disabled={enTeteVerrouille} required value={idFournisseur} onChange={(e) => setIdFournisseur(e.target.value)} className="w-full bg-white border rounded p-1 text-[10px]"><option value="">-- Choisir --</option>{fournisseurs.map((f) => (<option key={f.id} value={f.id}>{f.nom_fournisseur || f.nom || f.raison_sociale}</option>))}</select></div>
            <div><label className="block font-bold text-[8px] text-slate-400 mb-0.5">Réf. Frs *</label><input type="text" disabled={enTeteVerrouille} required value={referenceFournisseur} onChange={(e) => setReferenceFournisseur(e.target.value)} className="w-full bg-white border rounded p-1 text-[10px]" /></div>
            <div><label className="block font-bold text-[8px] text-slate-400 mb-0.5">Dépôt *</label><select disabled={enTeteVerrouille} required value={idDepotDestination} onChange={(e) => setIdDepotDestination(e.target.value)} className="w-full bg-white border rounded p-1 text-[10px]"><option value="">-- Choisir --</option>{depots.map((d) => (<option key={d.id} value={d.id}>{d.nom_depot || d.nom || d.libelle}</option>))}</select></div>
            <div><label className="block font-bold text-[8px] text-slate-400 mb-0.5">Délai</label><input type="text" value={delaiLivraison} onChange={(e) => setDelaiLivraison(e.target.value)} className="w-full bg-white border rounded p-1 text-[10px]" /></div>
          </div>
          <div className="space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <span className="font-extrabold uppercase text-slate-500 text-[8px] block">ARTICLES À COMMANDER</span>
            <div className="grid grid-cols-12 gap-1 items-end">
              <div className="col-span-5"><label className="block text-[8px] text-slate-400 mb-0.5">Article *</label><div ref={selectArticleRef} tabIndex={0} onClick={() => { if (!verifierEnTeteAvantSaisie()) return; setModalArticleOuverte(true); }} className="w-full bg-white border rounded p-1 text-[10px] font-bold cursor-pointer truncate">{articleCourant.designation ? articleCourant.designation : '-- Article --'}</div></div>
              <div className="col-span-3"><label className="block text-[8px] text-slate-400 mb-0.5">Qté *</label><input ref={inputQuantiteRef} type="number" min="1" value={articleCourant.quantite} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, quantite: e.target.value })} className="w-full bg-white border rounded p-1 text-[10px]" /></div>
              <div className="col-span-3"><label className="block text-[8px] text-slate-400 mb-0.5">P. Estimé *</label><input type="number" min="0" value={articleCourant.prix_achat} onFocus={(e) => e.target.select()} onChange={(e) => setArticleCourant({ ...articleCourant, prix_achat: e.target.value })} className="w-full bg-white border rounded p-1 text-[10px]" /></div>
              <div className="col-span-1 text-center"><button type="button" onClick={ajouterArticleCourant} className="bg-orange-600 text-white font-bold p-1 rounded text-[10px]">➕</button></div>
            </div>
          </div>
          {lignesValidees.length > 0 && (
            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
              <table className="w-full text-left text-xs table-fixed">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 uppercase text-[8px] font-extrabold text-slate-500">
                    <th className="p-1.5 w-[45%]">Article</th><th className="p-1.5 w-[15%] text-center">Qté</th><th className="p-1.5 w-[20%] text-right">P. Estimé</th><th className="p-1.5 w-[15%] text-right">Total</th><th className="p-1.5 w-[5%] text-center">⚙️</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {lignesValidees.map((l, index) => (
                    <tr key={index} onClick={() => chargerLignePourModification(index)} className="hover:bg-slate-50 cursor-pointer">
                      <td className="p-1.5 font-bold truncate">{l.designation}</td><td className="p-1.5 text-center font-black text-orange-600">{l.quantite}</td><td className="p-1.5 text-right">{Number(l.prix_achat).toLocaleString('fr-FR')}</td><td className="p-1.5 text-right font-black">{(Number(l.quantite) * Number(l.prix_achat)).toLocaleString('fr-FR')}</td>
                      <td className="p-1.5 text-center" onClick={(e) => e.stopPropagation()}><button type="button" onClick={() => setLignesValidees(lignesValidees.filter((_, i) => i !== index))} className="p-0.5 bg-slate-100 rounded text-[9px]">🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
            {approEnEditionId ? (<button type="button" onClick={() => { supprimerDoc(approEnEditionId, 'COMMANDE'); setVueActive('liste'); }} className="bg-red-600 text-white font-bold px-2.5 py-1 rounded text-[10px]">🗑️ Supprimer</button>) : (<div className="bg-emerald-600 text-white px-2.5 py-1 rounded"><span className="text-[7px] block font-bold">TOTAL</span><span className="text-[11px] font-black">{montantTotalGlobal.toLocaleString('fr-FR')} F</span></div>)}
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => window.print()} className="bg-slate-800 text-white font-bold px-2.5 py-1 rounded text-[10px]">🖨️ Imprimer</button>
              <button type="button" onClick={() => setModalPartageOuverte(true)} className="bg-blue-600 text-white font-bold px-2.5 py-1 rounded text-[10px]">📤 Partager</button>
              <button type="submit" className="bg-emerald-600 text-white font-bold px-3 py-1 rounded text-[10px]">{approEnEditionId ? 'Mettre à jour' : 'Enregistrer'}</button>
            </div>
          </div>
        </form>
      )}

      {modalArticleOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-3 space-y-2.5 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-2"><span className="font-extrabold text-xs uppercase">SÉLECTIONNER UN ARTICLE</span><button type="button" onClick={() => setModalArticleOuverte(false)} className="text-slate-400 font-black">✕</button></div>
            <input type="text" autoFocus placeholder="Rechercher..." value={rechercheArticle} onChange={(e) => setRechercheArticle(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-3 py-1.5 text-xs font-bold" />
            <div className="overflow-y-auto space-y-1 flex-1 max-h-60">
              {articlesFiltresModal.map((art) => {
                const estGrise = art.estGrise;
                return (
                  <div key={art.idArticleFormate} onClick={() => { if (estGrise) return; setArticleCourant({ id_article: art.idArticleFormate, designation: art.Designation || 'Article', quantite: '1', prix_achat: art.prixAchatDefaut || '' }); setModalArticleOuverte(false); setRechercheArticle(''); setTimeout(() => { if (inputQuantiteRef.current) { inputQuantiteRef.current.focus(); inputQuantiteRef.current.select(); } }, 50); }} className={`p-2 border rounded-xl flex justify-between items-center ${estGrise ? 'bg-slate-100 opacity-50 cursor-not-allowed' : 'bg-slate-50 hover:bg-orange-50 cursor-pointer'}`}>
                    <div><span className={`font-extrabold block text-[11px] ${estGrise ? 'text-slate-500' : 'text-slate-800'}`}>{art.Designation}</span>{estGrise && <span className="bg-slate-200 text-slate-600 text-[8px] px-1.5 py-0.2 rounded font-bold">Déjà ajouté</span>}<span className="text-[9px] text-slate-400">Stock : <strong>{art.stockDepot}</strong></span></div>
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
            <div className="flex justify-between items-center border-b pb-2"><span className="font-extrabold text-xs uppercase">OPTIONS DE PARTAGE</span><button type="button" onClick={() => setModalPartageOuverte(false)} className="text-slate-400 font-black">✕</button></div>
            <div className="space-y-1.5"><label className="block font-bold text-slate-700 text-[10px]">Format :</label><div className="grid grid-cols-3 gap-1">{['PDF', 'PNG', 'JPG'].map(fmt => (<button key={fmt} type="button" onClick={() => setFormatPartage(fmt)} className={`py-1.5 rounded-lg font-bold text-[10px] border ${formatPartage === fmt ? 'bg-orange-600 text-white' : 'bg-slate-50'}`}>{fmt}</button>))}</div></div>
            <div className="space-y-1.5 pt-1"><label className="block font-bold text-slate-700 text-[10px]">Canal :</label><div className="grid grid-cols-1 gap-1 text-[11px]"><button type="button" onClick={() => { alert('Partagé !'); setModalPartageOuverte(false); }} className="w-full bg-emerald-50 text-emerald-900 font-bold p-2 rounded-xl text-center">💚 WhatsApp</button><button type="button" onClick={() => { alert('Partagé !'); setModalPartageOuverte(false); }} className="w-full bg-blue-50 text-blue-900 font-bold p-2 rounded-xl text-center">📧 Mail</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}