'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function GestionMouvements({ entrepriseId = '4TS-TEST' }) {
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [depots, setDepots] = useState([]);
  const [emplacements, setEmplacements] = useState([]);
  const [articles, setArticles] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [chargement, setChargement] = useState(false);

  const [modeAffichage, setModeAffichage] = useState('SAISIE');
  const [typeOperation, setTypeOperation] = useState('ENTREE');

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
    ENTREE: 'ENTRÉE DE STOCK (ME)',
    SORTIE: 'SORTIE DE STOCK (MS)',
    AVARIES: 'AVARIES & PERTES (AV)',
    TRANSFERT: 'TRANSFERT ENTRE DÉPÔTS (TR)',
    INVENTAIRE: 'SAISIE D’INVENTAIRE (INV)',
  };

  const genererNumeroDocIndependant = (type, mouvementsList) => {
    const prefixes = { ENTREE: 'ME', SORTIE: 'MS', AVARIES: 'AV', TRANSFERT: 'TR', INVENTAIRE: 'INV' };
    const prefix = prefixes[type] || 'ME';
    const numsUniques = [...new Set(mouvementsList.filter((m) => m.type_mouvement === type).map(m => m.motif_remarque))];
    return `${prefix}-${String(numsUniques.length + 1).padStart(5, '0')}`;
  };

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      const { data: dataDepots } = await supabase.from('depots_stock').select('*');
      const depotsList = dataDepots || [];
      setDepots(depotsList);
      if (depotsList.length > 0 && !enTeteDoc.id_depot_source) {
        setEnTeteDoc((prev) => ({ ...prev, id_depot_source: depotsList[0].id }));
      }

      const { data: dataEmplacements } = await supabase.from('emplacements_stock').select('*');
      setEmplacements(dataEmplacements || []);

      const { data: dataArticles } = await supabase.from('articles_stock').select('*');
      setArticles(dataArticles || []);

      const { data: dataFamilles } = await supabase.from('familles_articles').select('*');
      setFamilles(dataFamilles || []);

      const { data: dataMouvements } = await supabase.from('mouvements_stock').select('*').eq('id_entreprise', entrepriseId).order('created_at', { ascending: false });
      const mouvementsList = dataMouvements || [];
      setMouvements(mouvementsList);

      const { data: dataAppro } = await supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId);
      setApprovisionnements(dataAppro || []);

      if (!mouvementEnEditionId) {
        setEnTeteDoc((prev) => ({ ...prev, numeroDoc: genererNumeroDocIndependant(typeOperation, mouvementsList) }));
      }
    } catch (err) { console.error('Erreur :', err.message); } finally { setChargement(false); }
  };

  useEffect(() => { chargerDonnees(); }, [entrepriseId, typeOperation]);

  const emplacementsSourceDisponibles = emplacements.filter((emp) => String(emp.id_depot) === String(enTeteDoc.id_depot_source));
  const emplacementsDestinationDisponibles = emplacements.filter((emp) => String(emp.id_depot) === String(enTeteDoc.id_depot_destination));

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
    const depotCibleId = enTeteDoc.id_depot_source;
    if (!depotCibleId) {
      const artObj = articles.find(a => String(a.id_article) === String(articleId));
      return parseInt(artObj?.Quantite_Stock || 0);
    }
    let stockDepot = 0;
    const fluxArticle = obtenirTousLesFluxArticle(articleId);
    fluxArticle.forEach((m) => {
      const matchDepotSource = correspondAuDepot(m.depot_source, depotCibleId);
      const matchDepotDest = correspondAuDepot(m.depot_destination, depotCibleId);
      const qte = m.quantite; const typeMvt = m.type;
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

  const articlesPopupFiltres = articles.filter((art) => (art.Designation || '').toLowerCase().includes((recherchePopup || '').toLowerCase()));

  const verifierEnTeteAvantSaisie = () => {
    if (!enTeteDoc.motif || !enTeteDoc.motif.trim()) { alert('⚠️ Veuillez obligatoirement saisir le motif.'); return false; }
    if (typeOperation === 'TRANSFERT') {
      if (!enTeteDoc.id_depot_source || !enTeteDoc.id_depot_destination) { alert('⚠️ Sélectionnez les dépôts source et destination.'); return false; }
      if (enTeteDoc.id_depot_source === enTeteDoc.id_depot_destination) { alert('⚠️ Dépôts identiques.'); return false; }
    }
    return true;
  };

  const selectionnerArticleEtFocusQte = (art) => {
    if (!verifierEnTeteAvantSaisie()) return;
    setArticleSelectionneTemp(art);
    setModalArticleOuvert(false);
    setRecherchePopup('');
    setTimeout(() => { if (inputQuantiteRef.current) { inputQuantiteRef.current.focus(); inputQuantiteRef.current.select(); } }, 50);
  };

  const ajouterArticleAuPanier = () => {
    if (!verifierEnTeteAvantSaisie() || !articleSelectionneTemp) { if (!articleSelectionneTemp) alert('Sélectionnez un article.'); return; }
    const qte = parseInt(quantiteSaisie);
    if (isNaN(qte) || (typeOperation === 'INVENTAIRE' ? qte < 0 : qte <= 0)) { alert('Quantité invalide.'); return; }

    const stockActuelDepot = calculerStockPourDepotActuel(articleSelectionneTemp.id_article);
    if ((typeOperation === 'SORTIE' || typeOperation === 'TRANSFERT' || typeOperation === 'AVARIES') && qte > stockActuelDepot) {
      alert(`⛔ Stock insuffisant (${stockActuelDepot} disp.).`);
      return;
    }

    let stockReelPrevisionnel = stockActuelDepot;
    if (typeOperation === 'ENTREE') stockReelPrevisionnel = stockActuelDepot + qte;
    else if (typeOperation === 'SORTIE' || typeOperation === 'AVARIES' || typeOperation === 'TRANSFERT') stockReelPrevisionnel = Math.max(0, stockActuelDepot - qte);
    else if (typeOperation === 'INVENTAIRE') stockReelPrevisionnel = qte;

    const dejaPresentIndex = lignesPanier.findIndex((l) => String(l.id_article) === String(articleSelectionneTemp.id_article));
    if (dejaPresentIndex !== -1) {
      const nouveauPanier = [...lignesPanier];
      const nouvelleQte = typeOperation === 'INVENTAIRE' ? qte : nouveauPanier[dejaPresentIndex].quantite + qte;
      nouveauPanier[dejaPresentIndex].quantite = nouvelleQte;
      nouveauPanier[dejaPresentIndex].stockReel = stockReelPrevisionnel;
      setLignesPanier(nouveauPanier);
    } else {
      setLignesPanier([...lignesPanier, { id_article: articleSelectionneTemp.id_article, designation: articleSelectionneTemp.Designation, quantite: qte, stockActuel: stockActuelDepot, stockReel: stockReelPrevisionnel }]);
    }
    setArticleSelectionneTemp(null);
    setQuantiteSaisie(1);
    setTimeout(() => { if (boutonSelectionArticleRef.current) boutonSelectionArticleRef.current.focus(); }, 50);
  };

  const validerDocumentMouvement = async () => {
    if (!verifierEnTeteAvantSaisie() || lignesPanier.length === 0) { if (lignesPanier.length === 0) alert('Ajoutez des articles.'); return; }
    try {
      if (mouvementEnEditionId) await supabase.from('mouvements_stock').delete().eq('motif_remarque', enTeteDoc.numeroDoc);
      for (const ligne of lignesPanier) {
        await supabase.from('mouvements_stock').insert([{
          id_entreprise: entrepriseId,
          type_mouvement: typeOperation,
          id_depot_source: enTeteDoc.id_depot_source || null,
          id_depot_destination: typeOperation === 'TRANSFERT' ? enTeteDoc.id_depot_destination : null,
          id_article: parseInt(ligne.id_article),
          quantite: ligne.quantite,
          motif_remarque: enTeteDoc.numeroDoc,
          operateur: enTeteDoc.operateur,
        }]);
      }
      alert('Document validé avec succès !');
      setLignesPanier([]);
      setMouvementEnEditionId(null);
      setEnTeteDoc((prev) => ({ ...prev, motif: '', referenceDoc: '' }));
      chargerDonnees();
      setModeAffichage('LISTE_DOCS');
    } catch (err) { alert('Erreur : ' + err.message); }
  };

  const ouvrirDocumentDepuisListe = (numeroDocUnique) => {
    const lignesAssociees = mouvements.filter(m => m.motif_remarque === numeroDocUnique);
    if (lignesAssociees.length === 0) return;
    const premier = lignesAssociees[0];
    setTypeOperation(premier.type_mouvement || 'ENTREE');
    setEnTeteDoc({ ...enTeteDoc, numeroDoc: numeroDocUnique, dateDoc: premier.created_at ? premier.created_at.split('T')[0] : new Date().toISOString().split('T')[0], id_depot_source: premier.id_depot_source || '', id_depot_destination: premier.id_depot_destination || '', motif: numeroDocUnique, operateur: premier.operateur || 'THÉODORE STÉPHANE' });
    setLignesPanier(lignesAssociees.map(mvt => {
      const art = articles.find((a) => String(a.id_article) === String(mvt.id_article));
      return { id_article: mvt.id_article, designation: art ? art.Designation : `Article #${mvt.id_article}`, quantite: mvt.quantite, stockActuel: calculerStockPourDepotActuel(mvt.id_article), stockReel: mvt.quantite };
    }));
    setMouvementEnEditionId(premier.id);
    setModeAffichage('SAISIE');
  };

  const supprimerDocumentComplet = async (numeroDocUnique) => {
    if (!confirm(`Supprimer le document ${numeroDocUnique} ?`)) return;
    try {
      await supabase.from('mouvements_stock').delete().eq('motif_remarque', numeroDocUnique);
      alert('Supprimé.');
      chargerDonnees();
    } catch (err) { alert('Erreur : ' + err.message); }
  };

  const nettoyerNumeroDoc = (motifRemarque) => {
    if (!motifRemarque) return '-';
    const matchCrochet = motifRemarque.match(/\[Doc:\s*([A-Z]+-\d+)\]/);
    if (matchCrochet) return matchCrochet[1];
    const matchDirect = motifRemarque.match(/^([A-Z]+-\d+)/);
    if (matchDirect) return matchDirect[1];
    return motifRemarque;
  };

  const documentsGroupes = Object.values(mouvements.reduce((acc, mvt) => {
    const numDoc = nettoyerNumeroDoc(mvt.motif_remarque);
    if (!acc[numDoc]) { acc[numDoc] = { numeroDoc: numDoc, date: mvt.created_at || '', type: mvt.type_mouvement || '', operateur: mvt.operateur || 'THÉODORE STÉPHANE', lignesCount: 0 }; }
    acc[numDoc].lignesCount += 1;
    return acc;
  }, {}));

  const gererTri = (colonne) => {
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

  const enTeteVerrouille = lignesPanier.length > 0;

  return (
    <div className="space-y-2 font-sans text-[10px]">
      <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
        <button type="button" onClick={() => { setModeAffichage('SAISIE'); setMouvementEnEditionId(null); setLignesPanier([]); setEnTeteDoc(prev => ({ ...prev, numeroDoc: genererNumeroDocIndependant(typeOperation, mouvements), motif: '' })); }} className={`py-1 px-2 rounded-lg font-bold transition text-center text-[10px] ${modeAffichage === 'SAISIE' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-white text-slate-700'}`}>✍️ {mouvementEnEditionId ? 'Modifier' : 'Saisir'}</button>
        <button type="button" onClick={() => setModeAffichage('LISTE_DOCS')} className={`py-1 px-2 rounded-lg font-bold transition text-center text-[10px] ${modeAffichage === 'LISTE_DOCS' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-white text-slate-700'}`}>📋 Liste ({documentsGroupes.length})</button>
      </div>

      {modeAffichage === 'SAISIE' && (
        <>
          <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center justify-between gap-1 shadow-2xs">
            <span className="font-extrabold text-[9px] text-slate-500 uppercase">Mouvement</span>
            <select disabled={enTeteVerrouille} value={typeOperation} onChange={(e) => { const nt = e.target.value; setTypeOperation(nt); if (!mouvementEnEditionId) setEnTeteDoc(prev => ({ ...prev, numeroDoc: genererNumeroDocIndependant(nt, mouvements) })); }} className="bg-slate-50 border rounded-lg px-2 py-0.5 font-extrabold text-orange-600 text-[10px]">
              <option value="ENTREE">📥 Entrée (ME)</option><option value="SORTIE">📤 Sortie (MS)</option><option value="AVARIES">⚠️ Avaries (AV)</option><option value="TRANSFERT">🔀 Transfert (TR)</option><option value="INVENTAIRE">📊 Inventaire (INV)</option>
            </select>
          </div>

          <div className={`bg-white border-2 border-orange-500/50 p-2 rounded-xl shadow-2xs space-y-1.5 ${enTeteVerrouille ? 'bg-slate-50/80' : ''}`}>
            <div className="flex justify-between items-center pb-1 border-b"><span className="font-extrabold text-[10px] text-orange-600 uppercase">{libellesTypesMouvement[typeOperation]} {enTeteVerrouille && '🔒'}</span><span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-mono font-bold text-[9px]">{enTeteDoc.numeroDoc}</span></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[9.5px]">
              <div><label className="block font-bold text-[7.5px] text-slate-400 mb-0.5">Date *</label><input type="date" disabled={enTeteVerrouille} value={enTeteDoc.dateDoc} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, dateDoc: e.target.value })} className="w-full bg-slate-50 border rounded p-1" /></div>
              <div><label className="block font-bold text-[7.5px] text-slate-400 mb-0.5">Réf.</label><input type="text" disabled={enTeteVerrouille} value={enTeteDoc.referenceDoc} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, referenceDoc: e.target.value })} placeholder="Ex: BL" className="w-full bg-slate-50 border rounded p-1" /></div>
              <div><label className="block font-bold text-[7.5px] text-slate-400 mb-0.5">Opérateur</label><input type="text" disabled value={enTeteDoc.operateur} className="w-full bg-slate-100 text-slate-500 border rounded p-1 font-bold" /></div>
              <div>
                <label className="block font-bold text-[7.5px] text-slate-400 mb-0.5">{typeOperation === 'TRANSFERT' ? 'Origine *' : 'Dépôt *'}</label>
                <select disabled={enTeteVerrouille} required value={enTeteDoc.id_depot_source} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, id_depot_source: e.target.value })} className="w-full bg-slate-50 border rounded p-1 font-bold text-orange-600">
                  <option value="">-- Dépôt --</option>{depots.map((dep) => (<option key={dep.id} value={dep.id}>{dep.nom_depot}</option>))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[7.5px] text-slate-400 mb-0.5">Motif *</label>
                <input type="text" disabled={enTeteVerrouille} required value={enTeteDoc.motif} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, motif: e.target.value })} placeholder="Ex: Ajustement..." className="w-full bg-slate-50 border rounded p-1" />
              </div>
            </div>
          </div>

          <div className="bg-white border p-2 rounded-xl shadow-2xs space-y-1.5">
            <span className="font-extrabold text-slate-700 uppercase text-[8.5px]">Articles</span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 items-end bg-slate-50 p-1.5 rounded-lg border text-[9.5px]">
              <div className="sm:col-span-8">
                <label className="block font-bold text-[7.5px] text-slate-400 mb-0.5">Article *</label>
                <button ref={boutonSelectionArticleRef} type="button" onClick={() => { if (!verifierEnTeteAvantSaisie()) return; setModalArticleOuvert(true); }} className="w-full bg-white border rounded p-1 text-left font-bold text-slate-800 flex justify-between">
                  <span>{articleSelectionneTemp ? `${articleSelectionneTemp.Designation}` : '-- Sélectionner --'}</span>
                  <span className="text-orange-600">🔍</span>
                </button>
              </div>
              <div className="sm:col-span-3"><label className="block font-bold text-[7.5px] text-slate-400 mb-0.5">Qte *</label><input ref={inputQuantiteRef} type="number" min="1" value={quantiteSaisie} onChange={(e) => setQuantiteSaisie(e.target.value)} className="w-full bg-white border rounded p-1 font-bold text-emerald-600" /></div>
              <div className="sm:col-span-1"><button type="button" onClick={ajouterArticleAuPanier} className="w-full bg-blue-600 text-white font-bold p-1 rounded text-center">➕</button></div>
            </div>

            {modalArticleOuvert && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-3 space-y-2 max-h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center border-b pb-1.5"><span className="font-extrabold text-[10px] uppercase">SÉLECTIONNER UN ARTICLE</span><button type="button" onClick={() => setModalArticleOuvert(false)} className="text-slate-400">✕</button></div>
                  <input type="text" value={recherchePopup} onChange={(e) => setRecherchePopup(e.target.value)} placeholder="Rechercher..." className="w-full bg-slate-50 border rounded-xl px-2.5 py-1 text-[10px]" autoFocus />
                  <div className="overflow-y-auto space-y-1 flex-1 max-h-60">
                    {articlesPopupFiltres.map((art) => (
                      <div key={art.id_article} onClick={() => selectionnerArticleEtFocusQte(art)} className="p-2 rounded-xl border bg-slate-50 hover:bg-slate-100 cursor-pointer flex justify-between items-center">
                        <span className="font-extrabold text-[10px] text-slate-800">{art.Designation}</span>
                        <span className="text-[9.5px] font-bold text-emerald-600">Stock: {calculerStockPourDepotActuel(art.id_article)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {lignesPanier.length === 0 ? (<p className="text-center text-slate-400 py-1.5 italic text-[9.5px]">Aucun article ajouté.</p>) : (
              <div className="overflow-x-auto border rounded-lg bg-white">
                <table className="w-full text-left text-[9.5px] table-fixed">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[7.5px] font-extrabold border-b">
                    <tr><th className="p-1 w-[60%]">Article</th><th className="p-1 w-[20%] text-center">Qte</th><th className="p-1 w-[20%] text-center">⚙️</th></tr>
                  </thead>
                  <tbody className="divide-y text-[9px]">
                    {lignesPanier.map((ligne, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="p-1 font-bold text-slate-800 truncate">{ligne.designation}</td>
                        <td className="p-1 text-center font-black text-emerald-600">{ligne.quantite}</td>
                        <td className="p-1 text-center"><button type="button" onClick={() => setLignesPanier(lignesPanier.filter((_, i) => i !== index))} className="p-0.5 bg-slate-100 rounded text-[9px]">🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-1.5 flex items-center justify-between gap-1">
              {mouvementEnEditionId ? (<button type="button" onClick={() => supprimerDocumentComplet(enTeteDoc.numeroDoc)} className="bg-red-600 text-white font-bold px-2 py-1 rounded text-[9px]">🗑️ Supprimer</button>) : <div />}
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => window.print()} className="bg-slate-800 text-white font-bold px-2 py-1 rounded text-[9px]">🖨️ Imprimer</button>
                <button type="button" onClick={() => setModalPartageOuverte(true)} className="bg-blue-600 text-white font-bold px-2 py-1 rounded text-[9px]">📤 Partager</button>
                <button type="button" onClick={validerDocumentMouvement} disabled={lignesPanier.length === 0} className={`font-bold px-2.5 py-1 rounded text-[9px] ${lignesPanier.length > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>✅ Valider</button>
              </div>
            </div>
          </div>
        </>
      )}

      {modeAffichage === 'LISTE_DOCS' && (
        <div className="bg-white border rounded-xl overflow-hidden shadow-2xs">
          <div className="p-2 bg-slate-50 border-b flex justify-between items-center text-[9.5px]"><span className="font-extrabold uppercase text-slate-600">Documents Enregistrés</span><span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold">{documentsTries.length}</span></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[9.5px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[7.5px] font-extrabold border-b">
                <tr><th onClick={() => gererTri('date')} className="p-1.5 cursor-pointer">Date</th><th onClick={() => gererTri('type')} className="p-1.5 cursor-pointer">Type</th><th onClick={() => gererTri('numeroDoc')} className="p-1.5 cursor-pointer">N° Doc</th><th onClick={() => gererTri('operateur')} className="p-1.5 cursor-pointer">Opérateur</th></tr>
              </thead>
              <tbody className="divide-y text-[9.5px]">
                {documentsTries.length === 0 ? (<tr><td colSpan="4" className="p-4 text-center text-slate-400">Aucun document.</td></tr>) : (
                  documentsTries.map((doc, idx) => (
                    <tr key={idx} onClick={() => ouvrirDocumentDepuisListe(doc.numeroDoc)} className="hover:bg-orange-50/70 cursor-pointer">
                      <td className="p-1.5 font-mono text-slate-500 text-[9px]">{new Date(doc.date).toLocaleDateString('fr-FR')}</td>
                      <td className="p-1.5 font-bold"><span className="px-1 py-0.5 bg-slate-100 rounded text-[8.5px]">{doc.type}</span></td>
                      <td className="p-1.5 font-mono font-black text-orange-600">{doc.numeroDoc}</td>
                      <td className="p-1.5 font-medium text-slate-700">{doc.operateur}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalPartageOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-3 space-y-2">
            <div className="flex justify-between items-center border-b pb-1.5"><span className="font-extrabold text-[10px] uppercase">Partager</span><button type="button" onClick={() => setModalPartageOuverte(false)} className="text-slate-400 font-black">✕</button></div>
            <div className="space-y-1 text-[9.5px]"><label className="block font-bold text-slate-600">Format :</label><div className="grid grid-cols-3 gap-1">{['PDF', 'PNG', 'JPG'].map(fmt => (<button key={fmt} type="button" onClick={() => setFormatPartage(fmt)} className={`py-1 rounded font-bold border ${formatPartage === fmt ? 'bg-orange-600 text-white' : 'bg-slate-50'}`}>{fmt}</button>))}</div></div>
            <div className="space-y-1 pt-1 text-[9.5px]"><label className="block font-bold text-slate-600">Canal :</label><div className="space-y-1"><button type="button" onClick={() => { alert('Partagé !'); setModalPartageOuverte(false); }} className="w-full bg-emerald-50 text-emerald-900 font-bold p-1.5 rounded-xl text-left">💚 WhatsApp</button><button type="button" onClick={() => { alert('Partagé !'); setModalPartageOuverte(false); }} className="w-full bg-blue-50 text-blue-900 font-bold p-1.5 rounded-xl text-left">📧 Mail</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}